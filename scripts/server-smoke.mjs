/**
 * Drives the real Fastify server over real HTTP.
 *
 * `api-smoke.mjs` calls the handlers directly, which is the right way to test what
 * they decide. It cannot test what the *transport* decides, and moving off
 * serverless put several load-bearing things there:
 *
 *  - the Paystack signature is an HMAC over the exact bytes received, so a body
 *    parser that hands over re-serialised JSON breaks payments silently
 *  - body size limits moved from the handlers to the route table, and Fastify's
 *    1 MB default is smaller than a bank receipt
 *  - the admin session is a cookie, which has to survive a round trip
 *  - a receipt is served as image bytes, not JSON
 *
 * Every one of those is invisible to a handler-level test and would fail in
 * production. So this boots the server on an ephemeral port against an in-memory
 * Postgres and makes actual requests.
 */

import crypto from 'node:crypto'
import { installMemoryPostgres } from './memdb.mjs'

const mem = installMemoryPostgres()

/* Everything the server needs to consider itself fully wired. */
process.env.ADMIN_SESSION_SECRET = 'server-smoke-session-secret-value'
process.env.ADMIN_TOKEN = 'server-smoke-admin-token-long-enough'
process.env.ADMIN_EMAIL = 'boss@example.com'
process.env.ADMIN_PASSWORD = 'a-long-enough-password'
process.env.PAYSTACK_SECRET_KEY = 'sk_test_server_smoke'
process.env.BANK_NAME = 'Test Bank'
process.env.BANK_ACCOUNT_NAME = 'Fortbridge'
process.env.BANK_ACCOUNT_NUMBER = '0123456789'
process.env.LOG_LEVEL = 'silent'
delete process.env.RESEND_API_KEY
delete process.env.REPORT_WEBHOOK_URL

const { build } = await import('../server/index.js')
const { ensureSchema } = await import('../server/lib/db.js')

await ensureSchema()
const app = build()
await app.listen({ port: 0, host: '127.0.0.1' })
const { port } = app.server.address()
const base = `http://127.0.0.1:${port}`

const problems = []
const check = (label, actual, expected) => {
  const ok = actual === expected
  console.log(`  ${ok ? '✔' : '✖'} ${label.padEnd(44)} ${actual}${ok ? '' : ` (expected ${expected})`}`)
  if (!ok) problems.push(label)
}

async function call(path, { method = 'GET', body, headers = {}, raw } = {}) {
  let res
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers: body || raw ? { 'Content-Type': 'application/json', ...headers } : headers,
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    })
  } catch (err) {
    /*
     * An oversized body is refused at the transport, and Fastify answers 413 while
     * the client is still writing — so the socket is reset and fetch never sees the
     * response. That is a network error, not a status code, and pretending
     * otherwise would make this harness lie about what a client experiences.
     */
    return { status: 0, json: null, text: '', headers: new Headers(), reset: true, error: err.message }
  }
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* binary or empty — checked by header and length instead */
  }
  return { status: res.status, json, text, headers: res.headers }
}

/** Refused, whether cleanly with a 413 or by having the connection dropped. */
const refused = (r) => r.status === 413 || r.reset === true

/* ------------------------------------------------------------------ *
 * The basics of being a server at all
 * ------------------------------------------------------------------ */

console.log('\nServing')
const health = await call('/healthz')
check('healthcheck', health.status, 200)
check('and it does not need the database', health.json?.ok, true)

const missing = await call('/api/nope')
check('unknown route is a JSON 404', missing.status, 404)
check('not an HTML error page', missing.json?.ok, false)

check('ingest accepts a ping', (await call('/api/event', { method: 'POST', body: { installId: 'srv-1', day: new Date().toISOString().slice(0, 10), kind: 'open' } })).status, 200)
// The handler checks the method itself and answers 405 with an Allow header, which
// is more use than Fastify's 404 — so the route accepts GET and lets it refuse.
check('and refuses GET with 405, not 404', (await call('/api/event')).status, 405)
check('malformed JSON is a 400', (await call('/api/event', { method: 'POST', raw: '{not json' })).status, 400)

/* ------------------------------------------------------------------ *
 * Body limits — moved from the handlers to the route table
 * ------------------------------------------------------------------ */

console.log('\nBody limits')
const receipt = Buffer.alloc(1_200_000, 0x41).toString('base64') // ~1.6 MB encoded
const bigClaim = await call('/api/pay/request', {
  method: 'POST',
  body: {
    email: 'kemi@example.com',
    plan: 'annual',
    proof: receipt,
    proofType: 'image/png',
  },
})
// Fastify's default limit is 1 MB. If this 413s, the route table lost its override
// and every bank transfer with a screenshot would fail.
check('a real receipt gets through', bigClaim.status, 200)

const tooBig = await call('/api/pay/request', {
  method: 'POST',
  raw: JSON.stringify({ email: 'kemi@example.com', plan: 'annual', proof: 'A'.repeat(4_000_000), proofType: 'image/png' }),
})
check('but 4 MB is refused', refused(tooBig), true)

const bigSignup = await call('/api/signup', { method: 'POST', raw: JSON.stringify({ email: 'a@b.co', note: 'x'.repeat(40_000) }) })
check('small routes stay small', refused(bigSignup), true)

/* ------------------------------------------------------------------ *
 * The Paystack signature, over the exact bytes
 * ------------------------------------------------------------------ */

console.log('\nWebhook signatures')
const event = JSON.stringify({ event: 'charge.success', data: { reference: 'srv_smoke_unknown' } })
const sign = (payload) => crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(payload).digest('hex')

check('unsigned is refused', (await call('/api/pay/webhook', { method: 'POST', raw: event })).status, 401)
check(
  'a wrong signature is refused',
  (await call('/api/pay/webhook', { method: 'POST', raw: event, headers: { 'x-paystack-signature': sign('something else') } })).status,
  401,
)
// The one that proves the raw-body parser: this signature is over the bytes as
// sent. If Fastify's parsed object were re-serialised anywhere in the path, the
// HMAC would not match and this would be a 401.
const signed = await call('/api/pay/webhook', {
  method: 'POST',
  raw: event,
  headers: { 'x-paystack-signature': sign(event) },
})
check('a correct signature is accepted', signed.status, 200)
check('and an unknown reference grants nothing', signed.json?.ok, false)
check(
  'the short /api/webhook path works too',
  (await call('/api/webhook', { method: 'POST', raw: event, headers: { 'x-paystack-signature': sign(event) } })).status,
  200,
)

/* ------------------------------------------------------------------ *
 * The admin session, as a cookie over the wire
 * ------------------------------------------------------------------ */

console.log('\nAdmin session')
check('the dashboard needs a session', (await call('/api/admin/families')).status, 401)

const login = await call('/api/admin/login', {
  method: 'POST',
  body: { email: 'boss@example.com', password: 'a-long-enough-password' },
})
check('login succeeds', login.status, 200)
const cookie = String(login.headers.get('set-cookie') ?? '').split(';')[0]
check('a cookie is set', cookie.startsWith('brainy_admin='), true)
check('cookie is HttpOnly', /HttpOnly/i.test(login.headers.get('set-cookie') ?? ''), true)
check(
  'and it opens the dashboard',
  (await call('/api/admin/families', { headers: { cookie } })).status,
  200,
)
check(
  'the machine token also works',
  (await call('/api/admin/overview', { headers: { 'x-admin-token': process.env.ADMIN_TOKEN } })).status,
  200,
)

/*
 * Changing the password must end every existing session. Simulated by changing
 * the stored hash directly, which is what a password change amounts to — before
 * this fix the cookie below kept working for its full twelve hours.
 */
mem.public.none(`update admin_users set pw_hash = 's1$AAAA$BBBB' where email = 'boss@example.com'`)
check(
  'a password change kills live sessions',
  (await call('/api/admin/families', { headers: { cookie } })).status,
  401,
)

/* ------------------------------------------------------------------ *
 * A receipt comes back as bytes, not JSON
 * ------------------------------------------------------------------ */

console.log('\nBinary responses')
const freshLogin = await call('/api/admin/login', {
  method: 'POST',
  body: { email: 'boss@example.com', password: 'a-long-enough-password' },
})
const cookie2 = String(freshLogin.headers.get('set-cookie') ?? '').split(';')[0]
check('re-seeded login works', freshLogin.status, 200)

const queue = await call('/api/admin/transfers', { headers: { cookie: cookie2 } })
const requestId = queue.json?.transfers?.[0]?.id
check('the claim from earlier is waiting', typeof requestId, 'number')

const proof = await fetch(`${base}/api/admin/proof?id=${requestId}`, { headers: { cookie: cookie2 } })
const bytes = Buffer.from(await proof.arrayBuffer())
check('the receipt is served', proof.status, 200)
check('as an image, not JSON', proof.headers.get('content-type'), 'image/png')
check('with the bytes intact', bytes.length, 1_200_000)
check('and never cached', /no-store/.test(proof.headers.get('cache-control') ?? ''), true)

/* ------------------------------------------------------------------ *
 * Rate limiting with no proxy header at all
 * ------------------------------------------------------------------ */

console.log('\nRate limiting')
/*
 * These requests carry no `x-forwarded-for`. That used to make `ipHash` return
 * null, which made every limit in the product count nobody — it failed open on a
 * platform detail. The socket address is the fallback, so this must now trip.
 */
let throttled = 0
for (let i = 0; i < 20; i++) {
  const r = await call('/api/activate', { method: 'POST', body: { code: `BRN-XXXX-${1000 + i}` } })
  if (r.status === 429) throttled += 1
}
check('code guessing is throttled by socket address', throttled > 0, true)

/* ------------------------------------------------------------------ *
 * Failing closed on missing configuration
 * ------------------------------------------------------------------ */

console.log('\nMisconfiguration')
const realSecret = process.env.ADMIN_SESSION_SECRET
delete process.env.ADMIN_SESSION_SECRET
check(
  'no session secret means nobody signs in',
  (await call('/api/admin/overview', { headers: { 'x-admin-token': process.env.ADMIN_TOKEN } })).status,
  503,
)
process.env.ADMIN_SESSION_SECRET = realSecret

const realToken = process.env.ADMIN_TOKEN
process.env.ADMIN_TOKEN = 'too-short'
check(
  'a short machine token is refused, not accepted',
  (await call('/api/admin/overview', { headers: { 'x-admin-token': 'too-short' } })).status,
  503,
)
process.env.ADMIN_TOKEN = realToken

await app.close()

console.log()
if (problems.length > 0) {
  console.log(`✖ ${problems.length} problem(s): ${problems.join(', ')}`)
  process.exit(1)
}
console.log('✔ The server behaves correctly over real HTTP.')
