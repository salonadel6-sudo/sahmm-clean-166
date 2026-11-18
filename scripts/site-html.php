<?php
declare(strict_types=1);

require_once __DIR__ . '/site-origin-runtime.php';

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method !== 'GET' && $method !== 'HEAD') {
    header('Allow: GET, HEAD');
    http_response_code(405);
    exit;
}

$requestPath = (string)(parse_url((string)($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?: '/');
$decodedPath = rawurldecode($requestPath);
$segments = explode('/', trim($decodedPath, '/'));
if (strpos($decodedPath, "\0") !== false || in_array('..', $segments, true) || in_array('.', $segments, true)) {
    http_response_code(404);
    exit;
}

$relativePath = ltrim($decodedPath, '/');
if ($relativePath === '') $relativePath = 'index.html';
if (!preg_match('/\.html$/i', $relativePath)) $relativePath = rtrim($relativePath, '/') . '/index.html';

$root = realpath(__DIR__);
$candidate = realpath(__DIR__ . DIRECTORY_SEPARATOR . $relativePath);
if ($root === false || $candidate === false || strpos($candidate, $root . DIRECTORY_SEPARATOR) !== 0) {
    http_response_code(404);
    exit;
}

cleanflowServeStaticHtml($candidate);
