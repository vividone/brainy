/**
 * Serves `dist/` exactly as a static host would, so the marketing site at `/`
 * and the app at `/play/` can be checked together before deploying.
 *
 * `vite preview` cannot do this: it applies the app's `/play/` base to the
 * whole server and redirects the root away from the landing page.
 *
 * It also applies the response headers from `vercel.json` — including the
 * Content-Security-Policy. Without that, a policy that blocks the app is
 * something you discover in production: locally everything works, because
 * locally nothing is enforcing it. Reading the real file rather than a copy means
 * the two cannot drift.
 */

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'dist')
const port = Number(process.argv[2] ?? 4200)

/**
 * Turn `vercel.json`'s header rules into matchers.
 *
 * Vercel's `source` is a path pattern; the handful of forms actually used here
 * are an exact path or one ending in `(.*)`. Anything more exotic would need a
 * real path-to-regexp, and the moment that is true this should use one.
 */
async function headerRules() {
  const config = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'))
  return (config.headers ?? []).map((rule) => ({
    test: new RegExp(`^${rule.source.replace(/\(\.\*\)/g, '.*')}$`),
    headers: rule.headers,
  }))
}

const rules = await headerRules()

function applyHeaders(res, url) {
  for (const rule of rules) {
    if (!rule.test.test(url)) continue
    for (const { key, value } of rule.headers) res.setHeader(key, value)
  }
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}

const send = (res, status, body, type = 'text/plain; charset=utf-8') => {
  res.writeHead(status, { 'Content-Type': type })
  res.end(body)
}

createServer(async (req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0])
  let file = path.join(dist, url)

  /* Before the body, and before any early return, so a 404 is covered too. */
  applyHeaders(res, url)

  try {
    if ((await stat(file).catch(() => null))?.isDirectory()) file = path.join(file, 'index.html')
    else if (!path.extname(file)) {
      // Bare path: try .html, then fall back to the app shell under /play.
      const asHtml = `${file}.html`
      if (await stat(asHtml).catch(() => null)) file = asHtml
      else if (url.startsWith('/play')) file = path.join(dist, 'play', 'index.html')
    }
    const body = await readFile(file)
    send(res, 200, body, TYPES[path.extname(file)] ?? 'application/octet-stream')
  } catch {
    send(res, 404, 'Not found')
  }
}).listen(port, () => console.log(`dist/ served at http://localhost:${port}/`))
