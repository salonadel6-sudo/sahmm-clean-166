export type ContentServiceFamily =
  | "cleaning"
  | "pest-control"
  | "pool"
  | "safety"
  | "insulation"
  | "other"

export function resolveContentServiceFamily(
  ...values: Array<string | null | undefined>
): ContentServiceFamily

export function getContentServiceFamilyLabel(
  family: ContentServiceFamily,
): string
