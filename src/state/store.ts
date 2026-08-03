/**
 * The whole save file. One versioned object in localStorage, no backend.
 *
 * Everything a child does lives here and never leaves the device — see
 * prd.md §12 for why that is the deliberate v1 posture.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { applyAttempt, type AttemptOutcome } from '../engine/mastery'
import { levelForXp, scoreSession } from '../engine/scoring'
import type { ProgressMap, SessionResult } from '../engine/types'
import { DEFAULT_CURRICULUM_ID, DEFAULT_YEAR_BAND } from '../content'
import type { CosmeticSlot } from '../game/cosmetics'
import { cosmeticById } from '../game/cosmetics'
import { dayKey, daysBetween } from '../lib/dates'

export const SAVE_KEY = 'kolo.save.v1'
const HISTORY_LIMIT = 60

export interface Profile {
  name: string
  curriculumId: string
  yearBand: string
  colour: string
  createdAt: number
}

export interface Settings {
  sound: boolean
  speech: boolean
  speechRate: number
  sessionLength: number
  timedMode: boolean
  dyslexiaFont: boolean
  reduceMotion: boolean
  /** 4 digits. Guards the parent zone; not a security boundary. */
  parentPin: string
}

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

interface SaveState {
  version: number
  onboarded: boolean
  profile: Profile
  settings: Settings
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
  lastAwards: Awards | null
}

interface Actions {
  completeOnboarding: (p: { name: string; curriculumId: string; yearBand: string; colour: string; parentPin: string }) => void
  updateSettings: (patch: Partial<Settings>) => void
  setCurriculum: (curriculumId: string, yearBand: string) => void
  recordAnswer: (skillId: string, outcome: AttemptOutcome) => void
  /** Returns the scored result plus anything newly unlocked, for the results screen. */
  finishSession: (result: SessionResult) => { awards: Awards; result: SessionResult }
  clearAwards: () => void
  purchase: (cosmeticId: string) => boolean
  equip: (slot: CosmeticSlot, cosmeticId: string | null) => void
  resetProgress: () => void
  resetEverything: () => void
  exportSave: () => string
}

export type Store = SaveState & Actions

const defaultProfile = (): Profile => ({
  name: '',
  curriculumId: DEFAULT_CURRICULUM_ID,
  yearBand: DEFAULT_YEAR_BAND,
  colour: 'violet',
  createdAt: Date.now(),
})

const defaultSettings = (): Settings => ({
  sound: true,
  speech: true,
  speechRate: 0.9,
  sessionLength: 10,
  timedMode: false,
  dyslexiaFont: false,
  reduceMotion: false,
  parentPin: '1234',
})

const initialState = (): SaveState => ({
  version: 1,
  onboarded: false,
  profile: defaultProfile(),
  settings: defaultSettings(),
  progress: {},
  levelStars: {},
  economy: { xp: 0, coins: 0, owned: [], equipped: {} },
  streak: { current: 0, longest: 0, lastPlayed: null, freezes: 1, lastFreezeGrant: null },
  badges: [],
  history: [],
  byDay: {},
  totals: { questions: 0, correct: 0, ms: 0 },
  answerStreak: 0,
  bestAnswerStreak: 0,
  lastAwards: null,
})

/** Monday-of-week key, used to grant one streak freeze per week. */
function weekKey(d = new Date()): string {
  const monday = new Date(d)
  const offset = (d.getDay() + 6) % 7
  monday.setDate(d.getDate() - offset)
  return dayKey(monday)
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState(),

      completeOnboarding: ({ name, curriculumId, yearBand, colour, parentPin }) =>
        set((s) => ({
          onboarded: true,
          profile: { ...s.profile, name: name.trim() || 'Champion', curriculumId, yearBand, colour, createdAt: Date.now() },
          settings: { ...s.settings, parentPin: /^\d{4}$/.test(parentPin) ? parentPin : s.settings.parentPin },
        })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      setCurriculum: (curriculumId, yearBand) =>
        set((s) => ({ profile: { ...s.profile, curriculumId, yearBand } })),

      recordAnswer: (skillId, outcome) =>
        set((s) => {
          const cid = s.profile.curriculumId
          const map = s.progress[cid] ?? {}
          const next = applyAttempt(map[skillId], outcome)
          const answerStreak = outcome.correct && outcome.firstTry ? s.answerStreak + 1 : 0
          return {
            progress: { ...s.progress, [cid]: { ...map, [skillId]: next } },
            answerStreak,
            bestAnswerStreak: Math.max(s.bestAnswerStreak, answerStreak),
            totals: {
              questions: s.totals.questions + 1,
              correct: s.totals.correct + (outcome.correct ? 1 : 0),
              ms: s.totals.ms,
            },
          }
        }),

      finishSession: (result) => {
        const s = get()
        const today = dayKey()
        const isFirstToday = (s.byDay[today]?.sessions ?? 0) === 0

        const { xp, coins, stars } = scoreSession({
          correctFirstTry: result.correctFirstTry,
          correctOnRetry: result.answers.filter((a) => !a.correctFirstTry).length,
          total: result.total,
          isFirstSessionToday: isFirstToday,
        })

        /* Streak ------------------------------------------------------- */
        const streak = { ...s.streak }
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
        const cid = s.profile.curriculumId
        const starsMap = { ...(s.levelStars[cid] ?? {}) }
        if (result.strandId) {
          const key = result.levelKey
          if (key) starsMap[key] = Math.max(starsMap[key] ?? 0, stars)
        }

        /* Economy ------------------------------------------------------- */
        const xpBefore = s.economy.xp
        const xpAfter = xpBefore + xp
        const levelBefore = levelForXp(xpBefore)
        const levelAfter = levelForXp(xpAfter)
        const coinsAfter = s.economy.coins + coins

        /* Badges -------------------------------------------------------- */
        const earned: string[] = []
        const award = (id: string, when: boolean) => {
          if (when && !s.badges.includes(id) && !earned.includes(id)) earned.push(id)
        }
        const totalQuestions = s.totals.questions
        award('first-session', s.history.length === 0)
        award('perfect', result.correctFirstTry === result.total && result.total >= 5)
        award('sharp-sharp', s.bestAnswerStreak >= 10)
        award('kolo-full', coinsAfter >= 500)
        award('century', totalQuestions >= 100)
        award('five-hundred', totalQuestions >= 500)
        award('streak-3', streak.current >= 3)
        award('streak-7', streak.current >= 7)
        award('streak-14', streak.current >= 14)
        award('streak-30', streak.current >= 30)
        award('level-5', levelAfter >= 5)
        award('level-10', levelAfter >= 10)

        const day: DayStat = s.byDay[today] ?? { sessions: 0, questions: 0, correct: 0, ms: 0 }
        const stored: SessionResult = { ...result, stars, xpEarned: xp, coinsEarned: coins }

        const awards: Awards = {
          badges: earned,
          leveledUpTo: levelAfter > levelBefore ? levelAfter : null,
          streakContinued,
          freezeUsed,
        }

        set({
          economy: { ...s.economy, xp: xpAfter, coins: coinsAfter },
          streak,
          levelStars: { ...s.levelStars, [cid]: starsMap },
          badges: [...s.badges, ...earned],
          history: [stored, ...s.history].slice(0, HISTORY_LIMIT),
          byDay: {
            ...s.byDay,
            [today]: {
              sessions: day.sessions + 1,
              questions: day.questions + result.total,
              correct: day.correct + result.correctFirstTry,
              ms: day.ms + result.durationMs,
            },
          },
          totals: { ...s.totals, ms: s.totals.ms + result.durationMs },
          lastAwards: awards,
        })

        return { awards, result: stored }
      },

      clearAwards: () => set({ lastAwards: null }),

      purchase: (cosmeticId) => {
        const s = get()
        const item = cosmeticById(cosmeticId)
        if (!item) return false
        if (s.economy.owned.includes(cosmeticId)) return false
        if (s.economy.coins < item.price) return false
        set({
          economy: {
            ...s.economy,
            coins: s.economy.coins - item.price,
            owned: [...s.economy.owned, cosmeticId],
            equipped: { ...s.economy.equipped, [item.slot]: cosmeticId },
          },
        })
        return true
      },

      equip: (slot, cosmeticId) =>
        set((s) => {
          const equipped = { ...s.economy.equipped }
          if (cosmeticId === null) delete equipped[slot]
          else equipped[slot] = cosmeticId
          return { economy: { ...s.economy, equipped } }
        }),

      /** Wipes learning data but keeps the profile, coins and wardrobe. */
      resetProgress: () =>
        set({
          progress: {},
          levelStars: {},
          history: [],
          byDay: {},
          totals: { questions: 0, correct: 0, ms: 0 },
          answerStreak: 0,
          bestAnswerStreak: 0,
          streak: { current: 0, longest: 0, lastPlayed: null, freezes: 1, lastFreezeGrant: null },
        }),

      resetEverything: () => set({ ...initialState() }),

      exportSave: () => {
        const s = get()
        const { ...data } = s
        return JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            profile: data.profile,
            progress: data.progress,
            levelStars: data.levelStars,
            economy: data.economy,
            streak: data.streak,
            badges: data.badges,
            byDay: data.byDay,
            totals: data.totals,
            history: data.history,
          },
          null,
          2,
        )
      },
    }),
    {
      name: SAVE_KEY,
      version: 1,
      // Actions serialise away on their own; the transient award banner
      // should not survive a reload either.
      partialize: ({ lastAwards: _transient, ...rest }) => rest,
    },
  ),
)
