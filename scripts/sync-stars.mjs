import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { siteConfig } from '../src/config.js'
import { classifyRepo } from '../src/category-engine.js'

const dataDir = new URL('../public/data/', import.meta.url)
export const paths = {
  repos: new URL('./repos.json', dataDir),
  meta: new URL('./meta.json', dataDir),
  status: new URL('./status.json', dataDir),
  history: new URL('./history.json', dataDir),
  contributors: new URL('./contributors.json', dataDir),
}
const configured = siteConfig.githubUsername && siteConfig.githubUsername !== 'demo' ? siteConfig.githubUsername : ''
const username = process.env.GITSTAR_USERNAME || process.env.GITHUB_USERNAME || configured || process.env.GITHUB_REPOSITORY_OWNER || siteConfig.githubUsername
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || ''
const headers = {
  Accept: 'application/vnd.github.star+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'GitStar-Sync/2.0',
}
if (token) headers.Authorization = `Bearer ${token}`
const contributorHeaders = { ...headers, Accept: 'application/vnd.github+json' }
const contributorRefreshMs = 30 * 24 * 60 * 60 * 1000
const contributorConcurrency = 6

export function classifyResponse(response) {
  const remaining = response.headers.get('x-ratelimit-remaining')
  return response.status === 429 || (response.status === 403 && (remaining === '0' || response.headers.has('retry-after'))) ? 'rate_limited' : 'error'
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function fetchStars(fetchImpl = fetch) {
  const repos = []
  let url = `https://api.github.com/users/${encodeURIComponent(username)}/starred?per_page=100`
  while (url) {
    let response
    for (let attempt = 0; ; attempt += 1) {
      try {
        response = await fetchImpl(url, { headers })
        if (response.ok || (response.status < 500 && response.status !== 408)) break
      } catch (error) {
        if (attempt >= 2) throw error
      }
      if (attempt >= 2) break
      await sleep(250 * 2 ** attempt)
    }
    if (!response?.ok) {
      const kind = response ? classifyResponse(response) : 'error'
      const error = new Error(`${kind}:${response?.status || 'network'}`)
      error.kind = kind
      throw error
    }
    repos.push(...await response.json())
    url = (response.headers.get('link') || '').match(/<([^>]+)>;\s*rel="next"/)?.[1] || ''
  }
  return repos
}

export function normalize(raw, overrides = siteConfig.manualCategories) {
  const repo = raw.repo || raw
  const fullName = repo.full_name || ''
  return {
    id: repo.id,
    full_name: fullName,
    name: repo.name || fullName.split('/').pop(),
    owner: repo.owner?.login || fullName.split('/')[0],
    html_url: repo.html_url || '',
    homepage: /^https?:\/\//i.test(repo.homepage || '') ? repo.homepage : '',
    description: repo.description || '',
    language: repo.language || '',
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    pushed_at: repo.pushed_at || null,
    starred_at: raw.starred_at || null,
    category: classifyRepo(repo, overrides, siteConfig.categories),
    archived: Boolean(repo.archived),
  }
}

export const hashRepos = (repos) => createHash('sha256').update(JSON.stringify([...repos].map(({ preview_url, ...repo }) => repo).sort((a, b) => a.full_name.localeCompare(b.full_name)))).digest('hex')

export async function fetchContributorCount(fullName, fetchImpl = fetch) {
  const path = fullName.split('/').map(encodeURIComponent).join('/')
  const response = await fetchImpl(`https://api.github.com/repos/${path}/contributors?per_page=1&anon=true`, { headers: contributorHeaders })
  if (!response.ok) return { count: null, rateLimited: classifyResponse(response) === 'rate_limited' }

  const entries = await response.json()
  const lastPage = response.headers.get('link')?.match(/<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="last"/i)?.[1]
  const count = lastPage ? Number(lastPage) : Array.isArray(entries) ? entries.length : null
  return { count: Number.isFinite(count) ? count : null, rateLimited: false }
}

export async function fetchOpenGraphUrls(repositories, fetchImpl = fetch, chunkSize = 50) {
  const urls = new Map()
  for (let start = 0; start < repositories.length; start += chunkSize) {
    const chunk = repositories.slice(start, start + chunkSize)
    const variables = {}
    const declarations = []
    const fields = []
    chunk.forEach((repo, index) => {
      const [owner, name] = repo.full_name.split('/')
      declarations.push(`$owner${index}: String!`, `$name${index}: String!`)
      variables[`owner${index}`] = owner
      variables[`name${index}`] = name
      fields.push(`repo${index}: repository(owner: $owner${index}, name: $name${index}) { nameWithOwner openGraphImageUrl }`)
    })
    const query = `query (${declarations.join(', ')}) { ${fields.join('\n')} }`
    try {
      const response = await fetchImpl('https://api.github.com/graphql', {
        method: 'POST',
        headers: { ...headers, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      })
      if (!response.ok) {
        if (classifyResponse(response) === 'rate_limited') break
        continue
      }
      const payload = await response.json()
      chunk.forEach((repo, index) => {
        const imageUrl = payload.data?.[`repo${index}`]?.openGraphImageUrl
        if (imageUrl && /^https:\/\//i.test(imageUrl)) urls.set(repo.full_name, imageUrl)
      })
    } catch {
      // The website can use its deterministic fallback if GitHub's image metadata is unavailable.
    }
  }
  return urls
}

export async function updateContributorCounts(repositories, cached = {}, fetchImpl = fetch, { now = Date.now(), concurrency = contributorConcurrency } = {}) {
  const timestamp = new Date(now).toISOString()
  const counts = { ...(cached.counts || {}) }
  const activeNames = new Set(repositories.map((repo) => repo.full_name))
  for (const fullName of Object.keys(counts)) if (!activeNames.has(fullName)) delete counts[fullName]

  if (!token) return { counts, refreshed: 0, rateLimited: false }

  const stale = repositories.filter((repo) => {
    const entry = counts[repo.full_name]
    const checkedAt = Date.parse(entry?.checkedAt || '')
    return !entry || entry.pushedAt !== (repo.pushed_at || null) || !Number.isFinite(checkedAt) || now - checkedAt >= contributorRefreshMs
  })
  let next = 0
  let refreshed = 0
  let rateLimited = false

  const worker = async () => {
    while (!rateLimited) {
      const index = next++
      if (index >= stale.length) return
      const repo = stale[index]
      try {
        const result = await fetchContributorCount(repo.full_name, fetchImpl)
        if (result.rateLimited) {
          rateLimited = true
          return
        }
        if (result.count === null) continue
        counts[repo.full_name] = { count: result.count, pushedAt: repo.pushed_at || null, checkedAt: timestamp }
        refreshed += 1
      } catch {
        // Contributor totals are optional enrichment; keep the last known value and continue.
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), stale.length) }, worker))
  return { counts, refreshed, rateLimited }
}

async function readJson(url, fallback) {
  try {
    return JSON.parse(await readFile(url, 'utf8'))
  } catch {
    return fallback
  }
}

function eventFields(repo) {
  return { full_name: repo.full_name, html_url: repo.html_url, description: repo.description, category: repo.category }
}

async function writeSummary(data) {
  if (!process.env.GITHUB_STEP_SUMMARY) return
  const summary = `## GitStar sync\n\n- Status: **${data.status}**\n- Repositories: **${data.count}**\n- Added: **${data.added || 0}** · Removed: **${data.removed || 0}**\n- Contributor totals refreshed: **${data.contributorsRefreshed || 0}**\n- Changed snapshot: **${data.changed ? 'yes' : 'no'}**\n`
  await writeFile(process.env.GITHUB_STEP_SUMMARY, summary)
}

async function main() {
  await mkdir(dataDir, { recursive: true })
  const previous = await readJson(paths.repos, { repositories: [] })
  const oldMeta = await readJson(paths.meta, {})
  const oldHistory = await readJson(paths.history, { events: [] })
  const oldContributorData = await readJson(paths.contributors, { counts: {} })
  const attemptedAt = new Date().toISOString()
  let rawStars

  try {
    rawStars = await fetchStars()
  } catch (error) {
    const status = error.kind || 'error'
    await writeFile(paths.status, JSON.stringify({ status, message: error.message, attemptedAt, lastSuccessAt: oldMeta.syncedAt || null }, null, 2) + '\n')
    await writeSummary({ status, count: previous.repositories?.length || 0 })
    console.warn(`GitStar sync: ${status} (${error.message})`)
    return
  }

  const normalizedRepos = rawStars.map((repo) => normalize(repo)).sort((a, b) => new Date(b.starred_at || 0) - new Date(a.starred_at || 0))
  const previousByName = new Map((previous.repositories || []).map((repo) => [repo.full_name, repo]))
  const previewUrls = token ? await fetchOpenGraphUrls(normalizedRepos) : new Map()
  const repositories = normalizedRepos.map((repo) => ({
    ...repo,
    preview_url: previewUrls.get(repo.full_name) || previousByName.get(repo.full_name)?.preview_url || '',
  }))
  const hash = hashRepos(repositories)
  const previousIds = new Set((previous.repositories || []).map((repo) => repo.full_name))
  const currentIds = new Set(repositories.map((repo) => repo.full_name))
  const events = [
    ...repositories.filter((repo) => !previousIds.has(repo.full_name)).map((repo) => ({ type: 'added', ...eventFields(repo), at: attemptedAt })),
    ...(previous.repositories || []).filter((repo) => !currentIds.has(repo.full_name)).map((repo) => ({ type: 'removed', ...eventFields(repo), at: attemptedAt })),
  ]
  const changed = hash !== oldMeta.hash
  const meta = {
    schemaVersion: 2,
    username,
    syncedAt: changed ? attemptedAt : (oldMeta.syncedAt || attemptedAt),
    checkedAt: attemptedAt,
    count: repositories.length,
    hash,
  }

  const snapshotChanged = JSON.stringify(repositories) !== JSON.stringify(previous.repositories || [])
  if (snapshotChanged) await writeFile(paths.repos, JSON.stringify({ repositories }))
  if (changed) {
    const history = oldMeta.username && oldMeta.username !== username ? events.slice(0, 500) : [...events, ...(oldHistory.events || [])].slice(0, 500)
    await writeFile(paths.history, JSON.stringify({ events: history }, null, 2) + '\n')
  }

  const contributorResult = await updateContributorCounts(repositories, oldContributorData)
  const contributorData = { counts: contributorResult.counts }
  const contributorText = JSON.stringify(contributorData, null, 2) + '\n'
  const oldContributorText = JSON.stringify(oldContributorData, null, 2) + '\n'
  if (contributorText !== oldContributorText) await writeFile(paths.contributors, contributorText)

  await writeFile(paths.meta, JSON.stringify(meta, null, 2) + '\n')
  await writeFile(paths.status, JSON.stringify({ status: 'ok', message: '', attemptedAt, lastSuccessAt: attemptedAt }, null, 2) + '\n')
  console.log(`${changed ? 'Synced' : 'No changes'} ${repositories.length} starred repositories for @${username}. ${events.length} changes. Refreshed ${contributorResult.refreshed} contributor totals${contributorResult.rateLimited ? ' before hitting the API rate limit' : ''}.`)
  await writeSummary({
    status: 'ok',
    count: repositories.length,
    added: events.filter((event) => event.type === 'added').length,
    removed: events.filter((event) => event.type === 'removed').length,
    changed,
    contributorsRefreshed: contributorResult.refreshed,
  })
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => {
  console.error(error)
  process.exit(1)
})
