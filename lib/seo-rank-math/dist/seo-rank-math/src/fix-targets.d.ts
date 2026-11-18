export type RankMathFixEntity = "article" | "landing" | "service" | "package";
export type RankMathFixField = "seoTitle" | "seoDescription" | "seoKeywords" | "targetKeyword" | "title" | "content" | "description";
export interface RankMathFixTarget {
    field: RankMathFixField;
    label: string;
    mode: "text" | "intro" | "expand";
}
/**
 * Safely complete a generated SEO description when it misses the lower limit
 * by only a few characters. Larger or over-limit candidates stay untouched so
 * the model can retry instead of having meaningful copy rewritten or clipped.
 */
export declare function repairShortRankMathDescription(value: string, minimum: number, maximum: number): string;
/**
 * Maps the analyzer's public check IDs to the editable field for each entity.
 * The analyzer may prefix IDs in UI reports; API callers can also send bare IDs.
 */
export declare function getRankMathFixTarget(checkId: string, entity: RankMathFixEntity): RankMathFixTarget | null;
//# sourceMappingURL=fix-targets.d.ts.map