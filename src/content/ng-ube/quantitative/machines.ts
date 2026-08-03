/**
 * Number Machines — in/out function boxes.
 *
 * A number goes in one end, something happens to it, a number comes out. It is
 * the friendliest possible introduction to a function, and it runs the whole
 * way from "add 2" in Basic 1 to working backwards through two machines in
 * Basic 6.
 */

import { numericDistractors } from '../../../engine/rng'
import type { Item, SkillDef, StrandDef } from '../../../engine/types'
import { entry, mc } from '../../shared/authoring'
import { machineFigure, pairLines } from './figures'

const addMachine: SkillDef = {
  id: 'ng.qr.machines.add-machine',
  title: 'The adding machine',
  yearBand: 'b1',
  concepts: ['function-machine'],
  hint: 'Whatever goes in, the machine adds the number on the box.',
  helpAtHome: 'Play "machine": you say a number, he says that number add three. Then swap.',
  generate: ({ rng, difficulty }): Item => {
    const step = rng.int(1, [2, 3, 5, 9, 10][difficulty - 1])
    const input = rng.int(1, [5, 9, 12, 20, 30][difficulty - 1])
    const answer = input + step
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
  generate: ({ rng, difficulty }): Item => {
    const step = rng.int(1, [3, 5, 8, 10, 12][difficulty - 1])
    const input = rng.int(step, [10, 15, 25, 50, 90][difficulty - 1] + step)
    const answer = input - step
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
  generate: ({ rng, difficulty }): Item => {
    const adds = rng.chance(0.5)
    const step = rng.int(1, [3, 5, 9, 12, 20][difficulty - 1])
    const output = rng.int(step + 1, [12, 20, 40, 80, 150][difficulty - 1] + step)
    const answer = adds ? output - step : output + step

    return entry(`What went in?\n${machineFigure('?', [`${adds ? '+' : '−'} ${step}`], output)}`, answer, {
      speak: `A machine ${adds ? 'adds' : 'takes away'} ${step} and ${output} comes out. What went in?`,
      maxDigits: 4,
      explanation: adds
        ? `Undo the adding: ${output} − ${step} = ${answer}`
        : `Undo the taking away: ${output} + ${step} = ${answer}`,
    })
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
    const ins = rng.sample(
      Array.from({ length: [10, 14, 18, 22, 26][difficulty - 1] }, (_, i) => i + base),
      3,
    )
    const f = kind === 1 ? (x: number) => x + k : kind === 2 ? (x: number) => x - k : (x: number) => x * k
    const outs = ins.map(f)
    const label = `${kind === 1 ? '+' : kind === 2 ? '−' : '×'} ${k}`

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
      explanation: `Every number ${kind === 1 ? 'gains' : kind === 2 ? 'loses' : 'is multiplied by'} ${k}: ${ins[0]} ${label} = ${outs[0]}.`,
    })
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
    const k = rng.int(2, [3, 5, 7, 9, 12][difficulty - 1])
    const input = rng.int(2, [6, 9, 12, 15, 20][difficulty - 1])
    const output = input * k

    if (difficulty >= 3 && rng.chance(0.4)) {
      return entry(`What went in?\n${machineFigure('?', [`× ${k}`], output)}`, input, {
        speak: `A machine multiplies by ${k} and ${output} comes out. What went in?`,
        maxDigits: 3,
        explanation: `${output} ÷ ${k} = ${input}`,
      })
    }

    return entry(`What comes out?\n${machineFigure(input, [`× ${k}`], '?')}`, output, {
      speak: `A machine multiplies by ${k}. ${input} goes in. What comes out?`,
      maxDigits: 4,
      explanation: `${input} × ${k} = ${output}`,
    })
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

    // Blanking an input instead of an output means running the rule backwards.
    if (difficulty >= 4 && rng.chance(0.35)) {
      const shownIns = ins.map((v, i) => (i === 3 ? '?' : String(v)))
      return entry(`Find the rule, then fill the ?.\n${pairLines(shownIns, outs)}`, ins[3], {
        speak: `${ins.slice(0, 3).map((x, i) => `${x} gives ${outs[i]}`).join('. ')}. Something gives ${outs[3]}. What was it?`,
        maxDigits: 4,
        explanation: `The rule is ${said}, so the missing number is ${ins[3]}.`,
      })
    }

    const shownOuts = outs.map((v, i) => (i === 3 ? '?' : String(v)))
    return entry(`Find the rule, then fill the ?.\n${pairLines(ins, shownOuts)}`, outs[3], {
      speak: `${ins.slice(0, 3).map((x, i) => `${x} gives ${outs[i]}`).join('. ')}. What does ${ins[3]} give?`,
      maxDigits: 4,
      explanation: `The rule is ${said}, so ${ins[3]} gives ${outs[3]}.`,
    })
  },
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

    return entry(`What comes out?\n${machineFigure(input, [`× ${times}`, second], '?')}`, answer, {
      speak: `${input} goes in. It is multiplied by ${times}, then ${takes ? 'we take away' : 'we add'} ${shift}. What comes out?`,
      maxDigits: 4,
      explanation: `${input} × ${times} = ${middle}, then ${middle} ${takes ? '−' : '+'} ${shift} = ${answer}.`,
    })
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
