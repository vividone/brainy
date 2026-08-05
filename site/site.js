document.getElementById('yr').textContent = String(new Date().getFullYear())

/*
 * The sign-up form.
 *
 * Deliberately plain: one fetch, no library, and it degrades to a clear
 * message rather than a spinner if the server is unreachable. A parent who
 * cannot get through here can still use the whole of maths without ever
 * telling us anything, which is why nothing on this page blocks on it.
 */
const form = document.getElementById('join')
const message = document.getElementById('join-msg')
const button = document.getElementById('join-go')

const say = (text, kind) => {
  message.className = `fine ${kind ?? ''}`
  message.innerHTML = text
}

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = form.email.value.trim()
  if (!email) return

  button.disabled = true
  button.textContent = 'Sending…'
  say('')

  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        name: form.name.value.trim() || undefined,
        phone: form.phone.value.trim() || undefined,
        source: 'site',
      }),
    })
    const data = await res.json().catch(() => null)

    if (!res.ok || !data?.ok) {
      button.disabled = false
      button.textContent = 'Claim a free place'
      say(
        (data && data.error) ||
          'Something went wrong our end. Try again in a moment, or just open Brainy — maths is free without any of this.',
        'bad',
      )
      return
    }

    form.querySelectorAll('input').forEach((input) => (input.disabled = true))
    button.remove()

    /* Only mention the inbox when the server actually sent something. */
    const emailed = data.emailed
      ? ' We have emailed it to you as well.'
      : ' Write it down — this is the only place it is shown.'

    if (data.licence && data.licence.full) {
      /* A free place was still going, and it has been claimed. */
      say(
        `<b>You have a place — everything is unlocked.</b><br>Open Brainy, tap the grown-up
         button, then <b>Access</b>, and enter this code:
         <span class="code">${String(data.licence.code).replace(/[<>&]/g, '')}</span><br>
         Keep it somewhere safe: it is how you unlock another tablet later.${emailed}`,
        'good',
      )
    } else {
      say(
        `<b>Thank you — we have your details.</b><br>The free places are taken for now, so we will
         write to you before anything changes.${data.emailed ? ' There is a confirmation in your inbox.' : ''}
         Maths is yours to use in the meantime, free and with no limit.`,
        'good',
      )
    }
  } catch {
    button.disabled = false
    button.textContent = 'Claim a free place'
    say(
      'We could not reach the server. Check your connection, or open Brainy and register on the tablet instead.',
      'bad',
    )
  }
})
