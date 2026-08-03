/** Derived views over the save. Keeps components free of registry plumbing. */

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
import { useStore } from './store'

/** The saved curriculum, or the default if that pack is no longer present. */
export function useCurriculum(): Curriculum {
  const id = useStore((s) => s.profile.curriculumId)
  return getCurriculum(hasCurriculum(id) ? id : DEFAULT_CURRICULUM_ID)
}

export function useBands(): string[] {
  const curriculum = useCurriculum()
  const band = useStore((s) => s.profile.yearBand)
  const known = curriculum.yearBands.some((b) => b.id === band)
  return includedBands(curriculum.id, known ? band : curriculum.yearBands[curriculum.yearBands.length - 1].id)
}

export function useProgress(): ProgressMap {
  const curriculum = useCurriculum()
  return useStore((s) => s.progress[curriculum.id]) ?? {}
}

export function useLevelStars(): Record<string, number> {
  const curriculum = useCurriculum()
  return useStore((s) => s.levelStars[curriculum.id]) ?? {}
}

export function useSubject(subjectId: string): SubjectDef | undefined {
  return useCurriculum().subjects.find((s) => s.id === subjectId)
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
 */
export function levelUnlocked(levels: Level[], index: number, levelStars: Record<string, number>): boolean {
  if (index === 0) return true
  const previous = levels[index - 1]
  return (levelStars[previous.key] ?? 0) > 0
}

export const totalStarsEarned = (levelStars: Record<string, number>): number =>
  Object.values(levelStars).reduce((a, b) => a + b, 0)
