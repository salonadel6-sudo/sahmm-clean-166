# Hostinger Code-Update Build Record — 2026-10-19

These are incremental code archives for **existing** CleanFlow deployments. They are not full-install packages and do not update the live site until someone uploads them.

## Built archives

| Deployment | Archive | Size | Files | HTML pages |
|---|---|---:|---:|---:|
| Hostinger PHP shared hosting | `generated-artifacts/updates/sabaik-update.zip` | 3,800,328 bytes | 585 | 488 |
| Hostinger Node.js Web App | `generated-artifacts/updates/cleanflow-node-update.zip` | 5,374,926 bytes | 579 | 488 |

SHA-256:

- PHP: `7bded2974ccddfa3c18c73afaf93112de555c888e9eda70b31b4d1ddd71a009f`
- Node.js: `e9750727c9240e58e0a3c3c2fc2961075cd7fb592a63b8dfccaf6ede814bfd0c`

## Validation

- Both ZIP archives passed `unzip -t`.
- Each archive contains all 488 HTML files from the current built site output. The earlier PHP route allowlist omitted 19 pages in `cleaning-packages/` and `call-now/`; PHP packaging now copies every generated HTML file rather than relying on a fixed route list.
- The HTML and CSS in each archive were checked for 3,904 local references into `assets/`; none were missing.
- The PHP regression test was run against the newly built archive:
  - Published blog post `GET` and `HEAD`: `200`.
  - Draft, inactive, and unknown posts: `404`.
  - Unsupported method: `405`.
  - Blog rewrite is present once and in the required order.
- The Node archive includes the API and SEO frontend entry points. Both update archives omit the database, uploads, and raster images.

## Apply safely

- Use only the archive matching the existing hosting type.
- Back up the deployed files first. Merge the archive into the deployment root and replace same-named files; do not run a sync that deletes files absent from the archive.
- Keep existing database files, uploads, images, icons, manifest, and session-secret files in place. Code-update archives intentionally preserve these live files and depend on existing root-level site media.
- For Node.js, restart the application after replacing the included files.
- For a new installation or an intentional database/media replacement, use the full-package process in `HOSTINGER_DEPLOYMENT_GUIDE.md` instead.

No archive was uploaded to Hostinger as part of this build.
