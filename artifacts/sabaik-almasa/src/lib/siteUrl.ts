function normalizeSiteOrigin(value: string | null | undefined): string {
  const candidate = String(value || "").trim()
  if (!candidate) return ""
  try {
    const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`)
    if (
      !/^https?:$/.test(url.protocol)
      || url.username
      || url.password
      || !["", "/"].includes(url.pathname)
      || url.search
      || url.hash
    ) return ""
    return url.origin
  } catch {
    return ""
  }
}

export function getSiteUrl(configuredUrl?: string): string {
  if (typeof window !== "undefined") {
    const activeBrowserOrigin = normalizeSiteOrigin(window.location.origin)
    if (activeBrowserOrigin) return activeBrowserOrigin
  }

  const buildOrigin = normalizeSiteOrigin(import.meta.env.VITE_PUBLIC_SITE_URL)
  if (buildOrigin) return buildOrigin

  const port = String(import.meta.env.VITE_PORT || "19770")
  return `http://localhost:${port}`
}

export function siteUrl(path = "/", configuredUrl?: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`
  const origin = getSiteUrl(configuredUrl)
  return `${origin}${normalized}`
}

/** Keep externally supplied internal URLs on the current public origin. */
export function sitePath(value: string | null | undefined, configuredUrl?: string): string {
  if (!value) return "/"
  try {
    const url = new URL(value)
    const activeOrigin = getSiteUrl()
    const legacyOrigin = normalizeSiteOrigin(configuredUrl)
    if (
      /^https?:$/.test(url.protocol)
      && (url.origin === activeOrigin || (legacyOrigin && url.origin === legacyOrigin))
    ) return `${url.pathname}${url.search}${url.hash}` || "/"
  } catch {
    // Relative values are already suitable for the current origin.
  }
  return value
}