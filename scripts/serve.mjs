/**
 * Serves `dist/` exactly as a static host would, so the marketing site at `/`
 * and the app at `/app/` can be checked together before deploying.
 *
 * `vite preview` cannot do this: it applies the app's `/app/` base to the
 * whole server and redirects the root away from the landing page.
 */

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const dist = path.resolve(import.meta.dirname, '..', 'dist')
const port = Number(process.argv[2] ?? 4200)

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

  try {
    if ((await stat(file).catch(() => null))?.isDirectory()) file = path.join(file, 'index.html')
    else if (!path.extname(file)) {
      // Bare path: try .html, then fall back to the app shell under /app.
      const asHtml = `${file}.html`
      if (await stat(asHtml).catch(() => null)) file = asHtml
      else if (url.startsWith('/app')) file = path.join(dist, 'app', 'index.html')
    }
    const body = await readFile(file)
    send(res, 200, body, TYPES[path.extname(file)] ?? 'application/octet-stream')
  } catch {
    send(res, 404, 'Not found')
  }
}).listen(port, () => console.log(`dist/ served at http://localhost:${port}/`))
