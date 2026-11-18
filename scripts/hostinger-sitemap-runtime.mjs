import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { validateSitemapXml } from "./validate-sitemap.mjs";
import { SITE_ORIGIN_TOKEN } from "./site-origin.mjs";

function fail(message) {
  throw new Error(`Hostinger sitemap runtime validation failed: ${message}`);
}

export function assertHostingerSitemapRuntime(packageDirectory, expectedSiteOrigin) {
  const root = packageDirectory;
  const htaccessPath = join(root, ".htaccess");
  const siteResponsePath = join(root, "site-response.php");
  const rootRuntimePath = join(root, "site-origin-runtime.php");
  const apiRuntimePath = join(root, "api", "site-origin-runtime.php");

  for (const [path, label] of [
    [htaccessPath, ".htaccess"],
    [siteResponsePath, "site-response.php"],
    [rootRuntimePath, "site-origin-runtime.php"],
    [apiRuntimePath, "api/site-origin-runtime.php"],
  ]) {
    if (!existsSync(path)) fail(`required ${label} is missing.`);
  }

  const htaccess = readFileSync(htaccessPath, "utf8");
  const lines = htaccess.split(/\r?\n/u);
  const sitemapRewriteIndex = lines.findIndex(line =>
    /^\s*RewriteRule\s+\^sitemap.*\s+site-response\.php\s+\[END\]\s*$/iu.test(line),
  );
  if (sitemapRewriteIndex < 0) fail("the sitemap rewrite to site-response.php is missing.");
  const staticFilePassThroughIndex = lines.findIndex(line =>
    /^\s*RewriteCond\s+%\{REQUEST_FILENAME\}\s+-f\s+\[OR\]\s*$/iu.test(line),
  );
  if (staticFilePassThroughIndex < 0 || sitemapRewriteIndex >= staticFilePassThroughIndex) {
    fail("the sitemap rewrite must run before the existing-file pass-through rule.");
  }

  const responsePhp = readFileSync(siteResponsePath, "utf8");
  const runtimePhp = readFileSync(rootRuntimePath, "utf8");
  if (
    !responsePhp.includes("sitemap")
    || !responsePhp.includes("\\d*")
    || !responsePhp.includes("\\.xml")
    || !responsePhp.includes("cleanflowServeSiteFile(")
  ) {
    fail("site-response.php does not serve the root sitemap and numbered shards through the runtime.");
  }
  if (
    !runtimePhp.includes(SITE_ORIGIN_TOKEN)
    || !/str_replace\(\s*CLEANFLOW_SITE_ORIGIN_TOKEN/u.test(runtimePhp)
    || !readFileSync(apiRuntimePath, "utf8").includes(SITE_ORIGIN_TOKEN)
  ) {
    fail("the PHP runtime does not replace the site-origin token in both site and API copies.");
  }

  const sitemapNames = readdirSync(root)
    .filter(name => /^sitemap(?:[1-9]\d*)?\.xml$/iu.test(name))
    .sort((left, right) => left.localeCompare(right, "en"));
  if (!sitemapNames.includes("sitemap.xml")) fail("sitemap.xml is missing.");
  const listedFiles = new Set(sitemapNames);
  for (const filename of sitemapNames) {
    const xml = readFileSync(join(root, filename), "utf8");
    if (!xml.includes(SITE_ORIGIN_TOKEN)) fail(`${filename} was not tokenized for runtime-origin substitution.`);
    const materializedXml = xml.split(SITE_ORIGIN_TOKEN).join(expectedSiteOrigin);
    const validation = validateSitemapXml(materializedXml, filename, expectedSiteOrigin);
    if (validation.errors.length) fail(`${filename} is invalid after runtime-origin substitution: ${validation.errors.join("; ")}`);
    if (filename === "sitemap.xml" && validation.isIndex) {
      for (const location of validation.sitemapLocations) {
        let childName;
        try {
          childName = new URL(location).pathname.split("/").filter(Boolean).at(-1);
        } catch {
          fail(`sitemap.xml contains an invalid child URL: ${location}`);
        }
        if (!listedFiles.has(childName)) fail(`sitemap.xml references a missing shard: ${childName}`);
      }
    }
  }

  return { sitemapFiles: sitemapNames, sitemapRewriteIndex };
}
