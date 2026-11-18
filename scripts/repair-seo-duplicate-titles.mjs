#!/usr/bin/env node

import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "lib", "db", "package.json"));
const Database = require("better-sqlite3");
const db = new Database(join(ROOT, "data", "sabaik.db"), { timeout: 10000 });

const updates = [
  {
    id: 123,
    expected: "غسيل مجالس وكنب بالبخار بالرياض | تجفيف في 30 دقيقة وتطهير شامل",
    next: "تنظيف المجالس والكنب بالبخار بالرياض | خطوات الاستعداد والتجفيف",
  },
  {
    id: 128,
    expected: "شركة تنظيف وغسيل مكيفات بالرياض | غسيل سبلت بـ 80 ريال",
    next: "تنظيف مكيفات سبليت بالرياض | دليل الغسيل والعناية",
  },
  {
    id: 130,
    expected: "تنظيف وتطهير خزانات المياه بالرياض | تعقيم بالكلور المعتمد",
    next: "تنظيف خزان المياه بالرياض | متى يلزم الغسيل والتطهير",
  },
  {
    id: 144,
    expected: "مقارنة أفضل شركات تنظيف بالرياض | دليل شامل للباقات والمعايير",
    next: "كيف تختار شركة تنظيف بالرياض؟ | مقارنة الباقات والمعايير",
  },
];

const findPost = db.prepare("SELECT id, seo_title FROM posts WHERE id = ?");
const updatePost = db.prepare("UPDATE posts SET seo_title = ? WHERE id = ? AND seo_title = ?");

try {
  const applyUpdates = db.transaction(() => {
    for (const update of updates) {
      const post = findPost.get(update.id);
      if (!post) throw new Error(`Post ${update.id} was not found.`);
      if (post.seo_title === update.next) continue;
      if (post.seo_title !== update.expected) {
        throw new Error(`Post ${update.id} changed unexpectedly; refusing to overwrite its SEO title.`);
      }
      const result = updatePost.run(update.next, update.id, update.expected);
      if (result.changes !== 1) throw new Error(`Post ${update.id} was not updated.`);
    }
  });

  applyUpdates.immediate();
  console.log(`Updated ${updates.length} duplicate SEO titles with unique, intent-specific titles.`);
} finally {
  db.close();
}
