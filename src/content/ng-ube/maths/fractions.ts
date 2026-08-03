/** Fractions — halves, quarters, thirds and simple comparison. */

import type { Item, SkillDef, StrandDef, Visual } from '../../../engine/types'
import { entry, mc, order, person, thing } from '../../shared/authoring'
import { upperFractionSkills } from './upper'

const FRACTION_NAME: Record<string, string> = {
  '1/2': 'one half',
  '1/3': 'one third',
  '2/3': 'two thirds',
  '1/4': 'one quarter',
  '2/4': 'two quarters',
  '3/4': 'three quarters',
  '1/5': 'one fifth',
  '2/5': 'two fifths',
  '1/6': 'one sixth',
  '5/6': 'five sixths',
  '1/8': 'one eighth',
  '3/8': 'three eighths',
}

const name = (num: number, den: number) => FRACTION_NAME[`${num}/${den}`] ?? `${num} over ${den}`

/**
 * Wrong answers that are still real fractions.
 *
 * An improper distractor like 2/1 teaches nothing — a child at this stage has
 * never met a fraction bigger than a whole, so it is not a mistake they could
 * plausibly make. Every option here is a proper fraction.
 */
function fractionDistractors(num: number, den: number): string[] {
  const candidates = [
    [num + 1, den],
    [num - 1, den],
    [num, den + 1],
    [num, den - 1],
    [num + 1, den + 1],
    [den - num, den],
  ]
  const seen = new Set([`${num}/${den}`])
  const out: string[] = []
  for (const [n, d] of candidates) {
    const key = `${n}/${d}`
    if (n < 1 || d < 2 || n >= d || seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}

const shape = (rng: { pick: <T>(a: readonly T[]) => T }) =>
  rng.pick(['circle', 'rect', 'bar'] as const)

const halvesQuarters: SkillDef = {
  id: 'ng.maths.fractions.halves-quarters',
  title: 'Halves and quarters',
  yearBand: 'b2',
  concepts: ['halves-quarters'],
  hint: 'Count how many equal parts there are altogether, then how many are shaded.',
  helpAtHome: 'Cut fruit or bread into halves and quarters and name each piece.',
  generate: ({ rng, difficulty }): Item => {
    // Halves and quarters are the point, but eighths and thirds of the same
    // shapes keep the pictures from becoming familiar within a week.
    const den = difficulty <= 1 ? 2 : rng.pick([[2], [2, 4], [2, 3, 4], [2, 3, 4, 6], [2, 3, 4, 6, 8]][difficulty - 1])
    const num = rng.int(1, den - 1)
    const visual: Visual = { kind: 'fraction', shape: shape(rng), parts: den, shaded: num }

    if (rng.chance(0.5)) {
      return mc(rng, 'What fraction is shaded?', `${num}/${den}`, fractionDistractors(num, den), {
        speak: 'What fraction is shaded?',
        visual,
        explanation: `${num} out of ${den} equal parts are shaded — that is ${name(num, den)}.`,
      })
    }

    return mc(rng, `Which picture shows ${name(num, den)}?`, { visual }, [
      { visual: { kind: 'fraction', shape: visual.shape, parts: den, shaded: den - num } },
      { visual: { kind: 'fraction', shape: visual.shape, parts: den + 1, shaded: num } },
      { visual: { kind: 'fraction', shape: visual.shape, parts: den, shaded: Math.max(1, num - 1) } },
    ])
  },
}

const thirds: SkillDef = {
  id: 'ng.maths.fractions.thirds',
  title: 'Thirds and more',
  yearBand: 'b3',
  prerequisites: ['ng.maths.fractions.halves-quarters'],
  concepts: ['unit-fractions'],
  hint: 'The bottom number tells you how many equal parts the whole was cut into.',
  helpAtHome: 'Fold a strip of paper into three equal parts and shade one third.',
  generate: ({ rng, difficulty }): Item => {
    const den = rng.pick([[3], [3, 4], [3, 4, 5], [3, 4, 5, 6], [3, 4, 5, 6, 8]][difficulty - 1])
    const num = rng.int(1, den - 1)
    const visual: Visual = { kind: 'fraction', shape: shape(rng), parts: den, shaded: num }

    if (rng.chance(0.4)) {
      return entry(`The shape is cut into equal parts.\nHow many parts are shaded?`, num, {
        visual,
        maxDigits: 1,
        explanation: `${num} of the ${den} equal parts are shaded.`,
      })
    }

    return mc(rng, 'What fraction is shaded?', `${num}/${den}`, fractionDistractors(num, den), {
      visual,
      explanation: `${num} out of ${den} equal parts — ${name(num, den)}.`,
    })
  },
}

const fractionOfSet: SkillDef = {
  id: 'ng.maths.fractions.of-set',
  title: 'Fractions of a group',
  yearBand: 'b3',
  prerequisites: ['ng.maths.fractions.thirds', 'ng.maths.ops.division-sharing'],
  concepts: ['fraction-of-quantity'],
  hint: 'Share them into equal groups first, then take the number you need.',
  helpAtHome: 'Ask for half of the oranges, or a quarter of the sweets, when sharing at home.',
  generate: ({ rng, difficulty, locale }): Item => {
    const den = rng.pick([[2], [2, 4], [2, 3, 4], [2, 3, 4, 5], [2, 3, 4, 5, 6]][difficulty - 1])
    const each = rng.int(2, difficulty >= 4 ? 8 : 5)
    const total = den * each
    const num = difficulty >= 3 ? rng.int(1, den - 1) : 1
    const answer = each * num
    const noun = thing(rng, locale)
    const who = person(rng, locale)

    return entry(`${who} has ${total} ${noun.many}.\nWhat is ${name(num, den)} of ${total}?`, answer, {
      visual: { kind: 'objects', glyph: noun.glyph, count: total, perRow: Math.min(10, total) },
      explanation: `${total} ÷ ${den} = ${each}, and ${each} × ${num} = ${answer}.`,
    })
  },
}

const compareFractions: SkillDef = {
  id: 'ng.maths.fractions.compare',
  title: 'Which fraction is bigger?',
  yearBand: 'b3',
  prerequisites: ['ng.maths.fractions.thirds'],
  concepts: ['compare-fractions'],
  hint: 'The more pieces you cut a whole into, the smaller each piece is.',
  helpAtHome: 'Compare half a chocolate bar with a quarter — which piece would you rather have?',
  generate: ({ rng, difficulty }): Item => {
    const dens = [[2, 4], [2, 3, 4], [2, 3, 4, 6], [2, 3, 4, 5, 6], [2, 3, 4, 5, 6, 8]][difficulty - 1]

    if (rng.chance(0.5)) {
      // Same numerator, different denominators — the core idea.
      const [d1, d2] = rng.sample(dens, 2)
      const bigger = d1 < d2 ? `1/${d1}` : `1/${d2}`
      const smaller = d1 < d2 ? `1/${d2}` : `1/${d1}`
      const askBigger = rng.chance(0.5)
      return mc(
        rng,
        askBigger ? 'Which fraction is BIGGER?' : 'Which fraction is SMALLER?',
        askBigger ? bigger : smaller,
        [askBigger ? smaller : bigger],
        {
          explanation: `Fewer, bigger pieces: ${bigger} is bigger than ${smaller}.`,
        },
      )
    }

    // Same denominator, different numerators.
    const den = rng.pick(dens.filter((d) => d >= 3))
    const [n1, n2] = rng.sample(Array.from({ length: den - 1 }, (_, i) => i + 1), 2)
    const bigger = Math.max(n1, n2)
    const smaller = Math.min(n1, n2)
    return order(rng, 'Put these in order, smallest first', [`${smaller}/${den}`, `${bigger}/${den}`], {
      explanation: `With the same size pieces, more pieces means more: ${bigger}/${den} is bigger.`,
    })
  },
}

const equivalent: SkillDef = {
  id: 'ng.maths.fractions.equivalent',
  title: 'Fractions that match',
  yearBand: 'b3',
  prerequisites: ['ng.maths.fractions.compare'],
  concepts: ['equivalent-fractions'],
  hint: 'Look at how much is shaded, not how many pieces there are.',
  helpAtHome: 'Show that two quarters of a bar covers exactly the same as one half.',
  generate: ({ rng, difficulty }): Item => {
    /*
     * Generated rather than listed. A fixed table of eight pairs meant a
     * child had seen every equivalence in the skill within a few sessions;
     * building them from a base fraction and a multiplier gives far more,
     * and lets difficulty control how big the numbers get.
     */
    const maxDen = [4, 6, 8, 10, 12][difficulty - 1]
    const bases: [number, number][] = [
      [1, 2],
      [1, 3],
      [2, 3],
      [1, 4],
      [3, 4],
      [1, 5],
      [2, 5],
      [3, 5],
      [4, 5],
      [1, 6],
      [5, 6],
    ].filter(([, d]) => d * 2 <= maxDen) as [number, number][]

    const [baseN, baseD] = bases.length ? rng.pick(bases) : [1, 2]
    const factor = rng.int(2, Math.max(2, Math.floor(maxDen / baseD)))
    const a = `${baseN}/${baseD}`
    const b = `${baseN * factor}/${baseD * factor}`
    const an = baseN
    const ad = baseD
    const bn = baseN * factor
    const bd = baseD * factor

    if (rng.chance(0.5)) {
      return mc(rng, `Which fraction is the same as ${a}?`, b, fractionDistractors(bn, bd), {
        visual: { kind: 'fraction', shape: 'bar', parts: ad, shaded: an },
        explanation: `${a} and ${b} cover the same amount.`,
      })
    }

    // Same amount shaded, different number of pieces — pick the match.
    return mc(
      rng,
      `Which picture shades the same amount as this one?`,
      { visual: { kind: 'fraction', shape: 'bar', parts: bd, shaded: bn } },
      [
        { visual: { kind: 'fraction', shape: 'bar', parts: bd, shaded: Math.max(1, bn - 1) } },
        { visual: { kind: 'fraction', shape: 'bar', parts: bd, shaded: Math.min(bd, bn + 1) } },
        { visual: { kind: 'fraction', shape: 'bar', parts: ad + bd, shaded: an } },
      ],
      {
        visual: { kind: 'fraction', shape: 'circle', parts: ad, shaded: an },
        explanation: `${a} and ${b} cover the same amount, just cut differently.`,
      },
    )
  },
}

export const fractionsStrand: StrandDef = {
  id: 'ng.maths.fractions',
  name: 'Fraction Grove',
  blurb: 'Halves, quarters, thirds and sharing a whole',
  theme: 'grove',
  skills: [halvesQuarters, thirds, fractionOfSet, compareFractions, equivalent, ...upperFractionSkills],
}
