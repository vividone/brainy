/**
 * "I have paid by bank transfer" — the claim, not the payment.
 *
 * Card checkout is not how most Nigerian families pay. They open their bank app,
 * move the money, and screenshot the receipt. Refusing that because it needs a
 * human to check it would lose more families than the checking costs.
 *
 * So this route stores a *request* and grants absolutely nothing. An admin looks
 * at their own bank statement, approves or declines, and only then is a licence
 * created and the code emailed. Nothing a parent can type here changes what they
 * are entitled to — which is why it is safe to leave open, and why the amount
 * they claim is recorded as a claim rather than believed.
 *
 * What it does do immediately is acknowledge, by email, so nobody is left
 * wondering whether their money went into a void.
 */

import { NoDatabase, explain, one, query } from '../_db.js'
import { clip, email as parseEmail, num, readJson } from '../_http.js'
import { noteAttempt, rateLimited } from '../_auth.js'
import {
  CURRENCY,
  PLANS,
  bankDetails,
  ensureSubscription,
  findOrCreateParent,
  isPlan,
} from '../_licence.js'
import { sendTransferReceived, sendToOperator } from '../_email.js'

/*
 * A phone screenshot of a bank receipt is a few hundred kilobytes; base64 adds a
 * third. Two megabytes of encoded data is generous for that and small enough
 * that a row stays cheap to read.
 */
const MAX_PROOF = 2 * 1024 * 1024
const BODY_LIMIT = MAX_PROOF + 8 * 1024
const ALLOWED_PROOF = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'POST only' })
  }

  const bank = bankDetails()
  if (!bank.enabled) {
    return res.status(503).json({
      ok: false,
      error: 'Bank transfer is not set up yet. Please get in touch and we will sort it out directly.',
    })
  }

  let body
  try {
    body = await readJson(req, BODY_LIMIT)
  } catch {
    return res.status(413).json({
      ok: false,
      error: 'That file is too large. A screenshot under 1.5 MB works best.',
    })
  }

  const address = parseEmail(body?.email)
  if (!address) {
    return res.status(400).json({ ok: false, error: 'We need your email address to send the code to.' })
  }

  const plan = clip(body?.plan, 24)
  if (!isPlan(plan) || !PLANS[plan].sellable) {
    return res.status(400).json({ ok: false, error: 'Choose which plan you paid for.' })
  }

  /*
   * The proof is optional on purpose. Someone with a bad connection, or paying
   * from a bank app that will not let them share an image, should still be able
   * to tell us — the sender's name and the date are enough to find a transfer on
   * a statement, which is what actually settles it.
   */
  let proof = null
  let proofType = null
  if (typeof body?.proof === 'string' && body.proof.length > 0) {
    proofType = clip(body?.proofType, 60)
    if (!ALLOWED_PROOF.has(proofType ?? '')) {
      return res.status(400).json({ ok: false, error: 'Attach a screenshot or a PDF.' })
    }
    if (body.proof.length > MAX_PROOF) {
      return res.status(413).json({ ok: false, error: 'That file is too large — try one under 1.5 MB.' })
    }
    /* Base64 only. Anything else means a client that is not ours. */
    if (!/^[A-Za-z0-9+/=\r\n]+$/.test(body.proof)) {
      return res.status(400).json({ ok: false, error: 'That attachment could not be read.' })
    }
    proof = body.proof
  }

  /* A date, if it parses. Never a reason to reject the whole request. */
  let paidOn = null
  if (typeof body?.paidOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.paidOn)) paidOn = body.paidOn

  try {
    if (await rateLimited(req, 'transfer', 6)) {
      return res.status(429).json({ ok: false, error: 'Too many attempts. Try again in a few minutes.' })
    }
    await noteAttempt(req, 'transfer')

    const parent = await findOrCreateParent({
      email: address,
      name: clip(body?.name, 80),
      phone: clip(body?.phone, 32),
      source: 'app',
    })
    const subscription = await ensureSubscription(parent.id)

    /*
     * One open request at a time. A parent who taps submit twice, or who sends a
     * clearer screenshot ten minutes later, should not produce two things for a
     * human to reconcile — the second submission replaces the first.
     */
    const existing = await one(
      `select id from payment_requests where parent_id = $1 and status = 'pending' order by id desc limit 1`,
      [parent.id],
    )

    const expected = PLANS[plan].amount
    const claimed = num(body?.amount, 100_000_000, expected) || expected

    if (existing) {
      await query(
        `update payment_requests set
           plan = $2, amount = $3, currency = $4, reference = $5, sender_name = $6,
           paid_on = $7, note = $8, proof_type = coalesce($9, proof_type),
           proof = coalesce($10, proof), created_at = now()
         where id = $1`,
        [
          existing.id,
          plan,
          claimed,
          CURRENCY(),
          clip(body?.reference, 80),
          clip(body?.senderName, 80),
          paidOn,
          clip(body?.note, 400),
          proofType,
          proof,
        ],
      )
    } else {
      await query(
        `insert into payment_requests
           (parent_id, plan, amount, currency, reference, sender_name, paid_on, note, proof_type, proof)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          parent.id,
          plan,
          claimed,
          CURRENCY(),
          clip(body?.reference, 80),
          clip(body?.senderName, 80),
          paidOn,
          clip(body?.note, 400),
          proofType,
          proof,
        ],
      )
    }

    const sent = await sendTransferReceived({
      email: address,
      name: parent.name,
      plan,
      planLabel: PLANS[plan].label,
      amount: claimed,
      currency: CURRENCY(),
    })

    await sendToOperator('a bank transfer needs checking', [
      `${address}${parent.name ? ` (${parent.name})` : ''}`,
      `plan: ${plan}`,
      `they say they paid: ${claimed / 100} ${CURRENCY()}`,
      paidOn ? `on: ${paidOn}` : null,
      clip(body?.senderName, 80) ? `from: ${clip(body?.senderName, 80)}` : null,
      clip(body?.reference, 80) ? `reference: ${clip(body?.reference, 80)}` : null,
      proof ? 'a receipt is attached to the request' : 'no receipt attached',
      'Review it under Transfers in the dashboard.',
    ])

    return res.status(200).json({
      ok: true,
      /* Said plainly, because the honest answer is "not yet". */
      status: 'pending',
      emailed: Boolean(sent?.ok),
      code: subscription.code,
    })
  } catch (err) {
    if (err instanceof NoDatabase) {
      return res.status(503).json({ ok: false, error: 'We cannot take that right now. Please try again shortly.' })
    }
    console.error('[brainy:transfer]', err)
    return res.status(500).json({ ok: false, error: explain(err) })
  }
}
