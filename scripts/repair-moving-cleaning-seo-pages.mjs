#!/usr/bin/env node
/**
 * Reposition three existing SEO landing pages from furniture-moving intent to
 * the cleaning services they actually describe, retaining old URLs via 301s.
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "lib", "db", "package.json"));
const Database = require("better-sqlite3");
const databasePath = join(ROOT, "data", "sabaik.db");
const backupDirectory = join(ROOT, "generated-artifacts");
mkdirSync(backupDirectory, { recursive: true });

const db = new Database(databasePath);
const backupStamp = new Date().toISOString().replace(/[:.]/gu, "-");
const backupPath = join(backupDirectory, `sabaik-before-move-seo-${backupStamp}.db`);
await db.backup(backupPath);

const now = new Date().toISOString();
const pageRepairs = [
  {
    id: 28,
    oldSlug: "شركة-نقل-العفش-داخل-الرياض",
    title: "تنظيف المنازل قبل نقل العفش بالرياض",
    slug: "تنظيف-المنازل-قبل-نقل-العفش-بالرياض",
    keyword: "تنظيف المنازل قبل نقل العفش بالرياض",
    seoTitle: "تنظيف المنازل قبل نقل العفش بالرياض | السهم كلين",
    description: "تنظيف المنازل قبل نقل العفش بالرياض يساعد على تجهيز الغرف والمطابخ والحمامات وإزالة الغبار قبل وصول الأثاث. ننسق الأعمال حسب مساحة المنزل والأسطح المطلوبة.",
    excerpt: "تنظيف المنازل قبل نقل العفش بالرياض يجهز الغرف والأرضيات والمطبخ والحمامات قبل وصول الأثاث. حدد نطاق العمل والموعد المناسب بعد توضيح احتياج المنزل.",
    content: `<p>تنظيف المنازل قبل نقل العفش بالرياض يساعد على استلام مكان مرتب قبل إدخال الأثاث والصناديق. عندما تكون الغرف خالية يسهل الوصول إلى الأرضيات والزوايا والأسطح، ويمكن تحديد ما يحتاج إلى تنظيف عادي أو عناية إضافية. تقدم مؤسسة السهم كلين خدمات التنظيف للمنازل، ولا تشمل هذه الخدمة نقل الأثاث نفسه.</p>
<h2>ما الذي يمكن تجهيزه قبل وصول الأثاث؟</h2>
<p>يُحدد نطاق العمل بعد معرفة مساحة المنزل وحالته والوقت المتاح. قد يشمل تنظيف الأرضيات وإزالة الغبار عن الأسطح والنوافذ المتاحة، ومسح خزائن المطبخ من الخارج أو الداخل إذا كانت فارغة، وتنظيف دورات المياه. تُراجع الأسطح الحساسة قبل اختيار أدوات ومواد التنظيف المناسبة لها، ولا تُفترض معالجة بقعة أو تلف من دون فحصها.</p>
<h2>التنظيف قبل النقل أو بعده</h2>
<p>التنظيف قبل نقل العفش مناسب لمن يريد تجهيز المنزل لاستقبال الأثاث. أما إذا تم إدخال القطع بالفعل، فيمكن طلب تنظيف المساحات التي ما زالت متاحة مع توضيح أماكن الأثاث. اذكر عدد الغرف، ونوع الأرضيات، والغرف التي تحتاج إلى الأولوية حتى يكون تقدير العمل واقعياً.</p>
<h2>خطوات بسيطة لتسهيل الموعد</h2>
<ul><li>أرسل المدينة والحي ومساحة المنزل التقريبية.</li><li>وضح ما إذا كان العقار خالياً أو بدأ نقل الأثاث إليه.</li><li>اذكر الأسطح أو الغرف التي تحتاج إلى عناية خاصة.</li></ul>
<p>بعد مراجعة التفاصيل يمكن تنسيق نطاق الخدمة والموعد المتاح. اترك وقتاً مناسباً بين انتهاء التنظيف ووصول الأثاث، وأبلغ الفريق مسبقاً إذا كانت هناك قيود دخول أو تعليمات خاصة بالموقع.</p>`,
    keywords: "تنظيف المنازل قبل نقل العفش بالرياض، تنظيف قبل نقل الأثاث، تجهيز المنزل قبل النقل، تنظيف منازل بالرياض",
    tags: ["تنظيف المنازل قبل نقل العفش بالرياض", "تنظيف قبل نقل الأثاث", "تجهيز المنزل قبل النقل", "الرياض"],
  },
  {
    id: 29,
    oldSlug: "شركات-نقل-العفش-بالرياض",
    title: "تنظيف وتعقيم المنازل بعد نقل الأثاث بالرياض",
    slug: "تنظيف-وتعقيم-المنازل-بعد-نقل-الأثاث-بالرياض",
    keyword: "تنظيف وتعقيم المنازل بعد نقل الأثاث بالرياض",
    seoTitle: "تنظيف وتعقيم المنازل بعد نقل الأثاث بالرياض | السهم كلين",
    description: "تنظيف وتعقيم المنازل بعد نقل الأثاث بالرياض يهيئ المكان للسكن بعد إزالة الأتربة وبقايا التغليف. حدد الغرف والأسطح المطلوبة لنرتب نطاق التنظيف وموعده.",
    excerpt: "تنظيف وتعقيم المنازل بعد نقل الأثاث بالرياض يركز على الأرضيات والأسطح والمطبخ والحمامات بعد إخلاء الغرف. وضح مساحة المنزل وما يحتاج إلى عناية.",
    content: `<p>تنظيف وتعقيم المنازل بعد نقل الأثاث بالرياض يساعد على ترتيب المنزل بعد إخلاء الغرف أو اكتمال الانتقال. قد تبقى أتربة أو آثار تغليف على الأرضيات والأسطح، كما تحتاج المطابخ والحمامات إلى مراجعة قبل السكن. تقدم مؤسسة السهم كلين خدمة تنظيف للموقع، وليست خدمة نقل عفش أو تخزين.</p>
<h2>تنظيف الغرف بعد إخلائها</h2>
<p>تُحدد الأولويات بحسب حالة العقار: إزالة الغبار عن الأسطح المتاحة، وتنظيف الأرضيات والزوايا، ومسح الأبواب والنوافذ التي يمكن الوصول إليها. إذا بقي بعض الأثاث في المكان، وضح ذلك عند الطلب حتى يُنسق العمل في المساحات المتاحة ولا تُنقل القطع أو تُحرك من دون اتفاق.</p>
<h2>المطبخ والحمامات والأسطح</h2>
<p>يمكن طلب تنظيف أسطح المطبخ والخزائن الفارغة، ومسح الأحواض والأرضيات في الحمامات. يختلف نوع العناية بحسب المادة وحالتها، لذلك من المفيد ذكر الرخام أو السيراميك أو الأسطح الحساسة قبل تحديد الخطة. لا يُعد التنظيف بديلاً عن إصلاح التلف أو إزالة البقع التي تتطلب معالجة متخصصة.</p>
<h2>كيف تستعد لطلب الخدمة؟</h2>
<p>أرسل الحي ومساحة المنزل التقريبية، وحدد الغرف التي تم إخلاؤها وما إذا كان النقل قد انتهى بالكامل. شارك صوراً واضحة عند وجود مواضع تحتاج إلى مراجعة خاصة. تساعد هذه المعلومات في توضيح نطاق التنظيف والوقت المتوقع للتنسيق، من دون افتراض سعر أو موعد قبل معرفة التفاصيل.</p>
<p>بعد التنظيف، راجع الغرف والأسطح التي شملها الاتفاق قبل ترتيب الأثاث أو تسليم العقار. وإذا كان الانتقال على مراحل، يمكن ترتيب الأولويات لتبدأ بالغرف التي ستُستخدم أولاً.</p>`,
    keywords: "تنظيف وتعقيم المنازل بعد نقل الأثاث بالرياض، تنظيف بعد نقل العفش، تنظيف منزل بعد الانتقال، تنظيف منازل بالرياض",
    tags: ["تنظيف وتعقيم المنازل بعد نقل الأثاث بالرياض", "تنظيف بعد نقل العفش", "تنظيف منزل بعد الانتقال", "الرياض"],
  },
  {
    id: 32,
    oldSlug: "شركة-نقل-عفش-بالخرج",
    title: "تنظيف منازل وفلل قبل وبعد نقل الأثاث بالخرج",
    slug: "تنظيف-منازل-وفلل-قبل-وبعد-نقل-الأثاث-بالخرج",
    keyword: "تنظيف منازل وفلل قبل وبعد نقل الأثاث بالخرج",
    seoTitle: "تنظيف منازل وفلل قبل وبعد نقل الأثاث بالخرج | السهم كلين",
    description: "تنظيف منازل وفلل قبل وبعد نقل الأثاث بالخرج لتجهيز العقار قبل الانتقال أو بعد خلوه، مع تنظيف الأرضيات والمطابخ والحمامات والأسطح وفق نطاق العمل المتفق عليه.",
    excerpt: "تنظيف منازل وفلل قبل وبعد نقل الأثاث بالخرج لتجهيز العقار قبل الانتقال أو بعد إخلائه. حدد المساحة والغرف والأسطح المطلوبة لتنسيق نطاق الخدمة.",
    content: `<p>تنظيف منازل وفلل قبل وبعد نقل الأثاث بالخرج يساعد على تجهيز العقار قبل الانتقال أو مراجعة المكان بعد خلوه. تتغير المهام حسب حالة المنزل ومساحته وما إذا كان الأثاث قد وصل بالفعل؛ لذلك يُحدد نطاق العمل بعد معرفة التفاصيل بدلاً من افتراض أن كل المواقع تحتاج إلى الإجراءات نفسها.</p>
<h2>التنظيف قبل نقل الأثاث</h2>
<p>عندما تكون الغرف خالية، يسهل الوصول إلى الأرضيات والزوايا والأسطح. يمكن ترتيب أولويات تنظيف الغرف والمطبخ والحمامات، مع توضيح نوع الأرضيات والخزائن والأسطح الحساسة. إذا كانت الفيلا تحتوي على ملحق أو أكثر من دور، اذكر ذلك عند الطلب لتقدير المساحة المطلوبة.</p>
<h2>التنظيف بعد الانتقال</h2>
<p>بعد نقل الأثاث يمكن مراجعة الأتربة وبقايا التغليف وتنظيف المساحات المتاحة. إذا بقيت قطع في بعض الغرف، وضح أماكنها قبل الموعد حتى يقتصر العمل على المساحات التي يمكن الوصول إليها. لا تشمل خدمة التنظيف نقل الأثاث أو إصلاح الأضرار أو معالجة البقع المتخصصة ما لم يتم الاتفاق على ذلك صراحة.</p>
<h2>تنظيف الأرضيات والمطبخ والحمامات</h2>
<p>قد يشمل نطاق العمل تنظيف الأرضيات والأسطح الظاهرة، ومسح النوافذ والأبواب المتاحة، والعناية بالمطبخ والحمامات بحسب حالة العقار. تُراجع المواد المستخدمة بما يناسب السطح، وتُذكر مسبقاً أي تعليمات خاصة أو مواد لا يرغب العميل باستخدامها.</p>
<h2>معلومات تساعد على تنسيق الطلب</h2>
<p>شارك الحي في الخرج، والمساحة التقريبية، وعدد الغرف والأدوار، وهل التنظيف قبل النقل أم بعده. اذكر أيضاً موعد الانتقال المتوقع والغرف ذات الأولوية. بعد مراجعة هذه المعلومات يمكن توضيح نطاق الخدمة وترتيب الموعد المتاح، ثم مراجعة الأعمال المنفذة قبل تسليم العقار أو البدء في ترتيب الأثاث.</p>`,
    keywords: "تنظيف منازل وفلل قبل وبعد نقل الأثاث بالخرج، تنظيف قبل نقل الأثاث بالخرج، تنظيف بعد الانتقال بالخرج، تنظيف فلل بالخرج",
    tags: ["تنظيف منازل وفلل قبل وبعد نقل الأثاث بالخرج", "تنظيف قبل نقل الأثاث بالخرج", "تنظيف بعد الانتقال بالخرج", "الخرج"],
  },
];

const updatePage = db.prepare(`
  UPDATE seo_pages
  SET title = ?, slug = ?, target_keyword = ?, content = ?, excerpt = ?,
      category = ?, tags = ?, seo_title = ?, seo_description = ?, seo_keywords = ?,
      seo_slug = ?, canonical_url = ?, updated_at = ?
  WHERE id = ?
`);
const selectPage = db.prepare("SELECT id, slug FROM seo_pages WHERE id = ?");
const selectSlugOwner = db.prepare("SELECT id FROM seo_pages WHERE slug = ?");
const updatePackage = db.prepare(`
  UPDATE containers
  SET name = ?, size = ?, capacity = ?, description = ?, features = ?, suitable_for = ?,
      seo_title = ?, seo_description = ?, seo_keywords = ?, seo_slug = ?
  WHERE id = 2
`);
const selectPackage = db.prepare("SELECT id, name, seo_slug FROM containers WHERE id = 2");
const updatePublicPackage = db.prepare(`
  UPDATE packages
  SET name = ?, size = ?, capacity = ?, description = ?, features = ?, suitable_for = ?,
      seo_title = ?, seo_description = ?, seo_keywords = ?, seo_slug = ?
  WHERE id = 2
`);
const selectPublicPackage = db.prepare("SELECT id, name, seo_slug FROM packages WHERE id = 2");
const packageValues = [
  "باقة تنظيف فلل بالرياض",
  "فلل سكنية بالرياض",
  "الأدوار، المجالس، المطابخ، الحمامات، والأحواش",
  "تنظيف فلل بالرياض يشمل الأدوار والغرف والمجالس والمطابخ والحمامات والأرضيات والأحواش. نحدد نطاق العمل بعد معرفة مساحة الفيلا والخدمات المطلوبة، ثم نرتب الموعد المناسب لتنفيذ الباقة.",
  JSON.stringify([
    "تنظيف أدوار الفيلا والغرف والملحقات",
    "تنظيف المجالس والمطابخ والحمامات",
    "تنظيف الأرضيات والدرج والأحواش",
    "تحديد نطاق الخدمة والموعد حسب مساحة الفيلا",
  ]),
  "فلل سكنية في الرياض",
  "تنظيف فلل بالرياض | باقة متكاملة",
  "تنظيف فلل بالرياض يشمل الأدوار والغرف والمجالس والمطابخ والحمامات والأرضيات والأحواش. يُحدد نطاق العمل والموعد بعد معرفة مساحة الفيلا واحتياجك.",
  "تنظيف فلل بالرياض, باقة تنظيف فلل بالرياض, تنظيف الفلل, تنظيف منازل وفلل",
  "تنظيف-فلل-بالرياض",
];

const applyRepairs = db.transaction(() => {
  for (const page of pageRepairs) {
    const current = selectPage.get(page.id);
    if (!current) throw new Error(`SEO page ${page.id} is missing.`);
    if (current.slug !== page.oldSlug && current.slug !== page.slug) {
      throw new Error(`SEO page ${page.id} has unexpected slug: ${current.slug}`);
    }
    const slugOwner = selectSlugOwner.get(page.slug);
    if (slugOwner && Number(slugOwner.id) !== page.id) {
      throw new Error(`Target slug is already used by SEO page ${slugOwner.id}: ${page.slug}`);
    }
    updatePage.run(
      page.title,
      page.slug,
      page.keyword,
      page.content,
      page.excerpt,
      "خدمات التنظيف",
      JSON.stringify(page.tags),
      page.seoTitle,
      page.description,
      page.keywords,
      page.slug,
      `/page/${page.slug}`,
      now,
      page.id,
    );
  }

  const packageRow = selectPackage.get();
  if (!packageRow) throw new Error("Cleaning package 2 is missing.");
  const normalizedPackageName = String(packageRow.name).replace(/^باقة\s+/u, "");
  if (!["تنظيف الفلل الشاملة", "تنظيف فلل بالرياض"].includes(normalizedPackageName)) {
    throw new Error(`Package 2 has unexpected name: ${packageRow.name}`);
  }
  if (!["tanzeef-filal", "تنظيف-فلل-بالرياض"].includes(packageRow.seo_slug)) {
    throw new Error(`Package 2 has unexpected slug: ${packageRow.seo_slug}`);
  }
  const publicPackage = selectPublicPackage.get();
  if (!publicPackage) throw new Error("Public package 2 is missing.");
  const normalizedPublicPackageName = String(publicPackage.name).replace(/^باقة\s+/u, "");
  if (!["تنظيف فلل الرياض", "تنظيف فلل بالرياض"].includes(normalizedPublicPackageName)) {
    throw new Error(`Public package 2 has unexpected name: ${publicPackage.name}`);
  }
  if (!["شركة-تنظيف-فلل-شامل", "تنظيف-فلل-بالرياض"].includes(publicPackage.seo_slug)) {
    throw new Error(`Public package 2 has unexpected slug: ${publicPackage.seo_slug}`);
  }
  updatePackage.run(...packageValues);
  updatePublicPackage.run(...packageValues);
});

try {
  applyRepairs();
} finally {
  db.close();
}

console.log(JSON.stringify({
  updatedSeoPages: pageRepairs.map(({ id, oldSlug, slug }) => ({ id, oldSlug, slug })),
  updatedPackage: 2,
  backupPath,
}, null, 2));
