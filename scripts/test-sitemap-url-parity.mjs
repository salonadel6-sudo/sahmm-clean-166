import assert from "node:assert/strict"
import test from "node:test"
import { compareSitemapUrlSets } from "./sitemap-url-parity.mjs"

test("Arabic literal and percent-encoded locations compare as the same public URL", () => {
  const result = compareSitemapUrlSets(
    ["https://alsahmm.com/contact/شركة-تنظيف-بالرياض"],
    ["https://alsahmm.com/contact/%D8%B4%D8%B1%D9%83%D8%A9-%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6"],
  )
  assert.equal(result.matches, true)
  assert.deepEqual(result.missingInHostinger, [])
  assert.deepEqual(result.missingInNode, [])
})

test("Different decoded paths and duplicate aliases still fail parity", () => {
  const different = compareSitemapUrlSets(
    ["https://alsahmm.com/faq/تنظيف-المنازل-بالرياض"],
    ["https://alsahmm.com/faq/تنظيف-المنازل-بجدة"],
  )
  assert.equal(different.matches, false)
  assert.equal(different.missingInHostinger.length, 1)
  assert.equal(different.missingInNode.length, 1)

  const duplicate = compareSitemapUrlSets(
    [
      "https://alsahmm.com/contact/شركة-تنظيف-بالرياض",
      "https://alsahmm.com/contact/%D8%B4%D8%B1%D9%83%D8%A9-%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6",
    ],
    ["https://alsahmm.com/contact/شركة-تنظيف-بالرياض"],
  )
  assert.equal(duplicate.matches, false)
  assert.equal(duplicate.duplicateNode.length, 1)
})
