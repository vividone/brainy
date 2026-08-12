/**
 * Proves no badge is unwinnable, and that none of them needs a paid subject.
 *
 * Two failures this is here to catch, both of which had already happened or
 * were one careless line away:
 *
 *  1. **A badge nobody can win.** `island-master` shipped in the roster and was
 *     never in the award list, so it sat padlocked in every child's Room for
 *     the life of the app. The display list and the award rules are one table
 *     now, but a badge whose threshold is simply out of reach would fail the
 *     same way and look identical. So: build a child who has done everything,
 *     and assert every badge fires.
 *
 *  2. **A badge that quietly costs money.** A free family gets Mathematics and
 *     nothing else (prd.md §14.2). A rule like "master every subject" would be
 *     unwinnable without a licence and would turn the collection into
 *     pay-to-collect without anyone deciding to. So: build the *thinnest* free
 *     child in the product — Basic 1 Nigerian maths, 7 skills across 2 islands —
 *     give them everything that class can offer, and assert the only badges
 *     still out of reach are the ones deliberately listed below.
 *
 * Since badges started gating the top of the shop, the same two failures apply
 * one step downstream: a gate naming a badge that does not exist locks an item
 * for ever and looks like a design choice, and a gate naming only badges a free
 * family cannot win puts a cosmetic behind a licence. Check 5 covers both, plus
 * the grit/craft rule that keeps every gate reachable by persistence as well as
 * by accuracy.
 */

import { registerAllCurricula } from '../src/content'
import { buildLevels, includedBands, subjectsForBand } from '../src/engine/registry'
import type { ProgressMap } from '../src/engine/types'
import { BADGES, evaluateBadges, type BadgeContext } from '../src/game/badges'
import { allShopItems } from '../src/game/cosmetics'

registerAllCurricula()

const CURRICULUM = 'ng-ube'

/**
 * Badges a Basic 1 child cannot reach *this year*, and why that is allowed.
 *
 * Both need more skills than one Basic 1 class contains. Bands are cumulative,
 * so they arrive as the child moves up a class — still free, still maths alone.
 * That is school progression. Anything else appearing here is a bug: it means a
 * badge has been written that needs a subject the family has not bought.
 */
const CLASS_GATED = new Set(['skill-10', 'skill-25'])

/** A progress map with `count` skills mastered, drawn from real skill ids. */
function masteredProgress(skillIds: string[], count: number): ProgressMap {
  const progress: ProgressMap = {}
  for (const id of skillIds.slice(0, count)) {
    progress[id] = {
      mastery: 1,
      attempts: 20,
      correct: 20,
      lastSeen: Date.now(),
      reviewBox: 5,
      reviewDue: Date.now() + 86_400_000,
      everMastered: true,
    }
  }
  return progress
}

/** Three stars on every level reachable in these subjects at this class. */
function fullStars(yearBand: string, subjectIds: string[] | null): Record<string, number> {
  const bands = includedBands(CURRICULUM, yearBand)
  const stars: Record<string, number> = {}
  for (const subject of subjectsForBand(CURRICULUM, yearBand)) {
    if (subjectIds && !subjectIds.includes(subject.id)) continue
    for (const strand of subject.strands) {
      for (const level of buildLevels(CURRICULUM, strand.id, bands)) stars[level.key] = 3
    }
  }
  return stars
}

/** Every skill id reachable at this class, across the given subjects. */
function skillIds(yearBand: string, subjectIds: string[] | null): string[] {
  const bands = includedBands(CURRICULUM, yearBand)
  return subjectsForBand(CURRICULUM, yearBand)
    .filter((s) => !subjectIds || subjectIds.includes(s.id))
    .flatMap((s) => s.strands.flatMap((st) => st.skills))
    .filter((s) => bands.includes(s.yearBand))
    .map((s) => s.id)
}

let failures = 0
const fail = (message: string) => {
  console.log(`  ✖ ${message}`)
  failures++
}

/* ------------------------------------------------------------------ *
 * 1. Ids are unique
 * ------------------------------------------------------------------ */

console.log('\nRoster')
const seen = new Set<string>()
for (const badge of BADGES) {
  if (seen.has(badge.id)) fail(`duplicate badge id "${badge.id}"`)
  seen.add(badge.id)
}
console.log(`  ${BADGES.length} badges, ${seen.size} distinct ids`)

/* ------------------------------------------------------------------ *
 * 2. A child who has done everything wins everything
 * ------------------------------------------------------------------ */

const maxedSkills = skillIds('b6', null)
const maxed: BadgeContext = {
  curriculumId: CURRICULUM,
  yearBand: 'b6',
  earned: [],
  questionsAnswered: 100_000,
  bestAnswerStreak: 1_000,
  streakDays: 1_000,
  coins: 100_000,
  xp: 1_000_000,
  progress: masteredProgress(maxedSkills, maxedSkills.length),
  levelStars: fullStars('b6', null),
  daysSinceLastSession: 30,
  result: { total: 10, correctFirstTry: 10 },
}

console.log('\nReachability — a child who has done everything')
const wonWhenMaxed = new Set(evaluateBadges(maxed))
for (const badge of BADGES) {
  if (!wonWhenMaxed.has(badge.id)) fail(`"${badge.id}" (${badge.name}) can never be won`)
}
console.log(`  ${wonWhenMaxed.size}/${BADGES.length} badges awarded`)

/* ------------------------------------------------------------------ *
 * 3. Nothing is awarded twice, and a new child starts with none
 * ------------------------------------------------------------------ */

console.log('\nAwarding')
const again = evaluateBadges({ ...maxed, earned: BADGES.map((b) => b.id) })
if (again.length > 0) fail(`re-awarded ${again.length} badge(s) already held: ${again.join(', ')}`)
else console.log('  a badge already held is never awarded again')

const fresh: BadgeContext = {
  curriculumId: CURRICULUM,
  yearBand: 'b1',
  earned: [],
  questionsAnswered: 0,
  bestAnswerStreak: 0,
  streakDays: 0,
  coins: 0,
  xp: 0,
  progress: {},
  levelStars: {},
  daysSinceLastSession: null,
  result: { total: 0, correctFirstTry: 0 },
}
const onFreshChild = evaluateBadges(fresh)
if (onFreshChild.length > 0) fail(`a child who has done nothing was awarded: ${onFreshChild.join(', ')}`)
else console.log('  a child who has done nothing is awarded nothing')

/* ------------------------------------------------------------------ *
 * 4. The free tier can win them — the paywall guard
 * ------------------------------------------------------------------ */

const freeSkills = skillIds('b1', ['maths'])
const freeStars = fullStars('b1', ['maths'])
const freeChild: BadgeContext = {
  ...maxed,
  yearBand: 'b1',
  progress: masteredProgress(freeSkills, freeSkills.length),
  levelStars: freeStars,
}

console.log('\nThe thinnest free child — Basic 1, Mathematics only')
console.log(`  ${freeSkills.length} skills, ${Object.keys(freeStars).length} levels`)

const wonWhenFree = new Set(evaluateBadges(freeChild))
for (const badge of BADGES) {
  const reachable = wonWhenFree.has(badge.id)
  if (!reachable && !CLASS_GATED.has(badge.id)) {
    fail(`"${badge.id}" (${badge.name}) is out of reach without paying — see prd.md §14.2`)
  }
  if (reachable && CLASS_GATED.has(badge.id)) {
    fail(`"${badge.id}" is listed as class-gated but a Basic 1 child can win it — drop it from CLASS_GATED`)
  }
}
console.log(`  ${wonWhenFree.size}/${BADGES.length} badges reachable`)
console.log(`  out of reach until the next class: ${[...CLASS_GATED].join(', ')}`)

/* ------------------------------------------------------------------ *
 * 5. Shop gates name real badges, and open for a free family
 * ------------------------------------------------------------------ */

console.log('\nShop gates')
const badgeIds = new Set(BADGES.map((b) => b.id))
const gated = allShopItems().filter((i) => i.requires)

for (const item of gated) {
  const ids = item.requires!.anyOf

  /*
   * A typo'd badge id locks an item for ever and looks exactly like a design
   * decision from the outside — nothing errors, the card simply never opens.
   */
  for (const id of ids) {
    if (!badgeIds.has(id)) fail(`"${item.name}" needs badge "${id}", which does not exist`)
  }

  /* The grit/craft rule from game/badges.ts, checked rather than trusted. */
  const families = new Set(ids.map((id) => BADGES.find((b) => b.id === id)?.family).filter(Boolean))
  if (!families.has('grit')) {
    fail(`"${item.name}" is gated on craft alone — add a grit badge so persistence also opens it`)
  }

  /* And the one that matters most: a free family must be able to open it. */
  if (!ids.some((id) => wonWhenFree.has(id))) {
    fail(`"${item.name}" cannot be opened without paying — see prd.md §14.2`)
  }
}

console.log(`  ${gated.length} of ${allShopItems().length} items gated, all openable free`)
for (const item of gated) {
  const via = item.requires!.anyOf.filter((id) => wonWhenFree.has(id))
  console.log(`    ${item.name} (${item.price}) ← ${via.join(' or ')}`)
}

/* ------------------------------------------------------------------ */

console.log(
  failures
    ? `\n✖ ${failures} problem${failures === 1 ? '' : 's'} with the badge roster`
    : '\n✔ every badge is winnable, and winnable without paying',
)
process.exit(failures ? 1 : 0)
