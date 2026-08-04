/**
 * Erase everything held for one install.
 *
 * Turning sharing off already destroys the id on the device, which stops any
 * further collection — but on its own it strands the rows already sent, with
 * nothing left on the device able to name them. So the moment a parent
 * deletes their account is the last moment we can still honour a deletion,
 * because it is the last moment the id exists. This runs then.
 *
 * No token: holding the id is the proof. It is a random opaque string that
 * only that device has, the rows behind it contain no personal data, and
 * requiring an admin token would mean a parent could never actually exercise
 * this. Worst case, someone who has somehow obtained an id can delete counts
 * of quests — which is a deletion, not a disclosure.
 */

import { explain, query } from './_db.js'

/*
 * `installs` keys the id as its primary key; the rest carry it as a column.
 *
 * `licence_devices` is here too, which is worth a word: it is the one table
 * that touches both halves of the product. Removing the row loses the record of
 * which tablets used a family's code — a number that only exists to spot a code
 * being passed around — while the licence itself, which belongs to the parent
 * and not to the device, is untouched. Erasing a device must not cancel what
 * somebody paid for.
 */
const TABLES = [
  ['events', 'install_id'],
  ['summaries', 'install_id'],
  ['feedback', 'install_id'],
  ['licence_devices', 'install_id'],
  ['installs', 'id'],
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' })

  let body = req.body
  if (typeof body === 'string' || body === undefined) {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    try {
      body = JSON.parse(Buffer.concat(chunks).toString() || '{}')
    } catch {
      return res.status(400).json({ ok: false, error: 'bad JSON' })
    }
  }

  const installId = typeof body?.installId === 'string' ? body.installId.slice(0, 64) : ''
  if (!installId) return res.status(400).json({ ok: false, error: 'installId required' })

  try {
    const deleted = {}
    for (const [table, column] of TABLES) {
      const r = await query(`delete from ${table} where ${column} = $1`, [installId])
      // No database configured at all: nothing was ever stored, so the
      // parent's request is already satisfied.
      if (!r) return res.status(200).json({ ok: true, deleted: {}, note: 'no store configured' })
      deleted[table] = r.rowCount ?? 0
    }
    return res.status(200).json({ ok: true, deleted })
  } catch (err) {
    /*
     * Unlike ingest, this must not pretend to have succeeded. A parent told
     * their data was erased when it was not is a promise broken, so the
     * failure is reported and the app says plainly what could not be done.
     */
    console.error('[brainy:forget]', err)
    return res.status(500).json({ ok: false, error: explain(err) })
  }
}
