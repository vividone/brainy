/**
 * Checks a deployment from the outside.
 *
 *   npm run preflight -- https://brainy.fortbridge.app
 *   npm run preflight                      (defaults to the production domain)
 *
 * Answers the question you actually have after setting a dozen environment
 * variables: which of them landed? Every check is a real HTTP request to the
 * running site, so it catches the things a build cannot — a database URL that is
 * unpooled, a Resend key that was pasted with a trailing space, a Paystack key
 * that is still the test one, a `SIGNUP_COUPON` naming a coupon nobody created.
 *
 * **Read-only and safe to run against production.** It creates nothing, changes
 * nothing, and sends no email. The one authenticated section needs `ADMIN_TOKEN`
 * in the environment and is skipped without it — so the default run is something
 * you can hand to anybody.
 */

const target = (process.argv[2] ?? process.env.PUBLIC_BASE_URL ?? 'https://brainy.fortbridge.app')
  .trim()
  .replace(/\/+$/, '')

const token = process.env.ADMIN_TOKEN

const problems = []
const warnings = []

const pass = (label, detail) => console.log(`  ✔ ${label.padEnd(42)} ${detail ?? ''}`)
const fail = (label, detail) => {
  console.log(`  ✖ ${label.padEnd(42)} ${detail ?? ''}`)
  problems.push(label)
}
const warn = (label, detail) => {
  console.log(`  · ${label.padEnd(42)} ${detail ?? ''}`)
  warnings.push(label)
}

async function get(path, init) {
  const res = await fetch(`${target}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), ...(token ? { 'x-admin-token': token } : {}) },
    redirect: 'manual',
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* HTML pages are checked by status and content, not by parsing. */
  }
  return { status: res.status, text, json }
}

console.log(`\nBrainy preflight — ${target}\n`)

/* ------------------------------------------------------------------ *
 * The pages
 * ------------------------------------------------------------------ */

/*
 * Which half of the deployment is this?
 *
 * The site and the API are two origins now: Vercel serves the pages and proxies
 * `/api/*` to Railway. Pointed at the API host, every page check below is a
 * meaningless 404 — and reporting four failures for "this origin was never
 * supposed to serve pages" trains people to ignore the output, which is worse
 * than not checking.
 */
const home = await get('/')
const servesPages = home.status === 200 && /<html/i.test(home.text)

if (!servesPages) {
  console.log('Pages')
  console.log('  · this origin serves no pages — checking it as an API-only host')
  console.log('    (run it against https://brainy.fortbridge.app as well, for the site)')
}

if (servesPages) {
console.log('Pages')
{
  home.text.includes('Brainy')
    ? pass('landing page', `${home.status}`)
    : fail('landing page', 'served, but does not look like Brainy')

  const play = await get('/play/')
  play.status === 200 ? pass('the app at /play/', `${play.status}`) : fail('the app at /play/', `${play.status}`)

  const admin = await get('/admin')
  admin.status === 200 ? pass('/admin loads', `${admin.status}`) : fail('/admin loads', `${admin.status}`)

  const privacy = await get('/privacy.html')
  privacy.status === 200 ? pass('privacy notice', `${privacy.status}`) : fail('privacy notice', `${privacy.status}`)

  /* The invariant the build enforces, re-checked against what is actually
     being served — a stale deploy or a rewrite rule could break it. */
  const analytics = await get('/analytics.js')
  if (analytics.status !== 200) {
    warn('analytics.js', 'not served — analytics are off')
  } else if (/G-[A-Z0-9]+/.test(analytics.text)) {
    pass('analytics.js', (analytics.text.match(/G-[A-Z0-9]+/) ?? [''])[0])
  } else {
    warn('analytics.js', 'served with no measurement id')
  }

  const playHtml = await get('/play/index.html')
  const leaked = /googletagmanager|gtag\(/.test(playHtml.text)
  if (leaked) fail('no Google script in the app', 'FOUND ONE — the app must stay clean')
  else pass('no Google script in the app', 'as promised')
}
}

/* ------------------------------------------------------------------ *
 * The API
 * ------------------------------------------------------------------ */

/*
 * Is there an API here at all?
 *
 * `npm run serve` is a static file server, so every /api path 404s — six
 * confusing failures whose real cause is one thing. Detected once, said once,
 * and the sections that depend on it are skipped rather than reported as broken.
 */
const probe = await get('/api/pay/initialise')
const hasApi = probe.json !== null

if (!hasApi) {
  console.log('\nAPI')
  warn('no functions at this origin', `${probe.status} and not JSON`)
  console.log(
    `\n  · ${target} serves files but no /api routes. That is what \`npm run serve\` does —` +
      '\n    point this at a real deployment to check the database, email and payments.',
  )
}

async function checkApi() {
  console.log('\nAPI')

  /* Usage ingest is the one endpoint that must never fail a family, so it
     answers 200 even with no database behind it. */
  const ping = await get('/api/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'nope' }),
  })
  ping.status === 400
    ? pass('usage ingest rejects rubbish', '400')
    : fail('usage ingest rejects rubbish', `${ping.status}`)

  /*
   * A 404 here means "the database was reached and does not know that code" —
   * but only if the answer is *our* JSON. A plain 404 from a static host looks
   * identical and means the opposite, so the body is what is checked.
   */
  const unknown = await get('/api/activate?code=BRN-ZZZZ-ZZZZ')
  if (unknown.status === 404 && unknown.json?.ok === false) pass('licence lookup', 'reaches the database')
  else if (unknown.status === 503) fail('licence lookup', 'DATABASE_URL is not set or unreachable')
  else fail('licence lookup', `unexpected ${unknown.status}`)

  const unsigned = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'charge.success', data: { reference: 'preflight' } }),
  }
  const webhook = await get('/api/pay/webhook', unsigned)
  if (webhook.status === 401) pass('webhook refuses unsigned calls', '401')
  else if (webhook.status === 503) warn('webhook', 'PAYSTACK_SECRET_KEY is not set')
  else fail('webhook refuses unsigned calls', `${webhook.status} — investigate before taking money`)

  /*
   * The short path Paystack is actually registered against, checked separately.
   * A rewrite that is missing or misspelt fails in the worst possible way: every
   * webhook 404s, no error is raised anywhere, and payments simply stop settling
   * until somebody notices the money is not appearing.
   */
  const alias = await get('/api/webhook', unsigned)
  if (alias.status === webhook.status) pass('/api/webhook alias', `matches (${alias.status})`)
  else if (alias.status === 404) {
    fail('/api/webhook alias', 'not routed — check the entry in server/routes.js')
  } else fail('/api/webhook alias', `${alias.status}, but /api/pay/webhook gave ${webhook.status}`)

  const cron = await get('/api/cron/expiring')
  if (cron.status === 401) pass('renewal cron is guarded', '401')
  else if (cron.status === 503) warn('renewal cron', 'CRON_SECRET is not set — no renewal warnings')
  else fail('renewal cron is guarded', `${cron.status} — it must not be open`)

  /* The reminder pass is the one that sends notifications, so an open one would
     be a stranger's button for pushing to every family we have. */
  const remind = await get('/api/cron/remind')
  if (remind.status === 401) pass('reminder cron is guarded', '401')
  else if (remind.status === 503) warn('reminder cron', 'CRON_SECRET is not set — no daily reminders')
  else fail('reminder cron is guarded', `${remind.status} — it must not be open`)

  const push = await get('/api/push/key')
  if (push.json?.enabled) pass('daily reminders are configured', 'VAPID keys present')
  else warn('daily reminders', 'no VAPID keys — the reminder switch stays hidden from parents')
}

/* ------------------------------------------------------------------ *
 * What is switched on
 * ------------------------------------------------------------------ */

async function checkWiring() {
  console.log('\nWiring')

  const prices = probe
  if (prices.status !== 200 || !prices.json?.ok) {
    fail('price list', `${prices.status}`)
  } else {
    const { enabled, currency, plans, transfer } = prices.json
    enabled ? pass('card checkout', 'Paystack key present') : warn('card checkout', 'off — coupons and transfers only')
    plans?.length
      ? pass('prices', plans.map((p) => `${p.id} ${(p.amount / 100).toLocaleString()} ${currency}`).join(' · '))
      : fail('prices', 'no sellable plans')
    transfer?.enabled
      ? pass('bank transfer', `${transfer.bank} · ${transfer.accountNumber}`)
      : warn('bank transfer', 'off — BANK_NAME / BANK_ACCOUNT_NAME / BANK_ACCOUNT_NUMBER not all set')
  }

  const me = await get('/api/admin/me')
  me.status === 401
    ? pass('admin needs a session', '401 without a cookie')
    : fail('admin needs a session', `${me.status} — /api/admin/me must not be open`)

  /* Proves the database is reachable AND an admin account exists, without
     logging in: a wrong password is 401, a missing account is 503. */
  const login = await get('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'preflight@example.invalid', password: 'not-the-password' }),
  })
  if (login.status === 401) pass('admin account exists', 'a wrong password is refused')
  else if (login.status === 503) fail('admin account', login.json?.error ?? 'ADMIN_EMAIL / ADMIN_PASSWORD not set')
  else if (login.status === 429) warn('admin account', 'rate-limited — try again in a few minutes')
  else fail('admin account', `unexpected ${login.status}`)
}

if (hasApi) {
  await checkApi()
  await checkWiring()
}

/* ------------------------------------------------------------------ *
 * With a token, the things only an admin can see
 * ------------------------------------------------------------------ */

if (!hasApi) {
  /* Nothing to say — the message above already explained why. */
} else if (!token) {
  console.log('\n  · set ADMIN_TOKEN to also check email delivery, free places and pending work')
} else {
  console.log('\nBehind the login')
  const overview = await get('/api/admin/overview')
  if (overview.status !== 200 || !overview.json?.ok) {
    fail('admin overview', overview.json?.error ?? `${overview.status}`)
  } else {
    const o = overview.json
    o.email?.configured
      ? pass('email to families', o.email.from ?? 'configured')
      : fail('email to families', 'RESEND_API_KEY not set — nobody gets their code')
    o.email?.operator ? pass('copies to you', 'on') : warn('copies to you', 'OPERATOR_EMAIL not set')
    o.email?.reminders ? pass('renewal warnings', 'on') : warn('renewal warnings', 'CRON_SECRET not set')

    if (!o.signupCoupon) {
      warn('free places on sign-up', 'SIGNUP_COUPON not set')
    } else if (o.signupCoupon.missing) {
      fail('free places on sign-up', `SIGNUP_COUPON names ${o.signupCoupon.code}, which does not exist`)
    } else {
      const left = o.signupCoupon.max_uses - o.signupCoupon.uses
      pass('free places on sign-up', `${o.signupCoupon.code} · ${left} left`)
    }

    pass('parents signed up', String(o.parents?.total ?? 0))
    if (o.transfersPending > 0) warn('transfers waiting', `${o.transfersPending} to check`)
    else pass('transfers waiting', 'none')
  }
}

/* ------------------------------------------------------------------ */

console.log()
if (problems.length > 0) {
  console.log(`✖ ${problems.length} problem(s): ${problems.join(', ')}`)
  if (warnings.length > 0) console.log(`  (${warnings.length} thing(s) switched off, listed above)`)
  process.exit(1)
}
console.log(
  warnings.length > 0
    ? `✔ Nothing broken. ${warnings.length} thing(s) switched off — fine if that was deliberate.`
    : '✔ Everything is wired up.',
)
