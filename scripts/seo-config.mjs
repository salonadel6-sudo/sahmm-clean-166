import { resolveBuildSiteOrigin } from "./site-origin.mjs";

// SEO artifacts use the origin of the environment that produced the build.
// PHP and Node hosting packages rebind this value to the actual request host.
export const BUILD_SITE_ORIGIN = resolveBuildSiteOrigin();
