<?php
declare(strict_types=1);

require_once __DIR__ . '/seo-page-policy.php';

function assertKeywordMap(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
assertKeywordMap(
    rankMathInternalCheckId('rankmath-title-length') === 'titleLength',
    'Prefixed UI check IDs must resolve to the internal Rank Math title-length check.',
);
assertKeywordMap(
    rankMathInternalCheckId('focus-keyword') === 'keyword'
        && rankMathInternalCheckId('not-a-check') === null,
    'Batch repair should map known checks and reject unknown IDs explicitly.',
);
$pdo->exec("CREATE TABLE posts (
    title TEXT, excerpt TEXT, content TEXT, seo_description TEXT, seo_keywords TEXT,
    slug TEXT, status TEXT, is_active INTEGER
)");
$pdo->exec("CREATE TABLE seo_pages (
    title TEXT, excerpt TEXT, content TEXT, seo_description TEXT, seo_keywords TEXT,
    target_keyword TEXT, slug TEXT, status TEXT, is_active INTEGER
)");
$pdo->exec("CREATE TABLE services (
    title TEXT, description TEXT, seo_description TEXT, seo_keywords TEXT,
    seo_slug TEXT, is_active INTEGER
)");
$pdo->exec("CREATE TABLE site_settings (key TEXT PRIMARY KEY, value TEXT)");

$insertPost = $pdo->prepare("INSERT INTO posts VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
$insertPost->execute([
    'شركة تنظيف بالرياض',
    'خدمات شركة تنظيف بالرياض',
    '<p>شركة تنظيف بالرياض شركة تنظيف منازل بالرياض</p>',
    '',
    '["شركة تنظيف بالرياض"]',
    'cleaning-article',
    'published',
    1,
]);
$insertPage = $pdo->prepare("INSERT INTO seo_pages VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
$insertPage->execute([
    'شركة تنظيف منازل بالرياض',
    '',
    '<p>خدمات شركة تنظيف منازل بالرياض داخل الرياض</p>',
    '',
    '["شركة تنظيف منازل بالرياض"]',
    'شركة تنظيف منازل بالرياض',
    'home-cleaning',
    'published',
    1,
]);
$insertService = $pdo->prepare("INSERT INTO services VALUES (?, ?, ?, ?, ?, ?)");
$insertService->execute([
    'تنظيف المنازل',
    'شركة تنظيف بالرياض تقدم خدمات تنظيف منازل بالرياض',
    '',
    'شركة تنظيف منازل بالرياض',
    'home-cleaning',
    1,
]);
$insertSetting = $pdo->prepare("INSERT INTO site_settings (key, value) VALUES (?, ?)");
$insertSetting->execute([
    'seo_keywords',
    json_encode([
        [
            'term' => 'شركة تنظيف بالرياض',
            'position' => 3,
            'volume' => 120,
            'difficulty' => 42,
            'intent' => 'transactional',
            'lastChecked' => '2026-10-16T12:00:00.000Z',
        ],
        [
            'term' => 'شركة تنظيف منازل بالرياض',
            'intent' => 'informational',
        ],
    ], JSON_UNESCAPED_UNICODE),
]);

$map = rankMathKeywordTopicMap($pdo);
assertKeywordMap(count($map['keywords']) === 2, 'The map should contain the two supported site phrases.');
assertKeywordMap($map['keywords'][0]['term'] === 'شركة تنظيف بالرياض', 'The primary phrase should remain first.');
assertKeywordMap(
    str_contains($map['orderSource'], 'ليست ترتيب Google ولا حجم البحث'),
    'The source must distinguish internal content strength from search metrics.',
);

$primary = $map['keywords'][0];
assertKeywordMap(isset($primary['strength'], $primary['occurrences'], $primary['usagePercent']), 'Each phrase should include internal strength evidence.');
assertKeywordMap($primary['usagePercent'] > 0, 'Usage percentage should be calculated from analyzed published content.');
assertKeywordMap($primary['manualPosition'] === 3, 'A manually recorded position should be retained.');
assertKeywordMap($primary['manualVolume'] === 120.0, 'A manually recorded volume should be retained separately.');
assertKeywordMap($primary['manualDifficulty'] === 42.0, 'A manually recorded difficulty should be retained.');
assertKeywordMap($primary['intent'] === 'transactional', 'A documented search intent should be retained.');
assertKeywordMap(count($primary['exactOwners']) === 2, 'The primary phrase should include its homepage and exact page owner.');
assertKeywordMap($primary['exactOwners'][0]['kind'] === 'homepage', 'The primary homepage ownership should be explicit.');
assertKeywordMap(count($primary['samplePages']) > 0, 'Supporting pages should be available from published content.');

$secondary = $map['keywords'][1];
assertKeywordMap($secondary['term'] === 'شركة تنظيف منازل بالرياض', 'The secondary phrase should be present.');
assertKeywordMap($secondary['intent'] === 'informational', 'The secondary phrase intent should come only from the recorded value.');
assertKeywordMap(
    $secondary['exactOwners'][0]['url'] === 'https://alsahmm.com/page/home-cleaning',
    'A landing page with an exact focus phrase should be identified as its owner.',
);
assertKeywordMap($map['measuredAt'] !== '', 'The map should include a measurement timestamp.');

$savedReport = [
    'completedAt' => '2026-10-16T12:30:00.000Z',
    'keywordStrength' => [
        [
            'term' => 'شركة تنظيف منازل بالرياض',
            'strength' => 77,
            'occurrences' => 18,
            'usagePercent' => 2.5,
            'pageCount' => 2,
            'articleCount' => 1,
            'focusPageCount' => 1,
            'samplePages' => [[
                'url' => 'https://alsahmm.com/page/home-cleaning',
                'title' => 'شركة تنظيف منازل بالرياض',
                'occurrences' => 15,
            ]],
        ],
        [
            'term' => 'شركة تنظيف بالرياض',
            'strength' => 19,
            'occurrences' => 2,
            'usagePercent' => 0.5,
            'pageCount' => 1,
            'articleCount' => 1,
            'focusPageCount' => 1,
            'samplePages' => [[
                'url' => 'https://alsahmm.com/blog/cleaning-article',
                'title' => 'شركة تنظيف بالرياض',
                'occurrences' => 2,
            ]],
        ],
    ],
];
$insertSetting->execute([
    'seo_site_audit_report',
    json_encode([
        'storageEncoding' => 'gzip-base64-v1',
        'completedAt' => $savedReport['completedAt'],
        'payload' => base64_encode(gzencode(json_encode($savedReport, JSON_UNESCAPED_UNICODE))),
    ], JSON_UNESCAPED_UNICODE),
]);
$cachedMap = rankMathKeywordTopicMap($pdo);
assertKeywordMap(
    $cachedMap['measuredAt'] === $savedReport['completedAt'],
    'A saved audit snapshot timestamp should be preserved without running a new scan.',
);
assertKeywordMap(
    $cachedMap['keywords'][0]['term'] === 'شركة تنظيف بالرياض'
        && $cachedMap['keywords'][0]['strength'] === 19,
    'The primary phrase should stay first while retaining its saved snapshot metrics.',
);
assertKeywordMap(
    $cachedMap['keywords'][1]['strength'] === 77,
    'Metrics from a compressed audit snapshot should be reused as saved.',
);
assertKeywordMap(
    $cachedMap['keywords'][1]['exactOwners'][0]['url'] === 'https://alsahmm.com/page/home-cleaning',
    'Exact owners should be refreshed from page metadata without scanning their full content.',
);

$partialPdo = new PDO('sqlite::memory:');
$partialPdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$partialPdo->exec("CREATE TABLE posts (title TEXT, seo_keywords TEXT, status TEXT, is_active INTEGER)");
$partialPdo->exec("INSERT INTO posts VALUES ('تنظيف منازل بالرياض', 'تنظيف منازل بالرياض', 'published', 1)");
$partialMap = rankMathKeywordTopicMap($partialPdo);
assertKeywordMap(
    count($partialMap['keywords']) > 0 && $partialMap['keywords'][0]['term'] === 'شركة تنظيف بالرياض',
    'The keyword map should retain its primary phrase when optional tables and columns are absent.',
);
assertKeywordMap(
    isset($partialMap['keywords'][0]['exactOwners']),
    'Missing settings, SEO pages, and services tables should not break focus-page ownership output.',
);

echo "SEO keyword map checks passed.\n";
