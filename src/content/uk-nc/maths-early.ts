/**
 * England National Curriculum — Year 1 and Year 2 maths.
 *
 * Written against the statutory programmes of study for mathematics, Key
 * Stage 1. Topic scope and the year each lands in come from that document;
 * every question is generated here.
 *
 *   Year 1  count to and across 100 · one more and one less · read and write
 *           numbers to 20 in words · add and subtract within 20 · halves and
 *           quarters of shapes and quantities · o'clock and half past ·
 *           recognise coins · common 2-D and 3-D shapes
 *   Year 2  place value to 100 · count in 2s, 3s, 5s and 10s · add and
 *           subtract within 100 · the 2, 5 and 10 tables · 1/3, 1/4, 2/4, 3/4
 *           · money and change · time to five minutes · shape properties ·
 *           simple statistics
 *
 * Deliberately not a translation of the Nigerian early years. Key Stage 1
 * expects number bonds within 20 rather than to 10, introduces quarters
 * alongside halves in Year 1, and counts in 3s in Year 2 — all earlier than
 * the UBE scheme does.
 */

import type { Item, SkillDef } from '../../engine/types'
import { entry, mc, order, tapMany, tf } from '../shared/authoring'
import { numberToWords } from '../shared/words'

/* ------------------------------------------------------------------ *
 * Year 1
 * ------------------------------------------------------------------ */

const countTo100: SkillDef = {
  id: 'uk.maths.y1.count-to-100',
  title: 'Counting to 100',
  yearBand: 'y1',
  concepts: ['counting'],
  hint: 'One more means the next number you say when counting.',
  helpAtHome: 'Count together up the stairs, then back down again.',
  generate: ({ rng, difficulty }): Item => {
    const top = [20, 30, 50, 80, 100][difficulty - 1]
    const n = rng.int(2, top - 1)

    if (rng.chance(0.4)) {
      const up = rng.chance(0.5)
      return entry(`What is one ${up ? 'more' : 'less'} than ${n}?`, up ? n + 1 : n - 1, {
        maxDigits: 3,
        explanation: `One ${up ? 'more' : 'less'} than ${n} is ${up ? n + 1 : n - 1}.`,
      })
    }

    if (rng.chance(0.5)) {
      const start = rng.int(1, Math.max(1, top - 4))
      return order(
        rng,
        'Put these numbers in order, smallest first.',
        [start, start + 1, start + 2, start + 3].map(String),
        { explanation: 'They come one after another when you count.' },
      )
    }

    const step = rng.pick([2, 5, 10])
    const start = step * rng.int(1, 4)
    return entry(`Carry on counting in ${step}s.\n${start}, ${start + step}, ${start + step * 2}, ?`, start + step * 3, {
      maxDigits: 3,
      explanation: `Keep adding ${step}: ${start + step * 2} + ${step} = ${start + step * 3}.`,
    })
  },
}

const numbersInWords: SkillDef = {
  id: 'uk.maths.y1.numbers-in-words',
  title: 'Number words to 20',
  yearBand: 'y1',
  concepts: ['number-words'],
  hint: 'Say the number out loud, then look for that word.',
  helpAtHome: 'Point out written numbers on doors and buses and read them together.',
  generate: ({ rng, difficulty }): Item => {
    const top = [10, 12, 15, 20, 20][difficulty - 1]
    const n = rng.int(1, top)
    const wrong = [n + 1, n - 1, n + 2].filter((v) => v >= 1 && v <= 20 && v !== n)

    if (rng.chance(0.5)) {
      return mc(rng, `Which word says ${n}?`, numberToWords(n), wrong.map(numberToWords), {
        explanation: `${n} is written "${numberToWords(n)}".`,
      })
    }
    return entry(`Write this as a number: ${numberToWords(n)}`, n, {
      maxDigits: 2,
      explanation: `"${numberToWords(n)}" is ${n}.`,
    })
  },
}

const addSubtractTo20: SkillDef = {
  id: 'uk.maths.y1.add-subtract-20',
  title: 'Adding and taking away to 20',
  yearBand: 'y1',
  concepts: ['addition', 'subtraction'],
  hint: 'Start with the bigger number and count on, or count back.',
  helpAtHome: 'Use fingers, buttons or pasta pieces. Seeing the objects matters at this age.',
  generate: ({ rng, difficulty }): Item => {
    const top = [10, 12, 15, 20, 20][difficulty - 1]

    if (rng.chance(0.45)) {
      const a = rng.int(1, top - 1)
      const b = rng.int(1, top - a)
      return entry(`${a} + ${b} = ?`, a + b, { maxDigits: 2, explanation: `${a} + ${b} = ${a + b}.` })
    }
    if (rng.chance(0.6)) {
      /* Subtraction never goes below zero. */
      const a = rng.int(2, top)
      const b = rng.int(1, a)
      return entry(`${a} − ${b} = ?`, a - b, { maxDigits: 2, explanation: `${a} − ${b} = ${a - b}.` })
    }
    /* Missing number, which is what number-bond fluency actually is. */
    const total = rng.int(5, top)
    const part = rng.int(1, total - 1)
    return entry(`${part} + ? = ${total}`, total - part, {
      maxDigits: 2,
      explanation: `${part} + ${total - part} = ${total}.`,
    })
  },
}

const halvesQuarters: SkillDef = {
  id: 'uk.maths.y1.halves-quarters',
  title: 'Halves and quarters',
  yearBand: 'y1',
  concepts: ['fractions'],
  hint: 'Half means two equal parts. A quarter means four equal parts.',
  helpAtHome: 'Cut toast into halves, then quarters, and say the words each time.',
  generate: ({ rng, difficulty }): Item => {
    const half = rng.chance(0.5)
    const parts = half ? 2 : 4
    /* Multiples only, so the answer is always a whole number of things. */
    const total = parts * rng.int(1, [3, 4, 5, 6, 8][difficulty - 1])
    const answer = total / parts

    if (rng.chance(0.6)) {
      return entry(`What is ${half ? 'half' : 'a quarter'} of ${total}?`, answer, {
        maxDigits: 2,
        explanation: `${total} shared into ${parts} equal parts is ${answer} each.`,
      })
    }
    /*
     * The statement has to be false sometimes. Built the obvious way — name
     * the fraction that matches the number of parts — it is true every single
     * time, and a child learns to answer True without reading it. The same
     * mistake was made once before in the Nigerian symmetry skill.
     */
    const claimHalf = rng.chance(0.5)
    const claimedParts = claimHalf ? 2 : 4
    return tf(
      `A shape is cut into ${parts} equal parts. One part is ${claimHalf ? 'a half' : 'a quarter'}.`,
      claimedParts === parts,
      {
        explanation:
          claimedParts === parts
            ? `${parts} equal parts means each one is ${claimHalf ? 'a half' : 'a quarter'}.`
            : `${parts} equal parts makes ${parts === 2 ? 'halves' : 'quarters'}, not ${claimHalf ? 'halves' : 'quarters'}.`,
      },
    )
  },
}

const timeOClock: SkillDef = {
  id: 'uk.maths.y1.time-oclock',
  title: "O'clock and half past",
  yearBand: 'y1',
  concepts: ['time'],
  hint: 'The long hand at the top is o’clock. Pointing down is half past.',
  helpAtHome: 'Say the time at meals and bedtime, using the same words each day.',
  generate: ({ rng }): Item => {
    const hour = rng.int(1, 12)
    const halfPast = rng.chance(0.5)
    const shown = halfPast ? `${hour}:30` : `${hour}:00`
    const answer = halfPast ? `half past ${hour}` : `${hour} o'clock`
    const wrong = halfPast
      ? [`${hour} o'clock`, `half past ${(hour % 12) + 1}`]
      : [`half past ${hour}`, `${(hour % 12) + 1} o'clock`]
    return mc(rng, `What time is this?\n${shown}`, answer, wrong, {
      explanation: `${shown} is ${answer}.`,
    })
  },
}

const coins: SkillDef = {
  id: 'uk.maths.y1.coins',
  title: 'Coins',
  yearBand: 'y1',
  concepts: ['money'],
  hint: 'Count the biggest coins first.',
  helpAtHome: 'Let them pay with real coins in a shop and count what is left.',
  generate: ({ rng, difficulty }): Item => {
    const pool = [1, 2, 5, 10, 20, 50].slice(0, [3, 4, 5, 6, 6][difficulty - 1])
    const coinsPicked = Array.from({ length: rng.int(2, 3) }, () => rng.pick(pool))
    const total = coinsPicked.reduce((a, b) => a + b, 0)
    return entry(`How much is this altogether?\n${coinsPicked.map((c) => `${c}p`).join(' + ')}`, total, {
      maxDigits: 3,
      suffix: 'p',
      explanation: `${coinsPicked.join(' + ')} = ${total}p.`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * Year 2
 * ------------------------------------------------------------------ */

const placeValueTo100: SkillDef = {
  id: 'uk.maths.y2.place-value-100',
  title: 'Tens and ones',
  yearBand: 'y2',
  prerequisites: ['uk.maths.y1.count-to-100'],
  concepts: ['place-value'],
  hint: 'The first digit counts the tens, the second counts the ones.',
  helpAtHome: 'Make numbers with straws in bundles of ten and loose ones.',
  generate: ({ rng }): Item => {
    /* Never a multiple of ten: "how many ones in 40" has answer zero, which
       makes every distractor collapse and the question pointless. */
    const tens = rng.int(1, 9)
    const ones = rng.int(1, 9)
    const n = tens * 10 + ones

    if (rng.chance(0.5)) {
      const askTens = rng.chance(0.5)
      return entry(`How many ${askTens ? 'tens' : 'ones'} are there in ${n}?`, askTens ? tens : ones, {
        maxDigits: 1,
        explanation: `${n} is ${tens} tens and ${ones} ones.`,
      })
    }
    return entry(`What number is ${tens} tens and ${ones} ones?`, n, {
      maxDigits: 2,
      explanation: `${tens} tens is ${tens * 10}, plus ${ones} makes ${n}.`,
    })
  },
}

const addSubtractTo100: SkillDef = {
  id: 'uk.maths.y2.add-subtract-100',
  title: 'Adding and taking away to 100',
  yearBand: 'y2',
  prerequisites: ['uk.maths.y1.add-subtract-20'],
  concepts: ['addition', 'subtraction'],
  hint: 'Add the tens first, then the ones.',
  helpAtHome: 'Ask for the answer, then ask how they worked it out. The method matters more.',
  generate: ({ rng, difficulty }): Item => {
    const top = [40, 60, 80, 99, 99][difficulty - 1]
    if (rng.chance(0.5)) {
      const a = rng.int(10, top)
      const b = rng.int(2, Math.max(2, Math.min(top, 99 - a)))
      return entry(`${a} + ${b} = ?`, a + b, { maxDigits: 3, explanation: `${a} + ${b} = ${a + b}.` })
    }
    const a = rng.int(20, top)
    const b = rng.int(2, a - 1)
    return entry(`${a} − ${b} = ?`, a - b, { maxDigits: 3, explanation: `${a} − ${b} = ${a - b}.` })
  },
}

const tables2510: SkillDef = {
  id: 'uk.maths.y2.tables-2-5-10',
  title: 'The 2, 5 and 10 times tables',
  yearBand: 'y2',
  concepts: ['times-tables'],
  hint: 'Counting in 2s, 5s or 10s gets you there.',
  helpAtHome: 'Chant one table on the way to school. Little and often is what works.',
  generate: ({ rng }): Item => {
    const a = rng.pick([2, 5, 10])
    const b = rng.int(1, 12)

    if (rng.chance(0.65)) {
      return entry(`${a} × ${b} = ?`, a * b, { maxDigits: 3, explanation: `${a} × ${b} = ${a * b}.` })
    }
    return entry(`${a * b} ÷ ${a} = ?`, b, {
      maxDigits: 2,
      explanation: `${a} × ${b} = ${a * b}, so ${a * b} ÷ ${a} = ${b}.`,
    })
  },
}

const countIn3s: SkillDef = {
  id: 'uk.maths.y2.count-in-3s',
  title: 'Counting in 3s',
  yearBand: 'y2',
  concepts: ['multiples'],
  hint: 'Keep adding 3 each time.',
  helpAtHome: 'Count in 3s while climbing stairs two at a time — it makes the pattern physical.',
  generate: ({ rng, difficulty }): Item => {
    const step = rng.pick([2, 3, 5, 10])
    const reach = [4, 6, 8, 10, 12][difficulty - 1]
    const correct = rng.shuffle(Array.from({ length: reach }, (_, i) => step * (i + 1))).slice(0, 3)
    const decoys: number[] = []
    while (decoys.length < 3) {
      const near = step * rng.int(1, reach) + rng.pick([-2, -1, 1, 2])
      if (near > 0 && near % step !== 0 && !decoys.includes(near)) decoys.push(near)
    }
    return tapMany(
      rng,
      `Tap every number you say when counting in ${step}s.`,
      [...correct, ...decoys].map((v) => ({ value: v, correct: v % step === 0 })),
      { explanation: `Multiples of ${step} divide exactly by ${step}.` },
    )
  },
}

const simpleFractions: SkillDef = {
  id: 'uk.maths.y2.fractions',
  title: 'Thirds and quarters',
  yearBand: 'y2',
  prerequisites: ['uk.maths.y1.halves-quarters'],
  concepts: ['fractions'],
  hint: 'The bottom number says how many equal parts there are.',
  helpAtHome: 'Share a bar of chocolate into thirds and quarters and compare the pieces.',
  generate: ({ rng, difficulty }): Item => {
    const denom = rng.pick([2, 3, 4])
    const numer = rng.int(1, denom - 1)
    const total = denom * rng.int(1, [3, 4, 5, 6, 8][difficulty - 1])

    if (rng.chance(0.55)) {
      const answer = (total / denom) * numer
      return entry(`What is ${numer}/${denom} of ${total}?`, answer, {
        maxDigits: 3,
        explanation: `${total} ÷ ${denom} = ${total / denom}, then × ${numer} = ${answer}.`,
      })
    }

    /* Proper fractions only — a fraction of one shape is never top-heavy. */
    const wrong = [
      { n: numer, d: denom + 1 },
      { n: numer + 1, d: denom },
      { n: numer - 1, d: denom },
    ]
      .filter((c) => c.n >= 1 && c.n < c.d && !(c.n === numer && c.d === denom))
      .map((c) => `${c.n}/${c.d}`)

    return mc(
      rng,
      `A shape is cut into ${denom} equal parts. ${numer} ${numer === 1 ? 'part is' : 'parts are'} coloured.\nWhat fraction is coloured?`,
      `${numer}/${denom}`,
      wrong,
      { explanation: `${numer} out of ${denom} equal parts is ${numer}/${denom}.` },
    )
  },
}

const moneyChange: SkillDef = {
  id: 'uk.maths.y2.money-change',
  title: 'Money and change',
  yearBand: 'y2',
  prerequisites: ['uk.maths.y1.coins'],
  concepts: ['money-change'],
  hint: 'Count on from the price up to what you paid.',
  helpAtHome: 'Let them work out the change before the till does.',
  generate: ({ rng, locale }): Item => {
    const who = rng.pick(locale.names)
    const noun = rng.pick(locale.objects)
    const paid = rng.pick([20, 50, 100])
    const cost = rng.int(5, paid - 5)

    if (rng.chance(0.5)) {
      return entry(
        `${who} buys a ${noun.one} for ${cost}p and pays with ${paid}p.\nHow much change?`,
        paid - cost,
        { maxDigits: 3, suffix: 'p', explanation: `${paid} − ${cost} = ${paid - cost}p.` },
      )
    }
    const a = rng.int(5, 40)
    const b = rng.int(5, 40)
    return entry(`A ${noun.one} costs ${a}p and a drink costs ${b}p.\nHow much altogether?`, a + b, {
      maxDigits: 3,
      suffix: 'p',
      explanation: `${a} + ${b} = ${a + b}p.`,
    })
  },
}

const shapeProperties: SkillDef = {
  id: 'uk.maths.y2.shape-properties',
  title: 'Sides and corners',
  yearBand: 'y2',
  concepts: ['shape-properties'],
  hint: 'Count the straight edges, then the corners.',
  helpAtHome: 'Hunt for shapes around the house and count their sides together.',
  generate: ({ rng }): Item => {
    const flat: [string, number][] = [
      ['triangle', 3],
      ['square', 4],
      ['rectangle', 4],
      ['pentagon', 5],
      ['hexagon', 6],
    ]
    const solid: [string, number][] = [
      ['cube', 6],
      ['cuboid', 6],
      ['square-based pyramid', 5],
    ]

    if (rng.chance(0.6)) {
      const [shape, sides] = rng.pick(flat)
      return mc(rng, `How many sides does a ${shape} have?`, sides, [sides + 1, sides - 1, sides + 2].filter((v) => v > 2 && v !== sides), {
        explanation: `A ${shape} has ${sides} sides.`,
      })
    }
    const [shape, faces] = rng.pick(solid)
    return mc(rng, `How many faces does a ${shape} have?`, faces, [faces + 1, faces - 1, faces + 2].filter((v) => v > 3 && v !== faces), {
      explanation: `A ${shape} has ${faces} faces.`,
    })
  },
}

export const ukY1Number: SkillDef[] = [countTo100, numbersInWords]
export const ukY1Calculation: SkillDef[] = [addSubtractTo20]
export const ukY1Fractions: SkillDef[] = [halvesQuarters]
export const ukY1Measurement: SkillDef[] = [timeOClock, coins]

export const ukY2Number: SkillDef[] = [placeValueTo100, countIn3s]
export const ukY2Calculation: SkillDef[] = [addSubtractTo100, tables2510]
export const ukY2Fractions: SkillDef[] = [simpleFractions]
export const ukY2Measurement: SkillDef[] = [moneyChange]
export const ukY2Geometry: SkillDef[] = [shapeProperties]
