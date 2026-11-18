import { useEffect, useState } from "react"
import { Link, useRoute } from "wouter"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { ServiceRequestForm } from "@/components/home/ServiceRequestForm"
import { replaceLegacyCompanyName, useSiteSettings } from "@/context/SiteSettingsContext"
import { getSiteUrl, sitePath, siteUrl } from "@/lib/siteUrl"
import { normalizeRichTextHeadings } from "@/lib/seoContent"
import { getSeoPageIndexability } from "@/lib/seoPagePolicy"
import { getImageFileName } from "@/lib/imageFileName"
import { isNoServiceSeoSlug, isOutsideRiyadhSeoSlug } from "@/lib/noServiceSeoRoutes"
import { getContentServiceFamilyLabel, resolveContentServiceFamily } from "@/lib/contentServiceFamily"
import { composeSeoTitle, stripSeoTitleSuffix } from "@/lib/seoTitle"
import seoPageImageMap from "@/lib/seo-page-image-map.json"
import { AREAS, ARABIC_AREA_SLUGS } from "@/pages/NeighborhoodPage"
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileSearch,
  HelpCircle,
  Layers,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
} from "lucide-react"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""

interface SeoPageData {
  id: number
  title: string
  slug: string
  targetKeyword: string
  category?: string
  content: string
  excerpt: string
  coverImage: string
  status: "draft" | "published"
  publishedAt: string | null
  updatedAt: string | null
  viewCount: number
  seoTitle: string
  seoDescription: string
  seoKeywords: string
  ogImage: string
  canonicalUrl: string
}

class SeoPageNotFoundError extends Error {}

function setMeta(name: string, content: string, attribute = "name") {
  if (!content) return
  let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement | null
  if (!element) {
    element = document.createElement("meta")
    element.setAttribute(attribute, name)
    document.head.appendChild(element)
  }
  element.content = content
}

function toAbsoluteAsset(value: string): string {
  if (!value) return ""
  if (/^https?:\/\//i.test(value)) return value
  return siteUrl(sitePath(value))
}

function toDisplayAsset(value: string): string {
  if (!value) return ""
  if (/^https?:\/\//i.test(value)) return value
  return sitePath(value)
}

type SeoImageGroup = (typeof seoPageImageMap)[number]

function getSeoPageImages(page: Pick<SeoPageData, "title" | "targetKeyword" | "category" | "coverImage" | "ogImage">) {
  const text = `${page.targetKeyword || ""} ${page.title || ""} ${page.category || ""}`.toLocaleLowerCase("ar")
  const group: SeoImageGroup = seoPageImageMap.find(({ matches }) =>
    matches.some((term) => text.includes(term.toLocaleLowerCase("ar"))),
  ) ?? seoPageImageMap[seoPageImageMap.length - 1]
  const imageVariant = "variants" in group
    ? group.variants?.find(({ matches }) => matches.some((term) => text.includes(term.toLocaleLowerCase("ar"))))
    : undefined
  const mainImage = page.ogImage || page.coverImage || group.primaryImage
  return [...new Set([mainImage, ...(imageVariant?.supportImages ?? group.supportImages)])].slice(0, 3)
}

function removeSeoArtifacts() {
  document.getElementById("seo-page-schema")?.remove()
}

function markMissingPage() {
  const currentUrl = siteUrl(window.location.pathname)
  setMeta("robots", "noindex, follow")
  setMeta("googlebot", "noindex, follow")
  let canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null
  if (!canonical) {
    canonical = document.createElement("link")
    canonical.rel = "canonical"
    document.head.appendChild(canonical)
  }
  canonical.href = currentUrl
}

export default function SeoPage({ rootSlug, lookupSlug }: { rootSlug?: string; lookupSlug?: string; params?: unknown } = {}) {
  const [, params1] = useRoute("/page/:slug")
  const [, params2] = useRoute("/pages/:slug")
  const [, params3] = useRoute("/صفحة/:slug")
  const [, params4] = useRoute("/صفحات/:slug")
  const [, rootParams] = useRoute("/:slug")
  const rawSlug = lookupSlug || params1?.slug || params2?.slug || params3?.slug || params4?.slug || rootParams?.slug || ""
  const slug = decodeURIComponent(rawSlug)
  const siteSettings = useSiteSettings()
  const { companyName, phoneCall, phoneWhatsapp, publicUrl, isLoaded } = siteSettings
  const [page, setPage] = useState<SeoPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!slug) {
      markMissingPage()
      setNotFound(true)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    fetch(`${API_BASE}/api/pages/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async response => {
        const data = await response.json().catch(() => null)
        if (response.status === 404) throw new SeoPageNotFoundError(data?.error || "not-found")
        if (!response.ok) throw new Error(data?.error || "request-failed")
        return data as SeoPageData
      })
      .then(data => {
        if (cancelled) return
        const resolvedData = {
          ...data,
          title: stripSeoTitleSuffix(replaceLegacyCompanyName(data.title, companyName), companyName),
          excerpt: replaceLegacyCompanyName(data.excerpt, companyName),
          content: normalizeRichTextHeadings(replaceLegacyCompanyName(data.content, companyName)),
          seoTitle: replaceLegacyCompanyName(data.seoTitle, companyName),
          seoDescription: replaceLegacyCompanyName(data.seoDescription, companyName),
          seoKeywords: replaceLegacyCompanyName(data.seoKeywords, companyName),
        }
        setPage(resolvedData)
        setLoading(false)

        const title = composeSeoTitle(
          resolvedData.seoTitle || resolvedData.title,
          companyName || "الشركة",
        )
        const description = resolvedData.seoDescription || resolvedData.excerpt
        const indexability = getSeoPageIndexability(resolvedData)
        const robots = indexability.indexable
          ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
          : "noindex, follow"
        const configuredCanonical = resolvedData.canonicalUrl?.trim()
        const canonicalSource = configuredCanonical || `/page/${encodeURIComponent(resolvedData.slug)}`
        const canonical = /^https?:\/\//i.test(canonicalSource)
          ? canonicalSource
          : siteUrl(sitePath(canonicalSource))
        const image = toAbsoluteAsset(resolvedData.ogImage || resolvedData.coverImage)
        const resolvedTitle = title
        document.title = resolvedTitle
        setMeta("description", description)
        setMeta("keywords", resolvedData.seoKeywords || resolvedData.targetKeyword)
        setMeta("robots", robots)
        setMeta("googlebot", robots)
        setMeta("og:type", "website", "property")
        setMeta("og:title", title, "property")
        setMeta("og:description", description, "property")
        setMeta("og:url", canonical, "property")
        setMeta("og:locale", "ar_SA", "property")
        if (image) setMeta("og:image", image, "property")
        setMeta("twitter:card", image ? "summary_large_image" : "summary")
        setMeta("twitter:title", title)
        setMeta("twitter:description", description)
        if (image) setMeta("twitter:image", image)

        document.querySelector("link[rel='canonical']")?.remove()
        const canonicalLink = document.createElement("link")
        canonicalLink.rel = "canonical"
        canonicalLink.href = canonical
        canonicalLink.id = "seo-page-canonical"
        document.head.appendChild(canonicalLink)

        removeSeoArtifacts()
        const schema = [
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: title,
            description,
            url: canonical,
            headline: title,
            inLanguage: "ar",
             isPartOf: { "@type": "WebSite", name: companyName || "الشركة", url: getSiteUrl(publicUrl) },
            about: { "@type": "Thing", name: resolvedData.targetKeyword || title },
            ...(image ? { image } : {}),
            datePublished: data.publishedAt || undefined,
            dateModified: data.updatedAt || data.publishedAt || undefined,
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
               { "@type": "ListItem", position: 1, name: "الرئيسية", item: getSiteUrl(publicUrl) },
              { "@type": "ListItem", position: 2, name: title, item: canonical },
            ],
          },
        ]
        const script = document.createElement("script")
        script.id = "seo-page-schema"
        script.type = "application/ld+json"
        script.textContent = JSON.stringify(schema)
        document.head.appendChild(script)
      })
      .catch(error => {
        if (cancelled) return
        // Only a confirmed API 404 means the public page is missing. A
        // transient network/server failure must never turn a valid published
        // page into noindex while its prerendered HTML is still indexable.
        if (error instanceof SeoPageNotFoundError) {
          markMissingPage()
          setNotFound(true)
        } else {
          setMeta("robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1")
          setMeta("googlebot", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1")
          setNotFound(false)
        }
        setPage(null)
        setLoading(false)
      })

    return () => {
      cancelled = true
      removeSeoArtifacts()
      document.getElementById("seo-page-canonical")?.remove()
    }
  }, [slug, rootSlug, companyName, phoneCall, phoneWhatsapp, publicUrl, isLoaded])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900" dir="rtl">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <FileSearch className="mx-auto text-primary" size={42} />
            <h1 className="text-2xl font-bold text-slate-800">الصفحة غير موجودة</h1>
            <p className="text-slate-500">لم يتم العثور على الصفحة المطلوبة أو تم تغيير الرابط.</p>
            <Link href="/" className="inline-block bg-primary text-white px-6 py-2.5 rounded-xl font-bold">
              العودة للرئيسية
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const image = toDisplayAsset(page.ogImage || page.coverImage)
  const pageImages = getSeoPageImages(page)
  const topic = page.targetKeyword || page.title
  const serviceFamily = resolveContentServiceFamily(topic, page.title, page.category)
  const pageCoverageCopy = `${page.content || ""} ${page.excerpt || ""} ${page.seoDescription || ""}`
  const hasOutsideRiyadhTarget =
    /(?:الخرج|الدرعية|ضرما|جدة|جده|مكة|مكه|الدمام|المدينة|المدينه|الطائف|الطايف|أبها|ابها|تبوك|القصيم|السعودية|السعوديه|الخبر|الأحساء|الاحساء|جازان|حائل|نجران|الباحة|عسير)/u.test(topic) &&
    !/الرياض/u.test(topic)
  const isOutsideRiyadhPage = isOutsideRiyadhSeoSlug(page.slug) || (hasOutsideRiyadhTarget &&
    /(?:داخل\s+(?:مدينة\s+)?الرياض\s+فقط|التغطية[^.]{0,45}الرياض\s+فقط|لا\s+(?:نستقبل|تتوفر)\s+[^.]{0,45}(?:الخارج|الخرج))/u.test(pageCoverageCopy))
  const isUnverifiedServicePage =
    /(?:لا\s+توجد\s+لدينا\s+خدمة\s+مؤكدة|لا\s+نؤكد\s+هذه\s+الخدمة|لا\s+تعرض\s+خدمة\s+من\s+السهم\s+كلين)/u.test(pageCoverageCopy)
  const isNoServicePage = isOutsideRiyadhPage || isUnverifiedServicePage || isNoServiceSeoSlug(page.slug)
  const isFireSafetyInformationPage = isNoServicePage && /(?:بعد\s+الحريق|الحريق)/u.test(topic)
  const noServiceNotice = isOutsideRiyadhPage
    ? "لا تقدم السهم كلين خدمات ميدانية خارج مدينة الرياض، بما في ذلك الموقع المستهدف في هذه الصفحة. المحتوى معلوماتي فقط."
    : isFireSafetyInformationPage
      ? "لا توجد خدمة مؤكدة لدى السهم كلين لتنظيف أو ترميم آثار الحريق. هذا محتوى معلوماتي عام ولا يتيح طلب هذه الخدمة."
      : "هذه الصفحة معلوماتية ولا تؤكد توفر الخدمة المذكورة لدى السهم كلين، ولا تتيح طلبها."
  const noServiceBadge = isOutsideRiyadhPage
    ? "معلومات عن نطاق التغطية"
    : isFireSafetyInformationPage
      ? "معلومات سلامة عامة"
      : "دليل معلوماتي عام"
  const hasInformationalMarker =
    /(?:هذه\s+(?:ال)?صفحة[^.]{0,100}(?:معلوماتية|إرشادية|دليل عام|ليست عرضاً)|لا تمثل وعداً بحجز)/u.test(pageCoverageCopy)
  const isInformationalPage = isNoServicePage || (hasInformationalMarker && serviceFamily === "other")
  const isCleaningServicePage = serviceFamily === "cleaning" && !isNoServicePage
  const equipmentItems = isInformationalPage
    ? ["ملاءمة الأدوات لنوع الأسطح والأثاث", "وضوح تعليمات المواد ووقت استخدامها", "حماية الأثاث والأرضيات أثناء العمل", "تحديد مسؤوليات التجهيز والتسليم"]
    : serviceFamily === "insulation"
      ? ["تقييم حالة السطح أو الخزان قبل تحديد المادة", "اختيار طريقة العزل وفق طبيعة الموقع", "تجهيز وحماية المناطق المحيطة أثناء العمل", "مراجعة نقاط التنفيذ والتسليم المتفق عليها"]
      : serviceFamily === "safety"
        ? ["تحديد نوع طلب السلامة ونطاقه", "مراجعة بيانات المنشأة والموقع", "توضيح المعاينة والمخرجات المتوقعة", "التحقق من المتطلبات والإجراءات الرسمية"]
        : serviceFamily === "pest-control"
          ? ["تحديد نوع الآفة والموقع المتأثر", "شرح نطاق المعالجة المقترح قبل الاتفاق", "معرفة تعليمات التجهيز والسلامة", "تأكيد تفاصيل الزيارة مع الفريق"]
          : serviceFamily === "pool"
            ? ["تحديد حجم المسبح وحالة الفلتر", "مراجعة الرواسب والأسطح المطلوب تنظيفها", "توضيح نطاق التنظيف والتصفية", "تأكيد موعد المعاينة أو التنفيذ"]
      : ["أدوات تنظيف مناسبة لطبيعة السطح", "معدات شفط وبخار عند الحاجة", "مواد حماية للمفروشات والأرضيات", "مستلزمات ترتيب وتعقيم نقاط الاستخدام"]
  const whatsappMessage = isInformationalPage
    ? `مرحباً، أود الاستفسار عن معلومات ${topic} ونطاق التغطية. الخدمات الميدانية للسهم كلين داخل الرياض فقط.`
    : `مرحباً، أود الاستفسار عن ${topic}`
  const waHref = `https://wa.me/966${(phoneWhatsapp || "0554498403").replace(/^0/, "")}?text=${encodeURIComponent(whatsappMessage)}`
  const processSteps = isInformationalPage
    ? [
        { title: "تحقق من نطاق التغطية", desc: "تأكد أن عنوانك يقع ضمن نطاق مقدم الخدمة قبل الاتفاق أو تحديد موعد." },
        { title: "صف احتياج الموقع", desc: "جهّز معلومات نوع العقار والمساحة والأسطح أو المشكلة التي تريد معالجتها." },
        { title: "قارن نطاق العمل", desc: "اطلب توضيح الأعمال المشمولة والمستثناة والمواد أو التجهيزات المقترحة." },
        { title: "راجع التعليمات", desc: "تأكد من فهم متطلبات التجهيز والسلامة والتسليم قبل الموافقة على أي عرض." },
      ]
    : serviceFamily === "safety"
      ? [
          { title: "تحديد نوع الطلب", desc: "وضح إن كان طلبك متعلقاً بملف المنشأة أو المعاينة أو التقرير أو الصيانة." },
          { title: "مراجعة بيانات المنشأة", desc: "جهّز بيانات الموقع والمستندات والمخططات المتاحة لمراجعة نطاق الطلب." },
          { title: "توضيح موعد ومخرجات العمل", desc: "يتفق الطرفان على نطاق المعاينة أو التقرير والمخرجات الممكنة قبل البدء." },
          { title: "مراعاة الإجراءات الرسمية", desc: "أي اعتماد أو إصدار رسمي يخضع لمتطلبات وقرارات الجهات المختصة." },
        ]
      : serviceFamily === "pest-control"
        ? [
            { title: "وصف نوع الآفة والموقع", desc: "اذكر نوع الآفة التي لاحظتها ونوع العقار والمساحة المتأثرة." },
            { title: "تحديد نطاق المعالجة", desc: "يُراجع الفريق التفاصيل لتوضيح النطاق المناسب قبل تأكيد الطلب." },
            { title: "اتباع تعليمات التجهيز", desc: "اسأل الفريق عن تعليمات السلامة والتجهيز الخاصة بالموقع قبل الزيارة." },
            { title: "تأكيد الموعد", desc: "يُنسق موعد الزيارة وفق نطاق التغطية وتوفر الفريق." },
          ]
        : serviceFamily === "pool"
          ? [
              { title: "تحديد حجم المسبح وحالته", desc: "شارك معلومات الحجم وحالة المياه والفلتر لتوضيح نطاق العمل." },
              { title: "توضيح الأعمال المطلوبة", desc: "حدد ما إذا كان الطلب يشمل الرواسب أو الجدران أو الفلتر." },
              { title: "الاتفاق على نطاق التنفيذ", desc: "يُراجع الفريق التفاصيل ويؤكد الأعمال المشمولة قبل تحديد الموعد." },
              { title: "المراجعة والتسليم", desc: "تتم مراجعة الأعمال المتفق عليها مع العميل عند اكتمالها." },
            ]
          : serviceFamily === "insulation"
            ? [
                { title: "تحديد احتياج الموقع", desc: "وضح نوع الموقع والسطح والغرض من طلب العزل." },
                { title: "مراجعة الحالة والنطاق", desc: "تُراجع تفاصيل الموقع لتحديد الطريقة والنطاق المناسبين قبل الاتفاق." },
                { title: "توضيح التجهيزات", desc: "تُحدد متطلبات حماية الموقع والتجهيز وفق الأعمال المتفق عليها." },
                { title: "مراجعة التسليم", desc: "تُراجع نقاط التنفيذ والتسليم التي جرى الاتفاق عليها." },
              ]
            : [
                { title: "فهم احتياج المكان", desc: `نراجع تفاصيل ${topic} ونوع العقار والمساحة قبل تأكيد الموعد.` },
                { title: "تجهيز الأدوات", desc: "نختار الأدوات والمواد المناسبة لطبيعة السطح وحالة الموقع." },
                { title: "تنفيذ منظم", desc: "ينفذ الفريق العمل على مراحل واضحة وفق نطاق الخدمة المتفق عليه." },
                { title: "المراجعة والتسليم", desc: "نراجع النتيجة مع العميل ونسجل أي ملاحظة قبل مغادرة الفريق." },
              ]
  const faqs = isNoServicePage && /(?:بعد\s+الحريق|الحريق)/u.test(topic)
    ? [
        { q: "هل تقدم السهم كلين خدمة تنظيف أو ترميم آثار الحريق؟", a: "لا توجد خدمة مؤكدة لدى السهم كلين لتنظيف أو ترميم آثار الحريق. هذه الصفحة معلومات عامة ولا تتيح طلب هذه الخدمة." },
        { q: "ما الأولوية قبل تنظيف موقع متضرر؟", a: "لا تدخل الموقع أو تلمس الأجهزة والمخلفات قبل سماح الجهات المختصة، واتبع تعليمات الدفاع المدني واطلب تقييماً من مختصين مؤهلين." },
        { q: "كيف أقيّم جهة مستقلة؟", a: "تحقق من المؤهلات ونطاق العمل المكتوب وإجراءات الوقاية، ولا تعتبر التنظيف العادي بديلاً عن فحص السلامة أو معالجة الأضرار المتخصصة." },
      ]
    : isNoServicePage || isInformationalPage
      ? [
          { q: `كيف أختار مقدم خدمة ${topic} في منطقتي؟`, a: "تحقق أولاً من أن نطاق مقدم الخدمة يشمل عنوانك، ثم اطلب توضيح الأعمال المشمولة والتكلفة ومتطلبات التجهيز." },
          { q: "هل تقدم السهم كلين خدمات ميدانية خارج الرياض؟", a: "لا، نطاق التغطية الميدانية الحالي للسهم كلين داخل مدينة الرياض فقط، ولا تتوفر الخدمة خارجها." },
          { q: "ما المعلومات التي أجهزها للمقارنة؟", a: "حدد نوع الموقع ومساحته والأسطح أو الأعمال المطلوبة، واطلب عرضاً مكتوباً يوضح النطاق والاستثناءات." },
        ]
    : serviceFamily === "safety"
      ? [
          { q: "هل يضمن طلب تجهيز الملف إصدار شهادة رسمية؟", a: "لا، إصدار الشهادة أو اعتمادها يخضع لتقييم وقرار الجهة المختصة، ولا يُعد تجهيز الملف ضماناً للنتيجة الرسمية." },
          { q: "ما المعلومات المفيدة قبل طلب المعاينة؟", a: "جهّز بيانات المنشأة وعنوانها والمستندات أو المخططات المتاحة، ثم وضح نوع التقرير أو المراجعة المطلوبة." },
          { q: "هل يمكن تنسيق موعد مسبق؟", a: "يمكن الاستفسار عن المواعيد المتاحة ونطاق الزيارة عبر الهاتف أو واتساب." },
        ]
      : serviceFamily === "pest-control"
        ? [
            { q: "ما التفاصيل المطلوبة للاستفسار عن مكافحة الآفات؟", a: "اذكر نوع الآفة ونوع العقار والمساحة والملاحظات التي ظهرت لديك لتوضيح نطاق الطلب." },
            { q: "هل توجد تعليمات قبل الزيارة؟", a: "تواصل مع الفريق لمعرفة تعليمات التجهيز والسلامة المناسبة لنوع الموقع والمعالجة." },
            { q: "هل يمكن تحديد موعد مسبق؟", a: "يُنسق الموعد حسب نطاق التغطية وتوفر الفريق بعد مراجعة التفاصيل." },
          ]
        : serviceFamily === "pool"
          ? [
              { q: "ما المعلومات المطلوبة للاستفسار عن تنظيف المسبح؟", a: "اذكر حجم المسبح وحالة المياه والفلتر والأعمال التي ترغب في طلبها." },
              { q: "هل يمكن الاستفسار عن تنظيف الفلتر والجدران؟", a: "نعم، وضح حالة الفلتر والجدران عند التواصل حتى يتحدد نطاق العمل المناسب." },
              { q: "كيف يتم تحديد الموعد؟", a: "يُنسق الموعد بعد مراجعة تفاصيل المسبح وموقعه وتوفر الفريق." },
            ]
          : serviceFamily === "insulation"
            ? [
                { q: "ما المعلومات المطلوبة قبل الاستفسار عن العزل؟", a: "وضح نوع السطح أو الموقع والغرض من العزل وأي ملاحظات ظاهرة." },
                { q: "كيف تُحدد طريقة العزل؟", a: "تُراجع حالة الموقع ونطاق العمل قبل توضيح الطريقة المناسبة؛ ولا ينبغي افتراض مادة أو ضمان غير متفق عليه." },
                { q: "هل يمكن تنسيق موعد مسبق؟", a: "يُنسق الموعد وفق تفاصيل الموقع وتوفر الفريق." },
              ]
            : [
                { q: `كيف أطلب ${topic}؟`, a: "تواصل معنا عبر الهاتف أو واتساب، واذكر نوع العقار والمساحة والخدمة المطلوبة." },
                { q: `كيف يحدد الفريق سعر ${topic}؟`, a: "يعتمد التقدير على المساحة وحالة الموقع وعدد العناصر وطريقة التنفيذ المطلوبة، ويؤكد بعد مراجعة التفاصيل." },
                { q: "هل يمكن تحديد موعد مسبق؟", a: "نعم، ننسق الموعد المناسب حسب توفر الفريق وموقعك داخل الرياض." },
              ]

  const servicePageBadge = getContentServiceFamilyLabel(serviceFamily)

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans" dir="rtl">
      <Navbar />

      <div className="pt-28 pb-16 bg-gradient-to-l from-slate-950 via-primary to-slate-900 text-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center gap-2 text-white/70 text-sm mb-4">
            <Link href="/" className="hover:text-white transition-colors">الرئيسية</Link>
            <ChevronLeft size={14} />
            <Link href="/services" className="hover:text-white transition-colors">الخدمات</Link>
            <ChevronLeft size={14} />
            <span className="text-secondary font-semibold">{page.title}</span>
          </div>
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 bg-secondary/20 text-secondary border border-secondary/30 px-3 py-1 rounded-full text-xs font-bold mb-3">
               <Search size={13} /> {isNoServicePage ? noServiceBadge : servicePageBadge}
            </span>
            <h1 className="text-3xl md:text-5xl font-black leading-tight text-white mb-4" data-testid="heading-seo-page">{page.title}</h1>
            <p className="text-slate-200 text-base md:text-lg leading-relaxed mb-6" data-testid="text-seo-page-excerpt">
              {page.excerpt || page.seoDescription || `دليل عملي حول ${topic} وخطوات طلب الخدمة في الرياض.`}
            </p>
            {!isNoServicePage && <div className="flex flex-wrap gap-4">
              <a href={`tel:${phoneCall || "0554498403"}`} className="inline-flex items-center gap-2 bg-white text-slate-950 px-6 py-3 rounded-xl font-bold hover:bg-secondary hover:text-white transition shadow-lg text-sm">
                <Phone size={16} /> اتصل بالعمليات
              </a>
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg text-sm">
                <MessageCircle size={16} /> تواصل عبر واتساب
              </a>
            </div>}
          </div>
        </div>
      </div>

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-10">
              {pageImages.length > 0 && (
                <section aria-label={`صور ${topic}`} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {pageImages.map((imagePath, index) => (
                      <figure
                        key={`${imagePath}-${index}`}
                        className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${index === 0 ? "sm:col-span-2" : ""}`}
                      >
                        <img
                          src={toDisplayAsset(imagePath)}
                          alt={getImageFileName(imagePath)}
                          className={`w-full object-cover ${index === 0 ? "h-64 md:h-80" : "h-52"}`}
                          loading={index === 0 ? "eager" : "lazy"}
                          data-testid={index === 0 ? "img-seo-page-cover" : `img-seo-page-support-${index}`}
                        />
                        <figcaption className="px-4 py-2 text-xs text-slate-500">{getImageFileName(imagePath)}</figcaption>
                      </figure>
                    ))}
                  </div>
                </section>
              )}
               {serviceFamily === "insulation" && (
                <Link href="/services/عزل-أسطح-بالرياض" className="block rounded-2xl border border-blue-200 bg-blue-50 p-5 font-bold text-primary hover:bg-blue-100 transition-colors">
                  تفاصيل خدمة عزل الأسطح بالرياض
                </Link>
              )}
              <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                <h2 className="text-2xl font-bold text-slate-900 border-b pb-4">تفاصيل {page.title}</h2>
                <div className="seo-page-content prose prose-slate max-w-none text-slate-700 leading-relaxed text-base" data-testid="content-seo-page" dangerouslySetInnerHTML={{ __html: page.content || "<p>لا يوجد محتوى لهذه الصفحة بعد.</p>" }} />
                <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50"><ShieldCheck className="text-primary" size={24} /><span className="text-xs font-bold text-slate-800">{isNoServicePage ? "محتوى معلوماتي لا يؤكد توفر الخدمة" : "نطاق عمل واضح قبل التنفيذ"}</span></div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50"><Clock className="text-secondary" size={24} /><span className="text-xs font-bold text-slate-800">{isNoServicePage ? "التغطية التشغيلية داخل الرياض فقط" : "تنسيق الموعد حسب التوفر"}</span></div>
                </div>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                <h2 className="text-2xl font-bold text-slate-900">{isInformationalPage ? "خطوات اختيار مقدم الخدمة" : "خطوات تنفيذ الخدمة"}</h2>
                <div className="space-y-4">
                  {processSteps.map((step, index) => (
                    <div key={step.title} className="flex gap-4 items-start p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">{index + 1}</div>
                      <div><h3 className="font-bold text-slate-900 text-sm mb-1">{step.title}</h3><p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900">{isInformationalPage ? "نقاط للتحقق قبل الاتفاق" : "المعدات والتجهيزات المناسبة"}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {equipmentItems.map(item => (
                    <div key={item} className="flex items-center gap-2 text-xs font-semibold text-slate-700 p-2.5 rounded-xl bg-slate-50"><CheckCircle2 size={16} className="text-secondary shrink-0" /><span>{item}</span></div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                <h2 className="text-2xl font-bold text-slate-900">الأسئلة الشائعة حول {page.title}</h2>
                <div className="space-y-4">
                  {faqs.map(faq => (
                    <div key={faq.q} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2"><HelpCircle size={16} className="text-primary shrink-0" />{faq.q}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed pr-6">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {isNoServicePage ? (
                <div className="bg-gradient-to-br from-primary to-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-3" role="note">
                  <h3 className="text-xl font-bold text-white">تنبيه بشأن توفر الخدمة</h3>
                  <p className="text-xs text-slate-200 leading-relaxed">{noServiceNotice}</p>
                </div>
              ) : <div className="bg-gradient-to-br from-primary to-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4">
                <h3 className="text-xl font-bold text-white">{isOutsideRiyadhPage ? "تحقق من نطاق التغطية" : isCleaningServicePage ? "اطلب خدمة التنظيف" : serviceFamily !== "other" ? "استفسر عن الخدمة" : "معلومات عن الصفحة"}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isOutsideRiyadhPage
                    ? "تغطية السهم كلين للخدمات الميدانية داخل مدينة الرياض فقط؛ لا نستقبل طلبات خارجها. هذه الصفحة معلوماتية."
                    : isCleaningServicePage
                      ? `تواصل معنا هاتفياً أو عبر واتساب لطلب ${topic} أو تحديد الموعد المناسب.`
                      : isInformationalPage
                      ? "هذه الصفحة معلوماتية ولا تؤكد توفر الخدمة في كل موقع. نطاق الخدمات الميدانية للسهم كلين داخل الرياض فقط."
                      : `تواصل معنا هاتفياً أو عبر واتساب للاستفسار عن ${topic} ونطاق الخدمة المناسب.`}
                </p>
                <div className="space-y-2 pt-2">
                  <a href={`tel:${phoneCall || "0554498403"}`} className="w-full py-3 bg-secondary hover:bg-secondary/90 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow"><Phone size={14} /> {isCleaningServicePage ? `اتصل الآن: ${phoneCall || "0554498403"}` : "اتصل للاستفسار"}</a>
                  <a href={waHref} target="_blank" rel="noopener noreferrer" className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow"><MessageCircle size={14} /> تواصل عبر واتساب</a>
                </div>
              </div>}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2"><Layers size={17} className="text-primary" /> تغطية أحياء الرياض</h3>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {Object.entries(AREAS).slice(0, 12).map(([areaSlug, area]) => {
                    const arabicSlug = ARABIC_AREA_SLUGS[areaSlug] || areaSlug
                    return <Link key={areaSlug} href={`/areas/${encodeURIComponent(arabicSlug)}`} className="bg-slate-100 hover:bg-primary hover:text-white text-slate-700 px-2.5 py-1 rounded-lg transition">{area.name}</Link>
                  })}
                </div>
              </div>
              {isCleaningServicePage && <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-base font-bold text-slate-900 mb-2">روابط مفيدة</h3>
                <Link href="/services" className="block p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition text-xs font-bold text-slate-800">استعرض جميع خدمات التنظيف <ChevronLeft size={14} className="inline text-slate-400" /></Link>
                <Link href="/cleaning-packages" className="block p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition text-xs font-bold text-slate-800">شاهد باقات التنظيف <ChevronLeft size={14} className="inline text-slate-400" /></Link>
              </div>}
            </div>
          </div>
        </div>
      </main>
      {isCleaningServicePage && <ServiceRequestForm />}
      <Footer />
    </div>
  )
}