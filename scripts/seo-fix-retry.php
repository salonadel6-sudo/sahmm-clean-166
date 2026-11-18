<?php
declare(strict_types=1);

/**
 * Read the text value returned by an SEO AI provider. Long HTML replies are
 * sometimes emitted as raw HTML or as JSON with unescaped line breaks/quotes,
 * so content fields get a narrowly scoped allowed-tag fallback.
 */
function cleanflowExtractSeoAiValue(string $text, bool $allowHtmlFallback = false): string
{
    $clean = preg_replace('/<think>[\s\S]*?<\/think>/i', '', $text) ?? $text;
    $clean = trim($clean);
    $clean = preg_replace('/^```(?:json|html)?\s*/i', '', $clean) ?? $clean;
    $clean = preg_replace('/\s*```$/', '', $clean) ?? $clean;

    $length = strlen($clean);
    for ($start = 0; $start < $length; $start++) {
        if ($clean[$start] !== '{') continue;

        $depth = 0;
        $insideString = false;
        $escaped = false;
        for ($index = $start; $index < $length; $index++) {
            $character = $clean[$index];
            if ($insideString) {
                if ($escaped) {
                    $escaped = false;
                } elseif ($character === '\\') {
                    $escaped = true;
                } elseif ($character === '"') {
                    $insideString = false;
                }
                continue;
            }
            if ($character === '"') {
                $insideString = true;
                continue;
            }
            if ($character === '{') {
                $depth++;
            } elseif ($character === '}') {
                $depth--;
                if ($depth !== 0) continue;

                $decoded = json_decode(substr($clean, $start, $index - $start + 1), true);
                if (is_array($decoded)) {
                    foreach (['value', 'content', 'html', 'text'] as $key) {
                        if (!isset($decoded[$key]) || !is_string($decoded[$key])) continue;
                        $candidate = trim($decoded[$key]);
                        if ($candidate !== '' && ($key === 'value' || $allowHtmlFallback)) {
                            return $candidate;
                        }
                    }
                }
                $start = $index;
                break;
            }
        }
    }

    if (!$allowHtmlFallback) return '';

    $tagPattern = '/<\/?(?:h2|h3|p|ul|ol|li|strong|em|br)\b[^>]*>/iu';
    if (preg_match_all($tagPattern, $clean, $matches, PREG_OFFSET_CAPTURE) < 1) return '';
    $fragmentStart = null;
    $fragmentEnd = null;
    foreach ($matches[0] as $match) {
        $tag = $match[0];
        $offset = $match[1];
        if ($fragmentStart === null && preg_match('/^<\s*\//u', $tag) !== 1) {
            $fragmentStart = $offset;
        }
        if ($fragmentStart !== null) {
            $fragmentEnd = $offset + strlen($tag);
        }
    }
    if ($fragmentStart === null || $fragmentEnd === null || $fragmentEnd <= $fragmentStart) return '';

    return trim(substr($clean, $fragmentStart, $fragmentEnd - $fragmentStart));
}

/**
 * Keep only the HTML tags permitted by the SEO editor. Shared by both
 * single-check and batch fixes so neither route depends on another branch's
 * local closure.
 */
function cleanflowSanitizeSeoHtml(string $value): string
{
    $allowed = ['h2', 'h3', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'br'];
    $value = preg_replace('/<!--[\s\S]*?-->/u', '', $value) ?? $value;
    $value = preg_replace('/<(script|style|iframe|object|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/iu', '', $value) ?? $value;
    $value = preg_replace_callback('/<\/?([a-z][a-z0-9:-]*)\b[^>]*>/iu', static function (array $match) use ($allowed): string {
        $name = strtolower($match[1]);
        if (!in_array($name, $allowed, true)) return '';
        return substr($match[0], 0, 2) === '</' ? '</' . $name . '>' : '<' . $name . '>';
    }, $value) ?? $value;
    return trim(preg_replace('/\s+/u', ' ', $value) ?? $value);
}

/**
 * Generate, normalize, and validate an SEO fix before returning it to a caller.
 * The callbacks make the retry flow testable without an AI provider or database.
 */
function cleanflowGenerateValidatedSeoFix(
    callable $generate,
    callable $prepare,
    callable $validate,
    int $maxAttempts = 2
): array {
    if ($maxAttempts < 1) {
        throw new InvalidArgumentException('maxAttempts must be at least 1');
    }

    $lastFailure = '';
    for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
        $generated = $generate($attempt, $lastFailure);
        if (!is_string($generated)) {
            $generated = '';
        }

        $prepared = $prepare($generated);
        if (!is_array($prepared)) {
            $lastFailure = 'تعذر إعداد القيمة المقترحة.';
            continue;
        }
        if (isset($prepared['error']) && trim((string)$prepared['error']) !== '') {
            $lastFailure = trim((string)$prepared['error']);
            continue;
        }
        if (!array_key_exists('value', $prepared) || !is_string($prepared['value'])) {
            $lastFailure = 'لم ينتج الذكاء الاصطناعي قيمة قابلة للتطبيق.';
            continue;
        }

        $value = $prepared['value'];
        if (trim($value) === '') {
            $lastFailure = 'القيمة المقترحة فارغة بعد التنقية.';
            continue;
        }

        $failure = $validate($value);
        if ($failure === null || $failure === false || trim((string)$failure) === '') {
            return ['ok' => true, 'value' => $value, 'attempts' => $attempt];
        }
        $lastFailure = trim((string)$failure);
    }

    return [
        'ok' => false,
        'error' => $lastFailure !== '' ? $lastFailure : 'تعذر إنشاء اقتراح صالح.',
        'attempts' => $maxAttempts,
    ];
}
