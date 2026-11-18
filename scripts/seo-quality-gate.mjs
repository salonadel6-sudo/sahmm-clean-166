#!/usr/bin/env node
/**
 * Conservative SEO regression gate.
 * It checks the deployable sitemap and prerendered HTML without claiming
 * external indexation or SERP results.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  analyzeRankMathSeo,
  buildBlogPostRankMathInput,
  buildPackageVisibleContent,
  buildSeoPageRankMathInput,
  buildServiceVisibleContent,
  getRankMathFocusKeyword,
  normalizeRankMathKeywordPhrase,
} from "@workspace/seo-rank-math";
import { validateSitemapFile } from "./validate-sitemap.mjs";
import { BUILD_SITE_ORIGIN } from "./seo-config.mjs";
import { compareSitemapUrlSets } from "./sitemap-url-parity.mjs";
import { ARABIC_AREA_SLUGS } from "./area-route-aliases.mjs";
import { SEO_PAGE_REDIRECTS } from "./seo-page-policy.mjs";
import { LEGACY_PACKAGE_ROUTE_REDIRECTS, LEGACY_PACKAGE_ROUTE_SLUGS } from "./package-route-policy.mjs";
import { createHostingerRedirectRule } from "./hostinger-redirect-targets.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const require = createRequire(join(ROOT, "lib", "db", "package.json"));
const Database = require("better-sqlite3");
const publicDir = join(ROOT, "artifacts", "sabaik-almasa", "dist", "public");
const sitemapPath = join(publicDir, "sitemap.xml");
const hostingerDir = join(ROOT, "build_php");
const hostingerRulesPath = join(hostingerDir, ".htaccess");
const failures = [];
const warnings = [];
const rankMathReportArgument = process.argv.find((argument) => argument.startsWith("--report-json="));
const rankMathReport = [];
const requestedSiteUrl = process.argv.find((argument) => argument.startsWith("--site-url="))?.slice("--site-url=".length);
const configDb = new Database(join(ROOT, "data", "sabaik.db"), { readonly: true, fileMustExist: true });
const configRows = configDb.prepare("SELECT key, value FROM site_settings WHERE key IN ('sitemap_split_enabled', 'sitemap_urls_per_file')").all();
const configMap = Object.fromEntries(configRows.map(row => [row.key, row.value]));
const rawSitemapLimit = String(configMap.sitemap_urls_per_file || "500").trim();
const parsedSitemapLimit = /^\d+$/.test(rawSitemapLimit) ? Number(rawSitemapLimit) : Number.NaN;
const maxSitemapUrlsPerFile = Number.isSafeInteger(parsedSitemapLimit)
  ? Math.max(1, Math.min(500, parsedSitemapLimit))
  : 500;
configDb.close();
let siteOrigin = BUILD_SITE_ORIGIN;
let canonicalSitemapUrls = new Set();
const decodeXml = (value) => String(value)
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'");
const sitemapLocations = (xml) => [
  ...String(xml).matchAll(/<loc>([\s\S]*?)<\/loc>/gi),
].map((match) => decodeXml(match[1]).trim());
const decodeUrlPath = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

if (!existsSync(sitemapPath)) failures.push("dist/public/sitemap.xml is missing; run the production build first");
else {
  const sitemap = readFileSync(sitemapPath, "utf8");
  const sitemapUrl = sitemapLocations(sitemap)[0];
  try {
    const candidate = new URL(requestedSiteUrl || sitemapUrl || BUILD_SITE_ORIGIN);
    if (
      !["http:", "https:"].includes(candidate.protocol)
      || candidate.username
      || candidate.password
      || (requestedSiteUrl && (candidate.pathname !== "/" || candidate.search || candidate.hash))
    ) throw new Error("not a public HTTPS site origin");
    siteOrigin = candidate.origin;
  } catch (error) {
    failures.push(`SEO quality gate could not determine a valid public site origin: ${error?.message || error}`);
  }
  const validation = validateSitemapFile(sitemapPath, siteOrigin, maxSitemapUrlsPerFile);
  validation.errors.forEach((message) => failures.push(message));
  validation.warnings.forEach((message) => warnings.push(message));
  const locs = validation.pageLocations;
  canonicalSitemapUrls = new Set(locs.flatMap((rawUrl) => {
    try {
      const url = new URL(rawUrl);
      return [`${url.origin}${url.pathname}`];
    } catch {
      return [];
    }
  }));
  if (locs.some(url => /\/(?:container|packages)(?:\/|$)/i.test(url))) {
    failures.push("sitemap contains a legacy container/package URL");
  }
  const hostingerSitemapPath = join(hostingerDir, "sitemap.xml");
  if (existsSync(hostingerSitemapPath)) {
    const hostingerValidation = validateSitemapFile(hostingerSitemapPath, siteOrigin, maxSitemapUrlsPerFile);
    hostingerValidation.errors.forEach(message => failures.push(`Hostinger sitemap: ${message}`));
    const nodeLocations = validation.pageLocations;
    const hostingerLocations = hostingerValidation.pageLocations;
    const parity = compareSitemapUrlSets(nodeLocations, hostingerLocations);
    if (!parity.matches) {
      failures.push(
        `Node and Hostinger sitemap URL sets differ after URL-path decoding `
        + `(Node ${parity.nodeCount} URLs/${parity.nodeUniqueCount} unique, Hostinger ${parity.hostingerCount} URLs/${parity.hostingerUniqueCount} unique); `
        + `examples missing in Hostinger: ${parity.missingInHostinger.slice(0, 3).join(", ") || "none"}; `
        + `examples missing in Node: ${parity.missingInNode.slice(0, 3).join(", ") || "none"}; `
        + `duplicate decoded paths: Node ${parity.duplicateNode.slice(0, 3).join(", ") || "none"}, Hostinger ${parity.duplicateHostinger.slice(0, 3).join(", ") || "none"}`,
      );
    }
  }
  for (const [index, rawUrl] of locs.entries()) {
    try {
      const pageUrl = new URL(rawUrl.replace(/&amp;/g, "&"));
      if (pageUrl.pathname !== "/" && pageUrl.pathname.endsWith("/")) {
        failures.push(`sitemap URL #${index + 1} has a non-canonical trailing slash: ${rawUrl}`);
      }
      const decodedPath = decodeURIComponent(pageUrl.pathname);
      const relativePath = decodedPath.replace(/^\/+|\/+$/g, "");
      const htmlPath = relativePath
        ? join(publicDir, relativePath, "index.html")
        : join(publicDir, "index.html");
      if (!existsSync(htmlPath)) {
        failures.push(`sitemap URL #${index + 1} has no prerendered HTML file: ${rawUrl}`);
        continue;
      }
      const html = readFileSync(htmlPath, "utf8");
      const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1];
      if (!canonical) {
        failures.push(`sitemap URL #${index + 1} has no canonical link in ${htmlPath}`);
        continue;
      }
      const canonicalUrl = new URL(canonical);
      if (
        canonicalUrl.origin !== pageUrl.origin
        || canonicalUrl.pathname !== pageUrl.pathname
        || canonicalUrl.search
        || canonicalUrl.hash
      ) {
        failures.push(`sitemap URL and page canonical differ: ${rawUrl} -> ${canonical}`);
      }
    } catch (error) {
      failures.push(`cannot map sitemap URL #${index + 1} to its HTML file: ${error?.message || rawUrl}`);
    }
  }
  const imageLocs = [...sitemap.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map(match => match[1]);
  for (const imageUrl of imageLocs) {
    if (/^https?:\/\//i.test(imageUrl)) {
      try {
        const imagePath = decodeUrlPath(new URL(imageUrl).pathname);
        if (imagePath.startsWith("/images/") && !existsSync(join(publicDir, imagePath))) {
          failures.push(`sitemap image is missing from build: ${imagePath}`);
        }
      } catch {
        failures.push(`sitemap contains an invalid image URL: ${imageUrl}`);
      }
    }
  }
}

if (existsSync(hostingerRulesPath)) {
  const rules = readFileSync(hostingerRulesPath, "utf8");
  if (/,\s*NE\]/i.test(rules)) {
    failures.push("Hostinger redirects must not use NE; it can emit malformed UTF-8 Location headers");
  }
  const legacyRedirectHandlerPath = join(hostingerDir, "legacy-redirect.php");
  if (!existsSync(legacyRedirectHandlerPath)) {
    failures.push("Hostinger is missing legacy-redirect.php for safe Arabic redirect destinations");
  } else {
    const handlerSource = readFileSync(legacyRedirectHandlerPath, "utf8");
    if (
      !handlerSource.includes("base64_decode")
      || !handlerSource.includes("rawurlencode")
      || !handlerSource.includes("header('Location: '")
    ) {
      failures.push("Hostinger legacy redirect handler must decode local paths and percent-encode each URL segment");
    }
  }
  for (const line of rules.split("\n")) {
    const redirectMatch = line.match(/^\s*RewriteRule\s+\S+\s+(\S+)\s+\[R=301,L\]/u);
    if (redirectMatch && /[^\x00-\x7F]/u.test(redirectMatch[1]) && !redirectMatch[1].includes("$")) {
      failures.push(`Hostinger has an unencoded static Unicode redirect target: ${line.trim()}`);
    }
  }
  for (const [canonical, arabic] of Object.entries(ARABIC_AREA_SLUGS)) {
    if (!existsSync(join(hostingerDir, "areas", canonical, "index.html"))) continue;
    const aliases = [arabic, ...(arabic.startsWith("حي-") ? [arabic.slice(3)] : [])];
    for (const alias of aliases) {
      const expectedRule = `RewriteRule ^areas/${alias}/?$ /areas/${canonical} [R=301,L]`;
      if (!rules.includes(expectedRule)) {
        failures.push(`Hostinger rules are missing the area alias redirect: /areas/${alias} -> /areas/${canonical}`);
      }
    }
  }
  for (const routeRule of [
    "RewriteRule ^tag(?:/|$) - [G,L]",
    "RewriteRule ^(?:feed|.+/feed)/?$ - [G,L]",
    "RewriteRule ^container(?:/|$) - [G,L]",
    "RewriteRule ^package(?:/|$) - [G,L]",
    "RewriteRule ^packages/.+ - [G,L]",
    "RewriteRule ^page/?$ - [R=404,L]",
    "RewriteRule ^(about|contact|call-now|faq|privacy|terms|blog|areas|services|cleaning-packages|page)/$ /$1 [R=301,L]",
    "RewriteRule ^(contact|faq|blog|areas|services|cleaning-packages|page)/([^/]+)/$ /$1/$2 [R=301,L]",
    "RewriteRule ^(?:about|contact|call-now|faq|privacy|terms|blog|areas|services|cleaning-packages)$ $0/index.php [END]",
    "RewriteRule ^(contact|faq|blog|areas|services|cleaning-packages|page)/(.+)$ $1/$2/index.php [END]",
    "RewriteRule ^blog/([^/]+)/?$ blog-route.php?slug=$1 [END,B]",
    "RewriteRule ^(?:areas|services|cleaning-packages|page)/.+$ - [R=404,L]",
    "RewriteRule ^(chat|partners|offers|why-us/(?:leadership|what-we-do|commitment|experience)|cleaning-packages/fire-safety)/$ /$1 [R=301,L]",
    "RewriteRule ^cleaning-packages/fire-safety$ index.php [END]",
    "RewriteRule ^(?:admin(?:/.*)?|chat|partners|offers|why-us/(?:leadership|what-we-do|commitment|experience))$ index.php [END]",
    "RewriteRule ^ - [R=404,L]",
    "RewriteRule ^مقالات-السهم/?$ /blog [R=301,L]",
    "RewriteRule ^نظافه-مثاليه-للاشياء-البيضاء/?$ - [G,L]",
  ]) {
    if (!rules.includes(routeRule)) failures.push(`Hostinger rules are missing the expected not-found response: ${routeRule}`);
  }
  const blogRoutePath = join(hostingerDir, "blog-route.php");
  if (!existsSync(blogRoutePath)) {
    failures.push("Hostinger is missing blog-route.php, required for posts published after the static build");
  } else {
    const blogRouteSource = readFileSync(blogRoutePath, "utf8");
    if (!/status\s*=\s*'published'/i.test(blogRouteSource) || !/is_active\s*=\s*1/i.test(blogRouteSource)) {
      failures.push("Hostinger blog-route.php must serve only active, published posts");
    }
  }
  for (const { fromSlug, toPath, retireSource = true } of SEO_PAGE_REDIRECTS) {
    const expectedRule = createHostingerRedirectRule(`^page/${fromSlug}/?$`, toPath);
    if (!rules.includes(expectedRule)) failures.push(`Hostinger rules are missing the SEO consolidation redirect: ${expectedRule}`);
    if (!retireSource) {
      const rootRule = createHostingerRedirectRule(`^${fromSlug}/?$`, toPath);
      if (!rules.includes(rootRule)) failures.push(`Hostinger rules are missing the legacy SEO root redirect: ${rootRule}`);
    }
    for (const prefix of ["صفحة", "صفحات", "pages"]) {
      const prefixRule = createHostingerRedirectRule(`^${prefix}/${fromSlug}/?$`, toPath);
      if (!rules.includes(prefixRule)) failures.push(`Hostinger rules are missing the legacy SEO prefix redirect: ${prefixRule}`);
    }
    const sourceUrl = `${siteOrigin}/page/${encodeURIComponent(fromSlug)}`;
    if (canonicalSitemapUrls.has(sourceUrl)) {
      failures.push(`Consolidated SEO URL remains in the sitemap: ${sourceUrl}`);
    }
  }
  for (const { fromPath, toPath } of LEGACY_PACKAGE_ROUTE_REDIRECTS) {
    const expectedRule = createHostingerRedirectRule(`^${fromPath.replace(/^\/+/u, "")}/?$`, toPath);
    if (!rules.includes(expectedRule)) failures.push(`Hostinger rules are missing the legacy package redirect: ${expectedRule}`);
    const sourceUrl = new URL(fromPath, siteOrigin).href;
    const targetUrl = new URL(toPath, siteOrigin).href;
    if (canonicalSitemapUrls.has(sourceUrl)) failures.push(`Legacy package URL remains in the sitemap: ${sourceUrl}`);
    if (!canonicalSitemapUrls.has(targetUrl)) failures.push(`Canonical package URL is missing from the sitemap: ${targetUrl}`);
  }
  for (const aliasRule of [
    "RewriteRule ^المدونة/([^/]+)/?$ /blog/$1 [R=301,L,B]",
    "RewriteRule ^خدماتنا/([^/]+)/?$ /services/$1 [R=301,L,B]",
    "RewriteRule ^الأحياء/([^/]+)/?$ /areas/$1 [R=301,L,B]",
    "RewriteRule ^package/باقة-عقد-صيانة-انظمة-سلامة-دفاع-مدني/?$ /cleaning-packages/aqd-siyana-difaa-madani [R=301,L]",
  ]) {
    if (!rules.includes(aliasRule)) failures.push(`Hostinger rules are missing the escaped legacy redirect: ${aliasRule}`);
  }
  if (/RewriteRule \^(?:صفحة|صفحات|pages)\/\(\[\^\/\]\+\)/.test(rules)) {
    failures.push("Page prefix aliases must use explicit per-page redirects, not a dynamic Arabic backreference");
  }
  for (const canonical of canonicalSitemapUrls) {
    let pageSlug = "";
    try {
      const pathname = decodeURIComponent(new URL(canonical).pathname);
      const match = pathname.match(/^\/page\/([^/]+)$/);
      if (match) pageSlug = match[1];
    } catch {
      // Invalid sitemap URLs are reported by the sitemap checks above.
    }
    if (!pageSlug) continue;
    const escapedSlug = pageSlug.replace(/[\\.^$|?*+()[\]{}]/g, "\\$&");
    for (const prefix of ["صفحة", "صفحات", "pages"]) {
      const expectedRule = createHostingerRedirectRule(`^${prefix}/${escapedSlug}/?$`, `/page/${pageSlug}`);
      if (!rules.includes(expectedRule)) {
        failures.push(`Hostinger rules are missing the page alias redirect: /${prefix}/${pageSlug} -> /page/${pageSlug}`);
      }
    }
  }
  const callNowPath = join(hostingerDir, "call-now", "index.html");
  if (!existsSync(callNowPath)) {
    failures.push("Hostinger build is missing /call-now/index.html");
  } else {
    const callNowHtml = readFileSync(callNowPath, "utf8");
    const callNowCanonical = callNowHtml.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1];
    if (!callNowCanonical || new URL(callNowCanonical).origin !== siteOrigin || new URL(callNowCanonical).pathname !== "/call-now") {
      failures.push(`/call-now has an incorrect canonical URL: ${callNowCanonical || "missing"}`);
    }
  }

  const platformHtmlPath = join(hostingerDir, "cleanflow-platform", "index.html");
  if (
    existsSync(platformHtmlPath)
    && !existsSync(join(hostingerDir, "cleanflow-platform", "index.php"))
  ) {
    failures.push("CleanFlow Platform needs a PHP runtime wrapper to rebind its canonical origin on Hostinger");
  }

  const staticRobotsPath = join(publicDir, "robots.txt");
  const phpRobotsPath = join(hostingerDir, "robots.php");
  for (const robotsPath of [staticRobotsPath, phpRobotsPath]) {
    if (!existsSync(robotsPath)) {
      failures.push(`robots response source is missing: ${robotsPath}`);
      continue;
    }
    const robots = readFileSync(robotsPath, "utf8");
    if (!robots.includes("Allow: /api/uploads/")) {
      failures.push(`${robotsPath}: sitemap images under /api/uploads/ must remain crawlable`);
    }
    if (!robots.includes("Disallow: /api/")) {
      failures.push(`${robotsPath}: private API routes must remain disallowed`);
    }
    const dynamicPhpRobots = robotsPath === phpRobotsPath && robots.includes("Sitemap: {$canonicalSiteUrl}/sitemap.xml");
    const customOriginStaticRobots = robotsPath === staticRobotsPath;
    if (!robots.includes(`Sitemap: ${siteOrigin}/sitemap.xml`) && !dynamicPhpRobots && !customOriginStaticRobots) {
      failures.push(`${robotsPath}: canonical sitemap directive is missing`);
    }
  }
  if (!rules.includes("RewriteRule ^robots\\.txt$ robots.php [END]")) {
    failures.push("Hostinger rules must route robots.txt through PHP when using a non-build-time site origin");
  }
} else {
  warnings.push("Hostinger .htaccess is missing; run the full Hostinger archive build to validate server routing.");
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const htmlFiles = walk(publicDir).filter(file => file.endsWith(".html"));
const indexedTitleOwners = new Map();
const titleGuardFiles = [...new Set([
  ...walk(publicDir),
  ...walk(hostingerDir),
].filter(file => /\.html?$/i.test(file)))];
let repeatedCompanyPhraseTitles = 0;
let repeatedCompanyPhraseDescriptions = 0;
for (const file of titleGuardFiles) {
  const html = readFileSync(file, "utf8");
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    ?.replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (title) {
    const companyPhraseCount = title.match(/شركة\s+تنظيف\s+الرياض/gu)?.length || 0;
    if (companyPhraseCount > 1) {
      repeatedCompanyPhraseTitles++;
      failures.push(`${file}: company phrase "شركة تنظيف الرياض" appears ${companyPhraseCount} times in its title`);
    }
  }
  for (const metaTag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = metaTag[0];
    const name = tag.match(/\b(?:name|property)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (!["description", "og:description", "twitter:description"].includes(name || "")) continue;
    const content = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1] || "";
    const descriptionPhraseCount = content.match(/شركة\s+تنظيف\s+الرياض/gu)?.length || 0;
    if (descriptionPhraseCount > 1) {
      repeatedCompanyPhraseDescriptions++;
      failures.push(`${file}: company phrase "شركة تنظيف الرياض" appears ${descriptionPhraseCount} times in ${name}`);
    }
  }
}
for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const relative = file.slice(publicDir.length).replace(/\\/g, "/");
  const isAdmin = relative.startsWith("/admin/");
  const titleCount = (html.match(/<title\b/gi) || []).length;
  const titleText = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]*>/g, "").trim();
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const canonicalCount = (html.match(/<link[^>]+rel=["']canonical["']/gi) || []).length;
  const noindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1];
  if (!isAdmin && titleCount !== 1) failures.push(`${relative}: expected one title tag`);
  if (!isAdmin && canonicalCount !== 1) failures.push(`${relative}: expected one canonical link`);
  if (!isAdmin && h1Count !== 1) warnings.push(`${relative}: expected one visible H1 in prerender output`);
  if (!isAdmin && titleText && !noindex && canonical) {
    try {
      const canonicalUrl = new URL(canonical);
      const canonicalKey = `${canonicalUrl.origin}${canonicalUrl.pathname}`;
      if (canonicalSitemapUrls.has(canonicalKey)) {
        indexedTitleOwners.set(titleText, [...(indexedTitleOwners.get(titleText) || []), canonicalUrl.pathname]);
      }
    } catch {
      // The canonical URL validation above reports malformed URLs for sitemap pages.
    }
  }
  if (!isAdmin && /SearchAction|search_term_string/i.test(html)) {
    failures.push(`${relative}: obsolete SearchAction markup exposes a non-functional query URL`);
  }
  const rootArabicDirectory = relative.match(/^\/([^/]+)\/index\.html$/);
  if (!isAdmin && rootArabicDirectory && /[\u0600-\u06FF]/u.test(rootArabicDirectory[1])) {
    failures.push(`${relative}: root-level Arabic alias must redirect; duplicate HTML must not be published`);
  }
  if (!isAdmin && !/(اتصل|تواصل|احجز|اطلب|whatsapp|wa\.me|tel:)/i.test(html)) {
    warnings.push(`${relative}: no obvious CTA found in prerender output`);
  }
  if (!isAdmin) {
    for (const imageSrc of [...html.matchAll(/<(?:img|source)[^>]+(?:src|srcset)=["']([^"']+)/gi)].map(match => match[1].split(",")[0].trim().split(" ")[0])) {
       const decodedImageSrc = decodeUrlPath(imageSrc);
       if (/^\/images\//.test(decodedImageSrc) && !existsSync(join(publicDir, decodedImageSrc))) {
         failures.push(`${relative}: referenced image is missing from build: ${decodedImageSrc}`);
      }
    }
  }
  if (!isAdmin && noindex && canonical) {
    try {
      const canonicalUrl = new URL(canonical);
      if (canonicalSitemapUrls.has(`${canonicalUrl.origin}${canonicalUrl.pathname}`)) {
        failures.push(`${relative}: noindex page canonical is present in sitemap`);
      }
    } catch {
      // The separate canonical checks report malformed URLs for sitemap pages.
    }
  }
}

const rankMathScope = process.argv.find((arg) => arg.startsWith("--scope="))?.slice("--scope=".length) || "both";
if (!["php", "node", "both"].includes(rankMathScope)) {
  failures.push(`Unknown Rank Math gate scope "${rankMathScope}"; use --scope=php, --scope=node, or --scope=both.`);
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&(#(?:x[\da-f]+|\d+)|amp|lt|gt|quot|apos|nbsp|copy|reg|ndash|mdash|hellip|lsquo|rsquo|ldquo|rdquo);/giu, (entity, body) => {
      if (body[0] === "#") {
        const hex = body[1]?.toLowerCase() === "x";
        const codePoint = Number.parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
        return Number.isInteger(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
          && !(codePoint >= 0xd800 && codePoint <= 0xdfff)
          ? String.fromCodePoint(codePoint)
          : entity;
      }
      return {
        amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
        copy: "©", reg: "®", ndash: "–", mdash: "—", hellip: "…",
        lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
      }[body.toLowerCase()] ?? entity;
    });
}

function getAttribute(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return tag.match(new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"))?.slice(1).find(Boolean);
}

function getMetaContent(html, name) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (String(getAttribute(match[0], "name") || "").toLowerCase() === name.toLowerCase()) {
      return decodeHtml(getAttribute(match[0], "content") || "").trim();
    }
  }
  return "";
}

function htmlText(value) {
  return decodeHtml(String(value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<!--[\s\S]*?-->/gu, " ")
    .replace(/<[^>]*>/gu, " "))
    .replace(/\s+/gu, " ")
    .trim();
}

function getPrimaryContent(html) {
  const marker = html.match(/<([a-z][\w:-]*)\b[^>]*\bid=["']seo-static-page-content["'][^>]*>/i);
  const start = marker ? marker.index + marker[0].length : html.search(/<body\b[^>]*>/i);
  if (start < 0) return "";
  const contentStart = marker ? start : start + html.match(/<body\b[^>]*>/i)[0].length;
  const rootStart = html.slice(contentStart).search(/<div\b[^>]*\bid=["']root["']/i);
  const end = rootStart >= 0
    ? contentStart + rootStart
    : (html.slice(contentStart).search(/<\/body\s*>/i) >= 0
      ? contentStart + html.slice(contentStart).search(/<\/body\s*>/i)
      : html.length);
  return html.slice(contentStart, end);
}

function getHtmlTitle(html) {
  return htmlText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
}

function getHtmlCanonical(html) {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    if (String(getAttribute(match[0], "rel") || "").toLowerCase().split(/\s+/u).includes("canonical")) {
      return decodeHtml(getAttribute(match[0], "href") || "").trim();
    }
  }
  return "";
}

function decodePath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function routeFromFile(htmlRoot, file) {
  const relative = file.slice(htmlRoot.length).replace(/\\/g, "/").replace(/^\/+/u, "");
  const route = relative.replace(/(?:^|\/)index\.html$/i, "").replace(/\/+$/u, "");
  return route ? `/${route.split("/").map(decodePath).join("/")}` : "/";
}

function encodedRoute(route) {
  return route.split("/").map((part) => encodeURIComponent(part)).join("/");
}

function addRouteRecord(index, value, record, source) {
  const key = decodePath(String(value ?? "").trim()).replace(/^\/+|\/+$/gu, "");
  if (!key) return;
  const entries = index.get(key) || [];
  if (!entries.some((entry) => entry.record === record)) entries.push({ record, source });
  index.set(key, entries);
}

function chooseUniqueRouteRecord(index, slug, pageUrl, type, pageFailures) {
  const key = decodePath(String(slug ?? "")).replace(/^\/+|\/+$/gu, "");
  const matches = index.get(key) || [];
  if (matches.length !== 1) {
    pageFailures.push(matches.length
      ? `${pageUrl}: Rank Math input maps ambiguously to ${matches.length} ${type} records for "${key}".`
      : `${pageUrl}: no saved ${type} Rank Math input matches route "${key}".`);
    return null;
  }
  return matches[0].record;
}

function rowsOrThrow(database, sql) {
  return database.prepare(sql).all();
}

const hostingerNodeRoot = join(ROOT, "generated-artifacts", "node", "cleanflow-services-node");
const rankMathTargets = [];
if (rankMathScope === "php" || rankMathScope === "both") {
  rankMathTargets.push({
    name: "Hostinger PHP",
    htmlRoot: hostingerDir,
    databasePath: join(hostingerDir, "data", "sabaik.db"),
  });
}
if (rankMathScope === "node" || rankMathScope === "both") {
  rankMathTargets.push({
    name: "Hostinger Node",
    htmlRoot: join(hostingerNodeRoot, "public"),
    databasePath: join(hostingerNodeRoot, "data", "sabaik.db"),
  });
}

let totalRankMathPages = 0;
let perfectRankMathPages = 0;
for (const target of rankMathTargets) {
  if (!existsSync(target.htmlRoot)) {
    failures.push(`${target.name}: generated HTML directory is missing: ${target.htmlRoot}`);
    continue;
  }
  if (!existsSync(target.databasePath)) {
    failures.push(`${target.name}: packaged SQLite database is missing: ${target.databasePath}`);
    continue;
  }

  let database;
  try {
    database = new Database(target.databasePath, { readonly: true, fileMustExist: true });
    const htmlTargetFailures = [];
    const recordIndexes = {
      posts: new Map(),
      seoPages: new Map(),
      services: new Map(),
      packages: new Map(),
    };
    for (const post of rowsOrThrow(database, "SELECT * FROM posts WHERE status = 'published' AND is_active = 1")) {
      addRouteRecord(recordIndexes.posts, post.seo_slug || post.slug, post, "posts");
      addRouteRecord(recordIndexes.posts, post.slug, post, "posts");
    }
    for (const page of rowsOrThrow(database, "SELECT * FROM seo_pages WHERE status = 'published' AND is_active = 1")) {
      addRouteRecord(recordIndexes.seoPages, page.slug, page, "seo_pages");
      addRouteRecord(recordIndexes.seoPages, page.seo_slug, page, "seo_pages");
    }
    for (const service of rowsOrThrow(database, "SELECT * FROM services WHERE is_active = 1")) {
      addRouteRecord(recordIndexes.services, service.seo_slug, service, "services");
    }
    for (const item of rowsOrThrow(database, "SELECT * FROM packages WHERE is_active = 1")) {
      const packageSlug = LEGACY_PACKAGE_ROUTE_SLUGS[item.id] || item.seo_slug;
      addRouteRecord(recordIndexes.packages, packageSlug, item, "packages");
    }
    const settingRows = rowsOrThrow(database, "SELECT key, value FROM site_settings");
    const settings = Object.fromEntries(settingRows.map((row) => [row.key, row.value]));

    const files = walk(target.htmlRoot).filter((file) => /\.html?$/i.test(file));
    totalRankMathPages += files.length;
    const seenRoutes = new Set();
    for (const file of files) {
      const html = readFileSync(file, "utf8");
      const route = routeFromFile(target.htmlRoot, file);
      const routeKey = route.replace(/^\/+|\/+$/gu, "");
      const expectedCanonical = new URL(encodedRoute(route), siteOrigin).href;
      const htmlCanonical = getHtmlCanonical(html);
      const pageFailures = [];
      let canonicalUrl = "";
      if (htmlCanonical) {
        try {
          canonicalUrl = new URL(htmlCanonical, expectedCanonical).href;
        } catch (error) {
          pageFailures.push(`${htmlCanonical}: invalid canonical URL (${error?.message || error}).`);
        }
      }
      const pageUrl = canonicalUrl || expectedCanonical;
      const contentHtml = getPrimaryContent(html);
      const contentText = htmlText(contentHtml);
      const headings = [...contentHtml.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
        .map((match) => htmlText(match[1]))
        .filter(Boolean);
      const title = getHtmlTitle(html);
      const description = getMetaContent(html, "description");
      const focusFromHtml = getMetaContent(html, "seo-focus-keyword");
      const routeSegments = routeKey ? routeKey.split("/").map(decodePath) : [];
      let input;
      let recordFocusKeyword = "";

      if (seenRoutes.has(route)) {
        pageFailures.push(`${pageUrl}: duplicate generated HTML route "${route}".`);
      }
      seenRoutes.add(route);

      if (route === "/") {
        recordFocusKeyword = "شركة تنظيف بالرياض";
        input = {
          type: "homepage",
          title: settings.seo_meta_title || title,
          seoTitle: title,
          description: description || settings.seo_meta_description || "",
          focusKeyword: focusFromHtml || recordFocusKeyword,
          slug: route,
          canonical: htmlCanonical,
          expectedCanonical,
          content: contentText,
          h1: headings,
        };
      } else if (routeSegments[0] === "blog" && routeSegments.length === 2) {
        const record = chooseUniqueRouteRecord(recordIndexes.posts, routeSegments[1], pageUrl, "article", pageFailures);
        if (record) {
          const editorInput = buildBlogPostRankMathInput({
            title: record.title,
            slug: record.slug,
            seoSlug: record.seo_slug,
            content: record.content,
            seoTitle: record.seo_title,
            seoDescription: record.seo_description,
            seoKeywords: record.seo_keywords,
            canonicalUrl: record.canonical_url,
          });
          recordFocusKeyword = editorInput.focusKeyword;
          input = {
            ...editorInput,
            seoTitle: title || editorInput.seoTitle,
            description: description || editorInput.description,
            slug: route,
            canonical: htmlCanonical,
            expectedCanonical,
            h1: headings,
          };
        }
      } else if (routeSegments[0] === "page" && routeSegments.length === 2) {
        const record = chooseUniqueRouteRecord(recordIndexes.seoPages, routeSegments[1], pageUrl, "SEO page", pageFailures);
        if (record) {
          const editorInput = buildSeoPageRankMathInput({
            title: record.title,
            slug: record.slug,
            seoSlug: record.seo_slug,
            targetKeyword: record.target_keyword,
            content: record.content,
            seoTitle: record.seo_title,
            seoDescription: record.seo_description,
            seoKeywords: record.seo_keywords,
            canonicalUrl: record.canonical_url,
          });
          recordFocusKeyword = editorInput.focusKeyword;
          input = {
            ...editorInput,
            seoTitle: title || editorInput.seoTitle,
            description: description || editorInput.description,
            slug: route,
            canonical: htmlCanonical,
            expectedCanonical,
            h1: headings,
          };
        }
      } else if (routeSegments[0] === "services" && routeSegments.length === 2) {
        const record = chooseUniqueRouteRecord(recordIndexes.services, routeSegments[1], pageUrl, "service", pageFailures);
        if (record) {
          const content = buildServiceVisibleContent({
            title: record.title,
            description: record.description,
            seoDescription: record.seo_description,
            companyName: settings.company_name,
            slug: record.seo_slug,
          }).contentText;
          recordFocusKeyword = getRankMathFocusKeyword({ keywords: record.seo_keywords || "" });
          input = {
            type: "service",
            title: record.title,
            seoTitle: title,
            description,
            focusKeyword: recordFocusKeyword,
            slug: route,
            canonical: htmlCanonical,
            expectedCanonical,
            content,
            h1: headings,
          };
        }
      } else if (routeSegments[0] === "cleaning-packages" && routeSegments.length === 2) {
        const record = chooseUniqueRouteRecord(recordIndexes.packages, routeSegments[1], pageUrl, "package", pageFailures);
        if (record) {
          const content = buildPackageVisibleContent({
            name: record.name,
            category: record.category,
            size: record.size,
            capacity: record.capacity,
            description: record.description,
            features: record.features,
            suitableFor: record.suitable_for,
            rentalPeriod: record.rental_period,
          }).contentText;
          recordFocusKeyword = getRankMathFocusKeyword({ keywords: record.seo_keywords || "" });
          input = {
            type: "package",
            title: record.name,
            seoTitle: title,
            description,
            focusKeyword: recordFocusKeyword,
            slug: route,
            canonical: htmlCanonical,
            expectedCanonical,
            content,
            h1: headings,
          };
        }
      } else if (routeSegments[0] === "areas" && routeSegments.length === 2) {
        input = {
          type: "area",
          title,
          seoTitle: title,
          description,
          focusKeyword: focusFromHtml,
          slug: route,
          canonical: htmlCanonical,
          expectedCanonical,
          content: contentText,
          h1: headings,
        };
      } else {
        input = {
          type: "static",
          title,
          seoTitle: title,
          description,
          focusKeyword: focusFromHtml,
          slug: route,
          canonical: htmlCanonical,
          expectedCanonical,
          content: contentText,
          h1: headings,
        };
      }

      if (!title) pageFailures.push(`${pageUrl}: generated HTML has no title for Rank Math analysis.`);
      if (!description) pageFailures.push(`${pageUrl}: generated HTML has no meta description for Rank Math analysis.`);
      if (!focusFromHtml) {
        pageFailures.push(`${pageUrl}: generated HTML has no explicit seo-focus-keyword meta value.`);
      } else if (recordFocusKeyword
        && normalizeRankMathKeywordPhrase(focusFromHtml) !== normalizeRankMathKeywordPhrase(recordFocusKeyword)) {
        pageFailures.push(
          `${pageUrl}: rendered focus keyword "${focusFromHtml}" differs from saved Rank Math input "${recordFocusKeyword}".`,
        );
      }

      const imageInputs = [...contentHtml.matchAll(/<(?:img|source)\b[^>]*>/gi)]
        .map((match) => ({ alt: decodeHtml(getAttribute(match[0], "alt") || "").trim() }));
      const internalLinkCount = [...contentHtml.matchAll(/<a\b[^>]*>/gi)].filter((match) => {
        const href = decodeHtml(getAttribute(match[0], "href") || "").trim();
        if (!href || /^(?:#|mailto:|tel:|javascript:|data:)/i.test(href) || href.startsWith("//")) return false;
        try {
          return new URL(href, expectedCanonical).origin === new URL(expectedCanonical).origin;
        } catch {
          return false;
        }
      }).length;
      const jsonLd = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
      const jsonLdValid = jsonLd.length > 0 && jsonLd.every((match) => {
        try {
          JSON.parse(match[1].replace(/^\uFEFF/u, "").trim());
          return true;
        } catch {
          return false;
        }
      });
      input = {
        ...(input || {
          type: "static",
          title,
          seoTitle: title,
          description,
          focusKeyword: focusFromHtml,
          slug: route,
          canonical: htmlCanonical,
          expectedCanonical,
          content: contentText,
          h1: headings,
        }),
        images: imageInputs,
        internalLinks: internalLinkCount,
        jsonLdValid,
      };

      try {
        const analysis = analyzeRankMathSeo(input);
        const nonPassingChecks = analysis.checks
          .filter((check) => check.status === "fail" || check.status === "warning");
        rankMathReport.push({
          package: target.name,
          file: file.slice(target.htmlRoot.length).replace(/\\/g, "/"),
          route,
          url: pageUrl,
          type: analysis.type,
          score: analysis.score,
          publishable: analysis.publishable,
          focusKeyword: analysis.focusKeyword,
          seoTitle: input.seoTitle || input.title,
          description: input.description,
          pageFailures,
          checks: nonPassingChecks.map((check) => ({
            id: check.id,
            label: check.label,
            status: check.status,
            earned: check.earned,
            possible: check.possible,
            detail: check.detail,
          })),
        });
        if (analysis.score === 100 && analysis.publishable && pageFailures.length === 0) {
          perfectRankMathPages++;
        } else {
          const failedChecks = nonPassingChecks.map((check) => `${check.label} (${check.status}): ${check.detail}`);
          const reasons = [
            ...pageFailures,
            `Rank Math score ${analysis.score}/100 for ${analysis.type}.`,
            ...failedChecks,
          ];
          htmlTargetFailures.push(`${target.name} ${pageUrl}\n  ${reasons.map((reason) => `- ${reason}`).join("\n  ")}`);
        }
      } catch (error) {
        rankMathReport.push({
          package: target.name,
          file: file.slice(target.htmlRoot.length).replace(/\\/g, "/"),
          route,
          url: pageUrl,
          error: error?.message || String(error),
          pageFailures,
        });
        htmlTargetFailures.push(
          `${target.name} ${pageUrl}\n  - Rank Math analysis could not run: ${error?.message || error}`,
          ...pageFailures,
        );
      }
    }
    database.close();
    database = null;

    console.log(
      `Rank Math gate inspected ${files.length} generated HTML files for ${target.name}; `
      + `${files.length - htmlTargetFailures.length} pages passed 100/100.`,
    );
    htmlTargetFailures.forEach((message) => failures.push(message));
  } catch (error) {
    try { database?.close(); } catch {}
    failures.push(`${target.name}: Rank Math page inventory failed: ${error?.message || error}`);
  }
}

if (rankMathReportArgument) {
  const requestedPath = rankMathReportArgument.slice("--report-json=".length);
  const reportPath = isAbsolute(requestedPath) ? requestedPath : resolve(ROOT, requestedPath);
  writeFileSync(reportPath, `${JSON.stringify(rankMathReport, null, 2)}\n`, "utf8");
  console.log(`Rank Math detailed report saved: ${reportPath}`);
}

if (rankMathScope === "both") {
  const phpHtml = walk(hostingerDir).filter((file) => /\.html?$/i.test(file));
  const nodeHtmlRoot = join(hostingerNodeRoot, "public");
  const nodeHtml = walk(nodeHtmlRoot).filter((file) => /\.html?$/i.test(file));
  const relativeFiles = (root, files) => new Set(files.map((file) => file.slice(root.length).replace(/\\/g, "/")));
  const phpFiles = relativeFiles(hostingerDir, phpHtml);
  const nodeFiles = relativeFiles(nodeHtmlRoot, nodeHtml);
  const missingInNode = [...phpFiles].filter((file) => !nodeFiles.has(file));
  const missingInPhp = [...nodeFiles].filter((file) => !phpFiles.has(file));
  if (missingInNode.length || missingInPhp.length) {
    failures.push(
      `PHP and Node generated HTML inventories differ (PHP ${phpFiles.size}, Node ${nodeFiles.size}); `
      + `missing in Node: ${missingInNode.slice(0, 5).join(", ") || "none"}; `
      + `missing in PHP: ${missingInPhp.slice(0, 5).join(", ") || "none"}`,
    );
  } else {
    let mismatches = 0;
    for (const relative of phpFiles) {
      if (readFileSync(join(hostingerDir, relative), "utf8") !== readFileSync(join(nodeHtmlRoot, relative), "utf8")) {
        if (mismatches < 10) failures.push(`PHP and Node HTML differ: ${relative}`);
        mismatches++;
      }
    }
    if (mismatches > 10) failures.push(`PHP and Node HTML differ in ${mismatches} files in total.`);
    if (!mismatches) console.log(`PHP and Node generated HTML are byte-identical across ${phpFiles.size} files.`);
  }
}

const homepagePath = join(publicDir, "index.html");
if (existsSync(homepagePath)) {
  const homepageHtml = readFileSync(homepagePath, "utf8");
  const homepageTitle = homepageHtml.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]*>/g, "").trim() || "";
  const homepageH1 = [...homepageHtml.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map(match => match[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
  const primaryKeyword = "شركة تنظيف بالرياض";
  const occurrences = homepageTitle.match(/شركة تنظيف بالرياض/g)?.length || 0;
  if (!homepageTitle.startsWith(primaryKeyword) || occurrences !== 1) {
    failures.push(`homepage title must lead with "${primaryKeyword}" exactly once`);
  }
  if (!homepageH1.some(heading => heading.includes(primaryKeyword))) {
    failures.push(`homepage H1 must contain the primary keyword "${primaryKeyword}"`);
  }
}

const hostingerHomepagePath = join(hostingerDir, "index.html");
if (existsSync(hostingerRulesPath)) {
  if (!existsSync(hostingerHomepagePath)) {
    failures.push("Hostinger archive is missing its root index.html");
  } else {
    const hostingerHtml = readFileSync(hostingerHomepagePath, "utf8");
    const title = hostingerHtml.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]*>/g, "").trim() || "";
    const h1 = [...hostingerHtml.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
      .map(match => match[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
    const primaryKeyword = "شركة تنظيف بالرياض";
    const occurrences = title.match(/شركة تنظيف بالرياض/g)?.length || 0;
    if (!title.startsWith(primaryKeyword) || occurrences !== 1) {
      failures.push(`Hostinger homepage title must lead with "${primaryKeyword}" exactly once`);
    }
    if (title.split(/[|｜]/u).length > 2) {
      failures.push("Hostinger homepage title must not append the full company tagline after the brand");
    }
    if (h1.length !== 1 || !h1[0]?.includes(primaryKeyword)) {
      failures.push(`Hostinger homepage must have one H1 containing "${primaryKeyword}"`);
    }
  }
}

const duplicateTitleGroups = [...indexedTitleOwners.entries()].filter(([, paths]) => paths.length > 1);
if (duplicateTitleGroups.length) {
  warnings.push(
    `${duplicateTitleGroups.length} duplicate title groups remain among indexable sitemap pages; `
    + `examples: ${duplicateTitleGroups.slice(0, 3).map(([title, paths]) => `${title} (${paths.join(", ")})`).join("; ")}`,
  );
}

console.log(`SEO gate inspected ${htmlFiles.length} prerendered HTML files.`);
console.log(
  `Company-name repetition guard inspected ${titleGuardFiles.length} HTML files across dist and final Hostinger staging; `
  + `${repeatedCompanyPhraseTitles} repeated title phrases and `
  + `${repeatedCompanyPhraseDescriptions} repeated description phrases found.`,
);
warnings.forEach(message => console.warn(`WARNING: ${message}`));
if (failures.length) {
  failures.forEach(message => console.error(`FAIL: ${message}`));
  process.exit(1);
}
console.log("SEO gate passed: sitemap URLs and prerendered HTML are internally consistent.");