export interface SeoPageOverride {
    path: string;
    seoTitle: string;
    description: string;
    focusKeyword: string;
    h1: string;
    content: string;
    sitemapEligible?: boolean;
    updatedAt?: string;
}
export declare const SEO_PAGE_OVERRIDE_SETTING_PREFIX = "seo_page_override:";
export declare function normalizeSeoOverridePath(value: string): string | null;
export declare function sanitizeSeoOverrideText(value: unknown, maxLength?: number): string;
export declare function isSeoPageHtmlIndexable(html: string, routePath: string): boolean;
/**
 * Applies only explicitly editable SEO fields. It preserves the page template,
 * scripts, forms, links, and canonical URL while replacing the first H1 and
 * managing one marked content block after it.
 */
export declare function applySeoPageOverrideToHtml(html: string, override: SeoPageOverride): string;
//# sourceMappingURL=page-overrides.d.ts.map