/**
 * Everything coins can buy. Cosmetic only — nothing here affects learning,
 * and nothing in the app is ever gated behind real money (prd.md §6.4).
 */

export type CosmeticSlot = 'hat' | 'eyes' | 'neck' | 'room'

export interface Cosmetic {
  id: string
  name: string
  slot: CosmeticSlot
  price: number
  /** Shown on the shop card. */
  emoji: string
}

export const COSMETICS: Cosmetic[] = [
  { id: 'hat.cap', name: 'Baseball Cap', slot: 'hat', price: 40, emoji: '🧢' },
  { id: 'hat.party', name: 'Party Hat', slot: 'hat', price: 60, emoji: '🎉' },
  { id: 'hat.crown', name: 'Golden Crown', slot: 'hat', price: 250, emoji: '👑' },
  { id: 'hat.wizard', name: 'Wizard Hat', slot: 'hat', price: 180, emoji: '🧙' },
  { id: 'hat.cowboy', name: 'Cowboy Hat', slot: 'hat', price: 120, emoji: '🤠' },

  { id: 'eyes.round', name: 'Round Glasses', slot: 'eyes', price: 50, emoji: '👓' },
  { id: 'eyes.shades', name: 'Cool Shades', slot: 'eyes', price: 90, emoji: '🕶️' },
  { id: 'eyes.star', name: 'Star Glasses', slot: 'eyes', price: 160, emoji: '⭐' },

  { id: 'neck.bowtie', name: 'Bow Tie', slot: 'neck', price: 45, emoji: '🎀' },
  { id: 'neck.scarf', name: 'Stripey Scarf', slot: 'neck', price: 80, emoji: '🧣' },
  { id: 'neck.cape', name: 'Hero Cape', slot: 'neck', price: 200, emoji: '🦸' },
  { id: 'neck.medal', name: 'Gold Medal', slot: 'neck', price: 300, emoji: '🏅' },

  { id: 'room.sky', name: 'Blue Sky Room', slot: 'room', price: 70, emoji: '🌤️' },
  { id: 'room.night', name: 'Starry Night Room', slot: 'room', price: 140, emoji: '🌙' },
  { id: 'room.jungle', name: 'Jungle Room', slot: 'room', price: 140, emoji: '🌴' },
  { id: 'room.space', name: 'Space Room', slot: 'room', price: 320, emoji: '🚀' },
]

export const SLOT_LABEL: Record<CosmeticSlot, string> = {
  hat: 'Hats',
  eyes: 'Glasses',
  neck: 'Neck',
  room: 'Rooms',
}

export const cosmeticById = (id: string): Cosmetic | undefined => COSMETICS.find((c) => c.id === id)

export const MASCOT_COLOURS = [
  { id: 'violet', name: 'Purple', body: '#8b5cf6', belly: '#ede9fe', wing: '#7c3aed' },
  { id: 'teal', name: 'Teal', body: '#14b8a6', belly: '#ccfbf1', wing: '#0d9488' },
  { id: 'amber', name: 'Sunny', body: '#f59e0b', belly: '#fef3c7', wing: '#d97706' },
  { id: 'rose', name: 'Pink', body: '#f43f5e', belly: '#ffe4e6', wing: '#e11d48' },
  { id: 'sky', name: 'Sky', body: '#0ea5e9', belly: '#e0f2fe', wing: '#0284c7' },
  { id: 'lime', name: 'Green', body: '#65a30d', belly: '#ecfccb', wing: '#4d7c0f' },
]

export const colourById = (id: string) => MASCOT_COLOURS.find((c) => c.id === id) ?? MASCOT_COLOURS[0]

/* ------------------------------------------------------------------ *
 * Badges
 * ------------------------------------------------------------------ */

export interface Badge {
  id: string
  name: string
  description: string
  emoji: string
}

export const BADGES: Badge[] = [
  { id: 'first-session', name: 'First Steps', description: 'Finished your first quest', emoji: '🌱' },
  { id: 'streak-3', name: 'Three in a Row', description: 'Played 3 days in a row', emoji: '🔥' },
  { id: 'streak-7', name: 'Week Warrior', description: 'Played 7 days in a row', emoji: '⚡' },
  { id: 'streak-14', name: 'Fortnight Hero', description: 'Played 14 days in a row', emoji: '🌟' },
  { id: 'streak-30', name: 'Unstoppable', description: 'Played 30 days in a row', emoji: '🏆' },
  { id: 'sharp-sharp', name: 'Sharp Sharp', description: '10 correct answers in a row', emoji: '🎯' },
  { id: 'perfect', name: 'Perfect Round', description: 'Got every question right first time', emoji: '💯' },
  { id: 'kolo-full', name: 'Kolo Full', description: 'Saved up 500 coins', emoji: '🪙' },
  { id: 'century', name: 'Century', description: 'Answered 100 questions', emoji: '💪' },
  { id: 'five-hundred', name: 'Big Brain', description: 'Answered 500 questions', emoji: '🧠' },
  { id: 'island-master', name: 'Island Master', description: 'Mastered every skill on an island', emoji: '🏝️' },
  { id: 'level-5', name: 'Level Five', description: 'Reached level 5', emoji: '🎖️' },
  { id: 'level-10', name: 'Level Ten', description: 'Reached level 10', emoji: '👑' },
]

export const badgeById = (id: string): Badge | undefined => BADGES.find((b) => b.id === id)
