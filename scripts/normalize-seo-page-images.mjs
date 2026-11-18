#!/usr/bin/env node
/**
 * Give every published SEO page its own image file.
 *
 * The source image is selected by the page's search intent, then copied to a
 * keyword-based Arabic filename so the image URL, page title, and target
 * keyword stay aligned without changing the visual image library.
 */
import { createRequire } from "node:module";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "lib", "db", "package.json"));
const Database = require("better-sqlite3");
const db = new Database(join(ROOT, "data", "sabaik.db"));

const publicDir = join(ROOT, "artifacts", "sabaik-almasa", "public");
const sourceDir = join(publicDir, "images");
const targetDir = join(sourceDir, "seo");
mkdirSync(targetDir, { recursive: true });

function slugify(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 140);
}

function sourceImageFor(keyword, category) {
  const text = `${keyword} ${category}`.toLowerCase();
  if (/عزل.*(?:خزان)|خزان.*عزل/.test(text)) return "seo-gallery/insulation-water-tank.jpg";
  if (/عزل.*(?:سطح)|سطح.*عزل/.test(text)) return "seo-gallery/insulation-roof-check.jpg";
  if (/عزل.*(?:حراري|فوم)|(?:حراري|فوم).*عزل/.test(text)) return "seo-gallery/insulation-foam-work.jpg";
  if (/عزل|عوازل|فوم/.test(text)) return "seo-gallery/insulation-roof-check.jpg";
  if (/سلامة|حريق|دفاع مدني/.test(text)) return "service-safety.jpg";
  if (/خزانات|خزان/.test(text)) return "service-tanks.jpg";
  if (/مكيف|مكيفات|سبليت|فلاتر/.test(text)) return "service-ac.jpg";
  if (/مجالس|كنب|مفروشات|سجاد|موكيت|ستائر|بخار/.test(text)) return "service-majlis.jpg";
  if (/رخام|سيراميك|بلاط|أرضيات|ارضيات/.test(text)) return "service-marble.jpg";
  if (/حشرات|مبيدات/.test(text)) return "service-pest.jpg";
  if (/واجهات|مكاتب|شركات|منشآت|محلات|مطاعم|مدارس/.test(text)) return "service-facades.jpg";
  if (/بناء|تشطيب|دهان|تجديد/.test(text)) return "service-postconstruction.jpg";
  if (/فلل|فيلا|قصور|قصر/.test(text)) return "service-villas.jpg";
  if (/مسابح|مسبح/.test(text)) return "service-pool.jpg";
  if (/نقل|انتقال|عفش|أثاث/.test(text)) return "service-move.jpg";
  return "service-apartments.jpg";
}

const pages = db.prepare(`
  SELECT id, title, target_keyword, category, cover_image, og_image
  FROM seo_pages
  WHERE status = 'published' AND is_active = 1
  ORDER BY id ASC
`).all();

const update = db.prepare(`
  UPDATE seo_pages
  SET cover_image = ?, og_image = ?, updated_at = ?
  WHERE id = ?
`);

const now = new Date().toISOString();
let copied = 0;
let reused = 0;
let updated = 0;
const usedPaths = new Set();

for (const page of pages) {
  const keyword = String(page.target_keyword || page.title || "").trim();
  if (!keyword) continue;

  let fileSlug = slugify(keyword) || `seo-page-${page.id}`;
  let filename = `${fileSlug}.jpg`;
  let imagePath = `/images/seo/${filename}`;
  if (usedPaths.has(imagePath)) {
    fileSlug = `${fileSlug}-${page.id}`;
    filename = `${fileSlug}.jpg`;
    imagePath = `/images/seo/${filename}`;
  }
  usedPaths.add(imagePath);

  const sourceName = sourceImageFor(keyword, page.category);
  const sourcePath = join(sourceDir, sourceName);
  const targetPath = join(targetDir, filename);
  if (!existsSync(sourcePath)) {
    throw new Error(`Missing source image: ${sourcePath}`);
  }
  if (existsSync(targetPath)) {
    reused++;
  } else {
    copyFileSync(sourcePath, targetPath);
    copied++;
  }

  if (page.cover_image !== imagePath || page.og_image !== imagePath) {
    update.run(imagePath, imagePath, now, page.id);
    updated++;
  }
}

db.close();
console.log(JSON.stringify({
  publishedSeoPages: pages.length,
  imageRowsUpdated: updated,
  uniqueImageFiles: usedPaths.size,
  filesCopied: copied,
  filesAlreadyPresent: reused,
  directory: "public/images/seo",
}, null, 2));