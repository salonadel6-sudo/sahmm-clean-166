#!/usr/bin/env node
import { resolve } from "node:path";
import { syncSeoContentReference } from "./seo-content-reference-tools.mjs";

const args = process.argv.slice(2);
if (args[0] === "--") args.shift();
let dbPath;
let referencePath;

function readValue(index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`قيمة الخيار ${flag} مطلوبة.`);
  return value;
}

try {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      console.log(`الاستخدام:
  pnpm --filter @workspace/scripts run seo:sync-reference
  pnpm --filter @workspace/scripts run seo:sync-reference -- --db data/sabaik.db

يقرأ الأعداد من SQLite بوضع القراءة فقط ويحدّث كتلة الحالة المعلّمة في مرجع SEO.`);
      process.exit(0);
    } else if (arg === "--db") {
      dbPath = resolve(readValue(index, arg));
      index += 1;
    } else if (arg === "--reference") {
      referencePath = resolve(readValue(index, arg));
      index += 1;
    } else {
      throw new Error(`خيار غير معروف: ${arg}`);
    }
  }

  const result = syncSeoContentReference({
    ...(dbPath ? { dbPath } : {}),
    ...(referencePath ? { referencePath } : {}),
  });
  const { pages, posts, services } = result.snapshot;
  console.log(
    `${result.updated ? "حُدّث" : "محدّث بالفعل"} مرجع SEO بتاريخ ${result.date}: ` +
    `${pages.activePublished}/${pages.total} صفحة، ` +
    `${posts.activePublished}/${posts.total} مقال، ` +
    `${services.activePublished}/${services.total} خدمة نشطة.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
