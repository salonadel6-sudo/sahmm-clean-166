#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UPDATE_DIR = join(ROOT, "generated-artifacts", "updates");
const STAGING_DIR = join(UPDATE_DIR, "cleanflow-node-update-staging");
const OUTPUT_PATH = join(UPDATE_DIR, "cleanflow-node-update.zip");
const API_DIST = join(ROOT, "artifacts", "api-server", "dist");
const FRONTEND_DIST = join(ROOT, "artifacts", "sabaik-almasa", "dist", "public");

execFileSync("pnpm", ["--filter", "@workspace/cleanflow-services", "run", "build"], {
  cwd: ROOT,
  stdio: "inherit",
  env: { ...process.env, PORT: "19770", BASE_PATH: "/", NODE_ENV: "production" },
});
execFileSync("node", ["scripts/prerender.mjs"], {
  cwd: ROOT,
  stdio: "inherit",
});

execFileSync("pnpm", ["--filter", "@workspace/api-server", "run", "build"], {
  cwd: ROOT,
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production" },
});

if (!existsSync(join(API_DIST, "index.mjs"))) {
  throw new Error("The Node API build did not produce dist/index.mjs.");
}
if (!existsSync(join(FRONTEND_DIST, "index.html"))) {
  throw new Error("The frontend build did not produce dist/public/index.html.");
}

mkdirSync(UPDATE_DIR, { recursive: true });
rmSync(STAGING_DIR, { recursive: true, force: true });
rmSync(OUTPUT_PATH, { force: true });

const stagedDist = join(STAGING_DIR, "artifacts", "api-server", "dist");
mkdirSync(dirname(stagedDist), { recursive: true });
cpSync(API_DIST, stagedDist, { recursive: true });

const stagedPublic = join(STAGING_DIR, "public");
mkdirSync(stagedPublic, { recursive: true });

function copyCodeAssets(source, destination) {
  mkdirSync(destination, { recursive: true });
  for (const entry of readDirEntries(source)) {
    const sourcePath = join(source, entry.name);
    const destinationPath = join(destination, entry.name);
    if (entry.isDirectory()) {
      copyCodeAssets(sourcePath, destinationPath);
    } else if (/\.(?:js|css|woff2?|ttf|otf)$/iu.test(entry.name)) {
      cpSync(sourcePath, destinationPath);
    }
  }
}

function copyHtmlPages(source, destination) {
  mkdirSync(destination, { recursive: true });
  for (const entry of readDirEntries(source)) {
    const sourcePath = join(source, entry.name);
    const destinationPath = join(destination, entry.name);
    if (entry.isDirectory()) {
      copyHtmlPages(sourcePath, destinationPath);
    } else if (entry.name.endsWith(".html")) {
      cpSync(sourcePath, destinationPath);
    }
  }
}

function readDirEntries(directory) {
  return readdirSync(directory, { withFileTypes: true });
}

cpSync(join(FRONTEND_DIST, "index.html"), join(stagedPublic, "index.html"));
const assetSource = join(FRONTEND_DIST, "assets");
if (!existsSync(assetSource)) throw new Error("The frontend build is missing its assets directory.");
copyCodeAssets(assetSource, join(stagedPublic, "assets"));
for (const entry of readDirEntries(FRONTEND_DIST)) {
  if (entry.isDirectory()) {
    if (["assets", "images", "uploads"].includes(entry.name)) continue;
    copyHtmlPages(join(FRONTEND_DIST, entry.name), join(stagedPublic, entry.name));
  } else if (entry.name.endsWith(".html") && entry.name !== "index.html") {
    cpSync(join(FRONTEND_DIST, entry.name), join(stagedPublic, entry.name));
  }
}

function collectFiles(directory, prefix = "") {
  const files = [];
  for (const entry of readDirEntries(directory)) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...collectFiles(join(directory, entry.name), relativePath));
    } else {
      files.push(relativePath);
    }
  }
  return files;
}

const frontendFiles = collectFiles(FRONTEND_DIST);
const expectedHtmlPages = frontendFiles.filter((path) => {
  if (!path.endsWith(".html")) return false;
  return !["assets", "images", "uploads"].includes(path.split("/")[0]);
});
const stagedPublicFiles = collectFiles(stagedPublic);
const stagedPublicFileSet = new Set(stagedPublicFiles);
const missingHtmlPages = expectedHtmlPages.filter((path) => !stagedPublicFileSet.has(path));
if (missingHtmlPages.length > 0) {
  throw new Error(
    `The Node update is missing generated HTML pages: ${missingHtmlPages.slice(0, 10).join(", ")}`,
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
for (const path of stagedPublicFiles) {
  if (!path.endsWith(".html") && !path.endsWith(".css")) continue;
  const source = readFileSync(join(stagedPublic, path), "utf8");
  const references = path.endsWith(".css")
    ? [...source.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/giu)].map((match) => match[2])
    : [...source.matchAll(/\b(?:src|href|poster|srcset|data-src|data-srcset)\s*=\s*(["'])(.*?)\1/giu)]
      .flatMap((match) => match[2].split(/\s*,\s*/u).map((item) => item.trim().split(/\s+/u)[0]));

  for (const reference of references) {
    const assetPath = resolveAssetsPath(reference, path);
    if (!assetPath) continue;
    checkedAssetReferences += 1;
    if (!stagedPublicFileSet.has(assetPath)) {
      missingAssetReferences.push(`${path} -> ${assetPath}`);
    }
  }
}
if (missingAssetReferences.length > 0) {
  throw new Error(
    `The Node update has missing HTML/CSS asset references: ${missingAssetReferences.slice(0, 10).join("; ")}`,
  );
}

writeFileSync(
  join(STAGING_DIR, "NODE_UPDATE.txt"),
  [
    "CleanFlow Services — Node.js code update",
    "",
    "Apply this archive only to an existing CleanFlow Services Node deployment.",
    "Extract its contents into the application's root. Replace the matching",
    "artifacts/api-server/dist/ files and update public/index.html, public/assets/",
    "and the included public page folders, then restart the Node application.",
    "",
    "This update contains compiled application code and generated HTML pages only.",
    "It does not contain the database, uploads, site photos, .env files, or session",
    "secrets. Do not apply it to the PHP-only Hostinger deployment.",
    "",
    "Keep a backup of the existing API dist and public directories before updating.",
  ].join("\n") + "\n",
  "utf8",
);

execFileSync("zip", ["-q", "-r", OUTPUT_PATH, "."], {
  cwd: STAGING_DIR,
  stdio: "inherit",
});
execFileSync("zip", ["-T", OUTPUT_PATH], { stdio: "inherit" });

const entries = execFileSync("unzip", ["-Z1", OUTPUT_PATH], { encoding: "utf8" })
  .split(/\r?\n/u)
  .filter(Boolean);
if (
  !entries.includes("artifacts/api-server/dist/index.mjs")
  || !entries.includes("public/index.html")
  || !entries.some(entry => /^public\/assets\/SEOPanel-[^/]+\.js$/u.test(entry))
) {
  throw new Error("The Node update archive is missing an API or SEO frontend entry point.");
}
if (entries.some(entry => /^(?:data|uploads|public\/images)\/|(?:^|\/)sabaik\.db$/u.test(entry))) {
  throw new Error("Refusing to create a Node update containing database or image uploads.");
}
if (entries.some(entry => /\.(?:png|jpe?g|webp|gif|avif)$/iu.test(entry))) {
  throw new Error("Refusing to create a Node code update containing raster images.");
}

rmSync(STAGING_DIR, { recursive: true, force: true });
const archiveFileCount = entries.filter(entry => !entry.endsWith("/")).length;
console.log(
  `Node update ready: generated-artifacts/updates/cleanflow-node-update.zip `
  + `(${Math.round(statSync(OUTPUT_PATH).size / 1024)} KB; ${archiveFileCount} files; `
  + `${expectedHtmlPages.length} HTML pages; ${checkedAssetReferences} verified assets/ references; `
  + "API and SEO UI included; no database, uploads, or raster images).",
);
