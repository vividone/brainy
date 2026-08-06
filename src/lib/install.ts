/**
 * Installing Brainy to the home screen.
 *
 * Two reasons this needs code rather than a line of copy.
 *
 * **`beforeinstallprompt` fires once, early, and is easy to miss.** Chrome emits
 * it shortly after load; a component that mounts later never sees it and would
 * conclude the app cannot be installed. So the event is captured at module scope,
 * on import, and the hook below reads whatever was caught. Losing the event is
 * losing the install button.
 *
 * **iOS has no prompt at all.** Safari never fires this event and offers no API —
 * the only route is Share → *Add to Home Screen*, by hand. So the platform has to
 * be detected and instructions shown instead of a button, because a button that
 * cannot work is worse than a sentence that can.
 *
 * Why this matters beyond convenience: on iOS an installed web app gets its own
 * storage container, separate from Safari. A parent who sets Brainy up in the
 * browser and installs afterwards finds an empty app. Until progress lives in the
 * account, the mitigation is to get the install done *first* — which is why this
 * is offered on the welcome screen rather than buried in settings.
 */

/** The event Chrome fires, which TypeScript's DOM lib does not describe. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let captured: InstallPromptEvent | null = null
const listeners = new Set<() => void>()

const announce = () => listeners.forEach((fn) => fn())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    /* Chrome shows its own mini-infobar otherwise, at a moment of its choosing
       rather than ours. Suppressed so the offer appears where it makes sense. */
    event.preventDefault()
    captured = event as InstallPromptEvent
    announce()
  })

  window.addEventListener('appinstalled', () => {
    captured = null
    announce()
  })
}

/** Running as an installed app rather than in a browser tab. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    /* Safari's own flag, which predates the standard and is still the only way
       to detect a home-screen app on iOS. */
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    /* iPadOS 13+ reports itself as a Mac; the touch points give it away. */
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  )
}

export interface InstallState {
  /** Already installed — nothing to offer. */
  installed: boolean
  /** A real prompt is available: show a button. */
  canPrompt: boolean
  /** No prompt exists on this platform: show the Share instructions. */
  needsManual: boolean
  /** Trigger the browser's install dialogue. Resolves to whether they accepted. */
  prompt: () => Promise<boolean>
  subscribe: (fn: () => void) => () => void
}

export function installState(): InstallState {
  const installed = isStandalone()
  return {
    installed,
    canPrompt: !installed && captured !== null,
    /*
     * iOS only. Not shown on a desktop browser that simply has not fired the
     * event yet — "open the Share menu" is nonsense advice there, and a parent
     * following instructions that do not match their screen loses confidence in
     * everything else on it.
     */
    needsManual: !installed && captured === null && isIOS(),
    prompt: async () => {
      if (!captured) return false
      const event = captured
      await event.prompt()
      const { outcome } = await event.userChoice
      /* Single-use: Chrome will not let the same event be prompted twice. */
      captured = null
      announce()
      return outcome === 'accepted'
    },
    subscribe: (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}
