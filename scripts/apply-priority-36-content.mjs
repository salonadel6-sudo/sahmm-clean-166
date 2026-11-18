#!/usr/bin/env node
/** Compatibility entry point: publish each priority target as both a page and an article. */
console.info("Publishing the priority 36 targets as both SEO landing pages and blog articles.");
await import("./apply-priority-36-articles.mjs");
