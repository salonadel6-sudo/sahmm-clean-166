import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeSiteOrigin, resolveBuildSiteOrigin } from "./site-origin.mjs";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

export function readSavedSiteOrigin({
  root = projectRoot,
  databasePath,
} = {}) {
  const absoluteRoot = resolve(root);
  const resolvedDatabasePath = databasePath ?? join(absoluteRoot, "data", "sabaik.db");
  if (!existsSync(resolvedDatabasePath)) return "";

  const require = createRequire(join(absoluteRoot, "lib", "db", "package.json"));
  const Database = require("better-sqlite3");
  const database = new Database(resolvedDatabasePath, { readonly: true, fileMustExist: true });
  try {
    const hasSettingsTable = database.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='site_settings' LIMIT 1",
    ).get();
    if (!hasSettingsTable) return "";

    const row = database.prepare(
      "SELECT value FROM site_settings WHERE key='site_public_url' LIMIT 1",
    ).get();
    if (!row?.value) return "";

    const origin = normalizeSiteOrigin(row.value, "https");
    if (!origin) throw new Error("The saved site_public_url setting is not a valid public origin.");
    return origin;
  } finally {
    database.close();
  }
}

export function resolveConfiguredSiteOrigin({
  root = projectRoot,
  env = process.env,
  databasePath,
  allowBuildFallback = false,
} = {}) {
  const explicit = [env.CLEANFLOW_SITE_ORIGIN, env.VITE_PUBLIC_SITE_URL]
    .map((value) => String(value ?? "").trim())
    .find(Boolean);

  if (explicit) {
    const origin = normalizeSiteOrigin(explicit, "https");
    if (!origin) throw new Error("CLEANFLOW_SITE_ORIGIN/VITE_PUBLIC_SITE_URL is not a valid site origin.");
    return origin;
  }

  const saved = readSavedSiteOrigin({ root, databasePath });
  if (saved) return saved;
  if (allowBuildFallback) return resolveBuildSiteOrigin(env);
  throw new Error(
    "No public site origin is configured. Set CLEANFLOW_SITE_ORIGIN or save the live domain in Site Settings.",
  );
}
