/**
 * Turning a code into access, and checking later that it still holds.
 *
 *   POST { code, email }        redeem a coupon, or look up a family's own code
 *   GET  ?code=…               re-validate a licence the app already holds
 *   GET  ?reference=…          finish a checkout the parent has just come back from
 *
 * The re-validation path is what makes a revoked or lapsed licence eventually
 * mean something, and it is deliberately gentle: it is the *app's* job to keep
 * working when this endpoint is unreachable. A child on a tablet in a car with
 * no signal must not lose access because a server could not be asked.
 */

import { NoDatabase, explain, one } from '../lib/db.js'
import { clip, email as parseEmail, num, readJson, searchParams } from '../lib/http.js'
import { noteAttempt, rateLimited } from '../lib/auth.js'
import { sendLicence, sendToOperator } from '../lib/email.js'
import {
  ensureSubscription,
  expireIfDue,
  findOrCreateParent,
  licencePayload,
  normaliseCode,
  recordDevice,
  redeemCoupon,
  resolveCode,
  subscriptionWithParent,
} from '../lib/licence.js'
import { settle } from '../lib/pay.js'

/**
 * Failed code attempts allowed from one caller in fifteen minutes.
 *
 * Only *failures* count, so a family fumbling their own code a few times is
 * never locked out of the app they paid for. A code is 40 bits from an
 * unambiguous alphabet, so this is belt-and-braces against a script rather than
 * the thing standing between a guesser and a licence.
 */
const LIMIT = 15

const tooManyAttempts = (req) => rateLimited(req, 'code', LIMIT)
const noteFailure = (req) => noteAttempt(req, 'code')

const unavailable = (res) =>
  res.status(503).json({
    ok: false,
    error: 'We cannot check codes right now. Please try again shortly.',
  })

/* ------------------------------------------------------------------ *
 * GET — re-validation, and returning from checkout
 * ------------------------------------------------------------------ */

async function read(req, res) {
  const params = searchParams(req)
  const reference = clip(params.get('reference'), 64)
  const installId = clip(params.get('installId'), 64)

  if (reference) {
    const result = await settle(reference)
    if (!result.ok) return res.status(result.status ?? 400).json({ ok: false, error: result.error })
    if (installId) await recordDevice(result.licence.code, installId)
    return res.status(200).json({ ok: true, licence: result.licence })
  }

  const code = normaliseCode(params.get('code'))
  if (!code) return res.status(400).json({ ok: false, error: 'No code given.' })

  const found = await subscriptionWithParent(code)
  if (!found) {
    await noteFailure(req)
    return res.status(404).json({ ok: false, error: 'We do not recognise that code.' })
  }
  if (installId) await recordDevice(code, installId)
  return res.status(200).json({ ok: true, licence: licencePayload(found.sub, found.parent) })
}

/* ------------------------------------------------------------------ *
 * POST — redeeming
 * ------------------------------------------------------------------ */

async function redeem(req, res) {
  let body
  try {
    body = await readJson(req, 16 * 1024)
  } catch {
    return res.status(400).json({ ok: false, error: 'bad body' })
  }

  const code = normaliseCode(body?.code)
  if (!code) return res.status(400).json({ ok: false, error: 'Enter the code you were given.' })

  if (await tooManyAttempts(req)) {
    return res.status(429).json({ ok: false, error: 'Too many tries. Wait a few minutes and try again.' })
  }

  const found = await resolveCode(code)

  /* A family's own access code: a second tablet, or a restored device. */
  if (found.kind === 'subscription') {
    const sub = await expireIfDue(found.sub)
    const parent = await one(`select * from parents where id = $1`, [sub.parent_id])
    await recordDevice(sub.code, body?.installId)
    return res.status(200).json({ ok: true, licence: licencePayload(sub, parent) })
  }

  if (found.kind !== 'coupon') {
    await noteFailure(req)
    return res.status(404).json({ ok: false, error: 'We do not recognise that code.' })
  }

  /*
   * A coupon has to be attached to somebody. Without an email the same code
   * could be redeemed on any number of tablets and there would be no way to
   * restore a family's access when they change device — which is precisely the
   * situation the twenty free families would hit first.
   */
  const address = parseEmail(body?.email)
  if (!address) {
    return res.status(400).json({
      ok: false,
      needsEmail: true,
      error: 'We need your email address to attach this code to your family.',
    })
  }

  const parent = await findOrCreateParent({
    email: address,
    name: clip(body?.name, 80),
    phone: clip(body?.phone, 32),
    children: num(body?.children, 20, 1),
    source: 'app',
  })
  const subscription = await ensureSubscription(parent.id)

  const result = await redeemCoupon({ coupon: found.coupon, parent, subscription })
  if (!result.ok) return res.status(409).json({ ok: false, error: result.error })

  await recordDevice(result.subscription.code, body?.installId)
  const licence = licencePayload(result.subscription, parent)

  /*
   * Email the code on a fresh redemption only.
   *
   * `reused` means this family had already claimed this coupon and is typing it
   * on a second tablet — they have the email already, and sending it again would
   * make an inert action look like an event. Awaited rather than fired and
   * forgotten: a serverless function can be frozen the instant it responds.
   */
  let sent = null
  if (!result.reused) {
    sent = await sendLicence(licence, {
      reason: found.coupon.plan === 'free-forever' ? 'free-place' : undefined,
    })
    await sendToOperator('a code was redeemed', [
      `${parent.email}${parent.name ? ` (${parent.name})` : ''}`,
      `coupon: ${found.coupon.code}`,
      `plan: ${licence.plan}`,
      `code: ${licence.code}`,
    ])
  }

  /*
   * Reported so the app can say "we have emailed it to you" only when that is
   * true. Telling a parent to check an inbox that will stay empty is how they
   * lose the code and conclude the product is broken.
   */
  return res.status(200).json({ ok: true, licence, emailed: Boolean(sent?.ok) })
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return await read(req, res)
    if (req.method === 'POST') return await redeem(req, res)
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'GET or POST only' })
  } catch (err) {
    if (err instanceof NoDatabase) return unavailable(res)
    console.error('[brainy:activate]', err)
    return res.status(500).json({ ok: false, error: explain(err) })
  }
}
