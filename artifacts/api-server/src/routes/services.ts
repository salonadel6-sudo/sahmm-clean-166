import { Router } from "express";
import { db } from "@workspace/db";
import { servicesTable, siteSettingsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin, requireSectionPermission } from "../middleware/adminAuth";
import { normalizeSeoKeywords } from "../lib/seoKeywords";
import { rankMathPublishingError, firstRankMathKeyword } from "../lib/rankMathPublishing";
import { buildServiceVisibleContent } from "@workspace/seo-rank-math";
import { refreshSitemapFile } from "./sitemap";
import { getSiteOrigin } from "../lib/siteOrigin";

// ── DB migration: add new columns to existing DB ───────────────────────────────
try {
  const client = (db as any).$client;
  const migrations = [
    "ALTER TABLE services ADD COLUMN images TEXT DEFAULT '[]'",
    "ALTER TABLE services ADD COLUMN seo_enabled INTEGER DEFAULT 0",
    "ALTER TABLE services ADD COLUMN seo_title TEXT DEFAULT ''",
    "ALTER TABLE services ADD COLUMN seo_description TEXT DEFAULT ''",
    "ALTER TABLE services ADD COLUMN seo_keywords TEXT DEFAULT ''",
    "ALTER TABLE services ADD COLUMN seo_slug TEXT DEFAULT ''",
  ];
  for (const sql of migrations) {
    try { client.exec(sql); } catch {}
  }
} catch {}

const router = Router();

function serviceImageAlts(imagesValue: unknown, imageUrl: unknown, title: string): Array<{ alt: string }> {
  let images: unknown[] = [];
  if (Array.isArray(imagesValue)) images = imagesValue;
  else if (typeof imagesValue === "string") {
    try {
      const parsed = JSON.parse(imagesValue);
      if (Array.isArray(parsed)) images = parsed;
    } catch {}
  }
  if (typeof imageUrl === "string" && imageUrl.trim() && !images.includes(imageUrl)) {
    images.unshift(imageUrl);
  }
  return images.filter((image): image is string => typeof image === "string" && image.trim().length > 0)
    .map(() => ({ alt: `${title} بالرياض` }));
}

async function companyNameForSeo(): Promise<string> {
  const [row] = await db.select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, "company_name"))
    .limit(1);
  return row?.value ?? "";
}

function normalizeArabicSlug(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\u0600-\u06FF0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function castRow(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    icon: row.icon,
    imageUrl: row.imageUrl ?? row.image_url ?? null,
    images: row.images ?? "[]",
    order: row.order ?? 0,
    isActive: Boolean(row.isActive ?? row.is_active ?? true),
    seoEnabled: true,
    seoTitle: row.seoTitle ?? row.seo_title ?? "",
    seoDescription: row.seoDescription ?? row.seo_description ?? "",
    seoKeywords: row.seoKeywords ?? row.seo_keywords ?? "",
    seoSlug: row.seoSlug ?? row.seo_slug ?? "",
  };
}

router.get("/services", async (_req, res) => {
  const rows = await db.select().from(servicesTable).orderBy(asc(servicesTable.order));
  return res.json(rows.map(castRow));
});

router.post("/services", requireAdmin, requireSectionPermission("services"), async (req, res) => {
  const { title, description, icon, imageUrl, images, order, isActive,
          seoTitle, seoDescription, seoKeywords, seoSlug } = req.body;
  const slug = normalizeArabicSlug(seoSlug);
  const siteUrl = await getSiteOrigin(req);
  const canonical = slug ? `${siteUrl}/services/${encodeURIComponent(slug)}` : "";
  if (Boolean(isActive ?? true)) {
    const companyName = await companyNameForSeo();
    const editorialContent = buildServiceVisibleContent({
      title: String(title ?? ""),
      description: String(description ?? ""),
      seoDescription: String(seoDescription ?? ""),
      companyName,
      slug,
    });
    const publishError = rankMathPublishingError({
      type: "service",
      title: String(title ?? ""),
      seoTitle: String(seoTitle || title || ""),
      description: String(seoDescription ?? ""),
      focusKeyword: firstRankMathKeyword(seoKeywords),
      slug,
      canonical,
      expectedCanonical: canonical,
      content: editorialContent.contentText,
      h1: title ? [String(title)] : [],
      images: serviceImageAlts(images, imageUrl, String(title ?? "")),
      internalLinks: 2,
      jsonLdValid: true,
    });
    if (publishError) return res.status(422).json({ error: publishError });
  }
  const [service] = await db.insert(servicesTable).values({
    title, description, icon,
    imageUrl: imageUrl || undefined,
    images: images ?? "[]",
    order: order ?? 0,
    isActive: isActive ?? true,
    seoEnabled: true,
    seoTitle: seoTitle ?? "",
    seoDescription: seoDescription ?? "",
    seoKeywords: normalizeSeoKeywords(seoKeywords ?? ""),
     seoSlug: slug,
  }).returning();
  await refreshSitemapFile(req);
  return res.status(201).json(castRow(service));
});

router.patch("/services/:id", requireAdmin, requireSectionPermission("services"), async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { title, description, icon, imageUrl, images, order, isActive,
          seoTitle, seoDescription, seoKeywords, seoSlug } = req.body;
  const [current] = await db.select().from(servicesTable).where(eq(servicesTable.id, id));
  if (!current) return res.status(404).json({ error: "Not found" });
  const nextTitle = title ?? current.title;
  const nextDescription = description ?? current.description;
  const nextIsActive = Boolean(isActive ?? current.isActive);
  const nextSeoTitle = seoTitle ?? current.seoTitle;
  const nextSeoDescription = seoDescription ?? current.seoDescription;
  const nextSeoKeywords = seoKeywords ?? current.seoKeywords;
  const nextSlug = seoSlug !== undefined ? normalizeArabicSlug(seoSlug) : current.seoSlug;
  const siteUrl = await getSiteOrigin(req);
  const expectedCanonical = nextSlug ? `${siteUrl}/services/${encodeURIComponent(String(nextSlug))}` : "";
  const seoInputsChanged =
    (title !== undefined && String(title) !== String(current.title)) ||
    (description !== undefined && String(description) !== String(current.description)) ||
    (imageUrl !== undefined && String(imageUrl) !== String(current.imageUrl ?? "")) ||
    (images !== undefined && String(images) !== String(current.images ?? "[]")) ||
    (seoTitle !== undefined && String(seoTitle) !== String(current.seoTitle ?? "")) ||
    (seoDescription !== undefined && String(seoDescription) !== String(current.seoDescription ?? "")) ||
    (seoKeywords !== undefined && String(seoKeywords) !== String(current.seoKeywords ?? "")) ||
    (seoSlug !== undefined && nextSlug !== String(current.seoSlug ?? ""));
  if (nextIsActive && (seoInputsChanged || !current.isActive)) {
    const companyName = await companyNameForSeo();
    const nextImages = images !== undefined ? images : current.images;
    const nextImageUrl = imageUrl !== undefined ? imageUrl : current.imageUrl;
    const editorialContent = buildServiceVisibleContent({
      title: String(nextTitle ?? ""),
      description: String(nextDescription ?? ""),
      seoDescription: String(nextSeoDescription ?? ""),
      companyName,
      slug: String(nextSlug ?? ""),
    });
    const publishError = rankMathPublishingError({
      type: "service",
      title: String(nextTitle ?? ""),
      seoTitle: String(nextSeoTitle || nextTitle || ""),
      description: String(nextSeoDescription ?? ""),
      focusKeyword: firstRankMathKeyword(nextSeoKeywords),
      slug: String(nextSlug ?? ""),
      canonical: expectedCanonical,
      expectedCanonical,
      content: editorialContent.contentText,
      h1: nextTitle ? [String(nextTitle)] : [],
      images: serviceImageAlts(nextImages, nextImageUrl, String(nextTitle ?? "")),
      internalLinks: 2,
      jsonLdValid: true,
    });
    if (publishError) return res.status(422).json({ error: publishError });
  }
  const updateData: Record<string, any> = {};
  updateData.seoEnabled = true;
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (icon !== undefined) updateData.icon = icon;
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
  if (images !== undefined) updateData.images = images;
  if (order !== undefined) updateData.order = order;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (seoTitle !== undefined) updateData.seoTitle = seoTitle;
  if (seoDescription !== undefined) updateData.seoDescription = seoDescription;
   if (seoKeywords !== undefined) updateData.seoKeywords = normalizeSeoKeywords(seoKeywords);
   if (seoSlug !== undefined) updateData.seoSlug = normalizeArabicSlug(seoSlug);

  const [service] = await db.update(servicesTable)
    .set(updateData)
    .where(eq(servicesTable.id, id))
    .returning();
  if (!service) return res.status(404).json({ error: "Not found" });
  await refreshSitemapFile(req);
  return res.json(castRow(service));
});

router.delete("/services/:id", requireAdmin, requireSectionPermission("services"), async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  await db.delete(servicesTable).where(eq(servicesTable.id, id));
  await refreshSitemapFile(req);
  return res.status(204).send();
});

export default router;
