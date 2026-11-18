import assert from "node:assert/strict"
import {
  applySeoPageOverrideToHtml,
  isSeoPageHtmlIndexable,
  normalizeSeoOverridePath,
  sanitizeSeoOverrideText,
  type SeoPageOverride,
} from "../lib/seo-rank-math/src/page-overrides"

const sampleHtml = `<!doctype html>
<html><head>
<title>العنوان الأصلي</title>
<meta name="description" content="الوصف الأصلي">
<meta name="seo-focus-keyword" content="الكلمة الأصلية">
<link rel="canonical" href="https://alsahmm.com/about">
</head><body><main><h1 class="page-title">العنوان الأصلي</h1><p>النموذج الأصلي</p></main></body></html>`

const override: SeoPageOverride = {
  path: "/about",
  seoTitle: `شركة "السهم" بالرياض`,
  description: "وصف محسّن",
  focusKeyword: "شركة تنظيف بالرياض",
  h1: "تعرف على شركة تنظيف بالرياض",
  content: "## خبرة محلية\nنخدم أحياء الرياض.\n\n- فريق مؤهل\n- تنسيق واضح",
}

assert.equal(normalizeSeoOverridePath("/about"), "/about")
assert.equal(normalizeSeoOverridePath("/areas/al-malqa"), "/areas/al-malqa")
assert.equal(normalizeSeoOverridePath("/areas/%2e%2e/about"), null)
assert.equal(normalizeSeoOverridePath("/services/تنظيف-شقق-بالرياض"), null)
assert.equal(normalizeSeoOverridePath("/offers"), null)
assert.equal(normalizeSeoOverridePath("/why-us/leadership"), null)
assert.equal(sanitizeSeoOverrideText("<script>alert(1)</script>آمن"), "آمن")
assert.equal(isSeoPageHtmlIndexable(sampleHtml, "/about"), true)
assert.equal(isSeoPageHtmlIndexable(sampleHtml.replace("</head>", '<meta name="robots" content="noindex, follow"></head>'), "/about"), false)
assert.equal(isSeoPageHtmlIndexable(sampleHtml.replace('href="https://alsahmm.com/about"', 'href="https://alsahmm.com/other"'), "/about"), false)

const firstPass = applySeoPageOverrideToHtml(sampleHtml, override)
assert.match(firstPass, /<title>شركة &quot;السهم&quot; بالرياض<\/title>/u)
assert.match(firstPass, /name="description" content="وصف محسّن"/u)
assert.match(firstPass, /name="seo-focus-keyword" content="شركة تنظيف بالرياض"/u)
assert.match(firstPass, /<h1 class="page-title">تعرف على شركة تنظيف بالرياض<\/h1>/u)
assert.match(firstPass, /<h2>خبرة محلية<\/h2>/u)
assert.match(firstPass, /<ul><li>فريق مؤهل<\/li><li>تنسيق واضح<\/li><\/ul>/u)
assert.match(firstPass, /href="https:\/\/alsahmm\.com\/about"/u)

const secondPass = applySeoPageOverrideToHtml(firstPass, override)
assert.equal((secondPass.match(/data-seo-page-override="true"/gu) ?? []).length, 1)

const clearedContent = applySeoPageOverrideToHtml(firstPass, { ...override, content: "" })
assert.doesNotMatch(clearedContent, /data-seo-page-override/u)

console.log("SEO static-page override helper tests passed.")
