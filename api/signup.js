/**
 * A parent leaving their details, from the landing page or the grown-up area.
 *
 * This is the first thing in the product that stores a real person, so it is
 * worth being explicit about what it is for: an email address so a family can
 * be given access on a second tablet without losing what they paid for, and so
 * the twenty free places can be honoured to specific people rather than to
 * whoever happens to hold a code. Nothing about a child is stored — not a
 * name, not an age, not an answer.
 *
 * A sign-up on its own grants nothing. It creates the family's access code and
 * leaves it `pending`; a coupon or a payment is what makes it `active`.
 */

import { NoDatabase, explain } from './_db.js'
import { clip, email as parseEmail, notify, num, readJson } from './_http.js'
import { noteAttempt, rateLimited } from './_auth.js'
import { sendLicence, sendPending, sendToOperator } from './_email.js'
import {
  ensureSubscription,
  expireIfDue,
  findOrCreateParent,
  licencePayload,
  normaliseCode,
  recordDevice,
  redeemCoupon,
  resolveCode,
} from './_licence.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'POST only' })
  }

  let body
  try {
    body = await readJson(req, 16 * 1024)
  } catch {
    return res.status(400).json({ ok: false, error: 'bad body' })
  }

  const address = parseEmail(body?.email)
  if (!address) {
    return res.status(400).json({ ok: false, error: 'That does not look like an email address.' })
  }

  const source = body?.source === 'app' ? 'app' : 'site'
  const code = normaliseCode(body?.code)

  try {
    /*
     * Counted per caller, because this endpoint has to be open — a parent
     * signing up has nothing to authenticate with — and an open endpoint that
     * writes rows is an open endpoint that writes ten thousand of them. Ten in
     * fifteen minutes is far more than a family needs and far less than a script
     * wants.
     */
    if (await rateLimited(req, 'signup', 10)) {
      return res.status(429).json({ ok: false, error: 'Too many attempts. Try again in a few minutes.' })
    }
    await noteAttempt(req, 'signup')

    const parent = await findOrCreateParent({
      email: address,
      name: clip(body?.name, 80),
      phone: clip(body?.phone, 32),
      country: clip(body?.country, 40),
      children: num(body?.children, 20, 1),
      source,
      note: clip(body?.note, 400),
    })

    const isNew = parent.created
    let subscription = await ensureSubscription(parent.id)
    let couponNote = null

    /*
     * The twenty free places, honoured without a human in the loop.
     *
     * `SIGNUP_COUPON` names a coupon that every sign-up tries automatically —
     * so the promise in prd.md §14.3 is kept by whoever gets there first, and
     * the moment its uses run out sign-ups quietly go back to being a list.
     * Nothing here has to be switched off on the twenty-first family.
     */
    const auto = !code ? normaliseCode(process.env.SIGNUP_COUPON) : null
    if (auto) {
      const found = await resolveCode(auto)
      if (found.kind === 'coupon') {
        const result = await redeemCoupon({ coupon: found.coupon, parent, subscription })
        if (result.ok) subscription = result.subscription
      }
    }

    /*
     * A code typed at sign-up is applied in the same request. Two round trips
     * for one form is two chances to lose somebody.
     */
    if (code) {
      const found = await resolveCode(code)
      if (found.kind === 'coupon') {
        const result = await redeemCoupon({ coupon: found.coupon, parent, subscription })
        if (!result.ok) couponNote = result.error
        else subscription = result.subscription
      } else if (found.kind === 'subscription' && found.sub.parent_id !== parent.id) {
        couponNote = 'That code belongs to another family. Your own code is below.'
      } else if (found.kind === 'unknown') {
        couponNote = 'We did not recognise that code, so your details are saved without it.'
      }
    }

    subscription = await expireIfDue(subscription)
    await recordDevice(subscription.code, body?.installId)

    const licence = licencePayload(subscription, parent)

    /*
     * Send the code, or say plainly that there is nothing yet.
     *
     * Only on the sign-up that actually changed something: a parent who submits
     * the form twice, or comes back next month, should not be emailed their code
     * again as though something had happened. Awaited rather than fired and
     * forgotten because a serverless function can be frozen the moment it
     * responds, which would drop the send.
     */
    let sent = null
    if (isNew) {
      sent = licence.full
        ? await sendLicence(licence, { reason: auto ? 'free-place' : undefined })
        : await sendPending(parent)
    }

    await notify('signup', {
      email: address,
      name: parent.name ?? null,
      source,
      plan: licence.plan,
      status: licence.status,
      code: licence.code,
    })
    if (isNew) {
      await sendToOperator(licence.full ? 'a free place was claimed' : 'a new sign-up', [
        `${address}${parent.name ? ` (${parent.name})` : ''}`,
        parent.phone ? `phone: ${parent.phone}` : null,
        `via: ${source}`,
        `plan: ${licence.plan} · ${licence.status}`,
        `code: ${licence.code}`,
      ])
    }

    /* `emailed` so the page can say "check your inbox" only when there is
       something to check it for — see api/activate.js. */
    return res.status(200).json({ ok: true, licence, note: couponNote, emailed: Boolean(sent?.ok) })
  } catch (err) {
    if (err instanceof NoDatabase) {
      /*
       * Deliberately not a cheerful 200. A parent told "you're on the list"
       * when nothing was written is worse than a parent told to try again.
       */
      return res.status(503).json({
        ok: false,
        error: 'Sign-ups are not available right now. Please try again shortly.',
      })
    }
    console.error('[brainy:signup]', err)
    return res.status(500).json({ ok: false, error: explain(err) })
  }
}
