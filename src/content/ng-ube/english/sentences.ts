/** Sentences — Nigerian UBE Basic 1 → Basic 6. Building and agreeing. */

import type { Rng } from '../../../engine/rng'
import type { Item, SkillDef, StrandDef } from '../../../engine/types'
import { mc, order, tapMany, tf } from '../../shared/authoring'
import {
  JOIN_ITEMS,
  KIND_LABEL,
  QUESTION_ORDERS,
  QUESTION_WORD_CLOZE,
  TYPED_SENTENCES,
  type Cloze,
  type SentenceKind,
} from './banks'
import {
  ACTIONS,
  BELONGINGS,
  BOYS,
  DAY_NAMES,
  GIRLS,
  IRREGULAR_NOUNS,
  PEOPLE_NOUNS,
  PLACES,
  SAFE_SENTENCE_ADVERBS,
  THING_ADJECTIVES,
  articleFor,
  graded,
  type Tier,
} from './words'

const someone = (rng: Rng) => rng.pick([...GIRLS, ...BOYS])
const capOf = (d: number): Tier => (d <= 2 ? 1 : d <= 3 ? 2 : 3)

/**
 * Adjectives that sit sensibly next to any noun in the bank — a person, an
 * animal or an object. Agreement drills should not be derailed by "the lamp
 * is hungry".
 */
const NEUTRAL_ADJ = [
  'big', 'small', 'old', 'new', 'clean', 'dirty', 'heavy', 'wet', 'bright', 'strong',
]

function clozeItem(rng: Rng, bank: Cloze[], difficulty: number, prompt: string) {
  const pool = bank.filter((x) => x.tier <= capOf(difficulty))
  const pick = rng.pick(pool.length ? pool : bank)
  return mc(rng, `${prompt}\n${pick.text}`, pick.answer, rng.shuffle(pick.wrong), {
    speak: `${prompt} ${pick.text.replace('____', 'blank')}`,
    explanation: `${pick.text.replace('____', pick.answer)} ${pick.why}`,
  })
}

/* ------------------------------------------------------------------ *
 * Building a sentence
 * ------------------------------------------------------------------ */

const wordOrder: SkillDef = {
  id: 'ng.en.sentences.word-order',
  title: 'Build a sentence',
  yearBand: 'b1',
  concepts: ['word-order'],
  hint: 'The capital letter starts the sentence and the full stop ends it.',
  helpAtHome: 'Write a short sentence on paper, cut it into words, and rebuild it together.',
  generate: ({ rng, difficulty }): Item => {
    const name = someone(rng)
    const action = rng.pick(graded(ACTIONS, difficulty))
    const adj = rng.pick(graded(THING_ADJECTIVES, difficulty)).word
    const adv = rng.pick(graded(SAFE_SENTENCE_ADVERBS, difficulty)).word

    // At most one article per sentence: with both "a" and "the" on the board
    // the child could build two equally correct orders.
    const shapes: string[][] = [
      [name, action.past, 'the', `${action.objS}.`],
      ['The', action.objS, 'is', `${adj}.`],
      [name, action.past, articleFor(adj), adj, `${action.objS}.`],
    ]
    if (difficulty >= 3) {
      shapes.push([name, adv, action.past, 'the', `${action.objP}.`])
    }
    if (difficulty >= 4) {
      shapes.push([name, adv, action.past, articleFor(adj), adj, `${action.objS}.`])
    }

    const words = rng.pick(shapes)
    // Repeated words would make two different tokens look identical.
    if (new Set(words.map((w) => w.toLowerCase())).size !== words.length) {
      return order(rng, 'Put the words in order to make a sentence', [name, action.past, 'the', `${action.objS}.`], {
        explanation: `${name} ${action.past} the ${action.objS}.`,
      })
    }

    return order(rng, 'Put the words in order to make a sentence', words, {
      speak: 'Put the words in order to make a sentence. The capital letter goes first and the full stop goes last.',
      explanation: `${words.join(' ')} — the capital letter starts it and the full stop ends it.`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * Agreement
 * ------------------------------------------------------------------ */

const isAre: SkillDef = {
  id: 'ng.en.sentences.is-are',
  title: 'Is and are',
  yearBand: 'b2',
  prerequisites: ['ng.en.forms.plural-s'],
  concepts: ['subject-verb-be'],
  hint: 'One thing takes "is". More than one takes "are". "I" always takes "am".',
  helpAtHome: 'Point at one thing then several and say it together: "It is… They are…"',
  generate: ({ rng, difficulty }): Item => {
    const noun = rng.pick(graded([...BELONGINGS, ...PEOPLE_NOUNS], difficulty))
    const adj = rng.pick(NEUTRAL_ADJ)
    const variant = rng.int(1, difficulty <= 2 ? 3 : 4)

    if (variant === 1) {
      return mc(rng, `Which word fits?\nThe ${noun.s} ____ ${adj}.`, 'is', ['are', 'am', 'be'], {
        speak: `Which word fits? The ${noun.s} blank ${adj}.`,
        explanation: `One ${noun.s} takes "is".`,
      })
    }

    if (variant === 2) {
      return mc(rng, `Which word fits?\nThe ${noun.p} ____ ${adj}.`, 'are', ['is', 'am', 'be'], {
        speak: `Which word fits? The ${noun.p} blank ${adj}.`,
        explanation: `"${noun.p}" means more than one, so it takes "are".`,
      })
    }

    if (variant === 3) {
      const subject = rng.pick(['I', 'You', 'He', 'She', 'They', 'We'])
      const answer = subject === 'I' ? 'am' : ['He', 'She'].includes(subject) ? 'is' : 'are'
      return mc(rng, `Which word fits?\n${subject} ____ very ${adj} today.`, answer,
        ['am', 'is', 'are'].filter((w) => w !== answer), {
        speak: `Which word fits? ${subject} blank very ${adj} today.`,
        explanation: `"${subject}" goes with "${answer}".`,
      })
    }

    const plural = rng.chance(0.5)
    // sheep and deer look the same either way, so both "is" and "are" would be
    // defensible. They have no place in an agreement question.
    const irregular = rng.pick(graded(IRREGULAR_NOUNS, difficulty).filter((w) => w.s !== w.p))
    return mc(
      rng,
      'Which sentence is correct?',
      plural ? `The ${irregular.p} are ${adj}.` : `The ${irregular.s} is ${adj}.`,
      [plural ? `The ${irregular.p} is ${adj}.` : `The ${irregular.s} are ${adj}.`],
      {
        explanation: plural
          ? `"${irregular.p}" means more than one, so it takes "are".`
          : `"${irregular.s}" is just one, so it takes "is".`,
      },
    )
  },
}

const hasHave: SkillDef = {
  id: 'ng.en.sentences.has-have',
  title: 'Has and have',
  yearBand: 'b2',
  prerequisites: ['ng.en.sentences.is-are'],
  concepts: ['subject-verb-have'],
  hint: 'He, she and it take "has". I, you, we and they take "have".',
  helpAtHome: 'Go round the room: "She has a bag, they have bags, I have a pencil."',
  generate: ({ rng, difficulty }): Item => {
    const noun = rng.pick(graded(BELONGINGS, difficulty))
    const count = rng.int(2, 6)
    const variant = rng.int(1, difficulty <= 2 ? 2 : 3)

    if (variant === 1) {
      const name = someone(rng)
      return mc(rng, `Which word fits?\n${name} ____ ${count} ${noun.p}.`, 'has', ['have', 'having', 'is'], {
        speak: `Which word fits? ${name} blank ${count} ${noun.p}.`,
        explanation: `${name} is one person, so we say "${name} has".`,
      })
    }

    if (variant === 2) {
      const subject = rng.pick(['They', 'We', 'I', 'You', 'The children'])
      return mc(rng, `Which word fits?\n${subject} ____ ${count} ${noun.p}.`, 'have', ['has', 'having', 'is'], {
        speak: `Which word fits? ${subject} blank ${count} ${noun.p}.`,
        explanation: `"${subject}" takes "have", not "has".`,
      })
    }

    const single = rng.chance(0.5)
    const subject = single ? rng.pick(['He', 'She', 'My sister', 'The teacher']) : rng.pick(['They', 'We', 'My cousins'])
    const answer = single ? 'has' : 'have'
    return mc(rng, 'Which sentence is correct?', `${subject} ${answer} a new ${noun.s}.`,
      [`${subject} ${single ? 'have' : 'has'} a new ${noun.s}.`], {
      explanation: `"${subject}" goes with "${answer}".`,
    })
  },
}

const subjectVerb: SkillDef = {
  id: 'ng.en.sentences.subject-verb',
  title: 'Making the verb agree',
  yearBand: 'b4',
  prerequisites: ['ng.en.sentences.has-have', 'ng.en.forms.present-tense'],
  concepts: ['subject-verb-agreement'],
  hint: 'One person or thing → the verb takes an s. More than one → no s.',
  helpAtHome: 'Say a wrong sentence on purpose ("the boys plays") and let them correct you.',
  generate: ({ rng, difficulty }): Item => {
    const noun = rng.pick(graded(PEOPLE_NOUNS, difficulty))
    const frames = [
      { base: 'play', s: 'plays', obj: 'football every evening' },
      { base: 'sing', s: 'sings', obj: 'in the choir on Sundays' },
      { base: 'walk', s: 'walks', obj: 'to school every morning' },
      { base: 'live', s: 'lives', obj: 'near the market' },
      { base: 'wash', s: 'washes', obj: 'the plates after supper' },
      { base: 'carry', s: 'carries', obj: 'a heavy bag to class' },
      { base: 'study', s: 'studies', obj: 'every night' },
      { base: 'watch', s: 'watches', obj: 'the news at eight' },
      { base: 'cook', s: 'cooks', obj: 'rice on Saturdays' },
      { base: 'sweep', s: 'sweeps', obj: 'the compound each morning' },
    ]
    const f = rng.pick(frames)
    const variant = rng.int(1, difficulty <= 2 ? 2 : 4)

    if (variant === 1) {
      const name = someone(rng)
      return mc(rng, `Which word fits?\n${name} ____ ${f.obj}.`, f.s, [f.base, `${f.base}ing`, `to ${f.base}`], {
        speak: `Which word fits? ${name} blank ${f.obj}.`,
        explanation: `${name} is one person, so the verb takes an s: "${name} ${f.s}".`,
      })
    }

    if (variant === 2) {
      return mc(rng, `Which word fits?\nThe ${noun.p} ____ ${f.obj}.`, f.base, [f.s, `${f.base}ing`, `to ${f.base}`], {
        speak: `Which word fits? The ${noun.p} blank ${f.obj}.`,
        explanation: `"${noun.p}" means more than one, so the verb drops the s: "${noun.p} ${f.base}".`,
      })
    }

    if (variant === 3) {
      const plural = rng.chance(0.5)
      const subject = plural ? `The ${noun.p}` : `The ${noun.s}`
      const right = plural ? f.base : f.s
      const wrongForm = plural ? f.s : f.base
      return mc(rng, 'Which sentence is correct?', `${subject} ${right} ${f.obj}.`,
        [`${subject} ${wrongForm} ${f.obj}.`], {
        explanation: plural
          ? 'More than one, so the verb has no s.'
          : 'Just one, so the verb takes an s.',
      })
    }

    const board = rng.shuffle([
      { value: `He ${f.s} ${f.obj}.`, correct: true },
      { value: `They ${f.base} ${f.obj}.`, correct: true },
      { value: `She ${f.base} ${f.obj}.`, correct: false },
      { value: `We ${f.s} ${f.obj}.`, correct: false },
    ])
    return tapMany(rng, 'Tap every sentence that is correct', board, {
      explanation: 'He and she take the verb with s. They and we take the verb without s.',
    })
  },
}

/* ------------------------------------------------------------------ *
 * Kinds of sentence
 * ------------------------------------------------------------------ */

const questionWords: SkillDef = {
  id: 'ng.en.sentences.question-words',
  title: 'Asking words',
  yearBand: 'b3',
  prerequisites: ['ng.en.sentences.is-are'],
  concepts: ['question-words'],
  hint: 'Who asks about a person, where about a place, when about a time, why about a reason.',
  helpAtHome: 'Play twenty questions — they may only ask using who, what, where, when, why or how.',
  generate: ({ rng, difficulty }): Item => {
    const variant = rng.int(1, 3)
    if (variant === 1) return clozeItem(rng, QUESTION_WORD_CLOZE, difficulty, 'Which asking word fits?')

    if (variant === 2) {
      // Built from a fact, so the asking word is fixed by what is being asked for.
      const name = someone(rng)
      const place = rng.pick(PLACES)
      const day = rng.pick(DAY_NAMES)
      const fact = `${name} travelled to ${place} on ${day}.`
      const ask = rng.pick([
        { about: 'the PERSON who travelled', answer: 'Who', wrong: ['Where', 'When', 'Why'] },
        { about: 'the PLACE she travelled to', answer: 'Where', wrong: ['Who', 'When', 'Why'] },
        { about: 'the DAY she travelled', answer: 'When', wrong: ['Who', 'Where', 'Why'] },
      ])
      return mc(rng, `${fact}\nWhich asking word finds out ${ask.about}?`, ask.answer, rng.shuffle(ask.wrong), {
        explanation: `"${ask.answer}" asks about ${ask.about.replace(/^the [A-Z]+ /, '')}.`,
      })
    }

    const jobs = [
      { job: 'a person', answer: 'Who', wrong: ['Where', 'When', 'Why'] },
      { job: 'a place', answer: 'Where', wrong: ['Who', 'When', 'Why'] },
      { job: 'a time', answer: 'When', wrong: ['Who', 'Where', 'Why'] },
      { job: 'a reason', answer: 'Why', wrong: ['Who', 'Where', 'When'] },
      { job: 'the owner of something', answer: 'Whose', wrong: ['Where', 'When', 'Why'] },
    ]
    const j = rng.pick(jobs)
    return mc(rng, `Which asking word asks about ${j.job}?`, j.answer, rng.shuffle(j.wrong), {
      explanation: `"${j.answer}" asks about ${j.job}.`,
    })
  },
}

const sentenceTypes: SkillDef = {
  id: 'ng.en.sentences.types',
  title: 'Four kinds of sentence',
  yearBand: 'b4',
  prerequisites: ['ng.en.sentences.question-words'],
  concepts: ['sentence-types'],
  hint: 'A statement tells, a question asks, a command orders, an exclamation shows strong feeling.',
  helpAtHome: 'Say a sentence and ask which of the four it is. Take turns making each kind.',
  generate: ({ rng, difficulty }): Item => {
    const pool = TYPED_SENTENCES.filter((s) => s.tier <= capOf(difficulty))
    const bank = pool.length >= 8 ? pool : TYPED_SENTENCES
    const pick = rng.pick(bank)
    const mark = pick.kind === 'question' ? '?' : pick.kind === 'exclamation' ? '!' : '.'
    const kinds: SentenceKind[] = ['statement', 'question', 'command', 'exclamation']
    const variant = rng.int(1, difficulty <= 2 ? 1 : 2)

    if (variant === 1) {
      return mc(
        rng,
        `What kind of sentence is this?\n${pick.text}${mark}`,
        KIND_LABEL[pick.kind],
        kinds.filter((k) => k !== pick.kind).map((k) => KIND_LABEL[k]),
        {
          explanation:
            pick.kind === 'statement' ? 'It tells you something, so it is a statement.'
              : pick.kind === 'question' ? 'It asks something, so it is a question.'
                : pick.kind === 'command' ? 'It tells somebody to do something, so it is a command.'
                  : 'It shows strong feeling, so it is an exclamation.',
        },
      )
    }

    const want = rng.pick(kinds)
    const right = bank.filter((s) => s.kind === want)
    const others = bank.filter((s) => s.kind !== want)
    if (!right.length || others.length < 3) {
      return mc(
        rng,
        `What kind of sentence is this?\n${pick.text}${mark}`,
        KIND_LABEL[pick.kind],
        kinds.filter((k) => k !== pick.kind).map((k) => KIND_LABEL[k]),
        { explanation: `This one is ${KIND_LABEL[pick.kind].toLowerCase()}.` },
      )
    }
    const dress = (s: { text: string; kind: SentenceKind }) =>
      `${s.text}${s.kind === 'question' ? '?' : s.kind === 'exclamation' ? '!' : '.'}`
    return mc(
      rng,
      `Which one is ${want === 'exclamation' ? 'an' : 'a'} ${want}?`,
      dress(rng.pick(right)),
      rng.sample(others, 3).map(dress),
      { explanation: `${KIND_LABEL[want]}s ${want === 'question' ? 'ask something' : want === 'command' ? 'tell somebody to do something' : want === 'exclamation' ? 'show strong feeling' : 'tell you something'}.` },
    )
  },
}

const joining: SkillDef = {
  id: 'ng.en.sentences.joining',
  title: 'Joining two sentences',
  yearBand: 'b5',
  prerequisites: ['ng.en.wordtypes.conjunctions', 'ng.en.sentences.types'],
  concepts: ['joining-sentences'],
  hint: 'Join with and, but, so or because — and do not repeat the name twice.',
  helpAtHome: 'Say two short sentences and ask them to make it one longer, smoother sentence.',
  generate: ({ rng, difficulty }): Item => {
    const pool = JOIN_ITEMS.filter((j) => j.tier <= capOf(difficulty))
    const pick = rng.pick(pool.length >= 3 ? pool : JOIN_ITEMS)
    const variant = rng.int(1, difficulty <= 3 ? 2 : 3)

    if (variant === 2) {
      // A generated "and" join: the wrong options are broken sentences, never
      // rival conjunctions, so only one option can be defended.
      const name = someone(rng)
      const [x, y] = rng.sample(graded(ACTIONS, difficulty), 2)
      const a = `${name} ${x.past} the ${x.objP}.`
      const b = `${name} ${y.past} the ${y.objP}.`
      return mc(
        rng,
        `Join these into one sentence.\n${a} ${b}`,
        `${name} ${x.past} the ${x.objP} and ${y.past} the ${y.objP}.`,
        [
          `${name} ${x.past} the ${x.objP} and ${name} ${y.past} the ${y.objP} and.`,
          `And ${name} ${x.past} the ${x.objP} ${y.past} the ${y.objP}.`,
          `${name} and ${x.past} the ${x.objP} ${y.past} the ${y.objP}.`,
        ],
        {
          speak: `Join these into one sentence. ${a} ${b}`,
          explanation: `Use "and" in the middle and say "${name}" only once.`,
        },
      )
    }

    if (variant === 1) {
      return mc(
        rng,
        `Join these into one sentence.\n${pick.a} ${pick.b}`,
        pick.joined,
        rng.shuffle(pick.wrong),
        {
          speak: `Join these into one sentence. ${pick.a} ${pick.b}`,
          explanation: `${pick.joined} ${pick.why}`,
        },
      )
    }

    const word = pick.joined.split(' ').find((w) => ['and', 'but', 'so', 'because'].includes(w.replace(',', '')))
    const answer = (word ?? 'and').replace(',', '')
    return mc(
      rng,
      `Which joining word was used?\n${pick.joined}`,
      answer,
      ['and', 'but', 'so', 'because'].filter((w) => w !== answer),
      { explanation: pick.why },
    )
  },
}

export const sentencesStrand: StrandDef = {
  id: 'ng.en.sentences',
  name: 'Sentence Falls',
  blurb: 'Word order, agreement and the four kinds of sentence',
  theme: 'falls',
  skills: [
    wordOrder,
    isAre,
    hasHave,
    questionWords,
    sentenceTypes,
    subjectVerb,
    joining,
  ],
}
