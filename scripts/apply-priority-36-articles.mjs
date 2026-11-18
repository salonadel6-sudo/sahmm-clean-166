#!/usr/bin/env node
/** Convert the validated priority-36 landing content into published blog articles. */
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { priority36Keywords } from "./data/priority-36-keywords.mjs";
import { priorityLongFormPages, priorityPageMetadata } from "./data/priority-36-long-form.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "lib", "db", "package.json"));
const Database = require("better-sqlite3");
const db = new Database(join(ROOT, "data", "sabaik.db"));
const now = new Date().toISOString();

function slugify(value) {
  return String(value || "").normalize("NFKC").replace(/[\u064B-\u065F\u0670\u0640]/gu, "")
    .toLocaleLowerCase("ar").replace(/[\s_]+/gu, "-")
    .replace(/[^\u0600-\u06FFa-z0-9-]/gu, "").replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "").slice(0, 100);
}

function visibleText(html) {
  return String(html || "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ").replace(/<[^>]*>/gu, " ")
    .replace(/&(#(?:x[\da-f]+|\d+)|amp|lt|gt|quot|apos|nbsp);/giu, " ").replace(/\s+/gu, " ").trim();
}

function arabicWordCount(html) {
  return visibleText(html).split(/\s+/u).filter((word) => /[\u0600-\u06FF]/u.test(word)).length;
}

if (priority36Keywords.length !== 36 || new Set(priority36Keywords).size !== 36) {
  throw new Error("Expected exactly 36 unique article keywords.");
}
const authored = Object.keys(priorityLongFormPages);
if (authored.length !== 36 || priority36Keywords.some((keyword) => !Object.hasOwn(priorityLongFormPages, keyword))) {
  throw new Error("Refusing conversion: the long-form article source must contain all 36 keywords.");
}

const getPage = db.prepare("SELECT * FROM seo_pages WHERE target_keyword = ? ORDER BY id DESC");
const findPost = db.prepare("SELECT * FROM posts WHERE title = ? OR seo_slug = ? OR slug = ?");
const findSlug = db.prepare("SELECT id,title FROM posts WHERE slug = ?");
const insertPost = db.prepare(`
  INSERT INTO posts (
    title,slug,content,excerpt,cover_image,author,category,tags,status,published_at,
    read_time,view_count,is_active,"order",seo_title,seo_description,seo_keywords,
    seo_slug,og_image,canonical_url,created_at,updated_at
  ) VALUES (?,?,?,?,?,?,?,?, 'published', ?, ?,0,1,0,?,?,?,?,?,?,?,?)
`);
const updatePost = db.prepare(`
  UPDATE posts SET title=?,slug=?,content=?,excerpt=?,cover_image=?,author=?,category=?,tags=?,
    status='published',published_at=?,read_time=?,is_active=1,seo_title=?,seo_description=?,
    seo_keywords=?,seo_slug=?,og_image=?,canonical_url=?,updated_at=? WHERE id=?
`);
const activateReviewedPage = db.prepare(`
  UPDATE seo_pages SET status='published', is_active=1, updated_at=?
  WHERE id=?
`);
const siteSetting = db.prepare("SELECT value FROM site_settings WHERE key = ?").get("company_name");
const author = String(siteSetting?.value || "السهم كلين").split(/[|｜]/u, 1)[0].trim();
const outputs = [];

try {
  db.transaction(() => {
    for (const keyword of priority36Keywords) {
      const content = priorityLongFormPages[keyword];
      const wordCount = arabicWordCount(content);
      if (wordCount < 3500) throw new Error(`${keyword}: ${wordCount} Arabic words; 3500 required.`);

      const pages = getPage.all(keyword);
      const matchingPages = pages.filter((candidate) => candidate.content === content);
      if (matchingPages.length !== 1) {
        throw new Error(`${keyword}: expected one source page matching reviewed content, found ${matchingPages.length}.`);
      }
      const page = matchingPages[0];

      const metadata = priorityPageMetadata[keyword] || {};
      const slug = slugify(keyword);
      const seoTitle = String(metadata.seoTitle || page.seo_title || "").trim();
      const seoDescription = String(metadata.seoDescription || page.seo_description || "").trim();
      const seoKeywords = [keyword, metadata.category || page.category, "الرياض"].filter(Boolean).join("، ");
      const category = metadata.category || page.category || "خدمات التنظيف";
      const image = page.cover_image || page.og_image;
      const canonicalUrl = `/blog/${encodeURIComponent(slug)}`;
      const links = [...String(content).matchAll(/href=["']([^"']+)["']/giu)].map((match) => match[1]);

      if (!seoTitle || [...seoTitle].length < 50 || [...seoTitle].length > 60) {
        throw new Error(`${keyword}: article SEO title must contain 50–60 characters.`);
      }
      if (!seoDescription || [...seoDescription].length < 120 || [...seoDescription].length > 160) {
        throw new Error(`${keyword}: article description must contain 120–160 characters.`);
      }
      if (!image) throw new Error(`${keyword}: cover image is missing.`);
      if (!links.includes("/contact/شركة-تنظيف-بالرياض")) throw new Error(`${keyword}: contact link is missing.`);
      if (!findSlug.get(slug) && findPost.all(keyword, slug, slug).length > 1) {
        throw new Error(`${keyword}: ambiguous existing article records.`);
      }

      const matches = findPost.all(keyword, slug, slug);
      if (matches.length > 1) throw new Error(`${keyword}: multiple existing articles match this target.`);
      const post = matches[0];
      const conflictingSlug = findSlug.get(slug);
      if (conflictingSlug && conflictingSlug.id !== post?.id) {
        throw new Error(`${keyword}: blog slug is already used by post ${conflictingSlug.id} (${conflictingSlug.title}).`);
      }

      const excerpt = visibleText(content).slice(0, 420);
      const tags = JSON.stringify([keyword, category, "الرياض"]);
      const publishedAt = page.published_at || now;
      const readTime = Math.max(1, Math.ceil(wordCount / 200));
      if (post) {
        updatePost.run(keyword, slug, content, excerpt, image, author, category, tags,
          publishedAt, readTime, seoTitle, seoDescription, seoKeywords, slug, image,
          canonicalUrl, now, post.id);
      } else {
        insertPost.run(keyword, slug, content, excerpt, image, author, category, tags,
          publishedAt, readTime, seoTitle, seoDescription, seoKeywords, slug, image,
          canonicalUrl, now, now);
      }
      activateReviewedPage.run(now, page.id);
      outputs.push({ keyword, id: post?.id ?? null, slug, arabicWords: wordCount, image, updated: Boolean(post) });
    }
  })();
} finally {
  db.close();
}

console.log(JSON.stringify({ converted: outputs.length, articles: outputs }, null, 2));
