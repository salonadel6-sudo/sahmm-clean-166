<?php
declare(strict_types=1);

const CLEANFLOW_SITE_ORIGIN_TOKEN = '__CLEANFLOW_SITE_ORIGIN__';

function cleanflowNormalizePublicOrigin($value): ?string {
    $candidate = trim((string)$value);
    if ($candidate === '' || preg_match('/[\s,]/u', $candidate)) return null;

    if (!preg_match('#^https?://#i', $candidate)) {
        $candidate = preg_match('/^(localhost|127(?:\.\d{1,3}){3}|\[?::1\]?)(:\d+)?$/i', $candidate)
            ? 'http://' . $candidate
            : 'https://' . $candidate;
    }
    $parts = parse_url($candidate);
    if (!is_array($parts)) return null;
    $scheme = strtolower((string)($parts['scheme'] ?? ''));
    $host = strtolower(rtrim((string)($parts['host'] ?? ''), '.'));
    $path = (string)($parts['path'] ?? '');
    $port = isset($parts['port']) ? (int)$parts['port'] : null;
    if (
        !in_array($scheme, ['http', 'https'], true)
        || $host === ''
        || isset($parts['user'])
        || isset($parts['pass'])
        || !in_array($path, ['', '/'], true)
        || isset($parts['query'])
        || isset($parts['fragment'])
        || ($port !== null && ($port < 1 || $port > 65535))
    ) return null;

    $unwrappedHost = trim($host, '[]');
    $isIp = filter_var($unwrappedHost, FILTER_VALIDATE_IP) !== false;
    if (!$isIp && !preg_match('/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i', $host)) return null;
    foreach (explode('.', $host) as $label) {
        if ($label === '' || strlen($label) > 63 || $label[0] === '-' || substr($label, -1) === '-') return null;
    }

    if (($scheme === 'http' && $port === 80) || ($scheme === 'https' && $port === 443)) $port = null;
    return $scheme . '://' . $host . ($port !== null ? ':' . $port : '');
}

function cleanflowRequestSiteOrigin(): string {
    if (getenv('CLEANFLOW_STATIC_BUILD') === '1') {
        $buildOrigin = cleanflowNormalizePublicOrigin(
            getenv('CLEANFLOW_SITE_ORIGIN') ?: getenv('VITE_PUBLIC_SITE_URL') ?: ''
        );
        if ($buildOrigin !== null) return $buildOrigin;
        throw new RuntimeException('CLEANFLOW_SITE_ORIGIN is required during a static PHP build.');
    }

    $forwardedProto = strtolower(trim(explode(',', (string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))[0]));
    if (!in_array($forwardedProto, ['http', 'https'], true)) {
        $forwardedProto = !empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off'
            || (int)($_SERVER['SERVER_PORT'] ?? 0) === 443
            ? 'https'
            : 'http';
    }

    // Shared hosts and CDN proxies do not always forward a valid host value.
    // Prefer the request Host, but try the proxy and server values as fallbacks
    // instead of letting one malformed X-Forwarded-Host break every API route.
    $hostCandidates = [
        trim(explode(',', (string)($_SERVER['HTTP_HOST'] ?? ''))[0]),
        trim(explode(',', (string)($_SERVER['HTTP_X_FORWARDED_HOST'] ?? ''))[0]),
        trim((string)($_SERVER['SERVER_NAME'] ?? '')),
    ];
    foreach ($hostCandidates as $host) {
        if ($host === '') continue;
        $candidate = preg_match('#^https?://#i', $host)
            ? $host
            : $forwardedProto . '://' . $host;
        $origin = cleanflowNormalizePublicOrigin($candidate);
        if ($origin !== null) return $origin;
    }

    $configuredOrigin = cleanflowNormalizePublicOrigin(getenv('CLEANFLOW_SITE_ORIGIN') ?: '');
    if ($configuredOrigin !== null) return $configuredOrigin;

    throw new RuntimeException('The current PHP request does not contain a valid host and protocol.');
}

function cleanflowCurrentSiteOrigin(?PDO $pdo = null, bool $persistRequestOrigin = false): string {
    try {
        return cleanflowRequestSiteOrigin();
    } catch (Throwable $requestOriginError) {
        if ($pdo !== null) {
            try {
                $stmt = $pdo->prepare("SELECT value FROM site_settings WHERE key = 'site_public_url' LIMIT 1");
                $stmt->execute();
                $savedOrigin = cleanflowNormalizePublicOrigin($stmt->fetchColumn());
                if ($savedOrigin !== null) return $savedOrigin;
            } catch (Throwable $ignored) {
                // A missing optional setting must not make unrelated API routes fail.
            }
        }
        throw $requestOriginError;
    }
}

function cleanflowTokenizeSiteOrigin(string $content, string $origin): string {
    return str_ireplace($origin, CLEANFLOW_SITE_ORIGIN_TOKEN, $content);
}

// Static build files remain portable; a live admin-triggered sitemap save
// persists the validated origin of the production request in the XML files.
function cleanflowSitemapStorageContent(string $content, string $origin): string {
    $normalizedOrigin = cleanflowNormalizePublicOrigin($origin);
    if ($normalizedOrigin === null) {
        throw new InvalidArgumentException('A valid public origin is required to save sitemap XML.');
    }

    if (getenv('CLEANFLOW_STATIC_BUILD') === '1') {
        return cleanflowTokenizeSiteOrigin($content, $normalizedOrigin);
    }

    return str_replace(CLEANFLOW_SITE_ORIGIN_TOKEN, $normalizedOrigin, $content);
}

function cleanflowRenderSiteContent(string $content): string {
    return str_replace(CLEANFLOW_SITE_ORIGIN_TOKEN, cleanflowRequestSiteOrigin(), $content);
}

function cleanflowServeSiteFile(string $path, string $contentType): void {
    $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($method !== 'GET' && $method !== 'HEAD') {
        header('Allow: GET, HEAD');
        http_response_code(405);
        exit;
    }
    if (!is_file($path) || !is_readable($path)) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Not Found';
        exit;
    }
    $content = file_get_contents($path);
    if ($content === false) {
        http_response_code(500);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Unable to read site file';
        exit;
    }
    header('Content-Type: ' . $contentType);
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('X-Content-Type-Options: nosniff');
    if ($method === 'GET') echo cleanflowRenderSiteContent($content);
}

function cleanflowServeStaticHtml(string $path): void {
    header('X-Robots-Tag: index, follow');
    cleanflowServeSiteFile($path, 'text/html; charset=utf-8');
}
