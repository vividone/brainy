/**
 * Usage numbers for the dashboard — the anonymous half.
 *
 * Nothing here can be tied to a person: an install is a browser profile, and
 * only for families who opted in. The accounts and money half lives in
 * api/admin/, and the two are kept apart on purpose — this endpoint knows
 * nothing about who anybody is, and it should stay that way.
 *
 * Authentication moved to the shared admin guard, so a signed-in dashboard
 * session works and the token remains available for curl and cron.
 */

import { explain, query } from '../lib/db.js'
import { requireAdmin } from '../lib/auth.js'

const DAYS = 30

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return

  try {
    const installs = await query(`
      select count(*)::int                                              as total,
             count(*) filter (where first_seen >= current_date - 6)::int as new_7d,
             count(*) filter (where last_seen  >= current_date - 6)::int as active_7d,
             count(*) filter (where last_seen  >= current_date - 29)::int as active_30d,
             coalesce(sum(children), 0)::int                            as children
      from installs
    `)
    if (!installs) return res.status(503).json({ ok: false, error: 'DATABASE_URL is not set' })

    /*
     * The cutoff is computed here rather than as `current_date - $1`: passing
     * an integer into date arithmetic leaves Postgres inferring the type of
     * an untyped parameter, which is needlessly fragile for a fixed window.
     */
    const since = new Date()
    since.setDate(since.getDate() - (DAYS - 1))
    const sinceDay = since.toISOString().slice(0, 10)

    const daily = await query(
      `select day,
              count(distinct install_id) filter (where kind = 'open')::int   as devices,
              count(*) filter (where kind = 'session')::int                  as sessions,
              coalesce(sum(questions), 0)::int                               as questions,
              coalesce(sum(correct), 0)::int                                 as correct,
              coalesce(sum(duration_ms), 0)::bigint                          as duration_ms
       from events
       where day >= $1
       group by day
       order by day`,
      [sinceDay],
    )

    const subjects = await query(`
      select subject,
             count(*)::int                    as sessions,
             coalesce(sum(questions), 0)::int as questions,
             coalesce(sum(correct), 0)::int   as correct
      from events
      where kind = 'session' and subject is not null
      group by subject
      order by questions desc
    `)

    const split = await query(`
      select coalesce(curriculum, 'unknown') as curriculum,
             coalesce(year_band, 'unknown')  as year_band,
             count(*)::int                   as installs
      from installs
      group by coalesce(curriculum, 'unknown'), coalesce(year_band, 'unknown')
      order by installs desc
    `)

    /*
     * Retention as "came back at all", not a strict day-N cohort. With twenty
     * families a strict cohort has a denominator of two or three and swings
     * wildly; "installed a week ago and still opening it" is the question
     * that actually matters at this size.
     */
    const retention = await query(`
      select
        count(*) filter (where first_seen <= current_date - 7)::int                              as eligible_7d,
        count(*) filter (where first_seen <= current_date - 7 and last_seen >= current_date - 6)::int as retained_7d,
        count(*) filter (where first_seen <= current_date - 28)::int                             as eligible_28d,
        count(*) filter (where first_seen <= current_date - 28 and last_seen >= current_date - 6)::int as retained_28d
      from installs
    `)

    const recentFeedback = await query(`
      select created_at, category, message, contact
      from feedback
      order by created_at desc
      limit 25
    `)

    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      installs: installs.rows[0],
      retention: retention.rows[0],
      // Normalise the date here: node-postgres hands back a Date for a DATE
      // column, and the dashboard wants a plain YYYY-MM-DD.
      daily: daily.rows.map((r) => ({
        ...r,
        day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day).slice(0, 10),
      })),
      subjects: subjects.rows,
      split: split.rows,
      feedback: recentFeedback.rows,
    })
  } catch (err) {
    /*
     * The caller has already proved they hold the admin token, so telling
     * them what actually went wrong is far more useful than a generic
     * failure — this is the difference between a five-minute fix and an
     * afternoon in the logs. Message only, never the stack.
     */
    console.error('[brainy:stats]', err)
    return res.status(500).json({
      ok: false,
      error: explain(err),
      hint: 'Check DATABASE_URL is the pooled connection string, then redeploy.',
    })
  }
}
