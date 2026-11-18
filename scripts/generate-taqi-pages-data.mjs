import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(
  root,
  "attached_assets/Pasted-68-https-taqigroup-com-services-construction-debris-37-_1788760308774.txt",
);
const outputPath = path.join(
  root,
  "artifacts/backlink-pages-platform/src/data/taqiPages.ts",
);
const jsonOutputPath = path.join(
  root,
  "artifacts/backlink-pages-platform/public/taqi-pages.json",
);

const source = fs.readFileSync(sourcePath, "utf8");
const urls = [
  ...new Set(
    [...source.matchAll(/https?:\/\/[^\s🖼]+/gu)].map((match) => match[0].trim()),
  ),
];

const decodeSegment = (segment) => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

const arabicTitleAliases = {
  "construction debris": "مخلفات البناء",
  "industrial waste": "المخلفات الصناعية",
};

const titleFromUrl = (url) => {
  const lastSegment = new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? "";
  const withoutTrackingNumber = lastSegment.replace(/-\d+$/, "");
  const normalized = decodeSegment(withoutTrackingNumber)
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .trim();
  return arabicTitleAliases[normalized] ?? (normalized || "صفحة تقي");
};

const categoryFromUrl = (url) => {
  const section = new URL(url).pathname.split("/").filter(Boolean)[0];
  if (section === "services") return "الخدمات";
  if (section === "containers") return "الحاويات";
  if (section === "blog") return "المقالات";
  return "صفحات الموقع";
};

const imageForPage = (url, index) => {
  const section = new URL(url).pathname.split("/").filter(Boolean)[0];
  const imageNumber = section === "blog"
    ? 3 + (index % 3)
    : 1 + (index % 5);
  return `/taqi-assets/taqi-hero-${imageNumber}.png`;
};

const keywordPageTitles = [
  "نقل مخلفات البناء بالرياض",
  "نقل مخلفات المشاريع بالرياض",
  "نقل مخلفات المقاولين بالرياض",
  "رفع مخلفات البناء بالرياض",
  "إزالة أنقاض البناء بالرياض",
  "ترحيل مخلفات الهدم بالرياض",
  "نقل مخلفات الترميم بالرياض",
  "حاويات مخلفات البناء بالرياض",
  "تأجير حاويات مخلفات بالرياض",
  "حاوية أنقاض للموقع بالرياض",
  "إدارة مخلفات المشاريع بالرياض",
  "التخلص من مخلفات البناء بالرياض",
  "فرز مخلفات البناء بالرياض",
  "تجميع مخلفات البناء بالرياض",
  "تنظيف موقع البناء بالرياض",
  "تنظيف مواقع الإنشاء بالرياض",
  "نقل مخلفات الحفر بالرياض",
  "نقل الردميات بالرياض",
  "نقل التربة الزائدة بالرياض",
  "رفع مخلفات التشطيب بالرياض",
  "مخلفات الخرسانة بالرياض",
  "نقل مخلفات الخرسانة بالرياض",
  "مخلفات البلاط بالرياض",
  "نقل مخلفات البلاط بالرياض",
  "مخلفات الأخشاب بالرياض",
  "نقل مخلفات الأخشاب بالرياض",
  "مخلفات الحديد بالرياض",
  "نقل مخلفات الحديد بالرياض",
  "مخلفات العزل بالرياض",
  "نقل مخلفات العزل بالرياض",
  "حاويات للمواقع الإنشائية بالرياض",
  "حاويات مشاريع المقاولات بالرياض",
  "تأجير حاويات للمقاولين بالرياض",
  "حاويات كبيرة للمشاريع بالرياض",
  "حاويات صغيرة للمشاريع بالرياض",
  "حاويات أسبوعية للمشاريع بالرياض",
  "حاويات شهرية للمشاريع بالرياض",
  "نقل مخلفات المصانع بالرياض",
  "نقل المخلفات الصناعية بالرياض",
  "إدارة النفايات الصناعية بالرياض",
  "نقل المخلفات التجارية بالرياض",
  "نقل مخلفات المطاعم بالرياض",
  "نقل مخلفات المستودعات بالرياض",
  "شركة نقل مخلفات موثوقة بالرياض",
  "شركة مخلفات بناء سريعة بالرياض",
  "أسعار نقل مخلفات البناء بالرياض",
  "نقل مخلفات شمال الرياض",
  "نقل مخلفات جنوب الرياض",
  "نقل مخلفات شرق الرياض",
  "نقل مخلفات غرب الرياض",
];

const additionalKeywordPageTitles = [
  "شركة نقل أنقاض بالرياض",
  "نقل مخلفات هدم المباني بالرياض",
  "نقل مخلفات الحفريات بالرياض",
  "نقل مخلفات الفلل بالرياض",
  "نقل مخلفات الشقق بالرياض",
  "نقل مخلفات الترميم بالرياض",
  "نقل مخلفات التشطيب بالرياض",
  "رفع نفايات البناء بالرياض",
  "تحميل مخلفات البناء بالرياض",
  "شاحنات نقل مخلفات بالرياض",
  "نقل مخلفات المقاولات بالرياض",
  "نقل مخلفات المشاريع السكنية بالرياض",
  "نقل مخلفات المشاريع التجارية بالرياض",
  "نقل مخلفات الطرق بالرياض",
  "نقل مخلفات الحفر والردم بالرياض",
  "نقل مخلفات الخرسانة والحديد بالرياض",
  "نقل مخلفات الأخشاب بالرياض",
  "نقل مخلفات البلاط والرخام بالرياض",
  "نقل مخلفات العزل بالرياض",
  "جمع مخلفات البناء بالرياض",
  "حاويات أنقاض للمقاولين بالرياض",
  "حاويات نقل مخلفات المشاريع بالرياض",
  "حاويات بناء للمطورين بالرياض",
  "حاويات مخلفات الهدم بالرياض",
  "حاويات مخلفات الترميم بالرياض",
  "حاويات للمصانع والمستودعات بالرياض",
  "تأجير حاويات للمشاريع الكبيرة بالرياض",
  "تأجير حاويات للمشاريع الصغيرة بالرياض",
  "حاويات فورية بالرياض",
  "حاويات مع خدمة السحب بالرياض",
  "حاويات مع التبديل بالرياض",
  "خدمات نقل المخلفات للمقاولين بالرياض",
  "خدمات إزالة الأنقاض بالرياض",
  "إدارة مخلفات الهدم بالرياض",
  "فرز وتدوير مخلفات البناء بالرياض",
  "إعادة تدوير مخلفات البناء بالرياض",
  "التخلص الآمن من الأنقاض بالرياض",
  "نظام إدارة مخلفات المشاريع بالرياض",
  "تنظيف مواقع المقاولات بالرياض",
  "تنظيف مواقع الترميم بالرياض",
  "رفع المخلفات من الفلل بالرياض",
  "رفع المخلفات من الشقق بالرياض",
  "رفع مخلفات المصانع بالرياض",
  "نقل مخلفات المتاجر بالرياض",
  "نقل مخلفات الأسواق بالرياض",
  "نقل مخلفات المستشفيات بالرياض",
  "نقل مخلفات المدارس بالرياض",
  "نقل مخلفات الفنادق بالرياض",
  "تكلفة نقل مخلفات البناء بالرياض",
  "موعد نقل مخلفات البناء بالرياض",
];

const sourcePages = urls.map((url, index) => ({
  id: index + 1,
  slug: `t-${String(index + 1).padStart(3, "0")}`,
  url,
  path: new URL(url).pathname,
  title: titleFromUrl(url),
  category: categoryFromUrl(url),
  image: imageForPage(url, index),
}));

const keywordPages = [...keywordPageTitles, ...additionalKeywordPageTitles].map((title, index) => ({
  id: sourcePages.length + index + 1,
  slug: `t-${String(sourcePages.length + index + 1).padStart(3, "0")}`,
  url: "https://taqigroup.com/",
  path: `/seo/${encodeURIComponent(title)}`,
  title,
  category: "صفحات البحث",
  image: imageForPage("https://taqigroup.com/", sourcePages.length + index),
}));

const pages = [...sourcePages, ...keywordPages];

const sourceComment = [
  "// Generated from the attached Taqi Group URL list plus 100 Arabic SEO keyword pages.",
  "// Run `node scripts/generate-taqi-pages-data.mjs` after the list changes.",
  "",
].join("\n");

const typeDefinition = [
  "export type TaqiPage = {",
  "  id: number;",
  "  slug: string;",
  "  url: string;",
  "  path: string;",
  "  title: string;",
  "  category: string;",
  "  image: string;",
  "};",
  "",
].join("\n");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${sourceComment}${typeDefinition}export const taqiPages: TaqiPage[] = ${JSON.stringify(pages, null, 2)};\n`,
  "utf8",
);
fs.mkdirSync(path.dirname(jsonOutputPath), { recursive: true });
fs.writeFileSync(jsonOutputPath, JSON.stringify({ pages }, null, 2), "utf8");

console.log(`Generated ${pages.length} Taqi Group page records at ${outputPath}`);