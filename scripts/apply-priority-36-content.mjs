#!/usr/bin/env node
/** Apply authored long-form SEO pages only after the per-page word-count gate passes. */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { priorityLongFormPages, priorityPageMetadata } from "./data/priority-36-long-form.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "lib", "db", "package.json"));
const Database = require("better-sqlite3");
const db = new Database(join(ROOT, "data", "sabaik.db"));
const now = new Date().toISOString();
const imageDir = join(ROOT, "artifacts", "sabaik-almasa", "public", "images", "seo");
mkdirSync(imageDir, { recursive: true });

function slugify(value) {
  return String(value || "").normalize("NFKC").replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .toLocaleLowerCase("ar").replace(/[\s_]+/g, "-").replace(/[^\u0600-\u06FFa-z0-9-]/g, "")
    .replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

function countWords(html) {
  return String(html || "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ").replace(/<[^>]*>/gu, " ")
    .replace(/&(#(?:x[\da-f]+|\d+)|amp|lt|gt|quot|apos|nbsp);/giu, " ").trim()
    .split(/\s+/u).filter(Boolean).length;
}

const find = db.prepare("SELECT * FROM seo_pages WHERE target_keyword = ? AND is_active = 1");
const update = db.prepare(`
  UPDATE seo_pages SET title = ?, target_keyword = ?, content = ?, excerpt = ?,
    category = ?, cover_image = ?, tags = ?, seo_title = ?, seo_description = ?,
    seo_keywords = ?, seo_slug = ?, og_image = ?, canonical_url = ?, updated_at = ?
  WHERE id = ?
`);
const insert = db.prepare(`
  INSERT INTO seo_pages (title,slug,target_keyword,content,excerpt,cover_image,category,tags,status,
    published_at,view_count,is_active,"order",seo_title,seo_description,seo_keywords,seo_slug,
    og_image,canonical_url,created_at,updated_at)
  VALUES (?,?,?,?,?,?,?,?, 'published', ?,0,1,0,?,?,?,?,?,?,?,?)
`);
const companyName = String(db.prepare("SELECT value FROM site_settings WHERE key = 'company_name'").get()?.value || "السهم كلين").split(/[|｜]/u, 1)[0].trim();
const results = [];

try {
  const apply = db.transaction(() => {
    for (const [focus, content] of Object.entries(priorityLongFormPages)) {
      const words = countWords(content);
      if (words < 3500) throw new Error(`Refusing to publish ${focus}: ${words} words; 3500 required.`);
      const matches = find.all(focus);
      if (matches.length > 1) throw new Error(`Refusing ambiguous duplicate target ${focus}: ${matches.length} active pages.`);
      const metadata = priorityPageMetadata[focus] || {};
      const slug = matches[0]?.slug || slugify(focus);
      const imageFile = `${slugify(focus)}.jpg`;
      const imagePath = join(imageDir, imageFile);
      const existingImage = String(matches[0]?.cover_image || "").replace(/^\//u, "");
      const existingPath = existingImage ? join(ROOT, "artifacts", "sabaik-almasa", "public", existingImage) : "";
      const fallbackPath = metadata.fallbackImage
        ? join(ROOT, "artifacts", "sabaik-almasa", "public", "images", metadata.fallbackImage)
        : "";
      const imageSource = existingPath && existsSync(existingPath) ? existingPath : fallbackPath;
      if (!existsSync(imagePath) && imageSource && existsSync(imageSource)) copyFileSync(imageSource, imagePath);
      const image = existsSync(imagePath) ? `/images/seo/${imageFile}` : (matches[0]?.cover_image || "");
      if (!image) throw new Error(`No existing image or fallback is available for ${focus}.`);
      const description = metadata.seoDescription || matches[0]?.seo_description
        || `${focus}: تعرف على نطاق الخدمة والخطوات والمعلومات التي تجهزها قبل الحجز في الرياض.`;
      const seoTitle = metadata.seoTitle || matches[0]?.seo_title || `${focus} | نطاق الخدمة | ${companyName}`;
      const keywords = matches[0]?.seo_keywords || [focus, "تنظيف بالرياض", "خدمات التنظيف"].join("، ");
      const excerpt = matches[0]?.excerpt || `${focus}: دليل عملي يوضح النطاق والاستعداد والعناية بعد الخدمة.`;
      const category = metadata.category || matches[0]?.category || "خدمات التنظيف";
      const tags = matches[0]?.tags || JSON.stringify([focus, category, "الرياض"]);
      const canonical = `/page/${slug}`;
      if (matches[0]) {
        update.run(focus, focus, content, excerpt, category, image, tags, seoTitle, description,
          keywords, slug, image, canonical, now, matches[0].id);
        results.push({ focus, id: matches[0].id, slug, words, image, created: false });
      } else {
        const publishedAt = now;
        const seoSlug = slug;
        const seoKeywords = [focus, "تنظيف بالرياض", "خدمات التنظيف"].join("، ");
        const seoDescription = description;
        const seoTitleValue = seoTitle;
        const excerptValue = excerpt;
        const tagsValue = JSON.stringify([focus, category, "الرياض"]);
        insert.run(focus, slug, focus, content, excerptValue, image, category, tagsValue,
          publishedAt, seoTitleValue, seoDescription, seoKeywords, seoSlug, image, canonical, now, now);
        results.push({ focus, slug, words, image, created: true });
      }
    }
  });
  apply();
} finally {
  db.close();
}

console.log(JSON.stringify({ applied: results }, null, 2));
