#!/usr/bin/env node
/**
 * build-hostinger-update.mjs
 * ──────────────────────────
 * بناء ملفات الكود فقط لرفعها على Hostinger دون المساس بالصور وقاعدة البيانات.
 *
 * الملف الناتج في generated-artifacts/updates/sabaik-update.zip:
 *   assets/       ← JS/CSS المبنية من Vite
 *   index.html    ← صفحة HTML الرئيسية
 *   الصفحات المولدة/    ← صفحات SEO الثابتة بروابط assets متطابقة
 *   sw.js         ← Service Worker لإظهار الإشعارات وفتح الرابط الصحيح
 *   blog-route.php ← تحميل المقالات المنشورة بعد آخر بناء ثابت
 *   api/index.php ← ملف PHP المحدَّث
 *   .htaccess و api/.htaccess ← توجيه API وتمرير Authorization
 *
 * طريقة الرفع على Hostinger:
 *   1. استخرج الأرشيف
 *   2. ارفع جميع محتوياته إلى public_html/ مع دمج المجلدات واستبدال الملفات المتطابقة.
 *      يشمل ذلك مجلدات صفحات SEO المولدة مثل blog/ وpage/، وليس assets/ وapi/ فقط.
 *   3. لا تستخدم مزامنة تحذف ملفات أخرى غير موجودة في الأرشيف.
 *   (لا تلمس uploads/ ولا data/ ولا images/)
 */

import { execSync }                  from "child_process";
import { randomBytes }               from "crypto";
import { existsSync, mkdirSync, copyFileSync, rmSync, cpSync, writeFileSync, readdirSync, readFileSync } from "fs";
import { join, dirname, posix }      from "path";
import { fileURLToPath }             from "url";
import { copyHostingerApiRuntimeFromSource } from "./hostinger-api-runtime-files.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, "..");

function run(cmd, label) {
  console.log(`\n▶ ${label}`);
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

function step(label) {
  console.log(`\n${"─".repeat(60)}\n✦ ${label}`);
}

// ── 1. بناء الواجهة الأمامية ──────────────────────────────────────────────────
step("بناء الواجهة الأمامية (Vite)");
run(
  "PORT=19770 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/cleanflow-services run build",
  "vite build"
);
run(
  "node scripts/prerender.mjs",
  "تحديث الصفحات الثابتة بروابط assets الجديدة"
);

// ── 2. تجميع ملفات التحديث فقط في مجلد مؤقت ─────────────────────────────────
step("تجميع ملفات التحديث");
const STAGING = join(ROOT, "_update_staging");
rmSync(STAGING, { recursive: true, force: true });
mkdirSync(join(STAGING, "assets"),     { recursive: true });
mkdirSync(join(STAGING, "api"),        { recursive: true });

// أصول Vite
cpSync(
  join(ROOT, "artifacts/sabaik-almasa/dist/public/assets"),
  join(STAGING, "assets"),
  { recursive: true }
);
// Keep the exact asset URLs from the previous deployment available while
// caches expire. The new HTML still uses the freshly generated canonical names.
const compatibilityAliases = [
  ["index-ChILh_On.js", /^index-[^/]+\.js$/],
  ["index-DVBBl5cX.css", /^index-[^/]+\.css$/],
  ["index-BRF6LCBA.js", /^index-[^/]+\.js$/],
  ["index-80cL6Fpf.css", /^index-[^/]+\.css$/],
  ["index-XKmgbX4P.js", /^index-[^/]+\.js$/],
  ["index-CwjPgsoo.js", /^index-[^/]+\.js$/],
  ["index-DjNEGUy7.css", /^index-[^/]+\.css$/],
];
const stagedAssets = join(STAGING, "assets");
const currentAssets = readdirSync(stagedAssets);
for (const [legacyName, pattern] of compatibilityAliases) {
  const currentName = currentAssets.find((name) => pattern.test(name));
  if (currentName && currentName !== legacyName) {
    copyFileSync(join(stagedAssets, currentName), join(stagedAssets, legacyName));
  }
}
copyFileSync(
  join(ROOT, "artifacts/sabaik-almasa/dist/public/index.html"),
  join(STAGING, "index.html")
);
for (const publicFile of ["sw.js"]) {
  const source = join(ROOT, "artifacts/sabaik-almasa/public", publicFile);
  if (existsSync(source)) {
    copyFileSync(source, join(STAGING, publicFile));
  }
}
console.log("  ✅ assets/ و index.html وملفات الإشعارات");

// Include every prerendered page. A fixed route allowlist silently omitted
// generated directories such as cleaning-packages/ from code-only updates.
function copyHtmlPages(source, destination) {
  let copied = 0;
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const sourcePath = join(source, entry.name);
    const destinationPath = join(destination, entry.name);
    if (entry.isDirectory()) {
      copied += copyHtmlPages(sourcePath, destinationPath);
    } else if (entry.name.endsWith(".html")) {
      mkdirSync(dirname(destinationPath), { recursive: true });
      copyFileSync(sourcePath, destinationPath);
      copied += 1;
    }
  }
  return copied;
}

const FRONTEND_DIST = join(ROOT, "artifacts/sabaik-almasa/dist/public");
let copiedHtmlPages = 1; // index.html copied above
for (const entry of readdirSync(FRONTEND_DIST, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    if (["assets", "images", "uploads"].includes(entry.name)) continue;
    copiedHtmlPages += copyHtmlPages(
      join(FRONTEND_DIST, entry.name),
      join(STAGING, entry.name),
    );
  } else if (entry.name.endsWith(".html") && entry.name !== "index.html") {
    copyFileSync(join(FRONTEND_DIST, entry.name), join(STAGING, entry.name));
    copiedHtmlPages += 1;
  }
}

function collectFiles(directory, prefix = "") {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...collectFiles(join(directory, entry.name), relativePath));
    } else {
      files.push(relativePath);
    }
  }
  return files;
}

const expectedHtmlPages = collectFiles(FRONTEND_DIST).filter((path) => {
  if (!path.endsWith(".html")) return false;
  const topLevelDirectory = path.split("/")[0];
  return !["assets", "images", "uploads"].includes(topLevelDirectory);
});
const stagedFiles = collectFiles(STAGING);
const stagedFileSet = new Set(stagedFiles);
const missingHtmlPages = expectedHtmlPages.filter((path) => !stagedFileSet.has(path));
if (missingHtmlPages.length > 0 || expectedHtmlPages.length !== copiedHtmlPages) {
  throw new Error(
    `Static page copy mismatch: expected ${expectedHtmlPages.length}, copied ${copiedHtmlPages}; `
    + `missing: ${missingHtmlPages.slice(0, 10).join(", ") || "count mismatch"}`,
  );
}

function resolveAssetsPath(reference, ownerPath) {
  const value = reference.trim().replaceAll("&amp;", "&");
  if (
    !value
    || /^(?:data:|https?:|\/\/|mailto:|tel:|javascript:|blob:|#)/iu.test(value)
  ) {
    return null;
  }
  let pathname = value.split(/[?#]/u, 1)[0];
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    // Leave malformed escapes untouched so the resulting path fails clearly.
  }
  const resolved = pathname.startsWith("/")
    ? posix.normalize(pathname.slice(1))
    : posix.normalize(posix.join(posix.dirname(ownerPath), pathname));
  return resolved === "assets" || resolved.startsWith("assets/")
    ? resolved
    : null;
}

const missingAssetReferences = [];
let checkedAssetReferences = 0;
for (const path of stagedFiles) {
  if (!path.endsWith(".html") && !path.endsWith(".css")) continue;
  const source = readFileSync(join(STAGING, path), "utf8");
  const references = path.endsWith(".css")
    ? [...source.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/giu)].map((match) => match[2])
    : [...source.matchAll(/\b(?:src|href|poster|srcset|data-src|data-srcset)\s*=\s*(["'])(.*?)\1/giu)]
      .flatMap((match) => match[2].split(/\s*,\s*/u).map((item) => item.trim().split(/\s+/u)[0]));

  for (const reference of references) {
    const assetPath = resolveAssetsPath(reference, path);
    if (!assetPath) continue;
    checkedAssetReferences += 1;
    if (!stagedFileSet.has(assetPath)) {
      missingAssetReferences.push(`${path} -> ${assetPath}`);
    }
  }
}
if (missingAssetReferences.length > 0) {
  throw new Error(
    `Missing local assets referenced by HTML/CSS: ${missingAssetReferences.slice(0, 10).join("; ")}`,
  );
}
console.log(
  `  ✅ ${copiedHtmlPages} صفحة HTML ثابتة، وجميع ${checkedAssetReferences} إحالات assets/ موجودة`,
);

// ملف PHP — نحتفظ بمفتاح الحزمة السابقة حتى تبقى كلمة مرور FTP المحفوظة
// قابلة للفك بعد رفع باتش جديد.
const apiTemplatePath = join(ROOT, "scripts/api-index.php");
const previousApiPath = join(ROOT, "build_php/api/index.php");
const previousApi = existsSync(previousApiPath) ? readFileSync(previousApiPath, "utf8") : "";
const previousSecret = previousApi.match(/SESSION_SECRET'\)\s*\?:\s*'([0-9a-f]{64})'/)?.[1] || randomBytes(32).toString("hex");
const apiSource = readFileSync(apiTemplatePath, "utf8").replaceAll("__HOSTINGER_TOKEN_SECRET__", previousSecret);
writeFileSync(join(STAGING, "api/index.php"), apiSource, "utf8");
const apiRuntimeFiles = copyHostingerApiRuntimeFromSource(ROOT, join(STAGING, "api"));
copyFileSync(
  join(ROOT, "scripts/blog-route.php"),
  join(STAGING, "blog-route.php")
);
console.log("  ✅ api/index.php");
console.log(`  ✅ ملفات API المساعدة: ${apiRuntimeFiles.join(", ")}`);
console.log("  ✅ blog-route.php للمقالات المنشورة بعد بناء الصفحات الثابتة");

// ملفات Apache الضرورية لمسارات API وتمرير Authorization في Hostinger
for (const htaccess of [
  ["build_php/.htaccess", ".htaccess"],
  ["build_php/api/.htaccess", "api/.htaccess"],
]) {
  const [source, destination] = htaccess;
  if (existsSync(join(ROOT, source))) {
    copyFileSync(join(ROOT, source), join(STAGING, destination));
  }
}
console.log("  ✅ .htaccess و api/.htaccess");

// تعليمات رفع بسيطة
writeFileSync(join(STAGING, "UPLOAD_INSTRUCTIONS.txt"), [
  "═══════════════════════════════════════════",
  "  تعليمات الرفع على Hostinger",
  "═══════════════════════════════════════════",
  "",
  "استخرج الأرشيف وارفع جميع محتوياته إلى public_html/ مع الحفاظ على بنية المجلدات.",
  "ادمج المجلدات واستبدل الملفات التي لها الاسم نفسه فقط؛ لا تستخدم مزامنة تحذف ملفات أخرى.",
  "ارفع مجلدات صفحات SEO المولدة مثل blog/ وpage/ وبقية مسارات الصفحات الموجودة في الأرشيف.",
  "ويشمل ذلك assets/ وindex.html وsw.js وblog-route.php ومجلد api/ وملفي .htaccess.",
  "ارفع جميع ملفات api/ كما هي؛ لا تستبدل api/index.php وحده، فالملف يعتمد على ملفات PHP وJSON المساعدة الموجودة بجواره.",
  "",
  "⚠️  لا تلمس:",
  "  • data/sabaik.db   (قاعدة البيانات)",
  "  • uploads/         (الصور المرفوعة)",
  "  • images/          (صور الموقع الحالية)",
  "",
  "═══════════════════════════════════════════",
].join("\n"), "utf-8");

// ── 3. ضغط الأرشيف (من داخل مجلد التجميع فقط) ────────────────────────────────
const OUTPUT_DIR = join(ROOT, "generated-artifacts", "updates");
mkdirSync(OUTPUT_DIR, { recursive: true });
step("إنشاء أرشيف التحديث generated-artifacts/updates/sabaik-update.zip");
const ZIP_PATH = join(OUTPUT_DIR, "sabaik-update.zip");
rmSync(ZIP_PATH, { force: true });
// نضغط من داخل مجلد _update_staging كي يكون مسار الملفات نظيفاً
execSync(`zip -r "${ZIP_PATH}" .`, { cwd: STAGING, stdio: "inherit" });

// تنظيف
rmSync(STAGING, { recursive: true, force: true });

const sizeKb = Math.round(
  parseInt(execSync(`du -sb "${ZIP_PATH}"`, { cwd: ROOT }).toString()) / 1024
);
console.log(`\n${"═".repeat(60)}`);
console.log(`✅ جاهز: generated-artifacts/updates/sabaik-update.zip (${sizeKb} KB)`);
console.log(`   يحتوي على: assets/ + صفحات HTML + sw.js + ملفات API المطلوبة`);
console.log(`   لا يحتوي على: قاعدة البيانات أو uploads/ أو الصور النقطية`);
console.log(`${"═".repeat(60)}\n`);
