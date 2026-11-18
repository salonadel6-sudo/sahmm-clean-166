#!/usr/bin/env node
/** @deprecated Kept as a compatibility entry point after converting the targets to articles. */
console.warn("Validating the 36 priority targets as blog articles; use validate-priority-36-articles.mjs directly.");
await import("./validate-priority-36-articles.mjs");
