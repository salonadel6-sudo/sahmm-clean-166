# دليل حزم ونشر Hostinger

هذا الدليل خاص بحزمة PHP الكاملة لاستضافة Hostinger المشتركة. لا تحتاج الحزمة إلى Node.js على الخادم.

## إنشاء الحزم

من جذر المشروع شغّل:

```bash
node scripts/build-hostinger.mjs --php-only
```

بعد نجاح البناء ستجد:

| نوع الاستضافة | ملف ZIP | طريقة تشغيله |
|---|---|---|
| استضافة Hostinger المشتركة | `generated-artifacts/php/cleanflow-services-hostinger.zip` | PHP 7.4 أو أحدث وSQLite عبر `pdo_sqlite` و`sqlite3` |

تظهر المسارات الكاملة في نهاية سجل البناء. لا ترفع ملفات البناء أو أرشيفات التحديث القديمة الموجودة في جذر المشروع؛ استخدم المسارات أعلاه.

> أمر البناء نفسه يستخدم Node.js وpnpm على جهاز البناء فقط. ملف ZIP الناتج يعمل على Hostinger بـPHP وSQLite ولا يتضمن تطبيق Node.js. الأرشيف الكامل يتضمن لقطة قاعدة البيانات الحالية والبيانات والملفات المرفوعة والصور؛ فكّه فوق موقع قائم يستبدل النسخ الموجودة، لذلك خذ نسخة احتياطية أولاً.

## تجهيز وبناء الحزمة الكاملة

استخدم هذا المسار كلما كان المطلوب إنشاء حزمة PHP كاملة. المرجعان الأساسيان هما هذا الدليل و`scripts/build-hostinger.mjs`؛ لا حاجة لإعادة مسح المستودع أو مراجعة كل الملفات قبل كل بناء.

1. **اعزل البناء عن ملفات العمل** من جذر المشروع. يُنسخ `build_php/` عمداً للاحتفاظ بمفتاح Hostinger السابق؛ استثناء `.git/` و`generated-artifacts/` و`node_modules/` الجذرية فقط:
   ```bash
   ROOT="$PWD"
   STAGE="$(mktemp -d /tmp/cleanflow-hostinger-build.XXXXXX)"
   tar -C "$ROOT" --exclude='./.git' --exclude='./node_modules' \
     --exclude='./generated-artifacts' -cf - . | tar -C "$STAGE" -xf -
   ln -s "$ROOT/node_modules" "$STAGE/node_modules"
   ```
2. **خذ لقطة SQLite متسقة داخل النسخة المؤقتة.** لا تنسخ ملف القاعدة وحده عند احتمال وجود WAL نشط. يقرأ online backup قاعدة المصدر، وينشئ لقطة متسقة دون تعديلها:
   ```bash
   rm -f "$STAGE/data/sabaik.db" "$STAGE/data/sabaik.db-wal" "$STAGE/data/sabaik.db-shm"
   ROOT="$ROOT" STAGE="$STAGE" node <<'NODE'
   const path = require("node:path");
   const { createRequire } = require("node:module");
   const Database = createRequire(path.join(process.env.ROOT, "lib/db/package.json"))("better-sqlite3");
   const source = new Database(path.join(process.env.ROOT, "data/sabaik.db"), { readonly: true, fileMustExist: true });
   source.backup(path.join(process.env.STAGE, "data/sabaik.db"))
     .then(() => source.close())
     .catch((error) => { try { source.close(); } catch {} console.error(error); process.exitCode = 1; });
   NODE
   ```
3. **ابنِ PHP فقط من النسخة المعزولة:**
   ```bash
   cd "$STAGE"
   node scripts/build-hostinger.mjs --php-only
   ```
   ينفّذ الأمر بناء الواجهتين وصفحات HTML، ويجهّز API ولقطة قاعدة البيانات والرفعيات المطلوبة، ثم ينشئ:
   `generated-artifacts/php/cleanflow-services-hostinger.zip`
4. **اترك بوابات البناء تعمل.** يتضمن السكربت التحقق من السايت ماب والروابط، اختبارات PHP للقواعد الأساسية، بوابة Rank Math لصفحات SEO، ثم فحص ملفات sitemap داخل ZIP النهائي. لا تنشئ حزمة Node عند استخدام `--php-only`.
5. **افحص الناتج نفسه قبل تسليمه.** نفّذ `zip -T` على ZIP النهائي. فكّه إلى مجلد تحقق مؤقت، وتأكد من وجود `index.html` و`api/index.php` و`data/sabaik.db` و`uploads/` و`cleanflow-platform/`. شغّل `PRAGMA integrity_check` على قاعدة البيانات المفكوكة، وتأكد أن كل صورة مشار إليها في البيانات موجودة داخل `uploads/`. لا تعرض قيمة مفتاح التوقيع أو تحفظها في السجل.
6. **سلّم الملف وتعليمات النشر.** أرفق ZIP الناتج، وذكّر المستخدم أن استخراجه فوق موقع قائم يستبدل الملفات المتطابقة، لذلك يلزم نسخ احتياطي للقاعدة والوسائط أولاً.

## تحديث موقع قائم دون استبدال بياناته

حزمة التحديث مخصصة لموقع PHP قائم ولا تستبدل قاعدة البيانات أو ملفات الصور.

| الاستضافة الحالية | الحزمة | البناء والتحقق |
|---|---|---|
| Hostinger PHP المشتركة | `generated-artifacts/updates/sabaik-update.zip` | `node scripts/test-hostinger-blog-route.mjs` |

### تحديث PHP

يبني أمر PHP الواجهة ويعيد توليد صفحاتها، ثم ينشئ الأرشيف ويختبر توجيه المقالات داخله. يحتوي الأرشيف على `assets/` و`index.html` وصفحات HTML الثابتة، وملفات API وملفات `.htaccess` اللازمة. ارفع محتوياته إلى `public_html/` مع دمج المجلدات واستبدال الملفات المتطابقة فقط.

لا تستبدل أو تحذف `data/sabaik.db` أو `uploads/` أو `images/` أو أي ملف آخر غير موجود في الأرشيف. يحتفظ التحديث بأيقونات الموقع وملفات الوسائط الموجودة على الخادم؛ لا تستخدم حزمة التحديث لموقع جديد.

### التحقق من حزمة التحديث

تُبنى حزمة PHP الكاملة وتُفحص سلامة ملفاتها عبر `node scripts/build-hostinger.mjs --php-only`. ملاحظات حزمة التحديث السابقة محفوظة في `docs/HOSTINGER_UPDATE_2026-10-19.md`؛ وهي منفصلة عن ZIP الكامل أعلاه.

عند رفع تحديث PHP، ارفع مجلد `api/` كاملاً من الأرشيف. لا تستبدل `api/index.php` منفرداً؛ فهو يعتمد على ملفات PHP وJSON مساعدة بجواره، وغيابها قد يعطّل جميع مسارات API قبل الوصول إلى معالجاتها. لتشخيص أخطاء فحص السايت ماب واختلاف نسخ API، راجع `docs/hostinger-sitemap-api-diagnosis-2026-10-21.md`.

## استضافة PHP المشتركة

1. تحقق في hPanel من **Document Root الفعلي للنطاق** الذي تنشر عليه؛ لا تفترض أن `public_html` هو الجذر، خصوصاً إذا ظلت استجابات API تعمل بعد حذف ملف من هذا المسار.
2. خذ نسخة احتياطية من قاعدة البيانات ومجلد الصور الحاليين قبل استبدال موقع يعمل.
3. ارفع `generated-artifacts/php/cleanflow-services-hostinger.zip` إلى مدير ملفات الموقع.
4. استخرج محتويات الأرشيف مباشرة داخل Document Root الذي أكّده hPanel، وليس داخل مجلد فرعي باسم `build_php`. استخدم `public_html` فقط إذا كان هو الجذر المعروض لهذا النطاق.
5. تحقق من وجود `index.html` و`api/` و`data/` و`uploads/` مباشرة داخل Document Root، وأن `api/index.php` موجود في هذا الجذر الفعلي.
6. تأكد من تفعيل PHP 7.4 أو أحدث وامتدادي `pdo_sqlite` و`sqlite3`، ومن قابلية الكتابة للمجلدين `data/` و`uploads/`.

هذه الحزمة تستخدم PHP وSQLite في الإنتاج ولا تحتاج إلى تثبيت Node.js أو تشغيله على الاستضافة. تشمل النسخة قاعدة البيانات كاملة ومجلد `uploads/` والملفات العامة الموجودة وقت البناء. استخراجها هو استبدال كامل للبيانات والملفات التي تحمل الأسماء نفسها.

## نطاق خريطة الموقع

يُنشأ نطاق خريطة الموقع والصفحات الثابتة من أصل بيئة البناء الحالية، بما فيها معاينة Replit أو localhost عند البناء محلياً. عند رفع الحزمة إلى مضيف آخر، يعيد PHP أو Node ربط المراجع الذاتية بمضيف الطلب وقت التشغيل، بما في ذلك HTML وملفات sitemap وrobots. لا يُحفظ أصل المعاينة أو localhost كإعداد إنتاجي.

## أوامر البناء

- بناء حزمة Hostinger PHP كاملة فقط: `node scripts/build-hostinger.mjs --php-only`
- بناء واختبار تحديث PHP فقط: `node scripts/test-hostinger-blog-route.mjs`
