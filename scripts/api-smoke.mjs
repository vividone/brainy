/**
 * Exercises the API routes against an in-memory Postgres.
 *
 * The same reasoning as the content smoke test: a broken endpoint is
 * invisible until a real parent's feedback silently vanishes, and finding
 * that out from production logs is too late. This runs the actual handlers,
 * with the actual SQL, in about a second.
 */

import { newDb } from 'pg-mem'
import { Readable } from 'node:stream'
import crypto from 'node:crypto'
import pg from 'pg'

const mem = newDb()

/*
 * pg-mem implements very few built-ins. These exist in real Postgres, so they
 * are taught to the double rather than avoided in the production SQL — the
 * point of this harness is to test the query we actually ship.
 */
mem.public.registerFunction({
  name: 'greatest',
  args: ['date', 'date'],
  returns: 'date',
  implementation: (a, b) => (a > b ? a : b),
})
mem.public.registerFunction({
  name: 'greatest',
  args: ['int', 'int'],
  returns: 'int',
  implementation: (a, b) => Math.max(a ?? 0, b ?? 0),
})

const adapter = mem.adapters.createPg()

/*
 * pg-mem's lexer rejects non-ASCII inside a block comment, which real
 * Postgres accepts happily — and the schema is heavily commented, em dashes
 * and all. Strip comments on the way into the double rather than flatten the
 * punctuation in the production schema to suit a test dependency. Nothing
 * executable is removed: no string literal in the schema contains a comment
 * marker.
 */
const stripComments = (sql) => sql.replace(/\/\*[\s\S]*?\*\//g, '')

const origQuery = adapter.Pool.prototype.query
adapter.Pool.prototype.query = function (text, params) {
  return origQuery.call(this, typeof text === 'string' ? stripComments(text) : text, params)
}

// The handlers construct their own pool from `pg`; point that at pg-mem.
pg.Pool = adapter.Pool

process.env.DATABASE_URL = 'postgres://memory/brainy'
/* Long enough to be accepted: a machine credential with full admin power is
   refused below 32 characters rather than quietly allowed. */
process.env.ADMIN_TOKEN = 'test-token-long-enough-to-be-allowed'
process.env.ADMIN_SESSION_SECRET = 'smoke-session-secret-not-derived-from-the-token'
process.env.ADMIN_EMAIL = 'boss@example.com'
process.env.ADMIN_PASSWORD = 'a-long-enough-password'
delete process.env.REPORT_WEBHOOK_URL
// Payments are switched off to begin with, which is a state the routes have to
// handle: the smoke test turns the key on later to exercise the webhook.
delete process.env.PAYSTACK_SECRET_KEY

const event = await import('../server/routes/event.js')
const report = await import('../server/routes/report.js')
const stats = await import('../server/routes/stats.js')
const forget = await import('../server/routes/forget.js')
const retain = await import('../server/routes/cron/retain.js')
const signup = await import('../server/routes/signup.js')
const activateRoute = await import('../server/routes/activate.js')
const admin = await import('../server/routes/admin.js')
const payInit = await import('../server/routes/pay/initialise.js')
const payHook = await import('../server/routes/pay/webhook.js')
const payRequest = await import('../server/routes/pay/request.js')
const cron = await import('../server/routes/cron/expiring.js')

async function call(mod, payload, { method = 'POST', url = '/', headers = {} } = {}) {
  const req = Object.assign(Readable.from([Buffer.from(JSON.stringify(payload))]), {
    method,
    url,
    headers,
  })
  let status = 0
  let body = null
  // Captured because the admin routes authenticate with a signed cookie, and a
  // login that sets a cookie nobody can read is not a login that is tested.
  const sent = {}
  const res = {
    status(s) { status = s; return this },
    json(b) { body = b; return this },
    end() { return this },
    setHeader(name, value) { sent[String(name).toLowerCase()] = value },
  }
  await mod.default(req, res)
  return { status, body, headers: sent }
}

/** The `name=value` part of a Set-Cookie header, ready to send back. */
const cookieFrom = (result) => String(result.headers['set-cookie'] ?? '').split(';')[0]

const problems = []
const check = (label, actual, expected) => {
  const ok = actual === expected
  console.log(`  ${ok ? '✔' : '✖'} ${label.padEnd(38)} ${actual}${ok ? '' : ` (expected ${expected})`}`)
  if (!ok) problems.push(label)
}

const today = new Date().toISOString().slice(0, 10)
const ID = 'install-test-0001'

console.log('\nIngest')
check('activate', (await call(event, { installId: ID, app: 'v1.0', day: today, kind: 'activate', curriculum: 'ng-ube', yearBand: 'b3', children: 2 })).status, 200)
check('daily open', (await call(event, { installId: ID, app: 'v1.0', day: today, kind: 'open', curriculum: 'ng-ube', yearBand: 'b3', children: 2 })).status, 200)
check('session', (await call(event, { installId: ID, app: 'v1.0', day: today, kind: 'session', subject: 'maths', questions: 10, correct: 8, durationMs: 300_000 })).status, 200)
check('second install', (await call(event, { installId: 'install-test-0002', app: 'v1.0', day: today, kind: 'open', curriculum: 'uk-nc', yearBand: 'y3', children: 1 })).status, 200)

console.log('\nRejects bad input')
check('unknown kind', (await call(event, { installId: ID, day: today, kind: 'nope' })).status, 400)
check('missing install id', (await call(event, { day: today, kind: 'open' })).status, 400)
check('malformed day', (await call(event, { installId: ID, day: 'yesterday', kind: 'open' })).status, 400)
check('GET refused', (await call(event, {}, { method: 'GET' })).status, 405)

console.log('\nReports')
check('feedback stored', (await call(report, { type: 'feedback', app: 'v1.0', category: 'wrong', message: 'the clock question is off', contact: 'a@b.co', installId: ID })).status, 200)
check('weekly stored', (await call(report, { type: 'weekly', app: 'v1.0', week: '2026-W31', children: ['a summary'], installId: ID })).status, 200)

console.log('\nDashboard')
check('no token refused', (await call(stats, {}, { method: 'GET', url: '/api/stats' })).status, 401)

const ok = await call(stats, {}, { method: 'GET', url: '/api/stats', headers: { 'x-admin-token': 'test-token-long-enough-to-be-allowed' } })
check('with token', ok.status, 200)

if (ok.body?.ok) {
  const { installs, daily, subjects, split, feedback } = ok.body
  check('activations counted', installs.total, 2)
  check('children summed', installs.children, 3)
  check('a day of activity', daily.length >= 1, true)
  check('devices that day', Number(daily.at(-1)?.devices ?? 0), 2)
  check('questions that day', Number(daily.at(-1)?.questions ?? 0), 10)
  check('subject rows', subjects.length, 1)
  check('subject accuracy source', Number(subjects[0]?.correct ?? 0), 8)
  check('curriculum split rows', split.length, 2)
  check('feedback visible', feedback.length, 1)
} else {
  problems.push(`stats returned ${JSON.stringify(ok.body)}`)
}

console.log('\nErasure')
check('GET refused', (await call(forget, {}, { method: 'GET' })).status, 405)
check('needs an install id', (await call(forget, {})).status, 400)

const gone = await call(forget, { installId: ID })
check('erase accepted', gone.status, 200)
// Every table that carried the id must be emptied of it, not just the counts.
check('install row gone', gone.body?.deleted?.installs, 1)
check('events gone', gone.body?.deleted?.events, 3)
check('feedback gone', gone.body?.deleted?.feedback, 1)
check('weekly summary gone', gone.body?.deleted?.summaries, 1)

const after = await call(stats, {}, { method: 'GET', url: '/api/stats', headers: { 'x-admin-token': 'test-token-long-enough-to-be-allowed' } })
check('dashboard forgets them', after.body?.installs?.total, 1)
check('their feedback is gone', after.body?.feedback?.length, 0)
check('but the other family stays', after.body?.split?.length, 1)
check('erasing twice is harmless', (await call(forget, { installId: ID })).status, 200)

/* ------------------------------------------------------------------ *
 * Accounts, licences and money
 *
 * The half where being wrong costs somebody either their access or their
 * money, so the checks are about the edges rather than the happy path: a
 * coupon that cannot be claimed twice by one family, a revocation that
 * actually closes the door, an extension that adds to what is left, and a
 * webhook that refuses an unsigned caller.
 * ------------------------------------------------------------------ */

console.log('\nSign-ups')
check('rejects a non-address', (await call(signup, { email: 'not-an-email' })).status, 400)
check('GET refused', (await call(signup, {}, { method: 'GET' })).status, 405)

const joined = await call(signup, { email: 'Ada@Example.com ', name: 'Ada', children: 2 })
check('sign-up accepted', joined.status, 200)
check('grants nothing by itself', joined.body?.licence?.status, 'pending')
check('no plan yet', joined.body?.licence?.plan, 'none')
check('access code minted', /^BRN-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(joined.body?.licence?.code ?? ''), true)
check('email is normalised', joined.body?.licence?.email, 'ada@example.com')
check('signing up twice is harmless', (await call(signup, { email: 'ada@example.com' })).status, 200)

/*
 * The database error messages, because the whole point of them is being read by
 * a human at the moment something is broken — and a message that quotes a DNS
 * resolver at somebody who pasted the wrong Railway variable sends them looking
 * in the wrong place entirely.
 */
console.log('\nWhen the database is unreachable')
{
  const { explain } = await import('../server/lib/db.js')
  const real = process.env.DATABASE_URL

  process.env.DATABASE_URL = 'postgres://u:p@postgres.railway.internal:5432/railway'
  const railway = explain(Object.assign(new Error('getaddrinfo ENOTFOUND postgres.railway.internal'), { code: 'ENOTFOUND' }))
  check('names the Railway private host', railway.includes('DATABASE_PUBLIC_URL'), true)
  check('and where to find it', railway.includes('proxy.rlwy.net'), true)

  process.env.DATABASE_URL = 'postgres://u:p@db.some-host.internal:5432/app'
  check(
    'any .internal host is explained',
    explain(Object.assign(new Error('nope'), { code: 'ENOTFOUND' })).includes('private to your database provider'),
    true,
  )

  process.env.DATABASE_URL = 'postgres://u:p@real.example.com:5432/app'
  check(
    'a plain DNS failure still says so',
    explain(Object.assign(new Error('getaddrinfo ENOTFOUND real.example.com'), { code: 'ENOTFOUND' })).includes('Cannot resolve'),
    true,
  )
  check(
    'a wrong password is named',
    explain(Object.assign(new Error('auth failed'), { code: '28P01' })).includes('Password authentication failed'),
    true,
  )
  check(
    'a TLS-less server is explained',
    explain(new Error('The server does not support SSL connections')).includes('sslmode=disable'),
    true,
  )

  process.env.DATABASE_URL = real
}

console.log('\nAdmin sign-in')
check(
  'wrong password refused',
  (await call(admin, { email: 'boss@example.com', password: 'nope' }, { url: '/api/admin/login' })).status,
  401,
)
check(
  'unknown admin refused',
  (await call(admin, { email: 'nobody@example.com', password: 'a-long-enough-password' }, { url: '/api/admin/login' })).status,
  401,
)

const signedIn = await call(
  admin,
  { email: 'boss@example.com', password: 'a-long-enough-password' },
  { url: '/api/admin/login' },
)
check('correct password accepted', signedIn.status, 200)
const cookie = cookieFrom(signedIn)
check('session cookie issued', cookie.startsWith('brainy_admin='), true)

const authed = { cookie }
check('no cookie, no families', (await call(admin, {}, { method: 'GET', url: '/api/admin/families' })).status, 401)
check(
  'a forged cookie is refused',
  (await call(admin, {}, { method: 'GET', url: '/api/admin/families', headers: { cookie: 'brainy_admin=abc.def' } })).status,
  401,
)
check(
  'cookie opens the dashboard',
  (await call(admin, {}, { method: 'GET', url: '/api/admin/families', headers: authed })).status,
  200,
)
check(
  'token still works for machines',
  (await call(admin, {}, { method: 'GET', url: '/api/admin/overview', headers: { 'x-admin-token': 'test-token-long-enough-to-be-allowed' } })).status,
  200,
)

console.log('\nCoupons')
const made = await call(
  admin,
  { plan: 'free-forever', maxUses: 2, note: 'first families' },
  { url: '/api/admin/coupons', headers: authed },
)
check('coupon created', made.status, 200)
const COUPON = made.body?.coupon?.code ?? ''
check('coupon code generated', /^FAMILY-[A-Z2-9]{4}$/.test(COUPON), true)
check(
  'duplicate code refused',
  (await call(admin, { code: COUPON, plan: 'annual' }, { url: '/api/admin/coupons', headers: authed })).status,
  409,
)

console.log('\nRedeeming')
check('a coupon needs an address', (await call(activateRoute, { code: COUPON })).status, 400)
check(
  'and says so',
  (await call(activateRoute, { code: COUPON })).body?.needsEmail,
  true,
)
check('nonsense code refused', (await call(activateRoute, { code: 'NOPE-NOPE' })).status, 404)

const redeemed = await call(activateRoute, { code: COUPON, email: 'ada@example.com', installId: ID })
check('coupon redeemed', redeemed.status, 200)
check('licence is active', redeemed.body?.licence?.status, 'active')
check('server says full access', redeemed.body?.licence?.full, true)
check('free forever never expires', redeemed.body?.licence?.expiresAt, null)
const FAMILY_CODE = redeemed.body?.licence?.code
check('same code as at sign-up', FAMILY_CODE, joined.body?.licence?.code)

// The important one: a twenty-use batch must not be spent by one family
// re-typing its code on every tablet they own.
check('re-redeeming is idempotent', (await call(activateRoute, { code: COUPON, email: 'ada@example.com' })).status, 200)
const afterReuse = await call(admin, {}, { method: 'GET', url: '/api/admin/coupons', headers: authed })
check('only one use consumed', afterReuse.body?.coupons?.[0]?.uses, 1)
check('and one family claimed it', afterReuse.body?.coupons?.[0]?.claims, 1)

check(
  'a second family can claim it',
  (await call(activateRoute, { code: COUPON, email: 'bola@example.com' })).status,
  200,
)
check(
  'a third cannot',
  (await call(activateRoute, { code: COUPON, email: 'chidi@example.com' })).status,
  409,
)

console.log('\nA family code on another tablet')
const reused = await call(activateRoute, { code: FAMILY_CODE, installId: 'install-test-tablet-2' })
check('own code re-activates', reused.status, 200)
check('still full access', reused.body?.licence?.full, true)
const revalidated = await call(activateRoute, {}, {
  method: 'GET',
  url: `/api/activate?code=${FAMILY_CODE}&installId=install-test-tablet-2`,
})
check('re-validation works', revalidated.status, 200)
check('unknown code re-validates to 404', (await call(activateRoute, {}, { method: 'GET', url: '/api/activate?code=BRN-ZZZZ-ZZZZ' })).status, 404)

console.log('\nRevoking and restoring')
check(
  'revoked',
  (await call(admin, { code: FAMILY_CODE }, { url: '/api/admin/licence/revoke', headers: authed })).status,
  200,
)
const whileRevoked = await call(activateRoute, {}, { method: 'GET', url: `/api/activate?code=${FAMILY_CODE}` })
check('the app is told it is revoked', whileRevoked.body?.licence?.status, 'revoked')
check('and that access is closed', whileRevoked.body?.licence?.full, false)
check(
  'restored',
  (await call(admin, { code: FAMILY_CODE }, { url: '/api/admin/licence/restore', headers: authed })).status,
  200,
)
check(
  'access is back',
  (await call(activateRoute, {}, { method: 'GET', url: `/api/activate?code=${FAMILY_CODE}` })).body?.licence?.full,
  true,
)

console.log('\nGranting and extending by hand')
const granted = await call(
  admin,
  { email: 'dele@example.com', plan: 'annual', name: 'Dele' },
  { url: '/api/admin/licence/grant', headers: authed },
)
check('a year granted', granted.status, 200)
check('on the annual plan', granted.body?.licence?.plan, 'annual')
const firstExpiry = new Date(granted.body?.licence?.expiresAt ?? 0)
const monthsAway = Math.round((firstExpiry - Date.now()) / 86_400_000 / 30.44)
check('expires in about a year', monthsAway, 12)

const extended = await call(
  admin,
  { code: granted.body?.licence?.code, months: 12 },
  { url: '/api/admin/licence/extend', headers: authed },
)
check('extension accepted', extended.status, 200)
// Extending adds to the time left rather than restarting from today, so a
// parent who renews early does not lose the months they had already paid for.
check('adds to what was left', new Date(extended.body?.licence?.expiresAt) > firstExpiry, true)
check(
  'nothing to extend on a forever licence',
  (await call(admin, { code: FAMILY_CODE, months: 12 }, { url: '/api/admin/licence/extend', headers: authed })).status,
  409,
)

console.log('\nPayments')
check('prices are public', (await call(payInit, {}, { method: 'GET' })).status, 200)
check('and say payments are off', (await call(payInit, {}, { method: 'GET' })).body?.enabled, false)
check(
  'checkout refuses while switched off',
  (await call(payInit, { email: 'ada@example.com', plan: 'annual' })).status,
  503,
)

process.env.PAYSTACK_SECRET_KEY = 'sk_test_smoke'
check('webhook rejects an unsigned call', (await call(payHook, { event: 'charge.success' })).status, 401)
check(
  'webhook rejects a wrong signature',
  (await call(payHook, { event: 'charge.success' }, { headers: { 'x-paystack-signature': 'deadbeef' } })).status,
  401,
)

const hookBody = { event: 'charge.success', data: { reference: 'brainy_never_started' } }
const signature = crypto
  .createHmac('sha512', 'sk_test_smoke')
  .update(JSON.stringify(hookBody))
  .digest('hex')
const signed = await call(payHook, hookBody, { headers: { 'x-paystack-signature': signature } })
// Correctly signed, so it is acknowledged rather than retried — but a reference
// this server never created grants nothing, which is the check that matters.
check('a signed webhook is accepted', signed.status, 200)
check('but an unknown reference grants nothing', signed.body?.ok, false)
check(
  'events we do not act on are acknowledged',
  (
    await call(
      payHook,
      { event: 'transfer.success' },
      {
        headers: {
          'x-paystack-signature': crypto
            .createHmac('sha512', 'sk_test_smoke')
            .update(JSON.stringify({ event: 'transfer.success' }))
            .digest('hex'),
        },
      },
    )
  ).status,
  200,
)
delete process.env.PAYSTACK_SECRET_KEY

console.log('\nWhat the dashboard shows')
const view = await call(admin, {}, { method: 'GET', url: '/api/admin/overview', headers: authed })
check('overview loads', view.status, 200)
check('four parents signed up', view.body?.parents?.total, 4)
const activeCount = view.body?.subscriptions
  ?.filter((r) => r.status === 'active')
  .reduce((a, r) => a + r.n, 0)
check('three active licences', activeCount, 3)

const list = await call(admin, {}, { method: 'GET', url: '/api/admin/families', headers: authed })
check('families listed', list.body?.families?.length, 4)
const ada = list.body?.families?.find((f) => f.email === 'ada@example.com')
check('devices are counted', ada?.devices, 2)
check(
  'search finds a family',
  (await call(admin, {}, { method: 'GET', url: '/api/admin/families?q=bola', headers: authed })).body?.families
    ?.length,
  1,
)
const trail = await call(admin, {}, { method: 'GET', url: '/api/admin/audit', headers: authed })
check('every change is logged', trail.body?.audit?.length > 0, true)
check(
  'including the revocation',
  trail.body?.audit?.some((a) => a.action === 'licence.revoked'),
  true,
)
check(
  'signing out clears the cookie',
  cookieFrom(await call(admin, {}, { url: '/api/admin/logout' })),
  'brainy_admin=',
)

console.log('\nA one-year code typed twice')
const yearly = await call(
  admin,
  { plan: 'annual', maxUses: 5, note: 'renewal batch' },
  { url: '/api/admin/coupons', headers: authed },
)
const YEAR_CODE = yearly.body?.coupon?.code
const firstYear = await call(activateRoute, { code: YEAR_CODE, email: 'efe@example.com' })
check('a year granted by code', firstYear.body?.licence?.plan, 'annual')
const secondYear = await call(activateRoute, { code: YEAR_CODE, email: 'efe@example.com' })
// The whole point: a family typing a one-year code on a second tablet, or out
// of habit, must not collect another year each time.
check('the second time changes nothing', secondYear.body?.licence?.expiresAt, firstYear.body?.licence?.expiresAt)
const yearCoupon = (
  await call(admin, {}, { method: 'GET', url: '/api/admin/coupons', headers: authed })
).body?.coupons?.find((c) => c.code === YEAR_CODE)
check('and consumes one use, not two', yearCoupon?.uses, 1)

/* ------------------------------------------------------------------ *
 * Email
 *
 * Resend is stubbed at `fetch`, so these assert the thing that actually
 * matters — that a code reaches the family exactly once — without sending
 * anything. An unexpected call to any other host throws, which is how a
 * live Paystack call would be caught if one ever crept in here.
 * ------------------------------------------------------------------ */

console.log('\nEmail')
const outbox = []
/** What a stubbed Paystack says the last transaction was worth. */
let paidAmount = 500_000
const realFetch = globalThis.fetch
const reply = (body) => ({ ok: true, status: 200, json: async () => body })

globalThis.fetch = async (url, init) => {
  const target = String(url)

  if (target.startsWith('https://api.resend.com')) {
    const message = JSON.parse(init.body)
    outbox.push({ to: message.to[0], subject: message.subject, text: message.text })
    return reply({ id: `test-${outbox.length}` })
  }

  /*
   * Paystack, stubbed at the two calls that matter. Verification is the only
   * thing trusted to mean "paid" (server/lib/pay.js), so a double stubbed here is what
   * makes the whole payment path testable without a live key.
   */
  if (target.startsWith('https://api.paystack.co/transaction/initialize')) {
    const sent = JSON.parse(init.body)
    return reply({
      status: true,
      data: { authorization_url: `https://checkout.paystack.test/${sent.reference}`, reference: sent.reference },
    })
  }
  if (target.startsWith('https://api.paystack.co/transaction/verify/')) {
    const reference = decodeURIComponent(target.split('/verify/')[1])
    return reply({
      status: true,
      data: {
        reference,
        status: 'success',
        amount: paidAmount,
        currency: 'NGN',
        channel: 'card',
        paid_at: new Date().toISOString(),
        customer: { email: 'buyer@example.com' },
      },
    })
  }

  throw new Error(`the smoke test made a real request to ${target}`)
}

const emailsTo = (address) => outbox.filter((m) => m.to === address)

// A deployment with no mail configured must still work — the code is shown on
// screen either way, and a missing variable is not a reason to refuse a sign-up.
check('with no key the sign-up still works', (await call(signup, { email: 'nokey@example.com' })).status, 200)
check('and nothing is sent', outbox.length, 0)

process.env.RESEND_API_KEY = 're_test_smoke'
process.env.EMAIL_FROM = 'Brainy <brainy@example.com>'

check('a plain sign-up is answered', (await call(signup, { email: 'wale@example.com', name: 'Wale' })).status, 200)
check('one email to them', emailsTo('wale@example.com').length, 1)
check('saying there is nothing yet', emailsTo('wale@example.com')[0]?.subject, 'Thanks for signing up to Brainy')
check('addressed to them by name', emailsTo('wale@example.com')[0]?.text.startsWith('Hello Wale,'), true)

// Submitting the form twice is a thing people do; it must not look like an event.
await call(signup, { email: 'wale@example.com' })
check('signing up again sends nothing', emailsTo('wale@example.com').length, 1)

const emailCoupon = (
  await call(admin, { plan: 'free-forever', maxUses: 3 }, { url: '/api/admin/coupons', headers: authed })
).body?.coupon?.code
const redeemedByEmail = await call(activateRoute, { code: emailCoupon, email: 'ngozi@example.com' })
check('redeeming a code works', redeemedByEmail.status, 200)
check('and emails the code', emailsTo('ngozi@example.com').length, 1)
check('with the right subject', emailsTo('ngozi@example.com')[0]?.subject, 'Your Brainy access code')
check(
  'and the code in the body',
  emailsTo('ngozi@example.com')[0]?.text.includes(redeemedByEmail.body.licence.code),
  true,
)
await call(activateRoute, { code: emailCoupon, email: 'ngozi@example.com' })
check('typing it again sends nothing', emailsTo('ngozi@example.com').length, 1)

// The free-places path: SIGNUP_COUPON is claimed during sign-up, so the very
// first email a family gets is their code rather than a holding message.
process.env.SIGNUP_COUPON = emailCoupon
const autoJoined = await call(signup, { email: 'tayo@example.com' })
check('a free place is claimed at sign-up', autoJoined.body?.licence?.full, true)
check('and the code goes straight out', emailsTo('tayo@example.com')[0]?.subject, 'Your Brainy access code')
delete process.env.SIGNUP_COUPON

process.env.OPERATOR_EMAIL = 'boss@example.com'
await call(signup, { email: 'seyi@example.com' })
check('the operator hears about it too', emailsTo('boss@example.com').length, 1)
delete process.env.OPERATOR_EMAIL

// A grant from the dashboard emails the code, because the code is the point of
// having made the grant.
const byHand = await call(
  admin,
  { email: 'grace@example.com', plan: 'lifetime' },
  { url: '/api/admin/licence/grant', headers: authed },
)
check('a grant emails the family', emailsTo('grace@example.com').length, 1)
check('and reports that it did', byHand.body?.emailed, true)
check(
  'unless asked not to',
  (
    await call(
      admin,
      { email: 'quiet@example.com', plan: 'annual', notify: false },
      { url: '/api/admin/licence/grant', headers: authed },
    )
  ).body?.emailed,
  false,
)
check('and then nothing is sent', emailsTo('quiet@example.com').length, 0)

// "I have a new tablet and I cannot find the code" — the commonest support
// request there will ever be.
check(
  'a code can be sent again on request',
  (await call(admin, { code: byHand.body.licence.code }, { url: '/api/admin/licence/email', headers: authed })).status,
  200,
)
check('and arrives a second time', emailsTo('grace@example.com').length, 2)
check(
  'but never for a licence that is not live',
  (await call(admin, { code: FAMILY_CODE }, { url: '/api/admin/licence/revoke', headers: authed })).status,
  200,
)
check(
  'because that would be a lie in writing',
  (await call(admin, { code: FAMILY_CODE }, { url: '/api/admin/licence/email', headers: authed })).status,
  409,
)
await call(admin, { code: FAMILY_CODE }, { url: '/api/admin/licence/restore', headers: authed })

const wiring = await call(admin, {}, { method: 'GET', url: '/api/admin/overview', headers: authed })
check('the dashboard can see email is on', wiring.body?.email?.configured, true)

/* ------------------------------------------------------------------ *
 * Paying, end to end
 *
 * With Paystack stubbed, this is the whole path a buying parent takes:
 * checkout, return to the app, licence, receipt. The assertions that matter
 * most are the ones about doing it twice — a webhook and the app's own return
 * both arrive, and one payment must buy exactly one year.
 * ------------------------------------------------------------------ */

console.log('\nPaying')
process.env.PAYSTACK_SECRET_KEY = 'sk_test_smoke'

const started = await call(payInit, { email: 'buyer@example.com', plan: 'annual', name: 'Buyer' })
check('checkout starts', started.status, 200)
check('the amount is decided here', started.body?.amount, 500_000)
check('and a reference minted', String(started.body?.reference ?? '').startsWith('brainy_'), true)
const REFERENCE = started.body.reference
check('nothing is granted yet', (await call(activateRoute, {}, { method: 'GET', url: `/api/activate?code=${started.body.code}` })).body?.licence?.full, false)

const settled = await call(activateRoute, {}, { method: 'GET', url: `/api/activate?reference=${REFERENCE}` })
check('coming back from Paystack grants it', settled.body?.licence?.full, true)
check('on the plan that was paid for', settled.body?.licence?.plan, 'annual')
check('a receipt goes out', emailsTo('buyer@example.com')[0]?.subject, 'Your Brainy licence — payment received')
check('naming the amount', emailsTo('buyer@example.com')[0]?.text.includes('₦5,000'), true)
check('and carrying the code', emailsTo('buyer@example.com')[0]?.text.includes(settled.body.licence.code), true)

// The race: the webhook arrives after the app already settled the same
// reference. One payment, one year — not two.
const hookAfter = { event: 'charge.success', data: { reference: REFERENCE } }
const hookSig = crypto.createHmac('sha512', 'sk_test_smoke').update(JSON.stringify(hookAfter)).digest('hex')
check(
  'a late webhook is accepted',
  (await call(payHook, hookAfter, { headers: { 'x-paystack-signature': hookSig } })).status,
  200,
)
const afterHook = await call(activateRoute, {}, { method: 'GET', url: `/api/activate?code=${settled.body.licence.code}` })
check('but buys no second year', afterHook.body?.licence?.expiresAt, settled.body?.licence?.expiresAt)
check('and sends no second receipt', emailsTo('buyer@example.com').length, 1)

// Paying less than the plan costs must not buy it. Should be impossible, since
// the amount is set server-side — which is exactly why it is worth asserting.
paidAmount = 100
const short = await call(payInit, { email: 'short@example.com', plan: 'annual' })
const shortResult = await call(activateRoute, {}, { method: 'GET', url: `/api/activate?reference=${short.body.reference}` })
check('an underpayment grants nothing', shortResult.status, 402)
check('and no licence is issued', (await call(admin, {}, { method: 'GET', url: '/api/admin/families?q=short@example.com', headers: authed })).body?.families?.[0]?.status, 'pending')
paidAmount = 500_000

delete process.env.PAYSTACK_SECRET_KEY

/* ------------------------------------------------------------------ *
 * Bank transfers
 *
 * The path with a human in it, and the one where being wrong costs a family
 * real money. What matters here is that submitting a claim grants nothing at
 * all — a parent typing "I paid ten million naira" must end up with exactly
 * what an admin says they have and not a penny more.
 * ------------------------------------------------------------------ */

console.log('\nBank transfers')
check(
  'hidden until an account is configured',
  (await call(payRequest, { email: 'kemi@example.com', plan: 'annual' })).status,
  503,
)

process.env.BANK_NAME = 'Test Bank'
process.env.BANK_ACCOUNT_NAME = 'Fortbridge Technologies Ltd'
process.env.BANK_ACCOUNT_NUMBER = '0123456789'

check('the app is told where to pay', (await call(payInit, {}, { method: 'GET' })).body?.transfer?.enabled, true)
check(
  'and the account number',
  (await call(payInit, {}, { method: 'GET' })).body?.transfer?.accountNumber,
  '0123456789',
)
check('GET refused on the claim route', (await call(payRequest, {}, { method: 'GET' })).status, 405)
check('a claim needs an email', (await call(payRequest, { plan: 'annual' })).status, 400)
check('and a real plan', (await call(payRequest, { email: 'kemi@example.com', plan: 'gold' })).status, 400)

const claimed = await call(payRequest, {
  email: 'kemi@example.com',
  name: 'Kemi',
  plan: 'annual',
  senderName: 'K ADEYEMI',
  reference: 'TRF-9931',
  paidOn: today,
  proof: Buffer.from('pretend-screenshot').toString('base64'),
  proofType: 'image/png',
})
check('a claim is accepted', claimed.status, 200)
// The whole point of the flow: telling us is not paying us.
check('but grants nothing', claimed.body?.status, 'pending')
check('the family is told so by email', emailsTo('kemi@example.com')[0]?.subject, 'We have your payment details — checking now')
check('and told plainly nothing is open', emailsTo('kemi@example.com')[0]?.text.includes('Nothing is unlocked yet'), true)
check(
  'they have no licence yet',
  (await call(admin, {}, { method: 'GET', url: '/api/admin/families?q=kemi@example.com', headers: authed }))
    .body?.families?.[0]?.status,
  'pending',
)
check('rubbish attachments are refused', (await call(payRequest, { email: 'kemi@example.com', plan: 'annual', proof: 'not base64 %%%', proofType: 'image/png' })).status, 400)
check(
  'and unexpected file types',
  (await call(payRequest, { email: 'kemi@example.com', plan: 'annual', proof: 'AAAA', proofType: 'application/zip' })).status,
  400,
)

// Submitting twice must leave one thing for a human to look at, not two.
await call(payRequest, { email: 'kemi@example.com', plan: 'annual', senderName: 'K ADEYEMI (again)' })
const queue = await call(admin, {}, { method: 'GET', url: '/api/admin/transfers', headers: authed })
check('one request per family', queue.body?.transfers?.filter((t) => t.email === 'kemi@example.com').length, 1)
check('the newer details win', queue.body?.transfers?.[0]?.sender_name, 'K ADEYEMI (again)')
check('the receipt is kept through a resubmit', queue.body?.transfers?.[0]?.has_proof, true)
check('it is waiting for review', queue.body?.transfers?.[0]?.status, 'pending')
check('and shows on the front page', (await call(admin, {}, { method: 'GET', url: '/api/admin/overview', headers: authed })).body?.transfersPending, 1)

const REQUEST_ID = queue.body.transfers[0].id
const approved = await call(admin, { id: REQUEST_ID }, { url: '/api/admin/transfers/approve', headers: authed })
check('approving grants the licence', approved.body?.licence?.full, true)
check('on the plan they paid for', approved.body?.licence?.plan, 'annual')
/* Found by subject rather than by position: resubmitting the claim above sent a
   second acknowledgement, which is right — they did resubmit. */
const kemiReceipt = emailsTo('kemi@example.com').find((m) => m.subject.startsWith('Your Brainy licence'))
check('and emails them the code', Boolean(kemiReceipt), true)
check('carrying the actual code', kemiReceipt?.text.includes(approved.body.licence.code), true)
check('acknowledged both submissions', emailsTo('kemi@example.com').filter((m) => m.subject.startsWith('We have your')).length, 2)
check(
  'approving twice is refused',
  (await call(admin, { id: REQUEST_ID }, { url: '/api/admin/transfers/approve', headers: authed })).status,
  409,
)
check(
  'and it counts as money taken',
  (await call(admin, {}, { method: 'GET', url: '/api/admin/payments', headers: authed })).body?.payments?.some(
    (p) => p.reference === `transfer_${REQUEST_ID}`,
  ),
  true,
)

const declining = await call(payRequest, { email: 'bode@example.com', plan: 'lifetime' })
check('a second family claims', declining.status, 200)
const bodeId = (await call(admin, {}, { method: 'GET', url: '/api/admin/transfers?status=pending', headers: authed }))
  .body?.transfers?.[0]?.id
const declined = await call(
  admin,
  { id: bodeId, note: 'We could not see the transfer on our statement.' },
  { url: '/api/admin/transfers/decline', headers: authed },
)
check('declining is accepted', declined.status, 200)
const bodeNote = emailsTo('bode@example.com').find((m) => m.subject === 'About your Brainy payment')
check('they are told why', Boolean(bodeNote), true)
check('with the reason in it', bodeNote?.text.includes('could not see the transfer'), true)
check(
  'and still have no licence',
  (await call(admin, {}, { method: 'GET', url: '/api/admin/families?q=bode@example.com', headers: authed }))
    .body?.families?.[0]?.status,
  'pending',
)
check('the queue is empty again', (await call(admin, {}, { method: 'GET', url: '/api/admin/overview', headers: authed })).body?.transfersPending, 0)

console.log('\nRenewal warnings')
check(
  'the cron refuses to run without a secret',
  (await call(cron, {}, { method: 'GET', url: '/api/cron/expiring' })).status,
  503,
)
process.env.CRON_SECRET = 'cron-secret-smoke'
check(
  'and refuses a wrong one',
  (await call(cron, {}, { method: 'GET', url: '/api/cron/expiring', headers: { authorization: 'Bearer nope' } })).status,
  401,
)

const cronAuth = { authorization: 'Bearer cron-secret-smoke' }
check('nothing is due yet', (await call(cron, {}, { method: 'GET', url: '/api/cron/expiring', headers: cronAuth })).body?.sent, 0)

// Bring one licence's expiry inside the window, the way three hundred and
// fifty-eight days of waiting would.
const soon = new Date(Date.now() + 3 * 86_400_000).toISOString()
mem.public.none(`update subscriptions set expires_at = '${soon}' where code = '${granted.body.licence.code}'`)

const warned = await call(cron, {}, { method: 'GET', url: '/api/cron/expiring', headers: cronAuth })
check('a lapse coming up is warned about', warned.body?.sent, 1)
check('with the days left in the subject', emailsTo('dele@example.com')[0]?.subject, 'Brainy: your access runs out in 3 days')
check(
  'and says what will not be lost',
  emailsTo('dele@example.com')[0]?.text.includes('Mathematics stays free'),
  true,
)
// Runs daily, so warning once is the whole job.
check(
  'running again warns nobody twice',
  (await call(cron, {}, { method: 'GET', url: '/api/cron/expiring', headers: cronAuth })).body?.sent,
  0,
)
check(
  'extending clears the warning',
  (await call(admin, { code: granted.body.licence.code, months: 12, notify: false }, { url: '/api/admin/licence/extend', headers: authed })).status,
  200,
)
mem.public.none(`update subscriptions set expires_at = '${soon}' where code = '${granted.body.licence.code}'`)
check(
  'so a later year gets its own',
  (await call(cron, {}, { method: 'GET', url: '/api/cron/expiring', headers: cronAuth })).body?.sent,
  1,
)

globalThis.fetch = realFetch
delete process.env.RESEND_API_KEY
delete process.env.CRON_SECRET

/*
 * Last, because it deliberately creates a pile of junk rows: the public write
 * endpoints are counted per caller, and the count only means anything when a
 * forwarded address is present. Everything asserting totals runs above this.
 */
console.log('\nAbuse')
const flooding = { 'x-forwarded-for': '203.0.113.9' }
let refused = 0
for (let i = 0; i < 13; i++) {
  const r = await call(signup, { email: `flood-${i}@example.com` }, { headers: flooding })
  if (r.status === 429) refused += 1
}
check('a flood of sign-ups is throttled', refused > 0, true)
// Codes count failures only, on their own counter, so a family fumbling their
// own code twice is never locked out of an app they paid for.
let guesses = 0
for (let i = 0; i < 18; i++) {
  const r = await call(activateRoute, { code: `BRN-AAAA-${String(1000 + i)}` }, { headers: flooding })
  if (r.status === 429) guesses += 1
}
check('and code guessing is too', guesses > 0, true)
check(
  'but a family with no proxy header is not blocked',
  (await call(activateRoute, {}, { method: 'GET', url: `/api/activate?code=${FAMILY_CODE}` })).status,
  200,
)

console.log('\nAdmin routing and coupon deletion')
/*
 * Production routes two-part admin paths through a rewrite that arrives as
 * ?path=coupons/active. That form was never exercised here, which is exactly
 * how a platform-level 404 on every two-part admin route survived to
 * production while this suite stayed green.
 */
check(
  'resolves the rewritten ?path= form',
  (await call(admin, { code: 'NOPE-NOPE', active: false }, { url: '/api/admin?path=coupons/active', headers: authed })).status,
  404,
)
check(
  'and still resolves a direct path',
  (await call(admin, { code: 'NOPE-NOPE', active: false }, { url: '/api/admin/coupons/active', headers: authed })).status,
  404,
)
check(
  'unknown route is our 404, not a blank one',
  (await call(admin, {}, { url: '/api/admin?path=no/such/thing', headers: authed })).body?.error?.startsWith('No admin route'),
  true,
)

const SPARE = 'SPARE-DELETE-ME'
check('a spare coupon to delete', (await call(admin, { code: SPARE, plan: 'annual' }, { url: '/api/admin/coupons', headers: authed })).status, 200)
check('an unused one deletes', (await call(admin, { code: SPARE }, { url: '/api/admin?path=coupons/delete', headers: authed })).status, 200)
check('and is gone', (await call(admin, {}, { method: 'GET', url: '/api/admin/coupons', headers: authed })).body?.coupons?.some((c) => c.code === SPARE), false)
check('deleting it twice 404s', (await call(admin, { code: SPARE }, { url: '/api/admin?path=coupons/delete', headers: authed })).status, 404)
// The one that matters: a claimed coupon is the record behind somebody's access.
check('a used coupon is protected', (await call(admin, { code: COUPON }, { url: '/api/admin?path=coupons/delete', headers: authed })).status, 409)
check('and survives the attempt', (await call(admin, {}, { method: 'GET', url: '/api/admin/coupons', headers: authed })).body?.coupons?.some((c) => c.code === COUPON), true)

console.log('\nRetention')
process.env.CRON_SECRET = 'cron-secret'
const cronHeaders = { authorization: 'Bearer cron-secret' }
check('unauthorised refused', (await call(retain, {}, { method: 'POST', url: '/api/cron/retain' })).status, 401)

// A dry run must count without deleting, and every rule must be valid SQL
// against the real schema — the point of running it here at all.
const dryRun = await call(retain, {}, { method: 'POST', url: '/api/cron/retain?dry=1', headers: cronHeaders })
check('dry run allowed', dryRun.status, 200)
check('dry run says so', dryRun.body?.dry, true)
check('every rule ran', Object.keys(dryRun.body?.rows ?? {}).length, 10)

/*
 * The assertion that matters. A retention job that quietly deletes nothing
 * passes every check above, so plant a genuinely old row and require that it
 * goes — otherwise the privacy notice is making a promise nothing keeps.
 */
const OLD_DAY = new Date(Date.now() - 500 * 86_400_000).toISOString().slice(0, 10)
await call(event, { installId: 'install-ancient', app: 'v1.0', day: OLD_DAY, kind: 'session', subject: 'maths', questions: 5, correct: 5, durationMs: 1000 })
const beforePurge = await call(retain, {}, { method: 'POST', url: '/api/cron/retain?dry=1', headers: cronHeaders })
check('spots the old event', beforePurge.body?.rows?.['usage events'], 1)

const live = await call(retain, {}, { method: 'POST', url: '/api/cron/retain', headers: cronHeaders })
check('live run allowed', live.status, 200)
// Nothing in this harness is old enough to be caught, which is itself the
// check that matters: a retention job that deletes today's data is a bug.
check('deletes the old event', live.body?.rows?.['usage events'], 1)
// The tablet that sent it was last seen the same day, so the dormant-install
// rule correctly takes the install row with it.
check('deletes the dormant install', live.body?.rows?.['dormant installs'], 1)
// And nothing else: everything remaining in this harness is recent.
check('touches nothing recent', live.body?.total, 2)
check('nothing left to purge', (await call(retain, {}, { method: 'POST', url: '/api/cron/retain?dry=1', headers: cronHeaders })).body?.total, 0)
const stillThere = await call(stats, {}, { method: 'GET', url: '/api/stats', headers: { 'x-admin-token': 'test-token-long-enough-to-be-allowed' } })
check('recent install survives', stillThere.body?.installs?.total, 1)

console.log()
if (problems.length) {
  console.log(`✖ ${problems.length} problem(s): ${problems.join(', ')}`)
  process.exit(1)
}
console.log('✔ API routes behave correctly against a real schema.')
