/** Derived views over the save. Keeps components free of registry plumbing. */

import { useMemo } from 'react'
import { DEFAULT_CURRICULUM_ID } from '../content'
import { currentMastery } from '../engine/mastery'
import {
  buildLevels,
  getCurriculum,
  hasCurriculum,
  includedBands,
  islandStarGate,
  skillsInStrand,
  type Level,
} from '../engine/registry'
import type { Curriculum, ProgressMap, StrandDef, SubjectDef } from '../engine/types'
import type { BadgeContext } from '../game/badges'
import { useLearnerData, useProfile } from './store'

/** The saved curriculum, or the default if that pack is no longer present. */
export function useCurriculum(): Curriculum {
  const id = useProfile().curriculumId
  return getCurriculum(hasCurriculum(id) ? id : DEFAULT_CURRICULUM_ID)
}

export function useBands(): string[] {
  const curriculum = useCurriculum()
  const band = useProfile().yearBand
  const known = curriculum.yearBands.some((b) => b.id === band)
  return includedBands(curriculum.id, known ? band : curriculum.yearBands[curriculum.yearBands.length - 1].id)
}

export function useProgress(): ProgressMap {
  const curriculum = useCurriculum()
  return useLearnerData().progress[curriculum.id] ?? {}
}

export function useLevelStars(): Record<string, number> {
  const curriculum = useCurriculum()
  return useLearnerData().levelStars[curriculum.id] ?? {}
}

export function useSubject(subjectId: string): SubjectDef | undefined {
  return useCurriculum().subjects.find((s) => s.id === subjectId)
}

/**
 * A badge context for screens that *display* badges rather than award them.
 *
 * The awarding context is built inside `finishSession`, because only it knows
 * what the session just did. This one describes the child as they stand, which
 * is what the Room needs to say "4 of 7 days" against a locked badge — and what
 * the shop will need to say why an item is not for sale yet.
 *
 * `result` and `daysSinceLastSession` are the two fields that only mean
 * something in the moment a session ends, so they are neutral here. Both feed
 * only `binary` badges, whose progress is deliberately not shown as a part-full
 * bar, so a neutral value cannot render a misleading one.
 */
export function useBadgeContext(): BadgeContext {
  const curriculum = useCurriculum()
  const profile = useProfile()
  const data = useLearnerData()
  const progress = useProgress()
  const levelStars = useLevelStars()

  /* Same guard as useBands: a saved class the pack no longer has falls back to
     the oldest, rather than matching no subject at all. */
  const known = curriculum.yearBands.some((b) => b.id === profile.yearBand)
  const yearBand = known ? profile.yearBand : curriculum.yearBands[curriculum.yearBands.length - 1].id

  /*
   * Memoised so the object is referentially stable between renders. Callers
   * derive from this with `badgeProgressAll`, which walks the child's whole
   * map; handing back a fresh object every render would quietly defeat their
   * own useMemo and repeat that walk on every keystroke and every tick.
   */
  return useMemo(
    () => ({
      curriculumId: curriculum.id,
      yearBand,
      earned: data.badges,
      questionsAnswered: data.totals.questions,
      bestAnswerStreak: data.bestAnswerStreak,
      streakDays: data.streak.current,
      coins: data.economy.coins,
      xp: data.economy.xp,
      progress,
      levelStars,
      daysSinceLastSession: null,
      result: { total: 0, correctFirstTry: 0 },
    }),
    [
      curriculum.id,
      yearBand,
      data.badges,
      data.totals.questions,
      data.bestAnswerStreak,
      data.streak.current,
      data.economy.coins,
      data.economy.xp,
      progress,
      levelStars,
    ],
  )
}

export interface StrandSummary {
  strand: StrandDef
  index: number
  levels: Level[]
  starsEarned: number
  starsPossible: number
  skillCount: number
  masteredCount: number
  /** Mean mastery across the strand's in-band skills, 0-1. */
  mastery: number
  unlocked: boolean
  requiredStars: number
}

export function summariseStrands(
  curriculumId: string,
  subject: SubjectDef,
  bands: string[],
  progress: ProgressMap,
  levelStars: Record<string, number>,
  now = Date.now(),
): StrandSummary[] {
  const totalStars = Object.values(levelStars).reduce((a, b) => a + b, 0)

  return subject.strands
    .map((strand, index) => {
      const levels = buildLevels(curriculumId, strand.id, bands)
      const skills = skillsInStrand(curriculumId, strand.id, bands)
      const masteries = skills.map((s) => currentMastery(progress, s.id, now))
      const requiredStars = islandStarGate(index)

      return {
        strand,
        index,
        levels,
        starsEarned: levels.reduce((sum, l) => sum + (levelStars[l.key] ?? 0), 0),
        starsPossible: levels.length * 3,
        skillCount: skills.length,
        masteredCount: masteries.filter((m) => m >= 0.75).length,
        mastery: masteries.length ? masteries.reduce((a, b) => a + b, 0) / masteries.length : 0,
        unlocked: totalStars >= requiredStars,
        requiredStars,
      }
    })
    .filter((s) => s.levels.length > 0)
}

/**
 * A level is open once the one before it has at least one star. Islands are
 * gated on total stars from anywhere, so a child is never stuck on one topic.
 *
 * Levels from an earlier class are always open. They are revision, not a
 * gate — a Basic 6 child should not have to three-star their way through
 * Basic 1 counting to reach their own year's work.
 */
export function levelUnlocked(
  levels: Level[],
  index: number,
  levelStars: Record<string, number>,
  isRevision?: (level: Level) => boolean,
): boolean {
  if (index === 0) return true
  if (isRevision?.(levels[index])) return true
  const previous = levels[index - 1]
  if (isRevision?.(previous)) {
    // Walk back to the last level that actually gates.
    for (let i = index - 1; i >= 0; i--) {
      if (isRevision(levels[i])) continue
      return (levelStars[levels[i].key] ?? 0) > 0
    }
    return true
  }
  return (levelStars[previous.key] ?? 0) > 0
}

export const totalStarsEarned = (levelStars: Record<string, number>): number =>
  Object.values(levelStars).reduce((a, b) => a + b, 0)

export interface SubjectSummary {
  subject: SubjectDef
  skillCount: number
  startedCount: number
  masteredCount: number
  /** Mean mastery across the subject's in-band skills, 0-1. */
  mastery: number
  starsEarned: number
  starsPossible: number
}

/** One row per subject, for the home grid and the parent report. */
export function summariseSubject(
  curriculumId: string,
  subject: SubjectDef,
  bands: string[],
  progress: ProgressMap,
  levelStars: Record<string, number>,
  now = Date.now(),
): SubjectSummary {
  const skills = subject.strands.flatMap((strand) => skillsInStrand(curriculumId, strand.id, bands))
  const masteries = skills.map((s) => currentMastery(progress, s.id, now))
  const levels = subject.strands.flatMap((strand) => buildLevels(curriculumId, strand.id, bands))

  return {
    subject,
    skillCount: skills.length,
    startedCount: skills.filter((s) => (progress[s.id]?.attempts ?? 0) > 0).length,
    masteredCount: masteries.filter((m) => m >= 0.75).length,
    mastery: masteries.length ? masteries.reduce((a, b) => a + b, 0) / masteries.length : 0,
    starsEarned: levels.reduce((sum, l) => sum + (levelStars[l.key] ?? 0), 0),
    starsPossible: levels.length * 3,
  }
}

/** Tailwind classes per subject colour, so a subject looks the same everywhere. */
export const SUBJECT_STYLE: Record<string, { grad: string; soft: string; text: string }> = {
  violet: { grad: 'from-violet-400 to-purple-600', soft: 'bg-violet-50', text: 'text-violet-700' },
  sky: { grad: 'from-sky-400 to-blue-600', soft: 'bg-sky-50', text: 'text-sky-700' },
  amber: { grad: 'from-amber-400 to-orange-500', soft: 'bg-amber-50', text: 'text-amber-700' },
  rose: { grad: 'from-rose-400 to-pink-600', soft: 'bg-rose-50', text: 'text-rose-700' },
  emerald: { grad: 'from-emerald-400 to-green-600', soft: 'bg-emerald-50', text: 'text-emerald-700' },
  slate: { grad: 'from-slate-400 to-slate-600', soft: 'bg-slate-50', text: 'text-slate-700' },
  orange: { grad: 'from-orange-400 to-red-500', soft: 'bg-orange-50', text: 'text-orange-700' },
  stone: { grad: 'from-stone-400 to-stone-600', soft: 'bg-stone-50', text: 'text-stone-700' },
  cyan: { grad: 'from-cyan-400 to-teal-600', soft: 'bg-cyan-50', text: 'text-cyan-700' },
  pink: { grad: 'from-pink-400 to-fuchsia-600', soft: 'bg-pink-50', text: 'text-pink-700' },
  lime: { grad: 'from-lime-400 to-green-600', soft: 'bg-lime-50', text: 'text-lime-700' },
}

export const subjectStyle = (colour: string) => SUBJECT_STYLE[colour] ?? SUBJECT_STYLE.violet
