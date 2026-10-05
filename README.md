# GitStar

> Your starred repos, with a point of view.

[![Live site](https://img.shields.io/badge/live_site-GitStar-f2c66d?style=flat-square)](https://gitstar-jqnfs9qa.manus.space)
[![GitHub stars](https://img.shields.io/github/stars/mrx7014/GitStar?style=flat-square&color=f2c66d)](https://github.com/mrx7014/GitStar/stargazers)
[![License](https://img.shields.io/badge/license-MIT-74e0ad?style=flat-square)](LICENSE)

GitStar is a forkable, bilingual, dark-mode directory for GitHub starred repositories. It turns a noisy list of stars into a searchable reference shelf with automatic categories, compact resource rows, and a change log.

**Fork it. Change one line. Publish your own shelf.**

[Live site](https://gitstar-jqnfs9qa.manus.space) · [Arabic documentation](docs/README.ar.md) · [Issues](https://github.com/mrx7014/GitStar/issues)

## Why GitStar?

GitHub Stars are useful as a personal inbox, but the default Stars page is difficult to search, revisit, or shape into a personal knowledge base. GitStar keeps your own static snapshot in the repository, organizes it by topic, and gives you a fast directory you can host anywhere.

The project is intentionally **static-first**:

- No application server or database is required.
- No GitHub token is exposed to the browser.
- The public GitHub REST API is read by a Node sync script.
- GitHub Actions commits fresh JSON data to your repository every hour.
- The frontend only reads the latest committed snapshot.

## Features

- **Automatic organization** from repository topics, descriptions, languages, and names.
- **Compact directory layout** with a category sidebar inspired by practical resource directories.
- **Search** across names, owners, descriptions, topics, languages, and categories.
- **Filters and sorting** for categories, languages, newest stars, recent updates, popularity, and name.
- **Repository rows** with owner, description, topics, language, stars, forks, starred date, GitHub link, demo, and documentation links.
- **Change log** showing repositories added to or removed from the current snapshot.
- **Arabic and English UI**, including RTL layout support.
- **Dark mode only** with responsive desktop, tablet, and mobile layouts.
- **Hourly sync** through `.github/workflows/sync.yml`.
- **GitHub Pages and Vercel ready** with a production build already configured.
- **Manual category overrides** for repositories that need a personal point of view.

## Create your own shelf

### 1. Fork the repository

Fork [mrx7014/GitStar](https://github.com/mrx7014/GitStar) into your own public GitHub account.

### 2. Change the central config

Edit `src/config.js`:

```js
export const siteConfig = {
  githubUsername: 'your-github-username',
  siteName: 'Your Star Shelf',
  defaultLanguage: 'en', // or 'ar'
  featuredRepos: [
    'owner/repository',
  ],
  manualCategories: {
    'owner/repository': 'AI & ML',
  },
}
```

Usually, `githubUsername` is the only value you need to change.

### 3. Allow the sync workflow to write data

In the fork, open **Settings → Actions → General → Workflow permissions** and select **Read and write permissions**. This allows the included action to commit updated `public/data/repos.json` and `public/data/history.json`.

The workflow uses the repository-provided `GITHUB_TOKEN`. You do not need to create or paste a token for the normal hourly sync.

### 4. Run the first sync

You can run the sync locally:

```bash
npm install
npm run sync
```

Or push your config and run **Actions → Sync GitHub Stars → Run workflow**. The first run creates the initial snapshot and change log.

### 5. Publish

Choose one of the following:

- **GitHub Pages:** Open **Settings → Pages**, select **GitHub Actions** as the source, then push to `main` or run **Deploy GitStar to Pages**. The workflow is already included in `.github/workflows/deploy-pages.yml`.
- **Vercel:** Import the fork, keep the detected Vite settings, and deploy. `vercel.json` already points Vercel to `npm run build` and `dist`.
- **Any static host:** Run `npm run build` and upload the generated `dist/` directory.

## Local development

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/your-user/GitStar.git
cd GitStar
npm install
npm run sync
npm run dev
```

The dev server runs on port `3000`. For a production build:

```bash
npm run build
npm run preview
```

For local syncs, an optional token can improve GitHub API limits. Keep it in your shell environment and never commit it:

```bash
GITHUB_TOKEN=ghp_your_token npm run sync
```

## How synchronization works

1. `scripts/sync-stars.mjs` reads `githubUsername` from `src/config.js`.
2. It requests all starred repositories using GitHub API pagination.
3. It normalizes repository metadata and assigns a category with `src/category-engine.js`.
4. It compares the new list with the previous snapshot.
5. It writes the current data to `public/data/repos.json`.
6. It appends added/removed events to `public/data/history.json`.
7. GitHub Actions commits those JSON files back to `main`.
8. The static frontend loads the latest committed files on page load.

If GitHub returns a rate-limit or API error, the previous successful snapshot remains available and the workflow records the attempted status. The site is designed to fail soft rather than go blank.

## Project structure

```text
.
├── .github/workflows/
│   ├── deploy-pages.yml       # GitHub Pages build and deployment
│   └── sync.yml               # Hourly snapshot sync
├── docs/README.ar.md          # Arabic documentation
├── public/data/
│   ├── repos.json             # Latest repository snapshot
│   └── history.json           # Added/removed star events
├── scripts/sync-stars.mjs     # GitHub API sync and diff logic
├── src/
│   ├── App.jsx                # Directory UI and interactions
│   ├── category-engine.js     # Deterministic category rules
│   ├── config.js              # Personal fork configuration
│   ├── i18n.js                # English and Arabic copy
│   └── styles.css             # Responsive dark directory theme
├── app.config.ts              # Webdev project identity
├── vercel.json                # Vercel static build settings
└── vite.config.js             # Vite build settings
```

## Customization

### Manual categories

Automatic categories are intentionally predictable. When a repository belongs somewhere else for your own workflow, add an override:

```js
manualCategories: {
  'openai/openai-cookbook': 'AI & ML',
  'owner/design-system': 'Design & Creative',
}
```

Supported categories are defined in `src/category-engine.js`. Add a new rule when you want the same classification to work for every future snapshot.

### Featured repositories

Add full repository names to `featuredRepos` to mark them with a subtle accent in the directory:

```js
featuredRepos: ['owner/repository', 'another-owner/another-repository']
```

### Language and copy

Set `defaultLanguage` to `ar` to start in Arabic. The interface can still be switched between Arabic and English from the header. User-facing copy lives in `src/i18n.js`; keep both language keys in sync when adding a new label.

## Troubleshooting

**The workflow cannot push updated JSON files.** Confirm that workflow permissions are set to **Read and write permissions** and that Actions are enabled for the fork.

**The site shows the previous snapshot.** That is expected until the workflow completes and commits the new JSON files. Use **Actions → Sync GitHub Stars → Run workflow** for an immediate sync.

**The first sync hits a rate limit.** Run locally with an optional `GITHUB_TOKEN`, or wait for the limit to reset. The last successful data remains safe in the repository.

**GitHub Pages shows a 404.** In **Settings → Pages**, select **GitHub Actions** as the source and rerun **Deploy GitStar to Pages**.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution workflow and design guidelines. Bug reports, category improvements, accessibility fixes, and translation improvements are welcome.

## License

GitStar is released under the [MIT License](LICENSE).
