import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadLocalSitemapUrlBlocks } from "./backlink-sitemap-source.mjs";

const sitemapIndex = (children) => `<?xml version="1.0"?>
<sitemapindex>
${children.map((name) => `<sitemap><loc>https://old.example/${name}</loc></sitemap>`).join("\n")}
</sitemapindex>`;

const sitemapUrlset = (path) => `<?xml version="1.0"?>
<urlset><url><loc>https://old.example${path}</loc></url></urlset>`;

test("loads all local child urlsets from a sitemap index", () => {
  const root = mkdtempSync(join(tmpdir(), "backlink-sitemap-index-"));
  try {
    writeFileSync(join(root, "sitemap.xml"), sitemapIndex(["sitemap1.xml", "sitemap2.xml"]));
    writeFileSync(join(root, "sitemap1.xml"), sitemapUrlset("/page/one"));
    writeFileSync(join(root, "sitemap2.xml"), sitemapUrlset("/page/two"));

    const result = loadLocalSitemapUrlBlocks(join(root, "sitemap.xml"));
    assert.equal(result.sourceSitemapOrigin, "https://old.example");
    assert.equal(result.blocks.length, 2);
    assert.match(result.blocks[0], /\/page\/one/u);
    assert.match(result.blocks[1], /\/page\/two/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects a sitemap index that points to another origin", () => {
  const root = mkdtempSync(join(tmpdir(), "backlink-sitemap-origin-"));
  try {
    writeFileSync(
      join(root, "sitemap.xml"),
      `<sitemapindex><sitemap><loc>https://old.example/sitemap1.xml</loc></sitemap>`
      + `<sitemap><loc>https://elsewhere.example/sitemap2.xml</loc></sitemap></sitemapindex>`,
    );
    writeFileSync(join(root, "sitemap1.xml"), sitemapUrlset("/page/one"));

    assert.throws(
      () => loadLocalSitemapUrlBlocks(join(root, "sitemap.xml")),
      /different origin/u,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
