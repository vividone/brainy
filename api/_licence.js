/**
 * What a family is entitled to, and the few operations that change it.
 *
 * Every route that grants access goes through here rather than writing its own
 * UPDATE, because the rules are small but easy to get subtly wrong: extending
 * an unexpired year should add to what is left rather than reset it, a
 * free-forever family must never acquire an expiry, and a code must be worth
 * exactly one redemption per family however many times it is typed.
 *
 * Expiry is evaluated lazily, when a licence is looked at, rather than by a
 * scheduled job. One less moving part, and a family whose year has run out
 * finds out at the moment they ask — which is the only moment it matters.
 */

import crypto from 'node:crypto'
import { addMonths, one, query } from './_db.js'
import { clip, num } from './_http.js'

/**
 * The plans, and what they cost in minor units.
 *
 * Prices live here rather than in the client so they cannot be edited in a
 * browser, and are overridable by environment variable so a price change is a
 * deploy setting rather than a code change. ₦5,000/yr is prd.md §14.3.
 */
export const PLANS = {
  'free-forever': { label: 'Free forever', months: null, amount: 0, sellable: false },
  annual: {
    label: 'One year',
    months: 12,
    get amount() {
      return num(process.env.PRICE_ANNUAL_MINOR, 100_000_000, 500_000)
    },
    sellable: true,
  },
  lifetime: {
    label: 'Lifetime',
    months: null,
    get amount() {
      return num(process.env.PRICE_LIFETIME_MINOR, 100_000_000, 1_500_000)
    },
    sellable: true,
  },
}

export const CURRENCY = () => (process.env.PAYSTACK_CURRENCY || 'NGN').toUpperCase()

export const isPlan = (plan) => Object.hasOwn(PLANS, plan)

/*
 * No I, O, 0 or 1. A parent reads this code off a WhatsApp message and types
 * it on a tablet keyboard; every ambiguous glyph is a support conversation.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const block = (n) =>
  Array.from({ length: n }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('')

/** `BRN-XXXX-XXXX` — 40 bits of entropy, which is far past guessable. */
export const randomCode = () => `BRN-${block(4)}-${block(4)}`

/**
 * A coupon code that says something about itself.
 *
 * `FAMILY-7K3M` is a code you can read out over the phone and recognise in a
 * list six months later; a bare random string is neither.
 */
export const randomCoupon = (plan) => {
  const prefix = plan === 'annual' ? 'YEAR' : plan === 'lifetime' ? 'LIFE' : 'FAMILY'
  return `${prefix}-${block(4)}`
}

/** Uppercase, trimmed, and free of the spaces and dashes people add. */
export function normaliseCode(value) {
  const v = clip(value, 40)
  if (!v) return null
  const cleaned = v.toUpperCase().replace(/[^A-Z0-9-]/g, '')
  return cleaned.length >= 4 ? cleaned : null
}

/* ------------------------------------------------------------------ *
 * Parents and their one subscription row
 * ------------------------------------------------------------------ */

/**
 * The parent behind an email address, created if this is the first we have seen
 * of them.
 *
 * The returned row carries a `created` flag, which callers use to decide whether
 * anything is worth emailing about — a parent submitting the form twice should
 * not be sent their code twice as though something had changed.
 */
export async function findOrCreateParent({ email, name, phone, country, children, source, note }) {
  const existing = await one(`select * from parents where email = $1`, [email])
  if (existing) {
    /* Fill in blanks from a later, fuller sign-up; never overwrite with null. */
    await query(
      `update parents set
         name     = coalesce($2, name),
         phone    = coalesce($3, phone),
         country  = coalesce($4, country),
         children = greatest(children, $5),
         note     = coalesce($6, note)
       where id = $1`,
      [existing.id, name ?? null, phone ?? null, country ?? null, num(children, 20, 1), note ?? null],
    )
    const refreshed = await one(`select * from parents where id = $1`, [existing.id])
    return { ...refreshed, created: false }
  }

  const inserted = await one(
    `insert into parents (email, name, phone, country, children, source, note)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning *`,
    [
      email,
      name ?? null,
      phone ?? null,
      country ?? null,
      Math.max(1, num(children, 20, 1)),
      source ?? 'site',
      note ?? null,
    ],
  )
  return { ...inserted, created: true }
}

/**
 * The family's subscription row, created on first contact.
 *
 * A parent who has only left their email gets a row too, at plan `none` and
 * status `pending`. It costs nothing, and it means the access code exists from
 * the moment they sign up — so granting them access later never has to invent
 * one and tell them about it.
 */
export async function ensureSubscription(parentId) {
  const existing = await one(`select * from subscriptions where parent_id = $1 order by id limit 1`, [
    parentId,
  ])
  if (existing) return existing

  /* Unique index on `code`; collisions are astronomically unlikely but cheap
     to retry, and a 500 on someone's sign-up is not. */
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await one(
        `insert into subscriptions (parent_id, code, plan, status, source) values ($1, $2, 'none', 'pending', 'signup')
         returning *`,
        [parentId, randomCode()],
      )
    } catch (err) {
      if (attempt === 4) throw err
    }
  }
}

/* ------------------------------------------------------------------ *
 * Reading a licence
 * ------------------------------------------------------------------ */

const past = (value) => value != null && new Date(value).getTime() <= Date.now()

/** Flip an `active` row whose date has passed. Returns the row either way. */
export async function expireIfDue(sub) {
  if (!sub || sub.status !== 'active' || !past(sub.expires_at)) return sub
  await query(`update subscriptions set status = 'expired', updated_at = now() where id = $1`, [sub.id])
  return { ...sub, status: 'expired' }
}

/**
 * The shape the app stores and the dashboard shows.
 *
 * `full` is computed here, on the server, so the client is never the authority
 * on what "active" means — it caches an answer rather than deciding one.
 */
export function licencePayload(sub, parent) {
  const active = sub.status === 'active' && !past(sub.expires_at)
  return {
    code: sub.code,
    plan: sub.plan,
    status: sub.status,
    full: active,
    children: sub.children ?? 1,
    email: parent?.email ?? null,
    name: parent?.name ?? null,
    startedAt: sub.started_at ? new Date(sub.started_at).toISOString() : null,
    expiresAt: sub.expires_at ? new Date(sub.expires_at).toISOString() : null,
    planLabel: PLANS[sub.plan]?.label ?? null,
  }
}

/** Look a code up as either a coupon or a family's own access code. */
export async function resolveCode(code) {
  const coupon = await one(`select * from coupons where code = $1`, [code])
  if (coupon) return { kind: 'coupon', coupon }

  const sub = await one(`select * from subscriptions where code = $1`, [code])
  if (sub) return { kind: 'subscription', sub }

  return { kind: 'unknown' }
}

export async function subscriptionWithParent(code) {
  const sub = await expireIfDue(await one(`select * from subscriptions where code = $1`, [code]))
  if (!sub) return null
  const parent = await one(`select * from parents where id = $1`, [sub.parent_id])
  return { sub, parent }
}

/* ------------------------------------------------------------------ *
 * Changing a licence
 * ------------------------------------------------------------------ */

/**
 * Grant or extend access.
 *
 * `months: null` means no expiry — free-forever and lifetime are the same
 * shape on purpose, so nothing downstream has to special-case the promise made
 * to the first twenty families.
 *
 * Extending an unexpired licence adds to the time remaining rather than
 * restarting from today: a parent who renews early has not thrown away the
 * month they had left.
 */
export async function grant({ subscription, plan, months, source, couponCode, note }) {
  const stillRunning = subscription.status === 'active' && !past(subscription.expires_at)
  const base =
    stillRunning && subscription.expires_at ? new Date(subscription.expires_at) : new Date()

  const expiresAt = months == null ? null : addMonths(months, base)
  const startedAt = subscription.started_at ?? new Date()

  return await one(
    `update subscriptions set
       plan        = $2,
       status      = 'active',
       source      = $3,
       coupon_code = coalesce($4, coupon_code),
       started_at  = $5,
       expires_at  = $6,
       note        = coalesce($7, note),
       updated_at  = now()
     where id = $1
     returning *`,
    [
      subscription.id,
      plan,
      source,
      couponCode ?? null,
      startedAt,
      expiresAt,
      note ?? null,
    ],
  )
}

/**
 * Apply a coupon to a family.
 *
 * Returns a reason rather than throwing, because every reason here is
 * something a parent needs to read in plain words.
 */
export async function redeemCoupon({ coupon, parent, subscription }) {
  if (!coupon.active) return { ok: false, error: 'That code is no longer active.' }
  if (past(coupon.expires_at)) return { ok: false, error: 'That code has expired.' }

  const already = await one(
    `select id from redemptions where coupon_code = $1 and parent_id = $2`,
    [coupon.code, parent.id],
  )

  /*
   * This family has already claimed this code, so hand back what they have and
   * change nothing.
   *
   * Re-granting here would be a quiet way to print money in reverse: a one-year
   * coupon typed on four tablets, or once a month out of habit, would add a year
   * every time. Redeeming twice is a normal thing for a parent to do — a second
   * tablet, a reset, a lost note — so it has to be inert rather than refused.
   */
  if (already) return { ok: true, subscription, reused: true }

  /*
   * Claim a use conditionally rather than reading then writing. Two tablets
   * redeeming the last use of a batch at the same moment would otherwise both
   * succeed, and the promise was twenty families, not twenty-two.
   */
  const claimed = await one(
    `update coupons set uses = uses + 1
     where code = $1 and active = true and uses < max_uses
     returning uses`,
    [coupon.code],
  )
  if (!claimed) {
    return { ok: false, error: 'That code has already been claimed by the maximum number of families.' }
  }
  await query(`insert into redemptions (coupon_code, parent_id) values ($1, $2)`, [
    coupon.code,
    parent.id,
  ])

  const updated = await grant({
    subscription,
    plan: coupon.plan,
    months: coupon.months ?? null,
    source: 'coupon',
    couponCode: coupon.code,
  })

  return { ok: true, subscription: updated }
}

/**
 * Note that a device is using this licence.
 *
 * Not enforcement — see the table comment. It exists so a code being passed
 * around a class WhatsApp group is visible rather than invisible.
 */
export async function recordDevice(code, installId) {
  const id = clip(installId, 64)
  if (!id) return
  await query(
    `insert into licence_devices (code, install_id) values ($1, $2)
     on conflict (code, install_id) do update set last_seen = now()`,
    [code, id],
  )
}
