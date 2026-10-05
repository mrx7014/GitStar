const definitions = [
  ['ai-ml', 'categoryAiMl', '#c084fc', ['ai','ml','llm','gpt','agent','transformer','neural','machine-learning','deep-learning','rag','ollama','langchain']],
  ['web-frontend', 'categoryWebFrontend', '#61dafb', ['react','next','vue','svelte','frontend','front-end','web','css','tailwind','vite','browser','html']],
  ['developer-tools', 'categoryDeveloperTools', '#f2c66d', ['cli','terminal','devtool','developer','sdk','api','tooling','git','editor','debug','workflow']],
  ['backend-data', 'categoryBackendData', '#70a5ff', ['database','sql','backend','server','api','data','postgres','redis','graphql']],
  ['mobile', 'categoryMobile', '#74e0ad', ['android','ios','mobile','flutter','swift','kotlin','dart','react-native','expo']],
  ['android-modding', 'categoryAndroidModding', '#8be28b', ['root','magisk','kernelsu','lsposed','rom','kernel','recovery','gsi','twrp','odin']],
  ['linux-shell', 'categoryLinuxShell', '#b4c7dc', ['shell','bash','zsh','tmux','terminal','termux','dotfiles','distro','linux']],
  ['security', 'categorySecurity', '#ff938d', ['security','privacy','pentest','exploit','recon','wifi','bug-bounty','hacking','ctf','reverse-engineering','malware']],
  ['devops-selfhost', 'categoryDevopsSelfhost', '#67d4cf', ['docker','kubernetes','ci','self-hosted','homelab','proxy','vpn','tunnel']],
  ['design-creative', 'categoryDesignCreative', '#f6a6c1', ['design','ui','ux','figma','icon','font','creative','animation','3d','game']],
  ['learning-resources', 'categoryLearningResources', '#e7d38a', ['awesome','roadmap','tutorial','cheatsheet','course','books','learning']],
]
export const categoryMeta = Object.fromEntries(definitions.map(([id, i18nKey, color]) => [id, { id, i18nKey, color }]))
export const categoryOrder = [...definitions.map(([id]) => id), 'other']
const defaultRules = Object.fromEntries(definitions.map(([id, , , terms]) => [id, terms]))
const tokens = (value) => String(value || '').toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean).flatMap((token) => token.includes('-') ? [token, ...token.split('-')] : [token])
export function classifyRepo(repo = {}, overrides = {}, customRules) {
  const key = repo.full_name || `${repo.owner?.login || repo.owner || ''}/${repo.name || ''}`
  if (overrides[key]) return overrides[key]
  const rules = { ...defaultRules, ...(customRules || {}) }
  const topicTokens = new Set((repo.topics || []).flatMap(tokens)); const nameTokens = new Set(tokens(repo.name || key.split('/').pop())); const descriptionTokens = new Set(tokens(repo.description)); const language = String(repo.language || '').toLowerCase()
  const scores = Object.entries(rules).map(([id, terms]) => { let score = 0; for (const term of terms) { const t = tokens(term); if (t.some((x) => topicTokens.has(x))) score += 5; if (t.some((x) => nameTokens.has(x))) score += 3; if (language === term.toLowerCase()) score += 2; if (t.some((x) => descriptionTokens.has(x))) score += 1 } if (id === 'mobile' && ['kotlin','swift','dart'].includes(language)) score += 2; if (id === 'linux-shell' && ['shell','powershell'].includes(language)) score += 2; return [id, score] }).sort((a,b) => b[1] - a[1] || categoryOrder.indexOf(a[0]) - categoryOrder.indexOf(b[0]))
  return scores[0]?.[1] >= 3 ? scores[0][0] : 'other'
}
export const categoryLabels = categoryOrder
