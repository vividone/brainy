/**
 * The hourly reminder run: "time for today's quest".
 *
 * Meant to be called once an hour. Every row picks its own hour, so the work per
 * run is small and a missed run costs one family one nudge rather than a backlog
 * that all arrives at once.
 *
 * Four rules, and three of them are about not being annoying:
 *
 *  - **Only at the hour the parent chose**, in their own timezone, worked out per
 *    row so British and American families do not drift an hour every spring.
 *  - **Never twice in a day.** The day already sent is written on the row.
 *  - **Never to a family who has already played.** If their progress reached us
 *    today, they do not need telling. This uses the update time we already have
 *    on their state, so it collects nothing new to know it.
 *  - **A ceiling per run**, so a misconfigured schedule cannot turn into a
 *    thousand notifications.
 */

import crypto from 'node:crypto'
import { NoDatabase, all, explain, query } from '../../lib/db.js'
import { searchParams } from '../../lib/http.js'
import { pushConfigured, sendTo } from '../../lib/push.js'

const MAX_PER_RUN = 500

/** A day key in the family's own timezone, which is the only "today" that matters. */
const localDay = (offsetMinutes) =>
  new Date(Date.now() - offsetMinutes * 60_000).toISOString().slice(0, 10)

/** The hour it is right now where that family is. */
const localHourNow = (offsetMinutes) =>
  new Date(Date.now() - offsetMinutes * 60_000).getUTCHours()

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
  if (!pushConfigured()) {
    return res.status(200).json({ ok: true, skipped: 'no VAPID keys configured', sent: 0 })
  }

  try {
    /*
     * Every subscription, with the last time this family's progress reached us.
     *
     * max(updated_at) rather than a join per learner: one row per device is what
     * the sender needs, and a family with three children should be judged on
     * whether *any* of them played.
     */
    const rows = await all(
      `select s.endpoint, s.p256dh, s.auth, s.local_hour, s.tz_offset, s.last_sent,
              (select max(st.updated_at) from learner_state st
                 join learners l on l.id = st.learner_id
                where l.parent_id = s.parent_id) as last_activity
         from push_subscriptions s
        order by s.id
        limit $1`,
      [MAX_PER_RUN],
    )

    let sent = 0
    let skipped = 0

    for (const row of rows) {
      const offset = Number(row.tz_offset ?? 0)
      const today = localDay(offset)

      if (localHourNow(offset) !== Number(row.local_hour)) {
        skipped += 1
        continue
      }
      if (row.last_sent === today) {
        skipped += 1
        continue
      }
      /* Played today already, as far as their account knows. */
      if (row.last_activity && new Date(row.last_activity).toISOString().slice(0, 10) === today) {
        skipped += 1
        continue
      }

      /*
       * Written before the send, not after. A crash between the two costs one
       * family one missed reminder; the other order costs them a second copy
       * every time the run is retried.
       */
      await query(`update push_subscriptions set last_sent = $2 where endpoint = $1`, [
        row.endpoint,
        today,
      ])

      const result = await sendTo(row, {
        title: 'Time for today’s quest',
        body: 'Five minutes is all it takes. Tap to start.',
        tag: 'brainy-daily',
        url: '/play/',
      })
      if (result.ok) sent += 1
    }

    return res.status(200).json({ ok: true, considered: rows.length, sent, skipped })
  } catch (err) {
    if (err instanceof NoDatabase) {
      return res.status(503).json({ ok: false, error: 'no database' })
    }
    console.error('[brainy:remind]', err)
    return res.status(500).json({ ok: false, error: explain(err) })
  }
}
