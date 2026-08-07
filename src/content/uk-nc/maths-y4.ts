/**
 * England National Curriculum — Year 4 maths.
 *
 * Written against the **statutory programmes of study for mathematics, Key
 * Stage 2** (Department for England's DfE, national curriculum in England).
 * Topic scope and the year it lands in come from that document; every question
 * is generated here.
 *
 * The Year 4 statutory content, and where each item below sits in it:
 *
 *   Number and place value   4-digit place value · counting back through zero
 *                            · rounding to 10/100/1000 · Roman numerals to 100
 *   Addition and subtraction 4-digit column methods
 *   Multiplication/division  tables to 12 × 12 · 2- and 3-digit by 1-digit
 *   Fractions and decimals   hundredths · tenths and hundredths as decimals
 *                            · dividing by 10 and 100
 *   Measurement              converting units · perimeter of rectilinear shapes
 *   Geometry                 acute and obtuse angles · lines of symmetry
 *                            · coordinates in the first quadrant
 *   Statistics               bar charts and time graphs
 *
 * Two things deliberately different from the Nigerian pack rather than
 * translated from it: Roman numerals arrive here in Year 4 (Nigeria teaches
 * them at Basic 3), and negative numbers appear via counting back through
 * zero, which the UK introduces years before Nigeria does.
 */

import type { Item, SkillDef } from '../../engine/types'
import { entry, mc, order, tapMany } from '../shared/authoring'

/** Roman numerals to 100 — the Year 4 range, I to C. */
const ROMAN: [number, string][] = [
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

const toRoman = (n: number): string => {
  let left = n
  let out = ''
  for (const [value, glyph] of ROMAN) {
    while (left >= value) {
      out += glyph
      left -= value
    }
  }
  return out
}

/* ------------------------------------------------------------------ *
 * Number and place value
 * ------------------------------------------------------------------ */

const fourDigitPlaceValue: SkillDef = {
  id: 'uk.maths.y4.place-value-4digit',
  title: 'Thousands, hundreds, tens and ones',
  yearBand: 'y4',
  prerequisites: ['uk.maths.y3.place-value'],
  concepts: ['place-value-large'],
  hint: 'Count the columns from the right: ones, tens, hundreds, thousands.',
  helpAtHome: 'Read a four-digit number off a receipt and ask what the second digit is worth.',
  generate: ({ rng, difficulty }): Item => {
    const n = rng.int(1000, [4999, 9999, 9999, 9999, 9999][difficulty - 1])
    const s = String(n)
    /* A zero digit is worth zero in every column, so every distractor
       collapses to the same value and the question cannot be answered. */
    const positions = [...s].map((c, i) => (c === '0' ? -1 : i)).filter((i) => i >= 0)
    const pos = rng.pick(positions)
    const digit = Number(s[pos])
    const place = s.length - 1 - pos
    const value = digit * 10 ** place
    const names = ['ones', 'tens', 'hundreds', 'thousands']

    if (rng.chance(0.5)) {
      const wrong = [place - 1, place + 1, place - 2]
        .filter((p) => p >= 0 && p <= 3 && p !== place)
        .map((p) => digit * 10 ** p)
      return mc(rng, `In ${n.toLocaleString('en')}, what is the digit ${digit} worth?`, value.toLocaleString('en'),
        wrong.map((v) => v.toLocaleString('en')), {
        explanation: `The ${digit} sits in the ${names[place]} column, so it is worth ${value.toLocaleString('en')}.`,
      })
    }

    const step = rng.pick([1000, 1000, 100])
    const up = rng.chance(0.5)
    const answer = up ? n + step : n - step
    return entry(`What is ${step} ${up ? 'more' : 'less'} than ${n.toLocaleString('en')}?`, answer, {
      maxDigits: 5,
      explanation: `${n.toLocaleString('en')} ${up ? '+' : '−'} ${step} = ${answer.toLocaleString('en')}.`,
    })
  },
}

const countBackThroughZero: SkillDef = {
  id: 'uk.maths.y4.negative-numbers',
  title: 'Counting back past zero',
  yearBand: 'y4',
  prerequisites: ['uk.maths.y3.compare-order'],
  concepts: ['negative-numbers'],
  hint: 'Below zero the numbers count the other way: −1, −2, −3.',
  helpAtHome: 'A freezer thermometer or a cold-weather forecast is the easiest place to see this.',
  generate: ({ rng, difficulty }): Item => {
    const span = [4, 6, 8, 10, 12][difficulty - 1]
    /*
     * A real minus sign, not a hyphen. Every other sum in the product renders
     * subtraction as U+2212, and "-6" sitting beside "6 − 12" in the same
     * question looks like two different symbols to a child who is still
     * learning what the sign means.
     */
    const deg = (v: number): string => `${v < 0 ? '−' : ''}${Math.abs(v)}°C`

    if (rng.chance(0.5)) {
      const from = rng.int(1, span)
      const step = rng.int(from + 1, from + span)
      const answer = from - step
      return mc(rng, `The temperature is ${deg(from)}. It falls by ${step} degrees.\nWhat is it now?`, deg(answer), [
        deg(step - from),
        deg(from + step),
        deg(answer - 1),
      ], { explanation: `${from} − ${step} = −${Math.abs(answer)}, so it is ${deg(answer)}.` })
    }

    /* Ordering across zero — the thing that actually trips children up. */
    const values = rng.shuffle([-rng.int(1, span), -rng.int(1, span), 0, rng.int(1, span), rng.int(1, span)])
    const unique = [...new Set(values)].slice(0, 4)
    return order(
      rng,
      'Put these temperatures in order, coldest first.',
      [...unique].sort((a, b) => a - b).map(deg),
      { explanation: 'Below zero, the bigger the number the colder it is.' },
    )
  },
}

const rounding: SkillDef = {
  id: 'uk.maths.y4.rounding',
  title: 'Rounding to 10, 100 and 1000',
  yearBand: 'y4',
  prerequisites: ['uk.maths.y4.place-value-4digit'],
  concepts: ['rounding-estimation'],
  hint: 'Look at the digit just to the right of the place you are rounding to. Five or more rounds up.',
  helpAtHome: 'Round the shopping total to the nearest pound before paying, then check the change.',
  generate: ({ rng, difficulty }): Item => {
    const to = rng.pick(difficulty <= 2 ? [10, 100] : [10, 100, 1000])
    let n = rng.int(to * 2, 9999)
    if (n % to === 0) n += rng.int(1, to - 1)
    const answer = Math.round(n / to) * to
    const down = Math.floor(n / to) * to
    const up = Math.ceil(n / to) * to
    return mc(
      rng,
      `Round ${n.toLocaleString('en')} to the nearest ${to === 1000 ? 'thousand' : to === 100 ? 'hundred' : 'ten'}.`,
      answer.toLocaleString('en'),
      [
        (answer === down ? up : down).toLocaleString('en'),
        (answer + to).toLocaleString('en'),
        (answer - to).toLocaleString('en'),
      ],
      { explanation: `${n.toLocaleString('en')} rounds to ${answer.toLocaleString('en')}.` },
    )
  },
}

const romanNumerals: SkillDef = {
  id: 'uk.maths.y4.roman-numerals',
  title: 'Roman numerals to 100',
  yearBand: 'y4',
  concepts: ['roman-numerals'],
  hint: 'I is 1, V is 5, X is 10, L is 50, C is 100. A smaller letter before a bigger one takes it away.',
  helpAtHome: 'Clock faces and the numbers at the front of books are full of these.',
  generate: ({ rng, difficulty }): Item => {
    const top = [20, 40, 60, 100, 100][difficulty - 1]
    const n = rng.int(1, top)

    if (rng.chance(0.5)) {
      const wrong = [n + 1, n - 1, n + 10].filter((v) => v >= 1 && v !== n).map(toRoman)
      return mc(rng, `Which Roman numeral is ${n}?`, toRoman(n), wrong, {
        explanation: `${n} is written ${toRoman(n)}.`,
      })
    }
    return entry(`What number is ${toRoman(n)}?`, n, {
      maxDigits: 3,
      explanation: `${toRoman(n)} is ${n}.`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * Calculation
 * ------------------------------------------------------------------ */

const fourDigitColumn: SkillDef = {
  id: 'uk.maths.y4.column-4digit',
  title: 'Adding and subtracting to 9999',
  yearBand: 'y4',
  prerequisites: ['uk.maths.y3.add-subtract-3digit'],
  concepts: ['column-addition', 'column-subtraction'],
  hint: 'Line the columns up from the right and work one column at a time.',
  helpAtHome: 'Ask for an estimate first. Knowing the answer is "about 5000" catches most slips.',
  generate: ({ rng, difficulty }): Item => {
    const top = [2999, 4999, 9999, 9999, 9999][difficulty - 1]
    if (rng.chance(0.5)) {
      const a = rng.int(1000, top)
      const b = rng.int(1000, Math.min(top, 9999 - a))
      return entry(`${a} + ${b} = ?`, a + b, {
        maxDigits: 5,
        explanation: `${a} + ${b} = ${a + b}.`,
      })
    }
    /* Subtraction never goes below zero: negatives are a different topic. */
    const a = rng.int(2000, top)
    const b = rng.int(1000, a - 1)
    return entry(`${a} − ${b} = ?`, a - b, {
      maxDigits: 5,
      explanation: `${a} − ${b} = ${a - b}.`,
    })
  },
}

const tablesTo12: SkillDef = {
  id: 'uk.maths.y4.tables-to-12',
  title: 'All tables to 12 × 12',
  yearBand: 'y4',
  prerequisites: ['uk.maths.y3.times-tables'],
  concepts: ['times-tables'],
  hint: 'If you know 6 × 7, you already know 7 × 6.',
  helpAtHome:
    'Year 4 ends with a national times-table check, so speed matters as much as accuracy here. Short and daily beats long and weekly.',
  generate: ({ rng, difficulty }): Item => {
    const hard = [6, 7, 8, 9, 11, 12]
    const a = difficulty <= 2 ? rng.int(2, 9) : rng.pick(hard)
    const b = rng.int(2, 12)

    if (rng.chance(0.65)) {
      return entry(`${a} × ${b} = ?`, a * b, { explanation: `${a} × ${b} = ${a * b}.` })
    }
    /* The inverse, which is what division fluency actually rests on. */
    return entry(`${a * b} ÷ ${b} = ?`, a, {
      maxDigits: 2,
      explanation: `${b} × ${a} = ${a * b}, so ${a * b} ÷ ${b} = ${a}.`,
    })
  },
}

const multiplyByOneDigit: SkillDef = {
  id: 'uk.maths.y4.multiply-1digit',
  title: 'Multiplying bigger numbers',
  yearBand: 'y4',
  prerequisites: ['uk.maths.y4.tables-to-12'],
  concepts: ['short-multiplication'],
  hint: 'Multiply the ones first, then the tens, then the hundreds.',
  helpAtHome: 'Six packs of 24 pencils is exactly this sum, and worth doing out loud.',
  generate: ({ rng, difficulty }): Item => {
    const big = difficulty >= 4 ? rng.int(100, 999) : rng.int(12, 99)
    const small = rng.int(3, 9)
    return entry(`${big} × ${small} = ?`, big * small, {
      maxDigits: 5,
      explanation: `${big} × ${small} = ${big * small}.`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * Fractions and decimals
 * ------------------------------------------------------------------ */

const hundredths: SkillDef = {
  id: 'uk.maths.y4.hundredths',
  title: 'Tenths and hundredths',
  yearBand: 'y4',
  concepts: ['decimals'],
  hint: 'The first place after the point is tenths, the second is hundredths.',
  helpAtHome: 'Money is the easiest way in: £0.07 is seven hundredths of a pound.',
  generate: ({ rng }): Item => {
    const variant = rng.int(1, 3)

    if (variant === 1) {
      const t = rng.int(1, 9)
      return mc(rng, `Which decimal is ${t}/10?`, `0.${t}`, [`0.0${t}`, `${t}.0`, `0.${t}${t}`], {
        explanation: `${t} tenths is written 0.${t}.`,
      })
    }
    if (variant === 2) {
      const h = rng.int(11, 99)
      return mc(rng, `Which decimal is ${h}/100?`, `0.${h}`, [`0.0${h}`, `${h}.0`, `${h}.00`], {
        explanation: `${h} hundredths is written 0.${h}.`,
      })
    }
    /* Dividing by 10 and 100 — statutory in Year 4, and the source of most
       decimal confusion later. */
    const n = rng.int(2, 99) * 10
    const by = rng.pick([10, 100])
    const answer = n / by
    return mc(rng, `What is ${n} ÷ ${by}?`, String(answer), [
      String(n / (by === 10 ? 100 : 10)),
      String(n * by),
      String(answer * 10),
    ], { explanation: `Dividing by ${by} moves every digit ${by === 10 ? 'one place' : 'two places'} to the right: ${answer}.` })
  },
}

/* ------------------------------------------------------------------ *
 * Measurement and geometry
 * ------------------------------------------------------------------ */

const perimeter: SkillDef = {
  id: 'uk.maths.y4.perimeter',
  title: 'Perimeter',
  yearBand: 'y4',
  concepts: ['perimeter'],
  hint: 'Perimeter is the whole way round the outside.',
  helpAtHome: 'Measure round a table or a rug with a tape and add the sides up.',
  generate: ({ rng, difficulty }): Item => {
    const w = rng.int(2, [8, 10, 15, 20, 25][difficulty - 1])
    const h = rng.int(2, [8, 10, 15, 20, 25][difficulty - 1])

    if (rng.chance(0.6)) {
      return entry(`A rectangle is ${w} cm wide and ${h} cm tall.\nWhat is its perimeter?`, 2 * (w + h), {
        maxDigits: 3,
        suffix: 'cm',
        explanation: `${w} + ${h} + ${w} + ${h} = ${2 * (w + h)} cm.`,
      })
    }
    /* Working a side back from the perimeter. */
    const perim = 2 * (w + h)
    return entry(
      `A rectangle has a perimeter of ${perim} cm.\nIt is ${w} cm wide. How tall is it?`,
      h,
      { maxDigits: 3, suffix: 'cm', explanation: `${perim} ÷ 2 = ${w + h}, and ${w + h} − ${w} = ${h} cm.` },
    )
  },
}

const anglesAndSymmetry: SkillDef = {
  id: 'uk.maths.y4.angles-symmetry',
  title: 'Acute, obtuse and symmetry',
  yearBand: 'y4',
  concepts: ['angle-types', 'symmetry'],
  hint: 'Acute is smaller than a corner of a page. Obtuse is bigger.',
  helpAtHome: 'Open a door slowly and name the angle as it goes: acute, right, obtuse.',
  generate: ({ rng }): Item => {
    if (rng.chance(0.5)) {
      const kind = rng.pick(['acute', 'obtuse', 'right'] as const)
      const deg = kind === 'right' ? 90 : kind === 'acute' ? rng.int(10, 89) : rng.int(91, 179)
      return mc(rng, `An angle measures ${deg}°. What kind of angle is it?`, kind, ['acute', 'obtuse', 'right'].filter((k) => k !== kind), {
        explanation:
          kind === 'right'
            ? '90° is exactly a right angle.'
            : kind === 'acute'
              ? `${deg}° is less than 90°, so it is acute.`
              : `${deg}° is more than 90° but less than 180°, so it is obtuse.`,
      })
    }

    /* Lines of symmetry, as a fact about named shapes. */
    const shapes: [string, number][] = [
      ['square', 4],
      ['rectangle', 2],
      ['equilateral triangle', 3],
      ['regular pentagon', 5],
      ['regular hexagon', 6],
      ['circle', 8],
    ]
    const [shape, lines] = rng.pick(shapes.filter(([s]) => s !== 'circle'))
    return mc(rng, `How many lines of symmetry does a ${shape} have?`, lines, [lines + 1, lines - 1, lines * 2].filter((n) => n > 0 && n !== lines), {
      explanation: `A ${shape} has ${lines} lines of symmetry.`,
    })
  },
}

const coordinates: SkillDef = {
  id: 'uk.maths.y4.coordinates',
  title: 'Coordinates',
  yearBand: 'y4',
  concepts: ['coordinates'],
  hint: 'Along the corridor first, then up the stairs.',
  helpAtHome: 'Battleships is this exact skill, and better practice than any worksheet.',
  generate: ({ rng, difficulty }): Item => {
    const max = [5, 6, 8, 10, 10][difficulty - 1]
    const x = rng.int(0, max)
    const y = rng.int(0, max)

    if (rng.chance(0.5)) {
      return mc(rng, `A point is ${x} across and ${y} up.\nHow are its coordinates written?`, `(${x}, ${y})`, [
        `(${y}, ${x})`,
        `${x}, ${y}`,
        `(${x + 1}, ${y})`,
      ].filter((o) => o !== `(${x}, ${y})`), {
        explanation: `Across first, then up: (${x}, ${y}).`,
      })
    }

    const dx = rng.int(1, 4)
    return entry(
      `A counter is at (${x}, ${y}). It moves ${dx} squares to the right.\nWhat is its new first number?`,
      x + dx,
      { maxDigits: 2, explanation: `${x} + ${dx} = ${x + dx}, so it is now at (${x + dx}, ${y}).` },
    )
  },
}

/* ------------------------------------------------------------------ *
 * Statistics
 * ------------------------------------------------------------------ */

const barCharts: SkillDef = {
  id: 'uk.maths.y4.bar-charts',
  title: 'Reading bar charts',
  yearBand: 'y4',
  concepts: ['bar-chart'],
  hint: 'Read across from the top of the bar to the numbers on the side.',
  helpAtHome: 'Any chart in a newspaper works. Ask which is biggest, and by how much.',
  generate: ({ rng, locale }): Item => {
    const labels = rng.shuffle([...locale.names]).slice(0, 4)
    const values = labels.map(() => rng.int(2, 20))
    const rows = labels.map((l, i) => `${l}: ${values[i]}`).join('\n')
    const most = values.indexOf(Math.max(...values))
    const least = values.indexOf(Math.min(...values))

    /* Ties make "who has most" unanswerable, so only ask when there is one. */
    const uniqueMax = values.filter((v) => v === values[most]).length === 1
    const uniqueMin = values.filter((v) => v === values[least]).length === 1

    if (uniqueMax && rng.chance(0.4)) {
      return mc(rng, `Stickers collected:\n${rows}\n\nWho collected the most?`, labels[most], labels.filter((_, i) => i !== most), {
        explanation: `${labels[most]} has ${values[most]}, more than anyone else.`,
      })
    }
    if (uniqueMax && uniqueMin && rng.chance(0.5)) {
      return entry(
        `Stickers collected:\n${rows}\n\nHow many more does ${labels[most]} have than ${labels[least]}?`,
        values[most] - values[least],
        { maxDigits: 3, explanation: `${values[most]} − ${values[least]} = ${values[most] - values[least]}.` },
      )
    }
    const total = values.reduce((a, b) => a + b, 0)
    return entry(`Stickers collected:\n${rows}\n\nHow many altogether?`, total, {
      maxDigits: 3,
      explanation: `${values.join(' + ')} = ${total}.`,
    })
  },
}

const measurementUnits: SkillDef = {
  id: 'uk.maths.y4.convert-units',
  title: 'Changing units',
  yearBand: 'y4',
  concepts: ['unit-conversion'],
  hint: '1000 metres make a kilometre, 1000 grams make a kilogram, 60 minutes make an hour.',
  helpAtHome: 'Reading a recipe in grams and a distance in kilometres on the same afternoon does this for you.',
  generate: ({ rng }): Item => {
    const cases: [string, string, number][] = [
      ['kilometres', 'metres', 1000],
      ['kilograms', 'grams', 1000],
      ['litres', 'millilitres', 1000],
      ['metres', 'centimetres', 100],
      ['hours', 'minutes', 60],
      ['minutes', 'seconds', 60],
    ]
    const [big, small, per] = rng.pick(cases)
    const n = rng.int(2, 9)

    if (rng.chance(0.6)) {
      return entry(`How many ${small} are there in ${n} ${big}?`, n * per, {
        maxDigits: 5,
        explanation: `1 ${big.replace(/s$/, '')} is ${per} ${small}, so ${n} × ${per} = ${n * per}.`,
      })
    }
    return entry(`How many ${big} is ${n * per} ${small}?`, n, {
      maxDigits: 3,
      explanation: `${n * per} ÷ ${per} = ${n}.`,
    })
  },
}

const multiplesTapMany: SkillDef = {
  id: 'uk.maths.y4.multiples',
  title: 'Counting in 6s, 7s, 9s and 25s',
  yearBand: 'y4',
  concepts: ['multiples'],
  hint: 'Keep adding the same number on each time.',
  helpAtHome: 'Count up in 25s together — it makes quarters of a pound obvious later.',
  generate: ({ rng, difficulty }): Item => {
    const step = rng.pick([6, 7, 9, 25, 1000])
    const reach = [4, 6, 8, 10, 12][difficulty - 1]

    /*
     * Draw the right answers and the near-misses from the whole range rather
     * than from a fixed offset. Four step values against four starting points
     * gave sixteen possible questions in total, which a child would exhaust in
     * three sessions.
     */
    const correct = rng.shuffle(Array.from({ length: reach }, (_, i) => step * (i + 1))).slice(0, 3)
    const decoys: number[] = []
    while (decoys.length < 3) {
      const near = step * rng.int(1, reach) + rng.pick([-2, -1, 1, 2, 3])
      if (near > 0 && near % step !== 0 && !decoys.includes(near)) decoys.push(near)
    }

    return tapMany(
      rng,
      `Tap every number you would say counting up in ${step}s.`,
      [...correct, ...decoys].map((v) => ({ value: v, correct: v % step === 0 })),
      { explanation: `Multiples of ${step} divide exactly by ${step}.` },
    )
  },
}

export const ukY4Number: SkillDef[] = [fourDigitPlaceValue, countBackThroughZero, rounding, romanNumerals, multiplesTapMany]
export const ukY4Calculation: SkillDef[] = [fourDigitColumn, tablesTo12, multiplyByOneDigit]
export const ukY4Fractions: SkillDef[] = [hundredths]
export const ukY4Measurement: SkillDef[] = [perimeter, measurementUnits]
export const ukY4Geometry: SkillDef[] = [anglesAndSymmetry, coordinates]
export const ukY4Statistics: SkillDef[] = [barCharts]
