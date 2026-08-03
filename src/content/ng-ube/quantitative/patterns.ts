/**
 * Pattern Peak — number sequences, repeating patterns and odd-one-out.
 *
 * This is the door into Quantitative Reasoning. Every later strand is really
 * "spot the hidden rule, then apply it"; here a child meets that idea with
 * almost nothing to read, which is what makes it workable from Basic 1.
 *
 * Each skill deliberately asks its one idea several different ways — forwards,
 * backwards, as a true/false check, as "which list fits", as a short story.
 * A sequence skill that only ever says "what comes next?" gets answered by
 * pattern-matching the question rather than by reading the numbers.
 */

import { numericDistractors } from '../../../engine/rng'
import type { Item, SkillDef, StrandDef } from '../../../engine/types'
import { entry, mc, person, plural, tapMany, tf, thing } from '../../shared/authoring'
import { ordinalShort } from '../../shared/words'
import { PATTERN_GLYPHS } from './figures'

/** Build a run from `start`, taking each jump in turn. */
const runFrom = (start: number, jumps: number[]): number[] => {
  const out = [start]
  for (const j of jumps) out.push(out[out.length - 1] + j)
  return out
}

const countOn: SkillDef = {
  id: 'ng.qr.patterns.count-on',
  title: 'What comes next?',
  yearBand: 'b1',
  concepts: ['number-sequence'],
  hint: 'How much bigger is each number than the one before it?',
  helpAtHome: 'Count on together from any number — 7, 8, 9 — then try it in twos and fives.',
  generate: ({ rng, difficulty, locale }): Item => {
    const step = rng.pick([[1], [1, 2], [1, 2, 5], [2, 3, 5], [2, 3, 4, 5]][difficulty - 1])
    const cap = [8, 12, 20, 30, 45][difficulty - 1]

    /** Cards for the youngest, typing once they can hold the number in mind. */
    const ask = (prompt: string, answer: number, extras: { speak?: string; explanation: string }): Item =>
      difficulty <= 2
        ? mc(rng, prompt, answer, numericDistractors(rng, answer, 3, { min: 0, max: answer + 12 }), extras)
        : entry(prompt, answer, { ...extras, maxDigits: 3 })

    switch (rng.pick(['next', 'before', 'which', 'check', 'story'] as const)) {
      // Counting back is a genuinely different job from counting on, and it is
      // the half children skip if you never ask for it.
      case 'before': {
        const start = rng.int(step + 1, cap + step)
        const run = [0, 1, 2, 3].map((i) => start + i * step)
        const answer = start - step
        return ask(`What comes before?\n?, ${run.join(', ')}`, answer, {
          speak: `What number comes before ${run.join(', ')}?`,
          explanation: `Count back ${step} from ${start}: ${[answer, ...run].join(', ')}`,
        })
      }

      // Reading four whole lists and testing each one, instead of extending one.
      case 'which': {
        const start = rng.int(1, cap)
        const line = (jumps: number[]) => runFrom(start, jumps).join(', ')
        const right = line([step, step, step])
        return mc(
          rng,
          `Which list goes up in ${step}s?`,
          right,
          [
            line([step + 1, step + 1, step + 1]),
            line([step, step + 2, step]),
            line([step, step + 1, step + 2]),
          ],
          { explanation: `${right} adds ${step} every time.` },
        )
      }

      case 'check': {
        const start = rng.int(1, cap)
        const run = [0, 1, 2, 3].map((i) => start + i * step)
        const ok = rng.chance(0.5)
        const slip = rng.int(1, 2)
        const shown = ok ? run : run.map((v, i) => (i === 3 ? v + slip : v))
        return tf(`Does this list go up by ${step} every time?\n${shown.join(', ')}`, ok, {
          explanation: ok
            ? `Yes — every jump is ${step}.`
            : `No — the last jump is ${shown[3] - shown[2]}, not ${step}.`,
        })
      }

      case 'story': {
        const who = person(rng, locale)
        const noun = thing(rng, locale)
        const start = rng.int(1, cap)
        const run = [0, 1, 2, 3].map((i) => start + i * step)
        const answer = start + 4 * step
        return ask(`${who} is counting ${noun.many}.\n${run.join(', ')}, ?`, answer, {
          speak: `${who} counts ${run.join(', ')}. What comes next?`,
          explanation: `Each number goes up by ${step}: ${[...run, answer].join(', ')}`,
        })
      }

      default: {
        const start = rng.int(1, cap)
        const run = [0, 1, 2, 3].map((i) => start + i * step)
        const answer = start + 4 * step
        return ask(`What comes next?\n${run.join(', ')}, ?`, answer, {
          speak: `What comes next after ${run.join(', ')}?`,
          explanation: `Each number goes up by ${step}: ${[...run, answer].join(', ')}`,
        })
      }
    }
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
  generate: ({ rng, difficulty, locale }): Item => {
    const step = rng.pick(
      [[2, 10], [2, 5, 10], [2, 3, 5, 10], [3, 4, 6, 7, 25], [4, 6, 7, 8, 9, 25, 50]][difficulty - 1],
    )
    const offset = rng.int(0, step - 1)

    switch (rng.pick(['next', 'before', 'jumps', 'reach', 'which', 'story'] as const)) {
      case 'before': {
        const start = step * rng.int(2, 9) + offset
        const run = [0, 1, 2, 3].map((i) => start + i * step)
        return entry(`Count in ${step}s. What comes before?\n?, ${run.join(', ')}`, start - step, {
          speak: `Counting in ${step}s, what comes before ${run.join(', ')}?`,
          maxDigits: 4,
          explanation: `Jump back ${step} from ${start}: ${[start - step, ...run].join(', ')}`,
        })
      }

      // How many jumps, rather than where the jumps land.
      case 'jumps': {
        const from = step * rng.int(1, 6) + offset
        const n = rng.int(3, 8)
        const to = from + n * step
        return entry(`Count in ${step}s from ${from}.\nHow many jumps to reach ${to}?`, n, {
          speak: `Counting in ${step}s from ${from}, how many jumps does it take to reach ${to}?`,
          maxDigits: 2,
          explanation: `${to} − ${from} = ${to - from}, and ${to - from} ÷ ${step} = ${n} jumps.`,
        })
      }

      case 'reach': {
        const from = step * rng.int(1, 6) + offset
        const hit = rng.chance(0.5)
        const landing = from + step * rng.int(2, 7)
        const target = hit ? landing : landing + rng.int(1, step - 1)
        return tf(`Count in ${step}s starting at ${from}.\nDo you say ${target}?`, hit, {
          explanation: hit
            ? `Yes — ${target} is ${(target - from) / step} jumps of ${step} from ${from}.`
            : `No — the count goes ${landing} then ${landing + step}, so it jumps straight over ${target}.`,
        })
      }

      case 'which': {
        const start = step * rng.int(1, 6) + offset
        const line = (jumps: number[]) => runFrom(start, jumps).join(', ')
        const right = line([step, step, step])
        return mc(
          rng,
          `Which list counts in ${step}s?`,
          right,
          [
            line([step + 1, step + 1, step + 1]),
            line([step, step, step + 1]),
            line([step + 1, step, step]),
          ],
          { explanation: `${right} jumps ${step} every time.` },
        )
      }

      case 'story': {
        const who = person(rng, locale)
        const noun = thing(rng, locale)
        const start = step * rng.int(1, 8) + offset
        const run = [0, 1, 2, 3].map((i) => start + i * step)
        return entry(`${who} counts ${noun.many} in ${step}s.\n${run.join(', ')}, ?`, start + 4 * step, {
          speak: `${who} counts in ${step}s: ${run.join(', ')}. What comes next?`,
          maxDigits: 4,
          explanation: `Each jump adds ${step}: ${[...run, start + 4 * step].join(', ')}`,
        })
      }

      default: {
        const down = difficulty >= 3 && rng.chance(0.4)
        const start = step * (down ? rng.int(5, 12) : rng.int(1, 8)) + offset
        const run = [0, 1, 2, 3].map((i) => (down ? start - i * step : start + i * step))
        const answer = down ? start - 4 * step : start + 4 * step
        return entry(`Count in ${step}s. What comes next?\n${run.join(', ')}, ?`, answer, {
          speak: `Count ${down ? 'back' : 'on'} in ${step}s. What comes next after ${run.join(', ')}?`,
          maxDigits: 4,
          explanation: `Each jump ${down ? 'takes away' : 'adds'} ${step}: ${[...run, answer].join(', ')}`,
        })
      }
    }
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
    const rising = (ns: number[]) => [...ns].sort((a, b) => a - b).join(', ')

    switch (rng.pick(['bare', 'told', 'tapTwo', 'belongs', 'check', 'parity'] as const)) {
      // The rule is handed over, so all the work is testing it against each number.
      case 'told': {
        const three = rng.sample(multiples, 3)
        const odd = rng.pick(others)
        return mc(rng, `Three of these are in the ${k} times table.\nWhich one is not?`, odd, three, {
          explanation: `${rising(three)} are all in the ${k} times table. ${odd} is not.`,
        })
      }

      // Two strangers instead of one — you cannot stop at the first thing you spot.
      case 'tapTwo': {
        const three = rng.sample(multiples, 3)
        const two = rng.sample(others, 2)
        return tapMany(
          rng,
          'Tap the two numbers that do NOT belong.',
          [
            ...three.map((v) => ({ value: v, correct: false })),
            ...two.map((v) => ({ value: v, correct: true })),
          ],
          { explanation: `${rising(three)} are in the ${k} times table. ${rising(two)} are not.` },
        )
      }

      // The same idea turned round: find the one that *does* fit.
      case 'belongs': {
        const four = rng.sample(multiples, 4)
        const shown = four.slice(0, 3)
        return mc(
          rng,
          `${rising(shown)} belong together.\nWhich number belongs with them?`,
          four[3],
          rng.sample(others, 3),
          { explanation: `They are all in the ${k} times table, and so is ${four[3]}.` },
        )
      }

      case 'check': {
        const ok = rng.chance(0.5)
        const listed = ok
          ? rng.sample(multiples, 4)
          : [...rng.sample(multiples, 3), rng.pick(others)]
        const stranger = listed.find((v) => v % k !== 0)
        return tf(`All of these are in the ${k} times table.\n${rising(listed)}`, ok, {
          explanation: ok
            ? `Yes — every one of them divides by ${k}.`
            : `No — ${stranger} is not in the ${k} times table.`,
        })
      }

      // Odd and even is a second way of sorting numbers into a family.
      case 'parity': {
        const wantEven = rng.chance(0.5)
        const pool = Array.from({ length: top - 1 }, (_, i) => i + 2)
        const family = pool.filter((v) => (v % 2 === 0) === wantEven)
        const stranger = rng.pick(pool.filter((v) => (v % 2 === 0) !== wantEven))
        const three = rng.sample(family, 3)
        return mc(rng, `Which number is not ${wantEven ? 'even' : 'odd'}?`, stranger, three, {
          explanation: `${rising(three)} are all ${wantEven ? 'even' : 'odd'}. ${stranger} is not.`,
        })
      }

      default: {
        const three = rng.sample(multiples, 3)
        const odd = rng.pick(others)
        return mc(rng, 'Which number does not belong?', odd, three, {
          explanation: `${rising(three)} are all in the ${k} times table. ${odd} is not.`,
        })
      }
    }
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
  generate: ({ rng, difficulty, locale }): Item => {
    const times = rng.pick([[2], [2], [2, 3], [2, 3], [2, 3, 4]][difficulty - 1])
    // Four steps of ×4 already reaches the hundreds, so the bigger the
    // multiplier the shorter the run.
    const length = times >= 4 ? 4 : 5
    const capStart =
      times === 2 ? [6, 10, 14, 18, 22][difficulty - 1] : times === 3 ? [2, 3, 5, 7, 9][difficulty - 1] : 4
    const start = rng.int(1, capStart)
    const up = rng.chance(0.5)

    const climbing = Array.from({ length }, (_, i) => start * times ** i)
    const run = up ? climbing : [...climbing].reverse()
    const rule = up ? `${times} times the one before` : `the one before divided by ${times}`

    switch (rng.pick(['next', 'missing', 'rule', 'steps', 'check', 'story'] as const)) {
      case 'missing': {
        const hole = rng.int(1, length - 2)
        const shown = run.map((v, i) => (i === hole ? '?' : String(v))).join(', ')
        return entry(`What is missing?\n${shown}`, run[hole], {
          speak: `What is missing? ${run.map((v, i) => (i === hole ? 'blank' : v)).join(', ')}`,
          maxDigits: 4,
          explanation: `Each number is ${rule}: ${run.join(', ')}`,
        })
      }

      // Naming the rule, rather than using it.
      case 'rule': {
        const right = up ? `Times ${times}` : `Divide by ${times}`
        return mc(
          rng,
          `What is the rule for this pattern?\n${run.join(', ')}`,
          right,
          [
            up ? `Divide by ${times}` : `Times ${times}`,
            up ? `Times ${times + 1}` : `Divide by ${times + 1}`,
            `${up ? 'Add' : 'Take away'} ${Math.abs(run[1] - run[0])}`,
          ],
          { explanation: `${run[0]} then ${run[1]} then ${run[2]} — each one is ${rule}.` },
        )
      }

      // Counting the steps is the multiplicative version of "how many jumps?".
      case 'steps': {
        const n = rng.int(2, length - 1)
        return entry(
          `Start at ${start}. Keep multiplying by ${times}.\nHow many steps to reach ${climbing[n]}?`,
          n,
          {
            speak: `Start at ${start} and keep multiplying by ${times}. How many steps does it take to reach ${climbing[n]}?`,
            maxDigits: 1,
            explanation: `${climbing.slice(0, n + 1).join(' → ')} — that is ${n} steps.`,
          },
        )
      }

      case 'check': {
        const ok = rng.chance(0.5)
        const shown = ok ? climbing : climbing.map((v, i) => (i === length - 1 ? v + times : v))
        return tf(`Each number is ${times} times the one before.\n${shown.join(', ')}`, ok, {
          explanation: ok
            ? `Yes — ${climbing.slice(0, 3).join(' → ')} all multiply by ${times}.`
            : `No — ${climbing[length - 2]} × ${times} = ${climbing[length - 1]}, not ${shown[length - 1]}.`,
        })
      }

      case 'story': {
        const who = person(rng, locale)
        const noun = thing(rng, locale)
        const days = rng.int(2, length - 1)
        return entry(
          `${who} has ${plural(start, noun)}. Every day the number is multiplied by ${times}.\nHow many after ${days} days?`,
          climbing[days],
          {
            maxDigits: 4,
            explanation: `${climbing.slice(0, days + 1).join(' → ')}`,
          },
        )
      }

      default:
        return entry(`What comes next?\n${run.slice(0, -1).join(', ')}, ?`, run[length - 1], {
          speak: `What comes next after ${run.slice(0, -1).join(', ')}?`,
          maxDigits: 4,
          explanation: `Each number is ${rule}: ${run.join(', ')}`,
        })
    }
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

    let terms: number[]
    /** How the rule reads as an answer card. */
    let ruleLabel: string
    /** Rule labels that are true of some other pattern, never of this one. */
    let otherLabels: string[]
    let whyNext: string
    /** Do the jumps get bigger every time? */
    let jumpsGrow: boolean

    if (family === 1) {
      // Jumps that grow by the same amount each time: 2, 5, 9, 14 …
      const grow = rng.int(1, difficulty + 1)
      const first = rng.int(1, 6)
      terms = [rng.int(1, 12)]
      for (let i = 0; i < 4; i++) terms.push(terms[i] + first + i * grow)
      const jumps = [0, 1, 2, 3].map((i) => first + i * grow)
      ruleLabel = `The jumps grow by ${grow} each time`
      otherLabels = [
        `The jumps grow by ${grow + 1} each time`,
        `Up ${first + 2}, then back ${first}`,
        `Double, then add ${grow}`,
      ]
      whyNext = `The jumps grow: ${jumps.join(', ')}. So ${terms[3]} + ${jumps[3]} = ${terms[4]}.`
      jumpsGrow = true
    } else if (family === 2) {
      // Up a lot, back a little, up a lot, back a little.
      const up = rng.int(3, 9)
      const back = rng.int(1, up - 1)
      terms = [rng.int(2, 15)]
      for (let i = 0; i < 4; i++) terms.push(terms[i] + (i % 2 === 0 ? up : -back))
      ruleLabel = `Up ${up}, then back ${back}`
      otherLabels = [
        `Up ${back}, then back ${up}`,
        `The jumps grow by ${back} each time`,
        `Double, then add ${back}`,
      ]
      whyNext = `It goes up ${up}, back ${back}, up ${up}, back ${back}: ${terms.join(', ')}`
      jumpsGrow = false
    } else {
      // Double it, then add a bit.
      const add = rng.int(1, difficulty)
      terms = [rng.int(1, 6)]
      for (let i = 0; i < 4; i++) terms.push(terms[i] * 2 + add)
      ruleLabel = `Double, then add ${add}`
      otherLabels = [
        `Double, then add ${add + 2}`,
        `The jumps grow by ${add} each time`,
        `Up ${add + 4}, then back ${add}`,
      ]
      whyNext = `Double, then add ${add}: ${terms[3]} × 2 + ${add} = ${terms[4]}.`
      jumpsGrow = true
    }

    // Only patterns whose jumps are all forwards can be asked for "the next
    // jump" without the answer coming out negative.
    const forms = jumpsGrow
      ? (['next', 'missing', 'rule', 'jump', 'wrong', 'check'] as const)
      : (['next', 'missing', 'rule', 'wrong', 'check'] as const)

    switch (rng.pick(forms)) {
      case 'missing': {
        const hole = rng.int(1, 3)
        const shown = terms.map((v, i) => (i === hole ? '?' : String(v))).join(', ')
        return entry(`What is missing?\n${shown}`, terms[hole], {
          speak: `What is missing? ${terms.map((v, i) => (i === hole ? 'blank' : v)).join(', ')}`,
          maxDigits: 4,
          explanation: `${ruleLabel}. The whole pattern is ${terms.join(', ')}.`,
        })
      }

      case 'rule':
        return mc(rng, `What is the rule for this pattern?\n${terms.join(', ')}`, ruleLabel, otherLabels, {
          explanation: whyNext,
        })

      case 'jump':
        return entry(`${terms.slice(0, 4).join(', ')}\nHow big is the next jump?`, terms[4] - terms[3], {
          speak: `The pattern is ${terms.slice(0, 4).join(', ')}. How big is the next jump?`,
          maxDigits: 3,
          explanation: whyNext,
        })

      // Spotting the broken term is harder than extending a clean one.
      case 'wrong': {
        const at = rng.int(1, 4)
        const slip = rng.pick([-2, -1, 1, 2])
        const shown = terms.map((v, i) => (i === at ? v + slip : v))
        return mc(
          rng,
          `One number in this pattern is wrong.\nWhich one?\n${shown.join(', ')}`,
          `the ${ordinalShort(at + 1)} number`,
          [1, 2, 3, 4].filter((i) => i !== at).map((i) => `the ${ordinalShort(i + 1)} number`),
          { explanation: `${ruleLabel}, so it should be ${terms[at]}, not ${shown[at]}.` },
        )
      }

      case 'check':
        return tf(`Every jump in this pattern is bigger than the one before.\n${terms.join(', ')}`, jumpsGrow, {
          explanation: jumpsGrow
            ? `Yes — the jumps are ${terms.slice(1).map((v, i) => v - terms[i]).join(', ')}.`
            : 'No — the pattern goes forwards, then back, then forwards again.',
        })

      default:
        return entry(`What comes next?\n${terms.slice(0, 4).join(', ')}, ?`, terms[4], {
          speak: `What comes next after ${terms.slice(0, 4).join(', ')}?`,
          maxDigits: 4,
          explanation: whyNext,
        })
    }
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
    const head = `${run.join(', ')}, …`

    switch (rng.pick(['nth', 'position', 'jumps', 'inside', 'start'] as const)) {
      case 'position': {
        const pos = rng.int(6, [10, 12, 15, 18, 22][difficulty - 1])
        const value = first + (pos - 1) * step
        return entry(`${head}\nWhich position is ${value} in?`, pos, {
          speak: `The pattern is ${run.join(', ')} and so on. Which position is ${value} in?`,
          maxDigits: 3,
          explanation: `${value} − ${first} = ${value - first}, and ${value - first} ÷ ${step} = ${pos - 1} jumps, so it is number ${pos}.`,
        })
      }

      // Counting the jumps between two positions, which is the trap in the skill.
      case 'jumps': {
        const a = rng.int(2, 6)
        const b = a + rng.int(3, [6, 8, 10, 12, 16][difficulty - 1])
        return entry(
          `${head}\nHow many jumps from the ${ordinalShort(a)} number to the ${ordinalShort(b)}?`,
          b - a,
          {
            speak: `The pattern is ${run.join(', ')} and so on. How many jumps from number ${a} to number ${b}?`,
            maxDigits: 2,
            explanation: `${b} − ${a} = ${b - a} jumps. Positions minus positions, never the values.`,
          },
        )
      }

      case 'inside': {
        const pos = rng.int(6, [10, 12, 15, 18, 22][difficulty - 1])
        const value = first + (pos - 1) * step
        const inIt = rng.chance(0.5)
        const asked = inIt ? value : value + rng.int(1, step - 1)
        return tf(`${head}\nIs ${asked} in this pattern?`, inIt, {
          explanation: inIt
            ? `Yes — ${asked} is number ${pos} in the pattern.`
            : `No — the pattern jumps from ${value} to ${value + step}, straight over ${asked}.`,
        })
      }

      // Given a term far along, work back to where the pattern began.
      case 'start': {
        const pos = rng.int(5, [8, 10, 12, 15, 20][difficulty - 1])
        const value = first + (pos - 1) * step
        return entry(
          `A pattern goes up in ${step}s.\nIts ${ordinalShort(pos)} number is ${value}.\nWhat is its 1st number?`,
          first,
          {
            maxDigits: 3,
            explanation: `That is ${pos - 1} jumps of ${step}, which is ${(pos - 1) * step}. ${value} − ${(pos - 1) * step} = ${first}.`,
          },
        )
      }

      default: {
        const n = rng.int(6, [8, 10, 12, 16, 25][difficulty - 1])
        const answer = first + (n - 1) * step
        return entry(`${head}\nWhat is the ${ordinalShort(n)} number?`, answer, {
          speak: `The pattern is ${run.join(', ')} and so on. What is number ${n}?`,
          maxDigits: 4,
          explanation: `It goes up in ${step}s. ${first} + ${n - 1} × ${step} = ${answer}.`,
        })
      }
    }
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
