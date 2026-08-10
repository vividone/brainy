/*
 * The contact form.
 *
 * One fetch, no library, and it never leaves somebody staring at a form that
 * did nothing: every path ends in a sentence. The address is not validated
 * beyond the shape the browser already checks, because the server is the thing
 * that has to be sure and a page that argues with an address is a page people
 * abandon.
 */

const form = document.getElementById('contact')
const button = document.getElementById('c-go')
const message = document.getElementById('c-msg')

const say = (text, kind) => {
  message.textContent = text
  message.className = `msg ${kind}`
  message.hidden = false
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()

  const payload = {
    kind: document.getElementById('c-kind').value,
    name: document.getElementById('c-name').value.trim(),
    email: document.getElementById('c-email').value.trim(),
    message: document.getElementById('c-message').value.trim(),
    website: document.getElementById('c-website').value.trim(),
  }

  if (payload.message.length < 10) return say('Please write a little more so we can help.', 'bad')
  if (!payload.email) return say('We need an email address to reply to.', 'bad')

  button.disabled = true
  button.textContent = 'Sending…'

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => null)

    if (res.ok && data && data.ok) {
      form.reset()
      button.textContent = 'Sent'
      say('Thank you. That came through, and a person will read it. We aim to reply within two working days.', 'good')
      return
    }

    button.disabled = false
    button.textContent = 'Send'
    say((data && data.error) || 'That did not go through. Please try again in a moment.', 'bad')
  } catch {
    /* Offline, or we are down. The address below always works, so say so
       rather than asking them to try again into the void. */
    button.disabled = false
    button.textContent = 'Send'
    say(
      'We could not reach our server. Check your connection, or email brainy@fortbridge.app directly and we will pick it up there.',
      'bad',
    )
  }
})
