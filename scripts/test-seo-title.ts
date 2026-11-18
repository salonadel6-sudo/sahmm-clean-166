import assert from "node:assert/strict"
import { composeSeoTitle } from "../artifacts/sabaik-almasa/src/lib/seoTitle"

assert.equal(
  composeSeoTitle(
    "تنظيف مسابح المنازل بالرياض | نطاق الخدمة | السهم كلين",
    "مؤسسة السهم كلين",
  ),
  "تنظيف مسابح المنازل بالرياض | نطاق الخدمة | السهم كلين",
)

assert.equal(
  composeSeoTitle("عنوان صفحة جديدة", "مؤسسة السهم كلين"),
  "عنوان صفحة جديدة | مؤسسة السهم كلين",
)

assert.equal(
  composeSeoTitle("عنوان الصفحة | مؤسسة السهم كلين", "مؤسسة السهم كلين"),
  "عنوان الصفحة | مؤسسة السهم كلين",
)

console.log("SEO title brand de-duplication passed (3 cases).")
