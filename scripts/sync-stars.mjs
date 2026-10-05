import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { siteConfig } from '../src/config.js'
import { classifyRepo } from '../src/category-engine.js'

const root = new URL('../', import.meta.url)
const dataDir = new URL('./public/data/', root)
const snapshotPath = new URL('./public/data/repos.json', root)
const historyPath = new URL('./public/data/history.json', root)
const username = process.env.GITHUB_USERNAME || siteConfig.githubUsername
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || ''

const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'GitStar-Sync/1.0' }
if (token) headers.Authorization = `Bearer ${token}`

async function fetchStars() {
  const repos = []
  for (let page = 1; ; page += 1) {
    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/starred?per_page=100&page=${page}`, { headers })
    if (response.status === 403 || response.status === 429) throw new Error('RATE_LIMIT')
    if (!response.ok) throw new Error(`GitHub API ${response.status}: ${await response.text()}`)
    const payload = await response.json()
    if (!payload.length) break
    repos.push(...payload)
    if (payload.length < 100) break
  }
  return repos
}

function normalize(raw) {
  const repo = raw.repo || raw
  return {
    id: repo.id,
    full_name: repo.full_name,
    name: repo.name,
    html_url: repo.html_url,
    homepage: repo.homepage || '',
    documentation: repo.html_url ? `${repo.html_url}#readme` : '',
    description: repo.description || '',
    owner: { login: repo.owner?.login || repo.full_name.split('/')[0], avatar_url: repo.owner?.avatar_url || '' },
    language: repo.language || '',
    languageColor: '#74f0c0',
    topics: repo.topics || [],
    stargazers_count: repo.stargazers_count || 0,
    forks_count: repo.forks_count || 0,
    open_issues_count: repo.open_issues_count || 0,
    pushed_at: repo.pushed_at,
    updated_at: repo.updated_at,
    starred_at: raw.starred_at || repo.starred_at || repo.updated_at,
    category: classifyRepo(repo, siteConfig.manualCategories),
  }
}

async function readJson(url, fallback) { try { return JSON.parse(await readFile(url, 'utf8')) } catch { return fallback } }

const previous = await readJson(snapshotPath, { repositories: [], syncedAt: null })
const previousIds = new Set((previous.repositories || []).map((repo) => repo.full_name))
let stars
try { stars = await fetchStars() } catch (error) {
  const status = error.message === 'RATE_LIMIT' ? 'rate_limited' : 'error'
  await writeFile(snapshotPath, JSON.stringify({ ...previous, username, status, error: error.message, attemptedAt: new Date().toISOString() }, null, 2) + '\n')
  console.error(`GitStar sync failed: ${error.message}`)
  process.exit(1)
}

const repositories = stars.map(normalize).sort((a, b) => new Date(b.starred_at || 0) - new Date(a.starred_at || 0))
const currentIds = new Set(repositories.map((repo) => repo.full_name))
const now = new Date().toISOString()
const events = []
for (const repo of repositories) if (!previousIds.has(repo.full_name)) events.push({ type: 'added', full_name: repo.full_name, html_url: repo.html_url, at: now })
for (const repo of previous.repositories || []) if (!currentIds.has(repo.full_name)) events.push({ type: 'removed', full_name: repo.full_name, html_url: repo.html_url, at: now })
const oldHistory = await readJson(historyPath, { events: [] })
const mergedEvents = [...events, ...(oldHistory.events || [])].slice(0, 100)
await mkdir(dataDir, { recursive: true })
await writeFile(snapshotPath, JSON.stringify({ username, syncedAt: now, repositories, status: 'ok', count: repositories.length }, null, 2) + '\n')
await writeFile(historyPath, JSON.stringify({ username, events: mergedEvents }, null, 2) + '\n')
console.log(`Synced ${repositories.length} starred repositories for @${username}. ${events.length} changes.`)
