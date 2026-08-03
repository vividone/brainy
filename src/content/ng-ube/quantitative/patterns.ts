/**
 * Pattern Peak — number sequences, repeating patterns and odd-one-out.
 *
 * This is the door into Quantitative Reasoning. Every later strand is really
 * "spot the hidden rule, then apply it"; here a child meets that idea with
 * almost nothing to read, which is what makes it workable from Basic 1.
 */

import { numericDistractors } from '../../../engine/rng'
import type { Item, SkillDef, StrandDef } from '../../../engine/types'
import { entry, mc } from '../../shared/authoring'
import { ordinalShort } from '../../shared/words'
import { PATTERN_GLYPHS } from './figures'

const countOn: SkillDef = {
  id: 'ng.qr.patterns.count-on',
  title: 'What comes next?',
  yearBand: 'b1',
  concepts: ['number-sequence'],
  hint: 'How much bigger is each number than the one before it?',
  helpAtHome: 'Count on together from any number — 7, 8, 9 — then try it in twos and fives.',
  generate: ({ rng, difficulty }): Item => {
    const step = rng.pick([[1], [1, 2], [1, 2, 5], [2, 3, 5], [2, 3, 4, 5]][difficulty - 1])
    const start = rng.int(1, [8, 12, 20, 30, 45][difficulty - 1])
    const run = [0, 1, 2, 3].map((i) => start + i * step)
    const answer = start + 4 * step
    const prompt = `What comes next?\n${run.join(', ')}, ?`
    const speak = `What comes next after ${run.join(', ')}?`
    const explanation = `Each number goes up by ${step}: ${[...run, answer].join(', ')}`

    if (difficulty <= 2) {
      return mc(rng, prompt, answer, numericDistractors(rng, answer, 3, { min: 1, max: answer + 12 }), {
        speak,
        explanation,
      })
    }
    return entry(prompt, answer, { speak, maxDigits: 3, explanation })
  },
}

const picturePattern: SkillDef = {
  id: 'ng.qr.patterns.picture-pattern',
  title: 'Finish the pattern',
  yearBand: 'b1',
  concepts: ['repeating-pattern'],
  hint: 'Say the pattern out loud. Listen for where it starts again.',
  helpAtHome: 'Lay out spoons and forks in a repeating line and ask what comes next.',
  generate: ({ rng, difficulty }): Item => {
    const period = difficulty <= 2 ? 2 : difficulty === 3 ? rng.pick([2, 3]) : rng.pick([3, 4])
    const glyphs = rng.sample(PATTERN_GLYPHS, period)
    const spare = PATTERN_GLYPHS.filter((g) => !glyphs.includes(g))
    const len = difficulty <= 3 ? 6 : 8
    const seq = Array.from({ length: len }, (_, i) => glyphs[i % period])
    const explanation = `The pattern repeats ${glyphs.join(' ')} over and over.`

    // A gap in the middle is harder than a gap on the end: you have to read
    // the pattern both ways round.
    if (difficulty >= 2 && rng.chance(0.4)) {
      const hole = rng.int(period, len - 1)
      const answer = seq[hole]
      const shown = seq.map((g, i) => (i === hole ? '?' : g)).join(' ')
      return mc(rng, `Which one is missing?\n${shown}`, answer, [
        ...glyphs.filter((g) => g !== answer),
        ...rng.sample(spare, 1),
      ], { speak: 'Which picture is missing from the pattern?', explanation })
    }

    const answer = glyphs[len % period]
    return mc(rng, `What comes next?\n${seq.join(' ')} ?`, answer, [
      ...glyphs.filter((g) => g !== answer),
      ...(difficulty >= 2 ? rng.sample(spare, 1) : []),
    ], { speak: 'What picture comes next in the pattern?', explanation })
  },
}

const skipJumps: SkillDef = {
  id: 'ng.qr.patterns.skip-jumps',
  title: 'Jumping numbers',
  yearBand: 'b2',
  prerequisites: ['ng.qr.patterns.count-on'],
  concepts: ['number-sequence'],
  hint: 'Work out one jump, then keep making the same jump.',
  helpAtHome: 'Count in 2s, 5s and 10s going up the stairs, then count back down again.',
  generate: ({ rng, difficulty }): Item => {
    const step = rng.pick(
      [[2, 10], [2, 5, 10], [2, 3, 5, 10], [3, 4, 6, 7, 25], [4, 6, 7, 8, 9, 25, 50]][difficulty - 1],
    )
    const down = difficulty >= 3 && rng.chance(0.4)
    const offset = rng.int(0, step - 1)
    const start = step * (down ? rng.int(5, 12) : rng.int(1, 8)) + offset
    const run = [0, 1, 2, 3].map((i) => (down ? start - i * step : start + i * step))
    const answer = down ? start - 4 * step : start + 4 * step

    return entry(`Count in ${step}s. What comes next?\n${run.join(', ')}, ?`, answer, {
      speak: `Count ${down ? 'back' : 'on'} in ${step}s. What comes next after ${run.join(', ')}?`,
      maxDigits: 4,
      explanation: `Each jump ${down ? 'takes away' : 'adds'} ${step}: ${[...run, answer].join(', ')}`,
    })
  },
}

const missingMiddle: SkillDef = {
  id: 'ng.qr.patterns.missing-middle',
  title: 'Fill the gap',
  yearBand: 'b3',
  prerequisites: ['ng.qr.patterns.skip-jumps'],
  concepts: ['number-sequence'],
  hint: 'Look at the two numbers either side of the gap.',
  helpAtHome: 'Write a short pattern with one number rubbed out and let him fill it in.',
  generate: ({ rng, difficulty }): Item => {
    const step = rng.int(2, [5, 8, 12, 20, 30][difficulty - 1])
    const down = difficulty >= 3 && rng.chance(0.4)
    const base = rng.int(1, [20, 40, 80, 150, 300][difficulty - 1])
    const start = down ? base + 5 * step : base
    const run = [0, 1, 2, 3, 4].map((i) => (down ? start - i * step : start + i * step))
    const hole = rng.int(1, difficulty >= 3 ? 3 : 2)
    const shown = run.map((v, i) => (i === hole ? '?' : String(v))).join(', ')

    return entry(`What is missing?\n${shown}`, run[hole], {
      speak: `What is missing? ${run.map((v, i) => (i === hole ? 'blank' : v)).join(', ')}`,
      maxDigits: 4,
      explanation: `The pattern ${down ? 'goes down' : 'goes up'} in ${step}s: ${run.join(', ')}`,
    })
  },
}

const oddOneOut: SkillDef = {
  id: 'ng.qr.patterns.odd-one-out',
  title: 'Which one does not belong?',
  yearBand: 'b3',
  prerequisites: ['ng.qr.patterns.skip-jumps'],
  concepts: ['odd-one-out-number'],
  hint: 'Find what three of them share, then the last one is your answer.',
  helpAtHome: 'Say four numbers and ask which is the odd one out — and, more importantly, why.',
  generate: ({ rng, difficulty }): Item => {
    const k = rng.pick(
      [[2, 5], [2, 5, 10], [3, 4, 5, 10], [3, 4, 6, 7, 9], [4, 6, 7, 8, 9, 11, 12]][difficulty - 1],
    )
    const top = [20, 50, 60, 90, 144][difficulty - 1]
    const multiples: number[] = []
    const others: number[] = []
    for (let v = 2; v <= top; v++) (v % k === 0 ? multiples : others).push(v)

    const three = rng.sample(multiples, 3)
    const odd = rng.pick(others)
    const listed = [...three].sort((a, b) => a - b).join(', ')

    return mc(rng, 'Which number does not belong?', odd, three, {
      explanation: `${listed} are all in the ${k} times table. ${odd} is not.`,
    })
  },
}

const doubling: SkillDef = {
  id: 'ng.qr.patterns.doubling',
  title: 'Doubling patterns',
  yearBand: 'b4',
  prerequisites: ['ng.qr.patterns.missing-middle'],
  concepts: ['multiplicative-sequence'],
  hint: 'The jumps are not the same size — try multiplying instead of adding.',
  helpAtHome: 'Double a number over and over: 3, 6, 12, 24 — see how fast it runs away.',
  generate: ({ rng, difficulty }): Item => {
    const modes = difficulty <= 2 ? ['double'] : difficulty === 3 ? ['double', 'halve'] : ['double', 'halve', 'triple']
    const mode = rng.pick(modes)

    if (mode === 'triple') {
      const start = rng.int(1, [2, 3, 4, 6, 8][difficulty - 1])
      const run = [0, 1, 2, 3].map((i) => start * 3 ** i)
      const answer = start * 81
      return entry(`What comes next?\n${run.join(', ')}, ?`, answer, {
        speak: `What comes next after ${run.join(', ')}?`,
        maxDigits: 4,
        explanation: `Each number is 3 times the one before: ${[...run, answer].join(', ')}`,
      })
    }

    if (mode === 'halve') {
      const last = rng.int(1, [3, 5, 8, 10, 12][difficulty - 1])
      const run = [16, 8, 4, 2].map((m) => last * m)
      return entry(`What comes next?\n${run.join(', ')}, ?`, last, {
        speak: `What comes next after ${run.join(', ')}?`,
        maxDigits: 4,
        explanation: `Each number is half the one before: ${[...run, last].join(', ')}`,
      })
    }

    const start = rng.int(1, [6, 10, 12, 15, 20][difficulty - 1])
    const run = [0, 1, 2, 3].map((i) => start * 2 ** i)
    const answer = start * 16
    return entry(`What comes next?\n${run.join(', ')}, ?`, answer, {
      speak: `What comes next after ${run.join(', ')}?`,
      maxDigits: 4,
      explanation: `Each number is double the one before: ${[...run, answer].join(', ')}`,
    })
  },
}

const twoStepRule: SkillDef = {
  id: 'ng.qr.patterns.two-step-rule',
  title: 'Trickier patterns',
  yearBand: 'b5',
  prerequisites: ['ng.qr.patterns.doubling', 'ng.qr.patterns.missing-middle'],
  concepts: ['two-step-sequence'],
  hint: 'Write the jump between each pair. Now look for a pattern in the jumps.',
  helpAtHome: 'Ask for the jumps first, then the pattern hiding inside the jumps.',
  generate: ({ rng, difficulty }): Item => {
    const family = rng.int(1, difficulty <= 2 ? 2 : 3)

    if (family === 1) {
      // Jumps that grow by the same amount each time: 2, 5, 9, 14 …
      const grow = rng.int(1, difficulty + 1)
      const first = rng.int(1, 6)
      const terms = [rng.int(1, 12)]
      for (let i = 0; i < 4; i++) terms.push(terms[i] + first + i * grow)
      const jumps = [0, 1, 2, 3].map((i) => first + i * grow)
      return entry(`What comes next?\n${terms.slice(0, 4).join(', ')}, ?`, terms[4], {
        speak: `What comes next after ${terms.slice(0, 4).join(', ')}?`,
        maxDigits: 4,
        explanation: `The jumps grow: ${jumps.join(', ')}. So ${terms[3]} + ${jumps[3]} = ${terms[4]}.`,
      })
    }

    if (family === 2) {
      // Up a lot, back a little, up a lot, back a little.
      const up = rng.int(3, 9)
      const back = rng.int(1, up - 1)
      const terms = [rng.int(2, 15)]
      for (let i = 0; i < 4; i++) terms.push(terms[i] + (i % 2 === 0 ? up : -back))
      return entry(`What comes next?\n${terms.slice(0, 4).join(', ')}, ?`, terms[4], {
        speak: `What comes next after ${terms.slice(0, 4).join(', ')}?`,
        maxDigits: 4,
        explanation: `It goes up ${up}, back ${back}, up ${up}, back ${back}: ${terms.join(', ')}`,
      })
    }

    // Double it, then add a bit.
    const add = rng.int(1, difficulty)
    const terms = [rng.int(1, 6)]
    for (let i = 0; i < 4; i++) terms.push(terms[i] * 2 + add)
    return entry(`What comes next?\n${terms.slice(0, 4).join(', ')}, ?`, terms[4], {
      speak: `What comes next after ${terms.slice(0, 4).join(', ')}?`,
      maxDigits: 4,
      explanation: `Double, then add ${add}: ${terms[3]} × 2 + ${add} = ${terms[4]}.`,
    })
  },
}

const nthTerm: SkillDef = {
  id: 'ng.qr.patterns.nth-term',
  title: 'Far along the pattern',
  yearBand: 'b6',
  prerequisites: ['ng.qr.patterns.two-step-rule'],
  concepts: ['nth-term'],
  hint: 'From the 1st to the 10th is nine jumps, not ten.',
  helpAtHome: '"It starts at 3 and goes up in 4s — what is the 20th number?" Count the jumps, not the terms.',
  generate: ({ rng, difficulty }): Item => {
    const first = rng.int(1, 12)
    const step = rng.int(2, [4, 6, 8, 10, 12][difficulty - 1])
    const run = [0, 1, 2, 3].map((i) => first + i * step)

    if (rng.chance(0.65)) {
      const n = rng.int(6, [8, 10, 12, 16, 25][difficulty - 1])
      const answer = first + (n - 1) * step
      return entry(`${run.join(', ')}, …\nWhat is the ${ordinalShort(n)} number?`, answer, {
        speak: `The pattern is ${run.join(', ')} and so on. What is number ${n}?`,
        maxDigits: 4,
        explanation: `It goes up in ${step}s. ${first} + ${n - 1} × ${step} = ${answer}.`,
      })
    }

    const pos = rng.int(6, [10, 12, 15, 18, 22][difficulty - 1])
    const value = first + (pos - 1) * step
    return entry(`${run.join(', ')}, …\nWhich position is ${value} in?`, pos, {
      speak: `The pattern is ${run.join(', ')} and so on. Which position is ${value} in?`,
      maxDigits: 3,
      explanation: `${value} − ${first} = ${value - first}, and ${value - first} ÷ ${step} = ${pos - 1} jumps, so it is number ${pos}.`,
    })
  },
}

export const patternsStrand: StrandDef = {
  id: 'ng.qr.patterns',
  name: 'Pattern Peak',
  blurb: 'Sequences, repeating pictures and spotting the odd one out',
  theme: 'volcano',
  skills: [
    countOn,
    picturePattern,
    skipJumps,
    missingMiddle,
    oddOneOut,
    doubling,
    twoStepRule,
    nthTerm,
  ],
}
