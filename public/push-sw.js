/**
 * The push half of the service worker.
 *
 * Pulled into the generated worker by `workbox.importScripts` in vite.config.ts
 * rather than replacing it. The generated worker is what makes Brainy work
 * offline, and rewriting all of that by hand to add two event listeners would be
 * trading a working thing for a risk.
 *
 * Two listeners, and both are deliberately dull:
 *
 *  - **push** shows one notification, with text the server sent. It never
 *    invents a message, because a notification that appears when the server did
 *    not ask for one is impossible to debug from the outside.
 *  - **notificationclick** focuses an open Brainy if there is one and opens it
 *    if there is not. Never a new window on top of an existing one: a parent
 *    with three Brainy tabs is a parent who thinks it is broken.
 *
 * A `tag` means a second reminder replaces the first rather than stacking. If a
 * family misses three days they should find one reminder waiting, not three.
 */

/* global self, clients */

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    /* Anything unparseable is dropped rather than shown as "[object Object]". */
    return
  }

  const title = payload.title
  const body = payload.body
  if (!title) return

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: payload.tag || 'brainy-reminder',
      renotify: false,
      icon: '/play/icon-192.png',
      badge: '/play/icon-192.png',
      data: { url: payload.url || '/play/' },
      /*
       * Never silent-but-vibrating at 6am if a parent set an odd hour, and never
       * demanding: this is a nudge about homework, not a message from a person.
       */
      requireInteraction: false,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/play/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((open) => {
      for (const client of open) {
        if (client.url.includes('/play/') && 'focus' in client) return client.focus()
      }
      return clients.openWindow(target)
    }),
  )
})
