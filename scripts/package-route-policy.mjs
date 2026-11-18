/**
 * Canonical package paths and explicit legacy path redirects shared by the
 * sitemap, prerenderer, Hostinger build, and standalone Node archive.
 */
export const LEGACY_PACKAGE_ROUTE_SLUGS = Object.freeze({
  1: "tanzeef-shaqaq",
  2: "تنظيف-فلل-بالرياض",
  3: "tanzeef-qosoor",
  4: "tanzeef-qabl-alnaql",
  5: "gaseel-majalis-bukhar",
  6: "jaly-rakham",
  7: "tanzeef-khazanat",
  8: "gaseel-mokeyafat",
  9: "mokafahat-hasharat",
  10: "تنظيف-بعد-التشطيب-بالرياض",
  11: "تنظيف-واجهات-مباني-بالرياض",
  12: "tanzeef-masajid",
  13: "shahadat-salama",
  14: "تركيب-أنظمة-حريق-بالرياض",
  15: "taqreer-fanni-fawri",
  16: "taqreer-fanni-ghayr-fawri",
  17: "aqd-siyana-difaa-madani",
});

export const LEGACY_PACKAGE_ROUTE_REDIRECTS = Object.freeze([
  {
    packageId: 10,
    fromPath: "/cleaning-packages/tanzeef-bad-albenaa",
    toPath: "/cleaning-packages/تنظيف-بعد-التشطيب-بالرياض",
  },
  {
    packageId: 11,
    fromPath: "/cleaning-packages/tanzeef-wajahat",
    toPath: "/cleaning-packages/تنظيف-واجهات-مباني-بالرياض",
  },
  {
    packageId: 14,
    fromPath: "/cleaning-packages/tarkeeb-anthimat-wiqaya",
    toPath: "/cleaning-packages/تركيب-أنظمة-حريق-بالرياض",
  },
  {
    packageId: 2,
    fromPath: "/cleaning-packages/tanzeef-filal",
    toPath: "/cleaning-packages/تنظيف-فلل-بالرياض",
  },
  {
    packageId: 2,
    fromPath: "/cleaning-packages/شركة-تنظيف-فلل-شامل",
    toPath: "/cleaning-packages/تنظيف-فلل-بالرياض",
  },
]);

export const CONTACT_CANONICAL_PATH = "/contact/شركة-تنظيف-بالرياض";
export const FAQ_CANONICAL_PATH = "/faq/تنظيف-المنازل-بالرياض";

export const LEGACY_STATIC_ROUTE_REDIRECTS = Object.freeze([
  { fromPath: "/contact", toPath: CONTACT_CANONICAL_PATH },
  { fromPath: "/faq", toPath: FAQ_CANONICAL_PATH },
]);
