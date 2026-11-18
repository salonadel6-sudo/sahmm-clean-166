import assert from "node:assert/strict";
import test from "node:test";
import { validateSitemapXml } from "./validate-sitemap.mjs";

function sitemap(origin) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <url><loc>${origin}/page</loc></url>`,
    "</urlset>",
  ].join("\n");
}

test("accepts a localhost sitemap when it matches the active local origin and port", () => {
  const result = validateSitemapXml(sitemap("http://localhost:4321"), "sitemap.xml", "http://localhost:4321");
  assert.deepEqual(result.errors, []);
});

test("accepts the active Replit preview origin instead of rejecting all preview hosts", () => {
  const origin = "https://workspace.example.replit.dev";
  const result = validateSitemapXml(sitemap(origin), "sitemap.xml", origin);
  assert.deepEqual(result.errors, []);
});

test("rejects sitemap URLs when they do not match the active origin", () => {
  const result = validateSitemapXml(
    sitemap("https://old.example"),
    "sitemap.xml",
    "https://current.example",
  );
  assert.ok(result.errors.some((message) => message.includes("must use origin https://current.example")));
});
