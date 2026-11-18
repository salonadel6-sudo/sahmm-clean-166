import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, TrendingUp, TrendingDown, Minus, FileText,
  CheckCircle, AlertTriangle, XCircle, RefreshCw, Plus, Trash2,
  Edit2, Save, Copy, ExternalLink, Target,
  ArrowUp, ArrowDown, Eye, Clock,
  Info, BookOpen, Loader2,
  Sparkles, Bot, Shield, Check, Play, FileCode2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useSeoAuditReport } from "@/hooks/useSeoAuditReport"
import type { SeoAuditReport } from "@/lib/seo-audit"
import { siteUrl } from "@/lib/siteUrl"
import { replaceLegacyCompanyName, useSiteSettings } from "@/context/SiteSettingsContext"
import { useGetServices } from "@workspace/api-client-react"
import SeoSiteAudit from "@/components/admin/SeoSiteAudit"
import { getRankMathStatusClass, RankMathPanel } from "@/components/admin/RankMathPanel"
import SeoKeywordTopicMap from "@/components/admin/SeoKeywordTopicMap"
import type { SeoKeywordTopicMap as SeoKeywordTopicMapData } from "@workspace/api-client-react"
import {
  analyzeRankMathSeo,
  analyzeRankMathSiteKeywordStrength,
  normalizeRankMathKeywordPhrase,
  RANK_MATH_EDITOR_POLICY,
} from "@workspace/seo-rank-math"
import "./seo-panel.css"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""
const currentOrigin = () => typeof window !== "undefined" ? window.location.origin : ""

function collectHomepageText(value: unknown): string {
  if (typeof value === "string") return /^https?:\/\//iu.test(value) ? "" : value
  if (Array.isArray(value)) return value.map(collectHomepageText).filter(Boolean).join(" ")
  if (value && typeof value === "object") return Object.values(value).map(collectHomepageText).filter(Boolean).join(" ")
  return ""
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Keyword {
  id: string
  term: string
  position: number | null
  volume: number | null
  difficulty: number | null // 0-100; null means not provided
  trend: "up" | "down" | "stable" | null
  lastChecked: string
  url: string
  intent: "informational" | "commercial" | "transactional" | "navigational"
}

interface SeoMeta {
  title: string
  description: string
  keywords: string
  canonicalUrl: string
  ogTitle: string
  ogDescription: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INTENT_LABELS: Record<string, { label: string; color: string }> = {
  transactional: { label: "تجاري", color: "bg-green-100 text-green-700" },
  commercial: { label: "بحثي", color: "bg-blue-100 text-blue-700" },
  informational: { label: "معلوماتي", color: "bg-purple-100 text-purple-700" },
  navigational: { label: "توجيهي", color: "bg-amber-100 text-amber-700" },
}

function difficultyColor(d: number | null): string {
  if (d === null || !Number.isFinite(d)) return "text-gray-400"
  if (d <= 30) return "text-green-600"
  if (d <= 60) return "text-amber-600"
  return "text-red-600"
}

function difficultyLabel(d: number | null): string {
  if (d === null || !Number.isFinite(d)) return "غير موثق"
  if (d === 0) return "سهل جداً"
  if (d <= 30) return "سهل"
  if (d <= 60) return "متوسط"
  return "صعب"
}

function volumeLabel(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—"
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
  return String(v)
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function positionBadge(pos: number | null) {
  if (!pos) return <span className="text-xs text-gray-400">—</span>
  const color = pos <= 3 ? "bg-green-100 text-green-700" : pos <= 10 ? "bg-blue-100 text-blue-700" : pos <= 30 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>#{ pos}</span>
}

// ─── Main Component ────────────────────────────────────────────────────────────

type TabId = "audit" | "keywords" | "topic-map" | "meta" | "ai-suggestions" | "ai-compat"

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "audit",          label: "فحص صفحات الموقع",     icon: FileCode2 },
  { id: "keywords",       label: "الكلمات المفتاحية",    icon: Search },
  { id: "topic-map",      label: "خريطة الاستهداف",       icon: BookOpen },
  { id: "meta",           label: "البيانات الوصفية",     icon: FileText },
  { id: "ai-suggestions", label: "اقتراحات الذكاء",      icon: Sparkles },
  { id: "ai-compat",      label: "توافق محركات الذكاء",  icon: Bot },
]

// ─── Blog Keyword ────────────────────────────────────────────────────────────

interface BlogKeyword {
  term: string
  postTitle: string
  postSlug: string
  source: "tag" | "seo"
}

function parseKeywordList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(item => parseKeywordList(item))
  }

  const raw = String(value ?? "").trim()
  if (!raw) return []

  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parseKeywordList(parsed)
    } catch {
      // Fall through to delimiter parsing for malformed legacy values.
    }
  }

  return raw
    .split(/[،,;\n\r|]+/u)
    .map(term => term.replace(/^["'«»]+|["'«»]+$/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
}

function keywordKey(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("ar")
}

// Planning keywords only. Positions, volumes, difficulty, and trends must come
// from Search Console or a verified keyword data source before being displayed
// as measurements.
const DEFAULT_KEYWORDS: Keyword[] = [
  { id: "1",  term: "شركة تنظيف بالرياض",                 position: null, volume: null, difficulty: null, trend: null, lastChecked: "", url: "/",                    intent: "transactional" },
  { id: "2",  term: "شركة تنظيف منازل بالرياض",           position: null, volume: null, difficulty: null, trend: null, lastChecked: "", url: "/",                    intent: "transactional" },
  { id: "3",  term: "شركة تنظيف فلل بالرياض",             position: null, volume: null, difficulty: null, trend: null, lastChecked: "", url: "/",                    intent: "transactional" },
  { id: "4",  term: "تنظيف شقق بعد التشطيب الرياض",        position: null, volume: null, difficulty: null, trend: null, lastChecked: "", url: "/pricing",             intent: "commercial"    },
  { id: "5",  term: "شركة تنظيف مكاتب بالرياض",           position: null, volume: null, difficulty: null, trend: null, lastChecked: "", url: "/",                    intent: "transactional" },
  { id: "6",  term: "تنظيف مجالس بالبخار الرياض",          position: null, volume: null, difficulty: null, trend: null, lastChecked: "", url: "/",                    intent: "transactional" },
  { id: "7",  term: "أسعار تنظيف المنازل بالرياض 2026",    position: null, volume: null, difficulty: null, trend: null, lastChecked: "", url: "/pricing",             intent: "commercial"    },
  { id: "8",  term: "شركة تنظيف بعد البناء الرياض",        position: null, volume: null, difficulty: null, trend: null, lastChecked: "", url: "/",                    intent: "transactional" },
  { id: "9",  term: "جلي وتلميع رخام بالرياض",            position: null, volume: null, difficulty: null, trend: null, lastChecked: "", url: "/",                    intent: "commercial"    },
  { id: "10", term: "تنظيف منازل شمال الرياض الملقا",     position: null, volume: null, difficulty: null, trend: null, lastChecked: "", url: "/areas/al-malqa",     intent: "transactional" },
  { id: "11", term: "غسيل سجاد بالبخار مع التعقيم بالرياض", position: null, volume: null, difficulty: null, trend: null, lastChecked: "", url: "/",                    intent: "transactional" },
  { id: "12", term: "شركة تنظيف خزانات مياه بالرياض",     position: null, volume: null, difficulty: null, trend: null, lastChecked: "", url: "/",                    intent: "transactional" },
  { id: "13", term: "شركة تنظيف بالرياض حراج",             position: null, volume: null, difficulty: null, trend: null, lastChecked: "", url: "/",                    intent: "transactional" },
  { id: "14", term: "شركة تنظيف منازل حطين والملقا",        position: null, volume: null, difficulty: null, trend: null, lastChecked: "", url: "/areas/al-malqa",     intent: "transactional" },
  { id: "15", term: "افضل شركة تنظيف فلل بالرياض حراج",     position: null, volume: null, difficulty: null, trend: null, lastChecked: "", url: "/pricing",             intent: "commercial"    },
]

const DEFAULT_META: SeoMeta = {
  title: "شركة تنظيف بالرياض للمنازل والفلل والمكاتب | السهم كلين",
  description: "شركة تنظيف بالرياض من السهم كلين للمنازل والفلل والشقق والمكاتب، مع التنظيف بعد البناء وغسيل المجالس والسجاد بالبخار. اطلب الخدمة وحدد احتياجك وموعدك.",
  keywords: "شركة تنظيف بالرياض, تنظيف منازل بالرياض, تنظيف فلل بالرياض, تنظيف مكاتب بالرياض, غسيل مجالس بالبخار بالرياض, جلي رخام بالرياض",
  canonicalUrl: siteUrl("/"),
  ogTitle: "شركة تنظيف بالرياض للمنازل والفلل والمكاتب | السهم كلين",
  ogDescription: "شركة تنظيف بالرياض من السهم كلين للمنازل والفلل والشقق والمكاتب، مع التنظيف بعد البناء وغسيل المجالس والسجاد بالبخار. اطلب الخدمة وحدد احتياجك وموعدك.",
}

export default function SEOPanel() {
  const { toast } = useToast()
  const { companyName, description: siteDescription, homepageContent } = useSiteSettings()
  const { data: services = [] } = useGetServices()
  const { report: auditReport, saveReport: saveAuditReport, persistence: auditPersistence } = useSeoAuditReport()
  const [activeTab, setActiveTab] = useState<TabId>("audit")
  const [keywords, setKeywords] = useState<Keyword[]>(DEFAULT_KEYWORDS)
  const [meta, setMeta] = useState<SeoMeta>(() => ({
    ...DEFAULT_META,
    title: replaceLegacyCompanyName(DEFAULT_META.title, companyName),
    description: replaceLegacyCompanyName(DEFAULT_META.description, companyName),
    ogTitle: replaceLegacyCompanyName(DEFAULT_META.ogTitle, companyName),
  }))
  const homepageRankMathInput = {
    type: "homepage" as const,
    title: meta.title,
    seoTitle: meta.title,
    description: meta.description,
    focusKeyword: "شركة تنظيف بالرياض",
    targetKeyword: "شركة تنظيف بالرياض",
    slug: "/",
    canonical: siteUrl("/"),
    expectedCanonical: siteUrl("/"),
    content: [
      meta.title,
      meta.description,
      siteDescription,
      collectHomepageText(homepageContent),
      ...services.filter(service => service.isActive).flatMap(service => [service.title, service.description]),
    ].filter(Boolean).join(" "),
    h1: ["شركة تنظيف بالرياض"],
  }
  const homepageRankMath = analyzeRankMathSeo(homepageRankMathInput)
  const homepageTitleLengthStatus = homepageRankMath.checks.find(check => check.id === "title-length")?.status ?? "unknown"
  const homepageDescriptionLengthStatus = homepageRankMath.checks.find(check => check.id === "description-length")?.status ?? "unknown"
  const [metaDirty, setMetaDirty] = useState(false)
  const [savingMeta, setSavingMeta] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)

  // AI Suggestions state
  interface AiSuggestion {
    field: string
    issue: string
    current: string
    suggestion: string
    impact: "high" | "medium" | "low"
    reason: string
    applied?: boolean
  }
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([])
  const [analyzingAI, setAnalyzingAI] = useState(false)
  const [aiAnalyzed, setAiAnalyzed] = useState(false)

  // llms.txt state
  const [llmsContent, setLlmsContent] = useState("")
  const [generatingLlms, setGeneratingLlms] = useState(false)
  const [savingLlms, setSavingLlms] = useState(false)
  const [llmsLoaded, setLlmsLoaded] = useState(false)

  // Blog keywords state
  const [blogKeywords, setBlogKeywords] = useState<BlogKeyword[]>([])
  const [loadingBlogKw, setLoadingBlogKw] = useState(false)
  const [blogKwFilter, setBlogKwFilter] = useState("")
  const [topicMap, setTopicMap] = useState<SeoKeywordTopicMapData | null>(null)
  const [topicMapLoading, setTopicMapLoading] = useState(false)
  const [topicMapError, setTopicMapError] = useState("")
  const [topicMapLoaded, setTopicMapLoaded] = useState(false)

  async function analyzeSEOWithAI() {
    setAnalyzingAI(true)
    setAiAnalyzed(false)
    try {
      const r = await fetch(`${API_BASE}/api/admin/ai/suggest-seo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
        body: JSON.stringify({
          title: meta.title,
          description: meta.description,
          keywords: meta.keywords,
          ogTitle: meta.ogTitle,
          ogDescription: meta.ogDescription,
          canonicalUrl: meta.canonicalUrl,
        }),
      })
      const data = await r.json() as { suggestions?: AiSuggestion[]; error?: string }
      if (!r.ok) throw new Error(data.error ?? "فشل التحليل")
      setAiSuggestions((data.suggestions ?? []).map(s => ({ ...s, applied: false })))
      setAiAnalyzed(true)
    } catch (e) {
      toast({ title: "فشل التحليل", description: String(e), variant: "destructive" })
    } finally {
      setAnalyzingAI(false)
    }
  }

  function applySuggestion(s: AiSuggestion) {
    const fieldMap: Record<string, keyof SeoMeta> = {
      title: "title", description: "description", keywords: "keywords",
      ogTitle: "ogTitle", ogDescription: "ogDescription", canonicalUrl: "canonicalUrl",
    }
    const key = fieldMap[s.field]
    if (key) {
      setMeta(m => ({ ...m, [key]: s.suggestion }))
      setMetaDirty(true)
    }
    setAiSuggestions(ss => ss.map(x => x.field === s.field && x.issue === s.issue ? { ...x, applied: true } : x))
    toast({ title: "تم تطبيق الاقتراح", description: `تم تحديث حقل ${s.field}` })
  }

  async function generateLlmsTxt() {
    setGeneratingLlms(true)
    try {
      const r = await fetch(`${API_BASE}/api/admin/ai/generate-llms-txt`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
      })
      const data = await r.json() as { content?: string; error?: string }
      if (!r.ok) throw new Error(data.error ?? "فشل التوليد")
      setLlmsContent(data.content ?? "")
      setLlmsLoaded(true)
      toast({ title: "تم توليد llms.txt", description: "راجع المحتوى ثم احفظه" })
    } catch (e) {
      toast({ title: "فشل التوليد", description: String(e), variant: "destructive" })
    } finally {
      setGeneratingLlms(false)
    }
  }

  async function saveLlmsTxt() {
    if (!llmsContent.trim()) return
    setSavingLlms(true)
    try {
      const r = await fetch(`${API_BASE}/api/admin/llms-txt/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
        body: JSON.stringify({ content: llmsContent }),
      })
      const data = await r.json() as { ok?: boolean; error?: string }
      if (!r.ok) throw new Error(data.error ?? "فشل الحفظ")
      toast({ title: "تم حفظ llms.txt", description: "الملف محفوظ على public/llms.txt" })
    } catch (e) {
      toast({ title: "فشل الحفظ", description: String(e), variant: "destructive" })
    } finally {
      setSavingLlms(false)
    }
  }

  // Load existing llms.txt on mount
  useEffect(() => {
    if (!llmsLoaded) {
      fetch(`${API_BASE}/llms.txt`).then(r => {
        if (r.ok) return r.text()
        throw new Error("not found")
      }).then(text => {
        setLlmsContent(text)
        setLlmsLoaded(true)
      }).catch(() => {})
    }
  }, [llmsLoaded])

  async function generateMetaWithAI() {
    setAiGenerating(true)
    try {
      const r = await fetch(`${API_BASE}/api/admin/ai/generate-seo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
        body: JSON.stringify({
          title: meta.title || `${companyName} — شركة تنظيف بالرياض`,
          description: meta.description || "شركة متخصصة في تنظيف المنازل والفلل والمكاتب بالرياض",
        }),
      })
      const data = await r.json() as {
        seoTitle?: string; seoDescription?: string; seoKeywords?: string; provider?: string; error?: string
      }
      if (!r.ok) throw new Error(data.error ?? "فشل التوليد")
      setMeta(m => ({
        ...m,
        title:       data.seoTitle       || m.title,
        description: data.seoDescription || m.description,
        keywords:    data.seoKeywords    || m.keywords,
      }))
      setMetaDirty(true)
      toast({ title: `تم التوليد بـ ${data.provider ?? "AI"}`, description: "راجع النتائج وعدّلها قبل الحفظ" })
    } catch (e) {
      toast({ title: "فشل التوليد", description: String(e), variant: "destructive" })
    } finally {
      setAiGenerating(false)
    }
  }

  // New keyword form
  const [newKw, setNewKw] = useState({ term: "", position: "", volume: "", difficulty: "", intent: "transactional" as Keyword["intent"] })
  const [addingKw, setAddingKw] = useState(false)

  // Sort state
  const [kwSort, setKwSort] = useState<{ field: keyof Keyword; dir: "asc" | "desc" }>({ field: "position", dir: "asc" })

  // Load saved data
  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then(r => r.json())
      .then(s => {
        if (s.seo_keywords) {
          try {
            const savedKeywords = JSON.parse(s.seo_keywords)
            if (Array.isArray(savedKeywords)) {
              setKeywords(savedKeywords.map((keyword: Keyword) => keyword.lastChecked
                ? keyword
                : { ...keyword, position: null, volume: null, difficulty: null, trend: null }))
            }
          } catch {}
        }
        if (s.seo_meta_title) {
          setMeta(m => ({ ...m, title: s.seo_meta_title }))
        }
        if (s.seo_meta_description) {
          setMeta(m => ({ ...m, description: s.seo_meta_description }))
        }
        if (typeof s.seo_meta_keywords === "string") {
          setMeta(m => ({ ...m, keywords: s.seo_meta_keywords }))
        }
      })
      .catch(() => {})
  }, [])

  // Load blog keywords from posts
  useEffect(() => {
    setLoadingBlogKw(true)
    fetch(`${API_BASE}/api/posts?limit=200`)
      .then(r => r.json())
      .then(data => {
        const posts: any[] = data.posts || (Array.isArray(data) ? data : [])
        const kws: BlogKeyword[] = []
        const seen = new Set<string>()
        for (const post of posts) {
          // Extract tags and SEO keywords from their dedicated fields. Both
          // Arabic and English separators are accepted for legacy records.
          for (const t of parseKeywordList(post.tags)) {
            const key = keywordKey(t)
            if (key && !seen.has(key)) {
              seen.add(key)
              kws.push({ term: t, postTitle: post.title || "", postSlug: post.slug || "", source: "tag" })
            }
          }
          for (const t of parseKeywordList(post.seoKeywords || post.seo_keywords)) {
            const key = keywordKey(t)
            if (key && !seen.has(key)) {
              seen.add(key)
              kws.push({ term: t, postTitle: post.title || "", postSlug: post.slug || "", source: "seo" })
            }
          }
        }
        setBlogKeywords(kws)
      })
      .catch(() => {})
      .finally(() => setLoadingBlogKw(false))
  }, [])

  useEffect(() => {
    if (activeTab !== "topic-map" || topicMapLoaded) return
    let active = true
    setTopicMapLoading(true)
    setTopicMapError("")
    fetch(`${API_BASE}/api/admin/ai/keyword-map`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
      cache: "no-store",
    })
      .then(async response => {
        const data = await response.json() as SeoKeywordTopicMapData & { error?: string }
        if (!response.ok) throw new Error(data.error ?? `تعذر تحميل الخريطة (HTTP ${response.status})`)
        return data
      })
      .then(data => {
        if (active) setTopicMap(data)
      })
      .catch(error => {
        if (active) setTopicMapError(error instanceof Error ? error.message : "تعذر تحميل الخريطة.")
      })
      .finally(() => {
        if (active) {
          setTopicMapLoading(false)
          setTopicMapLoaded(true)
        }
      })
    return () => { active = false }
  }, [activeTab, topicMapLoaded])

  const siteKeywordTerms = useMemo(() => {
    const serviceKeywords = services.flatMap(service => {
      const record = service as typeof service & { seoKeywords?: string; seo_keywords?: string }
      if (record.isActive === false) return []
      return parseKeywordList(record.seoKeywords ?? record.seo_keywords)
    })
    return [
      ...keywords.map(keyword => keyword.term),
      ...parseKeywordList(meta.keywords),
      ...blogKeywords.map(keyword => keyword.term),
      ...(auditReport?.pages.map(page => page.focusKeyword) ?? []),
      ...serviceKeywords,
    ]
  }, [auditReport?.pages, blogKeywords, keywords, meta.keywords, services])

  const siteKeywordStrength = useMemo(() => {
    if (!auditReport) return []
    if (!Array.isArray(auditReport.keywordStrength)) {
      return analyzeRankMathSiteKeywordStrength(siteKeywordTerms, auditReport.pages)
        .map(item => ({ ...item, needsRefresh: false }))
    }
    const legacyAuditedWords = auditReport.pages.reduce((total, page) => total + Math.max(0, page.wordCount || 0), 0)
    const savedByTerm = new Map(auditReport.keywordStrength.map(item => [normalizeRankMathKeywordPhrase(item.term), item]))
    const seen = new Set<string>()
    return siteKeywordTerms.flatMap(rawTerm => {
      const term = String(rawTerm ?? "").replace(/\s+/gu, " ").trim()
      const key = normalizeRankMathKeywordPhrase(term)
      if (!key || seen.has(key)) return []
      seen.add(key)
      const saved = savedByTerm.get(key)
      if (saved) {
        return [{
          ...saved,
          usagePercent: Number.isFinite(saved.usagePercent)
            ? saved.usagePercent
            : legacyAuditedWords
              ? Math.round((saved.occurrences / legacyAuditedWords) * 10_000) / 100
              : 0,
          needsRefresh: false,
        }]
      }
      return [{
        term,
        strength: 0,
        occurrences: 0,
        usagePercent: 0,
        pageCount: 0,
        articleCount: 0,
        focusPageCount: 0,
        samplePages: [],
        needsRefresh: true,
      }]
    }).sort((a, b) =>
      Number(keywordKey(b.term) === keywordKey("شركة تنظيف بالرياض"))
      - Number(keywordKey(a.term) === keywordKey("شركة تنظيف بالرياض"))
      || b.strength - a.strength
      || b.occurrences - a.occurrences
      || b.usagePercent - a.usagePercent
      || a.term.localeCompare(b.term, "ar")
    )
  }, [auditReport, siteKeywordTerms])

  function saveAuditReportWithKeywords(report: SeoAuditReport) {
    return saveAuditReport(report, siteKeywordTerms)
  }

  // Computed stats
  const positionedKws = keywords.filter(k => k.position)
  const top3 = positionedKws.length > 0 ? positionedKws.filter(k => k.position! <= 3).length : null
  const top10 = positionedKws.length > 0 ? positionedKws.filter(k => k.position! <= 10).length : null
  const trending = keywords.some(k => k.trend !== null) ? keywords.filter(k => k.trend === "up").length : null
  const avgPos = positionedKws.length > 0
    ? Math.round(positionedKws.reduce((a, k) => a + (k.position ?? 0), 0) / positionedKws.length)
    : null

  async function saveKeywords(kws: Keyword[]) {
    try {
      const response = await fetch(`${API_BASE}/api/admin/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
        body: JSON.stringify({ seo_keywords: JSON.stringify(kws) }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return true
    } catch (error) {
      toast({
        title: "تعذر حفظ الكلمات المفتاحية",
        description: error instanceof Error ? error.message : "تحقق من الاتصال والصلاحيات.",
        variant: "destructive",
      })
      return false
    }
  }

  function addKeyword() {
    if (!newKw.term.trim()) return
    const kw: Keyword = {
      id: crypto.randomUUID(),
      term: newKw.term.trim(),
      position: newKw.position ? parseInt(newKw.position) : null,
      volume: parseOptionalNumber(newKw.volume),
      difficulty: parseOptionalNumber(newKw.difficulty),
      trend: null,
      lastChecked: [newKw.position, newKw.volume, newKw.difficulty].some(value => value.trim()) ? new Date().toISOString() : "",
      url: "/",
      intent: newKw.intent,
    }
    const updated = [...keywords, kw]
    setKeywords(updated)
    setNewKw({ term: "", position: "", volume: "", difficulty: "", intent: "transactional" })
    setAddingKw(false)
    void saveKeywords(updated).then(saved => {
      if (saved) toast({ title: "تمت إضافة الكلمة المفتاحية" })
    })
  }

  function removeKeyword(id: string) {
    const updated = keywords.filter(k => k.id !== id)
    setKeywords(updated)
    void saveKeywords(updated)
  }

  function updatePosition(id: string, pos: string) {
    const updated = keywords.map(k => k.id === id ? { ...k, position: pos ? parseInt(pos) : null, lastChecked: new Date().toISOString() } : k)
    setKeywords(updated)
    void saveKeywords(updated)
  }

  async function saveMeta() {
    setSavingMeta(true)
    try {
      const response = await fetch(`${API_BASE}/api/admin/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
        body: JSON.stringify({
          seo_meta_title: meta.title,
          seo_meta_description: meta.description,
          seo_meta_keywords: meta.keywords,
        }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error?.error || `HTTP ${response.status}`)
      }
      window.dispatchEvent(new Event("siteSettingsChanged"))
      setMetaDirty(false)
      toast({ title: "تم حفظ البيانات الوصفية" })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "فشل في الحفظ",
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setSavingMeta(false)
    }
  }

  const sortedKeywords = [...keywords].sort((a, b) => {
    const av = a[kwSort.field] ?? 9999
    const bv = b[kwSort.field] ?? 9999
    if (kwSort.dir === "asc") return (av as number) > (bv as number) ? 1 : -1
    return (av as number) < (bv as number) ? 1 : -1
  })

  function sortBy(field: keyof Keyword) {
    setKwSort(s => ({ field, dir: s.field === field && s.dir === "asc" ? "desc" : "asc" }))
  }

  const SortIcon = ({ field }: { field: keyof Keyword }) => {
    if (kwSort.field !== field) return <Minus size={10} className="text-gray-400" />
    return kwSort.dir === "asc" ? <ArrowUp size={10} className="text-primary" /> : <ArrowDown size={10} className="text-primary" />
  }

  return (
    <div className="seo-console space-y-6" dir="rtl">
      {/* Header */}
      <section className="seo-hero">
        <div className="seo-hero-copy">
          <span className="seo-eyebrow"><span className="seo-live-dot" /> مساحة العمل · نمو البحث</span>
          <h2><Search size={23} aria-hidden="true" /> إدارة الظهور في البحث</h2>
          <p>كل أدوات السيو لموقع CleanFlow Services في مساحة واحدة، من الفحص إلى جاهزية البحث بالذكاء الاصطناعي.</p>
        </div>
        <div className="seo-health" aria-label="ملخص حالة مساحة السيو">
          <div className="seo-health-icon"><Shield size={19} aria-hidden="true" /></div>
          <div>
            <span className="seo-health-label">حالة مساحة العمل</span>
            <strong>{auditReport ? "بيانات الفحص متاحة" : "بانتظار أول فحص"}</strong>
            <small>{auditReport ? `${auditReport.checkedUrls.toLocaleString("ar-SA")} من ${auditReport.totalUrls.toLocaleString("ar-SA")} صفحة` : "ابدأ بفحص صفحات الموقع"}</small>
          </div>
        </div>
        <div className="seo-hero-foot">
          <span><Target size={14} /> {keywords.length} كلمة متابعة يدوية</span>
          <span><Clock size={14} /> نتائج الترتيب الفعلية لا تُقاس من هذه اللوحة</span>
        </div>
      </section>

      <div className="seo-overview" aria-label="نظرة سريعة">
        <div className="seo-overview-item">
          <span className="seo-overview-mark seo-mark-teal"><FileCode2 size={16} /></span>
          <div><small>فحص الموقع</small><strong>{auditReport ? `${auditReport.checkedUrls.toLocaleString("ar-SA")} / ${auditReport.totalUrls.toLocaleString("ar-SA")}` : "لم يُجرَ بعد"}</strong></div>
        </div>
        <div className="seo-overview-item">
          <span className="seo-overview-mark seo-mark-amber"><Search size={16} /></span>
          <div><small>كلمات المتابعة</small><strong>{keywords.length.toLocaleString("ar-SA")} كلمة</strong></div>
        </div>
        <div className="seo-overview-item">
          <span className={`seo-overview-mark ${metaDirty ? "seo-mark-amber" : "seo-mark-teal"}`}><FileText size={16} /></span>
          <div><small>البيانات الوصفية</small><strong>{metaDirty ? "تعديلات غير محفوظة" : "الصفحة الرئيسية"}</strong></div>
        </div>
      </div>

      {/* Workspace navigation */}
      <nav className="seo-tabs" aria-label="أقسام إدارة السيو" role="tablist" aria-orientation="horizontal">
        {TABS.map((tab, index) => {
          const Icon = tab.icon
          const selected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`seo-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`seo-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={event => {
                let nextIndex: number | null = null
                if (event.key === "ArrowLeft") nextIndex = (index + 1) % TABS.length
                else if (event.key === "ArrowRight") nextIndex = (index - 1 + TABS.length) % TABS.length
                else if (event.key === "Home") nextIndex = 0
                else if (event.key === "End") nextIndex = TABS.length - 1
                if (nextIndex === null) return
                event.preventDefault()
                const nextTab = TABS[nextIndex]
                setActiveTab(nextTab.id)
                document.getElementById(`seo-tab-${nextTab.id}`)?.focus()
              }}
              data-testid={`tab-seo-${tab.id}`}
              className={`seo-tab ${selected ? "is-active" : ""}`}
            >
              <span className="seo-tab-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="seo-tab-icon"><Icon size={16} aria-hidden="true" /></span>
              <span className="seo-tab-label">{tab.label}</span>
              <span className="seo-tab-arrow" aria-hidden="true">←</span>
            </button>
          )
        })}
      </nav>

      <AnimatePresence mode="wait">

        {activeTab === "audit" && (
          <motion.div key="audit" id="seo-panel-audit" role="tabpanel" aria-labelledby="seo-tab-audit" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SeoSiteAudit report={auditReport} onReport={saveAuditReportWithKeywords} persistence={auditPersistence} />
          </motion.div>
        )}

        {/* ════════════ KEYWORDS ════════════ */}
        {activeTab === "keywords" && (
          <motion.div key="keywords" id="seo-panel-keywords" role="tabpanel" aria-labelledby="seo-tab-keywords" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-4">

            {/* Rank Math site-wide keyword strength, based on the latest published-site audit */}
            <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-emerald-100 bg-emerald-50/50 px-5 py-4">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-emerald-950">
                    <Target size={16} className="text-emerald-700" /> قوة الكلمات المفتاحية في الموقع · Rank Math
                  </h3>
                  <p className="mt-1 text-xs leading-6 text-emerald-900/70">
                    تظهر عبارة «شركة تنظيف بالرياض» أولاً باعتبارها الأولوية الرئيسية، ثم تُرتب بقية الكلمات حسب مرات الظهور وتوزعها بين الصفحات والمقالات. هذه مؤشرات داخلية وليست ترتيب Google أو حجم البحث.
                  </p>
                </div>
                {auditReport && (
                  <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-800">
                    آخر فحص: {new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(auditReport.completedAt))}
                  </span>
                )}
              </div>

              {!auditReport ? (
                <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <p className="text-sm text-slate-600">شغّل فحص صفحات الموقع أولاً لحساب عدد مرات ظهور كل كلمة وعدد المقالات التي تستخدمها.</p>
                  <Button onClick={() => setActiveTab("audit")} size="sm" className="rounded-xl bg-emerald-800 text-white hover:bg-emerald-700">
                    فتح فحص صفحات الموقع
                  </Button>
                </div>
              ) : (
                <>
                  {(auditReport.checkedUrls < auditReport.totalUrls || auditReport.failedRequests > 0 || auditReport.renderFallbackDetected) && (
                    <p className="border-b border-amber-100 bg-amber-50 px-5 py-2.5 text-xs leading-5 text-amber-900">
                      الترتيب مبني على نتيجة جزئية: فُحص {auditReport.checkedUrls.toLocaleString("ar-SA")} من {auditReport.totalUrls.toLocaleString("ar-SA")} رابطاً، وتعذر طلب {auditReport.failedRequests.toLocaleString("ar-SA")} صفحة.
                    </p>
                  )}
                  {siteKeywordStrength.length === 0 ? (
                    <p className="p-5 text-sm text-slate-500">لا توجد كلمات مفتاحية يمكن قياسها حتى الآن.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[980px] text-sm" dir="rtl">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50 text-xs font-bold text-gray-500">
                            <th className="px-4 py-3 text-right">الكلمة المفتاحية</th>
                            <th className="px-3 py-3 text-center">قوة الموقع</th>
                            <th className="px-3 py-3 text-center">مرات الظهور</th>
                            <th className="px-3 py-3 text-center">كثافة الاستخدام</th>
                            <th className="px-3 py-3 text-center">الصفحات</th>
                            <th className="px-3 py-3 text-center">المقالات</th>
                            <th className="px-3 py-3 text-center">صفحات تستهدفها</th>
                          </tr>
                        </thead>
                        <tbody>
                          {siteKeywordStrength.map((item, index) => {
                            const level = item.strength >= 70
                              ? { label: "قوية", color: "text-emerald-700", fill: "bg-emerald-500" }
                              : item.strength >= 35
                                ? { label: "متوسطة", color: "text-amber-700", fill: "bg-amber-500" }
                                : { label: "ضعيفة", color: "text-rose-700", fill: "bg-rose-400" }
                            const primary = keywordKey(item.term) === keywordKey("شركة تنظيف بالرياض")
                            return (
                              <tr key={keywordKey(item.term)} className={`border-b border-gray-50 ${index % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                                <td className="px-4 py-3">
                                  <p className="font-bold text-gray-900">
                                    {item.term}
                                    {primary && <span className="mr-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800">الأولوية الأولى</span>}
                                  </p>
                                  {item.samplePages.length > 0 && (
                                    <p className="mt-1 max-w-[440px] truncate text-[10px] text-gray-400" title={item.samplePages.map(page => page.title).join(" · ")}>
                                      {item.samplePages.map(page => page.title).join(" · ")}
                                    </p>
                                  )}
                                </td>
                                <td className="px-3 py-3">
                                  <div className="mx-auto flex w-28 flex-col items-center gap-1">
                                    {item.needsRefresh ? (
                                      <span className="text-[10px] font-bold text-amber-700">أعد الفحص لحسابها</span>
                                    ) : (
                                      <>
                                        <span className={`font-extrabold ${level.color}`}>{item.strength}/100 · {level.label}</span>
                                        <span className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                          <span className={`block h-full rounded-full ${level.fill}`} style={{ width: `${item.strength}%` }} />
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-center font-extrabold text-gray-800">{item.needsRefresh ? "—" : item.occurrences.toLocaleString("ar-SA")}</td>
                                <td className="px-3 py-3 text-center font-bold text-emerald-800">
                                  {item.needsRefresh
                                    ? "—"
                                    : `${item.usagePercent.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}٪`}
                                </td>
                                <td className="px-3 py-3 text-center text-gray-700">{item.needsRefresh ? "—" : item.pageCount.toLocaleString("ar-SA")}</td>
                                <td className="px-3 py-3 text-center font-bold text-indigo-700">{item.needsRefresh ? "—" : item.articleCount.toLocaleString("ar-SA")}</td>
                                <td className="px-3 py-3 text-center text-gray-700">{item.needsRefresh ? "—" : item.focusPageCount.toLocaleString("ar-SA")}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Header bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{keywords.length} كلمة في قائمة التتبع اليدوي</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">{top10 ?? "—"} في Top 10 يدوياً</span>
              </div>
              <Button onClick={() => setAddingKw(v => !v)} size="sm"
                className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2">
                <Plus size={14} /> إضافة كلمة
              </Button>
            </div>

            {/* Add form */}
            <AnimatePresence>
              {addingKw && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden">
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
                    <h4 className="font-bold text-primary text-sm mb-3">إضافة كلمة مفتاحية جديدة</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div className="md:col-span-2">
                        <label className="text-xs text-gray-500 mb-1 block">الكلمة المفتاحية *</label>
                        <Input value={newKw.term} onChange={e => setNewKw(k => ({ ...k, term: e.target.value }))}
                          placeholder="مثال: تأجير باقات التنظيف الرياض" className="h-10 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">الترتيب الحالي</label>
                        <Input value={newKw.position} onChange={e => setNewKw(k => ({ ...k, position: e.target.value }))}
                          type="number" placeholder="مثال: 5" className="h-10 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">الحجم الشهري</label>
                        <Input value={newKw.volume} onChange={e => setNewKw(k => ({ ...k, volume: e.target.value }))}
                          type="number" placeholder="مثال: 1200" className="h-10 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">صعوبة موثقة (0–100)</label>
                        <Input value={newKw.difficulty} onChange={e => setNewKw(k => ({ ...k, difficulty: e.target.value }))}
                          type="number" min="0" max="100" placeholder="اتركه فارغاً إن لم تتوفر بيانات" className="h-10 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">نية البحث</label>
                        <select value={newKw.intent} onChange={e => setNewKw(k => ({ ...k, intent: e.target.value as Keyword["intent"] }))}
                          className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white outline-none focus:border-primary/40">
                          <option value="transactional">تجاري (Transactional)</option>
                          <option value="commercial">بحثي (Commercial)</option>
                          <option value="informational">معلوماتي (Informational)</option>
                          <option value="navigational">توجيهي (Navigational)</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={addKeyword} size="sm" className="bg-primary text-white rounded-xl">حفظ</Button>
                      <Button onClick={() => setAddingKw(false)} size="sm" variant="outline" className="rounded-xl">إلغاء</Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tracked Keywords Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Target size={14} className="text-primary" /> بيانات الترتيب اليدوية ({keywords.length})
                </h4>
                <span className="text-xs text-gray-400">إدخالات يدوية غير متصلة بـ Google Search Console</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" dir="rtl">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs font-bold border-b border-gray-100">
                      <th className="px-4 py-3 text-right">الكلمة المفتاحية</th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => sortBy("position")}>
                        <span className="flex items-center justify-center gap-1">المركز اليدوي <SortIcon field="position" /></span>
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => sortBy("volume")}>
                        <span className="flex items-center justify-center gap-1">الحجم اليدوي <SortIcon field="volume" /></span>
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => sortBy("difficulty")}>
                        <span className="flex items-center justify-center gap-1">الصعوبة <SortIcon field="difficulty" /></span>
                      </th>
                      <th className="px-3 py-3 text-center">الاتجاه</th>
                      <th className="px-3 py-3 text-center">النية</th>
                      <th className="px-3 py-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedKeywords.map((kw, i) => (
                      <tr key={kw.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900 text-sm">{kw.term}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{kw.url}</p>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {positionBadge(kw.position)}
                            <input
                              type="number" min="1" max="200"
                              defaultValue={kw.position ?? ""}
                              onBlur={e => updatePosition(kw.id, e.target.value)}
                              className="w-14 text-center text-xs border border-gray-200 rounded-lg px-1 py-0.5 focus:outline-none focus:border-primary/40"
                              placeholder="—"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="font-bold text-gray-700">{volumeLabel(kw.volume)}</span>
                          <p className="text-[10px] text-gray-400">شهرياً</p>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`font-bold text-sm ${difficultyColor(kw.difficulty)}`}>{typeof kw.difficulty === "number" && Number.isFinite(kw.difficulty) ? `${kw.difficulty}%` : "—"}</span>
                            <span className={`text-[10px] ${difficultyColor(kw.difficulty)}`}>{difficultyLabel(kw.difficulty)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {kw.trend === "up"     ? <TrendingUp size={16} className="text-green-500 mx-auto" /> :
                           kw.trend === "down"   ? <TrendingDown size={16} className="text-red-500 mx-auto" /> :
                           kw.trend === "stable" ? <Minus size={16} className="text-gray-400 mx-auto" /> :
                                                    <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${INTENT_LABELS[kw.intent]?.color}`}>
                            {INTENT_LABELS[kw.intent]?.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button onClick={() => removeKeyword(kw.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Blog Keywords Section ── */}
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-indigo-100 bg-indigo-50/40 flex items-center justify-between gap-3 flex-wrap">
                <h4 className="text-sm font-bold text-indigo-800 flex items-center gap-2">
                  <BookOpen size={14} className="text-indigo-500" />
                  كلمات مفتاحية من المدونة
                  {loadingBlogKw
                    ? <Loader2 size={13} className="animate-spin text-indigo-400" />
                    : <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{blogKeywords.length}</span>
                  }
                </h4>
                <input
                  type="text"
                  value={blogKwFilter}
                  onChange={e => setBlogKwFilter(e.target.value)}
                  placeholder="ابحث في كلمات المدونة..."
                  className="h-8 px-3 text-xs rounded-xl border border-indigo-200 bg-white outline-none focus:border-indigo-400 w-52"
                />
              </div>

              {loadingBlogKw ? (
                <div className="flex items-center justify-center py-10 gap-2 text-indigo-400">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">جاري تحميل كلمات المدونة...</span>
                </div>
              ) : blogKeywords.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">
                  لا توجد كلمات مفتاحية في المدونة بعد
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {blogKeywords
                      .filter(bk => !blogKwFilter.trim() || bk.term.includes(blogKwFilter.trim()))
                      .map((bk, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: Math.min(i * 0.01, 0.3) }}
                          title={`من: ${bk.postTitle}`}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border cursor-default select-none ${
                            bk.source === "seo"
                              ? "bg-blue-50 border-blue-200 text-blue-700"
                              : "bg-indigo-50 border-indigo-200 text-indigo-700"
                          }`}
                        >
                          {bk.source === "seo" ? <Target size={10} /> : <BookOpen size={10} />}
                          {bk.term}
                        </motion.div>
                      ))
                    }
                  </div>
                  <p className="text-xs text-gray-400 mt-3 flex items-center gap-3">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-200 inline-block" /> وسم (Tag)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-200 inline-block" /> كلمة SEO للمقالة</span>
                    <span className="mr-auto">مجموع: {blogKeywords.length} كلمة فريدة من {new Set(blogKeywords.map(b => b.postSlug)).size} مقالة</span>
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "topic-map" && (
          <motion.div key="topic-map" id="seo-panel-topic-map" role="tabpanel" aria-labelledby="seo-tab-topic-map" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-4">
            {topicMapLoading ? (
              <div className="flex min-h-48 items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-white text-sm text-gray-500">
                <Loader2 size={18} className="animate-spin text-primary" />
                جاري إعداد خريطة الكلمات والصفحات المنشورة...
              </div>
            ) : topicMapError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                <p className="text-sm font-bold text-rose-800">{topicMapError}</p>
                <Button
                  onClick={() => setTopicMapLoaded(false)}
                  size="sm"
                  className="mt-3 rounded-xl bg-rose-700 text-white hover:bg-rose-800"
                >
                  إعادة المحاولة
                </Button>
              </div>
            ) : topicMap ? (
              <SeoKeywordTopicMap
                data={topicMap}
                auditPages={auditReport?.pages ?? []}
                auditCompletedAt={auditReport?.completedAt}
              />
            ) : (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500">لا توجد بيانات لخريطة الكلمات بعد.</div>
            )}
          </motion.div>
        )}

        {/* ════════════ META TAGS ════════════ */}
        {activeTab === "meta" && (
          <motion.div key="meta" id="seo-panel-meta" role="tabpanel" aria-labelledby="seo-tab-meta" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-5 max-w-3xl">

            {/* Google Preview */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Eye size={16} className="text-primary" /> معاينة نتيجة البحث في جوجل
              </h3>
              <div className="bg-white border border-gray-200 rounded-xl p-5 font-sans" dir="ltr">
                <p className="text-[13px] text-gray-500 mb-1">{currentOrigin()} › الرئيسية</p>
                <p className="text-[18px] text-blue-700 hover:underline cursor-pointer font-medium leading-snug mb-1 line-clamp-1">
                  {meta.title || "العنوان غير محدد"}
                </p>
                <p className="text-[13px] text-gray-700 leading-relaxed line-clamp-2">
                  {meta.description || "الوصف غير محدد"}
                </p>
              </div>
              <div className="flex gap-4 mt-3 text-xs text-gray-500">
                <span className={`font-medium ${getRankMathStatusClass(homepageTitleLengthStatus)}`}>
                  العنوان: {meta.title.length} / {RANK_MATH_EDITOR_POLICY.title.hardMaximum} حرف
                </span>
                <span className={`font-medium ${getRankMathStatusClass(homepageDescriptionLengthStatus)}`}>
                  الوصف: {meta.description.length} / {RANK_MATH_EDITOR_POLICY.description.hardMaximum} حرف
                </span>
              </div>
            </div>

            {/* Fields */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Edit2 size={16} className="text-primary" /> إدارة SEO للصفحة الرئيسية
                </h3>
                <Button
                  variant="default" size="sm"
                  onClick={generateMetaWithAI}
                  disabled={aiGenerating}
                  className="gap-2 h-9"
                >
                  {aiGenerating
                    ? <><Loader2 size={14} className="animate-spin" /> جاري التوليد...</>
                    : <>توليد بالذكاء الاصطناعي</>}
                </Button>
              </div>

              <RankMathPanel input={homepageRankMathInput} />
              {[
                { key: "title",          label: "عنوان Rank Math (Title Tag)",       max: RANK_MATH_EDITOR_POLICY.title.hardMaximum, ph: `${companyName} | شركة تنظيف بالرياض` },
                { key: "description",    label: "وصف Rank Math",                     max: RANK_MATH_EDITOR_POLICY.description.hardMaximum, ph: "متخصصون في تنظيف المنازل والفلل بالرياض..." },
                { key: "keywords",       label: "كلمة التركيز والعبارات ذات الصلة",  max: 0,   ph: "عبارة التركيز أولاً، ثم العبارات ذات الصلة" },
                { key: "canonicalUrl",   label: "الرابط الأساسي (Canonical URL)",  max: 0,   ph: "اتركه / ليُستخدم النطاق الحالي" },
                { key: "ogTitle",        label: "عنوان Open Graph (OG:Title)",      max: 90,  ph: `${companyName} | WhatsApp, Facebook` },
                { key: "ogDescription", label: "وصف Open Graph (OG:Description)",  max: 200, ph: "يظهر عند مشاركة الموقع على وسائل التواصل..." },
              ].map(({ key, label, max, ph }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
                  {key === "description" || key === "ogDescription" ? (
                    <textarea
                      value={meta[key as keyof SeoMeta]}
                      onChange={e => { setMeta(m => ({ ...m, [key]: e.target.value })); setMetaDirty(true) }}
                      rows={3}
                      maxLength={key === "description" ? RANK_MATH_EDITOR_POLICY.description.hardMaximum : undefined}
                      placeholder={ph}
                      className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 bg-gray-50 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 resize-none"
                    />
                  ) : (
                    <Input
                      value={meta[key as keyof SeoMeta]}
                      onChange={e => { setMeta(m => ({ ...m, [key]: e.target.value })); setMetaDirty(true) }}
                      maxLength={key === "title" ? RANK_MATH_EDITOR_POLICY.title.hardMaximum : undefined}
                      placeholder={ph}
                      className="h-11 bg-gray-50 border-gray-200 text-sm"
                    />
                  )}
                  {max > 0 && (
                    <p className={`text-xs mt-1 ${meta[key as keyof SeoMeta].length > max ? "text-red-500" : "text-gray-400"}`}>
                      {meta[key as keyof SeoMeta].length} / {max} حرف
                    </p>
                  )}
                </div>
              ))}
              <p className="text-xs text-gray-500">
                العبارات في هذا الحقل للتوجيه والتحرير فقط؛ لا تُخرج كـ meta keywords لأن Google لا يستخدم هذا الوسم.
              </p>

              {metaDirty && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Button onClick={saveMeta} disabled={savingMeta}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl gap-2">
                    {savingMeta ? <><RefreshCw size={16} className="animate-spin" /> جاري الحفظ...</> : <><Save size={16} /> حفظ البيانات الوصفية</>}
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* ════════════ AI SUGGESTIONS ════════════ */}
        {activeTab === "ai-suggestions" && (
          <motion.div key="ai-suggestions" id="seo-panel-ai-suggestions" role="tabpanel" aria-labelledby="seo-tab-ai-suggestions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-5">

            {/* Header */}
            <div className="bg-gradient-to-l from-purple-50 to-blue-50 border border-purple-100 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
                    <Sparkles size={18} className="text-purple-500" />
                    تحليل وتحسين SEO بالذكاء الاصطناعي
                  </h3>
                  <p className="text-sm text-gray-600">يحلل الذكاء الاصطناعي البيانات الوصفية الحالية ويقترح تحسينات جاهزة للتطبيق بنقرة واحدة</p>
                </div>
                <Button
                  onClick={analyzeSEOWithAI}
                  disabled={analyzingAI}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-2 shrink-0"
                >
                  {analyzingAI
                    ? <><Loader2 size={15} className="animate-spin" /> جاري التحليل...</>
                    : <><Play size={15} /> تحليل الآن</>}
                </Button>
              </div>
            </div>

            {/* Not analyzed yet */}
            {!aiAnalyzed && !analyzingAI && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                <Sparkles size={40} className="text-purple-300 mx-auto mb-3" />
                <p className="font-semibold text-gray-600 mb-1">لم يتم التحليل بعد</p>
                <p className="text-sm text-gray-400">اضغط "تحليل الآن" للحصول على اقتراحات تحسين من الذكاء الاصطناعي</p>
              </div>
            )}

            {/* Loading */}
            {analyzingAI && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                <Loader2 size={40} className="text-purple-400 mx-auto mb-3 animate-spin" />
                <p className="font-semibold text-gray-600">جاري تحليل البيانات الوصفية...</p>
                <p className="text-sm text-gray-400 mt-1">قد يستغرق هذا لحظة</p>
              </div>
            )}

            {/* Suggestions list */}
            {aiAnalyzed && !analyzingAI && (
              <div className="space-y-3">
                {aiSuggestions.length === 0 ? (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                    <CheckCircle size={36} className="text-green-500 mx-auto mb-2" />
                    <p className="font-bold text-green-700">لا توجد مشكلات!</p>
                    <p className="text-sm text-green-600 mt-1">البيانات الوصفية الحالية في حالة جيدة</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">{aiSuggestions.length} اقتراح تحسين</p>
                      <div className="flex gap-2">
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                          {aiSuggestions.filter(s => s.impact === "high").length} عالي
                        </span>
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                          {aiSuggestions.filter(s => s.impact === "medium").length} متوسط
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">
                          {aiSuggestions.filter(s => s.impact === "low").length} منخفض
                        </span>
                      </div>
                    </div>

                    {aiSuggestions.map((s, i) => {
                      const impactColor = s.impact === "high"
                        ? "bg-red-50 border-red-100"
                        : s.impact === "medium"
                        ? "bg-amber-50 border-amber-100"
                        : "bg-gray-50 border-gray-100"
                      const badgeColor = s.impact === "high"
                        ? "bg-red-100 text-red-700"
                        : s.impact === "medium"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-600"
                      const impactLabel = s.impact === "high" ? "تأثير عالي" : s.impact === "medium" ? "تأثير متوسط" : "تأثير منخفض"

                      const fieldLabels: Record<string, string> = {
                        title: "العنوان", description: "الوصف", keywords: "الكلمات المفتاحية",
                        ogTitle: "OG Title", ogDescription: "OG Description", canonicalUrl: "Canonical URL",
                      }

                      return (
                        <motion.div key={i}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                          className={`rounded-2xl border p-5 ${impactColor} ${s.applied ? "opacity-60" : ""}`}>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>{impactLabel}</span>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                                {fieldLabels[s.field] ?? s.field}
                              </span>
                              {s.applied && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                  <Check size={10} /> تم التطبيق
                                </span>
                              )}
                            </div>
                            {!s.applied && (
                              <Button
                                size="sm"
                                onClick={() => applySuggestion(s)}
                                className="bg-primary hover:bg-primary/90 text-white rounded-xl text-xs h-8 gap-1 shrink-0"
                              >
                                <Check size={12} /> تطبيق
                              </Button>
                            )}
                          </div>
                          <p className="font-semibold text-gray-900 text-sm mb-2">{s.issue}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="bg-white/70 rounded-xl p-3">
                              <p className="font-bold text-gray-500 mb-1">الحالي</p>
                              <p className="text-gray-700 leading-relaxed line-clamp-2">{s.current || "—"}</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-green-100">
                              <p className="font-bold text-green-600 mb-1">المقترح</p>
                              <p className="text-gray-800 leading-relaxed">{s.suggestion}</p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <Info size={11} /> {s.reason}
                          </p>
                        </motion.div>
                      )
                    })}

                    {aiSuggestions.some(s => !s.applied) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700 flex items-start gap-3">
                        <Info size={15} className="shrink-0 mt-0.5 text-blue-500" />
                        <p>بعد تطبيق الاقتراحات، انتقل إلى تبويب <strong>البيانات الوصفية</strong> واحفظ التغييرات</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ════════════ AI ENGINE COMPATIBILITY ════════════ */}
        {activeTab === "ai-compat" && (
          <motion.div key="ai-compat" id="seo-panel-ai-compat" role="tabpanel" aria-labelledby="seo-tab-ai-compat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-5">

            {/* Header */}
            <div className="bg-gradient-to-l from-cyan-50 to-emerald-50 border border-cyan-100 rounded-2xl p-5">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
                <Bot size={18} className="text-cyan-500" />
                التوافق مع محركات الذكاء الاصطناعي (GEO)
              </h3>
              <p className="text-sm text-gray-600">
                Generative Engine Optimization — تهيئة الموقع ليظهر في إجابات ChatGPT وGemini وPerplexity
              </p>
            </div>

            {/* AI Crawlers Status */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Shield size={16} className="text-green-500" /> حالة زاحفات الذكاء الاصطناعي في robots.txt
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: "GPTBot",         company: "ChatGPT / OpenAI",  status: "allowed", color: "bg-green-50 border-green-200 text-green-700" },
                  { name: "Google-Extended", company: "Google Gemini",     status: "allowed", color: "bg-green-50 border-green-200 text-green-700" },
                  { name: "PerplexityBot",  company: "Perplexity AI",     status: "allowed", color: "bg-green-50 border-green-200 text-green-700" },
                  { name: "ClaudeBot",      company: "Anthropic Claude",  status: "allowed", color: "bg-green-50 border-green-200 text-green-700" },
                  { name: "OAI-SearchBot",  company: "OpenAI Search",     status: "allowed", color: "bg-green-50 border-green-200 text-green-700" },
                  { name: "Bytespider",     company: "TikTok (ByteDance)", status: "blocked", color: "bg-red-50 border-red-200 text-red-700" },
                ].map((bot) => (
                  <div key={bot.name} className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium ${bot.color}`}>
                    <div>
                      <p className="font-bold" dir="ltr">{bot.name}</p>
                      <p className="text-xs opacity-75">{bot.company}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {bot.status === "allowed"
                        ? <><CheckCircle size={15} /> مسموح</>
                        : <><XCircle size={15} /> محظور</>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Checklist */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle size={16} className="text-primary" /> قائمة توافق GEO
              </h4>
              <div className="space-y-2">
                {[
                  { ok: true,  label: "robots.txt يسمح لزاحفات AI",       detail: "GPTBot و PerplexityBot و ClaudeBot و Google-Extended مسموح لها" },
                  { ok: true,  label: "ملف llms.txt موجود",                detail: "يساعد نماذج اللغة على فهم الموقع وخدماته بشكل منظم" },
                  { ok: true,  label: "بيانات Schema منظمة",              detail: "LocalBusiness + FAQPage + Service schemas مثبتة" },
                  { ok: true,  label: "أسئلة شائعة (FAQPage Schema)",     detail: "تساعد في الظهور كإجابات مباشرة في ChatGPT وPerplexity" },
                  { ok: true,  label: "Open Graph Tags",                   detail: "og:title وog:description وog:image موجودة" },
                  { ok: true,  label: "محتوى واضح ومنظم",                  detail: "العناوين والفقرات منظمة بـ H1/H2/H3 لسهولة استخراج المعلومات" },
                  { ok: true,  label: "sitemap.xml محدّث",                 detail: "يساعد الزاحفات على اكتشاف المحتوى بكفاءة" },
                  { ok: false, label: "ملف ai.txt (اختياري)",              detail: "ملف مقترح لتوضيح سياسة استخدام الذكاء الاصطناعي — غير موجود بعد" },
                ].map((item, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border text-sm ${
                    item.ok ? "bg-green-50/50 border-green-100" : "bg-gray-50 border-gray-200"
                  }`}>
                    {item.ok
                      ? <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                      : <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />}
                    <div>
                      <p className="font-semibold text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* llms.txt Generator */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                  <FileCode2 size={16} className="text-primary" /> ملف llms.txt
                </h4>
                <div className="flex gap-2">
                  <a href="/llms.txt" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-xl hover:border-primary hover:text-primary transition-all">
                    <ExternalLink size={12} /> عرض الحالي
                  </a>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={generateLlmsTxt}
                    disabled={generatingLlms}
                    className="rounded-xl gap-2 text-xs"
                  >
                    {generatingLlms
                      ? <><Loader2 size={12} className="animate-spin" /> جاري التوليد...</>
                      : <><Sparkles size={12} /> توليد بالذكاء الاصطناعي</>}
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveLlmsTxt}
                    disabled={savingLlms || !llmsContent.trim()}
                    className="rounded-xl gap-2 text-xs bg-primary hover:bg-primary/90 text-white"
                  >
                    {savingLlms
                      ? <><Loader2 size={12} className="animate-spin" /> حفظ...</>
                      : <><Save size={12} /> حفظ</>}
                  </Button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-200 p-1">
                <textarea
                  value={llmsContent}
                  onChange={e => setLlmsContent(e.target.value)}
                  rows={14}
                  dir="rtl"
                  className="w-full bg-transparent px-3 py-2 text-xs font-mono text-gray-800 outline-none resize-none leading-relaxed"
                  placeholder="اضغط 'توليد بالذكاء الاصطناعي' لإنشاء محتوى llms.txt تلقائياً، أو اكتب المحتوى يدوياً..."
                />
              </div>
              <p className="text-xs text-gray-400 mt-2 flex items-start gap-1.5">
                <Info size={11} className="shrink-0 mt-0.5" />
                ملف llms.txt يوجد على <code className="bg-gray-100 px-1 rounded" dir="ltr">/llms.txt</code> ويساعد ChatGPT وGemini وPerplexity على فهم الموقع وخدماته
              </p>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700">
              <p className="font-bold mb-2 flex items-center gap-2"><Info size={14} /> نصائح للظهور في محركات الذكاء الاصطناعي</p>
              <ul className="space-y-1.5 text-xs text-blue-600 list-disc mr-5">
                <li>اكتب محتوى يجيب على أسئلة المستخدمين بشكل مباشر وواضح</li>
                <li>استخدم FAQPage Schema للأسئلة والأجوبة — تُستخرج مباشرة في ChatGPT</li>
                <li>اذكر الموقع الجغرافي والتخصص بوضوح في كل صفحة</li>
                <li>تأكد من ذكر اسم الشركة وخدماتها في المحتوى النصي المرئي</li>
                <li>حدّث llms.txt كلما أضفت خدمة جديدة أو تغيرت معلومات الاتصال</li>
              </ul>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
