/**
 * Who is allowed into the admin API.
 *
 * A shared token in a query string was fine when the dashboard only showed
 * anonymous counts. It is not fine now: these routes grant licences, void
 * them, and read a list of parents' email addresses. So admins are real rows
 * with hashed passwords, and a login exchanges those for a short-lived signed
 * cookie rather than putting a long-lived secret in every request.
 *
 * What this deliberately is *not*: a user system. There is no self-service
 * sign-up, no password reset by email (there is no mail sender), and no roles.
 * Accounts are created by whoever holds the environment variables.
 */

import crypto from 'node:crypto'
import { promisify } from 'node:util'
import { audit, one, query } from './_db.js'
import { clip, email as parseEmail, ipHash } from './_http.js'

const scrypt = promisify(crypto.scrypt)

export const COOKIE = 'brainy_admin'
const SESSION_HOURS = 12
/** Short enough that a shared laptop is not a standing invitation. */
const SESSION_MS = SESSION_HOURS * 60 * 60 * 1000
const MIN_PASSWORD = 10
/** Failed logins allowed from one caller before it stops answering. */
const LOGIN_LIMIT = 10
const LOGIN_WINDOW_MIN = 15

/**
 * The key that signs session cookies.
 *
 * Derived from `ADMIN_TOKEN` when a dedicated secret is not set, so an
 * existing deployment keeps working — but derived, not reused verbatim, so the
 * value that guards machine access is not itself a cookie-forging key.
 */
export function sessionSecret() {
  const explicit = process.env.ADMIN_SESSION_SECRET
  if (explicit) return explicit
  const token = process.env.ADMIN_TOKEN
  if (!token) return null
  return crypto.createHash('sha256').update(`brainy-session:${token}`).digest('base64url')
}

/* ------------------------------------------------------------------ *
 * Passwords
 * ------------------------------------------------------------------ */

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const derived = await scrypt(password, salt, 32)
  return `s1$${salt.toString('base64url')}$${derived.toString('base64url')}`
}

export async function verifyPassword(password, stored) {
  const parts = String(stored ?? '').split('$')
  if (parts.length !== 3 || parts[0] !== 's1') return false
  const salt = Buffer.from(parts[1], 'base64url')
  const expected = Buffer.from(parts[2], 'base64url')
  const derived = await scrypt(password, salt, expected.length)
  return expected.length > 0 && crypto.timingSafeEqual(derived, expected)
}

/* ------------------------------------------------------------------ *
 * Sessions
 * ------------------------------------------------------------------ */

const sign = (payload, secret) =>
  crypto.createHmac('sha256', secret).update(payload).digest('base64url')

export function issueSession(res, admin) {
  const secret = sessionSecret()
  const body = Buffer.from(
    JSON.stringify({ email: admin.email, name: admin.name ?? null, exp: Date.now() + SESSION_MS }),
  ).toString('base64url')
  const value = `${body}.${sign(body, secret)}`

  /*
   * SameSite=Strict is doing the CSRF work here: every admin call is a
   * same-origin fetch from /admin, so there is no legitimate cross-site
   * request to break, and a form posted from another site arrives with no
   * cookie at all.
   */
  const secure = process.env.NODE_ENV === 'production' || !/localhost|127\.0\.0\.1/.test(String(process.env.VERCEL_URL ?? 'x'))
  res.setHeader(
    'Set-Cookie',
    [
      `${COOKIE}=${value}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Strict',
      secure ? 'Secure' : '',
      `Max-Age=${Math.floor(SESSION_MS / 1000)}`,
    ]
      .filter(Boolean)
      .join('; '),
  )
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`)
}

function readCookie(req, name) {
  const header = req.headers?.cookie
  if (!header) return null
  for (const part of String(header).split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return rest.join('=')
  }
  return null
}

/** The signed-in admin, or null. Never throws on a malformed cookie. */
export function readSession(req) {
  const secret = sessionSecret()
  if (!secret) return null
  const raw = readCookie(req, COOKIE)
  if (!raw) return null
  const [body, mac] = raw.split('.')
  if (!body || !mac) return null

  const expected = sign(body, secret)
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (!payload?.email || !payload?.exp || payload.exp < Date.now()) return null
    return { email: payload.email, name: payload.name ?? null }
  } catch {
    return null
  }
}

/**
 * Guard for every admin route.
 *
 * Answers the request itself when the caller is not allowed in, and returns
 * null — so a handler is one `if (!admin) return` away from being safe.
 */
export function requireAdmin(req, res) {
  const secret = sessionSecret()
  if (!secret) {
    res.status(503).json({
      ok: false,
      error: 'Neither ADMIN_SESSION_SECRET nor ADMIN_TOKEN is set on this deployment.',
    })
    return null
  }

  /*
   * A machine credential alongside the cookie, for curl and cron. It is the
   * same trust level as the cookie key it derives from, so it buys convenience
   * without widening what an attacker needs.
   */
  const token = process.env.ADMIN_TOKEN
  const given = req.headers?.['x-admin-token']
  if (token && typeof given === 'string' && given.length === token.length) {
    if (crypto.timingSafeEqual(Buffer.from(given), Buffer.from(token))) {
      return { email: 'machine', name: 'machine token' }
    }
  }

  const session = readSession(req)
  if (!session) {
    res.status(401).json({ ok: false, error: 'Not signed in.' })
    return null
  }
  return session
}

/* ------------------------------------------------------------------ *
 * Accounts
 * ------------------------------------------------------------------ */

/**
 * Make sure the account named in the environment exists and matches.
 *
 * `ADMIN_EMAIL` and `ADMIN_PASSWORD` are the source of truth for that one
 * account: changing them in the dashboard changes the login, which is the only
 * password reset available when there is no mail sender. Other admins created
 * later are left alone.
 */
export async function seedAdmin() {
  const address = parseEmail(process.env.ADMIN_EMAIL)
  const password = process.env.ADMIN_PASSWORD
  if (!address || !password) return { seeded: false, reason: 'ADMIN_EMAIL and ADMIN_PASSWORD are not both set' }
  if (password.length < MIN_PASSWORD) {
    return { seeded: false, reason: `ADMIN_PASSWORD must be at least ${MIN_PASSWORD} characters` }
  }

  const existing = await one(`select id, pw_hash from admin_users where email = $1`, [address])
  if (existing && (await verifyPassword(password, existing.pw_hash))) return { seeded: true }

  const hash = await hashPassword(password)
  if (existing) {
    await query(`update admin_users set pw_hash = $2 where id = $1`, [existing.id, hash])
    await audit('system', 'admin.password-synced', address, 'from ADMIN_PASSWORD')
  } else {
    await query(`insert into admin_users (email, pw_hash, name) values ($1, $2, $3)`, [
      address,
      hash,
      clip(process.env.ADMIN_NAME, 80),
    ])
    await audit('system', 'admin.created', address, 'from ADMIN_EMAIL')
  }
  return { seeded: true }
}

/* ------------------------------------------------------------------ *
 * Rate limiting
 *
 * Every public write — sign up, redeem a code, start a payment — is a row a
 * stranger can create, so each one is counted per caller. The counter lives in
 * Postgres rather than in memory because serverless functions do not share
 * memory: an in-process limiter on this platform limits nothing.
 *
 * Keyed on a hashed IP, so the thing being counted cannot be read back as an
 * address. See ipHash in _http.js.
 * ------------------------------------------------------------------ */

/** True when this caller has done too much of `bucket` recently. */
export async function rateLimited(req, bucket, limit, windowMin = 15) {
  const hash = ipHash(req, sessionSecret() ?? 'brainy')
  // No forwarded address at all — local development, or a platform that does
  // not set one. Refusing everyone would be worse than counting nobody.
  if (!hash) return false
  const since = new Date(Date.now() - windowMin * 60 * 1000).toISOString()
  const row = await one(
    `select count(*)::int as n from code_attempts where ip_hash = $1 and created_at >= $2`,
    [`${bucket}:${hash}`, since],
  )
  return (row?.n ?? 0) >= limit
}

export async function noteAttempt(req, bucket) {
  const hash = ipHash(req, sessionSecret() ?? 'brainy')
  await query(`insert into code_attempts (ip_hash) values ($1)`, [hash ? `${bucket}:${hash}` : null])
}

export const loginBlocked = (req) => rateLimited(req, 'login', LOGIN_LIMIT, LOGIN_WINDOW_MIN)
export const noteFailedLogin = (req) => noteAttempt(req, 'login')
