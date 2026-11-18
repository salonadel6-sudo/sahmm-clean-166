import assert from "node:assert/strict"
import {
  loadSitemapPageTargets,
  readSitemapResponse,
  sitemapDocumentKind,
  sitemapPageUrls,
  validateSitemapXmlDocument,
} from "../artifacts/sabaik-almasa/src/lib/seo-audit"

const doubleEncoded = sitemapPageUrls(
  "<url><loc>https://alsahmm.com/blog/%25D8%25A7%25D8%25B3%25D8%25AA%25D8%25AE%25D8%25AF%25D8%25A7%25D9%2585</loc></url>",
  "https://alsahmm.com",
  "/",
)
assert.equal(doubleEncoded.length, 1)
assert.equal(
  doubleEncoded[0].crawlUrl,
  "https://alsahmm.com/blog/%D8%A7%D8%B3%D8%AA%D8%AE%D8%AF%D8%A7%D9%85",
  "Double-encoded Arabic paths must be repaired before the audit fetches them.",
)
assert.equal(doubleEncoded[0].canonicalUrl, doubleEncoded[0].crawlUrl)

const validUnicode = sitemapPageUrls(
  "<url><loc>https://alsahmm.com/blog/استخدام</loc></url>",
  "https://alsahmm.com",
  "/",
)
assert.equal(validUnicode[0].crawlUrl, "https://alsahmm.com/blog/%D8%A7%D8%B3%D8%AA%D8%AE%D8%AF%D8%A7%D9%85")

const literalPercent = sitemapPageUrls(
  "<url><loc>https://alsahmm.com/page/100%25-discount</loc></url>",
  "https://alsahmm.com",
  "/",
)
assert.equal(literalPercent[0].crawlUrl, "https://alsahmm.com/page/100%25-discount")

const captured404s = sitemapPageUrls(
  [
    "<url><loc>https://alsahmm.com/blog/%25D8%25A7%25D8%25B3%25D8%25B9%25D8%25A7%25D8%25B1%252D%25D8%25B4%25D8%25B1%25D9%2583%25D8%25A7%25D8%25AA%252D%25D8%25AA%25D9%2586%25D8%25B8%25D9%258A%25D9%2581%252D%25D8%25A7%25D9%2584%25D9%2585%25D9%2586%25D8%25A7%25D8%25B2%25D9%2584%252D%25D8%25A8%25D8%25A7%25D9%2584%25D8%25B1%25D9%258A%25D8%25A7%25D8%25B6%252D2026</loc></url>",
    "<url><loc>https://alsahmm.com/page/%25D8%25AA%25D9%2586%25D8%25B8%25D9%258A%25D9%2581%252D%25D8%25B9%25D9%2585%25D9%258A%25D9%2582%252D%25D9%2584%25D9%2584%25D8%25B4%25D9%2582%25D9%2582%252D%25D8%25A8%25D8%25A7%25D9%2584%25D8%25B1%25D9%258A%25D8%25A7%25D8%25B6</loc></url>",
  ].join(""),
  "https://alsahmm.com",
  "/",
)
assert.deepEqual(
  captured404s.map(target => decodeURIComponent(target.crawlUrl)),
  [
    "https://alsahmm.com/blog/اسعار-شركات-تنظيف-المنازل-بالرياض-2026",
    "https://alsahmm.com/page/تنظيف-عميق-للشقق-بالرياض",
  ],
  "The double-encoded URLs from the browser log must be normalized to the actual page paths.",
)
assert.ok(captured404s.every(target => !target.crawlUrl.includes("%25D")))

const sitemapOrigin = "https://aiservx.com"
const directUrlset = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${sitemapOrigin}/page/direct</loc></url>
</urlset>`
const xslUrlset = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url><loc>${sitemapOrigin}/page/xsl-styled</loc></url>
  <url><loc>${sitemapOrigin}/page/alternate</loc><xhtml:link rel="alternate" hreflang="ar" href="${sitemapOrigin}/page/alternate"/></url>
</urlset>`
assert.equal(sitemapDocumentKind(directUrlset), "urlset")
assert.equal(sitemapDocumentKind(xslUrlset), "urlset")
assert.equal(
  validateSitemapXmlDocument(xslUrlset, sitemapOrigin),
  "urlset",
  "A valid XSL stylesheet processing instruction before the root must not hide the urlset.",
)
assert.equal(
  (await loadSitemapPageTargets(
    directUrlset,
    `${sitemapOrigin}/sitemap.xml`,
    sitemapOrigin,
    "/",
  )).length,
  1,
  "A regular urlset must continue to load directly.",
)

const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${sitemapOrigin}/sitemap1.xml</loc></sitemap>
  <sitemap><loc>https://external.example/sitemap2.xml</loc></sitemap>
</sitemapindex>`
assert.equal(validateSitemapXmlDocument(directUrlset, sitemapOrigin), "urlset")
assert.equal(validateSitemapXmlDocument(sitemapIndex, sitemapOrigin), "sitemapindex")
assert.throws(
  () => validateSitemapXmlDocument("<urlset><url><loc>https://aiservx.com/page</url></urlset>", sitemapOrigin),
  /XML سليماً/,
  "Mismatched XML tags must be rejected.",
)
assert.throws(
  () => validateSitemapXmlDocument("<urlset><url><loc>/relative</loc></url></urlset>", sitemapOrigin),
  /رابطاً مطلقاً/,
  "Relative page locations must be rejected.",
)
assert.throws(
  () => validateSitemapXmlDocument(
    "<urlset><url><loc>https://__CLEANFLOW_SITE_ORIGIN__/page</loc></url></urlset>",
    sitemapOrigin,
  ),
  /رمز أصل الموقع غير المستبدل/,
  "A leftover site-origin token must be rejected before page crawling.",
)
assert.throws(
  () => validateSitemapXmlDocument(
    "<sitemapindex><sitemap><loc>https://external.example/sitemap1.xml</loc></sitemap></sitemapindex>",
    sitemapOrigin,
  ),
  /ملفات فرعية صالحة من النطاق نفسه/,
  "An index without a same-origin shard must fail clearly.",
)

const okResponse = () => new Response(directUrlset, {
  status: 200,
  headers: { "Content-Type": "application/xml; charset=utf-8" },
})
await assert.rejects(
  () => readSitemapResponse(
    new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain" } }),
    `${sitemapOrigin}/sitemap.xml`,
    sitemapOrigin,
    "الملف الجذري",
  ),
  /HTTP 404/,
  "HTTP errors must be distinguished from malformed XML.",
)
await assert.rejects(
  () => readSitemapResponse(
    new Response("<html>application fallback</html>", { status: 200, headers: { "Content-Type": "text/html" } }),
    `${sitemapOrigin}/sitemap.xml`,
    sitemapOrigin,
    "الملف الجذري",
  ),
  /نوع المحتوى/,
  "HTML responses must not be treated as XML.",
)
await assert.rejects(
  () => readSitemapResponse(
    new Response("<html>application fallback</html>", { status: 200, headers: { "Content-Type": "application/xml" } }),
    `${sitemapOrigin}/sitemap.xml`,
    sitemapOrigin,
    "الملف الجذري",
  ),
  /HTML بدلاً من خريطة XML/,
  "HTML served with an XML content type must still be identified.",
)
const externalRedirect = okResponse()
Object.defineProperties(externalRedirect, {
  redirected: { value: true },
  url: { value: "https://external.example/sitemap.xml" },
})
await assert.rejects(
  () => readSitemapResponse(
    externalRedirect,
    `${sitemapOrigin}/sitemap.xml`,
    sitemapOrigin,
    "الملف الجذري",
  ),
  /نطاق مختلف/,
  "External redirects must be rejected before reading sitemap targets.",
)

const childSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url><loc>${sitemapOrigin}/page/from-shard</loc></url>
  <url><loc>${sitemapOrigin}/page/alternate-shard</loc><xhtml:link rel="alternate" hreflang="ar" href="${sitemapOrigin}/page/alternate-shard"/></url>
</urlset>`
assert.equal(sitemapDocumentKind(sitemapIndex), "sitemapindex")
const originalFetch = globalThis.fetch
const fetchedSitemapUrls: string[] = []
try {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    fetchedSitemapUrls.push(String(input))
    return new Response(childSitemap, {
      status: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    })
  }) as typeof fetch
  const indexedTargets = await loadSitemapPageTargets(
    sitemapIndex,
    `${sitemapOrigin}/sitemap.xml`,
    sitemapOrigin,
    "/",
  )
  assert.deepEqual(fetchedSitemapUrls, [`${sitemapOrigin}/sitemap1.xml`])
  assert.equal(indexedTargets.length, 2)
  assert.equal(indexedTargets[0].crawlUrl, `${sitemapOrigin}/page/from-shard`)
  assert.equal(indexedTargets[0].canonicalUrl, `${sitemapOrigin}/page/from-shard`)
  assert.equal(indexedTargets[1].crawlUrl, `${sitemapOrigin}/page/alternate-shard`)
} finally {
  globalThis.fetch = originalFetch
}

assert.equal(sitemapDocumentKind("<html><body>not a sitemap</body></html>"), null)
await assert.rejects(
  () => loadSitemapPageTargets(
    "<html><body>not a sitemap</body></html>",
    `${sitemapOrigin}/sitemap.xml`,
    sitemapOrigin,
    "/",
  ),
  /HTML بدلاً من خريطة XML/,
)

console.log("SEO audit URL normalization tests passed.")
