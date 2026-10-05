# GitStar

مكتبة ثابتة ثنائية اللغة (العربية والإنجليزية) لنجوم GitHub. لا تحتاج إلى backend أو قاعدة بيانات أو أسرار في المتصفح.

## البدء السريع

استخدم **Use this template** من GitHub، ثم عدّل `githubUsername` في `src/config.js`، وفعّل Actions، واضبط صلاحيات Actions على **Read and write**، وشغّل **Sync GitHub Stars**. بعد ذلك فعّل GitHub Pages واختر **GitHub Actions** كمصدر النشر. لا يمكن جعل fork لمستودع عام خاصًا؛ استخدم القالب إذا أردت مستودعًا مستقلًا.

```bash
npm ci
npm run dev
npm test
npm run build
```

يمكن للمتغير `GITHUB_USERNAME` في إعدادات المستودع تجاوز القيمة الموجودة في config. النجوم الخاصة لا تظهر في GitHub API، لذلك تتم مزامنة النجوم العامة فقط.

## المزايا

واجهة داكنة بلون كهرماني، دعم كامل للعربية وRTL، بحث واحد، فلاتر للتصنيف واللغة والمواضيع والمستودعات المؤرشفة، ترتيب، سجل تغييرات، حالة freshness، ومزامنة ساعية آمنة لا تمسح آخر بيانات ناجحة عند الخطأ.

توجد البيانات في `repos.json` و`meta.json` و`status.json` و`history.json`. تستخدم المزامنة نوع GitHub الخاص بالنجوم للحصول على `starred_at` الصحيح، وتستعمل pagination عبر Link header، وإعادة المحاولة، وhash لمنع commits التي لا تغيّر البيانات.

## الإعداد والتصنيف

راجع جدول الإعدادات في [README الإنجليزي](../README.md). تستخدم الخوارزمية مطابقة الكلمات كاملة بأوزان مختلفة للمواضيع والاسم واللغة والوصف، مع إمكانية وضع override لكل مستودع عبر `manualCategories`.

## الاختبار والمساهمة

شغّل `npm test` ثم `npm run build`. راجع [CONTRIBUTING.md](../CONTRIBUTING.md) و[SECURITY.md](../SECURITY.md).
