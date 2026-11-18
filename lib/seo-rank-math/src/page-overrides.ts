const EDITABLE_STATIC_PATHS = new Set([
  "/",
  "/about",
  "/services",
  "/cleaning-packages",
  "/contact/شركة-تنظيف-بالرياض",
  "/areas",
  "/faq/تنظيف-المنازل-بالرياض",
  "/terms",
  "/privacy",
  "/blog",
  "/call-now",
])

export interface SeoPageOverride {
  path: string
  seoTitle: string
  description: string
  focusKeyword: string
  h1: string
  content: string
  sitemapEligible?: boolean
  updatedAt?: string
}

export const SEO_PAGE_OVERRIDE_SETTING_PREFIX = "seo_page_override:"

export function normalizeSeoOverridePath(value: string): string | null {
  let path: string
  try {
    path = decodeURIComponent(value.trim())
  } catch {
    return null
  }
  if (!path.startsWith("/") || path.includes("\\") || /[\u0000-\u001f?#]/u.test(path)) return null
  path = path.replace(/\/{2,}/gu, "/").replace(/\/+$/u, "") || "/"
  if (path.split("/").some(part => part === "." || part === "..")) return null
  if (EDITABLE_STATIC_PATHS.has(path)) return path
  if (/^\/areas\/[a-z0-9-]+$/iu.test(path)) return path
  return null
}

export function sanitizeSeoOverrideText(value: unknown, maxLength = 20_000): string {
  if (typeof value !== "string") return ""
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/giu, " ")
    .replace(/<[^>]*>/gu, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, " ")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim()
    .slice(0, maxLength)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&#39;")
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")
}

export function isSeoPageHtmlIndexable(html: string, routePath: string): boolean {
  const safePath = normalizeSeoOverridePath(routePath)
  if (!safePath) return false

  for (const match of html.matchAll(/<meta\b[^>]*>/giu)) {
    const tag = match[0]
    const name = tag.match(/\bname\s*=\s*(["'])(.*?)\1/iu)?.[2]?.toLowerCase()
    if (name !== "robots" && name !== "googlebot") continue
    const content = tag.match(/\bcontent\s*=\s*(["'])(.*?)\1/iu)?.[2] ?? ""
    if (/\bnoindex\b/iu.test(content)) return false
  }

  const canonicalTag = html.match(/<link\b(?=[^>]*\brel\s*=\s*(["'])canonical\1)[^>]*>/iu)?.[0]
  const canonicalHref = canonicalTag?.match(/\bhref\s*=\s*(["'])(.*?)\1/iu)?.[2]
  if (!canonicalHref) return false
  try {
    const canonical = canonicalHref.startsWith("/")
      ? new URL(canonicalHref, "http://origin.invalid")
      : new URL(canonicalHref)
    if (!["http:", "https:"].includes(canonical.protocol)) return false
    const canonicalPath = decodeURIComponent(canonical.pathname).replace(/\/+$/u, "") || "/"
    return canonicalPath === safePath
  } catch {
    return false
  }
}

function replaceMetaContent(html: string, name: string, value: string): string {
  const escapedName = escapeRegExp(name)
  const tagPattern = new RegExp(`<meta\\b(?=[^>]*\\bname\\s*=\\s*(["'])${escapedName}\\1)[^>]*>`, "iu")
  const match = html.match(tagPattern)
  const escapedValue = escapeHtml(value)
  if (match) {
    const contentPattern = /\bcontent\s*=\s*(["'])([\s\S]*?)\1/iu
    const nextTag = contentPattern.test(match[0])
      ? match[0].replace(contentPattern, (_whole, quote: string) => `content=${quote}${escapedValue}${quote}`)
      : match[0].replace(/\s*\/?>$/u, ` content="${escapedValue}" />`)
    return html.replace(match[0], nextTag)
  }
  const metaTag = `<meta name="${escapeHtml(name)}" content="${escapedValue}" />`
  return html.replace(/<\/head\s*>/iu, `${metaTag}\n</head>`)
}

function renderOverrideBody(value: string): string {
  const lines = value.split(/\r?\n/u).map(line => line.trim()).filter(Boolean)
  if (!lines.length) return ""
  const blocks: string[] = []
  let listItems: string[] = []
  const flushList = () => {
    if (!listItems.length) return
    blocks.push(`<ul>${listItems.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`)
    listItems = []
  }
  for (const line of lines) {
    if (line.startsWith("- ") || line.startsWith("• ")) {
      listItems.push(line.slice(2).trim())
      continue
    }
    flushList()
    if (line.startsWith("## ")) blocks.push(`<h2>${escapeHtml(line.slice(3).trim())}</h2>`)
    else blocks.push(`<p>${escapeHtml(line)}</p>`)
  }
  flushList()
  return blocks.join("")
}

/**
 * Applies only explicitly editable SEO fields. It preserves the page template,
 * scripts, forms, links, and canonical URL while replacing the first H1 and
 * managing one marked content block after it.
 */
export function applySeoPageOverrideToHtml(html: string, override: SeoPageOverride): string {
  const title = sanitizeSeoOverrideText(override.seoTitle, 180)
  const description = sanitizeSeoOverrideText(override.description, 500)
  const focusKeyword = sanitizeSeoOverrideText(override.focusKeyword, 200)
  const h1 = sanitizeSeoOverrideText(override.h1, 220)
  const content = sanitizeSeoOverrideText(override.content)
  let next = html

  if (title) {
    const titleTag = `<title>${escapeHtml(title)}</title>`
    next = /<title\b[^>]*>[\s\S]*?<\/title>/iu.test(next)
      ? next.replace(/<title\b[^>]*>[\s\S]*?<\/title>/iu, titleTag)
      : next.replace(/<\/head\s*>/iu, `${titleTag}\n</head>`)
  }
  if (description) next = replaceMetaContent(next, "description", description)
  if (focusKeyword) next = replaceMetaContent(next, "seo-focus-keyword", focusKeyword)

  const h1Pattern = /(<h1\b[^>]*>)[\s\S]*?(<\/h1\s*>)/iu
  if (h1 && h1Pattern.test(next)) {
    next = next.replace(h1Pattern, (_whole, open: string, close: string) => `${open}${escapeHtml(h1)}${close}`)
  } else if (h1 && /<main\b[^>]*>/iu.test(next)) {
    next = next.replace(/<main\b[^>]*>/iu, whole => `${whole}<h1>${escapeHtml(h1)}</h1>`)
  }

  const start = "<!-- seo-page-override-content:start -->"
  const end = "<!-- seo-page-override-content:end -->"
  const blockPattern = /<!-- seo-page-override-content:start -->[\s\S]*?<!-- seo-page-override-content:end -->/giu
  next = next.replace(blockPattern, "")
  const body = renderOverrideBody(content)
  if (body) {
    const block = `${start}<section data-seo-page-override="true">${body}</section>${end}`
    const h1CloseIndex = next.search(/<\/h1\s*>/iu)
    if (h1CloseIndex >= 0) {
      const close = next.match(/<\/h1\s*>/iu)
      const insertAt = h1CloseIndex + (close?.[0].length ?? 0)
      next = `${next.slice(0, insertAt)}${block}${next.slice(insertAt)}`
    } else {
      next = next.replace(/<main\b[^>]*>/iu, whole => `${whole}${block}`)
    }
  }
  return next
}
