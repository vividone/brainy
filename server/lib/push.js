/**
 * Web push, for the one thing it is used for: "time for today's quest".
 *
 * The whole feature is off unless three VAPID variables are set, and off is a
 * state the routes report rather than a crash — a family should never be offered
 * a reminder the server cannot send.
 *
 * Nothing about a child is ever in a payload. The notification says the app's
 * name and a sentence about the quest, and that is all it can say, because the
 * only thing the server knows is which account asked to be reminded and at what
 * hour. Even the child's first name is left out: a push payload is decrypted by
 * the browser and rendered on a lock screen, which is a place a name does not
 * need to be.
 */

import webpush from 'web-push'
import { all, query } from './db.js'

const PUBLIC = () => process.env.VAPID_PUBLIC_KEY?.trim() ?? ''
const PRIVATE = () => process.env.VAPID_PRIVATE_KEY?.trim() ?? ''
/* Must be a mailto: or https: URL. Push services use it to reach a human when
   something we send is broken, which is a courtesy worth honouring. */
const SUBJECT = () => process.env.VAPID_SUBJECT?.trim() || 'mailto:brainy@fortbridge.app'

export const pushConfigured = () => Boolean(PUBLIC() && PRIVATE())

/** The public key, which is safe to hand to any browser: it is how they subscribe. */
export const publicKey = () => (pushConfigured() ? PUBLIC() : null)

let ready = false
function configure() {
  if (ready || !pushConfigured()) return
  webpush.setVapidDetails(SUBJECT(), PUBLIC(), PRIVATE())
  ready = true
}

/**
 * Remember a browser's subscription, or update it if we have seen it before.
 *
 * A browser that re-subscribes hands back the same endpoint, so this is an
 * upsert: the alternative is a family collecting a row per app open and getting
 * six identical reminders.
 */
export async function saveSubscription({ parentId, subscription, localHour, tzOffset, label }) {
  const endpoint = String(subscription?.endpoint ?? '')
  const p256dh = String(subscription?.keys?.p256dh ?? '')
  const auth = String(subscription?.keys?.auth ?? '')
  if (!endpoint.startsWith('https://') || !p256dh || !auth) {
    return { ok: false, error: 'That subscription is not usable.' }
  }

  const hour = Number.isFinite(localHour) ? Math.min(23, Math.max(0, Math.round(localHour))) : 17
  /* Minutes, as getTimezoneOffset gives it: positive west of UTC. Clamped to the
     range real timezones occupy so a wrong value cannot shift a send by days. */
  const offset = Number.isFinite(tzOffset) ? Math.min(840, Math.max(-840, Math.round(tzOffset))) : 0

  await query(
    `insert into push_subscriptions (parent_id, endpoint, p256dh, auth, local_hour, tz_offset, label)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (endpoint) do update set
       parent_id  = excluded.parent_id,
       p256dh     = excluded.p256dh,
       auth       = excluded.auth,
       local_hour = excluded.local_hour,
       tz_offset  = excluded.tz_offset,
       label      = excluded.label,
       failures   = 0`,
    [parentId, endpoint, p256dh, auth, hour, offset, label ?? null],
  )
  return { ok: true, localHour: hour }
}

export async function forgetSubscription(parentId, endpoint) {
  const result = await query(`delete from push_subscriptions where parent_id = $1 and endpoint = $2`, [
    parentId,
    String(endpoint ?? ''),
  ])
  return { ok: true, removed: result?.rowCount ?? 0 }
}

/** Every reminder this account has asked for, so the grown-up area can list them. */
export async function subscriptionsFor(parentId) {
  return await all(
    `select endpoint, local_hour, label, created_at from push_subscriptions where parent_id = $1
     order by created_at`,
    [parentId],
  )
}

/**
 * Send one notification, and clean up after a dead endpoint.
 *
 * 404 and 410 are the push services saying the browser is gone for good: that
 * row is deleted rather than retried, because writing to dead endpoints is how a
 * sender stops being trusted. Anything else is counted, and five strikes gets the
 * same treatment.
 */
export async function sendTo(row, payload) {
  configure()
  if (!ready) return { ok: false, skipped: true }

  try {
    await webpush.sendNotification(
      { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
      JSON.stringify(payload),
      { TTL: 6 * 60 * 60 },
    )
    return { ok: true }
  } catch (err) {
    const status = err?.statusCode ?? 0
    if (status === 404 || status === 410) {
      await query(`delete from push_subscriptions where endpoint = $1`, [row.endpoint])
      return { ok: false, gone: true }
    }
    await query(
      `update push_subscriptions set failures = failures + 1 where endpoint = $1`,
      [row.endpoint],
    )
    await query(`delete from push_subscriptions where endpoint = $1 and failures >= 5`, [row.endpoint])
    return { ok: false, error: `push returned ${status || 'no status'}` }
  }
}
