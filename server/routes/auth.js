/**
 * Signing in, which is also signing up.
 *
 *   POST /api/auth/code     { email }               → emails a six-digit code
 *   POST /api/auth/verify   { email, code, label }  → a device token
 *   POST /api/auth/signout  Bearer token            → revokes this device
 *
 * Two rules shape the whole file.
 *
 * **It never reveals whether an address has an account.** `/auth/code` answers
 * 200 whatever happens — including when the address is unknown, when the email
 * fails to send, and when the caller has asked too often. Anything else turns
 * this into a way to test whether a given parent uses Brainy, which is exactly
 * the sort of question a children's product should refuse to answer. The cost is
 * that a typo looks identical to success, so the copy in the app tells people to
 * check the address if nothing arrives.
 *
 * **Verifying an address creates the account.** There is no separate registration
 * step: proving you can read an inbox is the whole of it. That is what makes "I
 * installed the app and lost everything" recoverable by one flow rather than two.
 */

import { NoDatabase, explain } from '../lib/db.js'
import { clip, email as parseEmail, notify, readJson } from '../lib/http.js'
import { noteAttempt, rateLimited } from '../lib/auth.js'
import {
  CODE_TTL_MIN,
  bearer,
  checkCode,
  issueCode,
  mintToken,
  prefsFor,
  revokeToken,
} from '../lib/accounts.js'
import {
  ensureSubscription,
  findOrCreateParent,
  licencePayload,
  normaliseCode,
  redeemCoupon,
  resolveCode,
} from '../lib/licence.js'
import { sendSignInCode } from '../lib/email.js'

const unavailable = (res) =>
  res.status(503).json({ ok: false, error: 'We cannot sign you in right now. Please try again shortly.' })

/* ------------------------------------------------------------------ *
 * POST /api/auth/code
 * ------------------------------------------------------------------ */

async function requestCode(req, res) {
  const body = await readJson(req, 8 * 1024).catch(() => ({}))
  const address = parseEmail(body?.email)

  /*
   * A malformed address is the one thing worth saying out loud: it is a mistake
   * the person can fix, and it leaks nothing about who has an account.
   */
  if (!address) {
    return res.status(400).json({ ok: false, error: 'That does not look like an email address.' })
  }

  /* Per-caller limit on top of the per-address one inside issueCode. */
  if (await rateLimited(req, 'authcode', 12, 60)) {
    return res.status(200).json({ ok: true, sent: true, throttled: true })
  }
  await noteAttempt(req, 'authcode')

  const issued = await issueCode(address)
  if (!issued.ok) {
    /* Asked too often. Still 200 — see the file comment. */
    console.log(`[brainy:auth] code throttled for ${address}`)
    return res.status(200).json({ ok: true, sent: true, throttled: true })
  }

  const sent = await sendSignInCode({ email: address, code: issued.code, minutes: CODE_TTL_MIN })
  if (!sent?.ok) {
    /*
     * The code exists but nobody can read it. Logged loudly, because a parent
     * cannot get in and the cause is ours — usually an unverified sending domain.
     */
    console.error(`[brainy:auth] could not email a sign-in code to ${address}`)
    await notify('signin-email-failed', { email: address })
  }

  return res.status(200).json({ ok: true, sent: true, expiresInMinutes: CODE_TTL_MIN })
}

/* ------------------------------------------------------------------ *
 * POST /api/auth/verify
 * ------------------------------------------------------------------ */

async function verify(req, res) {
  const body = await readJson(req, 8 * 1024).catch(() => ({}))
  const address = parseEmail(body?.email)
  if (!address) return res.status(400).json({ ok: false, error: 'That does not look like an email address.' })

  if (await rateLimited(req, 'authverify', 30, 60)) {
    return res.status(429).json({ ok: false, error: 'Too many attempts. Wait a few minutes and try again.' })
  }
  await noteAttempt(req, 'authverify')

  const checked = await checkCode(address, body?.code)
  if (!checked.ok) return res.status(401).json({ ok: false, error: checked.error })

  /*
   * The code was right, so this address is theirs. Create the parent if this is
   * the first time — sign-up and sign-in are the same act.
   */
  const parent = await findOrCreateParent({
    email: address,
    name: clip(body?.name, 80),
    phone: clip(body?.phone, 32),
    source: 'app',
  })
  let subscription = await ensureSubscription(parent.id)

  /*
   * The twenty free places, claimed at the moment an account is created rather
   * than at a form on the landing page. Same coupon, same one-use-per-family
   * rule; `redeemCoupon` is inert for a family that already claimed it, so
   * signing in again on a second tablet changes nothing.
   */
  const auto = parent.created ? normaliseCode(process.env.SIGNUP_COUPON) : null
  if (auto) {
    const found = await resolveCode(auto)
    if (found.kind === 'coupon') {
      const claimed = await redeemCoupon({ coupon: found.coupon, parent, subscription })
      if (claimed.ok) subscription = claimed.subscription
    }
  }

  const token = await mintToken(parent.id, clip(body?.label, 80))
  const prefs = await prefsFor(parent.id)

  if (parent.created) {
    await notify('account-created', { email: address, plan: subscription.plan, code: subscription.code })
  }

  return res.status(200).json({
    ok: true,
    token,
    account: {
      email: parent.email,
      name: parent.name ?? null,
      /* Whether they have previously asked us to keep a child's progress. False
         for every new account: an account on its own uploads nothing. */
      keepProgress: prefs.keepProgress,
      isNew: Boolean(parent.created),
    },
    licence: licencePayload(subscription, parent),
  })
}

/* ------------------------------------------------------------------ *
 * POST /api/auth/signout
 * ------------------------------------------------------------------ */

async function signOut(req, res) {
  /*
   * Deliberately unauthenticated beyond holding the token. Signing out is not a
   * privileged act, and refusing to revoke a token because it is already
   * unrecognised would be perverse.
   */
  const revoked = await revokeToken(bearer(req))
  return res.status(200).json({ ok: true, revoked })
}

/* ------------------------------------------------------------------ *
 * Router
 * ------------------------------------------------------------------ */

export default async function handler(req, res) {
  const action = String(req.url ?? '').split('?')[0].replace(/^\/+/, '').replace(/^api\/auth\/?/, '')

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'POST only' })
  }

  try {
    if (action === 'code') return await requestCode(req, res)
    if (action === 'verify') return await verify(req, res)
    if (action === 'signout') return await signOut(req, res)
    return res.status(404).json({ ok: false, error: `No auth route for ${action}.` })
  } catch (err) {
    if (err instanceof NoDatabase) return unavailable(res)
    console.error('[brainy:auth]', err)
    return res.status(500).json({ ok: false, error: explain(err) })
  }
}
