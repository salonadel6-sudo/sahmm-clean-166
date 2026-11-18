<?php
declare(strict_types=1);

require_once __DIR__ . '/seo-page-overrides.php';

$assert = static function (bool $condition, string $message): void {
    if (!$condition) {
        throw new RuntimeException($message);
    }
};

$assert(seoPageOverrideNormalizePath('/about') === '/about', 'Known static route should be editable.');
$assert(
    seoPageOverrideNormalizePath('/contact/%D8%B4%D8%B1%D9%83%D8%A9-%D8%AA%D9%86%D8%B8%D9%8A%D9%81-%D8%A8%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6')
        === '/contact/شركة-تنظيف-بالرياض',
    'Arabic encoded paths should normalize consistently.',
);
$assert(seoPageOverrideNormalizePath('/areas/al-malqa') === '/areas/al-malqa', 'Area route should be editable.');
$assert(seoPageOverrideNormalizePath('/offers') === null, 'SPA-only routes must not be editable as published HTML.');
$assert(seoPageOverrideNormalizePath('/areas/%2e%2e/about') === null, 'Path traversal must be rejected.');
$assert(
    seoPageOverrideSanitizeText('<script>alert(1)</script>آمن') === 'آمن',
    'Script content must not survive sanitization.',
);

$html = '<!doctype html><html><head><title>عنوان قديم</title>'
    . '<meta name="description" content="وصف قديم">'
    . '<link rel="canonical" href="https://site.example/about">'
    . '</head><body><main><h1 class="title">قديم</h1><p>المحتوى الأساسي</p></main></body></html>';
$override = [
    'path' => '/about',
    'seoTitle' => 'شركة "السهم" بالرياض',
    'description' => 'وصف آمن',
    'focusKeyword' => 'شركة تنظيف بالرياض',
    'h1' => 'تعرف على شركة تنظيف بالرياض',
    'content' => "## الخبرة\n- فريق مؤهل",
    'sitemapEligible' => true,
    'updatedAt' => '2026-10-19T00:00:00+00:00',
];
$updated = seoPageOverrideApplyToHtml($html, $override);
$assert(str_contains($updated, '<title>شركة &quot;السهم&quot; بالرياض</title>'), 'Title must be escaped and updated.');
$assert(str_contains($updated, 'name="description" content="وصف آمن"'), 'Description metadata must be updated.');
$assert(str_contains($updated, '<h1 class="title">تعرف على شركة تنظيف بالرياض</h1>'), 'The existing H1 wrapper must be retained.');
$assert(str_contains($updated, '<h2>الخبرة</h2><ul><li>فريق مؤهل</li></ul>'), 'Markdown-like content should render safely.');
$assert(str_contains($updated, 'href="https://site.example/about"'), 'Canonical URL must remain unchanged.');
$assert(seoPageOverrideIsIndexableHtml($html, '/about', 'https://site.example'), 'Self-canonical indexable page should qualify for sitemap.');
$assert(
    !seoPageOverrideIsIndexableHtml($html, '/about', 'https://different.example'),
    'A canonical from another host must not qualify for sitemap.',
);
$assert(
    seoPageOverrideIsIndexableHtml(
        str_replace('https://site.example', '__CLEANFLOW_SITE_ORIGIN__', $html),
        '/about',
        'http://localhost:4321',
    ),
    'A runtime-bound canonical token should qualify for the active site.',
);
$assert(
    !seoPageOverrideIsIndexableHtml(
        str_replace('</head>', '<meta name="googlebot" content="noindex,follow"></head>', $html),
        '/about',
        'https://site.example',
    ),
    'A noindex directive must keep the page out of sitemap.',
);

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('CREATE TABLE site_settings ("key" TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)');
seoPageOverrideWrite($pdo, '/about', $override);
$stored = seoPageOverrideRead($pdo, '/about');
$assert(is_array($stored), 'Saved override must be readable from site_settings.');
$assert(($stored['seoTitle'] ?? '') === $override['seoTitle'], 'Stored title should round-trip.');
$assert(($stored['content'] ?? '') === $override['content'], 'Stored content should round-trip.');
$assert(($stored['sitemapEligible'] ?? false) === true, 'Sitemap eligibility should round-trip.');

fwrite(STDOUT, "PHP static SEO page override tests passed.\n");
