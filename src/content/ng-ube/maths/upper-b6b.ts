/**
 * Basic 6 maths, second tranche.
 *
 * Same source as `upper-b6.ts`: the Lagos State Unified Scheme of Work for
 * Primary Schools, 2021 Edition (Mathematics, Primary 4–6). Topic list and
 * placement from the scheme; every question generated here.
 *
 *   Primary 6, Term 2  wk 9   Scale drawing — objects, maps, distance
 *                      wk 10  Approximation and estimation
 *   Primary 6, Term 3         Percentage increase and decrease
 *                      wk 4   Indices (powers)
 *
 * Left for a later pass, still in the scheme and still missing: ratio and
 * proportion, simple equations, plane figures and volume, and division of
 * decimals.
 */

import type { Item, SkillDef } from '../../../engine/types'
import { entry, mc } from '../../shared/authoring'

/**
 * A power written the way it appears on paper.
 *
 * Per digit, so it works for any exponent. A fixed table ran out at 6 and fell
 * back to a caret, which put "3⁶" and "3^7" side by side in the same list of
 * options — inconsistent to read, and a hint about which one is the answer.
 */
const SUP_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const sup = (n: number): string =>
  String(n)
    .split('')
    .map((d) => SUP_DIGITS[Number(d)])
    .join('')

const approximation: SkillDef = {
  id: 'ng.maths.number.approximation',
  title: 'Rounding and estimating',
  yearBand: 'b6',
  prerequisites: ['ng.maths.number.large'],
  concepts: ['rounding-estimation'],
  hint: 'Look at the digit just to the right of the place you are rounding to. Five or more rounds up.',
  helpAtHome:
    'At the market, ask him to estimate the total before you pay. Being close quickly is more useful than being exact slowly.',
  generate: ({ rng, difficulty }): Item => {
    const variant = rng.int(1, 3)

    if (variant === 1) {
      const to = rng.pick(difficulty <= 2 ? [10, 100] : [10, 100, 1000])
      /*
       * Never a number already sitting on the boundary: "round 4500 to the
       * nearest hundred" answers itself and teaches nothing.
       */
      let n = rng.int(to * 2, [9999, 9999, 99999, 99999, 999999][difficulty - 1])
      if (n % to === 0) n += rng.int(1, to - 1)
      const answer = Math.round(n / to) * to
      const name = to === 10 ? 'ten' : to === 100 ? 'hundred' : 'thousand'
      const down = Math.floor(n / to) * to
      const up = Math.ceil(n / to) * to
      return mc(
        rng,
        `Round ${n.toLocaleString('en')} to the nearest ${name}.`,
        answer.toLocaleString('en'),
        [
          (answer === down ? up : down).toLocaleString('en'),
          (answer + to).toLocaleString('en'),
          (answer - to).toLocaleString('en'),
        ],
        {
          explanation: `The digit after the ${name}s decides it, so ${n.toLocaleString('en')} rounds to ${answer.toLocaleString('en')}.`,
        },
      )
    }

    if (variant === 2) {
      /* Estimating a product by rounding each factor — the scheme's own example. */
      const a = rng.int(21, 89)
      const b = rng.int(21, 89)
      const ra = Math.round(a / 10) * 10
      const rb = Math.round(b / 10) * 10
      return entry(`Estimate ${a} × ${b} by rounding each number to the nearest ten.`, ra * rb, {
        maxDigits: 5,
        explanation: `${a} rounds to ${ra} and ${b} rounds to ${rb}. ${ra} × ${rb} = ${ra * rb}.`,
      })
    }

    /* Rounding a decimal to the nearest whole number. */
    const whole = rng.int(1, [20, 30, 50, 80, 200][difficulty - 1])
    const tenth = rng.int(1, 9)
    const answer = tenth >= 5 ? whole + 1 : whole
    return mc(
      rng,
      `Round ${whole}.${tenth} to the nearest whole number.`,
      answer,
      [tenth >= 5 ? whole : whole + 1, whole + 2, Math.max(0, whole - 1)],
      {
        explanation:
          tenth >= 5
            ? `The tenths digit is ${tenth}, which is 5 or more, so it rounds up to ${answer}.`
            : `The tenths digit is ${tenth}, which is under 5, so it stays at ${answer}.`,
      },
    )
  },
}

const indices: SkillDef = {
  id: 'ng.maths.number.indices',
  title: 'Powers',
  yearBand: 'b6',
  prerequisites: ['ng.maths.number.factors'],
  concepts: ['indices'],
  hint: 'The small raised number says how many times to multiply, not what to multiply by.',
  helpAtHome:
    'Fold a sheet of paper in half again and again and count the layers: 2, 4, 8, 16. That is 2 to a power, and it grows faster than anyone expects.',
  generate: ({ rng, difficulty }): Item => {
    const variant = rng.int(1, 4)
    const base = rng.pick([2, 3, 4, 5, 10].slice(0, [3, 3, 4, 5, 5][difficulty - 1]))

    if (variant === 1) {
      const power = rng.int(2, base <= 3 ? 5 : 3)
      const answer = base ** power
      const expanded = Array(power).fill(base).join(' × ')
      return entry(`What is ${base}${sup(power)}?`, answer, {
        maxDigits: 6,
        explanation: `${base}${sup(power)} means ${expanded} = ${answer}.`,
      })
    }

    if (variant === 2) {
      const power = rng.int(2, base <= 3 ? 5 : 3)
      const answer = base ** power
      /*
       * Filter distractors by what they are worth, not by how they are
       * written. Two of these collide with the answer on real values: 2⁴ and
       * 4² are both 16, and at base 2 power 2 the option "2 × 2" is 4 — the
       * answer itself. Either way the question would have two correct options
       * and mark a child wrong for choosing one of them.
       */
      const pool = [
        { label: `${base} × ${power}`, value: base * power },
        { label: `${power}${sup(base)}`, value: power ** base },
        { label: `${base} + ${power}`, value: base + power },
        /*
         * Fallbacks, because the three above can all collide at once: at base
         * 2 power 2 the answer is 4 and so are 2 × 2, 2², and 2 + 2 — which
         * left the question with a single option and nothing to choose
         * between. These three can never equal bᵖ.
         */
        { label: `${base}${sup(power + 1)}`, value: base ** (power + 1) },
        { label: `${base + 1}${sup(power)}`, value: (base + 1) ** power },
        { label: `${base}${sup(power - 1)}`, value: base ** (power - 1) },
      ]

      const seen = new Set([answer])
      const wrong: string[] = []
      for (const o of pool) {
        if (seen.has(o.value) || wrong.length >= 3) continue
        seen.add(o.value)
        wrong.push(o.label)
      }

      return mc(rng, `Which of these equals ${answer}?`, `${base}${sup(power)}`, wrong, {
        explanation: `${Array(power).fill(base).join(' × ')} = ${answer}.`,
      })
    }

    if (variant === 3) {
      /* The multiplication rule — add the powers, never multiply them. */
      const p = rng.int(2, 4)
      const q = rng.int(2, 4)
      return mc(
        rng,
        `Simplify: ${base}${sup(p)} × ${base}${sup(q)}`,
        `${base}${sup(p + q)}`,
        [
          `${base}${sup(p * q)}`,
          `${base * base}${sup(p + q)}`,
          `${base}${sup(Math.abs(p - q) || 1)}`,
        ],
        { explanation: `Multiplying the same base adds the powers: ${p} + ${q} = ${p + q}.` },
      )
    }

    /* Anything to the power zero is 1 — the fact that is always forgotten. */
    const n = rng.int(2, 12)
    return mc(rng, `What is ${n}⁰?`, 1, [0, n, n * n], {
      explanation: 'Any number raised to the power zero is 1.',
    })
  },
}

const percentChange: SkillDef = {
  id: 'ng.maths.money.percent-change',
  title: 'Prices going up and down',
  yearBand: 'b6',
  prerequisites: ['ng.maths.fractions.percentages'],
  concepts: ['percentage-change'],
  hint: 'Work out the change first, then compare it with what you started from.',
  helpAtHome:
    'School fees or transport fares rising is exactly this sum. Ask by what percentage, not only by how much.',
  generate: ({ rng, difficulty }): Item => {
    /* Percentages that divide a round naira amount exactly. */
    const pct = rng.pick([10, 20, 25, 50])

    if (rng.chance(0.5)) {
      const start = rng.step(100, [800, 1200, 2000, 4000, 8000][difficulty - 1], 100)
      const change = (start * pct) / 100
      const up = rng.chance(0.5)
      const answer = up ? start + change : start - change
      return entry(
        `A bag of rice costs ₦${start.toLocaleString('en')}.\nThe price ${up ? 'goes up' : 'comes down'} by ${pct}%. What does it cost now?`,
        answer,
        {
          maxDigits: 6,
          prefix: '₦',
          explanation: `${pct}% of ₦${start.toLocaleString('en')} is ₦${change.toLocaleString('en')}, so the new price is ₦${answer.toLocaleString('en')}.`,
        },
      )
    }

    /* Working the percentage out from two amounts — the harder direction. */
    const start = rng.step(100, [800, 1000, 2000, 4000, 5000][difficulty - 1], 100)
    const change = (start * pct) / 100
    const up = rng.chance(0.5)
    const now = up ? start + change : start - change
    return mc(
      rng,
      `A fare was ₦${start.toLocaleString('en')} and is now ₦${now.toLocaleString('en')}.\nBy what percentage has it ${up ? 'gone up' : 'come down'}?`,
      `${pct}%`,
      [`${pct + 10}%`, `${Math.max(5, pct - 5)}%`, `${pct * 2}%`],
      {
        explanation: `The change is ₦${change.toLocaleString('en')}. ${change} ÷ ${start} × 100 = ${pct}%.`,
      },
    )
  },
}

const scaleDrawing: SkillDef = {
  id: 'ng.maths.measure.scale',
  title: 'Scale and maps',
  yearBand: 'b6',
  prerequisites: ['ng.maths.measure.length'],
  concepts: ['scale-drawing'],
  hint: 'The scale tells you what one centimetre on the paper stands for in real life.',
  helpAtHome:
    'Find the scale bar on any map and work out a real distance with a ruler. It is the same sum as these.',
  generate: ({ rng, difficulty }): Item => {
    const perCm = rng.pick([5, 10, 20, 50, 100].slice(0, [3, 3, 4, 5, 5][difficulty - 1]))
    const variant = rng.int(1, 3)

    if (variant === 1) {
      const cm = rng.int(2, 12)
      return entry(`On a map, 1 cm stands for ${perCm} m.\nA path measures ${cm} cm. How long is it really?`, cm * perCm, {
        maxDigits: 5,
        suffix: 'm',
        explanation: `${cm} × ${perCm} = ${cm * perCm} m.`,
      })
    }

    if (variant === 2) {
      const cm = rng.int(2, 12)
      const real = cm * perCm
      return entry(
        `1 cm on a map stands for ${perCm} m.\nA road is really ${real} m long. How many centimetres is it on the map?`,
        cm,
        { maxDigits: 3, suffix: 'cm', explanation: `${real} ÷ ${perCm} = ${cm} cm.` },
      )
    }

    /* Reading a scale off two lengths, as the scheme's worked example does. */
    const small = rng.pick([2, 3, 4, 6])
    const factor = rng.int(2, 4)
    const big = small * factor
    return mc(
      rng,
      `A drawing is ${small} cm long. The real object is ${big} cm long.\nWhat is the scale of the drawing?`,
      `1 : ${factor}`,
      [`1 : ${factor + 1}`, `${factor} : 1`, `1 : ${big}`],
      {
        explanation: `${small} cm stands for ${big} cm, and ${big} ÷ ${small} = ${factor}, so the scale is 1 : ${factor}.`,
      },
    )
  },
}

export const b6NumberSkillsB: SkillDef[] = [approximation, indices]
export const b6MoneySkills: SkillDef[] = [percentChange]
export const b6MeasureSkills: SkillDef[] = [scaleDrawing]
