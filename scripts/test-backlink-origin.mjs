import assert from "node:assert/strict";
import test from "node:test";
import { buildPageArticle } from "../artifacts/backlink-pages-platform/src/shared/pageArticle.js";

test("backlink article links follow the target page's current origin", () => {
  const article = buildPageArticle({
    title: "اختبار نطاق جديد",
    category: "مقالات",
    url: "https://new-cleanflow.example/services/test",
  });

  assert.equal(article.keywordLinks[0].url, "https://new-cleanflow.example/");
  assert.equal(article.keywordLinks[1].url, "https://new-cleanflow.example/");
});

test("partner destinations remain explicitly external", () => {
  const article = buildPageArticle({
    title: "تأجير الحاويات",
    category: "الخدمات",
    url: "https://sabaik.net/",
  });

  assert.equal(article.keywordLinks[0].url, "https://sabaik.net/");
});
