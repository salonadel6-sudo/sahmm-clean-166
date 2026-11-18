import {
  analyzeRankMathSeo,
  buildBlogPostRankMathInput,
  type RankMathArticleFields,
  type RankMathEntityType,
  type RankMathInput,
  type RankMathSiteKeywordStrength,
} from "@workspace/seo-rank-math"
import type { SeoHtmlInventoryResponse } from "@workspace/api-client-react"

export type SeoAuditStatus = "pass" | "warning" | "fail" | "unknown"
export const SEO_AUDIT_RANK_MATH_SCORE_VERSION = 3
const viteEnv = import.meta.env ?? {}
const API_BASE = viteEnv.BASE_URL?.replace(/\/$/, "") || ""
const CANONICAL_SITE_ORIGIN = typeof window !== "undefined"
  ? window.location.origin
  : viteEnv.VITE_PUBLIC_SITE_URL || ""

export interface SeoAuditCheck {
  id: string
  label: string
  status: SeoAuditStatus
  earned: number
  possible: number
  detail: string
  recommendation?: string
}

export interface SeoAuditPage {
  url: string
  statusCode: number | null
  kind: string
  title: string
  description: string
  focusKeyword: string
  canonical: string
  robots: string
  h1: string[]
  wordCount: number
  keywordOccurrences: number
  keywordDensity: number | null
  score: number | null
  htmlFallback: boolean
  sourceSignature?: string
  checks: SeoAuditCheck[]
  contentText: string
  rankMathSource?: "cms-record" | "published-html"
  rankMathWordCount?: number
  rankMathDataMismatch?: boolean
  rankMathSourceNote?: string
  duplicateOf?: string
}

export interface SeoAuditReport {
  startedAt: string
  completedAt: string
  sitemapUrl: string
  sitemapStatus: number
  totalUrls: number
  checkedUrls: number
  failedRequests: number
  averageScore: number | null
  renderFallbackDetected: boolean
  renderFallbackPageCount: number
  passCount: number
  warningCount: number
  failCount: number
  pages: SeoAuditPage[]
  rankMathScoreVersion?: number
  keywordStrength?: RankMathSiteKeywordStrength[]
  htmlInventoryAvailable?: boolean
  htmlInventoryCount?: number
  sitemapOmissionCount?: number
  inventoryError?: string
}

export interface SeoAuditProgress {
  completed: number
  total: number
  currentUrl?: string
}

export interface SeoAuditOptions {
  origin?: string
  concurrency?: number
  signal?: AbortSignal
  adminToken?: string
  onProgress?: (progress: SeoAuditProgress) => void
}

interface SeoPageInput {
  url: string
  expectedCanonical?: string
  statusCode: number | null
  title: string
  description: string
  focusKeyword: string
  canonical: string
  robots: string
  h1: string[]
  h2: string[]
  contentText: string
  internalLinks: number
  externalLinks: number
  imageCount: number
  imagesWithAlt: number
  jsonLdValid: boolean
  openGraphComplete: boolean
  rankMathInput?: RankMathInput
  rankMathSourceNote?: string
}

interface SitemapTarget {
  crawlUrl: string
  canonicalUrl: string
}

const MAX_SCORE = 100
const DIACRITICS = /[\u064B-\u065F\u0670]/gu

export function normalizeSeoText(value: string): string {
  return String(value || "")
    .normalize("NFKC")
    .replace(DIACRITICS, "")
    .replace(/[إأآٱ]/gu, "ا")
    .replace(/ى/gu, "ي")
    .replace(/[ـ]/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase("ar")
}

function includesPhrase(text: string, phrase: string): boolean {
  const normalizedText = normalizeSeoText(text)
  const normalizedPhrase = normalizeSeoText(phrase)
  return Boolean(normalizedPhrase && normalizedText.includes(normalizedPhrase))
}

function countPhrase(text: string, phrase: string): number {
  const normalizedText = normalizeSeoText(text)
  const normalizedPhrase = normalizeSeoText(phrase)
  if (!normalizedPhrase) return 0
  let count = 0
  let cursor = 0
  while ((cursor = normalizedText.indexOf(normalizedPhrase, cursor)) !== -1) {
    count += 1
    cursor += normalizedPhrase.length
  }
  return count
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/u).length : 0
}

function pageKind(pathname: string): string {
  if (pathname === "/") return "الرئيسية"
  if (pathname.startsWith("/services/")) return "خدمة"
  if (pathname.startsWith("/page/")) return "صفحة SEO"
  if (pathname === "/blog") return "مدونة"
  if (pathname.startsWith("/blog/")) return "مقال"
  if (pathname.startsWith("/areas/")) return "منطقة"
  if (pathname.startsWith("/cleaning-packages/")) return "باقة"
  if (pathname === "/services") return "دليل الخدمات"
  if (pathname === "/cleaning-packages") return "دليل الباقات"
  return "صفحة"
}

function check(
  id: string,
  label: string,
  status: SeoAuditStatus,
  possible: number,
  detail: string,
  recommendation?: string,
): SeoAuditCheck {
  const earned = status === "pass" ? possible : status === "warning" ? Math.round(possible / 2) : 0
  return { id, label, status, earned, possible, detail, ...(recommendation ? { recommendation } : {}) }
}

function scoreChecks(checks: SeoAuditCheck[]): number {
  // An unknown check was not evaluated. It must not reduce the denominator
  // as if the page failed it.
  const evaluated = checks.filter(item => item.id.startsWith("rankmath-") && item.status !== "unknown")
  const possible = evaluated.reduce((total, item) => total + item.possible, 0)
  if (!possible) return 0
  return Math.round((evaluated.reduce((total, item) => total + item.earned, 0) / possible) * MAX_SCORE)
}

export function evaluateSeoPage(input: SeoPageInput): SeoAuditPage {
  const url = new URL(input.url)
  const keyword = input.focusKeyword.trim()
  const titleLength = [...input.title].length
  const descriptionLength = [...input.description].length
  const words = wordCount(input.contentText)
  const keywordOccurrences = countPhrase(input.contentText, keyword)
  const density = words && keyword ? (keywordOccurrences / words) * 100 : null
  const firstTenth = input.contentText.slice(0, Math.max(1, Math.ceil(input.contentText.length * 0.1)))
  const kind = pageKind(url.pathname)
  const longFormPage = ["مقال", "صفحة SEO", "خدمة", "منطقة", "باقة"].includes(kind)
  const rankType: RankMathEntityType =
    kind === "الرئيسية" ? "homepage" :
    kind === "خدمة" ? "service" :
    kind === "صفحة SEO" ? "landing" :
    kind === "مقال" ? "article" :
    kind === "منطقة" ? "area" :
    kind === "باقة" ? "package" : "static"
  const rankMathInput = input.rankMathInput ?? {
    type: rankType,
    title: input.title,
    seoTitle: input.title,
    description: input.description,
    focusKeyword: keyword,
    slug: url.pathname,
    canonical: input.canonical,
    expectedCanonical: input.expectedCanonical || input.url,
    content: input.contentText,
    h1: input.h1,
    internalLinks: input.internalLinks,
    images: Array.from({ length: input.imageCount }, (_, index) => ({ alt: index < input.imagesWithAlt ? "present" : "" })),
    jsonLdValid: input.jsonLdValid,
  }
  const rankMath = analyzeRankMathSeo(rankMathInput)
  const rankMathDataMismatch = Boolean(input.rankMathInput && (
    normalizeSeoText(input.title) !== normalizeSeoText(String(rankMathInput.seoTitle || rankMathInput.title))
    || normalizeSeoText(input.description) !== normalizeSeoText(rankMathInput.description)
    || normalizeSeoText(keyword) !== normalizeSeoText(rankMath.focusKeyword)
    || normalizeSeoText(input.h1.join(" ")) !== normalizeSeoText((rankMathInput.h1 || []).join(" "))
    || words !== rankMath.wordCount
  ))
  const titleLengthStatus: SeoAuditStatus = input.title
    ? titleLength >= 30 && titleLength <= 60 ? "pass" : "warning"
    : "unknown"
  const descriptionLengthStatus: SeoAuditStatus = input.description
    ? descriptionLength >= 120 && descriptionLength <= 160 ? "pass" : "warning"
    : "unknown"
  const contentStatus: SeoAuditStatus = words === 0
    ? "fail"
    : longFormPage
      ? words >= 300 ? "pass" : "warning"
      : words >= 60 ? "pass" : "warning"
  const decodedPath = decodeURIComponentSafe(url.pathname)
  const keywordUrlStatus: SeoAuditStatus = !keyword
    ? "unknown"
    : includesPhrase(decodedPath, keyword)
      ? "pass"
      : /\p{Script=Arabic}/u.test(keyword) && !/\p{Script=Arabic}/u.test(decodedPath)
        ? "unknown"
        : "warning"
  const legacyChecks: SeoAuditCheck[] = [
    check("http", "استجابة الصفحة", input.statusCode === 200 ? "pass" : "fail", 8,
      input.statusCode === null ? "تعذر جلب الصفحة." : `استجابة HTTP ${input.statusCode}.`,
      "تحقق من أن الرابط يعيد 200 للصفحات المنشورة، أو 301 مقصوداً للرابط القديم."),
    check("title", "عنوان SEO موجود", input.title ? "pass" : "fail", 5,
      input.title ? `العنوان موجود (${titleLength} حرفاً).` : "لا يوجد عنوان صفحة في HTML.",
      "أضف عنواناً فريداً يشرح الصفحة."),
    check("title-length", "طول العنوان", titleLengthStatus, 4,
      `${titleLength} حرفاً؛ النطاق 30–60 إرشادي، وليس حدّاً مضموناً للظهور.`,
      "اختصر العنوان أو أضف وصفاً مميزاً، مع إبقاء صياغته طبيعية."),
    check("description", "الوصف التعريفي", input.description ? "pass" : "fail", 5,
      input.description ? `الوصف موجود (${descriptionLength} حرفاً).` : "الوصف التعريفي غير موجود.",
      "اكتب وصفاً فريداً يلخص الصفحة ويشرح قيمة الخدمة."),
    check("description-length", "طول الوصف", descriptionLengthStatus, 3,
      `${descriptionLength} حرفاً؛ النطاق 120–160 إرشادي، وقد يعيد Google صياغة المقتطف.`,
      "اضبط الوصف ليعرض الخدمة والفائدة بوضوح دون حشو."),
    check("canonical", "الرابط الأساسي Canonical", input.canonical ? "pass" : "fail", 7,
      input.canonical ? `Canonical: ${input.canonical}` : "لا يوجد canonical في HTML.",
      "أضف رابطاً أساسياً ذاتياً للصفحة، أو وجّه إلى الصفحة المقصودة عند الدمج."),
    check("canonical-match", "تطابق Canonical مع الصفحة", input.canonical && normalizeUrl(input.canonical) === normalizeUrl(input.expectedCanonical || input.url) ? "pass" : input.canonical ? "warning" : "unknown", 5,
      input.canonical ? (normalizeUrl(input.canonical) === normalizeUrl(input.expectedCanonical || input.url) ? "الرابط الأساسي يطابق رابط الصفحة في خريطة الموقع." : "الرابط الأساسي يشير إلى عنوان مختلف.") : "لا يمكن التحقق دون canonical.",
      "تأكد أن الاختلاف مقصود؛ لا تُدرج الصفحة في الخريطة إن كانت canonical لصفحة أخرى."),
    check("robots", "السماح بالفهرسة",
      /(?:^|[,\s])noindex(?:[,\s]|$)/iu.test(input.robots) ? "fail" : "pass", 7,
      input.robots ? `تعليمات robots: ${input.robots}` : "لا يوجد noindex؛ الفهرسة مسموحة افتراضياً.",
      "أزل noindex عن الصفحة التي تريد فهرستها، ولا تغيّر حالة الصفحة بسبب عطل مؤقت."),
    check("focus-keyword", "كلمة التركيز محددة", keyword ? "pass" : "unknown", 2,
      keyword ? `عبارة التركيز المضبوطة: «${keyword}». هذا فحص داخلي ولا يقيس ترتيب Google.` : "لم تُضبط عبارة تركيز صريحة لهذه الصفحة.",
      "حدد عبارة رئيسية واحدة لكل صفحة في بيانات SEO عند ملاءمتها."),
    check("keyword-title", "العبارة في العنوان", keyword ? (includesPhrase(input.title, keyword) ? "pass" : "warning") : "unknown", 6,
      keyword ? (includesPhrase(input.title, keyword) ? "تظهر عبارة التركيز في العنوان." : "لا تظهر عبارة التركيز في العنوان.") : "لا توجد عبارة تركيز للفحص.",
      "ضع عبارة الصفحة الأساسية قرب بداية العنوان إن كان ذلك طبيعياً."),
    check("keyword-description", "العبارة في الوصف", keyword ? (includesPhrase(input.description, keyword) ? "pass" : "warning") : "unknown", 4,
      keyword ? (includesPhrase(input.description, keyword) ? "تظهر عبارة التركيز في الوصف." : "لا تظهر العبارة حرفياً في الوصف؛ يمكن استخدام مرادف طبيعي.") : "لا توجد عبارة تركيز للفحص.",
      "أضف العبارة أو صياغة قريبة منها دون تكرار مصطنع."),
    check("keyword-url", "العبارة في مسار URL", keywordUrlStatus, 3,
      !keyword ? "لا توجد عبارة تركيز للفحص." : keywordUrlStatus === "pass" ? "المسار يتضمن العبارة." : keywordUrlStatus === "unknown" ? "المسار مكتوب بنظام حروف مختلف عن عبارة التركيز، لذلك لا يمكن مقارنته حرفياً." : "المسار لا يتضمن العبارة؛ هذا تنبيه اختياري وليس سبباً كافياً لتغيير رابط مستقر.",
      "لا تغيّر رابطاً مستقراً لمجرد إضافة كلمة مفتاحية؛ استخدم تحويلاً 301 عند تغيير URL."),
    check("h1-count", "وجود H1 واحد", input.h1.length === 1 ? "pass" : input.h1.length === 0 ? "fail" : "warning", 7,
      `عدد عناوين H1: ${input.h1.length}.`,
      "اجعل للصفحة عنوان H1 رئيسياً واحداً واضحاً."),
    check("keyword-h1", "العبارة في H1", keyword ? (input.h1.some(value => includesPhrase(value, keyword)) ? "pass" : "warning") : "unknown", 6,
      keyword ? (input.h1.some(value => includesPhrase(value, keyword)) ? "تظهر عبارة التركيز في H1." : "لا تظهر العبارة في H1.") : "لا توجد عبارة تركيز للفحص.",
      "استخدم العبارة في العنوان الرئيسي إذا كانت تصف محتوى الصفحة بدقة."),
    check("keyword-intro", "العبارة قرب بداية المحتوى", keyword ? (includesPhrase(firstTenth, keyword) ? "pass" : "warning") : "unknown", 5,
      keyword ? (includesPhrase(firstTenth, keyword) ? "تظهر العبارة في أول 10% تقريباً من النص." : "لم تظهر العبارة في بداية النص.") : "لا توجد عبارة تركيز للفحص.",
      "قدّم موضوع الصفحة مباشرة، دون تكرار العبارة عدة مرات."),
    check("content-depth", "محتوى كافٍ للغرض", contentStatus, 6,
      `${words} كلمة تقريباً بعد استبعاد عناصر الصفحة العامة. العدد مؤشر تقريبي وليس هدفاً ثابتاً.`,
      "أضف إجابات وتجربة ومعلومات يحتاجها الباحث؛ لا تطِل النص لمجرد رفع العدد."),
    check("subheadings", "تنظيم العناوين الفرعية", !longFormPage ? "unknown" : input.h1.length > 0 && input.h1.length + input.h2.length >= 3 ? "pass" : "warning", 3,
      `H1: ${input.h1.length}، H2: ${input.h2.length}.`,
      "قسّم الصفحة بعناوين تصف الأجزاء الفعلية من المحتوى."),
    check("internal-links", "الروابط الداخلية", input.internalLinks > 0 ? "pass" : "warning", 4,
      `عدد الروابط الداخلية: ${input.internalLinks}.`,
      "اربط الصفحة بخدمات أو صفحات ذات صلة باستخدام نص رابط واضح."),
    check("external-links", "روابط مصادر خارجية", input.externalLinks > 0 ? "pass" : "unknown", 0,
      input.externalLinks ? `عدد الروابط الخارجية: ${input.externalLinks}.` : "لا توجد روابط خارجية؛ ليست مطلوبة لكل صفحة.",
      "أضف مصدراً موثوقاً عندما يحتاج المحتوى إلى مرجع، ولا تضف روابط شكلية."),
    check("image-alt", "النص البديل للصور", input.imageCount === 0 ? "unknown" : input.imagesWithAlt === input.imageCount ? "pass" : input.imagesWithAlt > 0 ? "warning" : "fail", input.imageCount === 0 ? 0 : 4,
      input.imageCount ? `${input.imagesWithAlt} من ${input.imageCount} صورة لها نص بديل.` : "لا توجد صور في المحتوى المفحوص.",
      "اكتب وصفاً موجزاً للصورة؛ لا تحشو النص بالكلمات المفتاحية."),
    check("schema", "بيانات Schema قابلة للقراءة", input.jsonLdValid ? "pass" : "warning", 4,
      input.jsonLdValid ? "عُثر على JSON-LD صالح نحوياً." : "لم يُعثر على JSON-LD صالح أو تعذر تحليله.",
      "أضف نوع Schema يناسب محتوى الصفحة، ثم تحقق منه بأداة النتائج المنسّقة."),
    check("social-meta", "بيانات المشاركة الاجتماعية", input.openGraphComplete ? "pass" : "warning", 3,
      input.openGraphComplete ? "عنوان ووصف وصورة Open Graph موجودة." : "بيانات Open Graph غير مكتملة.",
      "أكمل og:title وog:description وog:image بعناوين خاصة بالصفحة."),
  ]
  const rankMathChecks: SeoAuditCheck[] = rankMath.checks.map(item => ({
    id: `rankmath-${item.id}`,
    label: item.label,
    status: item.status,
    earned: item.earned,
    possible: item.possible,
    detail: item.detail,
    recommendation: item.recommendation,
  }))
  const diagnostics = new Set(["http", "canonical-match", "robots", "subheadings", "external-links", "social-meta"])
  const checks = [
    ...rankMathChecks,
    ...legacyChecks.filter(item => diagnostics.has(item.id)).map(item => ({ ...item, earned: 0, possible: 0 })),
  ]

  return {
    url: input.url,
    statusCode: input.statusCode,
    kind,
    title: input.title,
    description: input.description,
    focusKeyword: keyword,
    canonical: input.canonical,
    robots: input.robots,
    h1: input.h1,
    wordCount: words,
    keywordOccurrences,
    keywordDensity: density,
    score: rankMath.score,
    htmlFallback: false,
    checks,
    contentText: input.contentText,
    rankMathSource: input.rankMathInput ? "cms-record" : "published-html",
    rankMathWordCount: rankMath.wordCount,
    rankMathDataMismatch,
    rankMathSourceNote: input.rankMathSourceNote,
  }
}

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value)
    const path = decodeURIComponentSafe(url.pathname).replace(/\/+$/u, "") || "/"
    return `${url.origin.toLowerCase()}${path}`
  } catch {
    return value.trim()
  }
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

interface ArticleRankMathRecord {
  input: RankMathInput
}

interface ArticleRankMathLookup {
  bySlug: Map<string, ArticleRankMathRecord>
  error?: string
}

function isSeoRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function extractAdminPostRows(payload: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(payload)) return payload.filter(isSeoRecord)
  if (!isSeoRecord(payload)) return null
  for (const key of ["posts", "items", "rows", "data", "result"]) {
    const candidate = payload[key]
    if (Array.isArray(candidate)) return candidate.filter(isSeoRecord)
    if (isSeoRecord(candidate)) {
      for (const nestedKey of ["posts", "items", "rows"]) {
        if (Array.isArray(candidate[nestedKey])) return (candidate[nestedKey] as unknown[]).filter(isSeoRecord)
      }
    }
  }
  return null
}

function normalizeArticleSlug(value: unknown): string {
  const decoded = decodeURIComponentSafe(String(value ?? "").trim())
  return normalizeSeoText(decoded.replace(/^\/+|\/+$/gu, "").split("/").filter(Boolean).at(-1) || "")
}

function readArticleRankMathFields(row: Record<string, unknown>): RankMathArticleFields {
  const text = (...keys: string[]) => {
    for (const key of keys) {
      if (typeof row[key] === "string") return row[key] as string
    }
    return ""
  }
  const keywords = row.seoKeywords ?? row.seo_keywords
  return {
    title: text("title"),
    slug: text("slug"),
    seoTitle: text("seoTitle", "seo_title"),
    seoDescription: text("seoDescription", "seo_description"),
    seoKeywords: typeof keywords === "string" || Array.isArray(keywords) ? keywords as string | string[] : "",
    seoSlug: text("seoSlug", "seo_slug"),
    canonicalUrl: text("canonicalUrl", "canonical_url"),
    content: text("content"),
  }
}

function buildArticleRankMathLookup(rows: Record<string, unknown>[]): ArticleRankMathLookup {
  const bySlug = new Map<string, ArticleRankMathRecord>()
  for (const row of rows) {
    const status = String(row.status ?? "").trim().toLowerCase()
    const activeValue = row.isActive ?? row.is_active
    const active = activeValue !== false && activeValue !== 0 && activeValue !== "0"
    if (status !== "published" || !active) continue
    const fields = readArticleRankMathFields(row)
    const record = { input: buildBlogPostRankMathInput(fields) }
    for (const slug of [fields.seoSlug, fields.slug]) {
      const key = normalizeArticleSlug(slug)
      if (key) bySlug.set(key, record)
    }
  }
  return { bySlug }
}

async function loadArticleRankMathLookup(token: string | undefined, signal?: AbortSignal): Promise<ArticleRankMathLookup> {
  if (!token?.trim()) {
    return { bySlug: new Map(), error: "جلسة الإدارة غير متاحة لقراءة سجل المقال المحفوظ." }
  }
  try {
    const response = await fetch(`${API_BASE}/api/admin/posts`, {
      cache: "no-store",
      credentials: "same-origin",
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache",
      },
    })
    if (!response.ok) throw new Error(`تعذر تحميل سجل المقالات (HTTP ${response.status}).`)
    const rows = extractAdminPostRows(await response.json())
    if (!rows) throw new Error("تعذر قراءة صيغة سجل المقالات من الخادم.")
    return buildArticleRankMathLookup(rows)
  } catch (error) {
    if (signal?.aborted) throw error
    return {
      bySlug: new Map(),
      error: error instanceof Error ? error.message : "تعذر تحميل سجل المقالات.",
    }
  }
}

function articleRankMathRecordForUrl(url: string, lookup: ArticleRankMathLookup): ArticleRankMathRecord | undefined {
  const path = decodeURIComponentSafe(new URL(url).pathname).replace(/\/+$/u, "")
  const parts = path.split("/").filter(Boolean)
  if (parts.length < 2 || normalizeSeoText(parts.at(-2) || "") !== "blog") return undefined
  return lookup.bySlug.get(normalizeArticleSlug(parts.at(-1)))
}

function extractSeoPage(
  html: string,
  url: string,
  expectedCanonical: string,
  statusCode: number,
  articleRecord?: ArticleRankMathRecord,
  articleLookupError?: string,
): SeoAuditPage {
  const parsed = new DOMParser().parseFromString(html, "text/html")
  const meta = (name: string) => parsed.querySelector(`meta[name="${name}"]`)?.getAttribute("content")?.trim() || ""
  const property = (name: string) => parsed.querySelector(`meta[property="${name}"]`)?.getAttribute("content")?.trim() || ""
  const h1 = [...parsed.querySelectorAll("h1")].map(node => node.textContent?.replace(/\s+/gu, " ").trim() || "").filter(Boolean)
  const h2 = [...parsed.querySelectorAll("h2")].map(node => node.textContent?.replace(/\s+/gu, " ").trim() || "").filter(Boolean)
  const articleBody = parsed.querySelector("[data-seo-audit-content], [itemprop='articleBody'], .article-content")
  const main = articleBody || parsed.querySelector("main, article") || parsed.body
  main.querySelectorAll("script, style, noscript, nav, footer, header, svg").forEach(node => node.remove())
  const contentText = (main.textContent || "").replace(/\s+/gu, " ").trim()
  const pageUrl = new URL(url)
  const links = [...parsed.querySelectorAll("a[href]")].map(anchor => {
    try { return new URL(anchor.getAttribute("href") || "", url) } catch { return null }
  }).filter((item): item is URL => Boolean(item))
  const imageNodes = [...parsed.querySelectorAll("main img, article img, body > img")]
  const validSchema = [...parsed.querySelectorAll('script[type="application/ld+json"]')].some(script => {
    try { JSON.parse(script.textContent || ""); return true } catch { return false }
  })
  // The generic "keywords" meta tag is not a reliable focus-keyword field.
  // Only use the explicit internal field, otherwise report the check as unknown.
  const candidateKeyword = meta("seo-focus-keyword")
  const canonicalHref = parsed.querySelector('link[rel="canonical"]')?.getAttribute("href") || ""
  let canonical = ""
  try { canonical = canonicalHref ? new URL(canonicalHref, url).href : "" } catch {}

  const page = evaluateSeoPage({
    url,
    expectedCanonical,
    statusCode,
    title: parsed.title.trim(),
    description: meta("description"),
    focusKeyword: candidateKeyword,
    canonical,
    robots: `${meta("robots")} ${meta("googlebot")}`.trim(),
    h1,
    h2,
    contentText,
    internalLinks: links.filter(link => link.origin === pageUrl.origin).length,
    externalLinks: links.filter(link => link.origin !== pageUrl.origin).length,
    imageCount: imageNodes.length,
    imagesWithAlt: imageNodes.filter(image => Boolean(image.getAttribute("alt")?.trim())).length,
    jsonLdValid: validSchema,
    openGraphComplete: Boolean(property("og:title") && property("og:description") && property("og:image")),
    rankMathInput: articleRecord?.input,
    rankMathSourceNote: !articleRecord && pageKind(pageUrl.pathname) === "مقال"
      ? articleLookupError || "لم يُعثر على سجل مقال منشور مطابق لهذا الرابط؛ احتُسبت الدرجة من HTML المنشور."
      : undefined,
  })
  page.sourceSignature = hashText(normalizeSeoText([
    page.title,
    page.description,
    page.h1.join(" "),
    page.contentText,
  ].join("\n"))).toString(36)
  return page
}

function hashText(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function simHashNormalized(normalizedValue: string): number {
  const vector = new Int16Array(32)
  for (const match of normalizedValue.matchAll(/[\p{L}\p{N}]+/gu)) {
    const token = match[0]
    const hash = hashText(token)
    for (let bit = 0; bit < 32; bit += 1) vector[bit] += hash & (1 << bit) ? 1 : -1
  }
  let result = 0
  for (let bit = 0; bit < 32; bit += 1) if (vector[bit] >= 0) result |= 1 << bit
  return result >>> 0
}

function hammingDistance(left: number, right: number): number {
  let value = left ^ right
  let count = 0
  while (value) {
    value &= value - 1
    count += 1
  }
  return count
}

function addSiteWideChecks(pages: SeoAuditPage[], ignoredPages: Set<SeoAuditPage> = new Set()): void {
  const eligiblePages = pages.filter(page => page.statusCode === 200 && !ignoredPages.has(page))
  const titleGroups = new Map<string, SeoAuditPage[]>()
  const descriptionGroups = new Map<string, SeoAuditPage[]>()
  const normalizedContentByPage = new Map<SeoAuditPage, string>()
  for (const page of eligiblePages) {
    const titleKey = normalizeSeoText(page.title)
    const descriptionKey = normalizeSeoText(page.description)
    if (titleKey) {
      const group = titleGroups.get(titleKey)
      if (group) group.push(page)
      else titleGroups.set(titleKey, [page])
    }
    if (descriptionKey) {
      const group = descriptionGroups.get(descriptionKey)
      if (group) group.push(page)
      else descriptionGroups.set(descriptionKey, [page])
    }
  }
  for (const group of titleGroups.values()) {
    if (group.length < 2) continue
    for (const page of group) page.checks.push(check(
      "unique-title", "عنوان فريد على مستوى الموقع", "fail", 5,
      `العنوان مكرر في ${group.length} صفحات.`,
      "اكتب عنواناً يميز نية هذه الصفحة عن بقية الصفحات.",
    ))
  }
  for (const group of descriptionGroups.values()) {
    if (group.length < 2) continue
    for (const page of group) page.checks.push(check(
      "unique-description", "وصف فريد على مستوى الموقع", "warning", 3,
      `الوصف مكرر في ${group.length} صفحات.`,
      "اكتب وصفاً يعكس محتوى هذه الصفحة تحديداً.",
    ))
  }

  const exactContentGroups = new Map<string, SeoAuditPage[]>()
  for (const page of eligiblePages) {
    const contentKey = normalizeSeoText(page.contentText)
    normalizedContentByPage.set(page, contentKey)
    if (contentKey.length < 500) continue
    const group = exactContentGroups.get(contentKey)
    if (group) group.push(page)
    else exactContentGroups.set(contentKey, [page])
  }
  const exactDuplicatePages = new Set<SeoAuditPage>()
  for (const group of exactContentGroups.values()) {
    if (group.length < 2) continue
    const original = group[0]
    for (const duplicate of group.slice(1)) {
      duplicate.duplicateOf = original.url
      exactDuplicatePages.add(duplicate)
      duplicate.checks.push(check(
        `duplicate-content-${hashText(original.url).toString(36)}`, "محتوى مطابق لصفحة أخرى", "fail", 8,
        `النص المرئي مطابق بعد التطبيع لصفحة ${original.url}.`,
        "قارن الغرضين؛ ميّز المحتوى إذا كانت الصفحتان تخدمان حاجتين مختلفتين، أو وحّدهما بتحويل مناسب إذا كانتا مكررتين فعلاً.",
      ))
    }
    exactDuplicatePages.add(original)
  }

  const fingerprinted = eligiblePages
    .filter(page => page.contentText.length >= 500 && !exactDuplicatePages.has(page))
    .map(page => ({ page, hash: simHashNormalized(normalizedContentByPage.get(page) ?? "") }))
  for (let left = 0; left < fingerprinted.length; left += 1) {
    for (let right = left + 1; right < fingerprinted.length; right += 1) {
      const a = fingerprinted[left]
      const b = fingerprinted[right]
      if (hammingDistance(a.hash, b.hash) <= 2 && !b.page.duplicateOf) {
        b.page.duplicateOf = a.page.url
        b.page.checks.push(check(
          `similar-content-${hashText(a.page.url).toString(36)}`, "تشابه محتمل مع صفحة أخرى", "warning", 8,
          `البصمة النصية قريبة من ${a.page.url}. هذا مؤشر آلي للمراجعة، وليس دليلاً كافياً لإثبات تكرار المحتوى.`,
          "قارن الصفحتين يدوياً؛ ادمجهما أو اجعل لكل واحدة غرضاً ومعلومات مميزة قبل إبقائهما مفهرستين.",
        ))
      }
    }
  }
  for (const page of pages) page.score = ignoredPages.has(page) ? null : scoreChecks(page.checks)
}

function detectRenderedFallback(pages: SeoAuditPage[]): SeoAuditPage[] {
  const eligible = pages.filter(page => page.statusCode === 200 && page.sourceSignature)
  const groups = new Map<string, SeoAuditPage[]>()
  for (const page of eligible) {
    const signature = page.sourceSignature!
    groups.set(signature, [...(groups.get(signature) || []), page])
  }
  const dominantGroup = [...groups.values()].sort((left, right) => right.length - left.length)[0] || []
  const threshold = Math.max(5, Math.ceil(eligible.length * 0.2))
  if (dominantGroup.length < threshold) return []
  for (const page of dominantGroup) {
    page.htmlFallback = true
    page.score = null
  }
  return dominantGroup
}

function repairDoubleEncodedArabicPath(url: URL): void {
  const pathHasDoubleEncodedArabic = /%25D[89A-F](?:%25[0-9A-F]{2})+/iu.test(url.pathname)
  if (!pathHasDoubleEncodedArabic) return
  url.pathname = url.pathname.replace(/%25([0-9A-F]{2})/giu, "%$1")
}

export function sitemapPageUrls(xml: string, currentOrigin: string, basePath: string): SitemapTarget[] {
  const targets: SitemapTarget[] = []
  const seen = new Set<string>()
  const originUrl = new URL(currentOrigin)
  const pathPrefix = basePath.replace(/\/+$/u, "")
  for (const match of xml.matchAll(/<url>([\s\S]*?)<\/url>/giu)) {
    const location = match[1].match(/<loc>([\s\S]*?)<\/loc>/iu)?.[1]?.trim()
    if (!location) continue
    const decoded = location.replace(/&amp;/gu, "&").replace(/&lt;/gu, "<").replace(/&gt;/gu, ">")
    try {
      const canonicalUrl = new URL(decoded)
      const crawlUrl = new URL(decoded)
      repairDoubleEncodedArabicPath(canonicalUrl)
      repairDoubleEncodedArabicPath(crawlUrl)
      // Keep the sitemap's paths while auditing the current host. This permits
      // the same check in Replit preview and on the deployed site.
      crawlUrl.host = originUrl.host
      crawlUrl.protocol = originUrl.protocol
      if (pathPrefix && crawlUrl.pathname !== pathPrefix && !crawlUrl.pathname.startsWith(`${pathPrefix}/`)) {
        crawlUrl.pathname = `${pathPrefix}${crawlUrl.pathname.startsWith("/") ? crawlUrl.pathname : `/${crawlUrl.pathname}`}`
      }
      crawlUrl.hash = ""
      if (!seen.has(crawlUrl.href)) {
        seen.add(crawlUrl.href)
        targets.push({ crawlUrl: crawlUrl.href, canonicalUrl: canonicalUrl.href })
      }
    } catch {}
  }
  return targets
}

function sitemapXmlRootName(xml: string): string | null {
  const match = xml.replace(/^\uFEFF/u, "").match(
    /^\s*(?:(?:<\?[\s\S]*?\?>)|(?:<!--[\s\S]*?-->))*\s*<([A-Za-z_:][\w:.-]*)\b/u,
  )
  return match?.[1].split(":").at(-1)?.toLowerCase() ?? null
}

export function sitemapDocumentKind(xml: string): "urlset" | "sitemapindex" | null {
  const rootName = sitemapXmlRootName(xml)
  return rootName === "urlset" || rootName === "sitemapindex" ? rootName : null
}

function decodeSitemapXmlText(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/giu, (entity, encoded: string) => {
    const normalized = encoded.toLowerCase()
    if (normalized === "amp") return "&"
    if (normalized === "lt") return "<"
    if (normalized === "gt") return ">"
    if (normalized === "quot") return '"'
    if (normalized === "apos") return "'"
    const numeric = normalized.startsWith("#x")
      ? Number.parseInt(normalized.slice(2), 16)
      : Number.parseInt(normalized.slice(1), 10)
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 0x10ffff) return entity
    try {
      return String.fromCodePoint(numeric)
    } catch {
      return entity
    }
  })
}

function assertWellFormedSitemapXml(xml: string): void {
  const source = xml.replace(/^\uFEFF/u, "").trim()
  if (!source) throw new Error("استجابة خريطة الموقع فارغة.")
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/iu.test(source)) {
    throw new Error("استجابة خريطة الموقع تحتوي على تعريف XML غير مسموح.")
  }

  if (typeof DOMParser !== "undefined") {
    const parsed = new DOMParser().parseFromString(source, "application/xml")
    if (parsed.querySelector("parsererror")) throw new Error("استجابة خريطة الموقع ليست XML سليماً.")
    return
  }

  // Lightweight well-formedness check for the Node-based regression tests;
  // browsers use their native XML parser above.
  const tokens = [...source.matchAll(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<[^>]*>/gu)]
  const stack: string[] = []
  let cursor = 0
  let rootCount = 0
  for (const token of tokens) {
    const raw = token[0]
    const position = token.index ?? 0
    const text = source.slice(cursor, position)
    if (text.includes("<") || /&(?!#(?:x[0-9a-f]+|\d+);|[a-z][\w:.-]*;)/iu.test(text)) {
      throw new Error("استجابة خريطة الموقع ليست XML سليماً.")
    }
    cursor = position + raw.length
    if (raw.startsWith("<!--") || raw.startsWith("<![CDATA[") || raw.startsWith("<?")) continue
    if (/^<\//u.test(raw)) {
      const closing = raw.match(/^<\/([A-Za-z_:][\w:.-]*)\s*>$/u)?.[1]
      if (!closing || stack.pop() !== closing) throw new Error("استجابة خريطة الموقع ليست XML سليماً.")
      continue
    }
    const opening = raw.match(/^<([A-Za-z_:][\w:.-]*)(?:\s+(?:[^/"'<>]|"[^"]*"|'[^']*')*)?\s*(\/?)>$/u)
    if (!opening) throw new Error("استجابة خريطة الموقع ليست XML سليماً.")
    if (stack.length === 0) rootCount += 1
    if (!opening[2]) stack.push(opening[1])
  }
  const trailingText = source.slice(cursor)
  if (
    trailingText.includes("<")
    || /&(?!#(?:x[0-9a-f]+|\d+);|[a-z][\w:.-]*;)/iu.test(trailingText)
    || stack.length > 0
    || rootCount !== 1
  ) {
    throw new Error("استجابة خريطة الموقع ليست XML سليماً.")
  }
}

export function validateSitemapXmlDocument(xml: string, currentOrigin: string): "urlset" | "sitemapindex" {
  const content = xml.replace(/^\uFEFF/u, "").trim()
  if (content.includes("__CLEANFLOW_SITE_ORIGIN__")) {
    throw new Error("خريطة الموقع ما زالت تحتوي على رمز أصل الموقع غير المستبدل.")
  }
  if (/<!doctype\s+html\b|<html\b/iu.test(content)) {
    throw new Error("الخادم أعاد صفحة HTML بدلاً من خريطة XML؛ تحقّق من توجيه sitemap في حزمة الموقع.")
  }
  assertWellFormedSitemapXml(content)
  const kind = sitemapDocumentKind(content)
  if (!kind) throw new Error("جذر XML ليس urlset أو sitemapindex صالحاً.")
  if (sitemapXmlRootName(content) !== kind) throw new Error("جذر XML لا يطابق نوع خريطة الموقع.")
  const locationMatches = [...content.matchAll(/<(?:[\w.-]+:)?loc\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?loc\s*>/giu)]
  const openLocations = [...content.matchAll(/<(?:[\w.-]+:)?loc\b[^>]*>/giu)].length
  const closeLocations = [...content.matchAll(/<\/(?:[\w.-]+:)?loc\s*>/giu)].length
  if (!locationMatches.length || openLocations !== locationMatches.length || closeLocations !== locationMatches.length) {
    throw new Error(kind === "sitemapindex"
      ? "فهرس خريطة الموقع لا يحتوي على روابط فرعية مكتملة."
      : "خريطة الموقع لا تحتوي على روابط صفحات مكتملة.")
  }
  const expectedOrigin = new URL(currentOrigin).origin
  for (const match of locationMatches) {
    const location = decodeSitemapXmlText(match[1].trim())
    if (location.includes("__CLEANFLOW_SITE_ORIGIN__")) {
      throw new Error("رابط داخل خريطة الموقع ما زال يحتوي على رمز أصل الموقع غير المستبدل.")
    }
    let parsed: URL
    try {
      parsed = new URL(location)
    } catch {
      throw new Error("يوجد رابط <loc> نسبي أو غير صالح؛ يجب أن يكون رابطاً مطلقاً.")
    }
    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) {
      throw new Error("يوجد رابط <loc> لا يستخدم HTTP أو HTTPS.")
    }
  }
  if (kind === "sitemapindex" && !sitemapIndexUrls(content, expectedOrigin).length) {
    throw new Error("فهرس خريطة الموقع لا يحتوي على ملفات فرعية صالحة من النطاق نفسه.")
  }
  return kind
}

export async function readSitemapResponse(
  response: Response,
  requestedUrl: string,
  currentOrigin: string,
  description: string,
): Promise<string> {
  if (!response.ok) {
    const label = response.status === 404 ? "لم يعثر الخادم على ملف خريطة الموقع" : "تعذر تحميل ملف خريطة الموقع"
    throw new Error(`${label} (${description}): HTTP ${response.status}.`)
  }
  const expectedOrigin = new URL(currentOrigin).origin
  const finalUrl = response.url ? new URL(response.url, requestedUrl) : new URL(requestedUrl)
  if (finalUrl.origin !== expectedOrigin) {
    throw new Error(`حوّل الخادم ${description} إلى نطاق مختلف؛ أوقف الفحص لحماية الطلبات من التوجيه الخارجي.`)
  }
  const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() ?? ""
  if (
    !contentType
    || !(contentType === "application/xml"
      || contentType === "text/xml"
      || contentType === "text/plain"
      || /^application\/[a-z0-9.+-]+\+xml$/iu.test(contentType))
  ) {
    throw new Error(`نوع المحتوى لخريطة الموقع غير صالح (${description}): ${contentType || "غير محدد"}؛ المتوقع XML.`)
  }
  if (response.redirected && finalUrl.origin !== new URL(requestedUrl).origin) {
    throw new Error(`أُعيد توجيه ${description} خارج النطاق المطلوب.`)
  }
  const xml = await response.text()
  validateSitemapXmlDocument(xml, expectedOrigin)
  return xml
}

export function sitemapIndexUrls(xml: string, currentOrigin: string): string[] {
  const expectedOrigin = new URL(currentOrigin).origin
  const seen = new Set<string>()
  const urls: string[] = []
  for (const match of xml.matchAll(/<sitemap\b[^>]*>([\s\S]*?)<\/sitemap>/giu)) {
    const rawLocation = match[1].match(/<loc\b[^>]*>([\s\S]*?)<\/loc>/iu)?.[1]?.trim()
    if (!rawLocation) continue
    try {
      const decoded = decodeSitemapXmlText(rawLocation)
      const childUrl = new URL(decoded, currentOrigin)
      if (
        childUrl.origin !== expectedOrigin
        || !/^\/(?:[^/]+\/)*sitemap[1-9]\d*\.xml$/iu.test(childUrl.pathname)
        || childUrl.search
        || childUrl.hash
      ) continue
      childUrl.hash = ""
      if (!seen.has(childUrl.href)) {
        seen.add(childUrl.href)
        urls.push(childUrl.href)
      }
    } catch {
      continue
    }
  }
  return urls
}

export async function loadSitemapPageTargets(
  xml: string,
  sitemapUrl: string,
  currentOrigin: string,
  basePath: string,
  signal?: AbortSignal,
): Promise<SitemapTarget[]> {
  const expectedOrigin = new URL(currentOrigin).origin
  if (new URL(sitemapUrl).origin !== expectedOrigin) {
    throw new Error("عنوان خريطة الموقع لا يطابق نطاق الموقع الجاري فحصه.")
  }
  const documentKind = validateSitemapXmlDocument(xml, expectedOrigin)
  if (documentKind === "urlset") return sitemapPageUrls(xml, currentOrigin, basePath)

  const childUrls = sitemapIndexUrls(xml, currentOrigin)
  if (!childUrls.length) throw new Error("فهرس خريطة الموقع لا يحتوي على ملفات فرعية صالحة من النطاق نفسه.")
  if (childUrls.length > 50_000) throw new Error("فهرس خريطة الموقع يتجاوز عدد الملفات المسموح بفحصه.")

  const sitemapOrigin = expectedOrigin
  const targets = new Map<string, SitemapTarget>()
  for (const childUrl of childUrls) {
    const response = await fetch(childUrl, {
      cache: "no-store",
      signal,
      redirect: "error",
      headers: { Accept: "application/xml,text/xml,text/plain" },
      credentials: "same-origin",
    })
    const childXml = await readSitemapResponse(
      response,
      childUrl,
      sitemapOrigin,
      `الملف الفرعي ${new URL(childUrl).pathname}`,
    )
    if (validateSitemapXmlDocument(childXml, sitemapOrigin) !== "urlset") {
      throw new Error(`الملف الفرعي ${new URL(childUrl).pathname} ليس خريطة صفحات urlset.`)
    }
    for (const target of sitemapPageUrls(childXml, currentOrigin, basePath)) {
      targets.set(normalizeUrl(target.crawlUrl), target)
    }
  }
  return [...targets.values()]
}

export function generatedHtmlPageUrls(
  paths: string[],
  currentOrigin: string,
  basePath: string,
  canonicalOrigin = CANONICAL_SITE_ORIGIN || currentOrigin,
): SitemapTarget[] {
  const originUrl = new URL(currentOrigin)
  const canonicalOriginUrl = new URL(canonicalOrigin)
  const pathPrefix = basePath.replace(/\/+$/u, "")
  const targets: SitemapTarget[] = []
  const seen = new Set<string>()

  for (const rawPath of paths) {
    const route = rawPath.trim()
    if (!route || !route.startsWith("/") || route.startsWith("//") || route.includes("\\") || route.includes("\0")) continue
    try {
      const crawlUrl = new URL(route, originUrl)
      const canonicalUrl = new URL(route, canonicalOriginUrl)
      if (pathPrefix && crawlUrl.pathname !== pathPrefix && !crawlUrl.pathname.startsWith(`${pathPrefix}/`)) {
        crawlUrl.pathname = `${pathPrefix}${crawlUrl.pathname}`
      }
      crawlUrl.search = ""
      crawlUrl.hash = ""
      canonicalUrl.search = ""
      canonicalUrl.hash = ""
      if (seen.has(crawlUrl.href)) continue
      seen.add(crawlUrl.href)
      targets.push({ crawlUrl: crawlUrl.href, canonicalUrl: canonicalUrl.href })
    } catch {
      // Ignore malformed paths returned by a damaged or outdated inventory.
    }
  }
  return targets
}

async function loadGeneratedHtmlInventory(
  token: string | undefined,
  signal?: AbortSignal,
): Promise<{ paths: string[]; error?: string }> {
  if (!token?.trim()) return { paths: [], error: "جلسة الإدارة غير متاحة لقراءة ملفات HTML المنشورة." }
  try {
    const response = await fetch(`${API_BASE}/api/admin/seo-audit/html-inventory`, {
      cache: "no-store",
      credentials: "same-origin",
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache",
      },
    })
    if (!response.ok) throw new Error(`تعذر قراءة فهرس HTML المنشور (HTTP ${response.status}).`)
    const inventory = await response.json() as SeoHtmlInventoryResponse
    if (!Array.isArray(inventory.paths) || inventory.paths.some(route => typeof route !== "string")) {
      throw new Error("استجابة فهرس HTML غير صالحة.")
    }
    return { paths: inventory.paths }
  } catch (error) {
    if (signal?.aborted) throw error
    return {
      paths: [],
      error: error instanceof Error ? error.message : "تعذر قراءة فهرس HTML المنشور.",
    }
  }
}

async function fetchPageWithRetry(url: string, signal?: AbortSignal): Promise<Response> {
  const delays = [500, 1500, 3000]
  let lastError: unknown
  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    let response: Response | undefined
    try {
      response = await fetch(url, {
        cache: "no-store",
        signal,
        headers: { Accept: "text/html" },
        credentials: "same-origin",
      })
    } catch (error) {
      if (signal?.aborted || attempt === delays.length) throw error
      lastError = error
    }

    if (response) {
      const retryable = response.status === 404
        || response.status === 408
        || response.status === 425
        || response.status === 429
        || response.status >= 500
      if (!retryable || attempt === delays.length) return response
      try { await response.body?.cancel() } catch {}
    }

    await new Promise(resolve => setTimeout(resolve, delays[attempt]))
  }
  throw lastError instanceof Error ? lastError : new Error("تعذر جلب الصفحة بعد إعادة المحاولة.")
}

async function crawlPage(
  target: SitemapTarget,
  signal: AbortSignal | undefined,
  articleLookup: ArticleRankMathLookup,
): Promise<SeoAuditPage> {
  const url = target.crawlUrl
  try {
    const response = await fetchPageWithRetry(url, signal)
    const contentType = response.headers.get("content-type") || ""
    if (!contentType.includes("text/html")) {
      return evaluateSeoPage({
        url, expectedCanonical: target.canonicalUrl, statusCode: response.status, title: "", description: "", focusKeyword: "",
        canonical: "", robots: "", h1: [], h2: [], contentText: "",
        internalLinks: 0, externalLinks: 0, imageCount: 0, imagesWithAlt: 0,
        jsonLdValid: false, openGraphComplete: false,
        rankMathSourceNote: pageKind(new URL(url).pathname) === "مقال"
          ? articleLookup.error || "لم يُعثر على سجل مقال منشور مطابق لهذا الرابط."
          : undefined,
      })
    }
    const articleRecord = response.status === 200 ? articleRankMathRecordForUrl(url, articleLookup) : undefined
    return extractSeoPage(
      await response.text(),
      url,
      target.canonicalUrl,
      response.status,
      articleRecord,
      articleLookup.error,
    )
  } catch {
    return evaluateSeoPage({
      url, expectedCanonical: target.canonicalUrl, statusCode: null, title: "", description: "", focusKeyword: "",
      canonical: "", robots: "", h1: [], h2: [], contentText: "",
      internalLinks: 0, externalLinks: 0, imageCount: 0, imagesWithAlt: 0,
      jsonLdValid: false, openGraphComplete: false,
      rankMathSourceNote: pageKind(new URL(url).pathname) === "مقال"
        ? articleLookup.error || "تعذر جلب HTML المنشور أو مطابقة سجل المقال."
        : undefined,
    })
  }
}

export async function runSeoSiteAudit(options: SeoAuditOptions = {}): Promise<SeoAuditReport> {
  const origin = options.origin || window.location.origin
  const auditHost = new URL(origin).hostname.toLowerCase().replace(/^\[|\]$/gu, "")
  const isPreviewHost = auditHost === "localhost"
    || auditHost.endsWith(".localhost")
    || auditHost === "0.0.0.0"
    || auditHost === "::1"
    || auditHost.startsWith("127.")
    || auditHost.endsWith(".replit.dev")
    || auditHost.endsWith(".replit.app")
    || auditHost.endsWith(".repl.co")
  if (isPreviewHost) {
    throw new Error("فحص صفحات SEO لا يعطي نتائج موثوقة من معاينة Replit؛ شغّل التدقيق من الموقع المنشور بعد تحديث حزمة Hostinger.");
  }
  const startedAt = new Date().toISOString()
  let basePath = new URL(import.meta.env.BASE_URL || "/", origin).pathname
  if (basePath === "/") {
    const adminRoute = window.location.pathname.indexOf("/admin/")
    if (adminRoute > 0) basePath = window.location.pathname.slice(0, adminRoute + 1)
  }
  if (!basePath.endsWith("/")) basePath += "/"
  const sitemapUrl = new URL("sitemap.xml", new URL(basePath, origin)).href
  const sitemapResponse = await fetch(sitemapUrl, {
    cache: "no-store",
    signal: options.signal,
    headers: { Accept: "application/xml,text/xml,text/plain" },
    credentials: "same-origin",
  })
  const xml = await readSitemapResponse(sitemapResponse, sitemapUrl, origin, "الملف الجذري")
  const sitemapTargets = await loadSitemapPageTargets(xml, sitemapUrl, origin, basePath, options.signal)
  if (!sitemapTargets.length) throw new Error("خريطة الموقع لا تحتوي على روابط صفحات قابلة للفحص.")
  const inventory = await loadGeneratedHtmlInventory(options.adminToken, options.signal)
  const htmlTargets = generatedHtmlPageUrls(inventory.paths, origin, basePath, origin)
  const sitemapTargetKeys = new Set(sitemapTargets.map(target => normalizeUrl(target.crawlUrl)))
  const extraHtmlTargets = htmlTargets.filter(target => !sitemapTargetKeys.has(normalizeUrl(target.crawlUrl)))
  const targets = [...sitemapTargets, ...extraHtmlTargets]
  const articleLookup = await loadArticleRankMathLookup(options.adminToken, options.signal)

  const pages: SeoAuditPage[] = []
  let next = 0
  const concurrency = Math.min(Math.max(options.concurrency || 5, 1), 8)
  const workers = Array.from({ length: Math.min(concurrency, targets.length) }, async () => {
    while (next < targets.length && !options.signal?.aborted) {
      const index = next++
      const target = targets[index]
      options.onProgress?.({ completed: pages.length, total: targets.length, currentUrl: target.crawlUrl })
      pages.push(await crawlPage(target, options.signal, articleLookup))
      options.onProgress?.({ completed: pages.length, total: targets.length, currentUrl: target.crawlUrl })
    }
  })
  await Promise.all(workers)
  if (options.signal?.aborted) {
    throw new DOMException("تم إيقاف فحص خريطة الموقع.", "AbortError")
  }
  const fallbackPages = detectRenderedFallback(pages)
  const renderFallbackDetected = fallbackPages.length > 0
  addSiteWideChecks(pages, new Set(fallbackPages))

  const scored = pages.filter(page => page.statusCode !== null)
  return {
    startedAt,
    completedAt: new Date().toISOString(),
    sitemapUrl,
    sitemapStatus: sitemapResponse.status,
    totalUrls: targets.length,
    checkedUrls: pages.length,
    failedRequests: pages.filter(page => page.statusCode === null || page.statusCode >= 400).length,
    averageScore: !renderFallbackDetected && scored.length
      ? Math.round(scored.reduce((total, page) => total + (page.score ?? 0), 0) / scored.length)
      : null,
    renderFallbackDetected,
    renderFallbackPageCount: fallbackPages.length,
    passCount: pages.reduce((total, page) => total + page.checks.filter(item => item.status === "pass").length, 0),
    warningCount: pages.reduce((total, page) => total + page.checks.filter(item => item.status === "warning").length, 0),
    failCount: pages.reduce((total, page) => total + page.checks.filter(item => item.status === "fail").length, 0),
    pages: pages.sort((a, b) => (a.score ?? 0) - (b.score ?? 0) || a.url.localeCompare(b.url)),
    rankMathScoreVersion: SEO_AUDIT_RANK_MATH_SCORE_VERSION,
    htmlInventoryAvailable: !inventory.error,
    htmlInventoryCount: inventory.paths.length,
    sitemapOmissionCount: extraHtmlTargets.length,
    ...(inventory.error ? { inventoryError: inventory.error } : {}),
  }
}
