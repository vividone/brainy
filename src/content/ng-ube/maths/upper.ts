/**
 * Basic 4–6 maths — upper primary, up to the common entrance level.
 *
 * The step up from Basic 3 is real: numbers past 1000, formal long methods,
 * fractions that are operated on rather than just recognised, and the first
 * appearance of decimals, percentages, area and averages.
 */

import type { Item, SkillDef } from '../../../engine/types'
import { entry, mc, money, person, sayMaths, tapMany, thing, twoPeople } from '../../shared/authoring'
import { numberToWords } from '../../shared/words'

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
const lcm = (a: number, b: number): number => (a * b) / gcd(a, b)

const factorsOf = (n: number): number[] =>
  Array.from({ length: n }, (_, i) => i + 1).filter((f) => n % f === 0)

/* ------------------------------------------------------------------ *
 * Number & Numeration
 * ------------------------------------------------------------------ */

const largeNumbers: SkillDef = {
  id: 'ng.maths.number.large',
  title: 'Big numbers',
  yearBand: 'b4',
  prerequisites: ['ng.maths.number.place-value'],
  concepts: ['place-value-large'],
  hint: 'Split the number into groups of three digits from the right.',
  helpAtHome: 'Read population figures or prices from the news together.',
  generate: ({ rng, difficulty }): Item => {
    const digits = [4, 4, 5, 6, 6][difficulty - 1]
    const n = rng.int(10 ** (digits - 1), 10 ** digits - 1)
    const variant = rng.int(1, 3)

    if (variant === 1) {
      const s = String(n)
      // A zero digit is worth zero in every column, so every distractor
      // collapses to the same thing and the question is unanswerable.
      const positions = [...s].map((c, i) => (c === '0' ? -1 : i)).filter((i) => i >= 0)
      const pos = rng.pick(positions.length ? positions : [0])
      const d = Number(s[pos])
      const place = s.length - 1 - pos
      const value = d * 10 ** place
      const names = ['units', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands']
      const wrong = [place - 1, place + 1, place - 2, place + 2]
        .filter((p) => p >= 0 && p <= 5)
        .map((p) => d * 10 ** p)
        .filter((v) => v !== value)
      return mc(
        rng,
        `In ${n.toLocaleString('en')}, what is the value of the digit ${d}?`,
        value.toLocaleString('en'),
        wrong.map((v) => v.toLocaleString('en')),
        { explanation: `The ${d} is in the ${names[place]} place, so it is worth ${value.toLocaleString('en')}.` },
      )
    }

    if (variant === 2) {
      const to = rng.pick([10, 100, 1000])
      const rounded = Math.round(n / to) * to
      return entry(`Round ${n.toLocaleString('en')} to the nearest ${to}.`, rounded, {
        maxDigits: 7,
        explanation: `${n.toLocaleString('en')} rounds to ${rounded.toLocaleString('en')}.`,
      })
    }

    const small = rng.int(1000, 9999)
    return mc(rng, `How do we write ${small.toLocaleString('en')} in words?`, capitalise(numberToWords(small)), [
      capitalise(numberToWords(small + 1000)),
      capitalise(numberToWords(small + 100)),
      capitalise(numberToWords(small - 10)),
    ])
  },
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const factorsMultiples: SkillDef = {
  id: 'ng.maths.number.factors',
  title: 'Factors and multiples',
  yearBand: 'b4',
  prerequisites: ['ng.maths.ops.times-tables'],
  concepts: ['factors-multiples'],
  hint: 'A factor divides into the number exactly. A multiple is in its times table.',
  helpAtHome: 'Ask which numbers divide 24 exactly — it is a times-table game in disguise.',
  generate: ({ rng, difficulty }): Item => {
    const pool = [[6, 8, 10, 12], [12, 15, 16, 18], [18, 20, 24, 28], [24, 30, 36, 40], [36, 42, 48, 60]][
      difficulty - 1
    ]
    const n = rng.pick(pool)
    const variant = rng.int(1, 3)

    if (variant === 1) {
      const factors = factorsOf(n)
      const nonFactors = Array.from({ length: 20 }, (_, i) => i + 1).filter((f) => n % f !== 0)
      const options = rng.shuffle([...rng.sample(factors, 3), ...rng.sample(nonFactors, 3)])
      return tapMany(
        rng,
        `Tap every number that is a FACTOR of ${n}`,
        options.map((v) => ({ value: v, correct: n % v === 0 })),
        { explanation: `The factors of ${n} are ${factorsOf(n).join(', ')}.` },
      )
    }

    if (variant === 2) {
      const base = rng.int(2, 9)
      const k = rng.int(2, 8)
      return entry(`What is the ${k}${k === 2 ? 'nd' : k === 3 ? 'rd' : 'th'} multiple of ${base}?`, base * k, {
        explanation: `${base} × ${k} = ${base * k}`,
      })
    }

    const a = rng.int(2, 12)
    const b = rng.int(2, 12)
    const askLcm = rng.chance(0.5)
    return entry(
      askLcm
        ? `What is the LCM (lowest common multiple) of ${a} and ${b}?`
        : `What is the HCF (highest common factor) of ${a} and ${b}?`,
      askLcm ? lcm(a, b) : gcd(a, b),
      {
        maxDigits: 4,
        explanation: askLcm
          ? `The smallest number both ${a} and ${b} divide into is ${lcm(a, b)}.`
          : `The biggest number that divides both ${a} and ${b} is ${gcd(a, b)}.`,
      },
    )
  },
}

/* ------------------------------------------------------------------ *
 * Operations
 * ------------------------------------------------------------------ */

const longMultiplication: SkillDef = {
  id: 'ng.maths.ops.long-multiplication',
  title: 'Long multiplication',
  yearBand: 'b4',
  prerequisites: ['ng.maths.ops.times-tables'],
  concepts: ['long-multiplication'],
  hint: 'Multiply by the units first, then the tens, then add the two lines.',
  helpAtHome: 'Set out one 2-digit × 2-digit sum on paper each day and check the working.',
  generate: ({ rng, difficulty }): Item => {
    const a = rng.int(12, [25, 40, 60, 90, 99][difficulty - 1])
    const b = difficulty <= 2 ? rng.int(2, 9) : rng.int(11, [15, 20, 30, 45, 60][difficulty - 1])
    return entry(`${a} × ${b} = ?`, a * b, {
      speak: sayMaths(`${a} times ${b}`),
      maxDigits: 6,
      explanation: `${a} × ${b} = ${a * b}`,
    })
  },
}

const longDivision: SkillDef = {
  id: 'ng.maths.ops.long-division',
  title: 'Long division',
  yearBand: 'b4',
  prerequisites: ['ng.maths.ops.division-sharing'],
  concepts: ['long-division'],
  hint: 'How many times does it go in? Write it above, subtract, bring the next digit down.',
  helpAtHome: 'Divide a bill between the family and check the remainder.',
  generate: ({ rng, difficulty }): Item => {
    const divisor = rng.int(2, [5, 7, 9, 12, 12][difficulty - 1])
    const quotient = rng.int(11, [30, 60, 99, 150, 250][difficulty - 1])
    const withRemainder = difficulty >= 3 && rng.chance(0.45)
    const remainder = withRemainder ? rng.int(1, divisor - 1) : 0
    const total = divisor * quotient + remainder

    if (remainder > 0) {
      return entry(`${total} ÷ ${divisor}\nWhat is the REMAINDER?`, remainder, {
        speak: sayMaths(`${total} divided by ${divisor}. What is the remainder?`),
        maxDigits: 2,
        explanation: `${divisor} × ${quotient} = ${divisor * quotient}, and ${total} − ${divisor * quotient} = ${remainder}.`,
      })
    }

    return entry(`${total} ÷ ${divisor} = ?`, quotient, {
      speak: sayMaths(`${total} divided by ${divisor}`),
      maxDigits: 4,
      explanation: `${divisor} × ${quotient} = ${total}`,
    })
  },
}

const orderOfOperations: SkillDef = {
  id: 'ng.maths.ops.bodmas',
  title: 'Order of operations',
  yearBand: 'b5',
  prerequisites: ['ng.maths.ops.long-multiplication'],
  concepts: ['order-of-operations'],
  hint: 'Brackets first, then × and ÷, then + and −.',
  helpAtHome: 'Write 2 + 3 × 4 and ask for the answer — 14, not 20. It catches most adults too.',
  generate: ({ rng, difficulty }): Item => {
    const a = rng.int(2, 12)
    const b = rng.int(2, 9)
    const c = rng.int(2, 9)

    if (difficulty <= 2 || rng.chance(0.4)) {
      const answer = a + b * c
      return entry(`${a} + ${b} × ${c} = ?`, answer, {
        speak: sayMaths(`${a} plus ${b} times ${c}`),
        maxDigits: 4,
        explanation: `Multiply first: ${b} × ${c} = ${b * c}, then ${a} + ${b * c} = ${answer}.`,
      })
    }

    if (rng.chance(0.5)) {
      const answer = (a + b) * c
      return entry(`(${a} + ${b}) × ${c} = ?`, answer, {
        speak: sayMaths(`Open bracket ${a} plus ${b} close bracket, times ${c}`),
        maxDigits: 4,
        explanation: `Brackets first: ${a} + ${b} = ${a + b}, then × ${c} = ${answer}.`,
      })
    }

    /*
     * Keep the subtraction from going below zero. With a·b as low as 4 and c
     * as high as 9, this branch could ask a Basic 5 child for 2 × 2 − 9 — a
     * negative answer, three years before negative numbers are taught, and one
     * the number pad cannot even express. Latent for a long time: the sampler
     * only reached the combination once new skills shifted the seeds.
     */
    const take = Math.min(c, a * b - 1)
    const answer = a * b - take
    return entry(`${a} × ${b} − ${take} = ?`, answer, {
      speak: sayMaths(`${a} times ${b} minus ${take}`),
      maxDigits: 4,
      explanation: `Multiply first: ${a} × ${b} = ${a * b}, then − ${take} = ${answer}.`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * Fractions, decimals, percentages
 * ------------------------------------------------------------------ */

const addFractions: SkillDef = {
  id: 'ng.maths.fractions.add-same',
  title: 'Adding fractions',
  yearBand: 'b4',
  prerequisites: ['ng.maths.fractions.equivalent'],
  concepts: ['add-fractions'],
  hint: 'Same bottom number? Just add the tops.',
  helpAtHome: 'Cut a chapati into eighths and add the pieces up.',
  generate: ({ rng, difficulty }): Item => {
    const den = rng.pick([[4, 5], [4, 5, 6], [5, 6, 8], [6, 8, 10], [8, 10, 12]][difficulty - 1])

    /**
     * Answers stay proper fractions. Basic 4 is the first time a child adds
     * fractions at all; an answer of 4/4 or 5/4 needs "one whole" and
     * improper fractions, which come later. Keeping a + b < den means every
     * option on screen is a fraction they have actually been taught.
     */
    const propose = (n: number) => `${n}/${den}`
    const distractors = (correct: number) =>
      [correct + 1, correct - 1, correct + 2]
        .filter((n) => n >= 1 && n < den && n !== correct)
        .map(propose)
        // A classic real mistake: adding the bottoms too.
        .concat(`${correct}/${den + den}`)

    if (rng.chance(0.6)) {
      const a = rng.int(1, den - 2)
      const b = rng.int(1, den - a - 1)
      return mc(rng, `${a}/${den} + ${b}/${den} = ?`, propose(a + b), distractors(a + b), {
        speak: `${a} over ${den} plus ${b} over ${den}`,
        explanation: `The bottom stays the same: ${a} + ${b} = ${a + b}, so ${a + b}/${den}.`,
      })
    }

    const big = rng.int(2, den - 1)
    const small = rng.int(1, big - 1)
    return mc(rng, `${big}/${den} − ${small}/${den} = ?`, propose(big - small), distractors(big - small), {
      speak: `${big} over ${den} minus ${small} over ${den}`,
      explanation: `Bottom stays: ${big} − ${small} = ${big - small}, so ${big - small}/${den}.`,
    })
  },
}

const decimals: SkillDef = {
  id: 'ng.maths.fractions.decimals',
  title: 'Decimals',
  yearBand: 'b5',
  prerequisites: ['ng.maths.fractions.add-same'],
  concepts: ['decimals'],
  hint: 'The first place after the point is tenths, the second is hundredths.',
  helpAtHome: 'Prices are decimals — read them aloud as "three point five zero".',
  generate: ({ rng }): Item => {
    const variant = rng.int(1, 3)

    if (variant === 1) {
      const tenths = rng.int(1, 9)
      return mc(rng, `Which decimal is the same as ${tenths}/10?`, `0.${tenths}`, [
        `0.0${tenths}`,
        `${tenths}.0`,
        `0.${tenths}${tenths}`,
      ], { explanation: `${tenths} tenths is written 0.${tenths}` })
    }

    if (variant === 2) {
      const a = Number((rng.int(10, 90) / 10).toFixed(1))
      const b = Number((rng.int(10, 90) / 10).toFixed(1))
      const sum = Number((a + b).toFixed(1))
      return mc(rng, `${a} + ${b} = ?`, String(sum), [
        String(Number((a + b + 0.1).toFixed(1))),
        String(Number((a + b - 0.1).toFixed(1))),
        String(Number((a + b + 1).toFixed(1))),
      ], { speak: `${a} plus ${b}`, explanation: `${a} + ${b} = ${sum}` })
    }

    const values = rng
      .sample(Array.from({ length: 40 }, (_, i) => Number(((i + 1) / 10).toFixed(1))), 2)
      .sort((x, y) => x - y)
    return mc(rng, 'Which decimal is BIGGER?', String(values[1]), [String(values[0])], {
      explanation: `${values[1]} is bigger than ${values[0]}.`,
    })
  },
}

const percentages: SkillDef = {
  id: 'ng.maths.fractions.percentages',
  title: 'Percentages',
  yearBand: 'b5',
  prerequisites: ['ng.maths.fractions.decimals'],
  concepts: ['percentages'],
  hint: 'Per cent means "out of 100". 50% is a half, 25% is a quarter.',
  helpAtHome: 'Work out discounts together when shopping — 20% off is a real-world percentage.',
  generate: ({ rng, difficulty }): Item => {
    const pct = rng.pick([[50], [50, 25], [50, 25, 10], [50, 25, 10, 20, 75], [10, 20, 25, 30, 40, 60, 75]][difficulty - 1])
    const base = rng.step(20, [100, 200, 400, 800, 1000][difficulty - 1], 20)
    const answer = (base * pct) / 100

    if (Number.isInteger(answer) && rng.chance(0.6)) {
      return entry(`What is ${pct}% of ${base}?`, answer, {
        maxDigits: 5,
        explanation: `${pct}% of ${base} = ${base} ÷ 100 × ${pct} = ${answer}.`,
      })
    }

    const asFraction: Record<number, string> = { 50: '1/2', 25: '1/4', 10: '1/10', 75: '3/4', 20: '1/5' }
    const known = asFraction[pct] ?? '1/2'
    const knownPct = Object.keys(asFraction).find((k) => asFraction[Number(k)] === known)
    return mc(
      rng,
      `Which fraction is the same as ${knownPct}%?`,
      known,
      Object.values(asFraction).filter((f) => f !== known),
      { explanation: `${knownPct}% means ${knownPct} out of 100, which simplifies to ${known}.` },
    )
  },
}

/* ------------------------------------------------------------------ *
 * Measurement & geometry
 * ------------------------------------------------------------------ */

const perimeterArea: SkillDef = {
  id: 'ng.maths.measure.perimeter-area',
  title: 'Perimeter and area',
  yearBand: 'b4',
  prerequisites: ['ng.maths.measure.length', 'ng.maths.ops.times-tables'],
  concepts: ['perimeter-area'],
  hint: 'Perimeter is the distance all the way round. Area is length × width.',
  helpAtHome: 'Measure a room and work out its area together.',
  generate: ({ rng, difficulty }): Item => {
    const w = rng.int(2, [6, 9, 12, 20, 30][difficulty - 1])
    const h = rng.int(2, [6, 9, 12, 20, 30][difficulty - 1])
    const askArea = rng.chance(0.5)
    return entry(
      askArea
        ? `A rectangle is ${w} cm long and ${h} cm wide.\nWhat is its AREA?`
        : `A rectangle is ${w} cm long and ${h} cm wide.\nWhat is its PERIMETER?`,
      askArea ? w * h : 2 * (w + h),
      {
        visual: { kind: 'shape2d', name: 'rectangle' },
        suffix: askArea ? ' cm²' : ' cm',
        maxDigits: 4,
        explanation: askArea
          ? `Area = length × width = ${w} × ${h} = ${w * h} cm².`
          : `Perimeter = ${w} + ${h} + ${w} + ${h} = ${2 * (w + h)} cm.`,
      },
    )
  },
}

const angleTypes: SkillDef = {
  id: 'ng.maths.shapes.angle-types',
  title: 'Types of angle',
  yearBand: 'b4',
  prerequisites: ['ng.maths.shapes.right-angles'],
  concepts: ['angle-types'],
  hint: 'Smaller than a square corner is acute. Bigger is obtuse.',
  helpAtHome: 'Open a door slowly and name the angle as it changes.',
  generate: ({ rng }): Item => {
    /*
     * Drawn from the full range rather than a handful of fixed angles.
     * A short list of preset degrees meant a child saw the same eleven
     * pictures over and over; sampling the range gives roughly 150 distinct
     * drawings before the question forms even multiply it.
     */
    const kind = rng.int(1, 3)
    const acute = () => rng.int(12, 84)
    const obtuse = () => rng.int(96, 172)
    const anyAngle = () => (rng.chance(0.15) ? 90 : rng.chance(0.5) ? acute() : obtuse())
    const nameOf = (d: number) => (d < 90 ? 'Acute' : d === 90 ? 'Right angle' : 'Obtuse')

    if (kind === 1) {
      const degrees = anyAngle()
      const label = nameOf(degrees)
      return mc(
        rng,
        'What kind of angle is this?',
        label,
        ['Acute', 'Right angle', 'Obtuse'].filter((l) => l !== label),
        {
          visual: { kind: 'angle', degrees },
          explanation: `It measures about ${degrees}°, so it is ${label.toLowerCase()}.`,
        },
      )
    }

    if (kind === 2) {
      // Pick the named angle out of three drawings.
      const want = rng.pick(['Acute', 'Right angle', 'Obtuse'] as const)
      const correct = want === 'Acute' ? acute() : want === 'Obtuse' ? obtuse() : 90
      const others = (['Acute', 'Right angle', 'Obtuse'] as const)
        .filter((l) => l !== want)
        .map((l) => (l === 'Acute' ? acute() : l === 'Obtuse' ? obtuse() : 90))
      return mc(
        rng,
        `Which one is ${want === 'Right angle' ? 'a right angle' : `an ${want.toLowerCase()} angle`}?`,
        { visual: { kind: 'angle', degrees: correct } },
        others.map((d) => ({ visual: { kind: 'angle' as const, degrees: d } })),
        { explanation: `${want} means ${want === 'Acute' ? 'smaller than' : want === 'Obtuse' ? 'bigger than' : 'exactly'} a square corner.` },
      )
    }

    const degrees = anyAngle()
    const bigger = degrees > 90
    return tapMany(
      rng,
      `Tap every angle that is ${bigger ? 'BIGGER' : 'SMALLER'} than a right angle`,
      rng.shuffle([acute(), acute(), obtuse(), obtuse(), 90]).map((d) => ({
        value: `${d}°`,
        correct: bigger ? d > 90 : d < 90,
      })),
      { explanation: 'A right angle is exactly 90°.' },
    )
  },
}

const averages: SkillDef = {
  id: 'ng.maths.data.average',
  title: 'Averages',
  yearBand: 'b5',
  prerequisites: ['ng.maths.ops.division-sharing'],
  concepts: ['mean-average'],
  hint: 'Add them all up, then divide by how many there are.',
  helpAtHome: 'Work out the average of the family shoe sizes, or of his test scores.',
  generate: ({ rng, difficulty }): Item => {
    const count = difficulty <= 2 ? 3 : rng.int(3, 5)
    const mean = rng.int(4, [10, 15, 20, 30, 50][difficulty - 1])
    // Build numbers that average exactly, so the answer stays a whole number.
    const values: number[] = []
    let remaining = mean * count
    for (let i = 0; i < count - 1; i++) {
      const max = Math.min(remaining - (count - 1 - i), mean * 2)
      const v = rng.int(1, Math.max(1, max))
      values.push(v)
      remaining -= v
    }
    values.push(remaining)
    if (values.some((v) => v < 1)) return entry(`What is the average of ${mean}, ${mean} and ${mean}?`, mean, {
      explanation: `They are all the same, so the average is ${mean}.`,
    })

    return entry(`What is the average of ${values.join(', ')}?`, mean, {
      maxDigits: 4,
      explanation: `${values.join(' + ')} = ${mean * count}, and ${mean * count} ÷ ${count} = ${mean}.`,
    })
  },
}

const profitLoss: SkillDef = {
  id: 'ng.maths.money.profit-loss',
  title: 'Profit, loss and discount',
  yearBand: 'b5',
  prerequisites: ['ng.maths.money.shopping', 'ng.maths.fractions.percentages'],
  concepts: ['profit-loss'],
  hint: 'Profit is selling price minus cost price. A discount comes off the price.',
  helpAtHome: 'Talk through the maths of a market stall — what it cost, what it sold for.',
  generate: ({ rng, difficulty, locale }): Item => {
    const who = person(rng, locale)
    const noun = thing(rng, locale)
    const cost = rng.step(100, [400, 800, 1500, 3000, 5000][difficulty - 1], 50)

    if (rng.chance(0.5)) {
      const profit = rng.step(50, Math.max(100, Math.floor(cost / 2)), 50)
      const sold = cost + profit
      const askProfit = rng.chance(0.7)
      return entry(
        askProfit
          ? `${who} bought a ${noun.one} for ${money(cost, locale)} and sold it for ${money(sold, locale)}.\nWhat is the PROFIT?`
          : `${who} sold a ${noun.one} for ${money(sold, locale)}, making a profit of ${money(profit, locale)}.\nWhat did it COST?`,
        askProfit ? profit : cost,
        {
          prefix: locale.currency.symbol,
          maxDigits: 6,
          explanation: askProfit
            ? `${sold} − ${cost} = ${profit}`
            : `${sold} − ${profit} = ${cost}`,
        },
      )
    }

    // A price that is a multiple of 100 keeps every discount a whole number
    // of naira; 25% of ₦450 is ₦112.50, which is not a Basic 5 answer.
    const pct = rng.pick([10, 20, 25, 50])
    const price = Math.max(100, Math.round(cost / 100) * 100)
    const off = (price * pct) / 100
    return entry(
      `A ${noun.one} costs ${money(price, locale)}. There is ${pct}% off.\nHow much do you pay?`,
      price - off,
      {
        prefix: locale.currency.symbol,
        maxDigits: 6,
        explanation: `${pct}% of ${price} is ${off}, so you pay ${price} − ${off} = ${price - off}.`,
      },
    )
  },
}

const multiStepWord: SkillDef = {
  id: 'ng.maths.ops.multi-step',
  title: 'Two-step story problems',
  yearBand: 'b6',
  prerequisites: ['ng.maths.ops.bodmas', 'ng.maths.ops.long-division'],
  concepts: ['multi-step-word-problems'],
  hint: 'Work out the first step, write it down, then use it for the second.',
  helpAtHome: 'Ask him to explain his working out loud — the reasoning matters more than the answer.',
  generate: ({ rng, difficulty, locale }): Item => {
    const [a, b] = twoPeople(rng, locale)
    const noun = thing(rng, locale)
    const scale = [10, 20, 40, 80, 120][difficulty - 1]

    if (rng.chance(0.5)) {
      const packs = rng.int(3, 9)
      const per = rng.int(4, 12)
      const eaten = rng.int(2, Math.min(20, packs * per - 1))
      return entry(
        `${a} buys ${packs} packs of ${noun.many}. Each pack holds ${per}.\n${b} takes ${eaten}. How many are left?`,
        packs * per - eaten,
        { maxDigits: 5, explanation: `${packs} × ${per} = ${packs * per}, then ${packs * per} − ${eaten} = ${packs * per - eaten}.` },
      )
    }

    const total = rng.step(scale, scale * 6, scale)
    const groups = rng.pick([2, 3, 4, 5])
    const each = Math.floor(total / groups)
    const spare = total - each * groups
    return entry(
      `${total} ${noun.many} are shared equally between ${groups} classes.\nHow many does each class get?`,
      each,
      {
        maxDigits: 5,
        explanation:
          spare === 0
            ? `${total} ÷ ${groups} = ${each}`
            : `${total} ÷ ${groups} = ${each} with ${spare} left over.`,
      },
    )
  },
}

/* Grouped for splicing into the existing strands, in curriculum order. */
export const upperNumberSkills: SkillDef[] = [largeNumbers, factorsMultiples]
export const upperOpsSkills: SkillDef[] = [longMultiplication, longDivision, orderOfOperations, multiStepWord]
export const upperFractionSkills: SkillDef[] = [addFractions, decimals, percentages]
export const upperMoneySkills: SkillDef[] = [profitLoss]
export const upperMeasureSkills: SkillDef[] = [perimeterArea]
export const upperShapeSkills: SkillDef[] = [angleTypes]
export const upperDataSkills: SkillDef[] = [averages]
