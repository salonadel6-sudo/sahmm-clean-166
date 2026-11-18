export const SITE_ORIGIN_TOKEN = "__CLEANFLOW_SITE_ORIGIN__";

export function normalizeSiteOrigin(value, defaultScheme = "https") {
  const candidate = String(value ?? "").trim();
  if (!candidate || /[\s,]/u.test(candidate)) return null;

  try {
    const url = new URL(candidate.includes("://") ? candidate : `${defaultScheme}://${candidate}`);
    if (!["http:", "https:"].includes(url.protocol)
      || url.username
      || url.password
      || !["", "/"].includes(url.pathname)
      || url.search
      || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function resolveBuildSiteOrigin(env = process.env) {
  const configuredCandidates = [
    env.CLEANFLOW_SITE_ORIGIN,
    ...(String(env.REPLIT_DOMAINS ?? "").split(",")),
    env.REPLIT_DEV_DOMAIN,
    env.VITE_PUBLIC_SITE_URL,
  ];

  for (const candidate of configuredCandidates) {
    const value = String(candidate ?? "").trim();
    if (!value) continue;
    const isLocal = /^(?:localhost|127(?:\.\d{1,3}){3}|\[?::1\]?)(?::\d+)?$/iu.test(value);
    const origin = normalizeSiteOrigin(value, isLocal ? "http" : "https");
    if (origin) return origin;
  }

  const port = String(env.VITE_PORT || env.PORT || "19770").trim();
  if (!/^\d{1,5}$/u.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error(`Invalid local site port: ${port}`);
  }
  return `http://localhost:${port}`;
}

export function rebaseSiteUrl(value, siteOrigin, sourceOrigins = []) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const activeOrigin = normalizeSiteOrigin(siteOrigin, "https");
  if (!activeOrigin) throw new Error(`Invalid active site origin: ${siteOrigin}`);

  let url;
  try {
    url = new URL(raw, `${activeOrigin}/`);
  } catch {
    throw new Error(`Invalid site URL: ${raw}`);
  }
  if (!["http:", "https:"].includes(url.protocol)) return raw;

  const knownSiteOrigins = new Set(
    [activeOrigin, ...sourceOrigins]
      .map((origin) => normalizeSiteOrigin(origin, "https"))
      .filter(Boolean),
  );
  if (knownSiteOrigins.has(url.origin)) {
    return `${activeOrigin}${url.pathname}${url.search}${url.hash}`;
  }
  return url.href;
}

export function tokenizeSiteOrigins(content, origins = []) {
  let result = String(content);
  const uniqueOrigins = new Set(origins.map(origin => normalizeSiteOrigin(origin, "https")).filter(Boolean));
  for (const origin of uniqueOrigins) {
    const escapedOrigin = origin.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    result = result.replace(new RegExp(escapedOrigin, "giu"), SITE_ORIGIN_TOKEN);
  }
  return result;
}

export function parseSiteOriginAliases(value) {
  let candidates = value;
  if (typeof value === "string") {
    try {
      candidates = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(candidates)) return [];

  return [...new Set(
    candidates
      .map((candidate) => normalizeSiteOrigin(candidate, "https"))
      .filter(Boolean),
  )];
}
