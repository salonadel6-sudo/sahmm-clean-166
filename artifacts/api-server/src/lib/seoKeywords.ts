const MAX_SEO_KEYWORDS = 8;
const MAX_EDITORIAL_TAGS = 5;
const BRAND_KEYWORD_PATTERN = /(?:^|[\s|،])(?:(?:مؤسسة|شركة)\s+)?(?:السهم\s+كلين|سبائك\s+الماسة)(?=$|[\s|،])/u;

function asStrings(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string") return [];

  const source = value.trim();
  if (!source) return [];

  if (source.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(source);
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string");
    } catch {
      // Treat malformed JSON as a delimited keyword string below.
    }
  }

  return source.split(/[,،;؛|\n\r]+/);
}

function cleanUnique(values: string[], limit: number): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const raw of values) {
    const value = raw.replace(/\s+/g, " ").trim().replace(/^[,،;؛|]+|[,،;؛|]+$/g, "");
    if (!value) continue;
    const key = value
      .normalize("NFKC")
      .replace(/[\u064B-\u065F\u0670]/gu, "")
      .toLocaleLowerCase("ar");
    if (BRAND_KEYWORD_PATTERN.test(key) || key.includes("منصة باقات التنظيف")) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= limit) break;
  }

  return result;
}

/**
 * Store one primary query first, followed by up to seven distinct supporting
 * phrases. Keep one Arabic-comma format across every content type.
 */
export function normalizeSeoKeywords(value: unknown, primaryKeyword = ""): string {
  const keywords = cleanUnique(
    [primaryKeyword, ...asStrings(value)],
    MAX_SEO_KEYWORDS,
  );
  return keywords.join("، ");
}

/**
 * Editorial tags remain an array in storage. Put the primary topic first and
 * keep at most five distinct tags so the public tag display is predictable.
 */
export function normalizeSeoTags(value: unknown, primaryKeyword = ""): string {
  return JSON.stringify(cleanUnique(
    [primaryKeyword, ...asStrings(value)],
    MAX_EDITORIAL_TAGS,
  ));
}
