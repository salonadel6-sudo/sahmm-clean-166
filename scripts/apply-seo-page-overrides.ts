import { randomUUID } from "node:crypto"
import { createRequire } from "node:module"
import { existsSync, lstatSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import {
  applySeoPageOverrideToHtml,
  normalizeSeoOverridePath,
  sanitizeSeoOverrideText,
  type SeoPageOverride,
} from "../lib/seo-rank-math/src/page-overrides"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const require = createRequire(join(root, "lib/db/package.json"))
const Database = require("better-sqlite3")
const databasePath = join(root, "data/sabaik.db")

type OverrideDatabase = {
  prepare: (sql: string) => { all: (prefix: string) => unknown }
}

export function applySeoPageOverrides(db: OverrideDatabase, publicRootInput: string): number {
  const publicRoot = resolve(publicRootInput)
  if (!existsSync(join(publicRoot, "index.html"))) {
    throw new Error(`مجلد HTML المرحلي غير مكتمل: ${publicRoot}`)
  }
  const rows = db.prepare(
    "SELECT key, value FROM site_settings WHERE key LIKE ? ORDER BY key",
  ).all("seo_page_override:%") as Array<{ key: string; value: string }>
  let applied = 0

  for (const row of rows) {
    const keyPath = row.key.slice("seo_page_override:".length)
    const routePath = normalizeSeoOverridePath(keyPath)
    if (!routePath) {
      console.warn(`تُرك override لمسار غير مسموح في إعدادات الموقع: ${row.key}`)
      continue
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(row.value)
    } catch {
      console.warn(`تُرك override بتنسيق JSON غير صالح: ${row.key}`)
      continue
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      console.warn(`تُرك override غير صالح: ${row.key}`)
      continue
    }

    const stored = parsed as Partial<SeoPageOverride>
    if (normalizeSeoOverridePath(String(stored.path ?? "")) !== routePath) {
      console.warn(`تُرك override لا يطابق مساره المحفوظ: ${row.key}`)
      continue
    }

    const segments = routePath === "/" ? [] : routePath.slice(1).split("/")
    const htmlPath = resolve(publicRoot, ...segments, "index.html")
    if (!htmlPath.startsWith(`${publicRoot}${sep}`)) {
      throw new Error(`مسار override خارج مخرجات HTML: ${routePath}`)
    }
    const stat = lstatSync(htmlPath)
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new Error(`ملف HTML غير آمن لتطبيق override: ${routePath}`)
    }

    const override: SeoPageOverride = {
      path: routePath,
      seoTitle: sanitizeSeoOverrideText(stored.seoTitle, 180),
      description: sanitizeSeoOverrideText(stored.description, 500),
      focusKeyword: sanitizeSeoOverrideText(stored.focusKeyword, 200),
      h1: sanitizeSeoOverrideText(stored.h1, 220),
      content: sanitizeSeoOverrideText(stored.content),
      sitemapEligible: stored.sitemapEligible === true,
      updatedAt: typeof stored.updatedAt === "string" ? stored.updatedAt : undefined,
    }
    const originalHtml = readFileSync(htmlPath, "utf8")
    const updatedHtml = applySeoPageOverrideToHtml(originalHtml, override)
    const tempPath = `${htmlPath}.${process.pid}.${randomUUID()}.tmp`
    try {
      writeFileSync(tempPath, updatedHtml, { encoding: "utf8", mode: stat.mode & 0o777 })
      renameSync(tempPath, htmlPath)
    } catch (error) {
      rmSync(tempPath, { force: true })
      throw new Error(`تعذر تطبيق override على ${relative(publicRoot, htmlPath)}: ${String(error)}`)
    }
    applied += 1
  }

  return applied
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!existsSync(databasePath)) throw new Error(`قاعدة البيانات المعتمدة للبناء غير موجودة: ${databasePath}`)
  const publicRoot = join(root, "artifacts/sabaik-almasa/dist/public")
  const db = new Database(databasePath, { readonly: true })
  try {
    const applied = applySeoPageOverrides(db, publicRoot)
    console.log(`تم تطبيق ${applied} override محفوظ على HTML قبل تجميع حزمتَي PHP وNode.`)
  } finally {
    db.close()
  }
}
