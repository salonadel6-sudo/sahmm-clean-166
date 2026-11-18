import { Router, Request, Response } from "express";
import { gunzipSync } from "node:zlib";
import { db, servicesTable, postsTable, seoPagesTable, siteSettingsTable } from "@workspace/db";
import { asc, and, eq, desc } from "drizzle-orm";
import {
  GetSeoHtmlInventoryResponse,
  GetLatestSeoAuditReportResponse,
  SaveLatestSeoAuditReportBody,
  SaveLatestSeoAuditReportResponse,
} from "@workspace/api-zod";
import {
  applySeoPageOverrideToHtml,
  isSeoPageHtmlIndexable,
  normalizeSeoOverridePath,
  sanitizeSeoOverrideText,
  SEO_PAGE_OVERRIDE_SETTING_PREFIX,
} from "@workspace/seo-rank-math";
import type { SeoPageOverride } from "@workspace/seo-rank-math";
import { randomUUID } from "node:crypto";
import fs from "fs";
import path from "path";
import { getSetting } from "./settings";
import { requireAdmin, requireSectionPermission } from "../middleware/adminAuth";
import seoPagePolicy from "../../../../lib/seo-page-policy.json";
import { getSiteOrigin } from "../lib/siteOrigin";

const router = Router();
const SEO_AUDIT_REPORT_SETTING = "seo_site_audit_report";
const SEO_AUDIT_REPORT_MAX_BYTES = 5_500_000;
const SEO_AUDIT_REPORT_MAX_EXPANDED_BYTES = 32_000_000;

function isCompressedSeoAuditReport(value: unknown): value is {
  storageEncoding: "gzip-base64-v1";
  completedAt: string;
  payload: string;
} {
  return typeof value === "object"
    && value !== null
    && "storageEncoding" in value
    && value.storageEncoding === "gzip-base64-v1"
    && "completedAt" in value
    && typeof value.completedAt === "string"
    && "payload" in value
    && typeof value.payload === "string"
    && value.payload.length > 0;
}

// Path to the frontend public folder (api-server cwd = artifacts/api-server)
function getSitemapPath(): string {
  const configuredFrontendDir = process.env.CLEANFLOW_FRONTEND_DIST_DIR?.trim();
  const localFrontendDir = path.resolve(process.cwd(), "../sabaik-almasa/dist/public");
  const frontendDir = [configuredFrontendDir, localFrontendDir]
    .filter((candidate): candidate is string => Boolean(candidate))
    .map(candidate => path.resolve(candidate))
    .find(candidate => fs.existsSync(path.join(candidate, "index.html")));
  if (frontendDir) return path.join(frontendDir, "sitemap.xml");

  const publicDir = process.env.CLEANFLOW_PUBLIC_DIR?.trim();
  const baseDir = publicDir
    ? path.resolve(publicDir)
    : path.resolve(process.cwd(), "../sabaik-almasa/public");
  return path.join(baseDir, "sitemap.xml");
}

/** Sitemap URLs use the active public host, never a preview or local host. */
async function getBaseUrl(req: Request): Promise<string> {
  return getSiteOrigin(req);
}

const NEIGHBORHOODS = [
  { slug: "north-riyadh", name: "شمال الرياض" },
  { slug: "al-malqa", name: "حي الملقا" },
  { slug: "al-yasmin", name: "حي الياسمين" },
  { slug: "al-narjis", name: "حي النرجس" },
  { slug: "al-aarid", name: "حي العارض" },
  { slug: "hittin", name: "حي حطين" },
  { slug: "al-sahafa", name: "حي الصحافة" },
  { slug: "al-nafal", name: "حي النفل" },
  { slug: "al-aqiq", name: "حي العقيق" },
  { slug: "al-rabi", name: "حي الربيع" },
  { slug: "al-ghadeer", name: "حي الغدير" },
  { slug: "al-wadi", name: "حي الوادي" },
  { slug: "al-nada", name: "حي الندى" },
  { slug: "al-falah", name: "حي الفلاح" },
  { slug: "south-riyadh", name: "جنوب الرياض" },
  { slug: "badr", name: "حي بدر" },
  { slug: "al-hair", name: "حي الحائر" },
  { slug: "al-shifa", name: "حي الشفاء" },
  { slug: "al-aziziyah", name: "حي العزيزية" },
  { slug: "al-dar-al-baida", name: "حي الدار البيضاء" },
  { slug: "al-manakh", name: "حي المناخ" },
  { slug: "al-iskan", name: "حي الإسكان" },
  { slug: "east-riyadh", name: "شرق الرياض" },
  { slug: "al-qadesiya", name: "حي القادسية" },
  { slug: "al-naseem", name: "حي النسيم" },
  { slug: "al-rawdah", name: "حي الروضة" },
  { slug: "al-khaleej", name: "حي الخليج" },
  { slug: "al-nahdah", name: "حي النهضة" },
  { slug: "al-manar", name: "حي المنار" },
  { slug: "al-yarmouk", name: "حي اليرموك" },
  { slug: "al-munsiyah", name: "حي المونسية" },
  { slug: "al-hamra", name: "حي الحمراء" },
  { slug: "al-qurtubah", name: "حي قرطبة" },
  { slug: "al-shuhada", name: "حي الشهداء" },
  { slug: "west-riyadh", name: "غرب الرياض" },
  { slug: "al-suwaidi", name: "حي السويدي" },
  { slug: "al-uraija", name: "حي العريجاء" },
  { slug: "dhahrat-laban", name: "حي ظهرة لبن" },
  { slug: "al-hazm", name: "حي الحزم" },
  { slug: "al-badiyah", name: "حي البديعة" },
  { slug: "shubra", name: "حي شبرا" },
  { slug: "al-awali", name: "حي عوالي الرياض" },
  { slug: "central-riyadh", name: "وسط الرياض" },
  { slug: "al-olaya", name: "حي العليا" },
  { slug: "al-sulaimaniya", name: "حي السليمانية" },
  { slug: "al-malaz", name: "حي الملز" },
  { slug: "al-murabba", name: "حي المربع" },
  { slug: "al-batha", name: "حي البطحاء" },
  { slug: "al-wizarat", name: "حي الوزارات" },
  { slug: "al-futah", name: "حي الفوطة" },
];

const LEGACY_PACKAGE_ROUTE_SLUGS: Record<number, string> = {
  1: "tanzeef-shaqaq",
  2: "تنظيف-فلل-بالرياض",
  3: "tanzeef-qosoor",
  4: "tanzeef-qabl-alnaql",
  5: "gaseel-majalis-bukhar",
  6: "jaly-rakham",
  7: "tanzeef-khazanat",
  8: "gaseel-mokeyafat",
  9: "mokafahat-hasharat",
  10: "تنظيف-بعد-التشطيب-بالرياض",
  11: "تنظيف-واجهات-مباني-بالرياض",
  12: "tanzeef-masajid",
  13: "shahadat-salama",
  14: "تركيب-أنظمة-حريق-بالرياض",
  15: "taqreer-fanni-fawri",
  16: "taqreer-fanni-ghayr-fawri",
  17: "aqd-siyana-difaa-madani",
};

const SEO_PAGE_MIN_CONTENT_CHARS = seoPagePolicy.minimumVisibleContentCharacters;
const UNSUPPORTED_SEO_TOPIC_PATTERNS = seoPagePolicy.unsupportedTopicPatterns.map(pattern => new RegExp(pattern, "iu"));
const CLEANING_SEO_TOPIC_PATTERNS = seoPagePolicy.supportedServiceTopicPatterns.map(pattern => new RegExp(pattern, "iu"));

router.get(
  "/admin/seo-audit/latest",
  requireAdmin,
  requireSectionPermission("seo"),
  async (req, res): Promise<void> => {
    res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    try {
      const [saved] = await db
        .select()
        .from(siteSettingsTable)
        .where(eq(siteSettingsTable.key, SEO_AUDIT_REPORT_SETTING));
      let report: unknown = null;
      if (saved?.value) {
        try {
          report = JSON.parse(saved.value);
        } catch (error) {
          req.log.warn({ err: error }, "Stored SEO audit report is not valid JSON");
        }
      }
      const response = GetLatestSeoAuditReportResponse.parse({
        report,
        savedAt: saved?.updatedAt ?? null,
      });
      res.json(response);
    } catch (error) {
      req.log.error({ err: error }, "Could not load the latest SEO audit report");
      res.status(500).json({ error: "تعذر تحميل آخر نتيجة لفحص SEO." });
    }
  },
);

router.put(
  "/admin/seo-audit/latest",
  requireAdmin,
  requireSectionPermission("seo"),
  async (req, res): Promise<void> => {
    res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    const parsed = SaveLatestSeoAuditReportBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات نتيجة فحص SEO غير مكتملة أو غير صالحة." });
      return;
    }

    const storedReport = parsed.data.report;
    const serialized = JSON.stringify(storedReport);
    if (Buffer.byteLength(serialized, "utf8") > SEO_AUDIT_REPORT_MAX_BYTES) {
      res.status(413).json({ error: "حجم نتيجة فحص SEO يتجاوز الحد المسموح للتخزين." });
      return;
    }
    if (isCompressedSeoAuditReport(storedReport)) {
      try {
        const expanded = gunzipSync(Buffer.from(storedReport.payload, "base64"), {
          maxOutputLength: SEO_AUDIT_REPORT_MAX_EXPANDED_BYTES,
        });
        const expandedReport: unknown = JSON.parse(expanded.toString("utf8"));
        const expandedValidation = SaveLatestSeoAuditReportBody.safeParse({ report: expandedReport });
        if (
          !expandedValidation.success
          || isCompressedSeoAuditReport(expandedValidation.data.report)
          || Date.parse(storedReport.completedAt) !== Date.parse(
            expandedValidation.data.report.completedAt instanceof Date
              ? expandedValidation.data.report.completedAt.toISOString()
              : String(expandedValidation.data.report.completedAt),
          )
        ) {
          res.status(400).json({ error: "النسخة المضغوطة من نتيجة الفحص غير صالحة." });
          return;
        }
      } catch {
        res.status(400).json({ error: "تعذر التحقق من النسخة المضغوطة لنتيجة الفحص." });
        return;
      }
    }

    const savedAt = new Date().toISOString();
    try {
      await db
        .insert(siteSettingsTable)
        .values({
          key: SEO_AUDIT_REPORT_SETTING,
          value: serialized,
          updatedAt: savedAt,
        })
        .onConflictDoUpdate({
          target: siteSettingsTable.key,
          set: { value: serialized, updatedAt: savedAt },
        });
      res.json(SaveLatestSeoAuditReportResponse.parse({ ok: true, savedAt }));
    } catch (error) {
      req.log.error({ err: error }, "Could not save the latest SEO audit report");
      res.status(500).json({ error: "تعذر حفظ نتيجة فحص SEO." });
    }
  },
);

function isIndexableSeoPage(page: any): boolean {
  const intentText = [page.title, page.target_keyword, page.targetKeyword, page.seo_title, page.seoTitle]
    .filter(Boolean)
    .join(" ");
  const contentChars = [...String(page.content || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  ].length;
  if (UNSUPPORTED_SEO_TOPIC_PATTERNS.some(pattern => pattern.test(intentText))) return false;
  if (!CLEANING_SEO_TOPIC_PATTERNS.some(pattern => pattern.test(intentText))) return false;
  if (contentChars < SEO_PAGE_MIN_CONTENT_CHARS) return false;

  const configuredCanonical = String(page.canonical_url || page.canonicalUrl || "").trim();
  if (configuredCanonical) {
    try {
      const canonicalUrl = configuredCanonical.startsWith("/")
        ? new URL(configuredCanonical, "http://origin.invalid")
        : new URL(configuredCanonical);
      const canonicalPath = decodeURIComponent(canonicalUrl.pathname);
      if (canonicalPath !== `/page/${page.slug || ""}`) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export function getPackageRouteSlug(pkg: { id?: number; seoSlug?: string }): string {
  return (pkg.id ? LEGACY_PACKAGE_ROUTE_SLUGS[pkg.id] : undefined) || pkg.seoSlug || "";
}

function getPublicHtmlPaths(): string[] {
  const publicRoot = path.dirname(getSitemapPath());
  if (!fs.existsSync(publicRoot) || !fs.statSync(publicRoot).isDirectory()) {
    throw new Error("تعذر العثور على مجلد ملفات الموقع المنشورة.");
  }

  const paths: string[] = [];
  const visit = (directory: string, relativeDirectory = ""): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath, relativePath);
        continue;
      }
      if (!entry.isFile() || !/\.html?$/iu.test(entry.name)) continue;

      const normalized = relativePath.replace(/\\/gu, "/");
      const route = normalized === "index.html"
        ? "/"
        : normalized.endsWith("/index.html")
          ? `/${normalized.slice(0, -"index.html".length)}`
          : `/${normalized.replace(/\.html?$/iu, "")}`;
      paths.push(route);
      if (paths.length > 20_000) {
        throw new Error("تجاوز عدد ملفات HTML الحد الآمن للتدقيق.");
      }
    }
  };

  visit(publicRoot);
  return [...new Set(paths)].sort((left, right) => left.localeCompare(right));
}

router.get(
  "/admin/seo-audit/html-inventory",
  requireAdmin,
  requireSectionPermission("seo"),
  async (req, res): Promise<void> => {
    res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    try {
      const response = GetSeoHtmlInventoryResponse.parse({
        generatedAt: new Date().toISOString(),
        paths: getPublicHtmlPaths(),
      });
      res.json(response);
    } catch (error) {
      req.log.error({ err: error }, "Could not list generated HTML for the SEO audit");
      res.status(500).json({ error: "تعذر قراءة ملفات HTML المنشورة للتدقيق." });
    }
  },
);

function getStaticPages(base: string, siteName: string) {
  return [
    { path: "/",                               priority: "1.0",  freq: "weekly",  images: [
      { loc: `${base}/brand-icon.png`, title: `${siteName} — شعار الشركة` },
      { loc: `${base}/images/logo.png`,    title: `شعار ${siteName}` },
    ]},
    { path: "/about",                          priority: "0.9",  freq: "monthly", images: [
      { loc: `${base}/images/service-majlis.jpg`, title: `رسالة الإدارة — ${siteName}` },
    ]},
    { path: "/services",                       priority: "0.95", freq: "weekly", images: [] },
    { path: "/cleaning-packages",              priority: "0.9",  freq: "monthly", images: [
      { loc: `${base}/images/service-apartments.jpg`, title: "خدمة تنظيف الشقق — شركة تنظيف بالرياض" },
      { loc: `${base}/images/service-villas.jpg`, title: "خدمة تنظيف الفلل — شركة تنظيف بالرياض" },
    ]},
    { path: "/contact/" + encodeURIComponent("شركة-تنظيف-بالرياض"), priority: "0.85", freq: "monthly", images: [] },
    { path: "/areas",                          priority: "0.85", freq: "monthly", images: [] },
    { path: "/faq/" + encodeURIComponent("تنظيف-المنازل-بالرياض"), priority: "0.8", freq: "monthly", images: [] },
    { path: "/terms",                          priority: "0.6",  freq: "monthly", images: [] },
    { path: "/privacy",                        priority: "0.6",  freq: "monthly", images: [] },
    { path: "/call-now",                       priority: "0.75", freq: "monthly", images: [] },
  ];
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSitemapFileSet(
  xml: string,
  siteUrl: string,
  splitEnabled: boolean,
  urlsPerFile: number,
  lastmod: string,
): { xml: string; files: Array<{ filename: string; xml: string; urlCount: number }> } {
  const root = xml.match(/<urlset\b[\s\S]*?<\/urlset>/iu)?.[0];
  if (!root) throw new Error("تعذر تقسيم خريطة الموقع: عنصر urlset غير مكتمل");
  const urlBlocks = [...root.matchAll(/<url\b[^>]*>[\s\S]*?<\/url>/giu)].map(match => match[0]);
  if (!splitEnabled || urlBlocks.length <= urlsPerFile) return { xml, files: [] };

  const opening = root.match(/^<urlset\b[\s\S]*?>/iu)?.[0];
  if (!opening) throw new Error("تعذر قراءة ترويسة خريطة الموقع");
  const prefix = xml.slice(0, xml.indexOf(root));
  const files: Array<{ filename: string; xml: string; urlCount: number }> = [];
  for (let offset = 0; offset < urlBlocks.length; offset += urlsPerFile) {
    const filename = `sitemap${files.length + 1}.xml`;
    const blocks = urlBlocks.slice(offset, offset + urlsPerFile);
    files.push({
      filename,
      urlCount: blocks.length,
      xml: `${prefix.trimEnd()}\n${opening}\n\n${blocks.join("\n\n")}\n\n</urlset>\n`,
    });
  }
  const entries = files.map(file => [
    "  <sitemap>",
    `    <loc>${escapeXml(`${siteUrl}/${file.filename}`)}</loc>`,
    `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
    "  </sitemap>",
  ].join("\n")).join("\n");
  const indexXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    "</sitemapindex>",
    "",
  ].join("\n");
  return { xml: indexXml, files };
}

async function buildXml(baseUrl: string): Promise<{
  xml: string;
  siteUrl: string;
  totalUrls: number;
  staticPages: number;
  areaPages: number;
  servicePages: number;
  containerPages: number;
  blogPages: number;
  seoPages: number;
  files: Array<{ filename: string; xml: string; urlCount: number }>;
  splitEnabled: boolean;
  urlsPerFile: number;
}> {
  const today = new Date().toISOString().slice(0, 10);
  const siteName = (await getSetting("company_name")).trim() || "الشركة";
  const splitSetting = (await getSetting("sitemap_split_enabled")).trim().toLowerCase();
  const splitEnabled = !["false", "0", "no"].includes(splitSetting);
  const rawUrlsPerFile = (await getSetting("sitemap_urls_per_file")).trim();
  const parsedUrlsPerFile = /^\d+$/.test(rawUrlsPerFile) ? Number(rawUrlsPerFile) : Number.NaN;
  const urlsPerFile = Number.isInteger(parsedUrlsPerFile)
    ? Math.max(1, Math.min(500, parsedUrlsPerFile))
    : 500;
  const STATIC_PAGES = getStaticPages(baseUrl, siteName);

  // Every active service with a public slug is indexable. The legacy
  // seo_enabled flag remains an editorial field, not a robots/sitemap gate.
  let seoServices: Array<{ seoSlug: string; seoTitle: string; images: string; title: string }> = [];
  try {
    const rows = await db.select().from(servicesTable).orderBy(asc(servicesTable.order));
    seoServices = (rows as any[])
      .filter(r => (r.is_active ?? r.isActive ?? true) && (r.seo_slug || r.seoSlug))
      .map(r => ({
        seoSlug:  r.seo_slug  || r.seoSlug  || "",
        seoTitle: r.seo_title || r.seoTitle  || r.title || "",
        images:   r.images ?? "[]",
        title:    r.title || "",
      }))
      .filter(r => r.seoSlug);
  } catch {}

  // Fetch published blog posts
  let blogPosts: Array<{ slug: string; title: string; coverImage: string; publishedAt: string | null; updatedAt: string }> = [];
  try {
    const rows = await db
      .select()
      .from(postsTable)
      .where(and(eq(postsTable.status, "published"), eq(postsTable.isActive, true)))
      .orderBy(desc(postsTable.publishedAt));
    blogPosts = (rows as any[]).map(r => ({
      slug:        r.slug || "",
      title:       r.title || "",
      coverImage:  r.cover_image || r.coverImage || "",
      publishedAt: r.published_at || r.publishedAt || null,
      updatedAt:   r.updated_at  || r.updatedAt  || today,
    })).filter(r => r.slug);
  } catch {}

  let seoPages: Array<{
    slug: string;
    title: string;
    coverImage: string;
    publishedAt: string | null;
    updatedAt: string;
    targetKeyword: string;
    content: string;
    seoTitle: string;
    canonicalUrl: string;
  }> = [];
  try {
    const rows = await db
      .select()
      .from(seoPagesTable)
      .where(and(eq(seoPagesTable.status, "published"), eq(seoPagesTable.isActive, true)))
      .orderBy(desc(seoPagesTable.publishedAt));
    seoPages = (rows as any[])
      .map(r => ({
        slug:        r.slug || r.seo_slug || "",
        title:       r.title || "",
        coverImage:  r.cover_image || r.coverImage || "",
        publishedAt: r.published_at || r.publishedAt || null,
        updatedAt:   r.updated_at || r.updatedAt || today,
        targetKeyword: r.target_keyword || r.targetKeyword || "",
        content:     r.content || "",
        seoTitle:    r.seo_title || r.seoTitle || "",
        canonicalUrl: r.canonical_url || r.canonicalUrl || "",
      }))
      .filter(r => isIndexableSeoPage(r))
      .filter(r => r.slug);
  } catch {}

  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
    `        xmlns:xhtml="http://www.w3.org/1999/xhtml"`,
    `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
    ``,
  ];

  // Static pages
  for (const page of STATIC_PAGES) {
    lines.push(`  <url>`);
    lines.push(`    <loc>${escapeXml(baseUrl + page.path)}</loc>`);
    lines.push(`    <lastmod>${today}</lastmod>`);
    lines.push(`    <changefreq>${page.freq}</changefreq>`);
    lines.push(`    <priority>${page.priority}</priority>`);
    lines.push(`    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(baseUrl + page.path)}"/>`);
    for (const img of page.images) {
      lines.push(`    <image:image>`);
      lines.push(`      <image:loc>${escapeXml(img.loc)}</image:loc>`);
      lines.push(`      <image:title>${escapeXml(img.title)}</image:title>`);
      lines.push(`    </image:image>`);
    }
    lines.push(`  </url>`);
    lines.push(``);
  }

  const fixedPaths = new Set([
    ...STATIC_PAGES.map(page => {
      try { return decodeURIComponent(page.path).replace(/\/+$/u, "") || "/"; } catch { return page.path; }
    }),
    ...NEIGHBORHOODS.map(area => `/areas/${area.slug}`),
  ]);
  let editableOverrides: SeoPageOverride[] = [];
  try {
    const settingsRows = await db.select().from(siteSettingsTable);
    editableOverrides = settingsRows
      .filter(row => row.key.startsWith(SEO_PAGE_OVERRIDE_SETTING_PREFIX))
      .map(row => {
        const routePath = normalizeSeoOverridePath(row.key.slice(SEO_PAGE_OVERRIDE_SETTING_PREFIX.length));
        return routePath ? getSeoPageOverrideFromSetting(row.value, routePath) : null;
      })
      .filter((row): row is SeoPageOverride => Boolean(row?.sitemapEligible && row.path && !fixedPaths.has(row.path)));
  } catch {}
  for (const override of editableOverrides) {
    const encodedPath = `/${override.path.slice(1).split("/").map(segment => encodeURIComponent(segment)).join("/")}`;
    const url = `${baseUrl}${encodedPath}`;
    lines.push(`  <!-- صفحة ثابتة محررة: ${escapeXml(override.path)} -->`);
    lines.push(`  <url>`);
    lines.push(`    <loc>${escapeXml(url)}</loc>`);
    lines.push(`    <lastmod>${escapeXml((override.updatedAt || today).slice(0, 10))}</lastmod>`);
    lines.push(`    <changefreq>monthly</changefreq>`);
    lines.push(`    <priority>${override.path.startsWith("/areas/") ? "0.80" : "0.70"}</priority>`);
    lines.push(`    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(url)}"/>`);
    lines.push(`  </url>`);
    lines.push(``);
  }

  // Area pages are included only when backed by authored local data.
  for (const n of NEIGHBORHOODS) {
    const url = `${baseUrl}/areas/${n.slug}`;
    lines.push(`  <!-- حي: ${n.name} -->`);
    lines.push(`  <url>`);
    lines.push(`    <loc>${escapeXml(url)}</loc>`);
    lines.push(`    <lastmod>${today}</lastmod>`);
    lines.push(`    <changefreq>monthly</changefreq>`);
    lines.push(`    <priority>0.80</priority>`);
    lines.push(`    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(url)}"/>`);
    lines.push(`    <image:image>`);
    lines.push(`      <image:loc>${escapeXml(baseUrl + "/images/service-apartments.jpg")}</image:loc>`);
      lines.push(`      <image:title>${escapeXml(`خدمات تنظيف المنازل في ${n.name} بالرياض`)}</image:title>`);
    lines.push(`    </image:image>`);
    lines.push(`  </url>`);
    lines.push(``);
  }

  // Dynamic container pages
  let seoCleaningPackages: Array<{ id?: number; seoSlug: string; seoTitle: string; images: string; title: string }> = [];
  try {
    const client = (db as any).$client;
    const crows = client.prepare(`
      SELECT id, seo_slug, seo_title, images, name
      FROM containers
      WHERE is_active = 1 AND seo_slug IS NOT NULL AND seo_slug <> ''
      ORDER BY "order" ASC
    `).all();
    seoCleaningPackages = (crows as any[])
      .map(r => ({
        id:       r.id,
        seoSlug:  r.seo_slug || "",
        seoTitle: r.seo_title || r.name || "",
        images:   r.images ?? "[]",
        title:    r.name || "",
      }))
      .filter(r => r.seoSlug);
  } catch {}

  // Dynamic service pages
  for (const svc of seoServices) {
    const url = `${baseUrl}/services/${encodeURIComponent(svc.seoSlug)}`;
    let imgs: Array<{ loc: string; title: string }> = [];
    try {
      const parsed: string[] = JSON.parse(svc.images || "[]");
      imgs = parsed
        .filter(u => u.trim())
        .slice(0, 3)
        .map((u, i) => ({
          loc:   u.startsWith("http") ? u : baseUrl + u,
          title: `${svc.seoTitle} — صورة ${i + 1}`,
        }));
    } catch {}

    lines.push(`  <!-- خدمة: ${svc.title} -->`);
    lines.push(`  <url>`);
    lines.push(`    <loc>${escapeXml(url)}</loc>`);
    lines.push(`    <lastmod>${today}</lastmod>`);
    lines.push(`    <changefreq>monthly</changefreq>`);
    lines.push(`    <priority>0.85</priority>`);
    lines.push(`    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(url)}"/>`);
    for (const img of imgs) {
      lines.push(`    <image:image>`);
      lines.push(`      <image:loc>${escapeXml(img.loc)}</image:loc>`);
      lines.push(`      <image:title>${escapeXml(img.title)}</image:title>`);
      lines.push(`    </image:image>`);
    }
    lines.push(`  </url>`);
    lines.push(``);
  }

  // Dynamic container pages
  for (const c of seoCleaningPackages) {
    const url = `${baseUrl}/cleaning-packages/${encodeURIComponent(getPackageRouteSlug(c))}`;
    let imgs: Array<{ loc: string; title: string }> = [];
    try {
      const parsed: string[] = JSON.parse(c.images || "[]");
      imgs = parsed
        .filter(u => u.trim())
        .slice(0, 3)
        .map((u, i) => ({
          loc:   u.startsWith("http") ? u : baseUrl + u,
          title: `${c.seoTitle} — صورة ${i + 1}`,
        }));
    } catch {}

    lines.push(`  <!-- باقة: ${c.title} -->`);
    lines.push(`  <url>`);
    lines.push(`    <loc>${escapeXml(url)}</loc>`);
    lines.push(`    <lastmod>${today}</lastmod>`);
    lines.push(`    <changefreq>monthly</changefreq>`);
    lines.push(`    <priority>0.85</priority>`);
    lines.push(`    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(url)}"/>`);
    for (const img of imgs) {
      lines.push(`    <image:image>`);
      lines.push(`      <image:loc>${escapeXml(img.loc)}</image:loc>`);
      lines.push(`      <image:title>${escapeXml(img.title)}</image:title>`);
      lines.push(`    </image:image>`);
    }
    lines.push(`  </url>`);
    lines.push(``);
  }

  // Blog listing page
  lines.push(`  <url>`);
  lines.push(`    <loc>${escapeXml(baseUrl + "/blog")}</loc>`);
  lines.push(`    <lastmod>${today}</lastmod>`);
  lines.push(`    <changefreq>weekly</changefreq>`);
  lines.push(`    <priority>0.8</priority>`);
  lines.push(`    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(baseUrl + "/blog")}"/>`);
  lines.push(`  </url>`);
  lines.push(``);

  // Individual blog posts
  for (const post of blogPosts) {
    const url     = `${baseUrl}/blog/${encodeURIComponent(post.slug)}`;
    const lastmod = (post.updatedAt || post.publishedAt || today).slice(0, 10);
    lines.push(`  <!-- مقالة: ${post.title} -->`);
    lines.push(`  <url>`);
    lines.push(`    <loc>${escapeXml(url)}</loc>`);
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push(`    <changefreq>monthly</changefreq>`);
    lines.push(`    <priority>0.75</priority>`);
    lines.push(`    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(url)}"/>`);
    if (post.coverImage) {
      const imgLoc = post.coverImage.startsWith("http") ? post.coverImage : `${baseUrl}${post.coverImage}`;
      lines.push(`    <image:image>`);
      lines.push(`      <image:loc>${escapeXml(imgLoc)}</image:loc>`);
      lines.push(`      <image:title>${escapeXml(post.title)}</image:title>`);
      lines.push(`    </image:image>`);
    }
    lines.push(`  </url>`);
    lines.push(``);
  }

  // Standalone SEO landing pages
  for (const page of seoPages) {
    const url = `${baseUrl}/page/${encodeURIComponent(page.slug)}`;
    const lastmod = (page.updatedAt || page.publishedAt || today).slice(0, 10);
    lines.push(`  <!-- صفحة SEO: ${page.title} -->`);
    lines.push(`  <url>`);
    lines.push(`    <loc>${escapeXml(url)}</loc>`);
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push(`    <changefreq>monthly</changefreq>`);
    lines.push(`    <priority>0.82</priority>`);
    lines.push(`    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(url)}"/>`);
    if (page.coverImage) {
      const imgLoc = page.coverImage.startsWith("http") ? page.coverImage : `${baseUrl}${page.coverImage}`;
      lines.push(`    <image:image>`);
      lines.push(`      <image:loc>${escapeXml(imgLoc)}</image:loc>`);
      lines.push(`      <image:title>${escapeXml(page.title)}</image:title>`);
      lines.push(`    </image:image>`);
    }
    lines.push(`  </url>`);
    lines.push(``);
  }

  lines.push(`</urlset>`);

  const staticCount = STATIC_PAGES.length + editableOverrides.length;
  const areaCount   = NEIGHBORHOODS.length;
  const totalUrls = staticCount + areaCount + 1 + seoServices.length + seoCleaningPackages.length + blogPosts.length + seoPages.length;
  const fileSet = buildSitemapFileSet(lines.join("\n"), baseUrl, splitEnabled, urlsPerFile, today);
  return {
    xml: fileSet.xml,
    siteUrl: baseUrl,
    totalUrls,
    staticPages:    staticCount,
    areaPages:      areaCount,
    servicePages:   seoServices.length,
    containerPages: seoCleaningPackages.length,
    blogPages:      blogPosts.length + 1, // +1 for /blog listing
    seoPages:      seoPages.length,
    files: fileSet.files,
    splitEnabled,
    urlsPerFile,
  };
}

export async function refreshSitemapFile(req?: Request): Promise<Awaited<ReturnType<typeof buildXml>>> {
  const siteUrl = await getSiteOrigin(req);
  const data = await buildXml(siteUrl);
  const dest = getSitemapPath();
  const directory = path.dirname(dest);
  fs.mkdirSync(directory, { recursive: true });
  try {
    for (const file of data.files) {
      const childPath = path.join(directory, file.filename);
      const tempPath = `${childPath}.${process.pid}.${randomUUID()}.tmp`;
      fs.writeFileSync(tempPath, file.xml, "utf8");
      fs.renameSync(tempPath, childPath);
    }
    const tempPath = `${dest}.${process.pid}.${randomUUID()}.tmp`;
    fs.writeFileSync(tempPath, data.xml, "utf8");
    fs.renameSync(tempPath, dest);
    const currentFiles = new Set(data.files.map(file => file.filename));
    for (const filename of fs.readdirSync(directory)) {
      if (/^sitemap[1-9]\d*\.xml$/iu.test(filename) && !currentFiles.has(filename)) {
        fs.rmSync(path.join(directory, filename), { force: true });
      }
    }
  } catch (error) {
    throw error;
  }
  return data;
}

// ── POST /api/admin/sitemap/save ──────────────────────────────────────────────
// Generate sitemap and write it directly to the frontend public folder
router.post(
  "/admin/sitemap/save",
  requireAdmin,
  requireSectionPermission("seo"),
  async (req: Request, res: Response): Promise<void> => {
  try {
    const { siteUrl, totalUrls, staticPages, areaPages, servicePages, containerPages, blogPages, seoPages, files, splitEnabled, urlsPerFile } =
      await refreshSitemapFile(req);
    res.json({
      ok: true,
      summary: {
        siteUrl,
        totalUrls,
        staticPages,
        areaPages,
        servicePages,
        containerPages,
        blogPages,
        seoPages,
        splitEnabled,
        urlsPerFile,
        sitemapFiles: ["sitemap.xml", ...files.map(file => file.filename)],
        shardCount: files.length,
        generatedAt: new Date().toISOString().slice(0, 10),
        savedTo: "/sitemap.xml",
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل حفظ الخريطة" });
  }
  },
);

// ── GET /api/sitemap/generate ─────────────────────────────────────────────────
// Preview only — returns the XML string (used by the panel preview section)
router.get("/sitemap/generate", async (req: Request, res: Response): Promise<void> => {
  try {
    const baseUrl = await getBaseUrl(req);
    const data = await buildXml(baseUrl);
    res.json({ ...data, generatedAt: new Date().toISOString().slice(0, 10) });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "فشل توليد الخريطة" });
  }
});

function getSeoPageOverrideFromSetting(rawValue: string | undefined, routePath: string): SeoPageOverride | null {
  if (!rawValue) return null;
  try {
    const value = JSON.parse(rawValue) as Partial<SeoPageOverride>;
    if (normalizeSeoOverridePath(String(value.path ?? "")) !== routePath) return null;
    return {
      path: routePath,
      seoTitle: sanitizeSeoOverrideText(value.seoTitle, 180),
      description: sanitizeSeoOverrideText(value.description, 500),
      focusKeyword: sanitizeSeoOverrideText(value.focusKeyword, 200),
      h1: sanitizeSeoOverrideText(value.h1, 220),
      content: sanitizeSeoOverrideText(value.content),
      sitemapEligible: value.sitemapEligible === true,
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : undefined,
    };
  } catch {
    return null;
  }
}

function getSeoPageOverrideHtmlPath(routePath: string): string {
  const publicRoot = path.resolve(path.dirname(getSitemapPath()));
  const segments = routePath === "/" ? [] : routePath.slice(1).split("/");
  const htmlPath = path.resolve(publicRoot, ...segments, "index.html");
  if (!htmlPath.startsWith(`${publicRoot}${path.sep}`)) {
    throw new Error("مسار الصفحة خارج مجلد HTML المنشور.");
  }
  const fileStat = fs.lstatSync(htmlPath);
  if (fileStat.isSymbolicLink() || !fileStat.isFile()) {
    throw new Error("ملف HTML المنشور للصفحة غير صالح.");
  }
  return htmlPath;
}

router.get("/seo-page-overrides", async (req: Request, res: Response): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
  const routePath = normalizeSeoOverridePath(String(req.query.path ?? ""));
  if (!routePath) {
    res.status(400).json({ error: "مسار الصفحة غير مسموح." });
    return;
  }
  try {
    const [row] = await db.select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, `${SEO_PAGE_OVERRIDE_SETTING_PREFIX}${routePath}`));
    res.json({ override: getSeoPageOverrideFromSetting(row?.value, routePath) });
  } catch (error) {
    req.log.error({ err: error }, "Could not read a static SEO page override");
    res.status(500).json({ error: "تعذر تحميل تعديلات الصفحة." });
  }
});

router.get(
  "/admin/seo-audit/page-overrides",
  requireAdmin,
  requireSectionPermission("seo"),
  async (req: Request, res: Response): Promise<void> => {
    const routePath = normalizeSeoOverridePath(String(req.query.path ?? ""));
    if (!routePath) {
      res.status(400).json({ error: "مسار الصفحة غير مسموح." });
      return;
    }
    try {
      const [row] = await db.select()
        .from(siteSettingsTable)
        .where(eq(siteSettingsTable.key, `${SEO_PAGE_OVERRIDE_SETTING_PREFIX}${routePath}`));
      res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
      res.json({ override: getSeoPageOverrideFromSetting(row?.value, routePath) });
    } catch (error) {
      req.log.error({ err: error }, "Could not read an admin SEO page override");
      res.status(500).json({ error: "تعذر تحميل تعديلات الصفحة." });
    }
  },
);

router.put(
  "/admin/seo-audit/page-overrides",
  requireAdmin,
  requireSectionPermission("seo"),
  async (req: Request, res: Response): Promise<void> => {
    const routePath = normalizeSeoOverridePath(String(req.body?.path ?? ""));
    if (!routePath) {
      res.status(400).json({ error: "مسار الصفحة غير مسموح." });
      return;
    }

    try {
      const key = `${SEO_PAGE_OVERRIDE_SETTING_PREFIX}${routePath}`;
      const [existingRow] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key));
      const existing = getSeoPageOverrideFromSetting(existingRow?.value, routePath);
      const hasValue = (field: string) => Object.prototype.hasOwnProperty.call(req.body ?? {}, field);
      const updatedAt = new Date().toISOString();
      const nextOverride: SeoPageOverride = {
        path: routePath,
        seoTitle: sanitizeSeoOverrideText(hasValue("seoTitle") ? req.body.seoTitle : existing?.seoTitle ?? "", 180),
        description: sanitizeSeoOverrideText(hasValue("description") ? req.body.description : existing?.description ?? "", 500),
        focusKeyword: sanitizeSeoOverrideText(hasValue("focusKeyword") ? req.body.focusKeyword : existing?.focusKeyword ?? "", 200),
        h1: sanitizeSeoOverrideText(hasValue("h1") ? req.body.h1 : existing?.h1 ?? "", 220),
        content: sanitizeSeoOverrideText(hasValue("content") ? req.body.content : existing?.content ?? ""),
        sitemapEligible: existing?.sitemapEligible ?? false,
        updatedAt,
      };
      if (!nextOverride.seoTitle && !nextOverride.description && !nextOverride.focusKeyword && !nextOverride.h1 && !nextOverride.content) {
        res.status(400).json({ error: "أدخل حقلاً واحداً على الأقل قبل الحفظ." });
        return;
      }

      const htmlPath = getSeoPageOverrideHtmlPath(routePath);
      const originalHtml = fs.readFileSync(htmlPath, "utf8");
      nextOverride.sitemapEligible = isSeoPageHtmlIndexable(originalHtml, routePath);
      const updatedHtml = applySeoPageOverrideToHtml(originalHtml, nextOverride);
      const fileStat = fs.statSync(htmlPath);
      const tempPath = `${htmlPath}.${process.pid}.${randomUUID()}.tmp`;
      const value = JSON.stringify(nextOverride);
      try {
        fs.writeFileSync(tempPath, updatedHtml, { encoding: "utf8", mode: fileStat.mode & 0o777 });
        fs.renameSync(tempPath, htmlPath);
        await db.insert(siteSettingsTable)
          .values({ key, value, updatedAt })
          .onConflictDoUpdate({
            target: siteSettingsTable.key,
            set: { value, updatedAt },
          });
      } catch (error) {
        fs.rmSync(tempPath, { force: true });
        const rollbackPath = `${htmlPath}.${process.pid}.${randomUUID()}.rollback`;
        fs.writeFileSync(rollbackPath, originalHtml, { encoding: "utf8", mode: fileStat.mode & 0o777 });
        fs.renameSync(rollbackPath, htmlPath);
        throw error;
      }

      res.json({ ok: true, override: nextOverride, htmlUpdated: true });
    } catch (error) {
      req.log.error({ err: error }, "Could not save a static SEO page override");
      res.status(500).json({ error: error instanceof Error ? error.message : "تعذر حفظ تعديلات الصفحة المنشورة." });
    }
  },
);

export default router;
