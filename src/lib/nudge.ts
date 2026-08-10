/**
 * The nudge to start today's quest, and what it should say.
 *
 * One function so the home screen, the app badge and anything later all agree
 * about what state a child is in. It reads only `streak.lastPlayed`, which is a
 * day key already on the device, so this costs nothing and works offline.
 *
 * Three rules the wording follows, and they are the reason this is not a
 * `didPlayToday` boolean:
 *
 *  - **Never guilt a child.** A week away is met with "good to see you", not a
 *    count of the days missed. Children who feel told off by an app stop opening
 *    it, and the whole product depends on them opening it.
 *  - **Say what is at stake only when something is.** A streak worth keeping is
 *    worth mentioning; a streak of one is not, and inventing urgency for it
 *    teaches them to ignore the real message later.
 *  - **Finish the day cleanly.** Once the quest is done it says so, and does not
 *    push for more. More is available; it is just not asked for.
 */

import { dayKey, daysBetween } from './dates'
import type { Streak } from '../state/store'

export type NudgeKind = 'first' | 'waiting' | 'streak' | 'back' | 'done'

export interface Nudge {
  kind: NudgeKind
  /** Whether today's quest is still to do. Drives the app badge. */
  pending: boolean
  /** One line, under the heading on the daily card. */
  line: string
  /** What the button should say. */
  action: string
}

export function nudgeFor(streak: Streak, today = dayKey()): Nudge {
  const last = streak.lastPlayed

  if (last === today) {
    return {
      kind: 'done',
      pending: false,
      line: 'Done for today. Come back tomorrow to keep the streak going.',
      action: 'Play another',
    }
  }

  if (!last) {
    return {
      kind: 'first',
      pending: true,
      line: 'Five minutes, and it is picked just for you.',
      action: 'Start ▶',
    }
  }

  const away = daysBetween(last, today)

  /* Played yesterday, with a streak long enough to be worth protecting. */
  if (away === 1 && streak.current >= 2) {
    return {
      kind: 'streak',
      pending: true,
      line: `Your ${streak.current}-day streak is still alive. One quest keeps it going.`,
      action: 'Keep the streak ▶',
    }
  }

  if (away >= 2) {
    return {
      kind: 'back',
      pending: true,
      /* No number of days, deliberately. */
      line: 'Good to see you. Start with something small today.',
      action: 'Start ▶',
    }
  }

  return {
    kind: 'waiting',
    pending: true,
    line: 'Picked just for you: new skills plus a bit of revision.',
    action: 'Start ▶',
  }
}

/**
 * The dot on the app icon, when a quest is waiting.
 *
 * Only an installed app has an icon to mark, and only some platforms implement
 * this at all, so every call is wrapped: a browser without it should do nothing
 * rather than throw. iOS asks for notification permission before it will show a
 * badge, and if a parent has said no then nothing happens here either, which is
 * the correct outcome rather than a bug.
 */
export function setQuestBadge(pending: boolean): void {
  const nav = navigator as Navigator & {
    setAppBadge?: (count?: number) => Promise<void>
    clearAppBadge?: () => Promise<void>
  }
  try {
    if (pending) void nav.setAppBadge?.(1)?.catch(() => {})
    else void nav.clearAppBadge?.()?.catch(() => {})
  } catch {
    /* Unsupported. Nothing to do and nothing worth saying. */
  }
}
