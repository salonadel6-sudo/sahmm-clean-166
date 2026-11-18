function normalizeArabic(value) {
  return String(value || "")
    .toLocaleLowerCase("ar")
    .replace(/[\u064B-\u065F\u0670\u0640]/gu, "")
    .replace(/[أإآ]/gu, "ا")
    .replace(/ى/gu, "ي")
    .replace(/ة/gu, "ه")
}

export function resolveContentServiceFamily(...values) {
  const text = normalizeArabic(values.filter(Boolean).join(" "))

  if (/(?:سلامه|دفاع مدني|حريق)/u.test(text)) return "safety"
  if (/(?:مكافحه.{0,20}(?:حشرات|افات)|حشرات|افات|قوارض|صراصير|بق الفراش|نمل ابيض)/u.test(text)) {
    return "pest-control"
  }
  if (/(?:مسابح|مسبح|فلاتر المسابح)/u.test(text)) return "pool"
  if (/(?:عزل|عوازل)/u.test(text)) return "insulation"
  if (/(?:تنظيف|نظافه|غسيل|غسل|جلي|تلميع|تعقيم|تطهير|واجهات|مكيف|خزان|كنب|مجالس|سجاد|موكيت|رخام|شبابيك|نوافذ|تشطيب|بخار)/u.test(text)) {
    return "cleaning"
  }

  return "other"
}

export function getContentServiceFamilyLabel(family) {
  switch (family) {
    case "cleaning":
      return "دليل خدمات التنظيف في الرياض"
    case "pest-control":
      return "دليل مكافحة الحشرات في الرياض"
    case "pool":
      return "دليل خدمات المسابح في الرياض"
    case "safety":
      return "دليل خدمات السلامة للمنشآت"
    case "insulation":
      return "دليل خدمات العزل في الرياض"
    default:
      return "معلومات وإرشادات عامة"
  }
}
