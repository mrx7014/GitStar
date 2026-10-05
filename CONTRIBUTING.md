# Contributing

GitStar uses a charcoal-navy dark theme with an amber `#f2c66d` accent and mint success states. Keep the project static-first and fork-friendly: no backend, database, browser token, or heavy UI framework.

Before opening a pull request, run `npm ci`, `npm test`, and `npm run build`. Keep visible strings in `src/i18n.js` and preserve English/Arabic key parity. Use stable English category IDs in data and translated labels in the UI. New interactive controls need keyboard focus, labels, and RTL review.
