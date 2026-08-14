/**
 * Mission Earth — the world a child restores with the coins they earn.
 *
 * The second coin sink, and deliberately a different *kind* of one. The Shop is
 * a collection you own; this is a world you improve. See GAMIFY.md.
 *
 * Three decisions here are load-bearing rather than cosmetic:
 *
 *  1. **It counts up, never down.** The figure on screen is "restored", not
 *     "health", and no region ever loses points. Partly because prd.md §6.5
 *     forbids losing progress, and partly because a planet that visibly decays
 *     while a seven-year-old is at their grandmother's for a week is a machine
 *     for producing eco-anxiety. Threats arriving is what brings a child back
 *     (see the mission layer); yesterday's work rotting is not.
 *
 *  2. **Every action is the same value for money.** Cost is exactly four coins
 *     per point of restoration, whatever you buy. There is no optimal purchase
 *     to work out and no wrong choice to regret, so what a child picks is a
 *     question of what they want to do rather than arithmetic they will lose at.
 *
 *  3. **The facts are sourced, not written from memory.** Each action carries a
 *     real claim about the real world and the body it comes from. prd.md §8.7
 *     already refuses to invent fact-heavy content; a children's product stating
 *     something false about the climate is worse than one that says nothing.
 *     Anything added here needs a citation in the same shape.
 */

import { makeRng } from '../engine/rng'
import { dayKey, parseDayKey } from '../lib/dates'
import type { BadgeRequirement } from './badges'

export type RegionId = 'forest' | 'ocean' | 'ice' | 'desert' | 'city' | 'sky'

/**
 * What opens Mission Earth.
 *
 * A badge rather than a price. Charging coins to enter would shut out the child
 * who has just spent theirs in the Shop, and the fun part of the app is not
 * somewhere a child should be able to lock themselves out of. Grit and craft
 * both open it, on the same rule as every gate — see `BadgeRequirement`.
 */
export const PLANET_UNLOCK: BadgeRequirement = { anyOf: ['skill-1', 'streak-3'] }

/** Where every region starts, so the world is never shown as dead. */
export const BASE_RESTORED = 20

/** Points a region can hold, above the baseline. */
export const REGION_MAX = 100

/** Coins per point of restoration. Uniform across every action, on purpose. */
export const COINS_PER_POINT = 4

export interface Region {
  id: RegionId
  name: string
  emoji: string
  /** One line the child reads on the region card. */
  blurb: string
  /** Tailwind gradient, matching the island styling elsewhere. */
  gradient: string
}

export const REGIONS: Region[] = [
  { id: 'forest', name: 'Forests', emoji: '🌳', blurb: 'Trees, and everything living in them', gradient: 'from-emerald-300 to-green-600' },
  { id: 'ocean', name: 'Oceans', emoji: '🌊', blurb: 'Reefs, fish and the open sea', gradient: 'from-sky-300 to-blue-600' },
  { id: 'ice', name: 'The Poles', emoji: '🧊', blurb: 'Ice, glaciers and the animals on them', gradient: 'from-cyan-200 to-sky-400' },
  { id: 'desert', name: 'Drylands', emoji: '🏜️', blurb: 'Holding back the sand', gradient: 'from-amber-300 to-orange-500' },
  { id: 'city', name: 'Cities', emoji: '🏙️', blurb: 'Cooler, cleaner places to live', gradient: 'from-violet-300 to-purple-600' },
  { id: 'sky', name: 'The Air', emoji: '💨', blurb: 'What everybody breathes', gradient: 'from-indigo-200 to-indigo-500' },
]

export const regionById = (id: string): Region | undefined => REGIONS.find((r) => r.id === id)

export interface PlanetAction {
  id: string
  regionId: RegionId
  /** Child-facing, and always a thing you *do*. */
  name: string
  emoji: string
  /** Restoration points. Cost is derived, never written by hand. */
  impact: number
  /** One true sentence about the real world, in words a 7-year-old reads. */
  fact: string
  /**
   * Who says so, for every fact that makes an empirical claim.
   *
   * Optional, and the exception is narrow and deliberate: a statement that is
   * definitional rather than a finding — a bicycle burns no fuel, a solar panel
   * turns light into electricity — carries no citation, because attributing
   * arithmetic-grade physics to an agency report is fake precision, and fake
   * precision is the thing this field exists to prevent.
   *
   * Every source here has been checked against the named body. An unverified
   * citation is worse than none: it borrows an institution's authority for a
   * sentence nobody there wrote.
   */
  source?: string
}

/** Coins an action costs. Derived so a price can never drift from its value. */
export const actionCost = (action: PlanetAction): number => action.impact * COINS_PER_POINT

/*
 * Three actions per region at 2, 5 and 9 points — 8, 20 and 36 coins. Against
 * the Shop's 40–600 these are the everyday spend, which is what keeps both
 * sinks alive at once. Filling a region from the baseline costs 320 coins, and
 * the whole Earth 1,920 — about two months of daily play, against roughly eight
 * for the Shop. The arithmetic is in GAMIFY.md.
 */
export const ACTIONS: PlanetAction[] = [
  /* Forests ----------------------------------------------------------- */
  {
    id: 'forest.tree',
    regionId: 'forest',
    name: 'Plant a tree',
    emoji: '🌱',
    impact: 2,
    fact: 'Trees drink in carbon dioxide from the air and lock it away inside their wood. Wood is about half carbon.',
    source: 'US Forest Service',
  },
  {
    id: 'forest.rainforest',
    regionId: 'forest',
    name: 'Protect a rainforest',
    emoji: '🌳',
    impact: 5,
    fact: 'Rainforests cover about six parts in a hundred of the land, but over half of the world’s plants and animals live in them.',
    source: 'National Geographic Education',
  },
  {
    id: 'forest.mangrove',
    regionId: 'forest',
    name: 'Bring back a mangrove',
    emoji: '🌿',
    impact: 9,
    fact: 'Mangrove roots hold the coast together and shelter baby fish until they are big enough for the open sea.',
    source: 'UN Environment Programme',
  },

  /* Oceans ------------------------------------------------------------ */
  {
    id: 'ocean.beach',
    regionId: 'ocean',
    name: 'Clear a beach',
    emoji: '🧹',
    impact: 2,
    fact: 'Plastic in the sea never really goes away. It only breaks into smaller and smaller pieces.',
    source: 'UN Environment Programme',
  },
  {
    id: 'ocean.reef',
    regionId: 'ocean',
    name: 'Grow a coral reef',
    emoji: '🪸',
    impact: 5,
    fact: 'Coral reefs take up a tiny part of the sea floor, but about a quarter of all sea creatures live around them.',
    source: 'US National Oceanic and Atmospheric Administration',
  },
  {
    id: 'ocean.reserve',
    regionId: 'ocean',
    name: 'Make a sea reserve',
    emoji: '🐟',
    impact: 9,
    fact: 'Where fishing stops, there are more fish and bigger ones than in the sea just outside.',
    source: 'NOAA Office of National Marine Sanctuaries',
  },

  /* The Poles --------------------------------------------------------- */
  {
    id: 'ice.study',
    regionId: 'ice',
    name: 'Study a glacier',
    emoji: '🔬',
    impact: 2,
    fact: 'Glaciers are made of packed snow, and scientists read their layers like the pages of a book.',
    source: 'NASA Earth Observatory',
  },
  {
    id: 'ice.soot',
    regionId: 'ice',
    name: 'Clear the soot',
    emoji: '💨',
    impact: 5,
    fact: 'Soot landing on snow makes it darker, and dark snow melts faster in the sun.',
    source: 'NASA Earth Observatory',
  },
  {
    id: 'ice.penguins',
    regionId: 'ice',
    name: 'Guard a penguin colony',
    emoji: '🐧',
    impact: 9,
    fact: 'Penguins eat tiny krill, and baby krill grow up under the sea ice. Less ice means less food.',
    source: 'British Antarctic Survey',
  },

  /* Drylands ---------------------------------------------------------- */
  {
    id: 'desert.grass',
    regionId: 'desert',
    name: 'Plant tough grass',
    emoji: '🌾',
    impact: 2,
    fact: 'Grass roots hold the soil in place so the wind cannot carry it away.',
    source: 'UN Convention to Combat Desertification',
  },
  {
    id: 'desert.fence',
    regionId: 'desert',
    name: 'Build a sand fence',
    emoji: '🪵',
    impact: 5,
    fact: 'Rows of plants and fences slow the wind down and stop dunes swallowing farmland.',
    source: 'UN Convention to Combat Desertification',
  },
  {
    id: 'desert.oasis',
    regionId: 'desert',
    name: 'Restore an oasis',
    emoji: '💧',
    impact: 9,
    fact: 'Shade from date palms keeps the ground below cool enough for other crops to grow.',
    source: 'UN Food and Agriculture Organization',
  },

  /* Cities ------------------------------------------------------------ */
  {
    id: 'city.tree',
    regionId: 'city',
    name: 'Plant a street tree',
    emoji: '🌳',
    impact: 2,
    fact: 'A street with trees on it can be several degrees cooler than one without.',
    source: 'US Environmental Protection Agency',
  },
  {
    id: 'city.bikes',
    regionId: 'city',
    name: 'Add a bike lane',
    emoji: '🚲',
    impact: 5,
    /* Definitional, so no citation — see the note on `source`. */
    fact: 'A bicycle burns no fuel at all, so it puts nothing into the air.',
  },
  {
    id: 'city.solar',
    regionId: 'city',
    name: 'Fit solar panels',
    emoji: '☀️',
    impact: 9,
    fact: 'Solar panels turn sunlight straight into electricity, with nothing burned and no smoke.',
  },

  /* The Air ----------------------------------------------------------- */
  {
    id: 'sky.stove',
    regionId: 'sky',
    name: 'Give a clean cookstove',
    emoji: '🍲',
    impact: 2,
    fact: 'Cooking on an open fire indoors fills the room with smoke that is harmful to breathe.',
    source: 'World Health Organization',
  },
  {
    id: 'sky.wind',
    regionId: 'sky',
    name: 'Raise a wind turbine',
    emoji: '🌬️',
    impact: 5,
    fact: 'A wind turbine makes electricity out of moving air, with no fuel and nothing burned.',
  },
  {
    id: 'sky.methane',
    regionId: 'sky',
    name: 'Trap landfill gas',
    emoji: '♻️',
    impact: 9,
    fact: 'Rubbish dumps give off methane gas. Catching it and using it for power is far better than letting it drift away.',
    source: 'US Environmental Protection Agency',
  },
]

export const actionById = (id: string): PlanetAction | undefined => ACTIONS.find((a) => a.id === id)

export const actionsForRegion = (regionId: RegionId): PlanetAction[] =>
  ACTIONS.filter((a) => a.regionId === regionId)

/* ------------------------------------------------------------------ *
 * Derived figures
 * ------------------------------------------------------------------ */

/** How restored one region is, 0-100, including the baseline. */
export function regionRestored(points: number | undefined): number {
  return Math.min(100, BASE_RESTORED + Math.max(0, points ?? 0))
}

/**
 * How restored the whole Earth is, 0-100.
 *
 * The mean across regions rather than a total, so a child who has poured
 * everything into forests sees the figure move but also sees why it is not
 * higher — the other five are sitting there at the baseline.
 */
export function earthRestored(regions: Partial<Record<RegionId, number>>): number {
  const total = REGIONS.reduce((sum, r) => sum + regionRestored(regions[r.id]), 0)
  return Math.round(total / REGIONS.length)
}

/* ------------------------------------------------------------------ *
 * Threats — the reason to come back tomorrow
 * ------------------------------------------------------------------ */

/**
 * One threat arrives each day, and dealing with it means playing a session.
 *
 * This is the layer that makes Mission Earth a game rather than a shop with a
 * globe on it, and it carries the whole point of the feature: **a mission is a
 * session.** It builds through the ordinary session builder, pays coins, XP,
 * mastery, streak and badges exactly as any other session does, and restores a
 * region on top. A child who thinks they are saving the world is doing their
 * maths practice, which is the only version of this worth building.
 *
 * Two things it deliberately is not:
 *
 *  - **Not a deadline.** A threat that goes unanswered does nothing at all. No
 *    damage, no lost region, no scolding on the way back in. Tomorrow simply
 *    brings a different one. prd.md §6.5 rules out losing progress, and a
 *    seven-year-old should not carry an obligation to a tablet.
 *  - **Not fake physics.** The questions are honest curriculum questions and
 *    the screen says "answer questions to send help", never that the sums *are*
 *    the asteroid's trajectory. prd.md §4.1 forbids bending a concept to fit a
 *    mechanic, and inventing science to make a wrapper feel clever is exactly
 *    that.
 */
export interface ThreatKind {
  id: string
  /** Child-facing, and never frightening. */
  name: string
  emoji: string
  /** One line on what is happening. */
  blurb: string
  /** Regions this can strike. */
  regions: RegionId[]
}

export interface Threat extends ThreatKind {
  regionId: RegionId
  /** The day this threat belongs to, so a resolved one stays resolved. */
  day: string
}

export const THREAT_KINDS: ThreatKind[] = [
  {
    id: 'asteroid',
    name: 'Asteroid on the way',
    emoji: '☄️',
    blurb: 'A rock from space is heading our way. Answer questions to send help.',
    regions: ['forest', 'ocean', 'ice', 'desert', 'city', 'sky'],
  },
  {
    id: 'wildfire',
    name: 'Fire in the forest',
    emoji: '🔥',
    blurb: 'A fire has started in the trees. Answer questions to send help.',
    regions: ['forest'],
  },
  {
    id: 'oil',
    name: 'Oil in the water',
    emoji: '🛢️',
    blurb: 'A ship has spilled oil near the coast. Answer questions to send help.',
    regions: ['ocean'],
  },
  {
    id: 'plastic',
    name: 'A tide of plastic',
    emoji: '🥤',
    blurb: 'Plastic is washing up along the shore. Answer questions to send help.',
    regions: ['ocean'],
  },
  {
    id: 'drought',
    name: 'The wells are low',
    emoji: '🌵',
    blurb: 'It has not rained for a long time. Answer questions to send help.',
    regions: ['desert'],
  },
  {
    id: 'smog',
    name: 'Smog over the city',
    emoji: '🏭',
    blurb: 'The air has turned hazy and hard to breathe. Answer questions to send help.',
    regions: ['city', 'sky'],
  },
  {
    id: 'melt',
    name: 'The ice is thinning',
    emoji: '🧊',
    blurb: 'A warm spell is melting the sea ice. Answer questions to send help.',
    regions: ['ice'],
  },
  {
    id: 'heat',
    name: 'A heatwave',
    emoji: '🌡️',
    blurb: 'The streets are far too hot this week. Answer questions to send help.',
    regions: ['city'],
  },
]

/**
 * Restoration points a mission pays, by stars.
 *
 * Zero stars still pays. Finishing always pays (prd.md §5.4), and a child who
 * found today hard has still turned up and still helped — that is the whole
 * no-fail posture, and it would be odd to honour it everywhere except the part
 * of the app about doing good.
 *
 * Sized so daily missions alone get a child roughly two-thirds of the way to a
 * restored Earth over a couple of months, and coins do the rest. Both routes
 * have to matter: missions only, and spending would be pointless; coins only,
 * and a child who saves for the Shop could never make progress here.
 */
export const THREAT_REWARD = [1, 2, 4, 6]

export const threatReward = (stars: number): number =>
  THREAT_REWARD[Math.max(0, Math.min(THREAT_REWARD.length - 1, Math.round(stars)))]

/**
 * Today's threat — derived from the date, never stored.
 *
 * Deriving rather than saving means a child who closes the app mid-mission
 * comes back to the same one, two tablets agree without syncing anything, and
 * there is no state to migrate when the roster grows. The save records only
 * *that* a day's threat was dealt with.
 */
export function threatForDay(day: string = dayKey()): Threat {
  const index = Math.floor(parseDayKey(day).getTime() / 86_400_000)
  const rng = makeRng(index * 7919 + 13)
  const kind = rng.pick(THREAT_KINDS)
  return { ...kind, regionId: rng.pick(kind.regions), day }
}

/** Whether today's threat has already been dealt with. */
export const threatDone = (lastThreatDay: string | null | undefined, day = dayKey()): boolean =>
  lastThreatDay === day

/* ------------------------------------------------------------------ *
 * Meteor Rush — the optional arcade round
 * ------------------------------------------------------------------ */

/** Meteors in a round. Short enough that a child finishes it. */
export const RUSH_SIZE = 8

/** Restoration points for deflecting every meteor in a round. */
export const RUSH_REWARD = 3

/**
 * What a round is worth, scaled by how many meteors were deflected.
 *
 * Pays restoration points and nothing else — no coins, no XP, no streak, and
 * above all nothing written to the mastery model. Answers given under a clock
 * are a bad measure of what a child understands, and letting them into the
 * spaced-review model would degrade the one part of the app that has to be
 * right. Coins stay tied to real practice; this is play that helps.
 *
 * Rounds down but never to zero: turning up and having a go is worth something,
 * which is the same rule missions follow.
 */
export function rushReward(deflected: number, total: number): number {
  if (total <= 0) return 0
  return Math.max(1, Math.round((deflected / total) * RUSH_REWARD))
}

/** Whether today's round has already been played. Once a day, like missions. */
export const rushDone = (lastRushDay: string | null | undefined, day = dayKey()): boolean =>
  lastRushDay === day

/**
 * Where a Meteor Rush round's points land.
 *
 * The region furthest from restored, so the reward always goes somewhere it is
 * visibly needed rather than topping up whichever one the child already
 * finished. Ties break on the roster order, which keeps it deterministic.
 */
export function neediestRegion(regions: Partial<Record<RegionId, number>>): RegionId {
  return REGIONS.reduce((worst, r) =>
    regionRestored(regions[r.id]) < regionRestored(regions[worst.id]) ? r : worst,
  ).id
}

/** Words for a restoration figure. Always encouraging; never a scolding. */
export function earthMood(restored: number): string {
  if (restored >= 100) return 'The whole planet is thriving. You did that.'
  if (restored >= 75) return 'Earth is looking healthier every day.'
  if (restored >= 50) return 'Halfway. The difference is showing.'
  if (restored >= 30) return 'Good things are starting to grow.'
  return 'Every small thing you do here counts.'
}
