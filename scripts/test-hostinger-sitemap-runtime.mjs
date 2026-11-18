import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertHostingerSitemapRuntime } from "./hostinger-sitemap-runtime.mjs";
import { SITE_ORIGIN_TOKEN } from "./site-origin.mjs";

const workspaceRoot = fileURLToPath(new URL("../", import.meta.url));
const fixture = mkdtempSync(join(tmpdir(), "cleanflow-sitemap-runtime-"));
const archive = join(tmpdir(), `${fixture.split(/[\\/]/u).at(-1)}.zip`);
const apiDirectory = join(fixture, "api");
mkdirSync(apiDirectory, { recursive: true });

const rootSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${SITE_ORIGIN_TOKEN}/sitemap1.xml</loc></sitemap>
</sitemapindex>`;
const childSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_ORIGIN_TOKEN}/page/runtime-check</loc></url>
</urlset>`;
const rewrite = `RewriteEngine On
RewriteRule ^sitemap(?:[1-9]\\d*)?\\.xml$ site-response.php [END]
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteRule ^ - [L]
`;

try {
  writeFileSync(join(fixture, ".htaccess"), rewrite);
  writeFileSync(join(fixture, "sitemap.xml"), rootSitemap);
  writeFileSync(join(fixture, "sitemap1.xml"), childSitemap);
  for (const destination of [
    join(fixture, "site-response.php"),
    join(fixture, "site-origin-runtime.php"),
    join(apiDirectory, "site-origin-runtime.php"),
  ]) {
    const sourceName = destination.endsWith("site-response.php")
      ? "site-response.php"
      : "site-origin-runtime.php";
    writeFileSync(destination, readFileSync(join(workspaceRoot, "scripts", sourceName)));
  }

  const report = assertHostingerSitemapRuntime(fixture, "https://runtime.example");
  assert.deepEqual(report.sitemapFiles, ["sitemap.xml", "sitemap1.xml"]);

  const phpResponse = execFileSync("php", [
    "-r",
    "$_SERVER['REQUEST_METHOD']='GET'; $_SERVER['REQUEST_URI']='/sitemap.xml'; $_SERVER['HTTP_HOST']='runtime.example'; $_SERVER['HTTPS']='on'; require 'site-response.php';",
  ], { cwd: fixture, encoding: "utf8" });
  assert.ok(phpResponse.includes("https://runtime.example/sitemap1.xml"));
  assert.ok(!phpResponse.includes(SITE_ORIGIN_TOKEN));

  execFileSync("zip", ["-q", "-r", archive, "."], { cwd: fixture, stdio: "inherit" });
  execFileSync("zip", ["-T", archive], { stdio: "inherit" });
  const extractedArchive = join(fixture, "extracted");
  mkdirSync(extractedArchive);
  execFileSync("unzip", ["-q", archive, "-d", extractedArchive], { stdio: "inherit" });
  assertHostingerSitemapRuntime(extractedArchive, "https://runtime.example");
  const archivedPhpResponse = execFileSync("php", [
    "-r",
    "$_SERVER['REQUEST_METHOD']='GET'; $_SERVER['REQUEST_URI']='/sitemap.xml'; $_SERVER['HTTP_HOST']='runtime.example'; $_SERVER['HTTPS']='on'; require 'site-response.php';",
  ], { cwd: extractedArchive, encoding: "utf8" });
  assert.ok(archivedPhpResponse.includes("https://runtime.example/sitemap1.xml"));
  assert.ok(!archivedPhpResponse.includes(SITE_ORIGIN_TOKEN));

  const productionSavedSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://alsahmm.com/sitemap1.xml</loc></sitemap>
</sitemapindex>`;
  writeFileSync(join(extractedArchive, "sitemap.xml"), productionSavedSitemap);
  const productionResponse = execFileSync("php", [
    "-r",
    "$_SERVER['REQUEST_METHOD']='GET'; $_SERVER['REQUEST_URI']='/sitemap.xml'; $_SERVER['HTTP_HOST']='alsahmm.com'; $_SERVER['HTTPS']='on'; require 'site-response.php';",
  ], { cwd: extractedArchive, encoding: "utf8" });
  assert.ok(productionResponse.includes("https://alsahmm.com/sitemap1.xml"));
  assert.ok(!productionResponse.includes(SITE_ORIGIN_TOKEN));

  writeFileSync(join(fixture, ".htaccess"), "RewriteEngine On\nRewriteCond %{REQUEST_FILENAME} -f [OR]\nRewriteRule ^ - [L]\n");
  assert.throws(
    () => assertHostingerSitemapRuntime(fixture, "https://runtime.example"),
    /sitemap rewrite to site-response\.php is missing/u,
    "A package without sitemap runtime routing must fail rather than ship tokenized XML as static content.",
  );
} finally {
  rmSync(archive, { force: true });
  rmSync(fixture, { recursive: true, force: true });
}

console.log("Hostinger sitemap runtime package checks passed.");
