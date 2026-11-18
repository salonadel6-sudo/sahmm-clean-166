export interface ServiceVisibleContentInput {
  title: string
  description?: string
  seoDescription?: string
  companyName?: string
  slug?: string
}

export interface ServiceVisibleContent {
  title: string
  isInsulation: boolean
  summary: string
  bodyDescription: string
  metaDescription: string
  labels: {
    summary: string
    details: string
    trustFacts: string[]
    process: string
    equipment: string
    insulationEquipment: string
    faq: string
    cta: string
    ctaDescription: string
  }
  processSteps: Array<{ title: string; desc: string }>
  equipment: string[]
  faqs: Array<{ q: string; a: string }>
  contentText: string
}

export interface PackageVisibleContentInput {
  name: string
  category?: string
  size?: string
  capacity?: string
  description?: string
  suitableFor?: string
  rentalPeriod?: string
  features?: string | string[]
}

export interface PackageVisibleContent {
  name: string
  categoryLabel: string
  size: string
  capacity: string
  suitableFor: string
  rentalPeriod: string
  description: string
  features: string[]
  labels: Record<string, string>
  contentText: string
}

export function buildServiceVisibleContent(input: ServiceVisibleContentInput): ServiceVisibleContent
export function buildPackageVisibleContent(input: PackageVisibleContentInput): PackageVisibleContent
