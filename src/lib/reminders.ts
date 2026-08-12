/**
 * Daily-quest reminders, from the browser's side.
 *
 * The permission prompt is the delicate part. A browser gives a site **one**
 * chance at it: a parent who taps "Block" can only undo that in browser
 * settings, which most people never find. So nothing here asks until a parent
 * presses a button that says what it is for, in the grown-up area, and the app
 * never asks on a child's screen or on first run.
 *
 * Everything degrades to "not available" rather than throwing: a browser without
 * push, a device that refused, an iPhone that has not been installed to the home
 * screen. In each case the grown-up area says which it is, because "nothing
 * happened" is the one outcome a parent cannot act on.
 */

const KEY_URL = '/api/push/key'

export type ReminderState =
  | 'unsupported' /* No push in this browser at all. */
  | 'needs-install' /* iOS, in Safari rather than on the home screen. */
  | 'off' /* Available, not asked for yet. */
  | 'blocked' /* The parent said no, and only they can undo it. */
  | 'on'

/**
 * Base64url to the bytes the subscribe call wants.
 *
 * Typed as ArrayBuffer rather than Uint8Array because that is what
 * `applicationServerKey` accepts: recent TypeScript DOM types describe it as
 * `BufferSource`, and a Uint8Array over a generic ArrayBufferLike does not
 * satisfy it.
 */
function keyBytes(base64: string): ArrayBuffer {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i)
  return bytes.buffer
}

const standalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches === true ||
  (window.navigator as { standalone?: boolean }).standalone === true

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

export async function reminderState(): Promise<ReminderState> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    /*
     * iOS only grew push in 16.4, and only for installed apps. Saying "your
     * browser cannot" to somebody whose browser can, once they install, would be
     * both wrong and a dead end.
     */
    return isIOS() && !standalone() ? 'needs-install' : 'unsupported'
  }
  if (Notification.permission === 'denied') return 'blocked'
  if (Notification.permission !== 'granted') return 'off'

  const registration = await navigator.serviceWorker.getRegistration()
  const existing = await registration?.pushManager.getSubscription()
  return existing ? 'on' : 'off'
}

/** Whether the server can send at all, so a dead switch is never offered. */
export async function remindersAvailable(): Promise<boolean> {
  try {
    const res = await fetch(KEY_URL)
    const data = await res.json()
    return Boolean(data?.enabled && data?.key)
  } catch {
    return false
  }
}

/**
 * Ask for permission, subscribe, and register the choice with the account.
 *
 * Called only from a real button press, because browsers require a user gesture
 * and because asking without one is how a site loses the permission for good.
 */
export async function turnOnReminders(
  token: string,
  hour: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(KEY_URL)
    const { enabled, key } = await res.json()
    if (!enabled || !key) return { ok: false, error: 'Reminders are not switched on yet at our end.' }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return {
        ok: false,
        error:
          permission === 'denied'
            ? 'Your browser is set to block notifications from Brainy. That has to be changed in browser settings.'
            : 'No reminder set. You can turn it on whenever you like.',
      }
    }

    const registration = await navigator.serviceWorker.ready
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(key),
      }))

    const saved = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        hour,
        /* Sent so the server can work out when 5pm is here, and recalculated on
           every change so a family who moves country is not reminded at 3am. */
        tzOffset: new Date().getTimezoneOffset(),
        label: navigator.userAgent.includes('Android') ? 'Android' : isIOS() ? 'iPhone or iPad' : 'This browser',
      }),
    })
    const data = await saved.json().catch(() => null)
    if (!saved.ok || !data?.ok) {
      return { ok: false, error: (data?.error as string) ?? 'We could not save that reminder.' }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Something went wrong setting that up.' }
  }
}

/** Stop reminders on this device, at both ends. */
export async function turnOffReminders(token: string): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    if (subscription) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch(() => {})
      /* Local last: if the server call fails the browser is still subscribed, and
         a reminder that keeps arriving is better than one that arrives from a row
         nobody can delete. */
      await subscription.unsubscribe()
    }
  } catch {
    /* Nothing to undo. */
  }
}
