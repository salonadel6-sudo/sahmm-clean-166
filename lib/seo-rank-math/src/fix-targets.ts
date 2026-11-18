export type RankMathFixEntity = "article" | "landing" | "service" | "package"
export type RankMathFixField =
  | "seoTitle"
  | "seoDescription"
  | "seoKeywords"
  | "targetKeyword"
  | "title"
  | "content"
  | "description"

export interface RankMathFixTarget {
  field: RankMathFixField
  label: string
  mode: "text" | "intro" | "expand"
}

const shortDescriptionSuffix = " لمعرفة التفاصيل."

/**
 * Safely complete a generated SEO description when it misses the lower limit
 * by only a few characters. Larger or over-limit candidates stay untouched so
 * the model can retry instead of having meaningful copy rewritten or clipped.
 */
export function repairShortRankMathDescription(
  value: string,
  minimum: number,
  maximum: number,
): string {
  const normalized = value.replace(/\s+/gu, " ").trim()
  const length = [...normalized].length
  if (!normalized || length >= minimum || length > maximum) return normalized

  const repairBase = normalized.replace(/[.!?؟،؛:…]+$/gu, "").trim()
  const suffixLength = [...shortDescriptionSuffix].length
  const baseLength = [...repairBase].length
  const missing = minimum - baseLength
  if (missing > suffixLength || baseLength + suffixLength > maximum) return normalized

  return `${repairBase}${shortDescriptionSuffix}`
}

/**
 * Maps the analyzer's public check IDs to the editable field for each entity.
 * The analyzer may prefix IDs in UI reports; API callers can also send bare IDs.
 */
export function getRankMathFixTarget(
  checkId: string,
  entity: RankMathFixEntity,
): RankMathFixTarget | null {
  const id = checkId.replace(/^rankmath-/u, "")
  if (["title-length", "keyword-title"].includes(id)) {
    return { field: "seoTitle", label: "عنوان Rank Math", mode: "text" }
  }
  if (["description-length", "keyword-description"].includes(id)) {
    return { field: "seoDescription", label: "وصف Rank Math", mode: "text" }
  }
  if (id === "focus-keyword") {
    return {
      field: entity === "landing" ? "targetKeyword" : "seoKeywords",
      label: "عبارة التركيز (Rank Math)",
      mode: "text",
    }
  }
  if (id === "keyword-h1") {
    return { field: "title", label: "العنوان الرئيسي H1", mode: "text" }
  }
  if (["keyword-intro", "keyword-introduction"].includes(id)) {
    return {
      field: entity === "service" || entity === "package" ? "description" : "content",
      label: entity === "service" ? "وصف الخدمة" : entity === "package" ? "وصف الباقة" : "مقدمة المحتوى",
      mode: "intro",
    }
  }
  if (id === "content-depth") {
    return {
      field: entity === "service" || entity === "package" ? "description" : "content",
      label: entity === "service" ? "وصف الخدمة" : entity === "package" ? "وصف الباقة" : "محتوى الصفحة",
      mode: "expand",
    }
  }
  return null
}
