import assert from "node:assert/strict"
import { getContentServiceFamilyLabel, resolveContentServiceFamily } from "../artifacts/sabaik-almasa/src/lib/contentServiceFamily.mjs"

const cases = [
  { family: "cleaning", values: ["خدمات المنشآت", "عقود تنظيف واجهات المباني بالرياض"] },
  { family: "pool", values: ["خدمات المسابح", "تنظيف فلاتر المسابح بالرياض"] },
  { family: "pest-control", values: ["مكافحة الحشرات", "تجهيز المنشأة لمكافحة القوارض بالرياض"] },
  { family: "safety", values: ["خدمات السلامة", "تجهيز ملف السلامة للمنشآت بالرياض"] },
  { family: "insulation", values: ["عزل الأسطح بالرياض"] },
  { family: "other", values: ["معلومات عامة عن المنزل"] },
]

for (const item of cases) {
  assert.equal(resolveContentServiceFamily(...item.values), item.family)
  assert.ok(getContentServiceFamilyLabel(item.family))
}

assert.equal(
  resolveContentServiceFamily("خدمات السلامة", "تنظيف بعد الحريق"),
  "safety",
  "safety intent takes precedence over a cleaning word in the same title",
)

console.log(`Service-family classification passed (${cases.length + 1} cases).`)
