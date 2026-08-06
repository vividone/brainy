import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

/** Where the API listens in development. `npm run dev:api` starts it there. */
const API_PORT = Number(process.env.API_PORT ?? 3001)

const siteDir = fileURLToPath(new URL('./site', import.meta.url))
const publicDir = fileURLToPath(new URL('./public', import.meta.url))

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}

/**
 * Serve the marketing site and the dashboard during `npm run dev`.
 *
 * Vite's root is the *app*, and `base: '/play/'` means a dev server on its own
 * answers only under `/play/` — so `/`, `/admin` and `/privacy` were simply
 * missing in development, and the only way to see them was a full build. They
 * are plain static files with no build step, so the dev server can hand them
 * straight over.
 *
 * Deliberately mirrors the rewrites in `vercel.json` — `/admin` → `admin.html`,
 * `/privacy` → `privacy.html` — so a link that works locally works deployed.
 * It also mirrors what `scripts/build-site.mjs` does with the brand mark:
 * `/brand.svg` is `public/favicon.svg`, copied at build time so the site and
 * the app share one owl. Without this line the logo is simply absent in
 * development, and Vite answers with its own "base URL is /play/" message,
 * which points at the wrong problem entirely.
 * `analytics.js` is served too, and does nothing in development because its
 * measurement id is only substituted at build time.
 */
function marketingSite(): Plugin {
  return {
    name: 'brainy:marketing-site',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next()

        const url = (req.url ?? '/').split('?')[0]
        /* Everything Vite owns: the app, its module graph, its client. */
        if (url.startsWith('/play') || url.startsWith('/@') || url.startsWith('/src') || url.startsWith('/node_modules')) {
          return next()
        }

        /* The two files the site serves from public/ rather than site/. */
        const fromPublic: Record<string, [string, string]> = {
          '/brand.svg': ['favicon.svg', TYPES['.svg']],
          '/favicon.ico': ['favicon.ico', 'image/x-icon'],
        }
        const mapped = fromPublic[url]
        if (mapped) {
          res.setHeader('Content-Type', mapped[1])
          res.setHeader('Cache-Control', 'no-store')
          res.end(await readFile(path.join(publicDir, mapped[0])))
          return
        }

        const named =
          url === '/' ? 'index.html' : url === '/admin' ? 'admin.html' : url === '/privacy' ? 'privacy.html' : url.slice(1)

        const file = path.join(siteDir, named)
        /* Never serve outside site/, whatever the URL claims. */
        if (!file.startsWith(siteDir)) return next()

        try {
          if (!(await stat(file)).isFile()) return next()
        } catch {
          return next()
        }

        res.setHeader('Content-Type', TYPES[path.extname(file)] ?? 'application/octet-stream')
        res.setHeader('Cache-Control', 'no-store')
        res.end(await readFile(file))
      })

      server.httpServer?.once('listening', () => {
        /* Printed after Vite's own banner, which otherwise only mentions /play/. */
        setTimeout(() => {
          server.config.logger.info(
            `\n  site    /\n  admin   /admin\n  app     /play/\n  api     proxied to http://127.0.0.1:${API_PORT} — run \`npm run dev:api\`\n`,
          )
        }, 100)
      })
    },
  }
}

/*
 * The app is served from /play/ so the marketing site can own the root of
 * brainy.fortbridge.app. Both ship from the same `dist/`.
 */
export default defineConfig({
  base: '/play/',
  build: { outDir: 'dist/play', emptyOutDir: true },
  server: {
    /*
     * The same single-origin arrangement as production, where vercel.json
     * proxies /api to Railway. Keeping it identical in development means the
     * admin session cookie behaves the same and no client code needs to know
     * where the API is.
     */
    proxy: {
      '/api': { target: `http://127.0.0.1:${API_PORT}`, changeOrigin: false },
    },
  },
  plugins: [
    marketingSite(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Brainy — Learn & Play',
        short_name: 'Brainy',
        description: 'Gamified maths, reasoning and science practice for primary school',
        theme_color: '#7c3aed',
        background_color: '#faf5ff',
        display: 'standalone',
        orientation: 'any',
        start_url: '/play/',
        scope: '/play/',
        id: '/play/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
