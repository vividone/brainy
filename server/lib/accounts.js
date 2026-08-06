/**
 * Parent accounts: a six-digit code by email, then a per-device token.
 *
 * There is no password in this design, and that is deliberate rather than lazy.
 * The people signing in are parents on a shared family tablet, often typing on a
 * touch keyboard, and a password would mostly be a thing to forget — at which
 * point the recovery flow *is* this flow, with more steps in front of it. Sign-up
 * and sign-in are also the same act here: proving you can read an inbox both
 * creates the account and returns you to it.
 *
 * Two different hashing decisions, for two different threats:
 *
 *  - **Codes are HMAC'd with a server-side pepper.** Six digits is a million
 *    possibilities, which a leaked table would let somebody enumerate instantly.
 *    Keying the hash with a secret that lives only in the environment means the
 *    table alone is worth nothing. Codes last fifteen minutes, so if the secret
 *    is ever rotated the blast radius is "some people re-request a code".
 *  - **Device tokens are plain SHA-256.** They are 256 bits of randomness, so
 *    there is no search space to brute-force and a pepper would buy nothing —
 *    while it *would* mean rotating the secret silently signed out every family.
 *
 * The token is a bearer credential held in localStorage, which is exposed to XSS
 * by nature. The mitigations are that the app ships no third-party script and the
 * CSP forbids one; the privacy notice says this plainly rather than implying the
 * token is safer than it is.
 */

import crypto from 'node:crypto'
import { all, one, query } from './db.js'
import { clip } from './http.js'
import { sessionSecret } from './auth.js'

/** How long an emailed code is good for. Long enough to find the email. */
export const CODE_TTL_MIN = 15
/** Wrong guesses allowed against one code before it dies. */
export const MAX_CODE_ATTEMPTS = 5
/** Codes per email address per hour. */
export const CODES_PER_HOUR = 3

const TOKEN_PREFIX = 'bpt_'

/* ------------------------------------------------------------------ *
 * Hashing
 * ------------------------------------------------------------------ */

/**
 * Peppered hash for the six-digit codes.
 *
 * Falls back to an unkeyed hash rather than throwing if no secret is set — the
 * server refuses to start without `ADMIN_SESSION_SECRET`, so this is
 * unreachable in practice, and a crash inside a sign-in would be a worse way to
 * discover a misconfiguration than the boot check already provides.
 */
const hashCode = (email, code) =>
  crypto
    .createHmac('sha256', sessionSecret() ?? 'brainy-unpeppered')
    .update(`${email}:${code}`)
    .digest('hex')

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

const sameHash = (a, b) => {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

/* ------------------------------------------------------------------ *
 * Codes
 * ------------------------------------------------------------------ */

/** Six digits, uniformly distributed, leading zeros kept. */
const sixDigits = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')

/**
 * Mint a code for an address and return the plaintext for the caller to email.
 *
 * Any previous live code for that address is retired first, so there is only ever
 * one working code per inbox. Otherwise requesting a second code — which people
 * do the moment the first is slow — would leave two valid, and the attempt
 * counter would guard a smaller share of the space than it appears to.
 */
export async function issueCode(address) {
  const recent = await one(
    `select count(*)::int as n from auth_codes where email = $1 and created_at >= $2`,
    [address, new Date(Date.now() - 60 * 60 * 1000).toISOString()],
  )
  if ((recent?.n ?? 0) >= CODES_PER_HOUR) {
    return { ok: false, error: 'We have sent several codes to that address already. Try again in an hour.' }
  }

  await query(`update auth_codes set consumed_at = now() where email = $1 and consumed_at is null`, [
    address,
  ])

  const code = sixDigits()
  await query(
    `insert into auth_codes (email, code_hash, expires_at) values ($1, $2, $3)`,
    [address, hashCode(address, code), new Date(Date.now() + CODE_TTL_MIN * 60 * 1000)],
  )
  return { ok: true, code }
}

/**
 * Check a code. Consumes it on success, and counts the attempt either way.
 *
 * The attempt is recorded *before* the comparison, so a process that dies
 * mid-verify has still spent the guess. Cheap insurance against a retry loop
 * being a free oracle.
 */
export async function checkCode(address, code) {
  const row = await one(
    `select * from auth_codes
     where email = $1 and consumed_at is null and expires_at > now()
     order by id desc limit 1`,
    [address],
  )
  if (!row) {
    return { ok: false, error: 'That code has expired. Ask for a new one.' }
  }

  const attempts = row.attempts + 1
  await query(`update auth_codes set attempts = $2 where id = $1`, [row.id, attempts])

  if (attempts > MAX_CODE_ATTEMPTS) {
    await query(`update auth_codes set consumed_at = now() where id = $1`, [row.id])
    return { ok: false, error: 'Too many wrong tries. Ask for a new code.' }
  }

  const given = clip(code, 12)?.replace(/\D/g, '') ?? ''
  if (given.length !== 6 || !sameHash(hashCode(address, given), row.code_hash)) {
    return { ok: false, error: 'That code is not right. Check the email and try again.' }
  }

  await query(`update auth_codes set consumed_at = now() where id = $1`, [row.id])
  return { ok: true }
}

/* ------------------------------------------------------------------ *
 * Device tokens
 * ------------------------------------------------------------------ */

export async function mintToken(parentId, label) {
  const token = TOKEN_PREFIX + crypto.randomBytes(32).toString('base64url')
  await query(`insert into device_tokens (parent_id, token_hash, label) values ($1, $2, $3)`, [
    parentId,
    hashToken(token),
    clip(label, 80),
  ])
  return token
}

/**
 * The parent behind a token, or null.
 *
 * Touches `last_seen` so the retention job can tell a family that stopped using
 * Brainy two years ago from one that opens it every morning.
 */
export async function parentForToken(token) {
  const raw = clip(token, 200)
  if (!raw || !raw.startsWith(TOKEN_PREFIX)) return null

  const row = await one(
    `select t.id as token_id, t.parent_id, p.*
     from device_tokens t
     join parents p on p.id = t.parent_id
     where t.token_hash = $1 and t.revoked_at is null`,
    [hashToken(raw)],
  )
  if (!row) return null

  await query(`update device_tokens set last_seen = now() where id = $1`, [row.token_id])
  return row
}

export async function revokeToken(token) {
  const raw = clip(token, 200)
  if (!raw) return 0
  const result = await query(
    `update device_tokens set revoked_at = now() where token_hash = $1 and revoked_at is null`,
    [hashToken(raw)],
  )
  return result?.rowCount ?? 0
}

export async function revokeAllTokens(parentId) {
  const result = await query(
    `update device_tokens set revoked_at = now() where parent_id = $1 and revoked_at is null`,
    [parentId],
  )
  return result?.rowCount ?? 0
}

export const bearer = (req) => {
  const header = req.headers?.authorization ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(String(header))
  return match ? match[1].trim() : null
}

/**
 * Guard for the account routes.
 *
 * Answers the request itself when the caller is not signed in and returns null,
 * so a handler is one `if (!parent) return` away from being safe — the same shape
 * as `requireAdmin`.
 */
export async function requireParent(req, res) {
  const parent = await parentForToken(bearer(req))
  if (!parent) {
    res.status(401).json({ ok: false, error: 'Sign in again to continue.' })
    return null
  }
  return parent
}

/* ------------------------------------------------------------------ *
 * Preferences
 * ------------------------------------------------------------------ */

/**
 * Whether this account has asked us to keep a child's progress.
 *
 * Absent row means no, which is the point: the default is the private one, and it
 * requires no write to establish. Nothing in the codebase may write to `learners`
 * without consulting this first.
 */
/**
 * What this account has decided about keeping a child's progress.
 *
 * No row means no decision has been made, and the default is **on**: the point
 * of the account is that a new tablet, or the same tablet after installing it to
 * the home screen, picks up where the child left off, and a default of off meant
 * every family discovered that the hard way. An explicit `false` is a parent
 * saying no, and it is honoured for ever, including for a device that has just
 * signed in and would otherwise start uploading again.
 */
export async function prefsFor(parentId) {
  const row = await one(`select keep_progress from account_prefs where parent_id = $1`, [parentId])
  return { keepProgress: row ? Boolean(row.keep_progress) : true }
}

export async function setKeepProgress(parentId, on) {
  await query(
    `insert into account_prefs (parent_id, keep_progress) values ($1, $2)
     on conflict (parent_id) do update set keep_progress = excluded.keep_progress, updated_at = now()`,
    [parentId, Boolean(on)],
  )
  /*
   * Turning it off is not just a flag: what is already up there has to come
   * down, or "off" would mean "we stopped adding to the pile we kept". Withdrawn
   * consent has to be retroactive to mean anything.
   *
   * The state goes before the learners that own it — `learner_state` has a
   * foreign key to `learners`, so the other order is a constraint violation and
   * the parent's request to be forgotten fails with a 500. Done as a loop rather
   * than a subquery so it behaves identically on every Postgres, including the
   * in-memory one the tests run against.
   */
  if (!on) {
    const mine = await all(`select id from learners where parent_id = $1`, [parentId])
    for (const row of mine) {
      await query(`delete from learner_state where learner_id = $1`, [row.id])
    }
    await query(`delete from learners where parent_id = $1`, [parentId])
  }
  return { keepProgress: Boolean(on) }
}

/* ------------------------------------------------------------------ *
 * Children
 *
 * Written to only when a parent has opted in to keeping progress. Everything
 * here is a no-op for an account that has not — see the table comment in
 * lib/db.js, and the consent switch in the app.
 * ------------------------------------------------------------------ */

export async function upsertLearner(parentId, learner) {
  const id = clip(learner?.id, 64)
  if (!id) return null
  await query(
    `insert into learners (id, parent_id, name, age, curriculum_id, year_band, colour)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (id) do update set
       name          = excluded.name,
       age           = excluded.age,
       curriculum_id = excluded.curriculum_id,
       year_band     = excluded.year_band,
       colour        = excluded.colour,
       deleted_at    = null,
       updated_at    = now()`,
    [
      id,
      parentId,
      clip(learner.name, 40),
      Number.isFinite(Number(learner.age)) ? Math.max(0, Math.min(20, Number(learner.age))) : null,
      clip(learner.curriculumId, 32),
      clip(learner.yearBand, 8),
      clip(learner.colour, 24),
    ],
  )
  return id
}

export const learnersFor = (parentId) =>
  all(
    `select id, name, age, curriculum_id, year_band, colour, updated_at
     from learners where parent_id = $1 and deleted_at is null order by created_at`,
    [parentId],
  )

/**
 * Forget one child.
 *
 * The progress goes immediately — that is what the parent asked for. The row
 * itself is only tombstoned, so another tablet that still has the child locally
 * does not simply upload them again on its next sync, and so thirty days of
 * "actually that was the wrong child" remains possible. The tombstone keeps no
 * name or age; there is nothing left in it about a person.
 */
export async function forgetLearner(parentId, learnerId) {
  const id = clip(learnerId, 64)
  const result = await query(
    `update learners set deleted_at = now(), name = null, age = null
     where id = $1 and parent_id = $2 and deleted_at is null`,
    [id, parentId],
  )
  if ((result?.rowCount ?? 0) === 0) return false
  await query(`delete from learner_state where learner_id = $1`, [id])
  return true
}
