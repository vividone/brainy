/**
 * What a signed-in parent can see and change about their own account.
 *
 *   GET    /api/account                  licence, children we hold, consent state
 *   POST   /api/account/keep-progress    { on }  the consent switch
 *   DELETE /api/account/child            { id }  forget one child
 *   POST   /api/account/signout-all      end every device
 *
 * This is the parent-facing counterpart to the admin dashboard, and the whole of
 * it is scoped to `parent.id` from the bearer token — there is no route here that
 * takes an account identifier, so there is nothing to tamper with.
 *
 * `GET /api/account` is also the endpoint that answers "what happened to my
 * licence?" on a device that has been offline for a month, which is why it
 * returns the licence in the same shape `/api/activate` does.
 */

import { NoDatabase, explain, one } from '../lib/db.js'
import { clip, readJson, searchParams } from '../lib/http.js'
import {
  checkCode,
  forgetLearner,
  learnersFor,
  prefsFor,
  requireParent,
  revokeAllTokens,
  setKeepProgress,
  setParentPin,
} from '../lib/accounts.js'
import { ensureSubscription, expireIfDue, licencePayload } from '../lib/licence.js'

async function overview(parent, res) {
  const subscription = await expireIfDue(await ensureSubscription(parent.id))
  const prefs = await prefsFor(parent.id)
  const children = prefs.keepProgress ? await learnersFor(parent.id) : []

  return res.status(200).json({
    ok: true,
    account: {
      email: parent.email,
      name: parent.name ?? null,
      keepProgress: prefs.keepProgress,
      /* So a second tablet adopts the family's own code instead of 1234. */
      parentPin: prefs.parentPin,
    },
    licence: licencePayload(subscription, parent),
    /*
     * Empty when consent is off — not because it is filtered out of the response,
     * but because there is nothing in the table to return. Worth stating: this
     * response is the parent's own audit of what we hold about their children.
     */
    children: children.map((c) => ({
      id: c.id,
      name: c.name,
      age: c.age,
      curriculumId: c.curriculum_id,
      yearBand: c.year_band,
      updatedAt: c.updated_at,
    })),
  })
}

async function keepProgress(req, parent, res) {
  const body = await readJson(req, 4 * 1024).catch(() => ({}))
  if (typeof body?.on !== 'boolean') {
    return res.status(400).json({ ok: false, error: 'Say on: true or on: false.' })
  }
  const prefs = await setKeepProgress(parent.id, body.on)
  return res.status(200).json({ ok: true, ...prefs })
}

async function forgetChild(req, parent, res) {
  const body = await readJson(req, 4 * 1024).catch(() => ({}))
  const id = clip(body?.id, 64) ?? clip(searchParams(req).get('id'), 64)
  if (!id) return res.status(400).json({ ok: false, error: 'Which child?' })

  const gone = await forgetLearner(parent.id, id)
  if (!gone) return res.status(404).json({ ok: false, error: 'We are not holding anything for that child.' })
  return res.status(200).json({ ok: true })
}

/**
 * Set or reset the four-digit grown-up code.
 *
 * Two callers, one route, and the difference is whether a six-digit email code
 * comes with it:
 *
 *  - **Changing it from inside the grown-up area.** The parent is already past
 *    the pad, so knowing the old code is the proof, and the device token is the
 *    proof that this is their account.
 *  - **Resetting it after forgetting it.** The device token proves the account
 *    but not the person: a child holding the tablet has the token too. So a code
 *    emailed to the account is required, which is the one thing a child cannot
 *    reach. Same fifteen-minute expiry and five-attempt limit as signing in,
 *    because it is literally the same mechanism.
 *
 * The old code is never sent back, to this device or any other. Recovery here
 * means choosing a new one, not being told the one you forgot.
 */
async function setPin(req, parent, res) {
  const body = await readJson(req, 2 * 1024).catch(() => ({}))
  const pin = String(body?.pin ?? '').replace(/\D/g, '')
  if (pin.length !== 4) {
    return res.status(400).json({ ok: false, error: 'A grown-up code is four digits.' })
  }

  if (body?.reset) {
    const checked = await checkCode(parent.email, body?.code)
    if (!checked.ok) return res.status(401).json({ ok: false, error: checked.error })
  }

  const saved = await setParentPin(parent.id, pin)
  if (!saved.ok) return res.status(400).json({ ok: false, error: saved.error })
  return res.status(200).json({ ok: true, parentPin: saved.parentPin })
}

export default async function handler(req, res) {
  const path = String(req.url ?? '')
    .split('?')[0]
    .replace(/^\/+/, '')
    .replace(/^api\/account\/?/, '')

  try {
    const parent = await requireParent(req, res)
    if (!parent) return

    if (path === '' && req.method === 'GET') return await overview(parent, res)
    if (path === 'keep-progress' && req.method === 'POST') return await keepProgress(req, parent, res)
    if (path === 'child' && (req.method === 'DELETE' || req.method === 'POST')) {
      return await forgetChild(req, parent, res)
    }
    if (path === 'pin' && req.method === 'POST') return await setPin(req, parent, res)
    if (path === 'signout-all' && req.method === 'POST') {
      const revoked = await revokeAllTokens(parent.id)
      return res.status(200).json({ ok: true, revoked })
    }

    res.setHeader('Allow', 'GET, POST, DELETE')
    return res.status(405).json({ ok: false, error: `No account route for ${req.method} ${path}.` })
  } catch (err) {
    if (err instanceof NoDatabase) {
      return res.status(503).json({ ok: false, error: 'We cannot reach your account right now.' })
    }
    console.error('[brainy:account]', err)
    return res.status(500).json({ ok: false, error: explain(err) })
  }
}
