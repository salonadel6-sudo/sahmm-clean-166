import assert from "node:assert/strict"
import test from "node:test"
import {
  analyzeRankMathSeo,
  isRankMathKeywordPresentInPath,
} from "../lib/seo-rank-math/src/index"

test("area paths accept verified Arabic transliterations and region equivalents", () => {
  const cases = [
    ["/areas/al-aarid", "شركة تنظيف حي العارض بالرياض"],
    ["/areas/al-aqiq", "شركة تنظيف حي العقيق بالرياض"],
    ["/areas/al-murabba", "شركة تنظيف حي المربع بالرياض"],
    ["/areas/dhahrat-laban", "شركة تنظيف حي ظهرة لبن بالرياض"],
    ["/areas/hittin", "شركة تنظيف حي حطين بالرياض"],
    ["/areas/north-riyadh", "شركة تنظيف شمال الرياض"],
    ["/areas/central-riyadh", "شركة تنظيف وسط الرياض"],
  ] as const

  for (const [path, keyword] of cases) {
    assert.equal(isRankMathKeywordPresentInPath(path, keyword, "area"), true, path)
  }
})

test("area matching does not accept a different neighborhood", () => {
  assert.equal(
    isRankMathKeywordPresentInPath("/areas/al-aarid", "شركة تنظيف حي العقيق بالرياض", "area"),
    false,
  )
})

test("fixed static routes match only their explicit Arabic page meanings", () => {
  assert.equal(isRankMathKeywordPresentInPath("/terms", "الشروط والأحكام", "static"), true)
  assert.equal(isRankMathKeywordPresentInPath("/about", "من نحن شركة تنظيف بالرياض", "static"), true)
  assert.equal(isRankMathKeywordPresentInPath("/call-now", "اتصل الآن شركة تنظيف بالرياض", "static"), true)
  assert.equal(isRankMathKeywordPresentInPath("/cleaning-packages", "باقات التنظيف بالرياض", "static"), true)
  assert.equal(isRankMathKeywordPresentInPath("/terms", "تنظيف منازل بالرياض", "static"), false)
})

test("content routes require every non-generic keyword term in the route", () => {
  assert.equal(
    isRankMathKeywordPresentInPath("/blog/tanzeef-almanazil-alryad", "تنظيف المنازل بالرياض", "article"),
    true,
  )
  assert.equal(
    isRankMathKeywordPresentInPath("/cleaning-packages/jaly-rakham", "جلي رخام بالرياض", "package"),
    true,
  )
  assert.equal(
    isRankMathKeywordPresentInPath("/cleaning-packages/tanzeef-bad-albenaa", "تنظيف بعد التشطيب بالرياض", "package"),
    false,
  )
  assert.equal(
    isRankMathKeywordPresentInPath("/cleaning-packages/تنظيف-بعد-التشطيب-بالرياض", "تنظيف بعد التشطيب بالرياض", "package"),
    true,
  )
  assert.equal(
    isRankMathKeywordPresentInPath("/cleaning-packages/تنظيف-واجهات-مباني-بالرياض", "تنظيف واجهات مباني بالرياض", "package"),
    true,
  )
  assert.equal(
    isRankMathKeywordPresentInPath("/cleaning-packages/تركيب-أنظمة-حريق-بالرياض", "تركيب أنظمة حريق بالرياض", "package"),
    true,
  )
  assert.equal(
    isRankMathKeywordPresentInPath("/contact/شركة-تنظيف-بالرياض", "شركة تنظيف بالرياض", "static"),
    true,
  )
  assert.equal(
    isRankMathKeywordPresentInPath("/faq/تنظيف-المنازل-بالرياض", "تنظيف المنازل بالرياض", "static"),
    true,
  )
  assert.equal(
    isRankMathKeywordPresentInPath("/services/تنظيف-واجهات-مباني-بالرياض", "تنظيف واجهات زجاج بالرياض", "service"),
    false,
  )
})

test("the shared analyzer reports verified transliteration as a passing URL check", () => {
  const analysis = analyzeRankMathSeo({
    type: "area",
    title: "شركة تنظيف حي العارض بالرياض",
    seoTitle: "شركة تنظيف حي العارض بالرياض",
    description: "شركة تنظيف حي العارض بالرياض بخدمة موثوقة.",
    focusKeyword: "شركة تنظيف حي العارض بالرياض",
    slug: "/areas/al-aarid",
    canonical: "https://alsahmm.com/areas/al-aarid",
    expectedCanonical: "https://alsahmm.com/areas/al-aarid",
    content: "تنظيف منازل وفلل بالرياض. ".repeat(40),
    h1: ["شركة تنظيف حي العارض بالرياض"],
  })
  assert.equal(analysis.checks.find(check => check.id === "keyword-url")?.status, "pass")
})
