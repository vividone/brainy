/**
 * Deciding what leaves the tablet, and folding back what comes down.
 *
 * The whole of Brainy's privacy position rests on the first function in this
 * file. `buildSyncPayload` is a **whitelist**: it names the fields that may be
 * uploaded and copies only those, so adding a field to the save does not
 * silently start uploading it. The server validates against the same list and
 * *rejects* anything else, which is what makes this a guarantee rather than an
 * intention — see server/lib/sync.js.
 *
 * Three things are deliberately never sent, and each is excluded for a reason
 * worth being able to state out loud:
 *
 *   history     every session, including the exact questions a child got wrong
 *   byDay       a day-by-day record of when a child was using a tablet
 *   seenItems   which questions they have recently been shown
 *
 * Together those are the difference between "how far have they got" and "a log of
 * what this child has been doing". The first is what a parent wants back on a new
 * tablet; the second is surveillance of a seven-year-old, and we are not holding
 * it just because it happens to be in the same object.
 *
 * The visible cost, stated in the privacy notice rather than hidden: a restored
 * tablet has the child's mastery, coins, stars and streak, but the parent
 * report's weekly chart starts again, and a few recently-seen questions may
 * repeat once.
 */

import type { LearnerData, Profile } from './store'

/** What one child looks like on the wire. */
export interface SyncLearner {
  id: string
  revision: number
  profile: {
    name?: string
    age?: number
    curriculumId?: string
    yearBand?: string
    colour?: string
  }
  state: Record<string, unknown>
  updatedAt?: string | null
}

/**
 * The upload for one child.
 *
 * Copies field by field on purpose. A spread with deletions would be shorter and
 * would fail in the dangerous direction — a new field in `LearnerData` would be
 * uploaded by default, and nobody would notice until it was already stored.
 */
export function buildSyncPayload(profile: Profile, data: LearnerData, revision: number): SyncLearner {
  return {
    id: profile.id,
    revision,
    profile: {
      name: profile.name,
      age: profile.age,
      curriculumId: profile.curriculumId,
      yearBand: profile.yearBand,
      colour: profile.colour,
    },
    state: {
      settings: data.settings,
      progress: data.progress,
      levelStars: data.levelStars,
      economy: data.economy,
      streak: data.streak,
      badges: data.badges,
      totals: data.totals,
      answerStreak: data.answerStreak,
      bestAnswerStreak: data.bestAnswerStreak,
      /*
       * Mission Earth. Restoration points and a threat id — what a child has
       * built, not a record of when they were at the tablet, so it belongs on
       * the same side of the line as coins and stars.
       */
      planet: data.planet,
    },
  }
}

/**
 * Fold a downloaded document into what is on this tablet.
 *
 * Local-first: anything not synced — history, the day-by-day chart, seen
 * questions — is **kept from the local copy**, never replaced with a blank. A
 * tablet that has been played on and then receives an older-but-different
 * document must not lose its own record of it.
 */
export function mergeRemoteState(local: LearnerData, remote: Record<string, unknown>): LearnerData {
  const pick = <K extends keyof LearnerData>(key: K): LearnerData[K] =>
    (remote[key as string] as LearnerData[K]) ?? local[key]

  return {
    ...local,
    settings: { ...local.settings, ...(remote.settings as object) },
    progress: pick('progress'),
    levelStars: pick('levelStars'),
    economy: pick('economy'),
    streak: pick('streak'),
    badges: pick('badges'),
    totals: pick('totals'),
    answerStreak: pick('answerStreak'),
    bestAnswerStreak: pick('bestAnswerStreak'),
    planet: pick('planet'),
    /* Local only, by design. Never arrives, never overwritten. */
    history: local.history,
    byDay: local.byDay,
    seenItems: local.seenItems,
  }
}

/** The profile fields a downloaded child brings with it. */
export function mergeRemoteProfile(local: Profile, remote: SyncLearner): Profile {
  return {
    ...local,
    name: remote.profile.name ?? local.name,
    age: remote.profile.age ?? local.age,
    curriculumId: remote.profile.curriculumId ?? local.curriculumId,
    yearBand: remote.profile.yearBand ?? local.yearBand,
    colour: remote.profile.colour ?? local.colour,
  }
}
