/**
 * Reminder subscriptions: the key, signing up, and signing off.
 *
 * All three are behind the parent's device token, because a reminder belongs to
 * an account rather than to a browser that happens to be open. The permission
 * prompt itself is asked in the grown-up area and nowhere else, which is a rule
 * the client keeps; this file could not tell the difference and does not try.
 */

import { NoDatabase, explain } from '../lib/db.js'
import { readJson } from '../lib/http.js'
import { requireParent } from '../lib/accounts.js'
import { forgetSubscription, publicKey, pushConfigured, saveSubscription, subscriptionsFor } from '../lib/push.js'

export default async function handler(req, res) {
  const path = String(req.url ?? '')
    .split('?')[0]
    .replace(/^\/+/, '')
    .replace(/^api\/push\/?/, '')

  /*
   * The key is public by definition and is needed *before* a browser can
   * subscribe, so it is the one route here without a token. It also doubles as
   * "are reminders available at all", which is why the client asks for it first.
   */
  if (path === 'key' && req.method === 'GET') {
    return res.status(200).json({ ok: true, enabled: pushConfigured(), key: publicKey() })
  }

  try {
    const parent = await requireParent(req, res)
    if (!parent) return

    if (path === '' && req.method === 'GET') {
      return res.status(200).json({
        ok: true,
        enabled: pushConfigured(),
        reminders: await subscriptionsFor(parent.id),
      })
    }

    if (path === 'subscribe' && req.method === 'POST') {
      if (!pushConfigured()) {
        return res.status(503).json({ ok: false, error: 'Reminders are not switched on yet.' })
      }
      const body = await readJson(req, 8 * 1024).catch(() => ({}))
      const saved = await saveSubscription({
        parentId: parent.id,
        subscription: body?.subscription,
        localHour: Number(body?.hour),
        tzOffset: Number(body?.tzOffset),
        label: typeof body?.label === 'string' ? body.label.slice(0, 80) : null,
      })
      if (!saved.ok) return res.status(400).json({ ok: false, error: saved.error })
      return res.status(200).json({ ok: true, hour: saved.localHour })
    }

    if (path === 'unsubscribe' && req.method === 'POST') {
      const body = await readJson(req, 8 * 1024).catch(() => ({}))
      const gone = await forgetSubscription(parent.id, body?.endpoint)
      return res.status(200).json({ ok: true, removed: gone.removed })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: `No reminder route for ${req.method} ${path}.` })
  } catch (err) {
    if (err instanceof NoDatabase) {
      return res.status(503).json({ ok: false, error: 'We cannot reach your account right now.' })
    }
    console.error('[brainy:push]', err)
    return res.status(500).json({ ok: false, error: explain(err) })
  }
}
