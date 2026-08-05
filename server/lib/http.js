/**
 * The dull half of every route: reading a body, clipping a field, replying.
 *
 * Pulled out because five routes were about to grow their own copy of the
 * same 16-line JSON reader, and the one that mattered — the webhook's raw
 * body — needs to behave differently in a way that is easy to get wrong.
 */

import crypto from 'node:crypto'

export const clip = (value, max) => (typeof value === 'string' ? value.slice(0, max).trim() : null)

export const num = (value, max, fallback = 0) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.min(Math.round(n), max))
}

/**
 * Read the body as raw bytes.
 *
 * Signature verification needs the exact bytes: once a framework has parsed the
 * body the stream is spent, and a re-serialised object is not guaranteed to be
 * byte-identical to what was signed. `server/index.js` therefore keeps the buffer
 * on `req.rawBody`, which is the first branch below and the one that runs in
 * production.
 *
 * The remaining branches are for callers that pass a plain stream — the handler
 * smoke test does — and the last one re-serialises as a final resort. That
 * fallback is why the Paystack webhook *also* re-verifies the transaction against
 * Paystack's API before granting anything: see server/routes/pay/webhook.js.
 */
export async function readRaw(req, limit = 64 * 1024) {
  if (req.rawBody) return Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(String(req.rawBody))

  if (!req.readableEnded && typeof req[Symbol.asyncIterator] === 'function') {
    const chunks = []
    let size = 0
    for await (const chunk of req) {
      size += chunk.length
      if (size > limit) throw new Error('too large')
      chunks.push(chunk)
    }
    if (chunks.length > 0) return Buffer.concat(chunks)
  }

  if (req.body && typeof req.body === 'object') return Buffer.from(JSON.stringify(req.body))
  if (typeof req.body === 'string') return Buffer.from(req.body)
  return Buffer.alloc(0)
}

/** Parse a JSON body, whether the platform pre-parsed it or not. */
export async function readJson(req, limit = 64 * 1024) {
  if (req.body && typeof req.body === 'object') return req.body
  const raw = await readRaw(req, limit)
  return JSON.parse(raw.toString('utf8') || '{}')
}

/** The path segments after `/api/<route>/`, from the URL rather than a helper. */
export function pathParts(req, prefix) {
  const { pathname } = new URL(req.url ?? '/', 'http://x')
  const rest = pathname.replace(/^\/+/, '').replace(/^api\//, '')
  const trimmed = rest.startsWith(prefix) ? rest.slice(prefix.length) : rest
  return trimmed.split('/').filter(Boolean)
}

export function searchParams(req) {
  return new URL(req.url ?? '/', 'http://x').searchParams
}

/**
 * A stable, keyed hash of the caller's IP.
 *
 * Used only to rate-limit code guessing. Keyed with the session secret so the
 * stored value is useless on its own, and never written anywhere a human
 * reads — the question it answers is "same caller as a moment ago?", not
 * "who?".
 */
export function ipHash(req, key) {
  const forwarded = req.headers?.['x-forwarded-for']
  const ip =
    String(Array.isArray(forwarded) ? forwarded[0] : (forwarded ?? '')).split(',')[0].trim() ||
    /*
     * The socket address, when there is no proxy header.
     *
     * This used to return null in that case, which meant every rate limit in the
     * product silently counted nobody — a caller could hammer sign-ups or guess at
     * access codes forever, and the only symptom was limits that never fired. It
     * failed open on the one platform detail nobody thinks to check.
     */
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    ''
  if (!ip) return null
  return crypto.createHmac('sha256', key).update(ip).digest('base64url').slice(0, 22)
}

/**
 * Push a copy of something outward, if the operator has wired somewhere to push to.
 *
 * Outbound only, and nothing to do with Paystack's inbound webhook. It predates
 * Resend, when a sign-up would otherwise sit in a table until somebody opened the
 * dashboard; `OPERATOR_EMAIL` covers that now, so this is for people who would
 * rather it arrived in Slack. Never allowed to fail the request it describes.
 */
export async function notify(event, detail) {
  const url = process.env.REPORT_WEBHOOK_URL
  console.log(`[brainy:${event}] ${JSON.stringify(detail)}`)
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: event, ...detail }),
    })
  } catch (err) {
    console.error('[brainy:notify] failed', err instanceof Error ? err.message : err)
  }
}

/** An email we are prepared to store, or null. */
export function email(value) {
  const v = clip(value, 160)
  if (!v) return null
  const trimmed = v.toLowerCase()
  // Deliberately loose. The authority on whether an address works is whether
  // mail to it arrives, and over-strict patterns reject real addresses.
  return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(trimmed) ? trimmed : null
}
