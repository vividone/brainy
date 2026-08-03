/** Punctuation — Nigerian UBE Basic 1 → Basic 6. Capitals, stops, commas, apostrophes, speech. */

import type { Rng } from '../../../engine/rng'
import type { Item, SkillDef, StrandDef } from '../../../engine/types'
import { entry, mc, tapMany, tf } from '../../shared/authoring'
import { CONFUSABLE_CLOZE, KIND_MARK, QUOTES, TYPED_SENTENCES } from './banks'
import {
  BELONGINGS,
  BOYS,
  CONTRACTIONS,
  DAY_NAMES,
  GIRLS,
  MONTH_NAMES,
  PLACES,
  REGULAR_NOUNS,
  SHOPPING,
  articleFor,
  contractionWrongs,
  graded,
  type NounWord,
  type Tier,
} from './words'

const someone = (rng: Rng) => rng.pick([...GIRLS, ...BOYS])
const capOf = (d: number): Tier => (d <= 2 ? 1 : d <= 3 ? 2 : 3)

/** Nouns that can plausibly own something, for apostrophe work. */
const OWNERS: NounWord[] = [
  { s: 'boy', p: 'boys', tier: 1 }, { s: 'girl', p: 'girls', tier: 1 },
  { s: 'teacher', p: 'teachers', tier: 1 }, { s: 'farmer', p: 'farmers', tier: 1 },
  { s: 'doctor', p: 'doctors', tier: 2 }, { s: 'driver', p: 'drivers', tier: 2 },
  { s: 'tailor', p: 'tailors', tier: 2 }, { s: 'hunter', p: 'hunters', tier: 2 },
  { s: 'king', p: 'kings', tier: 1 }, { s: 'cousin', p: 'cousins', tier: 2 },
  { s: 'neighbour', p: 'neighbours', tier: 3 }, { s: 'carpenter', p: 'carpenters', tier: 3 },
  { s: 'mechanic', p: 'mechanics', tier: 3 }, { s: 'passenger', p: 'passengers', tier: 3 },
  { s: 'trader', p: 'traders', tier: 2 }, { s: 'singer', p: 'singers', tier: 2 },
]

/** Irregular plurals that do not end in s, so they still take an apostrophe + s. */
const ODD_OWNERS: NounWord[] = [
  { s: 'man', p: 'men', tier: 1 },
  { s: 'woman', p: 'women', tier: 1 },
  { s: 'child', p: 'children', tier: 1 },
]

/* ------------------------------------------------------------------ *
 * Capital letters
 * ------------------------------------------------------------------ */

/**
 * Months that are only ever months. "May", "April", "June" and "August" are
 * also given names, so "why does this word need a capital?" would have two
 * defensible answers.
 */
const PLAIN_MONTHS = MONTH_NAMES.filter((m) => !['April', 'May', 'June', 'August'].includes(m))

const capitals: SkillDef = {
  id: 'ng.en.punctuation.capitals',
  title: 'Capital letters',
  yearBand: 'b1',
  concepts: ['capital-letters'],
  hint: 'Capitals go at the start of a sentence, on names and places, and on the word I.',
  helpAtHome: 'Write their name and yours together, and point out the capital at the front.',
  generate: ({ rng, difficulty }): Item => {
    const name = someone(rng)
    const place = rng.pick(PLACES)
    const day = rng.pick(DAY_NAMES)
    const month = rng.pick(MONTH_NAMES)
    const variant = rng.int(1, difficulty <= 2 ? 6 : 7)

    if (variant === 1) {
      return mc(rng, 'Which word must always start with a capital letter?',
        rng.pick([name, place, day, month]),
        rng.sample(graded(REGULAR_NOUNS, difficulty).map((w) => w.s), 3), {
        explanation: 'Names of people, places, days and months always take a capital letter.',
      })
    }

    if (variant === 2) {
      const words = ['we', 'saw', name.toLowerCase(), 'at', place.toLowerCase(), 'on', day.toLowerCase()]
      return tapMany(
        rng,
        'Tap every word that needs a capital letter',
        words.map((w, i) => ({
          value: w,
          correct: i === 0 || w === name.toLowerCase() || w === place.toLowerCase() || w === day.toLowerCase(),
        })),
        { explanation: 'The first word, and every name of a person, place or day, needs a capital.' },
      )
    }

    if (variant === 3) {
      const words = [name.toLowerCase(), 'and', 'i', 'travelled', 'to', place.toLowerCase(), 'in', month.toLowerCase()]
      return tapMany(
        rng,
        'Tap every word that needs a capital letter',
        words.map((w, i) => ({
          value: w,
          correct: i === 0 || w === 'i' || w === place.toLowerCase() || w === month.toLowerCase(),
        })),
        { explanation: 'The word "I" is always a capital, and so are names, places and months.' },
      )
    }

    if (variant === 4) {
      // Exactly one proper noun is written small, so exactly one word is wrong.
      const cases = [
        { text: `We saw ${name.toLowerCase()} at the market.`, bad: name.toLowerCase(), others: ['saw', 'market', 'the'], why: `"${name}" is somebody's name, so it needs a capital letter.` },
        { text: `My uncle lives in ${place.toLowerCase()}.`, bad: place.toLowerCase(), others: ['uncle', 'lives', 'in'], why: `"${place}" is the name of a place, so it needs a capital letter.` },
        { text: `The lesson starts on ${day.toLowerCase()}.`, bad: day.toLowerCase(), others: ['lesson', 'starts', 'on'], why: `"${day}" is the name of a day, so it needs a capital letter.` },
        { text: `Our holiday begins in ${month.toLowerCase()}.`, bad: month.toLowerCase(), others: ['holiday', 'begins', 'in'], why: `"${month}" is the name of a month, so it needs a capital letter.` },
      ]
      const pick = rng.pick(cases)
      return mc(rng, `Which word is missing its capital letter?\n${pick.text}`, pick.bad, pick.others, {
        speak: `Which word is missing its capital letter? ${pick.text}`,
        explanation: pick.why,
      })
    }

    if (variant === 5) {
      const other = rng.pick([...GIRLS, ...BOYS].filter((n) => n !== name))
      const frames: { words: string[]; proper: number[] }[] = [
        { words: ['my', 'father', 'works', 'in', place.toLowerCase()], proper: [4] },
        { words: ['on', day.toLowerCase(), name.toLowerCase(), 'went', 'home'], proper: [1, 2] },
        { words: ['my', 'friend', name.toLowerCase(), 'lives', 'in', place.toLowerCase()], proper: [2, 5] },
        { words: ['the', 'bus', 'to', place.toLowerCase(), 'leaves', 'on', day.toLowerCase()], proper: [3, 6] },
        { words: ['we', 'saw', name.toLowerCase(), 'at', place.toLowerCase(), 'on', day.toLowerCase()], proper: [2, 4, 6] },
        { words: [name.toLowerCase(), 'and', 'i', 'travelled', 'to', place.toLowerCase(), 'in', month.toLowerCase()], proper: [0, 5, 7] },
        { words: [name.toLowerCase(), 'met', other.toLowerCase(), 'in', place.toLowerCase(), 'on', day.toLowerCase()], proper: [0, 2, 4, 6] },
      ]
      const f = rng.pick(frames)
      // The first word always needs one, and so does every "i" — counted once.
      const need = new Set<number>([0, ...f.proper])
      f.words.forEach((w, i) => { if (w === 'i') need.add(i) })
      const sentence = `${f.words.join(' ')}.`
      return entry(`How many capital letters does this sentence need?\n${sentence}`, need.size, {
        maxDigits: 1,
        speak: `How many capital letters does this sentence need? ${sentence}`,
        explanation: `${need.size} — the first word, and every name of a person, place, day or month.`,
      })
    }

    if (variant === 6) {
      const kinds = [
        { word: name, reason: 'It is the name of a person.' },
        { word: place, reason: 'It is the name of a place.' },
        { word: day, reason: 'It is the name of a day.' },
        { word: rng.pick(PLAIN_MONTHS), reason: 'It is the name of a month.' },
      ]
      const pick = rng.pick(kinds)
      const wrong = kinds.filter((k) => k.reason !== pick.reason).map((k) => k.reason)
      wrong.push('It is the first word of the sentence.')
      return mc(rng, `Why does "${pick.word}" always need a capital letter?`, pick.reason, rng.sample(wrong, 3), {
        explanation: `${pick.reason} Special names always start with a capital.`,
      })
    }

    const noun = rng.pick(graded(SHOPPING, difficulty))
    const art = articleFor(noun.s)
    const Noun = `${noun.s.charAt(0).toUpperCase()}${noun.s.slice(1)}`
    return mc(
      rng,
      'Which sentence is written correctly?',
      `${name} bought ${art} ${noun.s} in ${place}.`,
      [
        `${name.toLowerCase()} bought ${art} ${noun.s} in ${place}.`,
        `${name} bought ${art} ${noun.s} in ${place.toLowerCase()}.`,
        `${name} bought ${art} ${Noun} in ${place}.`,
      ],
      { explanation: 'Start the sentence with a capital, capitalise names and places, and leave ordinary nouns small.' },
    )
  },
}

/* ------------------------------------------------------------------ *
 * End marks
 * ------------------------------------------------------------------ */

const endMarks: SkillDef = {
  id: 'ng.en.punctuation.end-marks',
  title: 'Full stops and question marks',
  yearBand: 'b2',
  prerequisites: ['ng.en.punctuation.capitals'],
  concepts: ['end-punctuation'],
  hint: 'A question ends with ?, strong feeling ends with !, everything else ends with a full stop.',
  helpAtHome: 'Read a page aloud and let them shout "stop!" or "question!" at the end of each line.',
  generate: ({ rng, difficulty }): Item => {
    const pool = TYPED_SENTENCES.filter((s) => s.tier <= capOf(difficulty))
    const bank = pool.length >= 8 ? pool : TYPED_SENTENCES
    const pick = rng.pick(bank)
    const mark = KIND_MARK[pick.kind]
    const variant = rng.int(1, difficulty <= 2 ? 1 : 2)

    const markLabel: Record<string, string> = {
      '.': '. (full stop)',
      '?': '? (question mark)',
      '!': '! (exclamation mark)',
    }

    if (variant === 1) {
      return mc(
        rng,
        `Which mark goes at the end?\n${pick.text} ____`,
        markLabel[mark],
        Object.entries(markLabel).filter(([m]) => m !== mark).map(([, label]) => label),
        {
          speak: `Which mark goes at the end? ${pick.text}`,
          explanation:
            mark === '?' ? 'It asks something, so it needs a question mark.'
              : mark === '!' ? 'It shows strong feeling, so it needs an exclamation mark.'
                : 'It tells you something or gives an order, so it needs a full stop.',
        },
      )
    }

    // Only a question can take "?", so this board has exactly one reading.
    const questions = bank.filter((s) => s.kind === 'question')
    const notQuestions = bank.filter((s) => s.kind !== 'question')
    const board = rng.shuffle([
      ...rng.sample(questions, 3).map((s) => ({ value: s.text, correct: true })),
      ...rng.sample(notQuestions, 3).map((s) => ({ value: s.text, correct: false })),
    ])
    return tapMany(rng, 'Tap every sentence that needs a question mark', board, {
      explanation: 'Only sentences that ask something take a question mark.',
    })
  },
}

/* ------------------------------------------------------------------ *
 * Commas in a list
 * ------------------------------------------------------------------ */

const commas: SkillDef = {
  id: 'ng.en.punctuation.commas',
  title: 'Commas in a list',
  yearBand: 'b4',
  prerequisites: ['ng.en.punctuation.end-marks'],
  concepts: ['commas-lists'],
  hint: 'Put a comma between the items, but not before the "and" at the end.',
  helpAtHome: 'Write the shopping list as one sentence and put the commas in together.',
  generate: ({ rng, difficulty }): Item => {
    const count = difficulty <= 2 ? 3 : difficulty === 3 ? rng.int(3, 4) : rng.int(4, 5)
    const items = rng.sample(graded(SHOPPING, difficulty), count).map((w) => w.p)
    const head = items.slice(0, -1)
    const last = items[items.length - 1]
    const correct = `${head.join(', ')} and ${last}`
    const plain = `${head.join(' ')} and ${last}`
    const name = someone(rng)
    const variant = rng.int(1, difficulty <= 2 ? 2 : 3)

    if (variant === 1) {
      return entry(`How many commas does this sentence need?\n${name} bought ${plain}.`, count - 2, {
        maxDigits: 1,
        speak: `How many commas does this sentence need? ${name} bought ${plain}.`,
        explanation: `A list of ${count} things needs ${count - 2} comma${count - 2 === 1 ? '' : 's'}: ${correct}.`,
      })
    }

    if (variant === 2) {
      return mc(
        rng,
        'Which sentence uses commas correctly?',
        `${name} bought ${correct}.`,
        [
          `${name} bought ${plain}.`,
          `${name} bought, ${correct}.`,
          `${name} bought ${head.join(', ')} and, ${last}.`,
        ],
        { explanation: `Commas separate the items, and "and" comes before the last one: ${correct}.` },
      )
    }

    // Only ever asked about a three-item list, where exactly one comma is missing.
    const three = items.slice(0, 3)
    const threeCorrect = `${three[0]}, ${three[1]} and ${three[2]}`
    return mc(
      rng,
      `Where does the comma belong?\n${name} bought ${three[0]} ${three[1]} and ${three[2]}.`,
      `after "${three[0]}"`,
      [`after "${three[1]}"`, `after "${three[2]}"`, 'after "and"'],
      { explanation: `Commas go between the items: ${threeCorrect}.` },
    )
  },
}

/* ------------------------------------------------------------------ *
 * Apostrophes
 * ------------------------------------------------------------------ */

const contractions: SkillDef = {
  id: 'ng.en.punctuation.contractions',
  title: 'Short forms',
  yearBand: 'b4',
  prerequisites: ['ng.en.punctuation.end-marks'],
  concepts: ['apostrophe-contraction'],
  hint: 'The apostrophe stands exactly where the missing letters used to be.',
  helpAtHome: 'Say the long form and ask for the short one: "do not" → "don’t".',
  generate: ({ rng, difficulty }): Item => {
    const pool = CONTRACTIONS.filter((x) => x.tier <= capOf(difficulty))
    const pick = rng.pick(pool.length >= 6 ? pool : CONTRACTIONS)
    const variant = rng.int(1, difficulty <= 2 ? 2 : 3)

    if (variant === 1) {
      return mc(rng, `What is the short form of "${pick.full}"?`, pick.short, contractionWrongs(pick.short), {
        explanation: `${pick.full} → ${pick.short}. The apostrophe replaces the missing letters.`,
      })
    }

    if (variant === 2) {
      const others = CONTRACTIONS.filter((c) => c.full !== pick.full && c.short !== pick.short)
      return mc(rng, `What does "${pick.short}" stand for?`, pick.full, rng.sample(others.map((c) => c.full), 3), {
        explanation: `${pick.short} is short for "${pick.full}".`,
      })
    }

    const board = rng.shuffle([
      ...rng.sample(pool.length >= 6 ? pool : CONTRACTIONS, 3).map((c) => ({ value: c.short, correct: true })),
      ...rng.sample(pool.length >= 6 ? pool : CONTRACTIONS, 3).map((c) => ({ value: contractionWrongs(c.short)[0], correct: false })),
    ])
    return tapMany(rng, 'Tap every short form with the apostrophe in the right place', board, {
      explanation: 'The apostrophe stands where the missing letters were, never anywhere else.',
    })
  },
}

const possession: SkillDef = {
  id: 'ng.en.punctuation.possession',
  title: 'Showing who owns it',
  yearBand: 'b5',
  prerequisites: ['ng.en.punctuation.contractions'],
  concepts: ['apostrophe-possession'],
  hint: 'One owner: add ’s. More than one owner already ending in s: add just the apostrophe.',
  helpAtHome: 'Point at things and say who owns them: "That is Ada’s bag, those are the boys’ bags."',
  generate: ({ rng, difficulty }): Item => {
    const owner = rng.pick(graded(OWNERS, difficulty))
    const item = rng.pick(graded(BELONGINGS, difficulty))
    const name = someone(rng)
    const variant = rng.int(1, difficulty <= 2 ? 2 : 4)

    if (variant === 1) {
      return mc(
        rng,
        `${name} owns a ${item.s}. Which one is correct?`,
        `${name}'s ${item.s}`,
        [`${name}s ${item.s}`, `${name}s' ${item.s}`, `${name}' ${item.s}`],
        { explanation: `One owner, so we add an apostrophe and s: ${name}'s ${item.s}.` },
      )
    }

    if (variant === 2) {
      return mc(
        rng,
        `One ${owner.s} owns a ${item.s}. Which one is correct?`,
        `the ${owner.s}'s ${item.s}`,
        [`the ${owner.s}s ${item.s}`, `the ${owner.s}s' ${item.s}`, `the ${owner.s}' ${item.s}`],
        { explanation: `One ${owner.s}, so it is "the ${owner.s}'s ${item.s}".` },
      )
    }

    if (variant === 3) {
      return mc(
        rng,
        `Several ${owner.p} own ${item.p}. Which one is correct?`,
        `the ${owner.p}' ${item.p}`,
        [`the ${owner.p}'s ${item.p}`, `the ${owner.p}s' ${item.p}`, `the ${owner.p} ${item.p}`],
        { explanation: `"${owner.p}" already ends in s, so the apostrophe goes after it: the ${owner.p}' ${item.p}.` },
      )
    }

    // Irregular plurals do not end in s, so they take a full ’s.
    const odd = rng.pick(ODD_OWNERS)
    return mc(
      rng,
      `The ${odd.p} own some ${item.p}. Which one is correct?`,
      `the ${odd.p}'s ${item.p}`,
      [`the ${odd.p}' ${item.p}`, `the ${odd.p}s' ${item.p}`, `the ${odd.p}s ${item.p}`],
      { explanation: `"${odd.p}" does not end in s, so it still takes an apostrophe and s.` },
    )
  },
}

/* ------------------------------------------------------------------ *
 * Direct speech
 * ------------------------------------------------------------------ */

const speech: SkillDef = {
  id: 'ng.en.punctuation.speech',
  title: 'Speech marks',
  yearBand: 'b6',
  prerequisites: ['ng.en.punctuation.commas', 'ng.en.punctuation.possession'],
  concepts: ['speech-marks'],
  hint: 'Speech marks wrap only the exact words spoken, and the mark that ends them goes inside.',
  helpAtHome: 'Write down something they said, word for word, and put the speech marks in together.',
  generate: ({ rng, difficulty }): Item => {
    const pool = QUOTES.filter((x) => x.tier <= capOf(difficulty))
    const pick = rng.pick(pool.length >= 4 ? pool : QUOTES)
    // Swapping in a name keeps the same fifteen lines from ever feeling stale.
    const speaker = rng.chance(0.6) ? someone(rng) : pick.speaker
    // The closing mark belongs to the spoken words, so it travels inside the
    // speech marks with them — a question keeps its question mark.
    const said = `${pick.said}${pick.mark}`
    const correct = `${speaker} ${pick.verb}, "${said}"`
    const variant = rng.int(1, difficulty <= 2 ? 4 : 6)

    if (variant === 1) {
      return mc(
        rng,
        'Which sentence uses speech marks correctly?',
        correct,
        [
          `${speaker} ${pick.verb}, ${said}`,
          `"${speaker} ${pick.verb}, ${said}"`,
          `${speaker} "${pick.verb}, ${said}"`,
        ],
        { explanation: 'Speech marks go around the exact words spoken, and nothing else.' },
      )
    }

    if (variant === 2) {
      return mc(
        rng,
        `Which words go inside the speech marks?\n${speaker} ${pick.verb} ${said}`,
        pick.said,
        [`${speaker} ${pick.verb}`, speaker, `${pick.verb} ${pick.said}`],
        { explanation: `Only the exact words ${speaker} said go inside: "${said}"` },
      )
    }

    if (variant === 3) {
      return mc(
        rng,
        'Which punctuation mark comes just before the opening speech marks?',
        ', (comma)',
        ['. (full stop)', '? (question mark)', '! (exclamation mark)'],
        { explanation: `A comma introduces the speech: ${correct}` },
      )
    }

    if (variant === 4) {
      const right = rng.chance(0.5)
      const shown = right ? correct : `${speaker} ${pick.verb}, "${pick.said}"${pick.mark}`
      return tf(`Is this written correctly?\n${shown}`, right, {
        trueLabel: 'Yes',
        falseLabel: 'No',
        speak: `Is this written correctly? ${speaker} ${pick.verb}, ${pick.said}.`,
        explanation: `The mark that ends the speech goes inside the speech marks: ${correct}`,
      })
    }

    if (variant === 5) {
      return mc(
        rng,
        'Where does the mark that ends the speech go?',
        'Inside the speech marks',
        ['Outside the speech marks', 'After the speaker’s name', 'No mark is needed'],
        { explanation: 'The full stop, question mark or exclamation mark goes inside, with the spoken words.' },
      )
    }

    // The reporting verb: the word that tells you somebody spoke.
    const spoken = [...new Set(pick.said.replace(/[.,?!]/g, '').split(' '))]
      .filter((w) => w.toLowerCase() !== pick.verb)
    return mc(
      rng,
      `Which word tells you that somebody spoke?\n${correct}`,
      pick.verb,
      [speaker, ...rng.sample(spoken, 2)],
      { explanation: `"${pick.verb}" is the word that reports the speech.` },
    )
  },
}

/* ------------------------------------------------------------------ *
 * Words that get mixed up
 * ------------------------------------------------------------------ */

const confusables: SkillDef = {
  id: 'ng.en.punctuation.confusables',
  title: 'Its or it’s?',
  yearBand: 'b6',
  prerequisites: ['ng.en.punctuation.possession'],
  concepts: ['homophone-confusions'],
  hint: 'Read the long form back. If "it is" fits, you need it’s with the apostrophe.',
  helpAtHome: 'Whenever they write "its" or "their", ask them to read the sentence back the long way.',
  generate: ({ rng, difficulty }): Item => {
    const pool = CONFUSABLE_CLOZE.filter((x) => x.tier <= capOf(difficulty))
    const pick = rng.pick(pool.length >= 6 ? pool : CONFUSABLE_CLOZE)

    if (rng.chance(0.6)) {
      return mc(rng, `Which word fits the gap?\n${pick.text}`, pick.answer, rng.shuffle(pick.wrong), {
        speak: `Which word fits the gap? ${pick.text.replace('____', 'blank')}`,
        explanation: `${pick.text.replace('____', pick.answer)} ${pick.why}`,
      })
    }

    return mc(
      rng,
      'Which sentence is written correctly?',
      pick.text.replace('____', pick.answer),
      pick.wrong.map((w) => pick.text.replace('____', w)),
      { explanation: pick.why },
    )
  },
}

export const punctuationStrand: StrandDef = {
  id: 'ng.en.punctuation',
  name: 'Punctuation Bay',
  blurb: 'Capital letters, stops, commas, apostrophes and speech marks',
  theme: 'bay',
  skills: [
    capitals,
    endMarks,
    commas,
    contractions,
    possession,
    speech,
    confusables,
  ],
}
