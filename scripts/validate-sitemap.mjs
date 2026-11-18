#!/usr/bin/env node
/**
 * Validate a deployable sitemap before it can be packaged.
 *
 * This intentionally uses no network calls by default: builds must remain
 * deterministic. Pass --check-http when an operator wants to check live
 * response status and redirects as a separate, opt-in step.
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BUILD_SITE_ORIGIN } from "./seo-config.mjs";
import { normalizeSitemapLocation } from "./sitemap-url-parity.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const decodeXml = (value) => String(value)
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'");

function resultFor(sourcePath) {
  return {
    sourcePath,
    errors: [],
    warnings: [],
    info: {
      urlCount: 0,
      imageCount: 0,
      sitemapCount: 0,
      hosts: new Set(),
      paths: new Set(),
    },
    pageLocations: [],
    sitemapLocations: [],
    isIndex: false,
  };
}

function validateUrl(value, label, result, seen, expectedOrigin, { isImage = false } = {}) {
  const raw = decodeXml(value).trim();
  if (!raw) {
    result.errors.push(`${label} is empty`);
    return;
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    result.errors.push(`${label} is not an absolute URL: ${raw}`);
    return;
  }

  const host = url.hostname.toLowerCase();
  result.info.hosts.add(host);
  result.info.paths.add(url.pathname || "/");

  if (url.protocol !== expectedOrigin.protocol) {
    result.errors.push(`${label} must use the active protocol ${expectedOrigin.protocol}: ${raw}`);
  }
  if (url.origin !== expectedOrigin.origin) {
    result.errors.push(`${label} must use origin ${expectedOrigin.origin}: ${raw}`);
  }
  if (url.username || url.password) {
    result.errors.push(`${label} contains credentials in its origin: ${raw}`);
  }
  if (!isImage && /^\/(?:admin|api)(?:\/|$)/i.test(url.pathname)) {
    result.errors.push(`${label} points to a non-public admin/API path: ${raw}`);
  }

  const normalized = normalizeSitemapLocation(raw);
  // The primary <loc> must be unique. Image URLs are allowed to repeat because
  // the same brand/service image can legitimately describe many pages.
  if (!isImage && seen.has(normalized)) {
    result.errors.push(`duplicate ${label}: ${raw}`);
  }
  seen.add(normalized);
}

export function validateSitemapXml(xml, sourcePath = "sitemap.xml", expectedSiteUrl = BUILD_SITE_ORIGIN) {
  const result = resultFor(sourcePath);
  const content = String(xml || "").replace(/^\uFEFF/, "");
  let expectedOrigin;
  try {
    expectedOrigin = new URL(expectedSiteUrl);
    if (
      !["http:", "https:"].includes(expectedOrigin.protocol)
      || expectedOrigin.username
      || expectedOrigin.password
      || expectedOrigin.pathname !== "/"
      || expectedOrigin.search
      || expectedOrigin.hash
      || !expectedOrigin.hostname
    ) throw new Error("origin is not a valid active HTTP(S) origin");
  } catch {
    result.errors.push(`expected site URL is invalid: ${expectedSiteUrl}`);
    return result;
  }

  if (!content.trim()) {
    result.errors.push("sitemap is empty");
    return result;
  }
  if (!/^<\?xml\s+version=["']1\.0["'][^?]*\?>/i.test(content.trimStart())) {
    result.errors.push("sitemap is missing the XML declaration");
  }
  if (/<!(?:DOCTYPE|ENTITY)\b/i.test(content)) {
    result.errors.push("sitemap contains a prohibited DOCTYPE or ENTITY declaration");
  }

  if (/<sitemapindex\b/i.test(content)) {
    result.isIndex = true;
    if (!/<\/sitemapindex>\s*$/i.test(content)) {
      result.errors.push("sitemap index does not have a complete sitemapindex root");
    }
    const blocks = [...content.matchAll(/<sitemap\b[^>]*>([\s\S]*?)<\/sitemap>/gi)].map(match => match[1]);
    const locValues = blocks.map(block => block.match(/<loc>([\s\S]*?)<\/loc>/i)?.[1]).filter(Boolean);
    result.info.sitemapCount = locValues.length;
    if (!locValues.length) result.errors.push("sitemap index has no child sitemap locations");
    if ((content.match(/<loc>/gi) || []).length !== (content.match(/<\/loc>/gi) || []).length) {
      result.errors.push("sitemap index contains an unclosed <loc> element");
    }
    const seenSitemaps = new Set();
    for (const [index, value] of locValues.entries()) {
      validateUrl(value, `<sitemap><loc> #${index + 1}`, result, seenSitemaps, expectedOrigin);
      const normalized = decodeXml(value).trim();
      try {
        const childUrl = new URL(normalized);
        if (!/^\/(?:[^/]+\/)*sitemap[1-9]\d*\.xml$/i.test(childUrl.pathname)
            || childUrl.search || childUrl.hash) {
          result.errors.push(`sitemap index child must be a sitemapN.xml file: ${normalized}`);
        }
      } catch {
        // validateUrl above reports malformed locations.
      }
      result.sitemapLocations.push(normalized);
    }
    if (blocks.length !== locValues.length) {
      result.errors.push(`sitemap index has ${blocks.length} <sitemap> blocks but ${locValues.length} <loc> values`);
    }
    return result;
  }

  if (!/<urlset\b[^>]*>/i.test(content) || !/<\/urlset>\s*$/i.test(content)) {
    result.errors.push("sitemap does not have a complete urlset or sitemapindex root");
    return result;
  }
  const locValues = [...content.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((match) => match[1]);
  const urlBlocks = [...content.matchAll(/<url\b[^>]*>([\s\S]*?)<\/url>/gi)].map((match) => match[1]);
  const imageValues = [...content.matchAll(/<image:loc>([\s\S]*?)<\/image:loc>/gi)].map((match) => match[1]);
  result.info.urlCount = locValues.length;
  result.info.imageCount = imageValues.length;

  if (!locValues.length) result.errors.push("sitemap has no <loc> URLs");
  if (urlBlocks.length !== locValues.length) {
    result.errors.push(`sitemap has ${urlBlocks.length} <url> blocks but ${locValues.length} <loc> values`);
  }
  if ((content.match(/<loc>/gi) || []).length !== (content.match(/<\/loc>/gi) || []).length) {
    result.errors.push("sitemap contains an unclosed <loc> element");
  }
  if ((content.match(/<url\b/gi) || []).length !== (content.match(/<\/url>/gi) || []).length) {
    result.errors.push("sitemap contains an unclosed <url> element");
  }

  const seenUrls = new Set();
  for (const [index, value] of locValues.entries()) {
    validateUrl(value, `<loc> #${index + 1}`, result, seenUrls, expectedOrigin);
    result.pageLocations.push(decodeXml(value).trim());
  }
  const seenImages = new Set();
  for (const [index, value] of imageValues.entries()) {
    validateUrl(value, `<image:loc> #${index + 1}`, result, seenImages, expectedOrigin, { isImage: true });
  }

  for (const block of urlBlocks) {
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/i)?.[1]?.trim();
    if (lastmod && !/^\d{4}-\d{2}-\d{2}(?:T[\d:.+-]+Z?)?$/.test(lastmod)) {
      result.warnings.push(`non-standard lastmod value: ${lastmod}`);
    }
  }

  return result;
}

export function validateSitemapFile(filePath, expectedSiteUrl = BUILD_SITE_ORIGIN, maxUrlsPerFile = 500) {
  const absolutePath = resolve(ROOT, filePath);
  const result = resultFor(absolutePath);
  if (!existsSync(absolutePath)) {
    result.errors.push(`sitemap file does not exist: ${filePath}`);
    return result;
  }
  const rootResult = validateSitemapXml(readFileSync(absolutePath, "utf8"), absolutePath, expectedSiteUrl);
  if (!rootResult.isIndex) return rootResult;

  result.errors.push(...rootResult.errors);
  result.warnings.push(...rootResult.warnings);
  result.info.sitemapCount = rootResult.info.sitemapCount;
  result.info.hosts = rootResult.info.hosts;
  result.info.paths = rootResult.info.paths;
  const seenPages = new Set();
  for (const [index, rawLocation] of rootResult.sitemapLocations.entries()) {
    let childPath;
    try {
      const childUrl = new URL(rawLocation, expectedSiteUrl);
      if (childUrl.origin !== new URL(expectedSiteUrl).origin) throw new Error("child origin mismatch");
      const decodedName = decodeURIComponent(basename(childUrl.pathname));
      if (!/^sitemap[1-9]\d*\.xml$/i.test(decodedName)) throw new Error("invalid child file name");
      childPath = resolve(dirname(absolutePath), decodedName);
      if (dirname(childPath) !== dirname(absolutePath)) throw new Error("child path escaped the sitemap directory");
    } catch {
      result.errors.push(`invalid sitemap index child #${index + 1}: ${rawLocation}`);
      continue;
    }
    if (!existsSync(childPath)) {
      result.errors.push(`sitemap index child file is missing: ${childPath}`);
      continue;
    }
    const childResult = validateSitemapXml(readFileSync(childPath, "utf8"), childPath, expectedSiteUrl);
    result.errors.push(...childResult.errors);
    result.warnings.push(...childResult.warnings);
    result.info.hosts = new Set([...result.info.hosts, ...childResult.info.hosts]);
    result.info.paths = new Set([...result.info.paths, ...childResult.info.paths]);
    if (childResult.isIndex) {
      result.errors.push(`nested sitemap index is not supported: ${childPath}`);
      continue;
    }
    if (childResult.info.urlCount > maxUrlsPerFile) {
      result.errors.push(`${childPath} has ${childResult.info.urlCount} URLs; the configured maximum is ${maxUrlsPerFile}`);
    }
    result.info.urlCount += childResult.info.urlCount;
    result.info.imageCount += childResult.info.imageCount;
    for (const location of childResult.pageLocations) {
      const normalized = normalizeSitemapLocation(location);
      if (seenPages.has(normalized)) result.errors.push(`duplicate sitemap page URL across child files: ${location}`);
      seenPages.add(normalized);
      result.pageLocations.push(location);
    }
  }
  return result;
}

async function checkHttpStatus(urls, result) {
  const queue = [...urls];
  const worker = async () => {
    while (queue.length) {
      const url = queue.shift();
      try {
        const response = await fetch(url, {
          method: "HEAD",
          redirect: "manual",
          signal: AbortSignal.timeout(10000),
        });
        if (response.status >= 300 && response.status < 400) {
          result.warnings.push(`URL redirects (${response.status}): ${url}`);
        } else if (response.status >= 400) {
          result.errors.push(`URL returns HTTP ${response.status}: ${url}`);
        }
      } catch (error) {
        result.warnings.push(`could not check URL ${url}: ${error?.message || "network error"}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, urls.length) }, worker));
}

async function main() {
  const args = process.argv.slice(2);
  const checkHttp = args.includes("--check-http");
  const expectedSiteUrl = args.find((arg) => arg.startsWith("--site-url="))?.slice("--site-url=".length)
    || BUILD_SITE_ORIGIN;
  const filePath = args.find((arg) => !arg.startsWith("--")) || "artifacts/sabaik-almasa/dist/public/sitemap.xml";
  const rawMax = args.find((arg) => arg.startsWith("--max-urls="))?.slice("--max-urls=".length) || "500";
  const requestedMax = /^\d+$/.test(rawMax) ? Number(rawMax) : Number.NaN;
  const maxUrlsPerFile = Number.isSafeInteger(requestedMax) ? Math.max(1, Math.min(500, requestedMax)) : 500;
  const result = validateSitemapFile(filePath, expectedSiteUrl, maxUrlsPerFile);

  if (checkHttp && result.errors.length === 0) {
    await checkHttpStatus(result.pageLocations, result);
  }

  console.log(`INFO: inspected ${result.info.urlCount} page URLs and ${result.info.imageCount} image URLs from ${filePath} (${result.info.sitemapCount} child sitemaps)`);
  if (result.info.hosts.size) console.log(`INFO: hosts: ${[...result.info.hosts].join(", ")}`);
  result.warnings.forEach((message) => console.warn(`WARNING: ${message}`));
  result.errors.forEach((message) => console.error(`ERROR: ${message}`));
  if (result.errors.length) process.exitCode = 1;
  else console.log("Sitemap validation passed.");
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  await main();
}