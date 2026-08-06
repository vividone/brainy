/**
 * When to sync, and what to do when it does not work.
 *
 * The whole design is one rule: **the network is never a dependency.** Every
 * function here can fail, be slow, or never be called at all, and the app plays a
 * full session either way. localStorage is the working copy; this is
 * reconciliation, and reconciliation that fails silently is correct behaviour
 * rather than a bug being swallowed.
 *
 * Concretely that means:
 *
 *  - **Pull, then push.** Adopting what the account holds first means a freshly
 *    installed tablet gets the child before it has anything of its own to send.
 *  - **Only upwards.** A download is adopted per child, and only when its
 *    revision is higher than the local one. A tablet mid-session can never have
 *    its own newer work replaced by a stale copy.
 *  - **Never blocking, never visible.** No spinner, no error toast. A parent finds
 *    out about sync in the grown-up area if they look, and nowhere else.
 *  - **A dead token is the only thing that changes local state.** Everything else
 *    leaves the device exactly as it was.
 */

import { useStore } from './store'
import { buildSyncPayload, type SyncLearner } from './sync'
import { pullProgress, pushProgress } from '../lib/account'

/** How long to wait after a session before uploading. */
const AFTER_SESSION_MS = 2_000
/** Never more often than this, however many things ask. */
const MIN_GAP_MS = 20_000

let inFlight: Promise<void> | null = null
let lastRun = 0
let timer: number | undefined

/** Everything on this tablet, minimised, ready to upload. */
function localLearners(): SyncLearner[] {
  const state = useStore.getState()
  return state.learners
    /* A blank child from an unfinished first run is not worth an account row. */
    .filter((learner) => learner.name.trim() !== '')
    .map((learner) => {
      const data = state.data[learner.id]
      return data ? buildSyncPayload(learner, data, data.revision ?? 0) : null
    })
    .filter((entry): entry is SyncLearner => entry !== null)
}

/**
 * One reconciliation pass. Safe to call from anywhere, as often as you like.
 *
 * Deduplicated and rate-limited internally rather than at the call sites, because
 * the call sites are effects and event handlers that should not have to know
 * about each other.
 */
export async function syncNow({ force = false } = {}): Promise<void> {
  const { device, signedOut, adoptRemote, markSynced, setKeepProgress } = useStore.getState()

  if (!device.authToken) return
  if (!device.keepProgress) return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return
  if (!force && Date.now() - lastRun < MIN_GAP_MS) return
  if (inFlight) return inFlight

  const token = device.authToken
  lastRun = Date.now()

  inFlight = (async () => {
    try {
      const pulled = await pullProgress(token)
      if (pulled.gone) {
        /*
         * The only definite answer: this token has been revoked. Forget the
         * account, keep every last thing the child has done — signing out must
         * never cost progress.
         */
        signedOut()
        return
      }
      if (!pulled.ok) return

      /*
       * The server is the authority on consent. If it was turned off on another
       * device, stop here rather than uploading against a preference the parent
       * has since withdrawn.
       */
      if (pulled.keepProgress === false) {
        setKeepProgress(false)
        return
      }

      if (pulled.learners && pulled.learners.length > 0) {
        adoptRemote(pulled.learners as SyncLearner[])
      }

      const mine = localLearners()
      if (mine.length === 0) {
        markSynced()
        return
      }

      const pushed = await pushProgress(token, mine)
      if (pushed.gone) return signedOut()

      /*
       * A `stale` result means another tablet is ahead for that child. The newer
       * copy came back with the rejection, so adopt it now rather than waiting
       * for the next pass — one round trip settles the conflict.
       */
      const behind: SyncLearner[] = []
      for (const [id, result] of Object.entries(pushed.results ?? {})) {
        if (result.status === 'stale' && result.state && typeof result.revision === 'number') {
          behind.push({ id, revision: result.revision, profile: {}, state: result.state as Record<string, unknown> })
        }
      }
      if (behind.length > 0) adoptRemote(behind)

      markSynced()
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

/**
 * Sync shortly after a session ends.
 *
 * Delayed so it never competes with the results screen animating, and debounced
 * so a child doing three quests back to back causes one upload rather than three.
 */
export function syncAfterSession(): void {
  if (timer) window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    void syncNow({ force: true })
  }, AFTER_SESSION_MS)
}
