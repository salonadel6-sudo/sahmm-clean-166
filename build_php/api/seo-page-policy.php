<?php
declare(strict_types=1);

require_once __DIR__ . '/site-origin-runtime.php';

/**
 * PHP counterpart of shared SEO policy rules. The JSON policy is the source
 * of truth for indexability. Rank Math-style checks use the same policy data.
 */
function getSeoPageIndexability(array $page): array
{
    static $rules = null;
    if ($rules === null) {
        $rulesPath = __DIR__ . '/seo-page-policy.json';
        if (!is_file($rulesPath)) {
            $workspaceRulesPath = dirname(__DIR__) . '/lib/seo-page-policy.json';
            if (is_file($workspaceRulesPath)) {
                $rulesPath = $workspaceRulesPath;
            } else {
                throw new RuntimeException('Missing shared SEO page policy: ' . $rulesPath);
            }
        }
        $decoded = json_decode((string)file_get_contents($rulesPath), true);
        if (!is_array($decoded)
            || !isset($decoded['minimumVisibleContentCharacters'])
            || !is_array($decoded['unsupportedTopicPatterns'] ?? null)
            || !is_array($decoded['supportedServiceTopicPatterns'] ?? null)
            || !is_array($decoded['rankMath'] ?? null)) {
            throw new RuntimeException('Invalid shared SEO page policy JSON.');
        }
        $rules = $decoded;
    }

    $intentText = implode(' ', array_filter([
        $page['title'] ?? '',
        $page['targetKeyword'] ?? $page['target_keyword'] ?? '',
        $page['seoTitle'] ?? $page['seo_title'] ?? '',
    ], static fn($value): bool => is_scalar($value) && trim((string)$value) !== ''));
    $content = (string)($page['content'] ?? '');
    $visibleText = seoRankMathText($content);
    $contentChars = seoUnicodeLength($visibleText);
    $result = static function (bool $indexable, string $reason) use ($contentChars): array {
        return ['indexable' => $indexable, 'reason' => $reason, 'contentChars' => $contentChars];
    };

    foreach ($rules['unsupportedTopicPatterns'] as $pattern) {
        if (preg_match('~' . $pattern . '~iu', $intentText) === 1) {
            return $result(false, 'unsupported-topic');
        }
    }

    $hasSupportedServiceIntent = false;
    foreach ($rules['supportedServiceTopicPatterns'] as $pattern) {
        if (preg_match('~' . $pattern . '~iu', $intentText) === 1) {
            $hasSupportedServiceIntent = true;
            break;
        }
    }
    if (!$hasSupportedServiceIntent) {
        return $result(false, 'no-supported-service-intent');
    }
    if ($contentChars < (int)$rules['minimumVisibleContentCharacters']) {
        return $result(false, 'thin-content');
    }

    $configuredCanonical = trim((string)($page['canonicalUrl'] ?? $page['canonical_url'] ?? ''));
    if ($configuredCanonical !== '') {
        $expectedCanonical = cleanflowRequestSiteOrigin() . '/page/' . rawurlencode((string)($page['slug'] ?? ''));
        if (rankMathCanonicalOrDefault($configuredCanonical, $expectedCanonical) !== $expectedCanonical) {
            return $result(false, 'non-self-canonical');
        }
    }

    return $result(true, 'supported-service-intent');
}

function analyzeRankMathSeo(array $input): array
{
    static $config = null;
    if ($config === null) {
        $path = __DIR__ . '/seo-page-policy.json';
        if (!is_file($path)) {
            $path = dirname(__DIR__) . '/lib/seo-page-policy.json';
        }
        $decoded = is_file($path) ? json_decode((string)file_get_contents($path), true) : null;
        if (!is_array($decoded['rankMath'] ?? null)) {
            throw new RuntimeException('Missing internal SEO policy configuration.');
        }
        $config = $decoded['rankMath'];
    }

    $type = (string)($input['type'] ?? 'static');
    $seoTitle = seoRankMathText((string)($input['seoTitle'] ?? $input['seo_title'] ?? ''));
    $title = $seoTitle !== '' ? $seoTitle : seoRankMathText((string)($input['title'] ?? ''));
    $description = seoRankMathText((string)($input['seoDescription'] ?? $input['seo_description'] ?? $input['description'] ?? ''));
    $content = seoRankMathText((string)($input['content'] ?? ''));
    $keyword = trim((string)($input['focusKeyword'] ?? $input['targetKeyword'] ?? $input['target_keyword'] ?? ''));
    if ($keyword === '') {
        $rawKeywords = $input['keywords'] ?? $input['seoKeywords'] ?? $input['seo_keywords'] ?? '';
        $keywordParts = is_array($rawKeywords) ? $rawKeywords : preg_split('/[,،;|\\r\\n]+/u', (string)$rawKeywords);
        $keyword = trim((string)($keywordParts[0] ?? ''));
    }
    $slug = trim((string)($input['slug'] ?? $input['seoSlug'] ?? $input['seo_slug'] ?? ''));
    $canonical = trim((string)($input['canonical'] ?? $input['canonicalUrl'] ?? $input['canonical_url'] ?? ''));
    $expectedCanonical = trim((string)($input['expectedCanonical'] ?? ''));
    $headings = $input['h1'] ?? null;
    $headings = is_array($headings) ? $headings : null;
    $words = $content === '' ? [] : preg_split('/\\s+/u', $content, -1, PREG_SPLIT_NO_EMPTY);
    $wordCount = count($words);
    $minimumWords = (int)($config['minimumWords'][$type] ?? $config['minimumWords']['static'] ?? 50);
    $weights = $config['checks'];
    $checks = [];

    $add = static function (string $id, string $label, string $status, string $detail, string $recommendation = '', bool $blocking = false) use (&$checks, $weights): void {
        $weight = (int)($weights[$id] ?? 0);
        $ratio = $status === 'pass' ? 1.0 : ($status === 'warning' ? 0.5 : 0.0);
        $checks[] = [
            'id' => $id, 'label' => $label, 'status' => $status,
            'weight' => $weight, 'possible' => $status === 'unknown' ? 0 : $weight,
            'earned' => $status === 'unknown' ? 0 : round($weight * $ratio, 2),
            'detail' => $detail,
            'recommendation' => $recommendation,
            'blocking' => $blocking,
        ];
    };
    $contains = static function (string $haystack, string $needle): bool {
        $normalize = static function (string $value): string {
            $value = strtr($value, ['أ' => 'ا', 'إ' => 'ا', 'آ' => 'ا', 'ٱ' => 'ا', 'ى' => 'ي', 'ؤ' => 'و', 'ئ' => 'ي']);
            $value = preg_replace('/[\\x{064B}-\\x{065F}\\x{0670}\\x{0640}]/u', '', $value) ?? $value;
            $value = function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
            return trim(preg_replace('/[^\\p{L}\\p{N}]+/u', ' ', $value) ?? $value);
        };
        $haystack = ' ' . $normalize($haystack) . ' ';
        $needle = $normalize($needle);
        return $needle !== '' && strpos($haystack, ' ' . $needle . ' ') !== false;
    };

    $titleChars = seoUnicodeLength($title);
    $descriptionChars = seoUnicodeLength($description);
    $minTitle = (int)$config['title']['minimum'];
    $maxTitle = (int)$config['title']['maximum'];
    $hardMaxTitle = (int)$config['title']['hardMaximum'];
    $minDescription = (int)$config['description']['minimum'];
    $maxDescription = (int)$config['description']['maximum'];
    $hardMaxDescription = (int)$config['description']['hardMaximum'];

    $add('title', 'عنوان الصفحة', $title !== '' ? 'pass' : 'fail', $title !== '' ? "عنوان موجود ({$titleChars} حرفاً)." : 'عنوان SEO غير موجود.', 'أضف عنواناً واضحاً وفريداً.', true);
    $titleLengthStatus = $title === '' ? 'unknown' : (($titleChars >= $minTitle && $titleChars <= $maxTitle) ? 'pass' : ($titleChars > $hardMaxTitle ? 'fail' : 'warning'));
    $add('titleLength', 'طول العنوان', $titleLengthStatus, "{$titleChars} حرفاً؛ النطاق الإرشادي {$minTitle}–{$maxTitle}.", 'اكتب عنواناً طبيعياً؛ قد تعيد Google صياغته أو تختصره.', $titleChars > $hardMaxTitle);
    $add('keyword', 'عبارة التركيز', $keyword !== '' ? 'pass' : 'fail', $keyword !== '' ? "عبارة التركيز: «{$keyword}»." : 'لم تحدد عبارة تركيز.', 'حدد عبارة واحدة تصف نية الصفحة.', true);
    $keywordTitle = $keyword === '' ? 'unknown' : ($contains($title, $keyword) ? 'pass' : 'fail');
    $add('keywordTitle', 'عبارة التركيز في العنوان', $keywordTitle, $keywordTitle === 'pass' ? 'العبارة موجودة في العنوان.' : ($keyword === '' ? 'يتعذر الفحص دون عبارة التركيز.' : 'عبارة التركيز غير موجودة في العنوان.'), 'أدرجها بصورة طبيعية قرب بداية العنوان.', true);
    $add('description', 'الوصف التعريفي', $description !== '' ? 'pass' : 'fail', $description !== '' ? "الوصف موجود ({$descriptionChars} حرفاً)." : 'لا يوجد وصف تعريفي.', 'اكتب وصفاً فريداً يطابق محتوى الصفحة.', true);
    $descriptionStatus = $description === '' ? 'unknown' : (($descriptionChars >= $minDescription && $descriptionChars <= $maxDescription) ? 'pass' : ($descriptionChars > $hardMaxDescription ? 'fail' : 'warning'));
    $add('descriptionLength', 'طول الوصف التعريفي', $descriptionStatus, "{$descriptionChars} حرفاً؛ النطاق الإرشادي {$minDescription}–{$maxDescription}.", 'اجعل الوصف مفيداً؛ قد تختار Google مقتطفاً آخر.', $descriptionChars > $hardMaxDescription);
    $keywordDescription = $keyword === '' || $description === '' ? 'unknown' : ($contains($description, $keyword) ? 'pass' : 'warning');
    $add('keywordDescription', 'عبارة التركيز في الوصف', $keywordDescription, $keywordDescription === 'pass' ? 'العبارة موجودة.' : ($keywordDescription === 'unknown' ? 'تعذر فحص العبارة والوصف.' : 'لم تظهر العبارة حرفياً؛ لا تحشوها.'), 'استخدمها فقط عندما تكون طبيعية.');
    $h1Status = $headings === null ? 'fail' : (count($headings) === 1 ? 'pass' : (count($headings) === 0 ? 'fail' : 'warning'));
    $add('h1', 'عنوان H1 واحد', $h1Status, $headings === null ? 'لم يمرر عدد عناوين H1 للتحليل.' : 'عدد H1: ' . count($headings) . '.', 'اجعل للصفحة عنواناً رئيسياً واضحاً واحداً.', !is_array($headings) || count($headings) !== 1);
    $keywordH1 = $keyword === '' || $headings === null ? 'unknown' : (count(array_filter($headings, static fn($h1): bool => $contains((string)$h1, $keyword))) > 0 ? 'pass' : 'warning');
    $add('keywordH1', 'عبارة التركيز في H1', $keywordH1, $keywordH1 === 'pass' ? 'العبارة موجودة في H1.' : ($keywordH1 === 'unknown' ? 'تعذر الفحص.' : 'العبارة غير موجودة في H1.'), 'طابق العنوان مع نية البحث دون تكلف.');
    $intro = implode(' ', array_slice($words, 0, 100));
    $keywordIntro = $keyword === '' || $content === '' ? 'unknown' : ($contains($intro, $keyword) ? 'pass' : 'warning');
    $add('keywordIntroduction', 'موضوع الصفحة في المقدمة', $keywordIntro, $keywordIntro === 'pass' ? 'تظهر العبارة ضمن أول 100 كلمة.' : ($keywordIntro === 'unknown' ? 'لا يتوفر نص كافٍ.' : 'لا تظهر العبارة ضمن أول 100 كلمة.'), 'عرّف الموضوع مبكراً دون تكرار مصطنع.');
    $contentStatus = !isset($input['content']) ? 'fail' : ($wordCount >= $minimumWords ? 'pass' : ($wordCount === 0 ? 'fail' : 'warning'));
    $add('contentDepth', 'عمق المحتوى', $contentStatus, !isset($input['content']) ? 'لم يمرر المحتوى للتحليل.' : "{$wordCount} كلمة تقريباً؛ الحد الإرشادي {$minimumWords}.", 'أضف إجابات ومعلومات نافعة، لا حشواً.', !isset($input['content']) || $wordCount < $minimumWords);
    $add('slug', 'مسار الصفحة', $slug !== '' ? 'pass' : 'fail', $slug !== '' ? "المسار محدد: {$slug}." : 'مسار الصفحة غير محدد.', 'استخدم رابطاً ثابتاً وواضحاً.', true);
    $pathText = str_replace(['-', '_', '/'], ' ', rawurldecode($slug));
    $homepageUsesRootUrl = $type === 'homepage' && trim($slug) === '/';
    $keywordUrl = $keyword === '' || $slug === '' || $homepageUsesRootUrl
        ? 'unknown'
        : ($contains($pathText, $keyword) ? 'pass' : 'warning');
    $keywordUrlDetail = $keywordUrl === 'pass'
        ? 'العبارة ظاهرة في الرابط.'
        : ($homepageUsesRootUrl
            ? 'الرابط الجذري هو الرابط الأساسي للصفحة الرئيسية؛ لا يلزم تضمين عبارة التركيز فيه.'
            : ($keywordUrl === 'unknown' ? 'تعذر الفحص.' : 'العبارة غير موجودة؛ لا تغيّر رابطاً مستقراً لهذا السبب.'));
    $add('keywordUrl', 'عبارة التركيز في الرابط', $keywordUrl, $keywordUrlDetail, 'تحويل 301 مطلوب عند تغيير رابط قديم.');
    $canonicalValid = false;
    if ($canonical !== '') {
        $parts = parse_url($canonical);
        $canonicalScheme = strtolower((string)($parts['scheme'] ?? ''));
        $canonicalValid = is_array($parts)
            && in_array($canonicalScheme, ['http', 'https'], true)
            && !empty($parts['host'])
            && !isset($parts['user'])
            && !isset($parts['pass']);
        if ($canonicalValid && $expectedCanonical !== '') {
            $expectedParts = parse_url($expectedCanonical);
            if (!is_array($expectedParts)) {
                $canonicalValid = false;
            } else {
                $expectedScheme = strtolower((string)($expectedParts['scheme'] ?? ''));
                $canonicalPath = rtrim(rawurldecode((string)($parts['path'] ?? '/')), '/') ?: '/';
                $expectedPath = rtrim(rawurldecode((string)($expectedParts['path'] ?? '/')), '/') ?: '/';
                $canonicalPort = (int)($parts['port'] ?? ($canonicalScheme === 'https' ? 443 : 80));
                $expectedPort = (int)($expectedParts['port'] ?? ($expectedScheme === 'https' ? 443 : 80));
                $canonicalValid = strtolower((string)($parts['host'] ?? '')) === strtolower((string)($expectedParts['host'] ?? ''))
                    && $canonicalPort === $expectedPort
                    && $canonicalScheme === $expectedScheme
                    && $canonicalPath === $expectedPath;
            }
        }
    }
    $canonicalStatus = $canonical === '' ? 'fail' : ($canonicalValid ? 'pass' : 'fail');
    $add('canonical', 'الرابط الأساسي Canonical', $canonicalStatus, $canonicalStatus === 'pass' ? "Canonical صالح: {$canonical}." : ($canonical === '' ? 'Canonical لم يُمرر للتحقق.' : 'Canonical لا يطابق أصل ومسار الصفحة الحاليين.'), 'استخدم أصل البيئة الحالية ومسار الصفحة.', $canonical === '' || !$canonicalValid);
    $images = $input['images'] ?? null;
    $imageStatus = !is_array($images) || count($images) === 0 ? 'unknown' : (count(array_filter($images, static fn($image): bool => is_array($image) && trim((string)($image['alt'] ?? '')) !== '')) === count($images) ? 'pass' : 'warning');
    $add('imageAlt', 'النص البديل للصور', $imageStatus, !is_array($images) || count($images) === 0 ? 'لا توجد بيانات صور للفحص.' : 'صور لها نص بديل: ' . count(array_filter($images, static fn($image): bool => is_array($image) && trim((string)($image['alt'] ?? '')) !== '')) . '/' . count($images) . '.', 'صف محتوى الصورة نفسها، لا كلمات مفتاحية.');
    $links = $input['internalLinks'] ?? null;
    $add('internalLinks', 'الروابط الداخلية', !is_numeric($links) ? 'unknown' : ((int)$links > 0 ? 'pass' : 'warning'), !is_numeric($links) ? 'عدد الروابط غير متاح.' : 'الروابط الداخلية: ' . (int)$links . '.', 'اربط بصفحات ذات صلة عند إفادة الزائر.');
    $schema = $input['jsonLdValid'] ?? null;
    $add('schema', 'البيانات المنظمة', !is_bool($schema) ? 'unknown' : ($schema ? 'pass' : 'warning'), !is_bool($schema) ? 'فحص JSON-LD غير متاح.' : ($schema ? 'عُثر على JSON-LD صالح نحوياً.' : 'لم يُعثر على JSON-LD صالح نحوياً.'), 'تحقق من الملاءمة والبيانات في أداة Google.');

    $possible = array_sum(array_column($checks, 'possible'));
    $earned = array_sum(array_column($checks, 'earned'));
    $score = $possible > 0 ? (int)round(($earned / $possible) * 100) : 0;
    $blockingIssues = [];
    foreach ($checks as $check) {
        if (!empty($check['blocking']) && $check['status'] !== 'pass') $blockingIssues[] = $check['label'];
    }
    $minimumScore = (int)$config['minimumPublishScore'];
    if ($score < $minimumScore) $blockingIssues[] = "النتيجة أقل من حد النشر الداخلي ({$minimumScore}/100).";
    return [
        'engine' => (string)$config['engine'], 'version' => (int)$config['version'],
        'type' => $type, 'score' => $score, 'minimumPublishScore' => $minimumScore,
        'publishable' => count($blockingIssues) === 0, 'wordCount' => $wordCount,
        'focusKeyword' => $keyword, 'blockingIssues' => $blockingIssues, 'checks' => $checks,
    ];
}

function buildRankMathServicePageContent(array $input): array
{
    static $contentConfig = null;
    if ($contentConfig === null) {
        $contentPath = __DIR__ . '/seo-service-page-content.json';
        if (!is_file($contentPath)) {
            $contentPath = dirname(__DIR__) . '/lib/seo-service-page-content.json';
        }
        $contentConfig = is_file($contentPath)
            ? json_decode((string)file_get_contents($contentPath), true)
            : null;
        if (!is_array($contentConfig)
            || !is_array($contentConfig['labels'] ?? null)
            || !is_array($contentConfig['default'] ?? null)
            || !is_array($contentConfig['insulation'] ?? null)) {
            throw new RuntimeException('Missing or invalid shared service page content configuration.');
        }
    }

    $title = seoRankMathText((string)($input['title'] ?? ''));
    $slug = seoRankMathText((string)($input['slug'] ?? ''));
    $companyName = seoRankMathText((string)($input['companyName'] ?? '')) ?: 'الشركة';
    $rawDescription = seoRankMathText((string)($input['description'] ?? ''))
        ?: (string)($contentConfig['fallbackDescription'] ?? '');
    $isSpam = static function (string $text): bool {
        if (strpos($text, ' , ') !== false) return true;
        $commas = substr_count($text, ',');
        $words = preg_split('/\s+/u', trim($text), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        return count($words) > 0 && $commas / count($words) > 0.25;
    };
    $sanitize = static function (string $value): string {
        $replacements = [
            '/(?:تبدأ|يبدأ)\s+من\s+[\d,]+\s*(?:ر\.س|ريال)(?:\s*\/\s*(?:م²|للمكيف))?/u' => 'يُحدد بعد مراجعة تفاصيل الموقع',
            '/\d{1,3}\s*(?:—|-|إلى)\s*\d{1,3}\s*دقيقة/u' => 'حسب الموعد والتوفر',
            '/\d{1,3}\s*دقيقة/u' => 'حسب الموعد والتوفر',
            '/(?:معاينة|عرض سعر|عروض أسعار)\s+(?:ميدانية\s+)?(?:ال)?مجاني(?:ة)?/u' => 'معاينة أو عرض حسب تفاصيل الطلب',
            '/ضمان(?:اً|ا)?\s+(?:كامل|شامل|معتمد)(?:اً|ا)?(?:\s+100%)?/u' => 'وفق نطاق العمل المتفق عليه',
            '/(?:أحدث|العالمية)\s+(?:المعدات|الأجهزة|ماكينات)/u' => 'الأدوات المناسبة',
            '/ماكينات إيطالية/u' => 'معدات مناسبة',
            '/(?:مصرحة|معتمدة|مطابقة للاشتراطات الصحية)/u' => 'مناسبة للاستخدام',
            '/\b(?:140°|150 بار|3000 واط)\b/u' => 'حسب نوع الخدمة',
            '/(?:تغطية كاملة لكافة|تغطية شاملة لجميع|جميع أحياء)\s+(?:أحياء ومناطق\s+)?الرياض/u' => 'الأحياء المدرجة في الرياض',
            '/(?:وصول سريع|استجابة فورية|حجز فوري|عرض سعر فوري|اتصال فوري|تسليم فوري|تعقيم فوري|تجفيف فوري)/u' => 'تنسيق حسب الموعد',
        ];
        foreach ($replacements as $pattern => $replacement) {
            $value = preg_replace($pattern, $replacement, $value) ?? $value;
        }
        return $value;
    };
    $parts = preg_split('/\.\s+/u', $rawDescription) ?: [];
    $cleanParts = [];
    foreach ($parts as $part) {
        $trimmed = trim(rtrim($part, '.'));
        if ($trimmed === '') continue;
        if ($isSpam($trimmed)) break;
        $cleanParts[] = $trimmed;
    }
    $cleanedDescription = trim(implode('. ', $cleanParts));
    $bodyDescription = $sanitize(
        strlen($cleanedDescription) > 10
            ? $cleanedDescription
            : ($parts[0] ?? $rawDescription)
    );
    $rawMeta = seoRankMathText((string)($input['seoDescription'] ?? ''));
    $metaDescription = $sanitize($rawMeta !== '' && !$isSpam($rawMeta) ? $rawMeta : $bodyDescription);
    if (function_exists('mb_substr')) {
        $metaDescription = mb_substr($metaDescription, 0, 160, 'UTF-8');
    } else {
        $metaDescription = implode('', array_slice(preg_split('//u', $metaDescription, -1, PREG_SPLIT_NO_EMPTY) ?: [], 0, 160));
    }

    $isInsulation = preg_match('/عزل|عوازل/iu', $title . ' ' . $slug) === 1;
    $serviceData = $isInsulation ? $contentConfig['insulation'] : $contentConfig['default'];
    $variables = ['serviceTitle' => $title, 'companyName' => $companyName];
    $interpolate = static function (string $value) use ($variables): string {
        return preg_replace_callback('/\{([A-Za-z]+)\}/u', static function (array $match) use ($variables): string {
            return (string)($variables[$match[1]] ?? '');
        }, $value) ?? $value;
    };
    $labels = [];
    foreach ($contentConfig['labels'] as $key => $value) {
        $labels[$key] = is_array($value)
            ? array_map(static fn($item): string => $interpolate((string)$item), $value)
            : $interpolate((string)$value);
    }
    $summary = $interpolate((string)$contentConfig['summaryTemplate']);
    $processSteps = array_map(static fn(array $step): array => [
        'title' => $interpolate((string)($step['title'] ?? '')),
        'desc' => $interpolate((string)($step['desc'] ?? '')),
    ], $serviceData['processSteps'] ?? []);
    $equipment = array_map(static fn($item): string => $interpolate((string)$item), $serviceData['equipment'] ?? []);
    $faqs = array_map(static fn(array $faq): array => [
        'q' => $interpolate((string)($faq['q'] ?? '')),
        'a' => $interpolate((string)($faq['a'] ?? '')),
    ], $serviceData['faqs'] ?? []);
    $contentParts = array_merge(
        [$labels['summary'], $summary, $title, $labels['details'], $bodyDescription],
        $labels['trustFacts'],
        [$labels['process']],
        array_merge(...array_map(static fn(array $step): array => [$step['title'], $step['desc']], $processSteps)),
        [$isInsulation ? $labels['insulationEquipment'] : $labels['equipment']],
        $equipment,
        [$labels['faq']],
        array_merge(...array_map(static fn(array $faq): array => [$faq['q'], $faq['a']], $faqs)),
        [$labels['cta'], $labels['ctaDescription']],
    );

    return [
        'isInsulation' => $isInsulation,
        'summary' => $summary,
        'bodyDescription' => $bodyDescription,
        'metaDescription' => $metaDescription,
        'labels' => $labels,
        'processSteps' => $processSteps,
        'equipment' => $equipment,
        'faqs' => $faqs,
        'contentText' => implode(' ', array_filter($contentParts, static fn($part): bool => (string)$part !== '')),
    ];
}

function buildRankMathPackagePageContent(array $input): array
{
    static $packageConfig = null;
    if ($packageConfig === null) {
        $contentPath = __DIR__ . '/seo-package-page-content.json';
        if (!is_file($contentPath)) {
            $contentPath = dirname(__DIR__) . '/lib/seo-package-page-content.json';
        }
        $packageConfig = is_file($contentPath)
            ? json_decode((string)file_get_contents($contentPath), true)
            : null;
        if (!is_array($packageConfig)
            || !is_array($packageConfig['categoryLabels'] ?? null)
            || !is_array($packageConfig['labels'] ?? null)) {
            throw new RuntimeException('Missing or invalid shared package page content configuration.');
        }
    }

    $name = seoRankMathText((string)($input['name'] ?? ''));
    $category = seoRankMathText((string)($input['category'] ?? ''));
    $categoryLabel = (string)($packageConfig['categoryLabels'][$category] ?? $category ?: 'خدمات تنظيف');
    $size = seoRankMathText((string)($input['size'] ?? ''));
    $capacity = seoRankMathText((string)($input['capacity'] ?? ''));
    $suitableFor = seoRankMathText((string)($input['suitableFor'] ?? ''));
    $rentalPeriod = seoRankMathText((string)($input['rentalPeriod'] ?? ''));
    $rawFeatures = $input['features'] ?? [];
    if (is_array($rawFeatures)) {
        $features = array_values(array_filter(array_map(
            static fn($feature): string => seoRankMathText((string)$feature),
            $rawFeatures,
        ), static fn(string $feature): bool => $feature !== ''));
    } else {
        $decodedFeatures = json_decode((string)$rawFeatures, true);
        if (is_array($decodedFeatures)) {
            $features = array_values(array_filter(array_map(
                static fn($feature): string => seoRankMathText((string)$feature),
                $decodedFeatures,
            ), static fn(string $feature): bool => $feature !== ''));
        } else {
            $features = array_values(array_filter(array_map(
                static fn(string $feature): string => seoRankMathText($feature),
                preg_split('/\r?\n/u', (string)$rawFeatures) ?: [],
            ), static fn(string $feature): bool => $feature !== ''));
        }
    }
    $descriptionInput = seoRankMathText((string)($input['description'] ?? ''))
        ?: (string)($packageConfig['fallbackDescription'] ?? '');
    $description = buildRankMathServicePageContent([
        'title' => $name,
        'description' => $descriptionInput,
        'companyName' => '',
    ])['bodyDescription'];
    $labels = $packageConfig['labels'];
    $contentParts = [
        $name,
        $categoryLabel,
        $size !== '' ? $labels['size'] . ': ' . $size : '',
        $capacity !== '' ? $labels['capacity'] . ': ' . $capacity : '',
        $suitableFor !== '' ? $labels['suitableFor'] . ' ' . $suitableFor : '',
        $rentalPeriod !== '' ? $labels['rentalPeriod'] . ': ' . $rentalPeriod : '',
        $description,
        count($features) > 0 ? $labels['features'] : '',
        ...$features,
        $labels['priceHeading'],
        $labels['priceValue'],
        $labels['priceDescription'],
        $labels['ctaHeading'],
        $labels['ctaDescription'],
    ];

    return [
        'name' => $name,
        'categoryLabel' => $categoryLabel,
        'size' => $size,
        'capacity' => $capacity,
        'suitableFor' => $suitableFor,
        'rentalPeriod' => $rentalPeriod,
        'description' => $description,
        'features' => $features,
        'labels' => $labels,
        'contentText' => implode(' ', array_filter($contentParts, static fn($part): bool => (string)$part !== '')),
    ];
}

function rankMathCanonicalOrDefault(string $canonical, string $expectedCanonical): string
{
    $canonical = trim($canonical);
    if ($canonical === '') return $expectedCanonical;

    $expected = parse_url($expectedCanonical);
    $candidate = parse_url($canonical);
    $expectedScheme = strtolower((string)($expected['scheme'] ?? ''));
    if (!is_array($expected) || !is_array($candidate)
        || !in_array($expectedScheme, ['http', 'https'], true)
        || empty($expected['host'])
        || isset($expected['query']) || isset($expected['fragment'])
        || isset($candidate['query']) || isset($candidate['fragment'])) {
        return $canonical;
    }

    $candidateHasAuthority = isset($candidate['scheme']) || isset($candidate['host']);
    if ($candidateHasAuthority) {
        $candidateScheme = strtolower((string)($candidate['scheme'] ?? ''));
        if ($candidateScheme !== $expectedScheme
            || strtolower((string)($candidate['host'] ?? '')) !== strtolower((string)$expected['host'])
            || isset($candidate['user']) || isset($candidate['pass'])
            || (int)($candidate['port'] ?? ($candidateScheme === 'https' ? 443 : 80))
                !== (int)($expected['port'] ?? ($expectedScheme === 'https' ? 443 : 80))) {
            return $canonical;
        }
    } elseif (!isset($candidate['path']) || (string)$candidate['path'] === '') {
        return $canonical;
    }

    $candidatePath = rtrim(rawurldecode((string)($candidate['path'] ?? '/')), '/') ?: '/';
    $expectedPath = rtrim(rawurldecode((string)($expected['path'] ?? '/')), '/') ?: '/';
    return $candidatePath === $expectedPath ? $expectedCanonical : $canonical;
}

function rankMathPublishingError(array $input): ?string
{
    $analysis = analyzeRankMathSeo($input);
    if ($analysis['publishable']) return null;
    return 'تعذر النشر عبر بوابة Rank Math الداخلية (' . $analysis['score'] . '/100): ' . implode('، ', $analysis['blockingIssues']);
}

function rankMathServiceImageInputs($images, $imageUrl, string $title): array
{
    $parsedImages = is_array($images) ? $images : json_decode((string)$images, true);
    if (!is_array($parsedImages)) $parsedImages = [];
    if (is_string($imageUrl) && trim($imageUrl) !== '' && !in_array($imageUrl, $parsedImages, true)) {
        array_unshift($parsedImages, $imageUrl);
    }
    return array_values(array_map(
        static fn($image): array => ['alt' => $title . ' بالرياض'],
        array_filter($parsedImages, static fn($image): bool => is_string($image) && trim($image) !== ''),
    ));
}

function rankMathSqliteColumns(PDO $pdo, string $table): array
{
    static $columnCache = [];
    $allowedTables = ['posts', 'seo_pages', 'services', 'site_settings'];
    if (!in_array($table, $allowedTables, true)) return [];
    $cacheKey = spl_object_id($pdo) . ':' . $table;
    if (array_key_exists($cacheKey, $columnCache)) return $columnCache[$cacheKey];
    try {
        if ((string)$pdo->getAttribute(PDO::ATTR_DRIVER_NAME) !== 'sqlite') return [];
        $statement = $pdo->query('PRAGMA table_info("' . $table . '")');
        if ($statement === false) return $columnCache[$cacheKey] = [];
        $columns = [];
        foreach ($statement->fetchAll(PDO::FETCH_ASSOC) as $row) {
            if (is_string($row['name'] ?? null)) $columns[] = $row['name'];
        }
        return $columnCache[$cacheKey] = $columns;
    } catch (Throwable $error) {
        return $columnCache[$cacheKey] = [];
    }
}

function rankMathReadSettings(PDO $pdo, array $keys): array
{
    $columns = rankMathSqliteColumns($pdo, 'site_settings');
    if (!in_array('key', $columns, true) || !in_array('value', $columns, true)) return [];
    $keys = array_values(array_filter($keys, static fn($key): bool => is_string($key) && $key !== ''));
    if (!$keys) return [];
    try {
        $placeholders = implode(', ', array_fill(0, count($keys), '?'));
        $statement = $pdo->prepare('SELECT "key", "value" FROM site_settings WHERE "key" IN (' . $placeholders . ')');
        $statement->execute($keys);
        $rows = $statement->fetchAll(PDO::FETCH_KEY_PAIR);
        return is_array($rows) ? $rows : [];
    } catch (Throwable $error) {
        return [];
    }
}

function rankMathReadSetting(PDO $pdo, string $key): ?string
{
    $settings = rankMathReadSettings($pdo, [$key]);
    return is_string($settings[$key] ?? null) ? $settings[$key] : null;
}

function rankMathPublishedSeoRows(PDO $pdo, string $kind, array $selectedColumns): array
{
    $sources = [
        'posts' => ['table' => 'posts', 'filters' => ['status', 'is_active'], 'where' => "status = 'published' AND is_active = 1"],
        'seo_pages' => ['table' => 'seo_pages', 'filters' => ['status', 'is_active'], 'where' => "status = 'published' AND is_active = 1"],
        'services' => ['table' => 'services', 'filters' => ['is_active'], 'where' => 'is_active = 1'],
    ];
    $source = $sources[$kind] ?? null;
    if ($source === null) return [];
    $columns = rankMathSqliteColumns($pdo, $source['table']);
    foreach ($source['filters'] as $filter) {
        if (!in_array($filter, $columns, true)) return [];
    }

    $selectParts = [];
    foreach ($selectedColumns as $column) {
        if (!is_string($column) || !preg_match('/^[a-z_][a-z0-9_]*$/i', $column)) continue;
        $selectParts[] = in_array($column, $columns, true)
            ? '"' . $column . '"'
            : "'' AS \"" . $column . '"';
    }
    if (!$selectParts) return [];
    try {
        $statement = $pdo->query(
            'SELECT ' . implode(', ', $selectParts)
            . ' FROM "' . $source['table'] . '" WHERE ' . $source['where']
        );
        return $statement ? $statement->fetchAll(PDO::FETCH_ASSOC) : [];
    } catch (Throwable $error) {
        return [];
    }
}

function rankMathCompanyName(PDO $pdo): string
{
    $value = rankMathReadSetting($pdo, 'company_name');
    return is_string($value) && trim($value) !== '' ? trim($value) : 'خدمات التنظيف بالرياض';
}

function rankMathPolicyConfig(): array
{
    static $rules = null;
    if ($rules !== null) return $rules;
    $path = is_file(__DIR__ . '/seo-page-policy.json')
        ? __DIR__ . '/seo-page-policy.json'
        : dirname(__DIR__) . '/lib/seo-page-policy.json';
    $decoded = is_file($path) ? json_decode((string)file_get_contents($path), true) : null;
    if (!is_array($decoded['rankMath'] ?? null)) {
        throw new RuntimeException('Missing internal Rank Math policy configuration.');
    }
    $rules = $decoded['rankMath'];
    return $rules;
}

function rankMathInternalCheckId(string $checkId): ?string
{
    $checkId = preg_replace('/^rankmath-/u', '', $checkId) ?? $checkId;
    $checkIds = [
        'title-length' => 'titleLength',
        'keyword-title' => 'keywordTitle',
        'description-length' => 'descriptionLength',
        'keyword-description' => 'keywordDescription',
        'focus-keyword' => 'keyword',
        'keyword-h1' => 'keywordH1',
        'keyword-intro' => 'keywordIntroduction',
        'keyword-introduction' => 'keywordIntroduction',
        'content-depth' => 'contentDepth',
        'canonical' => 'canonical',
    ];
    return $checkIds[$checkId] ?? null;
}

function rankMathMinimumWords(string $type): int
{
    $rules = rankMathPolicyConfig();
    return (int)($rules['minimumWords'][$type] ?? $rules['minimumWords']['static'] ?? 50);
}

function rankMathRepairShortSeoDescription(string $value, ?int $minimum = null, ?int $maximum = null): string
{
    $rules = rankMathPolicyConfig();
    $minimum = $minimum ?? (int)($rules['description']['minimum'] ?? 120);
    $maximum = $maximum ?? (int)($rules['description']['maximum'] ?? 160);
    $normalized = trim(preg_replace('/\s+/u', ' ', $value) ?? $value);
    $length = seoUnicodeLength($normalized);
    if ($normalized === '' || $length >= $minimum || $length > $maximum) return $normalized;

    $repairBase = trim(preg_replace('/[.!?؟،؛:…]+$/u', '', $normalized) ?? $normalized);
    $suffix = ' لمعرفة التفاصيل.';
    $suffixLength = seoUnicodeLength($suffix);
    $baseLength = seoUnicodeLength($repairBase);
    if ($minimum - $baseLength > $suffixLength || $baseLength + $suffixLength > $maximum) return $normalized;

    return $repairBase . $suffix;
}

function rankMathFitSeoTitleSuffix(string $value, int $maximum): string
{
    $suffix = trim(preg_replace('/\s+/u', ' ', $value) ?? $value);
    if ($suffix === '' || $maximum <= 0) return '';
    if (seoUnicodeLength($suffix) <= $maximum) return $suffix;

    $words = preg_split('/\s+/u', $suffix, -1, PREG_SPLIT_NO_EMPTY) ?: [];
    $keptWords = [];
    foreach ($words as $word) {
        $candidate = implode(' ', array_merge($keptWords, [$word]));
        if (seoUnicodeLength($candidate) > $maximum) break;
        $keptWords[] = $word;
    }
    if ($keptWords) return implode(' ', $keptWords);

    $characters = preg_split('//u', $suffix, -1, PREG_SPLIT_NO_EMPTY) ?: [];
    return implode('', array_slice($characters, 0, $maximum));
}

function rankMathRepairSeoTitleCandidate(
    string $value,
    string $focusKeyword,
    ?int $minimum = null,
    ?int $maximum = null
): string {
    $rules = rankMathPolicyConfig();
    $minimum = $minimum ?? (int)($rules['title']['minimum'] ?? 30);
    $maximum = $maximum ?? (int)($rules['title']['maximum'] ?? 60);
    $title = trim(preg_replace('/\s+/u', ' ', seoRankMathText($value)) ?? $value);
    $focus = trim(preg_replace('/\s+/u', ' ', seoRankMathText($focusKeyword)) ?? $focusKeyword);
    $titleLength = seoUnicodeLength($title);
    $normalizedFocus = rankMathNormalizeKeywordPhrase($focus);
    $normalizedTitle = rankMathNormalizeKeywordPhrase($title);
    $hasFocus = $normalizedFocus === ''
        || strpos(' ' . $normalizedTitle . ' ', ' ' . $normalizedFocus . ' ') !== false;
    if ($title !== '' && $titleLength >= $minimum && $titleLength <= $maximum && $hasFocus) {
        return $title;
    }
    if ($focus === '') return rankMathFitSeoTitleSuffix($title, $maximum);

    $focusPosition = strpos($title, $focus);
    $remainder = $focusPosition !== false
        ? substr_replace($title, '', $focusPosition, strlen($focus))
        : $title;
    $remainder = trim(preg_replace('/^[\s:|—–-]+|[\s:|—–-]+$/u', '', $remainder) ?? $remainder);
    $remainder = trim(preg_replace('/\s+/u', ' ', $remainder) ?? $remainder);
    $separator = $remainder !== '' ? ': ' : '';
    $available = $maximum - seoUnicodeLength($focus . $separator);
    $suffix = rankMathFitSeoTitleSuffix($remainder, $available);
    return trim($focus . ($suffix !== '' ? $separator . $suffix : '')) ?: $title;
}

function rankMathAiGuidance(string $type): string
{
    $rules = rankMathPolicyConfig();
    $minimumWords = rankMathMinimumWords($type);
    $titleMin = (int)($rules['title']['targetMinimum'] ?? $rules['title']['minimum'] ?? 50);
    $titleMax = (int)($rules['title']['maximum'] ?? 60);
    $titleHardMax = (int)($rules['title']['hardMaximum'] ?? 70);
    $descriptionMin = (int)($rules['description']['minimum'] ?? 120);
    $descriptionMax = (int)($rules['description']['maximum'] ?? 160);
    $descriptionHardMax = (int)($rules['description']['hardMaximum'] ?? 200);
    $publishScore = (int)($rules['minimumPublishScore'] ?? 80);
    return implode("\n", [
        'قواعد بوابة Rank Math الداخلية لهذا المشروع؛ المحلل البرمجي الفعلي هو المرجع، وليست هذه نتيجة إضافة WordPress الرسمية:',
        '- لا يكفي بلوغ الدرجة وحدها: يجب اجتياز كل فحص حاجب وبلوغ ' . $publishScore . '/100. التنبيه يحتسب نصف نقاطه والفحص غير المتاح لا يدخل مقام الدرجة.',
        "- عنوان SEO موجود؛ استهدف {$titleMin}–{$titleMax} حرفاً ولا تتجاوز الحد الصارم {$titleHardMax}.",
        '- عبارة تركيز واحدة مطابقة لنية الصفحة، وأول عبارة في قائمة الكلمات المفتاحية، وموجودة حرفياً في عنوان SEO.',
        "- وصف SEO يقاس بالحروف لا الكلمات؛ استهدف {$descriptionMin}–{$descriptionMax} حرفاً ولا تتجاوز {$descriptionHardMax}.",
        '- وجود عبارة التركيز في الوصف وH1 وأول 100 كلمة تحسينات إرشادية وليست شروطاً حاجبة؛ استخدمها طبيعياً.',
        '- يجب وجود H1 واحد بالضبط ومسار غير فارغ. وجود العبارة في الرابط إرشادي ولا يبرر تغيير رابط مستقر.',
        "- عمق المحتوى شرط حاجب: الحد الأدنى {$minimumWords} كلمة وفق عدّ المحلل بعد حذف HTML وتقسيم النص المرئي على المسافات؛ استهدف {$minimumWords} + 80 كلمة عند التوسعة.",
        '- Canonical شرط حاجب: رابط HTTPS ذاتي مطابق للمسار المتوقع؛ الخادم يحدده ولا يجوز للذكاء الاصطناعي تخمينه أو تغييره.',
        '- اكتب وصفاً بديلاً لكل صورة موجودة، وأضف رابطاً داخلياً حقيقياً ذا صلة إن توفر. لا تختلق الصور أو الروابط أو بيانات Schema أو حقائق تجارية.',
        '- استخدم العبارات المساندة ذات الصلة فقط من القائمة المرتبة بقوة وجودها في محتوى الموقع؛ هذا ليس حجم بحث أو ترتيب Google.',
        '- خاطب الجمهور السعودي في الرياض، لكن نطاق الخدمة الفعلي هو الرياض فقط. لا تذكر خدمة أو سعراً أو ضماناً غير موثق.',
        '- لا تنشر إلا بعد اجتياز الشروط الحاجبة وبلوغ الدرجة الداخلية ' . $publishScore . '/100.',
    ]);
}

function rankMathNormalizeKeywordPhrase(string $value): string
{
    $value = seoRankMathText($value);
    if (class_exists('Normalizer')) {
        $normalized = \Normalizer::normalize($value, \Normalizer::FORM_KC);
        if (is_string($normalized)) $value = $normalized;
    }
    $value = strtr($value, ['أ' => 'ا', 'إ' => 'ا', 'آ' => 'ا', 'ٱ' => 'ا', 'ى' => 'ي', 'ؤ' => 'و', 'ئ' => 'ي']);
    $value = preg_replace('/[\\x{064B}-\\x{065F}\\x{0670}\\x{0640}]/u', '', $value) ?? $value;
    $value = function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
    $value = preg_replace('/[^\\p{L}\\p{N}]+/u', ' ', $value) ?? $value;
    return trim(preg_replace('/\\s+/u', ' ', $value) ?? $value);
}

function rankMathSelectMeasuredFocusKeyword(string $topic, array $candidates, string $requestedFocus = ''): ?string
{
    $distinct = [];
    $seen = [];
    foreach ($candidates as $candidate) {
        $term = is_array($candidate) ? trim((string)($candidate['term'] ?? '')) : trim((string)$candidate);
        if ($term === '') continue;
        $normalized = rankMathNormalizeKeywordPhrase($term);
        if ($normalized === '' || isset($seen[$normalized])) continue;
        $seen[$normalized] = true;
        $distinct[] = $term;
    }

    $normalizedRequested = rankMathNormalizeKeywordPhrase($requestedFocus);
    if ($normalizedRequested !== '') {
        foreach ($distinct as $term) {
            if (rankMathNormalizeKeywordPhrase($term) === $normalizedRequested) return $term;
        }
        return null;
    }

    $stopWords = ['في', 'من', 'على', 'الى', 'عن', 'مع', 'شركة', 'خدمة', 'خدمات', 'الرياض'];
    $topicTokens = preg_split('/\\s+/u', rankMathNormalizeKeywordPhrase($topic), -1, PREG_SPLIT_NO_EMPTY) ?: [];
    $topicTokens = array_values(array_unique(array_filter($topicTokens, static function (string $token) use ($stopWords): bool {
        return seoUnicodeLength($token) > 1 && !in_array($token, $stopWords, true);
    })));
    if (!$topicTokens) return null;

    $bestTerm = null;
    $bestOverlap = 0;
    foreach ($distinct as $term) {
        $tokens = preg_split('/\\s+/u', rankMathNormalizeKeywordPhrase($term), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $tokens = array_values(array_unique(array_filter($tokens, static function (string $token) use ($stopWords): bool {
            return seoUnicodeLength($token) > 1 && !in_array($token, $stopWords, true);
        })));
        $overlap = count(array_intersect($tokens, $topicTokens));
        if ($overlap > $bestOverlap) {
            $bestTerm = $term;
            $bestOverlap = $overlap;
        }
    }
    return $bestOverlap >= 2 ? $bestTerm : null;
}

function rankMathProjectSearchPhrase(string $value): bool
{
    $normalized = rankMathNormalizeKeywordPhrase($value);
    if ($normalized === '' || count(preg_split('/\\s+/u', $normalized, -1, PREG_SPLIT_NO_EMPTY) ?: []) < 2) {
        return false;
    }

    static $pagePolicy = null;
    if ($pagePolicy === null) {
        $path = is_file(__DIR__ . '/seo-page-policy.json')
            ? __DIR__ . '/seo-page-policy.json'
            : dirname(__DIR__) . '/lib/seo-page-policy.json';
        $pagePolicy = is_file($path) ? json_decode((string)file_get_contents($path), true) : [];
    }
    foreach (($pagePolicy['unsupportedTopicPatterns'] ?? []) as $pattern) {
        if (preg_match('~' . str_replace('~', '\\~', (string)$pattern) . '~iu', $value)) return false;
    }
    foreach (($pagePolicy['supportedServiceTopicPatterns'] ?? []) as $pattern) {
        if (preg_match('~' . str_replace('~', '\\~', (string)$pattern) . '~iu', $value)) return true;
    }
    return false;
}

function rankMathParseKeywordTerms($value): array
{
    if (is_string($value) && substr(trim($value), 0, 1) === '[') {
        $decoded = json_decode($value, true);
        if (is_array($decoded)) $value = $decoded;
    }
    $entries = is_array($value) ? $value : (is_string($value) ? preg_split('/[,،;|\\r\\n]+/u', $value) : []);
    $terms = [];
    foreach ($entries as $entry) {
        if (is_array($entry)) {
            foreach (['term', 'targetKeyword', 'target_keyword'] as $field) {
                if (is_string($entry[$field] ?? null)) {
                    array_push($terms, ...preg_split('/[,،;|\\r\\n]+/u', $entry[$field]));
                }
            }
        } elseif (is_string($entry) || is_numeric($entry)) {
            array_push($terms, ...preg_split('/[,،;|\\r\\n]+/u', (string)$entry));
        }
    }
    return array_values(array_filter(array_map(static fn($term): string => trim((string)$term), $terms), static fn(string $term): bool => $term !== ''));
}

function rankMathSiteKeywordStrength(array $terms, array $pages): array
{
    $unique = [];
    foreach ($terms as $rawTerm) {
        $term = trim(preg_replace('/\\s+/u', ' ', (string)$rawTerm) ?? (string)$rawTerm);
        $key = rankMathNormalizeKeywordPhrase($term);
        if ($key !== '' && !isset($unique[$key])) $unique[$key] = $term;
    }

    $preparedPages = [];
    $analyzedWordCount = 0;
    foreach ($pages as $page) {
        $text = rankMathNormalizeKeywordPhrase(implode(' ', [
                (string)($page['title'] ?? ''),
                (string)($page['description'] ?? ''),
                implode(' ', is_array($page['h1'] ?? null) ? $page['h1'] : []),
                (string)($page['contentText'] ?? ''),
            ]));
        $wordCount = $text === '' ? 0 : substr_count($text, ' ') + 1;
        $analyzedWordCount += $wordCount;
        $preparedPages[] = [
            'url' => (string)($page['url'] ?? ''),
            'title' => (string)($page['title'] ?? ''),
            'text' => $text,
            'kind' => (string)($page['kind'] ?? ''),
            'focusKeyword' => rankMathNormalizeKeywordPhrase((string)($page['focusKeyword'] ?? '')),
        ];
    }
    $rows = [];
    foreach ($unique as $key => $term) {
        $occurrences = $pageCount = $articleCount = $focusPageCount = 0;
        $samplePages = [];
        foreach ($preparedPages as $page) {
            $text = $page['text'];
            if ($text === '') continue;
            $pageOccurrences = substr_count($text, $key);
            if ($pageOccurrences < 1) continue;
            $occurrences += $pageOccurrences;
            $pageCount++;
            if ($page['kind'] === 'article') $articleCount++;
            if ($page['focusKeyword'] === $key) $focusPageCount++;
            $samplePages[] = [
                'url' => $page['url'],
                'title' => $page['title'] !== '' ? $page['title'] : $page['url'],
                'occurrences' => $pageOccurrences,
            ];
        }
        $mentionPoints = min(40, (int)round(log($occurrences + 1, 2) * 8));
        $strength = min(100, $mentionPoints + min(30, $pageCount * 5) + min(20, $articleCount * 4) + min(10, $focusPageCount * 5));
        usort($samplePages, static fn(array $a, array $b): int =>
            $b['occurrences'] <=> $a['occurrences'] ?: strcmp($a['url'], $b['url'])
        );
        $rows[] = [
            'term' => $term,
            'strength' => $strength,
            'occurrences' => $occurrences,
            'usagePercent' => $analyzedWordCount > 0
                ? round(($occurrences / $analyzedWordCount) * 100, 2)
                : 0,
            'pageCount' => $pageCount,
            'articleCount' => $articleCount,
            'focusPageCount' => $focusPageCount,
            'samplePages' => array_slice($samplePages, 0, 3),
        ];
    }
    usort($rows, static fn(array $a, array $b): int =>
        $b['strength'] <=> $a['strength']
        ?: $b['occurrences'] <=> $a['occurrences']
        ?: $b['articleCount'] <=> $a['articleCount']
        ?: strcmp($a['term'], $b['term'])
    );
    return $rows;
}

function rankMathTopSiteKeywords(PDO $pdo, string $primary = 'شركة تنظيف بالرياض'): array
{
    $siteOrigin = cleanflowRequestSiteOrigin();
    $posts = rankMathPublishedSeoRows($pdo, 'posts', ['title', 'excerpt', 'content', 'seo_description', 'seo_keywords', 'slug']);
    $seoPages = rankMathPublishedSeoRows($pdo, 'seo_pages', ['title', 'excerpt', 'content', 'seo_description', 'seo_keywords', 'target_keyword', 'slug']);
    $services = rankMathPublishedSeoRows($pdo, 'services', ['title', 'description', 'seo_description', 'seo_keywords', 'seo_slug']);
    $settingRows = rankMathReadSettings($pdo, ['seo_keywords', 'seo_meta_keywords']);
    $pages = [];
    $terms = [$primary];
    foreach ($settingRows as $value) array_push($terms, ...rankMathParseKeywordTerms($value));
    foreach ($posts as $row) {
        $keywords = rankMathParseKeywordTerms($row['seo_keywords'] ?? '');
        array_push($terms, ...$keywords);
        $pages[] = [
            'url' => $siteOrigin . '/blog/' . rawurlencode((string)($row['slug'] ?? '')),
            'kind' => 'article',
            'title' => $row['title'] ?? '',
            'description' => ($row['seo_description'] ?? '') ?: ($row['excerpt'] ?? ''),
            'h1' => [$row['title'] ?? ''],
            'focusKeyword' => $keywords[0] ?? '',
            'contentText' => $row['content'] ?? '',
        ];
    }
    foreach ($seoPages as $row) {
        $keywords = rankMathParseKeywordTerms($row['seo_keywords'] ?? '');
        $target = trim((string)($row['target_keyword'] ?? ''));
        if ($target !== '') $terms[] = $target;
        array_push($terms, ...$keywords);
        $pages[] = [
            'url' => $siteOrigin . '/page/' . rawurlencode((string)($row['slug'] ?? '')),
            'kind' => 'landing',
            'title' => $row['title'] ?? '',
            'description' => ($row['seo_description'] ?? '') ?: ($row['excerpt'] ?? ''),
            'h1' => [$row['title'] ?? ''],
            'focusKeyword' => $target !== '' ? $target : ($keywords[0] ?? ''),
            'contentText' => $row['content'] ?? '',
        ];
    }
    foreach ($services as $row) {
        $keywords = rankMathParseKeywordTerms($row['seo_keywords'] ?? '');
        array_push($terms, ...$keywords);
        $pages[] = [
            'url' => $siteOrigin . '/services/' . rawurlencode((string)($row['seo_slug'] ?? '')),
            'kind' => 'service',
            'title' => $row['title'] ?? '',
            'description' => $row['seo_description'] ?? '',
            'h1' => [$row['title'] ?? ''],
            'focusKeyword' => $keywords[0] ?? '',
            'contentText' => $row['description'] ?? '',
        ];
    }
    $ranked = rankMathSiteKeywordStrength($terms, $pages);
    $ranked = array_values(array_filter($ranked, static fn(array $row): bool =>
        rankMathProjectSearchPhrase((string)$row['term'])
        && rankMathNormalizeKeywordPhrase($row['term']) !== 'الرياض'
        && preg_match('/(?:حاويات|حاوية|الأنقاض|مخلفات|المخلفات)/u', $row['term']) !== 1
    ));
    $primaryKey = rankMathNormalizeKeywordPhrase($primary);
    $primaryRow = null;
    $others = [];
    foreach ($ranked as $row) {
        if (rankMathNormalizeKeywordPhrase($row['term']) === $primaryKey) $primaryRow = $row;
        else $others[] = $row;
    }
    $topKeywords = array_slice(array_merge($primaryRow ? [$primaryRow] : [], $others), 0, 50);
    foreach ($topKeywords as &$keyword) {
        $keywordKey = rankMathNormalizeKeywordPhrase((string)$keyword['term']);
        $owners = [];
        if ($keywordKey === $primaryKey) {
            $owners[] = [
                'url' => $siteOrigin . '/',
                'title' => 'الصفحة الرئيسية',
                'kind' => 'homepage',
                'focusKeyword' => $primary,
            ];
        }
        foreach ($pages as $page) {
            if (rankMathNormalizeKeywordPhrase((string)($page['focusKeyword'] ?? '')) !== $keywordKey) continue;
            $owners[] = [
                'url' => (string)($page['url'] ?? ''),
                'title' => trim((string)($page['title'] ?? '')) ?: (string)($page['url'] ?? ''),
                'kind' => (string)($page['kind'] ?? 'صفحة'),
                'focusKeyword' => (string)($page['focusKeyword'] ?? ''),
            ];
        }
        $keyword['exactOwners'] = $owners;
    }
    unset($keyword);
    return $topKeywords;
}

function rankMathReadSavedKeywordSnapshot(PDO $pdo): ?array
{
    $siteOrigin = cleanflowRequestSiteOrigin();
    $storedValue = rankMathReadSetting($pdo, 'seo_site_audit_report');
    if (!is_string($storedValue) || $storedValue === '') return null;

    $stored = json_decode($storedValue, true);
    if (!is_array($stored)) return null;
    if (
        ($stored['storageEncoding'] ?? '') === 'gzip-base64-v1'
        && is_string($stored['payload'] ?? null)
    ) {
        $compressed = base64_decode($stored['payload'], true);
        $expanded = is_string($compressed) ? @gzdecode($compressed, 32000000) : false;
        $stored = is_string($expanded) ? json_decode($expanded, true) : null;
    }
    if (
        !is_array($stored)
        || !is_string($stored['completedAt'] ?? null)
        || strtotime($stored['completedAt']) === false
        || !is_array($stored['keywordStrength'] ?? null)
    ) {
        return null;
    }

    $keywords = [];
    $seen = [];
    foreach ($stored['keywordStrength'] as $row) {
        if (!is_array($row) || !is_string($row['term'] ?? null)) continue;
        $term = trim($row['term']);
        $key = rankMathNormalizeKeywordPhrase($term);
        if (
            $key === ''
            || isset($seen[$key])
            || !rankMathProjectSearchPhrase($term)
            || $key === 'الرياض'
            || preg_match('/(?:حاويات|حاوية|الأنقاض|مخلفات|المخلفات)/u', $term) === 1
        ) {
            continue;
        }
        $seen[$key] = true;

        $samplePages = [];
        foreach (is_array($row['samplePages'] ?? null) ? $row['samplePages'] : [] as $sample) {
            if (
                !is_array($sample)
                || !is_string($sample['url'] ?? null)
                || !is_numeric($sample['occurrences'] ?? null)
            ) {
                continue;
            }
            $samplePath = parse_url($sample['url'], PHP_URL_PATH);
            if (!is_string($samplePath) || !str_starts_with($samplePath, '/')) continue;
            $samplePages[] = [
                'url' => $siteOrigin . $samplePath,
                'title' => is_string($sample['title'] ?? null) ? $sample['title'] : $sample['url'],
                'occurrences' => max(0, (int)$sample['occurrences']),
            ];
        }
        $keywords[] = [
            'term' => $term,
            'strength' => max(0, min(100, (int)($row['strength'] ?? 0))),
            'occurrences' => max(0, (int)($row['occurrences'] ?? 0)),
            'usagePercent' => is_numeric($row['usagePercent'] ?? null) ? max(0, (float)$row['usagePercent']) : 0,
            'pageCount' => max(0, (int)($row['pageCount'] ?? 0)),
            'articleCount' => max(0, (int)($row['articleCount'] ?? 0)),
            'focusPageCount' => max(0, (int)($row['focusPageCount'] ?? 0)),
            'samplePages' => array_slice($samplePages, 0, 3),
        ];
    }
    if (!$keywords) return null;

    return [
        'completedAt' => $stored['completedAt'],
        'keywords' => $keywords,
    ];
}

function rankMathKeywordFocusPages(PDO $pdo): array
{
    $siteOrigin = cleanflowRequestSiteOrigin();
    $posts = rankMathPublishedSeoRows($pdo, 'posts', ['title', 'slug', 'seo_keywords']);
    $seoPages = rankMathPublishedSeoRows($pdo, 'seo_pages', ['title', 'slug', 'seo_keywords', 'target_keyword']);
    $services = rankMathPublishedSeoRows($pdo, 'services', ['title', 'seo_slug', 'seo_keywords']);
    $pages = [];

    foreach ($posts as $row) {
        $keywords = rankMathParseKeywordTerms($row['seo_keywords'] ?? '');
        $pages[] = [
            'url' => $siteOrigin . '/blog/' . rawurlencode((string)($row['slug'] ?? '')),
            'title' => (string)($row['title'] ?? ''),
            'kind' => 'article',
            'focusKeyword' => (string)($keywords[0] ?? ''),
        ];
    }
    foreach ($seoPages as $row) {
        $keywords = rankMathParseKeywordTerms($row['seo_keywords'] ?? '');
        $target = trim((string)($row['target_keyword'] ?? ''));
        $pages[] = [
            'url' => $siteOrigin . '/page/' . rawurlencode((string)($row['slug'] ?? '')),
            'title' => (string)($row['title'] ?? ''),
            'kind' => 'landing',
            'focusKeyword' => $target !== '' ? $target : (string)($keywords[0] ?? ''),
        ];
    }
    foreach ($services as $row) {
        $keywords = rankMathParseKeywordTerms($row['seo_keywords'] ?? '');
        $pages[] = [
            'url' => $siteOrigin . '/services/' . rawurlencode((string)($row['seo_slug'] ?? '')),
            'title' => (string)($row['title'] ?? ''),
            'kind' => 'service',
            'focusKeyword' => (string)($keywords[0] ?? ''),
        ];
    }
    return $pages;
}

function rankMathKeywordTopicMap(PDO $pdo, string $primary = 'شركة تنظيف بالرياض'): array
{
    $siteOrigin = cleanflowRequestSiteOrigin();
    $snapshot = rankMathReadSavedKeywordSnapshot($pdo);
    $measuredAt = $snapshot['completedAt'] ?? gmdate('Y-m-d\TH:i:s\Z');
    if ($snapshot !== null) {
        $ranked = $snapshot['keywords'];
        $primaryKey = rankMathNormalizeKeywordPhrase($primary);
        $primaryRow = null;
        $others = [];
        foreach ($ranked as $row) {
            if (rankMathNormalizeKeywordPhrase((string)$row['term']) === $primaryKey) $primaryRow = $row;
            else $others[] = $row;
        }
        if ($primaryRow === null) {
            $primaryRow = [
                'term' => $primary,
                'strength' => 0,
                'occurrences' => 0,
                'usagePercent' => 0,
                'pageCount' => 0,
                'articleCount' => 0,
                'focusPageCount' => 0,
                'samplePages' => [],
            ];
        }
        $ranked = array_slice(array_merge([$primaryRow], $others), 0, 50);
        $focusPages = rankMathKeywordFocusPages($pdo);
        foreach ($ranked as &$keyword) {
            $keywordKey = rankMathNormalizeKeywordPhrase((string)$keyword['term']);
            $owners = [];
            if ($keywordKey === $primaryKey) {
                $owners[] = [
                    'url' => $siteOrigin . '/',
                    'title' => 'الصفحة الرئيسية',
                    'kind' => 'homepage',
                    'focusKeyword' => $primary,
                ];
            }
            foreach ($focusPages as $page) {
                if (rankMathNormalizeKeywordPhrase($page['focusKeyword']) !== $keywordKey) continue;
                $owners[] = [
                    'url' => $page['url'],
                    'title' => $page['title'] !== '' ? $page['title'] : $page['url'],
                    'kind' => $page['kind'],
                    'focusKeyword' => $page['focusKeyword'],
                ];
            }
            $keyword['exactOwners'] = $owners;
        }
        unset($keyword);
    } else {
        $ranked = rankMathTopSiteKeywords($pdo, $primary);
    }

    $trackedValue = rankMathReadSetting($pdo, 'seo_keywords');
    $trackedRecords = is_string($trackedValue) ? json_decode($trackedValue, true) : null;
    $trackedByTerm = [];
    if (is_array($trackedRecords)) {
        foreach ($trackedRecords as $record) {
            if (!is_array($record) || !is_string($record['term'] ?? null)) continue;
            $key = rankMathNormalizeKeywordPhrase(trim($record['term']));
            if ($key !== '') $trackedByTerm[$key] = $record;
        }
    }

    $orderSource = 'Rank Math: قوة الوجود النصي وتوزعه في محتوى الموقع المنشور؛ ليست ترتيب Google ولا حجم البحث';
    $keywords = [];
    foreach ($ranked as $item) {
        $key = rankMathNormalizeKeywordPhrase((string)$item['term']);
        $tracked = $trackedByTerm[$key] ?? [];
        $position = $tracked['position'] ?? null;
        $volume = $tracked['volume'] ?? null;
        $difficulty = $tracked['difficulty'] ?? null;
        $intent = $tracked['intent'] ?? null;
        $lastChecked = $tracked['lastChecked'] ?? null;
        $position = is_numeric($position) && (float)$position >= 1 && floor((float)$position) === (float)$position
            ? (int)$position
            : null;
        $volume = is_numeric($volume) && (float)$volume >= 0 ? (float)$volume : null;
        $difficulty = is_numeric($difficulty) && (float)$difficulty >= 0 && (float)$difficulty <= 100
            ? (float)$difficulty
            : null;
        if (!in_array($intent, ['informational', 'commercial', 'transactional', 'navigational'], true)) {
            $intent = null;
        }
        if (!is_string($lastChecked) || strtotime($lastChecked) === false) $lastChecked = null;

        $keywords[] = array_merge($item, [
            'orderSource' => $orderSource,
            'manualPosition' => $position,
            'manualVolume' => $volume,
            'manualDifficulty' => $difficulty,
            'intent' => $intent,
            'lastChecked' => $lastChecked,
        ]);
    }

    return [
        'measuredAt' => $measuredAt,
        'orderSource' => $orderSource,
        'keywords' => $keywords,
    ];
}

function rankMathSanitizeGeneratedHtml(string $html): string
{
    $html = preg_replace('/<(script|style)\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>/iu', ' ', $html) ?? $html;
    $html = preg_replace('/<!--[\\s\\S]*?-->/u', ' ', $html) ?? $html;
    $allowed = ['h2', 'h3', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'br'];
    $html = preg_replace_callback('/<\\/?([a-z0-9]+)\\b[^>]*>/iu', static function (array $match) use ($allowed): string {
        $name = strtolower($match[1]);
        if (!in_array($name, $allowed, true)) return ' ';
        return str_starts_with($match[0], '</') ? "</{$name}>" : "<{$name}>";
    }, $html) ?? $html;
    return trim(preg_replace('/\\s+/u', ' ', $html) ?? $html);
}

function seoRankMathText(string $value): string
{
    $value = preg_replace('/<script\\b[^>]*>[\\s\\S]*?<\\/script>|<style\\b[^>]*>[\\s\\S]*?<\\/style>/iu', ' ', $value) ?? $value;
    $value = preg_replace('/<!--([\\s\\S]*?)-->/u', ' ', $value) ?? $value;
    $value = preg_replace('/<[^>]*>/u', ' ', $value) ?? $value;
    $value = preg_replace_callback(
        '/&(#(?:x[\\da-f]+|\\d+)|amp|lt|gt|quot|apos|nbsp|copy|reg|ndash|mdash|hellip|lsquo|rsquo|ldquo|rdquo);/iu',
        static fn(array $match): string => html_entity_decode($match[0], ENT_QUOTES | ENT_HTML5, 'UTF-8'),
        $value,
    ) ?? $value;
    return trim(preg_replace('/\\s+/u', ' ', $value) ?? $value);
}

function seoUnicodeLength(string $value): int
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($value, 'UTF-8');
    }
    $matches = preg_match_all('/./us', $value);
    return $matches === false ? strlen($value) : $matches;
}
