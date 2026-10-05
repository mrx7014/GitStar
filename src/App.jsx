import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, ChevronDown, ExternalLink, GitBranch, GitFork, Globe, Languages, Menu, Moon, Network, Paintbrush, RefreshCw, RotateCcw, Search, SlidersHorizontal, Star, Sun, Users, X } from 'lucide-react'
import { siteConfig } from './config'
import { categoryMeta, categoryOrder } from './category-engine'
import { translations } from './i18n'
import AnimatedNetworkCanvas from './AnimatedNetworkCanvas'

const basePath = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`
const root = `${basePath}data/`
const cacheKey = `gitstar-data-cache-v2:${siteConfig.githubUsername}`
const pageSize = 60
const safeUrl = (value) => /^https?:\/\//i.test(value || '') ? value : ''
const readStorage = (key) => { try { return localStorage.getItem(key) } catch { return null } }
const writeStorage = (key, value) => { try { localStorage.setItem(key, value) } catch { /* Storage may be disabled or full. */ } }
const canvasSettingsKey = 'gitstar-canvas-settings-v1'
const defaultCanvasSettings = { density: 1, lineAmount: 1, size: 1, speed: 1, color: 'auto', movement: 'drift', shape: 'dots' }
const canvasShapes = ['dots', 'squares', 'diamonds', 'triangles', 'mixed']
const boundedSetting = (value, fallback, min, max) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback
}
const readCanvasSettings = () => {
  try {
    const saved = JSON.parse(readStorage(canvasSettingsKey) || '{}')
    const color = saved.color === 'auto' || /^#[0-9a-f]{6}$/i.test(saved.color || '') ? saved.color : defaultCanvasSettings.color
    const movement = ['drift', 'pulse', 'orbit', 'wave', 'still'].includes(saved.movement) ? saved.movement : defaultCanvasSettings.movement
    const shape = canvasShapes.includes(saved.shape) ? saved.shape : defaultCanvasSettings.shape
    return {
      density: boundedSetting(saved.density, defaultCanvasSettings.density, 0.5, 1.8),
      lineAmount: boundedSetting(saved.lineAmount, defaultCanvasSettings.lineAmount, 0, 2),
      size: boundedSetting(saved.size, defaultCanvasSettings.size, 0.6, 1.8),
      speed: boundedSetting(saved.speed, defaultCanvasSettings.speed, 0.25, 2.5),
      color,
      movement,
      shape,
    }
  } catch {
    return { ...defaultCanvasSettings }
  }
}
const canvasColorPresets = [
  { value: 'auto', color: 'linear-gradient(135deg, #dce8f4 50%, #45576b 50%)', label: 'canvasColorAuto' },
  { value: '#38bdf8', color: '#38bdf8', label: 'canvasColorCyan' },
  { value: '#a78bfa', color: '#a78bfa', label: 'canvasColorViolet' },
  { value: '#fbbf24', color: '#fbbf24', label: 'canvasColorAmber' },
  { value: '#34d399', color: '#34d399', label: 'canvasColorMint' },
  { value: '#fb7185', color: '#fb7185', label: 'canvasColorRose' },
]
const languageIconSlugs = {
  javascript: 'javascript', typescript: 'typescript', python: 'python', java: 'java', c: 'c',
  'c++': 'cplusplus', 'c#': 'csharp', go: 'go', rust: 'rust', ruby: 'ruby', php: 'php',
  kotlin: 'kotlin', swift: 'swift', dart: 'dart', html: 'html5', css: 'css3', scss: 'sass', sass: 'sass',
  shell: 'bash', bash: 'bash', 'jupyter notebook': 'jupyter', lua: 'lua', haskell: 'haskell', scala: 'scala',
  perl: 'perl', powershell: 'powershell', dockerfile: 'docker', vue: 'vuejs', svelte: 'svelte',
  'objective-c': 'objectivec', elixir: 'elixir', erlang: 'erlang', clojure: 'clojure', crystal: 'crystal',
  julia: 'julia', matlab: 'matlab', nim: 'nim', ocaml: 'ocaml', solidity: 'solidity', zig: 'zig',
  'vim script': 'vim', markdown: 'markdown', groovy: 'groovy', fortran: 'fortran',
}
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
const categoryAnchor = (value) => `category-${String(value).replace(/[^a-z0-9_-]/gi, '-')}`

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

function LanguageBadge({ language }) {
  const [iconFailed, setIconFailed] = useState(false)
  const slug = languageIconSlugs[String(language).toLowerCase()]
  const iconUrl = slug ? `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${slug}/${slug}-original.svg` : ''
  return <span className="language" title={language}>
    {iconUrl && !iconFailed ? <img className="language-logo" src={iconUrl} alt="" aria-hidden="true" loading="lazy" decoding="async" onError={() => setIconFailed(true)} /> : <i className="language-monogram" aria-hidden="true">{String(language).slice(0, 1).toUpperCase()}</i>}
    <span>{language}</span>
  </span>
}

function RepoCard({ repo, contributors, t, locale }) {
  const category = categoryMeta[repo.category]
  const [imageFailed, setImageFailed] = useState(false)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const generatedPreviewUrl = `https://opengraph.githubassets.com/${repo.id || '1'}/${repo.full_name}`
  const primaryPreviewUrl = safeUrl(repo.preview_url) || generatedPreviewUrl
  const [imageUrl, setImageUrl] = useState(primaryPreviewUrl)
  const ownerAvatarUrl = safeUrl(repo.owner_avatar_url) || (repo.owner ? `https://github.com/${encodeURIComponent(repo.owner)}.png?size=80` : '')
  useEffect(() => {
    setImageUrl(primaryPreviewUrl)
    setImageFailed(false)
  }, [primaryPreviewUrl])
  const contributorCount = contributors?.[repo.full_name]?.count
  const contributorValue = Number.isFinite(contributorCount) ? contributorCount.toLocaleString(locale) : '—'
  return <article className="repo-card">
    <a className="repo-preview" href={safeUrl(repo.html_url)} target="_blank" rel="noreferrer noopener" aria-label={`${repo.owner}/${repo.name} preview`}>
      {!imageFailed ? <img src={imageUrl} alt="" loading="lazy" decoding="async" onError={() => { if (imageUrl !== generatedPreviewUrl) setImageUrl(generatedPreviewUrl); else setImageFailed(true) }} /> : <span className="repo-preview-fallback"><GitBranch size={24} aria-hidden="true" /><strong>{t.previewUnavailable}</strong></span>}
    </a>
    <div className="repo-body">
      <div className="repo-title">
        <div className="repo-avatar" aria-hidden="true">{ownerAvatarUrl && !avatarFailed ? <img src={ownerAvatarUrl} alt="" loading="lazy" decoding="async" onError={() => setAvatarFailed(true)} /> : <span>{repo.owner?.[0]?.toUpperCase() || '?'}</span>}</div>
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
        {(repo.topics || []).slice(0, 4).map((topic) => <span className="topic-chip" key={topic}>#{topic}</span>)}
        {repo.language && <LanguageBadge language={repo.language} />}
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
  const [canvasPreviewActive, setCanvasPreviewActive] = useState(false)
  const [canvasSettings, setCanvasSettings] = useState(readCanvasSettings)
  const [canvasSettingsOpen, setCanvasSettingsOpen] = useState(false)
  const canvasSettingsRoot = useRef(null)
  const [canvasBurst, setCanvasBurst] = useState(false)
  const canvasBurstTimer = useRef(0)
  const canvasPreviewTimer = useRef(0)
  const [guideOpen, setGuideOpen] = useState(() => readStorage('gitstar-guide-hidden') !== 'true')
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [data, setData] = useState(() => initialSnapshot?.data || { repositories: [] })
  const [contributors, setContributors] = useState(() => initialSnapshot?.contributors || {})
  const [meta, setMeta] = useState(() => initialSnapshot?.meta || {})
  const [status, setStatus] = useState(() => initialSnapshot?.status || {})
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get('q') || '')
  const [sort, setSort] = useState(() => new URLSearchParams(location.search).get('sort') || readStorage('gitstar-sort') || 'newest')
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const [loading, setLoading] = useState(() => !initialSnapshot?.data?.repositories?.length)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [mobile, setMobile] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [profileImageFailed, setProfileImageFailed] = useState(false)
  const t = translations[locale] || translations.en
  const repos = data.repositories || []
  const formatLocale = locale === 'ar' ? 'ar-EG' : 'en-US'

  const dismissGuide = () => {
    if (dontShowAgain) writeStorage('gitstar-guide-hidden', 'true')
    setGuideOpen(false)
  }
  const toggleNetworkBackground = () => {
    const next = !networkEnabled
    writeStorage('gitstar-network-background', next ? 'on' : 'off')
    setNetworkEnabled(next)
  }
  const updateCanvasSetting = (key, value) => setCanvasSettings((current) => {
    const next = { ...current, [key]: value }
    writeStorage(canvasSettingsKey, JSON.stringify(next))
    return next
  })
  const resetCanvasSettings = () => {
    const next = { ...defaultCanvasSettings }
    setCanvasSettings(next)
    writeStorage(canvasSettingsKey, JSON.stringify(next))
  }
  const previewCanvasBurst = () => {
    window.clearTimeout(canvasBurstTimer.current)
    window.clearTimeout(canvasPreviewTimer.current)
    setCanvasPreviewActive(true)
    setCanvasBurst(true)
    canvasPreviewTimer.current = window.setTimeout(() => {
      setCanvasBurst(false)
      setCanvasPreviewActive(false)
    }, 1450)
  }
  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark')

  const load = async ({ refresh = false } = {}) => {
    setError('')
    const refreshStartedAt = refresh ? Date.now() : 0
    if (refresh) {
      window.clearTimeout(canvasPreviewTimer.current)
      setCanvasPreviewActive(false)
      setRefreshing(true)
      setCanvasBurst(true)
      window.clearTimeout(canvasBurstTimer.current)
    }
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
      if (refresh) {
        setRefreshing(false)
        const remaining = Math.max(0, 1250 - (Date.now() - refreshStartedAt))
        canvasBurstTimer.current = window.setTimeout(() => setCanvasBurst(false), remaining)
      }
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => () => {
    window.clearTimeout(canvasBurstTimer.current)
    window.clearTimeout(canvasPreviewTimer.current)
  }, [])
  useEffect(() => {
    if (!canvasSettingsOpen) return undefined
    const onPointerDown = (event) => { if (!canvasSettingsRoot.current?.contains(event.target)) setCanvasSettingsOpen(false) }
    const onKeyDown = (event) => { if (event.key === 'Escape') setCanvasSettingsOpen(false) }
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [canvasSettingsOpen])
  useEffect(() => {
    if (canvasSettingsOpen) document.getElementById('canvas-density')?.focus()
  }, [canvasSettingsOpen])
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
    const updateScrollState = () => setScrolled(window.scrollY > 320)
    updateScrollState()
    window.addEventListener('scroll', updateScrollState, { passive: true })
    return () => window.removeEventListener('scroll', updateScrollState)
  }, [])
  useEffect(() => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (sort !== 'newest') params.set('sort', sort)
    window.history.replaceState(null, '', `${location.pathname}${params.toString() ? `?${params}` : ''}${location.hash}`)
  }, [query, sort])
  useEffect(() => { setVisibleCount(pageSize) }, [query, sort])
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

  const normalizedQuery = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    return repos.filter((repo) => {
      const haystack = [repo.full_name, repo.description, repo.language, repo.category, ...(repo.topics || [])].join(' ').toLowerCase()
      return !normalizedQuery || haystack.includes(normalizedQuery)
    }).sort((a, b) => sort === 'stars' ? b.stars - a.stars : sort === 'alpha' ? a.name.localeCompare(b.name) : sort === 'pushed' ? new Date(b.pushed_at || 0) - new Date(a.pushed_at || 0) : new Date(b.starred_at || 0) - new Date(a.starred_at || 0))
  }, [repos, normalizedQuery, sort])
  const displayed = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])
  const categoryCounts = useMemo(() => repos.reduce((counts, repo) => { counts[repo.category] = (counts[repo.category] || 0) + 1; return counts }, {}), [repos])
  const filteredCategoryCounts = useMemo(() => filtered.reduce((counts, repo) => { counts[repo.category] = (counts[repo.category] || 0) + 1; return counts }, {}), [filtered])
  const categories = categoryOrder.map((id) => ({ value: id, label: id === 'all' ? t.all : id === 'other' ? t.categoryOther : t[categoryMeta[id]?.i18nKey] }))
  const grouped = useMemo(() => {
    const groups = {}
    for (const repo of displayed) (groups[repo.category] ??= []).push(repo)
    return Object.entries(groups).sort((a, b) => categoryOrder.indexOf(a[0]) - categoryOrder.indexOf(b[0]))
  }, [displayed])
  const totalStars = useMemo(() => repos.reduce((total, repo) => total + (repo.stars || 0), 0), [repos])
  const isStale = meta.syncedAt && Date.now() - new Date(meta.syncedAt) > siteConfig.staleAfterHours * 3600000
  const jumpToCategory = (id) => {
    if (id === 'all') {
      setQuery('')
      setVisibleCount(pageSize)
      setMobile(false)
      window.setTimeout(() => document.getElementById('repository-list')?.scrollIntoView({ block: 'start' }), 80)
      return
    }
    const index = filtered.findIndex((repo) => repo.category === id)
    if (index < 0) return
    setVisibleCount(Math.min(filtered.length, Math.max(visibleCount, Math.ceil((index + 1) / pageSize) * pageSize)))
    setMobile(false)
    window.setTimeout(() => document.getElementById(categoryAnchor(id))?.scrollIntoView({ block: 'start' }), 80)
  }

  return <div className="app">
    <AnimatedNetworkCanvas active={networkEnabled || canvasPreviewActive} theme={theme} refreshing={canvasBurst} settings={canvasSettings} />
    <div className="app-content">
      <a className="skip" href="#main">Skip to content</a>
      <header className={scrolled ? 'has-floating-menu' : ''}>
        <div className="bar">
          <button className={`icon-btn menu${scrolled ? ' is-hidden' : ''}`} type="button" aria-label={mobile ? t.closeMenu : t.menu} aria-controls="site-drawer" aria-expanded={mobile} onClick={() => setMobile(!mobile)}>{mobile ? <X /> : <Menu />}</button>
          <a className="brand" href="#top"><img className="brand-mark" src={`${basePath}favicon.svg`} width="36" height="36" alt="" /><span>GitStar</span></a>
          <div className="global-search"><Search size={16} aria-hidden="true" /><input id="global-search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Escape' && setQuery('')} placeholder={t.search} /><kbd>⌘K</kbd></div>
          <button className="language-toggle" onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')} aria-label={t.language}><Languages size={15} />{t.language}</button>
          <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? t.switchToLight : t.switchToDark} title={theme === 'dark' ? t.switchToLight : t.switchToDark}>
            {theme === 'dark' ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
            <span className="theme-label">{theme === 'dark' ? t.themeLight : t.themeDark}</span>
          </button>
          <div className="canvas-customizer" ref={canvasSettingsRoot}>
            <button className="network-toggle customize-trigger" type="button" aria-haspopup="dialog" aria-expanded={canvasSettingsOpen} aria-controls="canvas-settings" aria-label={t.customizeBackground} title={t.customizeBackground} onClick={() => setCanvasSettingsOpen((open) => !open)}>
              <SlidersHorizontal size={16} aria-hidden="true" /><span className="network-toggle-label">{t.customizeBackground}</span><span className={`canvas-status-dot${networkEnabled ? ' is-active' : ''}`} aria-hidden="true" /><ChevronDown className="customize-chevron" size={13} aria-hidden="true" />
            </button>
            {canvasSettingsOpen && <section className="canvas-settings" id="canvas-settings" role="dialog" aria-labelledby="canvas-settings-title">
              <div className="canvas-settings-heading">
                <div><p className="canvas-settings-kicker">{t.customizeBackground}</p><h2 id="canvas-settings-title">{t.canvasPanelTitle}</h2><small>{t.canvasPanelHint}</small></div>
                <button className="canvas-settings-close" type="button" aria-label={t.canvasClose} onClick={() => setCanvasSettingsOpen(false)}><X size={16} /></button>
              </div>
              <button className="canvas-enable" type="button" role="switch" aria-checked={networkEnabled} aria-label={t.canvasOn} onClick={toggleNetworkBackground}>
                <span>{t.canvasOn}</span><span className="toggle-track" aria-hidden="true"><i /></span>
              </button>
              <button className="canvas-preview-burst" type="button" aria-pressed={canvasBurst} title={t.canvasPreviewHint} onClick={previewCanvasBurst}><RefreshCw className={canvasBurst ? 'spin' : ''} size={14} aria-hidden="true" />{t.canvasPreviewEffect}</button>
              <label className="canvas-setting">
                <span className="canvas-setting-heading"><span>{t.canvasDensity}</span><output>{Math.round(canvasSettings.density * 100).toLocaleString(formatLocale)}%</output></span>
                <input id="canvas-density" type="range" min="0.5" max="1.8" step="0.05" value={canvasSettings.density} aria-label={t.canvasDensity} onChange={(event) => updateCanvasSetting('density', Number(event.target.value))} />
              </label>
              <label className="canvas-setting">
                <span className="canvas-setting-heading"><span>{t.canvasLineAmount}</span><output>{Math.round(canvasSettings.lineAmount * 100).toLocaleString(formatLocale)}%</output></span>
                <input type="range" min="0" max="2" step="0.05" value={canvasSettings.lineAmount} aria-label={t.canvasLineAmount} onChange={(event) => updateCanvasSetting('lineAmount', Number(event.target.value))} />
              </label>
              <label className="canvas-setting">
                <span className="canvas-setting-heading"><span>{t.canvasSize}</span><output>{Math.round(canvasSettings.size * 100).toLocaleString(formatLocale)}%</output></span>
                <input type="range" min="0.6" max="1.8" step="0.05" value={canvasSettings.size} aria-label={t.canvasSize} onChange={(event) => updateCanvasSetting('size', Number(event.target.value))} />
              </label>
              <label className="canvas-setting">
                <span className="canvas-setting-heading"><span>{t.canvasSpeed}</span><output>{Math.round(canvasSettings.speed * 100).toLocaleString(formatLocale)}%</output></span>
                <input type="range" min="0.25" max="2.5" step="0.05" value={canvasSettings.speed} aria-label={t.canvasSpeed} onChange={(event) => updateCanvasSetting('speed', Number(event.target.value))} />
              </label>
              <div className="canvas-setting-block">
                <span className="canvas-setting-heading"><span><Paintbrush size={14} aria-hidden="true" />{t.canvasColor}</span></span>
                <div className="canvas-color-options">
                  {canvasColorPresets.map((preset) => <button key={preset.value} className="canvas-color-option" type="button" aria-label={t[preset.label]} title={t[preset.label]} aria-pressed={canvasSettings.color === preset.value} onClick={() => updateCanvasSetting('color', preset.value)}><span style={{ background: preset.color }} /></button>)}
                </div>
                <label className="canvas-custom-color" htmlFor="canvas-custom-color"><span>{t.canvasCustomColor}</span><input id="canvas-custom-color" type="color" value={canvasSettings.color.startsWith('#') ? canvasSettings.color : '#38bdf8'} aria-label={t.canvasCustomColor} onChange={(event) => updateCanvasSetting('color', event.target.value)} /></label>
              </div>
              <label className="canvas-setting-block canvas-motion-setting">
                <span className="canvas-setting-heading"><span>{t.canvasMovement}</span></span>
                <select className="canvas-motion-select" value={canvasSettings.movement} aria-label={t.canvasMovement} onChange={(event) => updateCanvasSetting('movement', event.target.value)}>
                  <option value="drift">{t.canvasMovementDrift}</option><option value="pulse">{t.canvasMovementPulse}</option><option value="orbit">{t.canvasMovementOrbit}</option><option value="wave">{t.canvasMovementWave}</option><option value="still">{t.canvasMovementStill}</option>
                </select>
              </label>
              <label className="canvas-setting-block canvas-motion-setting">
                <span className="canvas-setting-heading"><span>{t.canvasShape}</span></span>
                <select className="canvas-shape-select" value={canvasSettings.shape} aria-label={t.canvasShape} onChange={(event) => updateCanvasSetting('shape', event.target.value)}>
                  <option value="dots">{t.canvasShapeDots}</option><option value="squares">{t.canvasShapeSquares}</option><option value="diamonds">{t.canvasShapeDiamonds}</option><option value="triangles">{t.canvasShapeTriangles}</option><option value="mixed">{t.canvasShapeMixed}</option>
                </select>
              </label>
              <div className="canvas-settings-actions"><button type="button" onClick={resetCanvasSettings}><RotateCcw size={14} aria-hidden="true" />{t.canvasReset}</button></div>
            </section>}
          </div>
        </div>
      </header>
      {mobile && <button className="menu-scrim" type="button" aria-label={t.closeMenu} onClick={() => setMobile(false)} />}

      <div className="shell" id="top">
        <aside className={mobile ? 'drawer open' : 'drawer'} id="site-drawer">
          <div className="profile"><div className="profile-avatar">{!profileImageFailed ? <img src={`https://github.com/${encodeURIComponent(siteConfig.githubUsername)}.png?size=80`} alt="" loading="lazy" decoding="async" onError={() => setProfileImageFailed(true)} /> : <span>{siteConfig.githubUsername[0].toUpperCase()}</span>}</div><div><b>@{siteConfig.githubUsername}</b><small>{t.tagline}</small></div></div>
          <h3>{t.browse}</h3>
          <button onClick={() => jumpToCategory('all')}>{t.all}<em>{repos.length.toLocaleString(formatLocale)}</em></button>
          {categories.filter((item) => item.value !== 'all').map((item) => <button key={item.value} onClick={() => jumpToCategory(item.value)}>{item.label}<em>{(categoryCounts[item.value] || 0).toLocaleString(formatLocale)}</em></button>)}
          <div className="sidebar-foot"><a href={siteConfig.repoUrl} target="_blank" rel="noreferrer noopener">{t.viewSource}<ExternalLink size={13} /></a></div>
        </aside>

        <main id="main">
          <section className="hero"><div><p className="eyebrow">{siteConfig.siteName} / {t.browse}</p><h1>{t.hero}</h1><p>{t.tagline}</p></div><div className="hero-actions"><span className={`freshness ${status.status === 'error' ? 'failed' : !isStale ? 'fresh' : ''}`}><span>●</span>{status.status === 'error' ? t.syncFailed : isStale ? t.stale : t.synced}</span><button className="refresh" onClick={() => load({ refresh: true })} disabled={refreshing}><RefreshCw className={refreshing ? 'spin' : ''} size={15} />{refreshing ? t.loading : t.refresh}</button></div></section>
          {(status.status === 'rate_limited' || status.status === 'error' || isStale) && <div className={`notice ${status.status === 'error' ? 'danger' : 'warning'}`} role="status">{status.status === 'rate_limited' ? t.rateLimited : status.status === 'error' ? `${t.syncError} ${status.message || ''}` : `${t.stale} ${formatDate(meta.syncedAt, locale === 'ar' ? 'ar-EG' : 'en-US')}.`}</div>}

          <div className="summary"><span><strong>{repos.length.toLocaleString(formatLocale)}</strong> {t.repos}</span><span><strong>{totalStars.toLocaleString(formatLocale)}</strong> {t.stars}</span><span><strong>{filtered.length.toLocaleString(formatLocale)}</strong> {query ? t.matching : t.repos}</span></div>
          <div className="toolbar">
            <Select label={t.newest} icon={Star} value={sort} onChange={(value) => { setSort(value); writeStorage('gitstar-sort', value) }} options={[{ value: 'newest', label: t.newest }, { value: 'pushed', label: t.pushed }, { value: 'stars', label: t.stars }, { value: 'alpha', label: t.alpha }]} />
            {query && <button className="clear" onClick={() => setQuery('')}><X size={15} />{t.clearSearch}</button>}
          </div>
          {loading ? <div className="skeleton">{[1, 2, 3].map((item) => <div key={item} />)}</div> : error ? <div className="empty"><p>Unable to load data</p><button onClick={() => load({ refresh: true })}>{t.refresh}</button></div> : filtered.length === 0 ? <div className="empty"><p>{t.noResults}</p><button onClick={() => setQuery('')}>{t.clearSearch}</button></div> : <>
            <div className="groups" id="repository-list">{grouped.map(([id, items]) => <section id={categoryAnchor(id)} key={id}><div className="section-title"><h2>{id === 'other' ? t.categoryOther : t[categoryMeta[id]?.i18nKey]}</h2><span>{(filteredCategoryCounts[id] || 0).toLocaleString(formatLocale)}</span></div>{items.map((repo) => <RepoCard key={repo.full_name} repo={repo} contributors={contributors} t={t} locale={formatLocale} />)}</section>)}</div>
            {filtered.length > visibleCount && <button className="load-more" type="button" onClick={() => setVisibleCount((count) => Math.min(count + pageSize, filtered.length))}>{t.loadMore}<span>+{Math.min(pageSize, filtered.length - visibleCount).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}</span></button>}
          </>}
        </main>
      </div>
      <footer>{t.footer} · {t.lastSync}: {formatDate(meta.syncedAt, locale)}</footer>
    </div>
    {scrolled && <button className="floating-menu" type="button" aria-label={mobile ? t.closeMenu : t.menu} aria-controls="site-drawer" aria-expanded={mobile} onClick={() => setMobile(!mobile)}>{mobile ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}<span>{mobile ? t.closeMenu : t.menu}</span></button>}
    {guideOpen && <div className="guide-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) dismissGuide() }}>
      <section className="guide-dialog" role="dialog" aria-modal="true" aria-labelledby="guide-title" aria-describedby="guide-intro">
        <button className="guide-close" type="button" aria-label={t.guideClose} onClick={dismissGuide}><X size={18} /></button>
        <p className="guide-kicker">GitStar · {t.guideLabel}</p>
        <h2 id="guide-title">{t.guideTitle}</h2>
        <p className="guide-intro" id="guide-intro">{t.guideIntro}</p>
        <ol className="guide-steps">
          <li><span className="guide-icon"><Search size={17} /></span><div><strong>{t.guideSearchTitle}</strong><p>{t.guideSearchBody}</p></div></li>
          <li><span className="guide-icon"><Menu size={17} /></span><div><strong>{t.guideCategoriesTitle}</strong><p>{t.guideCategoriesBody}</p></div></li>
          <li><span className="guide-icon"><GitBranch size={17} /></span><div><strong>{t.guideCardsTitle}</strong><p>{t.guideCardsBody}</p></div></li>
        </ol>
        <p className="guide-tip"><Network size={15} aria-hidden="true" />{t.guideNetworkTip}</p>
        <label className="guide-preference"><input type="checkbox" checked={dontShowAgain} onChange={(event) => setDontShowAgain(event.target.checked)} />{t.dontShowAgain}</label>
        <button className="guide-start" id="guide-start" type="button" onClick={dismissGuide}>{t.guideStart}</button>
      </section>
    </div>}
  </div>
}
