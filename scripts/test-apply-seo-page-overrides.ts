import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { applySeoPageOverrides } from "./apply-seo-page-overrides"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const require = createRequire(join(root, "lib/db/package.json"))
const Database = require("better-sqlite3")
const tempRoot = mkdtempSync(join(tmpdir(), "seo-page-overrides-"))
const publicRoot = join(tempRoot, "public")
const routeHtml = join(publicRoot, "about", "index.html")
mkdirSync(dirname(routeHtml), { recursive: true })
mkdirSync(publicRoot, { recursive: true })
writeFileSync(join(publicRoot, "index.html"), "<!doctype html><html><head></head><body></body></html>")
writeFileSync(
  routeHtml,
  '<!doctype html><html><head><title>عنوان قديم</title><meta name="description" content="وصف قديم"><meta name="seo-focus-keyword" content="قديم"><link rel="canonical" href="https://alsahmm.com/about"></head><body><main><h1>قديم</h1><p>المحتوى الأساسي</p></main></body></html>',
)

const db = new Database(":memory:")
try {
  db.exec('CREATE TABLE site_settings ("key" TEXT PRIMARY KEY, value TEXT NOT NULL)')
  const insert = db.prepare('INSERT INTO site_settings ("key", value) VALUES (?, ?)')
  insert.run("seo_page_override:/about", JSON.stringify({
    path: "/about",
    seoTitle: "شركة السهم بالرياض",
    description: "وصف جديد",
    focusKeyword: "شركة تنظيف بالرياض",
    h1: "تعرف على الشركة",
    content: "## الخبرة\n- فريق مؤهل",
    sitemapEligible: true,
  }))
  insert.run("seo_page_override:/offers", JSON.stringify({
    path: "/offers",
    seoTitle: "لا يجب تطبيقه",
    description: "",
    focusKeyword: "",
    h1: "",
    content: "",
  }))

  assert.equal(applySeoPageOverrides(db, publicRoot), 1, "Only approved saved routes should be applied.")
  const updated = readFileSync(routeHtml, "utf8")
  assert.match(updated, /<title>شركة السهم بالرياض<\/title>/u)
  assert.match(updated, /name="description" content="وصف جديد"/u)
  assert.match(updated, /name="seo-focus-keyword" content="شركة تنظيف بالرياض"/u)
  assert.match(updated, /<h1>تعرف على الشركة<\/h1>/u)
  assert.match(updated, /data-seo-page-override="true"/u)
  assert.match(updated, /href="https:\/\/alsahmm\.com\/about"/u)
  assert.doesNotMatch(updated, /لا يجب تطبيقه/u)
} finally {
  db.close()
  rmSync(tempRoot, { recursive: true, force: true })
}

console.log("Saved page overrides are reapplied safely to generated HTML.")
