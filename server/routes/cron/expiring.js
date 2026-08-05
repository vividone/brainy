/**
 * Warn families a week before their year runs out.
 *
 * Run by Vercel Cron once a day — see the `crons` block in vercel.json. It is
 * the one scheduled job in the product, and it exists because the alternative is
 * a child losing subjects mid-week with no warning and a parent concluding the
 * app is broken.
 *
 * Deliberately not a general "expire licences" job: expiry is evaluated lazily
 * whenever a licence is looked at (see server/lib/licence.js), so nothing here has to
 * run for the rules to be right. If this job never fires, the only thing lost is
 * the courtesy of a warning.
 *
 * Sends once per licence, recorded in `reminders`. Extending a licence deletes
 * that row, so the next year gets its own warning.
 */

import { NoDatabase, all, explain, query } from '../../lib/db.js'
import { sendExpiring } from '../../lib/email.js'
import { licencePayload } from '../../lib/licence.js'
import { searchParams } from '../../lib/http.js'
import crypto from 'node:crypto'

/** How much notice a parent gets. */
const DAYS_AHEAD = 7
/** A ceiling, so a misconfiguration cannot turn into a thousand emails. */
const MAX_PER_RUN = 200

/**
 * Vercel sends `Authorization: Bearer $CRON_SECRET` when that variable is set.
 * A public endpoint that sends email is a public endpoint that sends spam, so
 * without a secret configured this refuses to run at all.
 */
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

  const now = Date.now()
  const cutoff = new Date(now + DAYS_AHEAD * 86_400_000).toISOString()

  try {
    /*
     * `left join reminders` rather than `not in (select …)`: the same result, and
     * it keeps the query to one pass over an index rather than a subquery whose
     * plan degrades once there are thousands of rows.
     */
    const due = await all(
      `select s.*, p.email, p.name
       from subscriptions s
       join parents p on p.id = s.parent_id
       left join reminders r on r.code = s.code and r.kind = 'expiring'
       where s.status = 'active'
         and s.expires_at is not null
         and s.expires_at <= $1
         and s.expires_at > now()
         and r.id is null
       order by s.expires_at
       limit $2`,
      [cutoff, MAX_PER_RUN],
    )

    let sent = 0
    for (const row of due) {
      const licence = licencePayload(row, { email: row.email, name: row.name })
      const daysLeft = Math.max(1, Math.ceil((new Date(row.expires_at).getTime() - now) / 86_400_000))
      const result = await sendExpiring(licence, daysLeft)

      /*
       * Only record a reminder that actually went. A failed send left marked as
       * sent is a family who never hears from us — better to try again tomorrow,
       * which is exactly what leaving the row absent achieves.
       */
      if (result?.ok) {
        await query(
          `insert into reminders (code, kind) values ($1, 'expiring')
           on conflict (code, kind) do nothing`,
          [row.code],
        )
        sent += 1
      }
    }

    console.log(`[brainy:cron] ${due.length} due, ${sent} warned`)
    return res.status(200).json({ ok: true, due: due.length, sent })
  } catch (err) {
    if (err instanceof NoDatabase) return res.status(503).json({ ok: false, error: 'no database' })
    console.error('[brainy:cron]', err)
    return res.status(500).json({ ok: false, error: explain(err) })
  }
}
