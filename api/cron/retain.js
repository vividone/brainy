/**
 * Delete what we said we would delete.
 *
 * The privacy notice states retention periods. Until this existed, nothing
 * enforced them — rows accumulated indefinitely while the notice claimed
 * otherwise, which is the kind of gap that turns an honest policy into a false
 * statement without anybody deciding to lie. The periods here and the periods
 * in site/privacy.html are the same numbers on purpose: change one, change the
 * other.
 *
 * Run weekly by Vercel Cron — see the `crons` block in vercel.json.
 *
 * What is deliberately NOT deleted here:
 *
 *  - `payments` — tax and accounting rules require keeping these for years, and
 *    a retention job that quietly destroys financial records is worse than one
 *    that keeps too much. Reviewed by hand, not on a timer.
 *  - `parents` and `subscriptions` — a licence record is what proves the
 *    licence exists. For a free-forever family that is indefinite, which is the
 *    whole point of the promise. Deleted on request instead.
 */

import { NoDatabase, explain, query } from '../_db.js'
import { searchParams } from '../_http.js'
import crypto from 'node:crypto'

const DAY = 86_400_000

/**
 * Every rule in one place so the policy is readable at a glance, and so the
 * privacy notice can be checked against it line by line.
 *
 * Each rule is `table` + `where` + what to do. The count used by a dry run and
 * the statement used by a real run are built from those same parts, so there is
 * no second hand-written query that can drift out of agreement with the first.
 */
const RULES = [
  {
    label: 'usage events',
    days: 400,
    table: 'events',
    where: 'day < $1',
    why: '13 months, so one year can be compared with the last and no longer.',
  },
  {
    label: 'weekly summaries',
    days: 400,
    table: 'summaries',
    where: 'created_at < $1',
    why: 'The same window as the events they summarise.',
  },
  {
    /*
     * Two-stage on purpose. The message stays useful product signal long after
     * the conversation ends; the address does not. Dropping the address alone
     * keeps what helps us fix a bad question and discards the only part that
     * identifies anybody.
     */
    label: 'feedback reply addresses',
    days: 365,
    table: 'feedback',
    where: 'contact is not null and created_at < $1',
    set: 'contact = null',
    why: 'A year is longer than any support conversation. The message stays, the address goes.',
  },
  {
    label: 'feedback messages',
    days: 730,
    table: 'feedback',
    where: 'created_at < $1',
    why: 'Two years. By then it describes a version of the app that no longer exists.',
  },
  {
    label: 'dormant installs',
    days: 400,
    table: 'installs',
    where: 'last_seen < $1',
    why: 'A tablet not seen for 13 months has stopped being a user.',
  },
  {
    label: 'licence device records',
    days: 400,
    table: 'licence_devices',
    where: 'last_seen < $1',
    why: 'These only exist to spot a code being passed around; stale rows cannot show that.',
  },
  {
    label: 'failed code attempts',
    days: 30,
    table: 'code_attempts',
    where: 'created_at < $1',
    why: 'Rate limiting needs days, not months, and these are hashed IPs.',
  },
  {
    /*
     * A bank-transfer receipt is somebody's account name and a picture of their
     * banking app. The accounting record is worth keeping; the image is not, so
     * the row survives and the evidence attached to it does not.
     */
    label: 'bank transfer receipts',
    days: 400,
    table: 'payment_requests',
    where: 'proof is not null and created_at < $1',
    set: 'proof = null, proof_type = null',
    why: 'The payment record stays for accounting. The uploaded receipt does not need to.',
  },
  {
    label: 'abandoned payment requests',
    days: 30,
    table: 'payment_requests',
    where: "status <> 'success' and created_at < $1",
    why: 'A checkout not completed within a month was abandoned.',
  },
  {
    label: 'admin audit log',
    days: 730,
    table: 'admin_audit',
    where: 'created_at < $1',
    why: 'Two years covers any dispute about who granted what.',
  },
]

/** The statement a real run executes. */
const statementFor = (rule) =>
  rule.set
    ? `update ${rule.table} set ${rule.set} where ${rule.where}`
    : `delete from ${rule.table} where ${rule.where}`

/** The same predicate, counted instead of applied. */
const countFor = (rule) => `select count(*)::int as n from ${rule.table} where ${rule.where}`

/** Vercel sends `Authorization: Bearer $CRON_SECRET` when that variable is set. */
function authorised(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const given =
    String(req.headers?.authorization ?? '').replace(/^Bearer\s+/i, '') ||
    searchParams(req).get('secret') ||
    ''
  const a = Buffer.from(given)
  const b = Buffer.from(secret)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export default async function handler(req, res) {
  if (!process.env.CRON_SECRET) {
    return res.status(503).json({ ok: false, error: 'CRON_SECRET is not set on this deployment.' })
  }
  if (!authorised(req)) return res.status(401).json({ ok: false, error: 'not authorised' })

  // `?dry=1` reports what would go without touching anything, so the policy can
  // be checked against a real database before it deletes from one.
  const dry = searchParams(req).get('dry') === '1'

  try {
    const done = {}
    for (const rule of RULES) {
      const cutoff = new Date(Date.now() - rule.days * DAY).toISOString()
      const r = await query(dry ? countFor(rule) : statementFor(rule), [cutoff])
      if (!r) return res.status(503).json({ ok: false, error: 'no database' })
      done[rule.label] = dry ? (r.rows[0]?.n ?? 0) : (r.rowCount ?? 0)
    }

    const total = Object.values(done).reduce((a, b) => a + b, 0)
    console.log(`[brainy:retain]${dry ? ' (dry run)' : ''} ${total} rows`, done)
    return res.status(200).json({ ok: true, dry, rows: done, total })
  } catch (err) {
    if (err instanceof NoDatabase) return res.status(503).json({ ok: false, error: 'no database' })
    console.error('[brainy:retain]', err)
    return res.status(500).json({ ok: false, error: explain(err) })
  }
}

/** Exported so the privacy notice can be checked against the real numbers. */
export const RETENTION = RULES.map(({ label, days, why }) => ({ label, days, why }))
