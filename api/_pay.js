/**
 * Turning a payment into access.
 *
 * One function, called from two places — the webhook and the app coming back
 * from checkout — because the two must not be able to disagree. Whichever
 * arrives first does the work; the second finds it already done.
 *
 * Three things it refuses to do:
 *
 *  - grant against a reference this server did not create (so nothing in a
 *    webhook payload can conjure a licence out of nothing),
 *  - grant for less money than the plan costs,
 *  - grant twice for the same reference.
 */

import { one, query } from './_db.js'
import { PLANS, expireIfDue, grant, licencePayload } from './_licence.js'
import { verify } from './_paystack.js'
import { notify } from './_http.js'
import { sendReceipt, sendToOperator } from './_email.js'

export async function settle(reference) {
  const payment = await one(`select * from payments where reference = $1`, [reference])
  if (!payment) return { ok: false, status: 404, error: 'We have no record of that payment.' }

  const checked = await verify(reference)

  if (checked.status !== 'success') {
    await query(`update payments set status = $2, channel = $3 where reference = $1`, [
      reference,
      checked.status || 'failed',
      checked.channel ?? null,
    ])
    return { ok: false, status: 402, error: 'That payment has not gone through.', payment: checked }
  }

  const expected = PLANS[payment.plan]?.amount ?? Number(payment.amount ?? 0)
  if (checked.amount < expected) {
    /*
     * Should be impossible — the amount is set server-side when the
     * transaction is initialised — but a mismatch is either a Paystack
     * dashboard edit or something worth looking at, and quietly granting
     * access is the wrong response to either.
     */
    await notify('payment-short', { reference, paid: checked.amount, expected, plan: payment.plan })
    return { ok: false, status: 402, error: 'That payment was for less than the plan costs.' }
  }

  const parent = await one(`select * from parents where id = $1`, [payment.parent_id])
  let subscription = await one(`select * from subscriptions where parent_id = $1 order by id limit 1`, [
    payment.parent_id,
  ])
  if (!parent || !subscription) {
    return { ok: false, status: 500, error: 'That payment is not attached to a family.' }
  }

  /*
   * Claim the payment before granting anything, conditionally on it not already
   * being claimed.
   *
   * The webhook and the parent's own return from checkout arrive at almost the
   * same moment and race each other. Reading the status and then writing it
   * would let both see `pending` and both extend the licence — one payment, two
   * years. Whoever wins this UPDATE does the work; the loser finds the row
   * already marked and hands back the same licence.
   */
  const claimed = await one(
    `update payments set status = 'success', amount = $2, currency = $3, channel = $4, paid_at = $5
     where reference = $1 and status <> 'success'
     returning id`,
    [
      reference,
      checked.amount || payment.amount,
      checked.currency ?? payment.currency,
      checked.channel ?? null,
      checked.paidAt ? new Date(checked.paidAt) : new Date(),
    ],
  )
  if (!claimed) {
    subscription = await expireIfDue(subscription)
    return { ok: true, alreadySettled: true, licence: licencePayload(subscription, parent) }
  }

  try {
    subscription = await grant({
      subscription,
      plan: payment.plan,
      months: PLANS[payment.plan]?.months ?? null,
      source: 'paystack',
      note: `paid ${checked.amount} ${checked.currency ?? ''} · ${reference}`.trim(),
    })
  } catch (err) {
    /*
     * Marked paid but not granted is the one state nobody can recover from
     * without a human: the retry would see `success` and hand back a licence
     * that was never given. So put the claim back and let the next delivery —
     * Paystack retries a 500, and the app retries from the grown-up area — do
     * it properly.
     */
    await query(`update payments set status = 'pending' where reference = $1`, [reference])
    throw err
  }

  const licence = licencePayload(subscription, parent)

  /*
   * The receipt, with the code in it.
   *
   * Sent from inside the claim, so it goes exactly once however many times the
   * webhook and the app's return both arrive. Awaited rather than fired and
   * forgotten: a serverless function can be frozen the moment it responds, and a
   * parent who has just paid must not be the one who finds that out.
   */
  await sendReceipt(licence, {
    reference,
    plan: payment.plan,
    amount: checked.amount,
    currency: checked.currency,
  })

  await notify('payment', {
    email: parent.email,
    plan: payment.plan,
    amount: checked.amount,
    currency: checked.currency,
    reference,
  })
  await sendToOperator('a payment came in', [
    `${parent.email}${parent.name ? ` (${parent.name})` : ''}`,
    `plan: ${payment.plan}`,
    `amount: ${checked.amount} ${checked.currency ?? ''}`.trim(),
    `reference: ${reference}`,
  ])

  return { ok: true, licence }
}
