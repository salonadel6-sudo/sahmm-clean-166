<?php
declare(strict_types=1);

function seoPageOverrideNormalizePath(string $value): ?string {
    $path = rawurldecode(trim($value));
    if ($path === '' || substr($path, 0, 1) !== '/' || strpos($path, '\\') !== false) return null;
    if (preg_match('/[\x00-\x1F\x7F?#]/u', $path)) return null;
    $path = preg_replace('#/+#u', '/', $path);
    $path = rtrim((string)$path, '/');
    if ($path === '') $path = '/';
    foreach (explode('/', $path) as $part) {
        if ($part === '.' || $part === '..') return null;
    }

    $staticPaths = [
        '/', '/about', '/services', '/cleaning-packages',
        '/contact/شركة-تنظيف-بالرياض', '/areas', '/faq/تنظيف-المنازل-بالرياض',
        '/terms', '/privacy', '/blog', '/call-now',
    ];
    if (in_array($path, $staticPaths, true) || preg_match('#^/areas/[a-z0-9-]+$#i', $path)) return $path;
    return null;
}

function seoPageOverrideSanitizeText($value, int $maxLength = 20000): string {
    if (!is_string($value)) return '';
    $value = preg_replace('#<script\b[^>]*>.*?</script\s*>#isu', ' ', $value);
    $value = preg_replace('#<style\b[^>]*>.*?</style\s*>#isu', ' ', (string)$value);
    $value = strip_tags((string)$value);
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', ' ', (string)$value);
    $value = preg_replace('/[ \t]+\n/u', "\n", (string)$value);
    $value = preg_replace('/\n{3,}/u', "\n\n", (string)$value);
    $value = trim((string)$value);
    if (function_exists('mb_substr')) return mb_substr($value, 0, $maxLength, 'UTF-8');
    return substr($value, 0, $maxLength);
}

function seoPageOverrideEscapeHtml(string $value): string {
    return str_replace(
        ['&', '<', '>', '"', "'"],
        ['&amp;', '&lt;', '&gt;', '&quot;', '&#39;'],
        $value
    );
}

function seoPageOverrideRenderBody(string $value): string {
    $lines = preg_split('/\r\n|\r|\n/u', $value);
    $lines = array_values(array_filter(array_map('trim', is_array($lines) ? $lines : []), static function (string $line): bool {
        return $line !== '';
    }));
    if (!$lines) return '';
    $blocks = [];
    $listItems = [];
    $flushList = static function () use (&$listItems, &$blocks): void {
        if (!$listItems) return;
        $items = array_map(static function (string $item): string {
            return '<li>' . seoPageOverrideEscapeHtml($item) . '</li>';
        }, $listItems);
        $blocks[] = '<ul>' . implode('', $items) . '</ul>';
        $listItems = [];
    };
    foreach ($lines as $line) {
        if (strpos($line, '- ') === 0 || strpos($line, '• ') === 0) {
            $listItems[] = trim(substr($line, 2));
            continue;
        }
        $flushList();
        if (strpos($line, '## ') === 0) {
            $blocks[] = '<h2>' . seoPageOverrideEscapeHtml(trim(substr($line, 3))) . '</h2>';
        } else {
            $blocks[] = '<p>' . seoPageOverrideEscapeHtml($line) . '</p>';
        }
    }
    $flushList();
    return implode('', $blocks);
}

function seoPageOverrideSetMetaContent(string $html, string $name, string $value): string {
    $found = false;
    $escapedName = preg_quote($name, '/');
    $html = preg_replace_callback('/<meta\b[^>]*>/iu', static function (array $match) use ($name, $escapedName, $value, &$found): string {
        $tag = $match[0];
        if (!preg_match('/\bname\s*=\s*(["\'])(.*?)\1/iu', $tag, $nameMatch) || strtolower($nameMatch[2]) !== strtolower($name)) {
            return $tag;
        }
        $found = true;
        $escapedValue = seoPageOverrideEscapeHtml($value);
        if (preg_match('/\bcontent\s*=\s*(["\'])(.*?)\1/iu', $tag)) {
            return preg_replace_callback('/\bcontent\s*=\s*(["\'])(.*?)\1/iu', static function (array $contentMatch) use ($escapedValue): string {
                return 'content=' . $contentMatch[1] . $escapedValue . $contentMatch[1];
            }, $tag, 1) ?? $tag;
        }
        return preg_replace('/\s*\/?>$/u', ' content="' . $escapedValue . '" />', $tag) ?? $tag;
    }, $html) ?? $html;
    if ($found) return $html;
    $metaTag = '<meta name="' . seoPageOverrideEscapeHtml($name) . '" content="' . seoPageOverrideEscapeHtml($value) . '" />';
    return preg_replace('/<\/head\s*>/iu', $metaTag . "\n</head>", $html, 1) ?? $html;
}

function seoPageOverrideIsIndexableHtml(string $html, string $routePath, ?string $expectedOrigin = null): bool {
    $safePath = seoPageOverrideNormalizePath($routePath);
    if ($safePath === null) return false;
    if (preg_match_all('/<meta\b[^>]*>/iu', $html, $metaTags)) {
        foreach ($metaTags[0] as $tag) {
            if (!preg_match('/\bname\s*=\s*(["\'])(.*?)\1/iu', $tag, $nameMatch)) continue;
            $name = strtolower($nameMatch[2]);
            if ($name !== 'robots' && $name !== 'googlebot') continue;
            if (preg_match('/\bcontent\s*=\s*(["\'])(.*?)\1/iu', $tag, $contentMatch) && preg_match('/\bnoindex\b/iu', $contentMatch[2])) {
                return false;
            }
        }
    }
    if (!preg_match('/<link\b(?=[^>]*\brel\s*=\s*(["\'])canonical\1)[^>]*>/iu', $html, $canonicalMatch)) return false;
    if (!preg_match('/\bhref\s*=\s*(["\'])(.*?)\1/iu', $canonicalMatch[0], $hrefMatch)) return false;
    $href = html_entity_decode($hrefMatch[2], ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $token = '__CLEANFLOW_SITE_ORIGIN__';
    if (str_starts_with($href, $token)) {
        $parts = ['path' => substr($href, strlen($token))];
    } else {
        $parts = parse_url($href);
        if (
            !is_array($parts)
            || !in_array(strtolower((string)($parts['scheme'] ?? '')), ['http', 'https'], true)
            || empty($parts['host'])
            || isset($parts['user'])
            || isset($parts['pass'])
        ) return false;

        if ($expectedOrigin !== null) {
            $expected = parse_url($expectedOrigin);
            if (!is_array($expected) || empty($expected['host'])) return false;
            $scheme = strtolower((string)($parts['scheme'] ?? ''));
            $expectedScheme = strtolower((string)($expected['scheme'] ?? ''));
            $port = (int)($parts['port'] ?? ($scheme === 'https' ? 443 : 80));
            $expectedPort = (int)($expected['port'] ?? ($expectedScheme === 'https' ? 443 : 80));
            if (
                $scheme !== $expectedScheme
                || strtolower((string)$parts['host']) !== strtolower((string)$expected['host'])
                || $port !== $expectedPort
            ) return false;
        }
    }
    $canonicalPath = rawurldecode((string)($parts['path'] ?? '/'));
    $canonicalPath = rtrim($canonicalPath, '/') ?: '/';
    return $canonicalPath === $safePath;
}

function seoPageOverrideApplyToHtml(string $html, array $override): string {
    $title = seoPageOverrideSanitizeText($override['seoTitle'] ?? '', 180);
    $description = seoPageOverrideSanitizeText($override['description'] ?? '', 500);
    $focusKeyword = seoPageOverrideSanitizeText($override['focusKeyword'] ?? '', 200);
    $h1 = seoPageOverrideSanitizeText($override['h1'] ?? '', 220);
    $content = seoPageOverrideSanitizeText($override['content'] ?? '');
    if ($title !== '') {
        $titleTag = '<title>' . seoPageOverrideEscapeHtml($title) . '</title>';
        if (preg_match('/<title\b[^>]*>.*?<\/title>/isu', $html)) {
            $html = preg_replace('/<title\b[^>]*>.*?<\/title>/isu', $titleTag, $html, 1) ?? $html;
        } else {
            $html = preg_replace('/<\/head\s*>/iu', $titleTag . "\n</head>", $html, 1) ?? $html;
        }
    }
    if ($description !== '') $html = seoPageOverrideSetMetaContent($html, 'description', $description);
    if ($focusKeyword !== '') $html = seoPageOverrideSetMetaContent($html, 'seo-focus-keyword', $focusKeyword);

    if ($h1 !== '') {
        if (preg_match('/(<h1\b[^>]*>).*?(<\/h1\s*>)/isu', $html)) {
            $html = preg_replace_callback('/(<h1\b[^>]*>).*?(<\/h1\s*>)/isu', static function (array $match) use ($h1): string {
                return $match[1] . seoPageOverrideEscapeHtml($h1) . $match[2];
            }, $html, 1) ?? $html;
        } elseif (preg_match('/<main\b[^>]*>/iu', $html)) {
            $html = preg_replace('/<main\b[^>]*>/iu', '$0<h1>' . seoPageOverrideEscapeHtml($h1) . '</h1>', $html, 1) ?? $html;
        }
    }

    $html = preg_replace('/<!-- seo-page-override-content:start -->.*?<!-- seo-page-override-content:end -->/isu', '', $html) ?? $html;
    $body = seoPageOverrideRenderBody($content);
    if ($body !== '') {
        $block = '<!-- seo-page-override-content:start --><section data-seo-page-override="true">' . $body . '</section><!-- seo-page-override-content:end -->';
        if (preg_match('/<\/h1\s*>/iu', $html)) {
            $html = preg_replace('/<\/h1\s*>/iu', '$0' . $block, $html, 1) ?? $html;
        } else {
            $html = preg_replace('/<main\b[^>]*>/iu', '$0' . $block, $html, 1) ?? $html;
        }
    }
    return $html;
}

function seoPageOverridePublicRoot(): string {
    $documentRoot = rtrim((string)($_SERVER['DOCUMENT_ROOT'] ?? ''), DIRECTORY_SEPARATOR);
    $candidates = array_unique(array_filter([
        __DIR__ . '/../',
        dirname(__DIR__),
        $documentRoot,
        $documentRoot !== '' ? $documentRoot . '/build_php' : null,
    ]));
    foreach ($candidates as $candidate) {
        $resolved = realpath($candidate);
        if ($resolved !== false && is_dir($resolved) && is_file($resolved . DIRECTORY_SEPARATOR . 'index.html') && !is_link($resolved . DIRECTORY_SEPARATOR . 'index.html')) {
            return rtrim($resolved, DIRECTORY_SEPARATOR);
        }
    }
    throw new RuntimeException('تعذر العثور على مجلد HTML المنشور.');
}

function seoPageOverrideHtmlPath(string $routePath): string {
    $root = seoPageOverridePublicRoot();
    $relative = $routePath === '/' ? 'index.html' : ltrim($routePath, '/') . '/index.html';
    $candidate = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);
    $resolved = realpath($candidate);
    if ($resolved === false || !is_file($resolved) || is_link($candidate) || strpos($resolved, $root . DIRECTORY_SEPARATOR) !== 0) {
        throw new RuntimeException('ملف HTML المنشور للصفحة غير موجود أو غير آمن.');
    }
    return $resolved;
}

function seoPageOverrideRead(PDO $pdo, string $routePath): ?array {
    $key = 'seo_page_override:' . $routePath;
    $stmt = $pdo->prepare('SELECT value FROM site_settings WHERE key = :key LIMIT 1');
    $stmt->execute([':key' => $key]);
    $raw = $stmt->fetchColumn();
    if (!is_string($raw) || $raw === '') return null;
    $value = json_decode($raw, true);
    if (!is_array($value) || seoPageOverrideNormalizePath((string)($value['path'] ?? '')) !== $routePath) return null;
    return [
        'path' => $routePath,
        'seoTitle' => seoPageOverrideSanitizeText($value['seoTitle'] ?? '', 180),
        'description' => seoPageOverrideSanitizeText($value['description'] ?? '', 500),
        'focusKeyword' => seoPageOverrideSanitizeText($value['focusKeyword'] ?? '', 200),
        'h1' => seoPageOverrideSanitizeText($value['h1'] ?? '', 220),
        'content' => seoPageOverrideSanitizeText($value['content'] ?? ''),
        'sitemapEligible' => ($value['sitemapEligible'] ?? false) === true,
        'updatedAt' => is_string($value['updatedAt'] ?? null) ? $value['updatedAt'] : null,
    ];
}

function seoPageOverrideWrite(PDO $pdo, string $routePath, array $override): void {
    $key = 'seo_page_override:' . $routePath;
    $value = json_encode($override, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    if (!is_string($value)) throw new RuntimeException('تعذر ترميز تعديلات الصفحة.');
    $stmt = $pdo->prepare(
        'INSERT INTO site_settings (key, value, updated_at) VALUES (:key, :value, :updated_at)
         ON CONFLICT(key) DO UPDATE SET value = :value, updated_at = :updated_at'
    );
    $stmt->execute([':key' => $key, ':value' => $value, ':updated_at' => (string)$override['updatedAt']]);
}
