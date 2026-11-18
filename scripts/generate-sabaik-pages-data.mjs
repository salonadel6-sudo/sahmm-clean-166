import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(
  root,
  "attached_assets/Pasted--https-sabaik-net-containers-34-0-85-weekly-2026-09-07-_1788759464584.txt",
);
const outputPath = path.join(
  root,
  "artifacts/backlink-pages-platform/src/data/sabaikPages.ts",
);
const jsonOutputPath = path.join(
  root,
  "artifacts/backlink-pages-platform/public/sabaik-pages.json",
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

const titleFromUrl = (url) => {
  const lastSegment = new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? "";
  const withoutTrackingNumber = lastSegment.replace(/-\d+$/, "");
  return decodeSegment(withoutTrackingNumber)
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .trim() || "صفحة سبائك الماسة";
};

const categoryFromUrl = (url) => {
  const section = new URL(url).pathname.split("/").filter(Boolean)[0];
  if (section === "containers") return "المنتجات";
  if (section === "blog") return "المقالات";
  return "صفحات الموقع";
};

const imageForPage = (url, index) => {
  const pathname = decodeSegment(new URL(url).pathname);
  if (/مكبس|كهربائي/.test(pathname)) return "/sabaik-assets/electric-compactor.webp";
  if (/حاوية-كبيرة/.test(pathname)) return "/sabaik-assets/container-large.png";
  if (/حاوية-نفايات/.test(pathname)) return "/sabaik-assets/container-waste-small.png";
  if (/حاوية-صغيرة/.test(pathname)) return "/sabaik-assets/container-small.png";
  if (url.includes("/blog/")) return `/sabaik-assets/blog-${(index % 4) + 1}.png`;
  return `/sabaik-assets/page-${(index % 2) + 1}.jpeg`;
};

const keywordPageTitles = [
  "تأجير حاويات كبيرة بالرياض",
  "تأجير حاويات مخلفات بالرياض",
  "حاوية مخلفات البناء بالرياض",
  "حاويات أنقاض بالرياض",
  "حاويات ردم بالرياض",
  "حاويات تراب بالرياض",
  "حاوية مخلفات تشطيب بالرياض",
  "حاوية هدم بالرياض",
  "حاويات للمقاولين بالرياض",
  "حاويات للمشاريع بالرياض",
  "حاوية 10 يارد بالرياض",
  "حاوية 20 يارد بالرياض",
  "حاوية 30 يارد بالرياض",
  "حاوية كبيرة للمخلفات بالرياض",
  "حاوية صغيرة للمخلفات بالرياض",
  "حاوية نفايات منزلية بالرياض",
  "حاوية نفايات تجارية بالرياض",
  "حاوية مخلفات مطاعم بالرياض",
  "حاوية مخلفات مصانع بالرياض",
  "حاوية مخلفات حدائق بالرياض",
  "تأجير حاوية يومي بالرياض",
  "تأجير حاوية أسبوعي بالرياض",
  "تأجير حاوية شهري بالرياض",
  "حاويات مع النقل بالرياض",
  "توصيل حاويات بالرياض",
  "رفع مخلفات البناء بالرياض",
  "نقل مخلفات البناء بالرياض",
  "نقل مخلفات الهدم بالرياض",
  "نقل مخلفات الترميم بالرياض",
  "رفع أنقاض بالرياض",
  "إزالة مخلفات البناء بالرياض",
  "التخلص من مخلفات البناء بالرياض",
  "شركة حاويات بالرياض",
  "شركة نقل مخلفات بالرياض",
  "شركة رفع أنقاض بالرياض",
  "أفضل شركة حاويات بالرياض",
  "أسعار تأجير حاويات مخلفات البناء بالرياض",
  "حاويات رخيصة بالرياض",
  "حاويات سريعة بالرياض",
  "حاويات شمال الرياض",
  "حاويات جنوب الرياض",
  "حاويات شرق الرياض",
  "حاويات غرب الرياض",
  "حاويات وسط الرياض",
  "حاويات حي الملقا",
  "حاويات حي الياسمين",
  "حاويات حي النرجس",
  "حاويات حي حطين",
  "حاويات حي الصحافة",
  "حاويات حي العليا",
];

const additionalKeywordPageTitles = [
  "تأجير حاويات 6 ياردة بالرياض",
  "تأجير حاويات 10 ياردة بالرياض",
  "تأجير حاويات 20 ياردة بالرياض",
  "تأجير حاويات 30 ياردة بالرياض",
  "تأجير حاويات 40 ياردة بالرياض",
  "حاويات نفايات للمحلات بالرياض",
  "حاويات مخلفات البناء للمقاولين بالرياض",
  "حاويات مخلفات الفلل بالرياض",
  "حاويات مخلفات الترميم بالرياض",
  "حاويات لإزالة الأنقاض بالرياض",
  "حاوية للمصانع بالرياض",
  "حاويات للورش بالرياض",
  "حاويات للمطاعم بالرياض",
  "حاويات للمكاتب بالرياض",
  "حاويات للمجمعات التجارية بالرياض",
  "حاوية نفايات للحدائق بالرياض",
  "تأجير حاوية مع الرفع بالرياض",
  "تبديل حاويات بالرياض",
  "سحب حاويات المخلفات بالرياض",
  "نقل حاويات بالرياض",
  "رفع أنقاض الفلل بالرياض",
  "رفع مخلفات التشطيب بالرياض",
  "نقل مخلفات الترميم بالرياض",
  "إزالة مخلفات الهدم بالرياض",
  "تنظيف مواقع البناء بالرياض",
  "شركة تأجير حاويات موثوقة بالرياض",
  "شركة حاويات سريعة بالرياض",
  "حاويات بأسعار مناسبة بالرياض",
  "حاويات بعقد شهري بالرياض",
  "حاويات بعقد سنوي بالرياض",
  "حاويات شمال غرب الرياض",
  "حاويات جنوب غرب الرياض",
  "حاويات شرق شمال الرياض",
  "حاويات غرب شمال الرياض",
  "حاويات حي الرمال",
  "حاويات حي اليرموك",
  "حاويات حي النهضة",
  "حاويات حي الروضة",
  "حاويات حي قرطبة",
  "حاويات حي المونسية",
  "حاويات حي الشفا",
  "حاويات حي بدر",
  "حاويات حي العزيزية",
  "حاويات حي السويدي",
  "حاويات حي العريجاء",
  "حاويات حي الحائر",
  "حاويات حي المربع",
  "حاويات حي البطحاء",
  "حاويات حي العليا بالرياض",
  "حاويات حي السليمانية بالرياض",
];

const sourcePages = urls.map((url, index) => ({
  id: index + 1,
  slug: `s-${String(index + 1).padStart(3, "0")}`,
  url,
  path: new URL(url).pathname,
  title: titleFromUrl(url),
  category: categoryFromUrl(url),
  image: imageForPage(url, index),
}));

const keywordPages = [...keywordPageTitles, ...additionalKeywordPageTitles].map((title, index) => ({
  id: sourcePages.length + index + 1,
  slug: `s-${String(sourcePages.length + index + 1).padStart(3, "0")}`,
  url: "https://sabaik.net/",
  path: `/seo/${encodeURIComponent(title)}`,
  title,
  category: "صفحات البحث",
  image: imageForPage("https://sabaik.net/", sourcePages.length + index),
}));

const pages = [...sourcePages, ...keywordPages];

const sourceComment = [
  "// Generated from the attached Sabaik Almasa URL list plus 100 Arabic SEO keyword pages.",
  "// Run `node scripts/generate-sabaik-pages-data.mjs` after the list changes.",
  "",
].join("\n");

const typeDefinition = [
  "export type SabaikPage = {",
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
  `${sourceComment}${typeDefinition}export const sabaikPages: SabaikPage[] = ${JSON.stringify(pages, null, 2)};\n`,
  "utf8",
);
fs.mkdirSync(path.dirname(jsonOutputPath), { recursive: true });
fs.writeFileSync(jsonOutputPath, JSON.stringify({ pages }, null, 2), "utf8");

console.log(`Generated ${pages.length} Sabaik Almasa page records at ${outputPath}`);