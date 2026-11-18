<?php
declare(strict_types=1);

// Hostinger builds prerender blog pages from a database snapshot. A post
// published later through the live admin exists in SQLite but has no static
// directory yet, so this route verifies it against the live database before
// serving the React app shell. Unknown or unpublished slugs remain real 404s.
ini_set('display_errors', '0');
error_reporting(E_ALL);
require_once __DIR__ . '/site-origin-runtime.php';

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method !== 'GET' && $method !== 'HEAD') {
    header('Allow: GET, HEAD');
    http_response_code(405);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Method Not Allowed';
    exit;
}

$slug = trim((string)($_GET['slug'] ?? ''), '/');
if ($slug === '' || strpos($slug, '/') !== false || strpos($slug, "\0") !== false || $slug === '.' || $slug === '..') {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'المقال غير موجود';
    exit;
}

$documentRoot = trim((string)($_SERVER['DOCUMENT_ROOT'] ?? ''));
$dbPaths = array_filter([
    __DIR__ . '/data/sabaik.db',
    __DIR__ . '/api/data/sabaik.db',
    __DIR__ . '/../data/sabaik.db',
    __DIR__ . '/../build_php/data/sabaik.db',
    $documentRoot !== '' ? $documentRoot . '/data/sabaik.db' : null,
    $documentRoot !== '' ? $documentRoot . '/build_php/data/sabaik.db' : null,
    $documentRoot !== '' ? dirname($documentRoot) . '/data/sabaik.db' : null,
]);

$dbFile = null;
foreach ($dbPaths as $candidate) {
    if (is_file($candidate) && is_readable($candidate)) {
        $dbFile = $candidate;
        break;
    }
}

if ($dbFile === null) {
    error_log('[blog-route] SQLite database is unavailable');
    http_response_code(503);
    header('Retry-After: 60');
    header('Content-Type: text/plain; charset=utf-8');
    echo 'تعذر تحميل المقال مؤقتاً';
    exit;
}

try {
    $pdo = new PDO('sqlite:' . $dbFile);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $statement = $pdo->prepare(
        "SELECT 1 FROM posts WHERE slug = :slug AND status = 'published' AND is_active = 1 LIMIT 1"
    );
    $statement->execute([':slug' => $slug]);
    $isPublished = (bool)$statement->fetchColumn();
    $pdo = null;
} catch (Throwable $error) {
    error_log('[blog-route] SQLite lookup failed: ' . $error->getMessage());
    http_response_code(503);
    header('Retry-After: 60');
    header('Content-Type: text/plain; charset=utf-8');
    echo 'تعذر تحميل المقال مؤقتاً';
    exit;
}

if (!$isPublished) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'المقال غير موجود';
    exit;
}

$indexFile = __DIR__ . '/index.html';
if (!is_file($indexFile) || !is_readable($indexFile)) {
    error_log('[blog-route] Frontend index.html is unavailable');
    http_response_code(503);
    header('Retry-After: 60');
    header('Content-Type: text/plain; charset=utf-8');
    echo 'تعذر تحميل المقال مؤقتاً';
    exit;
}

http_response_code(200);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('X-Robots-Tag: index, follow');
if ($method === 'GET') {
    cleanflowServeStaticHtml($indexFile);
}
