import assert from "node:assert/strict";
import test from "node:test";
import {
  parseSiteOriginAliases,
  rebaseSiteUrl,
  resolveBuildSiteOrigin,
  SITE_ORIGIN_TOKEN,
  tokenizeSiteOrigins,
} from "./site-origin.mjs";

test("uses an explicit active origin before inferred Replit domains", () => {
  assert.equal(
    resolveBuildSiteOrigin({
      REPLIT_DEV_DOMAIN: "app.example.replit.dev",
      REPLIT_DOMAINS: "",
      CLEANFLOW_SITE_ORIGIN: "https://cleanflow.example",
      VITE_PUBLIC_SITE_URL: "",
    }),
    "https://cleanflow.example",
  );
});

test("uses the first active Replit domain before the development domain and stale public URL", () => {
  assert.equal(
    resolveBuildSiteOrigin({
      REPLIT_DEV_DOMAIN: "dev.example.replit.dev",
      REPLIT_DOMAINS: ", current.example.replit.dev,second.example.replit.dev",
      CLEANFLOW_SITE_ORIGIN: "",
      VITE_PUBLIC_SITE_URL: "https://legacy.example",
    }),
    "https://current.example.replit.dev",
  );
});

test("uses CLEANFLOW_SITE_ORIGIN before the public Vite URL", () => {
  assert.equal(
    resolveBuildSiteOrigin({
      REPLIT_DEV_DOMAIN: "",
      REPLIT_DOMAINS: "",
      CLEANFLOW_SITE_ORIGIN: "https://cleanflow.example/",
      VITE_PUBLIC_SITE_URL: "https://legacy.example",
    }),
    "https://cleanflow.example",
  );
});

test("falls through invalid configured origins to the next valid source", () => {
  assert.equal(
    resolveBuildSiteOrigin({
      REPLIT_DEV_DOMAIN: "",
      REPLIT_DOMAINS: "",
      CLEANFLOW_SITE_ORIGIN: "https://bad.example/path",
      VITE_PUBLIC_SITE_URL: "https://public.example/",
    }),
    "https://public.example",
  );
});

test("uses localhost and the provided valid local port when no origin is configured", () => {
  assert.equal(
    resolveBuildSiteOrigin({
      REPLIT_DEV_DOMAIN: "",
      REPLIT_DOMAINS: "",
      CLEANFLOW_SITE_ORIGIN: "",
      VITE_PUBLIC_SITE_URL: "",
      PORT: "4321",
    }),
    "http://localhost:4321",
  );
});

test("rejects an invalid local port instead of silently emitting an invalid origin", () => {
  assert.throws(
    () => resolveBuildSiteOrigin({
      REPLIT_DEV_DOMAIN: "",
      REPLIT_DOMAINS: "",
      CLEANFLOW_SITE_ORIGIN: "",
      VITE_PUBLIC_SITE_URL: "",
      PORT: "70000",
    }),
    /Invalid local site port: 70000/u,
  );
});

test("tokenizes only the listed origins and normalizes them", () => {
  const html = [
    '<link rel="canonical" href="https://build.example/page">',
    '<a href="https://cleanflow.example/contact">Contact</a>',
    '<a href="https://partner.example/">Partner</a>',
  ].join(" ");

  assert.equal(
    tokenizeSiteOrigins(html, ["https://build.example/", "cleanflow.example"]),
    [
      `<link rel="canonical" href="${SITE_ORIGIN_TOKEN}/page">`,
      `<a href="${SITE_ORIGIN_TOKEN}/contact">Contact</a>`,
      '<a href="https://partner.example/">Partner</a>',
    ].join(" "),
  );
});

test("rebases known first-party URLs and preserves external destinations", () => {
  assert.equal(
    rebaseSiteUrl("https://legacy.example/images/logo.png", "https://current.example", ["https://legacy.example"]),
    "https://current.example/images/logo.png",
  );
  assert.equal(
    rebaseSiteUrl("/images/logo.png", "http://localhost:4321", ["https://legacy.example"]),
    "http://localhost:4321/images/logo.png",
  );
  assert.equal(
    rebaseSiteUrl("https://images.example-cdn.test/logo.png", "https://current.example", ["https://legacy.example"]),
    "https://images.example-cdn.test/logo.png",
  );
});

test("parses and normalizes previously saved first-party origins", () => {
  const aliases = parseSiteOriginAliases(
    '["https://old.example/","not a url","http://old-two.example:8080/path"]',
  );
  assert.deepEqual(aliases, ["https://old.example"]);
  assert.equal(
    rebaseSiteUrl("https://old.example/services/cleaning", "https://new.example", aliases),
    "https://new.example/services/cleaning",
  );
});
