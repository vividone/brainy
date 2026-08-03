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
  completeOnboarding: (p: NewLearner & { parentPin: string }) => void
  updateSettings: (patch: Partial<Settings>) => void
  setCurriculum: (curriculumId: string, yearBand: string) => void
  setAge: (age: number) => void
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
  resetEverything: () => void
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

const defaultDevice = (): DeviceSettings => ({ sound: true, reduceMotion: false, parentPin: '1234' })

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

const DEVICE_KEYS = new Set<keyof DeviceSettings>(['sound', 'reduceMotion', 'parentPin'])

/** Monday-of-week key, used to grant one streak freeze per week. */
function weekKey(d = new Date()): string {
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
      const patchActive = (fn: (d: LearnerData) => Partial<LearnerData>) =>
        set((s) => {
          const current = active(s)
          return { data: { ...s.data, [s.activeLearnerId]: { ...current, ...fn(current) } } }
        })

      return {
        ...initialState(),

        completeOnboarding: ({ name, curriculumId, yearBand, age, characterId, petId, parentPin }) =>
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
              },
            }
          }),

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
            // Never leave the app with no child at all.
            if (s.learners.length <= 1) return {}
            const learners = s.learners.filter((l) => l.id !== id)
            const data = { ...s.data }
            delete data[id]
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

        resetEverything: () => set({ ...initialState() }),

        exportSave: () => {
          const s = get()
          return JSON.stringify(
            {
              kolo: true,
              version: SAVE_VERSION,
              exportedAt: new Date().toISOString(),
              learners: s.learners,
              data: s.data,
              device: s.device,
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
            device: DeviceSettings
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

          const learners = [...byId.values()]
          const restored = incoming.learners.length
          set({
            onboarded: true,
            learners,
            data: mergedData,
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
