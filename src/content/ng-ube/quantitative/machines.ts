/**
 * Number Machines — in/out function boxes.
 *
 * A number goes in one end, something happens to it, a number comes out. It is
 * the friendliest possible introduction to a function, and it runs the whole
 * way from "add 2" in Basic 1 to working backwards through two machines in
 * Basic 6.
 *
 * Every skill asks its machine several ways round — run it forwards, check
 * somebody else's run, compare two machines, spot the line that does not fit.
 * Running the same box forwards two hundred times teaches the layout of the
 * question, not the idea inside it.
 */

import type { Rng } from '../../../engine/rng'
import { numericDistractors } from '../../../engine/rng'
import type { Item, SkillDef, StrandDef } from '../../../engine/types'
import { entry, mc, person, tapMany, tf, thing } from '../../shared/authoring'
import { machineFigure, pairLines } from './figures'

/** A wrong-but-believable version of `n`: off by one or two, never negative. */
const nearMiss = (rng: Rng, n: number): number => rng.pick(n >= 2 ? [-2, -1, 1, 2] : [1, 2]) + n

/** Same, for a number shown inside a table row rather than as an answer. */
const rowSlip = (rng: Rng, n: number): number => rng.pick(n >= 4 ? [-3, -2, 2, 3] : [2, 3]) + n

const addMachine: SkillDef = {
  id: 'ng.qr.machines.add-machine',
  title: 'The adding machine',
  yearBand: 'b1',
  concepts: ['function-machine'],
  hint: 'Whatever goes in, the machine adds the number on the box.',
  helpAtHome: 'Play "machine": you say a number, he says that number add three. Then swap.',
  generate: ({ rng, difficulty, locale }): Item => {
    const stepCap = [2, 3, 5, 9, 10][difficulty - 1]
    const cap = [5, 9, 12, 20, 30][difficulty - 1]
    const step = rng.int(1, stepCap)
    const input = rng.int(1, cap)
    const answer = input + step

    switch (rng.pick(['out', 'check', 'compare', 'story', 'lines'] as const)) {
      // Marking someone else's work uses the same addition, but the child has
      // to run the machine and then compare, not just run it.
      case 'check': {
        const ok = rng.chance(0.5)
        const claimed = ok ? answer : nearMiss(rng, answer)
        return tf(`Is this machine right?\n${machineFigure(input, [`+ ${step}`], claimed)}`, ok, {
          speak: `A machine adds ${step}. ${input} goes in and ${claimed} comes out. Is that right?`,
          explanation: `${input} + ${step} = ${answer}.`,
        })
      }

      case 'compare': {
        let other = rng.int(1, cap)
        let otherStep = rng.int(1, stepCap)
        let guard = 0
        while (other + otherStep === answer && guard++ < 20) {
          other = rng.int(1, cap)
          otherStep = rng.int(1, stepCap)
        }
        if (other + otherStep === answer) other += 1
        const mine = machineFigure(input, [`+ ${step}`], '?')
        const theirs = machineFigure(other, [`+ ${otherStep}`], '?')
        const mineWins = answer > other + otherStep
        return mc(rng, 'Which machine gives the bigger answer?', mineWins ? mine : theirs, [
          mineWins ? theirs : mine,
        ], {
          explanation: `${input} + ${step} = ${answer} and ${other} + ${otherStep} = ${other + otherStep}.`,
        })
      }

      case 'story': {
        const who = person(rng, locale)
        const noun = thing(rng, locale)
        return entry(`${who} has ${input} ${noun.many}.\nThe machine adds ${step} more.\nHow many come out?`, answer, {
          maxDigits: 3,
          explanation: `${input} + ${step} = ${answer}`,
        })
      }

      // Four finished runs, some right and some wrong.
      case 'lines': {
        const xs = rng.sample(Array.from({ length: cap }, (_, i) => i + 1), 4)
        const flags = rng.shuffle([true, true, false, false])
        return tapMany(
          rng,
          `This machine adds ${step}.\nTap every line that is right.`,
          xs.map((x, i) => ({
            value: `${x} → ${flags[i] ? x + step : nearMiss(rng, x + step)}`,
            correct: flags[i],
          })),
          {
            explanation: `Add ${step} to each number on the left: ${xs.map((x) => `${x} → ${x + step}`).join(', ')}.`,
          },
        )
      }

      default: {
        const prompt = `What comes out?\n${machineFigure(input, [`+ ${step}`], '?')}`
        const speak = `A machine adds ${step}. ${input} goes in. What comes out?`
        const explanation = `${input} + ${step} = ${answer}`
        if (difficulty <= 2) {
          return mc(rng, prompt, answer, numericDistractors(rng, answer, 3, { min: 0, max: answer + 10 }), {
            speak,
            explanation,
          })
        }
        return entry(prompt, answer, { speak, maxDigits: 3, explanation })
      }
    }
  },
}

const takeAwayMachine: SkillDef = {
  id: 'ng.qr.machines.take-away-machine',
  title: 'The taking-away machine',
  yearBand: 'b2',
  prerequisites: ['ng.qr.machines.add-machine'],
  concepts: ['function-machine'],
  hint: 'This machine makes numbers smaller. Take the box number away.',
  helpAtHome: 'Same game as the adding machine, but the machine takes four away every time.',
  generate: ({ rng, difficulty, locale }): Item => {
    const stepCap = [3, 5, 8, 10, 12][difficulty - 1]
    const cap = [10, 15, 25, 50, 90][difficulty - 1]
    const step = rng.int(1, stepCap)
    const input = rng.int(step, cap + step)
    const answer = input - step

    switch (rng.pick(['out', 'check', 'compare', 'story', 'lines'] as const)) {
      case 'check': {
        const ok = rng.chance(0.5)
        const claimed = ok ? answer : nearMiss(rng, answer)
        return tf(`Is this machine right?\n${machineFigure(input, [`− ${step}`], claimed)}`, ok, {
          speak: `A machine takes away ${step}. ${input} goes in and ${claimed} comes out. Is that right?`,
          explanation: `${input} − ${step} = ${answer}.`,
        })
      }

      case 'compare': {
        let other = rng.int(step, cap + step)
        const otherStep = rng.int(1, stepCap)
        let guard = 0
        while ((other - otherStep === answer || other < otherStep) && guard++ < 30) {
          other = rng.int(otherStep, cap + otherStep)
        }
        if (other < otherStep) other = otherStep + 1
        if (other - otherStep === answer) other += 1
        const mine = machineFigure(input, [`− ${step}`], '?')
        const theirs = machineFigure(other, [`− ${otherStep}`], '?')
        const mineWins = answer > other - otherStep
        return mc(rng, 'Which machine gives the bigger answer?', mineWins ? mine : theirs, [
          mineWins ? theirs : mine,
        ], {
          explanation: `${input} − ${step} = ${answer} and ${other} − ${otherStep} = ${other - otherStep}.`,
        })
      }

      case 'story': {
        const who = person(rng, locale)
        const noun = thing(rng, locale)
        return entry(
          `${who} puts ${input} ${noun.many} in.\nThe machine takes ${step} away.\nHow many come out?`,
          answer,
          { maxDigits: 3, explanation: `${input} − ${step} = ${answer}` },
        )
      }

      case 'lines': {
        const xs = rng.sample(Array.from({ length: cap }, (_, i) => i + step + 2), 4)
        const flags = rng.shuffle([true, true, false, false])
        return tapMany(
          rng,
          `This machine takes away ${step}.\nTap every line that is right.`,
          xs.map((x, i) => ({
            value: `${x} → ${flags[i] ? x - step : nearMiss(rng, x - step)}`,
            correct: flags[i],
          })),
          {
            explanation: `Take ${step} off each number on the left: ${xs.map((x) => `${x} → ${x - step}`).join(', ')}.`,
          },
        )
      }

      default: {
        const prompt = `What comes out?\n${machineFigure(input, [`− ${step}`], '?')}`
        const speak = `A machine takes away ${step}. ${input} goes in. What comes out?`
        const explanation = `${input} − ${step} = ${answer}`
        if (difficulty <= 2) {
          return mc(rng, prompt, answer, numericDistractors(rng, answer, 3, { min: 0, max: input + 10 }), {
            speak,
            explanation,
          })
        }
        return entry(prompt, answer, { speak, maxDigits: 3, explanation })
      }
    }
  },
}

const findInput: SkillDef = {
  id: 'ng.qr.machines.find-input',
  title: 'What went in?',
  yearBand: 'b3',
  prerequisites: ['ng.qr.machines.take-away-machine'],
  concepts: ['inverse-operation'],
  hint: 'Run the machine backwards. If it added, you take away.',
  helpAtHome: '"I thought of a number, added 6, and got 14." Let him undo it.',
  generate: ({ rng, difficulty, locale }): Item => {
    const adds = rng.chance(0.5)
    const step = rng.int(1, [3, 5, 9, 12, 20][difficulty - 1])
    const output = rng.int(step + 1, [12, 20, 40, 80, 150][difficulty - 1] + step)
    const answer = adds ? output - step : output + step
    const undo = adds
      ? `Undo the adding: ${output} − ${step} = ${answer}`
      : `Undo the taking away: ${output} + ${step} = ${answer}`

    switch (rng.pick(['in', 'check', 'story'] as const)) {
      // Checking a guess is the same inverse, done the easy way round.
      case 'check': {
        const ok = rng.chance(0.5)
        const guess = ok ? answer : nearMiss(rng, answer)
        return tf(
          `Someone says ${guess} went in.\n${machineFigure(guess, [`${adds ? '+' : '−'} ${step}`], output)}\nIs that right?`,
          ok,
          {
            speak: `A machine ${adds ? 'adds' : 'takes away'} ${step} and ${output} comes out. Someone says ${guess} went in. Is that right?`,
            explanation: undo,
          },
        )
      }

      case 'story': {
        const who = person(rng, locale)
        return entry(
          `${who} thought of a number, ${adds ? 'added' : 'took away'} ${step}, and got ${output}.\nWhat was the number?`,
          answer,
          { maxDigits: 4, explanation: undo },
        )
      }

      default:
        return entry(`What went in?\n${machineFigure('?', [`${adds ? '+' : '−'} ${step}`], output)}`, answer, {
          speak: `A machine ${adds ? 'adds' : 'takes away'} ${step} and ${output} comes out. What went in?`,
          maxDigits: 4,
          explanation: undo,
        })
    }
  },
}

const whatIsTheRule: SkillDef = {
  id: 'ng.qr.machines.what-is-the-rule',
  title: 'What does the machine do?',
  yearBand: 'b3',
  prerequisites: ['ng.qr.machines.take-away-machine'],
  concepts: ['find-the-rule'],
  hint: 'Check your idea against every line, not just the first one.',
  helpAtHome: 'Give three in/out pairs from a secret rule and let him name the rule.',
  generate: ({ rng, difficulty }): Item => {
    const kind = difficulty <= 2 ? rng.int(1, 2) : rng.int(1, 3)
    const k = rng.int(2, [4, 6, 9, 10, 12][difficulty - 1])
    const base = kind === 2 ? k + 1 : 1
    const pool = Array.from({ length: [10, 14, 18, 22, 26][difficulty - 1] }, (_, i) => i + base)
    const f = kind === 1 ? (x: number) => x + k : kind === 2 ? (x: number) => x - k : (x: number) => x * k
    const label = `${kind === 1 ? '+' : kind === 2 ? '−' : '×'} ${k}`
    const verb = kind === 1 ? 'adds' : kind === 2 ? 'takes away' : 'multiplies by'
    const gains = kind === 1 ? 'gains' : kind === 2 ? 'loses' : 'is multiplied by'

    switch (rng.pick(['name', 'howmuch', 'check', 'oddLine', 'apply'] as const)) {
      // The rule is named for you; the work is finding the number inside it.
      case 'howmuch': {
        const ins = rng.sample(pool, 3)
        const outs = ins.map(f)
        return entry(
          `This machine always ${verb} the same number.\n${pairLines(ins, outs)}\nWhat is that number?`,
          k,
          {
            speak: `${ins.map((x, i) => `${x} gives ${outs[i]}`).join('. ')}. The machine always ${verb} the same number. What number is it?`,
            maxDigits: 2,
            explanation: `${ins[0]} ${label} = ${outs[0]}, so the number is ${k}.`,
          },
        )
      }

      case 'check': {
        const ok = rng.chance(0.5)
        const ins = rng.sample(pool, 3)
        // A wrong claim is a rule that fits nothing, not a rule that nearly fits.
        const outs = ok ? ins.map(f) : ins.map((x) => f(x) + rng.int(1, 3))
        return tf(`Does this machine follow the rule ${label}?\n${pairLines(ins, outs)}`, ok, {
          speak: `${ins.map((x, i) => `${x} gives ${outs[i]}`).join('. ')}. Does this machine follow the rule ${label}?`,
          explanation: ok
            ? `Yes — ${ins[0]} ${label} = ${outs[0]}, and the other lines fit too.`
            : `No — ${ins[0]} ${label} = ${f(ins[0])}, but the machine gave ${outs[0]}.`,
        })
      }

      // One broken line among three good ones: the rule has to be tested on all of them.
      case 'oddLine': {
        const ins = rng.sample(pool, 4)
        const bad = rng.int(0, 3)
        const outs = ins.map((x, i) => (i === bad ? rowSlip(rng, f(x)) : f(x)))
        const lines = ins.map((x, i) => `${x} → ${outs[i]}`)
        return mc(
          rng,
          `One line does not follow the machine's rule.\nWhich line is wrong?\n${lines.join('\n')}`,
          lines[bad],
          lines.filter((_, i) => i !== bad),
          { explanation: `The rule is ${label}, so ${ins[bad]} should give ${f(ins[bad])}.` },
        )
      }

      // Find the rule, then use it once — the whole point of finding it.
      case 'apply': {
        const picked = rng.sample(pool, 4)
        const ins = picked.slice(0, 3)
        const outs = ins.map(f)
        const q = picked[3]
        return entry(`${pairLines(ins, outs)}\nWhat comes out when ${q} goes in?`, f(q), {
          speak: `${ins.map((x, i) => `${x} gives ${outs[i]}`).join('. ')}. What comes out when ${q} goes in?`,
          maxDigits: 4,
          explanation: `Every number ${gains} ${k}, so ${q} ${label} = ${f(q)}.`,
        })
      }

      default: {
        const ins = rng.sample(pool, 3)
        const outs = ins.map(f)
        const candidates: { label: string; f: (x: number) => number }[] = [
          { label: `+ ${k}`, f: (x) => x + k },
          { label: `− ${k}`, f: (x) => x - k },
          { label: `× ${k}`, f: (x) => x * k },
          { label: `+ ${k + 1}`, f: (x) => x + k + 1 },
          { label: `× ${k + 1}`, f: (x) => x * (k + 1) },
          { label: `+ ${k * 2}`, f: (x) => x + k * 2 },
        ]
        // Only offer a wrong option that is genuinely wrong for at least one line.
        const wrong = candidates
          .filter((c) => c.label !== label && ins.some((x, i) => c.f(x) !== outs[i]))
          .map((c) => c.label)

        return mc(rng, `What does this machine do?\n${pairLines(ins, outs)}`, label, wrong, {
          speak: `${ins.map((x, i) => `${x} gives ${outs[i]}`).join('. ')}. What does this machine do?`,
          explanation: `Every number ${gains} ${k}: ${ins[0]} ${label} = ${outs[0]}.`,
        })
      }
    }
  },
}

const timesMachine: SkillDef = {
  id: 'ng.qr.machines.times-machine',
  title: 'The times machine',
  yearBand: 'b4',
  prerequisites: ['ng.qr.machines.what-is-the-rule'],
  concepts: ['function-machine'],
  hint: 'This machine multiplies. To run it backwards, divide.',
  helpAtHome: 'Times tables in disguise — "in 7, times 4, what comes out?"',
  generate: ({ rng, difficulty }): Item => {
    const kCap = [3, 5, 7, 9, 12][difficulty - 1]
    const inCap = [6, 9, 12, 15, 20][difficulty - 1]
    const k = rng.int(2, kCap)
    const input = rng.int(2, inCap)
    const output = input * k

    switch (rng.pick(['out', 'in', 'check', 'canCome', 'compare'] as const)) {
      case 'in':
        return entry(`What went in?\n${machineFigure('?', [`× ${k}`], output)}`, input, {
          speak: `A machine multiplies by ${k} and ${output} comes out. What went in?`,
          maxDigits: 3,
          explanation: `${output} ÷ ${k} = ${input}`,
        })

      case 'check': {
        const ok = rng.chance(0.5)
        const claimed = ok ? output : output + rng.pick([-k, -1, 1, k])
        return tf(`Is this machine right?\n${machineFigure(input, [`× ${k}`], claimed)}`, ok, {
          speak: `A machine multiplies by ${k}. ${input} goes in and ${claimed} comes out. Is that right?`,
          explanation: `${input} × ${k} = ${output}.`,
        })
      }

      // Which numbers are even reachable — the times table read as a set.
      case 'canCome': {
        const hits = rng.sample(
          Array.from({ length: inCap }, (_, i) => (i + 2) * k),
          2,
        )
        const misses: number[] = []
        let guard = 0
        while (misses.length < 2 && guard++ < 200) {
          const v = rng.int(k + 1, (inCap + 1) * k)
          if (v % k !== 0 && !misses.includes(v)) misses.push(v)
        }
        return tapMany(
          rng,
          `This machine multiplies by ${k}.\nTap every number that could come out.`,
          [
            ...hits.map((v) => ({ value: v, correct: true })),
            ...misses.map((v) => ({ value: v, correct: false })),
          ],
          {
            explanation: `${hits.join(' and ')} are in the ${k} times table. ${misses.join(' and ')} are not.`,
          },
        )
      }

      case 'compare': {
        let other = rng.int(2, inCap)
        let otherK = rng.int(2, kCap)
        let guard = 0
        while (other * otherK === output && guard++ < 20) {
          other = rng.int(2, inCap)
          otherK = rng.int(2, kCap)
        }
        if (other * otherK === output) other += 1
        const mine = machineFigure(input, [`× ${k}`], '?')
        const theirs = machineFigure(other, [`× ${otherK}`], '?')
        const mineWins = output > other * otherK
        return mc(rng, 'Which machine gives the bigger answer?', mineWins ? mine : theirs, [
          mineWins ? theirs : mine,
        ], {
          explanation: `${input} × ${k} = ${output} and ${other} × ${otherK} = ${other * otherK}.`,
        })
      }

      default:
        return entry(`What comes out?\n${machineFigure(input, [`× ${k}`], '?')}`, output, {
          speak: `A machine multiplies by ${k}. ${input} goes in. What comes out?`,
          maxDigits: 4,
          explanation: `${input} × ${k} = ${output}`,
        })
    }
  },
}

const machineTable: SkillDef = {
  id: 'ng.qr.machines.machine-table',
  title: 'Fill the machine table',
  yearBand: 'b4',
  prerequisites: ['ng.qr.machines.what-is-the-rule'],
  concepts: ['find-the-rule'],
  hint: 'Work out the rule from the finished lines first, then use it on the last one.',
  helpAtHome: 'Write four in/out pairs with the last one blank and let him finish the table.',
  generate: ({ rng, difficulty }): Item => {
    const kind = rng.int(1, difficulty <= 2 ? 2 : difficulty === 3 ? 3 : 4)
    const k = rng.int(2, [5, 8, 10, 9, 9][difficulty - 1])
    const extra = rng.int(1, [3, 5, 8, 10, 12][difficulty - 1])
    const base = kind === 2 ? k + 1 : 1
    const ins = rng.sample(
      Array.from({ length: [10, 14, 16, 18, 20][difficulty - 1] }, (_, i) => i + base),
      4,
    )
    const f =
      kind === 1
        ? (x: number) => x + k
        : kind === 2
          ? (x: number) => x - k
          : kind === 3
            ? (x: number) => x * k
            : (x: number) => x * k + extra
    const outs = ins.map(f)
    const said =
      kind === 1 ? `add ${k}` : kind === 2 ? `take away ${k}` : kind === 3 ? `times ${k}` : `times ${k} then add ${extra}`
    const card =
      kind === 1 ? `+ ${k}` : kind === 2 ? `− ${k}` : kind === 3 ? `× ${k}` : `× ${k} then + ${extra}`

    switch (rng.pick(['fillOut', 'fillIn', 'rule', 'check', 'wrongRow'] as const)) {
      // Blanking an input instead of an output means running the rule backwards.
      case 'fillIn': {
        const shownIns = ins.map((v, i) => (i === 3 ? '?' : String(v)))
        return entry(`Find the rule, then fill the ?.\n${pairLines(shownIns, outs)}`, ins[3], {
          speak: `${ins.slice(0, 3).map((x, i) => `${x} gives ${outs[i]}`).join('. ')}. Something gives ${outs[3]}. What was it?`,
          maxDigits: 4,
          explanation: `The rule is ${said}, so the missing number is ${ins[3]}.`,
        })
      }

      case 'rule': {
        const wrong = [`× ${k} then + ${extra + 1}`, `+ ${k + extra}`, `× ${k + 1}`, `− ${k}`, `+ ${k}`, `× ${k}`]
          .filter((w) => w !== card && ins.some((x, i) => applyCard(w, x) !== outs[i]))
          .slice(0, 3)
        return mc(rng, `Which rule fits this table?\n${pairLines(ins, outs)}`, card, wrong, {
          speak: `${ins.map((x, i) => `${x} gives ${outs[i]}`).join('. ')}. Which rule fits?`,
          explanation: `Every line follows ${said}: ${ins[0]} gives ${outs[0]}.`,
        })
      }

      case 'check': {
        const ok = rng.chance(0.5)
        const claimed = ok ? said : kind === 1 ? `add ${k + 1}` : kind === 2 ? `take away ${k + 1}` : `times ${k + 1}`
        return tf(`Is the rule for this table "${claimed}"?\n${pairLines(ins, outs)}`, ok, {
          speak: `${ins.map((x, i) => `${x} gives ${outs[i]}`).join('. ')}. Is the rule ${claimed}?`,
          explanation: ok ? `Yes — every line follows ${said}.` : `No — the rule is ${said}.`,
        })
      }

      case 'wrongRow': {
        const bad = rng.int(0, 3)
        const shownOuts = outs.map((v, i) => (i === bad ? v + rng.pick([-3, -2, 2, 3]) : v))
        const lines = ins.map((x, i) => `${x} → ${shownOuts[i]}`)
        return mc(
          rng,
          `Three rows follow one rule. One does not.\nWhich row is wrong?\n${lines.join('\n')}`,
          lines[bad],
          lines.filter((_, i) => i !== bad),
          { explanation: `The rule is ${said}, so ${ins[bad]} should give ${outs[bad]}.` },
        )
      }

      default: {
        const shownOuts = outs.map((v, i) => (i === 3 ? '?' : String(v)))
        return entry(`Find the rule, then fill the ?.\n${pairLines(ins, shownOuts)}`, outs[3], {
          speak: `${ins.slice(0, 3).map((x, i) => `${x} gives ${outs[i]}`).join('. ')}. What does ${ins[3]} give?`,
          maxDigits: 4,
          explanation: `The rule is ${said}, so ${ins[3]} gives ${outs[3]}.`,
        })
      }
    }
  },
}

/** Read one of the machine-table answer cards back as a function. */
function applyCard(card: string, x: number): number {
  const two = card.match(/^× (\d+) then \+ (\d+)$/)
  if (two) return x * Number(two[1]) + Number(two[2])
  const one = card.match(/^([+−×]) (\d+)$/)
  if (!one) return NaN
  const n = Number(one[2])
  return one[1] === '+' ? x + n : one[1] === '−' ? x - n : x * n
}

const twoStepMachine: SkillDef = {
  id: 'ng.qr.machines.two-step-machine',
  title: 'Two machines in a row',
  yearBand: 'b5',
  prerequisites: ['ng.qr.machines.times-machine', 'ng.qr.machines.find-input'],
  concepts: ['function-machine'],
  hint: 'Finish the first machine completely before you start the second.',
  helpAtHome: '"Double it, then add five." Say a number and take turns running the pair.',
  generate: ({ rng, difficulty }): Item => {
    const times = rng.int(2, [3, 4, 5, 6, 9][difficulty - 1])
    const shift = rng.int(1, [5, 8, 10, 15, 20][difficulty - 1])
    const input = rng.int(1, [6, 8, 10, 12, 15][difficulty - 1])
    const middle = input * times
    const takes = difficulty >= 3 && middle > shift && rng.chance(0.4)
    const answer = takes ? middle - shift : middle + shift
    const second = `${takes ? '−' : '+'} ${shift}`
    const working = `${input} × ${times} = ${middle}, then ${middle} ${takes ? '−' : '+'} ${shift} = ${answer}.`

    switch (rng.pick(['out', 'middle', 'check', 'swap', 'second'] as const)) {
      // Stopping half way is where two-step answers actually go wrong.
      case 'middle':
        return entry(
          `${machineFigure(input, [`× ${times}`, second], '?')}\nWhat comes out of the FIRST machine?`,
          middle,
          {
            speak: `${input} goes in and is multiplied by ${times}, then we ${takes ? 'take away' : 'add'} ${shift}. What comes out of the first machine?`,
            maxDigits: 4,
            explanation: `The first machine only multiplies: ${input} × ${times} = ${middle}.`,
          },
        )

      case 'check': {
        const ok = rng.chance(0.5)
        // The classic slip: doing the second machine to the input instead.
        const claimed = ok ? answer : (takes ? input - Math.min(shift, input) : input + shift) * times
        return tf(
          `Is this right?\n${machineFigure(input, [`× ${times}`, second], claimed)}`,
          ok || claimed === answer,
          {
            speak: `${input} goes in, times ${times}, then ${takes ? 'take away' : 'add'} ${shift}, and ${claimed} comes out. Is that right?`,
            explanation: working,
          },
        )
      }

      // Order matters: × then + is not + then ×.
      case 'swap': {
        const swapped = takes ? Math.max(input - shift, 0) * times : (input + shift) * times
        const first = machineFigure(input, [`× ${times}`, second], '?')
        const other = machineFigure(input, [second, `× ${times}`], '?')
        if (swapped === answer) {
          return entry(`What comes out?\n${machineFigure(input, [`× ${times}`, second], '?')}`, answer, {
            speak: `${input} goes in. It is multiplied by ${times}, then ${takes ? 'we take away' : 'we add'} ${shift}. What comes out?`,
            maxDigits: 4,
            explanation: working,
          })
        }
        const firstWins = answer > swapped
        return mc(rng, 'Which order gives the bigger answer?', firstWins ? first : other, [
          firstWins ? other : first,
        ], {
          explanation: `Doing × ${times} first gives ${answer}. Doing ${second} first gives ${swapped}.`,
        })
      }

      // The second box is blank: the rule has to be worked out from the ends.
      case 'second':
        return mc(
          rng,
          `${machineFigure(input, [`× ${times}`, '?'], answer)}\nWhat does the second machine do?`,
          second,
          [`${takes ? '+' : '−'} ${shift}`, `× ${shift}`, `${takes ? '−' : '+'} ${shift + 1}`],
          {
            speak: `${input} times ${times} goes into a second machine and ${answer} comes out. What does the second machine do?`,
            explanation: `${input} × ${times} = ${middle}, and ${middle} ${second} = ${answer}.`,
          },
        )

      default:
        return entry(`What comes out?\n${machineFigure(input, [`× ${times}`, second], '?')}`, answer, {
          speak: `${input} goes in. It is multiplied by ${times}, then ${takes ? 'we take away' : 'we add'} ${shift}. What comes out?`,
          maxDigits: 4,
          explanation: working,
        })
    }
  },
}

const chainMachine: SkillDef = {
  id: 'ng.qr.machines.chain-machine',
  title: 'Machines in reverse',
  yearBand: 'b6',
  prerequisites: ['ng.qr.machines.two-step-machine'],
  concepts: ['inverse-operation'],
  hint: 'Start at the end and undo the last machine first.',
  helpAtHome: '"I doubled it, added 3, and got 21." Working backwards is the whole trick.',
  generate: ({ rng, difficulty }): Item => {
    const times = rng.int(2, [3, 4, 5, 6, 9][difficulty - 1])
    const shift = rng.int(1, [5, 8, 10, 15, 20][difficulty - 1])
    const input = rng.int(1, [8, 10, 12, 15, 20][difficulty - 1])
    const middle = input * times
    const takes = middle > shift && rng.chance(0.4)
    const output = takes ? middle - shift : middle + shift
    const second = `${takes ? '−' : '+'} ${shift}`

    if (difficulty >= 3 && rng.chance(0.5)) {
      // Three machines forward is a different kind of hard: no reversing, but
      // three chances to lose the thread.
      const last = rng.int(2, 4)
      const finalAnswer = output * last
      return entry(
        `What comes out?\n${machineFigure(input, [`× ${times}`, second, `× ${last}`], '?')}`,
        finalAnswer,
        {
          speak: `${input} goes in. Times ${times}, then ${takes ? 'take away' : 'add'} ${shift}, then times ${last}. What comes out?`,
          maxDigits: 5,
          explanation: `${input} × ${times} = ${middle}, ${middle} ${takes ? '−' : '+'} ${shift} = ${output}, ${output} × ${last} = ${finalAnswer}.`,
        },
      )
    }

    return entry(`What went in?\n${machineFigure('?', [`× ${times}`, second], output)}`, input, {
      speak: `A number is multiplied by ${times}, then ${takes ? 'we take away' : 'we add'} ${shift}, and ${output} comes out. What went in?`,
      maxDigits: 4,
      explanation: `Undo the last machine: ${output} ${takes ? '+' : '−'} ${shift} = ${middle}. Then ${middle} ÷ ${times} = ${input}.`,
    })
  },
}

export const machinesStrand: StrandDef = {
  id: 'ng.qr.machines',
  name: 'Machine Falls',
  blurb: 'Numbers go in one end and come out changed',
  theme: 'falls',
  skills: [
    addMachine,
    takeAwayMachine,
    findInput,
    whatIsTheRule,
    timesMachine,
    machineTable,
    twoStepMachine,
    chainMachine,
  ],
}
