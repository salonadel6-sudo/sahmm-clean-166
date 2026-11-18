import { Router } from "express";
import { db } from "@workspace/db";
import { servicesTable, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin, requireSectionPermission, type AdminRequest } from "../middleware/adminAuth";
import { rankMathPublishingError } from "../lib/rankMathPublishing";
import {
  getSiteOrigin,
  normalizePublicSiteOrigin,
  validatePersistedSiteOrigin,
} from "../lib/siteOrigin";

const router = Router();

function collectHomepageText(value: unknown): string {
  if (typeof value === "string") return /^https?:\/\//iu.test(value) ? "" : value;
  if (Array.isArray(value)) return value.map(collectHomepageText).filter(Boolean).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(collectHomepageText).filter(Boolean).join(" ");
  return "";
}

// Default settings
const DEFAULTS: Record<string, string> = {
  requests_locked: "false",
  requests_locked_message: "عذراً، الطلبات مغلقة مؤقتاً. سيتم استئناف الخدمة قريباً.",
  order_tracking_enabled: "true",
  support_status: "unavailable", // available | busy | unavailable
  support_hours: "السبت — الجمعة 7ص–10م",
  platform_promo_enabled: "true",
  // Company info
  company_name: "",
  company_logo: "",
  // Phone numbers must come from the administrator's saved site settings.
  // An empty fallback prevents chat surfaces from inventing a number.
  company_phones: JSON.stringify([]),
  company_phone_call: "",
  company_phone_whatsapp: "",
  company_email: "",
  company_address: "",
  company_city: "",
  company_region: "",
  company_country: "",
  company_postal_code: "",
  company_latitude: "",
  company_longitude: "",
  company_price_range: "",
  company_payment_methods: "",
  company_map_embed: "",
  site_desc: "",
  site_public_url: "",
  site_public_url_saved: "",
  social_facebook: "https://www.facebook.com/Aiservx",
  social_x: "https://x.com/Aiservx",
  social_instagram: "https://www.instagram.com/Aiservx/",
  social_tiktok: "https://www.tiktok.com/@Aiservx",
  social_snapchat: "https://www.snapchat.com/add/Aiservx",
  social_youtube: "https://www.youtube.com/@Aiservx",
  homepage_content: "{}",
  // Stats bar
  stats_items: JSON.stringify([]),
  sections_order: JSON.stringify([
    "hero",
    "stats",
    "services",
    "packages",
    "about",
    "how_it_works",
    "why_choose_us",
    "areas",
    "values",
    "testimonials",
    "partners",
    "blog",
    "service_request",
    "contact",
  ]),
  sections_hidden: "[]",
  // AI provider credentials belong in environment variables or protected
  // admin settings; never ship credentials in the source tree.
  ai_gemini_key:      process.env.GEMINI_API_KEY ?? "",
  ai_qwen_key:        process.env.QWEN_API_KEY ?? "",
  ai_qwen_host:       process.env.QWEN_API_HOST ?? "",
  ai_qwen_model:      process.env.QWEN_API_MODEL ?? "qwen3-max",
  ai_zhipu_key:       process.env.ZHIPU_API_KEY ?? "",
  ai_provider_order:  JSON.stringify(["gemini", "qwen", "zhipu"]),
  analytics_google_search_weight_enabled: "false",
  sitemap_split_enabled: "true",
  sitemap_urls_per_file: "500",
};

export async function getSetting(key: string): Promise<string> {
  const [row] = await db
    .select()
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, key));
  return row?.value ?? DEFAULTS[key] ?? "";
}

export async function setSetting(key: string, value: string): Promise<void> {
  const existing = await db
    .select()
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, key));

  if (existing.length > 0) {
    await db
      .update(siteSettingsTable)
      .set({ value, updatedAt: new Date().toISOString() })
      .where(eq(siteSettingsTable.key, key));
  } else {
    await db.insert(siteSettingsTable).values({ key, value });
  }
}

const SOCIAL_KEYS = [
  "social_facebook",
  "social_x",
  "social_instagram",
  "social_tiktok",
  "social_snapchat",
  "social_youtube",
];

function applySocialDefaults(map: Record<string, string>): Record<string, string> {
  for (const key of SOCIAL_KEYS) {
    if (!map[key]?.trim()) map[key] = DEFAULTS[key];
  }
  return map;
}

// Keys that must never be exposed in the public /api/settings endpoint
const SENSITIVE_KEYS = new Set([
  "ai_gemini_key",
  "ai_qwen_key",
  "ai_zhipu_key",
  "ai_qwen_host",
  "ai_qwen_model",
  "wa_access_token",
  "wa_webhook_verify_token",
  "vapid_public_key",
  "vapid_private_key",
  "vapid_subject",
  "hostinger_ftp_password",
  "site_public_url_aliases",
]);

function redactSensitive(map: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) {
    out[k] = SENSITIVE_KEYS.has(k) ? (v ? "••••••" : "") : v;
  }
  return out;
}

function parseSiteOriginAliases(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(
      parsed
        .map(normalizePublicSiteOrigin)
        .filter((origin): origin is string => Boolean(origin)),
    )];
  } catch {
    return [];
  }
}

// GET /api/settings — public (frontend reads this)
// Sensitive keys (AI API keys) are redacted; full values only via /api/admin/settings
router.get("/settings", async (req, res) => {
  try {
    const rows = await db.select().from(siteSettingsTable);
    const map: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) {
      if (row.key === "seo_site_audit_report") continue;
      map[row.key] = row.value;
    }
    map.site_public_url_saved = map.site_public_url;
    map.site_public_url = await getSiteOrigin(req);
    return res.json(redactSensitive(applySocialDefaults(map)));
  } catch {
    return res.json(redactSensitive(applySocialDefaults({
      ...DEFAULTS,
      site_public_url: await getSiteOrigin(req),
      site_public_url_saved: "",
    })));
  }
});

// GET /api/admin/settings — admin only, returns full unredacted settings
router.get("/admin/settings", requireAdmin, requireSectionPermission("settings"), async (req, res) => {
  try {
    const rows = await db.select().from(siteSettingsTable);
    const map: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) {
      if (row.key === "seo_site_audit_report") continue;
      map[row.key] = row.value;
    }
    map.site_public_url_saved = map.site_public_url;
    map.site_public_url = await getSiteOrigin(req);
    delete map.site_public_url_aliases;
    return res.json(applySocialDefaults(map));
  } catch {
    return res.json(applySocialDefaults({
      ...DEFAULTS,
      site_public_url: await getSiteOrigin(req),
      site_public_url_saved: "",
    }));
  }
});

// PUT /api/admin/settings — protected (admin only)
// Accepts: requests_locked, requests_locked_message, support_status, seo_* keys
router.put("/admin/settings", requireAdmin, requireSectionPermission("settings"), async (req, res) => {
  try {
    const body: Record<string, unknown> = req.body;
    const adminRequest = req as AdminRequest;
    let siteOriginToSave: string | null = null;
    if (Object.prototype.hasOwnProperty.call(body, "site_public_url")) {
      const activeOrigin = await getSiteOrigin(req);
      siteOriginToSave = validatePersistedSiteOrigin(body.site_public_url, activeOrigin);
      if (!siteOriginToSave) {
        return res.status(400).json({
          error: "افتح لوحة الإدارة من النطاق العام النهائي ثم احفظه؛ لا يمكن حفظ نطاق معاينة أو نطاق مختلف.",
        });
      }
    }

    const homeSeoChanged = ["seo_meta_title", "seo_meta_description", "seo_meta_keywords"]
      .some(key => Object.prototype.hasOwnProperty.call(body, key));
    if (homeSeoChanged) {
      const siteOrigin = await getSiteOrigin(req);
      const existingRows = await db.select().from(siteSettingsTable);
      const currentSettings = Object.fromEntries(existingRows.map(row => [row.key, row.value]));
      const companyName = String(body.company_name ?? currentSettings.company_name ?? "السهم كلين").trim() || "السهم كلين";
      const title = String(body.seo_meta_title ?? currentSettings.seo_meta_title ?? "").trim()
        || `شركة تنظيف بالرياض للمنازل والفلل والمكاتب | ${companyName}`;
      const description = String(body.seo_meta_description ?? currentSettings.seo_meta_description ?? "").trim()
        || String(body.site_desc ?? currentSettings.site_desc ?? "خدمات تنظيف المنازل والفلل والشقق والمكاتب في الرياض.");
      let homepageCopy: unknown = body.homepage_content ?? currentSettings.homepage_content ?? {};
      if (typeof homepageCopy === "string") {
        try { homepageCopy = JSON.parse(homepageCopy); } catch {}
      }
      const serviceRows = await db.select({
        title: servicesTable.title,
        description: servicesTable.description,
      }).from(servicesTable).where(eq(servicesTable.isActive, true));
      const content = [
        title,
        description,
        String(body.site_desc ?? currentSettings.site_desc ?? ""),
        collectHomepageText(homepageCopy),
        ...serviceRows.flatMap(service => [service.title, service.description]),
      ].filter(Boolean).join(" ");
      const publishError = rankMathPublishingError({
        type: "homepage",
        title,
        seoTitle: title,
        description,
        focusKeyword: "شركة تنظيف بالرياض",
        slug: "/",
        canonical: `${siteOrigin}/`,
        expectedCanonical: `${siteOrigin}/`,
        content,
        h1: ["شركة تنظيف بالرياض"],
      });
      if (publishError) return res.status(422).json({ error: publishError });
    }

    // Core settings
    if (body.requests_locked !== undefined) {
      await setSetting("requests_locked", String(body.requests_locked));
    }
    if (body.requests_locked_message !== undefined) {
      await setSetting("requests_locked_message", String(body.requests_locked_message));
    }
    if (body.order_tracking_enabled !== undefined) {
      const value = String(body.order_tracking_enabled);
      if (value !== "true" && value !== "false") {
        return res.status(400).json({ error: "قيمة ظهور تتبع الطلب غير صحيحة" });
      }
      await setSetting("order_tracking_enabled", value);
    }
    if (body.support_status !== undefined) {
      const valid = ["available", "busy", "unavailable"];
      if (!valid.includes(body.support_status as string)) {
        return res.status(400).json({ error: "حالة الدعم غير صحيحة" });
      }
      await setSetting("support_status", body.support_status as string);
    }
    if (body.support_hours !== undefined) {
      await setSetting("support_hours", String(body.support_hours).trim());
    }
    if (body.platform_promo_enabled !== undefined) {
      if (adminRequest.adminRole !== "admin") {
        return res.status(403).json({ error: "هذا الإعداد متاح لمدير النظام فقط" });
      }
      const value = String(body.platform_promo_enabled);
      if (value !== "true" && value !== "false") {
        return res.status(400).json({ error: "قيمة ظهور إعلان المنصة غير صحيحة" });
      }
      await setSetting("platform_promo_enabled", value);
    }
    if (body.analytics_google_search_weight_enabled !== undefined) {
      const value = String(body.analytics_google_search_weight_enabled);
      if (value !== "true" && value !== "false") {
        return res.status(400).json({ error: "قيمة تتبع البحث يجب أن تكون true أو false" });
      }
      await setSetting("analytics_google_search_weight_enabled", value);
    }

    if (body.sitemap_split_enabled !== undefined) {
      const value = String(body.sitemap_split_enabled);
      if (value !== "true" && value !== "false") {
        return res.status(400).json({ error: "قيمة تقسيم خريطة الموقع يجب أن تكون true أو false" });
      }
      await setSetting("sitemap_split_enabled", value);
    }
    if (body.sitemap_urls_per_file !== undefined) {
      const value = Number(body.sitemap_urls_per_file);
      if (!Number.isInteger(value) || value < 1 || value > 500) {
        return res.status(400).json({ error: "حجم خريطة الموقع يجب أن يكون عدداً صحيحاً بين 1 و500" });
      }
      await setSetting("sitemap_urls_per_file", String(value));
    }

    if (siteOriginToSave) {
      const currentSavedOrigin = normalizePublicSiteOrigin(await getSetting("site_public_url"));
      const previousOrigins = parseSiteOriginAliases(await getSetting("site_public_url_aliases"));
      if (currentSavedOrigin && currentSavedOrigin !== siteOriginToSave) {
        previousOrigins.push(currentSavedOrigin);
      }
      const siteOriginAliases = [...new Set(previousOrigins)]
        .filter((origin) => origin !== siteOriginToSave)
        .slice(-20);
      await setSetting("site_public_url_aliases", JSON.stringify(siteOriginAliases));
      await setSetting("site_public_url", siteOriginToSave);
    }

    // SEO keys — any key starting with "seo_" is allowed
    for (const [key, value] of Object.entries(body)) {
      if (key.startsWith("seo_") && value !== undefined) {
        await setSetting(key, String(value));
      }
    }

    // Company info keys
    for (const [key, value] of Object.entries(body)) {
      if (key.startsWith("company_") && value !== undefined) {
        await setSetting(key, String(value));
      }
    }

    // Stats bar
    if (body.stats_items !== undefined) {
      await setSetting("stats_items", String(body.stats_items));
    }

    // Homepage sections order & visibility
    if (body.sections_order !== undefined) {
      await setSetting("sections_order", String(body.sections_order));
    }
    if (body.sections_hidden !== undefined) {
      await setSetting("sections_hidden", String(body.sections_hidden));
    }
    // Hero visibility and placement controls
    for (const [key, value] of Object.entries(body)) {
      if (key.startsWith("hero_") && value !== undefined) {
        await setSetting(key, String(value));
      }
    }

    // AI provider keys (ai_* prefix)
    for (const [key, value] of Object.entries(body)) {
      if (key.startsWith("ai_") && value !== undefined) {
        await setSetting(key, String(value));
      }
    }


    const rows = await db.select().from(siteSettingsTable);
    const map: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) map[row.key] = row.value;
    map.site_public_url_saved = map.site_public_url;
    map.site_public_url = await getSiteOrigin(req);
    delete map.site_public_url_aliases;
    return res.json(applySocialDefaults(map));
  } catch {
    return res.status(500).json({ error: "فشل في تحديث الإعدادات" });
  }
});

export default router;
