/**
 * Code Forest — symbols standing in for numbers, and coding / decoding.
 *
 * Two ideas run through the strand. First, a symbol is just a number wearing a
 * disguise, which is algebra a good four years before anyone calls it that.
 * Second, a code is a rule applied to every number in turn — encode it going
 * forwards, decode it going backwards.
 */

import type { Item, SkillDef, StrandDef } from '../../../engine/types'
import { entry, mc } from '../../shared/authoring'
import { pad, SYMBOLS } from './figures'

const CODE_LETTERS = ['K', 'O', 'L', 'A', 'D', 'M', 'P', 'R', 'S', 'T']

const symbolValue: SkillDef = {
  id: 'ng.qr.codes.symbol-value',
  title: 'Secret symbols',
  yearBand: 'b2',
  prerequisites: ['ng.qr.machines.add-machine'],
  concepts: ['symbol-substitution'],
  hint: 'Swap the symbol for its number first, then do the sum.',
  helpAtHome: 'Say "a star means 4" and ask for star add three, star and star, and so on.',
  generate: ({ rng, difficulty }): Item => {
    const s = rng.pick(SYMBOLS)
    const value = rng.int(1, [5, 9, 10, 12, 20][difficulty - 1])
    const n = rng.int(1, [4, 6, 9, 10, 12][difficulty - 1])
    const variant = rng.int(1, difficulty <= 2 ? 2 : difficulty === 3 ? 3 : 4)

    if (variant === 2) {
      return entry(`${s} = ${value}\nWhat is ${s} + ${s}?`, value * 2, {
        speak: `A symbol is worth ${value}. What is the symbol plus the symbol?`,
        maxDigits: 3,
        explanation: `${value} + ${value} = ${value * 2}`,
      })
    }

    if (variant === 3) {
      const big = Math.max(value, n)
      const small = Math.min(value, n)
      return entry(`${s} = ${big}\nWhat is ${s} − ${small}?`, big - small, {
        speak: `A symbol is worth ${big}. What is the symbol take away ${small}?`,
        maxDigits: 3,
        explanation: `${big} − ${small} = ${big - small}`,
      })
    }

    if (variant === 4) {
      return entry(`${s} = ${value}\nWhat is ${s} × ${n}?`, value * n, {
        speak: `A symbol is worth ${value}. What is the symbol times ${n}?`,
        maxDigits: 4,
        explanation: `${value} × ${n} = ${value * n}`,
      })
    }

    return entry(`${s} = ${value}\nWhat is ${s} + ${n}?`, value + n, {
      speak: `A symbol is worth ${value}. What is the symbol plus ${n}?`,
      maxDigits: 3,
      explanation: `${value} + ${n} = ${value + n}`,
    })
  },
}

const shapeEquation: SkillDef = {
  id: 'ng.qr.codes.shape-equation',
  title: 'What is the shape worth?',
  yearBand: 'b3',
  prerequisites: ['ng.qr.codes.symbol-value'],
  concepts: ['symbol-substitution'],
  hint: 'Count how many of the shape there are, then share the total between them.',
  helpAtHome: '"Two stars make 10 — what is one star?" Halving, dressed up.',
  generate: ({ rng, difficulty }): Item => {
    const s = rng.pick(SYMBOLS)
    const value = rng.int(2, [6, 9, 12, 15, 20][difficulty - 1])
    const variant = rng.int(1, difficulty <= 2 ? 2 : 3)

    if (variant === 1) {
      const n = rng.int(1, [5, 8, 12, 20, 30][difficulty - 1])
      return entry(`${s} + ${n} = ${value + n}\nWhat is ${s}?`, value, {
        speak: `A symbol plus ${n} equals ${value + n}. What is the symbol worth?`,
        maxDigits: 3,
        explanation: `${value + n} − ${n} = ${value}`,
      })
    }

    if (variant === 2) {
      const copies = difficulty <= 2 ? 2 : rng.int(2, 3)
      const left = Array(copies).fill(s).join(' + ')
      return entry(`${left} = ${value * copies}\nWhat is ${s}?`, value, {
        speak: `${copies} symbols added together make ${value * copies}. What is one symbol worth?`,
        maxDigits: 3,
        explanation: `${value * copies} ÷ ${copies} = ${value}`,
      })
    }

    const k = rng.int(2, [3, 4, 5, 6, 9][difficulty - 1])
    return entry(`${s} × ${k} = ${value * k}\nWhat is ${s}?`, value, {
      speak: `A symbol times ${k} equals ${value * k}. What is the symbol worth?`,
      maxDigits: 3,
      explanation: `${value * k} ÷ ${k} = ${value}`,
    })
  },
}

const twoSymbols: SkillDef = {
  id: 'ng.qr.codes.two-symbols',
  title: 'Two secret symbols',
  yearBand: 'b4',
  prerequisites: ['ng.qr.codes.shape-equation'],
  concepts: ['symbol-substitution'],
  hint: 'Write the numbers underneath the symbols, then read the sum normally.',
  helpAtHome: 'Give two symbols two values and ask for their total, difference and product.',
  generate: ({ rng, difficulty }): Item => {
    const [s1, s2] = rng.sample(SYMBOLS, 2)
    const cap = [6, 8, 10, 12, 15][difficulty - 1]
    const a = rng.int(2, cap)
    const b = rng.int(1, a)
    const key = `${s1} = ${a}${pad(4)}${s2} = ${b}`
    const say = `${s1} is ${a} and ${s2} is ${b}.`
    const variant = rng.int(1, difficulty <= 2 ? 2 : difficulty === 3 ? 3 : 4)

    if (variant === 2) {
      return entry(`${key}\nWhat is ${s1} − ${s2}?`, a - b, {
        speak: `${say} What is the first symbol take away the second?`,
        maxDigits: 3,
        explanation: `${a} − ${b} = ${a - b}`,
      })
    }

    if (variant === 3) {
      return entry(`${key}\nWhat is ${s1} × ${s2}?`, a * b, {
        speak: `${say} What is the first symbol times the second?`,
        maxDigits: 4,
        explanation: `${a} × ${b} = ${a * b}`,
      })
    }

    if (variant === 4) {
      return entry(`${key}\nWhat is ${s1} + ${s1} + ${s2}?`, a * 2 + b, {
        speak: `${say} What is the first symbol, plus the first symbol again, plus the second?`,
        maxDigits: 4,
        explanation: `${a} + ${a} + ${b} = ${a * 2 + b}`,
      })
    }

    return entry(`${key}\nWhat is ${s1} + ${s2}?`, a + b, {
      speak: `${say} What is the first symbol plus the second?`,
      maxDigits: 3,
      explanation: `${a} + ${b} = ${a + b}`,
    })
  },
}

const codeRule: SkillDef = {
  id: 'ng.qr.codes.code-rule',
  title: 'Number codes',
  yearBand: 'b4',
  prerequisites: ['ng.qr.machines.what-is-the-rule'],
  concepts: ['coding-decoding'],
  hint: 'Find what happened to the numbers you were given, then do the same thing.',
  helpAtHome: 'Invent a code — "every number goes up by 7" — and send each other short messages.',
  generate: ({ rng, difficulty }): Item => {
    const kind = difficulty <= 2 ? 1 : difficulty === 3 ? rng.int(1, 2) : rng.int(1, 3)
    const k = rng.int(2, [6, 9, 12, 9, 9][difficulty - 1])
    const extra = rng.int(1, [3, 4, 5, 8, 10][difficulty - 1])
    const encode =
      kind === 1 ? (x: number) => x + k : kind === 2 ? (x: number) => x * k : (x: number) => x * k + extra
    const said = kind === 1 ? `add ${k}` : kind === 2 ? `multiply by ${k}` : `multiply by ${k} then add ${extra}`

    const shown = rng.sample(
      Array.from({ length: [10, 14, 16, 18, 20][difficulty - 1] }, (_, i) => i + 2),
      3,
    )
    const examples = shown
      .slice(0, 2)
      .map((v) => `${v} is written as ${encode(v)}`)
      .join(', ')
    const target = shown[2]

    // Decoding is the harder direction: you have to undo the rule, not run it.
    if (difficulty >= 4 && rng.chance(0.45)) {
      const coded = encode(target)
      return entry(`In a code, ${examples}.\nWhich number is written as ${coded}?`, target, {
        maxDigits: 4,
        explanation: `The code is "${said}", so ${target} is written as ${coded}.`,
      })
    }

    return entry(`In a code, ${examples}.\nHow is ${target} written?`, encode(target), {
      maxDigits: 4,
      explanation: `The code is "${said}": ${target} becomes ${encode(target)}.`,
    })
  },
}

const balance: SkillDef = {
  id: 'ng.qr.codes.balance',
  title: 'Balance the symbols',
  yearBand: 'b5',
  prerequisites: ['ng.qr.codes.two-symbols'],
  concepts: ['symbol-substitution'],
  hint: 'Swap in the symbol you already know, then work out what is left.',
  helpAtHome: 'Use coins as symbols on the table and let him balance the two sides.',
  generate: ({ rng, difficulty }): Item => {
    const [s1, s2] = rng.sample(SYMBOLS, 2)
    const cap = [5, 8, 10, 12, 15][difficulty - 1]
    const a = rng.int(1, cap)
    const b = rng.int(1, cap)
    const copies = difficulty <= 2 ? 2 : rng.int(2, 3)
    const total = a * copies + b
    const left = `${Array(copies).fill(s1).join(' + ')} + ${s2}`

    if (difficulty >= 4 && rng.chance(0.4)) {
      // Two equations: the second one hands you the value you need.
      const gap = rng.int(1, cap)
      const bigger = b + gap
      return entry(
        `${s1} + ${s2} = ${b + bigger}\n${s2} = ${s1} + ${gap}\nWhat is ${s1}?`,
        b,
        {
          speak: `The two symbols add up to ${b + bigger}, and the second symbol is ${gap} more than the first. What is the first symbol worth?`,
          maxDigits: 3,
          explanation: `Take the extra ${gap} off: ${b + bigger} − ${gap} = ${b * 2}, and half of that is ${b}.`,
        },
      )
    }

    return entry(`${left} = ${total}\n${s2} = ${b}\nWhat is ${s1}?`, a, {
      speak: `${copies} of the first symbol plus the second symbol make ${total}. The second symbol is ${b}. What is the first symbol worth?`,
      maxDigits: 3,
      explanation: `${total} − ${b} = ${a * copies}, and ${a * copies} ÷ ${copies} = ${a}.`,
    })
  },
}

const letterDigits: SkillDef = {
  id: 'ng.qr.codes.letter-digits',
  title: 'Letter codes',
  yearBand: 'b6',
  prerequisites: ['ng.qr.codes.code-rule'],
  concepts: ['coding-decoding'],
  hint: 'Write the digit under each letter, in the same order.',
  helpAtHome: 'Give each letter of his name a digit and write phone-style messages to each other.',
  generate: ({ rng, difficulty }): Item => {
    const size = [3, 4, 4, 5, 5][difficulty - 1]
    const letters = rng.sample(CODE_LETTERS, size)
    const digits = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], size)
    const key = letters.map((l, i) => `${l}=${digits[i]}`).join('  ')

    const wordLength = [2, 2, 3, 3, 4][difficulty - 1]
    const picks = rng.sample(
      letters.map((_, i) => i),
      wordLength,
    )
    const word = picks.map((i) => letters[i]).join('')
    const number = Number(picks.map((i) => digits[i]).join(''))
    const working = picks.map((i) => `${letters[i]} is ${digits[i]}`).join(', ')

    // Encoding needs the digits looked up backwards, which is the harder way.
    if (difficulty >= 3 && rng.chance(0.4)) {
      const spare = letters.filter((l) => !picks.includes(letters.indexOf(l)))
      const swap = (w: string) => {
        const chars = w.split('')
        const at = rng.int(0, chars.length - 1)
        chars[at] = spare.length ? rng.pick(spare) : letters[(letters.indexOf(chars[at]) + 1) % size]
        return chars.join('')
      }
      const wrong = [
        [...word].reverse().join(''),
        swap(word),
        [...word.slice(1), word[0]].join(''),
      ]
      return mc(rng, `${key}\nHow do you write ${number} in this code?`, word, wrong, {
        speak: `Using the code, how do you write ${number}?`,
        explanation: `${working}.`,
      })
    }

    return entry(`${key}\nWhat number is ${word}?`, number, {
      speak: `Using the code, what number is spelled ${word.split('').join(' ')}?`,
      maxDigits: 5,
      explanation: `${working}, so ${word} is ${number}.`,
    })
  },
}

export const codesStrand: StrandDef = {
  id: 'ng.qr.codes',
  name: 'Code Forest',
  blurb: 'Symbols standing in for numbers, and secret number codes',
  theme: 'forest',
  skills: [symbolValue, shapeEquation, twoSymbols, codeRule, balance, letterDigits],
}
