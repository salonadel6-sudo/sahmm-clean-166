import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveConfiguredSiteOrigin } from "./configured-site-origin.mjs";
import { loadLocalSitemapUrlBlocks } from "./backlink-sitemap-source.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sitemapPath = path.join(root, "artifacts/sabaik-almasa/public/sitemap.xml");
const outputPath = path.join(
  root,
  "artifacts/backlink-pages-platform/src/data/sitePages.ts",
);
const jsonOutputPath = path.join(
  root,
  "artifacts/backlink-pages-platform/public/site-pages.json",
);

const siteOrigin = resolveConfiguredSiteOrigin({ root, allowBuildFallback: true });
const { blocks, sourceSitemapOrigin } = loadLocalSitemapUrlBlocks(sitemapPath);

const rebaseSitemapUrl = (value) => {
  try {
    const url = new URL(value, sourceSitemapOrigin || siteOrigin);
    if (sourceSitemapOrigin && url.origin !== sourceSitemapOrigin) return url.href;
    return `${siteOrigin}${url.pathname}${url.search}${url.hash}`;
  } catch {
    return value;
  }
};

const escapeString = (value) =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`")
    .replaceAll("${", "\\${");

const decodeSegment = (segment) => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

const serviceApartmentsImage = `${siteOrigin}/images/service-apartments.jpg`;
const replaceBrandImage = (image) => {
  const rebasedImage = rebaseSitemapUrl(image);
  try {
    return new URL(rebasedImage, siteOrigin).pathname === "/brand-icon.png"
      ? serviceApartmentsImage
      : rebasedImage;
  } catch {
    return rebasedImage;
  }
};

const arabicTitleAliases = {
  about: "عن الموقع",
  services: "دليل الخدمات",
  "cleaning packages": "باقات التنظيف",
  contact: "تواصل مع الموقع",
  areas: "مناطق التغطية",
  faq: "الأسئلة الشائعة",
  terms: "الشروط والأحكام",
  privacy: "الخصوصية",
  blog: "مجلة السهم",
  "tanzeef shaqaq": "تنظيف شقق بالرياض",
  "tanzeef filal": "تنظيف فلل بالرياض",
  "tanzeef qabl alnaql": "تنظيف قبل النقل بالرياض",
  "gaseel majalis bukhar": "غسيل مجالس بالبخار بالرياض",
  "jaly rakham": "جلي وتلميع رخام بالرياض",
  "tanzeef khazanat": "تنظيف خزانات بالرياض",
  "gaseel mokeyafat": "غسيل مكيفات بالرياض",
  "mokafahat hasharat": "مكافحة حشرات بالرياض",
  "tanzeef bad albenaa": "تنظيف بعد البناء بالرياض",
  "tanzeef wajahat": "تنظيف واجهات بالرياض",
  "tanzeef masajid": "تنظيف مساجد بالرياض",
  "shahadat salama": "شهادة سلامة بالرياض",
  "tarkeeb anthimat wiqaya": "تركيب أنظمة وقاية بالرياض",
  "taqreer fanni fawri": "تقرير فني فوري بالرياض",
  "taqreer fanni ghayr fawri": "تقرير فني غير فوري بالرياض",
  "aqd siyana difaa madani": "عقد صيانة دفاع مدني بالرياض",
  "asaar sharikat tanzeef almanazil alryad 2026": "أسعار شركات تنظيف المنازل بالرياض 2026",
  "daleel tanzeef alfilal walshaqaq bad altashteeb alryad": "دليل تنظيف الفلل والشقق بعد التشطيب بالرياض",
  "afdal sharika tanzeef majalis sajjad balkhabar alryad": "أفضل شركة تنظيف مجالس وسجاد بالبخار بالرياض",
  "tanzeef makatib sharikat alryad uqud nazafa": "تنظيف مكاتب الشركات بالرياض عقود نظافة",
  "tanzeef filal shamal alryad malqa hitteen yasmeen": "تنظيف فلل شمال الرياض ملقا حطين ياسمين",
  "jaly tlemee alkhurkham alseramik alryad": "جلي وتلميع الخرخام والسيراميك بالرياض",
  "tanzeef tahzeer khazanat almyah alryad": "تنظيف وتعقيم خزانات المياه بالرياض",
  "tanzeef wajahat almbany alfilal alryad": "تنظيف واجهات المباني والفلل بالرياض",
  "tanzeef almanazil haraj alryad walshamal": "تنظيف المنازل حراج الرياض والشمال",
  "moqarnat sharikat tanzeef alryad clean life al ealamia sabaik": "مقارنة شركات تنظيف الرياض كلين لايف العالمية سبايك",
  "gaseel majalis kanab bukhar alryad rokn nagd": "غسيل مجالس وكنب بالبخار بالرياض ركن نجد",
  "jaly tlemee rakham alryad diamond crystal": "جلي وتلميع رخام بالرياض دايموند كريستال",
  "north riyadh": "شمال الرياض",
  "south riyadh": "جنوب الرياض",
  "east riyadh": "شرق الرياض",
  "west riyadh": "غرب الرياض",
  "central riyadh": "وسط الرياض",
  "al malqa": "حي الملقا",
  "al yasmin": "حي الياسمين",
  "al narjis": "حي النرجس",
  "al aarid": "حي العارض",
  hittin: "حي حطين",
  "al sahafa": "حي الصحافة",
  "al nafal": "حي النفل",
  "al aqiq": "حي العقيق",
  "al rabi": "حي الربيع",
  "al ghadeer": "حي الغدير",
  "al wadi": "حي الوادي",
  "al nada": "حي الندى",
  "al falah": "حي الفلاح",
  "al qurtubah": "حي قرطبة",
  "al munsiyah": "حي المونسية",
  "al yarmouk": "حي اليرموك",
  "al qadesiya": "حي القادسية",
  "al rawdah": "حي الروضة",
  "al naseem": "حي النسيم",
  "al khaleej": "حي الخليج",
  "al nahdah": "حي النهضة",
  "al manar": "حي المنار",
  "al hamra": "حي الحمراء",
  "al shuhada": "حي الشهداء",
  "dhahrat laban": "حي ظهرة لبن",
  "al suwaidi": "حي السويدي",
  "al uraija": "حي العريجاء",
  "al hazm": "حي الحزم",
  "al badiyah": "حي البديعة",
  shubra: "حي شبرا",
  "al awali": "حي العوالي",
  badr: "حي بدر",
  "al shifa": "حي الشفا",
  "al aziziyah": "حي العزيزية",
  "al dar al baida": "حي الدار البيضاء",
  "al hair": "حي الحائر",
  "al manakh": "حي المناخ",
  "al iskan": "حي الإسكان",
  "al olaya": "حي العليا",
  "al sulaimaniya": "حي السليمانية",
  "al malaz": "حي الملز",
  "al murabba": "حي المربع",
  "al batha": "حي البطحاء",
  "al wizarat": "حي الوزارات",
  "al futah": "حي الفوطة",
};

const titleFromUrl = (url, index) => {
  const parsed = new URL(url);
  const segments = parsed.pathname.split("/").filter(Boolean).map(decodeSegment);
  if (!segments.length) return "الصفحة الرئيسية";
  if (parsed.pathname === "/cleaning-packages/tanzeef-qosoor") return "تنظيف قصور بالرياض";
  const last = segments.at(-1) ?? "";
  const normalized = last.replaceAll("-", " ").replaceAll("_", " ").trim();
  return arabicTitleAliases[normalized] ?? (normalized || `صفحة الموقع ${index + 1}`);
};

const keywordPageTitles = [
  "شركة تنظيف منازل بالرياض للفلل",
  "تنظيف فلل بالرياض بالبخار",
  "تنظيف شقق بالرياض مع التعقيم",
  "تنظيف مجالس بالرياض للمنزل",
  "تنظيف كنب بالرياض في الموقع",
  "تنظيف سجاد بالرياض بالبخار",
  "تنظيف خزانات مياه بالرياض",
  "تنظيف خزانات أرضية بالرياض",
  "تنظيف خزانات علوية بالرياض",
  "تعقيم خزانات مياه الشرب بالرياض",
  "غسيل مكيفات سبليت للمنازل بالرياض",
  "تنظيف مكيفات مركزية للمباني بالرياض",
  "تنظيف واجهات زجاجية بالرياض",
  "تنظيف واجهات مباني تجارية بالرياض",
  "تنظيف شقق بعد التشطيب بالرياض",
  "تنظيف بعد البناء بالرياض للمنازل",
  "تنظيف مكاتب الشركات بعقود شهرية بالرياض",
  "شركة نظافة مكاتب بالرياض",
  "تنظيف مدارس بالرياض",
  "تنظيف وتعقيم مساجد بالرياض",
  "تنظيف مطاعم ومطابخ بالرياض",
  "تنظيف مستودعات تجارية بالرياض",
  "تنظيف استراحات بالرياض",
  "تنظيف قصور ومجالس بالرياض",
  "تنظيف شاليهات بالرياض",
  "شركة مكافحة حشرات بالرياض",
  "مكافحة حشرات للمنازل بالرياض",
  "رش مبيدات آمن بالرياض",
  "مكافحة الصراصير بالرياض",
  "مكافحة النمل بالرياض",
  "مكافحة البق بالرياض",
  "مكافحة القوارض بالرياض",
  "شركة جلي رخام وجرانيت بالرياض",
  "تلميع رخام بالرياض للمنازل",
  "جلي سيراميك بالرياض",
  "تلميع أرضيات بالرياض",
  "تنظيف أرضيات رخامية بالرياض",
  "شركة تنظيف سريعة بالرياض",
  "شركة تنظيف موثوقة للمنازل بالرياض",
  "أفضل شركة تنظيف فلل بالرياض",
  "أسعار تنظيف المنازل بالرياض",
  "تنظيف منازل شمال الرياض",
  "تنظيف منازل جنوب الرياض",
  "تنظيف منازل شرق الرياض",
  "تنظيف منازل غرب الرياض",
  "تنظيف منازل وسط الرياض",
  "شركة تنظيف حي الملقا",
  "شركة تنظيف حي الياسمين",
  "شركة تنظيف حي النرجس",
  "شركة تنظيف حي العارض",
];

const additionalKeywordPageTitles = [
  "شركة تنظيف فلل شرق الرياض",
  "شركة تنظيف فلل شمال الرياض",
  "تنظيف منازل بالساعة بالرياض",
  "تنظيف منازل قبل الانتقال بالرياض",
  "تنظيف منازل بعد الانتقال بالرياض",
  "تنظيف شقق مفروشة بالرياض",
  "تنظيف شقق عزاب بالرياض",
  "تنظيف شقق عوائل بالرياض",
  "تنظيف مطابخ بالرياض",
  "تنظيف حمامات بالرياض",
  "تنظيف خزانات علوية للمنازل بالرياض",
  "تنظيف خزانات أرضية للمنازل بالرياض",
  "عزل خزانات المياه بالرياض",
  "تعقيم خزانات المدارس بالرياض",
  "صيانة وتنظيف مكيفات بالرياض",
  "تنظيف مكيفات شباك بالرياض",
  "تنظيف مكيفات سبليت بالرياض",
  "تنظيف مكيفات بعد الصيانة بالرياض",
  "تنظيف واجهات كلادينج بالرياض",
  "تنظيف واجهات حجر بالرياض",
  "تنظيف واجهات رخام بالرياض",
  "تنظيف زجاج الأبراج بالرياض",
  "تنظيف لوحات المحلات بالرياض",
  "تنظيف مستودعات بالرياض بالعقود",
  "تنظيف عيادات بالرياض",
  "تنظيف فنادق بالرياض",
  "تنظيف مطاعم بالرياض بالبخار",
  "تنظيف كنب مجالس بالرياض",
  "تنظيف مراتب بالرياض",
  "تنظيف ستائر بالرياض",
  "تنظيف موكيت بالرياض",
  "تنظيف سجاد مجالس بالرياض",
  "تلميع رخام المطابخ بالرياض",
  "تلميع جرانيت بالرياض",
  "جلي بلاط بالرياض",
  "تنظيف سيراميك الحمامات بالرياض",
  "مكافحة بق الفراش بالرياض",
  "مكافحة النمل الأبيض بالرياض",
  "مكافحة الفئران بالرياض",
  "مكافحة النمل والصراصير بالرياض",
  "مكافحة حشرات الفلل بالرياض",
  "رش حشرات للمطاعم بالرياض",
  "شركة تعقيم منازل بالرياض",
  "تعقيم مكاتب بالرياض",
  "تعقيم مدارس بالرياض",
  "شركة تنظيف دوريات بالرياض",
  "شركة تنظيف بعد الحفلات بالرياض",
  "تنظيف خزانات المسابح بالرياض",
  "تنظيف مسابح بالرياض",
  "شركة تنظيف بالرياض بأسعار مناسبة",
];

const categoryFromUrl = (url) => {
  const segments = new URL(url).pathname.split("/").filter(Boolean);
  const first = segments[0] ?? "home";
  const labels = {
    about: "عن الموقع",
    services: "الخدمات",
    "cleaning-packages": "الباقات",
    packages: "الباقات",
    blog: "المقالات",
    articles: "المقالات",
    seo: "صفحات البحث",
    areas: "مناطق التغطية",
    contact: "التواصل",
    "call-now": "التواصل",
  };
  return labels[first] ?? (first === "home" ? "الرئيسية" : first);
};

const sourcePages = blocks.map((block, index) => {
  const sourceUrl = block.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim() ?? "";
  const url = rebaseSitemapUrl(sourceUrl);
  const images = [...block.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map(
    (match) => match[1].trim(),
  );
  const parsed = new URL(url);
  const pathName = parsed.pathname || "/";

  return {
    id: index + 1,
    slug: `p-${String(index + 1).padStart(3, "0")}`,
    url,
    path: pathName,
    title: titleFromUrl(url, index),
    category: categoryFromUrl(url),
    image: replaceBrandImage(images[0] ?? serviceApartmentsImage),
    images: images.slice(0, 3).map(replaceBrandImage),
  };
});

const keywordPages = [...keywordPageTitles, ...additionalKeywordPageTitles].map((title, index) => ({
  id: sourcePages.length + index + 1,
  slug: `p-${String(sourcePages.length + index + 1).padStart(3, "0")}`,
  url: `${siteOrigin}/`,
  path: `/seo/${encodeURIComponent(title)}`,
  title,
  category: "صفحات البحث",
  image: serviceApartmentsImage,
  images: [serviceApartmentsImage],
}));

const pages = [...sourcePages, ...keywordPages];
const siteHost = new URL(siteOrigin).host;
const partners = [
  {
    name: siteHost,
    label: "السهم لخدمات التنظيف الرياض",
    url: siteOrigin,
    image: "/partners/alsahmm.svg",
  },
  {
    name: "sabaik.net",
    label: "سبائك الماسة تأجير الحاويات بالرياض",
    url: "https://sabaik.net/",
    image: "/partners/sabaik.svg",
  },
  {
    name: "taqigroup.com",
    label: "تقي لتأجير الحاويات بالرياض",
    url: "https://taqigroup.com/",
    image: "/partners/taqigroup.svg",
  },
];

const lines = [
  "// Generated from artifacts/sabaik-almasa/public/sitemap.xml plus 100 Arabic SEO keyword pages.",
  "// Run `node scripts/generate-backlink-platform-data.mjs` after sitemap changes.",
  "",
  "export type SitePage = {",
  "  id: number;",
  "  slug: string;",
  "  url: string;",
  "  path: string;",
  "  title: string;",
  "  category: string;",
  "  image: string;",
  "  images: string[];",
  "};",
  "",
  `export const partnerLinks = ${JSON.stringify(partners, null, 2)} as const;`,
  "",
  `export const sitePages: SitePage[] = ${JSON.stringify(pages, null, 2)};`,
  "",
];

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
fs.mkdirSync(path.dirname(jsonOutputPath), { recursive: true });
fs.writeFileSync(
  jsonOutputPath,
  JSON.stringify({ pages, partners }, null, 2),
  "utf8",
);
console.log(`Generated ${pages.length} sitemap page records at ${outputPath}`);