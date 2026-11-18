#!/usr/bin/env node
/** Verify the 36 published blog conversions against source, metadata, images, and unique content. */
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { priority36Keywords } from "./data/priority-36-keywords.mjs";
import { priorityLongFormPages, priorityPageMetadata } from "./data/priority-36-long-form.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "lib", "db", "package.json"));
const Database = require("better-sqlite3");
const db = new Database(join(ROOT, "data", "sabaik.db"), { readonly: true });

function plain(html) {
  return String(html || "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ").replace(/<[^>]*>/gu, " ")
    .replace(/&(#(?:x[\da-f]+|\d+)|amp|lt|gt|quot|apos|nbsp);/giu, " ")
    .replace(/\s+/gu, " ").trim();
}

function words(html) {
  return plain(html).split(/\s+/u).filter(Boolean);
}

function slugify(value) {
  return String(value || "").normalize("NFKC").replace(/[\u064B-\u065F\u0670\u0640]/gu, "")
    .toLocaleLowerCase("ar").replace(/[\s_]+/gu, "-")
    .replace(/[^\u0600-\u06FFa-z0-9-]/gu, "").replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "").slice(0, 100);
}

function canonicalPath(value) {
  try {
    return decodeURIComponent(new URL(String(value || ""), "https://canonical.invalid").pathname);
  } catch {
    return "";
  }
}

function shingles(html) {
  const tokens = words(html).map((token) => token.toLocaleLowerCase("ar"));
  const result = new Set();
  for (let index = 0; index + 2 < tokens.length; index += 1) {
    result.add(tokens.slice(index, index + 3).join(" "));
  }
  return result;
}

function jaccard(left, right) {
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

const errors = [];
if (priority36Keywords.length !== 36 || new Set(priority36Keywords).size !== 36) {
  errors.push("The keyword manifest must contain exactly 36 unique terms.");
}
const missing = priority36Keywords.filter((keyword) => !Object.hasOwn(priorityLongFormPages, keyword));
if (missing.length) errors.push(`Missing source content: ${missing.join("، ")}`);

const rowsByTitle = db.prepare("SELECT * FROM posts WHERE title = ? AND status = 'published' AND is_active = 1");
const pagesByKeyword = db.prepare("SELECT * FROM seo_pages WHERE target_keyword = ? AND status = 'published' AND is_active = 1");
const publicDirectory = join(ROOT, "artifacts", "sabaik-almasa", "public");
const renderedDirectory = join(ROOT, "artifacts", "sabaik-almasa", "dist", "public");
const blogIndexPath = join(renderedDirectory, "blog", "index.html");
const sitemapPaths = ["sitemap1.xml", "sitemap2.xml"].map((name) => join(publicDirectory, name));
const blogIndexHtml = existsSync(blogIndexPath) ? readFileSync(blogIndexPath, "utf8") : "";
const sitemapText = sitemapPaths.filter(existsSync).map((path) => readFileSync(path, "utf8")).join("\n");
const canonicalSlugs = new Set();
const shinglesByArticle = [];
const summaries = [];

for (const keyword of priority36Keywords) {
  const authored = priorityLongFormPages[keyword];
  if (!authored) continue;
  const metadata = priorityPageMetadata[keyword] || {};
  const rows = rowsByTitle.all(keyword);
  const activePages = pagesByKeyword.all(keyword);
  if (rows.length !== 1) {
    errors.push(`${keyword}: expected one active published article, found ${rows.length}.`);
    continue;
  }
  if (activePages.length !== 1) errors.push(`${keyword}: expected one active published SEO page, found ${activePages.length}.`);
  const post = rows[0];
  const page = activePages[0];
  const tokens = words(post.content);
  const arabicWordCount = tokens.filter((word) => /[\u0600-\u06FF]/u.test(word)).length;
  const slug = slugify(keyword);
  const expectedCanonical = `/blog/${encodeURIComponent(slug)}`;
  const coverPath = join(publicDirectory, String(post.cover_image || "").replace(/^\//u, ""));
  const renderedPath = join(renderedDirectory, "blog", slug, "index.html");
  const renderedHtml = existsSync(renderedPath) ? readFileSync(renderedPath, "utf8") : "";
  const renderedPagePath = join(renderedDirectory, "page", slug, "index.html");
  const renderedPageHtml = existsSync(renderedPagePath) ? readFileSync(renderedPagePath, "utf8") : "";
  const servicePath = metadata.serviceSlug ? `/services/${metadata.serviceSlug}` : "";
  const links = [...String(post.content).matchAll(/href=["']([^"']+)["']/giu)].map((match) => match[1]);
  const descriptionLength = [...String(post.seo_description || "")].length;
  const titleLength = [...String(post.seo_title || "")].length;

  if (post.content !== authored) errors.push(`${keyword}: stored article differs from the reviewed source.`);
  if (arabicWordCount < 3500) errors.push(`${keyword}: ${arabicWordCount} Arabic words; 3500 required.`);
  if (page && page.content !== authored) errors.push(`${keyword}: stored SEO page differs from the reviewed source.`);
  if (page && page.slug !== slug) errors.push(`${keyword}: SEO page slug does not exactly match the target keyword.`);
  if (page && canonicalPath(page.canonical_url) !== `/page/${slug}`) errors.push(`${keyword}: SEO page canonical is not self-referencing.`);
  if (post.slug !== slug || post.seo_slug !== slug) errors.push(`${keyword}: blog slug does not exactly match the target keyword.`);
  if (post.canonical_url !== expectedCanonical) errors.push(`${keyword}: canonical URL is not self-referencing.`);
  if (post.seo_keywords.split(/[،,]/u)[0]?.trim() !== keyword) errors.push(`${keyword}: focus keyword is not first in SEO keywords.`);
  if (titleLength < 50 || titleLength > 60) errors.push(`${keyword}: SEO title length is ${titleLength}; 50–60 required.`);
  if (descriptionLength < 120 || descriptionLength > 160) errors.push(`${keyword}: SEO description length is ${descriptionLength}; 120–160 required.`);
  if (!post.cover_image || !existsSync(coverPath)) errors.push(`${keyword}: cover image missing (${post.cover_image}).`);
  if (post.cover_image && !post.cover_image.endsWith(`${slug}.jpg`)) errors.push(`${keyword}: cover image filename does not match the keyword.`);
  if (!renderedHtml) errors.push(`${keyword}: prerendered article HTML is missing.`);
  if (renderedHtml && !renderedHtml.includes(`<title>${post.seo_title}</title>`)) errors.push(`${keyword}: prerendered SEO title does not match the article metadata.`);
  if (renderedHtml && !renderedHtml.includes(`/blog/${encodeURIComponent(slug)}`)) errors.push(`${keyword}: prerendered article canonical URL is missing.`);
  if (renderedHtml && words(renderedHtml).filter((word) => /[\u0600-\u06FF]/u.test(word)).length < 3500) errors.push(`${keyword}: prerendered article has fewer than 3500 visible Arabic words.`);
  if (!blogIndexHtml.includes(`/blog/${slug}`)) errors.push(`${keyword}: article is not linked from the prerendered blog index.`);
  if (!sitemapText.includes(`/blog/${encodeURIComponent(slug)}`)) errors.push(`${keyword}: article is missing from the generated sitemap.`);
  if (!servicePath || !links.includes(servicePath)) errors.push(`${keyword}: matching service link missing.`);
  if (!links.includes("/contact/شركة-تنظيف-بالرياض")) errors.push(`${keyword}: contact link missing.`);
  if (!renderedPageHtml) errors.push(`${keyword}: prerendered SEO page HTML is missing.`);
  if (renderedPageHtml && !renderedPageHtml.includes(`/page/${encodeURIComponent(slug)}`)) errors.push(`${keyword}: prerendered SEO page canonical URL is missing.`);
  if (renderedPageHtml && words(renderedPageHtml).filter((word) => /[\u0600-\u06FF]/u.test(word)).length < 3500) errors.push(`${keyword}: prerendered SEO page has fewer than 3500 visible Arabic words.`);
  if (!sitemapText.includes(`/page/${encodeURIComponent(slug)}`)) errors.push(`${keyword}: SEO page is missing from the generated sitemap.`);
  if (canonicalSlugs.has(slug)) errors.push(`${keyword}: duplicate article slug.`);
  canonicalSlugs.add(slug);
  shinglesByArticle.push({ keyword, shingles: shingles(post.content) });
  summaries.push({ keyword, arabicWordCount, titleLength, descriptionLength, slug, image: post.cover_image, pageId: page?.id ?? null });
}

db.close();

let maximumSimilarity = 0;
for (let left = 0; left < shinglesByArticle.length; left += 1) {
  for (let right = left + 1; right < shinglesByArticle.length; right += 1) {
    const similarity = jaccard(shinglesByArticle[left].shingles, shinglesByArticle[right].shingles);
    maximumSimilarity = Math.max(maximumSimilarity, similarity);
    if (similarity > 0.08) {
      errors.push(`Article overlap exceeds 8% (${similarity.toFixed(3)}): ${shinglesByArticle[left].keyword} / ${shinglesByArticle[right].keyword}.`);
    }
  }
}

console.log(JSON.stringify({
  publicationType: "SEO pages and blog articles",
  targetCount: priority36Keywords.length,
  validatedCount: summaries.length,
  activePageCount: summaries.filter((article) => article.pageId !== null).length,
  prerenderedCount: summaries.filter((article) => existsSync(join(renderedDirectory, "blog", article.slug, "index.html"))).length,
  prerenderedPageCount: summaries.filter((article) => existsSync(join(renderedDirectory, "page", article.slug, "index.html"))).length,
  blogIndexLinkedCount: summaries.filter((article) => blogIndexHtml.includes(`/blog/${article.slug}`)).length,
  sitemapCount: summaries.filter((article) => sitemapText.includes(`/blog/${encodeURIComponent(article.slug)}`)).length,
  pageSitemapCount: summaries.filter((article) => sitemapText.includes(`/page/${encodeURIComponent(article.slug)}`)).length,
  minimumArabicWords: summaries.length ? Math.min(...summaries.map((article) => article.arabicWordCount)) : 0,
  maximumThreeWordShingleSimilarity: Number(maximumSimilarity.toFixed(4)),
  errors,
}, null, 2));
if (errors.length) process.exitCode = 1;
