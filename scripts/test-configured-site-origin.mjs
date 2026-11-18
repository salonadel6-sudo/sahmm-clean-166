import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { resolveConfiguredSiteOrigin } from "./configured-site-origin.mjs";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(workspaceRoot, "lib", "db", "package.json"));
const Database = require("better-sqlite3");

function withSettingsDatabase(callback, siteOrigin = "https://stored.example/") {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "configured-site-origin-"));
  const databasePath = join(temporaryRoot, "site.db");
  const database = new Database(databasePath);
  database.exec(`
    CREATE TABLE site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    INSERT INTO site_settings (key, value) VALUES ('site_public_url', '${siteOrigin}');
  `);
  database.close();

  try {
    return callback({ databasePath, temporaryRoot });
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

test("uses an explicit deployment origin before the saved setting", () => {
  withSettingsDatabase(({ databasePath }) => {
    assert.equal(
      resolveConfiguredSiteOrigin({
        root: workspaceRoot,
        databasePath,
        env: { CLEANFLOW_SITE_ORIGIN: "https://new.example/", VITE_PUBLIC_SITE_URL: "" },
      }),
      "https://new.example",
    );
  });
});

test("uses the saved production origin for build and live-check tooling", () => {
  withSettingsDatabase(({ databasePath }) => {
    assert.equal(
      resolveConfiguredSiteOrigin({
        root: workspaceRoot,
        databasePath,
        env: { CLEANFLOW_SITE_ORIGIN: "", VITE_PUBLIC_SITE_URL: "" },
      }),
      "https://stored.example",
    );
  });
});

test("fails explicitly when no saved or explicit public origin exists", () => {
  withSettingsDatabase(({ temporaryRoot }) => {
    const emptyPath = join(temporaryRoot, "empty.db");
    const emptyDatabase = new Database(emptyPath);
    emptyDatabase.exec("CREATE TABLE site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    emptyDatabase.close();

    assert.throws(
      () => resolveConfiguredSiteOrigin({
        root: workspaceRoot,
        databasePath: emptyPath,
        env: { CLEANFLOW_SITE_ORIGIN: "", VITE_PUBLIC_SITE_URL: "" },
      }),
      /No public site origin is configured/u,
    );
  });
});
