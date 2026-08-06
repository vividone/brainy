/**
 * Email, through Resend.
 *
 * Four messages, and every one of them exists because a parent would otherwise
 * be stuck: the code they need to unlock a second tablet, the confirmation that
 * their money arrived, and the warning before a year runs out under them. There
 * is no newsletter, no drip sequence, and no marketing — an address given to
 * restore access is used for that and nothing else, which is what the privacy
 * notice promises and therefore what this file is allowed to do.
 *
 * Called over Resend's REST API rather than through their SDK, for the same
 * reason the routes are plain JavaScript: it is one `fetch`, it needs no build
 * step, and it keeps the dependency list at "pg".
 *
 * **Never allowed to fail the thing it describes.** A parent who has paid must
 * end up with a licence whether or not the receipt sends, so every function
 * here swallows its errors and logs them. The code is always shown on screen as
 * well; email is the copy they can find again in a month, not the only copy.
 */

import { audit } from './db.js'

const ENDPOINT = 'https://api.resend.com/emails'
const TIMEOUT_MS = 10_000

const APP_URL = () => (process.env.PUBLIC_BASE_URL || 'https://brainy.fortbridge.app').replace(/\/+$/, '')

/** Where mail comes from. Must be on a domain verified in Resend. */
const FROM = () => process.env.EMAIL_FROM || 'Brainy <brainy@fortbridge.app>'
const REPLY_TO = () => process.env.EMAIL_REPLY_TO || null

const configured = () => Boolean(process.env.RESEND_API_KEY)

/* ------------------------------------------------------------------ *
 * Transport
 * ------------------------------------------------------------------ */

/**
 * Send one message to one person.
 *
 * One recipient per call, always: nothing here has any business putting two
 * families' addresses in the same header.
 */
async function send({ to, subject, text, html, tag }) {
  if (!configured()) {
    console.log(`[brainy:email] RESEND_API_KEY not set — would have sent "${subject}" to ${to}`)
    return { ok: false, skipped: true }
  }
  if (!to) return { ok: false, skipped: true }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM(),
        to: [to],
        subject,
        text,
        html,
        ...(REPLY_TO() ? { reply_to: REPLY_TO() } : {}),
      }),
      signal: controller.signal,
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      /*
       * Resend's own message is the useful part — an unverified sending domain
       * and a malformed address fail identically from out here otherwise, and
       * the first is a five-minute DNS fix.
       */
      console.error(`[brainy:email] ${subject} → ${to} failed: ${data?.message ?? res.status}`)
      return { ok: false, error: data?.message ?? `Resend returned ${res.status}` }
    }
    /* Recorded so "did they ever get their code?" has an answer. */
    await audit('system', `email.${tag}`, to, data?.id ?? null)
    return { ok: true, id: data?.id ?? null }
  } catch (err) {
    console.error('[brainy:email] failed', err instanceof Error ? err.message : err)
    return { ok: false, error: 'send failed' }
  } finally {
    clearTimeout(timer)
  }
}

/* ------------------------------------------------------------------ *
 * Presentation
 * ------------------------------------------------------------------ */

const esc = (value) =>
  String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

const money = (minor, currency) => {
  const value = Number(minor ?? 0) / 100
  try {
    return value.toLocaleString('en-NG', {
      style: 'currency',
      currency: currency || 'NGN',
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    })
  } catch {
    return `${currency ?? ''} ${value.toLocaleString('en')}`.trim()
  }
}

const longDate = (value) =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

/** "It never expires." / "It runs until 4 August 2027." */
const expiryLine = (licence) =>
  licence.expiresAt ? `It runs until ${longDate(licence.expiresAt)}.` : 'It never expires.'

/*
 * Inline styles, a single column, and a plain-text twin for every message.
 * Email clients strip stylesheets, and a parent reading this on a Nigerian
 * Android inbox should get something legible rather than something clever.
 */
const wrap = (heading, bodyHtml) => `
<div style="margin:0;padding:24px 12px;background:#f8fafc;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:28px">
    <p style="margin:0 0 18px;font-size:20px;font-weight:800;color:#7c3aed;letter-spacing:-0.01em">Brainy</p>
    <h1 style="margin:0 0 14px;font-size:22px;line-height:1.25;font-weight:800">${esc(heading)}</h1>
    ${bodyHtml}
    <p style="margin:26px 0 0;padding-top:16px;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.6;color:#64748b">
      We only ever use your address for your access to Brainy — never for marketing, and we do not pass
      it on. Just reply to this email if anything is wrong; a person reads it.
    </p>
  </div>
</div>`

const p = (text) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.65">${text}</p>`

const codeBlock = (code) => `
  <div style="margin:18px 0;padding:16px;background:#f5f3ff;border:2px dashed #7c3aed;border-radius:12px;text-align:center">
    <p style="margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#6d28d9">Your family code</p>
    <p style="margin:0;font-size:24px;font-weight:800;letter-spacing:0.12em;font-family:Consolas,'SFMono-Regular',monospace">${esc(code)}</p>
  </div>`

const howToUse = () => `
  ${p(`<b>To unlock a tablet:</b> open <a href="${APP_URL()}/play/" style="color:#7c3aed">${esc(APP_URL())}/play/</a>,
   tap the grown-up button, then <b>Access</b>, and type the code in.`)}
  ${p('Keep this email. The code is how you unlock another tablet, or the same one after a reset — there is no account and no password to remember.')}`

const HOW_TO_USE_TEXT = (url) =>
  `To unlock a tablet: open ${url}/play/, tap the grown-up button, then Access, and type the code in.\n\n` +
  `Keep this email. The code is how you unlock another tablet, or the same one after a reset — there is no account and no password to remember.`

const SIGN_OFF = '\n\nWe only ever use your address for your access to Brainy — never for marketing, and we do not pass it on. Reply to this email if anything is wrong; a person reads it.\n'

/* ------------------------------------------------------------------ *
 * The messages
 * ------------------------------------------------------------------ */

/**
 * The six-digit sign-in code.
 *
 * The most time-critical email the product sends: somebody is staring at a form
 * waiting for it. So the code goes in the **subject line as well as the body** —
 * on a phone that means it can be read from the notification without opening
 * anything, which is the difference between fifteen seconds and giving up.
 *
 * It also has to work as a warning. A parent who receives this without asking is
 * being told, in the one channel we know reaches them, that somebody typed their
 * address into Brainy — so the email says what to do about that, which is
 * nothing, because a code alone grants no access.
 */
export function sendSignInCode({ email: address, code, minutes }) {
  return send({
    to: address,
    tag: 'signin',
    subject: `${code} is your Brainy sign-in code`,
    text: `Your Brainy sign-in code is:

    ${code}

Type it into Brainy to finish signing in. It works once and expires in ${minutes} minutes.

If you did not ask for this, you can ignore it — the code is useless on its own, nobody can get into
your account without it, and we will not email you again unless you ask. Nothing about your child is
in this email or in your account unless you have chosen to keep their progress there.${SIGN_OFF}`,
    html: wrap(
      'Your sign-in code',
      `${p('Type this into Brainy to finish signing in:')}
       <div style="margin:18px 0;padding:18px;background:#f5f3ff;border:2px dashed #7c3aed;border-radius:12px;text-align:center">
         <p style="margin:0;font-size:34px;font-weight:800;letter-spacing:0.22em;font-family:Consolas,'SFMono-Regular',monospace">${esc(code)}</p>
       </div>
       ${p(`It works once, and expires in ${esc(minutes)} minutes.`)}
       ${p('<b>Did not ask for this?</b> Ignore it. The code is useless on its own, nobody can reach your account without it, and we will not email you again unless you ask.')}`,
    ),
  })
}

/**
 * "Here is your code" — the one email that must never go missing.
 *
 * Sent whenever a licence starts: a free place claimed, a coupon redeemed, or a
 * grant made by hand from the dashboard.
 */
export function sendLicence(licence, { reason } = {}) {
  const url = APP_URL()
  const greeting = licence.name ? `Hello ${licence.name},` : 'Hello,'
  const opening =
    reason === 'free-place'
      ? 'You have one of the free family places, so every subject is open for one child — permanently.'
      : `Every subject is now open for one child. ${licence.planLabel ?? ''}`.trim()

  return send({
    to: licence.email,
    tag: 'licence',
    subject: 'Your Brainy access code',
    text: `${greeting}

${opening} ${expiryLine(licence)}

    ${licence.code}

${HOW_TO_USE_TEXT(url)}

Mathematics stays free for everybody whatever happens to a licence, and nothing your child has already earned — stars, coins, streaks — is ever taken away.${SIGN_OFF}`,
    html: wrap(
      'Your Brainy access code',
      `${p(esc(greeting))}
       ${p(`${esc(opening)} ${esc(expiryLine(licence))}`)}
       ${codeBlock(licence.code)}
       ${howToUse()}
       ${p('Mathematics stays free for everybody whatever happens to a licence, and nothing your child has already earned — stars, coins, streaks — is ever taken away.')}`,
    ),
  })
}

/**
 * "We have your details" — for a sign-up that granted nothing.
 *
 * Says so plainly rather than implying access is on its way, and points at the
 * part they can use today, which is all of maths.
 */
export function sendPending(parent) {
  const url = APP_URL()
  const greeting = parent.name ? `Hello ${parent.name},` : 'Hello,'

  return send({
    to: parent.email,
    tag: 'pending',
    subject: 'Thanks for signing up to Brainy',
    text: `${greeting}

Thank you — we have your details, and we will write to you before anything changes.

The free family places are all taken at the moment, so nothing is unlocked yet. Mathematics is free for everybody, with no sign-up and no card: your child's class and every earlier class as revision, for as long as you like.

Start here: ${url}/play/

On a phone, use "Add to home screen" so it opens like an app and works without data.${SIGN_OFF}`,
    html: wrap(
      'Thanks for signing up',
      `${p(esc(greeting))}
       ${p('Thank you — we have your details, and we will write to you before anything changes.')}
       ${p('The free family places are all taken at the moment, so nothing is unlocked yet. <b>Mathematics is free for everybody</b>, with no sign-up and no card: your child’s class and every earlier class as revision, for as long as you like.')}
       ${p(`<a href="${url}/play/" style="color:#7c3aed;font-weight:700">Open Brainy</a> — on a phone, use “Add to home screen” so it opens like an app and works without data.`)}`,
    ),
  })
}

/** Payment received: the amount, the reference, and the code. */
export function sendReceipt(licence, payment) {
  const url = APP_URL()
  const greeting = licence.name ? `Hello ${licence.name},` : 'Hello,'
  const amount = money(payment.amount, payment.currency)

  return send({
    to: licence.email,
    tag: 'receipt',
    subject: 'Your Brainy licence — payment received',
    text: `${greeting}

Thank you. We have received ${amount} for ${licence.planLabel ?? payment.plan}, and every subject is now open for one child. ${expiryLine(licence)}

    ${licence.code}

${HOW_TO_USE_TEXT(url)}

Payment reference: ${payment.reference}
Paystack handled the payment and holds the card receipt; we never see card details.${SIGN_OFF}`,
    html: wrap(
      'Payment received',
      `${p(esc(greeting))}
       ${p(`Thank you. We have received <b>${esc(amount)}</b> for ${esc(licence.planLabel ?? payment.plan)}, and every subject is now open for one child. ${esc(expiryLine(licence))}`)}
       ${codeBlock(licence.code)}
       ${howToUse()}
       ${p(`<span style="color:#64748b;font-size:13px">Payment reference ${esc(payment.reference)} · Paystack handled the payment and holds the card receipt; we never see card details.</span>`)}`,
    ),
  })
}

/**
 * "Your year runs out soon."
 *
 * Sent once, a week before. The point is that a lapse is never a surprise: it
 * says exactly what will happen, which is less than a parent fears — maths
 * stays, progress stays, and only new content in the paid subjects closes.
 */
export function sendExpiring(licence, daysLeft) {
  const url = APP_URL()
  const greeting = licence.name ? `Hello ${licence.name},` : 'Hello,'
  const when = `${daysLeft} day${daysLeft === 1 ? '' : 's'}`

  return send({
    to: licence.email,
    tag: 'expiring',
    subject: `Brainy: your access runs out in ${when}`,
    text: `${greeting}

Your Brainy licence runs out on ${longDate(licence.expiresAt)} — ${when} from now.

To renew: open ${url}/play/, tap the grown-up button, then Access.

If you would rather not, nothing dramatic happens. Mathematics stays free and open, everything your child has earned stays exactly as it is, and the other subjects simply stop opening new work. You can renew at any point afterwards and pick up where they left off.

Your code, unchanged: ${licence.code}${SIGN_OFF}`,
    html: wrap(
      `Your access runs out in ${when}`,
      `${p(esc(greeting))}
       ${p(`Your Brainy licence runs out on <b>${esc(longDate(licence.expiresAt))}</b> — ${esc(when)} from now.`)}
       ${p(`To renew: open <a href="${url}/play/" style="color:#7c3aed">Brainy</a>, tap the grown-up button, then <b>Access</b>.`)}
       ${p('If you would rather not, nothing dramatic happens. Mathematics stays free and open, everything your child has earned stays exactly as it is, and the other subjects simply stop opening new work. You can renew at any point afterwards and pick up where they left off.')}
       ${codeBlock(licence.code)}`,
    ),
  })
}

/**
 * "We have your transfer details" — sent the moment a claim is submitted.
 *
 * Its whole job is to stop a parent who has just moved real money wondering
 * whether it went into a void. So it is explicit that nothing is unlocked *yet*,
 * says roughly how long the check takes, and never implies otherwise.
 */
export function sendTransferReceived(request) {
  const greeting = request.name ? `Hello ${request.name},` : 'Hello,'
  const amount = money(request.amount, request.currency)

  return send({
    to: request.email,
    tag: 'transfer-received',
    subject: 'We have your payment details — checking now',
    text: `${greeting}

Thank you. We have your transfer details for ${request.planLabel ?? request.plan} (${amount}).

Nothing is unlocked yet: someone has to see the money arrive in the account first. That is usually the
same day, and at most a couple of days. As soon as it is confirmed we will email your access code,
and typing it into the grown-up area opens every subject.

If anything looks wrong — the wrong amount, or a transfer that has not left your bank — just reply to
this email and we will sort it out.

In the meantime maths stays free and open, as always.${SIGN_OFF}`,
    html: wrap(
      'We have your payment details',
      `${p(esc(greeting))}
       ${p(`Thank you. We have your transfer details for <b>${esc(request.planLabel ?? request.plan)}</b> (${esc(amount)}).`)}
       ${p('<b>Nothing is unlocked yet</b> — someone has to see the money arrive in the account first. That is usually the same day, and at most a couple of days. As soon as it is confirmed we will email your access code, and typing it into the grown-up area opens every subject.')}
       ${p('If anything looks wrong — the wrong amount, or a transfer that has not left your bank — just reply to this email and we will sort it out.')}
       ${p('In the meantime maths stays free and open, as always.')}`,
    ),
  })
}

/**
 * A transfer we could not find.
 *
 * Written to be answerable rather than final: most declines are a transfer still
 * in flight or a name that does not match, and the parent is the only person who
 * can clear that up. Never accusatory — somebody who has just been told "we
 * cannot see your money" is worried, not suspected.
 */
export function sendTransferDeclined(request, reason) {
  const greeting = request.name ? `Hello ${request.name},` : 'Hello,'

  return send({
    to: request.email,
    tag: 'transfer-declined',
    subject: 'About your Brainy payment',
    text: `${greeting}

We have looked for your transfer for ${request.planLabel ?? request.plan} and could not confirm it yet.

${reason ? `What we found: ${reason}\n\n` : ''}This is usually something simple — a transfer still in
transit, an amount that came through short, or a sending name we could not match to you. Reply to this
email with anything that helps us find it and we will look again. If the money did leave your account
and we cannot locate it, tell us and we will keep looking rather than leave you out of pocket.

Nothing has been taken from you by us, and maths stays free and open in the meantime.${SIGN_OFF}`,
    html: wrap(
      'About your payment',
      `${p(esc(greeting))}
       ${p(`We have looked for your transfer for <b>${esc(request.planLabel ?? request.plan)}</b> and could not confirm it yet.`)}
       ${reason ? p(`<b>What we found:</b> ${esc(reason)}`) : ''}
       ${p('This is usually something simple — a transfer still in transit, an amount that came through short, or a sending name we could not match to you. Reply to this email with anything that helps us find it and we will look again. If the money did leave your account and we cannot locate it, tell us and we will keep looking rather than leave you out of pocket.')}
       ${p('Nothing has been taken from you by us, and maths stays free and open in the meantime.')}`,
    ),
  })
}

/**
 * Tell the operator, by email, when there is nothing to look at a dashboard for.
 *
 * Separate from `REPORT_WEBHOOK_URL` because not everybody runs Slack, and a
 * sign-up nobody hears about is the whole problem this file exists to fix.
 */
export function sendToOperator(subject, lines) {
  const to = process.env.OPERATOR_EMAIL
  if (!to) return Promise.resolve({ ok: false, skipped: true })
  const text = lines.filter(Boolean).join('\n')
  return send({
    to,
    tag: 'operator',
    subject: `Brainy — ${subject}`,
    text,
    html: wrap(subject, p(esc(text).replace(/\n/g, '<br>'))),
  })
}

export const emailConfigured = configured
