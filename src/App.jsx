import { useEffect, useMemo, useState } from 'react'
import { BookOpen, ChevronDown, ExternalLink, Filter, GitBranch, Globe, Hash, Languages, Menu, RefreshCw, Search, Star, Tag, X } from 'lucide-react'
import { siteConfig } from './config'
import { categoryMeta, categoryOrder } from './category-engine'
import { translations } from './i18n'

const basePath = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`
const root = `${basePath}data/`
const safeUrl = (value) => /^https?:\/\//i.test(value || '') ? value : ''
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

function RepoCard({ repo, t, locale, onTopic }) {
  const category = categoryMeta[repo.category]
  const [imageFailed, setImageFailed] = useState(false)
  const previewUrl = `https://opengraph.githubassets.com/1/${repo.full_name}`
  return <article className="repo-card">
    <a className="repo-preview" href={safeUrl(repo.html_url)} target="_blank" rel="noreferrer noopener" aria-label={`${repo.owner}/${repo.name} preview`}>
      {!imageFailed ? <img src={previewUrl} alt="" loading="lazy" onError={() => setImageFailed(true)} /> : <span className="repo-preview-fallback"><GitBranch size={24} aria-hidden="true" /><strong>{repo.owner}/{repo.name}</strong><small>{repo.description || t.github}</small><em><Star size={12} aria-hidden="true" />{(repo.stars || 0).toLocaleString()} {repo.language || ''}</em></span>}
    </a>
    <div className="repo-avatar" aria-hidden="true">{repo.owner?.[0]?.toUpperCase() || '?'}</div>
    <div className="repo-body">
      <div className="repo-title">
        <a href={safeUrl(repo.html_url)} target="_blank" rel="noreferrer noopener">{repo.owner}/{repo.name}</a>
        {repo.archived && <span className="badge">{t.archived}</span>}
      </div>
      <div className="repo-meta">
        <span>{category ? t[category.i18nKey] : t.categoryOther}</span><span aria-hidden="true">·</span><span>{relative(repo.starred_at, locale)}</span>
      </div>
      <p>{repo.description || '—'}</p>
      <div className="chips">
        {(repo.topics || []).slice(0, 4).map((topic) => <button key={topic} onClick={() => onTopic(topic)}>#{topic}</button>)}
        {repo.language && <span className="language"><i aria-hidden="true" />{repo.language}</span>}
      </div>
    </div>
    <div className="repo-numbers" aria-label={`${repo.stars || 0} stars, ${repo.forks || 0} forks`}>
      <span><Star size={14} aria-hidden="true" />{(repo.stars || 0).toLocaleString()}</span>
      <span>⑂ {(repo.forks || 0).toLocaleString()}</span>
    </div>
    <div className="repo-links">
      {safeUrl(repo.homepage) && <a href={repo.homepage} target="_blank" rel="noreferrer noopener" aria-label={t.demo}><Globe size={16} /></a>}
      <a href={`${repo.html_url}#readme`} target="_blank" rel="noreferrer noopener" aria-label={t.docs}><BookOpen size={16} /></a>
      <a href={repo.html_url} target="_blank" rel="noreferrer noopener" aria-label={t.github}><GitBranch size={16} /></a>
    </div>
  </article>
}

export default function App() {
  const [locale, setLocale] = useState(() => localStorage.getItem('gitstar-language') || siteConfig.defaultLanguage)
  const [view, setView] = useState(() => new URLSearchParams(location.search).get('view') || 'browse')
  const [data, setData] = useState({ repositories: [] })
  const [meta, setMeta] = useState({})
  const [status, setStatus] = useState({})
  const [history, setHistory] = useState({ events: [] })
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get('q') || '')
  const [category, setCategory] = useState(() => new URLSearchParams(location.search).get('cat') || 'all')
  const [language, setLanguage] = useState(() => new URLSearchParams(location.search).get('lang') || 'all')
  const [topic, setTopic] = useState(() => new URLSearchParams(location.search).get('topic') || '')
  const [sort, setSort] = useState(() => new URLSearchParams(location.search).get('sort') || localStorage.getItem('gitstar-sort') || 'newest')
  const [archived, setArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mobile, setMobile] = useState(false)
  const t = translations[locale]
  const repos = data.repositories || []

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [reposResponse, metaResponse, statusResponse, historyResponse] = await Promise.all(['repos.json', 'meta.json', 'status.json', 'history.json'].map((file) => fetch(`${root}${file}`, { cache: 'no-cache' })))
      if (!reposResponse.ok) throw Error('repos')
      setData(await reposResponse.json())
      if (metaResponse.ok) setMeta(await metaResponse.json())
      if (statusResponse.ok) setStatus(await statusResponse.json())
      if (historyResponse.ok) setHistory(await historyResponse.json())
    } catch { setError('load') } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
    document.title = `${siteConfig.siteName} — ${t.tagline}`
    localStorage.setItem('gitstar-language', locale)
  }, [locale, t.tagline])
  useEffect(() => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (category !== 'all') params.set('cat', category)
    if (language !== 'all') params.set('lang', language)
    if (topic) params.set('topic', topic)
    if (sort !== 'newest') params.set('sort', sort)
    if (view !== 'browse') params.set('view', view)
    window.history.replaceState(null, '', `${location.pathname}${params.toString() ? `?${params}` : ''}`)
  }, [query, category, language, topic, sort, view])
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') { event.preventDefault(); document.querySelector('#global-search')?.focus() }
      if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') { event.preventDefault(); document.querySelector('#global-search')?.focus() }
    }
    addEventListener('keydown', onKeyDown)
    return () => removeEventListener('keydown', onKeyDown)
  }, [])

  const languages = useMemo(() => ['all', ...new Set(repos.map((repo) => repo.language).filter(Boolean))], [repos])
  const filtered = useMemo(() => repos.filter((repo) => {
    const haystack = [repo.full_name, repo.description, repo.language, repo.category, ...(repo.topics || [])].join(' ').toLowerCase()
    return (!query || haystack.includes(query.toLowerCase())) && (category === 'all' || repo.category === category) && (language === 'all' || repo.language === language) && (!topic || repo.topics?.includes(topic)) && (archived || !repo.archived)
  }).sort((a, b) => sort === 'stars' ? b.stars - a.stars : sort === 'alpha' ? a.name.localeCompare(b.name) : sort === 'pushed' ? new Date(b.pushed_at || 0) - new Date(a.pushed_at || 0) : new Date(b.starred_at || 0) - new Date(a.starred_at || 0)), [repos, query, category, language, topic, archived, sort])
  const categories = categoryOrder.map((id) => ({ value: id, label: id === 'all' ? t.all : id === 'other' ? t.categoryOther : t[categoryMeta[id]?.i18nKey] }))
  const grouped = useMemo(() => {
    const groups = {}
    for (const repo of filtered) (groups[repo.category] ??= []).push(repo)
    return Object.entries(groups).sort((a, b) => categoryOrder.indexOf(a[0]) - categoryOrder.indexOf(b[0]))
  }, [filtered])
  const clear = () => { setQuery(''); setCategory('all'); setLanguage('all'); setTopic(''); setArchived(false) }
  const totalStars = repos.reduce((total, repo) => total + repo.stars, 0)
  const isStale = meta.syncedAt && Date.now() - new Date(meta.syncedAt) > siteConfig.staleAfterHours * 3600000

  return <>
    <a className="skip" href="#main">Skip to content</a>
    <header>
      <div className="bar">
        <button className="icon-btn menu" aria-label="Menu" aria-expanded={mobile} onClick={() => setMobile(!mobile)}><Menu /></button>
        <a className="brand" href="#top">GitStar</a>
        <div className="global-search"><Search size={16} aria-hidden="true" /><input id="global-search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Escape' && setQuery('')} placeholder={t.search} /><kbd>⌘K</kbd></div>
        <nav className={mobile ? 'open' : ''}>
          <button className={view === 'browse' ? 'active' : ''} onClick={() => { setView('browse'); setMobile(false) }}>{t.browse}</button>
          <button className={view === 'changes' ? 'active' : ''} onClick={() => { setView('changes'); setMobile(false) }}>{t.changes}</button>
          <button className={view === 'how' ? 'active' : ''} onClick={() => { setView('how'); setMobile(false) }}>{t.how}</button>
        </nav>
        <button className="language-toggle" onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')} aria-label={t.language}><Languages size={15} />{t.language}</button>
      </div>
    </header>

    <div className="shell" id="top">
      <aside className={mobile ? 'drawer open' : 'drawer'}>
        <div className="profile"><div className="profile-avatar">{siteConfig.githubUsername[0].toUpperCase()}</div><div><b>@{siteConfig.githubUsername}</b><small>{t.tagline}</small></div></div>
        <h3>{t.browse}</h3>
        <button className={category === 'all' ? 'selected' : ''} onClick={() => setCategory('all')}>{t.all}<em>{repos.length}</em></button>
        {categories.filter((item) => item.value !== 'all').map((item) => <button key={item.value} className={category === item.value ? 'selected' : ''} onClick={() => setCategory(item.value)}>{item.label}<em>{repos.filter((repo) => repo.category === item.value).length}</em></button>)}
        <div className="sidebar-foot"><a href={siteConfig.repoUrl} target="_blank" rel="noreferrer noopener">{t.viewSource}<ExternalLink size={13} /></a></div>
      </aside>

      <main id="main">
        <section className="hero"><div><p className="eyebrow">{siteConfig.siteName} / {t.browse}</p><h1>{t.hero}</h1><p>{t.tagline}</p></div><div className="hero-actions"><span className={`freshness ${status.status === 'error' ? 'failed' : !isStale ? 'fresh' : ''}`}><span>●</span>{status.status === 'error' ? t.syncFailed : isStale ? t.stale : t.synced}</span><button className="refresh" onClick={load} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} size={15} />{loading ? t.loading : t.refresh}</button></div></section>
        {(status.status === 'rate_limited' || status.status === 'error' || isStale) && <div className={`notice ${status.status === 'error' ? 'danger' : 'warning'}`} role="status">{status.status === 'rate_limited' ? t.rateLimited : status.status === 'error' ? `${t.syncError} ${status.message || ''}` : `${t.stale} ${formatDate(meta.syncedAt, locale === 'ar' ? 'ar-EG' : 'en-US')}.`}</div>}

        {view === 'browse' && <>
          <div className="summary"><span><strong>{repos.length.toLocaleString()}</strong> {t.repos}</span><span><strong>{totalStars.toLocaleString()}</strong> {t.stars}</span><span><strong>{filtered.length.toLocaleString()}</strong> {query || category !== 'all' || language !== 'all' || topic ? t.all : t.repos}</span></div>
          <div className="toolbar"><Select label={t.allCategories} icon={Filter} value={category} onChange={setCategory} options={categories} /><Select label={t.allLanguages} icon={Tag} value={language} onChange={setLanguage} options={languages} /><Select label={t.newest} icon={Star} value={sort} onChange={(value) => { setSort(value); localStorage.setItem('gitstar-sort', value) }} options={[{ value: 'newest', label: t.newest }, { value: 'pushed', label: t.pushed }, { value: 'stars', label: t.stars }, { value: 'alpha', label: t.alpha }]} /><label className="check"><input type="checkbox" checked={archived} onChange={(event) => setArchived(event.target.checked)} />{t.archived}</label>{(query || category !== 'all' || language !== 'all' || topic || archived) && <button className="clear" onClick={clear}><X size={15} />{t.clear}</button>}</div>
          {loading ? <div className="skeleton">{[1, 2, 3].map((item) => <div key={item} />)}</div> : error ? <div className="empty"><p>Unable to load data</p><button onClick={load}>{t.refresh}</button></div> : filtered.length === 0 ? <div className="empty"><p>{t.noResults}</p><button onClick={clear}>{t.clear}</button></div> : <div className="groups">{grouped.map(([id, items]) => <section key={id}><div className="section-title"><h2>{id === 'other' ? t.categoryOther : t[categoryMeta[id]?.i18nKey]}</h2><span>{items.length}</span></div>{items.map((repo) => <RepoCard key={repo.full_name} repo={repo} t={t} locale={locale === 'ar' ? 'ar-EG' : 'en-US'} onTopic={setTopic} />)}</section>)}</div>}
        </>}
        {view === 'changes' && <section className="page"><h1>{t.changes}</h1>{history.events?.length ? history.events.map((event, index) => <article className="event" key={index}><b>{event.type === 'added' ? t.added : t.removed} <a href={event.html_url}>{event.full_name}</a></b><time>{formatDate(event.at, locale)}</time><p>{event.description}</p></article>) : <div className="empty">{t.noChanges}</div>}</section>}
        {view === 'how' && <section className="page"><h1>{t.howTitle}</h1><p>{t.howBody}</p><div className="steps">{t.steps.map((step, index) => <article key={step}><b>0{index + 1}</b><h2>{step}</h2></article>)}</div><pre><code>githubUsername: '{siteConfig.githubUsername}',</code></pre></section>}
      </main>
    </div>
    <footer>{t.footer} · {t.lastSync}: {formatDate(meta.syncedAt, locale)}</footer>
  </>
}
