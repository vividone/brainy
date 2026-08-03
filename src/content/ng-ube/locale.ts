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
  /*
   * These pools are the cheapest lever on question variety in the whole
   * project. Every word problem draws a name, an object and often a place, so
   * the number of distinct-feeling questions scales with their product:
   * 48 names × 34 objects × 14 shops is over 22,000 dressings of the *same*
   * sum. Adding a name here is worth more than adding a generator.
   *
   * Names span the major Nigerian naming traditions deliberately — a child
   * should meet names from beyond their own household.
   */
  names: [
    'Ada', 'Chidi', 'Tunde', 'Amaka', 'Bisi', 'Emeka', 'Ngozi', 'Segun',
    'Halima', 'Musa', 'Funke', 'Obi', 'Zainab', 'Kunle', 'Ifeoma', 'Yusuf',
    'Temi', 'Chioma', 'Bola', 'Aisha', 'Nneka', 'Femi', 'Sadiq', 'Uche',
    'Damilola', 'Ibrahim', 'Chinwe', 'Seyi', 'Fatima', 'Okon', 'Ronke', 'Abubakar',
    'Ezinne', 'Tobi', 'Maryam', 'Kelechi', 'Sola', 'Hauwa', 'Ifeanyi', 'Bunmi',
    'Nkechi', 'Danladi', 'Simi', 'Chuka', 'Amina', 'Gbenga', 'Ebere', 'Idris',
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
    // "fish" is its own plural in standard English. "Fishes" is common in
    // Nigerian speech and is not wrong, but a grammar question generated from
    // this pool would then have two defensible answers.
    { one: 'fish', many: 'fish', glyph: '🐟' },
    { one: 'flower', many: 'flowers', glyph: '🌸' },
    { one: 'star', many: 'stars', glyph: '⭐' },
    { one: 'cup', many: 'cups', glyph: '🥤' },
    { one: 'plantain', many: 'plantains', glyph: '🍌' },
    { one: 'pawpaw', many: 'pawpaws', glyph: '🍈' },
    { one: 'guava', many: 'guavas', glyph: '🍐' },
    { one: 'coconut', many: 'coconuts', glyph: '🥥' },
    { one: 'groundnut', many: 'groundnuts', glyph: '🥜' },
    { one: 'yam', many: 'yams', glyph: '🍠' },
    { one: 'maize cob', many: 'maize cobs', glyph: '🌽' },
    { one: 'tomato', many: 'tomatoes', glyph: '🍅' },
    { one: 'loaf', many: 'loaves', glyph: '🍞' },
    { one: 'biscuit', many: 'biscuits', glyph: '🍪' },
    { one: 'crayon', many: 'crayons', glyph: '🖍️' },
    { one: 'ruler', many: 'rulers', glyph: '📏' },
    { one: 'exercise book', many: 'exercise books', glyph: '📓' },
    { one: 'school bag', many: 'school bags', glyph: '🎒' },
    { one: 'balloon', many: 'balloons', glyph: '🎈' },
    { one: 'marble', many: 'marbles', glyph: '🔵' },
    { one: 'seed', many: 'seeds', glyph: '🌱' },
    { one: 'goat', many: 'goats', glyph: '🐐' },
    { one: 'butterfly', many: 'butterflies', glyph: '🦋' },
    { one: 'bottle', many: 'bottles', glyph: '🍾' },
  ],
  places: [
    'Lagos', 'Abuja', 'Ibadan', 'Kano', 'Enugu', 'Jos', 'Benin', 'Calabar',
    'Kaduna', 'Owerri', 'Port Harcourt', 'Abeokuta', 'Ilorin', 'Onitsha',
    'Maiduguri', 'Uyo', 'Sokoto', 'Warri', 'Akure', 'Aba',
  ],
  shops: [
    'the market',
    'the school shop',
    'the provision store',
    'the bookshop',
    'the fruit stall',
    'the bakery',
    'the corner kiosk',
    'the pharmacy',
    'the fabric stall',
    'the vegetable stall',
    'the sweet shop',
    'the stationery shop',
    'the poultry farm',
    'the fish market',
  ],
  units: {
    length: ['cm', 'm'],
    mass: ['g', 'kg'],
    capacity: ['ml', 'litres'],
  },
}
