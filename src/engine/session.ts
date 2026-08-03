/**
 * Session builder — decides which skills a child practises and at what
 * difficulty, then generates the actual questions. See prd.md §5.5.
 */

import { itemSignature } from './answer'
import { makeRng, randomSeed, type Rng } from './rng'
import { currentMastery, difficultyFor, dueForReview } from './mastery'
import {
  getCurriculum,
  getSkill,
  getStrand,
  nextFocusSkill,
  skillsInStrand,
  skillsInSubject,
  stretchSkill,
} from './registry'
import type { Difficulty, Item, PlannedItem, ProgressMap, SessionMode, SessionPlan } from './types'

const clampDifficulty = (d: number): Difficulty => Math.min(5, Math.max(1, Math.round(d))) as Difficulty

export interface BuildSessionOpts {
  curriculumId: string
  subjectId: string
  mode: SessionMode
  bands: string[]
  progress: ProgressMap
  length: number
  strandId?: string
  skillId?: string
  levelKey?: string
  seed?: number
  now?: number
}

/** Generate one question, retrying to avoid one the child has just seen. */
export function generateItem(
  curriculumId: string,
  skillId: string,
  difficulty: Difficulty,
  rng: Rng,
  seen?: Set<string>,
): Item | undefined {
  const skill = getSkill(curriculumId, skillId)
  if (!skill) return undefined
  const locale = getCurriculum(curriculumId).locale

  let fallback: Item | undefined
  for (let attempt = 0; attempt < 12; attempt++) {
    let item: Item
    try {
      item = skill.generate({ rng, difficulty, locale })
    } catch (err) {
      console.error(`Generator failed for skill "${skillId}"`, err)
      return undefined
    }
    item.skillId = skillId
    fallback ??= item
    const sig = itemSignature(item)
    if (!seen || !seen.has(sig)) {
      seen?.add(sig)
      return item
    }
  }
  // Every attempt collided — a small question space. Show a repeat rather
  // than a gap; the child would rather answer than see an error.
  return fallback
}

interface Slot {
  skillId: string
  role: PlannedItem['role']
}

function planSlots(opts: BuildSessionOpts, rng: Rng): Slot[] {
  const { curriculumId, subjectId, bands, progress, length, mode, now = Date.now() } = opts
  const slots: Slot[] = []

  if (mode === 'level' && opts.skillId) {
    const focus = opts.skillId
    const others = skillsInSubject(curriculumId, subjectId, bands)
      .filter((s) => s.id !== focus)
      .map((s) => s.id)
    const due = dueForReview(progress, others, now).slice(0, 2)

    const reviewCount = Math.min(due.length, Math.max(0, Math.floor(length * 0.2)))
    for (let i = 0; i < length - reviewCount; i++) slots.push({ skillId: focus, role: 'focus' })
    due.slice(0, reviewCount).forEach((id) => slots.push({ skillId: id, role: 'review' }))

    // Reviews land in the back half so the child warms up on the focus skill.
    const head = slots.filter((s) => s.role === 'focus').slice(0, Math.ceil(length / 2))
    const tail = rng.shuffle(slots.slice(head.length))
    return [...head, ...tail]
  }

  if (mode === 'challenge' && opts.strandId) {
    const skills = skillsInStrand(curriculumId, opts.strandId, bands)
    if (skills.length === 0) return []
    // Round-robin so every skill on the island shows up, then shuffle.
    for (let i = 0; i < length; i++) {
      slots.push({ skillId: skills[i % skills.length].id, role: 'focus' })
    }
    return rng.shuffle(slots)
  }

  // Daily quest: 60% focus, 25% review, 15% stretch.
  const focus = nextFocusSkill(curriculumId, subjectId, bands, progress, now)
  if (!focus) return []
  const stretch = stretchSkill(curriculumId, subjectId, bands, focus.id)
  const allIds = skillsInSubject(curriculumId, subjectId, bands).map((s) => s.id)
  const due = dueForReview(progress, allIds.filter((id) => id !== focus.id), now)

  const stretchCount = stretch ? Math.max(1, Math.round(length * 0.15)) : 0
  const reviewCount = Math.min(due.length, Math.round(length * 0.25))
  const focusCount = length - stretchCount - reviewCount

  for (let i = 0; i < focusCount; i++) slots.push({ skillId: focus.id, role: 'focus' })
  for (let i = 0; i < reviewCount; i++) slots.push({ skillId: due[i % due.length], role: 'review' })
  if (stretch) for (let i = 0; i < stretchCount; i++) slots.push({ skillId: stretch.id, role: 'stretch' })

  // Open on the focus skill, close on the stretch — a familiar start and a
  // "look what's next" finish.
  const opening = slots.filter((s) => s.role === 'focus').slice(0, 2)
  const middle = rng.shuffle(slots.filter((s) => s.role !== 'stretch').slice(opening.length))
  const ending = slots.filter((s) => s.role === 'stretch')
  return [...opening, ...middle, ...ending]
}

function sessionTitle(opts: BuildSessionOpts): string {
  if (opts.mode === 'daily') return 'Daily Quest'
  if (opts.mode === 'challenge') {
    const strand = opts.strandId ? getStrand(opts.curriculumId, opts.strandId) : undefined
    return strand ? `${strand.name} Challenge` : 'Challenge'
  }
  const skill = opts.skillId ? getSkill(opts.curriculumId, opts.skillId) : undefined
  return skill?.title ?? 'Practice'
}

export function buildSession(opts: BuildSessionOpts): SessionPlan {
  const seed = opts.seed ?? randomSeed()
  const rng = makeRng(seed)
  const now = opts.now ?? Date.now()
  const slots = planSlots({ ...opts, now }, rng)

  const seen = new Set<string>()
  const items: PlannedItem[] = []

  // Stretch work is always pitched at the easiest level — it's an
  // introduction, not a test.
  const focusBase = difficultyFor(
    currentMastery(opts.progress, opts.skillId ?? slots[0]?.skillId ?? '', now),
  )

  slots.forEach((slot, i) => {
    let difficulty: Difficulty
    if (slot.role === 'stretch') {
      difficulty = 1
    } else if (slot.role === 'review') {
      difficulty = clampDifficulty(difficultyFor(currentMastery(opts.progress, slot.skillId, now)) - 1)
    } else if (opts.mode === 'level') {
      // Gentle ramp: open one notch below, finish one notch above.
      const ramp = i < 2 ? -1 : i >= slots.length - 2 ? 1 : 0
      difficulty = clampDifficulty(focusBase + ramp)
    } else {
      difficulty = difficultyFor(currentMastery(opts.progress, slot.skillId, now))
    }

    const item = generateItem(opts.curriculumId, slot.skillId, difficulty, rng, seen)
    if (item) items.push({ item, skillId: slot.skillId, difficulty, role: slot.role })
  })

  return {
    id: `s${seed.toString(36)}`,
    mode: opts.mode,
    seed,
    curriculumId: opts.curriculumId,
    subjectId: opts.subjectId,
    strandId: opts.strandId,
    skillId: opts.skillId,
    levelKey: opts.levelKey,
    title: sessionTitle(opts),
    items,
  }
}
