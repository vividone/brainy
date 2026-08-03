/**
 * Mastery model, difficulty selection and spaced review.
 * See prd.md §5.3 and §5.5 for the reasoning behind the constants.
 */

import type { Difficulty, ProgressMap, SkillProgress } from './types'
import { emptyProgress } from './types'

export const DAY_MS = 86_400_000

/** Leitner intervals in days, indexed by box 1-5. */
const REVIEW_INTERVALS = [0, 1, 3, 7, 16, 35]

export type MasteryBand = 'new' | 'learning' | 'getting-it' | 'mastered' | 'fluent'

export function band(p: SkillProgress | undefined, now = Date.now()): MasteryBand {
  if (!p || p.attempts === 0) return 'new'
  const m = p.mastery
  if (m >= 0.9 && p.everMastered && now - p.lastSeen < 60 * DAY_MS && p.reviewBox >= 4) return 'fluent'
  if (m >= 0.75) return 'mastered'
  if (m >= 0.4) return 'getting-it'
  return 'learning'
}

export const BAND_LABEL: Record<MasteryBand, string> = {
  new: 'Not started',
  learning: 'Learning',
  'getting-it': 'Getting it',
  mastered: 'Mastered',
  fluent: 'Fluent',
}

/** Tailwind classes so the band reads the same everywhere it appears. */
export const BAND_STYLE: Record<MasteryBand, { bar: string; text: string; chip: string }> = {
  new: { bar: 'bg-slate-300', text: 'text-slate-500', chip: 'bg-slate-100 text-slate-600' },
  learning: { bar: 'bg-rose-400', text: 'text-rose-600', chip: 'bg-rose-100 text-rose-700' },
  'getting-it': { bar: 'bg-amber-400', text: 'text-amber-600', chip: 'bg-amber-100 text-amber-800' },
  mastered: { bar: 'bg-emerald-500', text: 'text-emerald-600', chip: 'bg-emerald-100 text-emerald-700' },
  fluent: { bar: 'bg-violet-500', text: 'text-violet-600', chip: 'bg-violet-100 text-violet-700' },
}

/** Mastery -> generator difficulty, targeting roughly 75-85% success. */
export function difficultyFor(mastery: number): Difficulty {
  if (mastery < 0.25) return 1
  if (mastery < 0.45) return 2
  if (mastery < 0.65) return 3
  if (mastery < 0.85) return 4
  return 5
}

/**
 * Apply decay for time elapsed since a skill was last practised.
 * Once a skill has genuinely been mastered it never rots below 0.3 — you
 * don't forget how to count in twos, you just get slow at it.
 */
export function decayed(p: SkillProgress, now = Date.now()): number {
  if (p.attempts === 0 || p.lastSeen === 0) return p.mastery
  const weeks = (now - p.lastSeen) / (7 * DAY_MS)
  if (weeks <= 0) return p.mastery
  const floor = p.everMastered ? 0.3 : 0
  return Math.max(floor, p.mastery - 0.02 * weeks)
}

export function currentMastery(progress: ProgressMap, skillId: string, now = Date.now()): number {
  const p = progress[skillId]
  return p ? decayed(p, now) : 0
}

export interface AttemptOutcome {
  correct: boolean
  /** True only when it was right with no retries and no hint. */
  firstTry: boolean
  usedHint: boolean
  isReview: boolean
}

/** Fold one answered question into a skill's progress. Pure — returns a new object. */
export function applyAttempt(
  prev: SkillProgress | undefined,
  outcome: AttemptOutcome,
  now = Date.now(),
): SkillProgress {
  const base = prev ?? emptyProgress()
  const m0 = decayed(base, now)

  let mastery: number
  if (outcome.correct && outcome.firstTry && !outcome.usedHint) {
    mastery = m0 + 0.15 * (1 - m0)
  } else if (outcome.correct) {
    mastery = m0 + 0.06 * (1 - m0)
  } else {
    mastery = m0 - 0.1
  }
  mastery = Math.min(1, Math.max(0, mastery))

  // Leitner: only review answers move the box, so drilling a skill hard in one
  // sitting doesn't fake long-term retention.
  let reviewBox = base.reviewBox
  if (outcome.isReview) {
    reviewBox = outcome.correct && outcome.firstTry ? Math.min(5, reviewBox + 1) : 1
  } else if (mastery >= 0.75 && base.reviewBox === 1 && !base.everMastered) {
    reviewBox = 2
  }

  return {
    mastery,
    attempts: base.attempts + 1,
    correct: base.correct + (outcome.correct ? 1 : 0),
    lastSeen: now,
    reviewBox,
    reviewDue: now + REVIEW_INTERVALS[reviewBox] * DAY_MS,
    everMastered: base.everMastered || mastery >= 0.8,
  }
}

export function isDueForReview(p: SkillProgress | undefined, now = Date.now()): boolean {
  if (!p || p.attempts === 0) return false
  if (p.mastery < 0.5) return false
  return p.reviewDue <= now
}

/** Skills whose review date has come up, most overdue first. */
export function dueForReview(progress: ProgressMap, skillIds: string[], now = Date.now()): string[] {
  return skillIds
    .filter((id) => isDueForReview(progress[id], now))
    .sort((a, b) => progress[a].reviewDue - progress[b].reviewDue)
}
