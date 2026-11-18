#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { getSeoPageIndexability } from "./seo-page-policy.mjs";

const substantialContent = `<p>${"تنظيف المنازل بالرياض يحتاج إلى خطة عمل واضحة وخبرة في التعامل مع الأسطح المختلفة. ".repeat(15)}</p>`;
const safetyContent = `<p>${"خدمة السلامة للمنشآت تشمل مراجعة بيانات الموقع ونطاق العمل قبل تحديد الخطوات. ".repeat(15)}</p>`;
const fixtures = [
  {
    title: "تنظيف المنازل بالرياض",
    targetKeyword: "تنظيف منازل بالرياض",
    content: substantialContent,
    slug: "تنظيف-المنازل",
    canonicalUrl: "https://alsahmm.com/page/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D8%A7%D9%84%D9%85%D9%86%D8%A7%D8%B2%D9%84",
  },
  {
    title: "تنظيف المنازل بالرياض",
    targetKeyword: "تنظيف منازل بالرياض",
    content: substantialContent,
    slug: "تنظيف-المنازل",
    canonicalUrl: "/page/تنظيف-المنازل",
  },
  {
    title: "تنظيف المنازل بالرياض",
    targetKeyword: "تنظيف منازل بالرياض",
    content: substantialContent,
    slug: "تنظيف-المنازل",
    canonicalUrl: "https://other.example/page/تنظيف-المنازل",
  },
  { title: "نقل عفش بالرياض", target_keyword: "نقل عفش", content: substantialContent, slug: "نقل-عفش" },
  { title: "صفحة عامة", target_keyword: "صفحة عامة", content: substantialContent, slug: "عام" },
  { title: "تنظيف مجالس بالرياض", target_keyword: "تنظيف مجالس", content: "<p>مختصر</p>", slug: "تنظيف-مجالس" },
  {
    title: "تنظيف السجاد بالرياض",
    targetKeyword: "تنظيف السجاد",
    content: substantialContent,
    slug: "تنظيف-السجاد",
    canonicalUrl: "/page/صفحة-أخرى",
  },
  {
    title: "تنظيف خزانات المياه بالرياض",
    targetKeyword: "تنظيف خزانات",
    content: substantialContent,
    slug: "تنظيف-خزانات",
    canonicalUrl: "/page/%E0%B8%88%E0%B8%B1%E0%B8%94",
  },
  {
    title: "تنظيف الستائر بالرياض",
    targetKeyword: "تنظيف الستائر",
    content: `${substantialContent}<script>${"نص مخفي ".repeat(350)}</script><style>${"نص مخفي ".repeat(350)}</style><!-- ${"نص مخفي ".repeat(350)} -->`,
    slug: "تنظيف-الستائر",
  },
  {
    title: "تنظيف الكنب بالرياض",
    targetKeyword: "تنظيف الكنب",
    content: substantialContent.replace("خطة عمل", "خطة &amp; عمل &#x645;"),
    slug: "تنظيف-الكنب",
  },
  {
    title: "تجهيز ملف السلامة للمنشآت بالرياض",
    targetKeyword: "تجهيز ملف السلامة للمنشآت بالرياض",
    content: safetyContent,
    slug: "تجهيز-ملف-السلامة-للمنشآت-بالرياض",
    canonicalUrl: "/page/تجهيز-ملف-السلامة-للمنشآت-بالرياض",
  },
  {
    title: "تركيب أدوات الحماية من الحريق بالرياض",
    targetKeyword: "تركيب أدوات الحماية من الحريق بالرياض",
    content: safetyContent,
    slug: "تركيب-أدوات-الحماية-من-الحريق-بالرياض",
    canonicalUrl: "/page/تركيب-أدوات-الحماية-من-الحريق-بالرياض",
  },
  {
    title: "تقرير فني فوري للمنشآت بالرياض",
    targetKeyword: "تقرير فني فوري للمنشآت بالرياض",
    content: safetyContent,
    slug: "تقرير-فني-فوري-للمنشآت-بالرياض",
    canonicalUrl: "/page/تقرير-فني-فوري-للمنشآت-بالرياض",
  },
  {
    title: "تقرير فني مجدول للمنشآت بالرياض",
    targetKeyword: "تقرير فني مجدول للمنشآت بالرياض",
    content: safetyContent,
    slug: "تقرير-فني-مجدول-للمنشآت-بالرياض",
    canonicalUrl: "/page/تقرير-فني-مجدول-للمنشآت-بالرياض",
  },
  {
    title: "عقد صيانة أنظمة السلامة بالرياض",
    targetKeyword: "عقد صيانة أنظمة السلامة بالرياض",
    content: safetyContent,
    slug: "عقد-صيانة-أنظمة-السلامة-بالرياض",
    canonicalUrl: "/page/عقد-صيانة-أنظمة-السلامة-بالرياض",
  },
  {
    title: "إصلاح إنذار الحريق بالرياض",
    targetKeyword: "إصلاح إنذار الحريق بالرياض",
    content: safetyContent,
    slug: "إصلاح-إنذار-الحريق-بالرياض",
  },
];

const php = `
require ${JSON.stringify(new URL("./seo-page-policy.php", import.meta.url).pathname)};
$pages = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
$results = array_map(static fn($page) => getSeoPageIndexability($page), $pages);
echo json_encode($results, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
`;
const phpResults = JSON.parse(execFileSync("php", ["-r", php], {
  cwd: process.cwd(),
  input: JSON.stringify(fixtures),
  encoding: "utf8",
}));
const nodeResults = fixtures.map(getSeoPageIndexability);

if (JSON.stringify(nodeResults) !== JSON.stringify(phpResults)) {
  console.error("Node/PHP SEO page indexability policies disagree.");
  console.error("Node:", JSON.stringify(nodeResults, null, 2));
  console.error("PHP: ", JSON.stringify(phpResults, null, 2));
  process.exitCode = 1;
} else {
  console.log(`SEO page indexability policy matches across Node and PHP (${fixtures.length} fixtures).`);
}
