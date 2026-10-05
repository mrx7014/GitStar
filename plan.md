# خطة GitStar

## النطاق والقرارات
GitStar قالب Public مفتوح المصدر يعرض starred repositories لأي مستخدم GitHub. بعد عمل Fork، يغيّر المستخدم اسم الحساب في `src/config.js` ثم يشغّل المزامنة ويبني وينشر نسخة static خاصة به. الاستضافة الافتراضية الموصى بها GitHub Pages، مع دعم Vercel.

لا يحتاج الموقع إلى خادم خاص أو مفاتيح سرية: GitHub Actions يستدعي GitHub REST API العام كل ساعة ويحفظ آخر snapshot في `public/data/*.json`. الواجهة تعرض آخر بيانات ناجحة حتى عند فشل المزامنة.

## التصميم
- **الحركة البصرية:** Dark developer editorial؛ لوحة تحكم عملية ممزوجة بإحساس terminal هادئ.
- **المبادئ:** كثافة معلومات مقروءة، تسلسل بصري واضح، تباين قوي، وواجهات صغيرة قابلة للتخصيص.
- **فلسفة الألوان:** خلفية فحمية عميقة للتركيز، طبقات رمادية زرقاء لفصل المحتوى، وmint/teal كلون ثقة وحركة بدل البنفسجي الشائع.
- **نمط التخطيط:** شريط علوي ثابت ومقدمة split-layout؛ الإحصائيات في شريط أفقي؛ النتائج في شبكة مرنة مع فلاتر sticky على الشاشات الكبيرة.
- **العناصر المميزة:** علامة نجمة داخل إطار شبكي، شريط accent mint، ووسوم topics ذات حدود رفيعة.
- **التفاعل والحركة:** تحديثات فورية للبحث والفلاتر، hover lift خفيف للبطاقات، وtransition قصير 160ms؛ لا توجد حركة زخرفية تعيق القراءة.
- **الخطوط:** Inter للعناوين والإنجليزية، Noto Sans Arabic للعربية، مع monospace للـ metadata والـ username.
- **جوهر العلامة:** "رف شخصي ذكي لكل ما يستحق نجمة على GitHub"؛ الشخصية: منظم، هادئ، مفتوح.
- **صوت العلامة:** مباشر وتقني دون تعقيد. أمثلة: "Your starred repos, with a point of view." و"كل نجمة لها مكان." 
- **الشعار:** نجمة مكوّنة من خمس وحدات مربعة حول نقطة مركزية، بجانب wordmark `GitStar`.
- **لون العلامة:** `#74f0c0` mint أخضر مميز.

## بنية المشروع
- `src/`: تطبيق الواجهة، المكونات، الترجمة، وخوارزمية التصنيف.
- `public/data/`: snapshot وhistory الناتجان من المزامنة.
- `scripts/sync-stars.mjs`: جلب starred repos، التصنيف، diff، وكتابة JSON.
- `.github/workflows/sync.yml`: تشغيل المزامنة كل ساعة وعلى الطلب.
- `README.md`: شرح عربي/إنجليزي للفورك والإعداد والبناء والنشر.
- `public/manus-routes.json`: manifest للمسارات.

## التنفيذ
1. تطبيق static React/Vite خفيف يعمل على port 3000 في Preview.
2. إعداد مركزي في `src/config.js` يحدد `githubUsername`, `siteName`, `defaultLanguage`, `featuredRepos`, و`manualCategories`.
3. الواجهة تقرأ البيانات من JSON محليًا وتدعم حالة تحميل/خطأ وSync Now عبر إعادة جلب snapshot.
4. المزامنة في Node script تستخدم REST API pagination، وتدعم `GITHUB_TOKEN` اختياريًا لتحسين limits في Actions دون إلزام المستخدم به.
5. التصنيف التلقائي deterministically من topics والاسم والوصف واللغة، مع override يدوي.
6. بناء GitHub Pages عبر Actions، وVercel عبر `vercel.json` وbuild command.

## قيود
- لا نضع token في الواجهة أو المستودع.
- GitHub API public قد يعيد rate limit؛ نعرض آخر snapshot ونوضح وقت آخر مزامنة.
- الزر Sync Now يعيد تحميل آخر snapshot من الموقع؛ التحديث الفعلي يتم عبر workflow أو تشغيل script محليًا.
