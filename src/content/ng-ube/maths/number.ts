/** Number & Numeration — Nigerian UBE Basic 2 → Basic 3. */

import { numericDistractors } from '../../../engine/rng'
import type { Item, SkillDef, StrandDef } from '../../../engine/types'
import { entry, mc, order, tapMany, thing } from '../../shared/authoring'
import { capitalise, numberToWords, ordinalShort, ordinalWord, toRoman } from '../../shared/words'
import { earlyNumberSkills } from './early'
import { upperNumberSkills } from './upper'

const countTo200: SkillDef = {
  id: 'ng.maths.number.count-200',
  title: 'Counting to 200',
  yearBand: 'b2',
  concepts: ['count-to-200'],
  hint: 'Count on one at a time, and say each number out loud.',
  helpAtHome: 'Count plates, steps or cars together — forwards from 87, backwards from 40.',
  generate: ({ rng, difficulty, locale }): Item => {
    const max = [30, 60, 100, 150, 200][difficulty - 1]
    const variant = rng.int(1, difficulty <= 2 ? 3 : 4)

    if (variant === 1 && difficulty <= 2) {
      const noun = thing(rng, locale)
      const count = rng.int(6, 8 + difficulty * 5)
      return {
        skillId: '',
        type: 'count-objects',
        prompt: `Tap each one to count. How many ${noun.many} are there?`,
        glyph: noun.glyph,
        count,
        perRow: 5,
      }
    }

    if (variant === 2) {
      const n = rng.int(10, max - 2)
      const after = rng.chance(0.5)
      const answer = after ? n + 1 : n - 1
      return mc(
        rng,
        after ? `Which number comes just after ${n}?` : `Which number comes just before ${n}?`,
        answer,
        numericDistractors(rng, answer, 3, { min: 0, max: max + 5 }),
        { explanation: `${n - 1}, ${n}, ${n + 1}` },
      )
    }

    if (variant === 3) {
      const start = rng.int(5, max - 6)
      const hole = rng.int(1, 3)
      const run = [start, start + 1, start + 2, start + 3, start + 4]
      const shown = run.map((v, i) => (i === hole ? '?' : String(v))).join(', ')
      return entry(`What number is missing?\n${shown}`, run[hole], {
        speak: `What number is missing in ${run.map((v, i) => (i === hole ? 'blank' : v)).join(', ')}`,
        explanation: `The numbers go up by one: ${run.join(', ')}`,
      })
    }

    const n = rng.int(21, max)
    return mc(
      rng,
      `Which number is "${numberToWords(n)}"?`,
      n,
      numericDistractors(rng, n, 3, { min: 1, max: max + 10 }),
    )
  },
}

const countTo1000: SkillDef = {
  id: 'ng.maths.number.count-1000',
  title: 'Numbers to 1000',
  yearBand: 'b3',
  prerequisites: ['ng.maths.number.count-200'],
  concepts: ['count-to-1000'],
  hint: 'Read the hundreds first, then the tens and units.',
  helpAtHome: 'Read house numbers, page numbers and prices out loud together.',
  generate: ({ rng, difficulty }): Item => {
    const max = [400, 600, 800, 999, 1000][difficulty - 1]
    const variant = rng.int(1, 4)

    if (variant === 1) {
      const n = rng.int(101, max)
      return mc(
        rng,
        `Which number is "${numberToWords(n)}"?`,
        n,
        numericDistractors(rng, n, 3, { min: 100, max: 1000, near: [swapDigits(n), n * 10 > 999 ? n - 90 : n + 90] }),
      )
    }

    if (variant === 2) {
      const n = rng.int(101, max)
      const wrong = [swapDigits(n), n + 100, n - 10].filter((v) => v > 0 && v !== n)
      return mc(rng, `How do we write ${n} in words?`, capitalise(numberToWords(n)), wrong.map((w) => capitalise(numberToWords(w))))
    }

    if (variant === 3) {
      const n = rng.int(105, max - 5)
      const after = rng.chance(0.5)
      const answer = after ? n + 1 : n - 1
      return entry(after ? `What comes just after ${n}?` : `What comes just before ${n}?`, answer, {
        explanation: `${n - 1}, ${n}, ${n + 1}`,
      })
    }

    const step = rng.pick([1, 10, 100])
    const start = rng.int(100, Math.max(120, max - 5 * step))
    const run = [0, 1, 2, 3, 4].map((i) => start + i * step)
    const hole = rng.int(1, 4)
    const shown = run.map((v, i) => (i === hole ? '?' : String(v))).join(', ')
    return entry(`Fill the gap:\n${shown}`, run[hole], {
      speak: `Fill the gap. ${run.map((v, i) => (i === hole ? 'blank' : v)).join(', ')}`,
      explanation: `These numbers go up in ${step}s.`,
    })
  },
}

/** Swap two digits to make a classic transposition slip — a good distractor. */
function swapDigits(n: number): number {
  const s = String(n)
  if (s.length < 2) return n + 1
  const arr = s.split('')
  ;[arr[0], arr[arr.length - 1]] = [arr[arr.length - 1], arr[0]]
  const v = Number(arr.join(''))
  return v === n ? n + 11 : v
}

const placeValue: SkillDef = {
  id: 'ng.maths.number.place-value',
  title: 'Hundreds, tens and units',
  yearBand: 'b3',
  prerequisites: ['ng.maths.number.count-1000'],
  concepts: ['place-value-3-digit'],
  hint: 'Count the columns: hundreds, then tens, then units.',
  helpAtHome: 'Take any 3-digit number and ask "what is the 7 worth?" — 7, 70 or 700.',
  generate: ({ rng, difficulty }): Item => {
    const variant = rng.int(1, difficulty >= 3 ? 4 : 2)

    if (variant === 1) {
      const h = rng.int(1, difficulty + 3)
      const t = rng.int(0, 9)
      const o = rng.int(0, 9)
      const n = h * 100 + t * 10 + o
      return entry('What number do these blocks make?', n, {
        visual: { kind: 'baseTen', hundreds: h, tens: t, ones: o },
        explanation: `${h} hundred${h > 1 ? 's' : ''}, ${t} ten${t === 1 ? '' : 's'} and ${o} unit${o === 1 ? '' : 's'} makes ${n}.`,
      })
    }

    if (variant === 2) {
      // A zero digit is worth zero in every column, which makes for a
      // pointless question and identical distractors.
      const n = rng.int(111, 999)
      const digits = String(n).split('').map(Number)
      const positions = [0, 1, 2].filter((i) => digits[i] !== 0)
      const pos = rng.pick(positions.length ? positions : [0])
      const d = digits[pos]
      const value = d * [100, 10, 1][pos]
      const name = ['hundreds', 'tens', 'units'][pos]
      return mc(
        rng,
        `In the number ${n}, what is the value of the digit ${d}?`,
        value,
        [d, d * 10, d * 100].filter((v) => v !== value),
        { explanation: `The ${d} is in the ${name} column, so it is worth ${value}.` },
      )
    }

    if (variant === 3) {
      const n = rng.int(111, 999)
      const digits = String(n).split('').map(Number)
      const pos = rng.int(0, 2)
      const name = ['hundreds', 'tens', 'units'][pos]
      return entry(`Which digit is in the ${name} place in ${n}?`, digits[pos], {
        maxDigits: 1,
        explanation: `${n} is ${digits[0]} hundreds, ${digits[1]} tens and ${digits[2]} units.`,
      })
    }

    const h = rng.int(1, 9)
    const t = rng.int(0, 9)
    const o = rng.int(0, 9)
    const n = h * 100 + t * 10 + o
    return mc(
      rng,
      `Which one shows ${n} broken up?`,
      `${h * 100} + ${t * 10} + ${o}`,
      [`${h} + ${t} + ${o}`, `${h * 100} + ${t} + ${o * 10}`, `${h * 10} + ${t * 100} + ${o}`],
      { explanation: `${n} = ${h * 100} + ${t * 10} + ${o}` },
    )
  },
}

const compareOrder: SkillDef = {
  id: 'ng.maths.number.compare-order',
  title: 'Bigger, smaller, in order',
  yearBand: 'b3',
  prerequisites: ['ng.maths.number.place-value'],
  concepts: ['compare-order-numbers'],
  hint: 'Compare the hundreds first. If they match, compare the tens.',
  helpAtHome: 'Line up prices from a receipt and put them in order together.',
  generate: ({ rng, difficulty }): Item => {
    const max = [50, 100, 500, 999, 999][difficulty - 1]
    const variant = rng.int(1, 3)

    if (variant === 1) {
      const a = rng.int(10, max)
      let b = rng.int(10, max)
      while (b === a) b = rng.int(10, max)
      const bigger = rng.chance(0.5)
      return mc(
        rng,
        bigger ? `Which number is bigger?` : `Which number is smaller?`,
        bigger ? Math.max(a, b) : Math.min(a, b),
        [bigger ? Math.min(a, b) : Math.max(a, b)],
        { explanation: `${Math.max(a, b)} is bigger than ${Math.min(a, b)}.` },
      )
    }

    if (variant === 2) {
      const a = rng.int(10, max)
      let b = rng.int(10, max)
      while (b === a) b = rng.int(10, max)
      const sign = a > b ? '>' : '<'
      return mc(rng, `Which sign goes in the box?\n${a} ☐ ${b}`, sign, [sign === '>' ? '<' : '>', '='], {
        speak: `Which sign goes in the box? ${a} box ${b}`,
        explanation: `${a} ${sign} ${b}. The open end always points at the bigger number.`,
      })
    }

    const count = difficulty >= 4 ? 5 : 4
    const values = rng.sample(
      Array.from({ length: max - 9 }, (_, i) => i + 10),
      count,
    )
    const ascending = rng.chance(0.5)
    const sorted = [...values].sort((x, y) => (ascending ? x - y : y - x))
    return order(
      rng,
      ascending ? 'Tap them from smallest to biggest' : 'Tap them from biggest to smallest',
      sorted,
      { explanation: `In order: ${sorted.join(', ')}` },
    )
  },
}

const oddEven: SkillDef = {
  id: 'ng.maths.number.odd-even',
  title: 'Odd and even',
  yearBand: 'b2',
  concepts: ['odd-even'],
  hint: 'Look at the last digit. 0, 2, 4, 6 and 8 mean even.',
  helpAtHome: 'Share sweets between two people — if they share exactly, the number is even.',
  generate: ({ rng, difficulty }): Item => {
    const max = [20, 50, 100, 500, 999][difficulty - 1]
    const variant = rng.int(1, 3)

    if (variant === 1) {
      const n = rng.int(1, max)
      const even = n % 2 === 0
      return mc(rng, `Is ${n} odd or even?`, even ? 'Even' : 'Odd', [even ? 'Odd' : 'Even'], {
        explanation: `${n} ends in ${n % 10}, so it is ${even ? 'even' : 'odd'}.`,
      })
    }

    if (variant === 2) {
      const wantEven = rng.chance(0.5)
      // Force a mix, or the child can sweep the board or tap nothing.
      const evens = Array.from({ length: Math.floor(max / 2) }, (_, i) => (i + 1) * 2)
      const odds = Array.from({ length: Math.ceil(max / 2) }, (_, i) => i * 2 + 1)
      const pool = rng.shuffle([...rng.sample(evens, 3), ...rng.sample(odds, 3)])
      return tapMany(
        rng,
        wantEven ? 'Tap all the EVEN numbers' : 'Tap all the ODD numbers',
        pool.map((v) => ({ value: v, correct: wantEven ? v % 2 === 0 : v % 2 === 1 })),
        { explanation: wantEven ? 'Even numbers end in 0, 2, 4, 6 or 8.' : 'Odd numbers end in 1, 3, 5, 7 or 9.' },
      )
    }

    const n = rng.int(2, max - 4)
    const even = n % 2 === 0
    const next = even ? n + 2 : n + 2
    return entry(
      `What is the next ${even ? 'even' : 'odd'} number after ${n}?`,
      next,
      { explanation: `${even ? 'Even' : 'Odd'} numbers jump in twos: ${n}, ${next}.` },
    )
  },
}

const skipCount: SkillDef = {
  id: 'ng.maths.number.skip-count',
  title: 'Skip counting',
  yearBand: 'b2',
  concepts: ['skip-counting'],
  hint: 'Work out the jump between two numbers, then keep jumping.',
  helpAtHome: 'Count in 2s, 5s and 10s while climbing stairs or clapping.',
  generate: ({ rng, difficulty }): Item => {
    const steps = [
      [2, 10],
      [2, 5, 10],
      [2, 3, 5, 10],
      [3, 4, 5, 10, 100],
      [3, 4, 6, 25, 50, 100],
    ][difficulty - 1]
    const step = rng.pick(steps)
    const start = step * rng.int(1, 6)
    const run = [0, 1, 2, 3, 4].map((i) => start + i * step)

    if (rng.chance(0.5)) {
      return entry(`Count in ${step}s. What comes next?\n${run.slice(0, 4).join(', ')}, ?`, run[4], {
        speak: `Count in ${step}s. What comes next after ${run.slice(0, 4).join(', ')}?`,
        explanation: `Each jump adds ${step}: ${run.join(', ')}`,
      })
    }

    const hole = rng.int(1, 3)
    const shown = run.map((v, i) => (i === hole ? '?' : String(v))).join(', ')
    return entry(`Counting in ${step}s — what is missing?\n${shown}`, run[hole], {
      speak: `Counting in ${step}s. What is missing? ${run.map((v, i) => (i === hole ? 'blank' : v)).join(', ')}`,
      explanation: `The pattern jumps by ${step}: ${run.join(', ')}`,
    })
  },
}

const roman: SkillDef = {
  id: 'ng.maths.number.roman',
  title: 'Roman numerals',
  yearBand: 'b3',
  prerequisites: ['ng.maths.number.count-200'],
  concepts: ['roman-numerals-basic'],
  hint: 'I is 1, V is 5, X is 10. A smaller letter before a bigger one means take it away.',
  helpAtHome: 'Look for Roman numerals on clock faces and in book chapters.',
  generate: ({ rng, difficulty }): Item => {
    const max = [5, 10, 12, 16, 20][difficulty - 1]
    const n = rng.int(1, max)
    const variant = rng.int(1, 3)

    if (variant === 1) {
      const wrongs = numericDistractors(rng, n, 3, { min: 1, max: 20 })
      return mc(rng, `What number is ${toRoman(n)}?`, n, wrongs, {
        speak: `What number is the Roman numeral ${toRoman(n).split('').join(' ')}?`,
        explanation: `${toRoman(n)} = ${n}`,
      })
    }

    if (variant === 2) {
      const wrongs = numericDistractors(rng, n, 3, { min: 1, max: 20 }).map(toRoman)
      return mc(rng, `How do we write ${n} in Roman numerals?`, toRoman(n), wrongs, {
        explanation: `${n} = ${toRoman(n)}`,
      })
    }

    const values = rng.sample(Array.from({ length: max }, (_, i) => i + 1), 4)
    const sorted = [...values].sort((a, b) => a - b)
    return order(rng, 'Put these Roman numerals in order, smallest first', sorted.map(toRoman), {
      explanation: sorted.map((v) => `${toRoman(v)}=${v}`).join(', '),
    })
  },
}

const ordinal: SkillDef = {
  id: 'ng.maths.number.ordinal',
  title: 'First, second, third',
  yearBand: 'b2',
  concepts: ['ordinal-numbers'],
  hint: 'Count along the line, starting at 1 for first.',
  helpAtHome: 'Ask who came first, second and third in races, queues and games.',
  generate: ({ rng, difficulty, locale }): Item => {
    const max = [5, 8, 10, 15, 20][difficulty - 1]
    const variant = rng.int(1, 3)

    if (variant === 1) {
      const people = rng.sample(locale.names, Math.min(5, max))
      const pos = rng.int(1, people.length)
      return mc(
        rng,
        `${people.join(', ')} are standing in a line.\nWho is ${ordinalWord(pos)}?`,
        people[pos - 1],
        people.filter((_, i) => i !== pos - 1),
        { explanation: `Counting from the start: ${people.map((p, i) => `${ordinalShort(i + 1)} ${p}`).join(', ')}.` },
      )
    }

    if (variant === 2) {
      const n = rng.int(1, max)
      return mc(rng, `Which one means ${ordinalShort(n)}?`, ordinalWord(n), [
        ordinalWord(Math.max(1, n - 1)),
        ordinalWord(Math.min(20, n + 1)),
        ordinalWord(Math.min(20, n + 2)),
      ])
    }

    const n = rng.int(2, max)
    return entry(`In a race, which position is "${ordinalWord(n)}"?`, n, {
      maxDigits: 2,
      explanation: `${ordinalWord(n)} means position ${n}.`,
    })
  },
}

export const numberStrand: StrandDef = {
  id: 'ng.maths.number',
  name: 'Number Island',
  blurb: 'Counting, place value and putting numbers in order',
  theme: 'market',
  // Ordered by year band: Basic 1 first, then 2/3, then 4-6. Level
  // progression down an island follows this order.
  skills: [
    ...earlyNumberSkills,
    countTo200,
    oddEven,
    skipCount,
    ordinal,
    countTo1000,
    placeValue,
    compareOrder,
    roman,
    ...upperNumberSkills,
  ],
}
