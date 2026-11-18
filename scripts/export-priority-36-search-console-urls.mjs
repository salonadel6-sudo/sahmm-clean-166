#!/usr/bin/env node
/** Export the published priority URLs exactly as present in the generated sitemap. */
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
import { priority36Keywords } from "./data/priority-36-keywords.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "lib", "db", "package.json"));
const Database = require("better-sqlite3");
const db = new Database(join(ROOT, "data", "sabaik.db"), { readonly: true });
const setting = db.prepare("SELECT value FROM site_settings WHERE key='site_public_url'").get();
const origin = String(setting?.value || "").replace(/\/+$/u, "");
if (!/^https:\/\//u.test(origin)) throw new Error("Expected the production HTTPS site_public_url setting.");

const pagesByKeyword = db.prepare(`
  SELECT slug FROM seo_pages
  WHERE target_keyword=? AND status='published' AND is_active=1
`);
const postsByTitle = db.prepare(`
  SELECT slug FROM posts
  WHERE title=? AND status='published' AND is_active=1
`);
const sitemapDirectory = join(ROOT, "artifacts", "sabaik-almasa", "public");
const sitemapText = ["sitemap1.xml", "sitemap2.xml"]
  .map((name) => readFileSync(join(sitemapDirectory, name), "utf8"))
  .join("\n");
const pageUrls = [];
const articleUrls = [];

try {
  for (const keyword of priority36Keywords) {
    const pageRows = pagesByKeyword.all(keyword);
    const postRows = postsByTitle.all(keyword);
    if (pageRows.length !== 1) throw new Error(`${keyword}: expected one active page, found ${pageRows.length}.`);
    if (postRows.length !== 1) throw new Error(`${keyword}: expected one active article, found ${postRows.length}.`);
    const pageUrl = `${origin}/page/${encodeURIComponent(pageRows[0].slug)}`;
    const articleUrl = `${origin}/blog/${encodeURIComponent(postRows[0].slug)}`;
    if (!sitemapText.includes(pageUrl)) throw new Error(`${keyword}: page is missing from the generated sitemap (${pageUrl}).`);
    if (!sitemapText.includes(articleUrl)) throw new Error(`${keyword}: article is missing from the generated sitemap (${articleUrl}).`);
    pageUrls.push({ keyword, url: pageUrl });
    articleUrls.push({ keyword, url: articleUrl });
  }
} finally {
  db.close();
}

const output = [
  `خريطة الموقع: ${origin}/sitemap.xml`,
  "",
  "الصفحات (36)",
  ...pageUrls.map(({ keyword, url }) => `${keyword}\t${url}`),
  "",
  "المقالات (36)",
  ...articleUrls.map(({ keyword, url }) => `${keyword}\t${url}`),
  "",
].join("\n");
const outputPath = join(ROOT, "artifacts", "priority-36-search-console-urls.txt");
writeFileSync(outputPath, output, "utf8");
console.log(JSON.stringify({ pageUrls: pageUrls.length, articleUrls: articleUrls.length, sitemapUrl: `${origin}/sitemap.xml`, outputPath }, null, 2));
