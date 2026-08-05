/**
 * Paystack calling us back.
 *
 * Reachable at both `/api/pay/webhook` and the shorter `/api/webhook` — the
 * second is a rewrite in vercel.json, so whichever is registered in the Paystack
 * dashboard works and changing your mind later does not mean a missed payment.
 * A rewrite passes the method, headers and raw body through untouched, which
 * matters here more than anywhere: the signature is computed over those bytes.
 *
 * Two checks, in this order, and neither is optional:
 *
 *  1. The `x-paystack-signature` HMAC over the raw body must match. Without it
 *     this endpoint is a public "give me a licence" button.
 *  2. The reference is then verified server-to-server against Paystack before
 *     anything is granted (see api/_pay.js). Belt and braces on purpose: the
 *     raw body is not guaranteed to survive the platform's own JSON parsing
 *     byte-for-byte, and a signature check that silently degrades must not be
 *     the only thing standing between a stranger and a free licence.
 *
 * Status codes matter here. Paystack retries a non-2xx, so a transient
 * database problem returns 500 to get another go, while a payload we will never
 * be able to act on returns 200 so it stops.
 */

import { NoDatabase } from '../_db.js'
import { notify, readRaw } from '../_http.js'
import { signatureValid, secretKey } from '../_paystack.js'
import { settle } from '../_pay.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false })
  }
  if (!secretKey()) return res.status(503).json({ ok: false, error: 'PAYSTACK_SECRET_KEY is not set' })

  let raw
  try {
    raw = await readRaw(req, 128 * 1024)
  } catch {
    return res.status(400).json({ ok: false })
  }

  if (!signatureValid(raw, req.headers['x-paystack-signature'])) {
    console.error('[brainy:webhook] signature rejected')
    return res.status(401).json({ ok: false })
  }

  let event
  try {
    event = JSON.parse(raw.toString('utf8') || '{}')
  } catch {
    return res.status(400).json({ ok: false })
  }

  const reference = event?.data?.reference
  if (event?.event !== 'charge.success' || !reference) {
    // Something we do not act on — a transfer, a subscription event, a failed
    // charge. Acknowledged so it is not retried forever.
    return res.status(200).json({ ok: true, ignored: event?.event ?? 'unknown' })
  }

  try {
    const result = await settle(String(reference))
    if (!result.ok && result.status === 404) {
      await notify('webhook-unknown-reference', { reference })
      return res.status(200).json({ ok: false, error: result.error })
    }
    if (!result.ok) return res.status(200).json({ ok: false, error: result.error })
    return res.status(200).json({ ok: true })
  } catch (err) {
    if (err instanceof NoDatabase) return res.status(500).json({ ok: false, error: 'no database' })
    console.error('[brainy:webhook]', err)
    // 500 so Paystack tries again — the payment is real and the family is
    // waiting for it.
    return res.status(500).json({ ok: false })
  }
}
