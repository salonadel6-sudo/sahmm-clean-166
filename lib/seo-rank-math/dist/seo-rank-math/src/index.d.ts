export { isRankMathKeywordPresentInPath } from "./path-matching";
export { getRankMathFixTarget, repairShortRankMathDescription } from "./fix-targets";
export type { RankMathFixEntity, RankMathFixField, RankMathFixTarget } from "./fix-targets";
export { applySeoPageOverrideToHtml, normalizeSeoOverridePath, isSeoPageHtmlIndexable, sanitizeSeoOverrideText, SEO_PAGE_OVERRIDE_SETTING_PREFIX, } from "./page-overrides";
export type { SeoPageOverride } from "./page-overrides";
export { buildPackageVisibleContent, buildServiceVisibleContent } from "./service-content.mjs";
export type { PackageVisibleContent, PackageVisibleContentInput, ServiceVisibleContent, ServiceVisibleContentInput, } from "./service-content.mjs";
export type RankMathEntityType = "homepage" | "service" | "package" | "article" | "landing" | "area" | "static";
export type RankMathStatus = "pass" | "warning" | "fail" | "unknown";
export interface RankMathInput {
    type: RankMathEntityType;
    title: string;
    seoTitle?: string;
    description: string;
    focusKeyword?: string;
    targetKeyword?: string;
    keywords?: string | string[];
    slug?: string;
    canonical?: string;
    expectedCanonical?: string;
    content?: string;
    h1?: string[];
    internalLinks?: number;
    images?: Array<{
        alt?: string;
    }>;
    jsonLdValid?: boolean;
}
export interface RankMathArticleFields {
    title?: string | null;
    slug?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoKeywords?: string | string[] | null;
    seoSlug?: string | null;
    canonicalUrl?: string | null;
    content?: string | null;
}
export interface RankMathSeoPageFields {
    title?: string | null;
    slug?: string | null;
    seoSlug?: string | null;
    targetKeyword?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoKeywords?: string | string[] | null;
    canonicalUrl?: string | null;
    content?: string | null;
}
export interface RankMathCheck {
    id: string;
    label: string;
    status: RankMathStatus;
    weight: number;
    earned: number;
    possible: number;
    detail: string;
    recommendation?: string;
    blocking?: boolean;
}
export interface RankMathAnalysis {
    engine: string;
    version: number;
    type: RankMathEntityType;
    score: number;
    minimumPublishScore: number;
    publishable: boolean;
    wordCount: number;
    focusKeyword: string;
    blockingIssues: string[];
    checks: RankMathCheck[];
}
export declare const RANK_MATH_EDITOR_POLICY: Readonly<{
    minimumPublishScore: number;
    title: Readonly<{
        minimum: number;
        targetMinimum: number;
        maximum: number;
        hardMaximum: number;
    }>;
    description: Readonly<{
        minimum: number;
        maximum: number;
        hardMaximum: number;
    }>;
    minimumWords: Readonly<{
        homepage: number;
        service: number;
        package: number;
        article: number;
        landing: number;
        area: number;
        static: number;
    }>;
}>;
export declare function buildRankMathAiGuidance(type: RankMathEntityType): string;
export declare function normalizeRankMathKeywordPhrase(value: string): string;
/**
 * Select a measured keyword that is actually related to the requested blog
 * topic. A supplied phrase must match the measured list; otherwise at least
 * two non-generic topic words must overlap one candidate.
 */
export declare function selectMeasuredFocusKeyword(topic: string, candidates: readonly string[], requestedFocus?: string): string | null;
export declare function putRankMathFocusKeywordFirst(terms: readonly string[], focusKeyword: string): string[];
/**
 * Keep generated SEO titles within the project limit and put the exact focus
 * phrase first when an AI response misses either check.
 */
export declare function repairRankMathSeoTitleCandidate(value: string, focusKeyword: string, minimum?: number, maximum?: number): string;
export declare function isRankMathProjectSearchPhrase(value: string): boolean;
export interface RankMathSiteKeywordPage {
    url: string;
    kind?: string;
    title?: string;
    description?: string;
    focusKeyword?: string;
    h1?: string[];
    contentText?: string;
}
export interface RankMathSiteKeywordStrength {
    term: string;
    strength: number;
    occurrences: number;
    usagePercent: number;
    pageCount: number;
    articleCount: number;
    focusPageCount: number;
    samplePages: Array<{
        url: string;
        title: string;
        occurrences: number;
    }>;
}
export declare function countRankMathPhraseOccurrences(text: string, phrase: string): number;
export declare function analyzeRankMathSiteKeywordStrength(terms: string[], pages: RankMathSiteKeywordPage[]): RankMathSiteKeywordStrength[];
export declare function getRankMathFocusKeyword(input: Pick<RankMathInput, "focusKeyword" | "targetKeyword" | "keywords">): string;
/**
 * Builds the exact Rank Math input used for a blog post in the editor.
 * Audits should use this adapter for saved posts instead of reconstructing
 * metadata from the rendered page title and site chrome.
 */
export declare function buildBlogPostRankMathInput(post: RankMathArticleFields): RankMathInput;
export declare function buildSeoPageRankMathInput(page: RankMathSeoPageFields): RankMathInput;
export declare function evaluateSeoPageIndexability(input: {
    title?: string;
    targetKeyword?: string;
    seoTitle?: string;
    content?: string;
    slug?: string;
    canonical?: string;
    expectedCanonical?: string;
}): {
    indexable: boolean;
    reason: string;
    contentChars: number;
};
export declare function analyzeRankMathSeo(input: RankMathInput): RankMathAnalysis;
export declare function isValidRankMathCanonical(value: string, expected?: string): boolean;
export declare function normalizeRankMathCanonical(value: unknown, expectedCanonical: string): string;
//# sourceMappingURL=index.d.ts.map