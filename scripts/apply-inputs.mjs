import { readFile, writeFile } from 'node:fs/promises'
import { siteConfig } from '../src/config.js'
import { categoryOrder } from '../src/category-engine.js'

const input = (name, fallback = '') => process.env[name] ?? fallback
const trim = (value) => String(value ?? '').trim()
const validUsername = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/
const validRepo = /^[^/\s]+\/[^/\s]+$/
const validCategories = new Set(categoryOrder)

function list(value, field) {
  if (!trim(value)) return undefined
  const values = trim(value).split(',').map((item) => item.trim()).filter(Boolean)
  if (values.some((item) => !validRepo.test(item))) throw new Error(`Invalid ${field}: use owner/repo, owner/repo2`)
  return [...new Set(values)]
}

function manualCategories(value) {
  if (!trim(value)) return undefined
  const result = {}
  for (const item of trim(value).split(',').map((part) => part.trim()).filter(Boolean)) {
    const [repo, category, ...extra] = item.split('=').map((part) => part.trim())
    if (extra.length || !validRepo.test(repo) || !validCategories.has(category)) {
      throw new Error(`Invalid manual_categories entry: ${item}`)
    }
    result[repo] = category
  }
  return result
}

function optionalNumber(value, field, current) {
  if (!trim(value)) return current
  const number = Number(value)
  if (!Number.isFinite(number) || number < 1 || number > 8760) throw new Error(`Invalid ${field}: use a number from 1 to 8760`)
  return Math.round(number)
}

const username = trim(input('USERNAME'))
if (!validUsername.test(username)) throw new Error('Invalid username: use a GitHub username without @ or spaces')
const language = trim(input('DEFAULT_LANGUAGE'))
if (language && !['keep', 'en', 'ar'].includes(language)) throw new Error('Invalid default_language: use keep, en or ar')

const next = {
  ...siteConfig,
  githubUsername: username,
  siteName: trim(input('SITE_NAME')) || siteConfig.siteName,
  defaultLanguage: language && language !== 'keep' ? language : siteConfig.defaultLanguage,
  tagline: trim(input('TAGLINE')) || siteConfig.tagline,
  pinnedRepos: list(input('PINNED_REPOS'), 'pinned_repos') || siteConfig.pinnedRepos || [],
  featuredRepos: list(input('FEATURED_REPOS'), 'featured_repos') || siteConfig.featuredRepos || [],
  manualCategories: manualCategories(input('MANUAL_CATEGORIES')) || siteConfig.manualCategories || {},
  staleAfterHours: optionalNumber(input('STALE_AFTER_HOURS'), 'stale_after_hours', siteConfig.staleAfterHours),
}

if (process.env.REPO_URL) next.repoUrl = `https://github.com/${process.env.REPO_URL}`
if (process.env.SAVE_CONFIG !== 'true') {
  console.log('save_config=false; config.js will not be committed.')
  process.exit(0)
}

const source = `export const siteConfig = ${JSON.stringify(next, null, 2)}\n`
await writeFile(new URL('../src/config.js', import.meta.url), source)
console.log(`Applied workflow inputs for @${username}`)
