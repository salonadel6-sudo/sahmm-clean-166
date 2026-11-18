#!/usr/bin/env node
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SEO_PAGE_REDIRECTS } from "./seo-page-policy.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "lib", "db", "package.json"));
const Database = require("better-sqlite3");
const databasePath = join(ROOT, "data", "sabaik.db");
const db = new Database(databasePath);
const primaryTitleFor = (brand) => `شركة تنظيف بالرياض للمنازل والفلل والمكاتب | ${brand}`;
const primaryDescriptionFor = (brand) =>
  `شركة تنظيف بالرياض من ${brand} للمنازل والفلل والشقق والمكاتب، مع التنظيف بعد البناء وغسيل المجالس والسجاد بالبخار. اطلب الخدمة وحدد احتياجك وموعدك.`;

try {
  const applyRedirects = db.transaction(() => {
    const retire = db.prepare(`
      UPDATE seo_pages
      SET is_active = 0, updated_at = datetime('now')
      WHERE slug = ? AND is_active <> 0
    `);
    const resolve = db.prepare("SELECT id, slug, is_active FROM seo_pages WHERE slug = ?");
    const changes = [];

    for (const { fromSlug, retireSource = true } of SEO_PAGE_REDIRECTS) {
      if (!retireSource) {
        changes.push({ slug: fromSlug, deactivated: false, sourceRetained: true });
        continue;
      }
      const rows = resolve.all(fromSlug);
      if (rows.length > 1) {
        throw new Error(`Expected at most one SEO page for "${fromSlug}", found ${rows.length}. No changes were committed.`);
      }
      if (rows.length === 0) {
        changes.push({ slug: fromSlug, deactivated: false, sourceAlreadyConsolidated: true });
        continue;
      }
      const result = retire.run(fromSlug);
      changes.push({ slug: fromSlug, deactivated: result.changes > 0 });
    }

    const migrationKey = "seo_primary_meta_v1_applied";
    const migrated = db.prepare("SELECT value FROM site_settings WHERE key = ?").get(migrationKey)?.value === "true";
    if (!migrated) {
      const companyName = db.prepare("SELECT value FROM site_settings WHERE key = 'company_name'").get()?.value || "السهم كلين";
      const brand = String(companyName).split(/[|｜]/u, 1)[0].replace(/^(?:مؤسسة|شركة)\s+/u, "").trim() || "السهم كلين";
      const upsertSetting = db.prepare(`
        INSERT INTO site_settings (key, value, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `);
      upsertSetting.run("seo_meta_title", primaryTitleFor(brand));
      upsertSetting.run("seo_meta_description", primaryDescriptionFor(brand));
      upsertSetting.run("seo_meta_keywords", "شركة تنظيف بالرياض, تنظيف منازل بالرياض, تنظيف فلل بالرياض, تنظيف مكاتب بالرياض, غسيل مجالس بالبخار بالرياض, جلي رخام بالرياض");
      upsertSetting.run(migrationKey, "true");
      changes.push({ slug: null, deactivated: false, homepageMetadataUpdated: true });
    }
    return changes;
  });

  const changes = applyRedirects();
  for (const item of changes) {
    if (item.homepageMetadataUpdated) {
      console.log("Updated the homepage SEO title, description, and focus-term list once; later edits remain untouched.");
      continue;
    }
    if (item.sourceRetained) {
      console.log(`Preserved the active replacement page for legacy redirect: /page/${item.slug}`);
      continue;
    }
    console.log(`${item.deactivated ? "Retired" : "Already retired"}: /page/${item.slug}`);
  }
} finally {
  db.close();
}
