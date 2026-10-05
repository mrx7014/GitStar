import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, BookOpen, Check, ChevronDown, Clock3, Code2, Filter, GitBranch, Globe2, Languages, LayoutGrid, ListFilter, RefreshCw, Search, Sparkles, Star, Tag, X } from 'lucide-react'
import { siteConfig } from './config'
import { translations } from './i18n'
import { categoryLabels } from './category-engine'

const DATA_ROOT = `${import.meta.env.BASE_URL}data/`

function formatDate(value, locale, fallback = '—') {
  if (!value) return fallback
  try { return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value)) } catch { return fallback }
}

function relativeDate(value, locale) {
  if (!value) return '—'
  const days = Math.round((Date.now() - new Date(value).getTime()) / 86400000)
  if (days <= 0) return locale === 'ar' ? 'اليوم' : 'today'
  if (days === 1) return locale === 'ar' ? 'منذ يوم' : 'yesterday'
  return locale === 'ar' ? `منذ ${days} يومًا` : `${days} days ago`
}

function Stat({ icon: Icon, value, label }) {
  return <div className="stat"><div className="stat-icon"><Icon size={16} strokeWidth={1.7} /></div><strong>{value}</strong><span>{label}</span></div>
}

function RepoCard({ repo, locale, t, featured = false }) {
  const [owner, name] = repo.full_name.split('/')
  return <article className={`repo-card ${featured ? 'repo-card--featured' : ''}`}>
    <div className="card-topline"><span className="category-dot" /> <span className="category-label">{repo.category}</span><a className="card-external" href={repo.html_url} target="_blank" rel="noreferrer" aria-label={`${t.openGithub}: ${repo.name}`}><ArrowUpRight size={17} /></a></div>
    <div className="repo-heading"><div className="repo-avatar">{owner.slice(0, 1).toUpperCase()}</div><div><h3>{name}</h3><p className="repo-owner">{owner}</p></div></div>
    <p className="repo-description">{repo.description || (locale === 'ar' ? 'لا يوجد وصف لهذا المستودع.' : 'No description provided.')}</p>
    <div className="topics">{(repo.topics || []).slice(0, 4).map((topic) => <span key={topic}>{topic}</span>)}{repo.topics?.length > 4 && <span>+{repo.topics.length - 4}</span>}</div>
    <div className="repo-meta"><span className="language"><i style={{ background: repo.languageColor || '#74f0c0' }} />{repo.language || '—'}</span><span><Star size={14} fill="currentColor" /> {repo.stargazers_count.toLocaleString()}</span><span><GitForkIcon /> {repo.forks_count.toLocaleString()}</span></div>
    <div className="repo-footer"><span className="repo-date"><Clock3 size={13} /> {relativeDate(repo.starred_at, locale)}</span><div className="repo-links">{repo.homepage && <a href={repo.homepage} target="_blank" rel="noreferrer"><Globe2 size={13} />{t.demo}</a>}{repo.documentation && <a href={repo.documentation} target="_blank" rel="noreferrer"><BookOpen size={13} />{t.docs}</a>}<a className="github-link" href={repo.html_url} target="_blank" rel="noreferrer"><GitBranch size={13} />{t.openGithub}</a></div></div>
  </article>
}

function GitForkIcon() { return <span className="fork-icon">⑂</span> }

function EmptyState({ t }) { return <div className="empty-state"><div className="empty-mark"><Star size={25} /></div><h3>{t.emptyTitle}</h3><p>{t.emptyBody}</p><code>npm run sync</code></div> }

export default function App() {
  const [locale, setLocale] = useState(siteConfig.defaultLanguage)
  const [snapshot, setSnapshot] = useState({ repositories: [], syncedAt: null, status: 'empty' })
  const [history, setHistory] = useState({ events: [] })
  const [activeView, setActiveView] = useState('shelf')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [language, setLanguage] = useState('All')
  const [sort, setSort] = useState('newest')
  const [syncState, setSyncState] = useState('idle')
  const [loadError, setLoadError] = useState(false)
  const t = translations[locale]
  const isArabic = locale === 'ar'
  const localeCode = isArabic ? 'ar-EG' : 'en-US'

  const loadSnapshot = async (announce = false) => {
    if (announce) setSyncState('loading')
    try {
      const stamp = `?v=${Date.now()}`
      const [dataResponse, historyResponse] = await Promise.all([fetch(`${DATA_ROOT}repos.json${stamp}`), fetch(`${DATA_ROOT}history.json${stamp}`)])
      if (!dataResponse.ok) throw new Error('snapshot unavailable')
      setSnapshot(await dataResponse.json())
      if (historyResponse.ok) setHistory(await historyResponse.json())
      setLoadError(false)
      if (announce) { setSyncState('success'); window.setTimeout(() => setSyncState('idle'), 2600) }
    } catch {
      setLoadError(true)
      if (announce) { setSyncState('error'); window.setTimeout(() => setSyncState('idle'), 3600) }
    }
  }

  useEffect(() => { loadSnapshot() }, [])
  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = isArabic ? 'rtl' : 'ltr'; document.title = `${siteConfig.siteName} — ${t.tagline || siteConfig.tagline}` }, [locale, isArabic, t.tagline])

  const repositories = snapshot.repositories || []
  const languages = useMemo(() => ['All', ...new Set(repositories.map((repo) => repo.language).filter(Boolean))], [repositories])
  const categories = useMemo(() => ['All', ...new Set(repositories.map((repo) => repo.category).filter(Boolean)), ...categoryLabels.filter((item) => repositories.some((repo) => repo.category === item))].filter((item, index, arr) => arr.indexOf(item) === index), [repositories])
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return repositories.filter((repo) => {
      const matchesQuery = !needle || [repo.name, repo.full_name, repo.description, repo.language, repo.category, ...(repo.topics || [])].filter(Boolean).join(' ').toLowerCase().includes(needle)
      return matchesQuery && (category === 'All' || repo.category === category) && (language === 'All' || repo.language === language)
    }).sort((a, b) => {
      if (sort === 'updated') return new Date(b.pushed_at || 0) - new Date(a.pushed_at || 0)
      if (sort === 'stars') return b.stargazers_count - a.stargazers_count
      if (sort === 'alpha') return a.name.localeCompare(b.name)
      return new Date(b.starred_at || 0) - new Date(a.starred_at || 0)
    })
  }, [repositories, query, category, language, sort])

  const featured = repositories.filter((repo) => siteConfig.featuredRepos.includes(repo.full_name)).slice(0, 3)
  const recent = [...repositories].sort((a, b) => new Date(b.starred_at || 0) - new Date(a.starred_at || 0)).slice(0, 3)
  const updated = [...repositories].sort((a, b) => new Date(b.pushed_at || 0) - new Date(a.pushed_at || 0)).slice(0, 3)
  const totalStars = repositories.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0)
  const changeEvents = history.events || []

  const scrollToShelf = () => { setActiveView('shelf'); window.setTimeout(() => document.getElementById('shelf')?.scrollIntoView({ behavior: 'smooth' }), 20) }
  const clearFilters = () => { setQuery(''); setCategory('All'); setLanguage('All') }

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#top" aria-label="GitStar home"><span className="brand-mark"><Star size={16} fill="currentColor" /></span><span>Git<span>Star</span></span></a><nav className="nav-links" aria-label="Primary"><button className={activeView === 'shelf' ? 'active' : ''} onClick={() => { setActiveView('shelf'); scrollToShelf() }}>{t.navShelf}</button><button className={activeView === 'changes' ? 'active' : ''} onClick={() => { setActiveView('changes'); document.getElementById('content-view')?.scrollIntoView({ behavior: 'smooth' }) }}>{t.navChanges}{changeEvents.length > 0 && <b>{changeEvents.length}</b>}</button><button className={activeView === 'how' ? 'active' : ''} onClick={() => { setActiveView('how'); document.getElementById('content-view')?.scrollIntoView({ behavior: 'smooth' }) }}>{t.navHow}</button></nav><div className="topbar-actions"><a className="icon-button" href={`https://github.com/${siteConfig.githubUsername}`} target="_blank" rel="noreferrer" aria-label="GitHub profile"><GitBranch size={18} /></a><button className="language-switch" onClick={() => setLocale(isArabic ? 'en' : 'ar')}><Languages size={16} />{t.switchLang}</button></div></header>

    <main id="top">
      <section className="hero container"><div className="hero-copy"><div className="eyebrow"><span />{t.eyebrow}</div><h1>{t.heroTitle.split('\n').map((line, i) => <span key={line} className={i === 1 ? 'accent-line' : ''}>{line}<br /></span>)}</h1><p>{t.heroBody}</p><div className="hero-actions"><button className="primary-button" onClick={scrollToShelf}>{t.explore}<ArrowUpRight size={16} /></button><button className="quiet-button" onClick={() => loadSnapshot(true)} disabled={syncState === 'loading'}><RefreshCw className={syncState === 'loading' ? 'spin' : ''} size={16} />{syncState === 'loading' ? t.syncing : t.sync}</button></div><div className="config-note"><span className="status-dot" />{t.configuredFor} <a href={`https://github.com/${siteConfig.githubUsername}`} target="_blank" rel="noreferrer">@{siteConfig.githubUsername}</a><span className="sep">·</span>{t.lastSync} {snapshot.syncedAt ? formatDate(snapshot.syncedAt, localeCode) : t.never}</div></div><div className="hero-visual"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="star-orb"><Star size={52} fill="currentColor" strokeWidth={1.1} /></div><div className="floating-card floating-card--top"><span className="mini-label">{isArabic ? 'النبض الحالي' : 'CURRENT PULSE'}</span><strong>{repositories.length || '—'} <small>{t.repositories}</small></strong><span className="pulse-line"><i /><i /><i /><i /><i /><i /><i /></span></div><div className="floating-card floating-card--bottom"><span className="mini-icon"><Sparkles size={13} /></span><span><strong>{isArabic ? 'تصنيف تلقائي' : 'AUTO-CURATED'}</strong><small>{isArabic ? 'بواسطة المواضيع واللغة' : 'by topics + language'}</small></span><Check size={16} className="check-icon" /></div></div></section>

      <section className="stats-strip container"><Stat icon={LayoutGrid} value={repositories.length} label={t.repositories} /><Stat icon={Tag} value={new Set(repositories.map((repo) => repo.category)).size || '—'} label={t.categories} /><Stat icon={Code2} value={new Set(repositories.map((repo) => repo.language).filter(Boolean)).size || '—'} label={t.languages} /><Stat icon={Star} value={totalStars ? totalStars.toLocaleString() : '—'} label={t.stars} /></section>

      <section className="content-wrap container" id="content-view">
        {loadError && <div className="notice notice-error"><X size={16} />{t.syncError}<button onClick={() => loadSnapshot(true)}>{t.sync}</button></div>}
        {snapshot.status === 'rate_limited' && <div className="notice notice-warning"><Clock3 size={16} />{t.rateLimit}</div>}
        {activeView === 'shelf' && <>
          {(featured.length > 0 || recent.length > 0) && <div className="spotlight-grid"><section className="spotlight-panel"><div className="section-heading"><div><span className="section-kicker">01 / {t.featured}</span><h2>{t.featured}</h2></div><Sparkles size={19} /></div>{featured.length > 0 ? <div className="spotlight-list">{featured.map((repo) => <MiniRepo key={repo.full_name} repo={repo} locale={locale} />)}</div> : <div className="quiet-empty">{isArabic ? 'أضف مستودعات مميزة في src/config.js' : 'Add featured repos in src/config.js'}</div>}</section><section className="spotlight-panel spotlight-panel--recent"><div className="section-heading"><div><span className="section-kicker">02 / {t.recent}</span><h2>{t.recent}</h2></div><Clock3 size={19} /></div><div className="spotlight-list">{recent.map((repo) => <MiniRepo key={repo.full_name} repo={repo} locale={locale} />)}</div></section></div>}
          <div className="shelf-heading" id="shelf"><div><span className="section-kicker">03 / {t.allRepos}</span><h2>{t.allRepos} <em>{filtered.length}</em></h2></div><p>{t.refreshNote}</p></div>
          <div className="filters"><div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchPlaceholder} /></div><SelectIcon icon={Filter} value={category} onChange={setCategory} options={categories} label={t.allCategories} /><SelectIcon icon={Code2} value={language} onChange={setLanguage} options={languages} label={t.allLanguages} /><SelectIcon icon={ListFilter} value={sort} onChange={setSort} options={[{ value: 'newest', label: t.newest }, { value: 'updated', label: t.recentlyUpdated }, { value: 'stars', label: t.mostStarred }, { value: 'alpha', label: t.alphabetical }]} label={t.sortBy} />{(query || category !== 'All' || language !== 'All') && <button className="clear-button" onClick={clearFilters}><X size={14} />{isArabic ? 'مسح' : 'Clear'}</button>}</div>
          {filtered.length > 0 ? <div className="repo-grid">{filtered.map((repo) => <RepoCard key={repo.full_name} repo={repo} locale={locale} t={t} featured={siteConfig.featuredRepos.includes(repo.full_name)} />)}</div> : <EmptyState t={t} />}
        </>}
        {activeView === 'changes' && <ChangeLog events={changeEvents} locale={locale} t={t} />}
        {activeView === 'how' && <HowItWorks locale={locale} t={t} />}
      </section>
    </main>
    <footer className="footer container"><span>{t.footer}</span><a href="https://github.com/mrx7014/GitStar" target="_blank" rel="noreferrer">{t.viewSource} <ArrowUpRight size={14} /></a></footer>
  </div>
}

function SelectIcon({ icon: Icon, value, onChange, options, label }) {
  const normalized = options.map((option) => typeof option === 'string' ? { value: option, label: option === 'All' ? label : option } : option)
  return <label className="select-box"><Icon size={15} /><select value={value} onChange={(event) => onChange(event.target.value)}>{normalized.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select><ChevronDown size={14} /></label>
}

function MiniRepo({ repo, locale }) { return <a className="mini-repo" href={repo.html_url} target="_blank" rel="noreferrer"><span className="mini-repo-mark">{repo.name.slice(0, 1).toUpperCase()}</span><span className="mini-repo-copy"><strong>{repo.name}</strong><small>{repo.description || (locale === 'ar' ? 'بدون وصف' : 'No description')}</small></span><ArrowUpRight size={15} /></a> }

function ChangeLog({ events, locale, t }) { return <div className="change-log"><div className="page-heading"><span className="section-kicker">04 / {t.changes}</span><h2>{t.changes}</h2><p>{locale === 'ar' ? 'تاريخ صغير يوضح كيف تتغير مكتبتك مع الوقت.' : 'A small record of how your shelf changes over time.'}</p></div>{events.length === 0 ? <div className="empty-state"><div className="empty-mark"><Clock3 size={24} /></div><h3>{t.noChanges}</h3></div> : <div className="timeline">{events.map((event, index) => <div className="timeline-item" key={`${event.full_name}-${event.at}-${index}`}><div className={`timeline-dot ${event.type}`} /> <div className="timeline-content"><div><strong>{event.type === 'added' ? t.added : t.removed} <a href={event.html_url} target="_blank" rel="noreferrer">{event.full_name}</a></strong><span>{formatDate(event.at, locale === 'ar' ? 'ar-EG' : 'en-US')}</span></div><p>{event.type === 'added' ? (locale === 'ar' ? 'أصبحت جزءًا من مكتبتك.' : 'Joined your personal shelf.') : (locale === 'ar' ? 'لم تعد ضمن النجوم الحالية.' : 'Left your current stars.')}</p></div></div>)}</div>}</div> }

function HowItWorks({ t }) { return <div className="how"><div className="page-heading"><span className="section-kicker">05 / {t.navHow}</span><h2>{t.howTitle}</h2><p>{t.howBody}</p></div><div className="steps"><div className="step"><span>01</span><GitBranch size={22} /><h3>{t.step1}</h3><p>{t.step1Body}</p></div><div className="step"><span>02</span><Code2 size={22} /><h3>{t.step2}</h3><p>{t.step2Body}</p></div><div className="step"><span>03</span><Globe2 size={22} /><h3>{t.step3}</h3><p>{t.step3Body}</p></div></div><div className="how-code"><div className="code-label"><span className="traffic"><i /><i /><i /></span><span>src/config.js</span></div><pre><code><span className="code-key">githubUsername</span>: <span className="code-string">'your-github-username'</span>,{`\n`}<span className="code-key">siteName</span>: <span className="code-string">'My Star Shelf'</span>,</code></pre></div></div> }
