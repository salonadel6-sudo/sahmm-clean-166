export function parseSitemapImages(raw, fallback) {
  let parsed = [];
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw || "[]") : raw;
  } catch {
    parsed = [];
  }

  const images = Array.isArray(parsed)
    ? parsed.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim())
    : [];
  if (images.length) return images;
  return typeof fallback === "string" && fallback.trim() ? [fallback.trim()] : [];
}
