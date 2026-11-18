import { useEffect, useRef, useState } from "react"
import type { SeoAuditReport } from "@/lib/seo-audit"
import { analyzeRankMathSiteKeywordStrength } from "@workspace/seo-rank-math"
import {
  decodeStoredSeoAuditReport,
  encodeStoredSeoAuditReport,
  isCompressedSeoAuditReport,
  type StoredSeoAuditReport,
} from "@/lib/seo-audit-storage"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""
const STORAGE_KEY = "cleanflow:seo-site-audit:latest:v1"

export type SeoAuditPersistence = "server" | "local" | "none"
export type SeoAuditSaveResult =
  | { status: "server" }
  | { status: "local"; message?: string }
  | { status: "failed"; message: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isSeoAuditReport(value: unknown): value is SeoAuditReport {
  if (!isRecord(value) || !Array.isArray(value.pages)) return false
  if (typeof value.startedAt !== "string" || typeof value.completedAt !== "string") return false
  if (Number.isNaN(Date.parse(value.completedAt))) return false
  return value.pages.every(page =>
    isRecord(page)
    && typeof page.url === "string"
    && typeof page.title === "string"
    && typeof page.contentText === "string"
    && Array.isArray(page.h1)
    && Array.isArray(page.checks)
    && page.checks.every(check => isRecord(check) && typeof check.id === "string" && typeof check.status === "string")
  )
}

function saveLocalReport(report: StoredSeoAuditReport): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(report))
    return true
  } catch {
    return false
  }
}

function readLocalStoredReport(): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function storedCompletedAt(value: unknown): string | null {
  if (!isRecord(value) || typeof value.completedAt !== "string") return null
  return Number.isNaN(Date.parse(value.completedAt)) ? null : value.completedAt
}

export function useSeoAuditReport() {
  const [report, setReport] = useState<SeoAuditReport | null>(null)
  const [persistence, setPersistence] = useState<SeoAuditPersistence>("none")
  const scanStartedRef = useRef(false)

  useEffect(() => {
    let active = true
    void (async () => {
      const localStored = readLocalStoredReport()
      const localCompletedAt = storedCompletedAt(localStored)
      let localReport: SeoAuditReport | null = null
      if (localStored !== null) {
        try {
          const decodedLocal = await decodeStoredSeoAuditReport(localStored)
          if (isSeoAuditReport(decodedLocal)) localReport = decodedLocal
        } catch {
          // A broken local copy must not block loading a valid server copy.
        }
      }
      if (active && !scanStartedRef.current && localReport) {
        setReport(localReport)
        setPersistence("local")
      }

      if (!active || scanStartedRef.current) return
      const token = localStorage.getItem("admin_token") || ""
      if (!token) return

      try {
        const response = await fetch(`${API_BASE}/api/admin/seo-audit/latest`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          },
        })
        if (!response.ok) throw new Error(`تعذر تحميل نتيجة الفحص المحفوظة (HTTP ${response.status})`)
        const data = await response.json() as { report?: unknown; savedAt?: string | null }
        const serverStored = data.report
        const serverCompletedAt = storedCompletedAt(serverStored)
        const localTimestamp = localCompletedAt ? Date.parse(localCompletedAt) : 0
        const serverTimestamp = serverCompletedAt ? Date.parse(serverCompletedAt) : 0

        // The compressed envelope already carries its timestamp. When both
        // copies refer to the same scan, keep the local decode and skip a
        // second full decompression, JSON parse, and re-compression.
        if (localReport && localTimestamp > 0 && localTimestamp === serverTimestamp) {
          if (active && !scanStartedRef.current) setPersistence("server")
          return
        }

        if (localReport && localTimestamp > serverTimestamp) {
          let packedLocal: StoredSeoAuditReport | null = null
          if (isCompressedSeoAuditReport(localStored)) packedLocal = localStored
          else packedLocal = await encodeStoredSeoAuditReport(localReport)
          if (!packedLocal) {
            if (active && !scanStartedRef.current) setPersistence("local")
            return
          }
          const saveResponse = await fetch(`${API_BASE}/api/admin/seo-audit/latest`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              "Cache-Control": "no-store",
            },
            cache: "no-store",
            body: JSON.stringify({ report: packedLocal }),
          })
          if (!active || scanStartedRef.current) return
          const syncResult = await saveResponse.json().catch(() => null) as { ok?: boolean } | null
          setPersistence(saveResponse.ok && syncResult?.ok ? "server" : "local")
          return
        }

        const decodedReport = await decodeStoredSeoAuditReport(serverStored)
        if (!active || scanStartedRef.current || !isSeoAuditReport(decodedReport)) return
        setReport(decodedReport)
        setPersistence("server")
        if (isCompressedSeoAuditReport(serverStored)) {
          saveLocalReport(serverStored)
        } else {
          const packedServer = await encodeStoredSeoAuditReport(decodedReport)
          if (active && !scanStartedRef.current && packedServer) saveLocalReport(packedServer)
        }
      } catch {
        // The local copy remains available when the API is temporarily offline.
      }
    })()

    return () => {
      active = false
    }
  }, [])

  async function saveReport(nextReport: SeoAuditReport, keywordTerms: string[] = []): Promise<SeoAuditSaveResult> {
    scanStartedRef.current = true
    const reportWithKeywordStrength: SeoAuditReport = {
      ...nextReport,
      keywordStrength: analyzeRankMathSiteKeywordStrength(
        [...keywordTerms, ...nextReport.pages.map(page => page.focusKeyword)],
        nextReport.pages,
      ),
    }
    setReport(reportWithKeywordStrength)
    const storedReport = await encodeStoredSeoAuditReport(reportWithKeywordStrength)
    if (!storedReport) {
      const message = "تعذر ضغط نتيجة الفحص للحفظ؛ حجم البيانات ما زال أكبر من الحد الآمن."
      setPersistence("none")
      return { status: "failed", message }
    }
    const localSaved = saveLocalReport(storedReport)
    setPersistence(localSaved ? "local" : "none")
    try {
      const response = await fetch(`${API_BASE}/api/admin/seo-audit/latest`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token") || ""}`,
          "Cache-Control": "no-store",
        },
        cache: "no-store",
        body: JSON.stringify({ report: storedReport }),
      })
      const result = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null
      if (!response.ok || !result?.ok) {
        const message = result?.error || `رفض الخادم حفظ نتيجة الفحص (HTTP ${response.status}).`
        return localSaved ? { status: "local", message } : { status: "failed", message }
      }
      setPersistence("server")
      return { status: "server" }
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر الاتصال بخادم الحفظ."
      return localSaved ? { status: "local", message } : { status: "failed", message }
    }
  }

  return { report, saveReport, persistence }
}
