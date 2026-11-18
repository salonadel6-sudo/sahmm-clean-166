import { Router } from "express";
import { db } from "@workspace/db";
import { packagesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin, requireSectionPermission } from "../middleware/adminAuth";
import { normalizeSeoKeywords } from "../lib/seoKeywords";
import { rankMathPublishingError, firstRankMathKeyword } from "../lib/rankMathPublishing";
import { buildPackageVisibleContent } from "@workspace/seo-rank-math";
import { refreshSitemapFile } from "./sitemap";
import { getSiteOrigin } from "../lib/siteOrigin";

const router = Router();

function packageImageAlts(imagesValue: unknown, imageUrl: unknown, name: string): Array<{ alt: string }> {
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
    .map(() => ({ alt: name }));
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

function toOfferNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizePackageName(value: unknown): string {
  return String(value ?? "").replace(/^\s*باقة(?:\s+|$)/u, "").trim();
}

function normalizeOffer(input: {
  discountPercent?: unknown
  originalPrice?: unknown
  salePriceExpiresAt?: unknown
  discountLabel?: unknown
}, fallback?: {
  discountPercent?: unknown
  originalPrice?: unknown
  salePriceExpiresAt?: unknown
  discountLabel?: unknown
}) {
  const discountPercent = Math.min(100, Math.max(0, toOfferNumber(input.discountPercent, toOfferNumber(fallback?.discountPercent))));
  const originalPrice = Math.max(0, toOfferNumber(input.originalPrice, toOfferNumber(fallback?.originalPrice)));
  const salePrice = discountPercent > 0 && originalPrice > 0
    ? Math.round(originalPrice * (1 - discountPercent / 100) * 100) / 100
    : 0;
  return {
    discountPercent,
    originalPrice,
    salePrice,
    salePriceExpiresAt: discountPercent > 0 ? String(input.salePriceExpiresAt ?? fallback?.salePriceExpiresAt ?? "") : "",
    discountLabel: discountPercent > 0 ? String(input.discountLabel ?? fallback?.discountLabel ?? "") : "",
  };
}

router.get(["/packages", "/packages", "/cleaning-packages"], async (_req, res) => {
  const containers = await db.select().from(packagesTable).orderBy(asc(packagesTable.order));
  return res.json(containers);
});

router.post("/packages", requireAdmin, requireSectionPermission("packages"), async (req, res) => {
  const {
    name: rawName, category, size, capacity, description, features,
    suitableFor, priceText, priceNote, rentalPeriod,
    contactPhone1, contactPhone2, pricePerDay, imageUrl, images,
    discountPercent, originalPrice, salePrice, salePriceExpiresAt, discountLabel,
    order, isActive, seoTitle, seoDescription, seoKeywords, seoSlug,
  } = req.body;
  const name = normalizePackageName(rawName);
  const offer = normalizeOffer({ discountPercent, originalPrice, salePriceExpiresAt, discountLabel });
  const slug = normalizeArabicSlug(seoSlug);
  const siteUrl = await getSiteOrigin(req);
  const canonical = slug ? `${siteUrl}/cleaning-packages/${encodeURIComponent(slug)}` : "";
  const seoKeywordList = normalizeSeoKeywords(seoKeywords ?? "");
  if (Boolean(isActive ?? true)) {
    const editorialContent = buildPackageVisibleContent({
      name,
      category: String(category ?? ""),
      size: String(size ?? ""),
      capacity: String(capacity ?? ""),
      description: String(description ?? ""),
      suitableFor: String(suitableFor ?? ""),
      rentalPeriod: String(rentalPeriod ?? ""),
      features,
    });
    const publishError = rankMathPublishingError({
      type: "package",
      title: name,
      seoTitle: String(seoTitle || name),
      description: String(seoDescription ?? ""),
      focusKeyword: firstRankMathKeyword(seoKeywordList),
      slug,
      canonical,
      expectedCanonical: canonical,
      content: editorialContent.contentText,
      h1: name ? [`${name}${size ? ` — ${String(size)}` : ""}`] : [],
      images: packageImageAlts(images, imageUrl, name),
      internalLinks: 2,
      jsonLdValid: true,
    });
    if (publishError) return res.status(422).json({ error: publishError });
  }
  const [container] = await db.insert(packagesTable).values({
    name,
    category: category ?? "debris",
    size: size ?? "",
    capacity: capacity ?? "",
    description,
    features: features ?? [],
    suitableFor: suitableFor ?? "",
    priceText: priceText ?? "",
    priceNote: priceNote ?? "",
    rentalPeriod: rentalPeriod ?? "",
    contactPhone1: contactPhone1 ?? "",
    contactPhone2: contactPhone2 ?? "",
    pricePerDay: Number(pricePerDay ?? 0),
    ...offer,
    imageUrl: imageUrl ?? "",
    images: images ?? "[]",
    order: order ?? 0,
    isActive: isActive ?? true,
    seoEnabled: true,
    seoTitle: seoTitle ?? "",
    seoDescription: seoDescription ?? "",
    seoKeywords: seoKeywordList,
     seoSlug: slug,
  }).returning();
  await refreshSitemapFile(req);
  return res.status(201).json(container);
});

router.patch("/packages/:id", requireAdmin, requireSectionPermission("packages"), async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const {
    name: rawName, category, size, capacity, description, features,
    suitableFor, priceText, priceNote, rentalPeriod,
    contactPhone1, contactPhone2, pricePerDay, imageUrl, images,
    discountPercent, originalPrice, salePrice, salePriceExpiresAt, discountLabel,
     order, isActive, seoTitle, seoDescription, seoKeywords, seoSlug,
  } = req.body;
  const [existing] = await db.select().from(packagesTable).where(eq(packagesTable.id, id));
  if (!existing) return res.status(404).json({ error: "Not found" });
  const name = rawName === undefined ? undefined : normalizePackageName(rawName);
  const nextName = name ?? normalizePackageName(existing.name);
  const nextDescription = description ?? existing.description;
  const nextCategory = category ?? existing.category;
  const nextSize = size ?? existing.size;
  const nextCapacity = capacity ?? existing.capacity;
  const nextSuitableFor = suitableFor ?? existing.suitableFor;
  const nextRentalPeriod = rentalPeriod ?? existing.rentalPeriod;
  const nextFeatures = features ?? existing.features;
  const nextImages = images ?? existing.images;
  const nextImageUrl = imageUrl ?? existing.imageUrl;
  const nextIsActive = Boolean(isActive ?? existing.isActive);
  const nextSeoTitle = seoTitle ?? existing.seoTitle;
  const nextSeoDescription = seoDescription ?? existing.seoDescription;
  const nextSeoKeywords = seoKeywords ?? existing.seoKeywords;
  const nextSlug = seoSlug !== undefined ? normalizeArabicSlug(seoSlug) : existing.seoSlug;
  const siteUrl = await getSiteOrigin(req);
  const expectedCanonical = nextSlug ? `${siteUrl}/cleaning-packages/${encodeURIComponent(String(nextSlug))}` : "";
  const seoInputsChanged =
    (name !== undefined && String(name) !== String(existing.name)) ||
    (category !== undefined && String(category) !== String(existing.category ?? "")) ||
    (size !== undefined && String(size) !== String(existing.size ?? "")) ||
    (capacity !== undefined && String(capacity) !== String(existing.capacity ?? "")) ||
    (description !== undefined && String(description) !== String(existing.description)) ||
    (suitableFor !== undefined && String(suitableFor) !== String(existing.suitableFor ?? "")) ||
    (rentalPeriod !== undefined && String(rentalPeriod) !== String(existing.rentalPeriod ?? "")) ||
    (features !== undefined && JSON.stringify(features) !== JSON.stringify(existing.features)) ||
    (images !== undefined && String(images) !== String(existing.images ?? "[]")) ||
    (imageUrl !== undefined && String(imageUrl) !== String(existing.imageUrl ?? "")) ||
    (seoTitle !== undefined && String(seoTitle) !== String(existing.seoTitle ?? "")) ||
    (seoDescription !== undefined && String(seoDescription) !== String(existing.seoDescription ?? "")) ||
    (seoKeywords !== undefined && String(seoKeywords) !== String(existing.seoKeywords ?? "")) ||
    (seoSlug !== undefined && nextSlug !== String(existing.seoSlug ?? ""));
  if (nextIsActive && (seoInputsChanged || !existing.isActive)) {
    const normalizedKeywords = normalizeSeoKeywords(nextSeoKeywords ?? "");
    const editorialContent = buildPackageVisibleContent({
      name: String(nextName ?? ""),
      category: String(nextCategory ?? ""),
      size: String(nextSize ?? ""),
      capacity: String(nextCapacity ?? ""),
      description: String(nextDescription ?? ""),
      suitableFor: String(nextSuitableFor ?? ""),
      rentalPeriod: String(nextRentalPeriod ?? ""),
      features: nextFeatures as string | string[],
    });
    const publishError = rankMathPublishingError({
      type: "package",
      title: String(nextName ?? ""),
      seoTitle: String(nextSeoTitle || nextName || ""),
      description: String(nextSeoDescription ?? ""),
      focusKeyword: firstRankMathKeyword(normalizedKeywords),
      slug: String(nextSlug ?? ""),
      canonical: expectedCanonical,
      expectedCanonical,
      content: editorialContent.contentText,
      h1: nextName ? [`${String(nextName)}${nextSize ? ` — ${String(nextSize)}` : ""}`] : [],
      images: packageImageAlts(nextImages, nextImageUrl, String(nextName ?? "")),
      internalLinks: 2,
      jsonLdValid: true,
    });
    if (publishError) return res.status(422).json({ error: publishError });
  }
  const offer = normalizeOffer({ discountPercent, originalPrice, salePriceExpiresAt, discountLabel }, existing);
  const updateData: Record<string, unknown> = {
    seoEnabled: true,
    name: name ?? nextName, category, size, capacity, description, features,
    suitableFor, priceText, priceNote, rentalPeriod,
    contactPhone1, contactPhone2, imageUrl, images,
    ...offer,
    order, isActive, seoTitle, seoDescription,
  };
  if (seoKeywords !== undefined) updateData.seoKeywords = normalizeSeoKeywords(seoKeywords);
  if (pricePerDay !== undefined) updateData.pricePerDay = Number(pricePerDay);
  // Strip undefined keys so partial patches work correctly
  for (const k of Object.keys(updateData)) {
    if (updateData[k] === undefined) delete updateData[k];
  }
   if (seoSlug !== undefined) updateData.seoSlug = normalizeArabicSlug(seoSlug);
  const [container] = await db.update(packagesTable)
    .set(updateData)
    .where(eq(packagesTable.id, id))
    .returning();
  await refreshSitemapFile(req);
  return res.json(container);
});

router.delete("/packages/:id", requireAdmin, requireSectionPermission("packages"), async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  await db.delete(packagesTable).where(eq(packagesTable.id, id));
  await refreshSitemapFile(req);
  return res.status(204).send();
});

export default router;
