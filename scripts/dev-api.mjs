/**
 * The API, for local development.
 *
 * `npm run dev` serves the site and the app and proxies `/api` here, so the two
 * together give you the whole product on one origin — the same arrangement as
 * production, where vercel.json proxies to Railway.
 *
 * This exists rather than a plain `PORT=3001 node server/index.js` because that
 * syntax is not portable: it fails on Windows PowerShell, which is where this
 * project is developed. Setting the variable in JavaScript works everywhere.
 *
 * It reads `.env` if you have one — a convenience for development only. Nothing
 * in `server/` loads it, because on Railway the environment *is* the
 * configuration and a file quietly overriding it would be a way to deploy the
 * wrong database.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')

/** Minimal KEY=value reader. Not a dotenv replacement, and not used in production. */
async function loadEnvFile() {
  let text
  try {
    text = await readFile(path.join(root, '.env'), 'utf8')
  } catch {
    return 0
  }
  let loaded = 0
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line)
    if (!match) continue
    const [, key, rawValue] = match
    /* Real values win: an exported variable is more deliberate than a file. */
    if (process.env[key] !== undefined) continue
    process.env[key] = rawValue.trim().replace(/^["'](.*)["']$/, '$1')
    loaded += 1
  }
  return loaded
}

const loaded = await loadEnvFile()
process.env.PORT = process.env.API_PORT ?? process.env.PORT ?? '3001'
process.env.HOST ??= '127.0.0.1'
process.env.LOG_LEVEL ??= 'info'

/*
 * A session secret so the admin dashboard works locally without ceremony. It is
 * a development default, printed as such — the server refuses to start without
 * one, and that check is what stops this being a production footgun.
 */
if (!process.env.ADMIN_SESSION_SECRET) {
  process.env.ADMIN_SESSION_SECRET = 'development-only-session-secret-not-for-deployment'
  console.log('· using a development ADMIN_SESSION_SECRET')
}
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  process.env.ADMIN_EMAIL ??= 'admin@localhost'
  process.env.ADMIN_PASSWORD ??= 'development-password'
  console.log(`· /admin signs in as ${process.env.ADMIN_EMAIL} / ${process.env.ADMIN_PASSWORD}`)
}

console.log(
  loaded > 0
    ? `· loaded ${loaded} variable(s) from .env`
    : '· no .env found — copy .env.example if you want email, payments or a real database',
)
if (!process.env.DATABASE_URL) {
  console.log('· DATABASE_URL is not set: sign-in, licences and the dashboard will answer 503')
}

/*
 * Call `start()` rather than relying on the import.
 *
 * `server/index.js` only listens when it is the process entry point, so the smoke
 * tests can import `build()` without a server appearing. Importing it from here
 * therefore does nothing at all — the script printed its banner and exited with a
 * clean zero, which is a confusing way to fail.
 */
const { start } = await import('../server/index.js')
await start()
