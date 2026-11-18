#!/usr/bin/env node
/**
 * Import the supplied Riyadh keyword list as complete SEO landing pages.
 *
 * The script is intentionally deterministic and re-runnable:
 * - exact duplicate keywords are ignored;
 * - existing SEO pages are enriched instead of duplicated;
 * - published pages are never left as drafts;
 * - service/article/package metadata receives matching keyword phrases.
 */

import { createRequire } from "node:module";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(join(fileURLToPath(new URL(".", import.meta.url)), ".."));
const require = createRequire(join(ROOT, "lib", "db", "package.json"));
const Database = require("better-sqlite3");
const DB_PATH = join(ROOT, "data", "sabaik.db");
const KEYWORD_FILE = join(ROOT, "attached_assets", "Pasted---1788607609551_1788607609552.txt");
const db = new Database(DB_PATH);
const now = new Date().toISOString();

if (!existsSync(KEYWORD_FILE)) {
  throw new Error(`Keyword file not found: ${KEYWORD_FILE}`);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS seo_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    target_keyword TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    excerpt TEXT NOT NULL DEFAULT '',
    cover_image TEXT DEFAULT '',
    category TEXT NOT NULL DEFAULT 'خدمات التنظيف',
    tags TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft',
    published_at TEXT,
    view_count INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    seo_title TEXT NOT NULL DEFAULT '',
    seo_description TEXT NOT NULL DEFAULT '',
    seo_keywords TEXT NOT NULL DEFAULT '',
    seo_slug TEXT NOT NULL DEFAULT '',
    og_image TEXT NOT NULL DEFAULT '',
    canonical_url TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const escapeHtml = value => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const normalizeForMatch = value => String(value ?? "")
  .normalize("NFKC")
  .replace(/[\u064B-\u065F\u0670]/g, "")
  .replace(/[إأآا]/g, "ا")
  .replace(/ى/g, "ي")
  .replace(/ة/g, "ه")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const slugify = value => String(value)
  .normalize("NFKC")
  .toLowerCase()
  .replace(/[\s_]+/g, "-")
  .replace(/[^\u0600-\u06FFa-z0-9-]/g, "")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 100);

const seoImageSource = category => ({
  "تنظيف المنازل والفلل والشقق": "service-apartments.jpg",
  "التنظيف العميق والدوري": "service-apartments.jpg",
  "تنظيف الكنب والمجالس والمفروشات": "service-majlis.jpg",
  "تنظيف السجاد والموكيت": "service-majlis.jpg",
  "تنظيف المطابخ والحمامات والأرضيات": "service-marble.jpg",
  "تنظيف وتعقيم الخزانات والمكيفات": "service-tanks.jpg",
  "التعقيم والتنظيف المتخصص": "service-postconstruction.jpg",
  "تنظيف المكاتب والمنشآت التجارية": "service-facades.jpg",
  "خدمات التنظيف المحلية": "service-apartments.jpg",
  "خدمات التنظيف العامة": "service-apartments.jpg",
}[category] || "service-apartments.jpg");

function seoImagePath(keyword, category) {
  const filename = `${slugify(keyword) || "seo-page"}.jpg`;
  const sourcePath = join(ROOT, "artifacts", "sabaik-almasa", "public", "images", seoImageSource(category));
  const targetDir = join(ROOT, "artifacts", "sabaik-almasa", "public", "images", "seo");
  const targetPath = join(targetDir, filename);
  mkdirSync(targetDir, { recursive: true });
  if (!existsSync(targetPath)) copyFileSync(sourcePath, targetPath);
  return `/images/seo/${filename}`;
}

const textLines = readFileSync(KEYWORD_FILE, "utf8")
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(Boolean);

const keywords = [];
for (const line of textLines) {
  if (line.includes("|")) continue;
  const numbered = line.match(/^\d+\.\s*(.+)$/);
  const keyword = numbered ? numbered[1].trim() : (/^\d+[-–]/.test(line) ? "" : line);
  if (keyword && !keywords.includes(keyword)) keywords.push(keyword);
}
const suppliedKeywordCount = keywords.length;
// The source contains 300 numbered entries, but "تنظيف خزانات المياه بالرياض"
// appears twice. Keep the published set at 300 distinct service intents rather
// than creating two identical landing pages.
const supplementalServiceKeywords = [
  "شركة تنظيف خزانات المياه بالرياض",
];
for (const keyword of supplementalServiceKeywords) {
  if (keywords.length >= 300) break;
  if (!keywords.includes(keyword)) keywords.push(keyword);
}

const existingSlugs = new Set(
  db.prepare("SELECT slug FROM seo_pages").all().map(row => String(row.slug || "")),
);
const siteName = String(
  db.prepare("SELECT value FROM site_settings WHERE key = 'company_name'").get()?.value || "",
).trim() || "خدمات التنظيف بالرياض";

const CATEGORY_RULES = [
  {
    name: "تنظيف المنازل والفلل والشقق",
    patterns: /فلل|فيلا|قصور|قصر|منازل|منزل|بيت|شقق|شقة|سكني|سكنية|انتقال|السكن|مناسبات|العزائم/,
    object: "المساحات السكنية",
    details: [
      "تحديد الغرف والمجالس والمطابخ والحمامات الداخلة في نطاق العمل",
      "إزالة الغبار عن الأسطح والزوايا والأبواب ومناطق الاستخدام اليومي",
      "تنظيف الأرضيات بحسب نوعها مع حماية الرخام والسيراميك والباركيه",
      "مراجعة الموقع مع العميل قبل إنهاء الفريق للعمل",
    ],
    process: "تبدأ الخدمة بتحديد مساحة العقار وعدد الغرف وحالة المكان، ثم يوضح الفريق الأعمال المناسبة والوقت المتوقع قبل تأكيد الموعد.",
    advice: "جهّز قائمة قصيرة بالأماكن الأكثر احتياجاً للعناية، واذكر ما إذا كان الطلب قبل السكن أو بعد الانتقال أو قبل مناسبة.",
  },
  {
    name: "التنظيف العميق والدوري",
    patterns: /عميق|شامل|بالساعة|ساعه|يومي|أسبوعي|اسبوعي|شهري|دوري|عاملة|عاملات|عمال تنظيف/,
    object: "التنظيف المنزلي المنظم",
    details: [
      "تقسيم العمل إلى مهام واضحة بحسب الأولوية والمساحة",
      "الوصول إلى الأجزاء التي لا يغطيها التنظيف السريع المعتاد",
      "اختيار عدد العمال والمدة وفق حجم الطلب بدلاً من تقدير عشوائي",
      "إعادة ترتيب نطاق الزيارة الدورية بما يناسب روتين الأسرة",
    ],
    process: "يُحدد نوع الزيارة ومدتها وعدد أفراد الفريق بعد معرفة المساحة وحالة المنزل. ويمكن ترتيب زيارة واحدة أو جدول دوري حسب احتياج العميل.",
    advice: "اذكر عدد الغرف، وجود أطفال أو حيوانات أليفة، وأي مناطق تحتاج عناية خاصة حتى يكون عرض السعر أقرب للواقع.",
  },
  {
    name: "تنظيف الكنب والمجالس والمفروشات",
    patterns: /كنب|مجالس|مجلس|مفروشات|أثاث|فرش|ستائر|شامواه|مخمل|حرير/,
    object: "المفروشات والأثاث المنزلي",
    details: [
      "فحص نوع القماش واللون والبقع قبل اختيار طريقة التنظيف",
      "إزالة الغبار الجاف من الحواف والفواصل ومناطق الاستخدام",
      "تجربة المادة على جزء غير ظاهر عند الحاجة قبل التوسع في التنفيذ",
      "تقليل الرطوبة وترك تعليمات الاستخدام حتى يكتمل الجفاف بأمان",
    ],
    process: "يصور العميل نوع المفروشات أو يرسل وصفاً لها، ثم يحدد الفريق إن كانت الطريقة الأنسب شفطاً أو غسيلاً أو بخاراً أو معالجة موضعية.",
    advice: "اذكر عمر البقعة ونوع القماش ووجود تطريز أو خشب أو أجزاء قابلة للفك؛ هذه التفاصيل تمنع استخدام طريقة غير مناسبة.",
  },
  {
    name: "تنظيف السجاد والموكيت",
    patterns: /سجاد|موكيت|سجادة|إيراني|تركي|بقع السجاد/,
    object: "السجاد والموكيت",
    details: [
      "تحديد نوع النسيج ودرجة ثبات الألوان قبل استخدام الماء أو البخار",
      "شفط الأتربة والرمال من العمق قبل معالجة البقع",
      "اختيار دورة تجفيف مناسبة للمساحة وتهوية المكان",
      "تسليم ملاحظات العناية التي تساعد على إطالة عمر النسيج",
    ],
    process: "يُقيّم الفريق حجم القطع ومكانها وحالتها، ثم يشرح طريقة التنظيف ووقت التجفيف قبل بدء العمل.",
    advice: "لا تفرك البقعة بعشوائية قبل الزيارة؛ اذكر المادة التي سببتها ووقت حدوثها لتحسين فرصة المعالجة.",
  },
  {
    name: "تنظيف المطابخ والحمامات والأرضيات",
    patterns: /مطابخ|مطبخ|حمامات|حمام|سيراميك|أرضيات|ارضيات|بلاط|رخام|باركيه|دهون|شفاط/,
    object: "المطابخ والحمامات والأسطح الصلبة",
    details: [
      "إزالة التراكمات الدهنية أو الكلسية بحسب طبيعة السطح",
      "تنظيف الفواصل والزوايا ومناطق خلف الأجهزة مع حماية التشطيبات",
      "تعقيم نقاط الاستخدام المتكرر بعد إزالة الأوساخ المرئية",
      "تحديد ما يحتاج إلى جلي أو تلميع متخصص بدلاً من المنظف العادي",
    ],
    process: "تُراجع الأسطح ونوع التشطيب ودرجة التراكم، ثم يختار الفريق المادة والأداة المناسبة لتجنب خدش البلاط أو إتلاف اللمعة.",
    advice: "أرسل صوراً واضحة للبقع أو الدهون القديمة، واذكر إذا كان السطح رخاماً طبيعياً أو سيراميكاً أو باركيه.",
  },
  {
    name: "تنظيف وتعقيم الخزانات والمكيفات",
    patterns: /خزانات|خزان|مكيف|مكيفات|سبليت|شباك|مركزي|فلاتر/,
    object: "الخزانات وأجهزة التكييف",
    details: [
      "فحص حالة الخزان أو الوحدة والمرشحات قبل التنفيذ",
      "إزالة الأتربة والرواسب من الأجزاء التي يمكن الوصول إليها بأمان",
      "استخدام أدوات عزل وحماية للموقع عند تنظيف الوحدات الداخلية",
      "توضيح ما إذا كانت الحالة تحتاج صيانة فنية خارج نطاق التنظيف",
    ],
    process: "يطلب الفريق نوع الخزان أو المكيف وعدد الوحدات ومكانها، ثم يحدد الأدوات والوقت المطلوب مع تنبيه واضح إلى حدود خدمة التنظيف.",
    advice: "اذكر آخر موعد للتنظيف، ووجود تسريب أو رائحة أو ضعف تبريد؛ فهذه علامات قد تستلزم فني صيانة لا تنظيفاً فقط.",
  },
  {
    name: "التعقيم والتنظيف المتخصص",
    patterns: /تعقيم|بخار|بعد البناء|بعد التشطيب|غبار البناء|بعد المقاول|بعد الدهان|بعد التجديد/,
    object: "التنظيف المتخصص وتجهيز المواقع",
    details: [
      "تقييم مستوى الغبار أو الأتربة أو آثار التشطيب قبل بدء العمل",
      "تقسيم الموقع إلى مراحل تمنع نقل الأوساخ من منطقة إلى أخرى",
      "استخدام البخار أو المطهرات أو الشفط بحسب السطح والهدف",
      "إجراء مراجعة نهائية للنوافذ والأرضيات والممرات ونقاط اللمس",
    ],
    process: "يحتاج هذا النوع إلى وصف دقيق لحالة الموقع ومساحته وموعد التسليم المطلوب، ثم يضع الفريق ترتيباً للخطوات قبل الحضور.",
    advice: "أبعد الأدوات والمواد القابلة للتلف من المكان، وأرسل صوراً للمخلفات أو الغبار لتقدير حجم الفريق والمعدات.",
  },
  {
    name: "تنظيف المكاتب والمنشآت التجارية",
    patterns: /مكاتب|شركات|منشآت|تجاري|محلات|مطاعم|كافيهات|مستودعات|مدارس/,
    object: "المكاتب والمنشآت التجارية",
    details: [
      "تنظيم العمل خارج أوقات الذروة أو على مراحل حسب تشغيل المنشأة",
      "تنظيف المداخل والممرات والأسطح المشتركة ودورات المياه",
      "تحديد نقاط التلامس المتكرر ضمن خطة التعقيم الدورية",
      "إعداد نطاق عمل قابل للمراجعة عند الزيارات المتكررة",
    ],
    process: "تُراجع طبيعة النشاط وعدد الأدوار وساعات التشغيل، ثم يحدد الفريق خطة زيارة لا تعطل العمل وتوضح المهام المتفق عليها.",
    advice: "جهّز مساحة المنشأة وعدد دورات المياه وساعات السماح بالدخول وأي اشتراطات أمنية أو تشغيلية قبل طلب العرض.",
  },
  {
    name: "خدمات التنظيف المحلية",
    patterns: /شمال الرياض|شرق الرياض|غرب الرياض|جنوب الرياض|وسط الرياض|حي |بالرياض$/,
    object: "خدمات التنظيف في الموقع المحلي",
    details: [
      "تحديد نطاق الوصول والموعد وفق الحي والموقع الفعلي",
      "تقديم خيارات للمنازل أو الفلل أو المكاتب بحسب طبيعة الحي",
      "ربط الطلب بالخدمة الأقرب إلى احتياج العقار وليس بالاسم فقط",
      "تنسيق وقت الوصول ومواقف الفريق ومتطلبات الدخول",
    ],
    process: "يُرسل العميل اسم الحي ونوع العقار وما يريد تنظيفه، ثم يؤكد الفريق نطاق الخدمة وموعد الزيارة قبل الحضور.",
    advice: "اكتب اسم الحي مع أقرب معلم أو الشارع الرئيسي، واذكر نوع العقار والمساحة التقريبية لتسريع التنسيق.",
  },
];

const FALLBACK_CATEGORY = {
  name: "خدمات التنظيف العامة",
  patterns: /.*/,
  object: "الخدمة المطلوبة",
  details: [
    "فهم طبيعة الموقع والسطح أو الجزء المطلوب خدمته",
    "اختيار الأدوات والمواد المناسبة بعد مراجعة الحالة",
    "تنفيذ مرتب مع تقليل الإزعاج داخل الموقع",
    "مراجعة النتيجة والنقاط المطلوبة مع العميل",
  ],
  process: "يبدأ التنسيق بوصف الخدمة والموقع والمساحة، ثم يوضح الفريق نطاق العمل والموعد المتوقع قبل تأكيد الطلب.",
  advice: "أرسل وصفاً واضحاً لما تحتاجه وصوراً عند وجود بقع أو تراكمات حتى يكون التقدير أكثر دقة.",
};

function categoryFor(keyword) {
  return CATEGORY_RULES.find(rule => rule.patterns.test(keyword)) || FALLBACK_CATEGORY;
}

function hashOf(value) {
  return [...value].reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) % 997, 7);
}

function buildPage(keyword, category, index) {
  const safeKeyword = escapeHtml(keyword);
  const variant = hashOf(keyword) % 4;
  const location = /بالرياض|الرياض/.test(keyword) ? "الرياض" : "الرياض والمناطق القريبة";
  const opening = [
    `إذا كنت تبحث عن ${safeKeyword} في ${location}، فهذه الصفحة تساعدك على فهم نطاق الخدمة قبل حجز الموعد.`,
    `تحتاج خدمة ${safeKeyword} إلى اختيار طريقة تنفيذ تناسب المكان وحالته، لذلك نبدأ دائماً بجمع تفاصيل الطلب بدلاً من تقديم وصف عام.`,
    `يبحث العملاء عن ${safeKeyword} عندما يريدون نتيجة منظمة وموعداً واضحاً وفريقاً يعرف طبيعة الموقع قبل الوصول.`,
    `توضح هذه الصفحة ما يرتبط بطلب ${safeKeyword} من خطوات وتجهيزات وأسئلة تساعدك على اتخاذ قرار مناسب.`,
  ][variant];
  const close = [
    "بعد مراجعة التفاصيل ننسق الموعد ونوضح ما سيدخل في نطاق التنفيذ قبل بدء الفريق.",
    "الهدف هو تقديم نتيجة قابلة للمراجعة مع توضيح ما تم تنفيذه وأي ملاحظات تحتاج متابعة لاحقة.",
    "يختلف الوقت والسعر حسب المساحة والحالة، لذلك يعتمد التأكيد النهائي على بيانات موقعك الفعلية.",
    "يمكنك إرسال صور أو وصف مختصر للمكان ليقترح فريق التنسيق الخطوة الأنسب دون وعود غير دقيقة.",
  ][(variant + 1) % 4];
  const faqs = [
    [`هل تناسب ${safeKeyword} كل المواقع؟`, `تتحدد الملاءمة بعد معرفة نوع الموقع والسطح والمساحة. يراجع الفريق هذه التفاصيل قبل تأكيد الطلب ويقترح البديل المناسب إذا احتاج المكان معالجة مختلفة.`],
    [`كيف يتم تقدير سعر ${safeKeyword}؟`, `يعتمد التقدير على المساحة، مستوى الاتساخ، عدد العناصر، ووقت التنفيذ المطلوب. يوضح فريق التنسيق هذه العوامل قبل اعتماد الموعد.`],
    [`ما الذي أجهزه قبل ${safeKeyword}؟`, `${category.advice} ${close}`],
  ];
  const content = `
    <h2>${safeKeyword} في ${escapeHtml(location)}</h2>
    <p>${opening} ${escapeHtml(category.name)} من الخدمات التي تحتاج إلى تحديد الهدف والمواد وطريقة الوصول إلى النتيجة المطلوبة، وليس مجرد استخدام منظف واحد لكل الحالات.</p>

    <h2>متى تحتاج إلى ${safeKeyword}؟</h2>
    <p>تكون الخدمة مناسبة عندما تريد معالجة ${escapeHtml(category.object)} بشكل منظم، أو عندما لا يعطي التنظيف المعتاد نتيجة كافية. نراجع حالة المكان أولاً ونفصل بين التنظيف، التعقيم، المعالجة الموضعية، وأي أعمال فنية تحتاج جهة متخصصة.</p>

    <h2>ماذا تشمل الخدمة؟</h2>
    <ul>${category.details.map(detail => `<li>${escapeHtml(detail)}.</li>`).join("")}</ul>

    <h2>طريقة العمل خطوة بخطوة</h2>
    <ol>
      <li><strong>استقبال الطلب:</strong> تذكر الكلمة المطلوبة ونوع الموقع والحي والمساحة والصور المتاحة.</li>
      <li><strong>تحديد النطاق:</strong> يراجع الفريق نوع الأسطح والعوائق وحالة المكان، ثم يوضح ما يمكن تنفيذه.</li>
      <li><strong>التنفيذ والمراجعة:</strong> ينفذ الفريق الخطوات المتفق عليها، ثم يراجع النقاط الأساسية مع العميل.</li>
    </ol>
    <p>${escapeHtml(category.process)} ${escapeHtml(close)}</p>

    <h2>نصائح قبل طلب ${safeKeyword}</h2>
    <p>${escapeHtml(category.advice)} كما يفضل تحديد وقت مناسب وإبعاد الأشياء القابلة للكسر أو المهمة قبل وصول الفريق.</p>

    <h2>أسئلة شائعة عن ${safeKeyword}</h2>
    ${faqs.map(([question, answer]) => `<h3>${question}</h3><p>${answer}</p>`).join("\n")}

    <h2>اطلب عرضاً مناسباً لموقعك</h2>
    <p>أرسل تفاصيل موقعك واحتياجك إلى ${escapeHtml(siteName)} للحصول على توصية واضحة بخصوص ${safeKeyword}. لا يعتمد الموعد أو السعر النهائي إلا بعد مراجعة نطاق العمل والبيانات الفعلية للمكان.</p>
  `;
  return {
    content,
    excerpt: `${keyword} في ${location}: تعرف على نطاق الخدمة، خطوات التنفيذ، التجهيزات المناسبة، والأسئلة المهمة قبل طلب عرض السعر.`,
    seoDescription: `دليل ${keyword} في ${location}: خطوات واضحة، نطاق الخدمة، طريقة التقدير، ونصائح قبل الحجز مع ${siteName}.`,
  };
}

const keywordRows = db.prepare("SELECT id, slug, target_keyword, content, status, is_active, seo_keywords, tags FROM seo_pages").all();
const byExactKeyword = new Map(keywordRows.map(row => [String(row.target_keyword || ""), row]));
const byNormalizedKeyword = new Map(keywordRows.map(row => [normalizeForMatch(row.target_keyword), row]));

const insertPage = db.prepare(`
  INSERT INTO seo_pages
    (title, slug, target_keyword, content, excerpt, cover_image, category, tags, status,
     published_at, view_count, is_active, "order", seo_title, seo_description,
     seo_keywords, seo_slug, og_image, canonical_url, created_at, updated_at)
  VALUES
    (@title, @slug, @target_keyword, @content, @excerpt, @cover_image, @category, @tags, 'published',
     @published_at, 0, 1, @order, @seo_title, @seo_description,
     @seo_keywords, @seo_slug, @og_image, @canonical_url, @created_at, @updated_at)
`);
const updatePage = db.prepare(`
  UPDATE seo_pages
  SET title = @title,
      slug = @slug,
      target_keyword = @target_keyword,
      content = @content,
      excerpt = @excerpt,
      category = @category,
      tags = @tags,
      status = 'published',
      published_at = COALESCE(published_at, @published_at),
      is_active = 1,
      seo_title = @seo_title,
      seo_description = @seo_description,
      seo_keywords = @seo_keywords,
      seo_slug = @seo_slug,
      og_image = @og_image,
      canonical_url = @canonical_url,
      updated_at = @updated_at
  WHERE id = @id
`);

const areaTerms = ["شمال الرياض", "شرق الرياض", "غرب الرياض", "جنوب الرياض", "وسط الرياض", "حي ", "الرياض"];
const importedPages = [];
const seenInput = new Set();
let created = 0;
let updated = 0;
let exactDuplicates = 0;

const tx = db.transaction(() => {
  keywords.forEach((keyword, index) => {
    if (seenInput.has(keyword)) {
      exactDuplicates++;
      return;
    }
    seenInput.add(keyword);
    const category = categoryFor(keyword);
    const generated = buildPage(keyword, category, index);
    const keywordImage = seoImagePath(keyword, category.name);
    const slugBase = slugify(keyword);
    let slug = slugBase;
    let suffix = 2;
    while (existingSlugs.has(slug) && String(byExactKeyword.get(keyword)?.slug || "") !== slug) {
      slug = `${slugBase}-${suffix++}`;
    }
    existingSlugs.add(slug);
    const metaKeywords = [...new Set([
      keyword,
      category.name,
      "شركة تنظيف بالرياض",
      "خدمات التنظيف بالرياض",
      ...(areaTerms.some(term => keyword.includes(term)) ? [keyword.replace(/^شركة\s+/, ""), "تنظيف منازل بالرياض"] : []),
    ])].join("، ");
    const payload = {
      title: keyword,
      slug,
      target_keyword: keyword,
      content: generated.content,
      excerpt: generated.excerpt,
      cover_image: keywordImage,
      category: category.name,
      tags: JSON.stringify([keyword, category.name, "الرياض", "خدمات التنظيف"]),
      published_at: now,
      order: index,
      seo_title: `${keyword} | ${siteName}`,
      seo_description: generated.seoDescription.slice(0, 158),
      seo_keywords: metaKeywords,
      seo_slug: slug,
      og_image: keywordImage,
      canonical_url: `/page/${slug}`,
      updated_at: now,
    };
    const existing = byExactKeyword.get(keyword) || byNormalizedKeyword.get(normalizeForMatch(keyword));
    if (existing) {
      updatePage.run({ ...payload, id: existing.id });
      updated++;
    } else {
      insertPage.run({ ...payload, slug, created_at: now });
      created++;
    }
    importedPages.push({ keyword, slug, category: category.name });
  });
});
tx();

function updateMetadata(table, titleColumn) {
  const rows = db.prepare(`SELECT id, ${titleColumn} AS title, seo_keywords FROM ${table}`).all();
  const tableColumns = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(column => column.name));
  const hasUpdatedAt = tableColumns.has("updated_at");
  const update = db.prepare(
    hasUpdatedAt
      ? `UPDATE ${table} SET seo_keywords = ?, updated_at = ? WHERE id = ?`
      : `UPDATE ${table} SET seo_keywords = ? WHERE id = ?`,
  );
  let changed = 0;
  const updateTx = db.transaction(() => {
    for (const row of rows) {
      const haystack = normalizeForMatch(row.title);
      const matches = importedPages
        .filter(item => {
          const normalized = normalizeForMatch(item.keyword);
          const words = normalized.split(" ").filter(word => word.length > 2);
          return words.filter(word => haystack.includes(word)).length >= Math.min(2, words.length);
        })
        .slice(0, 18)
        .map(item => item.keyword);
      if (!matches.length) continue;
      const current = String(row.seo_keywords || "").split(/[،,]/).map(value => value.trim()).filter(Boolean);
      const next = [...new Set([...current, ...matches])].slice(0, 24).join("، ");
      if (next === String(row.seo_keywords || "")) continue;
      if (hasUpdatedAt) update.run(next, now, row.id);
      else update.run(next, row.id);
      changed++;
    }
  });
  updateTx();
  return changed;
}

const metadataChanges = {
  posts: updateMetadata("posts", "title"),
  services: updateMetadata("services", "title"),
};

db.close();
console.log(JSON.stringify({
  suppliedKeywords: suppliedKeywordCount,
  distinctServiceKeywords: keywords.length,
  exactDuplicates,
  created,
  updated,
  totalKeywordPages: created + updated,
  metadataChanges,
}, null, 2));