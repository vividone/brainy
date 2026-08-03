/**
 * England National Curriculum pack — Year 2 → Year 3.
 *
 * Deliberately small. It exists to prove the claim in prd.md §9.2: a second
 * curriculum is a folder and a register call, with no engine or UI change.
 * Note what differs from the Nigerian pack without any engine involvement —
 * sterling instead of naira, British names and settings, and no Roman
 * numerals (the National Curriculum introduces those in Year 4).
 */

import { numericDistractors } from '../../engine/rng'
import type { Curriculum, Item, Locale, SkillDef } from '../../engine/types'
import { entry, mc, money, order, person, sayMaths, thing } from '../shared/authoring'
import { numberToWords } from '../shared/words'

const ukLocale: Locale = {
  tag: 'en-GB',
  currency: {
    symbol: '£',
    code: 'GBP',
    subunit: { name: 'penny', plural: 'pence', per: 100 },
    notes: [5, 10, 20, 50],
    coins: [1, 2, 5, 10, 20, 50, 100, 200],
  },
  names: ['Olivia', 'Noah', 'Amelia', 'Leo', 'Ava', 'Jack', 'Isla', 'Harry', 'Mia', 'Oscar'],
  objects: [
    { one: 'apple', many: 'apples', glyph: '🍎' },
    { one: 'pencil', many: 'pencils', glyph: '✏️' },
    { one: 'book', many: 'books', glyph: '📗' },
    { one: 'sticker', many: 'stickers', glyph: '⭐' },
    { one: 'marble', many: 'marbles', glyph: '🔵' },
    { one: 'cake', many: 'cakes', glyph: '🧁' },
  ],
  places: ['London', 'Manchester', 'Bristol', 'Leeds', 'Cardiff', 'Glasgow'],
  shops: ['the corner shop', 'the school fair', 'the bakery', 'the market'],
  units: { length: ['cm', 'm'], mass: ['g', 'kg'], capacity: ['ml', 'litres'] },
}

const placeValue: SkillDef = {
  id: 'uk.maths.y3.place-value',
  title: 'Hundreds, tens and ones',
  yearBand: 'y3',
  concepts: ['place-value-3-digit'],
  hint: 'Count the columns: hundreds, then tens, then ones.',
  helpAtHome: 'Ask "what is the 4 worth?" in any three-digit number you see.',
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
      { explanation: `It sits in the ${['hundreds', 'tens', 'ones'][pos]} column, so it is worth ${value}.` },
    )
  },
}

const numbersTo1000: SkillDef = {
  id: 'uk.maths.y3.numbers-to-1000',
  title: 'Numbers to 1000',
  yearBand: 'y3',
  concepts: ['count-to-1000'],
  hint: 'Read the hundreds first, then the tens and ones.',
  helpAtHome: 'Read door numbers and page numbers aloud together.',
  generate: ({ rng, difficulty }): Item => {
    const max = [400, 600, 800, 999, 1000][difficulty - 1]
    if (rng.chance(0.5)) {
      const n = rng.int(101, max)
      return mc(rng, `Which number is "${numberToWords(n)}"?`, n, numericDistractors(rng, n, 3, { min: 100, max: 1000 }))
    }
    const step = rng.pick([1, 10, 100])
    const start = rng.int(100, Math.max(120, max - 5 * step))
    const run = [0, 1, 2, 3, 4].map((i) => start + i * step)
    const hole = rng.int(1, 4)
    return entry(`Fill the gap:\n${run.map((v, i) => (i === hole ? '?' : v)).join(', ')}`, run[hole], {
      speak: `Fill the gap. ${run.map((v, i) => (i === hole ? 'blank' : v)).join(', ')}`,
      explanation: `These go up in ${step}s.`,
    })
  },
}

const compareOrder: SkillDef = {
  id: 'uk.maths.y3.compare-order',
  title: 'Comparing and ordering',
  yearBand: 'y3',
  prerequisites: ['uk.maths.y3.place-value'],
  concepts: ['compare-order-numbers'],
  hint: 'Compare the hundreds first, then the tens.',
  helpAtHome: 'Put prices or scores in order together.',
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
    return order(rng, 'Tap them from smallest to largest', sorted, { explanation: sorted.join(', ') })
  },
}

const addSubtract: SkillDef = {
  id: 'uk.maths.y3.add-subtract-3digit',
  title: 'Adding and subtracting to 1000',
  yearBand: 'y3',
  prerequisites: ['uk.maths.y3.place-value'],
  concepts: ['add-3-digit', 'subtract-3-digit'],
  hint: 'Line up the columns and start from the ones.',
  helpAtHome: 'Practise column addition on paper — two three-digit numbers a day.',
  generate: ({ rng, difficulty }): Item => {
    const cap = [200, 400, 600, 800, 999][difficulty - 1]
    const adding = rng.chance(0.5)
    if (adding) {
      const a = rng.int(100, cap)
      const b = rng.int(50, Math.max(60, 999 - a))
      return entry(`${a} + ${b} = ?`, a + b, { speak: sayMaths(`${a} + ${b}`), explanation: `${a} + ${b} = ${a + b}` })
    }
    const a = rng.int(150, cap)
    const b = rng.int(20, a - 10)
    return entry(`${a} − ${b} = ?`, a - b, { speak: sayMaths(`${a} minus ${b}`), explanation: `${a} − ${b} = ${a - b}` })
  },
}

const timesTables: SkillDef = {
  id: 'uk.maths.y3.times-tables',
  title: '3, 4 and 8 times tables',
  yearBand: 'y3',
  concepts: ['times-tables'],
  hint: 'Count up in the table from the start.',
  helpAtHome: 'Year 3 needs 3s, 4s and 8s fluent. Chant one table a week.',
  generate: ({ rng, difficulty }): Item => {
    const tables = [[2, 5, 10], [2, 3, 5, 10], [3, 4, 5, 8], [3, 4, 8], [3, 4, 8]][difficulty - 1]
    const a = rng.pick(tables)
    const b = rng.int(1, 12)
    return entry(`${a} × ${b} = ?`, a * b, { speak: sayMaths(`${a} times ${b}`), explanation: `${a} × ${b} = ${a * b}` })
  },
}

const poundsPence: SkillDef = {
  id: 'uk.maths.y3.money',
  title: 'Pounds and pence',
  yearBand: 'y3',
  prerequisites: ['uk.maths.y3.add-subtract-3digit'],
  concepts: ['money-addition', 'money-change'],
  hint: '100 pence make one pound.',
  helpAtHome: 'Count out change from a real purse together.',
  generate: ({ rng, locale }): Item => {
    const who = person(rng, locale)
    const noun = thing(rng, locale)
    if (rng.chance(0.4)) {
      const pounds = rng.int(1, 9)
      return entry(`How many pence are there in £${pounds}?`, pounds * 100, {
        suffix: 'p',
        explanation: `£1 = 100p, so £${pounds} = ${pounds * 100}p.`,
      })
    }
    const paid = rng.pick([5, 10, 20])
    const cost = rng.int(1, paid - 1)
    return entry(
      `${who} buys a ${noun.one} for ${money(cost, locale)} and pays with ${money(paid, locale)}.\nHow much change?`,
      paid - cost,
      {
        prefix: locale.currency.symbol,
        explanation: `${paid} − ${cost} = ${paid - cost}`,
        maxDigits: 2,
      },
    )
  },
}

export const ukNc: Curriculum = {
  id: 'uk-nc',
  name: 'British (National Curriculum)',
  country: 'England',
  flag: '🇬🇧',
  locale: ukLocale,
  yearBands: [
    { id: 'y1', label: 'Year 1', short: 'Y1' },
    { id: 'y2', label: 'Year 2', short: 'Y2' },
    { id: 'y3', label: 'Year 3', short: 'Y3' },
    { id: 'y4', label: 'Year 4', short: 'Y4' },
  ],
  subjects: [
    {
      id: 'maths',
      name: 'Maths',
      icon: '🔢',
      color: 'violet',
      available: true,
      strands: [
        {
          id: 'uk.maths.number',
          name: 'Number Island',
          blurb: 'Place value and ordering to 1000',
          theme: 'market',
          skills: [numbersTo1000, placeValue, compareOrder],
        },
        {
          id: 'uk.maths.calc',
          name: 'Calculation Falls',
          blurb: 'Column methods, tables and money',
          theme: 'falls',
          skills: [addSubtract, timesTables, poundsPence],
        },
      ],
    },
    /*
     * The same split as the Nigerian pack, under the names British 11+
     * practice actually uses: non-verbal rather than quantitative.
     */
    {
      id: 'quantitative',
      name: 'Non-Verbal Reasoning (11+)',
      icon: '🧮',
      color: 'sky',
      available: false,
      comingSoon: 'Sequences, analogies and spatial puzzles in the 11+ style.',
      plannedTopics: ['Number sequences', 'Figure analogies', 'Codes', 'Rotation & reflection'],
      strands: [],
    },
    {
      id: 'verbal',
      name: 'Verbal Reasoning (11+)',
      icon: '🔤',
      color: 'amber',
      available: false,
      comingSoon: 'Word puzzles in the 11+ style.',
      plannedTopics: ['Synonyms & antonyms', 'Word analogies', 'Letter sequences', 'Hidden words'],
      strands: [],
    },
    {
      id: 'science',
      name: 'Science',
      icon: '🔬',
      color: 'emerald',
      available: false,
      comingSoon: 'Key Stage 2 science is on the way.',
      strands: [],
    },
  ],
}
