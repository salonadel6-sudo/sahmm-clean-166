import assert from "node:assert/strict";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  createHostingerRedirectRule,
  rewriteUnicodeHostingerRedirectTargets,
} from "./hostinger-redirect-targets.mjs";

const scriptsDir = dirname(fileURLToPath(import.meta.url));

test("static Arabic redirects use a local PHP handler and safe UTF-8 Location", async () => {
  const targetPath = "/page/شركة-تنظيف-بالرياض";
  const encodedTarget = Buffer.from(targetPath, "utf8").toString("base64url");
  const expectedRule = `RewriteRule ^صفحة/شركة-تنظيف-بالرياض/?$ /legacy-redirect.php?target=${encodedTarget} [END]`;

  assert.equal(createHostingerRedirectRule("^صفحة/شركة-تنظيف-بالرياض/?$", targetPath), expectedRule);
  assert.equal(
    rewriteUnicodeHostingerRedirectTargets([
      `  RewriteRule ^صفحة/شركة-تنظيف-بالرياض/?$ ${targetPath} [R=301,L]`,
      "  RewriteRule ^خدماتنا/([^/]+)/?$ /services/$1 [R=301,L,B]",
    ].join("\n")),
    [
      `  ${expectedRule}`,
      "  RewriteRule ^خدماتنا/([^/]+)/?$ /services/$1 [R=301,L,B]",
    ].join("\n"),
  );

  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const address = reservation.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise((resolve, reject) => {
    reservation.close((error) => (error ? reject(error) : resolve()));
  });

  const php = spawn("php", ["-S", `127.0.0.1:${port}`, "-t", scriptsDir], {
    stdio: "ignore",
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    let serverReady = false;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        await fetch(`${baseUrl}/legacy-redirect.php`);
        serverReady = true;
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    assert.ok(serverReady, "PHP test server should start");

    const response = await fetch(`${baseUrl}/legacy-redirect.php?target=${encodedTarget}`, {
      redirect: "manual",
    });
    assert.equal(response.status, 301);
    assert.equal(
      response.headers.get("location"),
      "/page/%D8%B4%D8%B1%D9%83%D8%A9-%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6",
    );
    assert.ok(!response.headers.get("location")?.includes("%25D8"));

    const externalTarget = Buffer.from("https://example.org/redirect", "utf8").toString("base64url");
    const rejected = await fetch(`${baseUrl}/legacy-redirect.php?target=${externalTarget}`, {
      redirect: "manual",
    });
    assert.equal(rejected.status, 404);
    assert.equal(rejected.headers.get("location"), null);
  } finally {
    php.kill("SIGTERM");
  }
});
