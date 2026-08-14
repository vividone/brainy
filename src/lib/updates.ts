/**
 * Getting a new version onto a tablet that already has Brainy installed.
 *
 * What happens without this, which is worth spelling out because it looks like
 * it works: the injected `registerSW.js` registers the worker on page load and
 * nothing else. The browser then checks for a new `sw.js` only when the page
 * loads again, so an installed app left in the app switcher for a week never
 * looks. And even when a new worker installs, `skipWaiting` and `clientsClaim`
 * hand it control of a page whose JavaScript is already the old build — so the
 * child keeps using the old app until the *next* cold start. Two launches to
 * ship a fix, and none at all if they never fully close it.
 *
 * Three things fix that, in order of how much they help:
 *
 *  1. **Ask.** `registration.update()` whenever the app comes back to the
 *     foreground, and hourly while it is open.
 *  2. **Take over at a safe moment.** A new worker means new assets are already
 *     precached, so a reload is instant — but never mid-question. The reload is
 *     held until the app says it is somewhere safe.
 *  3. **A button.** The grown-up area can force all of it, which is what you
 *     want on a support call: "open the grown-up area and tap Check for updates".
 *
 * Nothing here touches the child's save: it reloads the page, it never clears
 * storage.
 */

/** Only check this often while the app sits open, in ms. */
const POLL_MS = 60 * 60 * 1000

let registration: ServiceWorkerRegistration | null = null
let waiting = false
let safe = true
let listeners: Array<(ready: boolean) => void> = []

const announce = () => listeners.forEach((fn) => fn(waiting))

/** True once a newer Brainy is downloaded and waiting to take over. */
export const updateReady = () => waiting

export function onUpdateReady(fn: (ready: boolean) => void): () => void {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}

/**
 * Whether it is a good moment to reload.
 *
 * A quest in progress is not: a child three questions in who is bounced to a
 * fresh screen has lost their session and their trust in one go. The session
 * screen sets this false while it runs.
 */
export function setSafeToReload(value: boolean): void {
  safe = value
  if (safe && waiting) applyNow()
}

/** Swap to the new version now. The assets are already cached, so it is instant. */
export function applyNow(): void {
  if (!waiting) return
  waiting = false
  /*
   * A plain reload rather than messaging the worker: with `skipWaiting` the new
   * worker has already activated by the time we see it, so the only thing left
   * to do is fetch the page again, which comes out of the new precache.
   */
  window.location.reload()
}

/** Ask the browser to look for a new version, and report whether it found one. */
export async function checkForUpdate(): Promise<boolean> {
  if (!registration) return false
  try {
    await registration.update()
  } catch {
    /* Offline, or the check failed. Nothing to say. */
  }
  return waiting
}

/**
 * Start watching. Called once, from the app entry point.
 *
 * Everything is optional-chained and wrapped: a browser with no service worker
 * support should lose the updating, not the app.
 */
export function watchForUpdates(): void {
  if (!('serviceWorker' in navigator)) return

  void navigator.serviceWorker.ready
    .then((reg) => {
      registration = reg

      /* A worker that installed while we were away is already waiting. */
      if (reg.waiting) {
        waiting = true
        announce()
      }

      reg.addEventListener('updatefound', () => {
        const fresh = reg.installing
        if (!fresh) return
        fresh.addEventListener('statechange', () => {
          /*
           * "installed" with an existing controller means an update rather than
           * a first install. Without that check, the very first visit would
           * offer to reload a page that has nothing to reload to.
           */
          if (fresh.state === 'installed' && navigator.serviceWorker.controller) {
            waiting = true
            announce()
            if (safe) applyNow()
          }
        })
      })
    })
    .catch(() => {})

  /*
   * Foreground and hourly. The visibility check is the one that matters: a
   * tablet that is closed and reopened all day never fires a page load, but it
   * fires this every time.
   */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForUpdate()
  })
  window.setInterval(() => void checkForUpdate(), POLL_MS)
}
