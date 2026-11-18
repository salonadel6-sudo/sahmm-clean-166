import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const sitemapUrlBlocks = (xml) =>
  [...String(xml).matchAll(/<url>([\s\S]*?)<\/url>/giu)].map((match) => match[1]);

const sitemapLocations = (xml) =>
  [...String(xml).matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/giu)]
    .map((match) => match[1].match(/<loc>([^<]+)<\/loc>/iu)?.[1]?.trim())
    .filter(Boolean);

function firstPageUrl(xml) {
  return sitemapUrlBlocks(xml)[0]?.match(/<loc>([^<]+)<\/loc>/iu)?.[1]?.trim() ?? "";
}

export function loadLocalSitemapUrlBlocks(sitemapPath) {
  if (!existsSync(sitemapPath)) throw new Error(`Source sitemap not found: ${sitemapPath}`);
  const rootXml = readFileSync(sitemapPath, "utf8");

  if (/<sitemapindex\b/iu.test(rootXml)) {
    const childLocations = sitemapLocations(rootXml);
    if (!childLocations.length) throw new Error("Source sitemap index contains no child sitemap files.");

    const firstChild = new URL(childLocations[0]);
    const sourceSitemapOrigin = firstChild.origin;
    const blocks = [];

    for (const location of childLocations) {
      const childUrl = new URL(location, `${sourceSitemapOrigin}/`);
      if (childUrl.origin !== sourceSitemapOrigin) {
        throw new Error(`Source sitemap child uses a different origin: ${childUrl.href}`);
      }
      const filename = basename(decodeURIComponent(childUrl.pathname));
      if (!/^sitemap[1-9]\d*\.xml$/iu.test(filename)) {
        throw new Error(`Unexpected source sitemap child filename: ${filename}`);
      }

      const childPath = join(dirname(sitemapPath), filename);
      if (!existsSync(childPath)) throw new Error(`Source sitemap child not found: ${childPath}`);
      const childXml = readFileSync(childPath, "utf8");
      if (!/<urlset\b/iu.test(childXml)) {
        throw new Error(`Source sitemap child is not a urlset: ${filename}`);
      }
      blocks.push(...sitemapUrlBlocks(childXml));
    }

    if (!blocks.length) throw new Error("Source sitemap index contains no page URLs.");
    return { blocks, sourceSitemapOrigin };
  }

  if (!/<urlset\b/iu.test(rootXml)) {
    throw new Error("Source sitemap root must be a urlset or sitemapindex.");
  }
  const blocks = sitemapUrlBlocks(rootXml);
  const firstUrl = firstPageUrl(rootXml);
  if (!blocks.length || !firstUrl) throw new Error("Source sitemap urlset contains no page URLs.");

  return { blocks, sourceSitemapOrigin: new URL(firstUrl).origin };
}
