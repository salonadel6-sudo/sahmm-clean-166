import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildPageArticle } from "../artifacts/backlink-pages-platform/src/shared/pageArticle.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactDir = path.join(root, "artifacts/backlink-pages-platform");
const distDir = path.join(artifactDir, "dist/public");
const packageDir = path.join(root, "backlink-pages-platform-hostinger");
const zipPath = path.join(root, "backlink-pages-platform-hostinger.zip");
const jsonPath = path.join(artifactDir, "public/site-pages.json");
const sabaikJsonPath = path.join(artifactDir, "public/sabaik-pages.json");
const taqiJsonPath = path.join(artifactDir, "public/taqi-pages.json");

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const publicTitleAliases = {
  "construction debris": "مخلفات البناء",
  "industrial waste": "المخلفات الصناعية",
};

const publicPageTitle = (page) => {
  if (page.path === "/cleaning-packages/tanzeef-qosoor") return "تنظيف قصور بالرياض";
  return publicTitleAliases[page.title] ?? page.title;
};

const routeSlugText = (value) =>
  String(value)
    .normalize("NFKC")
    .trim()
    .replace(/[\/\\?%#&<>{}[\]|"'`:+*=@$!,.;^]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "صفحة";

const publicPageSlug = (page, collection) => {
  const title = publicPageTitle(page);
  const hasDuplicateTitle = collection.some(
    (item) => item !== page && publicPageTitle(item) === title,
  );
  const base = routeSlugText(title);
  return hasDuplicateTitle ? `${base}-${String(page.id).padStart(3, "0")}` : base;
};

const articleMarkup = (page) => {
  const article = buildPageArticle(page);
  const paragraphHtml = (paragraph) => {
    let html = escapeHtml(paragraph);
    for (const link of article.keywordLinks) {
      html = html.replaceAll(
        escapeHtml(link.token),
        `<a class="article-keyword-link" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`,
      );
    }
    return html;
  };
  return `
       <section aria-labelledby="article-heading" style="margin-top:36px;padding-top:28px;border-top:1px solid #d9ddd6;line-height:2">
         <p style="color:#e17b5f;font-size:12px">مقال إرشادي / دليل عملي</p>
         <h2 id="article-heading">${escapeHtml(article.heading)}</h2>
         ${article.paragraphs.map((paragraph) => `<p>${paragraphHtml(paragraph)}</p>`).join("")}
       </section>`;
};

const copyDirectory = (from, to) => {
  fs.cpSync(from, to, { recursive: true });
};

const packageRelativePrefix = (depth) => "../".repeat(depth) || "./";

const templateForDepth = (template, depth) => {
  const prefix = packageRelativePrefix(depth);
  return template
    .replace("<head>", `<head><base href="${prefix}">`)
    .replaceAll('href="./favicon.svg"', `href="${prefix}favicon.svg"`)
    .replaceAll('src="./assets/', `src="${prefix}assets/`)
    .replaceAll('href="./assets/', `href="${prefix}assets/`);
};

const localUrl = (value, assetPrefix) => {
  const text = String(value || "");
  return /^https?:\/\//i.test(text)
    ? text
    : `${assetPrefix}${text.replace(/^\/+/, "")}`;
};

const runBuild = () => {
  execFileSync(
    "pnpm",
    ["--filter", "@workspace/backlink-pages-platform", "run", "build"],
    {
      cwd: root,
      env: { ...process.env, PORT: "21769", BASE_PATH: "./" },
      stdio: "inherit",
    },
  );
};

const pageMarkup = (page, partners, assetPrefix, backHref = "./") => {
  const partnerMarkup = partners
    .map(
      (partner) => `
        <a href="${escapeHtml(partner.url)}" target="_blank" rel="noopener noreferrer">
          <img src="${escapeHtml(localUrl(partner.image, assetPrefix))}" alt="" width="54" height="54">
          <span>${escapeHtml(partner.label)} <small dir="ltr">${escapeHtml(partner.name)}</small></span>
        </a>`,
    )
    .join("");

  return `
    <main dir="rtl" lang="ar" style="max-width:980px;margin:0 auto;padding:60px 24px;font-family:Arial,sans-serif;color:#172a31">
      <p style="color:#e17b5f;font-size:12px">صفحة رقم ${String(page.id).padStart(3, "0")} · ${escapeHtml(page.category)}</p>
       <h1>${escapeHtml(publicPageTitle(page))}</h1>
       <p><strong>مواقع صديقة:</strong> <a href="${escapeHtml(page.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(publicPageTitle(page))}</a></p>
       <p><strong>اقتراحاتنا:</strong> <a href="${escapeHtml(page.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(publicPageTitle(page))}</a></p>
       <img src="${escapeHtml(localUrl(page.image, assetPrefix))}" alt="" style="display:block;width:100%;max-height:420px;object-fit:cover;border-radius:16px;margin:28px 0">
      <p>هذه صفحة فهرسة من أطلس صفحات السهم، وتحتوي على رابط مباشر للصفحة الأصلية وروابط الشبكة المرتبطة.</p>
      <p><a href="${escapeHtml(page.url)}" target="_blank" rel="noopener noreferrer">زيارة الصفحة الأصلية</a></p>
       ${articleMarkup(page)}
      <section aria-labelledby="network-heading">
        <h2 id="network-heading">استكشف الشبكة المرتبطة</h2>
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">${partnerMarkup}</div>
      </section>
       <p><a href="${escapeHtml(backHref)}">العودة إلى أطلس الصفحات</a></p>
    </main>`;
};

const homeMarkup = (pages, sabaikPages, taqiPages, partners, assetPrefix) => {
  const pageLinks = pages
    .map(
      (page) =>
        `<li><a href="page/${escapeHtml(publicPageSlug(page, pages))}/">${escapeHtml(publicPageTitle(page))}</a></li>`,
    )
    .join("");
  const partnerLinks = partners
    .map(
      (partner) =>
        `<a href="${escapeHtml(partner.url)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(localUrl(partner.image, assetPrefix))}" alt="" width="54" height="54"><span>${escapeHtml(partner.label)}</span></a>`,
    )
    .join("");

  return `
    <main dir="rtl" lang="ar" style="max-width:1100px;margin:0 auto;padding:60px 24px;font-family:Arial,sans-serif;color:#172a31">
      <p style="color:#e17b5f;font-size:12px">WEB ATLAS / SITEMAP DIRECTORY</p>
      <h1>أطلس صفحات السهم العامة</h1>
      <p>منصة تجمع ${pages.length} صفحة من خريطة الموقع الحالية في بطاقات وروابط قابلة للتصفح.</p>
      <section aria-labelledby="partners-heading">
        <h2 id="partners-heading">الشبكة المرتبطة</h2>
        <div style="display:flex;flex-wrap:wrap;gap:12px">${partnerLinks}</div>
      </section>
       <section aria-labelledby="sabaik-heading" style="margin-top:36px;padding:20px;border:1px solid #d9ddd6;border-radius:14px;background:#edf1e9">
         <h2 id="sabaik-heading">صفحات سبائك الماسة</h2>
         <p>دليل مستقل يضم ${sabaikPages.length} صفحة مرتبطة بسبائك الماسة لتأجير الحاويات بالرياض.</p>
          <p><a href="sabaik/">فتح صفحات سبائك الماسة</a></p>
       </section>
       <section aria-labelledby="taqi-heading" style="margin-top:18px;padding:20px;border:1px solid #e4c4b8;border-radius:14px;background:#f3e7e1">
         <h2 id="taqi-heading">صفحات تقي</h2>
         <p>دليل مستقل يضم ${taqiPages.length} صفحة مرتبطة بتقي لتأجير الحاويات ونقل المخلفات بالرياض.</p>
          <p><a href="taqi/">فتح صفحات تقي</a></p>
       </section>
      <section aria-labelledby="pages-heading">
        <h2 id="pages-heading">كل صفحات خريطة الموقع</h2>
        <ul>${pageLinks}</ul>
      </section>
    </main>`;
};

const sabaikHomeMarkup = (pages) => {
  const pageLinks = pages
    .map(
      (page) =>
        `<li><a href="page/${escapeHtml(publicPageSlug(page, pages))}/">${escapeHtml(publicPageTitle(page))}</a></li>`,
    )
    .join("");

  return `
    <main dir="rtl" lang="ar" style="max-width:1100px;margin:0 auto;padding:60px 24px;font-family:Arial,sans-serif;color:#172a31">
      <p style="color:#e17b5f;font-size:12px">SABAIK ALMASA / SPECIAL DIRECTORY</p>
      <h1>صفحات سبائك الماسة</h1>
      <p>دليل مستقل يجمع ${pages.length} رابطاً أصلياً للمنتجات والمقالات وصفحات الموقع الخاصة بسبائك الماسة.</p>
       <p><a href="../">العودة إلى أطلس صفحات السهم</a></p>
      <section aria-labelledby="sabaik-pages-heading">
        <h2 id="sabaik-pages-heading">المجموعة الكاملة</h2>
        <ul>${pageLinks}</ul>
      </section>
    </main>`;
};

const taqiHomeMarkup = (pages) => {
  const pageLinks = pages
    .map(
      (page) =>
        `<li><a href="page/${escapeHtml(publicPageSlug(page, pages))}/">${escapeHtml(publicPageTitle(page))}</a></li>`,
    )
    .join("");

  return `
    <main dir="rtl" lang="ar" style="max-width:1100px;margin:0 auto;padding:60px 24px;font-family:Arial,sans-serif;color:#172a31">
      <p style="color:#a55e4c;font-size:12px">TAQI GROUP / SPECIAL DIRECTORY</p>
      <h1>صفحات تقي</h1>
      <p>دليل مستقل يجمع ${pages.length} رابطاً أصلياً للخدمات والحاويات والمقالات وصفحات الموقع الخاصة بتقي.</p>
       <p><a href="../">العودة إلى أطلس صفحات السهم</a></p>
      <section aria-labelledby="taqi-pages-heading">
        <h2 id="taqi-pages-heading">المجموعة الكاملة</h2>
        <ul>${pageLinks}</ul>
      </section>
    </main>`;
};

const withPrerenderedRoot = (template, depth, title, description, rootMarkup) =>
  templateForDepth(template, depth)
    .replace(
      /<title>[\s\S]*?<\/title>/,
      `<title>${escapeHtml(title)}</title>`,
    )
    .replace(
      /<meta name="description" content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${escapeHtml(description)}">`,
    )
    .replace('<div id="root"></div>', `<div id="root">${rootMarkup}</div>`);

const writeStaticPage = (sectionDir, page, collection, html) => {
  const pageDir = path.join(sectionDir, publicPageSlug(page, collection));
  fs.mkdirSync(pageDir, { recursive: true });
  fs.writeFileSync(path.join(pageDir, "index.html"), html, "utf8");
};

const writeIndexPages = (template, pages, sabaikPages, taqiPages, partners) => {
  const rootAssetPrefix = packageRelativePrefix(0);
  const rootPage = withPrerenderedRoot(
    template,
    0,
    "أطلس صفحات السهم العامة",
    `منصة تجمع ${pages.length + sabaikPages.length + taqiPages.length} وجهة، منها ${sabaikPages.length} صفحة لسبائك الماسة و${taqiPages.length} صفحة لتقي.`,
    homeMarkup(pages, sabaikPages, taqiPages, partners, rootAssetPrefix),
  );
  fs.writeFileSync(path.join(packageDir, "index.html"), rootPage, "utf8");

  for (const page of pages) {
    const html = withPrerenderedRoot(
      template,
      2,
      `${page.title} | أطلس السهم`,
      `استكشف ${page.title} عبر مواقع صديقة.`,
      pageMarkup(page, partners, packageRelativePrefix(2), packageRelativePrefix(2)),
    );
    writeStaticPage(path.join(packageDir, "page"), page, pages, html);
  }

  const sabaikIndexDir = path.join(packageDir, "sabaik");
  fs.mkdirSync(sabaikIndexDir, { recursive: true });
  fs.writeFileSync(
    path.join(sabaikIndexDir, "index.html"),
    withPrerenderedRoot(
      template,
      1,
      "صفحات سبائك الماسة | أطلس السهم",
      `دليل مستقل يضم ${sabaikPages.length} صفحة خاصة بسبائك الماسة.`,
      sabaikHomeMarkup(sabaikPages),
    ),
    "utf8",
  );

  for (const page of sabaikPages) {
    const html = withPrerenderedRoot(
      template,
      3,
      `${page.title} | صفحات سبائك الماسة`,
      `استكشف ${page.title} من صفحات سبائك الماسة عبر مواقع صديقة.`,
      pageMarkup(page, partners, packageRelativePrefix(3), packageRelativePrefix(3)),
    );
    writeStaticPage(path.join(packageDir, "sabaik", "page"), page, sabaikPages, html);
  }

  const taqiIndexDir = path.join(packageDir, "taqi");
  fs.mkdirSync(taqiIndexDir, { recursive: true });
  fs.writeFileSync(
    path.join(taqiIndexDir, "index.html"),
    withPrerenderedRoot(
      template,
      1,
      "صفحات تقي | أطلس السهم",
      `دليل مستقل يضم ${taqiPages.length} صفحة خاصة بتقي.`,
      taqiHomeMarkup(taqiPages),
    ),
    "utf8",
  );

  for (const page of taqiPages) {
    const html = withPrerenderedRoot(
      template,
      3,
      `${page.title} | صفحات تقي`,
      `استكشف ${page.title} من صفحات تقي عبر مواقع صديقة.`,
      pageMarkup(page, partners, packageRelativePrefix(3), packageRelativePrefix(3)),
    );
    writeStaticPage(path.join(packageDir, "taqi", "page"), page, taqiPages, html);
  }
};

runBuild();
fs.rmSync(packageDir, { recursive: true, force: true });
fs.rmSync(zipPath, { force: true });
fs.mkdirSync(packageDir, { recursive: true });
copyDirectory(distDir, packageDir);

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const sabaikData = JSON.parse(fs.readFileSync(sabaikJsonPath, "utf8"));
const taqiData = JSON.parse(fs.readFileSync(taqiJsonPath, "utf8"));
const template = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
writeIndexPages(template, data.pages, sabaikData.pages, taqiData.pages, data.partners);

fs.writeFileSync(
  path.join(packageDir, "README.txt"),
  [
    "منصة صفحات الروابط — حزمة Hostinger",
    "",
    `عدد صفحات خريطة الموقع المولدة: ${data.pages.length}`,
    `عدد صفحات سبائك الماسة المولدة: ${sabaikData.pages.length}`,
    `عدد صفحات تقي المولدة: ${taqiData.pages.length}`,
    `الإجمالي: ${data.pages.length + sabaikData.pages.length + taqiData.pages.length}`,
    "الصفحة الرئيسية: index.html",
    "صفحات التفاصيل: روابطها تستخدم اسم عنوان الصفحة داخل مجلد page.",
    "قسم سبائك الماسة: sabaik/index.html",
    "صفحات سبائك الماسة: روابطها تستخدم اسم عنوان الصفحة داخل مجلد sabaik/page.",
    "قسم تقي: taqi/index.html",
    "صفحات تقي: روابطها تستخدم اسم عنوان الصفحة داخل مجلد taqi/page.",
    "",
    "ارفع محتويات هذا المجلد إلى public_html.",
    "الروابط الخارجية موجودة داخل HTML بصيغة نصية وصورية.",
    "ملاحظة: استبدل أو أضف sitemap وrobots.txt وفق الدومين الذي ستستخدمه قبل النشر.",
  ].join("\n"),
  "utf8",
);

execFileSync("zip", ["-qr", zipPath, "."], { cwd: packageDir });
console.log(`Exported ${data.pages.length + sabaikData.pages.length + taqiData.pages.length} static pages to ${packageDir}`);
console.log(`Created ${zipPath}`);