function titleParts(value: string): string[] {
  return String(value || "")
    .split(/[|｜]/u)
    .map(part => part.replace(/\s+/gu, " ").trim())
    .filter(Boolean)
}

function titlePartKey(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase("ar")
}

export function normalizeSeoTitle(value: string): string {
  const seen = new Set<string>()
  return titleParts(value)
    .filter(part => {
      const key = titlePartKey(part)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .join(" | ")
}

export function composeSeoTitle(value: string, companyName: string): string {
  const fullSuffix = titleParts(companyName)
  if (!fullSuffix.length) return normalizeSeoTitle(value)

  const fullSuffixKeys = new Set(fullSuffix.map(titlePartKey))
  const compactAliases = fullSuffix
    .map(part => part.replace(/^(?:مؤسسة|شركة)\s+/u, "").trim())
    .filter((part, index) => part && titlePartKey(part) !== titlePartKey(fullSuffix[index]))
  const compactAliasKeys = new Set(compactAliases.map(titlePartKey))
  const rawParts = titleParts(value)
  const alreadyHasCompactAlias = rawParts.some(part =>
    compactAliasKeys.has(titlePartKey(part))
      && !fullSuffixKeys.has(titlePartKey(part)),
  )
  const suffix = alreadyHasCompactAlias ? compactAliases : fullSuffix
  const suffixKeys = new Set([
    ...fullSuffixKeys,
    ...(alreadyHasCompactAlias ? compactAliasKeys : []),
  ])
  const seen = new Set<string>()
  const base = rawParts.filter(part => {
    const key = titlePartKey(part)
    if (suffixKeys.has(key) || seen.has(key)) return false
    seen.add(key)
    return true
  })

  return [...base, ...suffix].join(" | ")
}

export function stripSeoTitleSuffix(value: string, companyName: string): string {
  const suffixKeys = new Set(titleParts(companyName).map(titlePartKey))
  const seen = new Set<string>()
  return titleParts(value)
    .filter(part => {
      const key = titlePartKey(part)
      if (suffixKeys.has(key) || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .join(" | ")
}
