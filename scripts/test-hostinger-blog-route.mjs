#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const UPDATE_ZIP = join(ROOT, "generated-artifacts/updates/sabaik-update.zip");
const BUILD_SCRIPT = join(ROOT, "scripts/build-hostinger-update.mjs");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed (${result.status}):\n${(result.stderr || result.stdout || "").slice(-8000)}`,
    );
  }
  return result.stdout;
}

function readZipEntry(entry) {
  return run("unzip", ["-p", UPDATE_ZIP, entry]);
}

async function reservePort() {
  const probe = createServer();
  await new Promise((resolveListen, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolveListen);
  });
  const address = probe.address();
  assert.ok(address && typeof address === "object");
  const { port } = address;
  await new Promise((resolveClose, reject) => {
    probe.close((error) => (error ? reject(error) : resolveClose()));
  });
  return port;
}

async function waitUntilReady(url, server, getStderr) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`PHP test server exited early:\n${getStderr()}`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {
      // The PHP built-in server can take a short time to start listening.
    }
    await delay(100);
  }
  throw new Error(`PHP test server did not become ready:\n${getStderr()}`);
}

function createTestDatabase(databasePath) {
  const php = [
    "$db = new PDO('sqlite:' . getenv('CLEANFLOW_TEST_DB'));",
    "$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);",
    "$db->exec('CREATE TABLE posts (slug TEXT NOT NULL, status TEXT NOT NULL, is_active INTEGER NOT NULL)');",
    "$insert = $db->prepare('INSERT INTO posts (slug, status, is_active) VALUES (?, ?, ?)');",
    "$insert->execute(['published-sample', 'published', 1]);",
    "$insert->execute(['draft-sample', 'draft', 1]);",
    "$insert->execute(['inactive-sample', 'published', 0]);",
  ].join(" ");
  run("php", ["-r", php], {
    env: { ...process.env, CLEANFLOW_TEST_DB: databasePath },
  });
}

async function expectResponse(origin, method, slug, expectedStatus) {
  const url = `${origin}/blog-route.php?slug=${encodeURIComponent(slug)}`;
  const response = await fetch(url, { method, signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, expectedStatus, `${method} ${slug} status`);
  return response;
}

function verifyRewriteRule() {
  const rules = readZipEntry(".htaccess");
  const staticPassThrough = rules.indexOf(
    "RewriteCond %{REQUEST_FILENAME} -f [OR]",
  );
  const blogFallback = rules.indexOf(
    "RewriteRule ^blog/([^/]+)/?$ blog-route.php?slug=$1 [END,B]",
  );
  const missingContent404 = rules.indexOf(
    "RewriteRule ^(?:blog|areas|services|cleaning-packages|page)$ - [R=404,L]",
  );

  assert.notEqual(staticPassThrough, -1, "static-file pass-through rule is missing");
  assert.notEqual(blogFallback, -1, "blog fallback rule is missing from the ZIP");
  assert.notEqual(missingContent404, -1, "missing-content 404 rule is missing");
  assert.ok(
    staticPassThrough < blogFallback && blogFallback < missingContent404,
    "blog fallback must follow existing-file handling and precede missing-content 404s",
  );

  const blogRule =
    "RewriteRule ^blog/([^/]+)/?$ blog-route.php?slug=$1 [END,B]";
  assert.equal(
    rules.split(blogRule).length - 1,
    1,
    "expected exactly one blog fallback rule",
  );
}

async function main() {
  if (!existsSync(BUILD_SCRIPT)) throw new Error(`Missing build script: ${BUILD_SCRIPT}`);
  const build = spawnSync(process.execPath, [BUILD_SCRIPT], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (build.error) throw build.error;
  if (build.status !== 0) {
    throw new Error(
      `Hostinger update build failed:\n${(build.stderr || build.stdout || "").slice(-8000)}`,
    );
  }

  assert.ok(existsSync(UPDATE_ZIP), "Hostinger update ZIP was not created");
  run("unzip", ["-tq", UPDATE_ZIP]);
  verifyRewriteRule();

  const testRoot = mkdtempSync(join(tmpdir(), "cleanflow-blog-route-"));
  let phpServer;
  let serverStderr = "";

  try {
    const routeSource = readZipEntry("blog-route.php");
    const indexHtml = readZipEntry("index.html");
    writeFileSync(join(testRoot, "blog-route.php"), routeSource, "utf8");
    writeFileSync(join(testRoot, "index.html"), indexHtml, "utf8");

    const dataDirectory = join(testRoot, "data");
    const databasePath = join(dataDirectory, "sabaik.db");
    mkdirSync(dataDirectory, { recursive: true });
    createTestDatabase(databasePath);

    const port = await reservePort();
    phpServer = spawn("php", ["-S", `127.0.0.1:${port}`, "-t", testRoot], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    phpServer.stderr.setEncoding("utf8");
    phpServer.stderr.on("data", (chunk) => {
      if (serverStderr.length < 16_000) serverStderr += chunk;
    });

    const origin = `http://127.0.0.1:${port}`;
    await waitUntilReady(`${origin}/index.html`, phpServer, () => serverStderr);

    const published = await expectResponse(origin, "GET", "published-sample", 200);
    assert.equal(await published.text(), indexHtml, "published article must serve the app shell");
    assert.equal(published.headers.get("x-robots-tag"), "index, follow");

    const head = await expectResponse(origin, "HEAD", "published-sample", 200);
    assert.equal(await head.text(), "");

    await expectResponse(origin, "GET", "draft-sample", 404);
    await expectResponse(origin, "GET", "inactive-sample", 404);
    await expectResponse(origin, "GET", "missing-sample", 404);
    const unsupportedMethod = await expectResponse(origin, "POST", "published-sample", 405);
    assert.equal(unsupportedMethod.headers.get("allow"), "GET, HEAD");

    console.log("Hostinger blog-route regression checks passed:");
    console.log("- freshly built update ZIP is valid and contains the ordered blog rewrite rule");
    console.log("- GET/HEAD published post: 200");
    console.log("- draft, inactive, and unknown posts: 404");
    console.log("- unsupported method: 405");
  } finally {
    if (phpServer && phpServer.exitCode === null) phpServer.kill("SIGTERM");
    rmSync(testRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
