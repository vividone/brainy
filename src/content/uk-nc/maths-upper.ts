/**
 * England National Curriculum — Year 5 and Year 6 maths.
 *
 * Written against the statutory programmes of study for mathematics, Key
 * Stage 2. Topic scope and the year each lands in come from that document;
 * every question is generated here.
 *
 *   Year 5  numbers to 1,000,000 · powers of 10 · negative numbers in context
 *           · prime, square and cube numbers · long multiplication · adding
 *           and subtracting fractions · decimals and percentages · perimeter
 *           and area · angles
 *   Year 6  numbers to 10,000,000 · long division · order of operations ·
 *           multiplying and dividing fractions · ratio and proportion ·
 *           simple algebra · area and volume · mean · coordinates in four
 *           quadrants
 *
 * Year 6 is the SATs year, so the emphasis here is on the arithmetic paper's
 * staples — long division, order of operations, fractions of amounts — rather
 * than on breadth for its own sake.
 */

import type { Item, SkillDef } from '../../engine/types'
import { entry, mc, tapMany } from '../shared/authoring'

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

const isPrime = (n: number): boolean => {
  if (n < 2) return false
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false
  return true
}

/* ------------------------------------------------------------------ *
 * Year 5
 * ------------------------------------------------------------------ */

const bigNumbers: SkillDef = {
  id: 'uk.maths.y5.numbers-to-million',
  title: 'Numbers to a million',
  yearBand: 'y5',
  prerequisites: ['uk.maths.y4.place-value-4digit'],
  concepts: ['place-value-large'],
  hint: 'Split the digits into groups of three from the right.',
  helpAtHome: 'Populations and house prices in the news are full of these.',
  generate: ({ rng, difficulty }): Item => {
    const digits = [5, 5, 6, 7, 7][difficulty - 1]
    const n = rng.int(10 ** (digits - 1), 10 ** digits - 1)
    const s = String(n)
    const positions = [...s].map((c, i) => (c === '0' ? -1 : i)).filter((i) => i >= 0)
    const pos = rng.pick(positions)
    const digit = Number(s[pos])
    const place = s.length - 1 - pos
    const value = digit * 10 ** place

    if (rng.chance(0.5)) {
      const wrong = [place - 1, place + 1, place - 2]
        .filter((p) => p >= 0 && p < s.length && p !== place)
        .map((p) => digit * 10 ** p)
      return mc(rng, `In ${n.toLocaleString('en')}, what is the digit ${digit} worth?`, value.toLocaleString('en'),
        wrong.map((v) => v.toLocaleString('en')), {
        explanation: `That ${digit} is worth ${value.toLocaleString('en')}.`,
      })
    }

    const to = rng.pick([1000, 10000, 100000])
    let m = n
    if (m % to === 0) m += rng.int(1, to - 1)
    const answer = Math.round(m / to) * to
    const down = Math.floor(m / to) * to
    const up = Math.ceil(m / to) * to
    return mc(rng, `Round ${m.toLocaleString('en')} to the nearest ${to.toLocaleString('en')}.`, answer.toLocaleString('en'), [
      (answer === down ? up : down).toLocaleString('en'),
      (answer + to).toLocaleString('en'),
      (answer - to).toLocaleString('en'),
    ], { explanation: `${m.toLocaleString('en')} rounds to ${answer.toLocaleString('en')}.` })
  },
}

const primesSquaresCubes: SkillDef = {
  id: 'uk.maths.y5.primes-squares',
  title: 'Primes, squares and cubes',
  yearBand: 'y5',
  concepts: ['primes', 'square-numbers'],
  hint: 'A prime has exactly two factors: itself and 1.',
  helpAtHome: 'Ask which numbers of counters can be arranged in a rectangle. The ones that cannot are prime.',
  generate: ({ rng, difficulty }): Item => {
    const variant = rng.int(1, 3)

    if (variant === 1) {
      const top = [20, 30, 40, 50, 50][difficulty - 1]
      const primes = Array.from({ length: top }, (_, i) => i + 2).filter(isPrime)
      const composites = Array.from({ length: top }, (_, i) => i + 2).filter((n) => !isPrime(n))
      const options = [...rng.shuffle(primes).slice(0, 3), ...rng.shuffle(composites).slice(0, 3)]
      return tapMany(rng, 'Tap every prime number.', options.map((v) => ({ value: v, correct: isPrime(v) })), {
        explanation: 'A prime number has exactly two factors: 1 and itself.',
      })
    }

    if (variant === 2) {
      const n = rng.int(2, [8, 10, 12, 12, 12][difficulty - 1])
      return entry(`What is ${n} squared?`, n * n, {
        maxDigits: 4,
        explanation: `${n} × ${n} = ${n * n}.`,
      })
    }

    const n = rng.int(2, [4, 5, 6, 8, 10][difficulty - 1])
    return entry(`What is ${n} cubed?`, n ** 3, {
      maxDigits: 4,
      explanation: `${n} × ${n} × ${n} = ${n ** 3}.`,
    })
  },
}

const longMultiplication: SkillDef = {
  id: 'uk.maths.y5.long-multiplication',
  title: 'Long multiplication',
  yearBand: 'y5',
  prerequisites: ['uk.maths.y4.multiply-1digit'],
  concepts: ['long-multiplication'],
  hint: 'Multiply by the ones, then by the tens, then add the two rows.',
  helpAtHome: 'Estimate first — 32 × 21 is about 30 × 20 = 600, so an answer near 672 looks right.',
  generate: ({ rng, difficulty }): Item => {
    const a = rng.int(12, [30, 45, 60, 99, 99][difficulty - 1])
    const b = rng.int(11, [20, 25, 35, 50, 99][difficulty - 1])
    return entry(`${a} × ${b} = ?`, a * b, {
      maxDigits: 5,
      explanation: `${a} × ${b} = ${a * b}.`,
    })
  },
}

const addFractions: SkillDef = {
  id: 'uk.maths.y5.add-fractions',
  title: 'Adding fractions',
  yearBand: 'y5',
  concepts: ['add-fractions'],
  hint: 'Same bottom number: add the tops and keep the bottom.',
  helpAtHome: 'Two slices of an eight-slice pizza plus three more is five eighths, not five sixteenths.',
  generate: ({ rng, difficulty }): Item => {
    const d = rng.pick([4, 5, 6, 8, 10, 12].slice(0, [3, 4, 5, 6, 6][difficulty - 1]))
    /* Keep the total proper: adding past the whole is Year 6 work. */
    const a = rng.int(1, d - 2)
    const b = rng.int(1, d - 1 - a)
    const sum = a + b
    const g = gcd(sum, d)
    const answer = `${sum / g}/${d / g}`

    const wrong = [
      `${sum}/${d + d}`,
      `${a * b}/${d}`,
      sum + 1 < d ? `${sum + 1}/${d}` : `${Math.max(1, sum - 1)}/${d}`,
    ].filter((w) => {
      const [n, dd] = w.split('/').map(Number)
      return n >= 1 && n < dd && n / dd !== sum / d
    })

    return mc(rng, `${a}/${d} + ${b}/${d} = ?`, answer, wrong, {
      explanation: `${a} + ${b} = ${sum}, so the answer is ${answer}.`,
    })
  },
}

const decimalsPercentages: SkillDef = {
  id: 'uk.maths.y5.decimals-percentages',
  title: 'Decimals and percentages',
  yearBand: 'y5',
  concepts: ['decimals', 'percentages'],
  hint: 'Per cent means "out of a hundred".',
  helpAtHome: 'Sale signs are the best practice there is: 25% off £40.',
  generate: ({ rng, difficulty }): Item => {
    const variant = rng.int(1, 3)

    if (variant === 1) {
      const pairs: [string, string, string][] = [
        ['1/2', '50%', '0.5'],
        ['1/4', '25%', '0.25'],
        ['3/4', '75%', '0.75'],
        ['1/10', '10%', '0.1'],
        ['1/5', '20%', '0.2'],
        ['3/10', '30%', '0.3'],
      ]
      const [frac, pct, dec] = rng.pick(pairs)
      const others = pairs.filter((p) => p[0] !== frac)
      if (rng.chance(0.5)) {
        return mc(rng, `What is ${frac} as a percentage?`, pct, rng.shuffle(others).slice(0, 3).map((p) => p[1]), {
          explanation: `${frac} is ${pct}, or ${dec} as a decimal.`,
        })
      }
      return mc(rng, `What is ${frac} as a decimal?`, dec, rng.shuffle(others).slice(0, 3).map((p) => p[2]), {
        explanation: `${frac} is ${dec}.`,
      })
    }

    if (variant === 2) {
      const pct = rng.pick([10, 20, 25, 50])
      const amount = rng.step(20, [100, 200, 400, 800, 1000][difficulty - 1], 20)
      return entry(`What is ${pct}% of ${amount}?`, (amount * pct) / 100, {
        maxDigits: 4,
        explanation: `${pct}% of ${amount} is ${(amount * pct) / 100}.`,
      })
    }

    /* Ordering decimals — where "0.9 is smaller than 0.15" comes from. */
    const values = rng.shuffle(['0.9', '0.15', '0.5', '0.05'])
    return mc(rng, `Which of these is the largest?\n${values.join(', ')}`, '0.9', ['0.15', '0.5', '0.05'], {
      explanation: '0.9 is nine tenths. 0.15 is only one tenth and five hundredths.',
    })
  },
}

/* ------------------------------------------------------------------ *
 * Year 6
 * ------------------------------------------------------------------ */

const longDivision: SkillDef = {
  id: 'uk.maths.y6.long-division',
  title: 'Long division',
  yearBand: 'y6',
  prerequisites: ['uk.maths.y5.long-multiplication'],
  concepts: ['long-division'],
  hint: 'How many times does the divisor go into each part, working left to right?',
  helpAtHome: 'Check by multiplying back: if 408 ÷ 12 = 34, then 34 × 12 should give 408 again.',
  generate: ({ rng, difficulty }): Item => {
    const divisor = rng.int(3, [9, 12, 15, 20, 25][difficulty - 1])
    const answer = rng.int(11, [40, 60, 90, 120, 200][difficulty - 1])
    return entry(`${divisor * answer} ÷ ${divisor} = ?`, answer, {
      maxDigits: 4,
      explanation: `${divisor} × ${answer} = ${divisor * answer}, so the answer is ${answer}.`,
    })
  },
}

const orderOfOperations: SkillDef = {
  id: 'uk.maths.y6.order-of-operations',
  title: 'Order of operations',
  yearBand: 'y6',
  concepts: ['order-of-operations'],
  hint: 'Brackets first, then × and ÷, then + and −.',
  helpAtHome: 'Write 2 + 3 × 4 and ask for the answer. It is 14, and it catches most adults.',
  generate: ({ rng, difficulty }): Item => {
    const a = rng.int(2, 12)
    const b = rng.int(2, 9)
    const c = rng.int(2, 9)

    if (difficulty <= 2 || rng.chance(0.4)) {
      return entry(`${a} + ${b} × ${c} = ?`, a + b * c, {
        maxDigits: 4,
        explanation: `Multiply first: ${b} × ${c} = ${b * c}, then + ${a} = ${a + b * c}.`,
      })
    }
    if (rng.chance(0.5)) {
      return entry(`(${a} + ${b}) × ${c} = ?`, (a + b) * c, {
        maxDigits: 4,
        explanation: `Brackets first: ${a} + ${b} = ${a + b}, then × ${c} = ${(a + b) * c}.`,
      })
    }
    /* Floor the subtraction: negatives are secondary-school work. */
    const take = Math.min(c, a * b - 1)
    return entry(`${a} × ${b} − ${take} = ?`, a * b - take, {
      maxDigits: 4,
      explanation: `Multiply first: ${a} × ${b} = ${a * b}, then − ${take} = ${a * b - take}.`,
    })
  },
}

const fractionsOfAmounts: SkillDef = {
  id: 'uk.maths.y6.fractions-of-amounts',
  title: 'Fractions of amounts',
  yearBand: 'y6',
  prerequisites: ['uk.maths.y5.add-fractions'],
  concepts: ['fraction-of-set'],
  hint: 'Divide by the bottom number, then multiply by the top.',
  helpAtHome: 'Three quarters of 60 minutes is the sort of thing that comes up every day.',
  generate: ({ rng, difficulty }): Item => {
    const d = rng.pick([3, 4, 5, 6, 8])
    const n = rng.int(1, d - 1)
    const total = d * rng.int(2, [6, 8, 12, 15, 20][difficulty - 1])
    return entry(`What is ${n}/${d} of ${total}?`, (total / d) * n, {
      maxDigits: 4,
      explanation: `${total} ÷ ${d} = ${total / d}, then × ${n} = ${(total / d) * n}.`,
    })
  },
}

const ratio: SkillDef = {
  id: 'uk.maths.y6.ratio',
  title: 'Ratio and proportion',
  yearBand: 'y6',
  concepts: ['ratio'],
  hint: 'Add the parts of the ratio to find how many shares there are altogether.',
  helpAtHome: 'Squash mixed one part to four is a ratio, and so is a recipe scaled up.',
  generate: ({ rng, difficulty }): Item => {
    const a = rng.int(1, 4)
    const b = rng.int(1, 5)
    const share = rng.int(2, [6, 8, 10, 12, 20][difficulty - 1])
    const total = (a + b) * share

    if (rng.chance(0.5)) {
      return entry(
        `${total} sweets are shared in the ratio ${a} : ${b}.\nHow many are in the larger share?`,
        Math.max(a, b) * share,
        {
          maxDigits: 4,
          explanation: `${a} + ${b} = ${a + b} parts. ${total} ÷ ${a + b} = ${share}, so the larger share is ${Math.max(a, b)} × ${share} = ${Math.max(a, b) * share}.`,
        },
      )
    }

    const cost = rng.int(2, 9)
    const many = rng.int(3, 9)
    return entry(`${1} pencil costs ${cost}p.\nHow much do ${many} pencils cost?`, cost * many, {
      maxDigits: 4,
      suffix: 'p',
      explanation: `${many} × ${cost} = ${cost * many}p.`,
    })
  },
}

const simpleAlgebra: SkillDef = {
  id: 'uk.maths.y6.algebra',
  title: 'Simple algebra',
  yearBand: 'y6',
  concepts: ['algebra'],
  hint: 'The letter stands for a number. Work out what it must be.',
  helpAtHome: 'Cover a number in a sum with your thumb and ask what is hidden. That is algebra.',
  generate: ({ rng, difficulty }): Item => {
    const letter = rng.pick(['a', 'n', 'x', 'y'])
    const value = rng.int(2, [9, 12, 15, 20, 25][difficulty - 1])
    const k = rng.int(2, 9)

    if (rng.chance(0.5)) {
      const total = k * value
      return entry(`If ${k}${letter} = ${total}, what is ${letter}?`, value, {
        maxDigits: 3,
        explanation: `${total} ÷ ${k} = ${value}.`,
      })
    }
    const add = rng.int(1, 20)
    return entry(`If ${letter} = ${value}, what is ${k}${letter} + ${add}?`, k * value + add, {
      maxDigits: 4,
      explanation: `${k} × ${value} = ${k * value}, then + ${add} = ${k * value + add}.`,
    })
  },
}

const areaVolume: SkillDef = {
  id: 'uk.maths.y6.area-volume',
  title: 'Area and volume',
  yearBand: 'y6',
  prerequisites: ['uk.maths.y4.perimeter'],
  concepts: ['area', 'volume'],
  hint: 'Area is length × width. Volume is length × width × height.',
  helpAtHome: 'Work out the volume of a cereal box together, then check it against the label.',
  generate: ({ rng, difficulty }): Item => {
    const w = rng.int(2, [6, 8, 10, 12, 15][difficulty - 1])
    const h = rng.int(2, [6, 8, 10, 12, 15][difficulty - 1])

    if (rng.chance(0.5)) {
      return entry(`A rectangle is ${w} cm by ${h} cm.\nWhat is its area?`, w * h, {
        maxDigits: 4,
        suffix: 'cm²',
        explanation: `${w} × ${h} = ${w * h} cm².`,
      })
    }
    const d = rng.int(2, 9)
    return entry(`A box is ${w} cm by ${h} cm by ${d} cm.\nWhat is its volume?`, w * h * d, {
      maxDigits: 5,
      suffix: 'cm³',
      explanation: `${w} × ${h} × ${d} = ${w * h * d} cm³.`,
    })
  },
}

const mean: SkillDef = {
  id: 'uk.maths.y6.mean',
  title: 'The mean',
  yearBand: 'y6',
  concepts: ['central-tendency'],
  hint: 'Add them all up, then share the total out equally.',
  helpAtHome: 'Work out the mean of everyone’s ages at the dinner table.',
  generate: ({ rng, difficulty }): Item => {
    /*
     * Exact by construction: build from a target and nudge in +d/−d pairs, so
     * the total is always target × n. Scattering values and letting the last
     * absorb the difference can push it below 1, and clamping there quietly
     * breaks the arithmetic.
     */
    const n = [4, 4, 5, 6, 6][difficulty - 1]
    const target = rng.int(4, [12, 15, 20, 25, 30][difficulty - 1])
    const list = Array.from({ length: n }, () => target)
    const spread = Math.min(3, target - 1)
    for (let i = 0; i + 1 < n; i += 2) {
      const d = rng.int(0, spread)
      list[i] += d
      list[i + 1] -= d
    }
    const shown = rng.shuffle(list)
    const total = shown.reduce((a, b) => a + b, 0)
    return entry(`What is the mean of these numbers?\n${shown.join(', ')}`, target, {
      maxDigits: 3,
      explanation: `They add up to ${total}. ${total} ÷ ${n} = ${target}.`,
    })
  },
}

export const ukY5Number: SkillDef[] = [bigNumbers, primesSquaresCubes]
export const ukY5Calculation: SkillDef[] = [longMultiplication]
export const ukY5Fractions: SkillDef[] = [addFractions, decimalsPercentages]

export const ukY6Number: SkillDef[] = [simpleAlgebra]
export const ukY6Calculation: SkillDef[] = [longDivision, orderOfOperations]
export const ukY6Fractions: SkillDef[] = [fractionsOfAmounts, ratio]
export const ukY6Measurement: SkillDef[] = [areaVolume]
export const ukY6Statistics: SkillDef[] = [mean]
