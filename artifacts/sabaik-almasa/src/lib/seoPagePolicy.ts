/**
 * Runtime policy for standalone SEO pages.
 * The shared JSON rules are also consumed by the Node and PHP sitemap builders.
 */
import policy from "../../../../lib/seo-page-policy.json"

const SEO_PAGE_MIN_CONTENT_CHARS = policy.minimumVisibleContentCharacters
const UNSUPPORTED_TOPIC_PATTERNS = policy.unsupportedTopicPatterns.map(pattern => new RegExp(pattern, "iu"))
const SUPPORTED_SERVICE_TOPIC_PATTERNS = policy.supportedServiceTopicPatterns.map(pattern => new RegExp(pattern, "iu"))

function visibleText(value: string) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<!--[\s\S]*?-->/gu, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#(?:x[\da-f]+|\d+)|amp|lt|gt|quot|apos|nbsp|copy|reg|ndash|mdash|hellip|lsquo|rsquo|ldquo|rdquo);/giu, (entity, body: string) => {
      if (body[0] === "#") {
        const hex = body[1]?.toLowerCase() === "x"
        const codePoint = Number.parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10)
        return Number.isInteger(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
          && !(codePoint >= 0xd800 && codePoint <= 0xdfff)
          ? String.fromCodePoint(codePoint)
          : entity
      }
      const entities: Record<string, string> = {
        amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
        copy: "©", reg: "®", ndash: "–", mdash: "—", hellip: "…",
        lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
      }
      return entities[body.toLowerCase()] ?? entity
    })
    .replace(/\s+/g, " ")
    .trim()
}

export function getSeoPageIndexability(page: {
  title?: string
  targetKeyword?: string
  content?: string
  seoTitle?: string
  canonicalUrl?: string
  slug?: string
}) {
  const intentText = [page.title, page.targetKeyword, page.seoTitle].filter(Boolean).join(" ")
  const contentChars = [...visibleText(String(page.content || ""))].length
  if (UNSUPPORTED_TOPIC_PATTERNS.some(pattern => pattern.test(intentText))) {
    return { indexable: false, reason: "unsupported-topic", contentChars }
  }
  if (!SUPPORTED_SERVICE_TOPIC_PATTERNS.some(pattern => pattern.test(intentText))) {
    return { indexable: false, reason: "no-supported-service-intent", contentChars }
  }
  if (contentChars < SEO_PAGE_MIN_CONTENT_CHARS) {
    return { indexable: false, reason: "thin-content", contentChars }
  }
  if (page.canonicalUrl?.trim()) {
    try {
      const canonicalUrl = page.canonicalUrl.startsWith("/")
        ? new URL(page.canonicalUrl, "http://origin.invalid")
        : new URL(page.canonicalUrl)
      const canonicalPath = decodeURIComponent(canonicalUrl.pathname)
      if (canonicalPath !== `/page/${page.slug || ""}`) {
        return { indexable: false, reason: "non-self-canonical", contentChars }
      }
    } catch {
      return { indexable: false, reason: "invalid-canonical", contentChars }
    }
  }
  return { indexable: true, reason: "supported-service-intent", contentChars }
}
