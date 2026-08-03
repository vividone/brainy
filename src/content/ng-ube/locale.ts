import type { Locale } from '../../engine/types'

/**
 * Nigerian locale data. Everything region-specific in the maths pack comes
 * from here, which is exactly what makes the UK pack cheap to add.
 */
export const ngLocale: Locale = {
  tag: 'en-NG',
  currency: {
    symbol: '₦',
    code: 'NGN',
    subunit: { name: 'kobo', plural: 'kobo', per: 100 },
    notes: [5, 10, 20, 50, 100, 200, 500, 1000],
    coins: [50, 100, 200],
  },
  names: [
    'Ada',
    'Chidi',
    'Tunde',
    'Amaka',
    'Bisi',
    'Emeka',
    'Ngozi',
    'Segun',
    'Halima',
    'Musa',
    'Funke',
    'Obi',
    'Zainab',
    'Kunle',
    'Ifeoma',
    'Yusuf',
    'Temi',
    'Chioma',
    'Bola',
    'Aisha',
  ],
  objects: [
    { one: 'mango', many: 'mangoes', glyph: '🥭' },
    { one: 'orange', many: 'oranges', glyph: '🍊' },
    { one: 'banana', many: 'bananas', glyph: '🍌' },
    { one: 'pencil', many: 'pencils', glyph: '✏️' },
    { one: 'textbook', many: 'textbooks', glyph: '📕' },
    { one: 'biro', many: 'biros', glyph: '🖊️' },
    { one: 'egg', many: 'eggs', glyph: '🥚' },
    { one: 'ball', many: 'balls', glyph: '⚽' },
    { one: 'sweet', many: 'sweets', glyph: '🍬' },
    { one: 'chicken', many: 'chickens', glyph: '🐔' },
    { one: 'fish', many: 'fishes', glyph: '🐟' },
    { one: 'flower', many: 'flowers', glyph: '🌸' },
    { one: 'star', many: 'stars', glyph: '⭐' },
    { one: 'cup', many: 'cups', glyph: '🥤' },
    { one: 'plantain', many: 'plantains', glyph: '🍌' },
  ],
  places: ['Lagos', 'Abuja', 'Ibadan', 'Kano', 'Enugu', 'Jos', 'Benin', 'Calabar', 'Kaduna', 'Owerri'],
  shops: [
    'the market',
    'the school shop',
    'the provision store',
    'the bookshop',
    'the fruit stall',
    'the bakery',
  ],
  units: {
    length: ['cm', 'm'],
    mass: ['g', 'kg'],
    capacity: ['ml', 'litres'],
  },
}
