import { useEffect, useMemo, useState } from 'react'
import { BookOpen, CalendarDays, ChevronDown, ExternalLink, Filter, GitBranch, GitFork, Globe, Languages, Menu, Moon, Network, RefreshCw, Search, Star, Sun, Tag, Users, X } from 'lucide-react'
import { siteConfig } from './config'
import { categoryMeta, categoryOrder } from './category-engine'
import { translations } from './i18n'

const basePath = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`
const root = `${basePath}data/`
const cacheKey = `gitstar-data-cache-v2:${siteConfig.githubUsername}`
const pageSize = 60
const safeUrl = (value) => /^https?:\/\//i.test(value || '') ? value : ''
const readStorage = (key) => { try { return localStorage.getItem(key) } catch { return null } }
const writeStorage = (key, value) => { try { localStorage.setItem(key, value) } catch { /* Storage may be disabled or full. */ } }
const readSnapshot = () => {
  try {
    const snapshot = JSON.parse(readStorage(cacheKey) || 'null')
    return Array.isArray(snapshot?.data?.repositories) ? snapshot : null
  } catch {
    return null
  }
}
const initialSnapshot = readSnapshot()
const initialTheme = readStorage('gitstar-theme') === 'light' ? 'light' : 'dark'
if (typeof document !== 'undefined') document.documentElement.dataset.theme = initialTheme

const formatDate = (value, locale) => value ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value)) : '—'
const relative = (value, locale) => {
  if (!value) return '—'
  const days = Math.max(0, Math.floor((Date.now() - new Date(value)) / 86400000))
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-days, 'day')
}

function Select({ label, value, onChange, options, icon: Icon }) {
  return <label className="select">
    <Icon size={15} aria-hidden="true" />
    <span className="sr-only">{label}</span>
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>)}
    </select>
    <ChevronDown size={14} aria-hidden="true" />
  </label>
}

function RepoCard({ repo, contributors, t, locale, onTopic }) {
  const category = categoryMeta[repo.category]
  const [imageFailed, setImageFailed] = useState(false)
  const previewUrl = safeUrl(repo.preview_url) || `https://opengraph.githubassets.com/${repo.id || '1'}/${repo.full_name}`
  const contributorCount = contributors?.[repo.full_name]?.count
  const contributorValue = Number.isFinite(contributorCount) ? contributorCount.toLocaleString(locale) : '—'
  return <article className="repo-card">
    <a className="repo-preview" href={safeUrl(repo.html_url)} target="_blank" rel="noreferrer noopener" aria-label={`${repo.owner}/${repo.name} preview`}>
      {!imageFailed ? <img src={previewUrl} alt="" loading="lazy" decoding="async" onError={() => setImageFailed(true)} /> : <span className="repo-preview-fallback"><GitBranch size={24} aria-hidden="true" /><strong>{repo.owner}/{repo.name}</strong><small>{repo.description || t.github}</small><em><Star size={12} aria-hidden="true" />{(repo.stars || 0).toLocaleString()} {repo.language || ''}</em></span>}
    </a>
    <div className="repo-avatar" aria-hidden="true">{repo.owner?.[0]?.toUpperCase() || '?'}</div>
    <div className="repo-body">
      <div className="repo-title">
        <a href={safeUrl(repo.html_url)} target="_blank" rel="noreferrer noopener">{repo.owner}/{repo.name}</a>
        {repo.archived && <span className="badge">{t.archived}</span>}
      </div>
      <div className="repo-meta">
        <span>{category ? t[category.i18nKey] : t.categoryOther}</span><span aria-hidden="true">·</span>
        <span>{t.starred} {relative(repo.starred_at, locale)}</span><span aria-hidden="true">·</span>
        <span>{t.updated} {relative(repo.pushed_at, locale)}</span>
      </div>
      <p>{repo.description || '—'}</p>
      <div className="chips">
        {(repo.topics || []).slice(0, 4).map((topic) => <button key={topic} onClick={() => onTopic(topic)}>#{topic}</button>)}
        {repo.language && <span className="language"><i aria-hidden="true" />{repo.language}</span>}
      </div>
    </div>
    <div className="repo-numbers" aria-label={`${repo.stars || 0} ${t.stars}, ${repo.forks || 0} ${t.forks}, ${contributorValue} ${t.contributors}`}>
      <span><Star size={14} aria-hidden="true" />{(repo.stars || 0).toLocaleString(locale)}</span>
      <span><GitFork size={14} aria-hidden="true" />{(repo.forks || 0).toLocaleString(locale)}</span>
      <span><Users size={14} aria-hidden="true" />{contributorValue} {t.contributors}</span>
    </div>
    <div className="repo-links">
      {safeUrl(repo.homepage) && <a href={repo.homepage} target="_blank" rel="noreferrer noopener" aria-label={t.demo}><Globe size={16} /></a>}
      <a href={`${repo.html_url}#readme`} target="_blank" rel="noreferrer noopener" aria-label={t.docs}><BookOpen size={16} /></a>
      <a href={repo.html_url} target="_blank" rel="noreferrer noopener" aria-label={t.github}><GitBranch size={16} /></a>
    </div>
  </article>
}

export default function App() {
  const [locale, setLocale] = useState(() => readStorage('gitstar-language') || siteConfig.defaultLanguage)
  const [theme, setTheme] = useState(initialTheme)
  const [networkEnabled, setNetworkEnabled] = useState(() => readStorage('gitstar-network-background') !== 'off')
  const [guideOpen, setGuideOpen] = useState(() => readStorage('gitstar-guide-hidden') !== 'true')
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [data, setData] = useState(() => initialSnapshot?.data || { repositories: [] })
  const [contributors, setContributors] = useState(() => initialSnapshot?.contributors || {})
  const [meta, setMeta] = useState(() => initialSnapshot?.meta || {})
  const [status, setStatus] = useState(() => initialSnapshot?.status || {})
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get('q') || '')
  const [category, setCategory] = useState(() => new URLSearchParams(location.search).get('cat') || 'all')
  const [language, setLanguage] = useState(() => new URLSearchParams(location.search).get('lang') || 'all')
  const [dateRange, setDateRange] = useState(() => new URLSearchParams(location.search).get('period') || 'all')
  const [topic, setTopic] = useState(() => new URLSearchParams(location.search).get('topic') || '')
  const [sort, setSort] = useState(() => new URLSearchParams(location.search).get('sort') || readStorage('gitstar-sort') || 'newest')
  const [archived, setArchived] = useState(false)
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const [loading, setLoading] = useState(() => !initialSnapshot?.data?.repositories?.length)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [mobile, setMobile] = useState(false)
  const [profileImageFailed, setProfileImageFailed] = useState(false)
  const t = translations[locale] || translations.en
  const repos = data.repositories || []

  const dismissGuide = () => {
    if (dontShowAgain) writeStorage('gitstar-guide-hidden', 'true')
    setGuideOpen(false)
  }
  const toggleNetworkBackground = () => {
    const next = !networkEnabled
    writeStorage('gitstar-network-background', next ? 'on' : 'off')
    setNetworkEnabled(next)
  }
  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark')

  const load = async ({ refresh = false } = {}) => {
    setError('')
    setRefreshing(true)
    if (!repos.length) setLoading(true)
    try {
      const files = ['repos.json', 'meta.json', 'status.json', 'contributors.json']
      const responses = await Promise.all(files.map((file) => fetch(`${root}${file}`, { cache: refresh ? 'reload' : 'default' })))
      const [reposResponse, metaResponse, statusResponse, contributorsResponse] = responses
      if (!reposResponse.ok) throw Error('repos')
      const nextData = await reposResponse.json()
      const [nextMeta, nextStatus, nextContributorsFile] = await Promise.all([
        metaResponse.ok ? metaResponse.json() : meta,
        statusResponse.ok ? statusResponse.json() : status,
        contributorsResponse.ok ? contributorsResponse.json() : { counts: contributors },
      ])
      const nextContributors = nextContributorsFile.counts || {}
      setData(nextData)
      setMeta(nextMeta)
      setStatus(nextStatus)
      setContributors(nextContributors)
      writeStorage(cacheKey, JSON.stringify({ data: nextData, meta: nextMeta, status: nextStatus, contributors: nextContributors }))
    } catch {
      if (!repos.length) setError('load')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    writeStorage('gitstar-theme', theme)
  }, [theme])
  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
    document.title = `${siteConfig.siteName} — ${t.tagline}`
    writeStorage('gitstar-language', locale)
  }, [locale, t.tagline])
  useEffect(() => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (category !== 'all') params.set('cat', category)
    if (language !== 'all') params.set('lang', language)
    if (dateRange !== 'all') params.set('period', dateRange)
    if (topic) params.set('topic', topic)
    if (sort !== 'newest') params.set('sort', sort)
    window.history.replaceState(null, '', `${location.pathname}${params.toString() ? `?${params}` : ''}`)
  }, [query, category, language, dateRange, topic, sort])
  useEffect(() => { setVisibleCount(pageSize) }, [query, category, language, dateRange, topic, archived, sort])
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') { event.preventDefault(); document.querySelector('#global-search')?.focus() }
      if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') { event.preventDefault(); document.querySelector('#global-search')?.focus() }
    }
    addEventListener('keydown', onKeyDown)
    return () => removeEventListener('keydown', onKeyDown)
  }, [])
  useEffect(() => {
    if (!guideOpen) return
    const onKeyDown = (event) => { if (event.key === 'Escape') dismissGuide() }
    addEventListener('keydown', onKeyDown)
    return () => removeEventListener('keydown', onKeyDown)
  }, [guideOpen, dontShowAgain])
  useEffect(() => {
    if (guideOpen) document.getElementById('guide-start')?.focus()
  }, [guideOpen])

  const languages = useMemo(() => ['all', ...new Set(repos.map((repo) => repo.language).filter(Boolean)).values()].sort((a, b) => a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b)), [repos])
  const normalizedQuery = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : dateRange === 'year' ? 365 : 0
    const cutoff = days ? Date.now() - days * 86400000 : null
    return repos.filter((repo) => {
      const haystack = [repo.full_name, repo.description, repo.language, repo.category, ...(repo.topics || [])].join(' ').toLowerCase()
      const starredAt = repo.starred_at ? Date.parse(repo.starred_at) : 0
      return (!normalizedQuery || haystack.includes(normalizedQuery)) &&
        (category === 'all' || repo.category === category) &&
        (language === 'all' || repo.language === language) &&
        (!cutoff || starredAt >= cutoff) &&
        (!topic || repo.topics?.includes(topic)) &&
        (archived || !repo.archived)
    }).sort((a, b) => sort === 'stars' ? b.stars - a.stars : sort === 'alpha' ? a.name.localeCompare(b.name) : sort === 'pushed' ? new Date(b.pushed_at || 0) - new Date(a.pushed_at || 0) : new Date(b.starred_at || 0) - new Date(a.starred_at || 0))
  }, [repos, normalizedQuery, category, language, dateRange, topic, archived, sort])
  const displayed = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])
  const categoryCounts = useMemo(() => repos.reduce((counts, repo) => { counts[repo.category] = (counts[repo.category] || 0) + 1; return counts }, {}), [repos])
  const filteredCategoryCounts = useMemo(() => filtered.reduce((counts, repo) => { counts[repo.category] = (counts[repo.category] || 0) + 1; return counts }, {}), [filtered])
  const categories = categoryOrder.map((id) => ({ value: id, label: id === 'all' ? t.all : id === 'other' ? t.categoryOther : t[categoryMeta[id]?.i18nKey] }))
  const grouped = useMemo(() => {
    const groups = {}
    for (const repo of displayed) (groups[repo.category] ??= []).push(repo)
    return Object.entries(groups).sort((a, b) => categoryOrder.indexOf(a[0]) - categoryOrder.indexOf(b[0]))
  }, [displayed])
  const clear = () => { setQuery(''); setCategory('all'); setLanguage('all'); setDateRange('all'); setTopic(''); setArchived(false) }
  const totalStars = useMemo(() => repos.reduce((total, repo) => total + (repo.stars || 0), 0), [repos])
  const isStale = meta.syncedAt && Date.now() - new Date(meta.syncedAt) > siteConfig.staleAfterHours * 3600000
  const hasFilters = Boolean(query || category !== 'all' || language !== 'all' || dateRange !== 'all' || topic || archived)
  const dateRangeOptions = [
    { value: 'all', label: t.anyTime },
    { value: '7d', label: t.last7Days },
    { value: '30d', label: t.last30Days },
    { value: '90d', label: t.last90Days },
    { value: 'year', label: t.lastYear },
  ]

  return <div className="app">
    <div className={`network-background${networkEnabled ? ' is-on' : ''}`} aria-hidden="true" />
    <div className="app-content">
      <a className="skip" href="#main">Skip to content</a>
      <header>
        <div className="bar">
          <button className="icon-btn menu" aria-label="Menu" aria-expanded={mobile} onClick={() => setMobile(!mobile)}><Menu /></button>
          <a className="brand" href="#top"><img className="brand-mark" src={`${basePath}favicon.svg`} width="36" height="36" alt="" /><span>GitStar</span></a>
          <div className="global-search"><Search size={16} aria-hidden="true" /><input id="global-search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Escape' && setQuery('')} placeholder={t.search} /><kbd>⌘K</kbd></div>
          <button className="language-toggle" onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')} aria-label={t.language}><Languages size={15} />{t.language}</button>
          <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? t.switchToLight : t.switchToDark} title={theme === 'dark' ? t.switchToLight : t.switchToDark}>
            {theme === 'dark' ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
            <span className="theme-label">{theme === 'dark' ? t.themeLight : t.themeDark}</span>
          </button>
          <button className="network-toggle" type="button" aria-pressed={networkEnabled} aria-label={networkEnabled ? t.networkOff : t.networkOn} title={networkEnabled ? t.networkOff : t.networkOn} onClick={toggleNetworkBackground}>
            <Network size={15} aria-hidden="true" /><span className="network-toggle-label">{t.networkLines}</span><span className="toggle-track" aria-hidden="true"><i /></span>
          </button>
        </div>
      </header>

      <div className="shell" id="top">
        <aside className={mobile ? 'drawer open' : 'drawer'}>
          <div className="profile"><div className="profile-avatar">{!profileImageFailed ? <img src={`https://github.com/${encodeURIComponent(siteConfig.githubUsername)}.png?size=80`} alt="" loading="lazy" decoding="async" onError={() => setProfileImageFailed(true)} /> : <span>{siteConfig.githubUsername[0].toUpperCase()}</span>}</div><div><b>@{siteConfig.githubUsername}</b><small>{t.tagline}</small></div></div>
          <h3>{t.browse}</h3>
          <button className={category === 'all' ? 'selected' : ''} onClick={() => setCategory('all')}>{t.all}<em>{repos.length}</em></button>
          {categories.filter((item) => item.value !== 'all').map((item) => <button key={item.value} className={category === item.value ? 'selected' : ''} onClick={() => setCategory(item.value)}>{item.label}<em>{categoryCounts[item.value] || 0}</em></button>)}
          <div className="sidebar-foot"><a href={siteConfig.repoUrl} target="_blank" rel="noreferrer noopener">{t.viewSource}<ExternalLink size={13} /></a></div>
        </aside>

        <main id="main">
          <section className="hero"><div><p className="eyebrow">{siteConfig.siteName} / {t.browse}</p><h1>{t.hero}</h1><p>{t.tagline}</p></div><div className="hero-actions"><span className={`freshness ${status.status === 'error' ? 'failed' : !isStale ? 'fresh' : ''}`}><span>●</span>{status.status === 'error' ? t.syncFailed : isStale ? t.stale : t.synced}</span><button className="refresh" onClick={() => load({ refresh: true })} disabled={refreshing}><RefreshCw className={refreshing ? 'spin' : ''} size={15} />{refreshing ? t.loading : t.refresh}</button></div></section>
          {(status.status === 'rate_limited' || status.status === 'error' || isStale) && <div className={`notice ${status.status === 'error' ? 'danger' : 'warning'}`} role="status">{status.status === 'rate_limited' ? t.rateLimited : status.status === 'error' ? `${t.syncError} ${status.message || ''}` : `${t.stale} ${formatDate(meta.syncedAt, locale === 'ar' ? 'ar-EG' : 'en-US')}.`}</div>}

          <div className="summary"><span><strong>{repos.length.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}</strong> {t.repos}</span><span><strong>{totalStars.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}</strong> {t.stars}</span><span><strong>{filtered.length.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}</strong> {hasFilters ? t.matching : t.repos}</span></div>
          <div className="toolbar">
            <Select label={t.allCategories} icon={Filter} value={category} onChange={setCategory} options={categories} />
            <Select label={t.allLanguages} icon={Tag} value={language} onChange={setLanguage} options={languages} />
            <Select label={t.timeRange} icon={CalendarDays} value={dateRange} onChange={setDateRange} options={dateRangeOptions} />
            <Select label={t.newest} icon={Star} value={sort} onChange={(value) => { setSort(value); writeStorage('gitstar-sort', value) }} options={[{ value: 'newest', label: t.newest }, { value: 'pushed', label: t.pushed }, { value: 'stars', label: t.stars }, { value: 'alpha', label: t.alpha }]} />
            <label className="check"><input type="checkbox" checked={archived} onChange={(event) => setArchived(event.target.checked)} />{t.archived}</label>
            {hasFilters && <button className="clear" onClick={clear}><X size={15} />{t.clear}</button>}
          </div>
          {loading ? <div className="skeleton">{[1, 2, 3].map((item) => <div key={item} />)}</div> : error ? <div className="empty"><p>Unable to load data</p><button onClick={() => load({ refresh: true })}>{t.refresh}</button></div> : filtered.length === 0 ? <div className="empty"><p>{t.noResults}</p><button onClick={clear}>{t.clear}</button></div> : <>
            <div className="groups">{grouped.map(([id, items]) => <section key={id}><div className="section-title"><h2>{id === 'other' ? t.categoryOther : t[categoryMeta[id]?.i18nKey]}</h2><span>{(filteredCategoryCounts[id] || 0).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}</span></div>{items.map((repo) => <RepoCard key={repo.full_name} repo={repo} contributors={contributors} t={t} locale={locale === 'ar' ? 'ar-EG' : 'en-US'} onTopic={setTopic} />)}</section>)}</div>
            {filtered.length > visibleCount && <button className="load-more" type="button" onClick={() => setVisibleCount((count) => Math.min(count + pageSize, filtered.length))}>{t.loadMore}<span>+{Math.min(pageSize, filtered.length - visibleCount).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}</span></button>}
          </>}
        </main>
      </div>
      <footer>{t.footer} · {t.lastSync}: {formatDate(meta.syncedAt, locale)}</footer>
    </div>
    {guideOpen && <div className="guide-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) dismissGuide() }}>
      <section className="guide-dialog" role="dialog" aria-modal="true" aria-labelledby="guide-title" aria-describedby="guide-intro">
        <button className="guide-close" type="button" aria-label={t.guideClose} onClick={dismissGuide}><X size={18} /></button>
        <p className="guide-kicker">GitStar · {t.guideLabel}</p>
        <h2 id="guide-title">{t.guideTitle}</h2>
        <p className="guide-intro" id="guide-intro">{t.guideIntro}</p>
        <ol className="guide-steps">
          <li><span className="guide-icon"><Search size={17} /></span><div><strong>{t.guideSearchTitle}</strong><p>{t.guideSearchBody}</p></div></li>
          <li><span className="guide-icon"><Filter size={17} /></span><div><strong>{t.guideCategoriesTitle}</strong><p>{t.guideCategoriesBody}</p></div></li>
          <li><span className="guide-icon"><GitBranch size={17} /></span><div><strong>{t.guideCardsTitle}</strong><p>{t.guideCardsBody}</p></div></li>
        </ol>
        <p className="guide-tip"><Network size={15} aria-hidden="true" />{t.guideNetworkTip}</p>
        <label className="guide-preference"><input type="checkbox" checked={dontShowAgain} onChange={(event) => setDontShowAgain(event.target.checked)} />{t.dontShowAgain}</label>
        <button className="guide-start" id="guide-start" type="button" onClick={dismissGuide}>{t.guideStart}</button>
      </section>
    </div>}
  </div>
}
