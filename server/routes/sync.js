/**
 * Keeping a child's progress in the parent's account.
 *
 *   GET  /api/sync    everything we hold for this account
 *   PUT  /api/sync    upload, accepted per child when it is newer
 *
 * **Consent-gated at the door.** Without the opt-in this route stores nothing and
 * returns nothing, and says which it is doing — so "an account alone uploads
 * nothing about your child" is enforced here rather than assumed to be true
 * because no client would ask. A client that asks anyway gets a 403.
 *
 * The upload is validated against a whitelist that *rejects* rather than strips —
 * see server/lib/sync.js for why that distinction is the whole guarantee.
 *
 * Last-writer-wins per child, on a client-side revision. A rejected upload comes
 * back with the newer stored copy attached, so one round trip resolves the
 * conflict instead of leaving the client to ask again.
 */

import { NoDatabase, explain } from '../lib/db.js'
import { clip, readJson } from '../lib/http.js'
import { prefsFor, requireParent, upsertLearner } from '../lib/accounts.js'
import { MAX_LEARNERS, readAll, validateLearner, writeOne } from '../lib/sync.js'

const CONSENT_MESSAGE =
  'This account has not asked us to keep a child’s progress. Turn it on in the grown-up area first.'

async function download(parent, res) {
  const prefs = await prefsFor(parent.id)
  if (!prefs.keepProgress) {
    /*
     * 200 rather than 403: asking "is there anything for me?" when the answer is
     * "no, by your own choice" is not an error, and the app calls this on every
     * launch. It should not have to treat the normal case as a failure.
     */
    return res.status(200).json({ ok: true, keepProgress: false, learners: [] })
  }
  return res.status(200).json({ ok: true, keepProgress: true, learners: await readAll(parent.id) })
}

async function upload(req, parent, res) {
  const prefs = await prefsFor(parent.id)
  if (!prefs.keepProgress) return res.status(403).json({ ok: false, error: CONSENT_MESSAGE })

  const body = await readJson(req, 2 * 1024 * 1024).catch(() => null)
  const incoming = Array.isArray(body?.learners) ? body.learners : null
  if (!incoming) return res.status(400).json({ ok: false, error: 'Send { learners: [...] }.' })
  if (incoming.length > MAX_LEARNERS) {
    return res.status(422).json({ ok: false, error: `More than ${MAX_LEARNERS} children in one upload.` })
  }

  /*
   * Validate everything before writing anything. A partial write would leave a
   * family half-synced with no way to tell which half, and the errors are far
   * more useful as one complete list than as the first thing that failed.
   */
  const checked = []
  const refused = []
  for (const entry of incoming) {
    const result = validateLearner(entry)
    if (result.ok) checked.push(result.learner)
    else refused.push(result.error)
  }
  if (refused.length > 0) {
    return res.status(422).json({
      ok: false,
      error: 'That upload contains things we do not keep.',
      refused,
    })
  }

  const label = clip(body?.label, 80)
  const results = {}
  for (const learner of checked) {
    /*
     * The profile is upserted here rather than in a separate call: a child that
     * exists on the tablet but not yet in the account is the normal case on the
     * first sync after consent, and requiring two round trips to establish that
     * would just be a second thing to fail.
     */
    await upsertLearner(parent.id, { id: learner.id, ...learner.profile })
    results[learner.id] = await writeOne(parent.id, learner, label)
  }

  return res.status(200).json({ ok: true, results })
}

export default async function handler(req, res) {
  try {
    const parent = await requireParent(req, res)
    if (!parent) return

    if (req.method === 'GET') return await download(parent, res)
    if (req.method === 'PUT' || req.method === 'POST') return await upload(req, parent, res)

    res.setHeader('Allow', 'GET, PUT')
    return res.status(405).json({ ok: false, error: 'GET or PUT only' })
  } catch (err) {
    if (err instanceof NoDatabase) {
      return res.status(503).json({ ok: false, error: 'We cannot reach your account right now.' })
    }
    console.error('[brainy:sync]', err)
    return res.status(500).json({ ok: false, error: explain(err) })
  }
}
