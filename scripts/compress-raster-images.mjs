#!/usr/bin/env node
/**
 * Re-encode raster assets in place while preserving their filenames and paths.
 * SVG files are intentionally excluded because they are vector assets.
 */

import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, lstatSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const IMAGE_ROOTS = [
  join(ROOT, "artifacts/sabaik-almasa/public"),
  join(ROOT, "artifacts/api-server/uploads"),
];
const RASTER_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

function walk(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else if (entry.isFile() && RASTER_EXTENSIONS.has(extname(entry.name).toLowerCase())) files.push(fullPath);
  }
  return files;
}

function argsFor(file, output) {
  const ext = extname(file).toLowerCase();
  const common = [file, "-strip"];
  if (ext === ".jpg" || ext === ".jpeg") {
    return [...common, "-interlace", "Plane", "-sampling-factor", "4:2:0", "-quality", "82", output];
  }
  if (ext === ".png") {
    return [...common, "-define", "png:compression-level=9", "-define", "png:compression-filter=5", "-define", "png:compression-strategy=1", output];
  }
  if (ext === ".webp") {
    return [...common, "-quality", "82", "-define", "webp:method=6", output];
  }
  if (ext === ".avif") {
    return [...common, "-quality", "65", output];
  }
  return [...common, "-layers", "Optimize", output];
}

let totalBefore = 0;
let totalAfter = 0;
let replaced = 0;
let saved = 0;
let failed = 0;

for (const root of IMAGE_ROOTS) {
  const files = walk(root);
  for (const file of files) {
    const before = statSync(file).size;
    const mode = lstatSync(file).mode;
    // Keep the temporary file next to the source. Renaming across /tmp and
    // the workspace can fail with EXDEV in the Replit filesystem.
    const output = join(dirname(file), `.${basename(file)}.compressed-${process.pid}-${replaced}`);
    try {
      execFileSync("magick", argsFor(file, output), { stdio: "ignore" });
      const after = statSync(output).size;
      if (!after) throw new Error("empty output");

      renameSync(output, file);
      chmodSync(file, mode);
      totalBefore += before;
      totalAfter += after;
      replaced += 1;
      if (after < before) saved += before - after;
    } catch (error) {
      failed += 1;
      console.error(`Failed: ${relative(ROOT, file)} — ${error.message}`);
      rmSync(output, { force: true });
    }
  }
}

const percent = totalBefore ? ((1 - totalAfter / totalBefore) * 100).toFixed(1) : "0.0";
console.log(`Compressed ${replaced} raster images.`);
console.log(`Before: ${(totalBefore / 1024 / 1024).toFixed(2)} MB`);
console.log(`After:  ${(totalAfter / 1024 / 1024).toFixed(2)} MB`);
console.log(`Saved:  ${(saved / 1024 / 1024).toFixed(2)} MB (${percent}%)`);
if (failed) {
  console.error(`Failed files: ${failed}`);
  process.exitCode = 1;
}