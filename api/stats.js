/**
 * Read side of the dashboard.
 *
 * Behind a shared token in ADMIN_TOKEN. That is deliberately modest security
 * — there is nothing identifying behind it — but the numbers are nobody
 * else's business, and an open endpoint invites scraping.
 */

import { query } from './_db.js'

const DAYS = 30

export default async function handler(req, res) {
  const token = process.env.ADMIN_TOKEN
  const given = req.headers['x-admin-token'] || new URL(req.url, 'http://x').searchParams.get('token')

  if (!token) return res.status(503).json({ ok: false, error: 'ADMIN_TOKEN is not set' })
  if (given !== token) return res.status(401).json({ ok: false, error: 'bad token' })

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
    console.error('[brainy:stats]', err instanceof Error ? err.message : err)
    return res.status(500).json({ ok: false, error: 'query failed' })
  }
}
