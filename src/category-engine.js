const rules = [
  { label: 'AI & ML', terms: ['ai', 'ml', 'llm', 'gpt', 'agent', 'transformer', 'neural', 'machine-learning', 'deep-learning', 'rag', 'ollama', 'langchain'] },
  { label: 'Web & Frontend', terms: ['react', 'next', 'vue', 'svelte', 'frontend', 'front-end', 'web', 'css', 'tailwind', 'vite', 'browser', 'html'] },
  { label: 'Developer Tools', terms: ['cli', 'terminal', 'devtool', 'developer', 'sdk', 'api', 'tooling', 'git', 'editor', 'debug', 'workflow'] },
  { label: 'Data & Backend', terms: ['database', 'sql', 'backend', 'server', 'api', 'data', 'postgres', 'redis', 'graphql', 'docker', 'kubernetes'] },
  { label: 'Mobile', terms: ['android', 'ios', 'mobile', 'flutter', 'swift', 'kotlin', 'react-native', 'expo'] },
  { label: 'Security', terms: ['security', 'privacy', 'auth', 'osint', 'pentest', 'vulnerability', 'crypto', 'encryption'] },
  { label: 'Design & Creative', terms: ['design', 'ui', 'ux', 'figma', 'icon', 'font', 'creative', 'animation', '3d', 'game'] },
]

export const categoryLabels = ['AI & ML', 'Web & Frontend', 'Developer Tools', 'Data & Backend', 'Mobile', 'Security', 'Design & Creative', 'Other']

export function classifyRepo(repo, overrides = {}) {
  const key = repo.full_name || `${repo.owner?.login}/${repo.name}`
  if (overrides[key]) return overrides[key]
  const haystack = [repo.name, repo.description, repo.language, ...(repo.topics || [])].filter(Boolean).join(' ').toLowerCase()
  const match = rules.find((rule) => rule.terms.some((term) => haystack.includes(term)))
  return match?.label || 'Other'
}
