/**
 * Start a checkout.
 *
 * The amount is decided here, from the plan table in api/_licence.js, and never
 * read from the request — a price in a request body is a price a browser can
 * edit. The reference is minted here too, so nothing can later be settled
 * against a transaction this server did not start.
 *
 * The parent is sent to Paystack and comes back to /play/?ref=…, which the app
 * turns into a licence. Paystack holds the card details and the receipt; we
 * store an email address, a reference and an amount.
 */

import crypto from 'node:crypto'
import { NoDatabase, explain, query } from '../_db.js'
import { clip, email as parseEmail, num, readJson } from '../_http.js'
import {
  CURRENCY,
  PLANS,
  ensureSubscription,
  findOrCreateParent,
  isPlan,
} from '../_licence.js'
import { initialise, secretKey } from '../_paystack.js'
import { noteAttempt, rateLimited } from '../_auth.js'

const baseUrl = (req) => {
  const configured = process.env.PUBLIC_BASE_URL
  if (configured) return configured.replace(/\/+$/, '')
  const host = req.headers['x-forwarded-host'] ?? req.headers.host
  const proto = /localhost|127\.0\.0\.1/.test(String(host)) ? 'http' : 'https'
  return `${proto}://${host}`
}

export default async function handler(req, res) {
  /*
   * GET is the price list.
   *
   * It lives here rather than in the client bundle so a price is never
   * something a browser can be caught disagreeing with, and so switching
   * payments off — by leaving PAYSTACK_SECRET_KEY unset — is one answer the app
   * can read rather than a state it has to guess.
   */
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      enabled: Boolean(secretKey()),
      currency: CURRENCY(),
      plans: Object.entries(PLANS)
        .filter(([, plan]) => plan.sellable)
        .map(([id, plan]) => ({ id, label: plan.label, amount: plan.amount, months: plan.months })),
    })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'GET or POST only' })
  }

  if (!secretKey()) {
    return res.status(503).json({
      ok: false,
      error: 'Payments are not switched on yet. Please get in touch and we will sort it out directly.',
    })
  }

  let body
  try {
    body = await readJson(req, 16 * 1024)
  } catch {
    return res.status(400).json({ ok: false, error: 'bad body' })
  }

  const address = parseEmail(body?.email)
  if (!address) {
    return res.status(400).json({ ok: false, error: 'We need an email address to send the receipt to.' })
  }

  const plan = clip(body?.plan, 24)
  if (!isPlan(plan) || !PLANS[plan].sellable) {
    return res.status(400).json({ ok: false, error: 'Unknown plan.' })
  }

  try {
    /* Open by necessity, so counted per caller — see api/signup.js. */
    if (await rateLimited(req, 'pay', 10)) {
      return res.status(429).json({ ok: false, error: 'Too many attempts. Try again in a few minutes.' })
    }
    await noteAttempt(req, 'pay')

    const parent = await findOrCreateParent({
      email: address,
      name: clip(body?.name, 80),
      phone: clip(body?.phone, 32),
      children: num(body?.children, 20, 1),
      source: body?.source === 'site' ? 'site' : 'app',
    })
    const subscription = await ensureSubscription(parent.id)

    const reference = `brainy_${crypto.randomBytes(9).toString('base64url')}`
    const amount = PLANS[plan].amount
    const currency = CURRENCY()

    await query(
      `insert into payments (parent_id, reference, plan, amount, currency, status)
       values ($1, $2, $3, $4, $5, 'pending')`,
      [parent.id, reference, plan, amount, currency],
    )

    const started = await initialise({
      email: address,
      amount,
      reference,
      currency,
      callbackUrl: `${baseUrl(req)}/play/?ref=${encodeURIComponent(reference)}`,
      metadata: { plan, code: subscription.code, parentId: String(parent.id) },
    })

    return res.status(200).json({
      ok: true,
      reference: started.reference,
      authorizationUrl: started.authorizationUrl,
      amount,
      currency,
      plan,
      code: subscription.code,
    })
  } catch (err) {
    if (err instanceof NoDatabase) {
      return res.status(503).json({ ok: false, error: 'Payments are unavailable right now.' })
    }
    console.error('[brainy:pay-init]', err)
    return res.status(502).json({
      ok: false,
      error: 'We could not reach the payment provider. Nothing has been charged.',
      detail: explain(err),
    })
  }
}
