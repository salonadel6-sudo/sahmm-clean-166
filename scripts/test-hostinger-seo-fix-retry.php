<?php
declare(strict_types=1);

require_once __DIR__ . '/seo-fix-retry.php';
require_once __DIR__ . '/seo-page-policy.php';

function expectSame($expected, $actual, string $label): void
{
    if ($expected !== $actual) {
        fwrite(STDERR, "FAIL: {$label}\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true) . "\n");
        exit(1);
    }
}

$attempts = [];
$accepted = cleanflowGenerateValidatedSeoFix(
    static function (int $attempt, string $previousFailure) use (&$attempts): string {
        $attempts[] = [$attempt, $previousFailure];
        return $attempt === 1 ? 'عنوان أقصر من المطلوب' : 'عنوان صالح يحقق شرط الطول المطلوب';
    },
    static function (string $generated): array {
        return ['value' => $generated];
    },
    static function (string $value): ?string {
        return strpos($value, 'صالح') !== false ? null : 'طول العنوان لا يطابق النطاق المطلوب.';
    }
);

expectSame(true, $accepted['ok'], 'a valid retry is accepted');
expectSame(2, $accepted['attempts'], 'the valid retry is the second attempt');
expectSame('عنوان صالح يحقق شرط الطول المطلوب', $accepted['value'], 'only the validated value is returned');
expectSame('طول العنوان لا يطابق النطاق المطلوب.', $attempts[1][1], 'retry receives the exact validation failure');

$failedAttempts = 0;
$rejected = cleanflowGenerateValidatedSeoFix(
    static function (int $attempt) use (&$failedAttempts): string {
        $failedAttempts++;
        return 'اقتراح غير صالح';
    },
    static function (string $generated): array {
        return ['value' => $generated];
    },
    static function (): string {
        return 'الاقتراح لا يحقق الشرط.';
    }
);

expectSame(false, $rejected['ok'], 'two invalid proposals are rejected');
expectSame(2, $failedAttempts, 'the generator is called no more than twice');
expectSame('الاقتراح لا يحقق الشرط.', $rejected['error'], 'the final validation reason is preserved');
expectSame(false, array_key_exists('value', $rejected), 'a rejected proposal cannot be returned for saving');

$htmlValue = '<h2>تنظيف المنازل</h2><p>خدمة موثوقة داخل الرياض.</p>';
$jsonReply = json_encode(['value' => $htmlValue], JSON_UNESCAPED_UNICODE);
expectSame($htmlValue, cleanflowExtractSeoAiValue((string)$jsonReply, true), 'valid JSON HTML value is extracted');
expectSame(
    $htmlValue,
    cleanflowExtractSeoAiValue("```html\nمحتوى الصفحة:\n{$htmlValue}\n```", true),
    'raw fenced HTML is extracted without its preface',
);
$malformedReply = "{\"value\":\"<p>تنظيف بعنوان \"مناسب\" للرياض</p>\n<p>خدمة متكاملة للمنازل.</p>";
expectSame(
    '<p>تنظيف بعنوان "مناسب" للرياض</p>' . "\n" . '<p>خدمة متكاملة للمنازل.</p>',
    cleanflowExtractSeoAiValue($malformedReply, true),
    'HTML is recovered from malformed JSON string quoting',
);
expectSame('', cleanflowExtractSeoAiValue('{"value":""}', true), 'an empty response is rejected');
expectSame('', cleanflowExtractSeoAiValue('تم إنشاء المحتوى المطلوب.', true), 'non-HTML chatter is not accepted for content');
expectSame(
    '<p>محتوى آمن</p>',
    cleanflowSanitizeSeoHtml('<script>غير آمن</script><p class="wide" onclick="bad()">محتوى آمن</p>'),
    'shared sanitizer removes scripts and attributes while keeping allowed tags',
);

$shortDescription = str_repeat('ش', 114) . '.';
$repairedDescription = rankMathRepairShortSeoDescription($shortDescription, 120, 160);
expectSame(115, seoUnicodeLength($shortDescription), 'regression input matches the observed near-limit case');
expectSame(true, seoUnicodeLength($repairedDescription) >= 120, 'a slightly short description is completed to the minimum');
expectSame(true, seoUnicodeLength($repairedDescription) <= 160, 'the completion stays below the maximum');
expectSame(true, str_starts_with($repairedDescription, str_repeat('ش', 114)), 'the generated description is preserved');
expectSame(false, strpos($repairedDescription, '..') !== false, 'the completion avoids duplicate punctuation');
expectSame(str_repeat('ش', 20), rankMathRepairShortSeoDescription(str_repeat('ش', 20), 120, 160), 'large shortfalls are not padded');
expectSame('وصف صالح بين الحدود.', rankMathRepairShortSeoDescription('وصف صالح بين الحدود.', 10, 160), 'valid descriptions remain unchanged');

$expectedCanonical = 'https://alsahmm.com/page/تنظيف-المنازل';
expectSame(
    $expectedCanonical,
    rankMathCanonicalOrDefault('/page/تنظيف-المنازل', $expectedCanonical),
    'a relative self-canonical is normalized to HTTPS',
);
expectSame(
    '/page/مسار-آخر',
    rankMathCanonicalOrDefault('/page/مسار-آخر', $expectedCanonical),
    'a different relative canonical path is preserved for rejection',
);
expectSame(
    'https://other.example/page/تنظيف-المنازل',
    rankMathCanonicalOrDefault('https://other.example/page/تنظيف-المنازل', $expectedCanonical),
    'a canonical on a different host is preserved for rejection',
);
expectSame(
    'http://alsahmm.com/page/تنظيف-المنازل',
    rankMathCanonicalOrDefault('http://alsahmm.com/page/تنظيف-المنازل', $expectedCanonical),
    'an HTTP canonical is not upgraded silently',
);

echo "Hostinger SEO fix retry tests passed.\n";
