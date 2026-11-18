import routePolicy from "./noServiceSeoRoutes.json"

const NO_SERVICE_SEO_SLUGS = new Set(routePolicy.noServiceSeoSlugs)

const OUTSIDE_RIYADH_SEO_SLUGS = new Set(routePolicy.outsideRiyadhSeoSlugs)

export function isNoServiceSeoSlug(slug: string): boolean {
  return NO_SERVICE_SEO_SLUGS.has(slug.trim().replace(/^\/+|\/+$/g, ""))
}

export function isOutsideRiyadhSeoSlug(slug: string): boolean {
  return OUTSIDE_RIYADH_SEO_SLUGS.has(slug.trim().replace(/^\/+|\/+$/g, ""))
}

export function isNoServiceSeoRoute(location: string): boolean {
  const segments = location.split(/[?#]/, 1)[0].split("/").filter(Boolean)
  const routeFamily = segments.at(-2)
  if (!["page", "pages", "صفحة", "صفحات"].includes(routeFamily || "")) return false

  try {
    return isNoServiceSeoSlug(decodeURIComponent(segments.at(-1) || ""))
  } catch {
    return false
  }
}
