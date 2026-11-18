import { useEffect, useMemo, useRef, useState } from "react"
import type { SeoAuditCheck, SeoAuditPage, SeoAuditProgress, SeoAuditReport } from "@/lib/seo-audit"
import { runSeoSiteAudit, SEO_AUDIT_RANK_MATH_SCORE_VERSION } from "@/lib/seo-audit"
import {
  getRankMathFixTarget,
  normalizeSeoOverridePath,
  RANK_MATH_EDITOR_POLICY,
  type RankMathFixEntity,
  type SeoPageOverride,
} from "@workspace/seo-rank-math"
import type { SeoAuditPersistence, SeoAuditSaveResult } from "@/hooks/useSeoAuditReport"
import {
  Activity, AlertTriangle, ArrowUpRight, Check, CheckCircle2, ChevronLeft,
  CircleHelp, Clock3, FileSearch, Gauge, Globe2, Link2, ListFilter, Loader2,
  Play, Search, ShieldAlert, X, XCircle, Save, ExternalLink, Sparkles,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""
const adminToken = () => localStorage.getItem("admin_token") || ""

type Filter = "all" | "fail" | "warning" | "pass"
const PAGE_SIZE = 25
const INLINE_CONTENT_PREVIEW_CHARS = 1_500

const statusCopy = {
  pass: { label: "سليم", icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  warning: { label: "يحتاج مراجعة", icon: AlertTriangle, color: "text-amber-800", bg: "bg-amber-50", border: "border-amber-200" },
  fail: { label: "مشكلة", icon: XCircle, color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
  unknown: { label: "غير متاح", icon: CircleHelp, color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200" },
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

function readableUrl(url: string) {
  try {
    const parsed = new URL(url)
    return `${parsed.host}${decodeURIComponent(parsed.pathname)}${parsed.search}`
  } catch {
    return url
  }
}

function StatusPill({ status }: { status: SeoAuditCheck["status"] }) {
  const item = statusCopy[status]
  const Icon = item.icon
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${item.bg} ${item.color} ${item.border}`}>
      <Icon size={13} strokeWidth={2.5} />
      {item.label}
    </span>
  )
}

function ScoreRing({ score }: { score: number | null }) {
  const value = score ?? 0
  const tone = score === null ? "warn" : value >= RANK_MATH_EDITOR_POLICY.minimumPublishScore ? "good" : "bad"
  return (
    <div className={`audit-score-ring audit-score-${tone}`} style={{ "--score": `${value * 3.6}deg` } as React.CSSProperties}>
      <div className="audit-score-core">
        <strong>{score === null ? "—" : score}</strong>
        <span>من ١٠٠</span>
      </div>
    </div>
  )
}

function pageEntity(page: SeoAuditPage): RankMathFixEntity {
  if (editableStaticPagePath(page)) return "landing"
  if (page.kind === "صفحة SEO") return "landing"
  if (page.kind === "خدمة") return "service"
  if (page.kind === "باقة") return "package"
  return "article"
}

function editableStaticPagePath(page: SeoAuditPage): string | null {
  try {
    return normalizeSeoOverridePath(new URL(page.url).pathname)
  } catch {
    return null
  }
}

function checkField(check: SeoAuditCheck, page: SeoAuditPage) {
  const target = getRankMathFixTarget(check.id, pageEntity(page))
  if (target) return { key: target.field, label: target.label }
  const id = check.id.replace(/^rankmath-/u, "")
  if (id === "keyword-url") return { key: "seoSlug", label: "الرابط المختصر (Slug)؛ لا تغيّره دون تحويل 301" }
  if (id === "canonical" || id === "canonical-match") return { key: "canonicalUrl", label: "الرابط الأساسي Canonical" }
  if (id === "robots") return { key: "robots", label: "تعليمات Robots" }
  if (id === "h1-count") return { key: "title", label: "العنوان الرئيسي H1" }
  if (id === "image-alt") return { key: "imageAlt", label: "النص البديل للصورة" }
  if (id === "schema") return { key: "schema", label: "بيانات Schema المنظمة" }
  if (id === "internal-links") return { key: "content", label: "الروابط الداخلية داخل المحتوى" }
  if (id === "subheadings") return { key: "content", label: "العناوين الفرعية داخل المحتوى" }
  return { key: "manual", label: "فحص تقني أو مراجعة يدوية" }
}

function editorHref(page: SeoAuditPage, field: string): string | null {
  let pathname = ""
  try { pathname = decodeURIComponent(new URL(page.url).pathname) } catch { return null }
  const parts = pathname.split("/").filter(Boolean)
  const slug = parts.at(-1)
  const base = API_BASE
  if (parts.length === 2 && parts[0] === "blog" && slug) {
    return `${base}/admin/blog?seoAuditSlug=${encodeURIComponent(slug)}&seoAuditField=${encodeURIComponent(field)}`
  }
  if (parts.length === 2 && parts[0] === "page" && slug) {
    return `${base}/admin/seo-pages?seoAuditSlug=${encodeURIComponent(slug)}&seoAuditField=${encodeURIComponent(field)}`
  }
  if (parts.length === 2 && parts[0] === "services" && slug) {
    return `${base}/admin/services?seoAuditSlug=${encodeURIComponent(slug)}&seoAuditField=${encodeURIComponent(field)}`
  }
  if (parts.length === 2 && parts[0] === "cleaning-packages" && slug) {
    return `${base}/admin/packages?seoAuditSlug=${encodeURIComponent(slug)}&seoAuditField=${encodeURIComponent(field)}`
  }
  return null
}

function aiFixable(check: SeoAuditCheck, page: SeoAuditPage): boolean {
  if (editableStaticPagePath(page)) {
    const id = check.id.replace(/^rankmath-/u, "")
    return [
      "focus-keyword", "title-length", "keyword-title", "description-length",
      "keyword-description", "keyword-h1", "keyword-intro", "keyword-introduction", "content-depth",
    ].includes(id)
  }
  return getRankMathFixTarget(check.id, pageEntity(page)) !== null
}

function StaticPageOverrideEditor({
  page,
  onSave,
  saving,
}: {
  page: SeoAuditPage
  onSave: (page: SeoAuditPage, override: SeoPageOverride) => void
  saving: boolean
}) {
  const routePath = editableStaticPagePath(page)
  const [loaded, setLoaded] = useState(false)
  const [fields, setFields] = useState<SeoPageOverride>({
    path: routePath || "",
    seoTitle: page.title,
    description: page.description,
    focusKeyword: page.focusKeyword,
    h1: page.h1[0] || "",
    content: "",
  })
  const [sitemapEligible, setSitemapEligible] = useState<boolean | null>(null)

  useEffect(() => {
    if (!routePath) return
    let cancelled = false
    void fetch(`${API_BASE}/api/admin/seo-audit/page-overrides?path=${encodeURIComponent(routePath)}`, {
      headers: { Authorization: `Bearer ${adminToken()}` },
    })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (cancelled) return
        const stored = data?.override as SeoPageOverride | null | undefined
        if (stored) {
          setFields({
            path: routePath,
            seoTitle: stored.seoTitle || page.title,
            description: stored.description || page.description,
            focusKeyword: stored.focusKeyword || page.focusKeyword,
            h1: stored.h1 || page.h1[0] || "",
            content: stored.content || "",
          })
          setSitemapEligible(stored.sitemapEligible === true)
        }
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => { cancelled = true }
  }, [routePath, page.title, page.description, page.focusKeyword, page.h1])

  if (!routePath) return null
  const update = (field: keyof SeoPageOverride, value: string) => {
    setFields(current => ({ ...current, [field]: value }))
  }

  return (
    <details className="mt-5 rounded-xl border border-[#d9e8e2] bg-[#f8fbf9] p-4">
      <summary className="cursor-pointer text-sm font-extrabold text-[#1e4941]">تحرير دائم للصفحة الثابتة أو صفحة المنطقة</summary>
      <p className="mt-2 text-xs leading-6 text-slate-600">
        تُحفظ التعديلات في قاعدة البيانات وتُطبّق على HTML المنشور، من دون تغيير الرابط أو canonical أو تعليمات robots.
      </p>
      {!loaded ? (
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Loader2 size={14} className="animate-spin" /> تحميل آخر تعديل محفوظ…</div>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-bold text-slate-700">
            عنوان SEO
            <input value={fields.seoTitle} onChange={event => update("seoTitle", event.target.value)} maxLength={180} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
          </label>
          <label className="block text-xs font-bold text-slate-700">
            الوصف التعريفي
            <textarea value={fields.description} onChange={event => update("description", event.target.value)} maxLength={500} rows={3} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
          </label>
          <label className="block text-xs font-bold text-slate-700">
            عبارة التركيز
            <input value={fields.focusKeyword} onChange={event => update("focusKeyword", event.target.value)} maxLength={200} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
          </label>
          <label className="block text-xs font-bold text-slate-700">
            عنوان H1
            <input value={fields.h1} onChange={event => update("h1", event.target.value)} maxLength={220} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
          </label>
          <label className="block text-xs font-bold text-slate-700">
            محتوى إضافي يظهر بعد H1 (استخدم ## للعناوين و- للقوائم)
            <textarea value={fields.content} onChange={event => update("content", event.target.value)} maxLength={20000} rows={7} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
          </label>
          {sitemapEligible === false && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">
              حُفظت التعديلات، لكن الصفحة لم تُضف إلى sitemap لأن HTML الحالي لا يثبت canonical ذاتياً قابلاً للفهرسة أو يحتوي على noindex.
            </p>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => onSave(page, { ...fields, path: routePath })}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#1e4941] px-4 text-xs font-bold text-white disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            حفظ، تحديث sitemap، وإعادة الفحص
          </button>
        </div>
      )}
    </details>
  )
}

function PageDetail({
  page, onClose, onFix, onSaveOverride, fixingIssue, fixedIssue,
}: {
  page: SeoAuditPage
  onClose: () => void
  onFix: (page: SeoAuditPage, check: SeoAuditCheck) => void
  onSaveOverride: (page: SeoAuditPage, override: SeoPageOverride) => void
  fixingIssue: string
  fixedIssue: string
}) {
  const [showFullContent, setShowFullContent] = useState(false)
  const checkGroups = [
    { key: "fail", title: "مشكلات تتطلب إجراء", items: page.checks.filter(check => check.status === "fail") },
    { key: "warning", title: "ملاحظات للمراجعة", items: page.checks.filter(check => check.status === "warning") },
    { key: "pass", title: "اجتازت الفحص", items: page.checks.filter(check => check.status === "pass") },
    { key: "unknown", title: "تعذر التحقق", items: page.checks.filter(check => check.status === "unknown") },
  ]
  return (
    <aside className="audit-detail" aria-label="تفاصيل الصفحة">
      <div className="audit-detail-head">
        <div className="min-w-0">
          <span className="audit-eyebrow">تفاصيل الصفحة</span>
          <h3 className="mt-1 truncate text-xl font-extrabold text-[#172c35]">{page.kind}</h3>
        </div>
        <button type="button" onClick={onClose} className="audit-icon-button" aria-label="إغلاق التفاصيل"><X size={18} /></button>
      </div>
      <a className="audit-detail-url" href={page.url} target="_blank" rel="noreferrer">
        <span dir="ltr">{readableUrl(page.url)}</span><ArrowUpRight size={15} />
      </a>

      <div className="audit-detail-score">
        <ScoreRing score={page.score} />
        <div>
          <div className="text-sm font-extrabold text-[#172c35]">نتيجة قائمة الفحص الداخلية</div>
          <p className="mt-1 text-xs leading-6 text-slate-500">تلخص جودة عناصر الصفحة المفحوصة فقط، ولا تمثل ترتيبها في Google.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="audit-mini-chip">HTTP {page.statusCode ?? "—"}</span>
            <span className="audit-mini-chip">{page.wordCount.toLocaleString("ar-SA")} كلمة تقريباً</span>
          </div>
        </div>
      </div>
      {page.kind === "مقال" && (
        <div className={`mt-3 rounded-xl border px-3 py-2.5 text-xs leading-6 ${
          page.rankMathDataMismatch
            ? "border-amber-200 bg-amber-50 text-amber-950"
            : "border-[#dce9e3] bg-[#f5faf7] text-[#426257]"
        }`} role="status">
          <strong>مصدر درجة Rank Math:</strong>{" "}
          {page.rankMathSource === "cms-record"
            ? "سجل المقال المحفوظ، بنفس مدخلات محرر المقال."
            : page.rankMathSource === "published-html"
              ? "HTML المنشور، وليس سجل المحرر."
              : "نتيجة محفوظة قبل توحيد مصدر البيانات."}
          {page.rankMathSource === "cms-record" && page.rankMathDataMismatch && (
            <p>هناك اختلاف بين السجل والنسخة المنشورة. عدد كلمات المحرر {page.rankMathWordCount?.toLocaleString("ar-SA") ?? "—"}، والمنشور {page.wordCount.toLocaleString("ar-SA")} تقريباً؛ كما قد تختلف بيانات العنوان أو الوصف. الدرجة محسوبة من السجل المحفوظ، والتفاصيل أدناه من HTML المنشور.</p>
          )}
          {page.rankMathSource === "cms-record" && !page.rankMathDataMismatch && (
            <p>تطابقت حقول Rank Math المقارنة مع HTML المنشور.</p>
          )}
          {page.rankMathSource === "published-html" && (
            <p>{page.rankMathSourceNote || "لم يُعثر على سجل مقال منشور مطابق؛ قد تختلف الدرجة عن نتيجة المحرر."}</p>
          )}
        </div>
      )}
      {page.htmlFallback && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-6 text-amber-900" role="status">
          استجاب الخادم بنفس HTML لعدة روابط. لا يمكن اعتماد تفاصيل أو درجة هذه الصفحة قبل فحص HTML المنشور لكل مسار.
        </div>
      )}

      <div className="audit-metadata">
        <div><span>عنوان الصفحة</span><p>{page.title || "غير موجود"}</p></div>
        <div><span>الوصف التعريفي</span><p>{page.description || "غير موجود"}</p></div>
        <div><span>عبارة التركيز المضبوطة</span><p>{page.focusKeyword || "لم تُضبط لهذه الصفحة"}</p></div>
        <div><span>Canonical</span><p dir="ltr">{page.canonical || "غير موجود"}</p></div>
        <div><span>تعليمات robots</span><p dir="ltr">{page.robots || "لا توجد تعليمات صريحة"}</p></div>
        <div><span>عناوين H1</span><p>{page.h1.length ? page.h1.join("، ") : "لا يوجد عنوان H1"}</p></div>
        <div><span>تكرار عبارة التركيز</span><p>{page.keywordOccurrences.toLocaleString("ar-SA")} مرة{page.keywordDensity === null ? "" : ` · كثافة ${page.keywordDensity.toFixed(1)}٪`}</p></div>
      </div>
      <details className="mt-3 rounded-xl border border-[#e7eeeb] bg-[#fbfcfb] px-3 py-2.5">
        <summary className="cursor-pointer text-xs font-bold text-[#52685f]">معاينة النص الذي فُحص</summary>
        <p className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-600">
          {page.contentText
            ? `${showFullContent ? page.contentText : page.contentText.slice(0, INLINE_CONTENT_PREVIEW_CHARS)}${!showFullContent && page.contentText.length > INLINE_CONTENT_PREVIEW_CHARS ? "…" : ""}`
            : "لم يُستخرج نص من محتوى الصفحة."}
        </p>
        {page.contentText.length > INLINE_CONTENT_PREVIEW_CHARS && (
          <button
            type="button"
            className="mt-2 text-xs font-bold text-[#286c63] underline underline-offset-4"
            onClick={() => setShowFullContent(value => !value)}
          >
            {showFullContent ? "طي النص" : `عرض النص الكامل (${page.contentText.length.toLocaleString("ar-SA")} حرف)`}
          </button>
        )}
      </details>
      {page.duplicateOf && (
        <div className="audit-duplicate">
          <AlertTriangle size={17} />
          <div><strong>تشابه محتوى محتمل</strong><p dir="ltr">{readableUrl(page.duplicateOf)}</p></div>
        </div>
      )}
      {editableStaticPagePath(page) && (
        <StaticPageOverrideEditor
          key={page.url}
          page={page}
          onSave={onSaveOverride}
          saving={fixingIssue === `${page.url}:manual-override`}
        />
      )}

      <div className="mt-6 flex items-center justify-between">
        <h4 className="text-base font-extrabold text-[#172c35]">نتائج الفحوصات</h4>
        <span className="text-xs text-slate-500">{page.checks.length} فحصاً</span>
      </div>
      <div className="mt-3 space-y-5">
        {checkGroups.filter(group => group.items.length > 0).map(group => (
          <section key={group.key}>
            <h5 className="mb-2 text-xs font-extrabold tracking-wide text-slate-500">{group.title}</h5>
            <div className="space-y-2">
              {group.items.map(check => (
                <article className="audit-check-card" key={check.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h6 className="text-sm font-bold text-[#213740]">{check.label}</h6>
                      <p className="mt-1 text-xs leading-6 text-slate-600">{check.detail}</p>
                    </div>
                    <StatusPill status={check.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-[#e7eeec] pt-2.5 text-[11px] text-slate-500">
                    <span>النقاط: {check.earned} من {check.possible}</span>
                    {check.recommendation && <span className="font-bold text-[#286c63]">التوصية أدناه</span>}
                  </div>
                  {check.recommendation && (
                    <p className="mt-2 rounded-lg bg-[#eef6f3] px-3 py-2 text-xs leading-6 text-[#315e57]">
                      <strong>خطوة مقترحة: </strong>{check.recommendation}
                    </p>
                  )}
                  {check.status !== "pass" && check.status !== "unknown" && (() => {
                    const field = checkField(check, page)
                    const href = editorHref(page, field.key)
                    const issueKey = `${page.url}:${check.id}`
                    return (
                      <div className="mt-3 rounded-lg border border-[#e5ece9] bg-[#f8faf9] p-3">
                        <p className="text-xs leading-6 text-slate-700"><strong>الحقل المقصود:</strong> {field.label}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {href && (
                            <a href={href} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#cbdcd5] bg-white px-3 text-xs font-bold text-[#286c63] hover:bg-[#eef6f3]">
                              فتح السجل والحقل <ArrowUpRight size={13} />
                            </a>
                          )}
                          {aiFixable(check, page) && (editorHref(page, "content") || editableStaticPagePath(page)) && (
                            <button
                              type="button"
                              onClick={() => onFix(page, check)}
                              disabled={fixingIssue === issueKey}
                              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#1e4941] px-3 text-xs font-bold text-white hover:bg-[#286c63] disabled:cursor-wait disabled:opacity-60"
                            >
                              {fixingIssue === issueKey
                                ? <><Loader2 size={13} className="animate-spin" /> جارٍ الإصلاح والحفظ</>
                                : <><Sparkles size={13} /> إصلاح موانع النشر وحفظها</>}
                            </button>
                          )}
                        </div>
                        {fixedIssue === issueKey && <p className="mt-2 text-xs font-bold text-emerald-700">تم حفظ الحقل. أعد فحص الصفحة لتحديث الدرجة والنتائج.</p>}
                      </div>
                    )
                  })()}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  )
}

export default function SeoSiteAudit({
  report,
  onReport,
  persistence,
}: {
  report: SeoAuditReport | null
  onReport: (report: SeoAuditReport) => Promise<SeoAuditSaveResult>
  persistence: SeoAuditPersistence
}) {
  const { toast } = useToast()
  const [progress, setProgress] = useState<SeoAuditProgress | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState("")
  const [cancelled, setCancelled] = useState(false)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [checkFilter, setCheckFilter] = useState("")
  const [pageNumber, setPageNumber] = useState(0)
  const [selectedUrl, setSelectedUrl] = useState("")
  const [sitemapSaving, setSitemapSaving] = useState(false)
  const [sitemapSaved, setSitemapSaved] = useState<number | null>(null)
  const [sitemapFileCount, setSitemapFileCount] = useState<number | null>(null)
  const [fixingIssue, setFixingIssue] = useState("")
  const [fixedIssue, setFixedIssue] = useState("")
  const controllerRef = useRef<AbortController | null>(null)
  const lastProgressAtRef = useRef(0)

  useEffect(() => {
    if (!report) return
    setPageNumber(0)
    setSelectedUrl(current => report.pages.some(page => page.url === current) ? current : report.pages[0]?.url ?? "")
  }, [report])

  async function sitemapIncludesPath(path: string, expectedSiteUrl: string): Promise<boolean> {
    const expectedPath = normalizeSeoOverridePath(path)
    if (!expectedPath) throw new Error("تعذر التحقق من المسار المطلوب في sitemap.")
    const expectedOrigin = new URL(expectedSiteUrl).origin
    const response = await fetch(`${API_BASE}/sitemap.xml`, { cache: "no-store" })
    if (!response.ok) throw new Error(`تعذر قراءة sitemap للتحقق من الإدراج (HTTP ${response.status}).`)
    const rootXml = await response.text()
    const pageLocations = (xml: string) => [...xml.matchAll(/<url\b[^>]*>([\s\S]*?)<\/url>/giu)]
      .map(match => match[1].match(/<loc\b[^>]*>([\s\S]*?)<\/loc>/iu)?.[1]?.trim())
      .filter((value): value is string => Boolean(value))
    let locations = pageLocations(rootXml)
    if (/<sitemapindex\b/iu.test(rootXml)) {
      const childLocations = [...rootXml.matchAll(/<sitemap\b[^>]*>([\s\S]*?)<\/sitemap>/giu)]
        .map(match => match[1].match(/<loc\b[^>]*>([\s\S]*?)<\/loc>/iu)?.[1]?.trim())
        .filter((value): value is string => Boolean(value))
      locations = []
      for (const rawChild of childLocations) {
        const childValue = rawChild.replace(/&amp;/giu, "&")
        const childUrl = new URL(childValue, window.location.origin)
        if (childUrl.origin !== expectedOrigin || !/^\/(?:[^/]+\/)*sitemap[1-9]\d*\.xml$/iu.test(childUrl.pathname)) {
          throw new Error("فهرس خريطة الموقع يحتوي على ملف فرعي خارج النطاق المتوقع.")
        }
        const childResponse = await fetch(childUrl.href, { cache: "no-store", redirect: "error" })
        if (!childResponse.ok) throw new Error(`تعذر قراءة ملف الخريطة الفرعي (HTTP ${childResponse.status}).`)
        const childXml = await childResponse.text()
        if (!/<urlset\b/iu.test(childXml) || /<sitemapindex\b/iu.test(childXml)) {
          throw new Error("ملف الخريطة الفرعي لا يحتوي على قائمة صفحات صالحة.")
        }
        locations.push(...pageLocations(childXml))
      }
    } else if (!/<urlset\b/iu.test(rootXml)) {
      throw new Error("الملف sitemap.xml ليس خريطة صفحات أو فهرساً صالحاً.")
    }
    for (const rawValue of locations) {
      const value = rawValue.replace(/&amp;/giu, "&")
      try {
        const url = new URL(value)
        const listedPath = normalizeSeoOverridePath(decodeURIComponent(url.pathname))
        if (url.origin === expectedOrigin && listedPath === expectedPath) return true
      } catch {
        continue
      }
    }
    return false
  }

  async function buildAndSaveSitemap(verifyPath?: string): Promise<boolean> {
    if (sitemapSaving || running) return false
    setSitemapSaving(true)
    setSitemapSaved(null)
    try {
      const response = await fetch(`${API_BASE}/api/admin/sitemap/save`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken()}` },
      })
      const data = await response.json().catch(() => null) as {
        ok?: boolean; summary?: { totalUrls?: number; siteUrl?: string; sitemapFiles?: string[]; shardCount?: number }; error?: string
      } | null
      if (!response.ok || !data?.ok) throw new Error(data?.error || `فشل إنشاء الخريطة (HTTP ${response.status})`)
      const total = Number(data.summary?.totalUrls) || 0
      const siteUrl = String(data.summary?.siteUrl || window.location.origin)
      const fileCount = Array.isArray(data.summary?.sitemapFiles)
        ? data.summary.sitemapFiles.length
        : Math.max(1, Number(data.summary?.shardCount || 0) + 1)
      if (verifyPath && !await sitemapIncludesPath(verifyPath, siteUrl)) {
        throw new Error(`حُفظت الخريطة، لكن المسار ${verifyPath} غير موجود فيها. لم تُعتبر دورة الإصلاح مكتملة.`)
      }
      setSitemapSaved(total)
      setSitemapFileCount(fileCount)
      toast({
        title: "تم إنشاء خريطة الموقع وحفظها",
        description: `${total.toLocaleString("ar-SA")} رابطاً موزعاً على ${fileCount.toLocaleString("ar-SA")} ${fileCount === 1 ? "ملف" : "ملفات"}.`,
      })
      return true
    } catch (caught) {
      toast({ title: "تعذر إكمال تحديث خريطة الموقع", description: caught instanceof Error ? caught.message : String(caught), variant: "destructive" })
      return false
    } finally {
      setSitemapSaving(false)
    }
  }

  async function buildSitemapAndAudit() {
    const saved = await buildAndSaveSitemap()
    if (saved) await startAudit()
  }

  async function persistStaticOverride(override: SeoPageOverride): Promise<SeoPageOverride> {
    const response = await fetch(`${API_BASE}/api/admin/seo-audit/page-overrides`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken()}` },
      body: JSON.stringify(override),
    })
    const result = await response.json().catch(() => null) as { error?: string; override?: SeoPageOverride } | null
    if (!response.ok || !result?.override) {
      throw new Error(result?.error || `تعذر حفظ تعديل الصفحة (HTTP ${response.status})`)
    }
    if (!await buildAndSaveSitemap(result.override.sitemapEligible ? result.override.path : undefined)) {
      throw new Error("حُفظ تعديل الصفحة، لكن تعذر تحديث sitemap. أعد المحاولة من زر بناء sitemap.")
    }
    await startAudit()
    return result.override
  }

  async function saveStaticOverride(page: SeoAuditPage, override: SeoPageOverride) {
    const issueKey = `${page.url}:manual-override`
    if (fixingIssue) return
    setFixingIssue(issueKey)
    setFixedIssue("")
    try {
      const saved = await persistStaticOverride(override)
      setFixedIssue(issueKey)
      toast({
        title: "حُفظ التعديل وأعيد فحص الصفحة",
        description: saved.sitemapEligible
          ? "الصفحة مؤهلة للإدراج، وتم تحديث sitemap."
          : "حُفظت التعديلات؛ لم تُدرج الصفحة بسبب canonical أو robots الحالي.",
      })
    } catch (caught) {
      toast({
        title: "لم تكتمل دورة الحفظ والفحص",
        description: caught instanceof Error ? caught.message : String(caught),
        variant: "destructive",
      })
    } finally {
      setFixingIssue("")
    }
  }

  async function fixStaticWithAI(page: SeoAuditPage, check: SeoAuditCheck) {
    const routePath = editableStaticPagePath(page)
    if (!routePath) throw new Error("مسار الصفحة غير مسموح للتحرير الثابت.")
    const headers = { Authorization: `Bearer ${adminToken()}` }
    const currentResponse = await fetch(
      `${API_BASE}/api/admin/seo-audit/page-overrides?path=${encodeURIComponent(routePath)}`,
      { headers },
    )
    const currentResult = await currentResponse.json().catch(() => null) as { override?: SeoPageOverride | null; error?: string } | null
    if (!currentResponse.ok) throw new Error(currentResult?.error || "تعذر تحميل التعديل الحالي.")
    const current = currentResult?.override || {
      path: routePath,
      seoTitle: page.title,
      description: page.description,
      focusKeyword: page.focusKeyword,
      h1: page.h1[0] || "",
      content: "",
    }
    const response = await fetch(`${API_BASE}/api/admin/ai/fix-static-seo-check`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        url: page.url,
        checkId: check.id,
        page: {
          path: routePath,
          title: page.title,
          seoTitle: current.seoTitle || page.title,
          description: current.description || page.description,
          focusKeyword: current.focusKeyword || page.focusKeyword,
          h1: current.h1 || page.h1[0] || "",
          h1Text: current.h1 || page.h1[0] || "",
          headings: page.h1,
          content: current.content || "",
          contentText: page.contentText.slice(0, 18_000),
          canonical: page.canonical,
          robots: page.robots,
          wordCount: page.wordCount,
        },
      }),
    })
    const suggestion = await response.json().catch(() => null) as {
      payload?: Partial<SeoPageOverride>
      fieldLabel?: string
      error?: string
    } | null
    if (!response.ok || !suggestion?.payload) {
      throw new Error(suggestion?.error || `تعذر إعداد إصلاح AI (HTTP ${response.status})`)
    }
    const saved = await persistStaticOverride({ ...current, ...suggestion.payload, path: routePath })
    const issueKey = `${page.url}:${check.id}`
    setFixedIssue(issueKey)
    toast({
      title: "حُفظ إصلاح AI وأعيد فحص الصفحة",
      description: `${suggestion.fieldLabel || check.label} · ${saved.sitemapEligible ? "أُعيد بناء sitemap" : "لم تُدرج بسبب canonical أو robots"}`,
    })
  }

  async function fixWithAI(page: SeoAuditPage, check: SeoAuditCheck) {
    const issueKey = `${page.url}:${check.id}`
    if (fixingIssue) return
    setFixingIssue(issueKey)
    setFixedIssue("")
    try {
      if (editableStaticPagePath(page)) {
        await fixStaticWithAI(page, check)
        return
      }
      const response = await fetch(`${API_BASE}/api/admin/ai/fix-seo-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken()}` },
        body: JSON.stringify({ url: page.url, checkId: check.id, fixAllBlocking: true }),
      })
      const suggestion = await response.json().catch(() => null) as {
        resource?: "posts" | "seo-pages" | "services" | "packages"
        recordId?: number
        payload?: Record<string, string>
        fieldLabel?: string
        fixedChecks?: string[]
        error?: string
      } | null
      if (!response.ok || !suggestion?.resource || !suggestion.recordId || !suggestion.payload) {
        throw new Error(suggestion?.error || `تعذر إعداد الإصلاح (HTTP ${response.status})`)
      }

      const savePath = suggestion.resource === "services"
        ? `/api/services/${suggestion.recordId}`
        : suggestion.resource === "packages"
          ? `/api/packages/${suggestion.recordId}`
        : `/api/admin/${suggestion.resource}/${suggestion.recordId}`
      const saveResponse = await fetch(`${API_BASE}${savePath}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken()}` },
        body: JSON.stringify(suggestion.payload),
      })
      const saved = await saveResponse.json().catch(() => null) as { error?: string } | null
      if (!saveResponse.ok) throw new Error(saved?.error || `رفضت بوابة النشر حفظ التغيير (HTTP ${saveResponse.status})`)
      if (!await buildAndSaveSitemap()) throw new Error("تم حفظ الإصلاح، لكن تعذر تحديث sitemap.")
      await startAudit()
      setFixedIssue(issueKey)
      toast({
        title: "تم إصلاح موانع النشر وحفظها",
        description: `الفحوص: ${suggestion.fixedChecks?.length ?? 1} · الحقول: ${suggestion.fieldLabel || "بيانات الصفحة"}`,
      })
    } catch (caught) {
      toast({
        title: "لم يُحفظ الإصلاح",
        description: caught instanceof Error ? caught.message : String(caught),
        variant: "destructive",
      })
    } finally {
      setFixingIssue("")
    }
  }

  async function startAudit() {
    if (running) return
    const controller = new AbortController()
    controllerRef.current = controller
    setRunning(true)
    setError("")
    setCancelled(false)
    setProgress({ completed: 0, total: 0 })
    lastProgressAtRef.current = 0
    try {
      const result = await runSeoSiteAudit({
        signal: controller.signal,
        adminToken: adminToken(),
        onProgress: update => {
          const now = performance.now()
          if (update.completed === update.total || now - lastProgressAtRef.current >= 200) {
            lastProgressAtRef.current = now
            setProgress({ ...update })
          }
        },
      })
      const saved = await onReport(result)
      setSelectedUrl(current => result.pages.some(page => page.url === current) ? current : result.pages[0]?.url ?? "")
      if (saved.status === "server") {
        toast({ title: "اكتمل الفحص وحُفظت نتيجته", description: "ستبقى النتيجة متاحة عند الرجوع إلى الصفحة وللمستخدمين المخولين." })
      } else if (saved.status === "local") {
        toast({
          title: "اكتمل الفحص وحُفظت نسخة محلية فقط",
          description: saved.message
            ? `${saved.message} لن تظهر النتيجة على الأجهزة أو الحسابات الأخرى حتى ينجح الحفظ على الخادم.`
            : "تعذر حفظه على الخادم؛ حُفظت نسخة على هذا المتصفح فقط.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "اكتمل الفحص دون حفظ دائم",
          description: saved.message,
          variant: "destructive",
        })
      }
    } catch (caught) {
      if (controller.signal.aborted) setCancelled(true)
      else setError(caught instanceof Error ? caught.message : "تعذر إكمال فحص خريطة الموقع.")
    } finally {
      controllerRef.current = null
      setRunning(false)
    }
  }

  function cancelAudit() {
    controllerRef.current?.abort()
  }

  const visiblePages = useMemo(() => {
    if (!report) return []
    const normalizedQuery = query.trim().toLocaleLowerCase("ar")
    return report.pages.filter(page => {
      const matchesFilter = filter === "all" || (filter === "warning" && page.htmlFallback) || page.checks.some(check => check.status === filter)
      const matchesCheck = !checkFilter || page.checks.some(check =>
        check.id === checkFilter && check.status !== "pass" && check.status !== "unknown",
      )
      const searchable = `${page.url} ${page.kind} ${page.title} ${page.focusKeyword}`.toLocaleLowerCase("ar")
      return matchesFilter && matchesCheck && (!normalizedQuery || searchable.includes(normalizedQuery))
    })
  }, [report, query, filter, checkFilter])

  const failureTypeCounts = useMemo(() => {
    if (!report) return []
    const byId = new Map<string, { label: string; count: number }>()
    for (const page of report.pages) {
      const seenOnPage = new Set<string>()
      for (const check of page.checks) {
        if (check.status === "pass" || check.status === "unknown" || seenOnPage.has(check.id)) continue
        seenOnPage.add(check.id)
        const current = byId.get(check.id) ?? { label: check.label, count: 0 }
        current.count += 1
        byId.set(check.id, current)
      }
    }
    return [...byId.entries()]
      .map(([id, value]) => ({ id, ...value }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
  }, [report])
  const pageScoreSummary = useMemo(() => {
    if (!report) return { perfect: 0, withWarnings: 0, withFailures: 0 }
    return report.pages.reduce((summary, page) => {
      if (page.score === 100) summary.perfect += 1
      if (page.checks.some(check => check.status === "warning")) summary.withWarnings += 1
      if (page.checks.some(check => check.status === "fail")) summary.withFailures += 1
      return summary
    }, { perfect: 0, withWarnings: 0, withFailures: 0 })
  }, [report])

  const pageCount = Math.max(1, Math.ceil(visiblePages.length / PAGE_SIZE))
  const currentPageNumber = Math.min(pageNumber, pageCount - 1)
  const pageStart = currentPageNumber * PAGE_SIZE
  const paginatedPages = visiblePages.slice(pageStart, pageStart + PAGE_SIZE)
  const selectedPage = report?.pages.find(page => page.url === selectedUrl) ?? null
  const percent = progress?.total ? Math.min(100, Math.round(progress.completed / progress.total * 100)) : 0
  const isPartial = Boolean(report && (
    report.checkedUrls < report.totalUrls
    || report.failedRequests > 0
    || report.renderFallbackDetected
    || report.htmlInventoryAvailable === false
  ))

  return (
    <section dir="rtl" className="seo-audit-shell">
      <style>{`
        .seo-audit-shell{--audit-ink:#172c35;--audit-teal:#286c63;--audit-mist:#f4f7f4;--audit-line:#dfe9e5;min-height:500px;color:var(--audit-ink);font-family:var(--app-font-sans,'Tajawal',sans-serif)}
        .seo-audit-shell *{box-sizing:border-box}
        .audit-score-ring{width:78px;height:78px;flex:0 0 auto;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--ring-color) var(--score),#e4ece8 0);position:relative}
        .audit-score-ring:before{content:'';position:absolute;inset:6px;border-radius:inherit;background:#fff}
        .audit-score-good{--ring-color:#398875}.audit-score-warn{--ring-color:#d39a35}.audit-score-bad{--ring-color:#c45a4e}
        .audit-score-core{position:relative;display:flex;align-items:center;flex-direction:column;line-height:1.1}.audit-score-core strong{font-size:24px;font-weight:900;letter-spacing:-.04em}.audit-score-core span{margin-top:4px;font-size:9px;color:#758580}
        .audit-icon-button{display:grid;width:36px;height:36px;place-items:center;border:1px solid #dfe8e4;border-radius:11px;background:#fff;color:#586c66;transition:transform .18s,background .18s}.audit-icon-button:hover{background:#f2f6f3;transform:translateY(-1px)}
        .audit-detail{position:sticky;top:16px;max-height:calc(100dvh - 32px);overflow:auto;border:1px solid var(--audit-line);border-radius:18px;background:#fff;padding:20px;box-shadow:0 14px 40px rgba(23,44,53,.06)}
        .audit-detail-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.audit-eyebrow{font-size:10px;font-weight:900;letter-spacing:.12em;color:#5c887e}
        .audit-detail-url{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:15px;padding:10px 12px;border-radius:10px;background:#f3f7f5;color:#536862;font:11px ui-monospace,monospace;text-decoration:none}.audit-detail-url span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.audit-detail-url:hover{color:#286c63}
        .audit-detail-score{display:flex;align-items:center;gap:15px;margin-top:18px;padding:15px;border:1px solid #e5ece9;border-radius:14px;background:#fbfcfb}
        .audit-mini-chip{display:inline-flex;border:1px solid #e3ebe7;border-radius:99px;background:#fff;padding:4px 8px;font-size:10px;color:#5c716a}
        .audit-metadata{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}.audit-metadata>div{min-width:0;padding-bottom:10px;border-bottom:1px solid #edf1ef}.audit-metadata>div:nth-child(1),.audit-metadata>div:nth-child(2){grid-column:span 2}.audit-metadata span{display:block;margin-bottom:4px;font-size:10px;font-weight:800;color:#84928d}.audit-metadata p{margin:0;overflow-wrap:anywhere;font-size:12px;line-height:1.7;color:#344b45}
        .audit-duplicate{display:flex;gap:10px;margin-top:14px;padding:12px;border:1px solid #f1d9a9;border-radius:12px;background:#fff9ed;color:#9a6b19}.audit-duplicate strong{font-size:12px}.audit-duplicate p{margin:4px 0 0;font:10px ui-monospace,monospace;overflow-wrap:anywhere}
        .audit-check-card{padding:13px;border:1px solid #e7eeeb;border-radius:12px;background:#fff}.audit-check-card+ .audit-check-card{margin-top:8px}
        .audit-page-row{transition:background .16s,border-color .16s,transform .16s}.audit-page-row:hover{transform:translateY(-1px)}.audit-page-row[aria-current=true]{border-color:#82b4a7!important;background:#f2f8f5!important;box-shadow:inset -3px 0 #398875}
        .audit-skeleton{background:linear-gradient(90deg,#edf2ef 25%,#f7f9f7 40%,#edf2ef 60%);background-size:300% 100%;animation:audit-shimmer 1.4s ease infinite}
        @keyframes audit-shimmer{to{background-position:-150% 0}}
        @media(max-width:900px){.audit-detail{position:static;max-height:none}.audit-result-layout{grid-template-columns:1fr!important}.audit-list-panel{order:2}.audit-detail-panel{order:1}}
        @media(max-width:560px){.audit-metadata{grid-template-columns:1fr}.audit-metadata>div:nth-child(1),.audit-metadata>div:nth-child(2){grid-column:span 1}.audit-detail{padding:15px}.audit-summary-grid{grid-template-columns:1fr 1fr!important}.audit-report-bar{align-items:flex-start!important;flex-direction:column}}
        @media(prefers-reduced-motion:reduce){.seo-audit-shell *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
      `}</style>

      <header className="relative overflow-hidden rounded-[22px] bg-[#172c35] p-6 text-white sm:p-8">
        <div className="absolute -left-12 -top-20 h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute -left-1 top-8 h-44 w-44 rounded-full border border-[#83b4a7]/20" />
        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-[#b9d8ce]">
              <Activity size={14} /> مساحة الظهور في البحث
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-[38px]">تدقيق صفحات الموقع</h1>
            <p className="mt-2 max-w-xl text-sm leading-7 text-white/65">
              فحص عملي لعناصر SEO في صفحات خريطة الموقع، من العنوان والوصف إلى الروابط والمحتوى.
            </p>
            <div className="mt-4 flex items-start gap-2 border-r-2 border-[#d6a54d] pr-3 text-xs leading-6 text-white/65">
              <Gauge size={15} className="mt-1 shrink-0 text-[#e5bc70]" />
              <span>النتيجة من ٠ إلى ١٠٠ تلخص قائمة الفحص الداخلية فقط. قياس الظهور والترتيب الفعلي يحتاج بيانات Google Search Console.</span>
            </div>
            <p className="mt-2 text-xs leading-6 text-white/55">يجب تشغيل الفحص من الموقع المنشور؛ معاينة التطوير تعرض غلاف التطبيق ولا تمثل HTML النهائي لكل صفحة.</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => buildAndSaveSitemap()}
              disabled={sitemapSaving || running}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-extrabold text-white transition-all hover:bg-white/15 disabled:cursor-wait disabled:opacity-60"
            >
              {sitemapSaving ? <><Loader2 size={16} className="animate-spin" /> جارٍ البناء والحفظ</> : <><Save size={16} /> بناء وحفظ خريطة الموقع</>}
            </button>
            <a
              href={`${API_BASE}/sitemap.xml`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-bold text-white/90 transition-all hover:bg-white/15"
            >
              <ExternalLink size={15} /> عرض الخريطة
            </a>
            <button
              type="button"
              onClick={buildSitemapAndAudit}
              disabled={sitemapSaving || running}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d7aa58] px-4 text-sm font-extrabold text-[#172c35] shadow-[0_8px_24px_rgba(215,170,88,.2)] transition-all hover:-translate-y-0.5 hover:bg-[#e4bb73] disabled:cursor-wait disabled:opacity-60"
            >
              {sitemapSaving || running
                ? <><Loader2 size={16} className="animate-spin" /> جارٍ التحديث والتدقيق</>
                : <><Play size={15} fill="currentColor" /> بناء الخريطة وتدقيق الصفحات</>}
            </button>
            <button
              type="button"
              onClick={running ? cancelAudit : startAudit}
              className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold transition-all focus:outline-none focus:ring-2 focus:ring-[#d6a54d] focus:ring-offset-2 focus:ring-offset-[#172c35] ${running ? "border border-white/20 bg-white/10 text-white hover:bg-white/15" : "bg-[#d7aa58] text-[#172c35] shadow-[0_8px_24px_rgba(215,170,88,.2)] hover:-translate-y-0.5 hover:bg-[#e4bb73]"}`}
            >
              {running ? <><X size={17} /> إيقاف الفحص</> : <><Play size={16} fill="currentColor" /> {report ? "إعادة فحص HTML المنشور" : "ابدأ فحص HTML المنشور"}</>}
            </button>
          </div>
        </div>
        {sitemapSaved !== null && <p className="relative z-10 mt-3 text-xs font-bold text-[#c4e6d7]" role="status">حُفظت {sitemapFileCount?.toLocaleString("ar-SA") ?? "1"} ملفات خريطة وتغطي {sitemapSaved.toLocaleString("ar-SA")} رابطاً.</p>}
      </header>

      {running && (
        <div className="mt-5 rounded-2xl border border-[#dce8e3] bg-white p-5 shadow-sm" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf4ef] text-[#367b6b]"><Loader2 className="animate-spin" size={19} /></span>
              <div><div className="text-sm font-extrabold">يجري فحص صفحات الخريطة</div><div className="mt-1 text-xs text-slate-500">{progress?.total ? `${progress.completed.toLocaleString("ar-SA")} من ${progress.total.toLocaleString("ar-SA")} صفحة` : "جارٍ تحميل خريطة الموقع…"}</div></div>
            </div>
            <span className="font-mono text-sm font-bold text-[#367b6b]" dir="ltr">{progress?.total ? `${percent}%` : "…"}</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#edf2ef]"><div className="h-full rounded-full bg-[#398875] transition-[width] duration-300" style={{ width: `${percent}%` }} /></div>
          {progress?.currentUrl && <p className="mt-3 truncate text-xs text-slate-500" dir="ltr">الصفحة الحالية: {readableUrl(progress.currentUrl)}</p>}
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400"><Clock3 size={13} /> قد يستغرق الفحص وقتاً بحسب عدد الصفحات واستجابة الموقع.</div>
        </div>
      )}

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800" role="alert">
          <ShieldAlert size={19} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1"><p className="font-bold">تعذر إكمال الفحص</p><p className="mt-1 text-sm leading-6">{error}</p><button type="button" onClick={startAudit} className="mt-3 text-sm font-extrabold underline underline-offset-4">حاول مرة أخرى</button></div>
        </div>
      )}
      {cancelled && !running && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle size={17} /> تم إيقاف الفحص. {report ? "ما زالت نتائج الفحص السابق معروضة." : "ابدأ فحصاً جديداً عند الاستعداد."}
        </div>
      )}

      {!report && !running && !error && (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <div className="flex min-h-56 flex-col justify-center rounded-2xl border border-dashed border-[#cbd9d3] bg-white p-7">
            <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf4ef] text-[#367b6b]"><FileSearch size={23} /></span>
            <h2 className="text-xl font-extrabold">ابدأ من خريطة الموقع</h2>
            <p className="mt-2 max-w-lg text-sm leading-7 text-slate-600">سيُقرأ sitemap.xml ثم تُراجع الصفحات المنشورة واحدةً تلو الأخرى. لن يبدأ الفحص حتى تطلبه.</p>
          </div>
          <div className="rounded-2xl border border-[#e2eae6] bg-[#edf4f0] p-6">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#31564c]"><Globe2 size={17} /> ما الذي يقيسه هذا التدقيق؟</div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[#526a61]">
              <li className="flex gap-2"><Check size={15} className="mt-1 shrink-0 text-[#438a73]" /> عناصر الصفحة ووضوح بياناتها التقنية.</li>
              <li className="flex gap-2"><Check size={15} className="mt-1 shrink-0 text-[#438a73]" /> تكرار العناوين وتشابه المحتوى بين الصفحات.</li>
              <li className="flex gap-2"><Link2 size={15} className="mt-1 shrink-0 text-[#438a73]" /> توصيات محددة قابلة للمراجعة والتنفيذ.</li>
            </ul>
          </div>
        </div>
      )}

      {running && !report && (
        <div className="mt-5 grid gap-4 md:grid-cols-3" aria-hidden="true">
          {[0, 1, 2].map(item => <div className="rounded-2xl border border-[#e5ece8] bg-white p-5" key={item}><div className="audit-skeleton h-3 w-24 rounded" /><div className="audit-skeleton mt-5 h-9 w-16 rounded" /><div className="audit-skeleton mt-4 h-2 w-full rounded" /></div>)}
        </div>
      )}

      {report && (
        <div className="mt-5">
          {report.rankMathScoreVersion !== SEO_AUDIT_RANK_MATH_SCORE_VERSION && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950" role="alert">
              <AlertTriangle size={19} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-extrabold">نتيجة التدقيق محفوظة من إصدار سابق</p>
                <p className="mt-1 text-sm leading-6">هذه النتيجة لا تشمل فهرس ملفات HTML المنشورة كاملاً. أعد الفحص بعد تحديث الخريطة لمراجعة كل ملف HTML متاح على الخادم.</p>
              </div>
            </div>
          )}
          {report.renderFallbackDetected && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950" role="alert">
              <AlertTriangle size={19} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-extrabold">تعذر اعتماد درجات الصفحات: الخادم أعاد HTML متطابقاً لروابط متعددة</p>
                <p className="mt-1 text-sm leading-6">تم اكتشاف ذلك في {report.renderFallbackPageCount.toLocaleString("ar-SA")} صفحة. غالباً يجري الفحص من معاينة التطوير أو من إعداد يعيد غلاف React لكل مسار. أعد الفحص من الموقع المنشور بعد التأكد من أن كل رابط يعرض صفحته الخاصة؛ لن نعرض متوسطاً مضللاً.</p>
              </div>
            </div>
          )}
          <div className="audit-summary-grid grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#e0e9e5] bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500"><span>متوسط قائمة الفحص</span><Gauge size={16} className="text-[#438a73]" /></div>
              <div className="mt-3 flex items-baseline gap-1"><strong className="text-3xl font-black text-[#213a34]">{report.averageScore ?? "—"}</strong><span className="text-xs text-slate-400">/١٠٠</span></div>
              <div className="mt-2 text-[10px] leading-5 text-slate-400">ليس ترتيب Google أو مقياساً له.</div>
            </div>
            <div className="rounded-2xl border border-[#d4e9dd] bg-[#f3faf5] p-4 sm:p-5"><div className="flex items-center justify-between text-xs font-bold text-emerald-800"><span>اجتازت الفحص</span><CheckCircle2 size={16} /></div><strong className="mt-3 block text-3xl font-black text-emerald-800">{report.passCount.toLocaleString("ar-SA")}</strong><div className="mt-2 text-[10px] text-emerald-700/70">عناصر فحص ناجحة</div></div>
            <div className="rounded-2xl border border-[#f0e3c7] bg-[#fffaf0] p-4 sm:p-5"><div className="flex items-center justify-between text-xs font-bold text-amber-900"><span>تحذيرات</span><AlertTriangle size={16} /></div><strong className="mt-3 block text-3xl font-black text-amber-900">{report.warningCount.toLocaleString("ar-SA")}</strong><div className="mt-2 text-[10px] text-amber-800/70">تحتاج مراجعة بشرية</div></div>
            <div className="rounded-2xl border border-[#f0d8d5] bg-[#fff7f6] p-4 sm:p-5"><div className="flex items-center justify-between text-xs font-bold text-rose-800"><span>مشكلات</span><XCircle size={16} /></div><strong className="mt-3 block text-3xl font-black text-rose-800">{report.failCount.toLocaleString("ar-SA")}</strong><div className="mt-2 text-[10px] text-rose-700/70">عناصر فشلت في الفحص</div></div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-[#dfe9e5] bg-white px-4 py-3 text-xs text-slate-600" aria-label="ملخص نتائج الصفحات">
            <strong className="text-[#172c35]">ملخص الصفحات:</strong>
            <span><b className="text-emerald-800">{pageScoreSummary.perfect.toLocaleString("ar-SA")}</b> صفحة بنتيجة 100/100</span>
            <span><b className="text-amber-800">{pageScoreSummary.withWarnings.toLocaleString("ar-SA")}</b> صفحة بها تحذيرات</span>
            <span><b className="text-rose-800">{pageScoreSummary.withFailures.toLocaleString("ar-SA")}</b> صفحة بها مشكلات</span>
          </div>

          <div className={`audit-report-bar mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${isPartial ? "border-amber-200 bg-amber-50 text-amber-900" : "border-[#dfe9e5] bg-white text-slate-600"}`}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="inline-flex items-center gap-1.5 font-bold"><Globe2 size={14} /> {report.checkedUrls.toLocaleString("ar-SA")} من {report.totalUrls.toLocaleString("ar-SA")} صفحة</span>
              <span>خريطة الموقع: HTTP {report.sitemapStatus}</span>
              <span>طلبات متعثرة: {report.failedRequests.toLocaleString("ar-SA")}</span>
              {report.htmlInventoryAvailable && <span>ملفات HTML: {report.htmlInventoryCount?.toLocaleString("ar-SA") ?? "—"}</span>}
              {report.htmlInventoryAvailable && (report.sitemapOmissionCount ?? 0) > 0 && <span>غير مدرجة في sitemap: {report.sitemapOmissionCount?.toLocaleString("ar-SA")}</span>}
            </div>
            <span>اكتمل {formatDate(report.completedAt)}</span>
          </div>
          {isPartial && <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900"><AlertTriangle size={14} className="mt-0.5 shrink-0" />هذه نتيجة جزئية: تعذّر جلب بعض الصفحات أو لم يكتمل فحص جميع روابط الخريطة. راجع حالة HTTP لكل صفحة قبل اتخاذ إجراء.</div>}
          {report.htmlInventoryAvailable === false && <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900"><AlertTriangle size={14} className="mt-0.5 shrink-0" />لم يتوفر فهرس ملفات HTML على الخادم؛ فُحصت روابط sitemap فقط. {report.inventoryError || "تأكد من تحديث واجهة API المنشورة."}</div>}
          {report.sitemapOmissionCount ? <div className="mt-2 flex items-start gap-2 rounded-lg bg-[#eef4f1] px-3 py-2 text-xs leading-5 text-[#52685f]"><FileSearch size={14} className="mt-0.5 shrink-0" />أُضيفت {report.sitemapOmissionCount.toLocaleString("ar-SA")} صفحة HTML منشورة غير مدرجة في sitemap إلى التقرير ولم توقف عملية الفحص.</div> : null}
          <div className="mt-2 flex items-start gap-2 rounded-lg bg-[#eef4f1] px-3 py-2 text-xs leading-5 text-[#52685f]"><CircleHelp size={14} className="mt-0.5 shrink-0" />النتائج أعلاه فحوصات داخل الصفحة وليست بيانات أداء بحث. استخدم Google Search Console للتحقق من الانطباعات والنقرات والترتيب الفعلي.</div>

          {failureTypeCounts.length > 0 && (
            <section className="mt-4 rounded-2xl border border-[#e0e9e5] bg-white p-4" aria-label="أنواع مشكلات SEO">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><h2 className="text-sm font-extrabold">أسباب التعثر حسب نوع الفحص</h2><p className="mt-1 text-xs text-slate-500">اختر سبباً لعرض الصفحات المتأثرة به.</p></div>
                {checkFilter && <button type="button" onClick={() => setCheckFilter("")} className="text-xs font-bold text-[#286c63] underline underline-offset-4">مسح التصفية</button>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {failureTypeCounts.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setCheckFilter(current => current === item.id ? "" : item.id); setPageNumber(0) }}
                    aria-pressed={checkFilter === item.id}
                    className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition-colors ${checkFilter === item.id ? "border-[#286c63] bg-[#eaf4ef] text-[#1e4941]" : "border-[#e2eae6] bg-[#fbfcfb] text-slate-700 hover:bg-[#f2f7f4]"}`}
                  >
                    <span>{item.label}</span><span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] text-slate-500">{item.count.toLocaleString("ar-SA")} صفحة</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="audit-result-layout mt-5 grid grid-cols-[minmax(300px,.85fr)_minmax(0,1.15fr)] items-start gap-4">
            <div className="audit-list-panel overflow-hidden rounded-2xl border border-[#e0e9e5] bg-white">
              <div className="border-b border-[#e8eeeb] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div><h2 className="text-base font-extrabold">صفحات الموقع</h2><p className="mt-1 text-xs text-slate-500">{visiblePages.length.toLocaleString("ar-SA")} صفحة مطابقة</p></div>
                  <ListFilter size={17} className="text-[#668278]" />
                </div>
                <label className="mt-4 flex h-10 items-center gap-2 rounded-xl border border-[#dfe8e3] bg-[#fbfcfb] px-3 focus-within:border-[#76a99b] focus-within:ring-2 focus-within:ring-[#76a99b]/15">
                  <Search size={15} className="shrink-0 text-slate-400" />
                  <input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث بعنوان أو رابط أو عبارة…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" aria-label="البحث في الصفحات" />
                  {query && <button type="button" onClick={() => setQuery("")} aria-label="مسح البحث" className="text-slate-400 hover:text-slate-700"><X size={15} /></button>}
                </label>
                <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
                  {([
                    ["all", "الكل"],
                    ["fail", "مشكلات"],
                    ["warning", "تحذيرات"],
                    ["pass", "سليم"],
                  ] as [Filter, string][]).map(([value, label]) => (
                    <button type="button" key={value} onClick={() => setFilter(value)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${filter === value ? "bg-[#1e4941] text-white" : "bg-[#f2f6f4] text-slate-600 hover:bg-[#e7efeb]"}`}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="max-h-[670px] space-y-2 overflow-y-auto p-3">
                {paginatedPages.map((page, index) => {
                  const failures = page.checks.filter(check => check.status === "fail").length
                  const warnings = page.checks.filter(check => check.status === "warning").length + (page.htmlFallback ? 1 : 0)
                  const pageStatus: SeoAuditCheck["status"] = failures ? "fail" : warnings ? "warning" : "pass"
                  return (
                    <button type="button" className="audit-page-row block w-full rounded-xl border border-[#e8eeeb] bg-white p-3 text-right" key={page.url} aria-current={selectedUrl === page.url} onClick={() => setSelectedUrl(page.url)}>
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f0f5f2] font-mono text-[10px] font-bold text-[#6c8279]">{String(pageStart + index + 1).padStart(2, "0")}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2"><span className="truncate text-sm font-extrabold text-[#263e37]">{page.title || "بدون عنوان"}</span><ChevronLeft size={14} className="shrink-0 text-slate-400" /></span>
                          <span className="mt-1 block truncate font-mono text-[10px] text-slate-400" dir="ltr">{readableUrl(page.url)}</span>
                          <span className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-md bg-[#f2f5f3] px-1.5 py-1 text-[10px] text-slate-500">{page.kind}</span>
                            <span className="rounded-md bg-[#f2f5f3] px-1.5 py-1 text-[10px] text-slate-500">HTTP {page.statusCode ?? "—"}</span>
                            {page.htmlFallback && <span className="rounded-md bg-amber-100 px-1.5 py-1 text-[10px] font-bold text-amber-800">HTML متطابق</span>}
                            {failures > 0 && <span className="text-[10px] font-bold text-rose-700">{failures} مشكلة</span>}
                            {warnings > 0 && <span className="text-[10px] font-bold text-amber-800">{warnings} تحذير</span>}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-center">
                          <strong className={`text-lg font-black ${page.score === null ? "text-slate-400" : page.score >= RANK_MATH_EDITOR_POLICY.minimumPublishScore ? "text-emerald-700" : "text-rose-700"}`}>{page.score ?? "—"}</strong>
                          <span className="text-[9px] text-slate-400">من ١٠٠</span>
                        </span>
                      </div>
                    </button>
                  )
                })}
                {visiblePages.length > PAGE_SIZE && (
                  <nav className="flex items-center justify-between gap-2 border-t border-[#edf1ef] px-1 pt-3" aria-label="التنقل بين صفحات نتائج التدقيق">
                    <button
                      type="button"
                      onClick={() => setPageNumber(current => Math.max(0, current - 1))}
                      disabled={currentPageNumber === 0}
                      className="rounded-lg border border-[#dfe8e3] px-3 py-2 text-xs font-bold text-[#52685f] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      السابق
                    </button>
                    <span className="text-xs text-slate-500">صفحة {(currentPageNumber + 1).toLocaleString("ar-SA")} من {pageCount.toLocaleString("ar-SA")}</span>
                    <button
                      type="button"
                      onClick={() => setPageNumber(current => Math.min(pageCount - 1, current + 1))}
                      disabled={currentPageNumber >= pageCount - 1}
                      className="rounded-lg border border-[#dfe8e3] px-3 py-2 text-xs font-bold text-[#52685f] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      التالي
                    </button>
                  </nav>
                )}
                {visiblePages.length === 0 && (
                  <div className="px-4 py-12 text-center">
                    <Search size={23} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-slate-600">لا توجد صفحات مطابقة</p>
                    <p className="mt-1 text-xs text-slate-400">غيّر عبارة البحث أو حالة الفحص.</p>
                    <button type="button" onClick={() => { setQuery(""); setFilter("all") }} className="mt-3 text-xs font-extrabold text-[#286c63] underline underline-offset-4">إزالة عوامل التصفية</button>
                  </div>
                )}
              </div>
            </div>
            <div className="audit-detail-panel min-w-0">
              {selectedPage ? <PageDetail key={selectedPage.url} page={selectedPage} onClose={() => setSelectedUrl("")} onFix={fixWithAI} onSaveOverride={saveStaticOverride} fixingIssue={fixingIssue} fixedIssue={fixedIssue} /> : (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd9d3] bg-white p-8 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#eef4f1] text-[#5e8478]"><FileSearch size={23} /></span>
                  <h3 className="mt-4 font-extrabold">اختر صفحة لعرض التفاصيل</h3>
                  <p className="mt-1 max-w-xs text-xs leading-6 text-slate-500">ستظهر بيانات SEO وقائمة الفحوصات والتوصيات لهذه الصفحة.</p>
                </div>
              )}
            </div>
          </div>
          <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#e2eae6] pt-3 text-[10px] text-slate-400">
            <span>
              آخر فحص {formatDate(report.completedAt)} · {
                persistence === "server"
                  ? "محفوظ على الخادم"
                  : persistence === "local"
                    ? "محفوظ على هذا المتصفح فقط"
                    : "لم تُحفظ نسخة دائمة"
              }
            </span>
            <span className="inline-flex items-center gap-1"><Globe2 size={12} /> خريطة الموقع <span dir="ltr">{report.sitemapUrl}</span></span>
          </footer>
        </div>
      )}
    </section>
  )
}
