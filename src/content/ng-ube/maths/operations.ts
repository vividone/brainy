/** Basic Operations — add, subtract, multiply, share. */

import { numericDistractors, type Rng } from '../../../engine/rng'
import type { Item, SkillDef, StrandDef } from '../../../engine/types'
import { entry, mc, person, sayMaths, thing, twoPeople } from '../../shared/authoring'

/** Two 2-digit addends, with or without a carry in the units column. */
function addPair2(rng: Rng, regroup: boolean, secondIsSingle = false): [number, number] {
  for (let i = 0; i < 200; i++) {
    const aTens = rng.int(1, secondIsSingle ? 8 : 4)
    const aOnes = rng.int(regroup ? 3 : 0, 9)
    const bTens = secondIsSingle ? 0 : rng.int(1, 4)
    const bOnes = regroup ? rng.int(10 - aOnes, 9) : rng.int(0, 9 - aOnes)
    const a = aTens * 10 + aOnes
    const b = bTens * 10 + bOnes
    if (b === 0) continue
    if (regroup === aOnes + bOnes >= 10 && a + b <= 99) return [a, b]
  }
  return regroup ? [27, 18] : [23, 15]
}

/** Two 3-digit addends. `carries` = how many columns must regroup. */
function addPair3(rng: Rng, carries: number): [number, number] {
  for (let i = 0; i < 300; i++) {
    const a = rng.int(100, 799)
    const b = rng.int(100, 999 - a > 100 ? 999 - a : 199)
    if (a + b > 999) continue
    const onesCarry = (a % 10) + (b % 10) >= 10 ? 1 : 0
    const tensCarry = (Math.floor(a / 10) % 10) + (Math.floor(b / 10) % 10) + onesCarry >= 10 ? 1 : 0
    if (onesCarry + tensCarry === carries) return [a, b]
  }
  return carries === 0 ? [123, 245] : [168, 275]
}

function subPair(rng: Rng, digits: 2 | 3, borrow: boolean): [number, number] {
  const min = digits === 2 ? 21 : 120
  const max = digits === 2 ? 99 : 999
  for (let i = 0; i < 300; i++) {
    const a = rng.int(min, max)
    const b = rng.int(digits === 2 ? 2 : 20, a - 1)
    const needsBorrow = a % 10 < b % 10
    if (needsBorrow === borrow) return [a, b]
  }
  return borrow ? [52, 27] : [58, 23]
}

const add2Digit: SkillDef = {
  id: 'ng.maths.ops.add-2digit',
  title: 'Adding to 99',
  yearBand: 'b2',
  concepts: ['add-2-digit'],
  hint: 'Add the units first. If you get 10 or more, carry one ten across.',
  helpAtHome: 'Add up small shopping totals together before you reach the till.',
  generate: ({ rng, difficulty }): Item => {
    if (difficulty === 5 && rng.chance(0.4)) {
      const parts = [rng.int(10, 30), rng.int(10, 30), rng.int(5, 20)]
      const sum = parts.reduce((x, y) => x + y, 0)
      const text = parts.join(' + ')
      return entry(`${text} = ?`, sum, { speak: sayMaths(text), explanation: `${text} = ${sum}` })
    }
    const regroup = difficulty >= 3
    const [a, b] = addPair2(rng, regroup, difficulty <= 1 || (difficulty === 3 && rng.chance(0.5)))
    const text = `${a} + ${b}`
    return entry(`${text} = ?`, a + b, {
      speak: sayMaths(text),
      explanation: regroup
        ? `${a % 10} + ${b % 10} = ${(a % 10) + (b % 10)}, so write ${((a % 10) + (b % 10)) % 10} and carry 1. Answer: ${a + b}.`
        : `${a} + ${b} = ${a + b}`,
    })
  },
}

const sub2Digit: SkillDef = {
  id: 'ng.maths.ops.sub-2digit',
  title: 'Taking away to 99',
  yearBand: 'b2',
  prerequisites: ['ng.maths.ops.add-2digit'],
  concepts: ['subtract-2-digit'],
  hint: 'If the top unit is too small, borrow one ten from next door.',
  helpAtHome: 'Ask "how much change?" when paying with a round amount.',
  generate: ({ rng, difficulty }): Item => {
    const borrow = difficulty >= 3
    const [a, b] = subPair(rng, 2, borrow)
    const text = `${a} − ${b}`
    return entry(`${text} = ?`, a - b, {
      speak: sayMaths(`${a} minus ${b}`),
      explanation: borrow
        ? `${a % 10} is smaller than ${b % 10}, so borrow a ten. ${a} − ${b} = ${a - b}.`
        : `${a} − ${b} = ${a - b}`,
    })
  },
}

const repeatedAddition: SkillDef = {
  id: 'ng.maths.ops.repeated-addition',
  title: 'Groups and repeated adding',
  yearBand: 'b2',
  concepts: ['multiplication-as-repeated-addition'],
  hint: 'Count how many groups there are, then how many are in each group.',
  helpAtHome: 'Lay out spoons in equal rows and count them in groups.',
  generate: ({ rng, difficulty, locale }): Item => {
    const noun = thing(rng, locale)
    const groups = rng.int(2, 2 + difficulty)
    const per = rng.int(2, 2 + difficulty)
    const total = groups * per

    if (rng.chance(0.5)) {
      return entry(`How many ${noun.many} altogether?`, total, {
        visual: { kind: 'groups', glyph: noun.glyph, groups, per },
        explanation: `${groups} groups of ${per} = ${Array(groups).fill(per).join(' + ')} = ${total}`,
      })
    }

    const text = Array(groups).fill(per).join(' + ')
    return mc(
      rng,
      `Which multiplication means the same as\n${text}?`,
      `${groups} × ${per}`,
      [`${groups} + ${per}`, `${per} × ${per}`, `${groups} × ${groups}`],
      { speak: sayMaths(`Which multiplication means the same as ${text}?`), explanation: `${groups} lots of ${per} is ${groups} × ${per} = ${total}.` },
    )
  },
}

const add3Digit: SkillDef = {
  id: 'ng.maths.ops.add-3digit',
  title: 'Adding big numbers',
  yearBand: 'b3',
  prerequisites: ['ng.maths.ops.add-2digit'],
  concepts: ['add-3-digit'],
  hint: 'Line up hundreds, tens and units. Start from the units.',
  helpAtHome: 'Add two prices from a receipt on paper, in columns.',
  generate: ({ rng, difficulty }): Item => {
    const carries = difficulty <= 1 ? 0 : difficulty <= 3 ? 1 : 2
    const [a, b] = addPair3(rng, carries)
    const text = `${a} + ${b}`
    return entry(`${text} = ?`, a + b, {
      speak: sayMaths(text),
      explanation: `${a} + ${b} = ${a + b}. Units first, then tens, then hundreds.`,
      maxDigits: 4,
    })
  },
}

const sub3Digit: SkillDef = {
  id: 'ng.maths.ops.sub-3digit',
  title: 'Taking away big numbers',
  yearBand: 'b3',
  prerequisites: ['ng.maths.ops.add-3digit', 'ng.maths.ops.sub-2digit'],
  concepts: ['subtract-3-digit'],
  hint: 'Start with the units. Borrow from the tens if you need to.',
  helpAtHome: 'Work out how many days until a birthday, or pages left in a book.',
  generate: ({ rng, difficulty }): Item => {
    const borrow = difficulty >= 3
    const [a, b] = subPair(rng, 3, borrow)
    const text = `${a} − ${b}`
    return entry(`${text} = ?`, a - b, {
      speak: sayMaths(`${a} minus ${b}`),
      explanation: `${a} − ${b} = ${a - b}`,
      maxDigits: 3,
    })
  },
}

const timesTables: SkillDef = {
  id: 'ng.maths.ops.times-tables',
  title: 'Times tables',
  yearBand: 'b3',
  prerequisites: ['ng.maths.ops.repeated-addition'],
  concepts: ['times-tables'],
  hint: 'Say the table out loud from the start: 3, 6, 9, 12…',
  helpAtHome: 'Chant one table a week in the car. Two minutes a day beats an hour on Sunday.',
  generate: ({ rng, difficulty }): Item => {
    const tables = [
      [2, 10],
      [2, 5, 10],
      [2, 3, 5, 10],
      [2, 3, 4, 5, 10],
      [2, 3, 4, 5, 6, 10],
    ][difficulty - 1]
    const a = rng.pick(tables)
    const b = rng.int(1, difficulty >= 4 ? 12 : 10)
    const product = a * b

    if (difficulty >= 3 && rng.chance(0.3)) {
      // Inverse: fill the missing factor.
      return entry(`${a} × ☐ = ${product}`, b, {
        speak: sayMaths(`${a} times what equals ${product}`),
        explanation: `${a} × ${b} = ${product}`,
      })
    }

    if (rng.chance(0.35)) {
      return mc(
        rng,
        `${a} × ${b} = ?`,
        product,
        numericDistractors(rng, product, 3, { min: 1, max: 150, near: [product + a, product - a, a + b] }),
        { speak: sayMaths(`${a} times ${b}`), explanation: `${a} × ${b} = ${product}` },
      )
    }

    return entry(`${a} × ${b} = ?`, product, {
      speak: sayMaths(`${a} times ${b}`),
      explanation: `${a} × ${b} = ${product}`,
      visual: difficulty <= 2 ? { kind: 'array', rows: a, cols: b, glyph: '🔵' } : undefined,
    })
  },
}

const divisionSharing: SkillDef = {
  id: 'ng.maths.ops.division-sharing',
  title: 'Sharing equally',
  yearBand: 'b3',
  prerequisites: ['ng.maths.ops.times-tables'],
  concepts: ['division-sharing'],
  hint: 'Share them out one at a time, like dealing cards.',
  helpAtHome: 'Share fruit or biscuits equally between the family and count each share.',
  generate: ({ rng, difficulty, locale }): Item => {
    const divisor = rng.pick([[2], [2, 5], [2, 3, 5], [2, 3, 4, 5], [2, 3, 4, 5, 6, 10]][difficulty - 1])
    const quotient = rng.int(2, difficulty >= 4 ? 12 : 8)
    const total = divisor * quotient

    if (difficulty <= 2 && rng.chance(0.6)) {
      const noun = thing(rng, locale)
      const name = person(rng, locale)
      return entry(
        `${name} shares ${total} ${noun.many} equally between ${divisor} friends.\nHow many does each friend get?`,
        quotient,
        {
          visual: { kind: 'objects', glyph: noun.glyph, count: total, perRow: 5 },
          explanation: `${total} shared into ${divisor} equal groups gives ${quotient} each.`,
        },
      )
    }

    if (rng.chance(0.4)) {
      const [a, b] = twoPeople(rng, locale)
      const noun = thing(rng, locale)
      return entry(
        `${a} and ${b} are sharing with ${divisor - 2 > 0 ? `${divisor - 2} other friend${divisor - 2 === 1 ? '' : 's'}` : 'nobody else'}.\nThey share ${total} ${noun.many} equally between ${divisor}. How many each?`,
        quotient,
        { explanation: `${total} ÷ ${divisor} = ${quotient}` },
      )
    }

    return entry(`${total} ÷ ${divisor} = ?`, quotient, {
      speak: sayMaths(`${total} divided by ${divisor}`),
      explanation: `${divisor} × ${quotient} = ${total}, so ${total} ÷ ${divisor} = ${quotient}.`,
    })
  },
}

const missingNumber: SkillDef = {
  id: 'ng.maths.ops.missing-number',
  title: 'Missing number puzzles',
  yearBand: 'b3',
  prerequisites: ['ng.maths.ops.add-3digit'],
  concepts: ['open-sentences'],
  hint: 'Work backwards. Use the opposite operation to undo it.',
  helpAtHome: 'Play "I am thinking of a number" — add 7 and I get 15. What was it?',
  generate: ({ rng, difficulty }): Item => {
    const max = [10, 20, 50, 100, 500][difficulty - 1]
    const kind = rng.int(1, difficulty >= 3 ? 4 : 2)

    if (kind === 1) {
      const missing = rng.int(1, max)
      const other = rng.int(1, max)
      return entry(`☐ + ${other} = ${missing + other}`, missing, {
        speak: sayMaths(`What plus ${other} equals ${missing + other}?`),
        explanation: `${missing + other} − ${other} = ${missing}`,
      })
    }

    if (kind === 2) {
      const start = rng.int(Math.floor(max / 2), max)
      const missing = rng.int(1, start - 1)
      return entry(`${start} − ☐ = ${start - missing}`, missing, {
        speak: sayMaths(`${start} minus what equals ${start - missing}?`),
        explanation: `${start} − ${start - missing} = ${missing}`,
      })
    }

    if (kind === 3) {
      const a = rng.pick([2, 3, 4, 5, 10])
      const b = rng.int(2, 10)
      return entry(`☐ × ${a} = ${a * b}`, b, {
        speak: sayMaths(`What times ${a} equals ${a * b}?`),
        explanation: `${a * b} ÷ ${a} = ${b}`,
      })
    }

    const a = rng.int(10, max)
    const b = rng.int(10, max)
    return entry(`${a} + ${b} = ☐ + ${b}`, a, {
      speak: sayMaths(`${a} plus ${b} equals what plus ${b}?`),
      explanation: `Both sides add ${b}, so the box must be ${a}.`,
    })
  },
}

const wordProblems: SkillDef = {
  id: 'ng.maths.ops.word-problems',
  title: 'Story problems',
  yearBand: 'b3',
  prerequisites: ['ng.maths.ops.add-3digit', 'ng.maths.ops.sub-3digit', 'ng.maths.ops.times-tables'],
  concepts: ['word-problems-mixed'],
  hint: 'Read it twice. Are you putting things together or taking them away?',
  helpAtHome: 'Make up story problems about your own day — journeys, shopping, sharing.',
  generate: ({ rng, difficulty, locale }): Item => {
    const [a, b] = twoPeople(rng, locale)
    const noun = thing(rng, locale)
    const scale = [10, 20, 50, 200, 400][difficulty - 1]
    const kind = rng.int(1, difficulty >= 3 ? 5 : 3)

    if (kind === 1) {
      const x = rng.int(5, scale)
      const y = rng.int(5, scale)
      return entry(
        `${a} has ${x} ${noun.many} and ${b} has ${y} ${noun.many}.\nHow many do they have altogether?`,
        x + y,
        { explanation: `${x} + ${y} = ${x + y}` },
      )
    }

    if (kind === 2) {
      const x = rng.int(10, scale)
      const y = rng.int(1, x - 1)
      return entry(`${a} had ${x} ${noun.many} and gave away ${y}.\nHow many are left?`, x - y, {
        explanation: `${x} − ${y} = ${x - y}`,
      })
    }

    if (kind === 3) {
      const x = rng.int(10, scale)
      const y = rng.int(1, Math.max(1, Math.floor(x / 2)))
      return entry(
        `${a} has ${x} ${noun.many}. ${b} has ${y} fewer than ${a}.\nHow many does ${b} have?`,
        x - y,
        { explanation: `${x} − ${y} = ${x - y}` },
      )
    }

    if (kind === 4) {
      const groups = rng.int(2, 6)
      const per = rng.int(2, 10)
      return entry(
        `There are ${groups} baskets. Each basket holds ${per} ${noun.many}.\nHow many ${noun.many} altogether?`,
        groups * per,
        { explanation: `${groups} × ${per} = ${groups * per}` },
      )
    }

    const per = rng.int(2, 6)
    const groups = rng.int(2, 8)
    return entry(
      `${a} shares ${per * groups} ${noun.many} equally into ${groups} bags.\nHow many in each bag?`,
      per,
      { explanation: `${per * groups} ÷ ${groups} = ${per}` },
    )
  },
}

export const operationsStrand: StrandDef = {
  id: 'ng.maths.ops',
  name: 'Operation Falls',
  blurb: 'Adding, taking away, times tables and sharing',
  theme: 'falls',
  skills: [
    add2Digit,
    sub2Digit,
    repeatedAddition,
    add3Digit,
    sub3Digit,
    timesTables,
    divisionSharing,
    missingNumber,
    wordProblems,
  ],
}
