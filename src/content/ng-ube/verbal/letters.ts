/** Letter Logic — Nigerian UBE Basic 1 → Basic 6. */

import type { Rng } from '../../../engine/rng'
import type { Item, SkillDef, StrandDef } from '../../../engine/types'
import { entry, mc, order, tapMany } from '../../shared/authoring'
import {
  ALPHABET,
  VOWELS,
  countVowels,
  isVowel,
  letterAt,
  letterIndex,
  shiftLetter,
  shiftWord,
  spell,
  tierFor,
  upper,
  wordsOfLength,
} from './words'

/* ------------------------------------------------------------------ *
 * Shared helpers
 * ------------------------------------------------------------------ */

/** Letters a child might confuse with `answer` — the ones next door. */
function letterDistractors(rng: Rng, answer: string, n: number): string[] {
  const i = ALPHABET.indexOf(answer.toUpperCase())
  const near = [i - 1, i + 1, i - 2, i + 2, i + 3, i - 3]
    .filter((j) => j >= 0 && j < 26)
    .map((j) => ALPHABET[j])
  const out: string[] = []
  for (const c of [...rng.shuffle(near), ...rng.shuffle(ALPHABET)]) {
    if (c === answer.toUpperCase() || out.includes(c)) continue
    out.push(c)
    if (out.length >= n) break
  }
  return out
}

const wordsFor = (rng: Rng, tier: number, n: number, min = 3, max = 9): string[] => {
  return rng.sample(wordsOfLength(tier, min, max), n)
}

const alphabetically = (words: string[]): string[] => [...words].sort((a, b) => (a < b ? -1 : 1))

/* ------------------------------------------------------------------ *
 * The alphabet
 * ------------------------------------------------------------------ */

const alphabet: SkillDef = {
  id: 'ng.vr.letters.alphabet',
  title: 'The alphabet',
  yearBand: 'b1',
  concepts: ['alphabet-order'],
  hint: 'Sing the alphabet quietly in your head until you reach that letter.',
  helpAtHome: 'Sing the alphabet, then stop halfway and ask what comes next.',
  generate: ({ rng, difficulty }): Item => {
    const variant = rng.int(1, difficulty >= 3 ? 4 : 3)

    if (variant === 1) {
      const i = rng.int(0, 24)
      const answer = ALPHABET[i + 1]
      return mc(rng, `Which letter comes just AFTER ${ALPHABET[i]}?`, answer, letterDistractors(rng, answer, 3), {
        speak: `Which letter comes just after ${ALPHABET[i]}?`,
        explanation: `${ALPHABET[i]} then ${answer}.`,
      })
    }

    if (variant === 2) {
      const i = rng.int(1, 25)
      const answer = ALPHABET[i - 1]
      return mc(rng, `Which letter comes just BEFORE ${ALPHABET[i]}?`, answer, letterDistractors(rng, answer, 3), {
        speak: `Which letter comes just before ${ALPHABET[i]}?`,
        explanation: `${answer} then ${ALPHABET[i]}.`,
      })
    }

    if (variant === 3) {
      const start = rng.int(0, 21)
      const hole = rng.int(1, 3)
      const run = [0, 1, 2, 3, 4].map((k) => ALPHABET[start + k])
      const shown = run.map((c, k) => (k === hole ? '?' : c)).join(' ')
      const answer = run[hole]
      return mc(rng, `Which letter is missing?\n${shown}`, answer, letterDistractors(rng, answer, 3), {
        speak: `Which letter is missing from ${run.map((c, k) => (k === hole ? 'blank' : c)).join(', ')}?`,
        explanation: `The alphabet runs ${run.join(', ')}.`,
      })
    }

    const jump = rng.int(2, difficulty >= 4 ? 5 : 3)
    const forward = rng.chance(0.6)
    const i = forward ? rng.int(0, 25 - jump) : rng.int(jump, 25)
    const answer = ALPHABET[forward ? i + jump : i - jump]
    return mc(
      rng,
      `Which letter is ${jump} places ${forward ? 'AFTER' : 'BEFORE'} ${ALPHABET[i]}?`,
      answer,
      letterDistractors(rng, answer, 3),
      { explanation: `Count ${jump} ${forward ? 'forwards' : 'backwards'} from ${ALPHABET[i]} to reach ${answer}.` },
    )
  },
}

/* ------------------------------------------------------------------ *
 * Vowels and consonants
 * ------------------------------------------------------------------ */

const vowels: SkillDef = {
  id: 'ng.vr.letters.vowels',
  title: 'Vowels and consonants',
  yearBand: 'b1',
  concepts: ['vowels-consonants'],
  hint: 'The five vowels are A, E, I, O and U. Every other letter is a consonant.',
  helpAtHome: 'Ask them to count the vowels in their own name.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(1, difficulty)
    const variant = rng.int(1, 4)

    if (variant === 1) {
      const letter = rng.pick(ALPHABET)
      const answer = isVowel(letter) ? 'Vowel' : 'Consonant'
      return mc(rng, `Is the letter ${letter} a vowel or a consonant?`, answer, [
        isVowel(letter) ? 'Consonant' : 'Vowel',
      ], {
        explanation: `The vowels are A, E, I, O and U, so ${letter} is a ${answer.toLowerCase()}.`,
      })
    }

    if (variant === 2) {
      const right = rng.sample(VOWELS, 2)
      const wrong = rng.shuffle(ALPHABET.filter((c) => !isVowel(c))).slice(0, 4)
      return tapMany(
        rng,
        'Tap every VOWEL',
        [
          ...right.map((v) => ({ value: v, correct: true })),
          ...wrong.map((v) => ({ value: v, correct: false })),
        ],
        { explanation: 'The vowels are A, E, I, O and U.' },
      )
    }

    if (variant === 3) {
      const [word] = wordsFor(rng, tier, 1, 3, 9)
      const target = word ?? 'mango'
      return entry(`How many vowels are in the word ${upper(target)}?`, countVowels(target), {
        maxDigits: 1,
        speak: `How many vowels are in the word ${target}?`,
        explanation: `${upper(target)} has the vowels ${upper(target.split('').filter(isVowel).join(' '))}.`,
      })
    }

    const picks = wordsFor(rng, tier, 4, 4, 9)
    if (picks.length < 2) {
      const fallback = 'banana'
      return entry(`How many vowels are in the word ${upper(fallback)}?`, countVowels(fallback), {
        maxDigits: 1,
        explanation: 'BANANA has three vowels: A, A, A.',
      })
    }
    const best = picks.reduce((a, b) => (countVowels(b) > countVowels(a) ? b : a))
    const tie = picks.filter((w) => countVowels(w) === countVowels(best)).length > 1
    if (tie) {
      return entry(`How many vowels are in the word ${upper(best)}?`, countVowels(best), {
        maxDigits: 1,
        explanation: `${upper(best)} has ${countVowels(best)} vowels.`,
      })
    }
    return mc(rng, 'Which word has the MOST vowels?', best, picks.filter((w) => w !== best), {
      explanation: `${upper(best)} has ${countVowels(best)} vowels.`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * Alphabetical order
 * ------------------------------------------------------------------ */

const alphaOrder: SkillDef = {
  id: 'ng.vr.letters.alpha-order',
  title: 'Alphabetical order',
  yearBand: 'b2',
  prerequisites: ['ng.vr.letters.alphabet'],
  concepts: ['alphabetical-order'],
  hint: 'Look at the first letter of each word and work through the alphabet.',
  helpAtHome: 'Put five things from the kitchen in alphabetical order together.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(1, difficulty)
    const count = difficulty >= 4 ? 5 : 4
    // Distinct first letters keeps this a first-letter task.
    const pool = wordsOfLength(tier, 3, 9)
    const chosen: string[] = []
    const used = new Set<string>()
    for (const w of rng.shuffle(pool)) {
      if (used.has(w[0])) continue
      used.add(w[0])
      chosen.push(w)
      if (chosen.length === count) break
    }
    for (const w of rng.shuffle(pool)) {
      if (chosen.length >= count) break
      if (!chosen.includes(w)) chosen.push(w)
    }
    const sorted = alphabetically(chosen)
    const variant = rng.int(1, 3)

    if (variant === 1) {
      return order(rng, 'Put these words in alphabetical order', sorted, {
        explanation: `In alphabetical order: ${sorted.join(', ')}.`,
      })
    }

    if (variant === 2) {
      return mc(rng, 'Which word comes FIRST in the dictionary?', sorted[0], sorted.slice(1), {
        explanation: `${sorted[0]} starts with ${sorted[0][0].toUpperCase()}, which comes first.`,
      })
    }

    const last = sorted[sorted.length - 1]
    return mc(rng, 'Which word comes LAST in the dictionary?', last, sorted.slice(0, -1), {
      explanation: `${last} starts with ${last[0].toUpperCase()}, the latest letter here.`,
    })
  },
}

const alphaOrderHard: SkillDef = {
  id: 'ng.vr.letters.alpha-order-hard',
  title: 'Alphabetical order — same first letter',
  yearBand: 'b4',
  prerequisites: ['ng.vr.letters.alpha-order'],
  concepts: ['alphabetical-order-deep'],
  hint: 'If the first letters match, compare the second. If those match too, compare the third.',
  helpAtHome: 'Open a dictionary at any page and ask which of two words comes first.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(2, difficulty)
    const count = difficulty >= 4 ? 4 : 3
    const pool = wordsOfLength(tier, 4, 11)
    const byLetter = new Map<string, string[]>()
    for (const w of pool) {
      const list = byLetter.get(w[0]) ?? []
      list.push(w)
      byLetter.set(w[0], list)
    }
    const groups = [...byLetter.values()].filter((g) => g.length >= count)
    const chosen = groups.length ? rng.sample(rng.pick(groups), count) : rng.sample(pool, count)
    const sorted = alphabetically(chosen)

    if (rng.chance(0.5)) {
      return order(rng, 'Put these words in alphabetical order', sorted, {
        explanation: `In alphabetical order: ${sorted.join(', ')}.`,
      })
    }

    const first = rng.chance(0.5)
    const answer = first ? sorted[0] : sorted[sorted.length - 1]
    const rest = sorted.filter((w) => w !== answer)
    return mc(rng, `Which word comes ${first ? 'FIRST' : 'LAST'} in the dictionary?`, answer, rest, {
      explanation: `In order: ${sorted.join(', ')}.`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * Position in the alphabet
 * ------------------------------------------------------------------ */

const position: SkillDef = {
  id: 'ng.vr.letters.position',
  title: 'Letter positions',
  yearBand: 'b3',
  prerequisites: ['ng.vr.letters.alphabet'],
  concepts: ['letter-position'],
  hint: 'A is 1, and every letter after it is one more. M is right in the middle at 13.',
  helpAtHome: 'Write the alphabet with numbers underneath and quiz each other.',
  generate: ({ rng, difficulty }): Item => {
    const max = [10, 14, 20, 26, 26][difficulty - 1]
    const variant = rng.int(1, 3)

    if (variant === 1) {
      const n = rng.int(1, max)
      return entry(`What position is the letter ${letterAt(n)} in the alphabet?`, n, {
        maxDigits: 2,
        explanation: `A is 1, so ${letterAt(n)} is ${n}.`,
      })
    }

    if (variant === 2) {
      const n = rng.int(1, max)
      const answer = letterAt(n)
      return mc(rng, `Which letter is number ${n} in the alphabet?`, answer, letterDistractors(rng, answer, 3), {
        explanation: `Counting from A, letter ${n} is ${answer}.`,
      })
    }

    const a = rng.int(1, Math.max(2, max - 1))
    let b = rng.int(1, max)
    while (b === a) b = rng.int(1, max)
    const answer = Math.abs(letterIndex(letterAt(a)) - letterIndex(letterAt(b)))
    return entry(
      `How many places apart are ${letterAt(a)} and ${letterAt(b)} in the alphabet?`,
      answer,
      {
        maxDigits: 2,
        explanation: `${letterAt(a)} is ${a} and ${letterAt(b)} is ${b}, so they are ${answer} apart.`,
      },
    )
  },
}

/* ------------------------------------------------------------------ *
 * Letter sequences
 * ------------------------------------------------------------------ */

const sequences: SkillDef = {
  id: 'ng.vr.letters.sequences',
  title: 'Letter sequences',
  yearBand: 'b4',
  prerequisites: ['ng.vr.letters.alphabet'],
  concepts: ['letter-sequences'],
  hint: 'Count the steps between the first two letters, then check it happens again.',
  helpAtHome: 'Write A C E G on paper and ask what comes next, then invent your own.',
  generate: ({ rng, difficulty }): Item => {
    const style = difficulty <= 2 ? 1 : difficulty <= 3 ? rng.int(1, 2) : rng.int(1, 4)

    if (style === 1) {
      const step = rng.pick(difficulty <= 2 ? [1, 2] : [1, 2, 3, -1, -2, -3])
      const span = step * 4
      const start = step > 0 ? rng.int(0, 25 - span) : rng.int(-span, 25)
      const run = [0, 1, 2, 3, 4].map((k) => ALPHABET[start + k * step])
      const answer = run[4]
      return mc(rng, `What comes next?\n${run.slice(0, 4).join('  ')}  ?`, answer, letterDistractors(rng, answer, 3), {
        speak: `What letter comes next after ${run.slice(0, 4).join(', ')}?`,
        explanation: `Each letter jumps ${Math.abs(step)} ${step > 0 ? 'forward' : 'back'}: ${run.join(', ')}.`,
      })
    }

    if (style === 2) {
      // Pairs marching together: AB CD EF …
      const step = rng.pick([1, 2])
      const gap = rng.int(1, 2)
      const start = rng.int(0, 25 - (step * 2 * 3 + gap))
      const pair = (k: number) => `${ALPHABET[start + k * step * 2]}${ALPHABET[start + k * step * 2 + gap]}`
      const run = [0, 1, 2, 3].map(pair)
      const answer = run[3]
      const wrong = [
        `${shiftLetter(answer[0], 1)}${answer[1]}`,
        `${answer[0]}${shiftLetter(answer[1], 1)}`,
        `${shiftLetter(answer[0], -1)}${shiftLetter(answer[1], -1)}`,
      ]
      return mc(rng, `What comes next?\n${run.slice(0, 3).join('  ')}  ?`, answer, wrong, {
        speak: `What comes next after ${run.slice(0, 3).map(spell).join(', ')}?`,
        explanation: `The pattern goes ${run.join(', ')}.`,
      })
    }

    if (style === 3) {
      // Mirror pairs: the first letter walks forward, the second walks back.
      const start = rng.int(0, 20)
      const from = rng.int(5, 25)
      const pair = (k: number) => `${ALPHABET[start + k]}${ALPHABET[from - k]}`
      const run = [0, 1, 2, 3].map(pair)
      const answer = run[3]
      const wrong = [
        `${answer[0]}${shiftLetter(answer[1], -1)}`,
        `${shiftLetter(answer[0], 1)}${answer[1]}`,
        `${shiftLetter(answer[0], -1)}${shiftLetter(answer[1], 1)}`,
      ]
      return mc(rng, `What comes next?\n${run.slice(0, 3).join('  ')}  ?`, answer, wrong, {
        speak: `What comes next after ${run.slice(0, 3).map(spell).join(', ')}?`,
        explanation: `The first letter moves forward and the second moves back: ${run.join(', ')}.`,
      })
    }

    // Alternating steps: +1, +3, +1, +3 …
    const a = rng.int(1, 2)
    const b = rng.int(3, 4)
    const start = rng.int(0, 25 - (a * 2 + b * 2))
    const run: string[] = [ALPHABET[start]]
    let at = start
    for (let k = 0; k < 4; k++) {
      at += k % 2 === 0 ? a : b
      run.push(ALPHABET[at])
    }
    const answer = run[4]
    return mc(rng, `What comes next?\n${run.slice(0, 4).join('  ')}  ?`, answer, letterDistractors(rng, answer, 3), {
      speak: `What letter comes next after ${run.slice(0, 4).join(', ')}?`,
      explanation: `The jumps go ${a}, ${b}, ${a}, ${b}: ${run.join(', ')}.`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * Coded words
 * ------------------------------------------------------------------ */

const codes: SkillDef = {
  id: 'ng.vr.letters.codes',
  title: 'Secret letter codes',
  yearBand: 'b4',
  prerequisites: ['ng.vr.letters.alphabet'],
  concepts: ['letter-codes'],
  hint: 'Work out how far each letter has moved in the example, then move the same way.',
  helpAtHome: 'Send each other notes where every letter is moved one place along.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(1, difficulty)
    const maxShift = [1, 2, 3, 4, 5][difficulty - 1]
    const shift = rng.int(1, maxShift) * (difficulty >= 4 && rng.chance(0.4) ? -1 : 1)
    const [sample, target] = rng.sample(wordsOfLength(tier, 3, 5), 2)

    const coded = shiftWord(target, shift)
    const direction = shift > 0 ? 'forward' : 'back'
    const clue = `${upper(sample)} is written as ${shiftWord(sample, shift)}.`

    // Offsets that can never land on the answer, on the plain word, or on the
    // coded word already printed in the question.
    const offsets = (exclude: number[]) =>
      [shift + 1, shift - 1, -shift, shift + 2, 2].filter(
        (o, i, all) => o !== 0 && !exclude.includes(o) && all.indexOf(o) === i,
      )

    if (rng.chance(0.5)) {
      const wrong = offsets([shift]).slice(0, 3).map((o) => shiftWord(target, o))
      return mc(rng, `In a code, ${clue}\nHow is ${upper(target)} written?`, coded, wrong, {
        speak: `In a code, ${sample} is written as ${spell(shiftWord(sample, shift))}. How is ${target} written?`,
        explanation: `Every letter moves ${Math.abs(shift)} place${Math.abs(shift) === 1 ? '' : 's'} ${direction}, so ${upper(target)} becomes ${coded}.`,
      })
    }

    const wrong = offsets([shift]).slice(0, 3).map((o) => shiftWord(target, o))
    return mc(rng, `In a code, ${clue}\nWhat does ${coded} mean?`, upper(target), wrong, {
      speak: `In a code, ${sample} is written as ${spell(shiftWord(sample, shift))}. What does ${spell(coded)} mean?`,
      explanation: `Move every letter ${Math.abs(shift)} place${Math.abs(shift) === 1 ? '' : 's'} back the other way to get ${upper(target)}.`,
    })
  },
}

const codesHard: SkillDef = {
  id: 'ng.vr.letters.codes-hard',
  title: 'Breaking harder codes',
  yearBand: 'b6',
  prerequisites: ['ng.vr.letters.codes'],
  concepts: ['letter-codes-advanced'],
  hint: 'Check the first letter, then the last. Sometimes the whole word is turned round.',
  helpAtHome: 'Give them a coded word and let them work out the rule with no clues.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(3, difficulty)
    const [sample, target] = rng.sample(wordsOfLength(tier, 4, 8), 2)
    const rule = rng.int(1, difficulty >= 4 ? 3 : 2)
    const shift = rng.int(2, 5) * (rng.chance(0.4) ? -1 : 1)

    const apply = (w: string): string => {
      if (rule === 1) return shiftWord(w, shift)
      if (rule === 2) return upper(w).split('').reverse().join('')
      return shiftWord(w, shift).split('').reverse().join('')
    }
    const describe =
      rule === 1
        ? `every letter moves ${Math.abs(shift)} place${Math.abs(shift) === 1 ? '' : 's'} ${shift > 0 ? 'forward' : 'back'}`
        : rule === 2
          ? 'the word is written backwards'
          : `every letter moves ${Math.abs(shift)} ${shift > 0 ? 'forward' : 'back'} and then the word is written backwards`

    const answer = apply(target)
    const wrong = [
      shiftWord(target, shift),
      upper(target).split('').reverse().join(''),
      shiftWord(target, -shift),
      shiftWord(target, shift + 1),
    ].filter((w) => w !== answer)

    return mc(
      rng,
      `In a code, ${upper(sample)} is written as ${apply(sample)}.\nHow is ${upper(target)} written?`,
      answer,
      wrong,
      {
        speak: `In a code, ${sample} is written as ${spell(apply(sample))}. How is ${target} written?`,
        explanation: `In this code ${describe}, so ${upper(target)} becomes ${answer}.`,
      },
    )
  },
}

/* ------------------------------------------------------------------ *
 * Number codes
 * ------------------------------------------------------------------ */

const numberCodes: SkillDef = {
  id: 'ng.vr.letters.number-codes',
  title: 'Letters as numbers',
  yearBand: 'b5',
  prerequisites: ['ng.vr.letters.position'],
  concepts: ['letter-number-codes'],
  hint: 'A is 1, B is 2, and so on all the way to Z, which is 26.',
  helpAtHome: 'Work out the number value of each other’s names and see whose is biggest.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(1, difficulty)
    const maxLen = difficulty >= 4 ? 5 : 4
    const pool = wordsOfLength(tier, 3, maxLen)
    const word = rng.pick(pool)
    const values = word.split('').map(letterIndex)
    const variant = rng.int(1, 3)

    if (variant === 1) {
      const codeText = values.join(' ')
      const wrong = [
        values.map((v) => v + 1).join(' '),
        values.map((v) => v - 1).join(' '),
        [...values].reverse().join(' '),
      ].filter((w) => w !== codeText)
      return mc(rng, `If A = 1 and B = 2, what is the code for ${upper(word)}?`, codeText, wrong, {
        speak: `If A is 1 and B is 2, what is the code for ${word}?`,
        explanation: `${word.split('').map((c, i) => `${c.toUpperCase()}=${values[i]}`).join(', ')}.`,
      })
    }

    if (variant === 2) {
      const others = rng
        .sample(pool.filter((w) => w !== word && w.length === word.length), 3)
        .filter((w) => w !== word)
      return mc(rng, `If A = 1 and B = 2, which word is written ${values.join(' ')}?`, word, others, {
        speak: `If A is 1 and B is 2, which word is coded ${values.join(', ')}?`,
        explanation: `${values.join(', ')} spells ${upper(word)}.`,
      })
    }

    const total = values.reduce((a, b) => a + b, 0)
    return entry(`If A = 1 and B = 2, what do the letters of ${upper(word)} add up to?`, total, {
      maxDigits: 3,
      speak: `If A is 1 and B is 2, what do the letters of ${word} add up to?`,
      explanation: `${values.join(' + ')} = ${total}.`,
    })
  },
}

export const lettersStrand: StrandDef = {
  id: 'ng.vr.letters',
  name: 'Letter City',
  blurb: 'The alphabet, sequences and secret codes',
  theme: 'city',
  skills: [
    alphabet,
    vowels,
    alphaOrder,
    position,
    sequences,
    codes,
    alphaOrderHard,
    numberCodes,
    codesHard,
  ],
}
