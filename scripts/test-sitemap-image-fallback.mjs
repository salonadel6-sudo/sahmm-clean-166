import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseSitemapImages } from "./sitemap-image-paths.mjs";

const workspaceRoot = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(join(workspaceRoot, "lib/db/package.json"));
const Database = require("better-sqlite3");

test("uses image_url when an image list is empty or unusable", () => {
  const fallback = "/images/packages/package-01.webp";
  assert.deepEqual(parseSitemapImages("[]", fallback), [fallback]);
  assert.deepEqual(parseSitemapImages("[null, \"  \"]", fallback), [fallback]);
  assert.deepEqual(parseSitemapImages("invalid-json", fallback), [fallback]);
  assert.deepEqual(parseSitemapImages("[]", "  "), []);
});

test("keeps populated image arrays and trims invalid whitespace", () => {
  assert.deepEqual(
    parseSitemapImages("[\" /images/service.jpg \", \"\", null]", "/images/fallback.jpg"),
    ["/images/service.jpg"],
  );
});

test("PHP sitemap generation uses service and package image_url fallbacks with fixture data", async () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "cleanflow-sitemap-image-fallback-"));
  const fixtureScripts = join(fixtureRoot, "scripts");
  const fixtureLib = join(fixtureRoot, "lib");
  const fixtureData = join(fixtureRoot, "data");
  mkdirSync(fixtureScripts, { recursive: true });
  mkdirSync(fixtureLib, { recursive: true });
  mkdirSync(fixtureData, { recursive: true });

  try {
    const sourceDb = new Database(join(workspaceRoot, "data/sabaik.db"), {
      readonly: true,
      fileMustExist: true,
    });
    try {
      await sourceDb.backup(join(fixtureData, "sabaik.db"));
    } finally {
      sourceDb.close();
    }

    const fixtureDb = new Database(join(fixtureData, "sabaik.db"));
    try {
      const service = fixtureDb.prepare(
        "SELECT id FROM services WHERE is_active = 1 AND seo_slug IS NOT NULL AND seo_slug <> '' LIMIT 1",
      ).get();
      const container = fixtureDb.prepare(
        "SELECT id FROM containers WHERE is_active = 1 AND seo_slug IS NOT NULL AND seo_slug <> '' LIMIT 1",
      ).get();
      const heroSlide = fixtureDb.prepare(
        'SELECT id FROM hero_slides WHERE is_active = 1 ORDER BY "order" ASC LIMIT 1',
      ).get();
      assert.ok(service, "fixture database must include a public service");
      assert.ok(container, "fixture database must include a public package");
      assert.ok(heroSlide, "fixture database must include an active homepage hero slide");
      fixtureDb.prepare("UPDATE services SET images = '[]', image_url = ? WHERE id = ?")
        .run("/fixture/service-fallback.jpg", service.id);
      fixtureDb.prepare("UPDATE containers SET images = '[]', image_url = ? WHERE id = ?")
        .run("/fixture/package-fallback.jpg", container.id);
      fixtureDb.prepare("UPDATE hero_slides SET image_url = ? WHERE id = ?")
        .run("/fixture/home-hero.jpg", heroSlide.id);
      const splitSetting = fixtureDb.prepare(
        "SELECT 1 FROM site_settings WHERE key = 'sitemap_split_enabled' LIMIT 1",
      ).get();
      if (splitSetting) {
        fixtureDb.prepare("UPDATE site_settings SET value = 'false' WHERE key = 'sitemap_split_enabled'").run();
      } else {
        fixtureDb.prepare(
          "INSERT INTO site_settings (key, value, updated_at) VALUES ('sitemap_split_enabled', 'false', datetime('now'))",
        ).run();
      }
    } finally {
      fixtureDb.close();
    }

    cpSync(join(workspaceRoot, "scripts"), fixtureScripts, { recursive: true });
    for (const name of ["seo-page-policy.json", "seo-service-page-content.json", "seo-package-page-content.json"]) {
      cpSync(join(workspaceRoot, "lib", name), join(fixtureLib, name));
    }

    const apiPath = join(fixtureScripts, "api-index.php");
    const phpCode = [
      "$_SERVER['REQUEST_METHOD'] = 'GET';",
      "$_SERVER['REQUEST_URI'] = '/api/sitemap/generate';",
      "$_SERVER['HTTP_HOST'] = 'fallback.example';",
      "$_SERVER['HTTPS'] = 'on';",
      `$_SERVER['DOCUMENT_ROOT'] = ${JSON.stringify(fixtureRoot)};`,
      `require ${JSON.stringify(apiPath)};`,
    ].join(" ");
    const response = execFileSync("php", ["-r", phpCode], {
      cwd: fixtureRoot,
      encoding: "utf8",
    });
    const result = JSON.parse(response);
    assert.match(result.xml, /https:\/\/fallback\.example\/fixture\/service-fallback\.jpg/u);
    assert.match(result.xml, /https:\/\/fallback\.example\/fixture\/package-fallback\.jpg/u);
    assert.match(result.xml, /https:\/\/fallback\.example\/fixture\/home-hero\.jpg/u);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
