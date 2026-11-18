import path from 'path';
import { existsSync, readFileSync } from 'fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { resolveBuildSiteOrigin } from '../../scripts/site-origin.mjs';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT || '19770';
const port = Number(rawPort) || 19770;
const rawApiPort = process.env.API_PORT || '8080';
const apiPort = Number(rawApiPort) || 8080;
const basePath = process.env.BASE_PATH || '/';
const buildSiteOrigin = resolveBuildSiteOrigin({
  ...process.env,
  VITE_PORT: String(port),
});
process.env.VITE_PUBLIC_SITE_URL = buildSiteOrigin;
const publicDirectory = path.resolve(import.meta.dirname, 'public');

function originForRequest(req: any): string | null {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const forwardedProtocol = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  const protocol = forwardedProtocol === 'http' || forwardedProtocol === 'https'
    ? forwardedProtocol
    : req.socket?.encrypted ? 'https' : 'http';
  if (!host) return null;
  try {
    const url = new URL(`${protocol}://${host}`);
    if (
      !['http:', 'https:'].includes(url.protocol)
      || url.username
      || url.password
      || !['', '/'].includes(url.pathname)
      || url.search
      || url.hash
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function originAwareHtml() {
  const sourceIndex = path.resolve(import.meta.dirname, 'index.html');
  const previewRoot = path.resolve(import.meta.dirname, 'dist/public');
  const isHtmlRequest = (req: any, pathname: string) => {
    if (!['GET', 'HEAD'].includes(String(req.method).toUpperCase())) return false;
    if (pathname === '/api' || pathname.startsWith('/api/')) return false;
    const extension = path.posix.extname(pathname);
    if (extension && extension !== '.html') return false;
    return pathname === '/'
      || pathname.endsWith('.html')
      || String(req.headers.accept || '').includes('text/html');
  };
  const requestPath = (req: any) => {
    try {
      return decodeURIComponent(new URL(req.url || '/', 'http://vite.local').pathname);
    } catch {
      return null;
    }
  };
  const sendHtml = (req: any, res: any, content: string, origin: string) => {
    const body = content
      .replaceAll('__CLEANFLOW_SITE_ORIGIN__', origin)
      .replaceAll(buildSiteOrigin, origin);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (String(req.method).toUpperCase() === 'HEAD') return res.end();
    return res.end(body);
  };

  return {
    name: 'cleanflow-runtime-html-origin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const pathname = requestPath(req);
        if (!pathname || !isHtmlRequest(req, pathname)) return next();
        const requestOrigin = originForRequest(req);
        if (!requestOrigin) {
          res.statusCode = 400;
          return res.end('Unable to resolve the current site origin');
        }
        try {
          const source = readFileSync(sourceIndex, 'utf8');
          const transformed = await server.transformIndexHtml(req.url || '/', source);
          return sendHtml(req, res, transformed, requestOrigin);
        } catch (error) {
          return next(error);
        }
      });
    },
    configurePreviewServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const pathname = requestPath(req);
        if (!pathname || !isHtmlRequest(req, pathname)) return next();
        const requestOrigin = originForRequest(req);
        if (!requestOrigin) {
          res.statusCode = 400;
          return res.end('Unable to resolve the current site origin');
        }
        const relativePath = pathname === '/'
          ? 'index.html'
          : pathname.endsWith('.html')
            ? pathname.replace(/^\/+/u, '')
            : path.posix.join(pathname.replace(/^\/+/u, ''), 'index.html');
        const candidate = path.resolve(previewRoot, relativePath);
        if (candidate !== previewRoot && !candidate.startsWith(`${previewRoot}${path.sep}`)) {
          res.statusCode = 400;
          return res.end('Invalid URL path');
        }
        const filePath = existsSync(candidate)
          ? candidate
          : path.join(previewRoot, 'index.html');
        try {
          return sendHtml(req, res, readFileSync(filePath, 'utf8'), requestOrigin);
        } catch (error) {
          return next(error);
        }
      });
    },
  };
}

function originAwarePublicFiles() {
  const middleware = (req: any, res: any, next: any) => {
    const pathname = String(req.url || '/').split('?', 1)[0];
    const filename = pathname.split('/').filter(Boolean).at(-1) || '';
    if (!/^(?:robots\.txt|sitemap(?:[1-9]\d*)?\.xml|llms\.txt)$/iu.test(filename)) return next();

    const filePath = path.join(publicDirectory, filename);
    let content: string;
    try {
      content = readFileSync(filePath, 'utf8');
    } catch {
      return next();
    }
    const requestOrigin = originForRequest(req);
    if (requestOrigin) {
      content = content
        .replaceAll('__CLEANFLOW_SITE_ORIGIN__', requestOrigin)
        .replaceAll(buildSiteOrigin, requestOrigin);
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', filename.endsWith('.xml')
      ? 'application/xml; charset=utf-8'
      : 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    if (String(req.method).toUpperCase() === 'HEAD') return res.end();
    res.end(content);
  };

  return {
    name: 'cleanflow-runtime-site-origin',
    configureServer(server: any) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server: any) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    originAwareHtml(),
    originAwarePublicFiles(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@workspace/api-client-react': path.resolve(import.meta.dirname, '../../lib/api-client-react/src'),
      '@workspace/api-zod': path.resolve(import.meta.dirname, '../../lib/api-zod/src'),
      '@workspace/db': path.resolve(import.meta.dirname, '../../lib/db/src'),
      '@workspace/seo-rank-math': path.resolve(import.meta.dirname, '../../lib/seo-rank-math/src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // خرائط Leaflet — كبيرة ومستقلة
          if (id.includes('leaflet')) return 'vendor-leaflet';
          // الرسوم البيانية
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('d3/')) return 'vendor-charts';
          // الحركة
          if (id.includes('framer-motion')) return 'vendor-motion';
          // محرر النصوص TipTap
          if (id.includes('@tiptap')) return 'vendor-editor';
          // مكونات Radix UI
          if (id.includes('@radix-ui')) return 'vendor-radix';
          // React core
          if (id.includes('react-dom') || id.includes('react/') || id.includes('scheduler')) return 'vendor-react';
          // مكتبات نماذج وتحقق
          if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) return 'vendor-forms';
          // الأيقونات
          if (id.includes('lucide-react')) return 'vendor-icons';
          // مكتبات التاريخ والمساعدة
          if (id.includes('date-fns') || id.includes('clsx') || id.includes('class-variance') || id.includes('tailwind-merge')) return 'vendor-utils';
        }
      }
    }
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${apiPort}`,
      },
    },
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${apiPort}`,
      },
    },
  },
});
