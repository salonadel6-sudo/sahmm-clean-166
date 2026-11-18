#!/usr/bin/env node
/**
 * Publish confirmed insulation landing pages, give each page a keyword-named
 * image, and replace unavailable published-post covers with keyword-specific
 * copies of existing service images.
 */
import { createRequire } from "node:module";
import { copyFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePostImage } from "./post-image-fallback.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "lib", "db", "package.json"));
const Database = require("better-sqlite3");
const db = new Database(join(ROOT, "data", "sabaik.db"));
const publicDir = join(ROOT, "artifacts", "sabaik-almasa", "public");
const seoImageDir = join(publicDir, "images", "seo");
const blogImageDir = join(publicDir, "images", "blog");
mkdirSync(seoImageDir, { recursive: true });
mkdirSync(blogImageDir, { recursive: true });

const now = new Date().toISOString();
const serviceSlug = "عزل-أسطح-بالرياض";
const serviceImage = `/images/seo/${serviceSlug}.jpg`;

const pages = [
  {
    title: "عزل أسطح بالرياض",
    targetKeyword: "عزل أسطح بالرياض",
    sourceImage: "seo-gallery/insulation-roof-check.jpg",
    seoTitle: "عزل أسطح بالرياض | معاينة وخطة عمل واضحة",
    seoDescription: "تعرف على خطوات طلب عزل الأسطح بالرياض، والعوامل التي تحدد طريقة العمل والمواد المناسبة لكل سطح.",
    excerpt: "دليل خدمة عزل الأسطح بالرياض: تحديد الحاجة، فحص السطح، توضيح النطاق، واختيار الطريقة المناسبة بعد مراجعة الموقع.",
    intro: "تبدأ خدمة عزل الأسطح بالرياض بفهم سبب طلب العزل وحالة السطح، لا باختيار مادة واحدة لجميع المباني. تختلف احتياجات السطح بحسب الطبقات الموجودة، وتصريف المياه، والتعرض للشمس، والغرض المطلوب من العزل. تساعد المعاينة ووصف الموقع على تحديد نطاق العمل قبل اعتماد الموعد.",
    sections: [
      {
        heading: "متى يُطلب عزل السطح؟",
        paragraphs: [
          "قد يطلب المالك العزل للحد من انتقال الحرارة، أو لمعالجة تعرض السطح للرطوبة، أو عند تجهيز مبنى جديد. هذه احتياجات مختلفة، لذلك ينبغي شرح المشكلة ومكان ظهورها عند التواصل. وجود أثر رطوبة داخل المبنى لا يثبت وحده أن مصدره السطح؛ فقد يرتبط بمواسير أو فتحات أو تفاصيل إنشائية أخرى.",
          "قبل تحديد العمل، يفيد تسجيل مساحة السطح التقريبية ونوع العقار ووجود طبقة عزل سابقة أو إصلاحات سابقة. الصور العامة للموقع تساعد على فهم الطلب الأولي، لكن تحديد الطريقة النهائية يعتمد على مراجعة الحالة الفعلية."
        ],
        items: [
          "حالة طبقات السطح القائمة ومدى تماسكها.",
          "مناطق تجمع المياه ومصارف السطح والفتحات.",
          "الغرض من العزل والجزء الذي يحتاج إلى معالجة.",
          "سهولة الوصول للموقع وحماية المناطق المحيطة."
        ]
      },
      {
        heading: "كيف تُحدد طريقة العزل؟",
        paragraphs: [
          "تُراجع طبيعة السطح والطبقات السابقة وأماكن الوصلات والتصريف قبل الاتفاق على نطاق العمل. بعد ذلك يوضح للعميل ما يتضمنه الطلب، والأجزاء التي تحتاج إلى تجهيز، والمواد المقترحة وفق الاستخدام وحالة الموقع. إذا ظهرت علامات تسرب أو تلف إنشائي، فينبغي تحديد مصدرها وعدم اعتبار العزل بديلاً عن إصلاح السبب.",
          "يشمل التنسيق الجيد توضيح المساحة التقريبية، والخطوات المتوقعة، وما إذا كان يلزم إخلاء أو حماية بعض أجزاء السطح. كما تُذكر أي أعمال إضافية منفصلة قبل اعتماد الموعد حتى يكون نطاق الخدمة مفهوماً للطرفين."
        ]
      },
      {
        heading: "معلومات تساعد على تجهيز الطلب",
        paragraphs: [
          "عند طلب عزل أسطح بالرياض، أرسل الحي ونوع العقار ومساحة السطح التقريبية، واذكر هل الهدف حراري أم مرتبط بالرطوبة. أضف وصفاً لأي طبقة موجودة أو ملاحظة ظاهرة، وشارك صوراً للموقع إن كانت مناسبة. تساعد هذه المعلومات على مراجعة الطلب وتحديد ما يلزم قبل التنفيذ.",
          "لا توجد تكلفة واحدة تناسب جميع الأسطح؛ إذ تتأثر بالتجهيز المطلوب، وحالة الطبقات، وطبيعة المادة، وإمكانية الوصول. لذلك يحدد العرض بعد معرفة التفاصيل، ولا ينبغي اعتماد رقم عام قبل توضيح النطاق."
        ]
      },
      {
        heading: "أسئلة شائعة عن عزل الأسطح",
        items: [
          "هل العزل الحراري هو نفسه العزل المائي؟ الغرض وطريقة المعالجة يختلفان، ويحدد المطلوب بعد شرح المشكلة وفحص السطح.",
          "هل يعالج العزل كل حالات تسرب المياه؟ ليس بالضرورة؛ يجب معرفة مصدر التسرب أولاً، فقد يحتاج إلى إصلاح منفصل.",
          "ما المعلومات المطلوبة لطلب الخدمة؟ الحي، نوع المبنى، مساحة السطح التقريبية، والغرض من العزل."
        ]
      }
    ]
  },
  {
    title: "العزل الحراري بالرياض",
    targetKeyword: "العزل الحراري بالرياض",
    sourceImage: "seo-gallery/insulation-foam-work.jpg",
    seoTitle: "العزل الحراري بالرياض | تقييم الموقع واختيار الطريقة",
    seoDescription: "دليل العزل الحراري بالرياض، من تقييم المبنى والسطح إلى تحديد نطاق العمل والمواد الملائمة للموقع.",
    excerpt: "تعرف على العوامل التي تدخل في طلب العزل الحراري بالرياض، وكيفية مراجعة المبنى وتحديد نطاق الخدمة قبل التنفيذ.",
    intro: "تختلف متطلبات العزل الحراري بالرياض باختلاف المبنى ومصادر اكتساب الحرارة والأسطح المعرضة للشمس. لذلك يبدأ الطلب بتحديد الجزء المراد عزله وهدف العمل، ثم مراجعة حالة الموقع والطبقات الموجودة. الصورة هنا توضيحية وليست توثيقاً لطريقة تنفيذ معتمدة لدى الشركة.",
    sections: [
      {
        heading: "ما الذي يؤثر في العزل الحراري؟",
        paragraphs: [
          "تؤثر مساحة السطح أو الجدار، واتجاهه، وحالة التشطيب، ووجود مواد سابقة في تحديد الخيارات المناسبة. كما يختلف التعامل مع مبنى قائم عن مبنى قيد التجهيز. وصف هذه التفاصيل يساعد على تكوين تصور واقعي عن العمل، لكنه لا يغني عن فحص الموقع عند الحاجة.",
          "لا يمكن ضمان مقدار محدد لتغير درجة الحرارة أو استهلاك الطاقة من دون بيانات عن المبنى والاستخدام والطقس وأنظمة التكييف. عند طلب الخدمة، يفضل التركيز على الجزء المراد عزله والنتيجة المتوقعة بدلاً من الاعتماد على نسب عامة."
        ],
        items: [
          "نوع السطح أو الجدار وحالة التشطيب.",
          "التعرض للشمس ومصادر الحرارة القريبة.",
          "وجود عزل سابق أو أعمال صيانة سابقة.",
          "طريقة الوصول ومتطلبات حماية المكان."
        ]
      },
      {
        heading: "خطوات طلب العزل الحراري",
        paragraphs: [
          "يبدأ التنسيق بتحديد الحي ونوع العقار والمساحة التقريبية، ثم مراجعة الجزء المطلوب مع العميل. بعد ذلك يوضح نطاق التجهيز والتنفيذ والمواد المقترحة وفق خصائص الموقع. لا تُفترض ملاءمة مادة بعينها لجميع الأسطح، ولا يعتمد اختيارها قبل فهم ظروف التطبيق.",
          "قبل بدء العمل، يتفق الطرفان على الأجزاء المشمولة، وترتيب الخطوات، والموعد، وأي تجهيز يحتاجه المكان. وبعد التنفيذ تتم مراجعة النقاط المتفق عليها وتوضيح أي تعليمات متعلقة بالاستخدام أو أعمال أخرى."
        ]
      },
      {
        heading: "اختيار طريقة مناسبة للمبنى",
        paragraphs: [
          "قد تختلف طريقة العزل بحسب السطح ودرجة تعرضه والعناصر الموجودة عليه. لذلك من المهم السؤال عن ملاءمة الطريقة للموقع، وكيفية تجهيز السطح، وما الذي لا يشمله العمل. إذا كان الهدف تقليل انتقال الحرارة من السقف، فاذكر ذلك بوضوح لتمييزه عن معالجة الرطوبة أو العزل المائي.",
          "العزل جزء من مجموعة عوامل تؤثر على الراحة داخل المبنى، ومنها التهوية وحالة النوافذ والعزل القائم. يساعد شرح هذه العوامل على وضع توقعات منطقية بدلاً من ربط النتيجة بعنصر واحد فقط."
        ]
      },
      {
        heading: "أسئلة شائعة عن العزل الحراري",
        items: [
          "هل يمكن تحديد السعر بالاتصال فقط؟ يمكن تقدير الطلب بعد جمع التفاصيل، ويعتمد السعر النهائي على مساحة الموقع وحالته ونطاق العمل.",
          "هل تستخدم طريقة واحدة لكل المباني؟ لا؛ تحدد الطريقة بعد مراجعة الجزء المراد عزله وظروف الموقع.",
          "هل تضمن الخدمة خفض فاتورة الكهرباء بنسبة معينة؟ لا يصح ضمان نسبة ثابتة من دون دراسة المبنى وظروف تشغيله."
        ]
      }
    ]
  },
  {
    title: "عزل خزانات المياه بالرياض",
    targetKeyword: "عزل خزانات المياه بالرياض",
    sourceImage: "seo-gallery/insulation-water-tank.jpg",
    seoTitle: "عزل خزانات المياه بالرياض | تقييم حالة الخزان",
    seoDescription: "تعرف على طلب عزل خزانات المياه بالرياض، والفرق بين العزل والتنظيف وإصلاح التسرب قبل تحديد نطاق العمل.",
    excerpt: "دليل عزل خزانات المياه بالرياض، مع توضيح المعلومات اللازمة لمراجعة الخزان وتحديد نطاق الخدمة المناسب.",
    intro: "يحتاج طلب عزل خزانات المياه بالرياض إلى تحديد نوع الخزان وموقعه والجزء المطلوب معالجته. العزل يختلف عن تنظيف الخزان وعن إصلاح كسر أو تسرب؛ لذلك يساعد وصف المشكلة على اختيار نطاق واضح بدلاً من الخلط بين الخدمات.",
    sections: [
      {
        heading: "متى يُطلب عزل الخزان؟",
        paragraphs: [
          "قد يتصل الطلب بظروف الخزان الخارجية أو تعرضه للشمس أو الحاجة إلى معالجة سطح محدد. أما تغير الماء أو ظهور رائحة أو رواسب فقد يرتبط بالتنظيف أو بحالة الخزان الداخلية، وليس بالعزل وحده. من المهم وصف العلامة التي لاحظها العميل ومكانها قبل تحديد نوع الخدمة.",
          "تختلف الخزانات في الموقع والخامة وإمكانية الوصول. لذلك تُراجع المعلومات المتاحة عن الخزان والطبقات الموجودة حوله قبل تحديد طريقة التنفيذ. لا تلامس مواد العزل مياه الشرب مباشرة إلا إذا كانت مصممة ومصرحاً باستخدامها لهذا الغرض."
        ],
        items: [
          "نوع الخزان وموقعه وما إذا كان علوياً أو أرضياً.",
          "السطح المراد عزله وهل توجد طبقات أو صيانة سابقة.",
          "الغرض من العزل والعلامات الظاهرة حول الخزان.",
          "إمكانية الوصول ومتطلبات السلامة في الموقع."
        ]
      },
      {
        heading: "الفرق بين العزل والتنظيف والإصلاح",
        paragraphs: [
          "تنظيف الخزان يعالج الرواسب والأوساخ ضمن خدمة التنظيف، بينما يهدف العزل إلى معالجة السطح وفق الغرض المتفق عليه. أما التسرب الناتج عن وصلة أو شرخ فقد يحتاج إلى إصلاح مستقل. يساهم تحديد المشكلة بدقة في تحويل الطلب إلى الخدمة المناسبة، ويمنع توقع نتيجة من عمل لا يعالج السبب.",
          "إذا كان المطلوب يجمع أكثر من خدمة، فاذكر ذلك عند التواصل ليتم توضيح الأعمال المشمولة وترتيبها. قبل العمل، ينبغي الاتفاق على المواد المناسبة للجزء الخارجي أو الداخلي، والالتزام بمتطلبات الاستخدام الآمن لمياه الشرب."
        ]
      },
      {
        heading: "معلومات لتنسيق الطلب",
        paragraphs: [
          "أرسل موقع العقار ونوع الخزان ومكانه والمساحة التقريبية، مع شرح سبب طلب العزل. صور الخزان من الخارج قد تساعد على فهم الوصول والموقع. بعد مراجعة التفاصيل يوضح نطاق العمل والمواد المناسبة والوقت المتوقع، وتذكر أي أعمال تنظيف أو إصلاح بشكل مستقل.",
          "لا يوجد سعر موحد لكل الخزانات؛ فالحجم، وموقع الخزان، والحالة السطحية، والتجهيزات اللازمة عوامل تؤثر في التقدير. لذلك يفضل طلب تحديد نطاق مكتوب قبل اعتماد الموعد."
        ]
      },
      {
        heading: "أسئلة شائعة عن عزل خزانات المياه",
        items: [
          "هل العزل يغني عن تنظيف الخزان؟ لا؛ لكل خدمة غرض مختلف ويمكن طلبهما معاً عند الحاجة.",
          "هل يعالج العزل وجود تسرب؟ يجب تحديد مصدر التسرب، فقد يتطلب إصلاحاً منفصلاً قبل أي عزل.",
          "هل تصلح كل المواد لملامسة مياه الشرب؟ لا؛ لا تستخدم مادة على سطح يلامس الماء إلا إذا كانت مناسبة ومصرحاً بها لهذا الاستخدام."
        ]
      }
    ]
  }
];

function slugify(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function renderContent(page) {
  const sections = page.sections.map((section) => {
    const paragraphs = (section.paragraphs || []).map((paragraph) => `<p>${paragraph}</p>`).join("");
    const items = section.items?.length
      ? `<ul>${section.items.map((item) => `<li>${item}</li>`).join("")}</ul>`
      : "";
    return `<section><h2>${section.heading}</h2>${paragraphs}${items}</section>`;
  }).join("");
  const relatedLinks = pages
    .filter((item) => item.targetKeyword !== page.targetKeyword)
    .map((item) => `<li><a href="/page/${slugify(item.title)}">${item.title}</a></li>`)
    .join("");
  return [
    `<p>${page.intro}</p>`,
    sections,
    `<section><h2>كيف تطلب الخدمة؟</h2><p>أرسل الحي ونوع الموقع والجزء المراد عزله، وأوضح الغرض من الطلب وأي ملاحظات ظاهرة. بعد مراجعة التفاصيل يتم توضيح نطاق العمل والمواد المقترحة والموعد قبل البدء، ولا يعتمد السعر أو طريقة التنفيذ قبل معرفة حالة الموقع.</p><p>للاستفسار عن الخدمة العامة، راجع <a href="/services/${serviceSlug}">عزل الأسطح بالرياض</a> أو تواصل هاتفياً واذكر نوع العزل المطلوب.</p></section>`,
    `<section><h2>صفحات ذات صلة</h2><ul>${relatedLinks}</ul></section>`,
  ].join("");
}

const uploadDirectories = [
  join(ROOT, "uploads"),
  join(ROOT, "artifacts", "api-server", "uploads"),
  join(publicDir, "uploads"),
].filter((directory) => existsSync(directory));

const postImageRepairs = [];
const posts = db.prepare(`
  SELECT id, title, slug, seo_keywords, cover_image, og_image, category
  FROM posts
  WHERE status = 'published' AND is_active = 1
`).all();

for (const post of posts) {
  const previousCover = String(post.cover_image || "");
  let sourcePath;
  if (previousCover.startsWith("/images/blog/")) {
    sourcePath = join(publicDir, previousCover.replace(/^\/+/, ""));
  } else {
    if (!/(?:^|\/)(?:api\/)?uploads\//i.test(previousCover)) continue;
    const fallback = resolvePostImage(post, uploadDirectories, "cover_image");
    if (!fallback.startsWith("/images/service-")) continue;
    sourcePath = join(publicDir, fallback.replace(/^\/+/, ""));
  }
  if (!existsSync(sourcePath)) throw new Error(`Missing post image source: ${sourcePath}`);
  const filename = `${slugify(post.title) || `post-${post.id}`}-${post.id}.jpg`;
  const imagePath = `/images/blog/${filename}`;
  if (imagePath === previousCover && imagePath === post.og_image) continue;
  copyFileSync(sourcePath, join(blogImageDir, filename));
  postImageRepairs.push({ id: post.id, imagePath });
}

const upsertPage = db.prepare(`
  UPDATE seo_pages SET
    title = @title, slug = @slug, target_keyword = @target_keyword,
    content = @content, excerpt = @excerpt, cover_image = @cover_image,
    category = @category, tags = @tags, status = 'published',
    published_at = COALESCE(published_at, @published_at), is_active = 1,
    "order" = @order, seo_title = @seo_title,
    seo_description = @seo_description, seo_keywords = @seo_keywords,
    seo_slug = @seo_slug, og_image = @og_image,
    canonical_url = @canonical_url, updated_at = @updated_at
  WHERE id = @id
`);
const insertPage = db.prepare(`
  INSERT INTO seo_pages
    (title, slug, target_keyword, content, excerpt, cover_image, category, tags,
     status, published_at, view_count, is_active, "order", seo_title,
     seo_description, seo_keywords, seo_slug, og_image, canonical_url,
     created_at, updated_at)
  VALUES
    (@title, @slug, @target_keyword, @content, @excerpt, @cover_image, @category, @tags,
     'published', @published_at, 0, 1, @order, @seo_title,
     @seo_description, @seo_keywords, @seo_slug, @og_image, @canonical_url,
     @created_at, @updated_at)
`);
const findPage = db.prepare("SELECT id, created_at, published_at FROM seo_pages WHERE target_keyword = ? OR slug = ? LIMIT 1");
const findService = db.prepare("SELECT id FROM services WHERE seo_slug = ? OR title = ? LIMIT 1");
const updateService = db.prepare(`
  UPDATE services SET
    title = @title, description = @description, icon = @icon,
    image_url = @image_url, images = @images, "order" = @order,
    is_active = 1, seo_enabled = 1, seo_title = @seo_title,
    seo_description = @seo_description, seo_keywords = @seo_keywords,
    seo_slug = @seo_slug
  WHERE id = @id
`);
const insertService = db.prepare(`
  INSERT INTO services
    (title, description, icon, image_url, images, "order", is_active,
     seo_enabled, seo_title, seo_description, seo_keywords, seo_slug)
  VALUES
    (@title, @description, @icon, @image_url, @images, @order, 1,
     1, @seo_title, @seo_description, @seo_keywords, @seo_slug)
`);
const updatePostImage = db.prepare("UPDATE posts SET cover_image = ?, og_image = ?, updated_at = ? WHERE id = ?");

let createdPages = 0;
let updatedPages = 0;
let serviceId = null;
db.transaction(() => {
  pages.forEach((page, index) => {
    const slug = slugify(page.title);
    const imagePath = `/images/seo/${slugify(page.targetKeyword)}.jpg`;
    const sourcePath = join(publicDir, "images", page.sourceImage);
    const targetPath = join(publicDir, imagePath.replace(/^\/images\//, "images/"));
    if (!existsSync(sourcePath)) throw new Error(`Missing insulation source image: ${sourcePath}`);
    copyFileSync(sourcePath, targetPath);
    const content = renderContent(page);
    const visibleChars = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().length;
    if (visibleChars < 900) throw new Error(`Insulation page is too short: ${page.title} (${visibleChars} characters)`);
    const row = {
      title: page.title,
      slug,
      target_keyword: page.targetKeyword,
      content,
      excerpt: page.excerpt,
      cover_image: imagePath,
      category: "خدمات العزل",
      tags: JSON.stringify([page.targetKeyword, "عزل بالرياض", "الرياض"]),
      published_at: now,
      order: index,
      seo_title: page.seoTitle,
      seo_description: page.seoDescription,
      seo_keywords: `${page.targetKeyword}، عزل بالرياض، خدمات العزل، الرياض`,
      seo_slug: slug,
      og_image: imagePath,
      canonical_url: `/page/${slug}`,
      updated_at: now,
      created_at: now,
    };
    const existing = findPage.get(page.targetKeyword, slug);
    if (existing) {
      upsertPage.run({ ...row, id: existing.id, created_at: existing.created_at, published_at: existing.published_at || now });
      updatedPages++;
    } else {
      insertPage.run(row);
      createdPages++;
    }
  });

  const service = {
    title: "عزل أسطح بالرياض",
    description: "خدمة عزل للأسطح بالرياض تبدأ بتحديد الغرض من العزل ومراجعة حالة الموقع، ثم توضيح نطاق العمل والطريقة المناسبة قبل التنسيق على الموعد.",
    icon: "ShieldCheck",
    image_url: serviceImage,
    images: JSON.stringify([serviceImage]),
    order: 16,
    seo_title: "عزل أسطح بالرياض | خطوات العمل والمعاينة",
    seo_description: "تعرف على خدمة عزل الأسطح بالرياض، وخطوات تحديد نطاق العمل والصورة المناسبة للموقع.",
    seo_keywords: "عزل أسطح بالرياض، عزل بالرياض، خدمات العزل، عزل الأسطح",
    seo_slug: serviceSlug,
  };
  const existingService = findService.get(serviceSlug, service.title);
  if (existingService) {
    serviceId = existingService.id;
    updateService.run({ ...service, id: serviceId });
  } else {
    const result = insertService.run(service);
    serviceId = Number(result.lastInsertRowid);
  }

  for (const repair of postImageRepairs) {
    updatePostImage.run(repair.imagePath, repair.imagePath, now, repair.id);
  }
})();

const referencedBlogImages = new Set(
  db.prepare("SELECT cover_image, og_image FROM posts").all()
    .flatMap((post) => [post.cover_image, post.og_image])
    .filter((image) => typeof image === "string" && image.startsWith("/images/blog/")),
);
let removedOrphanBlogImages = 0;
for (const filename of readdirSync(blogImageDir)) {
  if (!filename.endsWith(".jpg")) continue;
  const imagePath = `/images/blog/${filename}`;
  if (referencedBlogImages.has(imagePath)) continue;
  unlinkSync(join(blogImageDir, filename));
  removedOrphanBlogImages++;
}

db.close();
console.log(JSON.stringify({
  createdPages,
  updatedPages,
  serviceId,
  repairedPostCovers: postImageRepairs.length,
  removedOrphanBlogImages,
  pages: pages.map((page) => ({
    title: page.title,
    targetKeyword: page.targetKeyword,
    image: `/images/seo/${slugify(page.targetKeyword)}.jpg`,
  })),
  repairedPostImages: postImageRepairs,
}, null, 2));
