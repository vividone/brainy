/**
 * The whole save file. One versioned object in localStorage, no backend.
 *
 * Everything a child does lives here and never leaves the device — see
 * prd.md §12 for why that is the deliberate v1 posture.
 *
 * The save holds *several* children. Siblings share a tablet far more often
 * than they get one each, and merging two children's answers into one mastery
 * model would make the parent report meaningless for both of them.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { applyAttempt, type AttemptOutcome } from '../engine/mastery'
import { levelForXp, scoreSession } from '../engine/scoring'
import type { Difficulty, ProgressMap, SessionResult } from '../engine/types'
import { DEFAULT_CURRICULUM_ID, DEFAULT_YEAR_BAND } from '../content'
import type { CosmeticSlot } from '../game/cosmetics'
import { CHARACTERS, PETS, STARTER_OWNED } from '../game/characters'
import { shopItemById } from '../game/cosmetics'
import { dayKey, daysBetween } from '../lib/dates'
import type { StoredLicence } from '../lib/licence'
import { mergeRemoteProfile, mergeRemoteState, type SyncLearner } from './sync'

/*
 * Storage key kept from the app's earlier name on purpose: changing it
 * would orphan every save already on a device.
 */
export const SAVE_KEY = 'kolo.save.v1'
export const SAVE_VERSION = 3
const HISTORY_LIMIT = 60
/** How many past questions to remember per skill. ~3 sessions' worth. */
const SEEN_PER_SKILL = 24

export interface Profile {
  id: string
  name: string
  curriculumId: string
  yearBand: string
  /**
   * Used to suggest the class, and to re-suggest it when the curriculum
   * changes — a 7-year-old is Basic 2, Year 3 and Grade 2 depending on where
   * they are, and a parent should not have to know that.
   */
  age?: number
  colour: string
  createdAt: number
}

/**
 * Settings that belong to a child, not the tablet. A Basic 1 and a Basic 5
 * child on the same device need different session lengths and different
 * difficulty handling.
 */
export interface LearnerSettings {
  speech: boolean
  speechRate: number
  sessionLength: number
  timedMode: boolean
  /** Seconds per question when timed mode is on. */
  timerSeconds: number
  /**
   * null = adapt to mastery (recommended). A number pins every question to
   * that level, for a parent who knows better than the model does.
   */
  difficultyOverride: Difficulty | null
  dyslexiaFont: boolean
}

/** Settings that belong to the device and are shared by everyone on it. */
export interface DeviceSettings {
  sound: boolean
  reduceMotion: boolean
  /** 4 digits. Guards the parent zone; not a security boundary. */
  parentPin: string
  /**
   * Parent has agreed to share anonymous usage data.
   *
   * One switch covering everything that leaves the device: the usage pings
   * and the weekly learning summary. On for a new install, stated plainly
   * during setup with the box already ticked, and off in one tap in the
   * grown-up area — where turning it off also erases what was sent. Nothing
   * here is ever about a child by name, and it is never used for advertising.
   */
  shareUsage: boolean
  /**
   * Random identifier for this installation, so activations and daily use
   * can be counted without counting the same tablet twice.
   *
   * Created when sharing is on and destroyed the moment it is switched off, so
   * opting out is a real erasure rather than a flag: the id is the only handle
   * on those rows, and once it is gone nothing can find them again. It is tied
   * to a browser profile, not a person, and never travels with a name.
   */
  installId: string | null
  /** Monday-of-week key of the last automatic send, so it goes once a week. */
  lastSharedWeek: string | null
  /** Day key of the last "opened today" ping. */
  lastOpenPing: string | null
  /** Whether the one-off activation ping has been delivered. */
  activationSent: boolean
  /**
   * Parent has paused the app. The child sees a friendly locked screen and
   * needs the grown-up code to get back in.
   *
   * Deliberately a soft lock: a determined older child can clear browser
   * storage. It exists so a parent can say "not now" without confiscating
   * the tablet, not to be tamper-proof.
   */
  locked: boolean
  /** Optional line the child sees on the locked screen. */
  lockNote: string
  /**
   * The family's access licence, or null while they are on the free tier.
   *
   * Stored on the device rather than fetched, so a subject a family has paid
   * for opens in airplane mode. It belongs to the family, not the tablet, which
   * is why it travels in a backup — moving to a new device must not mean buying
   * again. See src/lib/licence.ts for how it is refreshed and why a failed
   * check never takes access away.
   */
  licence: StoredLicence | null
  /**
   * When a bank transfer was submitted for review, ISO, or null.
   *
   * Remembered only so the grown-up area can say "submitted on Tuesday, we will
   * email your code" instead of showing the form again as though nothing had
   * happened. It is not an entitlement and grants nothing — the licence still
   * arrives as a code by email once a human has confirmed the money.
   */
  transferSubmittedAt: string | null
  /**
   * The parent's account on this device.
   *
   * `authToken` is a bearer credential, and localStorage is exposed to XSS by
   * nature — which is why the app ships no third-party script and the CSP
   * forbids one. That is the mitigation, stated rather than implied. It is
   * revocable per device from the server, so a lost tablet is one revocation and
   * not a rotation for the whole family.
   *
   * Deliberately NOT included in an exported backup: a backup file gets emailed
   * around, and a token in one would be a signed-in session travelling by
   * attachment. A restored device asks the parent to sign in, which costs them a
   * six-digit code and buys exactly that.
   */
  authToken: string | null
  /** Shown in the grown-up area so a parent knows which account they are in. */
  parentEmail: string | null
  /**
   * Whether this account has agreed to keep a child's progress off the device.
   *
   * Mirrored from the server rather than owned here — the server decides, this is
   * a cache so the UI can render without a round trip. On unless a parent turns
   * it off, because an account whose job is restoring a family's work cannot
   * start by not keeping it. Turning it off deletes what was kept.
   */
  keepProgress: boolean
  /**
   * When this tablet last had a straight answer from the account, in ms.
   *
   * Only ever used to decide whether it is worth asking again — never to decide
   * what a child may do. A tablet that has not synced in a month works exactly
   * like one that synced a minute ago.
   */
  lastSyncAt: number | null
  /**
   * Questions a child flagged as wrong, waiting for a grown-up to look.
   *
   * A child cannot send us anything: they have no account and the app makes no
   * network request of its own. So "this question is wrong" is saved here, in
   * plain words, and the grown-up area offers to send it. That keeps the promise
   * that nothing leaves the tablet without a parent choosing it, and it also
   * makes the report better, since a parent can see whether the question really
   * was wrong or whether their child simply misread it.
   *
   * On the device rather than the learner, so it never enters a sync payload:
   * it contains a question and the answer given, which is exactly the session
   * detail we refuse to upload.
   */
  flagged: FlaggedQuestion[]
}

/** A question a child marked as looking wrong, in the words the parent will read. */
export interface FlaggedQuestion {
  id: string
  /** ms. Shown to the parent as "yesterday", never sent. */
  at: number
  learnerName: string
  skillId: string
  /** The question as the child saw it. */
  prompt: string
  /** What they answered, rendered the same way the report renders it. */
  given: string
  /** What Brainy marked as correct. */
  expected: string
  /** True once a parent has sent it to us, so it is not sent twice. */
  sent: boolean
}

/** The merged view the screens actually consume. */
export type Settings = LearnerSettings & DeviceSettings

export interface Economy {
  xp: number
  coins: number
  owned: string[]
  equipped: Partial<Record<CosmeticSlot, string>>
}

export interface Streak {
  current: number
  longest: number
  lastPlayed: string | null
  freezes: number
  /** Monday-of-week key of the last freeze grant, so we grant one a week. */
  lastFreezeGrant: string | null
}

export interface DayStat {
  sessions: number
  questions: number
  correct: number
  ms: number
}

export interface Awards {
  badges: string[]
  leveledUpTo: number | null
  streakContinued: boolean
  freezeUsed: boolean
}

/** Everything one child accumulates. Never shared between siblings. */
export interface LearnerData {
  settings: LearnerSettings
  /** Keyed by curriculum id, so switching never destroys the other one. */
  progress: Record<string, ProgressMap>
  levelStars: Record<string, Record<string, number>>
  economy: Economy
  streak: Streak
  badges: string[]
  history: SessionResult[]
  byDay: Record<string, DayStat>
  totals: { questions: number; correct: number; ms: number }
  answerStreak: number
  bestAnswerStreak: number
  /**
   * Signatures of recently-seen questions, per skill, newest first.
   *
   * Generators can produce huge numbers of distinct questions, but random
   * draws still collide — the birthday problem bites long before a pool is
   * exhausted. Remembering the last few dozen per skill and refusing to
   * repeat them is what makes practice actually feel fresh day to day.
   */
  seenItems: Record<string, string[]>
  /**
   * Counts up on every change worth keeping in the account.
   *
   * A counter rather than a timestamp, because device clocks are wrong often
   * enough to matter: a tablet set to next year would win every sync conflict
   * for ever, and nobody would work out why. A revision is only ever compared
   * with the previous revision of the *same* child, so two tablets need no
   * agreement beyond both counting upwards.
   */
  revision: number
}

interface SaveState {
  version: number
  onboarded: boolean
  learners: Profile[]
  activeLearnerId: string
  data: Record<string, LearnerData>
  device: DeviceSettings
  lastAwards: Awards | null
}

export interface NewLearner {
  name: string
  curriculumId: string
  yearBand: string
  age?: number
  characterId?: string
  petId?: string
}

interface Actions {
  completeOnboarding: (p: NewLearner & { parentPin: string; shareUsage?: boolean }) => void
  /**
   * Finish setup without creating a child, for a parent whose children were
   * restored from their account. Never replaces `learners` — see the comment on
   * the implementation for why that distinction is load-bearing.
   */
  completeRestoredSetup: (p: { parentPin: string; shareUsage?: boolean }) => void
  updateSettings: (patch: Partial<Settings>) => void
  setCurriculum: (curriculumId: string, yearBand: string) => void
  setAge: (age: number) => void
  /** Record that the weekly summary has gone for this week. */
  markShared: (week: string) => void
  /** Pause or resume the whole app for whoever is using this device. */
  setLocked: (locked: boolean, note?: string) => void
  /**
   * Turn usage sharing on or off. Turning it on mints an install id; turning
   * it off destroys it, so opting out is a real erasure rather than a flag.
   */
  setShareUsage: (on: boolean) => void
  /**
   * A child says a question looks wrong. Saved for a grown-up; nothing is sent.
   *
   * Silently ignores a repeat of the same question so a child who taps it twice
   * does not produce two rows, and keeps only the most recent few so this can
   * never grow into the day-by-day log we promised not to keep.
   */
  flagQuestion: (flag: Omit<FlaggedQuestion, 'id' | 'at' | 'sent'>) => void
  /** Parent has dealt with a flag, by sending it or by dismissing it. */
  resolveFlag: (id: string, sent: boolean) => void
  /** Record that a usage ping has been delivered. */
  markPinged: (patch: { lastOpenPing?: string; activationSent?: boolean }) => void
  /**
   * Store, refresh or drop the family's licence.
   *
   * Passing null is a real removal — the only things that should ever do it are
   * a parent choosing to, and the server saying positively that the code no
   * longer exists. A failed check must never call this.
   */
  setLicence: (licence: StoredLicence | null) => void
  /**
   * Record a successful sign-in. Also adopts the licence the server returned,
   * which is what makes signing in on a new tablet restore paid access.
   */
  signedIn: (p: {
    token: string
    email: string
    keepProgress?: boolean
    licence?: StoredLicence
  }) => void
  /** Forget the account on this device. Never touches a child's progress. */
  signedOut: () => void
  setKeepProgress: (on: boolean) => void
  /**
   * Adopt children downloaded from the account, per child and only when newer.
   * This is what makes an installed PWA, or a new tablet, pick up where the
   * last one left off.
   */
  adoptRemote: (remote: SyncLearner[]) => void
  /** Note that a sync round trip completed, even if nothing changed. */
  markSynced: () => void
  recordAnswer: (skillId: string, outcome: AttemptOutcome) => void
  /** Remember a question so it is not served again for a while. */
  recordSeen: (skillId: string, signature: string) => void
  /** Returns the scored result plus anything newly unlocked, for the results screen. */
  finishSession: (result: SessionResult) => { awards: Awards; result: SessionResult }
  clearAwards: () => void
  purchase: (cosmeticId: string) => boolean
  equip: (slot: CosmeticSlot, cosmeticId: string | null) => void

  /* Multi-child */
  addLearner: (learner: NewLearner) => string
  switchLearner: (id: string) => void
  renameLearner: (id: string, name: string) => void
  removeLearner: (id: string) => void

  resetProgress: () => void
  /**
   * Wipe the whole device back to a first run. Returns the install id that
   * was in use, if any, so the caller can have the server forget it too —
   * after this returns there is nothing left to identify those rows by.
   */
  resetEverything: () => string | null
  exportSave: () => string
  /** Merge a save exported from another device. Returns a short outcome. */
  importSave: (json: string) => { ok: boolean; message: string }
}

export type Store = SaveState & Actions

const newId = (): string => `L${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`

const defaultLearnerSettings = (): LearnerSettings => ({
  speech: true,
  speechRate: 0.9,
  sessionLength: 10,
  timedMode: false,
  timerSeconds: 45,
  difficultyOverride: null,
  dyslexiaFont: false,
})

const defaultDevice = (): DeviceSettings => ({
  sound: true,
  reduceMotion: false,
  parentPin: '1234',
  /*
   * On for a new install, and one tap off.
   *
   * This is the default for a save that does not have the key yet, which is a
   * fresh setup. A family who already chose "no" has `shareUsage: false` written
   * in their save, and merge() keeps a stored value over a default, so nobody's
   * existing answer is quietly reversed by this line.
   */
  shareUsage: true,
  installId: null,
  lastSharedWeek: null,
  lastOpenPing: null,
  activationSent: false,
  locked: false,
  lockNote: '',
  licence: null,
  transferSubmittedAt: null,
  authToken: null,
  parentEmail: null,
  /* On by default, and corrected by the server on the first pull if this
     family has said otherwise. */
  keepProgress: true,
  lastSyncAt: null,
  flagged: [],
})

export const emptyLearnerData = (): LearnerData => ({
  settings: defaultLearnerSettings(),
  progress: {},
  levelStars: {},
  economy: {
    xp: 0,
    coins: 0,
    // Every free character and pet from the start, so a new child has a
    // real choice on the first screen rather than one default.
    owned: [...STARTER_OWNED],
    equipped: { character: CHARACTERS[0].id, pet: PETS[0].id },
  },
  streak: { current: 0, longest: 0, lastPlayed: null, freezes: 1, lastFreezeGrant: null },
  badges: [],
  history: [],
  byDay: {},
  totals: { questions: 0, correct: 0, ms: 0 },
  answerStreak: 0,
  bestAnswerStreak: 0,
  seenItems: {},
  revision: 0,
})

/*
 * A random id even for the placeholder. A fixed 'L0' meant every device's
 * first child shared an id, so restoring one family's backup onto another
 * device silently overwrote their first child.
 */
const placeholderLearner = (): Profile => ({
  id: newId(),
  name: '',
  curriculumId: DEFAULT_CURRICULUM_ID,
  yearBand: DEFAULT_YEAR_BAND,
  colour: 'violet',
  createdAt: Date.now(),
})

const initialState = (): SaveState => {
  const first = placeholderLearner()
  return {
    version: SAVE_VERSION,
    onboarded: false,
    learners: [first],
    activeLearnerId: first.id,
    data: { [first.id]: emptyLearnerData() },
    device: defaultDevice(),
    lastAwards: null,
  }
}

const DEVICE_KEYS = new Set<keyof DeviceSettings>([
  'sound',
  'reduceMotion',
  'parentPin',
  'shareUsage',
  'installId',
  'lastSharedWeek',
  'lastOpenPing',
  'activationSent',
  'locked',
  'lockNote',
  'licence',
  'transferSubmittedAt',
  'authToken',
  'parentEmail',
  'keepProgress',
  'lastSyncAt',
])

/** Monday-of-week key, used for streak freezes and the weekly summary. */
export function weekKey(d = new Date()): string {
  const monday = new Date(d)
  const offset = (d.getDay() + 6) % 7
  monday.setDate(d.getDate() - offset)
  return dayKey(monday)
}

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      /** The active child's data, guaranteed to exist. */
      const active = (s: SaveState): LearnerData => s.data[s.activeLearnerId] ?? emptyLearnerData()

      /** Write back a patch to the active child's data. */
      /**
       * Write back a patch to the active child's data, and count the revision up.
       *
       * The bump lives here rather than at each call site so it cannot be
       * forgotten: every write to a child's data goes through this function, so
       * every write is visible to sync. It over-counts slightly — recording a
       * seen question bumps it, and seen questions are never uploaded — which
       * costs nothing, because the number is only ever compared with the previous
       * number for the same child. Missing a bump would cost a lost session; an
       * extra one costs a redundant upload of identical data.
       */
      const patchActive = (fn: (d: LearnerData) => Partial<LearnerData>) =>
        set((s) => {
          const current = active(s)
          const patch = fn(current)
          if (Object.keys(patch).length === 0) return {}
          return {
            data: {
              ...s.data,
              [s.activeLearnerId]: { ...current, ...patch, revision: (current.revision ?? 0) + 1 },
            },
          }
        })

      return {
        ...initialState(),

        completeOnboarding: ({
          name,
          curriculumId,
          yearBand,
          age,
          characterId,
          petId,
          parentPin,
          shareUsage,
        }) =>
          set((s) => {
            const id = s.learners[0]?.id ?? newId()
            const learner: Profile = {
              id,
              name: name.trim() || 'Champion',
              curriculumId,
              yearBand,
              age,
              colour: 'violet',
              createdAt: Date.now(),
            }
            const base = s.data[id] ?? emptyLearnerData()
            const data: LearnerData = {
              ...base,
              economy: {
                ...base.economy,
                equipped: {
                  ...base.economy.equipped,
                  character: characterId ?? CHARACTERS[0].id,
                  pet: petId ?? PETS[0].id,
                },
              },
            }
            return {
              onboarded: true,
              learners: [learner],
              activeLearnerId: id,
              data: { [id]: data },
              device: {
                ...s.device,
                parentPin: /^\d{4}$/.test(parentPin) ? parentPin : s.device.parentPin,
                shareUsage: shareUsage ?? true,
                /* The id exists only while sharing does. */
                installId: (shareUsage ?? true) ? newId() + newId() : null,
              },
            }
          }),

        /**
         * Finish setup for a parent whose children came back from their account.
         *
         * A separate action rather than a flag on `completeOnboarding`, because
         * that one *replaces* `learners` and `data` with the single child it was
         * given — correct for a first run, and catastrophic here: it would delete
         * the very progress signing in had just restored. Keeping them as two
         * functions means the destructive one cannot be reached by accident from
         * the restore path.
         */
        completeRestoredSetup: ({ parentPin, shareUsage }) =>
          set((s) => ({
            onboarded: true,
            device: {
              ...s.device,
              parentPin: /^\d{4}$/.test(parentPin) ? parentPin : s.device.parentPin,
              shareUsage: shareUsage ?? true,
              installId: (shareUsage ?? true) ? (s.device.installId ?? newId() + newId()) : null,
            },
          })),

        updateSettings: (patch) =>
          set((s) => {
            const device = { ...s.device }
            const learnerPatch: Partial<LearnerSettings> = {}
            for (const [key, value] of Object.entries(patch)) {
              if (DEVICE_KEYS.has(key as keyof DeviceSettings)) {
                ;(device as Record<string, unknown>)[key] = value
              } else {
                ;(learnerPatch as Record<string, unknown>)[key] = value
              }
            }
            const current = active(s)
            return {
              device,
              data: {
                ...s.data,
                [s.activeLearnerId]: { ...current, settings: { ...current.settings, ...learnerPatch } },
              },
            }
          }),

        setCurriculum: (curriculumId, yearBand) =>
          set((s) => ({
            learners: s.learners.map((l) =>
              l.id === s.activeLearnerId ? { ...l, curriculumId, yearBand } : l,
            ),
          })),

        markShared: (week) =>
          set((s) => ({ device: { ...s.device, lastSharedWeek: week } })),

        flagQuestion: (flag) =>
          set((s) => {
            const already = s.device.flagged.some(
              (f) => f.prompt === flag.prompt && f.given === flag.given,
            )
            if (already) return {}
            const row: FlaggedQuestion = { ...flag, id: newId(), at: Date.now(), sent: false }
            /* Newest first, and capped: this is a support queue, not a history. */
            return { device: { ...s.device, flagged: [row, ...s.device.flagged].slice(0, 12) } }
          }),

        resolveFlag: (id, sent) =>
          set((s) => ({
            device: {
              ...s.device,
              flagged: sent
                ? s.device.flagged.map((f) => (f.id === id ? { ...f, sent: true } : f))
                : s.device.flagged.filter((f) => f.id !== id),
            },
          })),

        setShareUsage: (on) =>
          set((s) => ({
            device: {
              ...s.device,
              shareUsage: on,
              installId: on ? (s.device.installId ?? newId() + newId()) : null,
              activationSent: on ? s.device.activationSent : false,
              lastOpenPing: on ? s.device.lastOpenPing : null,
              lastSharedWeek: on ? s.device.lastSharedWeek : null,
            },
          })),

        markPinged: (patch) => set((s) => ({ device: { ...s.device, ...patch } })),

        setLicence: (licence) => set((s) => ({ device: { ...s.device, licence } })),

        signedIn: ({ token, email, keepProgress, licence }) =>
          set((s) => ({
            device: {
              ...s.device,
              authToken: token,
              parentEmail: email,
              keepProgress: keepProgress ?? s.device.keepProgress,
              /* A sign-in returns the family's current licence, which is the
                 authoritative copy — it is why signing in on a new tablet
                 restores paid subjects without typing a code. */
              licence: licence ?? s.device.licence,
            },
          })),

        signedOut: () =>
          set((s) => ({
            device: { ...s.device, authToken: null, parentEmail: null, keepProgress: false },
          })),

        setKeepProgress: (on) => set((s) => ({ device: { ...s.device, keepProgress: on } })),

        /**
         * Fold children downloaded from the account into this tablet.
         *
         * The rule is last-writer-wins **per child, and only upwards**: a
         * downloaded document is adopted when its revision is higher than the
         * local one, and ignored otherwise. That is what makes this safe to call
         * on every launch — a tablet mid-session cannot have its own newer work
         * replaced by a stale copy from the account.
         *
         * A child the account knows and this tablet does not is created. This is
         * the case that answers "I installed the app and everything was gone".
         */
        adoptRemote: (remote) =>
          set((s) => {
            const learners = [...s.learners]
            const data = { ...s.data }
            let adopted = 0

            for (const incoming of remote) {
              if (!incoming?.id || !incoming.state) continue
              const localIndex = learners.findIndex((l) => l.id === incoming.id)
              const localData = data[incoming.id] ?? emptyLearnerData()

              /* Older or equal: this tablet already has at least as much. */
              if (localIndex >= 0 && incoming.revision <= (localData.revision ?? 0)) continue

              const profile: Profile =
                localIndex >= 0
                  ? mergeRemoteProfile(learners[localIndex], incoming)
                  : mergeRemoteProfile(
                      {
                        id: incoming.id,
                        name: '',
                        curriculumId: DEFAULT_CURRICULUM_ID,
                        yearBand: DEFAULT_YEAR_BAND,
                        colour: 'violet',
                        createdAt: Date.now(),
                      },
                      incoming,
                    )

              if (localIndex >= 0) learners[localIndex] = profile
              else learners.push(profile)

              data[incoming.id] = {
                ...mergeRemoteState(localData, incoming.state),
                revision: incoming.revision,
              }
              adopted += 1
            }

            if (adopted === 0) return { device: { ...s.device, lastSyncAt: Date.now() } }

            /*
             * A blank placeholder child from a first run that never finished is
             * dropped once real children arrive, or the parent lands on "Who's
             * playing?" next to an empty card.
             */
            const real = learners.filter(
              (l) => l.name.trim() !== '' || (data[l.id]?.history?.length ?? 0) > 0,
            )
            const kept = real.length > 0 ? real : learners
            for (const id of Object.keys(data)) {
              if (!kept.some((l) => l.id === id)) delete data[id]
            }

            return {
              learners: kept,
              data,
              activeLearnerId: kept.some((l) => l.id === s.activeLearnerId) ? s.activeLearnerId : kept[0].id,
              device: { ...s.device, lastSyncAt: Date.now() },
            }
          }),

        markSynced: () => set((s) => ({ device: { ...s.device, lastSyncAt: Date.now() } })),

        setLocked: (locked, note) =>
          set((s) => ({
            device: { ...s.device, locked, lockNote: note ?? s.device.lockNote },
          })),

        setAge: (age) =>
          set((s) => ({
            learners: s.learners.map((l) => (l.id === s.activeLearnerId ? { ...l, age } : l)),
          })),

        recordAnswer: (skillId, outcome) =>
          set((s) => {
            const d = active(s)
            const learner = s.learners.find((l) => l.id === s.activeLearnerId)
            const cid = learner?.curriculumId ?? DEFAULT_CURRICULUM_ID
            const map = d.progress[cid] ?? {}
            const next = applyAttempt(map[skillId], outcome)
            const answerStreak = outcome.correct && outcome.firstTry ? d.answerStreak + 1 : 0
            return {
              data: {
                ...s.data,
                [s.activeLearnerId]: {
                  ...d,
                  progress: { ...d.progress, [cid]: { ...map, [skillId]: next } },
                  answerStreak,
                  bestAnswerStreak: Math.max(d.bestAnswerStreak, answerStreak),
                  totals: {
                    questions: d.totals.questions + 1,
                    correct: d.totals.correct + (outcome.correct ? 1 : 0),
                    ms: d.totals.ms,
                  },
                },
              },
            }
          }),

        recordSeen: (skillId, signature) =>
          patchActive((d) => {
            const previous = d.seenItems[skillId] ?? []
            if (previous[0] === signature) return {}
            return {
              seenItems: {
                ...d.seenItems,
                [skillId]: [signature, ...previous.filter((x) => x !== signature)].slice(0, SEEN_PER_SKILL),
              },
            }
          }),

        finishSession: (result) => {
          const s = get()
          const d = active(s)
          const learner = s.learners.find((l) => l.id === s.activeLearnerId)
          const cid = learner?.curriculumId ?? DEFAULT_CURRICULUM_ID
          const today = dayKey()
          const isFirstToday = (d.byDay[today]?.sessions ?? 0) === 0

          const { xp, coins, stars } = scoreSession({
            correctFirstTry: result.correctFirstTry,
            correctOnRetry: result.answers.filter((a) => !a.correctFirstTry).length,
            total: result.total,
            isFirstSessionToday: isFirstToday,
          })

          /* Streak ------------------------------------------------------- */
          const streak = { ...d.streak }
          let freezeUsed = false
          let streakContinued = false
          if (streak.lastPlayed !== today) {
            const gap = streak.lastPlayed ? daysBetween(streak.lastPlayed, today) : Infinity
            if (gap === 1 || streak.lastPlayed === null) {
              streak.current = streak.lastPlayed === null ? 1 : streak.current + 1
              streakContinued = true
            } else if (gap === 2 && streak.freezes > 0) {
              // One missed day is forgiven if a freeze is available. Missing a
              // day should cost the flame, not the whole habit.
              streak.freezes -= 1
              streak.current += 1
              freezeUsed = true
              streakContinued = true
            } else {
              streak.current = 1
            }
            streak.lastPlayed = today
            streak.longest = Math.max(streak.longest, streak.current)
          }
          const thisWeek = weekKey()
          if (streak.lastFreezeGrant !== thisWeek) {
            streak.freezes = Math.min(2, streak.freezes + 1)
            streak.lastFreezeGrant = thisWeek
          }

          /* Level stars --------------------------------------------------- */
          const starsMap = { ...(d.levelStars[cid] ?? {}) }
          if (result.strandId && result.levelKey) {
            starsMap[result.levelKey] = Math.max(starsMap[result.levelKey] ?? 0, stars)
          }

          /* Economy ------------------------------------------------------- */
          const xpBefore = d.economy.xp
          const xpAfter = xpBefore + xp
          const levelBefore = levelForXp(xpBefore)
          const levelAfter = levelForXp(xpAfter)
          const coinsAfter = d.economy.coins + coins

          /* Badges -------------------------------------------------------- */
          const earned: string[] = []
          const award = (id: string, when: boolean) => {
            if (when && !d.badges.includes(id) && !earned.includes(id)) earned.push(id)
          }
          award('first-session', d.history.length === 0)
          award('perfect', result.correctFirstTry === result.total && result.total >= 5)
          award('sharp-sharp', d.bestAnswerStreak >= 10)
          award('kolo-full', coinsAfter >= 500)
          award('century', d.totals.questions >= 100)
          award('five-hundred', d.totals.questions >= 500)
          award('streak-3', streak.current >= 3)
          award('streak-7', streak.current >= 7)
          award('streak-14', streak.current >= 14)
          award('streak-30', streak.current >= 30)
          award('level-5', levelAfter >= 5)
          award('level-10', levelAfter >= 10)

          const day: DayStat = d.byDay[today] ?? { sessions: 0, questions: 0, correct: 0, ms: 0 }
          const stored: SessionResult = { ...result, stars, xpEarned: xp, coinsEarned: coins }

          const awards: Awards = {
            badges: earned,
            leveledUpTo: levelAfter > levelBefore ? levelAfter : null,
            streakContinued,
            freezeUsed,
          }

          set({
            data: {
              ...s.data,
              [s.activeLearnerId]: {
                ...d,
                /* Finishing a session is the change most worth keeping, and this
                   is the one write that bypasses `patchActive`. */
                revision: (d.revision ?? 0) + 1,
                economy: { ...d.economy, xp: xpAfter, coins: coinsAfter },
                streak,
                levelStars: { ...d.levelStars, [cid]: starsMap },
                badges: [...d.badges, ...earned],
                history: [stored, ...d.history].slice(0, HISTORY_LIMIT),
                byDay: {
                  ...d.byDay,
                  [today]: {
                    sessions: day.sessions + 1,
                    questions: day.questions + result.total,
                    correct: day.correct + result.correctFirstTry,
                    ms: day.ms + result.durationMs,
                  },
                },
                totals: { ...d.totals, ms: d.totals.ms + result.durationMs },
              },
            },
            lastAwards: awards,
          })

          return { awards, result: stored }
        },

        clearAwards: () => set({ lastAwards: null }),

        purchase: (cosmeticId) => {
          const s = get()
          const d = active(s)
          const item = shopItemById(cosmeticId)
          if (!item) return false
          if (d.economy.owned.includes(cosmeticId)) return false
          if (d.economy.coins < item.price) return false
          patchActive((cur) => ({
            economy: {
              ...cur.economy,
              coins: cur.economy.coins - item.price,
              owned: [...cur.economy.owned, cosmeticId],
              equipped: { ...cur.economy.equipped, [item.slot]: cosmeticId },
            },
          }))
          return true
        },

        equip: (slot, cosmeticId) =>
          patchActive((d) => {
            const equipped = { ...d.economy.equipped }
            if (cosmeticId === null) delete equipped[slot]
            else equipped[slot] = cosmeticId
            return { economy: { ...d.economy, equipped } }
          }),

        /* ---- Multi-child ---- */

        addLearner: (learner) => {
          const id = newId()
          set((s) => ({
            learners: [
              ...s.learners,
              {
                ...learner,
                id,
                colour: 'violet',
                name: learner.name.trim() || 'Champion',
                createdAt: Date.now(),
              },
            ],
            data: {
              ...s.data,
              [id]: {
                ...emptyLearnerData(),
                economy: {
                  ...emptyLearnerData().economy,
                  equipped: {
                    character: learner.characterId ?? CHARACTERS[0].id,
                    pet: learner.petId ?? PETS[0].id,
                  },
                },
              },
            },
            activeLearnerId: id,
          }))
          return id
        },

        switchLearner: (id) =>
          set((s) => (s.data[id] ? { activeLearnerId: id, lastAwards: null } : {})),

        renameLearner: (id, name) =>
          set((s) => ({
            learners: s.learners.map((l) => (l.id === id ? { ...l, name: name.trim() || l.name } : l)),
          })),

        removeLearner: (id) =>
          set((s) => {
            const learners = s.learners.filter((l) => l.id !== id)
            const data = { ...s.data }
            delete data[id]

            /*
             * Removing the last child used to be refused outright, which left
             * a parent unable to clear a child off a shared or borrowed
             * tablet. It is allowed now and lands back at setup — but the
             * grown-up's own settings survive, because they are still the
             * same grown-up. Wiping those is what "delete everything" is for.
             */
            if (learners.length === 0) {
              const fresh = placeholderLearner()
              return {
                onboarded: false,
                learners: [fresh],
                data: { [fresh.id]: emptyLearnerData() },
                activeLearnerId: fresh.id,
              }
            }

            return {
              learners,
              data,
              activeLearnerId: s.activeLearnerId === id ? learners[0].id : s.activeLearnerId,
            }
          }),

        /** Wipes learning data for the active child but keeps coins and wardrobe. */
        resetProgress: () =>
          patchActive((d) => ({
            progress: {},
            levelStars: {},
            history: [],
            byDay: {},
            totals: { questions: 0, correct: 0, ms: 0 },
            answerStreak: 0,
            bestAnswerStreak: 0,
            seenItems: {},
            streak: { current: 0, longest: 0, lastPlayed: null, freezes: 1, lastFreezeGrant: null },
            economy: d.economy,
          })),

        resetEverything: () => {
          const { installId } = get().device
          set({ ...initialState() })
          return installId
        },

        exportSave: () => {
          const s = get()
          /*
           * Everything about the children and the grown-up's own settings,
           * but none of the analytics plumbing. The install id is the one
           * pseudonymous identifier we hold, and consent belongs to the
           * device it was given on, so neither travels — a restored tablet
           * asks again.
           *
           * The licence does travel, which is the point of restoring onto a
           * new tablet, so the file carries the access code and should be
           * treated as one. That is said plainly in the privacy notice
           * rather than left for a parent to work out.
           *
           * The sign-in token does NOT travel, and that is a deliberate line:
           * a backup is a file people email to themselves, and a token in one
           * would be a live signed-in session moving around as an attachment.
           * Restoring gets you the children and the licence; getting back into
           * the account costs a six-digit code, which is a fair price.
           */
          const {
            installId: _id,
            shareUsage: _share,
            lastSharedWeek: _week,
            lastOpenPing: _ping,
            activationSent: _sent,
            authToken: _token,
            ...device
          } = s.device
          return JSON.stringify(
            {
              kolo: true,
              version: SAVE_VERSION,
              exportedAt: new Date().toISOString(),
              learners: s.learners,
              data: s.data,
              device,
            },
            null,
            2,
          )
        },

        /**
         * Merge a save exported from another device.
         *
         * Merges rather than replaces, and matches children by id, so moving a
         * child to a tablet that already has a sibling on it does not wipe the
         * sibling. Same id means same child, and the incoming copy wins —
         * whichever device you exported from is the one you meant to keep.
         */
        importSave: (json) => {
          let parsed: unknown
          try {
            parsed = JSON.parse(json)
          } catch {
            return { ok: false, message: 'That file is not valid JSON.' }
          }
          const incoming = parsed as Partial<{
            kolo: boolean
            learners: Profile[]
            data: Record<string, LearnerData>
            device: Partial<DeviceSettings>
          }>
          if (!incoming || !Array.isArray(incoming.learners) || typeof incoming.data !== 'object') {
            return { ok: false, message: 'That does not look like a Brainy backup.' }
          }

          const s = get()
          const byId = new Map(s.learners.map((l) => [l.id, l]))
          for (const learner of incoming.learners) {
            if (!learner?.id) continue
            byId.set(learner.id, learner)
          }
          const mergedData = { ...s.data }
          for (const [id, d] of Object.entries(incoming.data ?? {})) {
            if (!d) continue
            mergedData[id] = { ...emptyLearnerData(), ...d, settings: { ...defaultLearnerSettings(), ...d.settings } }
          }

          /*
           * Restoring from the welcome screen happens before any child has
           * been named, so the blank placeholder setup created is still in
           * the list. Left in, it makes `learners.length` 2 and the parent
           * lands on "Who's playing?" next to an empty card instead of going
           * straight into the restored child. Only ever drops a learner that
           * has no name and no history, so a real child cannot be caught.
           */
          const incomingIds = new Set(incoming.learners.map((l) => l?.id))
          const learners = [...byId.values()].filter((l) => {
            if (incomingIds.has(l.id)) return true
            if (l.name.trim()) return true
            return (mergedData[l.id]?.history?.length ?? 0) > 0
          })
          for (const id of Object.keys(mergedData)) {
            if (!learners.some((l) => l.id === id)) delete mergedData[id]
          }
          const restored = incoming.learners.length

          /*
           * Carry the parent's own preferences across, but deliberately not
           * the sharing consent or the install id.
           *
           * The PIN matters: without it a restored tablet quietly falls back
           * to the default 1234, which the child can guess, so moving device
           * would silently unlock the grown-up area. The install id is the
           * opposite case — copying it would make two tablets report as one
           * install and would move a consent given on one device onto
           * another, which is not what was agreed to. So consent starts off
           * again here and has to be given on this device.
           *
           * The licence does travel, and that is the whole point of it living
           * in the backup: a family replacing a broken tablet has already paid,
           * and making them find their code again to prove it would be a
           * punishment for owning one device rather than two. It is re-checked
           * against the server on the next launch anyway.
           */
          const device: DeviceSettings = {
            ...s.device,
            parentPin: incoming.device?.parentPin ?? s.device.parentPin,
            sound: incoming.device?.sound ?? s.device.sound,
            reduceMotion: incoming.device?.reduceMotion ?? s.device.reduceMotion,
            licence: incoming.device?.licence ?? s.device.licence,
          }

          set({
            onboarded: true,
            learners,
            data: mergedData,
            device,
            activeLearnerId: incoming.learners[0]?.id ?? s.activeLearnerId,
          })
          return {
            ok: true,
            message: `Restored ${restored} ${restored === 1 ? 'child' : 'children'}.`,
          }
        },
      }
    },
    {
      name: SAVE_KEY,
      version: SAVE_VERSION,
      // Actions serialise away on their own; the transient award banner
      // should not survive a reload either.
      partialize: ({ lastAwards: _transient, ...rest }) => rest,
      /**
       * Without this, zustand throws away any save written at an older
       * version — a silent wipe of a child's whole history on upgrade.
       */
      migrate: (persisted, from) => {
        const old = (persisted ?? {}) as Record<string, unknown>
        if (from >= 3) return old as unknown as Store

        // v1/v2 held exactly one child at the top level. Fold it into the
        // multi-child shape rather than losing it.
        const legacyProfile = (old.profile ?? {}) as Partial<Profile> & { name?: string }
        const legacySettings = (old.settings ?? {}) as Partial<Settings>
        const id = newId()
        const learner: Profile = {
          id,
          name: legacyProfile.name ?? '',
          curriculumId: legacyProfile.curriculumId ?? DEFAULT_CURRICULUM_ID,
          yearBand: legacyProfile.yearBand ?? DEFAULT_YEAR_BAND,
          age: legacyProfile.age,
          colour: legacyProfile.colour ?? 'violet',
          createdAt: legacyProfile.createdAt ?? Date.now(),
        }

        const data: LearnerData = {
          ...emptyLearnerData(),
          settings: { ...defaultLearnerSettings(), ...legacySettings },
          progress: (old.progress as LearnerData['progress']) ?? {},
          levelStars: (old.levelStars as LearnerData['levelStars']) ?? {},
          economy: { ...emptyLearnerData().economy, ...(old.economy as Economy) },
          streak: { ...emptyLearnerData().streak, ...(old.streak as Streak) },
          badges: (old.badges as string[]) ?? [],
          history: (old.history as SessionResult[]) ?? [],
          byDay: (old.byDay as Record<string, DayStat>) ?? {},
          totals: { ...emptyLearnerData().totals, ...(old.totals as LearnerData['totals']) },
          answerStreak: (old.answerStreak as number) ?? 0,
          bestAnswerStreak: (old.bestAnswerStreak as number) ?? 0,
          seenItems: (old.seenItems as Record<string, string[]>) ?? {},
          revision: 0,
        }

        return {
          version: SAVE_VERSION,
          onboarded: Boolean(old.onboarded),
          learners: [learner],
          activeLearnerId: id,
          data: { [id]: data },
          device: { ...defaultDevice(), ...legacySettings },
          lastAwards: null,
        } as unknown as Store
      },
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<SaveState>
        const learners = saved.learners?.length ? saved.learners : current.learners
        const activeLearnerId =
          saved.activeLearnerId && saved.data?.[saved.activeLearnerId]
            ? saved.activeLearnerId
            : learners[0].id
        const data: Record<string, LearnerData> = {}
        for (const learner of learners) {
          const d = saved.data?.[learner.id]
          data[learner.id] = d
            ? { ...emptyLearnerData(), ...d, settings: { ...defaultLearnerSettings(), ...d.settings } }
            : emptyLearnerData()
        }
        return {
          ...current,
          ...saved,
          learners,
          activeLearnerId,
          data,
          device: { ...current.device, ...saved.device },
          lastAwards: null,
        }
      },
    },
  ),
)

/* ------------------------------------------------------------------ *
 * Convenience hooks — the screens use these rather than reaching into
 * the multi-child structure themselves.
 * ------------------------------------------------------------------ */

export const useProfile = (): Profile =>
  useStore((s) => s.learners.find((l) => l.id === s.activeLearnerId) ?? s.learners[0])

export const useLearnerData = (): LearnerData =>
  useStore((s) => s.data[s.activeLearnerId]) ?? emptyLearnerData()

/** Learner settings merged with device settings, as one flat object. */
export const useSettings = (): Settings => {
  const device = useStore((s) => s.device)
  const learner = useStore((s) => s.data[s.activeLearnerId]?.settings)
  return { ...defaultLearnerSettings(), ...learner, ...device }
}
