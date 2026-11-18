import assert from "node:assert/strict"
import {
  analyzeRankMathSeo,
  buildSeoPageRankMathInput,
  buildBlogPostRankMathInput,
  evaluateSeoPageIndexability,
  getRankMathFocusKeyword,
  isValidRankMathCanonical,
  normalizeRankMathCanonical,
  putRankMathFocusKeywordFirst,
} from "@workspace/seo-rank-math"

const activeSiteOrigin = "https://active-site.example"
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { location: { origin: activeSiteOrigin } },
})
const { evaluateSeoPage } = await import("../artifacts/sabaik-almasa/src/lib/seo-audit")

const post = {
  title: "أسعار شركات تنظيف المنازل والفلل بالرياض",
  slug: "asaar-sharikat-cleaning",
  seoSlug: "asaar-sharikat-tanzeef-almanazil-alryad-2026",
  seoTitle: "أسعار وتكلفة تنظيف المنازل والفلل بالرياض | السهم كلين",
  seoDescription: "دليل أسعار تنظيف المنازل والفلل بالرياض مع تفاصيل التكلفة والعوامل المؤثرة.",
  seoKeywords: "أسعار شركات تنظيف المنازل بالرياض، تنظيف فلل بالرياض",
  canonicalUrl: "",
  content: "<h2>أسعار تنظيف المنازل</h2><p>تعتمد التكلفة على مساحة المنزل ونوع الخدمة المطلوبة.</p>",
}

const slug = post.seoSlug || post.slug
const expectedCanonical = `/blog/${encodeURIComponent(slug)}`
const legacyEditorInput = {
  type: "article" as const,
  title: post.title,
  seoTitle: post.seoTitle || post.title,
  description: post.seoDescription,
  focusKeyword: getRankMathFocusKeyword({ keywords: post.seoKeywords }),
  slug,
  canonical: post.canonicalUrl || expectedCanonical,
  expectedCanonical,
  content: post.content,
  h1: post.title ? [post.title] : [],
}

const sharedInput = buildBlogPostRankMathInput(post)
assert.deepEqual(sharedInput, legacyEditorInput, "shared adapter must preserve the editor's exact Rank Math inputs")
assert.equal(
  analyzeRankMathSeo(sharedInput).score,
  analyzeRankMathSeo(legacyEditorInput).score,
  "the editor and site audit must calculate the same score from the shared post input",
)
assert.deepEqual(
  putRankMathFocusKeywordFirst(
    ["تنظيف منازل بالرياض", "شركة تنظيف بالرياض", "شركة تنظيف بالرياض"],
    "شركة تنظيف بالرياض",
  ),
  ["شركة تنظيف بالرياض", "تنظيف منازل بالرياض"],
  "AI SEO keywords must keep the selected focus phrase first and remove its duplicate",
)
const auditPage = evaluateSeoPage({
  url: `${activeSiteOrigin}/blog/${slug}`,
  expectedCanonical,
  statusCode: 200,
  title: sharedInput.seoTitle || sharedInput.title,
  description: sharedInput.description,
  focusKeyword: sharedInput.focusKeyword || "",
  canonical: expectedCanonical,
  robots: "index, follow",
  h1: sharedInput.h1 || [],
  h2: [],
  contentText: "محتوى مطابق للمقال المحفوظ",
  internalLinks: 0,
  externalLinks: 0,
  imageCount: 0,
  imagesWithAlt: 0,
  jsonLdValid: false,
  openGraphComplete: false,
  rankMathInput: sharedInput,
})
assert.equal(auditPage.score, analyzeRankMathSeo(sharedInput).score)
assert.equal(auditPage.rankMathSource, "cms-record")
assert.equal(auditPage.rankMathWordCount, analyzeRankMathSeo(sharedInput).wordCount)

const fallbackInput = buildBlogPostRankMathInput({
  title: "عنوان المقال",
  slug: "article-slug",
  seoTitle: "",
  seoSlug: "",
})
assert.equal(fallbackInput.seoTitle, "عنوان المقال")
assert.equal(fallbackInput.slug, "article-slug")
assert.equal(fallbackInput.canonical, "/blog/article-slug")

const pageSlug = "تنظيف-المنازل"
const expectedPageCanonical = `/page/${encodeURIComponent(pageSlug)}`
const expectedActivePageCanonical = `${activeSiteOrigin}${expectedPageCanonical}`
const relativePageCanonical = `/page/${pageSlug}`
assert.equal(
  normalizeRankMathCanonical(relativePageCanonical, expectedPageCanonical),
  expectedPageCanonical,
  "a relative self-canonical remains the exact environment-independent path",
)
assert.equal(
  isValidRankMathCanonical(relativePageCanonical, expectedPageCanonical),
  true,
  "a relative self-canonical is valid when the expected page is known",
)
assert.equal(
  isValidRankMathCanonical(`/page/${pageSlug}-other`, expectedPageCanonical),
  false,
  "a different relative path is rejected",
)
assert.equal(
  isValidRankMathCanonical(`https://other.example/page/${pageSlug}`, expectedActivePageCanonical),
  false,
  "a canonical on a different host is rejected",
)

const seoPageInput = buildSeoPageRankMathInput({
  title: "تنظيف المنازل بالرياض",
  slug: pageSlug,
  seoTitle: "تنظيف المنازل بالرياض",
  targetKeyword: "تنظيف منازل بالرياض",
  seoDescription: "تنظيف منازل بالرياض بخدمات موثوقة ومواعيد مرنة.",
  canonicalUrl: relativePageCanonical,
  content: "تنظيف المنازل بالرياض بخطة عمل واضحة وخبرة في العناية بمختلف الأسطح. ".repeat(8),
})
assert.equal(seoPageInput.canonical, expectedPageCanonical)
assert.equal(seoPageInput.expectedCanonical, expectedPageCanonical)
assert.equal(
  analyzeRankMathSeo({ ...seoPageInput, canonical: relativePageCanonical })
    .checks.find(check => check.id === "canonical")?.status,
  "pass",
  "Rank Math validates relative self-canonicals against the exact self path",
)

const relativeIndexability = evaluateSeoPageIndexability({
  title: "تنظيف المنازل بالرياض",
  targetKeyword: "تنظيف منازل بالرياض",
  seoTitle: "تنظيف المنازل بالرياض",
  content: `<p>${"تنظيف المنازل بالرياض بخدمة موثوقة. ".repeat(50)}</p>`,
  slug: pageSlug,
  canonical: relativePageCanonical,
  expectedCanonical: expectedActivePageCanonical,
})
assert.equal(relativeIndexability.indexable, true)
const mismatchedIndexability = evaluateSeoPageIndexability({
  title: "تنظيف المنازل بالرياض",
  targetKeyword: "تنظيف منازل بالرياض",
  seoTitle: "تنظيف المنازل بالرياض",
  content: `<p>${"تنظيف المنازل بالرياض بخدمة موثوقة. ".repeat(50)}</p>`,
  slug: pageSlug,
  canonical: `https://other.example/page/${pageSlug}`,
  expectedCanonical: expectedActivePageCanonical,
})
assert.equal(mismatchedIndexability.indexable, false)

const homepageAnalysis = analyzeRankMathSeo({
  type: "homepage",
  title: "شركة تنظيف بالرياض للمنازل والفلل والمكاتب | السهم كلين",
  seoTitle: "شركة تنظيف بالرياض للمنازل والفلل والمكاتب | السهم كلين",
  description: "شركة تنظيف بالرياض من السهم كلين للمنازل والفلل والشقق والمكاتب، مع التنظيف بعد البناء وغسيل المجالس والسجاد بالبخار. اطلب الخدمة وحدد احتياجك وموعدك.",
  focusKeyword: "شركة تنظيف بالرياض",
  slug: "/",
  canonical: `${activeSiteOrigin}/`,
  expectedCanonical: `${activeSiteOrigin}/`,
  content: "شركة تنظيف بالرياض للمنازل والفلل والشقق والمكاتب. ".repeat(35),
  h1: ["شركة تنظيف بالرياض"],
})
assert.equal(homepageAnalysis.score, 100, "the canonical root homepage should not lose points for lacking a keyword slug")
assert.equal(
  homepageAnalysis.checks.find(check => check.id === "keyword-url")?.status,
  "unknown",
  "the keyword-in-URL check should be excluded for the canonical root homepage",
)

console.log("Rank Math article input parity checks passed.")
