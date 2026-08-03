/**
 * Core types for the Kolo learning engine.
 *
 * Nothing in `engine/` may import from `content/`. Curriculum packs are
 * discovered through the registry at runtime. That rule is what keeps the
 * cost of adding a second curriculum near zero.
 */

import type { Rng } from './rng'

export type Difficulty = 1 | 2 | 3 | 4 | 5

/* ------------------------------------------------------------------ *
 * Visuals — declarative descriptors rendered as inline SVG.
 * Content describes *what* to show; the renderer decides how.
 * ------------------------------------------------------------------ */

export type Shape2D =
  | 'circle'
  | 'triangle'
  | 'square'
  | 'rectangle'
  | 'pentagon'
  | 'hexagon'
  | 'octagon'
  | 'oval'
  | 'star'
  | 'rhombus'

export type Shape3D = 'cube' | 'cuboid' | 'sphere' | 'cylinder' | 'cone' | 'pyramid'

export type Visual =
  | { kind: 'fraction'; shape: 'circle' | 'rect' | 'bar'; parts: number; shaded: number }
  | { kind: 'shape2d'; name: Shape2D; rotate?: number }
  | { kind: 'shape3d'; name: Shape3D }
  | { kind: 'clock'; hour: number; minute: number }
  | { kind: 'baseTen'; hundreds: number; tens: number; ones: number }
  | { kind: 'objects'; glyph: string; count: number; perRow?: number }
  | { kind: 'array'; rows: number; cols: number; glyph: string }
  | { kind: 'groups'; glyph: string; groups: number; per: number }
  | { kind: 'pictogram'; glyph: string; unit: number; rows: { label: string; count: number }[] }
  | { kind: 'barChart'; bars: { label: string; value: number }[]; unit?: string }
  | { kind: 'tally'; count: number }
  | { kind: 'money'; denominations: number[]; symbol: string }
  | { kind: 'lineType'; variant: 'horizontal' | 'vertical' | 'curved' | 'slanting' }
  | { kind: 'angle'; degrees: number }
  | { kind: 'symmetry'; name: Shape2D; axis: 'v' | 'h' | 'diagonal' }
  | { kind: 'ruler'; lengthCm: number; totalCm?: number }
  | { kind: 'scale'; grams: number; maxGrams?: number }
  | { kind: 'jug'; millilitres: number; capacity: number }
  | { kind: 'text'; text: string }

/* ------------------------------------------------------------------ *
 * Items — one concrete question shown to the child.
 * ------------------------------------------------------------------ */

export type QuestionType =
  | 'multiple-choice'
  | 'numeric-entry'
  | 'true-false'
  | 'order'
  | 'match'
  | 'tap-many'
  | 'number-line'
  | 'count-objects'

export interface Choice {
  id: string
  label?: string
  visual?: Visual
}

export interface Token {
  id: string
  label: string
}

interface ItemBase {
  /** Filled in by the session builder; generators may leave it blank. */
  skillId: string
  /** Shown on screen. */
  prompt: string
  /** Spoken instead of `prompt` when symbols would read badly ("3 + 4"). */
  speak?: string
  /** Shown after a wrong answer. One short sentence. */
  explanation?: string
  visual?: Visual
}

export interface MultipleChoiceItem extends ItemBase {
  type: 'multiple-choice'
  choices: Choice[]
  answerId: string
}

export interface NumericEntryItem extends ItemBase {
  type: 'numeric-entry'
  answer: number
  prefix?: string
  suffix?: string
  maxDigits?: number
}

export interface TrueFalseItem extends ItemBase {
  type: 'true-false'
  answer: boolean
  trueLabel?: string
  falseLabel?: string
}

export interface OrderItem extends ItemBase {
  type: 'order'
  tokens: Token[]
  /** Token ids in the order they must be tapped. */
  correctOrder: string[]
}

export interface MatchItem extends ItemBase {
  type: 'match'
  left: Choice[]
  right: Choice[]
  /** left id -> right id */
  pairs: Record<string, string>
}

export interface TapManyItem extends ItemBase {
  type: 'tap-many'
  options: Choice[]
  correctIds: string[]
}

export interface NumberLineItem extends ItemBase {
  type: 'number-line'
  min: number
  max: number
  step: number
  answer: number
  /** Draw a label every N steps. */
  labelEvery?: number
}

export interface CountObjectsItem extends ItemBase {
  type: 'count-objects'
  glyph: string
  count: number
  perRow?: number
}

export type Item =
  | MultipleChoiceItem
  | NumericEntryItem
  | TrueFalseItem
  | OrderItem
  | MatchItem
  | TapManyItem
  | NumberLineItem
  | CountObjectsItem

/* ------------------------------------------------------------------ *
 * Locale — travels with the curriculum, never hard-coded in the engine.
 * ------------------------------------------------------------------ */

export interface CurrencyInfo {
  symbol: string
  code: string
  /** Smaller unit, e.g. kobo / pence. */
  subunit?: { name: string; plural: string; per: number }
  notes: number[]
  coins: number[]
}

export interface ObjectNoun {
  one: string
  many: string
  glyph: string
}

export interface Locale {
  tag: string
  currency: CurrencyInfo
  names: string[]
  objects: ObjectNoun[]
  places: string[]
  shops: string[]
  /** Units used for length / mass / capacity questions. */
  units: { length: string[]; mass: string[]; capacity: string[] }
}

/* ------------------------------------------------------------------ *
 * Curriculum structure
 * ------------------------------------------------------------------ */

export interface GenContext {
  rng: Rng
  difficulty: Difficulty
  locale: Locale
}

export type Generator = (ctx: GenContext) => Item

/** A skill as authored inside a content pack. */
export interface SkillDef {
  id: string
  /** Child-facing. Short, concrete, no jargon. */
  title: string
  yearBand: string
  prerequisites?: string[]
  /** Cross-curriculum equivalence tags, for future credit transfer. */
  concepts?: string[]
  /** One-line nudge shown when the child taps the hint button. */
  hint?: string
  /** One line for the parent zone: how to practise this away from a screen. */
  helpAtHome?: string
  generate: Generator
}

export type IslandTheme =
  | 'market'
  | 'falls'
  | 'grove'
  | 'bay'
  | 'city'
  | 'beach'
  | 'forest'
  | 'volcano'

export interface StrandDef {
  id: string
  name: string
  blurb: string
  theme: IslandTheme
  skills: SkillDef[]
}

export interface SubjectDef {
  id: string
  name: string
  icon: string
  /** Tailwind-ish hue name used to theme the subject. */
  color: string
  /** False for subjects planned but not yet authored. */
  available: boolean
  comingSoon?: string
  /** Shown on the coming-soon card so the plan is visible, not just a promise. */
  plannedTopics?: string[]
  strands: StrandDef[]
}

export interface YearBandDef {
  id: string
  label: string
  short: string
  /**
   * Typical age range during that school year, [inclusive, exclusive-ish].
   *
   * Drives the age picker: a parent knows their child is 7 far more reliably
   * than they know which band a given curriculum calls that. It is also what
   * lets one age map across Nigerian, British and American systems.
   */
  ageRange: [number, number]
}

export interface Curriculum {
  id: string
  name: string
  country: string
  flag: string
  locale: Locale
  yearBands: YearBandDef[]
  subjects: SubjectDef[]
}

/* ------------------------------------------------------------------ *
 * Indexed views, built by the registry
 * ------------------------------------------------------------------ */

export interface IndexedSkill extends SkillDef {
  curriculumId: string
  subjectId: string
  strandId: string
  /** Position within its strand, 0-based. */
  order: number
}

/* ------------------------------------------------------------------ *
 * Progress
 * ------------------------------------------------------------------ */

export interface SkillProgress {
  mastery: number
  attempts: number
  correct: number
  /** Epoch ms. */
  lastSeen: number
  /** Leitner box, 1-5. */
  reviewBox: number
  /** Epoch ms when this skill is next due for review. */
  reviewDue: number
  /** Has this skill ever been mastered? Used to floor decay. */
  everMastered: boolean
}

export type ProgressMap = Record<string, SkillProgress>

export const emptyProgress = (): SkillProgress => ({
  mastery: 0,
  attempts: 0,
  correct: 0,
  lastSeen: 0,
  reviewBox: 1,
  reviewDue: 0,
  everMastered: false,
})

/* ------------------------------------------------------------------ *
 * Sessions
 * ------------------------------------------------------------------ */

export type SessionMode = 'level' | 'challenge' | 'daily'

export interface PlannedItem {
  item: Item
  skillId: string
  difficulty: Difficulty
  /** Why this item is in the session — drives the parent-zone breakdown. */
  role: 'focus' | 'review' | 'stretch'
}

export interface SessionPlan {
  id: string
  mode: SessionMode
  seed: number
  curriculumId: string
  subjectId: string
  strandId?: string
  /** The skill a `level` session is built around. */
  skillId?: string
  /** `${strandId}#${index}` when this session is a map level. */
  levelKey?: string
  title: string
  items: PlannedItem[]
}

export interface AnsweredItem {
  skillId: string
  prompt: string
  correctFirstTry: boolean
  attempts: number
  usedHint: boolean
  /** What the child actually answered, rendered for the parent zone. */
  given: string
  expected: string
}

export interface SessionResult {
  planId: string
  mode: SessionMode
  curriculumId: string
  subjectId: string
  strandId?: string
  skillId?: string
  levelKey?: string
  title: string
  /** Epoch ms. */
  finishedAt: number
  durationMs: number
  total: number
  correctFirstTry: number
  stars: number
  xpEarned: number
  coinsEarned: number
  answers: AnsweredItem[]
}
