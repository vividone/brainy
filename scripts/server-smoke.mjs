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
 * Parent accounts
 *
 * Sign-up and sign-in are one flow, so these assertions are mostly about the
 * things that must NOT work: a wrong code, a dead code, a token that has been
 * revoked, and — the one that matters most — an account that exists without
 * anything about a child attached to it.
 * ------------------------------------------------------------------ */

console.log('\nParent accounts')

/*
 * Codes are emailed, and email is switched off in this harness — so read the code
 * out of the database the way nobody in production can. Hashed with a pepper, so
 * the test brute-forces the six digits rather than reversing anything, which is
 * itself a demonstration that the stored form is not the code.
 */
const { one: dbOne } = await import('../server/lib/db.js')
import crypto2 from 'node:crypto'
const codeFor = async (address) => {
  const row = await dbOne(
    `select code_hash from auth_codes where email = $1 and consumed_at is null order by id desc limit 1`,
    [address],
  )
  if (!row) return null
  for (let n = 0; n < 1_000_000; n++) {
    const guess = String(n).padStart(6, '0')
    const hash = crypto2
      .createHmac('sha256', process.env.ADMIN_SESSION_SECRET)
      .update(`${address}:${guess}`)
      .digest('hex')
    if (hash === row.code_hash) return guess
  }
  return null
}

check('a malformed address is refused', (await call('/api/auth/code', { method: 'POST', body: { email: 'nope' } })).status, 400)

const asked = await call('/api/auth/code', { method: 'POST', body: { email: 'Ada@Example.com' } })
check('asking for a code is accepted', asked.status, 200)
check('and says how long it lasts', asked.json?.expiresInMinutes, 15)

const code = await codeFor('ada@example.com')
check('a code was stored, hashed', typeof code === 'string' && code.length === 6, true)

check(
  'a wrong code is refused',
  (await call('/api/auth/verify', { method: 'POST', body: { email: 'ada@example.com', code: '000000' } })).status,
  401,
)

const verified = await call('/api/auth/verify', {
  method: 'POST',
  body: { email: 'ada@example.com', code, label: 'Chrome on Android' },
})
check('the right code signs in', verified.status, 200)
check('a device token comes back', String(verified.json?.token ?? '').startsWith('bpt_'), true)
check('the account is new', verified.json?.account?.isNew, true)
check('with a licence attached', typeof verified.json?.licence?.code, 'string')
/* The default, asserted: a new account keeps progress, because that is what a
   family signed up for. The promise that survives is the *shape* of what is
   kept, which the minimisation assertions below cover. */
check('and progress keeping is on', verified.json?.account?.keepProgress, true)

const TOKEN = verified.json.token
check(
  'the same code cannot be used twice',
  (await call('/api/auth/verify', { method: 'POST', body: { email: 'ada@example.com', code } })).status,
  401,
)

console.log('\nWhat the token opens')
check('no token, no account', (await call('/api/account')).status, 401)
check(
  'a made-up token is refused',
  (await call('/api/account', { headers: { authorization: 'Bearer bpt_not-a-real-token' } })).status,
  401,
)

const mine = await call('/api/account', { headers: { authorization: `Bearer ${TOKEN}` } })
check('a real token opens the account', mine.status, 200)
check('it is theirs', mine.json?.account?.email, 'ada@example.com')
check('we hold no children', mine.json?.children?.length, 0)

check(
  'consent can be given',
  (await call('/api/account/keep-progress', { method: 'POST', body: { on: true }, headers: { authorization: `Bearer ${TOKEN}` } })).json?.keepProgress,
  true,
)
check(
  'and taken back',
  (await call('/api/account/keep-progress', { method: 'POST', body: { on: false }, headers: { authorization: `Bearer ${TOKEN}` } })).json?.keepProgress,
  false,
)

console.log('\nSigning out')
check('signing out is accepted', (await call('/api/auth/signout', { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } })).status, 200)
check(
  'and the token stops working',
  (await call('/api/account', { headers: { authorization: `Bearer ${TOKEN}` } })).status,
  401,
)

/* Signing in again is the recovery path — the whole point of the feature. */
const again = await codeFor('ada@example.com').then(async (c) =>
  c
    ? await call('/api/auth/verify', { method: 'POST', body: { email: 'ada@example.com', code: c } })
    : await call('/api/auth/code', { method: 'POST', body: { email: 'ada@example.com' } }).then(async () => {
        const fresh = await codeFor('ada@example.com')
        return await call('/api/auth/verify', { method: 'POST', body: { email: 'ada@example.com', code: fresh } })
      }),
)
check('they can sign in again', again.status, 200)
check('and it is the same account', again.json?.account?.isNew, false)
check('with the same licence', again.json?.licence?.code, verified.json.licence.code)

console.log('\nGuessing at codes')
await call('/api/auth/code', { method: 'POST', body: { email: 'bola@example.com' } })
let refusedAt = 0
for (let i = 1; i <= 7; i++) {
  const attempt = await call('/api/auth/verify', {
    method: 'POST',
    body: { email: 'bola@example.com', code: String(100000 + i) },
  })
  if (!refusedAt && /Too many/i.test(attempt.json?.error ?? '')) refusedAt = i
}
// Five guesses, then the code is dead — a six-digit space is only safe if it cannot be walked.
check('a code dies after five wrong tries', refusedAt, 6)
const stillThere = await codeFor('bola@example.com')
check('and is consumed, not left live', stillThere, null)

/* ------------------------------------------------------------------ *
 * Keeping a child's progress
 *
 * The assertions that matter here are the refusals. This is the one route that
 * holds anything about a child, so what it declines to hold is the feature.
 * ------------------------------------------------------------------ */

console.log('\nProgress sync')

/* A fresh account, signed in, so this section owns its own state. */
await call('/api/auth/code', { method: 'POST', body: { email: 'sync@example.com' } })
const syncCode = await codeFor('sync@example.com')
const syncSession = await call('/api/auth/verify', {
  method: 'POST',
  body: { email: 'sync@example.com', code: syncCode },
})
const SYNC = { authorization: `Bearer ${syncSession.json.token}` }

check('no token, no sync', (await call('/api/sync')).status, 401)

/* On by default, so a family that just signed in can sync without finding a
   switch first. Nothing is stored yet, because nothing has been uploaded. */
const before = await call('/api/sync', { headers: SYNC })
check('a new account has nothing stored', before.json?.learners?.length, 0)
check('but keeping is already on', before.json?.keepProgress, true)
check(
  'so uploading is allowed straight away',
  (await call('/api/sync', { method: 'PUT', headers: SYNC, body: { learners: [] } })).status,
  200,
)

/*
 * The half of the change that matters more than the default: a parent who says
 * no is not asked again and is not quietly re-enabled. An explicit false has to
 * outlive a fresh sign-in, which is exactly what a "no row means yes" default
 * could have broken.
 */
await call('/api/account/keep-progress', { method: 'POST', headers: SYNC, body: { on: false } })
const refusedRead = await call('/api/sync', { headers: SYNC })
check('turning it off is honoured', refusedRead.json?.keepProgress, false)
check(
  'and uploading is then refused',
  (await call('/api/sync', { method: 'PUT', headers: SYNC, body: { learners: [] } })).status,
  403,
)
await call('/api/auth/code', { method: 'POST', body: { email: 'sync@example.com' } })
const afterSignIn = await call('/api/auth/verify', {
  method: 'POST',
  body: { email: 'sync@example.com', code: await codeFor('sync@example.com') },
})
check('and signing in again does not turn it back on', afterSignIn.json?.account?.keepProgress, false)

await call('/api/account/keep-progress', { method: 'POST', headers: SYNC, body: { on: true } })

const state = {
  settings: { sessionLength: 10 },
  progress: { 'ng-ube': { 'ng.maths.b3.add': { mastery: 0.62, attempts: 9, correct: 7 } } },
  levelStars: { 'ng-ube': { 'number#0': 3 } },
  economy: { xp: 240, coins: 61, owned: ['c1'], equipped: { character: 'c1' } },
  streak: { current: 4, longest: 4 },
  badges: ['first-mango'],
  totals: { questions: 40, correct: 31, ms: 900_000 },
  answerStreak: 3,
  bestAnswerStreak: 8,
}
const learner = { id: 'L-sync-1', revision: 1, profile: { name: 'Tunde', age: 7, curriculumId: 'ng-ube', yearBand: 'b3' }, state }

const stored = await call('/api/sync', { method: 'PUT', headers: SYNC, body: { learners: [learner], label: 'test' } })
check('an upload is accepted', stored.status, 200)
check('and stored', stored.json?.results?.['L-sync-1']?.status, 'stored')

const fetched = await call('/api/sync', { headers: SYNC })
check('it comes back', fetched.json?.learners?.length, 1)
check('with the revision', fetched.json?.learners?.[0]?.revision, 1)
check('and the mastery intact', fetched.json?.learners?.[0]?.state?.progress?.['ng-ube']?.['ng.maths.b3.add']?.mastery, 0.62)
check('and the coins', fetched.json?.learners?.[0]?.state?.economy?.coins, 61)
check('and the profile', fetched.json?.learners?.[0]?.profile?.name, 'Tunde')

/* Last-writer-wins per child, on a counter rather than a clock — a tablet with
   the wrong date must not win every conflict for ever. */
const stale = await call('/api/sync', { method: 'PUT', headers: SYNC, body: { learners: [{ ...learner, revision: 1 }] } })
check('the same revision is refused', stale.json?.results?.['L-sync-1']?.status, 'stale')
check('and the newer copy comes back with it', stale.json?.results?.['L-sync-1']?.revision, 1)
const newer = await call('/api/sync', {
  method: 'PUT',
  headers: SYNC,
  body: { learners: [{ ...learner, revision: 2, state: { ...state, economy: { ...state.economy, coins: 99 } } }] },
})
check('a higher revision is stored', newer.json?.results?.['L-sync-1']?.status, 'stored')
check(
  'and wins',
  (await call('/api/sync', { headers: SYNC })).json?.learners?.[0]?.state?.economy?.coins,
  99,
)

console.log('\nWhat sync refuses to hold')
/*
 * The three refusals are the privacy promise in executable form. Stripping these
 * silently would be friendlier and would make the promise impossible to verify —
 * so they are rejected, and this is the assertion that says so.
 */
for (const [field, value] of [
  ['history', [{ answers: [{ skillId: 'x', correctFirstTry: false }] }]],
  ['byDay', { '2026-08-05': { sessions: 2 } }],
  ['seenItems', { 'ng.maths.b3.add': ['sig1'] }],
]) {
  const attempt = await call('/api/sync', {
    method: 'PUT',
    headers: SYNC,
    body: { learners: [{ ...learner, revision: 9, state: { ...state, [field]: value } }] },
  })
  check(`"${field}" is rejected outright`, attempt.status, 422)
  check(`  and named in the refusal`, (attempt.json?.refused ?? []).some((r) => r.includes(field)), true)
}
check(
  'an unknown field is rejected too',
  (await call('/api/sync', { method: 'PUT', headers: SYNC, body: { learners: [{ ...learner, revision: 9, state: { ...state, somethingNew: 1 } }] } })).status,
  422,
)
// Rejected means rejected: the good copy from before must be untouched.
check(
  'and nothing was written',
  (await call('/api/sync', { headers: SYNC })).json?.learners?.[0]?.state?.economy?.coins,
  99,
)
check(
  'another account cannot claim the child',
  (await call('/api/sync', { method: 'PUT', headers: { authorization: `Bearer ${again.json.token}` }, body: { learners: [{ ...learner, revision: 50 }] } })).status,
  403,
)

console.log('\nWithdrawing consent')
check(
  'turning it off is accepted',
  (await call('/api/account/keep-progress', { method: 'POST', headers: SYNC, body: { on: false } })).status,
  200,
)
// Off has to mean "and delete it", or it only means "stop adding to the pile".
const after = await call('/api/sync', { headers: SYNC })
check('and the progress is gone', after.json?.learners?.length, 0)
check(
  'even after turning it back on',
  (await call('/api/account/keep-progress', { method: 'POST', headers: SYNC, body: { on: true } }).then(() => call('/api/sync', { headers: SYNC }))).json?.learners?.length,
  0,
)

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
