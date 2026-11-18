<?php
declare(strict_types=1);

require_once __DIR__ . '/site-origin-runtime.php';

$requestedPath = (string)(parse_url((string)($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?: '/');
$filename = basename(rawurldecode($requestedPath));
if (!preg_match('/^(?:sitemap(?:[1-9]\d*)?\.xml|llms\.txt)$/i', $filename)) {
    http_response_code(404);
    exit;
}

$contentType = preg_match('/^sitemap/i', $filename)
    ? 'application/xml; charset=utf-8'
    : 'text/plain; charset=utf-8';
cleanflowServeSiteFile(__DIR__ . DIRECTORY_SEPARATOR . $filename, $contentType);
