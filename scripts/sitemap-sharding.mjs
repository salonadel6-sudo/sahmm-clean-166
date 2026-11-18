const escapeXml = value => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

export function normalizeSitemapSettings(settings = {}) {
  const rawEnabled = String(settings.sitemap_split_enabled ?? "true").trim().toLowerCase();
  const enabled = !["false", "0", "no"].includes(rawEnabled);
  const rawLimit = String(settings.sitemap_urls_per_file ?? "500").trim();
  const parsedLimit = /^\d+$/.test(rawLimit) ? Number(rawLimit) : Number.NaN;
  const urlsPerFile = Number.isSafeInteger(parsedLimit) ? Math.max(1, Math.min(500, parsedLimit)) : 500;
  return { enabled, urlsPerFile };
}

/**
 * Return a root sitemap (URL set or sitemap index) plus child files when
 * sharding is enabled and the URL set exceeds its configured limit.
 */
export function buildSitemapFileSet(xml, siteUrl, settings = {}, lastmod = new Date().toISOString().slice(0, 10)) {
  const { enabled, urlsPerFile } = normalizeSitemapSettings(settings);
  const rootMatch = String(xml).match(/<urlset\b[\s\S]*?<\/urlset>/i);
  if (!rootMatch) throw new Error("Expected a complete sitemap urlset before sharding.");

  const urlBlocks = [...rootMatch[0].matchAll(/<url\b[^>]*>[\s\S]*?<\/url>/gi)]
    .map(match => match[0]);
  if (!enabled || urlBlocks.length <= urlsPerFile) {
    return {
      xml: String(xml),
      files: [],
      totalUrls: urlBlocks.length,
      splitEnabled: enabled,
      urlsPerFile,
    };
  }

  const urlset = rootMatch[0];
  const opening = urlset.match(/^<urlset\b[\s\S]*?>/i)?.[0];
  if (!opening) throw new Error("Could not read the sitemap urlset header.");
  const prefix = String(xml).slice(0, String(xml).indexOf(urlset));
  const rootOpening = opening;
  const files = [];
  for (let offset = 0; offset < urlBlocks.length; offset += urlsPerFile) {
    const filename = `sitemap${files.length + 1}.xml`;
    const blocks = urlBlocks.slice(offset, offset + urlsPerFile);
    files.push({
      filename,
      xml: [
        prefix.trimEnd(),
        rootOpening,
        "",
        blocks.join("\n\n"),
        "",
        "</urlset>",
        "",
      ].filter((line, index, all) => !(line === "" && all[index - 1] === "")).join("\n"),
      urlCount: blocks.length,
    });
  }

  const sitemapEntries = files.map(file => [
    "  <sitemap>",
    `    <loc>${escapeXml(`${siteUrl}/${file.filename}`)}</loc>`,
    `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
    "  </sitemap>",
  ].join("\n")).join("\n");
  const indexXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    sitemapEntries,
    "</sitemapindex>",
    "",
  ].join("\n");

  return {
    xml: indexXml,
    files,
    totalUrls: urlBlocks.length,
    splitEnabled: enabled,
    urlsPerFile,
  };
}
