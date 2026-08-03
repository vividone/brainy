/**
 * XP, levels, coins and stars. See prd.md §6.2.
 *
 * The rule underneath all of it: finishing always pays. A child who found the
 * session hard still leaves with coins and XP, just fewer stars.
 */

export const XP_CORRECT_FIRST_TRY = 10
export const XP_CORRECT_RETRY = 4
export const XP_SESSION_COMPLETE = 25

export const COINS_PER_CORRECT = 1
export const COINS_SESSION_COMPLETE = 5
export const COINS_THREE_STARS = 5
export const COINS_DAILY_FIRST = 10

/** Cumulative XP required to reach each level. Index 0 is level 1. */
export const LEVEL_THRESHOLDS = [
  0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3250, 3850, 4500, 5200, 5950, 6750, 7600,
  8500, 9450, 10450,
]

export function levelForXp(xp: number): number {
  let level = 1
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1
    else break
  }
  // Past the table, every 1200 XP is another level.
  const top = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
  if (xp >= top) level = LEVEL_THRESHOLDS.length + Math.floor((xp - top) / 1200)
  return level
}

export function levelProgress(xp: number): { level: number; into: number; needed: number; pct: number } {
  const level = levelForXp(xp)
  const floor = LEVEL_THRESHOLDS[level - 1] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + (level - LEVEL_THRESHOLDS.length) * 1200
  const ceil =
    LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + (level - LEVEL_THRESHOLDS.length + 1) * 1200
  const into = xp - floor
  const needed = Math.max(1, ceil - floor)
  return { level, into, needed, pct: Math.min(100, Math.round((into / needed) * 100)) }
}

export function starsFor(correctFirstTry: number, total: number): number {
  if (total === 0) return 0
  const pct = correctFirstTry / total
  if (pct >= 0.9) return 3
  if (pct >= 0.75) return 2
  if (pct >= 0.5) return 1
  return 0
}

export interface SessionTally {
  correctFirstTry: number
  correctOnRetry: number
  total: number
  isFirstSessionToday: boolean
}

export function scoreSession(t: SessionTally): { xp: number; coins: number; stars: number } {
  const stars = starsFor(t.correctFirstTry, t.total)
  const xp =
    t.correctFirstTry * XP_CORRECT_FIRST_TRY +
    t.correctOnRetry * XP_CORRECT_RETRY +
    XP_SESSION_COMPLETE
  const coins =
    (t.correctFirstTry + t.correctOnRetry) * COINS_PER_CORRECT +
    COINS_SESSION_COMPLETE +
    (stars === 3 ? COINS_THREE_STARS : 0) +
    (t.isFirstSessionToday ? COINS_DAILY_FIRST : 0)
  return { xp, coins, stars }
}
