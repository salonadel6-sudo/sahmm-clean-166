import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "lib/db/package.json"));
const Database = require("better-sqlite3");
const databasePath = join(ROOT, "data/sabaik.db");
const backupPath = "/tmp/sabaik-before-primary-seo-keyword.db";
const db = new Database(databasePath);
const PRIMARY_KEYWORD = "شركة تنظيف بالرياض";
const MIGRATION_KEY = "seo_primary_keyword_campaign_v1";

const supportingPosts = [
  {
    slug: "افضل-شركة-تنظيف-شقق-بالرياض",
    paragraph: "إذا كان احتياجك يتجاوز تنظيف الشقة، تعرّف على [شركة تنظيف بالرياض](/) لخدمات المنازل والفلل والمكاتب، ثم حدّد نطاق العمل قبل الحجز.",
  },
  {
    slug: "افضل-شركة-تنظيف-فلل-وقصور-بالرياض",
    paragraph: "لخدمات التنظيف العامة للمنازل والمنشآت، يمكنك الاطلاع على [شركة تنظيف بالرياض](/) ثم طلب الخدمة التي تناسب مساحة الفيلا واحتياجها.",
  },
  {
    slug: "tanzeef-almanazil-haraj-alryad-walshamal",
    paragraph: 'إذا كنت تبحث عن <a href="/">شركة تنظيف بالرياض</a> تخدم أكثر من حي، راجع نطاق الخدمات وطريقة طلب المعاينة قبل مقارنة العروض.',
  },
  {
    slug: "moqarnat-sharikat-tanzeef-alryad-clean-life-al-ealamia-sabaik",
    paragraph: 'لمن يبحث عن <a href="/">شركة تنظيف بالرياض</a> للمنازل أو الفلل، ابدأ بتحديد نوع الخدمة المطلوبة ثم قارن نطاق العمل والتكلفة والضمان قبل الحجز.',
  },
];

function addKeywordOnce(rawKeywords) {
  const terms = String(rawKeywords ?? "")
    .split(/[،,;\n\r|]+/u)
    .map(term => term.trim())
    .filter(Boolean);
  if (!terms.some(term => term.replace(/\s+/gu, " ") === PRIMARY_KEYWORD)) {
    terms.push(PRIMARY_KEYWORD);
  }
  return terms.join(", ");
}

function addIntroParagraph(content, paragraph, isMarkdown) {
  const text = String(content ?? "");
  if (text.includes(PRIMARY_KEYWORD)) {
    if (
      text.includes(`>${PRIMARY_KEYWORD}</a>`)
      || text.includes(`[${PRIMARY_KEYWORD}](/)`)
    ) return text;
    const linkedKeyword = isMarkdown
      ? `[${PRIMARY_KEYWORD}](/)`
      : "<a href=\"/\">" + PRIMARY_KEYWORD + "</a>";
    return text.replace(PRIMARY_KEYWORD, linkedKeyword);
  }
  if (isMarkdown) {
    return text.replace(/\n{2,}---\n{2,}/u, `\n\n${paragraph}\n\n---\n\n`);
  }
  return text.replace(/<\/p>/iu, match => `${match}\n${paragraph}`);
}

try {
  await db.backup(backupPath);

  const update = db.transaction(() => {
    const setting = db.prepare("SELECT value FROM site_settings WHERE key = ?");
    const saveSetting = db.prepare(`
      INSERT INTO site_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
    if (setting.get(MIGRATION_KEY)?.value === "true") {
      return { alreadyApplied: true, focusedPageId: null, touchedPosts: [] };
    }

    const keywords = String(setting.get("seo_meta_keywords")?.value ?? "")
      .split(/[،,;\n\r|]+/u)
      .map(term => term.trim())
      .filter(term => term && term !== PRIMARY_KEYWORD);
    saveSetting.run("seo_meta_keywords", [PRIMARY_KEYWORD, ...keywords].join(", "));

    const homepageRaw = setting.get("homepage_content")?.value;
    if (homepageRaw) {
      const homepage = JSON.parse(homepageRaw);
      homepage.about = homepage.about ?? {};
      homepage.about.description =
        "تبحث عن شركة تنظيف بالرياض؟ نقدم تنظيف المنازل والفلل والشقق والمكاتب، مع تحديد نطاق العمل والعناية بالتفاصيل من بداية الطلب حتى اكتمال الخدمة.";
      saveSetting.run("homepage_content", JSON.stringify(homepage));
    }

    const focusedPage = db.prepare(`
      SELECT id, content FROM seo_pages
      WHERE slug = ? AND is_active = 1
    `).all("تنظيف-منازل-بالرياض");
    if (focusedPage.length !== 1) {
      throw new Error(`Expected one active home-cleaning SEO page; found ${focusedPage.length}.`);
    }
    const pageParagraph =
      'إذا كنت تبحث عن <a href="/">شركة تنظيف بالرياض</a> لخدمات متعددة، ابدأ من الصفحة الرئيسية. تركز هذه الصفحة على تنظيف المنازل بحسب المساحة وعدد الغرف والأسطح المطلوب العناية بها.';
    const pageContent = addIntroParagraph(focusedPage[0].content, pageParagraph, false);
    db.prepare(`
      UPDATE seo_pages
      SET target_keyword = ?,
          title = ?,
          seo_title = ?,
          seo_description = ?,
          seo_keywords = ?,
          excerpt = ?,
          content = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      "تنظيف منازل بالرياض",
      "تنظيف منازل بالرياض",
      "تنظيف منازل بالرياض للمنازل والفلل | السهم كلين",
      "خدمات تنظيف المنازل والشقق والفلل في الرياض، مع تحديد نطاق العمل والمواد المناسبة قبل التنفيذ. أرسل تفاصيل المكان لطلب عرض سعر.",
      "تنظيف منازل بالرياض, تنظيف بيوت الرياض, تنظيف شقق بالرياض, تنظيف فلل بالرياض, شركة تنظيف بالرياض",
      "خدمات تنظيف المنازل في الرياض بحسب المساحة وعدد الغرف ونوع الأسطح، مع توضيح نطاق العمل قبل التنفيذ.",
      pageContent,
      focusedPage[0].id,
    );

    const getPost = db.prepare("SELECT id, content, seo_keywords FROM posts WHERE slug = ? AND is_active = 1");
    const savePost = db.prepare(`
      UPDATE posts
      SET content = ?, seo_keywords = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    const touchedPosts = [];
    for (const post of supportingPosts) {
      const matches = getPost.all(post.slug);
      if (matches.length !== 1) {
        throw new Error(`Expected one active post for "${post.slug}"; found ${matches.length}.`);
      }
      const markdown = post.slug.startsWith("افضل-شركة-تنظيف-");
      savePost.run(
        addIntroParagraph(matches[0].content, post.paragraph, markdown),
        addKeywordOnce(matches[0].seo_keywords),
        matches[0].id,
      );
      touchedPosts.push(matches[0].id);
    }

    saveSetting.run(MIGRATION_KEY, "true");
    return { focusedPageId: focusedPage[0].id, touchedPosts };
  });

  const result = update();
  console.log(JSON.stringify({ ...result, backupPath, primaryKeyword: PRIMARY_KEYWORD }, null, 2));
} finally {
  db.close();
}
