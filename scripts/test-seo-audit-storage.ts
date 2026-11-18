import assert from "node:assert/strict"
import { gunzipSync } from "node:zlib"
import type { SeoAuditReport } from "../artifacts/sabaik-almasa/src/lib/seo-audit"
import {
  decodeStoredSeoAuditReport,
  encodeStoredSeoAuditReport,
  isCompressedSeoAuditReport,
} from "../artifacts/sabaik-almasa/src/lib/seo-audit-storage"

const repeatedChecks = Array.from({ length: 40 }, (_, checkIndex) => ({
  id: `rankmath-check-${checkIndex}`,
  label: `فحص Rank Math ${checkIndex}`,
  status: (checkIndex % 3 === 0 ? "warning" : "pass") as "warning" | "pass",
  earned: checkIndex % 3 === 0 ? 0 : 1,
  possible: 1,
  detail: `تفاصيل الفحص ${checkIndex}: تم فحص العنوان والوصف وعبارة التركيز والروابط الداخلية ومحتوى الصفحة بدقة.`,
  recommendation: `التوصية ${checkIndex}: راجع العناصر المقاسة في هذه الصفحة وحسّنها وفق إرشادات Rank Math.`,
}))

const report: SeoAuditReport = {
  startedAt: "2026-10-16T14:00:00.000Z",
  completedAt: "2026-10-16T14:10:00.000Z",
  sitemapUrl: "https://alsahmm.com/sitemap.xml",
  sitemapStatus: 200,
  totalUrls: 479,
  checkedUrls: 479,
  failedRequests: 0,
  averageScore: 84,
  renderFallbackDetected: false,
  renderFallbackPageCount: 0,
  passCount: 8_000,
  warningCount: 2_000,
  failCount: 0,
  pages: Array.from({ length: 479 }, (_, pageIndex) => ({
    url: `https://alsahmm.com/page/صفحة-اختبار-${pageIndex}`,
    statusCode: 200,
    kind: `صفحة اختبار ${pageIndex}`,
    title: `شركة تنظيف بالرياض — صفحة ${pageIndex}`,
    description: `خدمات تنظيف في الرياض للصفحة ${pageIndex} مع تفاصيل الفحص.`,
    focusKeyword: "شركة تنظيف بالرياض",
    canonical: `https://alsahmm.com/page/صفحة-اختبار-${pageIndex}`,
    robots: "index, follow",
    h1: [`شركة تنظيف بالرياض — صفحة ${pageIndex}`],
    wordCount: 400,
    keywordOccurrences: 3,
    keywordDensity: 0.75,
    score: 84,
    htmlFallback: false,
    checks: repeatedChecks.map(check => ({
      ...check,
      detail: `${check.detail} — الصفحة ${pageIndex}.`,
      recommendation: `${check.recommendation} — السجل ${pageIndex}.`,
    })),
    contentText: `نص تجريبي فريد للصفحة ${pageIndex}. `.repeat(180),
  })),
}

const originalBytes = new TextEncoder().encode(JSON.stringify(report)).byteLength
assert.ok(originalBytes > 1_500_000, `Test report should exceed the old 1.5 MB limit (${originalBytes} bytes).`)

const stored = await encodeStoredSeoAuditReport(report)
assert.ok(stored, "Large report should be storable.")
assert.ok(JSON.stringify(stored).length <= 5_500_000, "Stored report should fit the bounded request size.")
assert.ok(isCompressedSeoAuditReport(stored), "Large reports should use the compressed envelope.")

const decoded = await decodeStoredSeoAuditReport(stored)
assert.deepEqual(decoded, report, "Compression must preserve every visible and calculated report field.")

if (isCompressedSeoAuditReport(stored)) {
  const unpacked = JSON.parse(gunzipSync(Buffer.from(stored.payload, "base64")).toString("utf8"))
  assert.deepEqual(unpacked, report, "The stored gzip payload must contain the complete report.")
}

assert.deepEqual(
  await decodeStoredSeoAuditReport(report),
  report,
  "Uncompressed reports saved by earlier versions must remain readable.",
)

console.log(
  `SEO audit storage passed: ${originalBytes.toLocaleString()} raw bytes → ${JSON.stringify(stored).length.toLocaleString()} stored bytes, with an exact round trip.`,
)
