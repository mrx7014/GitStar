# GitStar

A **static-first, bilingual (English/Arabic, RTL) GitHub stars shelf**. It turns a user's public GitHub stars into a searchable, categorized directory with no backend, database, or browser token.

## Quick start

The recommended path is **Use this template** on GitHub. Then edit `githubUsername` in `src/config.js`, enable Actions on the new repository, set repository Actions permissions to **Read and write**, run **Sync GitHub Stars**, and configure Pages with **GitHub Actions** as its source. Forks of public repositories remain public; use the template if you need an independent private repository for another host.

```bash
npm ci
npm run dev
npm test
npm run build
```

Set `GITHUB_USERNAME` as a repository variable to override the config. `GITHUB_TOKEN` is only used by the Actions/local sync script and is never shipped to the browser. Public stars are the only stars GitHub exposes through this API.

## Features

- Dark charcoal/amber interface with mint success states and mobile-first layout.
- English/Arabic translations with RTL, keyboard focus styles, skip link, and accessible controls.
- Debounced-by-browser single search field, shareable filter-friendly UI, category/language/topic filters, archived toggle, sorting, change log, and refresh state.
- Whole-token weighted categorization with manual overrides and stable category IDs.
- Hourly sync using the star media type, Link-header pagination, retries, safe error snapshots, SHA-256 no-op detection, compact JSON, and Pages deployment dispatch.

## Configuration

| Key | Default | Purpose |
|---|---|---|
| `githubUsername` | `demo` | Public GitHub username; change this first. |
| `siteName` | `GitStar` | Display name. |
| `defaultLanguage` | `en` | `en` or `ar`. |
| `tagline`, `bio` | — | Site copy. |
| `featuredRepos`, `pinnedRepos` | `[]` | Optional full-name lists. |
| `manualCategories` | `{}` | Map `owner/repo` to a stable category ID. |
| `categories` | `undefined` | Optional custom rule extension. |
| `showArchived` | `true` | Whether archived repositories can be shown. |
| `repoUrl` | repository URL | Source link in the UI. |
| `staleAfterHours` | `6` | Freshness threshold. |

## Data and sync

`public/data/repos.json` contains compact v2 repository records. `meta.json` stores the username, count, hash, and sync times. `status.json` stores `ok`, `rate_limited`, or `error` without destroying the last successful snapshot. `history.json` stores up to 500 added/removed events.

The sync workflow runs hourly at minute 17. It commits only real snapshot changes, explicitly triggers Pages after a data push, and creates a monthly keep-alive commit unless `GITSTAR_KEEPALIVE=false`. GitHub disables Actions on new forks by default, so enable them manually.

## Categorization

Topics score 5, name tokens 3, language 2, and description tokens 1. Whole-token matching prevents false positives such as `html` matching `ml`. Ties use a fixed priority order and scores below 3 become `other`. Add rules in `src/category-engine.js` or use `manualCategories` for one-off overrides.

## Deployment and troubleshooting

GitHub Pages uses the project base path provided by `configure-pages`. Vercel, Netlify, and Cloudflare Pages can build with `npm run build` and publish `dist`. If data is stale, check that Actions are enabled, workflow permissions allow writes, Pages uses Actions, and the public repository has not had scheduled workflows disabled after 60 days of inactivity. A rate-limit banner is expected and keeps the old data visible.

## Contributing, security, license

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). GitStar is MIT licensed.
