import type { SeoAuditReport } from "./seo-audit"

export const SEO_AUDIT_STORAGE_FORMAT = "gzip-base64-v1" as const
export const MAX_STORED_SEO_AUDIT_BYTES = 5_500_000
const MAX_EXPANDED_SEO_AUDIT_BYTES = 32_000_000
const FALLBACK_TEXT_PREVIEW_CHARS = 1_200

export interface CompressedSeoAuditReport {
  storageEncoding: typeof SEO_AUDIT_STORAGE_FORMAT
  completedAt: string
  payload: string
}

export type StoredSeoAuditReport = SeoAuditReport | CompressedSeoAuditReport

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

async function gzipJson(value: SeoAuditReport): Promise<CompressedSeoAuditReport> {
  const json = JSON.stringify(value)
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"))
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer())
  return {
    storageEncoding: SEO_AUDIT_STORAGE_FORMAT,
    completedAt: value.completedAt,
    payload: bytesToBase64(compressed),
  }
}

function compactContentPreview(report: SeoAuditReport): SeoAuditReport {
  return {
    ...report,
    pages: report.pages.map(page => ({
      ...page,
      contentText: page.contentText.slice(0, FALLBACK_TEXT_PREVIEW_CHARS),
    })),
  }
}

export function isCompressedSeoAuditReport(value: unknown): value is CompressedSeoAuditReport {
  return typeof value === "object"
    && value !== null
    && "storageEncoding" in value
    && value.storageEncoding === SEO_AUDIT_STORAGE_FORMAT
    && "completedAt" in value
    && typeof value.completedAt === "string"
    && "payload" in value
    && typeof value.payload === "string"
    && value.payload.length > 0
}

export async function encodeStoredSeoAuditReport(
  report: SeoAuditReport,
): Promise<StoredSeoAuditReport | null> {
  const candidates = [report, compactContentPreview(report)]
  const canCompress = typeof CompressionStream !== "undefined"
    && typeof btoa !== "undefined"

  for (const candidate of candidates) {
    if (canCompress) {
      try {
        const compressed = await gzipJson(candidate)
        if (utf8Bytes(JSON.stringify(compressed)) <= MAX_STORED_SEO_AUDIT_BYTES) {
          return compressed
        }
      } catch {
        // Continue with the compact JSON fallback if the browser cannot gzip.
      }
    }

    if (utf8Bytes(JSON.stringify(candidate)) <= MAX_STORED_SEO_AUDIT_BYTES) {
      return candidate
    }
  }

  return null
}

async function readLimitedText(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  const chunks: string[] = []
  let receivedBytes = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    receivedBytes += value.byteLength
    if (receivedBytes > MAX_EXPANDED_SEO_AUDIT_BYTES) {
      await reader.cancel()
      throw new Error("تجاوزت نتيجة الفحص الحد الآمن لفك الضغط.")
    }
    chunks.push(decoder.decode(value, { stream: true }))
  }

  chunks.push(decoder.decode())
  return chunks.join("")
}

export async function decodeStoredSeoAuditReport(value: unknown): Promise<unknown> {
  if (!isCompressedSeoAuditReport(value)) return value
  if (typeof DecompressionStream === "undefined" || typeof atob === "undefined") {
    throw new Error("هذا المتصفح لا يدعم فك ضغط نتيجة SEO المحفوظة.")
  }

  const compressedBytes = base64ToBytes(value.payload)
  const compressedBuffer = new ArrayBuffer(compressedBytes.byteLength)
  new Uint8Array(compressedBuffer).set(compressedBytes)
  const stream = new Blob([compressedBuffer])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))
  const json = await readLimitedText(stream)
  const report: unknown = JSON.parse(json)
  if (
    typeof report !== "object"
    || report === null
    || !("completedAt" in report)
    || report.completedAt !== value.completedAt
  ) {
    throw new Error("تاريخ نتيجة الفحص المضغوطة غير متطابق.")
  }
  return report
}
