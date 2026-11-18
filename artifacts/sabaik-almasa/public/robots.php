<?php
declare(strict_types=1);

require_once __DIR__ . '/site-origin-runtime.php';
$canonicalSiteUrl = cleanflowRequestSiteOrigin();

header('Content-Type: text/plain; charset=utf-8');

echo "User-agent: *\nAllow: /\nAllow: /api/uploads/\nDisallow: /admin/\nDisallow: /api/\n\n";

echo "# The production PHP response serves the same canonical URL below.\n";
echo "Sitemap: {$canonicalSiteUrl}/sitemap.xml\n";

echo "# AI search crawlers follow the same public-content rules as other agents.\n";

echo "User-agent: GPTBot\nAllow: /\n\n";
echo "User-agent: ChatGPT-User\nAllow: /\n\n";
echo "User-agent: OAI-SearchBot\nAllow: /\n\n";
echo "User-agent: Google-Extended\nAllow: /\n\n";
echo "User-agent: PerplexityBot\nAllow: /\n\n";
echo "User-agent: ClaudeBot\nAllow: /\n\n";
echo "User-agent: anthropic-ai\nAllow: /\n\n";
echo "User-agent: Bytespider\nDisallow: /\n";