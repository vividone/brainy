/**
 * Usage ping ingest.
 *
 * Only ever reached when a parent has opted in. The payload is re-shaped
 * here rather than trusted, so a modified client cannot widen what we store.
 *
 * Note what is *not* recorded, deliberately: no IP address, no user agent, no
 * time of day. `created_at` exists for ordering, and everything the dashboard
 * groups by is the `day` the client reported, so a family's activity lands on
 * their own day rather than a UTC one.
 */

import { query } from './_db.js'
import { clip, num, readJson } from './_http.js'

const KINDS = new Set(['activate', 'open', 'session'])
const MAX_BODY = 16 * 1024

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false })
  }

  let body
  try {
    body = await readJson(req, MAX_BODY)
  } catch {
    return res.status(400).json({ ok: false })
  }

  const kind = body?.kind
  const installId = clip(body?.installId, 64)
  const day = clip(body?.day, 10)
  if (!KINDS.has(kind) || !installId || !/^\d{4}-\d{2}-\d{2}$/.test(day || '')) {
    return res.status(400).json({ ok: false })
  }

  const row = {
    installId,
    day,
    kind,
    subject: clip(body.subject, 32),
    questions: num(body.questions, 500),
    correct: num(body.correct, 500),
    durationMs: num(body.durationMs, 4 * 60 * 60 * 1000),
    curriculum: clip(body.curriculum, 32),
    yearBand: clip(body.yearBand, 8),
    children: num(body.children, 20),
    app: clip(body.app, 16),
  }

  try {
    const result = await query(
      `insert into events (install_id, day, kind, subject, questions, correct, duration_ms)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [row.installId, row.day, row.kind, row.subject, row.questions, row.correct, row.durationMs],
    )

    if (result) {
      // Upsert the install so activations and the curriculum split are a
      // single cheap read on the dashboard rather than a scan over events.
      await query(
        `insert into installs (id, first_seen, last_seen, curriculum, year_band, children, app_version)
         values ($1, $2, $2, $3, $4, $5, $6)
         on conflict (id) do update set
           last_seen  = greatest(installs.last_seen, excluded.last_seen),
           curriculum = coalesce(excluded.curriculum, installs.curriculum),
           year_band  = coalesce(excluded.year_band,  installs.year_band),
           children   = greatest(coalesce(excluded.children, 0), coalesce(installs.children, 0)),
           app_version = coalesce(excluded.app_version, installs.app_version)`,
        [row.installId, row.day, row.curriculum, row.yearBand, row.children, row.app],
      )
    } else {
      console.log('[brainy:event]', JSON.stringify(row))
    }
  } catch (err) {
    console.error('[brainy:event] failed', err instanceof Error ? err.message : err)
    // Still a 200: the client must not retry a ping into a loop, and a lost
    // ping costs a data point, not a child's progress.
  }

  return res.status(200).json({ ok: true })
}
