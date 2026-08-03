/**
 * United States — Common Core State Standards pack.
 *
 * Like the UK pack, this is deliberately compact: enough authored maths to be
 * genuinely playable, and the full subject and grade structure in place so
 * content authoring is the only work left.
 *
 * Note what differs from the Nigerian pack with no engine involvement at all:
 * dollars and cents, US names, "ones" rather than "units", and no Roman
 * numerals (Common Core does not teach them in elementary maths).
 */

import { numericDistractors } from '../../engine/rng'
import type { Curriculum, Item, Locale, SkillDef } from '../../engine/types'
import { entry, mc, money, order, person, sayMaths, thing } from '../shared/authoring'
import { numberToWords } from '../shared/words'

const usLocale: Locale = {
  tag: 'en-US',
  currency: {
    symbol: '$',
    code: 'USD',
    subunit: { name: 'cent', plural: 'cents', per: 100 },
    notes: [1, 5, 10, 20, 50],
    coins: [1, 5, 10, 25],
  },
  names: [
    'Olivia',
    'Liam',
    'Emma',
    'Noah',
    'Ava',
    'Mason',
    'Sophia',
    'Ethan',
    'Isabella',
    'Jayden',
    'Maya',
    'Carlos',
  ],
  objects: [
    { one: 'apple', many: 'apples', glyph: '🍎' },
    { one: 'pencil', many: 'pencils', glyph: '✏️' },
    { one: 'book', many: 'books', glyph: '📗' },
    { one: 'sticker', many: 'stickers', glyph: '⭐' },
    { one: 'marble', many: 'marbles', glyph: '🔵' },
    { one: 'cookie', many: 'cookies', glyph: '🍪' },
    { one: 'baseball', many: 'baseballs', glyph: '⚾' },
  ],
  places: ['Chicago', 'Atlanta', 'Denver', 'Boston', 'Seattle', 'Houston'],
  shops: ['the store', 'the school fair', 'the bakery', 'the farmers market'],
  units: { length: ['in', 'ft'], mass: ['oz', 'lb'], capacity: ['cups', 'gallons'] },
}

const placeValue: SkillDef = {
  id: 'us.math.g2.place-value',
  title: 'Hundreds, tens and ones',
  yearBand: 'g2',
  concepts: ['place-value-3-digit'],
  hint: 'Count the columns: hundreds, then tens, then ones.',
  helpAtHome: 'Pick any three-digit number and ask what each digit is worth.',
  generate: ({ rng, difficulty }): Item => {
    if (rng.chance(0.5)) {
      const h = rng.int(1, difficulty + 3)
      const t = rng.int(0, 9)
      const o = rng.int(0, 9)
      const n = h * 100 + t * 10 + o
      return entry('What number do these blocks make?', n, {
        visual: { kind: 'baseTen', hundreds: h, tens: t, ones: o },
        explanation: `${h} hundreds, ${t} tens and ${o} ones makes ${n}.`,
      })
    }
    const n = rng.int(111, 999)
    const digits = String(n).split('').map(Number)
    const positions = [0, 1, 2].filter((i) => digits[i] !== 0)
    const pos = rng.pick(positions.length ? positions : [0])
    const d = digits[pos]
    const value = d * [100, 10, 1][pos]
    return mc(
      rng,
      `In ${n}, what is the value of the digit ${d}?`,
      value,
      [d, d * 10, d * 100].filter((v) => v !== value),
      { explanation: `It is in the ${['hundreds', 'tens', 'ones'][pos]} place, so it is worth ${value}.` },
    )
  },
}

const numbersTo1000: SkillDef = {
  id: 'us.math.g2.numbers-to-1000',
  title: 'Numbers to 1,000',
  yearBand: 'g2',
  concepts: ['count-to-1000'],
  hint: 'Read the hundreds first, then the tens and ones.',
  helpAtHome: 'Read house numbers and prices out loud together.',
  generate: ({ rng, difficulty }): Item => {
    const max = [400, 600, 800, 999, 1000][difficulty - 1]
    if (rng.chance(0.5)) {
      const n = rng.int(101, max)
      return mc(rng, `Which number is "${numberToWords(n)}"?`, n, numericDistractors(rng, n, 3, { min: 100, max: 1000 }))
    }
    const step = rng.pick([5, 10, 100])
    const start = step * rng.int(2, 8)
    const run = [0, 1, 2, 3, 4].map((i) => start + i * step)
    const hole = rng.int(1, 4)
    return entry(`Skip count by ${step}. Fill the gap:\n${run.map((v, i) => (i === hole ? '?' : v)).join(', ')}`, run[hole], {
      speak: `Skip count by ${step}. ${run.map((v, i) => (i === hole ? 'blank' : v)).join(', ')}`,
      explanation: `These go up by ${step}.`,
    })
  },
}

const compareOrder: SkillDef = {
  id: 'us.math.g2.compare-order',
  title: 'Comparing and ordering',
  yearBand: 'g2',
  prerequisites: ['us.math.g2.place-value'],
  concepts: ['compare-order-numbers'],
  hint: 'Compare the hundreds first, then the tens.',
  helpAtHome: 'Put scores or prices in order together.',
  generate: ({ rng, difficulty }): Item => {
    const max = [50, 100, 500, 999, 999][difficulty - 1]
    const values = rng.sample(Array.from({ length: max - 9 }, (_, i) => i + 10), 4)
    if (rng.chance(0.5)) {
      const [a, b] = values
      const sign = a > b ? '>' : '<'
      return mc(rng, `Which sign goes in the box?\n${a} ☐ ${b}`, sign, [sign === '>' ? '<' : '>', '='], {
        speak: `Which sign goes in the box? ${a} box ${b}`,
        explanation: `${a} ${sign} ${b}`,
      })
    }
    const sorted = [...values].sort((x, y) => x - y)
    return order(rng, 'Tap them from least to greatest', sorted, { explanation: sorted.join(', ') })
  },
}

const addSubtract: SkillDef = {
  id: 'us.math.g3.add-subtract-1000',
  title: 'Adding and subtracting within 1,000',
  yearBand: 'g3',
  prerequisites: ['us.math.g2.place-value'],
  concepts: ['add-3-digit', 'subtract-3-digit'],
  hint: 'Line up the columns and start with the ones.',
  helpAtHome: 'Practice column addition on paper — two three-digit numbers a day.',
  generate: ({ rng, difficulty }): Item => {
    const cap = [200, 400, 600, 800, 999][difficulty - 1]
    if (rng.chance(0.5)) {
      const a = rng.int(100, cap)
      const b = rng.int(50, Math.max(60, 999 - a))
      return entry(`${a} + ${b} = ?`, a + b, { speak: sayMaths(`${a} + ${b}`), explanation: `${a} + ${b} = ${a + b}` })
    }
    const a = rng.int(150, cap)
    const b = rng.int(20, a - 10)
    return entry(`${a} − ${b} = ?`, a - b, { speak: sayMaths(`${a} minus ${b}`), explanation: `${a} − ${b} = ${a - b}` })
  },
}

const multiplication: SkillDef = {
  id: 'us.math.g3.multiplication-facts',
  title: 'Multiplication facts',
  yearBand: 'g3',
  concepts: ['times-tables'],
  hint: 'Count up in that number from the start.',
  helpAtHome: 'Grade 3 needs facts through 10 × 10 fluent. Two minutes a day beats an hour on Sunday.',
  generate: ({ rng, difficulty }): Item => {
    const tables = [[2, 5, 10], [2, 3, 5, 10], [2, 3, 4, 5, 10], [3, 4, 6, 7, 8], [3, 4, 6, 7, 8, 9]][difficulty - 1]
    const a = rng.pick(tables)
    const b = rng.int(1, 10)
    if (difficulty >= 3 && rng.chance(0.3)) {
      return entry(`${a} × ☐ = ${a * b}`, b, {
        speak: sayMaths(`${a} times what equals ${a * b}`),
        explanation: `${a} × ${b} = ${a * b}`,
      })
    }
    return entry(`${a} × ${b} = ?`, a * b, { speak: sayMaths(`${a} times ${b}`), explanation: `${a} × ${b} = ${a * b}` })
  },
}

const dollarsCents: SkillDef = {
  id: 'us.math.g2.money',
  title: 'Dollars and cents',
  yearBand: 'g2',
  concepts: ['money-addition', 'money-change'],
  hint: '100 cents make one dollar.',
  helpAtHome: 'Count out change from a real wallet together.',
  generate: ({ rng, locale }): Item => {
    const who = person(rng, locale)
    const noun = thing(rng, locale)
    if (rng.chance(0.4)) {
      const dollars = rng.int(1, 9)
      return entry(`How many cents are in $${dollars}?`, dollars * 100, {
        suffix: '¢',
        explanation: `$1 = 100¢, so $${dollars} = ${dollars * 100}¢.`,
      })
    }
    const paid = rng.pick([5, 10, 20])
    const cost = rng.int(1, paid - 1)
    return entry(
      `${who} buys a ${noun.one} for ${money(cost, locale)} and pays with ${money(paid, locale)}.\nHow much change?`,
      paid - cost,
      { prefix: locale.currency.symbol, explanation: `${paid} − ${cost} = ${paid - cost}`, maxDigits: 2 },
    )
  },
}

const comingSoon = (
  id: string,
  name: string,
  icon: string,
  color: string,
  blurb: string,
  plannedTopics: string[],
) => ({ id, name, icon, color, available: false, comingSoon: blurb, plannedTopics, strands: [] })

export const usCcss: Curriculum = {
  id: 'us-ccss',
  name: 'American (Common Core)',
  country: 'United States',
  flag: '🇺🇸',
  locale: usLocale,
  yearBands: [
    { id: 'k', label: 'Kindergarten', short: 'K', ageRange: [5, 6] },
    { id: 'g1', label: 'Grade 1', short: 'G1', ageRange: [6, 7] },
    { id: 'g2', label: 'Grade 2', short: 'G2', ageRange: [7, 8] },
    { id: 'g3', label: 'Grade 3', short: 'G3', ageRange: [8, 9] },
    { id: 'g4', label: 'Grade 4', short: 'G4', ageRange: [9, 10] },
    { id: 'g5', label: 'Grade 5', short: 'G5', ageRange: [10, 12] },
  ],
  subjects: [
    {
      id: 'maths',
      name: 'Math',
      icon: '🔢',
      color: 'violet',
      available: true,
      strands: [
        {
          id: 'us.math.number',
          name: 'Number Island',
          blurb: 'Place value and ordering to 1,000',
          theme: 'market',
          skills: [numbersTo1000, placeValue, compareOrder],
        },
        {
          id: 'us.math.ops',
          name: 'Operation Falls',
          blurb: 'Column methods, facts and money',
          theme: 'falls',
          skills: [addSubtract, multiplication, dollarsCents],
        },
      ],
    },
    comingSoon(
      'quantitative',
      'Quantitative Reasoning',
      '🧮',
      'sky',
      'Number puzzles and pattern reasoning, CogAT/NNAT style.',
      ['Number sequences', 'Figure analogies', 'Number matrices', 'Spatial reasoning'],
    ),
    comingSoon('verbal', 'Verbal Reasoning', '🔤', 'amber', 'Word puzzles and vocabulary reasoning.', [
      'Synonyms & antonyms',
      'Word analogies',
      'Sentence completion',
      'Classification',
    ]),
    comingSoon('english', 'English Grammar', '📖', 'rose', 'Grammar, punctuation and sentence work.', [
      'Parts of speech',
      'Verb tenses',
      'Punctuation',
      'Sentence structure',
      'Prefixes & suffixes',
    ]),
    comingSoon(
      'science',
      'Science & Engineering',
      '🔬',
      'emerald',
      'NGSS-aligned elementary science, plus tools and the design process.',
      ['Living things', 'Matter', 'Forces & motion', 'Earth & space', 'Weather', 'Tools & safety', 'Design process'],
    ),
    comingSoon('social', 'Social Studies', '🌍', 'orange', 'Communities, geography and civics.', [
      'Communities',
      'US geography',
      'Civics & government',
      'Maps & globes',
      'Economics basics',
    ]),
    comingSoon('history', 'History', '🏛️', 'stone', 'American history from the first peoples to today.', [
      'Native peoples',
      'Colonial America',
      'Revolution & founding',
      'Westward expansion',
      'Civil rights',
    ]),
    comingSoon('computer', 'Computer Science', '💻', 'cyan', 'Algorithms, coding and digital citizenship.', [
      'Algorithms',
      'Debugging',
      'Block coding',
      'Digital citizenship',
      'Data basics',
    ]),
  ],
}
