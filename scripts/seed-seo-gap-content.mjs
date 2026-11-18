#!/usr/bin/env node
/**
 * Validate and optionally insert the 13 paired SEO pages and articles.
 *
 * Default mode is read-only. Pass --apply only after the source content,
 * duplicate report, internal Rank Math scores, and image sources are approved.
 * This script is additive: it never updates or reactivates existing records.
 */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  analyzeRankMathSeo,
  buildBlogPostRankMathInput,
  buildSeoPageRankMathInput,
  evaluateSeoPageIndexability,
  isRankMathProjectSearchPhrase,
} from "@workspace/seo-rank-math";
import { BUILD_SITE_ORIGIN } from "./seo-config.mjs";
import { gapArticles, gapPages } from "./data/seo-gap-content.mjs";
import { syncSeoContentReference } from "./seo-content-reference-tools.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = join(ROOT, "data", "sabaik.db");
const IMAGE_DIR = join(ROOT, "artifacts", "sabaik-almasa", "public", "images");
const SEO_IMAGE_DIR = join(IMAGE_DIR, "seo");
const args = process.argv.slice(2);
if (args[0] === "--") args.shift();
const applyChanges = args.includes("--apply");
const unknownArgs = args.filter((arg) => arg !== "--apply" && arg !== "--dry-run");
if (unknownArgs.length) throw new Error(`Unknown option(s): ${unknownArgs.join(", ")}`);

const require = createRequire(join(ROOT, "lib", "db", "package.json"));
const Database = require("better-sqlite3");
const db = new Database(DB_PATH, applyChanges ? {} : { readonly: true, fileMustExist: true });
const now = new Date().toISOString();
const siteCompanyName = String(
  db.prepare("SELECT value FROM site_settings WHERE key = 'company_name'").get()?.value || "",
).trim();
const siteBrandName = siteCompanyName
  .split(/[|｜]/u, 1)[0]
  .replace(/^(?:مؤسسة|شركة)\s+/u, "")
  .trim() || "خدمات التنظيف بالرياض";

function normalizePhrase(value) {
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

function containsPhrase(value, phrase) {
  const text = ` ${normalizePhrase(value)} `;
  const target = ` ${normalizePhrase(phrase)} `;
  return Boolean(target.trim()) && text.includes(target);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&#39;");
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u0640]/gu, "")
    .toLocaleLowerCase("ar")
    .replace(/[\s_]+/gu, "-")
    .replace(/[^\u0600-\u06FFa-z0-9-]/gu, "")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 100);
}

function codePointLength(value) {
  return [...String(value || "")].length;
}

function fitWords(value, maxLength) {
  const words = String(value || "").trim().split(/\s+/u).filter(Boolean);
  while (words.length && codePointLength(words.join(" ")) > maxLength) words.pop();
  return words.join(" ");
}

function buildFinalSeoTitle(focus, draftTitle) {
  const rawParts = String(draftTitle || "").split(/[|｜]/u).map((part) => part.trim()).filter(Boolean);
  if (!rawParts.length || !containsPhrase(rawParts[0], focus)) {
    throw new Error(`SEO title must begin with its exact focus phrase: ${focus}`);
  }

  const brand = siteBrandName;
  const focusLength = codePointLength(focus);
  const brandLength = codePointLength(brand);
  if (focusLength + brandLength + 3 > 60) {
    throw new Error(`The focus phrase and current brand cannot fit a 60-character title: ${focus}`);
  }

  const maxQualifierLength = 60 - focusLength - brandLength - 6;
  const minQualifierLength = Math.max(0, 50 - focusLength - brandLength - 6);
  const draftQualifier = rawParts
    .slice(1)
    .filter((part) => normalizePhrase(part) !== normalizePhrase(brand))
    .join(" ");
  let qualifier = fitWords(draftQualifier, Math.max(0, maxQualifierLength));

  if (codePointLength(qualifier) < minQualifierLength) {
    const additions = ["دليل", "عملي", "نطاق العمل", "خطوات الخدمة"];
    for (const addition of additions) {
      const candidate = [qualifier, addition].filter(Boolean).join(" ");
      if (
        codePointLength(candidate) >= minQualifierLength
        && codePointLength(candidate) <= maxQualifierLength
      ) {
        qualifier = candidate;
        break;
      }
    }
  }

  const title = [
    focus,
    ...(qualifier ? [qualifier] : []),
    brand,
  ].join(" | ");
  const titleLength = codePointLength(title);
  if (titleLength < 50 || titleLength > 60 || !containsPhrase(title, focus)) {
    throw new Error(
      `Could not prepare a 50–60 character title containing the full focus phrase: ${focus} (${titleLength})`,
    );
  }
  return title;
}

function keywordList(value) {
  return String(value || "").split(/[،,;|\n\r]+/u).map((part) => part.trim()).filter(Boolean);
}

function phraseCollision(phrase, record) {
  const fields = [
    record.title,
    record.target_keyword,
    record.seo_title,
    ...keywordList(record.seo_keywords),
  ];
  return fields.some((field) => containsPhrase(field, phrase));
}

function makeRelatedLinks(serviceSlug, pageSlug, articleSlug, articleTitle) {
  const servicePath = `/services/${encodeURIComponent(serviceSlug)}`;
  const pagePath = `/page/${encodeURIComponent(pageSlug)}`;
  const articlePath = `/blog/${encodeURIComponent(articleSlug)}`;
  return { servicePath, pagePath, articlePath, articleTitle };
}

function renderPageContent(page, article, pageSlug, articleSlug) {
  const related = makeRelatedLinks(page.serviceSlug, pageSlug, articleSlug, article.title);
  const checklist = page.checklist
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  return [
    `<p>توضح هذه الصفحة تفاصيل <strong>${escapeHtml(page.focus)}</strong>، وتعرض حدود العمل والمعلومات التي تهيئ الطلب قبل تنسيق الخدمة.</p>`,
    `<h2>${escapeHtml(page.primaryHeading)}</h2><p>${escapeHtml(page.primaryText)}</p>`,
    `<h2>${escapeHtml(page.secondaryHeading)}</h2><p>${escapeHtml(page.secondaryText)}</p>`,
    `<h2>خطوات تحديد نطاق العمل</h2><p>${escapeHtml(page.processText)}</p>`,
    `<h2>معلومات جهّزها قبل التواصل</h2><ul>${checklist}</ul>`,
    `<h2>أسئلة شائعة</h2><p>${escapeHtml(page.faq)}</p>`,
    `<h2>صفحات مرتبطة</h2><p>يمكنك مراجعة <a href="${related.servicePath}">تفاصيل الخدمة المرتبطة</a>، وقراءة <a href="${related.articlePath}">${escapeHtml(related.articleTitle)}</a> لمعرفة طريقة الاستعداد أو تنظيم المعلومات قبل الطلب.</p>`,
  ].join("\n");
}

function renderArticleContent(article, page, pageSlug, articleSlug) {
  const related = makeRelatedLinks(page.serviceSlug, pageSlug, articleSlug, article.title);
  const checklist = page.checklist
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const sections = article.sections
    .map((section) => `<h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.body)}</p>`)
    .join("\n");

  return [
    `<p>${escapeHtml(article.intro)}</p>`,
    sections,
    `<h2>${escapeHtml(article.secondary)}</h2><p>عند الاستفسار عن ${escapeHtml(article.secondary)}، وضح الجزء المعني في الموقع، وما إذا كانت هناك أعمال أو ملاحظات سابقة، وأي قيود وصول أو وقت. افصل المعلومات المؤكدة عن الأسئلة التي تحتاج إلى إجابة، واطلب توضيح نطاق التنفيذ قبل الاتفاق؛ فالهدف ترتيب الطلب، لا افتراض إجراء أو نتيجة رسمية لم تذكرها الجهة المختصة.</p>`,
    `<h2>قائمة مراجعة قبل الموعد</h2><p>${escapeHtml(page.processText)}</p><ul>${checklist}</ul>`,
    `<h2>صفحات مرتبطة</h2><p>للاطلاع على نطاق الخدمة، راجع <a href="${related.servicePath}">الخدمة ذات الصلة</a> و<a href="${related.pagePath}">${escapeHtml(page.title || page.primaryHeading)}</a>.</p>`,
  ].join("\n");
}

function analysisWarnings(analysis) {
  return analysis.checks
    .filter((check) => check.status === "fail" || check.status === "warning")
    .map((check) => `${check.id}: ${check.detail}`)
    .join("؛ ");
}

function makePageRecord(page, article, index, pageOrder) {
  const slug = slugify(page.focus);
  const articleSlug = slugify(article.focus);
  const content = renderPageContent(page, article, slug, articleSlug);
  const seoTitle = buildFinalSeoTitle(page.focus, page.seoTitle);
  const canonicalUrl = `/page/${slug}`;
  const tags = JSON.stringify([page.focus, page.secondary, page.category, "الرياض"]);
  const record = {
    title: page.primaryHeading,
    slug,
    target_keyword: page.focus,
    content,
    excerpt: page.seoDescription,
    cover_image: `/images/seo/${slug}.jpg`,
    category: page.category,
    tags,
    status: "published",
    published_at: now,
    is_active: 1,
    order: pageOrder + index + 1,
    seo_title: seoTitle,
    seo_description: page.seoDescription,
    seo_keywords: [page.focus, page.secondary, page.category, "خدمات الرياض"].join("، "),
    seo_slug: slug,
    og_image: `/images/seo/${slug}.jpg`,
    canonical_url: canonicalUrl,
    created_at: now,
    updated_at: now,
  };
  return { source: page, record, articleSlug };
}

function makeArticleRecord(article, page, index, postOrder) {
  const slug = slugify(article.focus);
  const pageSlug = slugify(page.focus);
  const content = renderArticleContent(article, page, pageSlug, slug);
  const seoTitle = buildFinalSeoTitle(article.focus, article.seoTitle);
  const canonicalUrl = `/blog/${slug}`;
  const wordCount = content.replace(/<[^>]*>/gu, " ").split(/\s+/u).filter(Boolean).length;
  const author = siteCompanyName || "CleanFlow";
  const tags = JSON.stringify([article.focus, article.secondary, page.focus, page.category]);
  const image = `/images/${article.imageSource}`;
  const record = {
    title: article.title,
    slug,
    content,
    excerpt: article.intro,
    cover_image: image,
    author,
    category: page.category,
    tags,
    status: "published",
    published_at: now,
    read_time: Math.max(3, Math.ceil(wordCount / 200)),
    is_active: 1,
    order: postOrder + index + 1,
    seo_title: seoTitle,
    seo_description: article.seoDescription,
    seo_keywords: [article.focus, article.secondary, page.focus, "الرياض"].join("، "),
    seo_slug: slug,
    og_image: image,
    canonical_url: canonicalUrl,
    created_at: now,
    updated_at: now,
  };
  return { source: article, record, pageSlug, wordCount };
}

function digest(path) {
  return createHash("sha256").update(require("node:fs").readFileSync(path)).digest("hex");
}

const errors = [];
const pageRows = db.prepare("SELECT * FROM seo_pages").all();
const postRows = db.prepare("SELECT * FROM posts").all();
const serviceRows = db.prepare("SELECT seo_slug, title, seo_title, seo_keywords, is_active FROM services").all();
const sqliteIntegrity = db.pragma("integrity_check", { simple: true });
if (sqliteIntegrity !== "ok") errors.push(`Workspace SQLite integrity check failed: ${sqliteIntegrity}`);
const activeServices = new Map(serviceRows.filter((service) => service.is_active).map((service) => [service.seo_slug, service]));
const existingPagesByRoute = new Map();
const existingPostsByRoute = new Map();
for (const row of pageRows) {
  for (const route of [row.slug, row.seo_slug].filter(Boolean)) {
    existingPagesByRoute.set(route, row);
  }
}
for (const row of postRows) {
  for (const route of [row.slug, row.seo_slug].filter(Boolean)) {
    existingPostsByRoute.set(route, row);
  }
}

if (gapPages.length !== 13 || gapArticles.length !== 13) {
  errors.push(`Expected 13 pages and 13 articles; found ${gapPages.length} and ${gapArticles.length}.`);
}
if (new Set(gapPages.map((page) => normalizePhrase(page.focus))).size !== gapPages.length) {
  errors.push("The SEO page focus phrases are not unique.");
}
if (new Set(gapArticles.map((article) => normalizePhrase(article.focus))).size !== gapArticles.length) {
  errors.push("The article focus phrases are not unique.");
}
if (gapArticles.some((article) => !Number.isInteger(article.pageIndex) || !gapPages[article.pageIndex])) {
  errors.push("Every article must point to an existing paired page index.");
}
if (new Set(gapArticles.map((article) => article.pageIndex)).size !== gapPages.length) {
  errors.push("Article-to-page pairings must cover each page exactly once.");
}

const pageOrder = db.prepare('SELECT COALESCE(MAX("order"), 0) AS value FROM seo_pages').get().value;
const postOrder = db.prepare('SELECT COALESCE(MAX("order"), 0) AS value FROM posts').get().value;
const pageCandidates = [];
const articleCandidates = [];

for (const [index, page] of gapPages.entries()) {
  const slug = slugify(page.focus);
  const article = gapArticles.find((item) => item.pageIndex === index);
  if (!article) {
    errors.push(`Page ${index + 1} has no paired article.`);
    continue;
  }
  const candidate = makePageRecord(page, article, index, pageOrder);
  pageCandidates.push(candidate);

  if (!isRankMathProjectSearchPhrase(page.focus)) {
    errors.push(`Page focus phrase is not accepted by project SEO policy: ${page.focus}`);
  }
  if (!activeServices.has(page.serviceSlug)) {
    errors.push(`Page serviceSlug is not an active service: ${page.focus} -> ${page.serviceSlug}`);
  }
  if (existingPagesByRoute.has(slug)) {
    errors.push(`SEO page route already exists: /page/${slug}`);
  }
  if (pageRows.some((row) => phraseCollision(page.focus, row))) {
    errors.push(`Exact/contained SEO page focus already appears in an existing SEO page: ${page.focus}`);
  }
  if (postRows.some((row) => phraseCollision(page.focus, row))) {
    errors.push(`SEO page focus already appears in an existing article: ${page.focus}`);
  }
  if (serviceRows.some((row) => phraseCollision(page.focus, row))) {
    errors.push(`SEO page focus already appears in an existing service title/metadata: ${page.focus}`);
  }
  if (codePointLength(page.seoDescription) < 120 || codePointLength(page.seoDescription) > 160) {
    errors.push(`Page meta description must be 120–160 characters: ${page.focus} (${codePointLength(page.seoDescription)}).`);
  }
  if (!containsPhrase(page.seoDescription, page.focus)) {
    errors.push(`Page meta description does not contain its focus phrase: ${page.focus}`);
  }
  if (!containsPhrase(page.primaryHeading, page.focus)) {
    errors.push(`Page H1 source does not contain its focus phrase: ${page.focus}`);
  }
  if (!containsPhrase(candidate.record.content, page.secondary)) {
    errors.push(`Page content does not include the secondary phrase: ${page.secondary}`);
  }
  if (!existsSync(join(IMAGE_DIR, page.imageSource))) {
    errors.push(`Page image source is missing: ${page.imageSource}`);
  }

  const expectedCanonical = `${BUILD_SITE_ORIGIN}/page/${encodeURIComponent(slug)}`;
  const indexability = evaluateSeoPageIndexability({
    title: candidate.record.title,
    targetKeyword: candidate.record.target_keyword,
    seoTitle: candidate.record.seo_title,
    content: candidate.record.content,
    slug,
    canonical: expectedCanonical,
    expectedCanonical,
  });
  if (!indexability.indexable) {
    errors.push(`Page is not indexable under project policy: ${page.focus} (${indexability.reason}).`);
  }
  const analysis = analyzeRankMathSeo(buildSeoPageRankMathInput({
    title: candidate.record.title,
    slug,
    seoSlug: candidate.record.seo_slug,
    targetKeyword: candidate.record.target_keyword,
    content: candidate.record.content,
    seoTitle: candidate.record.seo_title,
    seoDescription: candidate.record.seo_description,
    seoKeywords: candidate.record.seo_keywords,
    canonicalUrl: candidate.record.canonical_url,
  }));
  candidate.analysis = analysis;
  if (analysis.score !== 100 || !analysis.publishable) {
    errors.push(`Page Rank Math result is ${analysis.score}/100: ${page.focus} (${analysisWarnings(analysis) || analysis.blockingIssues.join("؛ ") || "non-publishable"}).`);
  }
  if ([...candidate.record.content].length < 900) {
    errors.push(`Page visible content is shorter than 900 characters: ${page.focus}`);
  }
}

for (const [index, article] of gapArticles.entries()) {
  const page = gapPages[article.pageIndex];
  if (!page) continue;
  const candidate = makeArticleRecord(article, page, index, postOrder);
  articleCandidates.push(candidate);
  const slug = candidate.record.slug;

  if (!isRankMathProjectSearchPhrase(article.focus)) {
    errors.push(`Article focus phrase is not accepted by project SEO policy: ${article.focus}`);
  }
  if (existingPostsByRoute.has(slug)) {
    errors.push(`Article route already exists: /blog/${slug}`);
  }
  if (postRows.some((row) => phraseCollision(article.focus, row))) {
    errors.push(`Exact/contained article focus already appears in an existing article: ${article.focus}`);
  }
  if (pageRows.some((row) => phraseCollision(article.focus, row))) {
    errors.push(`Article focus already appears in an existing SEO page: ${article.focus}`);
  }
  if (!containsPhrase(article.title, article.focus)) {
    errors.push(`Article title does not contain its focus phrase: ${article.focus}`);
  }
  if (!containsPhrase(article.seoDescription, article.focus)) {
    errors.push(`Article meta description does not contain its focus phrase: ${article.focus}`);
  }
  if (codePointLength(article.seoDescription) < 120 || codePointLength(article.seoDescription) > 160) {
    errors.push(`Article meta description must be 120–160 characters: ${article.focus} (${codePointLength(article.seoDescription)}).`);
  }
  if (article.sections.length < 5) {
    errors.push(`Article needs at least five substantive sections: ${article.focus}`);
  }
  if (!containsPhrase(candidate.record.content, article.secondary)) {
    errors.push(`Article content does not include the secondary phrase: ${article.secondary}`);
  }
  if (!existsSync(join(IMAGE_DIR, article.imageSource))) {
    errors.push(`Article image source is missing: ${article.imageSource}`);
  }

  const analysis = analyzeRankMathSeo(buildBlogPostRankMathInput({
    title: candidate.record.title,
    slug: candidate.record.slug,
    seoSlug: candidate.record.seo_slug,
    content: candidate.record.content,
    seoTitle: candidate.record.seo_title,
    seoDescription: candidate.record.seo_description,
    seoKeywords: candidate.record.seo_keywords,
    canonicalUrl: candidate.record.canonical_url,
  }));
  candidate.analysis = analysis;
  if (analysis.score !== 100 || !analysis.publishable) {
    errors.push(`Article Rank Math result is ${analysis.score}/100: ${article.focus} (${analysisWarnings(analysis) || analysis.blockingIssues.join("؛ ") || "non-publishable"}).`);
  }
  if (analysis.wordCount < 380) {
    errors.push(`Article is shorter than the 380-word target: ${article.focus} (${analysis.wordCount} words).`);
  }
}

const pageSlugs = pageCandidates.map(({ record }) => record.slug);
const articleSlugs = articleCandidates.map(({ record }) => record.slug);
if (new Set(pageSlugs).size !== pageSlugs.length) errors.push("Generated SEO page slugs are not unique.");
if (new Set(articleSlugs).size !== articleSlugs.length) errors.push("Generated article slugs are not unique.");

const imagesToCopy = pageCandidates.map(({ source, record }) => ({
  source: join(IMAGE_DIR, source.imageSource),
  target: join(SEO_IMAGE_DIR, `${record.slug}.jpg`),
}));
for (const image of imagesToCopy) {
  if (existsSync(image.target) && digest(image.source) !== digest(image.target)) {
    errors.push(`Page image target exists with different content; refusing to overwrite: ${image.target}`);
  }
}

const summary = {
  mode: applyChanges ? "apply" : "read-only dry run",
  brand: siteBrandName,
  existing: {
    activeSeoPages: pageRows.filter((row) => row.status === "published" && row.is_active === 1).length,
    activePosts: postRows.filter((row) => row.status === "published" && row.is_active === 1).length,
    activeServices: activeServices.size,
  },
  planned: {
    pages: pageCandidates.length,
    articles: articleCandidates.length,
    distinctSeoImages: new Set(imagesToCopy.map((image) => image.target)).size,
    pageScores: pageCandidates.map(({ source, analysis }) => ({ focus: source.focus, score: analysis?.score })),
    articleScores: articleCandidates.map(({ source, analysis }) => ({ focus: source.focus, score: analysis?.score, words: analysis?.wordCount })),
  },
  errors,
};

db.close();
console.log(JSON.stringify(summary, null, 2));

if (errors.length) process.exitCode = 1;
else if (applyChanges) {
  const writableDb = new Database(DB_PATH);
  const copiedTargets = [];
  try {
    mkdirSync(SEO_IMAGE_DIR, { recursive: true });
    for (const image of imagesToCopy) {
      if (existsSync(image.target)) continue;
      copyFileSync(image.source, image.target);
      copiedTargets.push(image.target);
    }

    const insertPage = writableDb.prepare(`
      INSERT INTO seo_pages
        (title, slug, target_keyword, content, excerpt, cover_image, category, tags, status,
         published_at, is_active, "order", seo_title, seo_description, seo_keywords,
         seo_slug, og_image, canonical_url, created_at, updated_at)
      VALUES
        (@title, @slug, @target_keyword, @content, @excerpt, @cover_image, @category, @tags, @status,
         @published_at, @is_active, @order, @seo_title, @seo_description, @seo_keywords,
         @seo_slug, @og_image, @canonical_url, @created_at, @updated_at)
    `);
    const insertPost = writableDb.prepare(`
      INSERT INTO posts
        (title, slug, content, excerpt, cover_image, author, category, tags, status,
         published_at, read_time, is_active, "order", seo_title, seo_description,
         seo_keywords, seo_slug, og_image, canonical_url, created_at, updated_at)
      VALUES
        (@title, @slug, @content, @excerpt, @cover_image, @author, @category, @tags, @status,
         @published_at, @read_time, @is_active, @order, @seo_title, @seo_description,
         @seo_keywords, @seo_slug, @og_image, @canonical_url, @created_at, @updated_at)
    `);

    writableDb.transaction(() => {
      for (const { record } of pageCandidates) insertPage.run(record);
      for (const { record } of articleCandidates) insertPost.run(record);
      const pageCheck = writableDb.prepare(
        "SELECT COUNT(*) AS count FROM seo_pages WHERE slug IN (" + pageSlugs.map(() => "?").join(",") + ")",
      ).get(...pageSlugs).count;
      const articleCheck = writableDb.prepare(
        "SELECT COUNT(*) AS count FROM posts WHERE slug IN (" + articleSlugs.map(() => "?").join(",") + ")",
      ).get(...articleSlugs).count;
      if (pageCheck !== gapPages.length || articleCheck !== gapArticles.length) {
        throw new Error(`Post-insert verification failed (${pageCheck} pages, ${articleCheck} articles).`);
      }
    })();
    console.log(`Inserted ${pageCandidates.length} SEO pages and ${articleCandidates.length} articles; copied ${copiedTargets.length} unique page images.`);
    const syncResult = syncSeoContentReference();
    console.log(
      `Updated SEO content reference: ${syncResult.snapshot.pages.activePublished} active published pages, ` +
      `${syncResult.snapshot.posts.activePublished} active published articles, ` +
      `${syncResult.snapshot.services.activePublished} active services.`,
    );
  } catch (error) {
    for (const path of copiedTargets) rmSync(path, { force: true });
    throw error;
  } finally {
    writableDb.close();
  }
}
