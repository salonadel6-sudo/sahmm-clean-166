import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import {
  analyzeRankMathSeo,
  buildPackageVisibleContent,
  buildServiceVisibleContent,
  RANK_MATH_EDITOR_POLICY,
  type RankMathInput,
} from "../lib/seo-rank-math/src/index.ts"

const fixtures = [
  {
    title: "تنظيف فلل بالرياض",
    description: "تنظيف الفلل في الرياض وفق مساحة العقار ونوع الأسطح ونطاق العمل المطلوب. يراجع الفريق التفاصيل قبل تحديد الموعد.",
    seoDescription: "خدمة تنظيف فلل بالرياض بخطوات واضحة وتنسيق مسبق حسب تفاصيل الموقع واحتياج العميل.",
    seoTitle: "تنظيف فلل بالرياض | خدمات السهم كلين",
    focusKeyword: "تنظيف فلل بالرياض",
    slug: "تنظيف-فلل-بالرياض",
    companyName: "السهم كلين",
    images: [{ alt: "تنظيف فلل بالرياض" }],
  },
  {
    title: "عزل أسطح وخزانات بالرياض",
    description: "تُراجع حالة السطح أو الخزان والغرض من العزل قبل توضيح المواد ونطاق العمل. يتحدد الموعد بعد معرفة تفاصيل الموقع.",
    seoDescription: "تعرف على خدمة عزل الأسطح والخزانات في الرياض وخطوات مراجعة الموقع وتحديد نطاق العمل.",
    seoTitle: "عزل أسطح وخزانات بالرياض | السهم كلين",
    focusKeyword: "عزل أسطح بالرياض",
    slug: "عزل-أسطح-وخزانات-بالرياض",
    companyName: "السهم كلين",
    images: [],
  },
]

const packageFixtures = [
  {
    name: "باقة تنظيف الفلل",
    category: "villas",
    size: "فيلا متوسطة",
    capacity: "حتى 8 غرف",
    description: "باقة تنظيف للفلل في الرياض حسب المساحة ونوع الأسطح. يراجع الفريق تفاصيل الموقع قبل تأكيد نطاق العمل.",
    suitableFor: "الفلل السكنية",
    rentalPeriod: "",
    features: ["تنظيف الغرف والممرات", "العناية بالأسطح"],
    seoTitle: "باقة تنظيف الفلل بالرياض | السهم كلين",
    seoDescription: "باقة تنظيف فلل بالرياض بخدمات تناسب مساحة الفيلا ونطاق العمل المطلوب.",
    focusKeyword: "تنظيف فلل بالرياض",
    slug: "باقة-تنظيف-الفلل",
    images: [{ alt: "باقة تنظيف الفلل" }],
  },
  {
    name: "حاوية مخلفات البناء",
    category: "postcon",
    size: "20 ياردة",
    capacity: "حمولة متوسطة",
    description: "حاوية لمخلفات البناء والتشطيب ضمن مدة الإيجار المتفق عليها.",
    suitableFor: "مواقع البناء والترميم",
    rentalPeriod: "حسب الاتفاق",
    features: "[\"تحديد الموقع قبل التوريد\",\"تأكيد المدة عند الطلب\"]",
    seoTitle: "حاوية مخلفات البناء بالرياض",
    seoDescription: "تفاصيل حاوية مخلفات البناء وحجمها ومدة الإيجار في الرياض.",
    focusKeyword: "حاوية مخلفات البناء بالرياض",
    slug: "حاوية-مخلفات-البناء",
    images: [],
  },
]

const phpCode = [
  'require $argv[1];',
  '$input = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);',
  '$editorial = $input["kind"] === "package" ? buildRankMathPackagePageContent($input["editorial"]) : buildRankMathServicePageContent($input["editorial"]);',
  '$analysis = analyzeRankMathSeo($input["rank"]);',
  'echo json_encode(["editorial" => $editorial, "analysis" => $analysis], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);',
].join(" ")

const lengthBoundaries = [
  { field: "title", checkId: "title-length", phpCheckId: "titleLength", policy: RANK_MATH_EDITOR_POLICY.title },
  { field: "description", checkId: "description-length", phpCheckId: "descriptionLength", policy: RANK_MATH_EDITOR_POLICY.description },
] as const

for (const { field, checkId, phpCheckId, policy } of lengthBoundaries) {
  const cases = [
    { length: policy.minimum - 1, status: "warning" },
    { length: policy.minimum, status: "pass" },
    { length: policy.maximum, status: "pass" },
    { length: policy.maximum + 1, status: "warning" },
    { length: policy.hardMaximum + 1, status: "fail" },
  ]

  for (const { length, status } of cases) {
    const titleLength = field === "title" ? length : RANK_MATH_EDITOR_POLICY.title.minimum
    const descriptionLength = field === "description" ? length : RANK_MATH_EDITOR_POLICY.description.minimum
    const rankInput: RankMathInput = {
      type: "homepage",
      title: "س".repeat(titleLength),
      seoTitle: "س".repeat(titleLength),
      description: "و".repeat(descriptionLength),
      focusKeyword: "شركة تنظيف بالرياض",
      slug: "/",
      canonical: "https://alsahmm.com/",
      expectedCanonical: "https://alsahmm.com/",
      content: Array(70).fill("تنظيف").join(" "),
      h1: ["شركة تنظيف بالرياض"],
      internalLinks: 2,
      jsonLdValid: true,
    }
    const jsAnalysis = analyzeRankMathSeo(rankInput)
    const jsCheck = jsAnalysis.checks.find(check => check.id === checkId)
    assert.equal(jsCheck?.status, status, `${field} length ${length} must be ${status} in TypeScript`)
    assert.equal(Boolean(jsCheck?.blocking), status === "fail", `${field} length ${length} blocking state`)

    const phpResult = JSON.parse(execFileSync("php", [
      "-r",
      phpCode,
      fileURLToPath(new URL("./seo-page-policy.php", import.meta.url)),
    ], {
      cwd: process.cwd(),
      input: JSON.stringify({ kind: "service", editorial: fixtures[0], rank: rankInput }),
      encoding: "utf8",
    })) as { analysis: { checks: Array<{ id: string; status: string; blocking?: boolean }> } }
    const phpCheck = phpResult.analysis.checks.find(check => check.id === phpCheckId)
    assert.equal(phpCheck?.status, status, `${field} length ${length} must be ${status} in PHP`)
    assert.equal(phpCheck?.status, jsCheck?.status, `${field} length ${length} status parity`)
    assert.equal(Boolean(phpCheck?.blocking), Boolean(jsCheck?.blocking), `${field} length ${length} blocking parity`)
  }
}

const articleBoundaryFixtures: RankMathInput[] = [
  {
    type: "article",
    title: "شركة تنظيف بالرياض للبيوت والفلل",
    seoTitle: "شركة تنظيف بالرياض للبيوت والفلل",
    description: `شركة تنظيف بالرياض تقدم خدمات تنظيف المنازل والفلل بخطوات واضحة تناسب احتياج العميل وتفاصيل العقار في المدينة. ${"معلومات موثوقة ".repeat(5)}`,
    focusKeyword: "شركة تنظيف بالرياض",
    slug: "شركة-تنظيف-بالرياض",
    canonical: "https://alsahmm.com/blog/رابط-قديم",
    expectedCanonical: `https://alsahmm.com/blog/${encodeURIComponent("شركة-تنظيف-بالرياض")}`,
    content: Array(299).fill("تنظيف").join(" "),
    h1: ["شركة تنظيف بالرياض للبيوت والفلل"],
  },
  {
    type: "article",
    title: "شركة تنظيف بالرياض للبيوت والفلل",
    seoTitle: "شركة تنظيف بالرياض للبيوت والفلل",
    description: `شركة تنظيف بالرياض تقدم خدمات تنظيف المنازل والفلل بخطوات واضحة تناسب احتياج العميل وتفاصيل العقار في المدينة. ${"معلومات موثوقة ".repeat(5)}`,
    focusKeyword: "شركة تنظيف بالرياض",
    slug: "شركة-تنظيف-بالرياض",
    canonical: `https://alsahmm.com/blog/${encodeURIComponent("شركة-تنظيف-بالرياض")}`,
    expectedCanonical: `https://alsahmm.com/blog/${encodeURIComponent("شركة-تنظيف-بالرياض")}`,
    content: Array(300).fill("تنظيف").join(" "),
    h1: ["شركة تنظيف بالرياض للبيوت والفلل"],
  },
]
const phpArticleCheckIds: Record<string, string> = {
  titleLength: "title-length",
  keyword: "focus-keyword",
  keywordTitle: "keyword-title",
  descriptionLength: "description-length",
  keywordDescription: "keyword-description",
  keywordH1: "keyword-h1",
  keywordIntroduction: "keyword-introduction",
  contentDepth: "content-depth",
  keywordUrl: "keyword-url",
  imageAlt: "image-alt",
  internalLinks: "internal-links",
}

for (const rankInput of articleBoundaryFixtures) {
  const phpResult = JSON.parse(execFileSync("php", [
    "-r",
    phpCode,
    fileURLToPath(new URL("./seo-page-policy.php", import.meta.url)),
  ], {
    cwd: process.cwd(),
    input: JSON.stringify({ kind: "service", editorial: fixtures[0], rank: rankInput }),
    encoding: "utf8",
  })) as {
    analysis: {
      score: number
      wordCount: number
      publishable: boolean
      blockingIssues: string[]
      checks: Array<{ id: string; status: string }>
    }
  }
  const jsAnalysis = analyzeRankMathSeo(rankInput)
  assert.equal(phpResult.analysis.score, jsAnalysis.score, "article boundary score must match in PHP and TypeScript")
  assert.equal(phpResult.analysis.wordCount, jsAnalysis.wordCount, "article word count must match in PHP and TypeScript")
  assert.equal(phpResult.analysis.publishable, jsAnalysis.publishable, "article publish decision must match in PHP and TypeScript")
  assert.deepEqual(phpResult.analysis.blockingIssues, jsAnalysis.blockingIssues, "article blockers must match in PHP and TypeScript")
  assert.deepEqual(
    phpResult.analysis.checks.map(({ id, status }) => [phpArticleCheckIds[id] ?? id, status]),
    jsAnalysis.checks.map(({ id, status }) => [id, status]),
    "article check statuses must match in PHP and TypeScript",
  )
}
assert.equal(
  analyzeRankMathSeo(articleBoundaryFixtures[0]).checks.find(check => check.id === "content-depth")?.status,
  "warning",
  "299 words must not pass the article depth threshold",
)
assert.equal(
  analyzeRankMathSeo(articleBoundaryFixtures[1]).checks.find(check => check.id === "content-depth")?.status,
  "pass",
  "300 words must pass the article depth threshold",
)
assert.equal(
  analyzeRankMathSeo(articleBoundaryFixtures[0]).checks.find(check => check.id === "canonical")?.status,
  "fail",
  "a non-self canonical must fail",
)

for (const fixture of fixtures) {
  const editorial = buildServiceVisibleContent(fixture)
  const rankInput = {
    type: "service" as const,
    title: fixture.title,
    seoTitle: fixture.seoTitle,
    description: editorial.metaDescription,
    focusKeyword: fixture.focusKeyword,
    slug: fixture.slug,
    canonical: `https://alsahmm.com/services/${encodeURIComponent(fixture.slug)}`,
    expectedCanonical: `https://alsahmm.com/services/${encodeURIComponent(fixture.slug)}`,
    content: editorial.contentText,
    h1: [fixture.title],
    images: fixture.images,
    internalLinks: 2,
    jsonLdValid: true,
  }
  const phpResult = JSON.parse(execFileSync("php", [
    "-r",
    phpCode,
    fileURLToPath(new URL("./seo-page-policy.php", import.meta.url)),
  ], {
    cwd: process.cwd(),
    input: JSON.stringify({ kind: "service", editorial: fixture, rank: rankInput }),
    encoding: "utf8",
  })) as {
    editorial: { contentText: string; metaDescription: string; faqs: unknown[] }
    analysis: { score: number; wordCount: number; publishable: boolean; blockingIssues: string[]; checks: Array<{ label: string; status: string }> }
  }
  assert.equal(phpResult.editorial.contentText, editorial.contentText, `PHP editorial text mismatch for ${fixture.title}`)
  assert.equal(phpResult.editorial.metaDescription, editorial.metaDescription, `PHP meta description mismatch for ${fixture.title}`)
  assert.deepEqual(phpResult.editorial.faqs, editorial.faqs, `PHP FAQ content mismatch for ${fixture.title}`)

  const jsAnalysis = analyzeRankMathSeo(rankInput)
  assert.equal(phpResult.analysis.score, jsAnalysis.score, `PHP/TypeScript score mismatch for ${fixture.title}`)
  assert.equal(phpResult.analysis.wordCount, jsAnalysis.wordCount, `PHP/TypeScript word-count mismatch for ${fixture.title}`)
  assert.equal(phpResult.analysis.publishable, jsAnalysis.publishable, `PHP/TypeScript publishability mismatch for ${fixture.title}`)
  assert.deepEqual(phpResult.analysis.blockingIssues, jsAnalysis.blockingIssues, `PHP/TypeScript gate mismatch for ${fixture.title}`)
  assert.deepEqual(
    phpResult.analysis.checks.map(({ label, status }) => [label, status]),
    jsAnalysis.checks.map(({ label, status }) => [label, status]),
    `PHP/TypeScript check mismatch for ${fixture.title}`,
  )
}

for (const fixture of packageFixtures) {
  const editorial = buildPackageVisibleContent(fixture)
  const pageTitle = `${fixture.name}${fixture.size ? ` — ${fixture.size}` : ""}`
  const rankInput = {
    type: "package" as const,
    title: fixture.name,
    seoTitle: fixture.seoTitle,
    description: fixture.seoDescription,
    focusKeyword: fixture.focusKeyword,
    slug: fixture.slug,
    canonical: `https://alsahmm.com/cleaning-packages/${encodeURIComponent(fixture.slug)}`,
    expectedCanonical: `https://alsahmm.com/cleaning-packages/${encodeURIComponent(fixture.slug)}`,
    content: editorial.contentText,
    h1: [pageTitle],
    images: fixture.images,
    internalLinks: 2,
    jsonLdValid: true,
  }
  const phpResult = JSON.parse(execFileSync("php", [
    "-r",
    phpCode,
    fileURLToPath(new URL("./seo-page-policy.php", import.meta.url)),
  ], {
    cwd: process.cwd(),
    input: JSON.stringify({ kind: "package", editorial: fixture, rank: rankInput }),
    encoding: "utf8",
  })) as {
    editorial: { contentText: string; description: string; features: string[] }
    analysis: { score: number; wordCount: number; publishable: boolean; blockingIssues: string[]; checks: Array<{ label: string; status: string }> }
  }
  assert.equal(phpResult.editorial.contentText, editorial.contentText, `PHP package text mismatch for ${fixture.name}`)
  assert.equal(phpResult.editorial.description, editorial.description, `PHP package description mismatch for ${fixture.name}`)
  assert.deepEqual(phpResult.editorial.features, editorial.features, `PHP package features mismatch for ${fixture.name}`)

  const jsAnalysis = analyzeRankMathSeo(rankInput)
  assert.equal(phpResult.analysis.score, jsAnalysis.score, `PHP/TypeScript package score mismatch for ${fixture.name}`)
  assert.equal(phpResult.analysis.wordCount, jsAnalysis.wordCount, `PHP/TypeScript package word-count mismatch for ${fixture.name}`)
  assert.equal(phpResult.analysis.publishable, jsAnalysis.publishable, `PHP/TypeScript package publishability mismatch for ${fixture.name}`)
  assert.deepEqual(phpResult.analysis.blockingIssues, jsAnalysis.blockingIssues, `PHP/TypeScript package gate mismatch for ${fixture.name}`)
  assert.deepEqual(
    phpResult.analysis.checks.map(({ label, status }) => [label, status]),
    jsAnalysis.checks.map(({ label, status }) => [label, status]),
    `PHP/TypeScript package check mismatch for ${fixture.name}`,
  )
}

console.log(`Rank Math service/package parity passed for ${fixtures.length} service and ${packageFixtures.length} package fixtures; title and description boundaries passed in TypeScript and PHP.`)
