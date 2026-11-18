import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildSitemapFileSet, normalizeSitemapSettings } from "./sitemap-sharding.mjs";
import { validateSitemapFile, validateSitemapXml } from "./validate-sitemap.mjs";

const origin = "https://alsahmm.com";
const urls = [
  `${origin}/`,
  `${origin}/services/cleaning`,
  `${origin}/areas/north-riyadh`,
  `${origin}/blog/clean-home`,
  `${origin}/%D8%AA%D9%86%D8%B8%D9%8A%D9%81`,
];
const fixture = `<?xml version="1.0" encoding="UTF-8"?>\n`
  + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
  + urls.map(url => `  <url><loc>${url}</loc></url>`).join("\n")
  + "\n</urlset>\n";

test("normalizes legacy split settings and strictly parses per-file limits", () => {
  assert.deepEqual(normalizeSitemapSettings({ sitemap_split_enabled: "no", sitemap_urls_per_file: "20" }), {
    enabled: false,
    urlsPerFile: 20,
  });
  assert.deepEqual(normalizeSitemapSettings({ sitemap_split_enabled: "0", sitemap_urls_per_file: "20pages" }), {
    enabled: false,
    urlsPerFile: 500,
  });
  assert.deepEqual(normalizeSitemapSettings({ sitemap_urls_per_file: "900" }), {
    enabled: true,
    urlsPerFile: 500,
  });
});

test("creates a valid sitemap index and checks every shard", t => {
  const directory = mkdtempSync(join(tmpdir(), "cleanflow-sitemap-sharding-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));

  const generated = buildSitemapFileSet(fixture, origin, {
    sitemap_split_enabled: "true",
    sitemap_urls_per_file: "2",
  }, "2026-10-20");
  assert.equal(generated.totalUrls, urls.length);
  assert.equal(generated.files.length, 3);

  writeFileSync(join(directory, "sitemap.xml"), generated.xml);
  for (const file of generated.files) writeFileSync(join(directory, file.filename), file.xml);

  const root = validateSitemapXml(readFileSync(join(directory, "sitemap.xml"), "utf8"), "sitemap.xml", origin);
  assert.equal(root.isIndex, true);
  assert.equal(root.info.sitemapCount, 3);
  const result = validateSitemapFile(join(directory, "sitemap.xml"), origin, 2);
  assert.deepEqual(result.errors, []);
  assert.equal(result.info.urlCount, urls.length);
  assert.equal(result.pageLocations.length, urls.length);
});

test("flags the same decoded page URL when it appears in different shards", t => {
  const directory = mkdtempSync(join(tmpdir(), "cleanflow-sitemap-duplicates-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const duplicateFixture = fixture.replace(
    "</urlset>",
    `  <url><loc>${origin}/تنظيف</loc></url>\n</urlset>`,
  );
  const generated = buildSitemapFileSet(duplicateFixture, origin, {
    sitemap_split_enabled: "true",
    sitemap_urls_per_file: "2",
  });
  writeFileSync(join(directory, "sitemap.xml"), generated.xml);
  for (const file of generated.files) writeFileSync(join(directory, file.filename), file.xml);

  const result = validateSitemapFile(join(directory, "sitemap.xml"), origin, 2);
  assert.ok(result.errors.some(error => error.includes("duplicate sitemap page URL across child files")));
});

test("leaves a single urlset when splitting is disabled or the limit is not exceeded", () => {
  const disabled = buildSitemapFileSet(fixture, origin, {
    sitemap_split_enabled: "false",
    sitemap_urls_per_file: "2",
  });
  assert.match(disabled.xml, /<urlset\b/);
  assert.deepEqual(disabled.files, []);

  const underLimit = buildSitemapFileSet(fixture, origin, {
    sitemap_split_enabled: "true",
    sitemap_urls_per_file: "5",
  });
  assert.match(underLimit.xml, /<urlset\b/);
  assert.deepEqual(underLimit.files, []);
});
