import policy from "../../seo-page-policy.json"
import { isRankMathKeywordPresentInPath } from "./path-matching"
export { isRankMathKeywordPresentInPath } from "./path-matching"
export { getRankMathFixTarget, repairShortRankMathDescription } from "./fix-targets"
export type { RankMathFixEntity, RankMathFixField, RankMathFixTarget } from "./fix-targets"
export {
  applySeoPageOverrideToHtml,
  normalizeSeoOverridePath,
  isSeoPageHtmlIndexable,
  sanitizeSeoOverrideText,
  SEO_PAGE_OVERRIDE_SETTING_PREFIX,
} from "./page-overrides"
export type { SeoPageOverride } from "./page-overrides"
export { buildPackageVisibleContent, buildServiceVisibleContent } from "./service-content.mjs"
export type {
  PackageVisibleContent,
  PackageVisibleContentInput,
  ServiceVisibleContent,
  ServiceVisibleContentInput,
} from "./service-content.mjs"

export type RankMathEntityType =
  | "homepage"
  | "service"
  | "package"
  | "article"
  | "landing"
  | "area"
  | "static"

export type RankMathStatus = "pass" | "warning" | "fail" | "unknown"

export interface RankMathInput {
  type: RankMathEntityType
  title: string
  seoTitle?: string
  description: string
  focusKeyword?: string
  targetKeyword?: string
  keywords?: string | string[]
  slug?: string
  canonical?: string
  expectedCanonical?: string
  content?: string
  h1?: string[]
  internalLinks?: number
  images?: Array<{ alt?: string }>
  jsonLdValid?: boolean
}

export interface RankMathArticleFields {
  title?: string | null
  slug?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  seoKeywords?: string | string[] | null
  seoSlug?: string | null
  canonicalUrl?: string | null
  content?: string | null
}

export interface RankMathSeoPageFields {
  title?: string | null
  slug?: string | null
  seoSlug?: string | null
  targetKeyword?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  seoKeywords?: string | string[] | null
  canonicalUrl?: string | null
  content?: string | null
}

export interface RankMathCheck {
  id: string
  label: string
  status: RankMathStatus
  weight: number
  earned: number
  possible: number
  detail: string
  recommendation?: string
  blocking?: boolean
}

export interface RankMathAnalysis {
  engine: string
  version: number
  type: RankMathEntityType
  score: number
  minimumPublishScore: number
  publishable: boolean
  wordCount: number
  focusKeyword: string
  blockingIssues: string[]
  checks: RankMathCheck[]
}

const rankMathPolicy = policy.rankMath as {
  engine: string
  version: number
  minimumPublishScore: number
  title: { minimum: number; targetMinimum: number; maximum: number; hardMaximum: number }
  description: { minimum: number; maximum: number; hardMaximum: number }
  minimumWords: Record<RankMathEntityType, number>
  checks: Record<string, number>
}

export const RANK_MATH_EDITOR_POLICY = Object.freeze({
  minimumPublishScore: rankMathPolicy.minimumPublishScore,
  title: Object.freeze({ ...rankMathPolicy.title }),
  description: Object.freeze({ ...rankMathPolicy.description }),
  minimumWords: Object.freeze({ ...rankMathPolicy.minimumWords }),
})

export function buildRankMathAiGuidance(type: RankMathEntityType): string {
  const minimumWords = rankMathPolicy.minimumWords[type]
  return [
    "قواعد بوابة Rank Math الداخلية لهذا المشروع؛ اكتب بما يجتاز المحلل الفعلي، ولا تدّعِ أنها نتيجة إضافة WordPress الرسمية:",
    `- مرجع القرار الوحيد هو نتيجة المحلل البرمجي. اجتياز النشر يتطلب اجتياز كل فحص حاجب وبلوغ الدرجة ${rankMathPolicy.minimumPublishScore}/100؛ الدرجة وحدها لا تكفي. التنبيه يحتسب نصف نقاطه، والفحص غير المتاح لا يدخل مقام الدرجة.`,
    `- عنوان SEO موجود؛ استهدف ${rankMathPolicy.title.targetMinimum}–${rankMathPolicy.title.maximum} حرفاً، ولا تتجاوز الحد الصارم ${rankMathPolicy.title.hardMaximum} حرفاً.`,
    "- حدّد عبارة تركيز واحدة مطابقة لنية الصفحة، واجعلها أول عبارة في قائمة الكلمات المفتاحية وأدرجها حرفياً في عنوان SEO؛ لا تغيّر نية الصفحة لتلائم عبارة أقوى.",
    `- وصف SEO يُقاس بالحروف لا الكلمات: استهدف ${rankMathPolicy.description.minimum}–${rankMathPolicy.description.maximum} حرفاً، ولا تتجاوز الحد الصارم ${rankMathPolicy.description.hardMaximum} حرفاً.`,
    "- أدرج عبارة التركيز طبيعياً في الوصف وH1 والمقدمة. وجودها في الوصف وH1 وأول 100 كلمة تنبيهات تحسين وليست شروطاً حاجبة؛ لا تحشوها.",
    "- يجب وجود H1 واحد فقط. وجود عبارة التركيز في الرابط تحسين إرشادي؛ لا تغيّر رابطاً مستقراً لمجرد الفحص.",
    `- عمق المحتوى شرط حاجب: الحد الأدنى ${minimumWords} كلمة بحسب المحلل بعد حذف HTML وتقسيم النص المرئي على المسافات. عند التوسعة استهدف ${minimumWords + 80} كلمة على الأقل، مع معلومات مفيدة لا تكرار.`,
    "- Canonical شرط حاجب: يجب أن يكون HTTPS ذاتياً مطابقاً تماماً للمسار المتوقع. لا تخمّنه ولا تعدّله بالذكاء الاصطناعي؛ يحدده الخادم.",
    "- الصور: أضف وصفاً بديلاً دقيقاً لكل صورة موجودة. الروابط الداخلية: أضف رابطاً واحداً على الأقل إلى صفحة حقيقية ذات صلة إذا كان ذلك يفيد القارئ.",
    "- عنوان الصفحة وعبارة التركيز والوصف والمسار غير الفارغ وH1 الواحد وعمق المحتوى وCanonical هي الشروط الحاجبة. بقية الفحوص إرشادية ما لم يذكر المحلل خلاف ذلك.",
    "- استخدم من قائمة الكلمات المعطاة العبارات المساندة ذات الصلة المباشرة فقط؛ رتبتها القائمة وفق الوجود في محتوى الموقع، لا وفق حجم بحث Google أو ترتيبه.",
    "- Schema: لا تختلق بيانات منظمة أو حقائق تجارية؛ استخدم نوعاً ملائماً فقط إذا توفرت بيانات الصفحة الحقيقية، واترك التحقق التقني للمحلل.",
    "- لا تختلق خدمات أو أسعاراً أو ضمانات أو نتائج فحوص. لا تحاول تحسين الدرجة بحشو الكلمات أو بمعلومة غير موثقة.",
    `- لا يُسمح بالنشر إلا إذا اجتازت الفحوص الحاجبة وبلغت الدرجة الداخلية ${rankMathPolicy.minimumPublishScore}/100.`,
  ].join("\n")
}

function plainText(value = ""): string {
  return String(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<!--[\s\S]*?-->/gu, " ")
    .replace(/<[^>]*>/gu, " ")
    .replace(/&(#(?:x[\da-f]+|\d+)|amp|lt|gt|quot|apos|nbsp|copy|reg|ndash|mdash|hellip|lsquo|rsquo|ldquo|rdquo);/giu, (entity, body: string) => {
      if (body[0] === "#") {
        const hex = body[1]?.toLowerCase() === "x"
        const codePoint = Number.parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10)
        return Number.isInteger(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
          && !(codePoint >= 0xd800 && codePoint <= 0xdfff)
          ? String.fromCodePoint(codePoint)
          : entity
      }
      const entities: Record<string, string> = {
        amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
        copy: "©", reg: "®", ndash: "–", mdash: "—", hellip: "…",
        lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
      }
      return entities[body.toLowerCase()] ?? entity
    })
    .replace(/\s+/gu, " ")
    .trim()
}

function normalize(value: string): string {
  return plainText(value)
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u0640]/gu, "")
    .replace(/[أإآٱ]/gu, "ا")
    .replace(/ى/gu, "ي")
    .replace(/ؤ/gu, "و")
    .replace(/ئ/gu, "ي")
    .toLocaleLowerCase("ar")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
}

export function normalizeRankMathKeywordPhrase(value: string): string {
  return normalize(String(value ?? ""))
}

const BLOG_TOPIC_STOP_WORDS = new Set([
  "في",
  "من",
  "على",
  "الى",
  "عن",
  "مع",
  "شركة",
  "خدمة",
  "خدمات",
  "الرياض",
])

/**
 * Select a measured keyword that is actually related to the requested blog
 * topic. A supplied phrase must match the measured list; otherwise at least
 * two non-generic topic words must overlap one candidate.
 */
export function selectMeasuredFocusKeyword(
  topic: string,
  candidates: readonly string[],
  requestedFocus = "",
): string | null {
  const distinctCandidates = candidates
    .map(term => String(term ?? "").trim())
    .filter(Boolean)
    .filter((term, index, terms) =>
      terms.findIndex(candidate =>
        normalizeRankMathKeywordPhrase(candidate) === normalizeRankMathKeywordPhrase(term),
      ) === index,
    )
  const normalizedRequested = normalizeRankMathKeywordPhrase(requestedFocus)
  if (normalizedRequested) {
    return distinctCandidates.find(term =>
      normalizeRankMathKeywordPhrase(term) === normalizedRequested,
    ) ?? null
  }

  const topicTokens = new Set(
    normalizeRankMathKeywordPhrase(topic)
      .split(/\s+/u)
      .filter(token => token.length > 1 && !BLOG_TOPIC_STOP_WORDS.has(token)),
  )
  if (!topicTokens.size) return null

  let bestCandidate: string | null = null
  let bestOverlap = 0
  for (const candidate of distinctCandidates) {
    const candidateTokens = new Set(
      normalizeRankMathKeywordPhrase(candidate)
        .split(/\s+/u)
        .filter(token => token.length > 1 && !BLOG_TOPIC_STOP_WORDS.has(token)),
    )
    const overlap = [...candidateTokens].filter(token => topicTokens.has(token)).length
    if (overlap > bestOverlap) {
      bestCandidate = candidate
      bestOverlap = overlap
    }
  }
  return bestOverlap >= 2 ? bestCandidate : null
}

export function putRankMathFocusKeywordFirst(
  terms: readonly string[],
  focusKeyword: string,
): string[] {
  const focus = String(focusKeyword ?? "").trim()
  const supportingTerms = terms
    .map(term => String(term ?? "").trim())
    .filter(Boolean)

  if (!focus) return supportingTerms

  const normalizedFocus = normalizeRankMathKeywordPhrase(focus)
  return [
    focus,
    ...supportingTerms.filter(
      term => normalizeRankMathKeywordPhrase(term) !== normalizedFocus,
    ),
  ]
}

function fitRankMathSeoTitleSuffix(value: string, maximum: number): string {
  const suffix = value.replace(/\s+/gu, " ").trim()
  if (!suffix || maximum <= 0) return ""
  if ([...suffix].length <= maximum) return suffix

  const keptWords: string[] = []
  for (const word of suffix.split(/\s+/u)) {
    const candidate = [...keptWords, word].join(" ")
    if ([...candidate].length > maximum) break
    keptWords.push(word)
  }
  if (keptWords.length) return keptWords.join(" ")
  return [...suffix].slice(0, maximum).join("")
}

/**
 * Keep generated SEO titles within the project limit and put the exact focus
 * phrase first when an AI response misses either check.
 */
export function repairRankMathSeoTitleCandidate(
  value: string,
  focusKeyword: string,
  minimum = RANK_MATH_EDITOR_POLICY.title.minimum,
  maximum = RANK_MATH_EDITOR_POLICY.title.maximum,
): string {
  const title = plainText(String(value ?? ""))
  const focus = plainText(String(focusKeyword ?? ""))
  const titleLength = [...title].length
  const normalizedFocus = normalizeRankMathKeywordPhrase(focus)
  const normalizedTitle = normalizeRankMathKeywordPhrase(title)
  const hasFocus = !normalizedFocus
    || ` ${normalizedTitle} `.includes(` ${normalizedFocus} `)
  if (title && titleLength >= minimum && titleLength <= maximum && hasFocus) return title

  if (!focus) return fitRankMathSeoTitleSuffix(title, maximum)

  const focusPosition = title.indexOf(focus)
  const remainder = (focusPosition >= 0
    ? title.slice(0, focusPosition) + title.slice(focusPosition + focus.length)
    : title)
    .replace(/^[\s:|—–-]+|[\s:|—–-]+$/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
  const separator = remainder ? ": " : ""
  const available = maximum - [...`${focus}${separator}`].length
  const suffix = fitRankMathSeoTitleSuffix(remainder, available)
  return `${focus}${suffix ? `${separator}${suffix}` : ""}`.trim() || title
}

const projectKeywordPolicy = policy as {
  unsupportedTopicPatterns: string[]
  supportedServiceTopicPatterns: string[]
}

export function isRankMathProjectSearchPhrase(value: string): boolean {
  const phrase = normalizeRankMathKeywordPhrase(value)
  if (!phrase || phrase.split(/\s+/u).length < 2) return false
  if (projectKeywordPolicy.unsupportedTopicPatterns.some(pattern => new RegExp(pattern, "iu").test(value))) {
    return false
  }
  return projectKeywordPolicy.supportedServiceTopicPatterns
    .some(pattern => new RegExp(pattern, "iu").test(value))
}

export interface RankMathSiteKeywordPage {
  url: string
  kind?: string
  title?: string
  description?: string
  focusKeyword?: string
  h1?: string[]
  contentText?: string
}

export interface RankMathSiteKeywordStrength {
  term: string
  strength: number
  occurrences: number
  usagePercent: number
  pageCount: number
  articleCount: number
  focusPageCount: number
  samplePages: Array<{ url: string; title: string; occurrences: number }>
}

export function countRankMathPhraseOccurrences(text: string, phrase: string): number {
  const normalizedText = normalize(text)
  const normalizedPhrase = normalize(phrase)
  if (!normalizedText || !normalizedPhrase) return 0

  let count = 0
  let cursor = 0
  while ((cursor = normalizedText.indexOf(normalizedPhrase, cursor)) !== -1) {
    count += 1
    cursor += normalizedPhrase.length
  }
  return count
}

function isArticleKeywordPage(page: RankMathSiteKeywordPage): boolean {
  if (page.kind === "مقال" || page.kind === "article") return true
  try {
    const path = page.url.startsWith("/") ? page.url : new URL(page.url).pathname
    const segments = path.split("/").filter(Boolean)
    return segments[0] === "blog" && segments.length > 1
  } catch {
    return false
  }
}

export function analyzeRankMathSiteKeywordStrength(
  terms: string[],
  pages: RankMathSiteKeywordPage[],
): RankMathSiteKeywordStrength[] {
  const uniqueTerms = new Map<string, string>()
  for (const rawTerm of terms) {
    const term = String(rawTerm ?? "").replace(/\s+/gu, " ").trim()
    const key = normalizeRankMathKeywordPhrase(term)
    if (key && !uniqueTerms.has(key)) uniqueTerms.set(key, term)
  }

  const searchableTextForPage = (page: RankMathSiteKeywordPage) => [
    page.title ?? "",
    page.description ?? "",
    ...(page.h1 ?? []),
    page.contentText ?? "",
  ].join(" ")
  const patterns = [...uniqueTerms.entries()].map(([normalizedTerm, term]) => ({
    normalizedTerm,
    term,
  }))
  const preparedPages = pages.map(page => {
    const text = normalize(searchableTextForPage(page))
    let wordCount = text ? 1 : 0
    for (let index = 0; index < text.length; index += 1) {
      if (text.charCodeAt(index) === 32) wordCount += 1
    }
    return {
      page,
      text,
      wordCount,
      normalizedFocus: normalizeRankMathKeywordPhrase(page.focusKeyword ?? ""),
      isArticle: isArticleKeywordPage(page),
    }
  })
  const analyzedWordCount = preparedPages.reduce((total, page) => total + page.wordCount, 0)
  const stats = patterns.map(() => ({
    occurrences: 0,
    pageCount: 0,
    articleCount: 0,
    focusPageCount: 0,
    samplePages: [] as RankMathSiteKeywordStrength["samplePages"],
  }))

  type KeywordNode = {
    transitions: Map<string, number>
    failure: number
    outputs: number[]
  }
  const nodes: KeywordNode[] = [{ transitions: new Map(), failure: 0, outputs: [] }]
  for (let patternIndex = 0; patternIndex < patterns.length; patternIndex += 1) {
    let nodeIndex = 0
    for (const character of patterns[patternIndex].normalizedTerm) {
      let next = nodes[nodeIndex].transitions.get(character)
      if (next === undefined) {
        next = nodes.length
        nodes[nodeIndex].transitions.set(character, next)
        nodes.push({ transitions: new Map(), failure: 0, outputs: [] })
      }
      nodeIndex = next
    }
    nodes[nodeIndex].outputs.push(patternIndex)
  }

  const queue: number[] = []
  for (const childIndex of nodes[0].transitions.values()) queue.push(childIndex)
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const nodeIndex = queue[cursor]
    for (const [character, childIndex] of nodes[nodeIndex].transitions) {
      let fallbackIndex = nodes[nodeIndex].failure
      let fallback = nodes[fallbackIndex].transitions.get(character)
      while (fallback === undefined && fallbackIndex !== 0) {
        fallbackIndex = nodes[fallbackIndex].failure
        fallback = nodes[fallbackIndex].transitions.get(character)
      }
      nodes[childIndex].failure = fallback ?? 0
      nodes[childIndex].outputs.push(...nodes[nodes[childIndex].failure].outputs)
      queue.push(childIndex)
    }
  }

  for (const prepared of preparedPages) {
    if (!prepared.text || patterns.length === 0) continue
    const counts = new Uint32Array(patterns.length)
    const nextAllowedStart = new Uint32Array(patterns.length)
    let nodeIndex = 0

    for (let offset = 0; offset < prepared.text.length;) {
      const codePoint = prepared.text.codePointAt(offset)
      if (codePoint === undefined) break
      const character = String.fromCodePoint(codePoint)
      offset += character.length

      let next = nodes[nodeIndex].transitions.get(character)
      while (next === undefined && nodeIndex !== 0) {
        nodeIndex = nodes[nodeIndex].failure
        next = nodes[nodeIndex].transitions.get(character)
      }
      nodeIndex = next ?? 0

      for (const patternIndex of nodes[nodeIndex].outputs) {
        const start = offset - patterns[patternIndex].normalizedTerm.length
        if (start < nextAllowedStart[patternIndex]) continue
        counts[patternIndex] += 1
        nextAllowedStart[patternIndex] = offset
      }
    }

    for (let patternIndex = 0; patternIndex < counts.length; patternIndex += 1) {
      const pageOccurrences = counts[patternIndex]
      if (!pageOccurrences) continue
      const pageStats = stats[patternIndex]
      pageStats.occurrences += pageOccurrences
      pageStats.pageCount += 1
      if (prepared.isArticle) pageStats.articleCount += 1
      if (prepared.normalizedFocus === patterns[patternIndex].normalizedTerm) {
        pageStats.focusPageCount += 1
      }
      pageStats.samplePages.push({
        url: prepared.page.url,
        title: prepared.page.title || prepared.page.url,
        occurrences: pageOccurrences,
      })
    }
  }

  return patterns.map(({ term }, index) => {
    const item = stats[index]
    // An internal evidence score, not a Google ranking. It rewards repeated
    // mentions, distribution across URLs/articles, and explicit focus targeting.
    const mentionPoints = Math.min(40, Math.round(Math.log2(item.occurrences + 1) * 8))
    const distributionPoints = Math.min(30, item.pageCount * 5)
    const articlePoints = Math.min(20, item.articleCount * 4)
    const targetingPoints = Math.min(10, item.focusPageCount * 5)
    const strength = Math.min(100, mentionPoints + distributionPoints + articlePoints + targetingPoints)

    return {
      term,
      strength,
      occurrences: item.occurrences,
      usagePercent: analyzedWordCount
        ? Math.round((item.occurrences / analyzedWordCount) * 10_000) / 100
        : 0,
      pageCount: item.pageCount,
      articleCount: item.articleCount,
      focusPageCount: item.focusPageCount,
      samplePages: item.samplePages
        .sort((a, b) => b.occurrences - a.occurrences || a.url.localeCompare(b.url))
        .slice(0, 3),
    }
  }).sort((a, b) =>
    b.strength - a.strength
    || b.occurrences - a.occurrences
    || b.articleCount - a.articleCount
    || a.term.localeCompare(b.term, "ar")
  )
}

export function getRankMathFocusKeyword(input: Pick<RankMathInput, "focusKeyword" | "targetKeyword" | "keywords">): string {
  const explicit = String(input.focusKeyword ?? "").trim()
  if (explicit) return explicit
  const target = String(input.targetKeyword ?? "").trim()
  if (target) return target
  const terms = Array.isArray(input.keywords)
    ? input.keywords
    : String(input.keywords ?? "").split(/[,،;\n\r|]+/u)
  return String(terms[0] ?? "").trim()
}

/**
 * Builds the exact Rank Math input used for a blog post in the editor.
 * Audits should use this adapter for saved posts instead of reconstructing
 * metadata from the rendered page title and site chrome.
 */
export function buildBlogPostRankMathInput(post: RankMathArticleFields): RankMathInput {
  const title = String(post.title ?? "")
  const slug = String(post.seoSlug || post.slug || "")
  const expectedCanonical = `/blog/${encodeURIComponent(slug)}`

  return {
    type: "article",
    title,
    seoTitle: String(post.seoTitle || title),
    description: String(post.seoDescription ?? ""),
    focusKeyword: getRankMathFocusKeyword({ keywords: post.seoKeywords ?? "" }),
    slug,
    canonical: normalizeRankMathCanonical(post.canonicalUrl, expectedCanonical),
    expectedCanonical,
    content: String(post.content ?? ""),
    h1: title ? [title] : [],
  }
}

export function buildSeoPageRankMathInput(page: RankMathSeoPageFields): RankMathInput {
  const title = String(page.title ?? "")
  const slug = String(page.seoSlug || page.slug || "")
  const expectedCanonical = `/page/${encodeURIComponent(slug)}`

  return {
    type: "landing",
    title,
    seoTitle: String(page.seoTitle || title),
    description: String(page.seoDescription ?? ""),
    focusKeyword: String(page.targetKeyword ?? "").trim()
      || getRankMathFocusKeyword({ keywords: page.seoKeywords ?? "" }),
    slug,
    canonical: normalizeRankMathCanonical(page.canonicalUrl, expectedCanonical),
    expectedCanonical,
    content: String(page.content ?? ""),
    h1: title ? [title] : [],
  }
}

export function evaluateSeoPageIndexability(input: {
  title?: string
  targetKeyword?: string
  seoTitle?: string
  content?: string
  slug?: string
  canonical?: string
  expectedCanonical?: string
}): { indexable: boolean; reason: string; contentChars: number } {
  const pagePolicy = policy as {
    minimumVisibleContentCharacters: number
    unsupportedTopicPatterns: string[]
    supportedServiceTopicPatterns: string[]
  }
  const intent = [input.title, input.targetKeyword, input.seoTitle].filter(Boolean).join(" ")
  const content = plainText(input.content ?? "")
  const contentChars = [...content].length
  if (pagePolicy.unsupportedTopicPatterns.some(pattern => new RegExp(pattern, "iu").test(intent))) {
    return { indexable: false, reason: "unsupported-topic", contentChars }
  }
  if (!pagePolicy.supportedServiceTopicPatterns.some(pattern => new RegExp(pattern, "iu").test(intent))) {
    return { indexable: false, reason: "no-supported-service-intent", contentChars }
  }
  if (contentChars < pagePolicy.minimumVisibleContentCharacters) {
    return { indexable: false, reason: "thin-content", contentChars }
  }
  if (input.canonical) {
    const expectedCanonical = String(input.expectedCanonical ?? "").trim()
      || `/page/${encodeURIComponent(input.slug ?? "")}`
    if (!isValidRankMathCanonical(input.canonical, expectedCanonical)) {
      return { indexable: false, reason: "non-self-canonical", contentChars }
    }
  }
  return { indexable: true, reason: "supported-service-intent", contentChars }
}

function includesPhrase(value: string, phrase: string): boolean {
  const haystack = normalize(value)
  const needle = normalize(phrase)
  if (!haystack || !needle) return false
  return ` ${haystack} `.includes(` ${needle} `)
}

function makeCheck(
  id: string,
  label: string,
  status: RankMathStatus,
  weight: number,
  detail: string,
  recommendation?: string,
  blocking = false,
): RankMathCheck {
  const ratio = status === "pass" ? 1 : status === "warning" ? 0.5 : 0
  return {
    id,
    label,
    status,
    weight,
    possible: status === "unknown" ? 0 : weight,
    earned: status === "unknown" ? 0 : Math.round(weight * ratio * 100) / 100,
    detail,
    ...(recommendation ? { recommendation } : {}),
    ...(blocking ? { blocking: true } : {}),
  }
}

export function analyzeRankMathSeo(input: RankMathInput): RankMathAnalysis {
  const focusKeyword = getRankMathFocusKeyword(input)
  const title = plainText(input.seoTitle ?? "") || plainText(input.title)
  const description = plainText(input.description)
  const content = plainText(input.content ?? "")
  const headings = input.h1
  const titleLength = [...title].length
  const descriptionLength = [...description].length
  const words = content ? content.split(/\s+/u).filter(Boolean) : []
  const minimumWords = rankMathPolicy.minimumWords[input.type]
  const keywordConfigured = Boolean(focusKeyword)
  const checks: RankMathCheck[] = [
    makeCheck("title", "عنوان الصفحة", title ? "pass" : "fail", rankMathPolicy.checks.title,
      title ? `عنوان مخصص موجود (${titleLength} حرفاً).` : "عنوان SEO غير موجود.",
      "أضف عنواناً واضحاً وفريداً يصف هذه الصفحة.", true),
    makeCheck("title-length", "طول العنوان", !title ? "unknown"
      : titleLength >= rankMathPolicy.title.minimum && titleLength <= rankMathPolicy.title.maximum ? "pass"
        : titleLength > rankMathPolicy.title.hardMaximum ? "fail" : "warning",
    rankMathPolicy.checks.titleLength,
    `${titleLength} حرفاً؛ النطاق الإرشادي ${rankMathPolicy.title.minimum}–${rankMathPolicy.title.maximum}.`,
    "اكتب عنواناً طبيعياً ومميزاً؛ Google قد يعيد صياغته أو يختصره.",
    titleLength > rankMathPolicy.title.hardMaximum),
    makeCheck("focus-keyword", "عبارة التركيز", keywordConfigured ? "pass" : "fail", rankMathPolicy.checks.keyword,
      keywordConfigured ? `عبارة التركيز: «${focusKeyword}».` : "لم تُحدد عبارة تركيز أساسية واحدة.",
      "حدد عبارة بحث واحدة تصف نية الصفحة، واستخدم المرادفات داخل المحتوى.", true),
    makeCheck("keyword-title", "عبارة التركيز في العنوان", !keywordConfigured ? "unknown"
      : includesPhrase(title, focusKeyword) ? "pass" : "fail",
    rankMathPolicy.checks.keywordTitle,
    !keywordConfigured ? "يتعذر التحقق من دون عبارة تركيز."
      : includesPhrase(title, focusKeyword) ? "عبارة التركيز موجودة في العنوان."
        : "عبارة التركيز غير موجودة في العنوان.",
    "أدرج العبارة بشكل طبيعي، ويفضل قرب بداية العنوان.", true),
    makeCheck("description", "الوصف التعريفي", description ? "pass" : "fail", rankMathPolicy.checks.description,
      description ? `الوصف موجود (${descriptionLength} حرفاً).` : "لا يوجد وصف تعريفي.",
      "اكتب وصفاً فريداً يشرح المحتوى والفائدة الفعلية.", true),
    makeCheck("description-length", "طول الوصف التعريفي", !description ? "unknown"
      : descriptionLength >= rankMathPolicy.description.minimum && descriptionLength <= rankMathPolicy.description.maximum ? "pass"
        : descriptionLength > rankMathPolicy.description.hardMaximum ? "fail" : "warning",
    rankMathPolicy.checks.descriptionLength,
    `${descriptionLength} حرفاً؛ النطاق الإرشادي ${rankMathPolicy.description.minimum}–${rankMathPolicy.description.maximum}.`,
    "اكتب وصفاً موجزاً ومقنعاً؛ Google قد يختار مقتطفاً مختلفاً.",
    descriptionLength > rankMathPolicy.description.hardMaximum),
    makeCheck("keyword-description", "عبارة التركيز في الوصف", !keywordConfigured || !description ? "unknown"
      : includesPhrase(description, focusKeyword) ? "pass" : "warning",
    rankMathPolicy.checks.keywordDescription,
    !keywordConfigured || !description ? "يتعذر التحقق من دون عبارة تركيز ووصف."
      : includesPhrase(description, focusKeyword) ? "العبارة موجودة في الوصف."
        : "لم تظهر العبارة حرفياً؛ يمكن استخدام صياغة قريبة إذا كانت أوضح للقارئ.",
    "استخدم العبارة عند ملاءمتها فقط؛ لا تحشو الوصف."),
    makeCheck("h1", "عنوان H1 واحد", !headings ? "fail"
      : headings.length === 1 ? "pass" : headings.length === 0 ? "fail" : "warning",
    rankMathPolicy.checks.h1,
    !headings ? "لم يمرر عدد عناوين H1 للتحليل." : `عدد H1: ${headings.length}.`,
    "اجعل لكل صفحة عنواناً رئيسياً واضحاً واحداً.", !headings || headings.length !== 1),
    makeCheck("keyword-h1", "عبارة التركيز في H1", !keywordConfigured || !headings ? "unknown"
      : headings.some(heading => includesPhrase(heading, focusKeyword)) ? "pass" : "warning",
    rankMathPolicy.checks.keywordH1,
    !keywordConfigured || !headings ? "يتعذر التحقق من دون عبارة التركيز والعنوان الرئيسي."
      : headings.some(heading => includesPhrase(heading, focusKeyword)) ? "العبارة موجودة في H1."
        : "العبارة غير موجودة في H1؛ راجع إن كان العنوان يطابق نية الصفحة.",
    "استخدم العبارة أو تعبيراً قريباً إذا كان ذلك طبيعياً."),
    makeCheck("keyword-introduction", "موضوع الصفحة في المقدمة", !keywordConfigured || !content ? "unknown"
      : includesPhrase(words.slice(0, 100).join(" "), focusKeyword) ? "pass" : "warning",
    rankMathPolicy.checks.keywordIntroduction,
    !keywordConfigured || !content ? "لا يتوفر نص كافٍ لفحص المقدمة."
      : includesPhrase(words.slice(0, 100).join(" "), focusKeyword) ? "تظهر عبارة التركيز ضمن أول 100 كلمة."
        : "لا تظهر العبارة ضمن أول 100 كلمة.",
    "عرّف الموضوع مبكراً دون تكرار مصطنع."),
    makeCheck("content-depth", "عمق المحتوى", input.content === undefined ? "fail"
      : words.length >= minimumWords ? "pass" : words.length === 0 ? "fail" : "warning",
    rankMathPolicy.checks.contentDepth,
    input.content === undefined ? "لم يمرر نص المحتوى للتحليل."
      : `${words.length} كلمة تقريباً؛ الحد الداخلي الإرشادي لهذا النوع ${minimumWords}.`,
    "أضف معلومات وخبرة وإجابات يحتاجها الزائر؛ لا تطل النص لمجرد زيادة العدد.",
    input.content === undefined || words.length < minimumWords),
    makeCheck("slug", "مسار الصفحة", input.slug ? "pass" : "fail", rankMathPolicy.checks.slug,
      input.slug ? `مسار الصفحة محدد: ${input.slug}` : "مسار الصفحة غير محدد.",
      "استخدم رابطاً ثابتاً قصيراً وواضحاً.", true),
    makeCheck("keyword-url", "عبارة التركيز في الرابط", !keywordConfigured || !input.slug
      || (input.type === "homepage" && input.slug.trim() === "/") ? "unknown"
      : isRankMathKeywordPresentInPath(input.slug, focusKeyword, input.type) ? "pass" : "warning",
    rankMathPolicy.checks.keywordUrl,
    !keywordConfigured || !input.slug ? "يتعذر التحقق من دون عبارة تركيز ومسار."
      : input.type === "homepage" && input.slug.trim() === "/" ? "الرابط الجذري هو الرابط الأساسي للصفحة الرئيسية؛ لا يلزم تضمين عبارة التركيز فيه."
      : isRankMathKeywordPresentInPath(input.slug, focusKeyword, input.type) ? "العبارة ظاهرة في المسار."
        : "لم تظهر العبارة في المسار؛ لا تغيّر رابطاً مستقراً لمجرد هذا الفحص.",
    "هذا تنبيه اختياري، واحفظ الروابط القديمة بتحويل 301 عند تغييرها."),
    makeCheck("canonical", "الرابط الأساسي Canonical", !input.canonical ? "fail"
    : isValidRankMathCanonical(input.canonical, input.expectedCanonical) ? "pass" : "fail",
    rankMathPolicy.checks.canonical,
    !input.canonical ? "Canonical لم يُمرر للتحقق."
      : isValidRankMathCanonical(input.canonical, input.expectedCanonical) ? `Canonical صالح وآمن: ${input.canonical}`
        : "Canonical غير صالح أو لا يستخدم HTTPS.",
    "اجعل canonical مطلقاً على HTTPS ويطابق عنوان الصفحة الأساسية.",
    !input.canonical || !isValidRankMathCanonical(input.canonical ?? "", input.expectedCanonical)),
    makeCheck("image-alt", "النص البديل للصور", !input.images ? "unknown"
      : input.images.length === 0 ? "unknown"
        : input.images.every(image => Boolean(image.alt?.trim())) ? "pass" : "warning",
    rankMathPolicy.checks.imageAlt,
    !input.images || input.images.length === 0 ? "لم تُمرر صور محتوى للفحص."
      : `${input.images.filter(image => image.alt?.trim()).length} من ${input.images.length} صورة لها نص بديل.`,
    "اكتب وصفاً للصورة نفسها، لا قائمة كلمات مفتاحية."),
    makeCheck("internal-links", "الروابط الداخلية", input.internalLinks === undefined ? "unknown"
      : input.internalLinks > 0 ? "pass" : "warning",
    rankMathPolicy.checks.internalLinks,
    input.internalLinks === undefined ? "عدد الروابط الداخلية غير متاح في بيانات المحرر."
      : `عدد الروابط الداخلية: ${input.internalLinks}.`,
    "اربط الصفحة بصفحات ذات صلة عندما يفيد ذلك الزائر."),
    makeCheck("schema", "البيانات المنظمة", typeof input.jsonLdValid !== "boolean" ? "unknown"
      : input.jsonLdValid ? "pass" : "warning",
    rankMathPolicy.checks.schema,
    typeof input.jsonLdValid !== "boolean" ? "لم يُمرر فحص JSON-LD."
      : input.jsonLdValid ? "عُثر على JSON-LD صالح نحوياً." : "لم يُعثر على JSON-LD صالح نحوياً.",
    "استخدم نوع Schema مناسباً للصفحة، ثم تحقق منه عبر أداة Google."),
  ]

  const evaluated = checks.filter(check => check.possible > 0)
  const possible = evaluated.reduce((sum, check) => sum + check.possible, 0)
  const earned = evaluated.reduce((sum, check) => sum + check.earned, 0)
  const score = possible ? Math.round(earned / possible * 100) : 0
  const blockingIssues = checks
    .filter(check => check.blocking && check.status !== "pass")
    .map(check => check.label)
  const publishable = blockingIssues.length === 0 && score >= rankMathPolicy.minimumPublishScore

  if (!publishable && score < rankMathPolicy.minimumPublishScore) {
    blockingIssues.push(`النتيجة أقل من حد النشر الداخلي (${rankMathPolicy.minimumPublishScore}/100).`)
  }

  return {
    engine: rankMathPolicy.engine,
    version: rankMathPolicy.version,
    type: input.type,
    score,
    minimumPublishScore: rankMathPolicy.minimumPublishScore,
    publishable,
    wordCount: words.length,
    focusKeyword,
    blockingIssues,
    checks,
  }
}

export function isValidRankMathCanonical(value: string, expected?: string): boolean {
  try {
    const canonical = String(value ?? "").trim()
    if (!canonical) return false
    const expectedIsRelative = Boolean(expected?.startsWith("/"))
    const expectedUrl = expected
      ? new URL(expected, expectedIsRelative ? "http://origin.invalid" : undefined)
      : undefined
    if (expectedUrl && (
      !["http:", "https:"].includes(expectedUrl.protocol)
      || !expectedUrl.hostname
      || expectedUrl.username
      || expectedUrl.password
      || expectedUrl.search
      || expectedUrl.hash
    )) return false
    const url = expectedUrl
      ? new URL(canonical, expectedIsRelative ? "http://origin.invalid" : expectedUrl.origin)
      : new URL(canonical)
    if (
      !["http:", "https:"].includes(url.protocol)
      || !url.hostname
      || url.username
      || url.password
      || url.search
      || url.hash
    ) return false
    if (!expectedUrl) return true
    const path = (candidate: URL) => decodeURIComponent(candidate.pathname).replace(/\/+$/u, "") || "/"
    return (expectedIsRelative || url.origin.toLowerCase() === expectedUrl.origin.toLowerCase())
      && path(url) === path(expectedUrl)
  } catch {
    return false
  }
}

export function normalizeRankMathCanonical(value: unknown, expectedCanonical: string): string {
  const canonical = String(value ?? "").trim()
  if (!canonical || isValidRankMathCanonical(canonical, expectedCanonical)) {
    return expectedCanonical
  }
  return canonical
}
