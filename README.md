# GitStar

> Your starred repos, with a point of view.

GitStar is a polished, bilingual, dark-mode shelf for GitHub starred repositories. Fork it, change one line, publish it, and your own shelf stays fresh every hour.

[Live preview](https://github.com/mrx7014/GitStar) · [العربية](#العربية)

## What you get

- Responsive static site for GitHub Pages or Vercel.
- Arabic/English UI with full RTL support.
- Automatic categorization from topics, description, language, and repository name.
- Search, category/language filters, sorting, featured picks, recent stars, and a change log.
- Hourly GitHub Actions sync with an optional `GITHUB_TOKEN` provided automatically by Actions.
- No app server, database, or frontend secret required.

## Make your own shelf

1. Fork this repository and keep the fork public.
2. Edit `src/config.js`:

```js
export const siteConfig = {
  githubUsername: 'your-github-username',
  siteName: 'Your Star Shelf',
  defaultLanguage: 'en', // use 'ar' for Arabic
  featuredRepos: ['owner/repository'],
  manualCategories: {
    'owner/repository': 'AI & ML',
  },
}
```

3. Run `npm install` and `npm run sync` locally once to create your first snapshot.
4. Push the changes. The included workflow runs every hour at minute 17 and can also be started from **Actions → Sync GitHub Stars → Run workflow**.
5. Publish with GitHub Pages (recommended) or connect the fork to Vercel.

The sync script uses the public GitHub API and never puts a token in the browser. For local development, an optional `GITHUB_TOKEN` improves rate limits:

```bash
GITHUB_TOKEN=your_token npm run sync
```

## Local development

```bash
npm install
npm run sync
npm run dev
```

Then open the URL printed by Vite. Production build:

```bash
npm run build
npm run preview
```

## GitHub Pages

In the fork, open **Settings → Pages**, choose **GitHub Actions** as the source, and add this simple deployment workflow if you want Pages deployment:

```yaml
name: Deploy GitStar
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

The included `vite.config.js` uses a relative base, so the generated site works from a repository subpath as well as a custom domain.

## Project map

- `src/config.js` — the only file most forks need to edit.
- `src/App.jsx` and `src/styles.css` — the responsive bilingual interface.
- `src/category-engine.js` — deterministic automatic categorization.
- `scripts/sync-stars.mjs` — GitHub API sync, normalization, diff, and JSON output.
- `public/data/repos.json` — latest successful snapshot.
- `public/data/history.json` — added/removed star events.
- `.github/workflows/sync.yml` — hourly sync workflow.

## Contributing

Issues and pull requests are welcome. Keep the site static-first, avoid adding required secrets, and preserve both language versions when changing user-facing copy.

## License

MIT. See [LICENSE](LICENSE).

---

## العربية

GitStar هو رف داكن واحترافي ومتجاوب للمستودعات التي عمل لها المستخدم Star على GitHub. اعمل Fork، غيّر سطرًا واحدًا، وانشر نسختك؛ وسيحافظ GitHub Actions على تحديثها كل ساعة.

### كيف تعمل نسخة لنفسك؟

1. اعمل Fork للمستودع واجعل النسخة Public.
2. افتح `src/config.js` وعدّل `githubUsername` إلى اسم مستخدم GitHub الخاص بك. يمكنك تغيير `siteName` واللغة الافتراضية وإضافة مستودعات مميزة أو تصنيفات يدوية.
3. شغّل `npm install` ثم `npm run sync` لإنشاء أول snapshot.
4. ارفع التعديلات. الـ workflow الموجود في `.github/workflows/sync.yml` يعمل تلقائيًا كل ساعة، ويمكن تشغيله يدويًا من تبويب **Actions**.
5. انشر من **Settings → Pages** باستخدام **GitHub Actions**، أو اربط المستودع بـ Vercel.

لا يحتاج GitStar إلى Backend أو قاعدة بيانات أو مفتاح سري داخل الواجهة. البيانات المحدثة تُحفظ في `public/data/`، لذلك يعمل الموقع كصفحة static بالكامل. يستخدم السكربت GitHub API العام، ويمكن وضع `GITHUB_TOKEN` اختياريًا عند التشغيل المحلي لتحسين حدود الطلبات.

### التخصيص

- `defaultLanguage: 'ar'` لتبدأ الواجهة بالعربية.
- `featuredRepos` لإظهار اختياراتك المميزة.
- `manualCategories` لإجبار مستودع معين على تصنيف محدد.
- خوارزمية التصنيف الأساسية موجودة في `src/category-engine.js` ويمكن توسيعها بإضافة كلمات مفتاحية.

### التشغيل المحلي

```bash
npm install
npm run sync
npm run dev
```

ثم افتح الرابط الذي يطبعه Vite. لإنشاء نسخة الإنتاج استخدم `npm run build`.

## License

MIT — انظر ملف [LICENSE](LICENSE).
