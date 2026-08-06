import type { IslandTheme } from '../engine/types'

export interface IslandStyle {
  emoji: string
  gradient: string
  ring: string
  chip: string
}

export const ISLAND_STYLES: Record<IslandTheme, IslandStyle> = {
  market: { emoji: '🏪', gradient: 'from-amber-300 to-orange-400', ring: 'ring-amber-400', chip: 'bg-amber-100 text-amber-900' },
  falls: { emoji: '💧', gradient: 'from-sky-300 to-blue-500', ring: 'ring-sky-400', chip: 'bg-sky-100 text-sky-900' },
  grove: { emoji: '🥭', gradient: 'from-lime-300 to-green-500', ring: 'ring-lime-400', chip: 'bg-lime-100 text-lime-900' },
  bay: { emoji: '⚖️', gradient: 'from-teal-300 to-cyan-500', ring: 'ring-teal-400', chip: 'bg-teal-100 text-teal-900' },
  city: { emoji: '🏙️', gradient: 'from-violet-300 to-purple-500', ring: 'ring-violet-400', chip: 'bg-violet-100 text-violet-900' },
  beach: { emoji: '🏖️', gradient: 'from-yellow-300 to-amber-500', ring: 'ring-yellow-400', chip: 'bg-yellow-100 text-yellow-900' },
  forest: { emoji: '🌳', gradient: 'from-emerald-300 to-green-600', ring: 'ring-emerald-400', chip: 'bg-emerald-100 text-emerald-900' },
  volcano: { emoji: '🌋', gradient: 'from-rose-300 to-red-500', ring: 'ring-rose-400', chip: 'bg-rose-100 text-rose-900' },
}

export const islandStyle = (theme: IslandTheme): IslandStyle => ISLAND_STYLES[theme] ?? ISLAND_STYLES.market

/** Encouragement shown after a session, keyed loosely to how it went. */
export const PRAISE = {
  great: ['Sharp sharp! 🎉', 'Brilliant work!', 'You are on fire! 🔥', 'Superb!', 'Nailed it!'],
  good: ['Well done!', 'Good job!', 'Nice work!', 'Keep going!'],
  okay: ['Good effort!', 'You are getting there!', 'Practice makes perfect!', 'Nice try, keep at it!'],
}

export const CORRECT_WORDS = ['Yes!', 'Correct!', 'Well done!', 'Sharp!', 'That’s it!', 'Brilliant!']
export const WRONG_WORDS = ['Not quite', 'Close one', 'Almost', 'Have another look']
