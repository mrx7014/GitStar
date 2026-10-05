# GitStar — التوثيق العربي

> كل نجمة لها مكان.

GitStar هو دليل داكن ومتجاوب للمستودعات التي عمل لها المستخدم Star على GitHub. المشروع قابل للفورك؛ تغيّر اسم المستخدم في سطر واحد، ثم تنشر نسختك الخاصة وتظل محدثة تلقائيًا كل ساعة.

[الموقع المباشر](https://gitstar-jqnfs9qa.manus.space) · [README الإنجليزي](../README.md) · [المشكلات والاقتراحات](https://github.com/mrx7014/GitStar/issues)

## ماذا يقدم GitStar؟

- تصنيف تلقائي للمستودعات اعتمادًا على Topics والوصف واللغة والاسم.
- Sidebar للتصفح بين التصنيفات، مع بحث وفلاتر وترتيب.
- صفوف مختصرة تعرض المالك والوصف والمواضيع واللغة وعدد النجوم والـ forks وتاريخ الإضافة والروابط.
- سجل يوضح المستودعات التي أضيفت أو أزيلت نجمتها.
- واجهة عربية وإنجليزية مع دعم RTL كامل.
- Dark Mode فقط وتصميم متجاوب للموبايل والكمبيوتر.
- GitHub Action يعمل كل ساعة ويحفظ البيانات في JSON داخل المستودع.
- جاهز للنشر على GitHub Pages أو Vercel أو أي استضافة static.
- لا يحتاج إلى Backend أو قاعدة بيانات أو token داخل الواجهة.

## إنشاء نسخة خاصة بك

### 1. اعمل Fork

اعمل Fork لمستودع [mrx7014/GitStar](https://github.com/mrx7014/GitStar) إلى حسابك، ويفضل أن تترك النسخة Public.

### 2. عدّل ملف الإعداد

افتح `src/config.js` وعدّل اسم المستخدم:

```js
export const siteConfig = {
  githubUsername: 'اسم-مستخدمك-على-GitHub',
  siteName: 'مكتبتي',
  defaultLanguage: 'ar', // أو 'en'
  featuredRepos: [
    'owner/repository',
  ],
  manualCategories: {
    'owner/repository': 'AI & ML',
  },
}
```

في معظم الحالات يكفي تعديل `githubUsername` فقط.

### 3. اسمح للـ Action بالكتابة

من نسخة الـ Fork افتح:

**Settings → Actions → General → Workflow permissions**

ثم اختر **Read and write permissions**. هذا يسمح للـ workflow بحفظ ملفات `public/data/repos.json` و`public/data/history.json` بعد كل مزامنة.

لا تحتاج إلى إنشاء token يدوي للمزامنة العادية؛ GitHub يوفر `GITHUB_TOKEN` داخل الـ Action.

### 4. نفّذ أول مزامنة

محليًا:

```bash
npm install
npm run sync
```

أو ارفع التعديل ثم افتح:

**Actions → Sync GitHub Stars → Run workflow**

سيتم إنشاء أول snapshot وسجل للتغييرات.

### 5. انشر الموقع

- **GitHub Pages:** افتح **Settings → Pages** واختر **GitHub Actions** كمصدر. يوجد workflow جاهز في `.github/workflows/deploy-pages.yml`.
- **Vercel:** استورد الـ Fork في Vercel واترك إعدادات Vite كما هي؛ ملف `vercel.json` يحدد أمر البناء ومجلد `dist`.
- **أي استضافة static:** شغّل `npm run build` وارفع مجلد `dist`.

## التشغيل المحلي

تحتاج إلى Node.js 20 أو أحدث وnpm:

```bash
git clone https://github.com/اسمك/GitStar.git
cd GitStar
npm install
npm run sync
npm run dev
```

يعمل خادم التطوير على المنفذ `3000`. لبناء نسخة الإنتاج:

```bash
npm run build
npm run preview
```

يمكنك استخدام token اختياريًا عند المزامنة المحلية لتحسين حدود GitHub API، لكن لا تضعه في ملفات المشروع:

```bash
GITHUB_TOKEN=ghp_your_token npm run sync
```

## كيف تعمل المزامنة؟

1. يقرأ `scripts/sync-stars.mjs` اسم المستخدم من `src/config.js`.
2. يجلب كل starred repositories عبر GitHub API مع pagination.
3. يطبع البيانات ويصنف كل مستودع باستخدام `src/category-engine.js`.
4. يقارن القائمة الجديدة بالـ snapshot السابق.
5. يحفظ البيانات الحالية في `public/data/repos.json`.
6. يسجل المستودعات المضافة أو المحذوفة في `public/data/history.json`.
7. يرفع GitHub Action ملفات JSON إلى فرع `main`.
8. تقرأ الواجهة أحدث ملفات JSON عند فتح الموقع.

إذا حدث rate limit أو فشل في GitHub API، يحتفظ المشروع بآخر snapshot ناجح بدل أن يعرض صفحة فارغة.

## خريطة المشروع

```text
.github/workflows/sync.yml       مزامنة كل ساعة
.github/workflows/deploy-pages.yml نشر GitHub Pages
docs/README.ar.md                التوثيق العربي
public/data/repos.json           آخر snapshot
public/data/history.json         سجل التغييرات
scripts/sync-stars.mjs           منطق الجلب والمقارنة
src/config.js                    إعداد نسختك الشخصية
src/category-engine.js           قواعد التصنيف
src/App.jsx                      الواجهة والتفاعلات
src/i18n.js                      نصوص العربي والإنجليزي
src/styles.css                   التصميم المتجاوب
```

## التخصيص

### التصنيفات اليدوية

إذا صنف GitStar مستودعًا بطريقة لا تناسبك، أضف override:

```js
manualCategories: {
  'openai/openai-cookbook': 'AI & ML',
  'owner/design-system': 'Design & Creative',
}
```

القواعد الأساسية موجودة في `src/category-engine.js`، ويمكنك إضافة كلمات مفتاحية أو تصنيف جديد.

### المستودعات المميزة

ضع full repository names في `featuredRepos` لإظهارها بلمسة مميزة:

```js
featuredRepos: ['owner/repository', 'another-owner/another-repository']
```

### اللغة والنصوص

استخدم `defaultLanguage: 'ar'` لبدء الموقع بالعربية. يمكن للزائر التبديل بين اللغتين من الهيدر. النصوص موجودة في `src/i18n.js`؛ عند إضافة نص جديد، أضفه باللغتين.

## حل المشكلات

**الـ workflow لا يستطيع رفع ملفات JSON:** تأكد من تفعيل **Read and write permissions** ومن أن GitHub Actions مفعلة في الـ Fork.

**الموقع يعرض بيانات قديمة:** انتظر انتهاء الـ workflow، أو شغّل **Actions → Sync GitHub Stars → Run workflow** يدويًا.

**المزامنة الأولى وصلت إلى rate limit:** شغلها محليًا مع `GITHUB_TOKEN` اختياري، أو انتظر حتى يتجدد الحد. آخر بيانات ناجحة محفوظة.

**GitHub Pages يعرض 404:** من **Settings → Pages** اختر **GitHub Actions** ثم أعد تشغيل **Deploy GitStar to Pages**.

## المساهمة

راجع [CONTRIBUTING.md](../CONTRIBUTING.md) لمعرفة طريقة إرسال التعديلات. نرحب بإصلاحات الوصول، وتحسينات التصنيف، والترجمات، والتعديلات التي تحافظ على فكرة المشروع static-first.

## الترخيص

المشروع متاح تحت [ترخيص MIT](../LICENSE).
