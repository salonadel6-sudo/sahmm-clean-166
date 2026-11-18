#!/usr/bin/env node
/**
 * build-hostinger.mjs
 * ───────────────────
 * خطوات بناء كاملة لـ Hostinger:
 *  1. بناء الواجهة الأمامية (Vite)
 *  2. نسخ ملفات البناء → build_php/
 *  3. إنشاء snapshot متسق لقاعدة البيانات
 *  4. نسخ قاعدة البيانات + تحويل عمود `order` → `sort_order` في الجداول المتأثرة
 *     (Drizzle ينشئ `order`، لكن PHP يقرأ `sort_order`)
 *  5. ضبط journal_mode=DELETE (WAL غير مدعوم على Hostinger shared hosting)
 *  6. تجهيز مجلد uploads بدون إعادة إدراج صور المشروع القديم
 *  7. تجهيز تعليمات النشر وضغط الأرشيف النهائي بمحتوى الموقع في جذر الأرشيف
 */

import { execFileSync, execSync } from "child_process";
import { randomBytes, createHash } from "crypto";
import { createRequire } from "module";
import { existsSync, mkdirSync, copyFileSync, rmSync, cpSync, writeFileSync, readFileSync, readdirSync, statSync, renameSync, mkdtempSync } from "fs";
import { join, dirname, resolve } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { ARABIC_AREA_SLUGS } from "./area-route-aliases.mjs";
import { getSeoPageIndexability, SEO_PAGE_REDIRECTS } from "./seo-page-policy.mjs";
import {
  LEGACY_PACKAGE_ROUTE_REDIRECTS,
  LEGACY_PACKAGE_ROUTE_SLUGS,
  LEGACY_STATIC_ROUTE_REDIRECTS,
} from "./package-route-policy.mjs";
import { resolvePostImage } from "./post-image-fallback.mjs";
import { rewriteUnicodeHostingerRedirectTargets } from "./hostinger-redirect-targets.mjs";
import {
  parseSiteOriginAliases,
  resolveBuildSiteOrigin,
  tokenizeSiteOrigins,
} from "./site-origin.mjs";
import { assertHostingerSitemapRuntime } from "./hostinger-sitemap-runtime.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const require = createRequire(join(ROOT, "lib", "db", "package.json"));
const Database = require("better-sqlite3");
const buildSiteOrigin = resolveBuildSiteOrigin({ ...process.env, VITE_PORT: "19770" });
process.env.CLEANFLOW_SITE_ORIGIN = buildSiteOrigin;
process.env.VITE_PUBLIC_SITE_URL = buildSiteOrigin;
const phpOnly = process.argv.includes("--php-only");
const previousPhpApiPath = join(ROOT, "build_php/api/index.php");
const previousHostingerSecret = existsSync(previousPhpApiPath)
  ? readFileSync(previousPhpApiPath, "utf8").match(/SESSION_SECRET'\)\s*\?:\s*'([0-9a-f]{64})'/)?.[1] ?? null
  : null;
function run(cmd, label, envVars = {}) {
  console.log(`\n▶ ${label}`);
  execSync(cmd, { cwd: ROOT, stdio: "inherit", env: { ...process.env, ...envVars } });
}

function step(label) {
  console.log(`\n${"─".repeat(60)}\n✦ ${label}`);
}

function getLegacySiteOrigins() {
  const databasePath = join(ROOT, "data/sabaik.db");
  if (!existsSync(databasePath)) return [];
  const database = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    const exists = database.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='site_settings' LIMIT 1",
    ).get();
    if (!exists) return [];
    const rows = database.prepare(
      "SELECT key, value FROM site_settings WHERE key IN ('site_public_url', 'site_public_url_aliases')",
    ).all();
    const settings = Object.fromEntries(rows.map(row => [row.key, row.value]));
    return [
      settings.site_public_url,
      ...parseSiteOriginAliases(settings.site_public_url_aliases),
    ].filter(Boolean);
  } finally {
    database.close();
  }
}

const siteOriginsToTokenize = [buildSiteOrigin, ...getLegacySiteOrigins()];

function tokenizeStaticSiteFiles(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) {
      tokenizeStaticSiteFiles(target);
    } else if (entry.isFile() && /\.(?:html|xml|txt)$/iu.test(entry.name)) {
      const original = readFileSync(target, "utf8");
      const tokenized = tokenizeSiteOrigins(original, siteOriginsToTokenize);
      if (tokenized !== original) writeFileSync(target, tokenized, "utf8");
    }
  }
}

run(
  "node scripts/centralize-primary-seo.mjs",
  "دمج صفحات الكلمات المتداخلة مع الحفاظ على تحويلات 301",
  {},
);
run(
  "pnpm --filter @workspace/scripts run seo:sync-reference",
  "مزامنة أعداد صفحات SEO والمقالات والخدمات في مرجع المحتوى",
  {},
);

// ── 1. بناء الواجهة الأمامية ─────────────────────────────────────────────────
step("بناء الواجهة الأمامية (Vite)");
const sabaikDistDir = join(ROOT, "artifacts/sabaik-almasa/dist");
const platformDistDir = join(ROOT, "artifacts/sabaik-platform/dist");
if (existsSync(sabaikDistDir)) rmSync(sabaikDistDir, { recursive: true, force: true });
if (existsSync(platformDistDir)) rmSync(platformDistDir, { recursive: true, force: true });

run(
  "node scripts/generate-sitemap.mjs",
  "إنشاء sitemap مصدر البناء من قاعدة البيانات",
  {},
);
run(
  "node scripts/validate-sitemap.mjs artifacts/sabaik-almasa/public/sitemap.xml",
  "التحقق من sitemap المصدر قبل بناء الواجهة",
  {},
);
run(
  "pnpm --filter @workspace/cleanflow-services run build",
  "vite build",
  { PORT: "19770", BASE_PATH: "/", NODE_ENV: "production" }
);
run(
  "pnpm --filter @workspace/cleanflow-platform run build",
  "بناء صفحة CleanFlow Platform",
  { PORT: "19040", BASE_PATH: "/cleanflow-platform/", NODE_ENV: "production" }
);

// ── 1b. Pre-rendering — HTML ثابت لكل مقال وخدمة وباقة التنظيف ─────────────────────
step("Pre-rendering الصفحات (SSG)");
run(
  "node scripts/prerender.mjs",
  "توليد HTML ثابت لجميع مقالات المدونة والخدمات والباقات التنظيف",
  {}
);
run(
  "pnpm --filter @workspace/scripts run apply:seo-page-overrides",
  "إعادة تطبيق تعديلات الصفحات الثابتة المحفوظة على HTML المرحلي",
  {},
);

// ── 2. نسخ ملفات البناء ───────────────────────────────────────────────────────
step("نسخ ملفات الواجهة → build_php/");

// نسخ assets/
rmSync(join(ROOT, "build_php/assets"), { recursive: true, force: true });
rmSync(join(ROOT, "build_php/images"), { recursive: true, force: true });
rmSync(join(ROOT, "build_php/container"), { recursive: true, force: true });
rmSync(join(ROOT, "build_php/api/uploads"), { recursive: true, force: true });
rmSync(join(ROOT, "build_php/sabaik-platform"), { recursive: true, force: true });
for (const generatedRoute of [
  "blog", "services", "cleaning-packages", "areas", "page", "pages", "pricing",
  "about", "من-نحن", "contact", "اتصل-بنا", "call-now", "اتصل-الآن",
  "faq", "الأسئلة-الشائعة", "privacy", "سياسة-الخصوصية", "terms", "الشروط-والأحكام",
  "partners", "chat", "why-us",
]) {
  rmSync(join(ROOT, "build_php", generatedRoute), { recursive: true, force: true });
}

for (const legacyImage of [
  "Banner-Big.webp", "Banner-Small.webp", "No1-Banner.webp", "good.webp",
  "shareek-mawsouq.webp", "container1.jpg", "container2.jpg", "container3.jpg", "container4.jpg",
  "hero1.jpg", "hero2.jpg", "hero3.jpg", "hero4.jpg", "ceo.webp", "hawiyat-logo.webp",
  "partner1.jpg", "partner2.jpg", "partner3.jpg", "partner4.jpg", "partner5.jpg", "partner6.jpg",
  "notification-icon.png"
]) {
  rmSync(join(ROOT, "build_php", legacyImage), { force: true });
}
const SKIP_FILES = new Set(["api"]);
const distPublic = join(ROOT, "artifacts/sabaik-almasa/dist/public");

function copyDirRecursive(srcDir, dstDir) {
  mkdirSync(dstDir, { recursive: true });
  for (const item of readdirSync(srcDir)) {
    if (
      SKIP_FILES.has(item)
      || (resolve(srcDir) === resolve(distPublic) && /^sitemap(?:[1-9]\d*)?\.xml$/i.test(item))
    ) continue;
    const srcPath = join(srcDir, item);
    const dstPath = join(dstDir, item);
    try {
      const stat = statSync(srcPath);
      if (stat.isDirectory()) {
        copyDirRecursive(srcPath, dstPath);
      } else {
        copyFileSync(srcPath, dstPath);
      }
    } catch {}
  }
}

copyDirRecursive(distPublic, join(ROOT, "build_php"));
console.log("  ✅ تم نسخ جميع المجلدات والصفحات الثابتة إلى build_php/");

// Preserve old root-level Arabic links as server redirects to the one
// indexable, prefixed URL. Do not publish duplicate HTML with a different
// canonical: that is the main source of "alternate page" reports.
function titleSlug(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}
const rootAliasReserved = new Set([
  "about", "admin", "api", "areas", "assets", "blog", "call-now", "cleanflow-platform",
  "contact", "data", "images", "offers", "page", "pages", "privacy", "services",
  "terms", "uploads", "why-us", "cleaning-packages",
]);
const rootAliasRedirects = new Map();
const pagePrefixAliasRedirects = new Map();
function addRootAlias(alias, targetPath, sourceRelativePath) {
  const safeAlias = titleSlug(alias);
  if (!safeAlias || !/[\u0600-\u06FF]/u.test(safeAlias) || rootAliasReserved.has(safeAlias)) return;
  if (rootAliasRedirects.has(safeAlias)) return;
  const source = join(ROOT, "build_php", sourceRelativePath, "index.html");
  if (!existsSync(source)) return;
  rootAliasRedirects.set(safeAlias, targetPath);
}
{
  const aliasDb = new Database(join(ROOT, "data/sabaik.db"), { readonly: true });
  const services = aliasDb.prepare("SELECT seo_slug, title, seo_title FROM services WHERE is_active = 1 AND seo_slug != ''").all();
  for (const service of services) {
    const aliases = [service.seo_slug, service.title, String(service.seo_title || "").split("|")[0]];
    if (/فلل.*وقصور/u.test(aliases.join(" "))) {
      aliases.push(String(service.seo_title || "").split("|")[0].replace(/وقصور/u, "").replace(/\s{2,}/g, " "));
    }
    for (const alias of aliases) {
      addRootAlias(alias, `/services/${service.seo_slug}`, `services/${service.seo_slug}`);
      const text = String(alias || "").trim();
      if (text && !/^شركة(?:\s|$)/u.test(text)) {
        addRootAlias(`شركة ${text}`, `/services/${service.seo_slug}`, `services/${service.seo_slug}`);
      }
    }
  }
  const posts = aliasDb.prepare("SELECT slug, title FROM posts WHERE status = 'published' AND is_active = 1 AND slug != ''").all();
  for (const post of posts) {
    for (const alias of [post.slug, post.title]) {
      addRootAlias(alias, `/blog/${post.slug}`, `blog/${post.slug}`);
    }
  }
  const pages = aliasDb.prepare(`
    SELECT slug, title, target_keyword, content, seo_title, canonical_url
    FROM seo_pages
    WHERE status = 'published' AND is_active = 1 AND slug != ''
  `).all();
  for (const page of pages) {
    if (!getSeoPageIndexability(page).indexable) continue;
    const pageSlug = String(page.slug || "");
    if (!/^[\p{L}\p{N}-]+$/u.test(pageSlug)) continue;
    if (!existsSync(join(ROOT, "build_php", "page", pageSlug, "index.html"))) continue;
    for (const prefix of ["صفحة", "صفحات", "pages"]) {
      pagePrefixAliasRedirects.set(`${prefix}/${pageSlug}`, `/page/${pageSlug}`);
    }
    for (const alias of [page.slug, page.title]) {
      addRootAlias(alias, `/page/${page.slug}`, `page/${page.slug}`);
    }
  }
  for (const { fromSlug, toPath, retireSource = true } of SEO_PAGE_REDIRECTS) {
    if (!retireSource) {
      const targetRelativePath = toPath.replace(/^\/+/u, "").replace(/\/+$/u, "");
      const normalizedAlias = titleSlug(fromSlug);
      const existingTarget = rootAliasRedirects.get(normalizedAlias);
      if (existingTarget && existingTarget !== toPath) {
        throw new Error(`Conflicting legacy root redirect for ${fromSlug}: ${existingTarget} vs ${toPath}`);
      }
      addRootAlias(fromSlug, toPath, targetRelativePath);
    }
    for (const prefix of ["صفحة", "صفحات", "pages"]) {
      pagePrefixAliasRedirects.set(`${prefix}/${fromSlug}`, toPath);
    }
  }
  const packages = aliasDb.prepare("SELECT id, seo_slug, name, seo_title FROM containers WHERE is_active = 1 AND seo_slug != ''").all();
  for (const item of packages) {
    const packageRouteSlug = LEGACY_PACKAGE_ROUTE_SLUGS[item.id] || item.seo_slug;
    for (const alias of [item.name, String(item.seo_title || "").split("|")[0]]) {
      addRootAlias(
        alias,
        `/cleaning-packages/${packageRouteSlug}`,
        `cleaning-packages/${packageRouteSlug}`,
      );
    }
  }
  aliasDb.close();
}

// A previous archive build may have copied the old duplicate root-level
// Arabic HTML aliases into build_php/. Remove those stale pages as well as
// any copies inherited from the public build; their only valid behavior is
// now the 301 rules written below.
for (const entry of readdirSync(join(ROOT, "build_php"), { withFileTypes: true })) {
  if (!entry.isDirectory() || !/[\u0600-\u06FF]/u.test(entry.name)) continue;
  const rootIndex = join(ROOT, "build_php", entry.name, "index.html");
  if (existsSync(rootIndex)) {
    rmSync(join(ROOT, "build_php", entry.name), { recursive: true, force: true });
  }
}

// بعض السجلات القديمة في SQLite تشير إلى /images/<file> بينما الملف المصدر
// موجود في public/uploads/<file>. أنشئ نسخة توافقية في images/ حتى تعمل
// المدونة والباقات بعد نقل الموقع إلى Hostinger بنفس مسارات الواجهة الحالية.
{
  const compatibilityImages = new Set();
  const imageDb = new Database(join(ROOT, "data/sabaik.db"), { readonly: true });
  for (const table of imageDb
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all()) {
    const safeTable = String(table.name).replaceAll('"', '""');
    const columns = imageDb.prepare(`PRAGMA table_info("${safeTable}")`).all();
    for (const column of columns.filter((item) => String(item.type || "").toUpperCase().includes("TEXT"))) {
      const safeColumn = String(column.name).replaceAll('"', '""');
      for (const row of imageDb.prepare(`SELECT "${safeColumn}" AS value FROM "${safeTable}"`).iterate()) {
        const value = typeof row.value === "string" ? row.value : "";
        for (const match of value.matchAll(/(?:^|["'])\/images\/([^/"'\\\s?#]+)/g)) {
          compatibilityImages.add(match[1]);
        }
      }
    }
  }
  imageDb.close();
  const sourceUploads = join(ROOT, "artifacts/sabaik-almasa/public/uploads");
  const targetImages = join(ROOT, "build_php/images");
  mkdirSync(targetImages, { recursive: true });
  for (const filename of compatibilityImages) {
    const target = join(targetImages, filename);
    if (existsSync(target)) continue;
    const source = join(sourceUploads, filename);
    if (existsSync(source)) {
      copyFileSync(source, target);
      console.log(`  ✅ توافق مسار الصورة: /images/${filename}`);
    }
  }
}

// Use PHP entry points for every prerendered folder so its HTML is rebound to
// the request host instead of exposing the origin from the build environment.
function addRuntimeHtmlWrappers(directory) {
  if (existsSync(join(directory, "index.html"))) {
    writeFileSync(
      join(directory, "index.php"),
      `<?php require_once rtrim((string)($_SERVER['DOCUMENT_ROOT'] ?? ''), '/') . '/site-origin-runtime.php'; cleanflowServeStaticHtml(__DIR__ . '/index.html');`,
      "utf8",
    );
  }
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || ["api", "data", "uploads", "assets", "images"].includes(entry.name)) continue;
    addRuntimeHtmlWrappers(join(directory, entry.name));
  }
}
addRuntimeHtmlWrappers(join(ROOT, "build_php"));

// ضمان وجود ملف PHP API الأساسي في build_php/api/index.php
mkdirSync(join(ROOT, "build_php/api"), { recursive: true });
copyFileSync(join(ROOT, "scripts/api-index.php"), join(ROOT, "build_php/api/index.php"));
copyFileSync(join(ROOT, "scripts/site-origin-runtime.php"), join(ROOT, "build_php/api/site-origin-runtime.php"));
copyFileSync(join(ROOT, "scripts/legacy-redirect.php"), join(ROOT, "build_php/legacy-redirect.php"));
copyFileSync(join(ROOT, "scripts/static-canonical-rewrite.php"), join(ROOT, "build_php/api/static-canonical-rewrite.php"));
copyFileSync(join(ROOT, "scripts/seo-page-policy.php"), join(ROOT, "build_php/api/seo-page-policy.php"));
copyFileSync(join(ROOT, "scripts/seo-fix-retry.php"), join(ROOT, "build_php/api/seo-fix-retry.php"));
copyFileSync(join(ROOT, "scripts/seo-page-overrides.php"), join(ROOT, "build_php/api/seo-page-overrides.php"));
execSync("php scripts/test-hostinger-static-canonicals.php", { cwd: ROOT, stdio: "inherit" });
copyFileSync(join(ROOT, "lib/seo-page-policy.json"), join(ROOT, "build_php/api/seo-page-policy.json"));
copyFileSync(join(ROOT, "lib/seo-service-page-content.json"), join(ROOT, "build_php/api/seo-service-page-content.json"));
copyFileSync(join(ROOT, "lib/seo-package-page-content.json"), join(ROOT, "build_php/api/seo-package-page-content.json"));
copyFileSync(join(ROOT, "scripts/container-system.php"), join(ROOT, "build_php/api/container-system.php"));
copyFileSync(join(ROOT, "scripts/blog-route.php"), join(ROOT, "build_php/blog-route.php"));
copyFileSync(join(ROOT, "scripts/site-origin-runtime.php"), join(ROOT, "build_php/site-origin-runtime.php"));
copyFileSync(join(ROOT, "scripts/site-html.php"), join(ROOT, "build_php/site-html.php"));
copyFileSync(join(ROOT, "scripts/site-response.php"), join(ROOT, "build_php/site-response.php"));
copyFileSync(join(ROOT, "artifacts/sabaik-almasa/public/robots.php"), join(ROOT, "build_php/robots.php"));
// Hostinger has no environment-variable manager in the deployed PHP process.
// Keep the existing key when rebuilding from the same DB so encrypted FTP
// settings and existing signed records remain readable across full releases.
{
  const phpApiPath = join(ROOT, "build_php/api/index.php");
  const phpApi = readFileSync(phpApiPath, "utf8");
  const hostingerSecret = previousHostingerSecret || randomBytes(32).toString("hex");
  writeFileSync(
    phpApiPath,
    phpApi.replaceAll("__HOSTINGER_TOKEN_SECRET__", hostingerSecret),
    "utf8",
  );
  console.log(previousHostingerSecret
    ? "  ✅ تم الحفاظ على مفتاح PHP السابق للتوافق مع بيانات الاعتماد المشفرة"
    : "  ✅ تم إنشاء مفتاح PHP جديد لهذه الحزمة");
}
console.log("  ✅ تم تجهيز طبقة PHP لنظام الباقات التنظيف والمالية والتدقيق");
console.log("  ✅ تم تجهيز ملف PHP API في build_php/api/index.php لبيئة Hostinger");

// تأكد من حذف sitemap.xml الثابت من build_php/ إن وُجد من بناء سابق
const staleStatic = join(ROOT, "build_php/sitemap.xml");
if (existsSync(staleStatic)) rmSync(staleStatic);
console.log("  ✅ assets/ + الملفات الثابتة + الصفحات المُولَّدة مسبقاً (prerendered) نُسخت");

// ── 2b. نسخ صفحة CleanFlow Platform التسويقية ─────────────────────────────────
step("نسخ صفحة CleanFlow Platform التسويقية → build_php/cleanflow-platform/");
const platformDist = join(ROOT, "artifacts/sabaik-platform/dist/public");
rmSync(join(ROOT, "build_php/hawiat-platform"), { recursive: true, force: true });
const platformTarget = join(ROOT, "build_php/cleanflow-platform");
rmSync(platformTarget, { recursive: true, force: true });
mkdirSync(platformTarget, { recursive: true });
cpSync(platformDist, platformTarget, { recursive: true });
addRuntimeHtmlWrappers(platformTarget);
console.log("  ✅ صفحة CleanFlow + الشعار + الأصول نُسخت");

// ── 3. تجهيز snapshot SQLite متسق ────────────────────────────────────────────
step("تجهيز snapshot آمن لقاعدة البيانات الأصلية");

{
  const srcDb = new Database(join(ROOT, "data/sabaik.db"));
  srcDb.close();
  console.log("  ✅ SQLite source opened safely");
}

// ── 4. نسخ قاعدة البيانات مع تحويل order → sort_order ───────────────────────
step("نسخ وتحويل قاعدة البيانات");

const DEST_DB = join(ROOT, "build_php/data/sabaik.db");
mkdirSync(dirname(DEST_DB), { recursive: true });

// انسخ أولاً
rmSync(DEST_DB, { force: true });
const sourceDbSnapshot = new Database(join(ROOT, "data/sabaik.db"), { readonly: true });
await sourceDbSnapshot.backup(DEST_DB);
sourceDbSnapshot.close();
console.log("  ✅ SQLite backup snapshot");

{
  const db = new Database(DEST_DB);

  /**
   * الجداول التي يُنشئها Drizzle بعمود `order`
   * لكن PHP يقرأها بعمود `sort_order`
   */
  /**
   * الجداول التي يُنشئها Drizzle بعمود `order`
   * لكن PHP يقرأها بعمود `sort_order`
   */
  const SORT_ORDER_TABLES = [
    "hero_slides",
    "services",
    "containers",
    "packages",
    "partners",
    "company_values",
  ];

  db.transaction(() => {
    // Resolve all legacy editorial mentions to the administrator-configured
    // company name before the SQLite file is packaged. This keeps imported blog
    // content and testimonials aligned with site settings on shared hosting.
    const siteNameRow = db.prepare("SELECT value FROM site_settings WHERE key = 'company_name'").get();
    const siteName = String(siteNameRow?.value || "").trim() || "الشركة";
    const postUploadDirectories = [
      join(ROOT, "uploads"),
      join(ROOT, "artifacts", "api-server", "uploads"),
      join(ROOT, "artifacts", "sabaik-almasa", "public", "uploads"),
    ].filter((directory) => existsSync(directory));
    const publishedPosts = db.prepare(`
      SELECT id, title, category, cover_image, og_image
      FROM posts
      WHERE status = 'published' AND is_active = 1
    `).all();
    const updatePostImages = db.prepare("UPDATE posts SET cover_image = ?, og_image = ? WHERE id = ?");
    let repairedPostImages = 0;
    for (const post of publishedPosts) {
      if (!post.cover_image && !post.og_image) continue;
      const resolvedCover = resolvePostImage(
        post,
        postUploadDirectories,
        "cover_image",
      );
      const coverWasRepaired = Boolean(post.cover_image && resolvedCover !== post.cover_image);
      const resolvedOg = coverWasRepaired
        ? resolvedCover
        : post.og_image
        ? resolvePostImage(post, postUploadDirectories, "og_image")
        : resolvedCover;
      if (resolvedCover !== (post.cover_image || "") || resolvedOg !== (post.og_image || "")) {
        updatePostImages.run(resolvedCover, resolvedOg, post.id);
        repairedPostImages++;
      }
    }
    if (repairedPostImages > 0) {
      console.log(`  ✅ تم إصلاح ${repairedPostImages} صورة غلاف لمقالات منشورة في نسخة Hostinger فقط`);
    }
    const legacyNames = [
      String.fromCodePoint(1587, 1576, 1575, 1574, 1610, 32, 1575, 1604, 1605, 1575, 1587, 1577),
      String.fromCodePoint(1605, 1572, 1587, 1587, 1587, 1577, 32, 1587, 1576, 1575, 1574, 1610, 32, 1575, 1604, 1585, 1575, 1587, 1577),
    ];
    for (const table of db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all()) {
      const safeTable = String(table.name).replaceAll('"', '""');
      const textColumns = db.prepare(`PRAGMA table_info("${safeTable}")`).all()
        .filter((column) => String(column.type || "").toUpperCase().includes("TEXT"));
      for (const column of textColumns) {
        const safeColumn = String(column.name).replaceAll('"', '""');
        for (const legacyName of legacyNames) {
          db.prepare(`UPDATE "${safeTable}" SET "${safeColumn}" = REPLACE("${safeColumn}", ?, ?) WHERE "${safeColumn}" LIKE ?`)
            .run(legacyName, siteName, `%${legacyName}%`);
        }
      }
    }
    console.log(`  ✅ تم توحيد محتوى SQLite على اسم الموقع من الإعدادات: ${siteName}`);

    // A previous import left NULL payloads in packages.size even though the
    // column is declared NOT NULL. SQLite can serve those rows locally, but
    // Hostinger's PDO SQLite integrity checks may reject the database and
    // turn package reads into HTTP 500 responses. Normalize only the packaged
    // copy; keep the development database untouched.
    const normalizedPackageRows = db
      .prepare(
        "UPDATE packages SET " +
        "size = COALESCE(size, ''), " +
        "capacity = COALESCE(capacity, ''), " +
        "description = COALESCE(description, ''), " +
        "features = COALESCE(features, '[]'), " +
        "suitable_for = COALESCE(suitable_for, '') " +
        "WHERE typeof(size) = 'null' OR typeof(capacity) = 'null' " +
        "OR typeof(description) = 'null' OR typeof(features) = 'null' " +
        "OR typeof(suitable_for) = 'null'",
      )
      .run().changes;
    if (normalizedPackageRows > 0) {
      console.log(`  ✅ تم تنظيف ${normalizedPackageRows} سجلًا ناقصًا في بيانات الباقات`);
    }

    // ── جداول order → sort_order ─────────────────────────────────────────────
    for (const table of SORT_ORDER_TABLES) {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
      const hasOrder     = cols.includes("order");
      const hasSortOrder = cols.includes("sort_order");

      if (!hasOrder && hasSortOrder) {
        console.log(`  ⏭  ${table}: sort_order موجود مسبقاً — تخطي`);
        continue;
      }

      if (!hasOrder && !hasSortOrder) {
        db.prepare(`ALTER TABLE ${table} ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`).run();
        console.log(`  ➕ ${table}: أضفت sort_order (القيم الافتراضية)`);
        continue;
      }

      if (hasOrder && !hasSortOrder) {
        db.prepare(`ALTER TABLE ${table} ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`).run();
        db.prepare(`UPDATE ${table} SET sort_order = "order"`).run();
        console.log(`  ✅ ${table}: order → sort_order (${db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c} سجل)`);
      }

      if (hasOrder && hasSortOrder) {
        db.prepare(`UPDATE ${table} SET sort_order = "order" WHERE sort_order = 0 AND "order" != 0`).run();
        console.log(`  🔄 ${table}: تزامن order → sort_order`);
      }
    }

    // ── جدول ads: order → ad_order ───────────────────────────────────────────
    {
      const cols = db.prepare(`PRAGMA table_info(ads)`).all().map((c) => c.name);
      const hasOrder   = cols.includes("order");
      const hasAdOrder = cols.includes("ad_order");

      if (!hasOrder && hasAdOrder) {
        console.log(`  ⏭  ads: ad_order موجود مسبقاً — تخطي`);
      } else if (!hasOrder && !hasAdOrder) {
        db.prepare(`ALTER TABLE ads ADD COLUMN ad_order INTEGER NOT NULL DEFAULT 0`).run();
        console.log(`  ➕ ads: أضفت ad_order (القيم الافتراضية)`);
      } else if (hasOrder && !hasAdOrder) {
        db.prepare(`ALTER TABLE ads ADD COLUMN ad_order INTEGER NOT NULL DEFAULT 0`).run();
        db.prepare(`UPDATE ads SET ad_order = "order"`).run();
        console.log(`  ✅ ads: order → ad_order (${db.prepare(`SELECT COUNT(*) AS c FROM ads`).get().c} سجل)`);
      } else if (hasOrder && hasAdOrder) {
        db.prepare(`UPDATE ads SET ad_order = "order" WHERE ad_order = 0 AND "order" != 0`).run();
        console.log(`  🔄 ads: تزامن order → ad_order`);
      }
    }
  })();

  // ── 5. journal_mode=DELETE (WAL غير مدعوم على Hostinger) ──────────────────
  db.pragma("journal_mode=DELETE");
  console.log("  ✅ journal_mode=DELETE");

  db.close();
}

// ── 6. تجهيز uploads ───────────────────────────────────────────────────────────
// الصور الحالية للخدمات والباقات والشركاء والمدير التنفيذي أصبحت أصولاً
// ثابتة داخل الواجهة. نحتفظ فقط بالصور المرفوعة التي ما زالت قاعدة البيانات
// تشير إليها حتى لا تعود صور المشاريع القديمة إلى أرشيف Hostinger.
step("تجهيز مجلد uploads بدون صور قديمة");
const uploadsDir = join(ROOT, "build_php/uploads");
rmSync(uploadsDir, { recursive: true, force: true });
mkdirSync(uploadsDir, { recursive: true });
// Uploads are written to the workspace root by the managed API workflow, while
// older snapshots may still keep them under artifacts/api-server/uploads.
// Search all portable locations so a Hostinger archive never drops a referenced
// package or hero image simply because it was uploaded by a different workflow.
const sourceUploadDirs = [
  join(ROOT, "uploads"),
  join(ROOT, "artifacts/api-server/uploads"),
  join(ROOT, "artifacts/sabaik-almasa/public/uploads"),
].filter((directory) => existsSync(directory));
const referencedUploads = new Set();
const uploadAliases = new Map();
function decodeUploadFilename(value) {
  let decoded = String(value || "");
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Keep the raw name so the missing-file warning identifies the bad value.
  }
  if (!decoded || decoded.includes("/") || decoded.includes("\\") || decoded.includes("\0")) return "";
  return decoded;
}
const sourceDb = new Database(DEST_DB, { readonly: true });
try {
  const tables = sourceDb
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((row) => row.name);
  for (const table of tables) {
    const safeTable = table.replaceAll('"', '""');
    const columns = sourceDb.prepare(`PRAGMA table_info("${safeTable}")`).all();
    for (const column of columns) {
      if (column.type && column.type !== "TEXT") continue;
      const safeColumn = column.name.replaceAll('"', '""');
      for (const row of sourceDb
        .prepare(`SELECT "${safeColumn}" AS value FROM "${safeTable}" WHERE "${safeColumn}" LIKE '%/uploads/%'`)
        .iterate()) {
        const value = typeof row.value === "string" ? row.value : "";
          for (const match of value.matchAll(/(?:\/api)?\/uploads\/([^/"'\\\]\s,}]+)/g)) {
            const filename = decodeUploadFilename(match[1]);
            if (filename) referencedUploads.add(filename);
        }
      }
    }
  }
} finally {
  sourceDb.close();
}
for (const filename of referencedUploads) {
  const extension = filename.match(/\.([^.]+)$/)?.[1]?.toLowerCase() || "";
  const webpFallback = extension && extension !== "webp"
    ? `${filename.slice(0, -(extension.length + 1))}.webp`
    : "";
  const candidates = [filename, webpFallback].filter(Boolean);
  let source = "";
  let packagedFilename = "";
  for (const candidate of candidates) {
    const found = sourceUploadDirs.find((directory) => existsSync(join(directory, candidate)));
    if (found) {
      source = join(found, candidate);
      packagedFilename = candidate;
      break;
    }
  }
  if (source) {
    copyFileSync(source, join(uploadsDir, packagedFilename));
    console.log(`  ✅ احتفظت بالصورة المستخدمة: ${packagedFilename}`);
    if (packagedFilename !== filename) {
      // Older records may keep .png/.jpg while only the optimized WebP is
      // available. Point the packaged snapshot at the file we actually ship.
      uploadAliases.set(filename, packagedFilename);
    }
    // Do not make Hostinger depend on a UTF-8 filesystem URL. Keep the
    // original file for backwards compatibility, but expose an ASCII alias
    // and rewrite packaged database references to that alias below.
    if (/[^\x20-\x7e]/.test(filename)) {
      const digest = createHash("sha256").update(filename, "utf8").digest("hex").slice(0, 12);
      const sourceExtension = packagedFilename.match(/\.([^.]+)$/)?.[1]?.toLowerCase() || "webp";
      const alias = `legacy-${digest}.${sourceExtension}`;
      copyFileSync(source, join(uploadsDir, alias));
      uploadAliases.set(filename, alias);
      console.log(`  ✅ اسم توافق ASCII للصورة: ${alias}`);
    }
  } else {
    console.warn(`  ⚠️ صورة مذكورة في قاعدة البيانات غير موجودة محلياً: ${filename}`);
  }
}

// The source database can contain URLs saved before ASCII-only uploads were
// introduced. Rewrite only the packaged snapshot; development data remains
// untouched and the actual image bytes are preserved under the alias above.
if (uploadAliases.size > 0) {
  const packagedDb = new Database(DEST_DB);
  packagedDb.transaction(() => {
    const tables = packagedDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map((row) => row.name);
    for (const table of tables) {
      const safeTable = String(table).replaceAll('"', '""');
      const columns = packagedDb.prepare(`PRAGMA table_info("${safeTable}")`).all();
      for (const column of columns.filter((item) => String(item.type || "").toUpperCase().includes("TEXT"))) {
        const safeColumn = String(column.name).replaceAll('"', '""');
        for (const [original, alias] of uploadAliases) {
          const encoded = encodeURIComponent(original);
          const statement = packagedDb.prepare(`UPDATE "${safeTable}" SET "${safeColumn}" = REPLACE(REPLACE(REPLACE("${safeColumn}", ?, ?), ?, ?), ?, ?)`);
          statement.run(
            `/api/uploads/${encoded}`, `/api/uploads/${alias}`,
            `/uploads/${encoded}`, `/uploads/${alias}`,
            `/api/uploads/${original}`, `/api/uploads/${alias}`,
          );
        }
      }
    }
  })();
  packagedDb.close();
  console.log(`  ✅ تم توحيد ${uploadAliases.size} رابط صورة قديم إلى أسماء ASCII في نسخة Hostinger`);
}
console.log(`  ✅ uploads/ يحتوي على ${referencedUploads.size} صورة مستخدمة فقط`);

// ── 7. كتابة .htaccess مع إصلاح Authorization header ─────────────────────────
step("كتابة ملفات .htaccess");

const escapeRewritePattern = (value) => String(value).replace(/[\\.^$|?*+()[\]{}]/g, "\\$&");
const rootAliasRedirectRules = [...rootAliasRedirects]
  .map(([alias, target]) => `  RewriteRule ^${escapeRewritePattern(alias)}/?$ ${target} [R=301,L]`)
  .join("\n");
const pagePrefixAliasRedirectRules = [...pagePrefixAliasRedirects]
  .map(([alias, target]) => `  RewriteRule ^${escapeRewritePattern(alias)}/?$ ${target} [R=301,L]`)
  .join("\n");
const seoPageRedirectRules = SEO_PAGE_REDIRECTS
  .map(({ fromSlug, toPath }) => `  RewriteRule ^page/${escapeRewritePattern(fromSlug)}/?$ ${toPath} [R=301,L]`)
  .join("\n");
const packageAndAreaAliasRedirects = (() => {
  const db = new Database(DEST_DB, { readonly: true });
  let containers = [];
  let packageRows = [];
  try {
    containers = db.prepare("SELECT id, seo_slug, name, seo_title FROM containers WHERE is_active = 1 AND seo_slug <> ''").all();
  } catch {
    db.close();
    throw new Error("تعذر قراءة الباقات النشطة لإنشاء تحويلات الروابط القديمة");
  }
  try {
    packageRows = db.prepare("SELECT id, seo_slug, name, seo_title FROM packages WHERE is_active = 1 AND seo_slug <> ''").all();
  } catch {
    // Older databases may not contain the editorial compatibility table.
  }
  db.close();
  const canonicalById = new Map(containers.map((row) => [
    Number(row.id),
    LEGACY_PACKAGE_ROUTE_SLUGS[row.id] || String(row.seo_slug || ""),
  ]));
  const aliasesById = new Map();
  const addPackageAlias = (id, value) => {
    const alias = String(value || "")
      .normalize("NFKC")
      .trim()
      .replace(/\s+/gu, "-")
      .replace(/[^\p{L}\p{N}-]/gu, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!alias || !canonicalById.has(Number(id))) return;
    const aliases = aliasesById.get(Number(id)) || new Set();
    aliases.add(alias);
    aliasesById.set(Number(id), aliases);
  };
  for (const row of containers) {
    addPackageAlias(row.id, row.seo_slug);
    addPackageAlias(row.id, row.name);
    addPackageAlias(row.id, String(row.seo_title || "").split("|")[0]);
    addPackageAlias(row.id, canonicalById.get(Number(row.id)));
  }
  for (const row of packageRows) {
    addPackageAlias(row.id, row.seo_slug);
    addPackageAlias(row.id, row.name);
    addPackageAlias(row.id, String(row.seo_title || "").split("|")[0]);
  }
  // Keep this historical Arabic URL pointed at the active package.
  addPackageAlias(17, "باقة-عقد-صيانة-انظمة-سلامة-دفاع-مدني");
  for (const { packageId, fromPath } of LEGACY_PACKAGE_ROUTE_REDIRECTS) {
    addPackageAlias(packageId, fromPath.split("/").filter(Boolean).at(-1));
  }

  const rules = new Set();
  for (const [id, aliases] of aliasesById) {
    const canonical = canonicalById.get(id);
    for (const alias of aliases) {
      const escaped = escapeRewritePattern(alias);
      if (alias !== canonical) {
        rules.add(`  RewriteRule ^cleaning-packages/${escaped}/?$ /cleaning-packages/${canonical} [R=301,L]`);
      }
      for (const oldPrefix of ["container", "package", "packages"]) {
        rules.add(`  RewriteRule ^${oldPrefix}/${escaped}/?$ /cleaning-packages/${canonical} [R=301,L]`);
      }
    }
  }

  const areaRules = new Set();
  for (const [canonical, arabic] of Object.entries(ARABIC_AREA_SLUGS)) {
    if (!existsSync(join(ROOT, "build_php", "areas", canonical, "index.html"))) continue;
    const aliases = new Set([arabic]);
    if (arabic.startsWith("حي-")) aliases.add(arabic.slice(3));
    for (const alias of aliases) {
      areaRules.add(
        `  RewriteRule ^areas/${escapeRewritePattern(alias)}/?$ /areas/${canonical} [R=301,L]`,
      );
    }
  }
  return [...areaRules, ...rules].join("\n");
})();
const legacyStaticRouteRedirects = LEGACY_STATIC_ROUTE_REDIRECTS.map(({ fromPath, toPath }) => {
  const source = escapeRewritePattern(fromPath.replace(/^\/+|\/+$/gu, ""));
  return `  RewriteRule ^${source}/?$ ${toPath} [R=301,L]`;
}).join("\n");
const canonicalRemediatedPackageRoutes = [10, 11, 14]
  .map((id) => LEGACY_PACKAGE_ROUTE_SLUGS[id])
  .filter(Boolean)
  .map((slug) => {
    const escaped = escapeRewritePattern(slug);
    return `  RewriteRule ^cleaning-packages/${escaped}/?$ cleaning-packages/${slug}/index.php [END]`;
  })
  .join("\n");
writeFileSync(join(ROOT, "build_php/.htaccess"), rewriteUnicodeHostingerRedirectTargets(`DirectoryIndex index.php index.html

<IfModule mod_headers.c>
  <FilesMatch "\\.html$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>
  <Files "sw.js">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </Files>
</IfModule>

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # ── Pass request headers through Apache (Hostinger strips them by default) ──
  RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization},E=HTTP_X_HTTP_METHOD_OVERRIDE:%{HTTP:X-HTTP-Method-Override}]

  # Block access to sensitive directories
  RewriteRule ^data/  - [F,L]
  RewriteRule ^\\\\\.     - [F,L]

  # Redirect legacy taxonomy, translated, and package routes before the SPA fallback.
${legacyStaticRouteRedirects}
${canonicalRemediatedPackageRoutes}
  RewriteRule ^من-نحن/?$ /about [R=301,L]
  RewriteRule ^اتصل-بنا/?$ /contact/شركة-تنظيف-بالرياض [R=301,L]
  RewriteRule ^اتصل-الآن/?$ /call-now [R=301,L]
  RewriteRule ^الأسئلة-الشائعة/?$ /faq/تنظيف-المنازل-بالرياض [R=301,L]
  RewriteRule ^سياسة-الخصوصية/?$ /privacy [R=301,L]
  RewriteRule ^الشروط-والأحكام/?$ /terms [R=301,L]
  RewriteRule ^المدونة/?$ /blog [R=301,L]
  RewriteRule ^المدونة/([^/]+)/?$ /blog/$1 [R=301,L,B]
  RewriteRule ^العروض/?$ /offers [R=301,L]
  RewriteRule ^المناطق/?$ /areas [R=301,L]
  RewriteRule ^الأسعار/?$ /cleaning-packages [R=301,L]
  RewriteRule ^packages/?$ /cleaning-packages [R=301,L]
  RewriteRule ^خدماتنا/([^/]+)/?$ /services/$1 [R=301,L,B]
  RewriteRule ^الأحياء/([^/]+)/?$ /areas/$1 [R=301,L,B]
  RewriteRule ^مقالات-السهم/?$ /blog [R=301,L]
  RewriteRule ^خدماتنا-بالرياض/خدمات-اخرى/?$ /services [R=301,L]
  RewriteRule ^تنظيف-الكنب-بالرياض-مع-التعطيروالتجف/?$ /services/غسيل-مجالس-بالبخار-بالرياض [R=301,L]
  RewriteRule ^نظافه-مثاليه-للاشياء-البيضاء/?$ - [G,L]
  RewriteRule ^pricing/?$ /cleaning-packages [R=301,L]
${rootAliasRedirectRules}
${pagePrefixAliasRedirectRules}
${seoPageRedirectRules}
${packageAndAreaAliasRedirects}
  RewriteRule ^services/tanzeef-shaqaq-alryad/?$ /services/تنظيف-شقق-بالرياض [R=301,L]
  RewriteRule ^services/tanzeef-filal-alryad/?$ /services/تنظيف-فلل-وقصور-بالرياض [R=301,L]
  RewriteRule ^services/gaseel-majalis-bukhar-alryad/?$ /services/غسيل-مجالس-بالبخار-بالرياض [R=301,L]
  RewriteRule ^services/tanzeef-mokeyafat-alryad/?$ /services/تنظيف-وغسيل-مكيفات-بالرياض [R=301,L]
  RewriteRule ^services/mokafahat-hasharat-alryad/?$ /services/مكافحة-حشرات-بالرياض [R=301,L]
  RewriteRule ^services/tanzeef-khazanat-alryad/?$ /services/تنظيف-وتطهير-خزانات-بالرياض [R=301,L]
  RewriteRule ^services/tanzeef-masabeh-alryad/?$ /services/تنظيف-وتطهير-مسابح-بالرياض [R=301,L]
  RewriteRule ^services/jaly-rakham-alryad/?$ /services/جلي-وتلميع-رخام-بالرياض [R=301,L]
  RewriteRule ^services/tanzeef-wajahat-alryad/?$ /services/تنظيف-واجهات-مباني-بالرياض [R=301,L]
  RewriteRule ^services/tanzeef-bad-altashteeb-alryad/?$ /services/تنظيف-بعد-البناء-والتشطيب-بالرياض [R=301,L]
  RewriteRule ^services/shahadat-salama-riyadh/?$ /services/اصدار-شهادة-سلامة-بالرياض [R=301,L]
  RewriteRule ^services/tarkeeb-anthimat-wiqaya-hareeq-riyadh/?$ /services/تركيب-ادوات-وقاية-وحماية-من-الحريق-بالرياض [R=301,L]
  RewriteRule ^services/taqreer-fanni-fawri-riyadh/?$ /services/اعداد-تقرير-فني-فوري-بالرياض [R=301,L]
  RewriteRule ^services/taqreer-fanni-ghayr-fawri-riyadh/?$ /services/اعداد-تقرير-فني-مجدول-بالرياض [R=301,L]
  RewriteRule ^services/aqd-siyana-difaa-madani-riyadh/?$ /services/عقد-صيانة-انظمة-سلامة-دفاع-مدني-بالرياض [R=301,L]

  # Route /api/* to the PHP handler
  RewriteRule ^api/  api/index.php  [L,QSA]
  RewriteRule ^api$ api/index.php [L,QSA]

  # Generate host-aware robots response.
  RewriteRule ^robots\\.txt$ robots.php [END]
  RewriteRule ^sitemap(?:[1-9]\\d*)?\\.xml$ site-response.php [END]
  RewriteRule ^llms\\.txt$ site-response.php [END]
  RewriteRule ^.+\\.html$ site-html.php [END]

  # WordPress archives have no replacement; never let them masquerade as the home page.
  RewriteRule ^tag(?:/|$) - [G,L]
  RewriteRule ^(?:feed|.+/feed)/?$ - [G,L]
  RewriteRule ^container(?:/|$) - [G,L]
  RewriteRule ^package(?:/|$) - [G,L]
  RewriteRule ^packages/.+ - [G,L]
  RewriteRule ^page/?$ - [R=404,L]

  # Use slashless URL canonicals for generated static pages. Redirect only
  # actual generated directories, then serve their index internally.
  RewriteRule ^(chat|partners|offers|why-us/(?:leadership|what-we-do|commitment|experience)|cleaning-packages/fire-safety)/$ /$1 [R=301,L]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^(about|contact|call-now|faq|privacy|terms|blog|areas|services|cleaning-packages|page)/$ /$1 [R=301,L]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^(contact|faq|blog|areas|services|cleaning-packages|page)/([^/]+)/$ /$1/$2 [R=301,L]
  RewriteRule ^(?:about|contact|call-now|faq|privacy|terms|blog|areas|services|cleaning-packages)$ $0/index.php [END]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^(contact|faq|blog|areas|services|cleaning-packages|page)/(.+)$ $1/$2/index.php [END]

  # A valid React route without a prerendered directory must still load the app.
  RewriteRule ^cleaning-packages/fire-safety$ index.php [END]

  # Allow direct access to existing files and directories after special routes.
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Missing blog pages are checked against the live SQLite database so posts
  # published after this static build can still load. The PHP handler preserves
  # real 404s for unknown or unpublished slugs.
  RewriteRule ^blog/([^/]+)/?$ blog-route.php?slug=$1 [END,B]

  # Other missing content URLs are real 404s, not the SPA home page with status 200.
  RewriteRule ^(?:areas|services|cleaning-packages|page)/.+$ - [R=404,L]
  RewriteRule ^(?:blog|areas|services|cleaning-packages|page)$ - [R=404,L]

  # Never serve index.html as JavaScript/CSS. Missing hashed assets must be a
  # real 404 so stale HTML cannot trigger a module MIME-type error.
  RewriteRule ^assets/ - [END]

  # These client-rendered routes have no prerendered HTML directory.
  RewriteRule ^(?:admin(?:/.*)?|chat|partners|offers|why-us/(?:leadership|what-we-do|commitment|experience))$ index.php [END]

  # Unknown URLs are real 404s, never the home page with a 200 response.
  RewriteRule ^ - [R=404,L]
</IfModule>
`), "utf8");

writeFileSync(join(ROOT, "build_php/api/.htaccess"), `DirectoryIndex index.php

<IfModule mod_rewrite.c>
  RewriteEngine On

  # ── Pass request headers through Apache (Hostinger strips them by default) ──
  RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization},E=HTTP_X_HTTP_METHOD_OVERRIDE:%{HTTP:X-HTTP-Method-Override}]

  RewriteRule ^ index.php [L,QSA]
</IfModule>
`);
console.log("  ✅ .htaccess مكتوبان مع Authorization passthrough");

// ── 7b. إنشاء Sitemap ثابت من قاعدة البيانات ──────────────────────────────────
// These source files are validated before origin tokenization. The shipped
// tokenized XML must be served through site-response.php so PHP can substitute
// the current request origin; the static files alone are not deployable output.
step("إنشاء sitemap.xml ثابت من قاعدة البيانات");
{
  const shellQuote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
  const phpCommand = [
    "php",
    "-r",
    shellQuote([
      "$_SERVER['REQUEST_METHOD']='GET';",
      "$_SERVER['REQUEST_URI']='/api/sitemap/generate';",
      "$_SERVER['HTTP_HOST']='';",
      "putenv('CLEANFLOW_STATIC_BUILD=1');",
      "require 'build_php/api/index.php';",
    ].join(" ")),
  ].join(" ");
  const generated = execSync(phpCommand, { cwd: ROOT, encoding: "utf8" }).trim();
  const sitemapData = JSON.parse(generated);
  if (!sitemapData.xml || !sitemapData.xml.startsWith("<?xml")) {
    throw new Error("تعذر إنشاء sitemap.xml بصيغة XML صحيحة");
  }
  for (const file of sitemapData.files || []) {
    if (!/^sitemap[1-9]\d*\.xml$/i.test(String(file.filename || ""))) {
      throw new Error(`اسم ملف sitemap فرعي غير صالح: ${file.filename}`);
    }
    writeFileSync(join(ROOT, "build_php", file.filename), file.xml, "utf8");
  }
  for (const filename of readdirSync(join(ROOT, "build_php"))) {
    if (
      /^sitemap[1-9]\d*\.xml$/i.test(filename)
      && !(sitemapData.files || []).some(file => file.filename === filename)
    ) {
      rmSync(join(ROOT, "build_php", filename), { force: true });
    }
  }
  writeFileSync(join(ROOT, "build_php/sitemap.xml"), sitemapData.xml, "utf8");
  run(
    `node scripts/validate-sitemap.mjs build_php/sitemap.xml --max-urls=${sitemapData.urlsPerFile || 500}`,
    "التحقق من sitemap النهائي داخل الأرشيف",
    {},
  );
  console.log(
    `  ✅ sitemap.xml ثابت — ${sitemapData.totalUrls} رابطًا`
    + (sitemapData.shardCount ? ` في ${sitemapData.shardCount} ملفات فرعية` : ""),
  );
}

// ── 8. كتابة بصمة البناء وتعليمات النشر ───────────────────────────────────────
// يجب أن تُستخرج محتويات هذا الأرشيف مباشرة إلى Document Root الفعلي للنطاق
// كما يظهر في hPanel، وليس إلى مجلد فرعي باسم build_php؛ لأن المسارات تعتمد على الجذر.
step("كتابة معلومات النسخة وتعليمات النشر");
{
  const sourceDb = new Database(join(ROOT, "data/sabaik.db"), { readonly: true });
  const tableCounts = {};
  for (const table of sourceDb
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()) {
    const safeTable = String(table.name).replaceAll('"', '""');
    tableCounts[table.name] = sourceDb.prepare(`SELECT COUNT(*) AS count FROM "${safeTable}"`).get().count;
  }
  sourceDb.close();
  writeFileSync(
    join(ROOT, "build_php/BUILD_INFO.json"),
    JSON.stringify({
      buildType: "full-hostinger-archive",
      builtAt: new Date().toISOString(),
      sourceDatabase: "data/sabaik.db",
      tableCounts,
      deployment: "Extract the archive contents directly into the domain's actual hPanel Document Root; public_html only if hPanel confirms it. Do not keep a build_php subfolder.",
    }, null, 2),
    "utf8",
  );
  writeFileSync(
    join(ROOT, "build_php/UPLOAD_INSTRUCTIONS.txt"),
    [
      "أرشيف PHP كامل من آخر نسخة حالية للمشروع؛ لا يحتاج Node.js على الاستضافة.",
      "",
      "طريقة النشر:",
      "1) تحقق في hPanel من Document Root الفعلي للنطاق الذي تنشر عليه؛ لا تفترض أن public_html هو الجذر.",
      "2) استخرج محتويات الأرشيف مباشرة في ذلك الجذر. استخدم public_html فقط إذا أكّد hPanel أنه Document Root لهذا النطاق.",
      "3) يجب أن تكون index.html و api/ و data/ و uploads/ مباشرة في جذر النطاق، لا داخل مجلد build_php.",
      "4) خذ نسخة احتياطية من قاعدة البيانات والوسائط الحالية قبل الاستبدال؛ هذا الأرشيف الكامل يستبدل الملفات ذات الأسماء نفسها.",
      "",
      "يشمل الأرشيف قاعدة البيانات وواجهة PHP والواجهة الرئيسية وCleanFlow Platform وجميع الأصول.",
    ].join("\n"),
    "utf8",
  );
  console.log(`  ✅ BUILD_INFO.json — ${tableCounts.posts ?? 0} مقالة و${tableCounts.container_system_records ?? 0} سجل باقات التنظيف`);
}

// ── 8. ضغط الأرشيف ───────────────────────────────────────────────────────────
step("تنظيف اسم العلامة القديمة من ملفات Hostinger");
{
  const siteDb = new Database(DEST_DB, { readonly: true });
  const siteNameRow = siteDb.prepare("SELECT value FROM site_settings WHERE key = 'company_name'").get();
  siteDb.close();
  const siteName = String(siteNameRow?.value || "").trim() || "الشركة";
  const siteBrandName = siteName.split(/[|｜]/u, 1)[0].trim() || siteName;
  const legacyPatterns = [
    [/مؤسسة\s+مؤسسة\s+السهم\s+كلين/gu, siteBrandName],
    [/مؤسسة\s+السهم\s+كلين/gu, siteBrandName],
    [/مؤسسة\s+السهم كلين\s+الماسة/gu, siteBrandName],
    [/شركة\s+السهم كلين\s+الماسة/gu, siteBrandName],
    [/السهم كلين\s+الماسة/gu, siteBrandName],
    [/السهم\s+كلين/gu, siteBrandName],
    [/منصة\s+باقات التنظيف/gu, siteBrandName],
  ];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const file = join(dir, entry);
      if (statSync(file).isDirectory()) walk(file);
      else if (/\.(html?|js|css|json|xml|txt|php|webmanifest)$/i.test(entry)) {
        const original = readFileSync(file, "utf8");
        const clean = legacyPatterns.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), original);
        if (clean !== original) writeFileSync(file, clean);
      }
    }
  };
  walk(join(ROOT, "build_php"));
  console.log(`  ✅ ملفات الأرشيف تستخدم اسم الإعدادات: ${siteName}`);
}

run(
  "pnpm --filter @workspace/scripts run seo:gate -- --scope=php",
  "تشغيل بوابة SEO على نسخة Hostinger النهائية",
  {},
);

step("ربط كل روابط الموقع بمضيف التشغيل بعد اجتياز بوابة SEO");
tokenizeStaticSiteFiles(join(ROOT, "build_php"));
const phpBuildDirectory = join(ROOT, "build_php");
const phpSitemapValidation = assertHostingerSitemapRuntime(phpBuildDirectory, buildSiteOrigin);
console.log(`  ✅ فُحصت إعادة كتابة PHP و${phpSitemapValidation.sitemapFiles.length} ملف/ملفات sitemap بعد تحويل الأصل إلى token`);

if (phpOnly) {
  const previousNodeArchive = join(ROOT, "generated-artifacts/node/cleanflow-services-node.zip");
  rmSync(previousNodeArchive, { force: true });
  console.log("  ℹ️ تم اختيار --php-only؛ لن تُبنى أو تُترك حزمة Node لهذا الإصدار.");
} else {
  run(
    "pnpm --filter @workspace/api-server run build",
    "بناء API لحزمة Node المستقلة",
    { NODE_ENV: "production" },
  );
  run(
    "node scripts/build-node-host.mjs",
    "إنشاء حزمة Node المتوافقة مع Hostinger Node Web Apps والاستضافات الأخرى",
    {},
  );
}

step("إنشاء أرشيف PHP كامل بعد اجتياز بوابة SEO");
const archiveDirectory = join(ROOT, "generated-artifacts", "php");
mkdirSync(archiveDirectory, { recursive: true });
const zipPath = join(archiveDirectory, "cleanflow-services-hostinger.zip");
const candidateZipPath = `${zipPath}.tmp`;
rmSync(candidateZipPath, { force: true });

if (process.platform === "win32") {
  const phpBuildGlob = `${join(ROOT, "build_php")}\\*`;
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${phpBuildGlob}' -DestinationPath '${candidateZipPath}' -Force"`, { cwd: ROOT, stdio: "inherit" });
  execSync(`powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; $archive = [System.IO.Compression.ZipFile]::OpenRead('${candidateZipPath}'); if ($archive.Entries.Count -eq 0) { throw 'Archive is empty' }; $archive.Dispose()"`, { cwd: ROOT, stdio: "inherit" });
} else {
  // اضغط محتوى build_php لا المجلد نفسه؛ Hostinger يفك الأرشيف مباشرة داخل
  // public_html، ولذلك يجب أن تكون index.html وapi/ وdata/ وuploads/ في الجذر.
  execSync(`cd build_php && zip -q -r '${candidateZipPath}' .`, { cwd: ROOT, stdio: "inherit" });
  execSync(`zip -T '${candidateZipPath}'`, { cwd: ROOT, stdio: "inherit" });
}

step("التحقق من مسارات sitemap داخل الأرشيف النهائي");
const extractedArchive = mkdtempSync(join(tmpdir(), "cleanflow-hostinger-archive-"));
try {
  if (process.platform === "win32") {
    const escapedArchive = candidateZipPath.replaceAll("'", "''");
    const escapedTarget = extractedArchive.replaceAll("'", "''");
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${escapedArchive}' -DestinationPath '${escapedTarget}' -Force"`,
      { cwd: ROOT, stdio: "inherit" },
    );
  } else {
    execFileSync("unzip", ["-q", candidateZipPath, "-d", extractedArchive], { cwd: ROOT, stdio: "inherit" });
  }
  const archivedSitemapValidation = assertHostingerSitemapRuntime(extractedArchive, buildSiteOrigin);
  console.log(`  ✅ الأرشيف المفكوك يوجّه sitemap عبر PHP ويحتوي ${archivedSitemapValidation.sitemapFiles.length} ملف/ملفات sitemap صالحة`);
} finally {
  rmSync(extractedArchive, { recursive: true, force: true });
}

if (process.platform === "win32" && existsSync(zipPath)) {
  const backupZipPath = `${zipPath}.previous`;
  rmSync(backupZipPath, { force: true });
  renameSync(zipPath, backupZipPath);
  try {
    renameSync(candidateZipPath, zipPath);
    rmSync(backupZipPath, { force: true });
  } catch (error) {
    if (!existsSync(zipPath) && existsSync(backupZipPath)) renameSync(backupZipPath, zipPath);
    throw error;
  }
} else {
  renameSync(candidateZipPath, zipPath);
}

if (existsSync(zipPath)) {
  const sizeKb = Math.round(statSync(zipPath).size / 1024);
  console.log(`\n${"═".repeat(60)}`);
  console.log(`✅ أرشيف PHP جاهز: generated-artifacts/php/cleanflow-services-hostinger.zip (${sizeKb} KB)`);
  console.log(`${"═".repeat(60)}\n`);
}
