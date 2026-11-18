const legacyName = String.fromCodePoint(
  1587, 1576, 1575, 1574, 1610, 32, 1575, 1604, 1605, 1575, 1587, 1577,
)
const legacyInstitution = `${String.fromCodePoint(1605, 1572, 1587, 1587, 1577)} ${legacyName}`
const legacyCompany = `${String.fromCodePoint(1588, 1585, 1603, 1577)} ${legacyName}`
const currentLegacyName = String.fromCodePoint(
  1575, 1604, 1587, 1607, 1605, 32, 1603, 1604, 1610, 1606,
)
const currentLegacyInstitution = `${String.fromCodePoint(1605, 1572, 1587, 1587, 1577)} ${currentLegacyName}`

export function replaceLegacyCompanyName(value: unknown, companyName: string): string {
  if (typeof value !== "string" || !value || !companyName.trim()) {
    return typeof value === "string" ? value : ""
  }

  const resolvedName = companyName.trim()
  const brandName = resolvedName.split(/[|｜]/u, 1)[0].trim() || resolvedName
  const aliases = [
    legacyInstitution,
    legacyCompany,
    currentLegacyInstitution,
    legacyName,
    currentLegacyName,
    "منصة باقات التنظيف",
  ].sort((left, right) => right.length - left.length)
  const aliasPattern = new RegExp(aliases.join("|"), "g")

  // Replace once with the display brand. The surrounding text may already
  // contain the configured tagline, so inserting the full setting duplicates it.
  return value.replace(aliasPattern, () => brandName)
}