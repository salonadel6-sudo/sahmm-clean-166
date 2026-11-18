<?php
declare(strict_types=1);

require_once __DIR__ . '/static-canonical-rewrite.php';

$root = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'cleanflow-canonical-test-' . bin2hex(random_bytes(6));
$pages = [
    'index.html' => '<html><head><link rel="canonical" href="https://site.example/"></head><body>home</body></html>',
    'page/ar/index.html' => '<html><head><link href=\'https://site.example/page/%D8%A7%D8%B1\' rel=\'canonical\'></head><body>page</body></html>',
    'contact.html' => '<html><head><link rel="canonical" href="/contact"></head><body>contact</body></html>',
    'no-canonical.html' => '<html><head><title>unchanged</title></head><body>plain</body></html>',
    'uploads/ignored.html' => '<html><head><link rel="canonical" href="https://site.example/uploads/ignored"></head></html>',
];

$removeTree = static function (string $path): void {
    if (!is_dir($path)) {
        if (is_file($path) || is_link($path)) @unlink($path);
        return;
    }
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST,
    );
    foreach ($iterator as $entry) {
        if ($entry->isDir() && !$entry->isLink()) @rmdir($entry->getPathname());
        else @unlink($entry->getPathname());
    }
    @rmdir($path);
};

try {
    foreach ($pages as $relativePath => $contents) {
        $destination = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativePath);
        $directory = dirname($destination);
        if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
            throw new RuntimeException('Could not create temporary test directory');
        }
        if (file_put_contents($destination, $contents) === false) {
            throw new RuntimeException('Could not create temporary test page');
        }
    }

    $updated = cleanflowRewriteStaticCanonicalUrls($root, 'https://staging-cleanflow.net');
    if ($updated !== 3) {
        throw new RuntimeException('Expected 3 canonical pages to change, got ' . $updated);
    }

    $expected = [
        'index.html' => 'https://staging-cleanflow.net/',
        'page/ar/index.html' => 'https://staging-cleanflow.net/page/%D8%A7%D8%B1',
        'contact.html' => 'https://staging-cleanflow.net/contact',
    ];
    foreach ($expected as $relativePath => $canonical) {
        $contents = file_get_contents($root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativePath));
    if ($contents === false || strpos($contents, $canonical) === false || strpos($contents, 'site.example') !== false) {
            throw new RuntimeException('Canonical URL was not updated correctly in ' . $relativePath);
        }
    }

    $ignored = file_get_contents($root . '/uploads/ignored.html');
    if ($ignored === false || strpos($ignored, 'https://site.example/uploads/ignored') === false) {
        throw new RuntimeException('The upload directory should not be modified');
    }
    if (cleanflowRewriteStaticCanonicalUrls($root, 'https://staging-cleanflow.net') !== 0) {
        throw new RuntimeException('Repeating the rewrite should be idempotent');
    }

    $localUpdated = cleanflowRewriteStaticCanonicalUrls($root, 'http://localhost:4321');
    if ($localUpdated !== 3) {
        throw new RuntimeException('Expected local HTTP canonical origins to be applied');
    }
    $localHome = file_get_contents($root . '/index.html');
    if ($localHome === false || strpos($localHome, 'http://localhost:4321/') === false) {
        throw new RuntimeException('The local request origin and port should be preserved');
    }
    if (cleanflowRewriteStaticCanonicalUrls($root, 'http://localhost:4321') !== 0) {
        throw new RuntimeException('Local canonical rewriting should also be idempotent');
    }

    echo "Hostinger static canonical rewrite test passed.\n";
} finally {
    $removeTree($root);
}
