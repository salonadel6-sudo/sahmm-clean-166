<?php
declare(strict_types=1);

require_once __DIR__ . '/site-origin-runtime.php';

/**
 * Update canonical link origins in pre-rendered HTML without changing paths
 * or any other page content. Used by the PHP Hostinger sitemap-save flow.
 */
function cleanflowRewriteStaticCanonicalUrls(string $documentRoot, string $siteOrigin): int {
    $root = realpath($documentRoot);
    $origin = cleanflowNormalizePublicOrigin($siteOrigin);
    if (
        $root === false
        || !is_dir($root)
        || $origin === null
    ) {
        throw new InvalidArgumentException('مجلد الموقع أو نطاق canonical غير صالح');
    }

    $excludedDirectories = ['api', 'assets', 'data', 'node_modules', 'uploads', '.git', '.runtime'];
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::LEAVES_ONLY,
    );
    $updatedPages = 0;

    foreach ($iterator as $file) {
        if (!$file->isFile() || $file->isLink() || strtolower($file->getExtension()) !== 'html') continue;

        $filePath = $file->getPathname();
        $relativePath = ltrim(substr($filePath, strlen(rtrim($root, DIRECTORY_SEPARATOR))), DIRECTORY_SEPARATOR);
        $topLevelDirectory = explode(DIRECTORY_SEPARATOR, $relativePath, 2)[0] ?? '';
        if (in_array($topLevelDirectory, $excludedDirectories, true)) continue;

        $html = file_get_contents($filePath);
        if ($html === false) {
            throw new RuntimeException('تعذرت قراءة صفحة HTML لتحديث canonical: ' . $relativePath);
        }

        $updatedTags = 0;
        $updatedHtml = preg_replace_callback(
            '~<link\b[^>]*>~i',
            static function (array $tagMatch) use ($origin, &$updatedTags): string {
                $tag = $tagMatch[0];
                if (!preg_match('~\brel\s*=\s*(["\'])\s*canonical\s*\1~i', $tag)) return $tag;

                $attributeCount = 0;
                $updatedTag = preg_replace_callback(
                    '~\bhref\s*=\s*(["\'])(.*?)\1~i',
                    static function (array $attributeMatch) use ($origin): string {
                        $quote = $attributeMatch[1];
                        $href = html_entity_decode($attributeMatch[2], ENT_QUOTES | ENT_HTML5, 'UTF-8');
                        if (preg_match('~^https?://~i', $href)) {
                            $parts = parse_url($href);
                        } elseif (substr($href, 0, 1) === '/') {
                            $parts = ['path' => $href];
                        } else {
                            return $attributeMatch[0];
                        }

                        if (!is_array($parts)) return $attributeMatch[0];
                        $path = (string)($parts['path'] ?? '/');
                        if ($path === '') $path = '/';
                        $newHref = $origin . $path;
                        return 'href=' . $quote
                            . htmlspecialchars($newHref, ENT_QUOTES | ENT_HTML5, 'UTF-8')
                            . $quote;
                    },
                    $tag,
                    1,
                    $attributeCount,
                );

                if ($updatedTag === null) {
                    throw new RuntimeException('تعذر تحليل وسم canonical');
                }
                if ($attributeCount > 0 && $updatedTag !== $tag) $updatedTags++;
                return $updatedTag;
            },
            $html,
        );

        if ($updatedHtml === null) {
            throw new RuntimeException('تعذر تحليل روابط canonical في: ' . $relativePath);
        }
        if ($updatedHtml === $html) continue;

        $temporaryPath = tempnam(dirname($filePath), '.canonical-');
        if ($temporaryPath === false) {
            throw new RuntimeException('تعذر تجهيز ملف مؤقت لتحديث canonical: ' . $relativePath);
        }

        try {
            $writtenBytes = file_put_contents($temporaryPath, $updatedHtml, LOCK_EX);
            if ($writtenBytes !== strlen($updatedHtml)) {
                throw new RuntimeException('تعذرت كتابة صفحة canonical مؤقتة: ' . $relativePath);
            }
            $permissions = $file->getPerms() & 0777;
            if ($permissions > 0) @chmod($temporaryPath, $permissions);
            if (!rename($temporaryPath, $filePath)) {
                throw new RuntimeException('تعذر تثبيت صفحة canonical بعد تحديثها: ' . $relativePath);
            }
        } catch (Throwable $error) {
            if (is_file($temporaryPath)) @unlink($temporaryPath);
            throw $error;
        }

        if ($updatedTags > 0) $updatedPages++;
    }

    return $updatedPages;
}
