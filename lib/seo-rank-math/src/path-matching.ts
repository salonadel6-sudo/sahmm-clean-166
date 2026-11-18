type RankMathPathEntity = "homepage" | "service" | "package" | "article" | "landing" | "area" | "static"

const COMMON_PATH_KEYWORDS = new Set([
  "شركة",
  "شركات",
  "مؤسسة",
  "بالرياض",
  "الرياض",
  "رياض",
  "في",
  "من",
  "و",
  "مع",
  "أفضل",
  "افضل",
  "الأفضل",
  "الافضل",
  "أرخص",
  "ارخص",
])

const AREA_PATH_KEYWORDS = new Set([
  ...COMMON_PATH_KEYWORDS,
  "تنظيف",
  "خدمات",
  "خدمة",
  "حي",
  "الحي",
  "منطقة",
])

const STATIC_PATH_PHRASES: Record<string, string[]> = {
  "/about": ["من نحن"],
  "/areas": ["أحياء"],
  "/blog": ["مدونة"],
  "/callnow": ["اتصل الآن"],
  "/cleaningpackages": ["باقات التنظيف"],
  "/contact": ["اتصل"],
  "/faq": ["الأسئلة الشائعة"],
  "/privacy": ["سياسة الخصوصية"],
  "/services": ["خدمات التنظيف"],
  "/terms": ["الشروط والأحكام"],
}

const AREA_TRANSLATIONS: Record<string, string[]> = {
  "شمال": ["north"],
  "جنوب": ["south"],
  "شرق": ["east"],
  "غرب": ["west"],
  "وسط": ["central"],
}

const ARABIC_TRANSLITERATION_OPTIONS: Record<string, string[]> = {
  "ا": ["a"], "ب": ["b"], "ت": ["t"], "ث": ["th", "s"], "ج": ["j", "g"],
  "ح": ["h"], "خ": ["kh", "x"], "د": ["d"], "ذ": ["dh", "z"], "ر": ["r"],
  "ز": ["z"], "س": ["s"], "ش": ["sh"], "ص": ["s"], "ض": ["d"], "ط": ["t"],
  "ظ": ["z", "dh"], "ع": [""], "غ": ["gh", "g"], "ف": ["f"], "ق": ["q", "k"],
  "ك": ["k"], "ل": ["l"], "م": ["m"], "ن": ["n"], "ه": ["h"], "و": ["u", "w"],
  "ي": ["i", "y"], "ى": ["a", "y"], "ء": [""], "ؤ": ["u", "w"], "ئ": ["i", "y"],
  "ة": ["a", "h", "t"],
}

function normalizePathPhrase(value: string): string {
  return String(value ?? "")
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

function decodePath(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function stripArabicArticle(value: string): string {
  return value.replace(/^(?:(?:و|ف|ب|ك|ل)?ال)/u, "")
}

function normalizeLatinSpelling(value: string): string {
  return value
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]/gu, "")
    .replace(/kh/gu, "x")
    .replace(/gh/gu, "g")
}

function collapseAdjacentLetters(value: string): string {
  return value.replace(/([a-z])\1+/gu, "$1")
}

function getSignatures(value: string, arabic: boolean): Set<string> {
  const source = arabic ? stripArabicArticle(normalizePathPhrase(value).replace(/ /gu, "")) : value
  const transliterations = new Set<string>()

  if (arabic) {
    let forms = [""]
    for (const character of source) {
      const options = ARABIC_TRANSLITERATION_OPTIONS[character] ?? [character]
      forms = forms.flatMap(form => options.map(option => `${form}${option}`)).slice(0, 64)
    }
    for (const form of forms) transliterations.add(form)
  } else {
    const normalized = normalizeLatinSpelling(value)
    transliterations.add(normalized)
    if (normalized.startsWith("al")) transliterations.add(normalized.slice(2))
    if (normalized.startsWith("el")) transliterations.add(normalized.slice(2))
  }

  const signatures = new Set<string>()
  for (const transliteration of transliterations) {
    const wordForms = [normalizeLatinSpelling(transliteration)]
    if (/[a-z]([a-z])\1[a-z]/u.test(transliteration)) {
      wordForms.push(normalizeLatinSpelling(collapseAdjacentLetters(transliteration)))
    }
    for (const wordForm of wordForms) {
      const candidate = wordForm.replace(/[aeiou]/gu, "")
      if (candidate) signatures.add(candidate)
      if (/[ht]$/u.test(candidate)) {
        const withoutTaMarbutaEnding = candidate.replace(/[ht]$/u, "")
        if (withoutTaMarbutaEnding) signatures.add(withoutTaMarbutaEnding)
      }
    }
  }
  return signatures
}

function pathTokenMatchesKeyword(pathToken: string, keywordToken: string): boolean {
  const normalizedPathToken = normalizePathPhrase(pathToken).replace(/ /gu, "")
  const normalizedKeywordToken = normalizePathPhrase(keywordToken).replace(/ /gu, "")
  if (!normalizedPathToken || !normalizedKeywordToken) return false
  if (normalizedPathToken === normalizedKeywordToken) return true

  const pathIsArabic = /[\u0600-\u06FF]/u.test(normalizedPathToken)
  const keywordForms = new Set([normalizedKeywordToken])
  if (/[\u0600-\u06FF]/u.test(normalizedKeywordToken)) {
    keywordForms.add(stripArabicArticle(normalizedKeywordToken))
  }

  for (const keywordForm of keywordForms) {
    const keywordSignatures = getSignatures(keywordForm, /[\u0600-\u06FF]/u.test(keywordForm))
    const pathSignatures = getSignatures(normalizedPathToken, pathIsArabic)
    for (const signature of keywordSignatures) {
      if (signature.length < 2) continue
      if (pathSignatures.has(signature)) return true
    }
  }
  return false
}

function includesPhrase(value: string, phrase: string): boolean {
  const haystack = normalizePathPhrase(value)
  const needle = normalizePathPhrase(phrase)
  return Boolean(haystack && needle && ` ${haystack} `.includes(` ${needle} `))
}

export function isRankMathKeywordPresentInPath(
  slug: string,
  keyword: string,
  entity: RankMathPathEntity,
): boolean {
  let decodedPath = slug
  try {
    decodedPath = new URL(slug, "http://origin.invalid").pathname
  } catch {
    // The analyzer reports URL validity separately; keep checking the supplied path.
  }
  decodedPath = decodePath(decodedPath)
  const path = decodedPath.replace(/[-_/]+/gu, " ")
  if (includesPhrase(path, keyword)) return true

  const normalizedPath = `/${decodedPath
    .split("/")
    .filter(Boolean)
    .map(part => normalizePathPhrase(part).replace(/ /gu, ""))
    .join("/")}`
  if (entity === "static") {
    return (STATIC_PATH_PHRASES[normalizedPath] ?? []).some(phrase => includesPhrase(keyword, phrase))
  }

  const keywordParts = normalizePathPhrase(keyword).split(" ").filter(Boolean)
  const ignoredWords = entity === "area" ? AREA_PATH_KEYWORDS : COMMON_PATH_KEYWORDS
  const coreKeywordParts = keywordParts.filter(part => !ignoredWords.has(part))
  if (!coreKeywordParts.length) return false

  const finalPathPart = decodedPath.split("/").filter(Boolean).at(-1) ?? decodedPath
  const pathTokens = finalPathPart.split(/[-_]+/gu).filter(Boolean)

  return coreKeywordParts.every(keywordPart => {
    const aliases = entity === "area" ? AREA_TRANSLATIONS[keywordPart] ?? [] : []
    if (aliases.some(alias => pathTokens.some(token =>
      token.toLocaleLowerCase("en").replace(/[^a-z0-9]/gu, "").replace(/^(?:al|el)/u, "") === alias,
    ))) {
      return true
    }
    return pathTokens.some(pathToken => pathTokenMatchesKeyword(pathToken, keywordPart))
  })
}
