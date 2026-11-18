import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";
import { requireAdmin, requireNonDriver } from "./middleware/adminAuth";
import { getSiteOrigin, isAllowedSiteOrigin } from "./lib/siteOrigin";

const app: Express = express();
// The deployed app runs behind a reverse proxy. Trust its hop so rate limiting
// and request IP detection use the forwarded client address without warnings.
app.set("trust proxy", 1);

// ── Security headers ──────────────────────────────────────────────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // The public chat can explicitly request a location and open the device
  // camera through the browser's file picker. Keep microphone disabled.
  res.setHeader("Permissions-Policy", "geolocation=(self), camera=(self), microphone=()");
  next();
});

// ── CORS — same-origin by default; explicit origins may be configured ────────
const sameOriginCors = cors({ origin: true, credentials: true });
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.get("Origin");
  if (!origin) return next(); // non-browser clients do not need CORS headers

  if (!isAllowedSiteOrigin(req)) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  return sameOriginCors(req, res, next);
});

// ── Request parsing ───────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use("/api/admin/seo-audit/latest", express.json({ limit: "6mb" }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/login", loginLimiter);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// ── Serve uploaded files ──────────────────────────────────────────────────────
const uploadHeaders = (res: Response) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", "inline");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
};
app.use("/api/uploads", express.static(path.join(process.cwd(), "uploads"), { dotfiles: "deny", fallthrough: true, setHeaders: uploadHeaders }));
app.use("/api/uploads", express.static(path.join(process.cwd(), "artifacts/api-server/uploads"), { dotfiles: "deny", fallthrough: true, setHeaders: uploadHeaders }));
app.use("/api/uploads", express.static(path.join(process.cwd(), "build_php/uploads"), { dotfiles: "deny", fallthrough: true, setHeaders: uploadHeaders }));
app.use("/api/uploads", express.static(path.join(process.cwd(), "attached_assets"), { dotfiles: "deny", fallthrough: true, setHeaders: uploadHeaders }));

// ── Admin routes — require valid token globally ───────────────────────────────
app.use("/api/admin", requireAdmin, requireNonDriver);

// ── All routes ────────────────────────────────────────────────────────────────
app.use("/api", router);

// Redirect previously published SEO-page URLs before the SPA fallback. The
// deployable Node archive supplies this list from the same policy as .htaccess.
const seoRedirectConfig = process.env.CLEANFLOW_SEO_PAGE_REDIRECTS?.trim();
const seoRedirectTargets = new Map<string, string>();
if (seoRedirectConfig) {
  let redirects: unknown;
  try {
    redirects = JSON.parse(seoRedirectConfig);
  } catch (error) {
    throw new Error("CLEANFLOW_SEO_PAGE_REDIRECTS must be valid JSON.", { cause: error });
  }
  if (!Array.isArray(redirects)) {
    throw new Error("CLEANFLOW_SEO_PAGE_REDIRECTS must be a JSON array.");
  }
  for (const redirect of redirects) {
    if (!redirect || typeof redirect !== "object") {
      throw new Error("CLEANFLOW_SEO_PAGE_REDIRECTS contains an invalid entry.");
    }
    const { fromSlug, toPath, retireSource } = redirect as {
      fromSlug?: unknown;
      toPath?: unknown;
      retireSource?: unknown;
    };
    if (
      typeof fromSlug !== "string" ||
      !fromSlug ||
      /[/?#]/u.test(fromSlug) ||
      typeof toPath !== "string" ||
      !toPath.startsWith("/") ||
      toPath.startsWith("//")
    ) {
      throw new Error("CLEANFLOW_SEO_PAGE_REDIRECTS contains an unsafe route.");
    }
    seoRedirectTargets.set(`/page/${fromSlug}`, toPath);
    if (retireSource === false) {
      for (const pathPrefix of ["", "/pages", "/صفحة", "/صفحات"]) {
        seoRedirectTargets.set(`${pathPrefix}/${fromSlug}`.replace(/^\/\//u, "/"), toPath);
      }
    }
  }
}
const legacyPathRedirectConfig = process.env.CLEANFLOW_LEGACY_PATH_REDIRECTS?.trim();
if (legacyPathRedirectConfig) {
  let redirects: unknown;
  try {
    redirects = JSON.parse(legacyPathRedirectConfig);
  } catch (error) {
    throw new Error("CLEANFLOW_LEGACY_PATH_REDIRECTS must be valid JSON.", { cause: error });
  }
  if (!Array.isArray(redirects)) {
    throw new Error("CLEANFLOW_LEGACY_PATH_REDIRECTS must be a JSON array.");
  }
  for (const redirect of redirects) {
    if (!redirect || typeof redirect !== "object") {
      throw new Error("CLEANFLOW_LEGACY_PATH_REDIRECTS contains an invalid entry.");
    }
    const { fromPath, toPath } = redirect as { fromPath?: unknown; toPath?: unknown };
    if (
      typeof fromPath !== "string" ||
      !fromPath.startsWith("/") ||
      fromPath.startsWith("//") ||
      /[?#]/u.test(fromPath) ||
      typeof toPath !== "string" ||
      !toPath.startsWith("/") ||
      toPath.startsWith("//") ||
      /[?#]/u.test(toPath)
    ) {
      throw new Error("CLEANFLOW_LEGACY_PATH_REDIRECTS contains an unsafe route.");
    }
    seoRedirectTargets.set(fromPath, toPath);
  }
}
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  let normalizedPath: string;
  try {
    normalizedPath = decodeURIComponent(req.path).replace(/\/+$/u, "") || "/";
  } catch {
    return next();
  }
  const target = seoRedirectTargets.get(normalizedPath);
  return target ? res.redirect(301, target) : next();
});

// ── Serve frontend SPA ────────────────────────────────────────────────────────
// A Node host package can provide an explicit frontend directory at its root.
// This avoids relying on a deep extracted path when Hostinger switches versions.
const configuredFrontendDistPath = process.env.CLEANFLOW_FRONTEND_DIST_DIR?.trim();
const resolvedConfiguredFrontendDistPath = configuredFrontendDistPath
  ? path.resolve(configuredFrontendDistPath)
  : undefined;
if (
  resolvedConfiguredFrontendDistPath &&
  !fs.existsSync(path.join(resolvedConfiguredFrontendDistPath, "index.html"))
) {
  throw new Error(
    `Configured frontend directory is missing index.html: ${resolvedConfiguredFrontendDistPath}`,
  );
}

// The workflow may start this package with either the workspace root or the
// package directory as cwd. Keep the bundled-server and cwd paths as local-dev
// fallbacks when an explicit Node-host path is not configured.
const frontendDistCandidates = [
  ...(resolvedConfiguredFrontendDistPath ? [resolvedConfiguredFrontendDistPath] : []),
  path.resolve(__dirname, "../../../artifacts/sabaik-almasa/dist/public"),
  path.resolve(process.cwd(), "artifacts/sabaik-almasa/dist/public"),
];
const frontendDistPath =
  frontendDistCandidates.find((candidate) => fs.existsSync(path.join(candidate, "index.html"))) ??
  frontendDistCandidates[0];
const hasFrontendDist = fs.existsSync(path.join(frontendDistPath, "index.html"));

// The API can run independently during local development while Vite serves
// the frontend. Only register the SPA fallback when a built frontend exists;
// otherwise a request to the API root must not trigger an ENOENT error.
if (hasFrontendDist) {
  const siteTextFiles = /^(?:robots\.txt|sitemap(?:[1-9]\d*)?\.xml|llms\.txt)$/iu;
  const rebaseSiteContent = (content: string, requestOrigin: string) => {
    let result = content.replaceAll("__CLEANFLOW_SITE_ORIGIN__", requestOrigin);
    for (const sourceOrigin of new Set([
      process.env.CLEANFLOW_SITE_ORIGIN,
      process.env.VITE_PUBLIC_SITE_URL,
    ].filter((value): value is string => Boolean(value?.trim())))) {
      try {
        const normalizedSource = new URL(sourceOrigin).origin;
        result = result.replaceAll(normalizedSource, requestOrigin);
      } catch {
        // Ignore malformed build metadata; the runtime host still fills tokens.
      }
    }
    return result;
  };

  const safeFrontendPath = (relativePath: string) => {
    const candidate = path.resolve(frontendDistPath, relativePath);
    return candidate.startsWith(`${frontendDistPath}${path.sep}`) || candidate === frontendDistPath
      ? candidate
      : null;
  };

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (!["GET", "HEAD"].includes(req.method) || req.path.startsWith("/api")) return next();
    const filename = path.posix.basename(req.path);
    const isSiteTextFile = siteTextFiles.test(filename);
    const isHtmlRequest = req.path === "/"
      || req.path.endsWith(".html")
      || req.accepts("html") !== false;

    if (!isSiteTextFile && !isHtmlRequest) return next();

    const candidates: string[] = [];
    if (isSiteTextFile) {
      candidates.push(path.join(frontendDistPath, filename));
    } else {
      let decodedPath: string;
      try {
        decodedPath = decodeURIComponent(req.path);
      } catch {
        return res.status(400).send("Invalid URL path");
      }
      if (decodedPath.includes("\\") || decodedPath.split("/").some(part => part === "." || part === "..")) {
        return res.status(400).send("Invalid URL path");
      }
      const relativePath = decodedPath.replace(/^\/+/u, "");
      if (relativePath.endsWith(".html")) {
        const target = safeFrontendPath(relativePath);
        if (target) candidates.push(target);
      } else if (relativePath) {
        const target = safeFrontendPath(path.join(relativePath, "index.html"));
        if (target) candidates.push(target);
      }
      candidates.push(path.join(frontendDistPath, "index.html"));
    }

    const existingFile = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!existingFile) return next();

    try {
      const origin = await getSiteOrigin(req);
      const content = rebaseSiteContent(fs.readFileSync(existingFile, "utf8"), origin);
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("X-Content-Type-Options", "nosniff");
      if (isSiteTextFile) {
        res.type(filename.endsWith(".xml") ? "application/xml" : "text/plain");
      } else {
        res.type("html");
        res.setHeader("X-Robots-Tag", "index, follow");
      }
      if (req.method === "HEAD") return res.status(200).end();
      return res.status(200).send(content);
    } catch (error) {
      logger.error({ error }, "Could not render a host-aware static response");
      return res.status(500).send("Unable to resolve the current site origin");
    }
  });

  app.use(express.static(frontendDistPath));
  app.use((req: Request, res: Response, next: NextFunction) => {
    next();
  });
}

export default app;
