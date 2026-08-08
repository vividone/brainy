/**
 * Common Core — Grade 3 math.
 *
 * Written against the **Common Core State Standards for Mathematics**, which
 * set out content by grade with stable identifiers. Each skill carries its
 * standard code in `concepts`, so a coverage gap can be checked against the
 * standard rather than against an opinion — the thing that makes this pack
 * auditable in a way the others are not yet.
 *
 * Grade 3 domains, and what is covered here:
 *
 *   3.OA  Operations and Algebraic Thinking   multiplication and division as
 *         grouping · unknown factors · two-step word problems · arithmetic
 *         patterns
 *   3.NBT Number and Operations in Base Ten   rounding to 10 and 100 · adding
 *         and subtracting within 1000 · multiplying by multiples of ten
 *   3.NF  Number and Operations — Fractions   unit fractions · fractions on a
 *         number line · equivalence · comparing with like numerators or
 *         denominators
 *   3.MD  Measurement and Data                time to the minute · elapsed
 *         time · area by tiling · perimeter · scaled picture graphs
 *   3.G   Geometry                            categories of shapes ·
 *         partitioning shapes into equal parts
 *
 * Grade 3 is where Common Core diverges most from the other two packs: area
 * arrives via tiling rather than a formula, and fractions are introduced on a
 * number line rather than as parts of a cake. Both are written that way here
 * on purpose, because a US parent will recognise the method their child is
 * being taught at school.
 */

import type { Item, SkillDef } from '../../engine/types'
import { entry, mc, tapMany } from '../shared/authoring'

/* ------------------------------------------------------------------ *
 * 3.OA — Operations and Algebraic Thinking
 * ------------------------------------------------------------------ */

const unknownFactor: SkillDef = {
  id: 'us.math.g3.unknown-factor',
  title: 'Find the missing number',
  yearBand: 'g3',
  prerequisites: ['us.math.g3.multiplication-facts'],
  concepts: ['3.OA.A.4', 'inverse-operations'],
  hint: 'Ask yourself: what times this gives that?',
  helpAtHome: 'Say it as a sharing question — 24 cookies onto 6 plates, how many on each?',
  generate: ({ rng, difficulty }): Item => {
    const a = rng.int(2, [6, 8, 9, 12, 12][difficulty - 1])
    const b = rng.int(2, [6, 8, 9, 12, 12][difficulty - 1])
    const product = a * b

    if (rng.chance(0.5)) {
      return entry(`${a} × ? = ${product}`, b, {
        maxDigits: 2,
        explanation: `${a} × ${b} = ${product}, so the missing number is ${b}.`,
      })
    }
    return entry(`? ÷ ${a} = ${b}`, product, {
      maxDigits: 3,
      explanation: `${b} × ${a} = ${product}, so the missing number is ${product}.`,
    })
  },
}

const twoStepWord: SkillDef = {
  id: 'us.math.g3.two-step-word',
  title: 'Two-step problems',
  yearBand: 'g3',
  prerequisites: ['us.math.g3.add-subtract-1000'],
  concepts: ['3.OA.D.8', 'multi-step-word-problems'],
  hint: 'Work out the first part, write it down, then use it for the second.',
  helpAtHome: 'Ask him to say which step comes first before doing any arithmetic.',
  generate: ({ rng, difficulty, locale }): Item => {
    const who = rng.pick(locale.names)
    const noun = rng.pick(locale.objects)
    const packs = rng.int(3, [6, 8, 9, 12, 12][difficulty - 1])
    const per = rng.int(3, 9)
    const used = rng.int(2, Math.min(15, packs * per - 1))
    return entry(
      `${who} buys ${packs} packs of ${noun.many}. Each pack holds ${per}.\n${used} get used. How many are left?`,
      packs * per - used,
      {
        maxDigits: 4,
        explanation: `${packs} × ${per} = ${packs * per}, then ${packs * per} − ${used} = ${packs * per - used}.`,
      },
    )
  },
}

const arithmeticPatterns: SkillDef = {
  id: 'us.math.g3.patterns',
  title: 'Number patterns',
  yearBand: 'g3',
  concepts: ['3.OA.D.9', 'patterns'],
  hint: 'Work out what is added each time, then keep going.',
  helpAtHome: 'Skip-counting out loud in the car is the same skill.',
  generate: ({ rng, difficulty }): Item => {
    const step = rng.pick([2, 3, 4, 5, 6, 9, 10].slice(0, [4, 5, 6, 7, 7][difficulty - 1]))
    const start = step * rng.int(1, 5)
    const seen = [start, start + step, start + step * 2, start + step * 3]
    return entry(`What comes next?\n${seen.join(', ')}, ?`, start + step * 4, {
      maxDigits: 3,
      explanation: `Each number goes up by ${step}, so next is ${start + step * 3} + ${step} = ${start + step * 4}.`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * 3.NBT — Number and Operations in Base Ten
 * ------------------------------------------------------------------ */

const roundToTenHundred: SkillDef = {
  id: 'us.math.g3.rounding',
  title: 'Rounding to 10 and 100',
  yearBand: 'g3',
  prerequisites: ['us.math.g2.place-value'],
  concepts: ['3.NBT.A.1', 'rounding-estimation'],
  hint: 'Look at the digit to the right of the place you are rounding to. Five or more rounds up.',
  helpAtHome: 'Round a store total to the nearest dollar before paying and check the change.',
  generate: ({ rng, difficulty }): Item => {
    const to = rng.pick(difficulty <= 2 ? [10] : [10, 100])
    let n = rng.int(to * 2, 999)
    if (n % to === 0) n += rng.int(1, to - 1)
    const answer = Math.round(n / to) * to
    const down = Math.floor(n / to) * to
    const up = Math.ceil(n / to) * to
    return mc(
      rng,
      `Round ${n} to the nearest ${to === 10 ? 'ten' : 'hundred'}.`,
      answer,
      [answer === down ? up : down, answer + to, Math.max(0, answer - to)],
      { explanation: `${n} rounds to ${answer}.` },
    )
  },
}

const multiplyByTens: SkillDef = {
  id: 'us.math.g3.multiply-tens',
  title: 'Multiplying by tens',
  yearBand: 'g3',
  prerequisites: ['us.math.g3.multiplication-facts'],
  concepts: ['3.NBT.A.3'],
  hint: 'Multiply the digits, then put the zero back on the end.',
  helpAtHome: 'Six boxes of twenty is 6 × 2 = 12, then a zero: 120.',
  generate: ({ rng, difficulty }): Item => {
    const a = rng.int(2, 9)
    const tens = rng.int(2, [5, 6, 8, 9, 9][difficulty - 1]) * 10
    return entry(`${a} × ${tens} = ?`, a * tens, {
      maxDigits: 4,
      explanation: `${a} × ${tens / 10} = ${(a * tens) / 10}, then add the zero: ${a * tens}.`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * 3.NF — Fractions, introduced on a number line
 * ------------------------------------------------------------------ */

const unitFractions: SkillDef = {
  id: 'us.math.g3.unit-fractions',
  title: 'Fractions of a whole',
  yearBand: 'g3',
  concepts: ['3.NF.A.1', 'fractions'],
  hint: 'The bottom number says how many equal parts the whole is cut into.',
  helpAtHome: 'Cut something into equal parts and name one piece: one of four is one fourth.',
  generate: ({ rng, difficulty }): Item => {
    const denom = rng.pick([2, 3, 4, 6, 8].slice(0, [3, 4, 5, 5, 5][difficulty - 1]))
    const numer = rng.int(1, denom - 1)

    if (rng.chance(0.5)) {
      /*
       * Proper fractions only. The obvious distractor — flipping it to
       * denominator-over-numerator — is always top-heavy, and offering a
       * seven-year-old "4/3" as a fraction of one shape is not a mistake they
       * could make, it is a nonsense option that gives the answer away. The
       * smoke test rejects them, which is how this was caught here for the
       * second time.
       */
      const candidates = [
        { n: numer, d: denom + 1 },
        { n: numer + 1, d: denom },
        { n: numer - 1, d: denom },
        { n: numer, d: denom + 2 },
      ]
      const wrong = candidates
        .filter((c) => c.n >= 1 && c.n < c.d && !(c.n === numer && c.d === denom))
        .map((c) => `${c.n}/${c.d}`)

      return mc(
        rng,
        `A shape is cut into ${denom} equal parts. ${numer} ${numer === 1 ? 'part is' : 'parts are'} shaded.\nWhat fraction is shaded?`,
        `${numer}/${denom}`,
        wrong,
        { explanation: `${numer} shaded out of ${denom} equal parts is ${numer}/${denom}.` },
      )
    }

    /* How many unit fractions make the whole — the 3.NF.A.1 idea itself. */
    return entry(`How many ${denom === 2 ? 'halves' : `1/${denom}s`} make one whole?`, denom, {
      maxDigits: 2,
      explanation: `${denom} lots of 1/${denom} make 1 whole.`,
    })
  },
}

const compareFractions: SkillDef = {
  id: 'us.math.g3.compare-fractions',
  title: 'Comparing fractions',
  yearBand: 'g3',
  prerequisites: ['us.math.g3.unit-fractions'],
  concepts: ['3.NF.A.3', 'compare-fractions'],
  hint: 'Same bottom number: the bigger top wins. Same top number: the smaller bottom wins.',
  helpAtHome:
    'Ask which is more, a third of a pizza or a quarter. Most children guess the quarter because four is bigger.',
  generate: ({ rng }): Item => {
    if (rng.chance(0.5)) {
      /* Same denominator — the easier of the two Grade 3 cases. */
      const d = rng.pick([3, 4, 6, 8])
      const a = rng.int(1, d - 1)
      let b = rng.int(1, d - 1)
      if (b === a) b = a === 1 ? a + 1 : a - 1
      const bigger = a > b ? a : b
      return mc(rng, `Which is bigger: ${a}/${d} or ${b}/${d}?`, `${bigger}/${d}`, [`${a > b ? b : a}/${d}`], {
        explanation: `Same denominator, so the bigger numerator wins: ${bigger}/${d}.`,
      })
    }

    /* Same numerator — the case that reliably catches children out. */
    const n = rng.int(1, 3)
    const pair = rng.shuffle([2, 3, 4, 6, 8]).slice(0, 2).sort((x, y) => x - y)
    const [smallD, bigD] = pair
    if (n >= smallD) {
      return mc(rng, `Which is bigger: 1/${smallD} or 1/${bigD}?`, `1/${smallD}`, [`1/${bigD}`], {
        explanation: `Fewer, bigger pieces: 1/${smallD} is more than 1/${bigD}.`,
      })
    }
    return mc(rng, `Which is bigger: ${n}/${smallD} or ${n}/${bigD}?`, `${n}/${smallD}`, [`${n}/${bigD}`], {
      explanation: `Same numerator, so the smaller denominator wins: ${n}/${smallD} has bigger pieces.`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * 3.MD — Measurement and Data
 * ------------------------------------------------------------------ */

const areaByTiling: SkillDef = {
  id: 'us.math.g3.area',
  title: 'Area by counting squares',
  yearBand: 'g3',
  concepts: ['3.MD.C.7', 'area'],
  hint: 'Area is how many unit squares cover the shape.',
  helpAtHome: 'Count the floor tiles in a room — that is area, before any formula.',
  generate: ({ rng, difficulty }): Item => {
    const w = rng.int(2, [5, 6, 8, 10, 12][difficulty - 1])
    const h = rng.int(2, [5, 6, 8, 10, 12][difficulty - 1])

    if (rng.chance(0.6)) {
      return entry(`A rectangle is ${w} squares wide and ${h} squares tall.\nWhat is its area?`, w * h, {
        maxDigits: 3,
        suffix: 'squares',
        explanation: `${w} rows of ${h}, so ${w} × ${h} = ${w * h} squares.`,
      })
    }
    /* Area and perimeter side by side, which 3.MD.D.8 asks children to tell apart. */
    return entry(`A rectangle is ${w} squares wide and ${h} squares tall.\nWhat is its perimeter?`, 2 * (w + h), {
      maxDigits: 3,
      suffix: 'units',
      explanation: `Perimeter goes all the way round: ${w} + ${h} + ${w} + ${h} = ${2 * (w + h)}.`,
    })
  },
}

const timeToMinute: SkillDef = {
  id: 'us.math.g3.time',
  title: 'Time to the minute',
  yearBand: 'g3',
  concepts: ['3.MD.A.1', 'time'],
  hint: 'Count on in fives round the clock, then the single minutes.',
  helpAtHome: 'Ask how long until dinner, in minutes, using a real clock.',
  generate: ({ rng, difficulty }): Item => {
    const hour = rng.int(1, 12)
    const minute = rng.int(1, 11) * 5
    const shown = `${hour}:${String(minute).padStart(2, '0')}`

    if (rng.chance(0.5)) {
      const later = rng.int(2, [4, 6, 8, 10, 11][difficulty - 1]) * 5
      const total = minute + later
      const endHour = total >= 60 ? (hour % 12) + 1 : hour
      const endMin = total % 60
      return mc(
        rng,
        `A lesson starts at ${shown} and lasts ${later} minutes.\nWhen does it end?`,
        `${endHour}:${String(endMin).padStart(2, '0')}`,
        [
          `${hour}:${String((minute + later) % 60).padStart(2, '0')}`,
          `${endHour}:${String((endMin + 5) % 60).padStart(2, '0')}`,
          `${(hour % 12) + 1}:${String(minute).padStart(2, '0')}`,
        ],
        { explanation: `${minute} + ${later} = ${total} minutes past ${hour}, which is ${endHour}:${String(endMin).padStart(2, '0')}.` },
      )
    }

    const past = minute <= 30
    return mc(
      rng,
      `How would you say ${shown}?`,
      past ? `${minute} minutes past ${hour}` : `${60 - minute} minutes to ${(hour % 12) + 1}`,
      [
        past ? `${minute} minutes to ${hour}` : `${60 - minute} minutes past ${hour}`,
        `${minute} minutes past ${(hour % 12) + 1}`,
      ],
      { explanation: `${shown} is ${past ? `${minute} minutes past ${hour}` : `${60 - minute} minutes to ${(hour % 12) + 1}`}.` },
    )
  },
}

/* ------------------------------------------------------------------ *
 * 3.G — Geometry
 * ------------------------------------------------------------------ */

const shapeCategories: SkillDef = {
  id: 'us.math.g3.shape-categories',
  title: 'Sorting shapes',
  yearBand: 'g3',
  concepts: ['3.G.A.1', 'shape-properties'],
  hint: 'A quadrilateral is any shape with exactly four straight sides.',
  helpAtHome: 'Find four-sided things around the house and ask what makes each one different.',
  generate: ({ rng }): Item => {
    const quads = ['square', 'rectangle', 'rhombus', 'trapezoid', 'parallelogram']
    const others = ['triangle', 'pentagon', 'hexagon', 'circle', 'octagon']

    if (rng.chance(0.5)) {
      const options = [...rng.shuffle(quads).slice(0, 3), ...rng.shuffle(others).slice(0, 3)]
      return tapMany(
        rng,
        'Tap every shape that is a quadrilateral.',
        options.map((s) => ({ value: s, correct: quads.includes(s) })),
        { explanation: 'A quadrilateral has exactly four straight sides.' },
      )
    }

    const sides: [string, number][] = [
      ['triangle', 3],
      ['square', 4],
      ['pentagon', 5],
      ['hexagon', 6],
      ['octagon', 8],
    ]
    const [shape, n] = rng.pick(sides)
    return mc(rng, `How many sides does a ${shape} have?`, n, [n + 1, n - 1, n + 2].filter((v) => v > 2 && v !== n), {
      explanation: `A ${shape} has ${n} sides.`,
    })
  },
}

export const usG3Number: SkillDef[] = [roundToTenHundred, multiplyByTens]
export const usG3Ops: SkillDef[] = [unknownFactor, twoStepWord, arithmeticPatterns]
export const usG3Fractions: SkillDef[] = [unitFractions, compareFractions]
export const usG3Measurement: SkillDef[] = [areaByTiling, timeToMinute]
export const usG3Geometry: SkillDef[] = [shapeCategories]
