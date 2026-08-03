/**
 * Curriculum registry.
 *
 * Content packs register themselves here. The engine never imports a pack
 * directly, so adding the UK curriculum is a folder plus one register call.
 */

import type { Curriculum, IndexedSkill, ProgressMap, StrandDef, SubjectDef } from './types'
import { currentMastery } from './mastery'

const curricula = new Map<string, Curriculum>()
const skillIndexes = new Map<string, Map<string, IndexedSkill>>()

export function registerCurriculum(curriculum: Curriculum): void {
  curricula.set(curriculum.id, curriculum)

  const index = new Map<string, IndexedSkill>()
  for (const subject of curriculum.subjects) {
    for (const strand of subject.strands) {
      strand.skills.forEach((skill, order) => {
        if (index.has(skill.id)) {
          throw new Error(`Duplicate skill id "${skill.id}" in curriculum "${curriculum.id}"`)
        }
        index.set(skill.id, {
          ...skill,
          curriculumId: curriculum.id,
          subjectId: subject.id,
          strandId: strand.id,
          order,
        })
      })
    }
  }
  skillIndexes.set(curriculum.id, index)
}

export const listCurricula = (): Curriculum[] => [...curricula.values()]

export function getCurriculum(id: string): Curriculum {
  const c = curricula.get(id)
  if (!c) throw new Error(`Unknown curriculum "${id}"`)
  return c
}

export const hasCurriculum = (id: string): boolean => curricula.has(id)

export function getSkill(curriculumId: string, skillId: string): IndexedSkill | undefined {
  return skillIndexes.get(curriculumId)?.get(skillId)
}

export function getSubject(curriculumId: string, subjectId: string): SubjectDef | undefined {
  return getCurriculum(curriculumId).subjects.find((s) => s.id === subjectId)
}

export function getStrand(curriculumId: string, strandId: string): StrandDef | undefined {
  for (const subject of getCurriculum(curriculumId).subjects) {
    const strand = subject.strands.find((s) => s.id === strandId)
    if (strand) return strand
  }
  return undefined
}

/* ------------------------------------------------------------------ *
 * Year bands
 * ------------------------------------------------------------------ */

/**
 * All bands up to and including the selected one.
 *
 * A child moving from Basic 2 to Basic 3 should still meet Basic 2 material —
 * that's the consolidation half of the job — so bands are cumulative.
 */
export function includedBands(curriculumId: string, yearBandId: string): string[] {
  const bands = getCurriculum(curriculumId).yearBands
  const idx = bands.findIndex((b) => b.id === yearBandId)
  if (idx < 0) return bands.map((b) => b.id)
  return bands.slice(0, idx + 1).map((b) => b.id)
}

export function skillsInStrand(
  curriculumId: string,
  strandId: string,
  bands: string[],
): IndexedSkill[] {
  const strand = getStrand(curriculumId, strandId)
  if (!strand) return []
  const index = skillIndexes.get(curriculumId)!
  return strand.skills
    .filter((s) => bands.includes(s.yearBand))
    .map((s) => index.get(s.id)!)
    .filter(Boolean)
}

/** Every available skill in a subject, in curriculum order. */
export function skillsInSubject(
  curriculumId: string,
  subjectId: string,
  bands: string[],
): IndexedSkill[] {
  const subject = getSubject(curriculumId, subjectId)
  if (!subject) return []
  return subject.strands.flatMap((strand) => skillsInStrand(curriculumId, strand.id, bands))
}

/* ------------------------------------------------------------------ *
 * Levels — a strand is an island, each skill is a level, plus a
 * mixed challenge level at the end of the island.
 * ------------------------------------------------------------------ */

export interface Level {
  /** Stable key used for star storage: `${strandId}#${index}`. */
  key: string
  index: number
  kind: 'skill' | 'challenge'
  strandId: string
  subjectId: string
  skillId?: string
  title: string
}

export function levelKey(strandId: string, index: number): string {
  return `${strandId}#${index}`
}

export function buildLevels(curriculumId: string, strandId: string, bands: string[]): Level[] {
  const skills = skillsInStrand(curriculumId, strandId, bands)
  if (skills.length === 0) return []

  const levels: Level[] = skills.map((skill, index) => ({
    key: levelKey(strandId, index),
    index,
    kind: 'skill' as const,
    strandId,
    subjectId: skill.subjectId,
    skillId: skill.id,
    title: skill.title,
  }))

  levels.push({
    key: levelKey(strandId, skills.length),
    index: skills.length,
    kind: 'challenge',
    strandId,
    subjectId: skills[0].subjectId,
    title: 'Island Challenge',
  })

  return levels
}

/** Total stars an island requires before it opens. Any island's stars count. */
export function islandStarGate(islandIndex: number): number {
  const gates = [0, 0, 6, 14, 24, 36, 50, 66, 84]
  return gates[islandIndex] ?? 84 + (islandIndex - gates.length + 1) * 20
}

/* ------------------------------------------------------------------ *
 * Skill selection for adaptive sessions (prd.md §5.6)
 * ------------------------------------------------------------------ */

export function nextFocusSkill(
  curriculumId: string,
  subjectId: string,
  bands: string[],
  progress: ProgressMap,
  now = Date.now(),
): IndexedSkill | undefined {
  const skills = skillsInSubject(curriculumId, subjectId, bands)
  const ready = (skill: IndexedSkill) =>
    (skill.prerequisites ?? []).every((p) => currentMastery(progress, p, now) >= 0.6)

  const candidate = skills.find((s) => ready(s) && currentMastery(progress, s.id, now) < 0.75)
  if (candidate) return candidate

  // Everything available is mastered — fall back to the weakest skill so the
  // daily quest always has something to do.
  return [...skills].sort(
    (a, b) => currentMastery(progress, a.id, now) - currentMastery(progress, b.id, now),
  )[0]
}

/** One skill beyond the current focus, used for the "stretch" slice. */
export function stretchSkill(
  curriculumId: string,
  subjectId: string,
  bands: string[],
  focusId: string | undefined,
): IndexedSkill | undefined {
  const skills = skillsInSubject(curriculumId, subjectId, bands)
  const i = skills.findIndex((s) => s.id === focusId)
  if (i < 0 || i + 1 >= skills.length) return undefined
  return skills[i + 1]
}
