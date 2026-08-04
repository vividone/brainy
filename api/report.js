/**
 * Receives the anonymous weekly summary and in-app feedback.
 *
 * Vercel serverless function. Written in plain JS on purpose: it needs no
 * build step, no dependency, and no place in the app's TypeScript project.
 *
 * Storage is deliberately pluggable, because the right answer depends on what
 * you already run:
 *
 *   REPORT_WEBHOOK_URL   POST the report on to Slack, Discord, a Google Apps
 *                        Script, Zapier, an email relay — anything that takes
 *                        a JSON POST. Set it and reports arrive where you
 *                        already look.
 *   (unset)              Log to stdout. Visible in the Vercel dashboard under
 *                        the function's logs. Fine for twenty families, not a
 *                        long-term store.
 *
 * What this must never do is grow into a profile. There is no identifier in
 * the payload, nothing is written to a cookie, and no IP address is recorded
 * beyond whatever the platform keeps in its own access logs.
 */

const MAX_BODY = 64 * 1024

/** @param {import('http').IncomingMessage & {body?: unknown}} req */
async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY) throw new Error('too large')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

const clip = (value, max) => (typeof value === 'string' ? value.slice(0, max) : undefined)

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
    body = await readJson(req)
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
