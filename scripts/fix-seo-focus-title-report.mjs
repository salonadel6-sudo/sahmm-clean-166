#!/usr/bin/env node
/**
 * Correct the focus-keyword/title mismatches from the supplied 105-page audit.
 * Default mode is a read-only preview. Pass --apply to back up the live SQLite
 * database and update only SEO titles plus the three demonstrably mismatched
 * focus phrases. Article bodies, URLs, and other page data are left untouched.
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "artifacts", "api-server", "package.json"));
const Database = require("better-sqlite3");
const databasePath = join(ROOT, "data", "sabaik.db");
const apply = process.argv.includes("--apply");

const corrections = {
  posts: {
    77: { title: "أسعار شركات تنظيف المنازل بالرياض 2026" },
    78: { title: "تنظيف بعد التشطيب بالرياض | دليل ما بعد البناء" },
    79: { title: "تنظيف مجالس بالبخار بالرياض | إزالة البقع" },
    80: { title: "تنظيف مكاتب بالرياض | عقود دورية للشركات" },
    81: { title: "شركة تنظيف الملقا الرياض | فلل شمال الرياض" },
    111: { focusKeyword: "شركة تنظيف حراج الرياض", title: "شركة تنظيف حراج الرياض | دليل الحجز والمعاينة" },
    112: { title: "كلين لايف الرياض | مقارنة شركات التنظيف" },
    123: { title: "شركة تنظيف كنب بالرياض | غسيل بالبخار والتجفيف" },
    124: { title: "جلي رخام بالرياض | الألماس والكريستال للأرضيات" },
    126: { title: "تنظيف فلل بالرياض | قصور وواجهات سكنية" },
    127: { title: "غسيل مجالس بالبخار بالرياض | تجفيف سريع" },
    128: { title: "تنظيف مكيفات بالرياض | غسيل المكيفات السبلت" },
    130: { title: "تنظيف خزانات بالرياض | تطهير المياه" },
    131: { title: "جلي رخام بالرياض | تلميع بالألماس والكريستال" },
    132: { title: "تنظيف بعد التشطيب بالرياض | إزالة الإسمنت" },
    133: { title: "أسعار تنظيف المنازل بالرياض | أسعار 2026" },
    134: { title: "تنظيف منازل شمال الرياض | الملقا وحطين" },
    136: { title: "تنظيف بعد التشطيب بالرياض | تنظيف الفلل" },
    137: { title: "تنظيف مجالس بالبخار بالرياض | تعقيم السجاد" },
    138: { title: "تنظيف مكاتب بالرياض | عقود النظافة الدورية" },
    139: { title: "شركة تنظيف الملقا الرياض | تنظيف الفلل" },
    140: { title: "جلي رخام بالرياض | تلميع السيراميك والأرضيات" },
    141: { title: "تنظيف خزانات بالرياض | الغسيل والتعقيم" },
    142: { title: "تنظيف واجهات مباني بالرياض | غسيل الزجاج" },
    143: { focusKeyword: "شركة تنظيف حراج الرياض", title: "شركة تنظيف حراج الرياض | معايير العروض والضمان" },
    144: { focusKeyword: "مقارنة شركات تنظيف بالرياض", title: "مقارنة شركات تنظيف بالرياض | الباقات والضمان" },
    145: { title: "شركة تنظيف كنب بالرياض | تنظيف المجالس بالبخار" },
    146: { title: "جلي رخام بالرياض | صقل الأرضيات بالألماس" },
  },
  packages: {
    1: { title: "تنظيف شقق بالرياض | باقة المنازل السكنية" },
    3: { title: "تنظيف قصور بالرياض | باقة المجمعات الفاخرة" },
    4: { title: "تنظيف قبل النقل بالرياض | تجهيز العقار للسكن" },
    5: { title: "غسيل مجالس بالبخار بالرياض | باقة الكنب" },
    6: { title: "جلي رخام بالرياض | باقة الألماس والكريستال" },
    7: { title: "تنظيف خزانات بالرياض | باقة التطهير والتعقيم" },
    8: { title: "غسيل مكيفات بالرياض | باقة تنظيف السبلت" },
    9: { title: "مكافحة حشرات بالرياض | رش مبيدات بضمان" },
    10: { title: "تنظيف بعد التشطيب بالرياض | باقة البناء" },
    11: { title: "تنظيف واجهات مباني بالرياض | زجاج وكلادينج" },
    12: { title: "تنظيف مساجد بالرياض | غسيل الموكيت والتعقيم" },
    13: { title: "شهادة سلامة بالرياض | تجهيز ملف المنشأة" },
    14: { title: "تركيب أنظمة حريق بالرياض | باقة الوقاية" },
    15: { title: "تقرير فني فوري بالرياض | تجهيز تقرير السلامة" },
    17: { title: "عقد صيانة دفاع مدني بالرياض | أنظمة السلامة" },
  },
  services: {
    2: { title: "تنظيف فلل بالرياض | قصور وواجهات" },
    3: { title: "غسيل مجالس بالبخار بالرياض | الكنب والتجفيف" },
    4: { title: "تنظيف مكيفات بالرياض | سبلت وجراب حماية" },
    6: { title: "تنظيف خزانات بالرياض | تطهير بالكلور" },
    7: { title: "تنظيف مسابح بالرياض | تعقيم الفلاتر والمياه" },
    8: { title: "جلي رخام بالرياض | تلميع الأرضيات" },
    9: { title: "تنظيف واجهات زجاج بالرياض | مباني ومكاتب" },
    10: { title: "تنظيف بعد التشطيب بالرياض | إزالة الدهان" },
    11: { title: "شهادة سلامة بالرياض | ملف السلامة للمنشآت" },
    12: { title: "تركيب أدوات الحماية من الحريق بالرياض" },
    14: { title: "تقرير فني بالرياض | التقارير المجدولة" },
    15: { title: "عقد صيانة دفاع مدني بالرياض | متابعة التفعيل" },
  },
};

function firstKeyword(value) {
  return String(value || "").split(/[،,;\n\r|]+/u).map(term => term.trim()).find(Boolean) || "";
}

function normalizeForKeyword(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u0640]/gu, "")
    .replace(/[أإآٱ]/gu, "ا")
    .replace(/ى/gu, "ي")
    .replace(/ؤ/gu, "و")
    .replace(/ئ/gu, "ي")
    .toLocaleLowerCase("ar")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function replaceFirstKeyword(value, replacement) {
  const text = String(value || "");
  const separatorIndex = text.search(/[،,;\n\r|]/u);
  return separatorIndex < 0 ? replacement : `${replacement}${text.slice(separatorIndex)}`;
}

const totalPages = Object.values(corrections).reduce((sum, group) => sum + Object.keys(group).length, 0);
if (totalPages !== 55) throw new Error(`Expected 55 database pages, found ${totalPages}.`);

const db = new Database(databasePath);
db.pragma("busy_timeout = 10000");
try {
  const settings = Object.fromEntries(db.prepare("SELECT key, value FROM site_settings").all().map(row => [row.key, row.value]));
  const brandName = String(settings.company_name || "خدمات التنظيف بالرياض")
    .split(/[|｜]/u, 1)[0]
    .replace(/^(مؤسسة|شركة)\s+/u, "")
    .trim() || "خدمات التنظيف بالرياض";
  const proposed = [];

  for (const [table, rows] of Object.entries(corrections)) {
    const select = db.prepare(`SELECT id, seo_title, seo_keywords FROM ${table} WHERE id = ?`);
    for (const [idText, correction] of Object.entries(rows)) {
      const id = Number(idText);
      const row = select.get(id);
      if (!row) throw new Error(`Missing expected ${table} row ${id}.`);
      const focusKeyword = correction.focusKeyword || firstKeyword(row.seo_keywords);
      if (!focusKeyword) throw new Error(`Missing focus phrase for ${table} row ${id}.`);
      const titleBase = correction.title;
      if (!normalizeForKeyword(titleBase).startsWith(normalizeForKeyword(focusKeyword))) {
        throw new Error(`Title for ${table} row ${id} does not start with its focus phrase.`);
      }
      const seoTitle = `${titleBase} | ${brandName}`;
      const titleLength = [...seoTitle].length;
      if (titleLength < 30 || titleLength > 60) {
        throw new Error(`SEO title for ${table} row ${id} is ${titleLength} characters; allowed 30–60: ${seoTitle}`);
      }
      const seoKeywords = correction.focusKeyword
        ? replaceFirstKeyword(row.seo_keywords, correction.focusKeyword)
        : row.seo_keywords;
      proposed.push({ table, id, focusKeyword, seoTitle, seoKeywords });
    }
  }

  const duplicateTitles = proposed
    .map(row => row.seoTitle)
    .filter((title, index, titles) => titles.indexOf(title) !== index);
  if (duplicateTitles.length) throw new Error(`Duplicate SEO titles: ${[...new Set(duplicateTitles)].join(" / ")}`);

  for (const row of proposed) {
    console.log(`${apply ? "APPLY" : "PREVIEW"}\t${row.table}\t${row.id}\t${[...row.seoTitle].length}\t${row.focusKeyword}\t${row.seoTitle}`);
  }

  if (apply) {
    const backupPath = join(ROOT, "generated-artifacts", `sabaik-before-seo-title-fix-${new Date().toISOString().replace(/[:.]/gu, "-")}.db`);
    mkdirSync(dirname(backupPath), { recursive: true });
    await db.backup(backupPath);
    const update = (table, id, seoTitle, seoKeywords) => db
      .prepare(`UPDATE ${table} SET seo_title = ?, seo_keywords = ? WHERE id = ?`)
      .run(seoTitle, seoKeywords, id);
    const transaction = db.transaction(() => {
      for (const row of proposed) update(row.table, row.id, row.seoTitle, row.seoKeywords);
    });
    transaction();
    const integrity = db.pragma("integrity_check");
    if (integrity.some(result => Object.values(result)[0] !== "ok")) {
      throw new Error(`Database integrity check failed: ${JSON.stringify(integrity)}`);
    }
    console.log(`Updated ${proposed.length} SEO records. Consistent pre-change backup: ${backupPath}`);
  } else {
    console.log(`Read-only preview: ${proposed.length} records. Re-run with --apply to back up and update the database.`);
  }
} finally {
  db.close();
}
