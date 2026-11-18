#!/usr/bin/env node
/** Submit the production sitemap to the configured Search Console property via OAuth2. */

const clientId = process.env.GSC_OAUTH_CLIENT_ID;
const clientSecret = process.env.GSC_OAUTH_CLIENT_SECRET;
const refreshToken = process.env.GSC_OAUTH_REFRESH_TOKEN;
const siteUrl = process.env.GSC_SITE_URL;
const sitemapUrl = process.env.GSC_SITEMAP_URL || "https://alsahmm.com/sitemap.xml";

const missing = Object.entries({
  GSC_OAUTH_CLIENT_ID: clientId,
  GSC_OAUTH_CLIENT_SECRET: clientSecret,
  GSC_OAUTH_REFRESH_TOKEN: refreshToken,
  GSC_SITE_URL: siteUrl,
}).filter(([, value]) => !String(value || "").trim()).map(([name]) => name);

if (missing.length) {
  console.error(`Missing required Search Console OAuth configuration: ${missing.join(", ")}`);
  process.exitCode = 1;
} else {
  const sitemap = new URL(sitemapUrl);
  if (sitemap.protocol !== "https:") throw new Error("The production sitemap URL must use HTTPS.");
  if (!sitemap.pathname.endsWith("/sitemap.xml")) throw new Error("Expected the sitemap index URL ending in /sitemap.xml.");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw new Error(`OAuth token refresh failed (${tokenResponse.status}): ${tokenPayload.error_description || tokenPayload.error || "no access token returned"}`);
  }

  const endpoint = new URL(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`,
  );
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: { authorization: `Bearer ${tokenPayload.access_token}` },
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Search Console sitemap submission failed (${response.status}): ${details.slice(0, 1200)}`);
  }

  console.log(JSON.stringify({ submitted: true, siteUrl, sitemapUrl }, null, 2));
}
