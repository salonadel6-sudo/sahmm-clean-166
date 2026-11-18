<?php
declare(strict_types=1);

$notFound = static function (): void {
    http_response_code(404);
    exit;
};

$encodedTarget = $_GET['target'] ?? '';
if (
    !is_string($encodedTarget)
    || $encodedTarget === ''
    || !preg_match('/^[A-Za-z0-9_-]+$/D', $encodedTarget)
) {
    $notFound();
}

$base64 = strtr($encodedTarget, '-_', '+/');
$base64 .= str_repeat('=', (4 - (strlen($base64) % 4)) % 4);
$targetPath = base64_decode($base64, true);
if (
    !is_string($targetPath)
    || $targetPath === ''
    || preg_match('//u', $targetPath) !== 1
    || $targetPath[0] !== '/'
    || strpos($targetPath, '//') === 0
    || preg_match('/[\x00-\x20\x7F?#\\\\]/', $targetPath)
) {
    $notFound();
}

$segments = explode('/', trim($targetPath, '/'));
$allowedRoots = [
    'about', 'areas', 'blog', 'call-now', 'chat', 'cleaning-packages',
    'contact', 'faq', 'offers', 'page', 'partners', 'privacy', 'services',
    'terms', 'why-us',
];
if (
    count($segments) < 1
    || !in_array($segments[0], $allowedRoots, true)
    || count($segments) > 8
) {
    $notFound();
}
foreach ($segments as $segment) {
    if ($segment === '' || $segment === '.' || $segment === '..') {
        $notFound();
    }
}

$location = '/' . implode('/', array_map('rawurlencode', $segments));
header('Location: ' . $location, true, 301);
exit;
