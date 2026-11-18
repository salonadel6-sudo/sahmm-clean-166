import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// Keep every file referenced by api/index.php and its local SEO helpers in
// code-only patches. Missing one of these files can fatal before any API route
// is reached, making login, settings, packages, and image-backed pages fail
// together.
export const HOSTINGER_API_RUNTIME_FILES = [
  { name: "site-origin-runtime.php", source: "scripts/site-origin-runtime.php" },
  { name: "static-canonical-rewrite.php", source: "scripts/static-canonical-rewrite.php" },
  { name: "seo-page-policy.php", source: "scripts/seo-page-policy.php" },
  { name: "seo-fix-retry.php", source: "scripts/seo-fix-retry.php" },
  { name: "seo-page-overrides.php", source: "scripts/seo-page-overrides.php" },
  { name: "container-system.php", source: "scripts/container-system.php" },
  { name: "seo-page-policy.json", source: "lib/seo-page-policy.json" },
  { name: "seo-service-page-content.json", source: "lib/seo-service-page-content.json" },
  { name: "seo-package-page-content.json", source: "lib/seo-package-page-content.json" },
];

function copyRuntimeFiles(entries, resolveSource, destinationApiDirectory) {
  mkdirSync(destinationApiDirectory, { recursive: true });

  for (const entry of entries) {
    const sourcePath = resolveSource(entry);
    if (!existsSync(sourcePath)) {
      throw new Error(`Missing required Hostinger API runtime file: ${sourcePath}`);
    }
    copyFileSync(sourcePath, join(destinationApiDirectory, entry.name));
  }

  return entries.map(({ name }) => name);
}

export function copyHostingerApiRuntimeFromSource(projectRoot, destinationApiDirectory) {
  return copyRuntimeFiles(
    HOSTINGER_API_RUNTIME_FILES,
    ({ source }) => join(projectRoot, source),
    destinationApiDirectory,
  );
}

export function copyHostingerApiRuntimeFromBuild(sourceApiDirectory, destinationApiDirectory) {
  return copyRuntimeFiles(
    HOSTINGER_API_RUNTIME_FILES,
    ({ name }) => join(sourceApiDirectory, name),
    destinationApiDirectory,
  );
}
