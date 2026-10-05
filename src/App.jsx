import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, BookOpen, Check, ChevronDown, Clock3, Code2, ExternalLink, Filter, GitBranch, Globe2, Hash, Languages, LayoutList, Menu, RefreshCw, Search, Settings2, Sparkles, Star, Tag, X } from 'lucide-react'
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
function languageColor(language) {
  const colors = { JavaScript: '#f1c84b', TypeScript: '#4d9cdf', Python: '#71b56b', Go: '#65c8d6', Rust: '#d18a5c', Shell: '#91bd74', HTML: '#e87953', CSS: '#6c9eea', Java: '#df7d53' }
  return colors[language] || '#8aa4a5'
}

function RepoRow({ repo, locale, t, featured = false }) {
  const [owner, name] = repo.full_name.split('/')
  return <article className={`resource-row ${featured ? 'is-featured' : ''}`}>
    <div className="resource-icon">{owner.slice(0, 1).toUpperCase()}</div>
    <div className="resource-main">
      <div className="resource-titleline"><a href={repo.html_url} target="_blank" rel="noreferrer" className="resource-title">{name}</a>{featured && <span className="featured-badge"><Star size={10} fill="currentColor" /> {t.featured}</span>}<a className="row-arrow" href={repo.html_url} target="_blank" rel="noreferrer" aria-label={t.openGithub}><ArrowUpRight size={16} /></a></div>
      <div className="resource-owner">{owner} <span>/</span> {repo.category}</div>
      <p>{repo.description || (locale === 'ar' ? 'لا يوجد وصف لهذا المستودع.' : 'No description provided.')}</p>
      <div className="resource-tags">{(repo.topics || []).slice(0, 5).map((topic) => <span key={topic}>#{topic}</span>)}{repo.language && <span className="language-tag"><i style={{ background: repo.languageColor || languageColor(repo.language) }} />{repo.language}</span>}</div>
    </div>
    <div className="resource-stats"><span><Star size={13} fill="currentColor" />{repo.stargazers_count.toLocaleString()}</span><span><ForkIcon />{repo.forks_count.toLocaleString()}</span><small>{relativeDate(repo.starred_at, locale)}</small></div>
    <div className="resource-actions">{repo.homepage && <a href={repo.homepage} target="_blank" rel="noreferrer" title={t.demo}><Globe2 size={14} /></a>}{repo.documentation && <a href={repo.documentation} target="_blank" rel="noreferrer" title={t.docs}><BookOpen size={14} /></a>}<a href={repo.html_url} target="_blank" rel="noreferrer" title={t.openGithub}><GitBranch size={14} /></a></div>
  </article>
}
function ForkIcon() { return <span className="fork-symbol">⑂</span> }
function StatLine({ icon: Icon, value, label }) { return <div className="side-stat"><Icon size={15} /><span><strong>{value}</strong><small>{label}</small></span></div> }

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
  const [mobileMenu, setMobileMenu] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState({})
  const t = translations[locale]
  const isArabic = locale === 'ar'
  const localeCode = isArabic ? 'ar-EG' : 'en-US'
  const repositories = snapshot.repositories || []

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
  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = isArabic ? 'rtl' : 'ltr'; document.title = `${siteConfig.siteName} — ${siteConfig.tagline}` }, [locale, isArabic])

  const languages = useMemo(() => ['All', ...new Set(repositories.map((repo) => repo.language).filter(Boolean))], [repositories])
  const categories = useMemo(() => ['All', ...new Set(repositories.map((repo) => repo.category).filter(Boolean)), ...categoryLabels].filter((item, index, arr) => arr.indexOf(item) === index), [repositories])
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
  const categoryCounts = useMemo(() => repositories.reduce((acc, repo) => { acc[repo.category] = (acc[repo.category] || 0) + 1; return acc }, {}), [repositories])
  const grouped = useMemo(() => {
    const groups = filtered.reduce((acc, repo) => { (acc[repo.category] ||= []).push(repo); return acc }, {})
    return Object.entries(groups).sort(([, a], [, b]) => new Date(b[0]?.starred_at || 0) - new Date(a[0]?.starred_at || 0))
  }, [filtered])
  const recent = [...repositories].sort((a, b) => new Date(b.starred_at || 0) - new Date(a.starred_at || 0)).slice(0, 6)
  const priorityRepos = siteConfig.pinnedRepos?.length ? repositories.filter((repo) => siteConfig.pinnedRepos.includes(repo.full_name)) : recent
  const isFiltered = Boolean(query || category !== 'All' || language !== 'All')
  const totalStars = repositories.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0)
  const changeEvents = history.events || []
  const clearFilters = () => { setQuery(''); setCategory('All'); setLanguage('All') }
  const navigate = (view) => { setActiveView(view); setMobileMenu(false); window.setTimeout(() => document.getElementById('content-view')?.scrollIntoView({ behavior: 'smooth' }), 20) }

  return <div className="app-shell">
    <header className="topbar"><div className="topbar-inner"><button className="mobile-menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu"><Menu size={19} /></button><a className="brand" href="#top"><span className="brand-mark"><Star size={15} fill="currentColor" /></span><span>Git<span>Star</span></span></a><div className="top-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchPlaceholder} /></div><nav className={`nav-links ${mobileMenu ? 'open' : ''}`}><button className={activeView === 'shelf' ? 'active' : ''} onClick={() => navigate('shelf')}>{t.navShelf}</button><button className={activeView === 'changes' ? 'active' : ''} onClick={() => navigate('changes')}>{t.navChanges}{changeEvents.length > 0 && <b>{changeEvents.length}</b>}</button><button className={activeView === 'how' ? 'active' : ''} onClick={() => navigate('how')}>{t.navHow}</button></nav><div className="topbar-actions"><button className="language-switch" onClick={() => setLocale(isArabic ? 'en' : 'ar')}><Languages size={15} />{t.switchLang}</button><a className="top-icon" href={`https://github.com/${siteConfig.githubUsername}`} target="_blank" rel="noreferrer" aria-label="GitHub"><GitBranch size={17} /></a></div></div></header>

    <main className="site-layout container" id="top">
      <aside className={`sidebar ${mobileMenu ? 'mobile-visible' : ''}`}>
        <div className="sidebar-profile"><div className="profile-avatar">{siteConfig.githubUsername.slice(0, 1).toUpperCase()}</div><div><strong>@{siteConfig.githubUsername}</strong><small>{isArabic ? 'مكتبة GitHub الشخصية' : 'Personal GitHub shelf'}</small></div></div>
        <div className="sidebar-nav"><span className="sidebar-label">{isArabic ? 'التصفح' : 'BROWSE'}</span><button className={category === 'All' && activeView === 'shelf' ? 'selected' : ''} onClick={() => { setCategory('All'); navigate('shelf') }}><LayoutList size={15} />{t.allRepos}<em>{repositories.length}</em></button>{categories.filter((item) => item !== 'All').map((item) => <button key={item} className={category === item && activeView === 'shelf' ? 'selected' : ''} onClick={() => { setCategory(item); navigate('shelf') }}><Hash size={14} />{item}<em>{categoryCounts[item] || 0}</em></button>)}</div>
        <div className="sidebar-divider" /><div className="sidebar-nav"><span className="sidebar-label">{isArabic ? 'مختارات' : 'SHORTCUTS'}</span><button onClick={() => { setQuery(''); setSort('newest'); navigate('shelf') }}><Clock3 size={15} />{t.recent}</button><button onClick={() => navigate('changes')}><Sparkles size={15} />{t.changes}<em>{changeEvents.length}</em></button></div>
        <div className="sidebar-footer"><div className="sync-label"><span className="status-dot" />{isArabic ? 'محدث تلقائيًا' : 'Auto-updated'}</div><small>{t.lastSync} {snapshot.syncedAt ? formatDate(snapshot.syncedAt, localeCode) : t.never}</small><a href="https://github.com/mrx7014/GitStar" target="_blank" rel="noreferrer">{t.viewSource} <ArrowUpRight size={12} /></a></div>
      </aside>

      <section className="main-content" id="content-view">
        {activeView === 'shelf' && <>
          <section className="directory-header"><div><span className="breadcrumb"><a href="#top">GitStar</a><span>/</span>{category === 'All' ? (isArabic ? 'كل النجوم' : 'All stars') : category}</span><h1>{category === 'All' ? t.heroTitle.replace('\n', ' ') : category}</h1><p>{category === 'All' ? (isArabic ? 'كل ما أعجبك على GitHub، مرتبًا في مكان واحد وقابلًا للبحث.' : 'Everything you liked on GitHub, arranged in one searchable place.') : `${categoryCounts[category] || 0} ${t.repositories}`}</p></div><div className="header-actions"><button className="sync-button" onClick={() => loadSnapshot(true)} disabled={syncState === 'loading'}><RefreshCw className={syncState === 'loading' ? 'spin' : ''} size={15} />{syncState === 'loading' ? t.syncing : t.sync}</button></div></section>
          <div className="info-banner"><div className="info-mark">!</div><div><strong>{isArabic ? 'مكتبتك تتحدث تلقائيًا' : 'Your shelf stays fresh'}</strong><p>{isArabic ? 'يعمل GitHub Action كل ساعة لجلب أي نجوم جديدة. زر المزامنة يعيد تحميل آخر نسخة محفوظة.' : 'A GitHub Action checks for new stars every hour. Sync now reloads the latest saved snapshot.'}</p></div><Settings2 size={17} /></div>
          {!isFiltered && priorityRepos.length > 0 && <section className="priority-panel"><div className="priority-heading"><div><span className="section-index">00</span><h2>{isArabic ? 'الأهم أولًا' : 'Start here'}</h2><p>{siteConfig.pinnedRepos?.length ? (isArabic ? 'المستودعات التي اخترتها كأولوية.' : 'Your pinned repositories.') : (isArabic ? 'آخر ما أضفته إلى مكتبتك.' : 'Your latest additions.')}</p></div><Sparkles size={17} /></div><div className="priority-grid">{priorityRepos.map((repo) => <PriorityRepo key={repo.full_name} repo={repo} locale={locale} />)}</div></section>}
          <div className="toolbar"><div className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchPlaceholder} /></div><SelectIcon icon={Filter} value={category} onChange={setCategory} options={categories} label={t.allCategories} /><SelectIcon icon={Code2} value={language} onChange={setLanguage} options={languages} label={t.allLanguages} /><SelectIcon icon={Tag} value={sort} onChange={setSort} options={[{ value: 'newest', label: t.newest }, { value: 'updated', label: t.recentlyUpdated }, { value: 'stars', label: t.mostStarred }, { value: 'alpha', label: t.alphabetical }]} label={t.sortBy} />{(query || category !== 'All' || language !== 'All') && <button className="clear-button" onClick={clearFilters}><X size={14} /></button>}</div>
          {filtered.length === 0 ? <div className="empty-state"><div className="empty-mark"><Star size={23} /></div><h3>{t.noResults}</h3><button className="text-button" onClick={clearFilters}>{isArabic ? 'إظهار كل النجوم' : 'Show all stars'}</button></div> : <div className="directory-sections">{grouped.map(([group, items], groupIndex) => { const expanded = Boolean(expandedGroups[group] || isFiltered); const visibleItems = expanded ? items : items.slice(0, 6); return <section className="directory-section" key={group}><div className="section-heading"><div><span className="section-index">{String(groupIndex + 1).padStart(2, '0')}</span><h2>{group}</h2><span className="section-count">{items.length}</span></div><span className="section-rule" /></div><div className="resource-list">{visibleItems.map((repo) => <RepoRow key={repo.full_name} repo={repo} locale={locale} t={t} featured={siteConfig.featuredRepos.includes(repo.full_name)} />)}</div>{items.length > 6 && !isFiltered && <button className="group-more" onClick={() => setExpandedGroups((current) => ({ ...current, [group]: !expanded }))}>{expanded ? (isArabic ? 'إخفاء العناصر' : 'Show less') : (isArabic ? `عرض كل ${items.length} مستودعًا` : `View all ${items.length} repositories`)}<ChevronDown className={expanded ? 'rotate' : ''} size={14} /></button>}</section>})}</div>}
        </>}
        {activeView === 'changes' && <ChangeLog events={changeEvents} locale={locale} t={t} />}
        {activeView === 'how' && <HowItWorks t={t} />}
      </section>
    </main>
    <footer className="footer container"><span>{t.footer}</span><span>{repositories.length} {t.repositories} · {t.lastSync} {snapshot.syncedAt ? formatDate(snapshot.syncedAt, localeCode) : t.never}</span></footer>
  </div>
}

function SelectIcon({ icon: Icon, value, onChange, options, label }) { const normalized = options.map((option) => typeof option === 'string' ? { value: option, label: option === 'All' ? label : option } : option); return <label className="select-box"><Icon size={14} /><select value={value} onChange={(event) => onChange(event.target.value)}>{normalized.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select><ChevronDown size={13} /></label> }
function PriorityRepo({ repo, locale }) { return <a className="priority-card" href={repo.html_url} target="_blank" rel="noreferrer"><span className="priority-avatar">{repo.name.slice(0, 1).toUpperCase()}</span><span className="priority-copy"><strong>{repo.name}</strong><small>{repo.description || (locale === 'ar' ? 'بدون وصف' : 'No description')}</small></span><span className="priority-arrow"><ArrowUpRight size={14} /></span></a> }
function ChangeLog({ events, locale, t }) { return <div className="page-view"><div className="directory-header"><div><span className="breadcrumb">GitStar <span>/</span> {t.changes}</span><h1>{t.changes}</h1><p>{locale === 'ar' ? 'تاريخ بسيط يوضح كيف تتغير مكتبتك مع الوقت.' : 'A simple record of how your shelf changes over time.'}</p></div></div>{events.length === 0 ? <div className="empty-state"><h3>{t.noChanges}</h3></div> : <div className="timeline">{events.map((event, index) => <div className="timeline-item" key={`${event.full_name}-${event.at}-${index}`}><div className={`timeline-dot ${event.type}`} /><div className="timeline-content"><div><strong>{event.type === 'added' ? t.added : t.removed} <a href={event.html_url} target="_blank" rel="noreferrer">{event.full_name}</a></strong><span>{formatDate(event.at, locale === 'ar' ? 'ar-EG' : 'en-US')}</span></div><p>{event.type === 'added' ? (locale === 'ar' ? 'أصبح جزءًا من مكتبتك.' : 'Joined your personal shelf.') : (locale === 'ar' ? 'لم يعد ضمن النجوم الحالية.' : 'Left your current stars.')}</p></div></div>)}</div>}</div> }
function HowItWorks({ t }) { return <div className="page-view"><div className="directory-header"><div><span className="breadcrumb">GitStar <span>/</span> {t.navHow}</span><h1>{t.howTitle}</h1><p>{t.howBody}</p></div></div><div className="steps"><div className="step"><span>01</span><GitBranch size={20} /><h3>{t.step1}</h3><p>{t.step1Body}</p></div><div className="step"><span>02</span><Code2 size={20} /><h3>{t.step2}</h3><p>{t.step2Body}</p></div><div className="step"><span>03</span><Globe2 size={20} /><h3>{t.step3}</h3><p>{t.step3Body}</p></div></div><div className="how-code"><div className="code-label"><span className="traffic"><i /><i /><i /></span><span>src/config.js</span></div><pre><code><span className="code-key">githubUsername</span>: <span className="code-string">'your-github-username'</span>,{`\n`}<span className="code-key">siteName</span>: <span className="code-string">'My Star Shelf'</span>,</code></pre></div></div> }
