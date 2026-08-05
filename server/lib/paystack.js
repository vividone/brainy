/**
 * Paystack, kept behind one module.
 *
 * Two rules shape everything here:
 *
 *  1. The secret key never leaves the server. Nothing in `src/` knows it
 *     exists; the client only ever receives a checkout URL.
 *  2. A webhook is a hint, not a fact. Every grant is made against a
 *     server-to-server verification of the reference, so a forged or replayed
 *     webhook cannot buy anybody a licence.
 */

import crypto from 'node:crypto'

const BASE = 'https://api.paystack.co'
const TIMEOUT_MS = 10_000

export const secretKey = () => process.env.PAYSTACK_SECRET_KEY || null

/** Paystack signs the raw body with the secret key, HMAC-SHA512. */
export function signatureValid(raw, header) {
  const key = secretKey()
  if (!key || !header) return false
  const expected = crypto.createHmac('sha512', key).update(raw).digest('hex')
  const a = Buffer.from(String(header))
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

async function call(path, { method = 'GET', body } = {}) {
  const key = secretKey()
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not set on this deployment.')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.status) {
      throw new Error(json?.message || `Paystack returned ${res.status}`)
    }
    return json.data
  } finally {
    clearTimeout(timer)
  }
}

/** Start a transaction. Returns the URL to send the parent to. */
export async function initialise({ email, amount, reference, currency, callbackUrl, metadata }) {
  const data = await call('/transaction/initialize', {
    method: 'POST',
    body: { email, amount, reference, currency, callback_url: callbackUrl, metadata },
  })
  return { authorizationUrl: data.authorization_url, reference: data.reference ?? reference }
}

/**
 * Ask Paystack what actually happened to a reference.
 *
 * This is the only thing trusted to mean "paid" — both the webhook and the
 * app's own "I'm back from checkout" call end up here.
 */
export async function verify(reference) {
  const data = await call(`/transaction/verify/${encodeURIComponent(reference)}`)
  return {
    reference: data.reference,
    status: data.status, // 'success' | 'failed' | 'abandoned' | …
    amount: Number(data.amount ?? 0),
    currency: data.currency ?? null,
    channel: data.channel ?? null,
    paidAt: data.paid_at ?? data.paidAt ?? null,
    email: data.customer?.email ?? null,
    metadata: data.metadata ?? null,
  }
}
