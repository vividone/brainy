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
import {
  ACTIONS,
  BASE_RESTORED,
  COINS_PER_POINT,
  PLANET_UNLOCK,
  REGIONS,
  REGION_MAX,
  RUSH_REWARD,
  RUSH_SIZE,
  THREAT_KINDS,
  actionCost,
  neediestRegion,
  rushReward,
  threatForDay,
  threatReward,
} from '../src/game/planet'
import { dayKey } from '../src/lib/dates'

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

/* ------------------------------------------------------------------ *
 * 6. Mission Earth opens, and its prices are coherent
 * ------------------------------------------------------------------ */

console.log('\nMission Earth')

for (const id of PLANET_UNLOCK.anyOf) {
  if (!badgeIds.has(id)) fail(`Mission Earth needs badge "${id}", which does not exist`)
}
if (!PLANET_UNLOCK.anyOf.some((id) => wonWhenFree.has(id))) {
  fail('Mission Earth cannot be opened without paying — see prd.md §14.2')
}
const unlockFamilies = new Set(
  PLANET_UNLOCK.anyOf.map((id) => BADGES.find((b) => b.id === id)?.family).filter(Boolean),
)
if (!unlockFamilies.has('grit')) {
  fail('Mission Earth is gated on craft alone — add a grit badge so persistence also opens it')
}
console.log(`  opens with: ${PLANET_UNLOCK.anyOf.filter((id) => wonWhenFree.has(id)).join(' or ')}`)

/*
 * Prices are derived from impact rather than typed, so this can only fail if
 * somebody reintroduces a hand-written cost — which is exactly when one action
 * quietly becomes better value than another and the choice stops being about
 * what a child wants to do.
 */
for (const action of ACTIONS) {
  if (actionCost(action) !== action.impact * COINS_PER_POINT) {
    fail(`"${action.name}" is not priced at ${COINS_PER_POINT} coins per point`)
  }
  if (!action.fact.trim()) fail(`"${action.name}" has no fact`)
}

for (const region of REGIONS) {
  const actions = ACTIONS.filter((a) => a.regionId === region.id)
  if (actions.length === 0) fail(`region "${region.name}" has nothing to do in it`)
  const reachable = actions.reduce((sum, a) => sum + a.impact, 0)
  if (reachable === 0) fail(`region "${region.name}" can never be restored`)
}

/*
 * Facts are claims about the real world, and a citation is a claim that the
 * named body said this. A blank or whitespace source is the failure mode worth
 * catching: it renders as an authority-shaped gap under a sentence nobody
 * checked. Omitting the field is fine and means "definitional"; filling it
 * badly is not.
 */
for (const a of ACTIONS) {
  if (a.source !== undefined && !a.source.trim()) {
    fail(`action "${a.name}" has an empty source — omit the field or name the body`)
  }
}

const cited = ACTIONS.filter((a) => a.source?.trim()).length
const fillOne = (REGION_MAX - BASE_RESTORED) * COINS_PER_POINT
console.log(
  `  ${ACTIONS.length} actions across ${REGIONS.length} regions · ${cited} cited, ${ACTIONS.length - cited} definitional`,
)
console.log(`  ${fillOne} coins to fill a region, ${fillOne * REGIONS.length} for the whole Earth`)

/* Threats ------------------------------------------------------------ */

const regionIds = new Set(REGIONS.map((r) => r.id))
for (const kind of THREAT_KINDS) {
  if (kind.regions.length === 0) fail(`threat "${kind.name}" can strike nowhere`)
  for (const id of kind.regions) {
    if (!regionIds.has(id)) fail(`threat "${kind.name}" names region "${id}", which does not exist`)
  }
}

/*
 * Zero stars must still pay. Finishing always pays (prd.md §5.4), and a child
 * who found today hard has still turned up — a mission worth nothing on a bad
 * day would be the one place in the app that punished effort.
 */
if (threatReward(0) <= 0) fail('a mission finished with no stars pays nothing')
for (let stars = 1; stars <= 3; stars++) {
  if (threatReward(stars) <= threatReward(stars - 1)) {
    fail(`a ${stars}-star mission pays no more than a ${stars - 1}-star one`)
  }
}

/*
 * A year of threats, to prove the rotation is not stuck on one kind or one
 * region. Derived from the date, so this walks real days rather than a mock.
 */
const seenKinds = new Set<string>()
const seenRegions = new Set<string>()
const start = new Date(2026, 0, 1)
for (let i = 0; i < 365; i++) {
  const d = new Date(start)
  d.setDate(start.getDate() + i)
  const threat = threatForDay(dayKey(d))
  seenKinds.add(threat.id)
  seenRegions.add(threat.regionId)
  /* Same day, same threat — a child who reopens the app mid-mission must not
     find a different one waiting. */
  if (threatForDay(dayKey(d)).id !== threat.id) fail('threatForDay is not stable within a day')
}
if (seenKinds.size < THREAT_KINDS.length) {
  fail(`only ${seenKinds.size} of ${THREAT_KINDS.length} threats appear in a year`)
}
if (seenRegions.size < REGIONS.length) {
  fail(`only ${seenRegions.size} of ${REGIONS.length} regions are ever threatened in a year`)
}

/* Meteor Rush -------------------------------------------------------- */

/*
 * Turning up is worth something, even on a round where nothing was deflected.
 * The same rule missions follow, and the one the whole no-fail posture rests
 * on: the app never pays a child nothing for having played.
 */
if (rushReward(0, RUSH_SIZE) < 1) fail('a Meteor Rush round with no hits pays nothing')
if (rushReward(RUSH_SIZE, RUSH_SIZE) !== RUSH_REWARD) {
  fail(`a perfect round pays ${rushReward(RUSH_SIZE, RUSH_SIZE)}, not ${RUSH_REWARD}`)
}
for (let i = 1; i <= RUSH_SIZE; i++) {
  if (rushReward(i, RUSH_SIZE) < rushReward(i - 1, RUSH_SIZE)) {
    fail(`deflecting ${i} meteors pays less than deflecting ${i - 1}`)
  }
}
/* An empty round must not divide by zero on the way to paying nothing. */
if (rushReward(0, 0) !== 0) fail('an empty Meteor Rush round pays something')

/*
 * The reward has to land somewhere it shows. Sending it to whichever region the
 * child happened to finish would make the one part of Mission Earth that is
 * pure play feel like it did nothing.
 */
if (neediestRegion({}) !== REGIONS[0].id) fail('an untouched planet has no neediest region')
const lopsided = Object.fromEntries(REGIONS.map((r, i) => [r.id, i === 3 ? 0 : 50]))
if (neediestRegion(lopsided) !== REGIONS[3].id) {
  fail('neediestRegion does not find the least-restored region')
}

console.log(
  `  Meteor Rush: ${RUSH_SIZE} meteors, ${rushReward(0, RUSH_SIZE)}–${RUSH_REWARD} points, no coins and no mastery`,
)

const perDay = (threatReward(1) + threatReward(2) + threatReward(3)) / 3
console.log(
  `  ${THREAT_KINDS.length} threats, all ${seenRegions.size} regions reachable, ${threatReward(0)}–${threatReward(3)} points a mission`,
)
console.log(
  `  missions alone restore Earth in about ${Math.round(
    ((REGION_MAX - BASE_RESTORED) * REGIONS.length) / perDay,
  )} days of daily play`,
)

/* ------------------------------------------------------------------ */

console.log(
  failures
    ? `\n✖ ${failures} problem${failures === 1 ? '' : 's'} with the badge roster`
    : '\n✔ every badge is winnable, and winnable without paying',
)
process.exit(failures ? 1 : 0)
