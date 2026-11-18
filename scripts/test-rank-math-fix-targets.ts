import assert from "node:assert/strict"
import test from "node:test"
import {
  getRankMathFixTarget,
  repairShortRankMathDescription,
} from "../lib/seo-rank-math/src/fix-targets"

test("fix target map accepts the UI Rank Math prefix and analyzer check IDs", () => {
  const expectedFields: Record<string, string> = {
    "title-length": "seoTitle",
    "keyword-title": "seoTitle",
    "description-length": "seoDescription",
    "keyword-description": "seoDescription",
    "focus-keyword": "seoKeywords",
    "keyword-h1": "title",
    "keyword-introduction": "content",
    "content-depth": "content",
  }

  for (const [checkId, field] of Object.entries(expectedFields)) {
    assert.equal(getRankMathFixTarget(`rankmath-${checkId}`, "article")?.field, field, checkId)
  }
})

test("focus keyword and content checks use the editable field for their entity", () => {
  assert.equal(getRankMathFixTarget("rankmath-focus-keyword", "landing")?.field, "targetKeyword")
  assert.equal(getRankMathFixTarget("rankmath-keyword-introduction", "service")?.field, "description")
  assert.equal(getRankMathFixTarget("rankmath-content-depth", "service")?.mode, "expand")
  assert.equal(getRankMathFixTarget("rankmath-keyword-introduction", "package")?.field, "description")
  assert.equal(getRankMathFixTarget("rankmath-content-depth", "package")?.mode, "expand")
})

test("legacy intro ID remains compatible and non-content checks stay manual", () => {
  assert.equal(getRankMathFixTarget("keyword-intro", "article")?.field, "content")
  assert.equal(getRankMathFixTarget("rankmath-keyword-url", "article"), null)
  assert.equal(getRankMathFixTarget("rankmath-canonical", "landing"), null)
})

test("short generated descriptions get a small safe completion inside policy bounds", () => {
  const shortDescription = `${"ش".repeat(114)}.`
  const repaired = repairShortRankMathDescription(shortDescription, 120, 160)
  assert.ok([...repaired].length >= 120 && [...repaired].length <= 160)
  assert.ok(repaired.startsWith("ش".repeat(114)))
  assert.ok(!repaired.includes(".."))
  assert.ok(repaired.endsWith("لمعرفة التفاصيل."))
  assert.equal(repairShortRankMathDescription("وصف صالح بطول مناسب بالفعل.", 20, 160), "وصف صالح بطول مناسب بالفعل.")
  assert.equal(repairShortRankMathDescription("نص قصير جداً.", 120, 160), "نص قصير جداً.")
  assert.equal(repairShortRankMathDescription("وصف أطول من الحد الأعلى.", 10, 20), "وصف أطول من الحد الأعلى.")
})
