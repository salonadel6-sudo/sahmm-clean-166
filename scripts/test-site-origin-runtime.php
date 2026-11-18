<?php
declare(strict_types=1);

require_once __DIR__ . '/site-origin-runtime.php';

function assertSiteOrigin(string $expected, string $actual, string $case): void {
    if ($actual !== $expected) {
        throw new RuntimeException($case . ': expected ' . $expected . ', received ' . $actual);
    }
}

function assertContainsText(string $needle, string $haystack, string $case): void {
    if (strpos($haystack, $needle) === false) {
        throw new RuntimeException($case . ': expected text was not found.');
    }
}

putenv('CLEANFLOW_STATIC_BUILD');
putenv('CLEANFLOW_SITE_ORIGIN');

$productionSitemap = '<loc>https://alsahmm.com/sitemap1.xml</loc><loc>'
    . CLEANFLOW_SITE_ORIGIN_TOKEN . '/sitemap2.xml</loc>';
$productionStoredSitemap = cleanflowSitemapStorageContent(
    $productionSitemap,
    'https://alsahmm.com',
);
assertContainsText(
    '<loc>https://alsahmm.com/sitemap1.xml</loc>',
    $productionStoredSitemap,
    'production sitemap storage keeps the public origin',
);
assertContainsText(
    '<loc>https://alsahmm.com/sitemap2.xml</loc>',
    $productionStoredSitemap,
    'production sitemap storage replaces legacy origin tokens',
);
if (strpos($productionStoredSitemap, CLEANFLOW_SITE_ORIGIN_TOKEN) !== false) {
    throw new RuntimeException('Production sitemap storage must not retain the origin token.');
}

putenv('CLEANFLOW_STATIC_BUILD=1');
$buildStoredSitemap = cleanflowSitemapStorageContent(
    '<loc>https://alsahmm.com/sitemap1.xml</loc>',
    'https://alsahmm.com',
);
assertContainsText(
    '<loc>' . CLEANFLOW_SITE_ORIGIN_TOKEN . '/sitemap1.xml</loc>',
    $buildStoredSitemap,
    'static sitemap builds remain portable between hosts',
);
putenv('CLEANFLOW_STATIC_BUILD');

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('CREATE TABLE site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
$stmt = $pdo->prepare('INSERT INTO site_settings (key, value) VALUES (:key, :value)');
$stmt->execute([':key' => 'site_public_url', ':value' => 'https://alsahmm.com']);

$_SERVER = [
    'HTTP_X_FORWARDED_HOST' => 'invalid host/path',
    'HTTP_X_FORWARDED_PROTO' => 'https',
    'HTTP_HOST' => 'alsahmm.com',
];
assertSiteOrigin(
    'https://alsahmm.com',
    cleanflowCurrentSiteOrigin($pdo),
    'invalid forwarded host must not override a valid request host'
);

$_SERVER = [
    'HTTP_X_FORWARDED_HOST' => 'invalid host/path',
    'HTTP_X_FORWARDED_PROTO' => 'unknown',
];
assertSiteOrigin(
    'https://alsahmm.com',
    cleanflowCurrentSiteOrigin($pdo),
    'saved public origin is a last resort when request headers are unusable'
);

$_SERVER = [
    'HTTP_HOST' => 'active.example',
    'HTTP_X_FORWARDED_HOST' => 'proxy.example',
    'HTTP_X_FORWARDED_PROTO' => 'https',
];
assertSiteOrigin(
    'https://active.example',
    cleanflowCurrentSiteOrigin($pdo),
    'the serving request host must take precedence over the saved origin'
);

echo "Hostinger site-origin fallback tests passed.\n";
