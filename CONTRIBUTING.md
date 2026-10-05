# Contributing to GitStar

Thanks for helping make GitStar a better personal knowledge shelf.

## Before opening an issue

Search existing issues first. For bugs, include the browser, viewport, language, reproduction steps, and whether the problem appears in the local dev server or after a static build. Do not include GitHub tokens or other credentials.

## Local setup

```bash
npm install
npm run sync
npm run dev
```

Before opening a pull request, run:

```bash
npm run build
```

## Pull requests

Keep pull requests focused and explain the user-facing result. Update both English and Arabic copy when changing visible labels. Preserve the static-first architecture: do not make a server, database, or required secret a dependency without discussing the trade-off in the issue first.

For category changes, add or update deterministic rules in `src/category-engine.js`. For configuration changes, keep the fork path simple and document the setting in both README files.

## Design guidelines

GitStar uses a practical dark directory style: compact rows, clear section headings, a calm navy surface, and a small amber accent. Prefer information density with readable spacing over decorative dashboards. Every interaction should work with keyboard focus and remain usable on a narrow mobile viewport.

## Commit style

Use short imperative commit messages, for example:

- `feat: add category filter`
- `fix: preserve last snapshot on rate limit`
- `docs: clarify Pages setup`

## License

By contributing, you agree that your contribution can be distributed under the MIT License in this repository.
