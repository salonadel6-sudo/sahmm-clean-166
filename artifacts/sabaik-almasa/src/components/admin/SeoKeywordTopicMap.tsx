import { AlertTriangle, BookOpen, ExternalLink, FilePlus2, Info, MapPin, Target } from "lucide-react"
import type { SeoKeywordTopicEntry, SeoKeywordTopicMap as SeoKeywordTopicMapData } from "@workspace/api-client-react"
import type { SeoAuditPage } from "@/lib/seo-audit"
import { normalizeRankMathKeywordPhrase } from "@workspace/seo-rank-math"

type Owner = {
  id: string
  title: string
  url: string
  kind: string
  focusKeyword: string
  source: "exact" | "observed" | "audit"
}

type TopicRow = {
  keyword: SeoKeywordTopicEntry
  owner: Owner | null
  alternatives: Owner[]
  gapTopic: { id: string; title: string } | null
  scopeReview: boolean
  supportPages: Owner[]
  primaryTerm: string
  isPrimary: boolean
}

function pageOwner(page: { url: string; title: string; kind?: string; focusKeyword?: string }, source: Owner["source"]): Owner {
  return {
    id: page.url,
    title: page.title || page.url,
    url: page.url,
    kind: page.kind || "صفحة",
    focusKeyword: page.focusKeyword || "",
    source,
  }
}

function gapTopic(term: string): { id: string; title: string } {
  const normalized = normalizeRankMathKeywordPhrase(term)
  if (/(?:الخرج|جده|مكه|الدمام|المدينه المنوره|الطايف|ابها|تبوك|القصيم)/u.test(normalized)) {
    return { id: "scope-review", title: "مراجعة نطاق التغطية قبل أي توصية" }
  }
  if (/(?:السعوديه|المملكه العربيه السعوديه)/u.test(normalized) && !normalized.includes("الرياض")) {
    return { id: "scope-review", title: "مراجعة نطاق التغطية قبل أي توصية" }
  }
  const areaNames = [
    "شمال الرياض", "شرق الرياض", "غرب الرياض", "جنوب الرياض", "وسط الرياض",
    "الملقا", "حطين", "الياسمين", "النرجس", "العارض", "الصحافة", "العقيق",
    "العليا", "الروضة", "قرطبة", "ظهرة لبن",
  ]
  const area = areaNames.find(name => normalized.includes(normalizeRankMathKeywordPhrase(name)))
  if (area) return { id: `area:${normalizeRankMathKeywordPhrase(area)}`, title: `تغطية خدمة في ${area} بالرياض` }
  if (/(?:حراج)/u.test(normalized)) return { id: "marketplace-intent", title: "مراجعة نية عبارات منصات الإعلانات" }
  if (/(?:سعر|اسعار|تكلف|باقات|عرض)/u.test(normalized)) return { id: "pricing", title: "الأسعار والباقات" }
  if (/(?:بعد البناء|بعد التشطيب|التشطيب|البناء)/u.test(normalized)) return { id: "post-construction", title: "التنظيف بعد البناء والتشطيب" }
  if (/(?:مكتب|شرك|اداري)/u.test(normalized)) return { id: "offices", title: "تنظيف المكاتب والمنشآت" }
  if (/(?:فلل|فيلا|قصور|قصر)/u.test(normalized)) return { id: "villas", title: "تنظيف الفلل والقصور" }
  if (/(?:مجالس|مجلس|كنب|مفروشات)/u.test(normalized)) return { id: "upholstery", title: "تنظيف المجالس والمفروشات" }
  if (/(?:سجاد|موكيت|ستائر)/u.test(normalized)) return { id: "carpets", title: "تنظيف السجاد والمفروشات" }
  if (/(?:رخام|ارضيات|سيراميك|جلي|تلميع)/u.test(normalized)) return { id: "floors", title: "جلي وتلميع الرخام والأرضيات" }
  if (/(?:خزان|مياه)/u.test(normalized)) return { id: "tanks", title: "تنظيف الخزانات" }
  if (/(?:مكيف|تكييف)/u.test(normalized)) return { id: "ac", title: "تنظيف المكيفات" }
  if (/(?:عزل|عوازل)/u.test(normalized)) return { id: "insulation", title: "خدمات العزل بالرياض" }
  if (/(?:مكافح|حشرات|مبيدات|اباده)/u.test(normalized)) return { id: "pest-control", title: "مكافحة الحشرات بالرياض" }
  if (/(?:مسبح|مسابح)/u.test(normalized)) return { id: "pools", title: "تنظيف المسابح بالرياض" }
  if (/(?:واجهه|واجهات|زجاج)/u.test(normalized)) return { id: "facades", title: "تنظيف الواجهات بالرياض" }
  if (/(?:طريقة|كيف|نصائح|دليل|متى|كم مرة)/u.test(normalized)) return { id: "how-to", title: "مقال إرشادي عن خدمة تنظيف بالرياض" }
  if (/(?:منزل|منازل|شقق|شقة|بيوت)/u.test(normalized)) return { id: "homes", title: "تنظيف المنازل والشقق" }
  if (/(?:اثاث|مجالس|كنب|مفروشات)/u.test(normalized)) return { id: "upholstery", title: "تنظيف المجالس والمفروشات" }
  if (/(?:تنظيف|نظافه|غسيل)/u.test(normalized)) return { id: "general-cleaning", title: "خدمات التنظيف بالرياض" }
  return { id: "scope-review", title: "مراجعة الخدمة قبل اقتراح محتوى" }
}

function toTopicRows(data: SeoKeywordTopicMapData, auditPages: SeoAuditPage[]): TopicRow[] {
  const auditIndex = auditPages.map(page => ({
    owner: pageOwner(page, "audit"),
    normalizedFocus: normalizeRankMathKeywordPhrase(page.focusKeyword),
  }))
  const preliminary = data.keywords.map(keyword => {
    const normalized = normalizeRankMathKeywordPhrase(keyword.term)
    const auditedExact = auditIndex
      .filter(entry => entry.normalizedFocus === normalized)
      .map(entry => entry.owner)
    const exactOwners = [
      ...keyword.exactOwners.map(owner => pageOwner(owner, "exact")),
      ...auditedExact,
    ].filter((owner, index, owners) => owners.findIndex(other => other.url === owner.url) === index)
    const observations = keyword.samplePages.map(page => pageOwner(page, "observed"))
    const owner = exactOwners[0]
      ?? auditedExact[0]
      ?? observations[0]
      ?? null
    const proposedTopic = gapTopic(keyword.term)
    const scopeReview = proposedTopic.id === "scope-review"
    const gap = owner ? null : proposedTopic
    const supportPages = observations
      .filter((page, index, pages) => page.url !== owner?.url && pages.findIndex(other => other.url === page.url) === index)
    return {
      keyword,
      owner,
      alternatives: exactOwners.slice(1),
      gapTopic: gap,
      scopeReview,
      supportPages,
      ownerGroupId: owner ? `page:${owner.url}` : `gap:${gap!.id}`,
    }
  })

  const groups = new Map<string, typeof preliminary>()
  for (const row of preliminary) {
    const group = groups.get(row.ownerGroupId) ?? []
    group.push(row)
    groups.set(row.ownerGroupId, group)
  }

  return preliminary.map(row => {
    const group = groups.get(row.ownerGroupId) ?? [row]
    const explicitPrimary = group.find(item =>
      item.owner?.focusKeyword
      && normalizeRankMathKeywordPhrase(item.owner.focusKeyword) === normalizeRankMathKeywordPhrase(item.keyword.term),
    )
    const primary = explicitPrimary ?? [...group].sort((a, b) =>
      b.keyword.strength - a.keyword.strength
      || b.keyword.occurrences - a.keyword.occurrences
      || a.keyword.term.localeCompare(b.keyword.term, "ar"),
    )[0]
    return {
      keyword: row.keyword,
      owner: row.owner,
      alternatives: row.alternatives,
      gapTopic: row.gapTopic,
      scopeReview: row.scopeReview,
      supportPages: row.supportPages,
      primaryTerm: primary.keyword.term,
      isPrimary: normalizeRankMathKeywordPhrase(primary.keyword.term) === normalizeRankMathKeywordPhrase(row.keyword.term),
    }
  })
}

function readUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.host}${decodeURIComponent(parsed.pathname)}`
  } catch {
    return url
  }
}

export default function SeoKeywordTopicMap({
  data,
  auditPages = [],
  auditCompletedAt,
}: {
  data: SeoKeywordTopicMapData
  auditPages?: SeoAuditPage[]
  auditCompletedAt?: string
}) {
  const rows = toTopicRows(data, auditPages)
  const gaps = new Set(rows.filter(row => row.gapTopic && row.gapTopic.id !== "scope-review").map(row => row.gapTopic!.id))
  const scopeReviewCount = rows.filter(row => row.scopeReview).length
  const duplicateRows = rows.filter(row => row.alternatives.length > 0)

  return (
    <div className="space-y-4" dir="rtl">
      <section className="rounded-2xl border border-teal-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-teal-100 bg-teal-50/50 px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-teal-950">
              <BookOpen size={16} className="text-teal-700" />
              خريطة الاستهداف التحريري
            </h3>
            <p className="mt-1 max-w-4xl text-xs leading-6 text-teal-900/75">
              يُربط الاستهداف بمالك قائم أو بموضوع مقترح ضمن الخدمات المؤكدة في الرياض. الصفحات التي تذكر العبارة ظاهرة كدعم أو مرشّح؛ ولا تنشأ صفحة أو يتغير محتوى منشور من هذه الخريطة.
            </p>
            {auditCompletedAt && (
              <p className="mt-1 text-[10px] text-teal-800/70">
                بيانات الصفحات العامة والأحياء مأخوذة من آخر فحص محفوظ: {new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(auditCompletedAt))}
              </p>
            )}
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-teal-800">
            {rows.length} من أصل 50 عبارة · القياس {new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.measuredAt))}
          </span>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500">مصدر الترتيب</p>
            <p className="mt-1 text-sm font-extrabold text-slate-900">قوة المحتوى الداخلي</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">{data.orderSource}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3">
            <p className="text-xs font-bold text-amber-800">فجوات التغطية</p>
            <p className="mt-1 text-xl font-black text-amber-900">{gaps.size.toLocaleString("ar-SA")} موضوعاً مقترحاً</p>
            <p className="mt-1 text-[11px] leading-5 text-amber-800">تجميع تحريري مؤقت، وليس إذناً بإنشاء صفحة مكررة.</p>
            {scopeReviewCount > 0 && (
              <p className="mt-1 text-[10px] text-amber-900">{scopeReviewCount.toLocaleString("ar-SA")} عبارة قيد مراجعة النطاق دون توصية محتوى.</p>
            )}
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
            <p className="text-xs font-bold text-rose-800">تعارضات مالك التركيز</p>
            <p className="mt-1 text-xl font-black text-rose-900">{duplicateRows.length.toLocaleString("ar-SA")} عبارة</p>
            <p className="mt-1 text-[11px] leading-5 text-rose-800">العبارة مضبوطة كتركيز لأكثر من صفحة منشورة.</p>
          </div>
        </div>

        <div className="mx-4 mb-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs leading-6 text-blue-900">
          <Info size={15} className="mt-0.5 shrink-0" />
          <p>
            درجة القوة وعدد مرات الظهور والصفحات مقاييس داخلية من المحتوى المنشور، وليست ترتيباً أو حجم بحث. نية البحث لا تظهر إلا إذا كانت مسجلة في قائمة الكلمات اليدوية. أرقام الترتيب والحجم اليدوية، إن وجدت، ليست بيانات Search Console.
          </p>
        </div>
      </section>

      {duplicateRows.length > 0 && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-rose-900">
            <AlertTriangle size={16} /> مراجعة ازدواج مالك التركيز
          </h3>
          <ul className="mt-2 space-y-2 text-xs leading-5 text-rose-900">
            {duplicateRows.map(row => (
              <li key={row.keyword.term}>
                <strong>{row.keyword.term}</strong>
                {" — "}
                {[
                  row.owner,
                  ...row.alternatives,
                ].filter((owner): owner is Owner => Boolean(owner)).map(owner => `${owner.title} (${readUrl(owner.url)})`).join(" · ")}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-5 text-rose-800">هذه إشارة للمراجعة فقط؛ لا تُعدّل أي صفحة أو canonical تلقائياً.</p>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">لا توجد عبارات مدعومة ضمن قائمة أعلى 50 حتى الآن.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-extrabold text-slate-500">
                  <th className="px-4 py-3 text-right">الأولوية والعبارة</th>
                  <th className="px-3 py-3 text-right">المالك التحريري الواحد</th>
                  <th className="px-3 py-3 text-center">الدور داخل الصفحة</th>
                  <th className="px-3 py-3 text-center">المقياس ومصدر الترتيب</th>
                  <th className="px-3 py-3 text-center">نية البحث</th>
                  <th className="px-3 py-3 text-right">التداخل والصفحات الداعمة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const level = row.keyword.strength >= 70
                    ? "text-emerald-700"
                    : row.keyword.strength >= 35
                      ? "text-amber-700"
                      : "text-rose-700"
                  const intent = row.keyword.intent
                  const intentLabel: Record<string, string> = {
                    transactional: "تجاري",
                    commercial: "بحثي",
                    informational: "معلوماتي",
                    navigational: "توجيهي",
                  }
                  const overlap = row.alternatives.length > 0
                  const manyPages = row.keyword.pageCount > 1
                  return (
                    <tr key={row.keyword.term} className={`border-b border-slate-50 align-top ${index % 2 ? "bg-slate-50/30" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 text-[10px] font-extrabold text-slate-400">#{(index + 1).toLocaleString("ar-SA")}</span>
                          <div>
                            <p className="font-bold text-slate-900">{row.keyword.term}</p>
                            {row.keyword.manualPosition !== null && (
                              <p className="mt-1 text-[10px] text-slate-500">ترتيب مدخل يدوياً: #{row.keyword.manualPosition}</p>
                            )}
                            {row.keyword.manualVolume !== null && (
                              <p className="text-[10px] text-slate-500">حجم مدخل يدوياً: {row.keyword.manualVolume.toLocaleString("ar-SA")}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[270px] px-3 py-3">
                        {row.owner ? (
                          <div>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${row.owner.source === "exact" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
                              {row.owner.source === "exact"
                                ? "مالك تركيز منشور"
                                : row.owner.source === "audit"
                                  ? "مالك تركيز وفق الفحص المحفوظ"
                                  : "مالك مرشح من التغطية"}
                            </span>
                            <p className="mt-1 font-bold text-slate-800">{row.owner.title}</p>
                            <a href={row.owner.url} target="_blank" rel="noreferrer" dir="ltr" className="mt-1 inline-flex items-center gap-1 break-all text-[10px] text-teal-700 underline underline-offset-2">
                              {readUrl(row.owner.url)} <ExternalLink size={10} />
                            </a>
                            {row.owner.focusKeyword && (
                              <p className="mt-1 text-[10px] text-slate-500">التركيز المضبوط: {row.owner.focusKeyword}</p>
                            )}
                          </div>
                        ) : row.scopeReview ? (
                          <div>
                            <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">مراجعة النطاق — دون توصية</span>
                            <p className="mt-1 font-bold text-rose-900">{row.gapTopic?.title}</p>
                            <p className="mt-1 text-[10px] leading-5 text-rose-800">لا يُقترح إنشاء محتوى حتى يتأكد المحرر من أن الخدمة والتغطية ضمن الرياض والعروض الفعلية.</p>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">مالك مقترح — غير منشور</span>
                            <p className="mt-1 flex items-center gap-1 font-bold text-amber-900"><FilePlus2 size={13} />{row.gapTopic?.title}</p>
                            <p className="mt-1 text-[10px] leading-5 text-amber-800">لا يوجد مالك منشور يذكر العبارة؛ راجع الصفحات القريبة قبل اعتماد موضوع جديد.</p>
                          </div>
                        )}
                        {row.owner && row.scopeReview && (
                          <p className="mt-2 text-[10px] font-bold leading-5 text-rose-700">
                            راجع نطاق الخدمة والتغطية الجغرافية قبل اقتراح محتوى لهذه العبارة.
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {row.isPrimary
                          ? <span className="inline-flex rounded-full bg-teal-100 px-2.5 py-1 text-[10px] font-extrabold text-teal-900"><Target size={11} className="ml-1" />أساسي</span>
                          : <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">مساند</span>}
                        <p className="mt-1 max-w-[150px] text-[10px] leading-5 text-slate-500">الأساسي المقترح: {row.primaryTerm}</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <p className={`font-extrabold ${level}`}>{row.keyword.strength}/100 · قوة محتوى</p>
                        <p className="mt-1 text-[10px] leading-5 text-slate-600">{row.keyword.occurrences.toLocaleString("ar-SA")} ظهور · {row.keyword.pageCount.toLocaleString("ar-SA")} صفحة · {row.keyword.articleCount.toLocaleString("ar-SA")} مقال</p>
                        <p className="mt-1 max-w-[210px] text-[9px] leading-4 text-slate-400">{row.keyword.orderSource}</p>
                        {row.keyword.manualDifficulty !== null && <p className="mt-1 text-[10px] text-slate-500">صعوبة يدوية: {row.keyword.manualDifficulty}/100</p>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {intent ? (
                          <>
                            <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-800">{intentLabel[intent] ?? intent}</span>
                            <p className="mt-1 text-[9px] text-slate-400">مُسجلة يدوياً</p>
                          </>
                        ) : <span className="text-[10px] text-slate-400">غير موثقة</span>}
                      </td>
                      <td className="max-w-[300px] px-3 py-3">
                        {overlap && (
                          <p className="mb-1 flex items-center gap-1 text-[10px] font-bold text-rose-700">
                            <AlertTriangle size={12} /> أكثر من صفحة تستهدف العبارة
                          </p>
                        )}
                        {!overlap && manyPages && (
                          <p className="mb-1 flex items-center gap-1 text-[10px] font-bold text-amber-700">
                            <MapPin size={12} /> تظهر نصياً في {row.keyword.pageCount.toLocaleString("ar-SA")} صفحات؛ لم يُسجل مالك تركيز مكرر
                          </p>
                        )}
                        {row.supportPages.length > 0 ? (
                          <ul className="space-y-1">
                            {row.supportPages.slice(0, 3).map(page => (
                              <li key={page.url} className="truncate text-[10px] text-slate-600" title={page.title}>
                                دعم: <a href={page.url} target="_blank" rel="noreferrer" className="text-teal-700 underline underline-offset-2">{page.title}</a>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[10px] text-slate-400">لا توجد صفحات داعمة مرصودة</p>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="flex items-start gap-2 px-1 text-[11px] leading-5 text-slate-500">
        <Info size={13} className="mt-0.5 shrink-0" />
        الصفحة المالكة والعبارات الأساسية اقتراحات تحريرية غير محفوظة. راجع نطاق الخدمات الفعلية في الرياض والنية قبل أي تعديل أو نشر يدوي.
      </p>
    </div>
  )
}
