/**
 * Badges — the spine of the meta-game.
 *
 * A badge used to be a sticker: thirteen of them, awarded by a hand-written
 * list inside the store, displayed in the Room, gating nothing. One of them
 * (`island-master`) was never awarded at all, because the display list and the
 * award list were two different places and nothing made them agree. This file
 * exists so they cannot disagree again.
 *
 * **One table, two derivations.** Every badge names a `metric` and a
 * `threshold`. Awarding asks whether the metric has reached the threshold;
 * the Room asks how far along it is. Neither knows a rule the other doesn't,
 * so a badge that can be shown is a badge that can be won — and `npm run
 * badges` proves it by finding a context that earns every id.
 *
 * Two design rules that are load-bearing rather than decorative:
 *
 *  1. **Grit and craft both pay.** Badges come in two families. `grit` is
 *     earned by turning up — streaks, questions answered, coming back after a
 *     week away. `craft` is earned by getting good. Phase 2 gates shop items on
 *     *either* family, never craft alone, so the child who finds this hard and
 *     the child who finds it easy open the same doors by different routes.
 *     Gating the collection on accuracy alone would punish exactly the child
 *     this app is for.
 *
 *  2. **Nothing here may need a paid subject.** A free family gets Mathematics
 *     and nothing else (prd.md §14.2), and the thinnest free case in the
 *     product — Basic 1 Nigerian maths — is 7 skills across 2 islands. Every
 *     badge below is reachable inside that, with two deliberate exceptions
 *     (`skill-10`, `skill-25`) which need more skills than one Basic 1 class
 *     contains and so arrive as the child moves up a class. That is school
 *     progression, not a paywall. Writing "master every subject" here would
 *     quietly turn the free tier into pay-to-collect; the reachability test is
 *     what stops that landing unnoticed.
 */

import { currentMastery } from '../engine/mastery'
import { buildLevels, hasCurriculum, includedBands, subjectsForBand } from '../engine/registry'
import { levelForXp } from '../engine/scoring'
import type { ProgressMap } from '../engine/types'

/** Mastery at or above this counts a skill as mastered, matching the selectors. */
const MASTERED = 0.75

/**
 * Whether a badge is won by turning up or by getting good.
 *
 * Read the file header before adding to either: the split is what keeps the
 * collection open to a child who is finding the work hard.
 */
export type BadgeFamily = 'grit' | 'craft'

/** Display grouping. The Room renders one section per group, in this order. */
export type BadgeGroup =
  | 'start'
  | 'streak'
  | 'questions'
  | 'coins'
  | 'accuracy'
  | 'skills'
  | 'islands'
  | 'levels'

export const GROUP_ORDER: BadgeGroup[] = [
  'start',
  'streak',
  'questions',
  'accuracy',
  'skills',
  'islands',
  'levels',
  'coins',
]

export const GROUP_LABEL: Record<BadgeGroup, string> = {
  start: 'Getting going',
  streak: 'Day streaks',
  questions: 'Questions answered',
  coins: 'Coins saved',
  accuracy: 'Sharp answers',
  skills: 'Skills mastered',
  islands: 'Islands',
  levels: 'Levels',
}

/**
 * The quantity a badge watches.
 *
 * Adding one means adding a case to `measure` — the compiler will say so,
 * which is the point of it being a union rather than a string.
 */
export type BadgeMetric =
  | 'sessions'
  | 'streakDays'
  | 'questions'
  | 'daysAway'
  | 'coins'
  | 'perfectRound'
  | 'answerStreak'
  | 'skillsMastered'
  | 'islandsCleared'
  | 'islandsPerfect'
  | 'subjectsCleared'
  | 'level'

export interface Badge {
  id: string
  name: string
  /** Child-facing, and phrased as the goal so it reads as well locked as won. */
  description: string
  emoji: string
  family: BadgeFamily
  group: BadgeGroup
  metric: BadgeMetric
  /** Won when the metric reaches this. */
  threshold: number
  /**
   * True when a bar would be meaningless — a perfect round is not 40% done.
   * The Room shows these as simply locked rather than part-finished.
   */
  binary?: boolean
}

/*
 * Every id that existed before this file did is kept exactly as it was.
 * Changing one would take a badge off a child who had already earned it, since
 * the save stores ids and nothing else.
 */
export const BADGES: Badge[] = [
  /* Getting going ------------------------------------------------------ */
  { id: 'first-session', name: 'First Steps', description: 'Finish your first quest', emoji: '🌱', family: 'grit', group: 'start', metric: 'sessions', threshold: 1, binary: true },
  {
    id: 'comeback',
    name: 'Welcome Back',
    description: 'Come back after a week away',
    emoji: '🤗',
    family: 'grit',
    group: 'start',
    metric: 'daysAway',
    threshold: 7,
    binary: true,
  },

  /* Day streaks -------------------------------------------------------- */
  { id: 'streak-3', name: 'Three in a Row', description: 'Play 3 days in a row', emoji: '🔥', family: 'grit', group: 'streak', metric: 'streakDays', threshold: 3 },
  { id: 'streak-7', name: 'Week Warrior', description: 'Play 7 days in a row', emoji: '⚡', family: 'grit', group: 'streak', metric: 'streakDays', threshold: 7 },
  { id: 'streak-14', name: 'Fortnight Hero', description: 'Play 14 days in a row', emoji: '🌟', family: 'grit', group: 'streak', metric: 'streakDays', threshold: 14 },
  { id: 'streak-30', name: 'Unstoppable', description: 'Play 30 days in a row', emoji: '🏆', family: 'grit', group: 'streak', metric: 'streakDays', threshold: 30 },
  { id: 'streak-60', name: 'Comet', description: 'Play 60 days in a row', emoji: '☄️', family: 'grit', group: 'streak', metric: 'streakDays', threshold: 60 },
  { id: 'streak-100', name: 'Hundred Days', description: 'Play 100 days in a row', emoji: '💫', family: 'grit', group: 'streak', metric: 'streakDays', threshold: 100 },

  /* Questions answered ------------------------------------------------- */
  { id: 'century', name: 'Century', description: 'Answer 100 questions', emoji: '💪', family: 'grit', group: 'questions', metric: 'questions', threshold: 100 },
  { id: 'five-hundred', name: 'Big Brain', description: 'Answer 500 questions', emoji: '🧠', family: 'grit', group: 'questions', metric: 'questions', threshold: 500 },
  { id: 'thousand', name: 'Thousand Club', description: 'Answer 1,000 questions', emoji: '🚀', family: 'grit', group: 'questions', metric: 'questions', threshold: 1000 },
  { id: 'marathon', name: 'Marathon', description: 'Answer 2,500 questions', emoji: '🛡️', family: 'grit', group: 'questions', metric: 'questions', threshold: 2500 },

  /* Sharp answers ------------------------------------------------------ */
  { id: 'perfect', name: 'Perfect Round', description: 'Get every question right first time', emoji: '💯', family: 'craft', group: 'accuracy', metric: 'perfectRound', threshold: 1, binary: true },
  { id: 'sharp-sharp', name: 'Sharp Sharp', description: '10 correct answers in a row', emoji: '🎯', family: 'craft', group: 'accuracy', metric: 'answerStreak', threshold: 10 },
  { id: 'sharp-shooter', name: 'Sharp Shooter', description: '25 correct answers in a row', emoji: '🏹', family: 'craft', group: 'accuracy', metric: 'answerStreak', threshold: 25 },

  /* Skills mastered ---------------------------------------------------- */
  { id: 'skill-1', name: 'Got It', description: 'Master your first skill', emoji: '🔑', family: 'craft', group: 'skills', metric: 'skillsMastered', threshold: 1 },
  { id: 'skill-5', name: 'Five Skills', description: 'Master 5 skills', emoji: '🧩', family: 'craft', group: 'skills', metric: 'skillsMastered', threshold: 5 },
  { id: 'skill-10', name: 'Ten Skills', description: 'Master 10 skills', emoji: '📚', family: 'craft', group: 'skills', metric: 'skillsMastered', threshold: 10 },
  { id: 'skill-25', name: 'Scholar', description: 'Master 25 skills', emoji: '🎓', family: 'craft', group: 'skills', metric: 'skillsMastered', threshold: 25 },

  /* Islands ------------------------------------------------------------ */
  { id: 'island-master', name: 'Island Master', description: 'Win a star on every level of an island', emoji: '🏝️', family: 'craft', group: 'islands', metric: 'islandsCleared', threshold: 1 },
  { id: 'island-perfect', name: 'Island Legend', description: 'Win all 3 stars on every level of an island', emoji: '🌺', family: 'craft', group: 'islands', metric: 'islandsPerfect', threshold: 1 },
  { id: 'subject-master', name: 'Map Complete', description: 'Clear every island in a subject', emoji: '🗺️', family: 'craft', group: 'islands', metric: 'subjectsCleared', threshold: 1 },

  /* Levels ------------------------------------------------------------- */
  { id: 'level-5', name: 'Level Five', description: 'Reach level 5', emoji: '🎖️', family: 'craft', group: 'levels', metric: 'level', threshold: 5 },
  { id: 'level-10', name: 'Level Ten', description: 'Reach level 10', emoji: '👑', family: 'craft', group: 'levels', metric: 'level', threshold: 10 },
  { id: 'level-20', name: 'Level Twenty', description: 'Reach level 20', emoji: '🦁', family: 'craft', group: 'levels', metric: 'level', threshold: 20 },

  /* Coins saved -------------------------------------------------------- */
  { id: 'kolo-full', name: 'Money Box Full', description: 'Save up 500 coins', emoji: '🪙', family: 'grit', group: 'coins', metric: 'coins', threshold: 500 },
  { id: 'kolo-vault', name: 'Treasure Chest', description: 'Save up 1,500 coins', emoji: '💰', family: 'grit', group: 'coins', metric: 'coins', threshold: 1500 },
]

export const badgeById = (id: string): Badge | undefined => BADGES.find((b) => b.id === id)

/** Badges in display order: by group, then by threshold within a group. */
export const badgesInOrder = (): Badge[] =>
  [...BADGES].sort((a, b) =>
    a.group === b.group
      ? a.threshold - b.threshold
      : GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group),
  )

/* ------------------------------------------------------------------ *
 * Evaluation
 * ------------------------------------------------------------------ */

/**
 * Everything the badge rules are allowed to see.
 *
 * Deliberately assembled from fields that **survive a sync**, and that is a
 * constraint rather than a coincidence. `history` and `byDay` are never
 * uploaded (see state/sync.ts — they are a log of what a child has been doing,
 * and we do not hold one), so a badge counted from them would silently vanish
 * when a family restored onto a new tablet. Anything a rule needs must either
 * live in the synced state or be handed in from the session that just
 * finished.
 */
export interface BadgeContext {
  curriculumId: string
  yearBand: string
  /** Ids already held, so a badge is never awarded twice. */
  earned: readonly string[]
  /** Totals *including* the session that has just been scored. */
  questionsAnswered: number
  /** Best run of correct-first-time answers, all time. */
  bestAnswerStreak: number
  /** Consecutive days played, after this session has been counted. */
  streakDays: number
  /** Coin balance after this session has paid out. */
  coins: number
  /** XP after this session has paid out. */
  xp: number
  progress: ProgressMap
  levelStars: Record<string, number>
  /**
   * Whole days between the previous session and this one, or null if this is
   * the first ever. Drives `comeback`, which rewards the return rather than
   * punishing the absence.
   */
  daysSinceLastSession: number | null
  /** The session that has just been scored. */
  result: { total: number; correctFirstTry: number }
  now?: number
}

interface IslandTally {
  cleared: number
  perfect: number
  subjectsCleared: number
}

/**
 * Walk this child's map and count what is finished.
 *
 * An island counts as *cleared* when every level on it — including the mixed
 * challenge at the end — has at least one star, and *perfect* when every level
 * has three. Islands with no levels at this class are skipped rather than
 * counted as finished, which is what stops an unauthored subject handing out a
 * free "Map Complete".
 */
function tallyIslands(ctx: BadgeContext): IslandTally {
  const tally: IslandTally = { cleared: 0, perfect: 0, subjectsCleared: 0 }
  if (!hasCurriculum(ctx.curriculumId)) return tally

  const bands = includedBands(ctx.curriculumId, ctx.yearBand)

  for (const subject of subjectsForBand(ctx.curriculumId, ctx.yearBand)) {
    let islandsHere = 0
    let clearedHere = 0

    for (const strand of subject.strands) {
      const levels = buildLevels(ctx.curriculumId, strand.id, bands)
      if (levels.length === 0) continue
      islandsHere++

      const stars = levels.map((l) => ctx.levelStars[l.key] ?? 0)
      if (stars.every((s) => s >= 1)) {
        tally.cleared++
        clearedHere++
      }
      if (stars.every((s) => s >= 3)) tally.perfect++
    }

    if (islandsHere > 0 && clearedHere === islandsHere) tally.subjectsCleared++
  }

  return tally
}

/**
 * The current value of one metric.
 *
 * Split out from awarding so the Room can show "4 / 7 days" using the same
 * number the award is decided on. A badge cannot be displayed with progress it
 * will not actually be granted for.
 */
export function measure(metric: BadgeMetric, ctx: BadgeContext, islands?: IslandTally): number {
  const tally = islands ?? tallyIslands(ctx)
  switch (metric) {
    case 'sessions':
      return ctx.questionsAnswered > 0 ? 1 : 0
    case 'streakDays':
      return ctx.streakDays
    case 'questions':
      return ctx.questionsAnswered
    case 'daysAway':
      return ctx.daysSinceLastSession ?? 0
    case 'coins':
      return ctx.coins
    case 'perfectRound':
      /* Five is the floor so a three-question tail-end cannot mint one. */
      return ctx.result.total >= 5 && ctx.result.correctFirstTry === ctx.result.total ? 1 : 0
    case 'answerStreak':
      return ctx.bestAnswerStreak
    case 'skillsMastered':
      return Object.keys(ctx.progress).filter(
        (id) => currentMastery(ctx.progress, id, ctx.now) >= MASTERED,
      ).length
    case 'islandsCleared':
      return tally.cleared
    case 'islandsPerfect':
      return tally.perfect
    case 'subjectsCleared':
      return tally.subjectsCleared
    case 'level':
      return levelForXp(ctx.xp)
  }
}

/**
 * Everything newly won by the session just finished, in display order.
 *
 * Pure, and the single place awarding happens. Returning ids rather than
 * mutating anything is what lets the reachability test drive it with a
 * synthetic context and assert that no badge is unwinnable.
 */
export function evaluateBadges(ctx: BadgeContext): string[] {
  const held = new Set(ctx.earned)
  const islands = tallyIslands(ctx)
  return badgesInOrder()
    .filter((b) => !held.has(b.id) && measure(b.metric, ctx, islands) >= b.threshold)
    .map((b) => b.id)
}

export interface BadgeProgress {
  have: number
  need: number
  /** 0-100, and 0 for a badge where a part-finished bar would be a lie. */
  pct: number
}

/** How far along an unearned badge is, for the Room. */
export function badgeProgress(badge: Badge, ctx: BadgeContext, islands?: IslandTally): BadgeProgress {
  const have = Math.min(measure(badge.metric, ctx, islands), badge.threshold)
  return {
    have,
    need: badge.threshold,
    pct: badge.binary ? 0 : Math.round((have / badge.threshold) * 100),
  }
}

/**
 * Progress for every badge at once, keyed by id.
 *
 * The Room wants all of them, and `tallyIslands` walks the child's whole map —
 * calling it once per badge would mean twenty-odd full walks of the curriculum
 * on every render of a screen a child opens to look at their trophies. One
 * walk, shared.
 */
export function badgeProgressAll(ctx: BadgeContext): Record<string, BadgeProgress> {
  const islands = tallyIslands(ctx)
  const out: Record<string, BadgeProgress> = {}
  for (const badge of BADGES) out[badge.id] = badgeProgress(badge, ctx, islands)
  return out
}
