import { createRequire } from "node:module";
import { readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_DB_PATH = join(ROOT, "data", "sabaik.db");
const DEFAULT_REFERENCE_PATH = join(ROOT, "docs", "seo-content-gap-assessment.md");
const STATUS_START = "<!-- SEO-CONTENT-DB-STATUS:START -->";
const STATUS_END = "<!-- SEO-CONTENT-DB-STATUS:END -->";
const require = createRequire(join(ROOT, "lib", "db", "package.json"));
const Database = require("better-sqlite3");

const SEARCH_FIELDS = [
  "title",
  "slug",
  "target_keyword",
  "seo_title",
  "seo_description",
  "seo_keywords",
  "seo_slug",
  "canonical_url",
];

const TABLES = [
  { table: "seo_pages", kind: "صفحة SEO", fields: SEARCH_FIELDS },
  { table: "posts", kind: "مقال", fields: SEARCH_FIELDS.filter((field) => field !== "target_keyword") },
  { table: "services", kind: "خدمة", fields: SEARCH_FIELDS.filter((field) => field !== "target_keyword" && field !== "canonical_url") },
];

const STOP_WORDS = new Set([
  "في", "من", "على", "عن", "مع", "الى", "او", "و", "ثم", "لدى", "هذا", "هذه",
  "الرياض", "بالرياض", "شركة", "مؤسسة", "خدمة", "خدمات",
]);

export function normalizeSeoSearchText(value) {
  return String(value ?? "")
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

function tokenize(value) {
  return new Set(
    normalizeSeoSearchText(value)
      .split(" ")
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token)),
  );
}

function getTableColumns(db, table) {
  return new Set(db.pragma(`table_info("${table}")`).map((column) => column.name));
}

function loadRowsForTable(db, { table, kind, fields }) {
  const available = getTableColumns(db, table);
  if (!available.size) throw new Error(`Required content table is missing: ${table}`);

  const selected = ["id", ...fields, "status", "is_active"].filter(
    (field, index, list) => available.has(field) && list.indexOf(field) === index,
  );
  if (!selected.includes("title")) {
    throw new Error(`Required title field is missing from ${table}.`);
  }

  const columns = selected.map((field) => `"${field}"`).join(", ");
  return db.prepare(`SELECT ${columns} FROM "${table}"`).all().map((row) => ({
    ...row,
    kind,
    route: row.seo_slug || row.slug || "",
    active: row.is_active == null ? null : row.is_active === 1,
  }));
}

export function loadSeoContentMetadata({ dbPath = DEFAULT_DB_PATH } = {}) {
  const absoluteDbPath = resolve(dbPath);
  const db = new Database(absoluteDbPath, { readonly: true, fileMustExist: true });
  db.pragma("query_only = ON");
  try {
    return TABLES.flatMap((table) => loadRowsForTable(db, table));
  } finally {
    db.close();
  }
}

export function rankSimilarSeoContent(query, records, { limit = 12, minScore = 0.12 } = {}) {
  const normalizedQuery = normalizeSeoSearchText(query);
  const queryTokens = tokenize(query);
  if (!normalizedQuery || queryTokens.size === 0) {
    throw new Error("أدخل عبارة بحث تتضمن كلمة موضوعية واحدة على الأقل.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("يجب أن يكون الحد بين 1 و100 نتيجة.");
  }
  if (!Number.isFinite(minScore) || minScore < 0 || minScore > 1) {
    throw new Error("يجب أن تكون قيمة --min-score بين 0 و1.");
  }

  const prepared = records.map((record) => {
    const searchableFields = SEARCH_FIELDS
      .filter((field) => record[field] != null)
      .map((field) => String(record[field]));
    if (record.kind === "خدمة" && record.target_keyword == null) {
      // Service records use their title and SEO metadata, not page-only fields.
    }
    const text = normalizeSeoSearchText(searchableFields.join(" "));
    return { record, text, tokens: tokenize(text) };
  });

  const documentFrequency = new Map();
  for (const item of prepared) {
    for (const token of item.tokens) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }

  const inverseFrequency = (token) =>
    1 + Math.log((prepared.length + 1) / ((documentFrequency.get(token) ?? 0) + 1));
  const queryWeights = new Map([...queryTokens].map((token) => [token, inverseFrequency(token)]));
  const totalQueryWeight = [...queryWeights.values()].reduce((sum, weight) => sum + weight, 0);

  return prepared
    .map(({ record, text, tokens }) => {
      const matchedTerms = [...queryTokens].filter((token) => tokens.has(token));
      if (matchedTerms.length === 0) return null;

      const sharedWeight = matchedTerms.reduce((sum, token) => sum + queryWeights.get(token), 0);
      const recordWeight = [...tokens].reduce((sum, token) => sum + inverseFrequency(token), 0);
      const coverage = sharedWeight / totalQueryWeight;
      const weightedJaccard = sharedWeight / Math.max(0.0001, totalQueryWeight + recordWeight - sharedWeight);
      const exactPhrase = ` ${text} `.includes(` ${normalizedQuery} `);
      const score = exactPhrase ? 1 : 0.85 * coverage + 0.15 * weightedJaccard;
      return {
        ...record,
        score,
        scorePercent: Math.round(score * 100),
        exactPhrase,
        matchedTerms,
      };
    })
    .filter((record) => record && record.score >= minScore)
    .sort((left, right) =>
      right.score - left.score ||
      String(left.title ?? "").localeCompare(String(right.title ?? ""), "ar"),
    )
    .slice(0, limit);
}

function getContentCounts(db) {
  const readCounts = (table, where) => {
    const columns = getTableColumns(db, table);
    if (!columns.has("id")) throw new Error(`Required content table is missing or invalid: ${table}`);
    const total = db.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get().count;
    const activePublished = where
      ? db.prepare(`SELECT COUNT(*) AS count FROM "${table}" WHERE ${where}`).get().count
      : total;
    return { total, activePublished };
  };

  for (const table of ["seo_pages", "posts", "services"]) {
    const columns = getTableColumns(db, table);
    if (!columns.has("is_active")) throw new Error(`Required is_active field is missing from ${table}.`);
  }
  for (const table of ["seo_pages", "posts"]) {
    if (!getTableColumns(db, table).has("status")) {
      throw new Error(`Required status field is missing from ${table}.`);
    }
  }

  return {
    pages: readCounts("seo_pages", "is_active = 1 AND status = 'published'"),
    posts: readCounts("posts", "is_active = 1 AND status = 'published'"),
    services: readCounts("services", "is_active = 1"),
  };
}

export function getSeoContentSnapshot({ dbPath = DEFAULT_DB_PATH } = {}) {
  const db = new Database(resolve(dbPath), { readonly: true, fileMustExist: true });
  db.pragma("query_only = ON");
  try {
    return getContentCounts(db);
  } finally {
    db.close();
  }
}

export function cairoDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function renderSeoContentStatus(snapshot, date) {
  return [
    STATUS_START,
    `آخر قراءة آلية لقاعدة العمل \`data/sabaik.db\` (توقيت القاهرة: ${date}):`,
    `- صفحات SEO: ${snapshot.pages.activePublished} نشطة ومنشورة من أصل ${snapshot.pages.total} سجلًا.`,
    `- المقالات: ${snapshot.posts.activePublished} نشطة ومنشورة من أصل ${snapshot.posts.total} سجلًا.`,
    `- الخدمات: ${snapshot.services.activePublished} نشطة من أصل ${snapshot.services.total} سجلًا.`,
    STATUS_END,
  ].join("\n");
}

export function syncSeoContentReference({
  dbPath = DEFAULT_DB_PATH,
  referencePath = DEFAULT_REFERENCE_PATH,
  date = cairoDate(),
} = {}) {
  const snapshot = getSeoContentSnapshot({ dbPath });
  const document = readFileSync(referencePath, "utf8");
  const startCount = document.split(STATUS_START).length - 1;
  const endCount = document.split(STATUS_END).length - 1;
  if (startCount !== 1 || endCount !== 1) {
    throw new Error("مرجع SEO يجب أن يحتوي علامة بداية ونهاية واحدة لكتلة حالة قاعدة البيانات.");
  }

  const start = document.indexOf(STATUS_START);
  const end = document.indexOf(STATUS_END) + STATUS_END.length;
  if (end <= start) throw new Error("ترتيب علامات كتلة حالة قاعدة البيانات غير صالح.");

  const replacement = renderSeoContentStatus(snapshot, date);
  const updatedDocument = `${document.slice(0, start)}${replacement}${document.slice(end)}`;
  const updated = updatedDocument !== document;
  if (updated) {
    const temporaryPath = join(
      dirname(referencePath),
      `.${basename(referencePath)}.${process.pid}.tmp`,
    );
    try {
      writeFileSync(temporaryPath, updatedDocument, "utf8");
      renameSync(temporaryPath, referencePath);
    } finally {
      rmSync(temporaryPath, { force: true });
    }
  }

  return { updated, date, snapshot };
}
