#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SEO_PAGE_REDIRECTS } from "./seo-page-policy.mjs";
import { LEGACY_PACKAGE_ROUTE_REDIRECTS, LEGACY_STATIC_ROUTE_REDIRECTS } from "./package-route-policy.mjs";
import {
  parseSiteOriginAliases,
  resolveBuildSiteOrigin,
  tokenizeSiteOrigins,
} from "./site-origin.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "lib/db/package.json"));
const Database = require("better-sqlite3");
const OUTPUT_DIR = join(ROOT, "generated-artifacts", "node");
const PACKAGE_DIR = join(OUTPUT_DIR, "cleanflow-services-node");
const ZIP_PATH = join(OUTPUT_DIR, "cleanflow-services-node.zip");
const CANDIDATE_ZIP_PATH = `${ZIP_PATH}.tmp`;
const PHP_BUILD_ROOT = join(ROOT, "build_php");
const API_PACKAGE_PATH = join(ROOT, "artifacts/api-server/package.json");
const API_DIST = join(ROOT, "artifacts/api-server/dist");
const FRONTEND_DIST = join(ROOT, "artifacts/sabaik-almasa/dist/public");
const PLATFORM_DIST = join(ROOT, "artifacts/sabaik-platform/dist/public");
const SOURCE_PUBLIC = join(ROOT, "artifacts/sabaik-almasa/public");
const buildSiteOrigin = resolveBuildSiteOrigin();
const API_PACKAGE_ROOT = join(PACKAGE_DIR, "artifacts/api-server");
const NODE_FRONTEND_DIST = join(PACKAGE_DIR, "public");
const NODE_PUBLIC_DIR = join(PACKAGE_DIR, "artifacts/sabaik-almasa/public");

function ensureInput(path, description) {
  if (!existsSync(path)) {
    throw new Error(`Missing ${description}: ${path}. Run the full Hostinger build first.`);
  }
}

for (const [path, description] of [
  [join(API_DIST, "index.mjs"), "compiled Node API"],
  [join(FRONTEND_DIST, "index.html"), "built and prerendered frontend"],
  [join(PLATFORM_DIST, "index.html"), "built CleanFlow Platform"],
  [join(ROOT, "data/sabaik.db"), "source SQLite database"],
  [join(SOURCE_PUBLIC, "sitemap.xml"), "generated sitemap"],
]) {
  ensureInput(path, description);
}

rmSync(PACKAGE_DIR, { recursive: true, force: true });
rmSync(CANDIDATE_ZIP_PATH, { force: true });
mkdirSync(PACKAGE_DIR, { recursive: true });

mkdirSync(API_PACKAGE_ROOT, { recursive: true });
mkdirSync(dirname(NODE_FRONTEND_DIST), { recursive: true });
cpSync(API_DIST, join(API_PACKAGE_ROOT, "dist"), { recursive: true });
cpSync(FRONTEND_DIST, NODE_FRONTEND_DIST, { recursive: true });
cpSync(
  PLATFORM_DIST,
  join(NODE_FRONTEND_DIST, "cleanflow-platform"),
  { recursive: true },
);
mkdirSync(NODE_PUBLIC_DIR, { recursive: true });
for (const file of ["sitemap.xml", "llms.txt"]) {
  const source = join(SOURCE_PUBLIC, file);
  if (existsSync(source)) copyFileSync(source, join(NODE_PUBLIC_DIR, file));
}

const nodeDatabasePath = join(PACKAGE_DIR, "data/sabaik.db");
mkdirSync(dirname(nodeDatabasePath), { recursive: true });
const sourceDatabase = new Database(join(ROOT, "data/sabaik.db"), { readonly: true });
try {
  await sourceDatabase.backup(nodeDatabasePath);
} finally {
  sourceDatabase.close();
}

function mergeMissingFiles(source, destination) {
  if (!existsSync(source)) return;
  mkdirSync(destination, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const sourcePath = join(source, entry.name);
    const destinationPath = join(destination, entry.name);
    if (entry.isDirectory()) {
      mergeMissingFiles(sourcePath, destinationPath);
    } else if (!existsSync(destinationPath)) {
      copyFileSync(sourcePath, destinationPath);
    }
  }
}

const uploadTarget = join(API_PACKAGE_ROOT, "uploads");
let uploadDirectories = 0;
for (const source of [
  join(ROOT, "build_php/uploads"),
  join(ROOT, "artifacts/api-server/uploads"),
  join(ROOT, "uploads"),
  join(ROOT, "artifacts/sabaik-almasa/public/uploads"),
]) {
  if (!existsSync(source)) continue;
  mergeMissingFiles(source, uploadTarget);
  uploadDirectories += 1;
}

const workspaceYaml = readFileSync(join(ROOT, "pnpm-workspace.yaml"), "utf8");
const apiPackage = JSON.parse(readFileSync(API_PACKAGE_PATH, "utf8"));
const catalog = new Map();
let inCatalog = false;
for (const line of workspaceYaml.split(/\r?\n/u)) {
  if (line === "catalog:") {
    inCatalog = true;
    continue;
  }
  if (inCatalog && line.trim() !== "" && !/^\s/u.test(line)) break;
  if (!inCatalog) continue;
  const match = line.match(/^\s+(?:'([^']+)'|"([^"]+)"|([^:\s]+)):\s*(.*?)\s*$/u);
  if (!match) continue;
  const name = match[1] || match[2] || match[3];
  const version = match[4].replace(/^['"]|['"]$/gu, "");
  catalog.set(name, version);
}

const dependencies = Object.fromEntries(
  Object.entries(apiPackage.dependencies)
    .filter(([name]) => !name.startsWith("@workspace/") && !name.startsWith("@types/"))
    .map(([name, version]) => {
      if (version !== "catalog:") return [name, version];
      const resolvedVersion = catalog.get(name);
      if (!resolvedVersion) throw new Error(`Could not resolve catalog dependency "${name}".`);
      return [name, resolvedVersion];
    }),
);

const nodeManifest = {
  name: "cleanflow-services-node",
  version: "1.0.0",
  private: true,
  description: "CleanFlow Services production server and prerendered frontend",
  type: "module",
  main: "server.mjs",
  engines: { node: "22.x" },
  scripts: { start: "node server.mjs" },
  dependencies,
};
writeFileSync(
  join(PACKAGE_DIR, "package.json"),
  `${JSON.stringify(nodeManifest, null, 2)}\n`,
  "utf8",
);

const serverSource = [
  'import { randomBytes } from "node:crypto";',
  'import { mkdirSync, readFileSync, writeFileSync } from "node:fs";',
  'import path from "node:path";',
  'import { fileURLToPath } from "node:url";',
  "",
  'const packageRoot = path.dirname(fileURLToPath(import.meta.url));',
  'const apiRoot = path.join(packageRoot, "artifacts/api-server");',
  'const frontendDistDir = path.join(packageRoot, "public");',
  'const publicDir = path.join(packageRoot, "artifacts/sabaik-almasa/public");',
  'const secretFile = path.join(packageRoot, ".runtime/session-secret");',
  "",
  "function getOrCreateSessionSecret() {",
  '  if (process.env.SESSION_SECRET?.trim()) return process.env.SESSION_SECRET;',
  '  mkdirSync(path.dirname(secretFile), { recursive: true, mode: 0o700 });',
  "  try {",
  '    const savedSecret = readFileSync(secretFile, "utf8").trim();',
  '    if (savedSecret.length >= 64) return savedSecret;',
  "  } catch (error) {",
  '    if (error?.code !== "ENOENT") throw error;',
  "  }",
  '  const generatedSecret = randomBytes(48).toString("hex");',
  "  try {",
  '    writeFileSync(secretFile, generatedSecret, { encoding: "utf8", flag: "wx", mode: 0o600 });',
  "    return generatedSecret;",
  "  } catch (error) {",
  '    if (error?.code !== "EEXIST") throw error;',
  '    return readFileSync(secretFile, "utf8").trim();',
  "  }",
  "}",
  "",
  'process.env.NODE_ENV ||= "production";',
  'process.env.PORT ||= "3000";',
  'process.env.DB_PATH ||= path.join(packageRoot, "data/sabaik.db");',
  'process.env.CLEANFLOW_PUBLIC_DIR ||= publicDir;',
  'process.env.CLEANFLOW_FRONTEND_DIST_DIR ||= frontendDistDir;',
  `process.env.CLEANFLOW_SEO_PAGE_REDIRECTS ||= ${JSON.stringify(JSON.stringify(SEO_PAGE_REDIRECTS))};`,
  `process.env.CLEANFLOW_LEGACY_PATH_REDIRECTS ||= ${JSON.stringify(JSON.stringify([...LEGACY_PACKAGE_ROUTE_REDIRECTS, ...LEGACY_STATIC_ROUTE_REDIRECTS].map(({ fromPath, toPath }) => ({ fromPath, toPath }))))};`,
  "process.env.SESSION_SECRET = getOrCreateSessionSecret();",
  "process.chdir(apiRoot);",
  'await import("./artifacts/api-server/dist/index.mjs");',
  "",
].join("\n");
writeFileSync(join(PACKAGE_DIR, "server.mjs"), serverSource, "utf8");

const deployGuide = [
  "CleanFlow Services — حزمة Node.js",
  "",
  "Hostinger Node.js Web Apps (خطة Business/Cloud المؤهلة):",
  "1) من hPanel اختر Websites > Create Website > Web App > Upload your website files.",
  "2) ارفع cleanflow-services-node.zip في معالج Web App، وليس داخل File Manager لاستضافة PHP.",
  "3) دع Hostinger يكتشف package.json. عند طلب الإعدادات: Node.js 22، Root directory /، Entry file server.mjs، Package manager npm، واترك Build/Output directory فارغين.",
  "4) اضغط Deploy؛ سيُثبّت hPanel الاعتماديات من package.json ثم يشغّل npm start.",
  "",
  "أي استضافة Node عامة:",
  "1) ارفع ZIP وفكّه في مجلد التطبيق.",
  "2) شغّل npm install ثم npm start، أو عيّن أمر التشغيل npm start من لوحة الاستضافة.",
  "3) يجب أن توفّر الاستضافة متغير PORT وأن تسمح بكتابة مستمرة إلى data/ وartifacts/api-server/uploads/ و.runtime/.",
  "",
  "الأمان والبيانات:",
  "- لا يحتوي الأرشيف على أسرار Replit أو ملف .env.",
  "- إذا لم يُضبط SESSION_SECRET في لوحة الاستضافة، ينشئ server.mjs سراً عشوائياً ويحفظه في .runtime/session-secret؛ احتفظ بهذا الملف بين عمليات النشر.",
  "- يحتوي data/sabaik.db على لقطة قاعدة البيانات الحالية. اختبر على نطاق/مجلد منفصل، وخذ نسخة احتياطية قبل استبدال قاعدة بيانات قائمة.",
  "- إذا كانت قاعدة البيانات تحتوي على كلمة مرور FTP مشفّرة من تثبيت سابق، أعد إدخالها من لوحة الإعدادات إذا تعذّر فكها بعد تغيير SESSION_SECRET.",
  "",
  "ملاحظة: حزمة PHP العادية لهوستنجر مختلفة ولا تستخدم package.json لتشغيل Node.",
].join("\n");
writeFileSync(join(PACKAGE_DIR, "HOSTINGER_NODE_DEPLOY.txt"), `${deployGuide}\n`, "utf8");
writeFileSync(join(PACKAGE_DIR, "Procfile"), "web: npm start\n", "utf8");

function walkFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });
}

// PHP applies a final, settings-aware brand normalization to all packaged
// HTML. Copy those exact HTML files into Node so the two hosting modes cannot
// advertise different rendered content or JSON-LD.
const phpHtmlFiles = walkFiles(PHP_BUILD_ROOT).filter((file) => /\.html?$/i.test(file));
if (!phpHtmlFiles.length) {
  throw new Error("PHP release HTML is missing; run the full Hostinger build first.");
}
for (const source of phpHtmlFiles) {
  const relative = source.slice(PHP_BUILD_ROOT.length).replace(/^[/\\]+/u, "");
  const destination = join(NODE_FRONTEND_DIST, relative);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination);
}

// The PHP tree may contain older static pages that reference hashed assets
// from its previous frontend build. Preserve those exact pages in Node by
// copying only their still-referenced assets when the current build lacks them.
for (const source of phpHtmlFiles) {
  const html = readFileSync(source, "utf8");
  for (const [, assetPath] of html.matchAll(
    /(?:src|href)="\/((?:assets|cleanflow-platform\/assets)\/[^"]+)"/gu,
  )) {
    const destination = join(NODE_FRONTEND_DIST, assetPath);
    if (existsSync(destination)) continue;
    const phpAsset = join(PHP_BUILD_ROOT, assetPath);
    if (!existsSync(phpAsset)) continue;
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(phpAsset, destination);
  }
}

const buildInfo = {
  buildType: "node-host-archive",
  builtAt: new Date().toISOString(),
  runtime: "Node.js 22",
  startCommand: "npm start",
  entryFile: "server.mjs",
  database: "data/sabaik.db",
  frontendDirectory: "public",
  uploadDirectories,
};

function tokenizeStaticSiteFiles(directory, origins) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) {
      tokenizeStaticSiteFiles(target, origins);
    } else if (entry.isFile() && /\.(?:html|xml|txt)$/iu.test(entry.name)) {
      const original = readFileSync(target, "utf8");
      const tokenized = tokenizeSiteOrigins(original, origins);
      if (tokenized !== original) writeFileSync(target, tokenized, "utf8");
    }
  }
}

const legacySiteOrigins = [];
{
  const sourceDb = new Database(join(ROOT, "data/sabaik.db"), { readonly: true, fileMustExist: true });
  try {
    const rows = sourceDb.prepare(
      "SELECT key, value FROM site_settings WHERE key IN ('site_public_url', 'site_public_url_aliases')",
    ).all();
    const settings = Object.fromEntries(rows.map(row => [row.key, row.value]));
    legacySiteOrigins.push(
      settings.site_public_url,
      ...parseSiteOriginAliases(settings.site_public_url_aliases),
    );
  } finally {
    sourceDb.close();
  }
}
tokenizeStaticSiteFiles(PACKAGE_DIR, [buildSiteOrigin, ...legacySiteOrigins]);
console.log("Tokenized build and legacy site origins in Node-host static output.");

writeFileSync(
  join(PACKAGE_DIR, "BUILD_INFO.json"),
  `${JSON.stringify(buildInfo, null, 2)}\n`,
  "utf8",
);

for (const required of [
  "package.json",
  "server.mjs",
  "Procfile",
  "HOSTINGER_NODE_DEPLOY.txt",
  "artifacts/api-server/dist/index.mjs",
  "public/index.html",
  "public/cleanflow-platform/index.html",
  "artifacts/sabaik-almasa/public/sitemap.xml",
  "data/sabaik.db",
]) {
  if (!existsSync(join(PACKAGE_DIR, required))) {
    throw new Error(`Node package is missing required file: ${required}`);
  }
}

const nodeFrontendHtml = readFileSync(join(NODE_FRONTEND_DIST, "index.html"), "utf8");
for (const [, assetPath] of nodeFrontendHtml.matchAll(/(?:src|href)="\/(assets\/[^"]+)"/gu)) {
  if (!existsSync(join(NODE_FRONTEND_DIST, assetPath))) {
    throw new Error(`Node package is missing frontend asset: public/${assetPath}`);
  }
}

const stagingDatabase = new Database(join(PACKAGE_DIR, "data/sabaik.db"), { readonly: true });
try {
  const result = stagingDatabase.pragma("integrity_check", { simple: true });
  if (result !== "ok") throw new Error(`Node package SQLite integrity check failed: ${result}`);
} finally {
  stagingDatabase.close();
}

execFileSync("pnpm", [
  "--filter",
  "@workspace/scripts",
  "run",
  "seo:gate",
  "--",
  "--scope=both",
], {
  cwd: ROOT,
  stdio: "inherit",
});

execFileSync("zip", ["-q", "-r", CANDIDATE_ZIP_PATH, "."], {
  cwd: PACKAGE_DIR,
  stdio: "inherit",
});
execFileSync("zip", ["-T", CANDIDATE_ZIP_PATH], { stdio: "inherit" });
renameSync(CANDIDATE_ZIP_PATH, ZIP_PATH);

console.log(
  `Node package ready: generated-artifacts/node/cleanflow-services-node.zip `
  + `(${Math.round(statSync(ZIP_PATH).size / 1024)} KB; `
  + `${Object.keys(dependencies).length} runtime dependencies; `
  + `${uploadDirectories} upload sources).`,
);
