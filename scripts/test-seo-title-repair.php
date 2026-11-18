<?php
declare(strict_types=1);

require_once __DIR__ . '/seo-page-policy.php';

function assertSeoTitleRepair(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$focus = 'شركة تنظيف بالرياض';
$overlong = 'خدمات تنظيف المنازل والشقق والفلل بجودة عالية واحترافية وسرعة في التنفيذ لجميع العملاء داخل مدينة الرياض';
$repaired = rankMathRepairSeoTitleCandidate($overlong, $focus);
assertSeoTitleRepair(
    strpos($repaired, $focus) === 0,
    'A repaired SEO title must begin with the exact focus phrase.',
);
assertSeoTitleRepair(
    seoUnicodeLength($repaired) >= 30 && seoUnicodeLength($repaired) <= 60,
    'A repaired SEO title must fit the configured 30–60 character range.',
);

$analysis = analyzeRankMathSeo([
    'type' => 'landing',
    'title' => 'خدمة تنظيف المنازل',
    'seoTitle' => $repaired,
    'description' => 'شركة تنظيف بالرياض تقدم خدمات تنظيف المنازل والشقق بجودة عالية وعناية بالتفاصيل.',
    'focusKeyword' => $focus,
    'slug' => 'test-page',
    'canonical' => 'https://alsahmm.com/page/test-page',
    'expectedCanonical' => 'https://alsahmm.com/page/test-page',
    'content' => str_repeat('خدمات تنظيف مفيدة للمنازل في الرياض. ', 50),
    'h1' => ['خدمة تنظيف المنازل'],
]);
$checks = array_column($analysis['checks'], null, 'id');
assertSeoTitleRepair(
    ($checks['titleLength']['status'] ?? '') === 'pass'
        && ($checks['keywordTitle']['status'] ?? '') === 'pass',
    'The repaired title must pass both actual Rank Math title checks.',
);

$alreadyValid = $focus . ': خدمات المنازل بعناية واهتمام يومي';
assertSeoTitleRepair(
    rankMathRepairSeoTitleCandidate($alreadyValid, $focus) === $alreadyValid,
    'A valid title with the focus phrase should remain unchanged.',
);

echo "SEO title repair checks passed.\n";
