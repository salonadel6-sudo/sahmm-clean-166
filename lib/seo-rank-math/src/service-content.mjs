import contentConfig from "../../seo-service-page-content.json" with { type: "json" }
import packageContentConfig from "../../seo-package-page-content.json" with { type: "json" }

function plainText(value = "") {
  return String(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<!--[\s\S]*?-->/gu, " ")
    .replace(/<[^>]*>/gu, " ")
    .replace(/&(#(?:x[\da-f]+|\d+)|amp|lt|gt|quot|apos|nbsp);/giu, (entity, body) => {
      if (body[0] === "#") {
        const hexadecimal = body[1]?.toLowerCase() === "x"
        const point = Number.parseInt(body.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10)
        return Number.isInteger(point) && point > 0 && point <= 0x10ffff
          && !(point >= 0xd800 && point <= 0xdfff)
          ? String.fromCodePoint(point)
          : entity
      }
      return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }[body.toLowerCase()] ?? entity
    })
    .replace(/\s+/gu, " ")
    .trim()
}

function isKeywordSpam(text) {
  if (/ , /.test(text)) return true
  const commas = (text.match(/,/g) || []).length
  const words = text.split(/\s+/u).filter(Boolean).length
  return words > 0 && commas / words > 0.25
}

function sanitizeServiceText(value) {
  return plainText(value)
    .replace(/(?:تبدأ|يبدأ)\s+من\s+[\d,]+\s*(?:ر\.س|ريال)(?:\s*\/\s*(?:م²|للمكيف))?/gu, "يُحدد بعد مراجعة تفاصيل الموقع")
    .replace(/\d{1,3}\s*(?:—|-|إلى)\s*\d{1,3}\s*دقيقة/gu, "حسب الموعد والتوفر")
    .replace(/\d{1,3}\s*دقيقة/gu, "حسب الموعد والتوفر")
    .replace(/(?:معاينة|عرض سعر|عروض أسعار)\s+(?:ميدانية\s+)?(?:ال)?مجاني(?:ة)?/gu, "معاينة أو عرض حسب تفاصيل الطلب")
    .replace(/ضمان(?:اً|ا)?\s+(?:كامل|شامل|معتمد)(?:اً|ا)?(?:\s+100%)?/gu, "وفق نطاق العمل المتفق عليه")
    .replace(/(?:أحدث|العالمية)\s+(?:المعدات|الأجهزة|ماكينات)/gu, "الأدوات المناسبة")
    .replace(/ماكينات إيطالية/gu, "معدات مناسبة")
    .replace(/(?:مصرحة|معتمدة|مطابقة للاشتراطات الصحية)/gu, "مناسبة للاستخدام")
    .replace(/\b(?:140°|150 بار|3000 واط)\b/gu, "حسب نوع الخدمة")
    .replace(/(?:تغطية كاملة لكافة|تغطية شاملة لجميع|جميع أحياء)\s+(?:أحياء ومناطق\s+)?الرياض/gu, "الأحياء المدرجة في الرياض")
    .replace(/(?:وصول سريع|استجابة فورية|حجز فوري|عرض سعر فوري|اتصال فوري|تسليم فوري|تعقيم فوري|تجفيف فوري)/gu, "تنسيق حسب الموعد")
}

function interpolate(value, variables) {
  return String(value ?? "").replace(/\{([A-Za-z]+)\}/gu, (_, key) => String(variables[key] ?? ""))
}

export function buildServiceVisibleContent(input) {
  const title = plainText(input.title ?? "")
  const slug = plainText(input.slug ?? "")
  const companyName = plainText(input.companyName ?? "") || "الشركة"
  const rawDescription = plainText(input.description ?? "") || contentConfig.fallbackDescription
  const descriptionParts = rawDescription.split(/\.\s+/u)
  const cleanParts = []
  for (const part of descriptionParts) {
    const trimmed = part.replace(/\.$/u, "").trim()
    if (!trimmed) continue
    if (isKeywordSpam(trimmed)) break
    cleanParts.push(trimmed)
  }
  const cleanedDescription = cleanParts.join(". ").trim()
  const bodyDescription = sanitizeServiceText(
    cleanedDescription.length > 10 ? cleanedDescription : descriptionParts[0] || rawDescription,
  )
  const rawMeta = plainText(input.seoDescription ?? "")
  const metaDescription = sanitizeServiceText(
    rawMeta && !isKeywordSpam(rawMeta) ? rawMeta : bodyDescription,
  ).slice(0, 160)
  const isInsulation = /عزل|عوازل/iu.test(`${title} ${slug}`)
  const serviceData = isInsulation ? contentConfig.insulation : contentConfig.default
  const variables = { serviceTitle: title, companyName }
  const labels = Object.fromEntries(
    Object.entries(contentConfig.labels).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.map(item => interpolate(item, variables)) : interpolate(value, variables),
    ]),
  )
  const summary = interpolate(contentConfig.summaryTemplate, variables)
  const processSteps = serviceData.processSteps.map(step => ({
    title: interpolate(step.title, variables),
    desc: interpolate(step.desc, variables),
  }))
  const equipment = serviceData.equipment.map(item => interpolate(item, variables))
  const faqs = serviceData.faqs.map(faq => ({
    q: interpolate(faq.q, variables),
    a: interpolate(faq.a, variables),
  }))
  const contentText = [
    labels.summary,
    summary,
    title,
    labels.details,
    bodyDescription,
    ...labels.trustFacts,
    labels.process,
    ...processSteps.flatMap(step => [step.title, step.desc]),
    isInsulation ? labels.insulationEquipment : labels.equipment,
    ...equipment,
    labels.faq,
    ...faqs.flatMap(faq => [faq.q, faq.a]),
    labels.cta,
    labels.ctaDescription,
  ].filter(Boolean).join(" ")

  return {
    title,
    isInsulation,
    summary,
    bodyDescription,
    metaDescription,
    labels,
    processSteps,
    equipment,
    faqs,
    contentText,
  }
}

function packageFeatures(value) {
  if (Array.isArray(value)) return value.map(plainText).filter(Boolean)
  const text = String(value ?? "").trim()
  if (!text) return []
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed.map(plainText).filter(Boolean)
  } catch {}
  return text.split(/\r?\n/u).map(plainText).filter(Boolean)
}

export function buildPackageVisibleContent(input) {
  const name = plainText(input.name ?? "")
  const category = plainText(input.category ?? "")
  const categoryLabel = packageContentConfig.categoryLabels[category] || category || "خدمات تنظيف"
  const size = plainText(input.size ?? "")
  const capacity = plainText(input.capacity ?? "")
  const suitableFor = plainText(input.suitableFor ?? "")
  const rentalPeriod = plainText(input.rentalPeriod ?? "")
  const description = buildServiceVisibleContent({
    title: name,
    description: plainText(input.description ?? "") || packageContentConfig.fallbackDescription,
  }).bodyDescription
  const features = packageFeatures(input.features)
  const labels = packageContentConfig.labels
  const contentText = [
    name,
    categoryLabel,
    size && `${labels.size}: ${size}`,
    capacity && `${labels.capacity}: ${capacity}`,
    suitableFor && `${labels.suitableFor} ${suitableFor}`,
    rentalPeriod && `${labels.rentalPeriod}: ${rentalPeriod}`,
    description,
    features.length > 0 && labels.features,
    ...features,
    labels.priceHeading,
    labels.priceValue,
    labels.priceDescription,
    labels.ctaHeading,
    labels.ctaDescription,
  ].filter(Boolean).join(" ")

  return {
    name,
    categoryLabel,
    size,
    capacity,
    suitableFor,
    rentalPeriod,
    description,
    features,
    labels,
    contentText,
  }
}
