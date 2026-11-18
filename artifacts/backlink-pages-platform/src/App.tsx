import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, Compass, ExternalLink, Map, Search } from 'lucide-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { partnerLinks, sitePages, type SitePage } from '@/data/sitePages';
import { sabaikPages, type SabaikPage } from '@/data/sabaikPages';
import { taqiPages, type TaqiPage } from '@/data/taqiPages';
import { buildPageArticle } from './shared/pageArticle';

type AtlasPage = SitePage | SabaikPage | TaqiPage;
const totalPageCount = sitePages.length + sabaikPages.length + taqiPages.length;
const internalLinkCount = totalPageCount;
const externalLinkCount = totalPageCount + partnerLinks.length;
const allLinkCount = internalLinkCount + externalLinkCount;

const queryClient = new QueryClient();

function assetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}

function pageImageUrl(path: string) {
  return path.startsWith('http') ? path : assetUrl(path);
}

function detectMountPath() {
  if (typeof window === 'undefined') return '';
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const routeMarkers = ['/page/', '/sabaik', '/taqi'];
  const markerIndex = routeMarkers
    .map((marker) => pathname.indexOf(marker))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  if (markerIndex !== undefined) return pathname.slice(0, markerIndex);
  return pathname === '/' ? '' : pathname;
}

const arabicStaticTitles: Record<string, string> = {
  '/': 'الصفحة الرئيسية',
  '/about': 'عن السهم',
  '/services': 'دليل الخدمات',
  '/cleaning-packages': 'باقات التنظيف',
  '/contact': 'تواصل مع الموقع',
  '/areas': 'مناطق التغطية',
  '/faq': 'الأسئلة الشائعة',
  '/terms': 'الشروط والأحكام',
  '/privacy': 'الخصوصية',
  '/blog': 'مجلة السهم',
};

const arabicCategoryNames: Record<string, string> = {
  الرئيسية: 'الرئيسية',
  'عن الموقع': 'عن الموقع',
  الخدمات: 'خدمات',
  الباقات: 'باقات',
  المقالات: 'مقالات',
  'صفحات SEO': 'أدلة متخصصة',
  'مناطق التغطية': 'مناطق',
};

const arabicTitleAliases: Record<string, string> = {
  'construction debris': 'مخلفات البناء',
  'industrial waste': 'المخلفات الصناعية',
};

function displayTitle(page: AtlasPage) {
  if (page.path === '/cleaning-packages/tanzeef-qosoor') return 'تنظيف قصور بالرياض';
  if (arabicStaticTitles[page.path]) return arabicStaticTitles[page.path];
  if (arabicTitleAliases[page.title]) return arabicTitleAliases[page.title];
  if (/[ء-ي]/.test(page.title)) return page.title;
  const category = arabicCategoryNames[page.category] || 'دليل';
  return `${category} — صفحة ${String(page.id).padStart(3, '0')}`;
}

function routeSlugText(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/[\/\\?%#&<>{}[\]|"'`:+*=@$!,.;^]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'صفحة';
}

function pageRouteSlug(page: AtlasPage) {
  const title = displayTitle(page);
  const collections = page.url.includes('sabaik.net')
    ? sabaikPages
    : page.url.includes('taqigroup.com')
      ? taqiPages
      : sitePages;
  const hasDuplicateTitle = collections.some(
    (item) => item.id !== page.id && displayTitle(item) === title,
  );
  const base = routeSlugText(title);
  return hasDuplicateTitle ? `${base}-${String(page.id).padStart(3, '0')}` : base;
}

function routeParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function pageDescription(page: AtlasPage) {
  if (page.path === '/') return 'بوابة هادئة لاستكشاف صفحات السهم العامة، مرتبة كأطلس رقمي قابل للتصفح.';
  if (page.url.includes('sabaik.net')) {
    return `استكشف ${displayTitle(page)} من صفحات سبائك الماسة، ثم انتقل إلى مواقع صديقة موثقة.`;
  }
  if (page.url.includes('taqigroup.com')) {
    return `استكشف ${displayTitle(page)} من صفحات تقي، ثم انتقل إلى مواقع صديقة موثقة.`;
  }
  return `استكشف ${displayTitle(page)} عبر مواقع صديقة موثقة، ضمن مكتبة صفحات السهم.`;
}

function SourceBacklink({ page }: { page: AtlasPage }) {
  return (
    <p className="source-backlink">
      <span>مواقع صديقة:</span>{' '}
      <a href={page.url} target="_blank" rel="noopener noreferrer">
        {displayTitle(page)}
      </a>
    </p>
  );
}

function PageArticle({ page }: { page: AtlasPage }) {
  const article = buildPageArticle(page);
  const paragraphNodes = (paragraph: string) =>
    paragraph.split(/(\[\[KEYWORD_\d+\]\])/g).map((part, index) => {
      const link = article.keywordLinks.find((item) => item.token === part);
      return link ? (
        <a key={`${page.id}-keyword-${index}`} className="article-keyword-link" href={link.url} target="_blank" rel="noopener noreferrer">
          {link.label}
        </a>
      ) : (
        <span key={`${page.id}-text-${index}`}>{part}</span>
      );
    });
  return (
    <section className="long-article" aria-labelledby={`article-heading-${page.id}`} data-testid={`article-${page.id}`}>
      <p className="detail-eyebrow">مقال إرشادي / دليل عملي</p>
      <h2 id={`article-heading-${page.id}`}>{article.heading}</h2>
      {article.paragraphs.map((paragraph, index) => (
        <p key={`${page.id}-article-${index}`}>{paragraphNodes(paragraph)}</p>
      ))}
    </section>
  );
}

function categoryLabel(category: string) {
  return arabicCategoryNames[category] || category;
}

function usePageMeta(page?: AtlasPage, section: 'atlas' | 'sabaik' | 'taqi' = 'atlas') {
  useEffect(() => {
    const sectionTitle = section === 'sabaik'
      ? 'صفحات سبائك الماسة'
      : section === 'taqi'
        ? 'صفحات تقي'
        : 'أطلس السهم';
    const title = page ? `${displayTitle(page)} | ${sectionTitle}` : `${sectionTitle} | مكتبة الصفحات العامة`;
    const description = page
      ? pageDescription(page)
      : section === 'sabaik'
        ? 'دليل مستقل لصفحات سبائك الماسة وروابطها الأصلية حول تأجير الحاويات ونقل المخلفات في الرياض.'
        : section === 'taqi'
          ? 'دليل مستقل لصفحات تقي وروابطها الأصلية حول تأجير الحاويات ونقل المخلفات في الرياض.'
          : 'أطلس رقمي يقدّم صفحات السهم العامة كوجهات واضحة تستحق الاستكشاف.';
    document.title = title;
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';

    const setMeta = (name: string, content: string, property = false) => {
      const attribute = property ? 'property' : 'name';
      let element = document.head.querySelector(`meta[${attribute}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };
    setMeta('description', description);
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:type', 'website', true);
    setMeta('og:locale', 'ar_SA', true);
    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;
    setMeta('og:url', canonicalUrl, true);
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);
  }, [page, section]);
}

function SiteHeader() {
  const [, setLocation] = useLocation();
  return (
    <header className="topbar">
      <Link href="/" className="brand" data-testid="link-brand-home">
        <span className="brand-mark" aria-hidden="true"><span>أ</span></span>
        <span className="brand-text">
          <span>أطلس السهم</span>
          <small>مكتبة الصفحات العامة</small>
        </span>
      </Link>
      <nav className="topnav" aria-label="التنقل الرئيسي">
        <a href="#directory" data-testid="link-directory-nav">استكشف المكتبة</a>
        <a href="#partners" data-testid="link-partners-nav">الشبكة</a>
        <button className="nav-count" type="button" onClick={() => setLocation('/')} data-testid="button-page-count">
          {totalPageCount} وجهة
        </button>
        <Link href="/sabaik" className="topnav-special">صفحات سبائك الماسة</Link>
        <Link href="/taqi" className="topnav-special">صفحات تقي</Link>
      </nav>
    </header>
  );
}

function PageCard({ page }: { page: SitePage }) {
  return (
    <Link href={`/page/${pageRouteSlug(page)}`} className="page-card" data-testid={`card-page-${page.id}`}>
      <div className="page-card-image">
          <img src={pageImageUrl(page.image)} alt="" loading="lazy" />
      </div>
      <div className="card-meta">
        <span>#{String(page.id).padStart(3, '0')}</span>
        <span className="type-pill">{categoryLabel(page.category)}</span>
      </div>
      <h3 data-testid={`text-page-title-${page.id}`}>{displayTitle(page)}</h3>
      <p>{pageDescription(page)}</p>
      <span className="card-link">فتح الوجهة <ChevronLeft size={15} aria-hidden="true" /></span>
    </Link>
  );
}

function PartnerBacklinkSection() {
  return (
    <section className="backlink-panel" aria-labelledby="backlink-heading">
      <div className="backlink-panel-copy">
        <p className="detail-eyebrow">روابط موثقة / NETWORK</p>
        <h2 id="backlink-heading">استكشف الشبكة المرتبطة</h2>
        <p>
          روابط HTML مباشرة إلى المواقع الثلاثة، مع صورة وهوية نصية واضحة لكل وجهة.
        </p>
      </div>
      <div className="backlink-grid">
        {partnerLinks.map((partner) => (
          <a
            key={partner.url}
            className="backlink-card"
            href={partner.url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`detail-backlink-${partner.name.split('.')[0]}`}
          >
            <img src={assetUrl(partner.image)} alt="" width="54" height="54" />
            <span>
              <strong>{partner.label}</strong>
              <small dir="ltr">{partner.name}</small>
            </span>
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer" id="partners">
      <div className="footer-inner">
        <div className="footer-top">
          <div>
            <h2>شبكة السهم</h2>
            <p>ثلاث وجهات أصلية، ومكتبة واحدة تجمع الصفحات العامة في مسار واضح وقابل للقراءة.</p>
          </div>
          <div className="partners" aria-label="روابط الشركاء">
            {partnerLinks.map((partner) => (
              <a
                key={partner.url}
                className="partner"
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`link-partner-${partner.name.split('.')[0]}`}
              >
                <img src={assetUrl(partner.image)} alt="" width="25" height="25" />
                <span>{partner.label}</span>
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
        <div className="footer-bottom">
          <span>أطلس صفحات السهم العامة</span>
          <span>مبني من خريطة الموقع الحالية · {totalPageCount} صفحة</span>
        </div>
      </div>
    </footer>
  );
}

function Hero() {
  const [, setLocation] = useLocation();
  return (
    <section className="hero">
      <div className="hero-inner reveal">
        <div className="hero-kicker"><Compass size={15} aria-hidden="true" /> فهرس رقمي قابل للاستكشاف</div>
        <h1>كل صفحة لها <em>وجهة.</em></h1>
        <p className="hero-copy">نحوّل خريطة الموقع إلى أطلس بصري: صفحات حقيقية، روابط أصلية، ومسارات تقودك من الفضول إلى المكان الصحيح.</p>
        <div className="hero-bottom">
          <div className="hero-stat" data-testid="stat-page-count">
            <strong>{totalPageCount}</strong>
            <span>وجهة عامة<br />في الخريطة</span>
          </div>
          <div className="hero-stat hero-total-links-stat" data-testid="stat-all-link-count">
            <strong>{allLinkCount}</strong>
            <span>إجمالي الروابط<br />داخلية وخارجية</span>
          </div>
          <div className="hero-stat hero-backlink-stat" data-testid="stat-backlink-count">
            <strong>{externalLinkCount}</strong>
            <span>مواقع صديقة<br />روابط خارجية</span>
          </div>
          <div className="hero-ornament" aria-hidden="true"><i /> RIYADH / WEB ATLAS / 2026</div>
          <button className="feature-arrow" type="button" onClick={() => setLocation('/#directory')} aria-label="انتقل إلى المكتبة" data-testid="button-scroll-directory">
            <ArrowLeft size={24} />
          </button>
        </div>
      </div>
    </section>
  );
}

function SabaikDirectoryPanel() {
  return (
    <section className="sabaik-panel" aria-labelledby="sabaik-panel-heading">
      <div className="sabaik-panel-mark" aria-hidden="true">90</div>
      <div className="sabaik-panel-copy">
        <p className="detail-eyebrow">مسار مستقل / SABAIK ALMASA</p>
        <h2 id="sabaik-panel-heading">صفحات سبائك الماسة</h2>
        <p>مجموعة مستقلة من روابط المنتجات والمقالات وصفحات الموقع الخاصة بسبائك الماسة لتأجير الحاويات في الرياض.</p>
      </div>
      <Link href="/sabaik" className="sabaik-panel-link">
        فتح المجموعة <ArrowLeft size={17} aria-hidden="true" />
      </Link>
    </section>
  );
}

function TaqiDirectoryPanel() {
  return (
    <section className="sabaik-panel taqi-panel" aria-labelledby="taqi-panel-heading">
      <div className="sabaik-panel-mark" aria-hidden="true">108</div>
      <div className="sabaik-panel-copy">
        <p className="detail-eyebrow">مسار مستقل / TAQI GROUP</p>
        <h2 id="taqi-panel-heading">صفحات تقي</h2>
        <p>مجموعة مستقلة من روابط الخدمات والمقالات وصفحات الموقع الخاصة بتقي لتأجير الحاويات ونقل المخلفات في الرياض.</p>
      </div>
      <Link href="/taqi" className="sabaik-panel-link">
        فتح المجموعة <ArrowLeft size={17} aria-hidden="true" />
      </Link>
    </section>
  );
}

function Home() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('الكل');
  const allPages = useMemo<AtlasPage[]>(() => [...sitePages, ...sabaikPages, ...taqiPages], []);
  const categories = useMemo(
    () => ['الكل', ...Array.from(new Set(allPages.map((page) => categoryLabel(page.category))))],
    [allPages],
  );
  const filteredPages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return allPages.filter((page) => {
      const matchesCategory = activeCategory === 'الكل' || categoryLabel(page.category) === activeCategory;
      const haystack = `${displayTitle(page)} ${page.title} ${page.path}`.toLowerCase();
      return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [activeCategory, allPages, query]);
  const featured = sitePages.slice(1, 4);
  usePageMeta();

  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <section className="content" id="directory">
          <div className="toolbar">
            <div className="section-label"><Map size={17} aria-hidden="true" /><span>كل صفحات المنصة</span><strong>{filteredPages.length}</strong></div>
            <label className="search-box">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث في عناوين الصفحات"
                aria-label="ابحث في عناوين الصفحات"
                data-testid="input-search-pages"
              />
            </label>
          </div>
          <SabaikDirectoryPanel />
          <TaqiDirectoryPanel />
          <div className="filters" aria-label="تصفية الصفحات">
            {categories.map((category) => (
              <button
                key={category}
                className="filter"
                type="button"
                aria-pressed={activeCategory === category}
                onClick={() => setActiveCategory(category)}
                data-testid={`button-filter-${category}`}
              >
                {category}
              </button>
            ))}
          </div>
          {!query && activeCategory === 'الكل' && (
            <div className="featured" aria-label="مختارات من المكتبة">
              {featured.map((page, index) => (
                <Link key={page.id} href={`/page/${pageRouteSlug(page)}`} className="feature-card reveal" data-testid={`link-featured-${page.id}`}>
                  <span className="feature-index">0{index + 1} / FEATURED</span>
                  <h3>{displayTitle(page)}</h3>
                  <p>{pageDescription(page)}</p>
                  <span className="feature-arrow"><ArrowLeft size={20} aria-hidden="true" /></span>
                </Link>
              ))}
            </div>
          )}
          <div className="directory-head">
            <div>
              <h2>المكتبة الكاملة</h2>
              <p>كل نتيجة تقود إلى بطاقة تفصيلية ثم إلى الصفحة الأصلية.</p>
            </div>
            <span className="directory-count">{activeCategory}</span>
          </div>
          {filteredPages.length > 0 ? (
            <div className="page-grid" data-testid="grid-all-pages">
              {filteredPages.map((page, index) => <DirectoryCard key={`${page.url}-${index}`} page={page} />)}
            </div>
          ) : (
            <div className="empty-state" data-testid="empty-search-results">لم نعثر على صفحة بهذا الوصف. جرّب عبارة أقصر أو تصنيفاً آخر.</div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

function SabaikCard({ page }: { page: SabaikPage }) {
  return (
    <Link href={`/sabaik/page/${pageRouteSlug(page)}`} className="page-card sabaik-page-card" data-testid={`card-sabaik-page-${page.id}`}>
      <div className="page-card-image">
        <img src={pageImageUrl(page.image)} alt="" loading="lazy" />
      </div>
      <div className="card-meta">
        <span>S-{String(page.id).padStart(3, '0')}</span>
        <span className="type-pill">{page.category}</span>
      </div>
      <h3 data-testid={`text-sabaik-page-title-${page.id}`}>{displayTitle(page)}</h3>
      <p>{pageDescription(page)}</p>
      <span className="card-link">فتح الصفحة <ChevronLeft size={15} aria-hidden="true" /></span>
    </Link>
  );
}

function DirectoryCard({ page }: { page: AtlasPage }) {
  if (page.url.includes('sabaik.net')) return <SabaikCard page={page as SabaikPage} />;
  if (page.url.includes('taqigroup.com')) return <TaqiCard page={page as TaqiPage} />;
  return <PageCard page={page as SitePage} />;
}

function SabaikHome() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('الكل');
  const categories = useMemo(() => ['الكل', ...Array.from(new Set(sabaikPages.map((page) => page.category)))], []);
  const filteredPages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sabaikPages.filter((page) => {
      const matchesCategory = activeCategory === 'الكل' || page.category === activeCategory;
      const haystack = `${page.title} ${page.path}`.toLowerCase();
      return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [activeCategory, query]);
  usePageMeta(undefined, 'sabaik');

  return (
    <>
      <SiteHeader />
      <main>
        <section className="sabaik-hero">
          <div className="sabaik-hero-inner reveal">
            <Link href="/" className="back-link">← العودة إلى الأطلس</Link>
            <p className="detail-eyebrow">SABAIK ALMASA / SPECIAL DIRECTORY</p>
            <h1>صفحات <em>سبائك الماسة.</em></h1>
            <p>مسار مستقل يجمع روابط سبائك الماسة الأصلية في دليل واضح للمنتجات والمقالات وصفحات الموقع.</p>
            <div className="sabaik-hero-stats">
              <strong>{sabaikPages.length}</strong><span>صفحة مرتبطة</span>
              <strong>{categories.length - 1}</strong><span>تصنيفات</span>
            </div>
          </div>
        </section>
        <section className="content" id="sabaik-directory">
          <div className="toolbar">
            <div className="section-label"><Map size={17} aria-hidden="true" /><span>دليل سبائك الماسة</span><strong>{filteredPages.length}</strong></div>
            <label className="search-box">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث في صفحات سبائك الماسة"
                aria-label="ابحث في صفحات سبائك الماسة"
                data-testid="input-search-sabaik-pages"
              />
            </label>
          </div>
          <div className="filters" aria-label="تصفية صفحات سبائك الماسة">
            {categories.map((category) => (
              <button
                key={category}
                className="filter"
                type="button"
                aria-pressed={activeCategory === category}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="directory-head">
            <div><h2>المجموعة الكاملة</h2><p>كل بطاقة تقود إلى صفحة تفاصيل ثم إلى المصدر الأصلي على sabaik.net.</p></div>
            <span className="directory-count">{activeCategory}</span>
          </div>
          {filteredPages.length > 0 ? (
            <div className="page-grid" data-testid="grid-sabaik-pages">
              {filteredPages.map((page) => <SabaikCard key={page.id} page={page} />)}
            </div>
          ) : (
            <div className="empty-state">لم نعثر على صفحة بهذا الوصف. جرّب عبارة أقصر أو تصنيفاً آخر.</div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

function SabaikDetail({ slug }: { slug: string }) {
  const decodedSlug = routeParam(slug);
  const page = sabaikPages.find((item) => pageRouteSlug(item) === decodedSlug);
  usePageMeta(page, 'sabaik');

  if (!page) {
    return (
      <div className="not-found">
        <div>
          <p className="detail-eyebrow">404 / SABAIK DESTINATION NOT FOUND</p>
          <h1>هذه الصفحة غير موجودة.</h1>
          <Link href="/sabaik" className="card-link">العودة إلى صفحات سبائك الماسة <ChevronLeft size={16} /></Link>
        </div>
      </div>
    );
  }

  const related = sabaikPages.filter((item) => item.category === page.category && item.id !== page.id).slice(0, 3);
  return (
    <>
      <SiteHeader />
      <main className="detail-wrap reveal">
        <Link href="/sabaik" className="back-link"><ArrowLeft size={16} /> العودة إلى صفحات سبائك الماسة</Link>
        <div className="detail-layout">
          <article className="detail-main">
            <div className="detail-eyebrow">سبائك الماسة · صفحة {String(page.id).padStart(3, '0')} · {page.category}</div>
            <h1 data-testid={`detail-sabaik-title-${page.id}`}>{displayTitle(page)}</h1>
            <SourceBacklink page={page} />
            <p>{pageDescription(page)}</p>
            <div className="detail-visual">
              <img src={pageImageUrl(page.image)} alt="" loading="lazy" />
              <div className="detail-visual-copy">
                <span>وجهة من دليل سبائك الماسة</span>
                <strong>اقرأ الصفحة<br />من مصدرها.</strong>
              </div>
            </div>
            <div className="detail-note">هذه البطاقة فهرس مستقل لا يستبدل الصفحة الأصلية. عند المتابعة ستغادر الأطلس إلى الرابط العام الموثق على sabaik.net.</div>
            <PageArticle page={page} />
          </article>
          <aside className="detail-side">
            <h2>بيانات الصفحة</h2>
            <dl>
              <dt>التصنيف</dt><dd>{page.category}</dd>
              <dt>اقتراحاتنا</dt><dd><a href={page.url} target="_blank" rel="noopener noreferrer">{displayTitle(page)}</a></dd>
            </dl>
            <a className="source-link" href={page.url} target="_blank" rel="noopener noreferrer">
              <span>زيارة الصفحة الأصلية</span><ExternalLink size={15} aria-hidden="true" />
            </a>
          </aside>
        </div>
        <PartnerBacklinkSection />
        <section style={{ marginTop: 66 }}>
          <div className="directory-head"><div><h2>مسارات قريبة</h2><p>صفحات أخرى من التصنيف نفسه.</p></div></div>
          <div className="page-grid">{related.map((item) => <SabaikCard key={item.id} page={item} />)}</div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function TaqiCard({ page }: { page: TaqiPage }) {
  return (
    <Link href={`/taqi/page/${pageRouteSlug(page)}`} className="page-card taqi-page-card" data-testid={`card-taqi-page-${page.id}`}>
      <div className="page-card-image">
        <img src={pageImageUrl(page.image)} alt="" loading="lazy" />
      </div>
      <div className="card-meta">
        <span>T-{String(page.id).padStart(3, '0')}</span>
        <span className="type-pill">{page.category}</span>
      </div>
      <h3 data-testid={`text-taqi-page-title-${page.id}`}>{displayTitle(page)}</h3>
      <p>{pageDescription(page)}</p>
      <span className="card-link">فتح الصفحة <ChevronLeft size={15} aria-hidden="true" /></span>
    </Link>
  );
}

function TaqiHome() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('الكل');
  const categories = useMemo(() => ['الكل', ...Array.from(new Set(taqiPages.map((page) => page.category)))], []);
  const filteredPages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return taqiPages.filter((page) => {
      const matchesCategory = activeCategory === 'الكل' || page.category === activeCategory;
      const haystack = `${page.title} ${page.path}`.toLowerCase();
      return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [activeCategory, query]);
  usePageMeta(undefined, 'taqi');

  return (
    <>
      <SiteHeader />
      <main>
        <section className="sabaik-hero taqi-hero">
          <div className="sabaik-hero-inner reveal">
            <Link href="/" className="back-link">← العودة إلى الأطلس</Link>
            <p className="detail-eyebrow">TAQI GROUP / SPECIAL DIRECTORY</p>
            <h1>صفحات <em>تقي.</em></h1>
            <p>مسار مستقل يجمع روابط تقي الأصلية في دليل واضح للخدمات والحاويات والمقالات وصفحات الموقع.</p>
            <div className="sabaik-hero-stats">
              <strong>{taqiPages.length}</strong><span>صفحة مرتبطة</span>
              <strong>{categories.length - 1}</strong><span>تصنيفات</span>
            </div>
          </div>
        </section>
        <section className="content" id="taqi-directory">
          <div className="toolbar">
            <div className="section-label"><Map size={17} aria-hidden="true" /><span>دليل تقي</span><strong>{filteredPages.length}</strong></div>
            <label className="search-box">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث في صفحات تقي"
                aria-label="ابحث في صفحات تقي"
                data-testid="input-search-taqi-pages"
              />
            </label>
          </div>
          <div className="filters" aria-label="تصفية صفحات تقي">
            {categories.map((category) => (
              <button
                key={category}
                className="filter"
                type="button"
                aria-pressed={activeCategory === category}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="directory-head">
            <div><h2>المجموعة الكاملة</h2><p>كل بطاقة تقود إلى صفحة تفاصيل ثم إلى المصدر الأصلي على taqigroup.com.</p></div>
            <span className="directory-count">{activeCategory}</span>
          </div>
          {filteredPages.length > 0 ? (
            <div className="page-grid" data-testid="grid-taqi-pages">
              {filteredPages.map((page) => <TaqiCard key={page.id} page={page} />)}
            </div>
          ) : (
            <div className="empty-state">لم نعثر على صفحة بهذا الوصف. جرّب عبارة أقصر أو تصنيفاً آخر.</div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

function TaqiDetail({ slug }: { slug: string }) {
  const decodedSlug = routeParam(slug);
  const page = taqiPages.find((item) => pageRouteSlug(item) === decodedSlug);
  usePageMeta(page, 'taqi');

  if (!page) {
    return (
      <div className="not-found">
        <div>
          <p className="detail-eyebrow">404 / TAQI DESTINATION NOT FOUND</p>
          <h1>هذه الصفحة غير موجودة.</h1>
          <Link href="/taqi" className="card-link">العودة إلى صفحات تقي <ChevronLeft size={16} /></Link>
        </div>
      </div>
    );
  }

  const related = taqiPages.filter((item) => item.category === page.category && item.id !== page.id).slice(0, 3);
  return (
    <>
      <SiteHeader />
      <main className="detail-wrap reveal">
        <Link href="/taqi" className="back-link"><ArrowLeft size={16} /> العودة إلى صفحات تقي</Link>
        <div className="detail-layout">
          <article className="detail-main">
            <div className="detail-eyebrow">تقي · صفحة {String(page.id).padStart(3, '0')} · {page.category}</div>
            <h1 data-testid={`detail-taqi-title-${page.id}`}>{displayTitle(page)}</h1>
            <SourceBacklink page={page} />
            <p>{pageDescription(page)}</p>
            <div className="detail-visual">
              <img src={pageImageUrl(page.image)} alt="" loading="lazy" />
              <div className="detail-visual-copy">
                <span>وجهة من دليل تقي</span>
                <strong>اقرأ الصفحة<br />من مصدرها.</strong>
              </div>
            </div>
            <div className="detail-note">هذه البطاقة فهرس مستقل لا يستبدل الصفحة الأصلية. عند المتابعة ستغادر الأطلس إلى الرابط العام الموثق على taqigroup.com.</div>
            <PageArticle page={page} />
          </article>
          <aside className="detail-side">
            <h2>بيانات الصفحة</h2>
            <dl>
              <dt>التصنيف</dt><dd>{page.category}</dd>
              <dt>اقتراحاتنا</dt><dd><a href={page.url} target="_blank" rel="noopener noreferrer">{displayTitle(page)}</a></dd>
            </dl>
            <a className="source-link" href={page.url} target="_blank" rel="noopener noreferrer">
              <span>زيارة الصفحة الأصلية</span><ExternalLink size={15} aria-hidden="true" />
            </a>
          </aside>
        </div>
        <PartnerBacklinkSection />
        <section style={{ marginTop: 66 }}>
          <div className="directory-head"><div><h2>مسارات قريبة</h2><p>صفحات أخرى من التصنيف نفسه.</p></div></div>
          <div className="page-grid">{related.map((item) => <TaqiCard key={item.id} page={item} />)}</div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function PageDetail({ slug }: { slug: string }) {
  const decodedSlug = routeParam(slug);
  const page = sitePages.find((item) => pageRouteSlug(item) === decodedSlug);
  usePageMeta(page);

  if (!page) {
    return (
      <div className="not-found">
        <div>
          <p className="detail-eyebrow">404 / DESTINATION NOT FOUND</p>
          <h1>هذه الوجهة غير موجودة.</h1>
          <Link href="/" className="card-link" data-testid="link-back-home">العودة إلى الأطلس <ChevronLeft size={16} /></Link>
        </div>
      </div>
    );
  }

  const related = sitePages.filter((item) => item.category === page.category && item.id !== page.id).slice(0, 3);
  return (
    <>
      <SiteHeader />
      <main className="detail-wrap reveal">
        <Link href="/" className="back-link" data-testid="link-back-to-atlas"><ArrowLeft size={16} /> العودة إلى الخريطة</Link>
        <div className="detail-layout">
          <article className="detail-main">
            <div className="detail-eyebrow">صفحة رقم {String(page.id).padStart(3, '0')} · {categoryLabel(page.category)}</div>
            <h1 data-testid={`detail-title-${page.id}`}>{displayTitle(page)}</h1>
            <SourceBacklink page={page} />
            <p>{pageDescription(page)}</p>
            <div className="detail-visual">
              <img src={pageImageUrl(page.image)} alt="" loading="lazy" />
              <div className="detail-visual-copy">
                <span>وجهة من خريطة السهم</span>
                <strong>اقرأ الصفحة<br />من مصدرها.</strong>
              </div>
            </div>
            <div className="detail-note">هذه البطاقة فهرس بصري لا يستبدل الصفحة الأصلية. عند المتابعة ستغادر الأطلس إلى الرابط العام الموثق.</div>
            <PageArticle page={page} />
          </article>
          <aside className="detail-side">
            <h2>بيانات الوجهة</h2>
            <dl>
              <dt>التصنيف</dt>
              <dd>{categoryLabel(page.category)}</dd>
              <dt>اقتراحاتنا</dt>
              <dd><a href={page.url} target="_blank" rel="noopener noreferrer">{displayTitle(page)}</a></dd>
            </dl>
            <a className="source-link" href={page.url} target="_blank" rel="noopener noreferrer" data-testid={`link-source-page-${page.id}`}>
              <span>زيارة الصفحة الأصلية</span><ExternalLink size={15} aria-hidden="true" />
            </a>
          </aside>
        </div>
        <PartnerBacklinkSection />
        {related.length > 0 && (
          <section style={{ marginTop: 66 }}>
            <div className="directory-head">
              <div><h2>مسارات قريبة</h2><p>صفحات أخرى من التصنيف نفسه.</p></div>
            </div>
            <div className="page-grid">{related.map((item) => <PageCard key={item.id} page={item} />)}</div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/sabaik" component={SabaikHome} />
        <Route path="/sabaik/page/:slug">
          {(params) => <SabaikDetail slug={params.slug} />}
        </Route>
        <Route path="/taqi" component={TaqiHome} />
        <Route path="/taqi/page/:slug">
          {(params) => <TaqiDetail slug={params.slug} />}
        </Route>
        <Route path="/page/:slug">
          {(params) => <PageDetail slug={params.slug} />}
        </Route>
        <Route>
          <div className="not-found">
            <div>
              <p className="detail-eyebrow">404 / PAGE NOT FOUND</p>
              <h1>لا توجد خريطة لهذا المسار.</h1>
              <Link href="/" className="card-link" data-testid="link-not-found-home">العودة إلى الأطلس <ChevronLeft size={16} /></Link>
            </div>
          </div>
        </Route>
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  useEffect(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={detectMountPath()}>
          <div className="atlas-app"><Router /></div>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;