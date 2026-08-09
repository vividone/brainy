/**
 * Common Core — Kindergarten, Grade 1, Grade 4 and Grade 5 math.
 *
 * Written against the **Common Core State Standards for Mathematics**. Each
 * skill carries its standard code in `concepts`, so a coverage gap is
 * checkable against the standard rather than against an opinion.
 *
 *   K     count to 100 by ones and tens · count objects · compare numbers ·
 *         add and subtract within 10 · name shapes
 *   G1    count to 120 · tens and ones · add and subtract within 20 ·
 *         unknown addends · time to the half hour · halves and fourths
 *   G4    multi-digit arithmetic · factors, multiples, prime and composite ·
 *         equivalent fractions · adding fractions · decimals to hundredths ·
 *         angle measure · symmetry
 *   G5    decimal place value · multiplying and dividing decimals · fractions
 *         with unlike denominators · volume · the coordinate plane ·
 *         numerical expressions
 *
 * Written to match how Common Core actually teaches rather than translated
 * from the other packs: unknown addends appear in Grade 1 as their own idea,
 * volume arrives in Grade 5 through unit cubes, and Grade 5 fractions require
 * a common denominator rather than staying within one.
 */

import type { Item, SkillDef } from '../../engine/types'
import { entry, mc, order, tapMany } from '../shared/authoring'

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

const isPrime = (n: number): boolean => {
  if (n < 2) return false
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false
  return true
}

/* ------------------------------------------------------------------ *
 * Kindergarten
 * ------------------------------------------------------------------ */

const countToHundred: SkillDef = {
  id: 'us.math.k.counting',
  title: 'Counting',
  yearBand: 'k',
  concepts: ['K.CC.A.1', 'counting'],
  hint: 'Say the numbers in order, one at a time.',
  helpAtHome: 'Count steps, spoons, anything. Out loud and together.',
  generate: ({ rng, difficulty }): Item => {
    const top = [10, 20, 30, 50, 100][difficulty - 1]

    if (rng.chance(0.5)) {
      const start = rng.int(1, Math.max(1, top - 4))
      return entry(`What comes next?\n${start}, ${start + 1}, ${start + 2}, ?`, start + 3, {
        maxDigits: 3,
        explanation: `After ${start + 2} comes ${start + 3}.`,
      })
    }
    const start = rng.int(1, Math.max(1, top - 4))
    return order(
      rng,
      'Put these numbers in counting order.',
      [start, start + 1, start + 2, start + 3].map(String),
      { explanation: 'Smallest first, then count up.' },
    )
  },
}

const compareNumbers: SkillDef = {
  id: 'us.math.k.compare',
  title: 'Bigger and smaller',
  yearBand: 'k',
  concepts: ['K.CC.C.7', 'compare-numbers'],
  hint: 'The number you say later when counting is the bigger one.',
  helpAtHome: 'Hold up two handfuls and ask which has more, before counting.',
  generate: ({ rng, difficulty }): Item => {
    const top = [5, 8, 10, 15, 20][difficulty - 1]
    const a = rng.int(1, top)
    let b = rng.int(1, top)
    if (b === a) b = a === 1 ? 2 : a - 1
    const bigger = Math.max(a, b)
    return mc(rng, `Which number is bigger: ${a} or ${b}?`, bigger, [Math.min(a, b)], {
      explanation: `${bigger} is bigger than ${Math.min(a, b)}.`,
    })
  },
}

const addWithinTen: SkillDef = {
  id: 'us.math.k.add-within-10',
  title: 'Adding to 10',
  yearBand: 'k',
  concepts: ['K.OA.A.5', 'addition'],
  hint: 'Count them all together.',
  helpAtHome: 'Use fingers. At this age seeing the objects is the whole point.',
  generate: ({ rng }): Item => {
    if (rng.chance(0.6)) {
      const a = rng.int(1, 5)
      const b = rng.int(1, 10 - a)
      return entry(`${a} + ${b} = ?`, a + b, { maxDigits: 2, explanation: `${a} + ${b} = ${a + b}.` })
    }
    const a = rng.int(2, 10)
    const b = rng.int(1, a)
    return entry(`${a} − ${b} = ?`, a - b, { maxDigits: 2, explanation: `${a} − ${b} = ${a - b}.` })
  },
}

const namedShapes: SkillDef = {
  id: 'us.math.k.shapes',
  title: 'Naming shapes',
  yearBand: 'k',
  concepts: ['K.G.A.2', 'shape-properties'],
  hint: 'Count the straight sides.',
  helpAtHome: 'Name shapes on signs and packets as you pass them.',
  generate: ({ rng }): Item => {
    const shapes: [string, number][] = [
      ['triangle', 3],
      ['square', 4],
      ['rectangle', 4],
      ['hexagon', 6],
    ]
    const [shape, sides] = rng.pick(shapes)
    return mc(rng, `How many sides does a ${shape} have?`, sides, [sides + 1, sides - 1, sides + 2].filter((v) => v > 2 && v !== sides), {
      explanation: `A ${shape} has ${sides} sides.`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * Grade 1
 * ------------------------------------------------------------------ */

const tensAndOnes: SkillDef = {
  id: 'us.math.g1.tens-ones',
  title: 'Tens and ones',
  yearBand: 'g1',
  prerequisites: ['us.math.k.counting'],
  concepts: ['1.NBT.B.2', 'place-value'],
  hint: 'The first digit counts the tens, the second counts the ones.',
  helpAtHome: 'Bundle straws in tens and count the leftovers.',
  generate: ({ rng }): Item => {
    /* Never a multiple of ten: "how many ones in 40" answers itself. */
    const tens = rng.int(1, 9)
    const ones = rng.int(1, 9)
    const n = tens * 10 + ones

    if (rng.chance(0.5)) {
      const askTens = rng.chance(0.5)
      return entry(`How many ${askTens ? 'tens' : 'ones'} are in ${n}?`, askTens ? tens : ones, {
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

const unknownAddend: SkillDef = {
  id: 'us.math.g1.unknown-addend',
  title: 'Missing numbers',
  yearBand: 'g1',
  concepts: ['1.OA.D.8', 'addition'],
  hint: 'Count on from the number you have up to the total.',
  helpAtHome: 'Hide some of a group under your hand and ask how many are hidden.',
  generate: ({ rng, difficulty }): Item => {
    const total = rng.int(5, [10, 12, 15, 18, 20][difficulty - 1])
    const part = rng.int(1, total - 1)

    if (rng.chance(0.5)) {
      return entry(`${part} + ? = ${total}`, total - part, {
        maxDigits: 2,
        explanation: `${part} + ${total - part} = ${total}.`,
      })
    }
    return entry(`${total} − ? = ${part}`, total - part, {
      maxDigits: 2,
      explanation: `${total} − ${total - part} = ${part}.`,
    })
  },
}

const timeHalfHour: SkillDef = {
  id: 'us.math.g1.time',
  title: "Hours and half hours",
  yearBand: 'g1',
  concepts: ['1.MD.B.3', 'time'],
  hint: 'The long hand at the top means o’clock. Pointing down means half past.',
  helpAtHome: 'Say the time at breakfast and bedtime the same way each day.',
  generate: ({ rng }): Item => {
    const hour = rng.int(1, 12)
    const half = rng.chance(0.5)
    const shown = half ? `${hour}:30` : `${hour}:00`
    const answer = half ? `half past ${hour}` : `${hour} o'clock`
    const wrong = half
      ? [`${hour} o'clock`, `half past ${(hour % 12) + 1}`]
      : [`half past ${hour}`, `${(hour % 12) + 1} o'clock`]
    return mc(rng, `What time is this?\n${shown}`, answer, wrong, { explanation: `${shown} is ${answer}.` })
  },
}

/* ------------------------------------------------------------------ *
 * Grade 4
 * ------------------------------------------------------------------ */

const factorsPrimes: SkillDef = {
  id: 'us.math.g4.factors-primes',
  title: 'Factors, multiples and primes',
  yearBand: 'g4',
  prerequisites: ['us.math.g3.unknown-factor'],
  concepts: ['4.OA.B.4', 'factors'],
  hint: 'A factor divides exactly, with nothing left over.',
  helpAtHome: 'Ask how many ways a number of cookies can be shared into equal plates.',
  generate: ({ rng, difficulty }): Item => {
    if (rng.chance(0.5)) {
      const top = [20, 30, 40, 50, 50][difficulty - 1]
      const primes = Array.from({ length: top }, (_, i) => i + 2).filter(isPrime)
      const composites = Array.from({ length: top }, (_, i) => i + 2).filter((n) => !isPrime(n))
      const options = [...rng.shuffle(primes).slice(0, 3), ...rng.shuffle(composites).slice(0, 3)]
      return tapMany(rng, 'Tap every prime number.', options.map((v) => ({ value: v, correct: isPrime(v) })), {
        explanation: 'A prime number has exactly two factors: 1 and itself.',
      })
    }
    const n = rng.pick([12, 16, 18, 20, 24, 30, 36])
    const factors = Array.from({ length: n }, (_, i) => i + 1).filter((f) => n % f === 0)
    const nonFactors = Array.from({ length: n }, (_, i) => i + 1).filter((f) => n % f !== 0)
    const options = [...rng.shuffle(factors).slice(0, 3), ...rng.shuffle(nonFactors).slice(0, 3)]
    return tapMany(rng, `Tap every factor of ${n}.`, options.map((v) => ({ value: v, correct: n % v === 0 })), {
      explanation: `The factors of ${n} are ${factors.join(', ')}.`,
    })
  },
}

const equivalentFractions: SkillDef = {
  id: 'us.math.g4.equivalent-fractions',
  title: 'Equivalent fractions',
  yearBand: 'g4',
  prerequisites: ['us.math.g3.compare-fractions'],
  concepts: ['4.NF.A.1', 'equivalent-fractions'],
  hint: 'Multiply the top and the bottom by the same number.',
  helpAtHome: 'Two quarters of a pizza is the same as one half. Cut one and show it.',
  generate: ({ rng, difficulty }): Item => {
    const d = rng.pick([2, 3, 4, 5])
    const n = rng.int(1, d - 1)
    const k = rng.int(2, [3, 3, 4, 5, 6][difficulty - 1])
    const answer = `${n * k}/${d * k}`

    /* Every option proper, and none equal in value to the answer. */
    const wrong = [
      `${n * k}/${d}`,
      `${n}/${d * k}`,
      `${n * k + 1}/${d * k}`,
    ].filter((w) => {
      const [a, b] = w.split('/').map(Number)
      return a >= 1 && a < b && a / b !== (n * k) / (d * k)
    })

    return mc(rng, `Which fraction is the same as ${n}/${d}?`, answer, wrong, {
      explanation: `Multiply top and bottom by ${k}: ${n}/${d} = ${answer}.`,
    })
  },
}

const decimalsHundredths: SkillDef = {
  id: 'us.math.g4.decimals',
  title: 'Decimals to hundredths',
  yearBand: 'g4',
  concepts: ['4.NF.C.6', 'decimals'],
  hint: 'The first place after the point is tenths, the second is hundredths.',
  helpAtHome: 'Money is decimals: $0.07 is seven hundredths of a dollar.',
  generate: ({ rng }): Item => {
    if (rng.chance(0.5)) {
      const h = rng.int(11, 99)
      return mc(rng, `Which decimal is ${h}/100?`, `0.${h}`, [`0.0${h}`, `${h}.0`, `${h}.00`], {
        explanation: `${h} hundredths is written 0.${h}.`,
      })
    }
    const t = rng.int(1, 9)
    return mc(rng, `Which decimal is ${t}/10?`, `0.${t}`, [`0.0${t}`, `${t}.0`, `0.${t}${t}`], {
      explanation: `${t} tenths is written 0.${t}.`,
    })
  },
}

const angleMeasure: SkillDef = {
  id: 'us.math.g4.angles',
  title: 'Measuring angles',
  yearBand: 'g4',
  concepts: ['4.MD.C.5', 'angle-types'],
  hint: 'A right angle is 90°. Less is acute, more is obtuse.',
  helpAtHome: 'Open a door slowly and name the angle as it goes.',
  generate: ({ rng }): Item => {
    if (rng.chance(0.5)) {
      const kind = rng.pick(['acute', 'obtuse', 'right'] as const)
      const deg = kind === 'right' ? 90 : kind === 'acute' ? rng.int(10, 89) : rng.int(91, 179)
      return mc(rng, `An angle measures ${deg}°. What kind is it?`, kind, ['acute', 'obtuse', 'right'].filter((k) => k !== kind), {
        explanation: `${deg}° is ${kind}.`,
      })
    }
    const part = rng.pick([10, 20, 30, 40, 50, 60, 70, 80])
    return entry(`Two angles make a right angle. One is ${part}°.\nWhat is the other?`, 90 - part, {
      maxDigits: 3,
      suffix: '°',
      explanation: `90 − ${part} = ${90 - part}°.`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * Grade 5
 * ------------------------------------------------------------------ */

const decimalOperations: SkillDef = {
  id: 'us.math.g5.decimal-operations',
  title: 'Decimals times and divided',
  yearBand: 'g5',
  prerequisites: ['us.math.g4.decimals'],
  concepts: ['5.NBT.B.7', 'decimals'],
  hint: 'Multiplying or dividing by ten moves every digit one place.',
  helpAtHome: 'Ten items at $1.20 is $12.00. The digits move, the point does not.',
  generate: ({ rng, difficulty }): Item => {
    const by = rng.pick([10, 100])
    const whole = rng.int(2, [20, 40, 60, 90, 99][difficulty - 1])

    if (rng.chance(0.5)) {
      const value = whole * by
      return mc(rng, `What is ${value} ÷ ${by}?`, String(whole), [
        String(whole * (by === 10 ? 10 : 100)),
        String(whole / 10),
        String(whole + by),
      ], { explanation: `${value} ÷ ${by} = ${whole}.` })
    }

    const tenths = rng.int(1, 9)
    const value = `${whole}.${tenths}`
    const answer = whole * 10 + tenths
    return mc(rng, `What is ${value} × 10?`, String(answer), [
      `${whole}${tenths}0`,
      String(whole * 10),
      `${whole}.${tenths}0`,
    ].filter((o) => o !== String(answer)), {
      explanation: `Multiplying by 10 moves each digit one place left: ${value} × 10 = ${answer}.`,
    })
  },
}

const unlikeFractions: SkillDef = {
  id: 'us.math.g5.unlike-fractions',
  title: 'Fractions with different bottoms',
  yearBand: 'g5',
  prerequisites: ['us.math.g4.equivalent-fractions'],
  concepts: ['5.NF.A.1', 'add-fractions'],
  hint: 'Make the bottom numbers match first, then add the tops.',
  helpAtHome: 'A half plus a quarter is three quarters, not two sixths. Draw it if it helps.',
  generate: ({ rng }): Item => {
    /* Pairs where one denominator divides the other, so the common
       denominator is obvious and the total stays under one whole. */
    const cases: [number, number, number, number][] = [
      [1, 2, 1, 4],
      [1, 2, 1, 6],
      [1, 3, 1, 6],
      [1, 4, 1, 8],
      [1, 5, 1, 10],
      [1, 3, 1, 9],
      [1, 2, 1, 8],
      [2, 5, 1, 10],
    ]
    const [a, da, b, db] = rng.pick(cases)
    const common = Math.max(da, db)
    const sum = (a * (common / da)) + (b * (common / db))
    const g = gcd(sum, common)
    const answer = `${sum / g}/${common / g}`

    const wrong = [
      `${a + b}/${da + db}`,
      `${a + b}/${common}`,
      sum + 1 < common ? `${sum + 1}/${common}` : `${Math.max(1, sum - 1)}/${common}`,
    ].filter((w) => {
      const [n, d] = w.split('/').map(Number)
      return n >= 1 && n < d && n / d !== sum / common
    })

    return mc(rng, `${a}/${da} + ${b}/${db} = ?`, answer, wrong, {
      explanation: `${a}/${da} is ${a * (common / da)}/${common}, so ${a * (common / da)}/${common} + ${b * (common / db)}/${common} = ${answer}.`,
    })
  },
}

const volume: SkillDef = {
  id: 'us.math.g5.volume',
  title: 'Volume',
  yearBand: 'g5',
  prerequisites: ['us.math.g3.area'],
  concepts: ['5.MD.C.5', 'volume'],
  hint: 'Volume is how many unit cubes fill the box: length × width × height.',
  helpAtHome: 'Stack blocks into a box and count them, then check with the multiplication.',
  generate: ({ rng, difficulty }): Item => {
    const l = rng.int(2, [5, 6, 8, 10, 12][difficulty - 1])
    const w = rng.int(2, [5, 6, 8, 10, 12][difficulty - 1])
    const h = rng.int(2, [4, 5, 6, 8, 10][difficulty - 1])

    if (rng.chance(0.7)) {
      return entry(`A box is ${l} by ${w} by ${h} units.\nWhat is its volume?`, l * w * h, {
        maxDigits: 5,
        suffix: 'cubic units',
        explanation: `${l} × ${w} × ${h} = ${l * w * h} cubic units.`,
      })
    }
    return entry(
      `A box has a volume of ${l * w * h} cubic units.\nIt is ${l} by ${w}. How tall is it?`,
      h,
      { maxDigits: 3, suffix: 'units', explanation: `${l} × ${w} = ${l * w}, and ${l * w * h} ÷ ${l * w} = ${h}.` },
    )
  },
}

const coordinatePlane: SkillDef = {
  id: 'us.math.g5.coordinate-plane',
  title: 'The coordinate plane',
  yearBand: 'g5',
  concepts: ['5.G.A.1', 'coordinates'],
  hint: 'The first number goes across, the second goes up.',
  helpAtHome: 'Battleships is this exact skill.',
  generate: ({ rng, difficulty }): Item => {
    const max = [6, 8, 10, 12, 12][difficulty - 1]
    const x = rng.int(0, max)
    const y = rng.int(0, max)

    if (rng.chance(0.5)) {
      return mc(rng, `A point is ${x} across and ${y} up.\nHow is it written?`, `(${x}, ${y})`, [
        `(${y}, ${x})`,
        `${x}, ${y}`,
        `(${x + 1}, ${y})`,
      ].filter((o) => o !== `(${x}, ${y})`), { explanation: `Across first, then up: (${x}, ${y}).` })
    }
    const dy = rng.int(1, 4)
    return entry(`A point is at (${x}, ${y}). It moves up ${dy}.\nWhat is its new second number?`, y + dy, {
      maxDigits: 2,
      explanation: `${y} + ${dy} = ${y + dy}, so it is now at (${x}, ${y + dy}).`,
    })
  },
}

const numericalExpressions: SkillDef = {
  id: 'us.math.g5.expressions',
  title: 'Order of operations',
  yearBand: 'g5',
  concepts: ['5.OA.A.1', 'order-of-operations'],
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
    /* Floored, so the answer never goes negative. */
    const take = Math.min(c, a * b - 1)
    return entry(`${a} × ${b} − ${take} = ?`, a * b - take, {
      maxDigits: 4,
      explanation: `Multiply first: ${a} × ${b} = ${a * b}, then − ${take} = ${a * b - take}.`,
    })
  },
}

export const usKNumber: SkillDef[] = [countToHundred, compareNumbers]
export const usKOps: SkillDef[] = [addWithinTen]
export const usKGeometry: SkillDef[] = [namedShapes]

export const usG1Number: SkillDef[] = [tensAndOnes]
export const usG1Ops: SkillDef[] = [unknownAddend]
export const usG1Measurement: SkillDef[] = [timeHalfHour]

export const usG4Number: SkillDef[] = [factorsPrimes]
export const usG4Fractions: SkillDef[] = [equivalentFractions, decimalsHundredths]
export const usG4Measurement: SkillDef[] = [angleMeasure]

export const usG5Number: SkillDef[] = [decimalOperations]
export const usG5Ops: SkillDef[] = [numericalExpressions]
export const usG5Fractions: SkillDef[] = [unlikeFractions]
export const usG5Measurement: SkillDef[] = [volume]
export const usG5Geometry: SkillDef[] = [coordinatePlane]
