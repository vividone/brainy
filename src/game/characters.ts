/**
 * Characters and pets — the collection the child builds.
 *
 * Split deliberately into two rosters. A child picks a *character* they see
 * as themselves, and a *pet* that travels with them; collecting both doubles
 * the number of goals without doubling the art. Everything here is cosmetic,
 * everything is bought with earned coins, and nothing costs real money.
 */

export const APP_NAME = 'Brainy'

export type HairStyle =
  | 'short'
  | 'afro'
  | 'braids'
  | 'bun'
  | 'curls'
  | 'fade'
  | 'ponytail'
  | 'headscarf'
  | 'locs'
  | 'cap'

export interface CharacterDef {
  id: string
  name: string
  /** 0 means it is available from the start. */
  price: number
  skin: string
  hair: string
  hairStyle: HairStyle
  outfit: string
  outfitTrim: string
}

/*
 * Skin tones span a realistic Nigerian range and beyond, because a child
 * should be able to pick someone who looks like them on the first screen —
 * not unlock that later.
 */
const SKIN = {
  deep: '#5b3b2a',
  rich: '#7a4b2f',
  warm: '#96603c',
  tan: '#b57f52',
  light: '#d69f6e',
  fair: '#eec39a',
}

export const CHARACTERS: CharacterDef[] = [
  // Free starters — one per skin tone, so nobody has to pay to see themselves.
  { id: 'char.ada', name: 'Ada', price: 0, skin: SKIN.deep, hair: '#1b1b1b', hairStyle: 'braids', outfit: '#8b5cf6', outfitTrim: '#6d28d9' },
  { id: 'char.tunde', name: 'Tunde', price: 0, skin: SKIN.rich, hair: '#141414', hairStyle: 'fade', outfit: '#0ea5e9', outfitTrim: '#0369a1' },
  { id: 'char.zainab', name: 'Zainab', price: 0, skin: SKIN.warm, hair: '#241a12', hairStyle: 'headscarf', outfit: '#14b8a6', outfitTrim: '#0f766e' },
  { id: 'char.emeka', name: 'Emeka', price: 0, skin: SKIN.tan, hair: '#20160f', hairStyle: 'short', outfit: '#f59e0b', outfitTrim: '#b45309' },
  { id: 'char.mia', name: 'Mia', price: 0, skin: SKIN.light, hair: '#6b3f1f', hairStyle: 'ponytail', outfit: '#f43f5e', outfitTrim: '#be123c' },
  { id: 'char.sam', name: 'Sam', price: 0, skin: SKIN.fair, hair: '#a16207', hairStyle: 'curls', outfit: '#65a30d', outfitTrim: '#3f6212' },

  // Collectible.
  { id: 'char.amaka', name: 'Amaka', price: 120, skin: SKIN.deep, hair: '#2b1a10', hairStyle: 'afro', outfit: '#ec4899', outfitTrim: '#9d174d' },
  { id: 'char.kunle', name: 'Kunle', price: 120, skin: SKIN.rich, hair: '#111111', hairStyle: 'locs', outfit: '#6366f1', outfitTrim: '#3730a3' },
  { id: 'char.halima', name: 'Halima', price: 160, skin: SKIN.warm, hair: '#1b1b1b', hairStyle: 'headscarf', outfit: '#a855f7', outfitTrim: '#7e22ce' },
  { id: 'char.chidi', name: 'Chidi', price: 160, skin: SKIN.deep, hair: '#161616', hairStyle: 'cap', outfit: '#ef4444', outfitTrim: '#991b1b' },
  { id: 'char.nneka', name: 'Nneka', price: 200, skin: SKIN.rich, hair: '#3b2314', hairStyle: 'bun', outfit: '#06b6d4', outfitTrim: '#0e7490' },
  { id: 'char.bisi', name: 'Bisi', price: 200, skin: SKIN.tan, hair: '#1f1f1f', hairStyle: 'braids', outfit: '#84cc16', outfitTrim: '#4d7c0f' },
  { id: 'char.yusuf', name: 'Yusuf', price: 260, skin: SKIN.warm, hair: '#181818', hairStyle: 'short', outfit: '#fb923c', outfitTrim: '#c2410c' },
  { id: 'char.temi', name: 'Temi', price: 300, skin: SKIN.deep, hair: '#4c1d95', hairStyle: 'afro', outfit: '#facc15', outfitTrim: '#a16207' },
  { id: 'char.ifeoma', name: 'Ifeoma', price: 380, skin: SKIN.rich, hair: '#7c2d12', hairStyle: 'curls', outfit: '#22d3ee', outfitTrim: '#0891b2' },
  { id: 'char.musa', name: 'Musa', price: 450, skin: SKIN.tan, hair: '#0f0f0f', hairStyle: 'fade', outfit: '#1e293b', outfitTrim: '#0f172a' },
]

export type Species =
  | 'owl'
  | 'cat'
  | 'dog'
  | 'rabbit'
  | 'goat'
  | 'parrot'
  | 'tortoise'
  | 'chick'
  | 'fish'
  | 'monkey'
  | 'dragon'
  | 'elephant'

export interface PetDef {
  id: string
  name: string
  price: number
  species: Species
  body: string
  belly: string
}

export const PETS: PetDef[] = [
  { id: 'pet.owl', name: 'Hoot the Owl', price: 0, species: 'owl', body: '#8b5cf6', belly: '#ede9fe' },
  { id: 'pet.cat', name: 'Pepper the Cat', price: 0, species: 'cat', body: '#f59e0b', belly: '#fef3c7' },
  { id: 'pet.chick', name: 'Pip the Chick', price: 0, species: 'chick', body: '#fbbf24', belly: '#fef9c3' },

  { id: 'pet.dog', name: 'Bingo the Dog', price: 100, species: 'dog', body: '#a16207', belly: '#fde68a' },
  { id: 'pet.rabbit', name: 'Nibbles the Rabbit', price: 120, species: 'rabbit', body: '#e2e8f0', belly: '#f8fafc' },
  { id: 'pet.parrot', name: 'Kiki the Parrot', price: 160, species: 'parrot', body: '#22c55e', belly: '#fef08a' },
  { id: 'pet.goat', name: 'Nanny the Goat', price: 180, species: 'goat', body: '#f1f5f9', belly: '#e2e8f0' },
  { id: 'pet.tortoise', name: 'Ijapa the Tortoise', price: 220, species: 'tortoise', body: '#65a30d', belly: '#a16207' },
  { id: 'pet.fish', name: 'Bubbles the Fish', price: 240, species: 'fish', body: '#38bdf8', belly: '#e0f2fe' },
  { id: 'pet.monkey', name: 'Kelo the Monkey', price: 300, species: 'monkey', body: '#a16207', belly: '#fcd34d' },
  { id: 'pet.elephant', name: 'Dudu the Elephant', price: 420, species: 'elephant', body: '#94a3b8', belly: '#cbd5e1' },
  { id: 'pet.dragon', name: 'Ember the Dragon', price: 600, species: 'dragon', body: '#ef4444', belly: '#fed7aa' },
]

export const characterById = (id: string | undefined): CharacterDef =>
  CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0]

export const petById = (id: string | undefined): PetDef => PETS.find((p) => p.id === id) ?? PETS[0]

/** Everything free at the start, so a new child has a real choice immediately. */
export const STARTER_OWNED = [...CHARACTERS, ...PETS].filter((x) => x.price === 0).map((x) => x.id)
