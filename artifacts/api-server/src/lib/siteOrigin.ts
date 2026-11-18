import type { Request } from "express";

function normalizeOrigin(value: string | undefined): string | null {
  if (!value?.trim() || /[\s,]/u.test(value) || !value.includes("://")) return null;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (
      !["https:", "http:"].includes(url.protocol)
      || url.username
      || url.password
      || !["", "/"].includes(url.pathname)
      || url.search
      || url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function normalizePublicSiteOrigin(value: unknown): string | null {
  return typeof value === "string" ? normalizeOrigin(value) : null;
}

export function validatePersistedSiteOrigin(value: unknown, activeOrigin: string): string | null {
  const origin = normalizePublicSiteOrigin(value);
  if (!origin || origin !== activeOrigin) return null;

  const host = new URL(origin).hostname.toLowerCase();
  const isLocalOrPreview = host === "localhost"
    || host === "0.0.0.0"
    || host === "::1"
    || host === "[::1]"
    || host === "localhost.localdomain"
    || host.startsWith("127.")
    || host.endsWith(".localhost")
    || host.endsWith(".replit.dev")
    || host.endsWith(".repl.co");

  return isLocalOrPreview ? null : origin;
}

function configuredAllowedOrigins(): Set<string> {
  return new Set(
    String(process.env.CLEANFLOW_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map(value => normalizeOrigin(value.trim()))
      .filter((value): value is string => Boolean(value)),
  );
}

function originFromRequest(req: Request): string | null {
  const protocol = req.protocol === "https" ? "https" : "http";
  const host = req.get("host")?.trim();
  return host ? normalizeOrigin(`${protocol}://${host}`) : null;
}

/**
 * Return a browser Origin only when it is same-origin or explicitly allowed.
 * Origin is a client-supplied hint, not proof of identity; never reflect an
 * arbitrary value into canonical URLs or CORS headers.
 */
export function getTrustedBrowserOrigin(req: Request): string | null {
  const rawOrigin = req.get("Origin");
  if (!rawOrigin) return null;

  const origin = normalizeOrigin(rawOrigin);
  if (!origin) return null;

  if (origin === originFromRequest(req) || configuredAllowedOrigins().has(origin)) {
    return origin;
  }
  return null;
}

export function isAllowedSiteOrigin(req: Request): boolean {
  return !req.get("Origin") || getTrustedBrowserOrigin(req) !== null;
}

/**
 * Use a validated browser origin when the frontend and API have separate
 * hosts; otherwise use the current request host and protocol. Saved site
 * settings are not an origin source for requests.
 */
export async function getSiteOrigin(req?: Request): Promise<string> {
  if (req?.get("Origin")) {
    const browserOrigin = getTrustedBrowserOrigin(req);
    if (browserOrigin) return browserOrigin;
    throw new Error("The browser origin is not allowed for this site.");
  }

  const requestOrigin = req ? originFromRequest(req) : null;
  if (requestOrigin) return requestOrigin;

  for (const candidate of [process.env.CLEANFLOW_SITE_ORIGIN, process.env.VITE_PUBLIC_SITE_URL]) {
    const configuredOrigin = normalizeOrigin(candidate);
    if (configuredOrigin) return configuredOrigin;
  }

  if (!req) {
    throw new Error("A request host or CLEANFLOW_SITE_ORIGIN is required to resolve the site origin.");
  }
  throw new Error("The current request does not contain a valid site host.");
}
