/** Word Types — Nigerian UBE Basic 1 → Basic 6. Parts of speech. */

import type { Rng } from '../../../engine/rng'
import type { Item, MultipleChoiceItem, SkillDef, StrandDef } from '../../../engine/types'
import { mc, tapMany } from '../../shared/authoring'
import {
  CONJUNCTION_CLOZE,
  CONJUNCTION_JOBS,
  CONJUNCTION_SENSE,
  CONJUNCTION_USES,
  NOT_CONJUNCTIONS,
  PREPOSITION_PLACE_CLOZE,
  PREPOSITION_TIME_CLOZE,
  SENSE_ASK,
  SENSE_JOB,
  type Cloze,
  type ConjunctionSense,
} from './banks'
import {
  ACTIONS,
  ADVERBS,
  ARTICLE_NOUNS,
  BOYS,
  DAY_NAMES,
  GIRLS,
  MONTH_NAMES,
  PLACES,
  POS_LABEL,
  SAFE_SENTENCE_ADJECTIVES,
  SAFE_SENTENCE_ADVERBS,
  SAFE_SENTENCE_NOUNS,
  SAFE_SENTENCE_VERBS,
  THING_ADJECTIVES,
  adverbWrongs,
  articleFor,
  graded,
  taggedSentence,
  uniqueWords,
  type Pos,
  type TaggedSentence,
} from './words'

/* ------------------------------------------------------------------ *
 * Shared helpers
 * ------------------------------------------------------------------ */

/** Draw one fill-in-the-gap item from a curated bank. */
function clozeItem(rng: Rng, bank: Cloze[], difficulty: number, prompt = 'Which word fits the gap?'): MultipleChoiceItem {
  const pool = bank.filter((x) => x.tier <= (difficulty <= 2 ? 1 : difficulty <= 3 ? 2 : 3))
  const pick = rng.pick(pool.length ? pool : bank)
  return mc(rng, `${prompt}\n${pick.text}`, pick.answer, rng.shuffle(pick.wrong), {
    speak: `${prompt} ${pick.text.replace('____', 'blank')}`,
    explanation: `${pick.text.replace('____', pick.answer)} ${pick.why}`,
  })
}

/**
 * "Which word is the <part of speech>?" over a tagged sentence.
 *
 * The distractors are drawn only from words of a *different* class, so the
 * question can never have two right answers.
 */
function findPos(rng: Rng, s: TaggedSentence, target: Pos, alsoCounts: Pos[] = []): MultipleChoiceItem | null {
  const words = uniqueWords(s.words)
  const counts = new Set<Pos>([target, ...alsoCounts])
  const hits = words.filter((w) => counts.has(w.pos))
  if (hits.length !== 1) return null
  const wrong = words.filter((w) => !counts.has(w.pos))
  if (wrong.length < 1) return null
  const label = POS_LABEL[target].toLowerCase()
  return mc(
    rng,
    `Which word in this sentence is the ${label}?\n${s.text}`,
    hits[0].w,
    rng.shuffle(wrong).map((w) => w.w),
    { explanation: `"${hits[0].w}" is the ${label} in "${s.text}"` },
  )
}

/** Retry the sentence builder until a single-answer question is available. */
function posQuestion(rng: Rng, difficulty: number, target: Pos, alsoCounts: Pos[] = []): MultipleChoiceItem {
  for (let i = 0; i < 12; i++) {
    const s = taggedSentence(rng, difficulty, target)
    const item = findPos(rng, s, target, alsoCounts)
    if (item) return item
  }
  // Fall back to a word-list question, which can always be built.
  const label = POS_LABEL[target].toLowerCase()
  return mc(rng, `Which of these is a ${label}?`, rng.pick(graded(SAFE_SENTENCE_NOUNS, difficulty)).s, [
    rng.pick(graded(SAFE_SENTENCE_VERBS, difficulty)).past,
    rng.pick(graded(SAFE_SENTENCE_ADJECTIVES, difficulty)).word,
    rng.pick(graded(SAFE_SENTENCE_ADVERBS, difficulty)).word,
  ])
}

/** "Tap all the …" over a tagged sentence. */
function posTapMany(rng: Rng, difficulty: number, target: Pos, alsoCounts: Pos[], prompt: string, why: string): Item {
  for (let i = 0; i < 12; i++) {
    const s = taggedSentence(rng, difficulty, target)
    const words = uniqueWords(s.words)
    const counts = new Set<Pos>([target, ...alsoCounts])
    const right = words.filter((w) => counts.has(w.pos))
    const wrong = words.filter((w) => !counts.has(w.pos))
    if (right.length >= 1 && wrong.length >= 1) {
      return tapMany(
        rng,
        `${prompt}\n${s.text}`,
        words.map((w) => ({ value: w.w, correct: counts.has(w.pos) })),
        { explanation: why },
      )
    }
  }
  return posQuestion(rng, difficulty, target, alsoCounts)
}

/* ------------------------------------------------------------------ *
 * Skills
 * ------------------------------------------------------------------ */

const nouns: SkillDef = {
  id: 'ng.en.wordtypes.nouns',
  title: 'Naming words',
  yearBand: 'b1',
  concepts: ['nouns'],
  hint: 'A noun names a person, an animal, a place or a thing.',
  helpAtHome: 'Walk around the house and take turns naming things — every one is a noun.',
  generate: ({ rng, difficulty }): Item => {
    const variant = rng.int(1, difficulty <= 2 ? 3 : 4)

    if (variant === 1) {
      const noun = rng.pick(graded(SAFE_SENTENCE_NOUNS, difficulty))
      return mc(rng, 'Which word is a naming word (a noun)?', noun.s, [
        rng.pick(graded(SAFE_SENTENCE_VERBS, difficulty)).past,
        rng.pick(graded(SAFE_SENTENCE_ADJECTIVES, difficulty)).word,
        rng.pick(graded(SAFE_SENTENCE_ADVERBS, difficulty)).word,
      ], { explanation: `A noun names something. You can see a ${noun.s}.` })
    }

    if (variant === 2) return posQuestion(rng, difficulty, 'noun')

    if (variant === 3) {
      return posTapMany(
        rng, difficulty, 'noun', ['proper'],
        'Tap all the naming words (nouns)',
        'Nouns name people, animals, places and things. Names like Ada are nouns too.',
      )
    }

    const kind = rng.pick(['person', 'place', 'animal'] as const)
    const answer =
      kind === 'person' ? rng.pick(['teacher', 'farmer', 'doctor', 'driver', 'tailor', 'carpenter', 'nurse'])
        : kind === 'place' ? rng.pick(['market', 'school', 'hospital', 'village', 'kitchen', 'garden', 'stadium'])
          : rng.pick(['goat', 'cow', 'hen', 'dog', 'monkey', 'tortoise', 'sheep'])
    const others = ['person', 'place', 'animal'].filter((k) => k !== kind)
    const wrong = others.map((k) =>
      k === 'person' ? rng.pick(['tailor', 'hunter', 'mechanic'])
        : k === 'place' ? rng.pick(['museum', 'palace', 'library'])
          : rng.pick(['donkey', 'butterfly', 'wolf']),
    )
    wrong.push(rng.pick(graded(SAFE_SENTENCE_ADJECTIVES, difficulty)).word)
    return mc(rng, `Which noun names ${kind === 'animal' ? 'an animal' : `a ${kind}`}?`, answer, rng.shuffle(wrong), {
      explanation: `A ${answer} is ${kind === 'animal' ? 'an animal' : `a ${kind}`}.`,
    })
  },
}

const verbs: SkillDef = {
  id: 'ng.en.wordtypes.verbs',
  title: 'Doing words',
  yearBand: 'b1',
  concepts: ['verbs'],
  hint: 'A verb is the word that tells you what somebody is doing.',
  helpAtHome: 'Play "what am I doing?" — mime an action and let them shout the doing word.',
  generate: ({ rng, difficulty }): Item => {
    const variant = rng.int(1, difficulty <= 2 ? 3 : 4)

    if (variant === 1) {
      const verb = rng.pick(graded(SAFE_SENTENCE_VERBS, difficulty))
      return mc(rng, 'Which word is a doing word (a verb)?', verb.past, [
        rng.pick(graded(SAFE_SENTENCE_NOUNS, difficulty)).s,
        rng.pick(graded(SAFE_SENTENCE_ADJECTIVES, difficulty)).word,
        rng.pick(graded(SAFE_SENTENCE_ADVERBS, difficulty)).word,
      ], { explanation: `"${verb.past}" tells you what somebody did.` })
    }

    if (variant === 2) return posQuestion(rng, difficulty, 'verb')

    if (variant === 3) {
      return posTapMany(
        rng, difficulty, 'verb', [],
        'Tap the doing word (the verb)',
        'The verb tells you the action in the sentence.',
      )
    }

    const person = rng.pick([...GIRLS, ...BOYS])
    const action = rng.pick(graded(ACTIONS, difficulty))
    return mc(
      rng,
      `What did ${person} do?\n${person} ${action.past} the ${action.objP}.`,
      action.past,
      [person, action.objP, 'the'],
      { explanation: `The verb "${action.past}" is the action word.` },
    )
  },
}

const adjectives: SkillDef = {
  id: 'ng.en.wordtypes.adjectives',
  title: 'Describing words',
  yearBand: 'b2',
  prerequisites: ['ng.en.wordtypes.nouns'],
  concepts: ['adjectives'],
  hint: 'An adjective describes a noun — what it looks like, feels like or how many.',
  helpAtHome: 'Point at anything and race to give three describing words for it.',
  generate: ({ rng, difficulty }): Item => {
    const variant = rng.int(1, difficulty <= 2 ? 2 : 4)

    if (variant === 1) {
      const adj = rng.pick(graded(SAFE_SENTENCE_ADJECTIVES, difficulty))
      return mc(rng, 'Which word is a describing word (an adjective)?', adj.word, [
        rng.pick(graded(SAFE_SENTENCE_NOUNS, difficulty)).s,
        rng.pick(graded(SAFE_SENTENCE_VERBS, difficulty)).past,
        rng.pick(graded(SAFE_SENTENCE_ADVERBS, difficulty)).word,
      ], { explanation: `"${adj.word}" tells you what something is like, so it is an adjective.` })
    }

    if (variant === 2) return posQuestion(rng, difficulty, 'adjective')

    if (variant === 3) {
      return posTapMany(
        rng, difficulty, 'adjective', [],
        'Tap the describing word (the adjective)',
        'The adjective sits next to a noun and tells you more about it.',
      )
    }

    const adj = rng.pick(graded(THING_ADJECTIVES, difficulty)).word
    const noun = rng.pick(graded(ACTIONS, difficulty)).objS
    return mc(
      rng,
      `Which noun is being described?\nThe ${adj} ${noun} was left outside.`,
      noun,
      [adj, 'the', 'outside'],
      { explanation: `"${adj}" describes the noun "${noun}".` },
    )
  },
}

const pronouns: SkillDef = {
  id: 'ng.en.wordtypes.pronouns',
  title: 'He, she, it, they',
  yearBand: 'b2',
  prerequisites: ['ng.en.wordtypes.nouns'],
  concepts: ['pronouns'],
  hint: 'A pronoun takes the place of a name so you do not repeat it.',
  helpAtHome: 'Retell a story about the family and swap every repeated name for he, she or they.',
  generate: ({ rng, difficulty }): Item => {
    const variant = rng.int(1, difficulty <= 2 ? 2 : difficulty === 3 ? 3 : 4)

    if (variant === 1) {
      const girl = rng.chance(0.5)
      const name = girl ? rng.pick(GIRLS) : rng.pick(BOYS)
      const answer = girl ? 'She' : 'He'
      return mc(
        rng,
        `Which word can take the place of "${name}"?\n${name} is in my class. ____ is very kind.`,
        answer,
        ['It', 'They', girl ? 'He' : 'She'],
        { explanation: `${name} is one ${girl ? 'girl' : 'boy'}, so we say "${answer}".` },
      )
    }

    if (variant === 2) {
      const two = rng.sample([...GIRLS, ...BOYS], 2)
      return mc(
        rng,
        `Which word fits?\n${two[0]} and ${two[1]} are late. ____ missed the bus.`,
        'They',
        ['He', 'She', 'It'],
        { explanation: 'Two people together are "they".' },
      )
    }

    if (variant === 3) {
      const noun = rng.pick(graded(ACTIONS, difficulty)).objS
      return mc(
        rng,
        `Which word fits?\nThe ${noun} is old. ____ is going to break.`,
        'It',
        ['He', 'She', 'They'],
        { explanation: `A ${noun} is a thing, not a person, so we say "It".` },
      )
    }

    const girl = rng.chance(0.5)
    const name = girl ? rng.pick(GIRLS) : rng.pick(BOYS)
    const verb = rng.pick(['greeted', 'thanked', 'helped', 'followed', 'called'])
    return mc(
      rng,
      `Which word fits?\nI saw ${name} at the gate and I ${verb} ____.`,
      girl ? 'her' : 'him',
      [girl ? 'she' : 'he', 'they', 'it'],
      { explanation: `After the verb we use "${girl ? 'her' : 'him'}", not "${girl ? 'she' : 'he'}".` },
    )
  },
}

const articles: SkillDef = {
  id: 'ng.en.wordtypes.articles',
  title: 'A, an and the',
  yearBand: 'b2',
  prerequisites: ['ng.en.wordtypes.nouns'],
  concepts: ['articles'],
  hint: 'Use "an" when the next word starts with a vowel sound: a, e, i, o, u.',
  helpAtHome: 'Say "a ___ / an ___" for things you pass on the road and check each other.',
  generate: ({ rng, difficulty }): Item => {
    const pool = graded(ARTICLE_NOUNS, difficulty)
    const variant = rng.int(1, difficulty <= 2 ? 2 : 4)

    if (variant === 1) {
      const word = rng.pick(pool).word
      const right = articleFor(word)
      const wrong = right === 'a' ? 'an' : 'a'
      return mc(rng, `Which one is correct?`, `${right} ${word}`, [`${wrong} ${word}`], {
        explanation:
          right === 'an'
            ? `"${word}" starts with a vowel sound, so we say "an ${word}".`
            : `"${word}" starts with a consonant sound, so we say "a ${word}".`,
      })
    }

    if (variant === 2) {
      const words = rng.sample(pool, 6)
      const anWords = words.filter((w) => articleFor(w.word) === 'an')
      const aWords = words.filter((w) => articleFor(w.word) === 'a')
      if (anWords.length >= 1 && aWords.length >= 1) {
        // Always ask for "an": the rule is about the vowel sound, and a board
        // of a-words would let a child sweep everything that is left over.
        return tapMany(
          rng,
          'Tap every word that goes with "an"',
          words.map((w) => ({ value: w.word, correct: articleFor(w.word) === 'an' })),
          { explanation: 'Use "an" before a vowel sound — a, e, i, o, u.' },
        )
      }
      const word = rng.pick(pool).word
      const right = articleFor(word)
      return mc(rng, 'Which one is correct?', `${right} ${word}`, [`${right === 'a' ? 'an' : 'a'} ${word}`], {
        explanation: `We say "${right} ${word}".`,
      })
    }

    if (variant === 3) {
      // "The" for something there is only one of — no rival answer is possible.
      const unique = rng.pick([
        { thing: 'sun', rest: 'is very hot today' },
        { thing: 'moon', rest: 'came out at night' },
        { thing: 'sky', rest: 'was full of dark clouds' },
        { thing: 'headmaster of our school', rest: 'visited our class' },
        { thing: 'President of Nigeria', rest: 'spoke on the radio' },
      ])
      return mc(rng, `Which word fits the gap?\n____ ${unique.thing} ${unique.rest}.`, 'The', ['A', 'An', 'Some'], {
        speak: `Which word fits the gap? Blank ${unique.thing} ${unique.rest}.`,
        explanation: `There is only one ${unique.thing}, so we say "the ${unique.thing}".`,
      })
    }

    const word = rng.pick(pool).word
    const right = articleFor(word)
    const other = right === 'a' ? 'an' : 'a'
    return mc(
      rng,
      `Which sentence is written correctly?`,
      `I can see ${right} ${word}.`,
      [`I can see ${other} ${word}.`],
      { explanation: `"${word}" takes "${right}".` },
    )
  },
}

const properNouns: SkillDef = {
  id: 'ng.en.wordtypes.proper-nouns',
  title: 'Names with capital letters',
  yearBand: 'b3',
  prerequisites: ['ng.en.wordtypes.nouns'],
  concepts: ['proper-nouns'],
  hint: 'A proper noun is a special name — a person, a place, a day or a month.',
  helpAtHome: 'Read a page together and hunt for every capital letter in the middle of a line.',
  generate: ({ rng, difficulty }): Item => {
    const proper = [...GIRLS, ...BOYS, ...PLACES, ...DAY_NAMES, ...MONTH_NAMES]
    const common = graded(SAFE_SENTENCE_NOUNS, difficulty).map((x) => x.s)
    const variant = rng.int(1, 3)

    if (variant === 1) {
      return mc(rng, 'Which one is a proper noun?', rng.pick(proper), rng.sample(common, 3), {
        explanation: 'A proper noun is a special name and always starts with a capital letter.',
      })
    }

    if (variant === 2) {
      const board = rng.shuffle([...rng.sample(proper, 3), ...rng.sample(common, 3)])
      return tapMany(
        rng,
        'Tap every proper noun',
        board.map((w) => ({ value: w, correct: proper.includes(w) })),
        { explanation: 'Names of people, places, days and months are proper nouns.' },
      )
    }

    const kind = rng.pick(['a person', 'a place', 'a day of the week', 'a month'] as const)
    const answer =
      kind === 'a person' ? rng.pick([...GIRLS, ...BOYS])
        : kind === 'a place' ? rng.pick(PLACES)
          : kind === 'a day of the week' ? rng.pick(DAY_NAMES)
            : rng.pick(MONTH_NAMES)
    const wrongs = [
      kind === 'a person' ? rng.pick(PLACES) : rng.pick([...GIRLS, ...BOYS]),
      kind === 'a day of the week' ? rng.pick(MONTH_NAMES) : rng.pick(DAY_NAMES),
      kind === 'a month' ? rng.pick(PLACES) : rng.pick(MONTH_NAMES),
    ]
    return mc(rng, `Which proper noun names ${kind}?`, answer, rng.shuffle(wrongs), {
      explanation: `"${answer}" names ${kind}.`,
    })
  },
}

const prepositions: SkillDef = {
  id: 'ng.en.wordtypes.prepositions',
  title: 'Position words',
  yearBand: 'b3',
  prerequisites: ['ng.en.wordtypes.nouns'],
  concepts: ['prepositions'],
  hint: 'A preposition tells you where something is, or when something happens.',
  helpAtHome: 'Hide a spoon and give position clues only: under, behind, beside, between.',
  generate: ({ rng, difficulty }): Item => {
    const variant = rng.int(1, difficulty <= 2 ? 2 : 4)

    if (variant === 1) return clozeItem(rng, PREPOSITION_PLACE_CLOZE, difficulty, 'Which word tells you where?')
    if (variant === 2) return posQuestion(rng, difficulty, 'preposition')
    if (variant === 3) return clozeItem(rng, PREPOSITION_TIME_CLOZE, difficulty, 'Which word tells you when?')

    return posTapMany(
      rng, difficulty, 'preposition', [],
      'Tap the position word (the preposition)',
      'Prepositions such as in, on, under and behind show position.',
    )
  },
}

const conjunctions: SkillDef = {
  id: 'ng.en.wordtypes.conjunctions',
  title: 'Joining words',
  yearBand: 'b4',
  prerequisites: ['ng.en.wordtypes.verbs'],
  concepts: ['conjunctions'],
  hint: 'And, but, or, because, so and although are the words that glue two ideas together.',
  helpAtHome: 'Say half a sentence and let them finish it with "because…" or "but…".',
  generate: ({ rng, difficulty }): Item => {
    const cap = difficulty <= 2 ? 1 : difficulty <= 3 ? 2 : 3
    const variant = rng.int(1, difficulty <= 2 ? 4 : 6)

    if (variant === 1) return clozeItem(rng, CONJUNCTION_CLOZE, difficulty, 'Which joining word fits?')

    if (variant === 2) {
      const job = rng.pick(CONJUNCTION_JOBS)
      return mc(rng, `Which joining word ${job.job}?`, job.answer, rng.shuffle(job.wrong), {
        explanation: `"${job.answer}" ${job.job.toLowerCase()}.`,
      })
    }

    if (variant === 3) {
      // Naming the job the gap has to do settles the answer even where a rival
      // joining word would still make a grammatical sentence.
      const pool = CONJUNCTION_SENSE.filter((x) => x.tier <= cap)
      const pick = rng.pick(pool.length >= 4 ? pool : CONJUNCTION_SENSE)
      return mc(
        rng,
        `The gap needs a word that ${SENSE_ASK[pick.sense]}.\n${pick.text}`,
        pick.answer,
        rng.shuffle(pick.wrong),
        {
          speak: `The gap needs a word that ${SENSE_ASK[pick.sense].toLowerCase()}. ${pick.text.replace('____', 'blank')}`,
          explanation: `${pick.text.replace('____', pick.answer)} ${pick.why}`,
        },
      )
    }

    if (variant === 4) {
      const pool = CONJUNCTION_USES.filter((x) => x.tier <= cap)
      const pick = rng.pick(pool.length >= 4 ? pool : CONJUNCTION_USES)
      const senses: ConjunctionSense[] = ['ADDITION', 'CONTRAST', 'REASON', 'RESULT', 'CHOICE']
      return mc(
        rng,
        `What job does "${pick.word}" do here?\n${pick.text}`,
        SENSE_JOB[pick.sense],
        rng.sample(senses.filter((s) => s !== pick.sense), 3).map((s) => SENSE_JOB[s]),
        { explanation: `${SENSE_JOB[pick.sense]}: ${pick.text}` },
      )
    }

    if (variant === 5) {
      const board = rng.shuffle([
        ...rng.sample(['and', 'but', 'or', 'because', 'so', 'although'], 3).map((w) => ({ value: w, correct: true })),
        ...rng.sample(NOT_CONJUNCTIONS, 3).map((w) => ({ value: w, correct: false })),
      ])
      return tapMany(rng, 'Tap every joining word', board, {
        explanation: 'And, but, or, because, so and although are the words that glue two ideas together.',
      })
    }

    // Finding the joining word inside a finished sentence. Half come from the
    // hand-checked bank, half are generated so the strand never runs dry.
    if (rng.chance(0.5)) {
      const pool = CONJUNCTION_USES.filter((x) => x.tier <= cap)
      const pick = rng.pick(pool.length >= 4 ? pool : CONJUNCTION_USES)
      const tokens = [...new Set(pick.text.replace(/[.,?!]/g, '').split(' '))]
      const others = rng.sample(tokens.filter((w) => w.toLowerCase() !== pick.word), 3)
      return mc(rng, `Which word is the joining word?\n${pick.text}`, pick.word, others, {
        explanation: `"${pick.word}" joins the two halves of the sentence.`,
      })
    }

    const name = rng.pick([...GIRLS, ...BOYS])
    const [a1, a2] = rng.sample(graded(ACTIONS, difficulty), 2)
    const useBut = rng.chance(0.5)
    const sentence = useBut
      ? `${name} ${a1.past} the ${a1.objP} but not the ${a2.objP}.`
      : `${name} ${a1.past} the ${a1.objP} and ${a2.past} the ${a2.objP}.`
    return mc(
      rng,
      `Which word is the joining word?\n${sentence}`,
      useBut ? 'but' : 'and',
      [name, a1.past, a2.objP],
      {
        explanation: useBut
          ? `"but" shows what ${name} did not do.`
          : `"and" joins the two things ${name} did.`,
      },
    )
  },
}

const adverbs: SkillDef = {
  id: 'ng.en.wordtypes.adverbs',
  title: 'How it was done',
  yearBand: 'b4',
  prerequisites: ['ng.en.wordtypes.verbs', 'ng.en.wordtypes.adjectives'],
  concepts: ['adverbs'],
  hint: 'An adverb tells you more about the verb — usually how, and usually ending in -ly.',
  helpAtHome: 'Ask them to walk quickly, then quietly, then proudly. Name the adverb each time.',
  generate: ({ rng, difficulty }): Item => {
    const variant = rng.int(1, difficulty <= 2 ? 2 : 4)

    if (variant === 1) {
      const adv = rng.pick(graded(SAFE_SENTENCE_ADVERBS, difficulty))
      return mc(rng, 'Which word is an adverb?', adv.word, [
        rng.pick(graded(SAFE_SENTENCE_NOUNS, difficulty)).s,
        rng.pick(graded(SAFE_SENTENCE_VERBS, difficulty)).past,
        rng.pick(graded(SAFE_SENTENCE_ADJECTIVES, difficulty)).word,
      ], { explanation: `"${adv.word}" tells you how something was done, so it is an adverb.` })
    }

    if (variant === 2) return posQuestion(rng, difficulty, 'adverb')

    if (variant === 3) {
      const adv = rng.pick(graded(ADVERBS, difficulty))
      return mc(rng, `Change "${adv.from}" into an adverb.`, adv.word, adverbWrongs(adv), {
        explanation: `${adv.from} → ${adv.word}. Most adverbs are made by adding -ly.`,
      })
    }

    return posTapMany(
      rng, difficulty, 'adverb', [],
      'Tap the adverb',
      'The adverb tells you how the action was done.',
    )
  },
}

const partsOfSpeech: SkillDef = {
  id: 'ng.en.wordtypes.parts-of-speech',
  title: 'Name that word class',
  yearBand: 'b6',
  prerequisites: [
    'ng.en.wordtypes.adverbs',
    'ng.en.wordtypes.prepositions',
    'ng.en.wordtypes.conjunctions',
    'ng.en.wordtypes.pronouns',
  ],
  concepts: ['parts-of-speech'],
  hint: 'Ask what the word is doing: naming, describing, acting, or showing position.',
  helpAtHome: 'Take one sentence from a newspaper and label every word together.',
  generate: ({ rng, difficulty }): Item => {
    const s = taggedSentence(rng, difficulty)
    const words = uniqueWords(s.words).filter((w) => w.pos !== 'article')
    const target = rng.pick(words)
    const all: Pos[] = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun']
    const answerPos = target.pos === 'proper' ? 'noun' : target.pos
    const wrong = rng.sample(all.filter((p) => p !== answerPos), 3)
    return mc(
      rng,
      `What part of speech is "${target.w}" here?\n${s.text}`,
      POS_LABEL[answerPos],
      wrong.map((p) => POS_LABEL[p]),
      {
        explanation:
          target.pos === 'proper'
            ? `"${target.w}" is a name, and names are nouns.`
            : `"${target.w}" is ${'aeiou'.includes(POS_LABEL[answerPos][0].toLowerCase()) ? 'an' : 'a'} ${POS_LABEL[answerPos].toLowerCase()} in this sentence.`,
      },
    )
  },
}

export const wordTypesStrand: StrandDef = {
  id: 'ng.en.wordtypes',
  name: 'Word Types City',
  blurb: 'Nouns, verbs, adjectives and the rest of the word family',
  theme: 'city',
  skills: [
    nouns,
    verbs,
    adjectives,
    pronouns,
    articles,
    properNouns,
    prepositions,
    conjunctions,
    adverbs,
    partsOfSpeech,
  ],
}
