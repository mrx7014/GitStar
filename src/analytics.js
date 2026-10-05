export function summarizeMonthlyLanguages(repositories, now = new Date(), limit = 5) {
  const timestamp = now instanceof Date ? now.getTime() : Number(now)
  const safeNow = Number.isFinite(timestamp) ? timestamp : Date.now()
  const current = new Date(safeNow)
  const year = current.getUTCFullYear()
  const month = current.getUTCMonth()
  const monthStart = Date.UTC(year, month, 1)
  const languageCounts = new Map()
  let totalRepos = 0
  let classifiedRepos = 0

  for (const repo of repositories || []) {
    const starredAt = Date.parse(repo.starred_at || '')
    if (!Number.isFinite(starredAt) || starredAt < monthStart || starredAt > safeNow) continue
    totalRepos += 1
    const language = typeof repo.language === 'string' ? repo.language.trim() : ''
    if (!language) continue
    classifiedRepos += 1
    languageCounts.set(language, (languageCounts.get(language) || 0) + 1)
  }

  const safeLimit = Math.max(0, Math.floor(Number(limit) || 0))
  const languages = [...languageCounts.entries()]
    .sort(([languageA, countA], [languageB, countB]) => countB - countA || languageA.localeCompare(languageB))
    .slice(0, safeLimit)
    .map(([language, count]) => ({
      language,
      count,
      share: classifiedRepos ? Math.round((count / classifiedRepos) * 100) : 0,
    }))

  return { year, month: month + 1, monthStart, totalRepos, classifiedRepos, languages }
}
