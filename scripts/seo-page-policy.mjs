/**
 * Shared build-time policy for standalone SEO landing pages.
 *
 * These pages are retained in the CMS, but only pages with a supported service
 * intent and enough visible substance should be offered to search engines.
 * The policy is deliberately conservative so an old campaign page cannot
 * dilute the main service architecture.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const policyPath = join(dirname(fileURLToPath(import.meta.url)), "..", "lib", "seo-page-policy.json");
const policy = JSON.parse(readFileSync(policyPath, "utf8"));
const UNSUPPORTED_TOPIC_PATTERNS = policy.unsupportedTopicPatterns.map((pattern) => new RegExp(pattern, "iu"));
const SUPPORTED_SERVICE_TOPIC_PATTERNS = policy.supportedServiceTopicPatterns.map((pattern) => new RegExp(pattern, "iu"));
export const SEO_PAGE_MIN_CONTENT_CHARS = policy.minimumVisibleContentCharacters;

// These published URLs have been consolidated into a single authoritative
// destination. Keep them as explicit redirects so old links retain their value.
export const SEO_PAGE_REDIRECTS = [
  { fromSlug: "شركة-تنظيف-بالرياض", toPath: "/", retireSource: true },
  { fromSlug: "افضل-شركة-تنظيف-بالرياض", toPath: "/page/أفضل-شركة-تنظيف-بالرياض", retireSource: true },
  { fromSlug: "شركة-نقل-العفش-داخل-الرياض", toPath: "/page/تنظيف-المنازل-قبل-نقل-العفش-بالرياض", retireSource: false },
  { fromSlug: "شركات-نقل-العفش-بالرياض", toPath: "/page/تنظيف-وتعقيم-المنازل-بعد-نقل-الأثاث-بالرياض", retireSource: false },
  { fromSlug: "شركة-نقل-عفش-بالخرج", toPath: "/page/تنظيف-منازل-وفلل-قبل-وبعد-نقل-الأثاث-بالخرج", retireSource: false },
];

function stripHtml(value) {
  return String(value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<!--[\s\S]*?-->/gu, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#(?:x[\da-f]+|\d+)|amp|lt|gt|quot|apos|nbsp|copy|reg|ndash|mdash|hellip|lsquo|rsquo|ldquo|rdquo);/giu, (entity, body) => {
      if (body[0] === "#") {
        const hex = body[1]?.toLowerCase() === "x"
        const codePoint = Number.parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10)
        return Number.isInteger(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
          && !(codePoint >= 0xd800 && codePoint <= 0xdfff)
          ? String.fromCodePoint(codePoint)
          : entity
      }
      const entities = {
        amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
        copy: "©", reg: "®", ndash: "–", mdash: "—", hellip: "…",
        lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
      }
      return entities[body.toLowerCase()] ?? entity
    })
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedCanonicalPath(url) {
  return decodeURIComponent(url.pathname).replace(/\/+$/u, "") || "/";
}

export function isValidSeoPageCanonical(value, expectedCanonical) {
  const canonical = String(value ?? "").trim();
  if (!canonical) return false;
  try {
    const expectedIsRelative = expectedCanonical.startsWith("/");
    const expected = new URL(expectedCanonical, expectedIsRelative ? "http://origin.invalid" : undefined);
    const candidate = new URL(canonical, expectedIsRelative ? "http://origin.invalid" : expected.origin);
    return ["https:", "http:"].includes(expected.protocol)
      && !expected.search
      && !expected.hash
      && ["https:", "http:"].includes(candidate.protocol)
      && (expectedIsRelative || candidate.origin === expected.origin)
      && !candidate.username
      && !candidate.password
      && !candidate.search
      && !candidate.hash
      && normalizedCanonicalPath(candidate) === normalizedCanonicalPath(expected);
  } catch {
    return false;
  }
}

export function normalizeSeoPageCanonical(value, expectedCanonical) {
  const canonical = String(value ?? "").trim();
  if (!canonical || isValidSeoPageCanonical(canonical, expectedCanonical)) {
    return expectedCanonical;
  }
  return canonical;
}

export function getSeoPageIndexability(page) {
  const intentText = [
    page?.title,
    page?.targetKeyword ?? page?.target_keyword,
    page?.seoTitle ?? page?.seo_title,
  ].filter(Boolean).join(" ");
  const content = stripHtml(page?.content);
  const contentChars = [...content].length;
  if (UNSUPPORTED_TOPIC_PATTERNS.some((pattern) => pattern.test(intentText))) {
    return { indexable: false, reason: "unsupported-topic", contentChars };
  }
  if (!SUPPORTED_SERVICE_TOPIC_PATTERNS.some((pattern) => pattern.test(intentText))) {
    return { indexable: false, reason: "no-supported-service-intent", contentChars };
  }
  if (contentChars < SEO_PAGE_MIN_CONTENT_CHARS) {
    return { indexable: false, reason: "thin-content", contentChars };
  }

  const configuredCanonical = String(page?.canonicalUrl ?? page?.canonical_url ?? "").trim();
  if (configuredCanonical) {
    const expectedCanonical = `/page/${encodeURIComponent(String(page?.slug || ""))}`;
    if (!isValidSeoPageCanonical(configuredCanonical, expectedCanonical)) {
      return { indexable: false, reason: "non-self-canonical", contentChars };
    }
  }

  return { indexable: true, reason: "supported-service-intent", contentChars };
}
