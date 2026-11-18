# Search Console sitemap automation

The scheduled workflow submits `https://alsahmm.com/sitemap.xml` to the configured Search Console property once per day. Google processes sitemap submissions as crawl hints; this does not request immediate crawling or guarantee indexing.

## Configure the GitHub repository

1. Enable the Google Search Console API in a Google Cloud project and create OAuth 2.0 credentials.
2. Authorize a Google account that has owner or full-user access to the `alsahmm.com` Search Console property, requesting the `https://www.googleapis.com/auth/webmasters` scope.
3. Add repository variables:
   - `GSC_SITE_URL`: exactly the Search Console property, such as `https://alsahmm.com/` or `sc-domain:alsahmm.com`.
   - `GSC_SITEMAP_URL`: optional; defaults to `https://alsahmm.com/sitemap.xml`.
4. Add repository secrets:
   - `GSC_OAUTH_CLIENT_ID`
   - `GSC_OAUTH_CLIENT_SECRET`
   - `GSC_OAUTH_REFRESH_TOKEN`
5. Run **Actions → Submit Search Console sitemap → Run workflow** once to check the setup. After the workflow is present on the default branch, its schedule runs daily at 04:17 UTC.

Do not store a Google account password or OAuth secrets in this repository. Keep the refresh token in GitHub Actions Secrets and revoke it from the Google account if it is exposed.

## URL-level indexing requests

Search Console has no general API for requesting indexing of arbitrary service or article URLs. The URL Inspection API reports the currently indexed status and its published limit is 2,000 inspections per property per day; it does not submit recrawl requests. Google's Indexing API is limited to eligible job-posting and livestream pages, so it does not apply to these cleaning pages. Use the sitemap for discovery and the URL Inspection interface for individual recrawl requests.
