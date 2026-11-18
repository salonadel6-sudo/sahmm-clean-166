import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  analyzeRankMathSeo,
  normalizeRankMathKeywordPhrase,
  repairRankMathSeoTitleCandidate,
  selectMeasuredFocusKeyword,
  RANK_MATH_EDITOR_POLICY,
} from "@workspace/seo-rank-math"

const siteOrigin = "https://contract.example"
const focusKeyword = "تنظيف منازل بالرياض"
const fillDescription = (text: string, length: number) => {
  const base = text.trim()
  return `${base}${" س".repeat(Math.max(0, length - [...base].length - 1))}`.slice(0, length)
}

const selectorCases = [
  {
    topic: "تنظيف منازل وفلل بالرياض",
    candidates: ["شركة تنظيف مجالس بالرياض", "تنظيف منازل وفلل بالرياض"],
    requested: "",
  },
  {
    topic: "موضوع آخر",
    candidates: ["تنظيف منازل بالرياض", "تنظيف فلل بالرياض"],
    requested: "تنظيف منازل بالرياض",
  },
  {
    topic: "موضوع آخر",
    candidates: ["تنظيف منازل بالرياض"],
    requested: "عبارة غير مقاسة",
  },
  { topic: "تنظيف منازل وفلل", candidates: [], requested: "" },
  {
    topic: "صيانة سيارات وقطع غيار",
    candidates: ["تنظيف منازل بالرياض", "تنظيف فلل بالرياض"],
    requested: "",
  },
]

const seoCases = [
  {
    name: "valid metadata",
    focusKeyword,
    seoTitle: `${focusKeyword} | دليل شامل ومفيد للعناية بالمنازل`,
    description: fillDescription(`${focusKeyword} بخطوات عملية ونصائح واضحة للعناية بالمنزل.`, 140),
    seoKeywords: `${focusKeyword}، تنظيف فلل بالرياض`,
    slug: "تنظيف-منازل",
    canonicalMatches: true,
  },
  {
    name: "focus keyword exceeds title gate",
    focusKeyword: "تنظيف منازل وفلل ومكاتب وشقق بالرياض مع خدمة احترافية متكاملة للعناية",
    seoTitle: "عنوان قصير",
    description: fillDescription(
      "تنظيف منازل وفلل ومكاتب وشقق بالرياض مع خدمة احترافية متكاملة للعناية بخطوات واضحة.",
      140,
    ),
    seoKeywords: "تنظيف منازل وفلل ومكاتب وشقق بالرياض مع خدمة احترافية متكاملة للعناية",
    slug: "تنظيف-منازل",
    canonicalMatches: true,
  },
  {
    name: "long SEO title",
    focusKeyword,
    seoTitle: `${focusKeyword} | ${"دليل شامل ومفيد للعناية بالمنازل ".repeat(5)}`,
    description: fillDescription(`${focusKeyword} بخطوات عملية ونصائح واضحة للعناية بالمنزل.`, 140),
    seoKeywords: focusKeyword,
    slug: "تنظيف-منازل",
    canonicalMatches: true,
  },
  {
    name: "description too short",
    focusKeyword,
    seoTitle: `${focusKeyword} | دليل شامل ومفيد للعناية بالمنازل`,
    description: `${focusKeyword} خدمة واضحة.`,
    seoKeywords: focusKeyword,
    slug: "تنظيف-منازل",
    canonicalMatches: true,
  },
  {
    name: "description too long",
    focusKeyword,
    seoTitle: `${focusKeyword} | دليل شامل ومفيد للعناية بالمنازل`,
    description: fillDescription(`${focusKeyword} معلومات مفيدة.`, 180),
    seoKeywords: focusKeyword,
    slug: "تنظيف-منازل",
    canonicalMatches: true,
  },
  {
    name: "focus keyword missing from description",
    focusKeyword,
    seoTitle: `${focusKeyword} | دليل شامل ومفيد للعناية بالمنازل`,
    description: fillDescription("نص وصفي عام عن خدمات العناية بالمنزل.", 140),
    seoKeywords: focusKeyword,
    slug: "تنظيف-منازل",
    canonicalMatches: true,
  },
  {
    name: "empty slug",
    focusKeyword,
    seoTitle: `${focusKeyword} | دليل شامل ومفيد للعناية بالمنازل`,
    description: fillDescription(`${focusKeyword} بخطوات عملية ونصائح واضحة للعناية بالمنزل.`, 140),
    seoKeywords: focusKeyword,
    slug: "",
    canonicalMatches: true,
  },
  {
    name: "unexpected canonical",
    focusKeyword,
    seoTitle: `${focusKeyword} | دليل شامل ومفيد للعناية بالمنازل`,
    description: fillDescription(`${focusKeyword} بخطوات عملية ونصائح واضحة للعناية بالمنزل.`, 140),
    seoKeywords: focusKeyword,
    slug: "تنظيف-منازل",
    canonicalMatches: false,
  },
  {
    name: "focus keyword is not first",
    focusKeyword,
    seoTitle: `${focusKeyword} | دليل شامل ومفيد للعناية بالمنازل`,
    description: fillDescription(`${focusKeyword} بخطوات عملية ونصائح واضحة للعناية بالمنزل.`, 140),
    seoKeywords: `تنظيف فلل بالرياض، ${focusKeyword}`,
    slug: "تنظيف-منازل",
    canonicalMatches: true,
  },
]

const phpScript = `
require_once ${JSON.stringify(resolve(dirname(fileURLToPath(import.meta.url)), "seo-page-policy.php"))};
$payload = json_decode(stream_get_contents(STDIN), true);
$selectorResults = [];
foreach ($payload['selectorCases'] as $case) {
    $selectorResults[] = rankMathSelectMeasuredFocusKeyword(
        (string)$case['topic'],
        $case['candidates'],
        (string)$case['requested']
    );
}
$seoResults = [];
$origin = (string)$payload['siteOrigin'];
$map = [
    'titleLength' => 'title-length',
    'keywordTitle' => 'keyword-title',
    'description' => 'description',
    'descriptionLength' => 'description-length',
    'keywordDescription' => 'keyword-description',
    'slug' => 'slug',
    'canonical' => 'canonical',
];
foreach ($payload['seoCases'] as $case) {
    $rules = rankMathPolicyConfig();
    $title = rankMathRepairSeoTitleCandidate(
        (string)$case['seoTitle'],
        (string)$case['focusKeyword'],
        (int)$rules['title']['minimum'],
        (int)$rules['title']['maximum']
    );
    $expectedCanonical = $origin . '/page/' . rawurlencode((string)$case['slug']);
    $canonical = !empty($case['canonicalMatches'])
        ? $expectedCanonical
        : 'https://invalid.example/page/' . rawurlencode((string)$case['slug']);
    $analysis = analyzeRankMathSeo([
        'type' => 'landing',
        'title' => (string)$case['seoTitle'],
        'seoTitle' => $title,
        'description' => (string)$case['description'],
        'focusKeyword' => (string)$case['focusKeyword'],
        'keywords' => (string)$case['seoKeywords'],
        'slug' => (string)$case['slug'],
        'canonical' => $canonical,
        'expectedCanonical' => $expectedCanonical,
        'h1' => [(string)$case['seoTitle']],
    ]);
    $checks = [];
    foreach ($analysis['checks'] as $check) {
        $id = (string)($check['id'] ?? '');
        if (isset($map[$id])) $checks[$map[$id]] = (string)($check['status'] ?? '');
    }
    $codes = [];
    foreach ($map as $phpId => $code) {
        if (($checks[$code] ?? '') !== 'pass') $codes[] = $code;
    }
    $firstKeyword = trim((string)(preg_split('/[,،;|\\\\r\\\\n]+/u', (string)$case['seoKeywords'])[0] ?? ''));
    $focusFirst = rankMathNormalizeKeywordPhrase($firstKeyword)
        === rankMathNormalizeKeywordPhrase((string)$case['focusKeyword']);
    if (!$focusFirst) $codes[] = 'focus-keyword-first';
    if ((string)$case['slug'] === '' && !in_array('slug', $codes, true)) $codes[] = 'slug';
    $seoResults[] = [
        'name' => (string)$case['name'],
        'seoTitle' => $title,
        'checks' => $checks,
        'failureCodes' => array_values(array_unique($codes)),
        'focusKeywordFirst' => $focusFirst,
        'titleLength' => seoUnicodeLength($title),
        'descriptionLength' => seoUnicodeLength((string)$case['description']),
        'slugValid' => (string)$case['slug'] !== '',
        'canonicalMatches' => ($checks['canonical'] ?? '') === 'pass',
    ];
}
echo json_encode(['selectorResults' => $selectorResults, 'seoResults' => $seoResults], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
`

const php = spawnSync("php", ["-r", phpScript], {
  input: JSON.stringify({ siteOrigin, selectorCases, seoCases }),
  encoding: "utf8",
})
assert.equal(php.status, 0, `PHP parity runner failed: ${php.stderr || php.stdout}`)
const phpResults = JSON.parse(php.stdout) as {
  selectorResults: Array<string | null>
  seoResults: Array<Record<string, unknown>>
}
assert.equal(phpResults.selectorResults.length, selectorCases.length)

const tsSelectorResults = selectorCases.map(testCase =>
  selectMeasuredFocusKeyword(testCase.topic, testCase.candidates, testCase.requested),
)
assert.deepEqual(phpResults.selectorResults, tsSelectorResults, "PHP and Node must select the same measured focus phrase")

const statusCodes: Record<string, string> = {
  "title-length": "title-length",
  "keyword-title": "keyword-title",
  description: "description",
  "description-length": "description-length",
  "keyword-description": "keyword-description",
  slug: "slug",
  canonical: "canonical",
}

const tsSeoResults = seoCases.map(testCase => {
  const seoTitle = repairRankMathSeoTitleCandidate(
    testCase.seoTitle,
    testCase.focusKeyword,
    RANK_MATH_EDITOR_POLICY.title.minimum,
    RANK_MATH_EDITOR_POLICY.title.maximum,
  )
  const expectedCanonical = `${siteOrigin}/page/${encodeURIComponent(testCase.slug)}`
  const canonical = testCase.canonicalMatches
    ? expectedCanonical
    : `https://invalid.example/page/${encodeURIComponent(testCase.slug)}`
  const analysis = analyzeRankMathSeo({
    type: "landing",
    title: testCase.seoTitle,
    seoTitle,
    description: testCase.description,
    focusKeyword: testCase.focusKeyword,
    keywords: testCase.seoKeywords,
    slug: testCase.slug,
    canonical,
    expectedCanonical,
    h1: [testCase.seoTitle],
  })
  const checks = Object.fromEntries(
    Object.keys(statusCodes).map(id => [
      id,
      analysis.checks.find(check => check.id === id)?.status ?? "",
    ]),
  )
  const failureCodes = Object.keys(statusCodes).filter(id => checks[id] !== "pass")
  const firstKeyword = testCase.seoKeywords.split(/[,،;|\r\n]+/u)[0]?.trim() ?? ""
  const focusKeywordFirst = normalizeRankMathKeywordPhrase(firstKeyword)
    === normalizeRankMathKeywordPhrase(testCase.focusKeyword)
  if (!focusKeywordFirst) failureCodes.push("focus-keyword-first")
  if (!testCase.slug && !failureCodes.includes("slug")) failureCodes.push("slug")
  return {
    name: testCase.name,
    seoTitle,
    checks,
    failureCodes: [...new Set(failureCodes)],
    focusKeywordFirst,
    titleLength: [...seoTitle].length,
    descriptionLength: [...testCase.description].length,
    slugValid: Boolean(testCase.slug),
    canonicalMatches: checks.canonical === "pass",
  }
})

assert.deepEqual(
  phpResults.seoResults,
  tsSeoResults,
  "PHP and Node must repair page SEO metadata and return the same gate decisions",
)
const resultByName = new Map(tsSeoResults.map(result => [result.name, result]))
const failuresFor = (name: string) => resultByName.get(name)?.failureCodes as string[]
assert.deepEqual(failuresFor("valid metadata"), [], "valid metadata must pass every contract check")
assert.ok(
  failuresFor("focus keyword exceeds title gate").includes("title-length"),
  `expected a title-length failure, got ${JSON.stringify(failuresFor("focus keyword exceeds title gate"))}`,
)
assert.ok(failuresFor("description too short").includes("description-length"))
assert.ok(failuresFor("description too long").includes("description-length"))
assert.ok(failuresFor("focus keyword missing from description").includes("keyword-description"))
assert.ok(failuresFor("empty slug").includes("slug"))
assert.ok(failuresFor("unexpected canonical").includes("canonical"))
assert.ok(failuresFor("focus keyword is not first").includes("focus-keyword-first"))
console.log(`SEO generation contract parity passed (${selectorCases.length} focus cases, ${seoCases.length} metadata cases).`)
