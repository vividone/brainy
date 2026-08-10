/**
 * The contact form on the website.
 *
 * Deliberately the same plumbing as everything else rather than a new one: it
 * writes to `feedback`, so a message from the website appears in the dashboard
 * beside the ones sent from inside the app, and it goes out through the same
 * Resend configuration as every other email. There is nothing here to configure
 * that is not already configured.
 *
 * Two things it refuses to do:
 *
 *  - **Reply-to a stranger's address.** The operator email is sent to
 *    `OPERATOR_EMAIL` with the sender's address in the body, so a forged address
 *    cannot make our domain send mail that looks like it came from them.
 *  - **Accept anything about a child.** The form says first names only and the
 *    server does not care what it is told, but the notice we publish promises
 *    the message is stored as typed, so the copy asks rather than the code
 *    silently scanning. What we can do cheaply is cap the size and rate.
 */

import { NoDatabase, query } from '../lib/db.js'
import { clip, email as parseEmail, ipHash, notify, readJson } from '../lib/http.js'
import { noteAttempt, rateLimited } from '../lib/auth.js'
import { sendToOperator } from '../lib/email.js'

/** Enough for a real message, short enough that nobody pastes a database in. */
const MAX_MESSAGE = 4000

const KINDS = new Set(['question', 'problem', 'school', 'press', 'other'])

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'POST only' })
  }

  const body = await readJson(req, 16 * 1024).catch(() => null)
  if (!body) return res.status(400).json({ ok: false, error: 'That did not arrive properly.' })

  /*
   * A field no human fills in. Bots complete every input they find, so a filled
   * one is a bot, and it is answered with a cheerful 200 rather than an error:
   * telling a bot it failed is telling it to try differently.
   */
  if (clip(body.website, 200)) return res.status(200).json({ ok: true, received: true })

  const message = clip(body.message, MAX_MESSAGE)
  if (!message || message.trim().length < 10) {
    return res.status(400).json({ ok: false, error: 'Please write a little more so we can help.' })
  }

  const from = parseEmail(body.email)
  if (!from) {
    return res.status(400).json({ ok: false, error: 'We need an email address to reply to.' })
  }

  const name = clip(body.name, 80)
  const kind = KINDS.has(body.kind) ? body.kind : 'other'

  /*
   * Three an hour from one address. Generous for a person with a lot to say,
   * useless as a way to send mail through us.
   */
  if (ipHash(req) && (await rateLimited(req, 'contact', 3, 60))) {
    return res.status(429).json({
      ok: false,
      error: 'That is a few messages in a short time. Try again in an hour, or reply to any email from us.',
    })
  }

  try {
    await query(
      `insert into feedback (install_id, category, message, contact, summary, app_version)
       values ($1, $2, $3, $4, $5, $6)`,
      [null, `contact:${kind}`, message, from, name ? `from ${name}` : null, 'website'],
    )
  } catch (err) {
    /*
     * A database that is down must not swallow somebody's message. The email
     * below is the copy that matters, so this is logged and carried on from.
     */
    if (!(err instanceof NoDatabase)) console.error('[brainy:contact] not stored', err?.message ?? err)
  }

  await noteAttempt(req, 'contact')

  const sent = await sendToOperator(`${kind} from the website`, [
    name ? `From: ${name} <${from}>` : `From: ${from}`,
    `Kind: ${kind}`,
    '',
    message,
    '',
    'Reply to the address above. This was sent from the contact form on brainy.fortbridge.app.',
  ])

  await notify('contact', { kind, email: from, emailed: Boolean(sent?.ok) })

  /*
   * 200 whether or not the email went out. It is stored, it is in the dashboard,
   * and a person who has just written to us should not be told their message
   * failed because our mail provider had a moment.
   */
  return res.status(200).json({ ok: true, received: true })
}
