/**
 * Basic 1 maths — the foundation year.
 *
 * Kept in its own file rather than mixed into the Basic 2/3 topics because
 * the pitch is genuinely different: counting objects, numbers to 100, and
 * bonds within 20, with far more pictures and far less reading.
 */

import { numericDistractors } from '../../../engine/rng'
import type { Item, SkillDef } from '../../../engine/types'
import { entry, mc, order, tapMany, thing } from '../../shared/authoring'
import { numberToWords } from '../../shared/words'

const countTo20: SkillDef = {
  id: 'ng.maths.number.count-20',
  title: 'Counting to 20',
  yearBand: 'b1',
  concepts: ['count-to-20'],
  hint: 'Touch each one as you count so you do not count it twice.',
  helpAtHome: 'Count everything — stairs, spoons, fingers, cars. Out loud, every day.',
  generate: ({ rng, difficulty, locale }): Item => {
    const noun = thing(rng, locale)
    const max = [6, 10, 14, 17, 20][difficulty - 1]

    if (rng.chance(0.55)) {
      const count = rng.int(3, max)
      return {
        skillId: '',
        type: 'count-objects',
        prompt: `Tap each one to count. How many ${noun.many}?`,
        glyph: noun.glyph,
        count,
        perRow: 5,
      }
    }

    const count = rng.int(3, max)
    return mc(rng, `How many ${noun.many} are there?`, count, numericDistractors(rng, count, 3, { min: 1, max: 20 }), {
      visual: { kind: 'objects', glyph: noun.glyph, count, perRow: 5 },
      explanation: `There are ${count}.`,
    })
  },
}

const countTo100: SkillDef = {
  id: 'ng.maths.number.count-100',
  title: 'Numbers to 100',
  yearBand: 'b1',
  prerequisites: ['ng.maths.number.count-20'],
  concepts: ['count-to-100'],
  hint: 'Say the tens first, then the units: forty… forty-one, forty-two.',
  helpAtHome: 'Count to 100 together in ones and in tens on the way to school.',
  generate: ({ rng, difficulty }): Item => {
    const max = [30, 50, 70, 90, 100][difficulty - 1]
    const variant = rng.int(1, 3)

    if (variant === 1) {
      const n = rng.int(2, max - 1)
      const after = rng.chance(0.5)
      const answer = after ? n + 1 : n - 1
      return mc(
        rng,
        after ? `What comes after ${n}?` : `What comes before ${n}?`,
        answer,
        numericDistractors(rng, answer, 3, { min: 0, max: 100 }),
        { explanation: `${n - 1}, ${n}, ${n + 1}` },
      )
    }

    if (variant === 2) {
      const n = rng.int(1, max)
      return mc(rng, `Which number is "${numberToWords(n)}"?`, n, numericDistractors(rng, n, 3, { min: 1, max: 100 }))
    }

    const values = rng.sample(Array.from({ length: max }, (_, i) => i + 1), 4)
    const sorted = [...values].sort((a, b) => a - b)
    return order(rng, 'Tap them from smallest to biggest', sorted, { explanation: sorted.join(', ') })
  },
}

const betweenNumbers: SkillDef = {
  id: 'ng.maths.number.between',
  title: 'Before, after and between',
  yearBand: 'b1',
  prerequisites: ['ng.maths.number.count-20'],
  concepts: ['number-order'],
  hint: 'Say the numbers out loud in order and listen for the gap.',
  helpAtHome: 'Play "what comes between 6 and 8?" in the car.',
  generate: ({ rng, difficulty }): Item => {
    const max = [15, 25, 50, 75, 100][difficulty - 1]
    const n = rng.int(2, max - 1)
    if (rng.chance(0.5)) {
      return entry(`Which number is between ${n - 1} and ${n + 1}?`, n, {
        maxDigits: 3,
        explanation: `${n - 1}, ${n}, ${n + 1}`,
      })
    }
    const start = rng.int(1, max - 4)
    const run = [start, start + 1, start + 2, start + 3]
    const hole = rng.int(1, 2)
    return entry(`What is missing?\n${run.map((v, i) => (i === hole ? '?' : v)).join(', ')}`, run[hole], {
      speak: `What is missing? ${run.map((v, i) => (i === hole ? 'blank' : v)).join(', ')}`,
      explanation: run.join(', '),
    })
  },
}

const addWithin20: SkillDef = {
  id: 'ng.maths.ops.add-within-20',
  title: 'Adding to 20',
  yearBand: 'b1',
  concepts: ['add-within-20'],
  hint: 'Start at the bigger number and count on.',
  helpAtHome: 'Use fingers, stones or bottle tops — seeing the objects matters at this stage.',
  generate: ({ rng, difficulty, locale }): Item => {
    const max = [5, 10, 14, 17, 20][difficulty - 1]
    const a = rng.int(1, Math.max(1, max - 1))
    const b = rng.int(1, Math.max(1, max - a))
    const noun = thing(rng, locale)

    if (difficulty <= 2 && rng.chance(0.5)) {
      // At this age the picture is the method, not a hint to be withheld —
      // a Basic 1 child is meant to count the objects.
      return entry(
        `${noun.one === 'fish' ? 'There are' : 'You have'} ${a} ${a === 1 ? noun.one : noun.many}.\nYou get ${b} more. How many altogether?`,
        a + b,
        {
          visual: { kind: 'objects', glyph: noun.glyph, count: a + b, perRow: 5 },
          speak: `You have ${a}. You get ${b} more. How many altogether?`,
          maxDigits: 2,
          explanation: `${a} + ${b} = ${a + b}`,
        },
      )
    }

    return entry(`${a} + ${b} = ?`, a + b, {
      speak: `${a} plus ${b}`,
      maxDigits: 2,
      explanation: `${a} + ${b} = ${a + b}`,
    })
  },
}

const subWithin20: SkillDef = {
  id: 'ng.maths.ops.sub-within-20',
  title: 'Taking away to 20',
  yearBand: 'b1',
  prerequisites: ['ng.maths.ops.add-within-20'],
  concepts: ['subtract-within-20'],
  hint: 'Start at the big number and count backwards.',
  helpAtHome: 'Take sweets off a plate one at a time and count what is left.',
  generate: ({ rng, difficulty }): Item => {
    const max = [6, 10, 14, 17, 20][difficulty - 1]
    const a = rng.int(2, max)
    const b = rng.int(1, a - 1)
    return entry(`${a} − ${b} = ?`, a - b, {
      speak: `${a} minus ${b}`,
      maxDigits: 2,
      explanation: `${a} − ${b} = ${a - b}`,
    })
  },
}

const numberBonds: SkillDef = {
  id: 'ng.maths.ops.number-bonds',
  title: 'Number bonds to 10',
  yearBand: 'b1',
  prerequisites: ['ng.maths.ops.add-within-20'],
  concepts: ['number-bonds'],
  hint: 'How many more do you need to reach 10?',
  helpAtHome: 'Ten fingers up — hide some and ask how many are hiding.',
  generate: ({ rng, difficulty }): Item => {
    const target = difficulty <= 2 ? 10 : rng.pick([10, 20])
    const a = rng.int(1, target - 1)
    if (rng.chance(0.5)) {
      return entry(`${a} + ☐ = ${target}`, target - a, {
        speak: `${a} plus what makes ${target}?`,
        maxDigits: 2,
        explanation: `${a} + ${target - a} = ${target}`,
      })
    }
    return mc(
      rng,
      `What must you add to ${a} to make ${target}?`,
      target - a,
      numericDistractors(rng, target - a, 3, { min: 0, max: target }),
      { explanation: `${a} + ${target - a} = ${target}` },
    )
  },
}

const moreOrLess: SkillDef = {
  id: 'ng.maths.number.more-less',
  title: 'More and less',
  yearBand: 'b1',
  concepts: ['compare-small-numbers'],
  hint: 'The bigger number is the one you say later when counting up.',
  helpAtHome: 'Compare two piles of anything and ask which has more.',
  generate: ({ rng, difficulty }): Item => {
    const max = [10, 20, 50, 100, 100][difficulty - 1]
    const [a, b] = rng.sample(Array.from({ length: max }, (_, i) => i + 1), 2)
    if (rng.chance(0.6)) {
      const wantMore = rng.chance(0.5)
      return mc(
        rng,
        wantMore ? 'Which is MORE?' : 'Which is LESS?',
        wantMore ? Math.max(a, b) : Math.min(a, b),
        [wantMore ? Math.min(a, b) : Math.max(a, b)],
        { explanation: `${Math.max(a, b)} is more than ${Math.min(a, b)}.` },
      )
    }
    const pool = rng.sample(Array.from({ length: max }, (_, i) => i + 1), 6)
    const pivot = rng.int(Math.floor(max / 3), Math.floor((max * 2) / 3))
    const correct = pool.filter((v) => v > pivot)
    if (correct.length === 0 || correct.length === pool.length) {
      return mc(rng, 'Which is MORE?', Math.max(a, b), [Math.min(a, b)])
    }
    return tapMany(
      rng,
      `Tap all the numbers BIGGER than ${pivot}`,
      pool.map((v) => ({ value: v, correct: v > pivot })),
      { explanation: `Bigger than ${pivot}: ${correct.join(', ')}` },
    )
  },
}

export const earlyNumberSkills: SkillDef[] = [countTo20, countTo100, betweenNumbers, moreOrLess]
export const earlyOpsSkills: SkillDef[] = [addWithin20, subWithin20, numberBonds]
