import {
  analyzeRankMathSiteKeywordStrength,
  countRankMathPhraseOccurrences,
  isRankMathProjectSearchPhrase,
} from "@workspace/seo-rank-math"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const pages = [
  {
    url: "https://alsahmm.com/blog/first-article",
    kind: "مقال",
    title: "",
    description: "",
    focusKeyword: "شركة تنظيف بالرياض",
    h1: [],
    contentText: "شركة تنظيف بالرياض، شركة تنظيف بالرياض.",
  },
  {
    url: "https://alsahmm.com/blog/second-article",
    kind: "مقال",
    title: "",
    description: "",
    focusKeyword: "شركة تنظيف بالرياض",
    h1: [],
    contentText: "شركة تنظيف بالرياض",
  },
  {
    url: "https://alsahmm.com/services/cleaning",
    kind: "خدمة",
    title: "",
    description: "",
    focusKeyword: "",
    h1: [],
    contentText: "شركة تنظيف بالرياض",
  },
]

assert(
  countRankMathPhraseOccurrences("شَرِكَة تنظيف بالرياض، شركة تنظيف بالرياض", "شركة تنظيف بالرياض") === 2,
  "phrase counts should normalize Arabic diacritics",
)
assert(isRankMathProjectSearchPhrase("شركة تنظيف بالرياض"), "the primary service phrase should remain eligible")
assert(isRankMathProjectSearchPhrase("عزل أسطح بالرياض"), "supported insulation service phrases should remain eligible")
assert(isRankMathProjectSearchPhrase("الفرق بين التقرير الفني الفوري والمجدول بالرياض"), "the supported technical-report topics should remain eligible")
assert(isRankMathProjectSearchPhrase("بيانات التقرير الفني للمنشآت بالرياض"), "supported facility report preparation should remain eligible")
assert(isRankMathProjectSearchPhrase("تنظيم زيارات صيانة أنظمة السلامة بالرياض"), "supported safety maintenance documentation should remain eligible")
assert(!isRankMathProjectSearchPhrase("الرياض"), "single-word city terms should not enter the SEO phrase list")
assert(!isRankMathProjectSearchPhrase("شركة نقل أثاث بالرياض"), "unsupported service intents should not enter the SEO phrase list")
assert(!isRankMathProjectSearchPhrase("نقل مكيفات بالرياض"), "unsupported service intents should not enter the cleaning keyword list")

const rows = analyzeRankMathSiteKeywordStrength(
  ["شركة تنظيف بالرياض", " شركة تنظيف بالرياض ", "كلمة غير موجودة"],
  pages,
)
const primary = rows.find(row => row.term === "شركة تنظيف بالرياض")
const absent = rows.find(row => row.term === "كلمة غير موجودة")

assert(rows.length === 2, "duplicate keyword sources should be combined")
assert(rows[0]?.term === "شركة تنظيف بالرياض", "keywords should be ordered by descending site strength")
assert(primary?.occurrences === 4, "all phrase occurrences across the page content should be counted")
assert(primary?.pageCount === 3, "the number of pages containing the term should be counted")
assert(primary?.articleCount === 2, "the number of blog articles containing the term should be counted")
assert(primary?.focusPageCount === 2, "pages explicitly targeting the focus keyword should be counted")
assert(primary?.strength === 52, "strength should use occurrences, page distribution, article coverage, and focus targeting")
assert(primary?.usagePercent === 33.33, "usage percent should be phrase occurrences divided by all audited words")
assert(absent?.strength === 0 && absent.occurrences === 0, "unseen keywords should have zero site strength")
assert(absent?.usagePercent === 0, "unseen keywords should have zero usage percent")

const overlapPage = [{
  url: "https://alsahmm.com/page/overlapping-phrases",
  kind: "صفحة SEO",
  title: "",
  description: "",
  focusKeyword: "",
  h1: [],
  contentText: "aaaaaa",
}]
const overlapRows = analyzeRankMathSiteKeywordStrength(["aa", "aaa"], overlapPage)
assert(overlapRows.find(row => row.term === "aa")?.occurrences === 3, "phrase matches should remain non-overlapping per keyword")
assert(overlapRows.find(row => row.term === "aaa")?.occurrences === 2, "different overlapping phrases should both be counted")

const largeBody = "شركة تنظيف بالرياض ومنازل نظيفة وخدمات الرياض المميزة. ".repeat(128)
const largePages = Array.from({ length: 467 }, (_, index) => ({
  url: `https://alsahmm.com/blog/performance-${index}`,
  kind: "مقال",
  title: `شركة تنظيف بالرياض ${index}`,
  description: "تنظيف المنازل وخدمات الرياض",
  focusKeyword: index % 3 === 0 ? "شركة تنظيف بالرياض" : "",
  h1: ["شركة تنظيف بالرياض"],
  contentText: largeBody,
}))
const largeTerms = [
  ...Array.from({ length: 72 }, (_, index) => `كلمة تجريبية ${index}`),
  "شركة تنظيف بالرياض",
  "تنظيف المنازل",
  "الرياض",
]
const startedAt = performance.now()
const largeRows = analyzeRankMathSiteKeywordStrength(largeTerms, largePages)
const elapsedMs = Math.round(performance.now() - startedAt)
assert(largeRows.length === largeTerms.length, "large scans should retain every distinct keyword")
assert(largeRows.find(row => row.term === "شركة تنظيف بالرياض")?.pageCount === largePages.length, "large scans should count keyword distribution across every page")

console.log(`Rank Math site keyword strength tests passed; 467-page / 75-keyword pass: ${elapsedMs} ms.`)
