/**
 * Receives the anonymous weekly summary and in-app feedback.
 *
 * Vercel serverless function. Written in plain JS on purpose: it needs no
 * build step, no dependency, and no place in the app's TypeScript project.
 *
 * Storage is deliberately pluggable, because the right answer depends on what
 * you already run:
 *
 *   DATABASE_URL         Postgres. Summaries and feedback are stored and show
 *                        up on the admin dashboard.
 *   REPORT_WEBHOOK_URL   Optionally also POST each one on to Slack, Discord, a
 *                        Google Apps Script or an email relay, so feedback
 *                        lands where you already look rather than waiting to
 *                        be checked.
 *   (neither set)        Log to stdout, visible in the Vercel function logs.
 *
 * A random install id may be present, but only for a parent who opted in —
 * it is minted at that moment and destroyed if they opt out. It distinguishes
 * one browser profile from another so a tablet is not counted twice; it is
 * not tied to a person and cannot be resolved to one. Nothing is written to a
 * cookie, and no IP address or user agent is recorded beyond whatever the
 * platform keeps in its own access logs.
 */

import { query } from './_db.js'
import { clip as clipOrNull, readJson } from './_http.js'

const MAX_BODY = 64 * 1024

/*
 * The shared helper returns null for a missing field; this route has always
 * used undefined, which is what `JSON.stringify` drops from the forwarded
 * payload. Keeping that behaviour means a webhook consumer sees an absent key
 * rather than a null one.
 */
const clip = (value, max) => clipOrNull(value, max) ?? undefined

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST')
    return res.status(204).end()
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'POST only' })
  }

  let body
  try {
    body = await readJson(req, MAX_BODY)
  } catch {
    return res.status(400).json({ ok: false, error: 'bad body' })
  }

  const type = body?.type
  if (type !== 'weekly' && type !== 'feedback') {
    return res.status(400).json({ ok: false, error: 'unknown type' })
  }

  /*
   * Re-shape rather than forwarding whatever arrived. A client could be
   * modified to send more than it should; the server decides what is kept.
   */
  const record =
    type === 'weekly'
      ? {
          type: 'weekly',
          week: clip(body.week, 16),
          app: clip(body.app, 16),
          children: Array.isArray(body.children)
            ? body.children.slice(0, 6).map((c) => clip(c, 4000))
            : [],
        }
      : {
          type: 'feedback',
          app: clip(body.app, 16),
          category: clip(body.category, 32),
          message: clip(body.message, 2000),
          contact: clip(body.contact, 160),
          summary: clip(body.summary, 4000),
        }

  try {
    if (record.type === 'weekly') {
      for (const bodyText of record.children) {
        await query(
          `insert into summaries (install_id, week, app_version, body) values ($1, $2, $3, $4)`,
          [clip(body.installId, 64), record.week, record.app, bodyText],
        )
      }
    } else {
      await query(
        `insert into feedback (install_id, category, message, contact, summary, app_version)
         values ($1, $2, $3, $4, $5, $6)`,
        [
          clip(body.installId, 64),
          record.category,
          record.message,
          record.contact,
          record.summary,
          record.app,
        ],
      )
    }
  } catch (err) {
    console.error('[brainy] store failed', err instanceof Error ? err.message : err)
  }

  const webhook = process.env.REPORT_WEBHOOK_URL
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      })
    } catch (err) {
      // Never fail the parent's send because our forwarding is down; the log
      // line below still captures it.
      console.error('[brainy] webhook failed', err instanceof Error ? err.message : err)
    }
  }

  console.log(`[brainy] ${record.type}\n${JSON.stringify(record, null, 2)}`)
  return res.status(200).json({ ok: true })
}
