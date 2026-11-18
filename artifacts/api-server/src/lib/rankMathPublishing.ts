import {
  analyzeRankMathSeo,
  normalizeRankMathCanonical,
  type RankMathInput,
} from "@workspace/seo-rank-math"

export function rankMathPublishingError(input: RankMathInput): string | null {
  const analysis = analyzeRankMathSeo(input)
  if (analysis.publishable) return null
  return `تعذر النشر عبر بوابة Rank Math الداخلية (${analysis.score}/100): ${analysis.blockingIssues.join("، ")}`
}

export function firstRankMathKeyword(value: unknown): string {
  const parts = Array.isArray(value) ? value : String(value ?? "").split(/[,،;\n\r|]+/u)
  return String(parts[0] ?? "").trim()
}

export function resolveRankMathCanonical(value: unknown, expectedCanonical: string): string {
  return normalizeRankMathCanonical(value, expectedCanonical)
}
