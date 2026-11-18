import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  copyHostingerApiRuntimeFromBuild,
  copyHostingerApiRuntimeFromSource,
  HOSTINGER_API_RUNTIME_FILES,
} from "./hostinger-api-runtime-files.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = mkdtempSync(join(os.tmpdir(), "hostinger-api-bundle-"));

function readProjectFile(path) {
  return readFileSync(join(root, path), "utf8");
}

try {
  const expectedNames = HOSTINGER_API_RUNTIME_FILES.map(({ name }) => name).sort();
  const sourceApiDirectory = join(tempRoot, "source-api");
  const copiedFromSource = copyHostingerApiRuntimeFromSource(root, sourceApiDirectory).sort();
  assert.deepEqual(copiedFromSource, expectedNames, "source update packages must include every API runtime file");
  for (const { name, source } of HOSTINGER_API_RUNTIME_FILES) {
    assert.equal(
      readFileSync(join(sourceApiDirectory, name), "utf8"),
      readProjectFile(source),
      `${name} should be copied from its authoritative source`,
    );
  }

  const builtApiDirectory = join(tempRoot, "built-api");
  mkdirSync(builtApiDirectory, { recursive: true });
  for (const { name } of HOSTINGER_API_RUNTIME_FILES) {
    writeFileSync(join(builtApiDirectory, name), `fixture:${name}`);
  }
  const copiedApiDirectory = join(tempRoot, "patch-api");
  const copiedFromBuild = copyHostingerApiRuntimeFromBuild(builtApiDirectory, copiedApiDirectory).sort();
  assert.deepEqual(copiedFromBuild, expectedNames, "built API patches must include every runtime dependency");
  for (const { name } of HOSTINGER_API_RUNTIME_FILES) {
    assert.equal(readFileSync(join(copiedApiDirectory, name), "utf8"), `fixture:${name}`);
  }

  const phpSources = [
    "scripts/api-index.php",
    "scripts/static-canonical-rewrite.php",
    "scripts/seo-page-policy.php",
  ];
  const runtimeNames = new Set(expectedNames);
  for (const path of phpSources) {
    const source = readProjectFile(path);
    for (const match of source.matchAll(/require_once\s+__DIR__\s*\.\s*['"]\/([^'"]+\.php)['"]/g)) {
      assert(runtimeNames.has(match[1]), `${path} requires ${match[1]}, which is absent from the API bundle manifest`);
    }
    for (const match of source.matchAll(/__DIR__\s*\.\s*['"]\/([^'"]+\.json)['"]/g)) {
      assert(runtimeNames.has(match[1]), `${path} reads ${match[1]}, which is absent from the API bundle manifest`);
    }
  }

  const sourcePackagers = ["scripts/build-hostinger-update.mjs", "scripts/build-patch.mjs"];
  for (const path of sourcePackagers) {
    assert.match(
      readProjectFile(path),
      /copyHostingerApiRuntimeFromSource/,
      `${path} must use the shared API runtime manifest`,
    );
  }
  assert.match(
    readProjectFile("scripts/package-patch.mjs"),
    /copyHostingerApiRuntimeFromBuild/,
    "scripts/package-patch.mjs must copy all runtime files from the built API",
  );

  const apiSource = readProjectFile("scripts/api-index.php");
  const sitemapSave = apiSource.match(
    /function saveSitemapXml\(PDO \$pdo\): array \{[\s\S]*?(?=\n    function getPublicHtmlRouteInventory\()/u,
  )?.[0];
  assert.ok(sitemapSave, "saveSitemapXml must remain present for Hostinger sitemap saves");
  assert.equal(
    [...sitemapSave.matchAll(/cleanflowSitemapStorageContent\(/gu)].length,
    2,
    "both the sitemap index and child files must use environment-aware storage content",
  );
  assert.doesNotMatch(
    sitemapSave,
    /cleanflowTokenizeSiteOrigin\(/u,
    "sitemap save must use the runtime-aware storage helper instead of always tokenizing production URLs",
  );

  console.log(`Hostinger API bundle contract passed (${expectedNames.length} runtime files).`);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
