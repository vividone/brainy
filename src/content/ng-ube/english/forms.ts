/** Word Forms — Nigerian UBE Basic 1 → Basic 6. Plurals, tenses, comparatives, affixes. */

import type { Rng } from '../../../engine/rng'
import type { Item, SkillDef, StrandDef } from '../../../engine/types'
import { mc, tapMany, thing } from '../../shared/authoring'
import {
  ALL_VERBS,
  BOYS,
  ER_ADJECTIVES,
  ES_NOUNS,
  GIRLS,
  IES_NOUNS,
  IRREGULAR_ADJECTIVES,
  IRREGULAR_NOUNS,
  IRREGULAR_VERBS,
  MORE_ADJECTIVES,
  PREFIX_MEANINGS,
  PREFIX_WORDS,
  REGULAR_NOUNS,
  REGULAR_VERBS,
  SAFE_SENTENCE_NOUNS,
  SUFFIX_MEANINGS,
  SUFFIX_WORDS,
  VES_NOUNS,
  YS_NOUNS,
  graded,
  pluralWrongs,
  type AdjWord,
  type AffixWord,
  type NounWord,
  type Tier,
  type VerbWord,
} from './words'

/* ------------------------------------------------------------------ *
 * Verb frames
 *
 * A tense question has to sit in a sentence that means something. "Ada opens
 * every morning" does not, so every verb used in a tense skill carries the
 * phrase that completes it.
 * ------------------------------------------------------------------ */

const COMPLEMENTS: Record<string, string> = {
  wash: 'the plates', cook: 'the soup', clean: 'the classroom', open: 'the gate',
  close: 'the window', push: 'the wheelbarrow', pull: 'the rope', carry: 'the basket',
  count: 'the coins', fill: 'the bucket', paint: 'the wall', plant: 'the seeds',
  climb: 'the ladder', answer: 'the question', follow: 'the teacher', finish: 'the homework',
  collect: 'the books', arrange: 'the chairs', greet: 'the visitors', thank: 'the driver',
  mend: 'the shirt', borrow: 'a pencil', return: 'the textbook', visit: 'the hospital',
  knock: 'on the door', empty: 'the bucket', wrap: 'the parcel', taste: 'the soup',
  share: 'the mangoes', practise: 'the song', prepare: 'the food', deliver: 'the letters',
  describe: 'the picture', decorate: 'the classroom', tidy: 'the bedroom', copy: 'the notes',
  study: 'the map', listen: 'to the radio', walk: 'to school', talk: 'to the teacher',
  dance: 'at the party', laugh: 'at the joke', travel: 'to Kano', smile: 'at the baby',
  start: 'the lesson', stop: 'the lorry', measure: 'the table', repair: 'the radio',
  eat: 'the rice', drink: 'the water', write: 'a letter', sing: 'a song',
  buy: 'some oranges', bring: 'the broom', take: 'the bucket', give: 'the answer',
  see: 'the rainbow', teach: 'the class', catch: 'the ball', sweep: 'the floor',
  send: 'a message', build: 'a house', find: 'the key', feed: 'the chickens',
  break: 'the plate', wear: 'a uniform', tell: 'a story', sell: 'the mangoes',
  keep: 'the money', hold: 'the torch', draw: 'a map', throw: 'the ball',
  make: 'the beds', lose: 'the key', meet: 'the visitors', hide: 'the sweets',
  choose: 'a book', begin: 'the lesson', go: 'to the market', come: 'to my house',
  run: 'to the gate', swim: 'in the river', sit: 'on the bench', stand: 'near the door',
  fly: 'over the river', win: 'the match', pay: 'the driver', speak: 'to the class',
  drive: 'the lorry', ride: 'a bicycle', spend: 'the money', forget: 'the key',
  leave: 'the house',
}

interface Frame { verb: VerbWord; obj: string }

const framed = (list: VerbWord[]): Frame[] =>
  list.filter((v) => COMPLEMENTS[v.base]).map((v) => ({ verb: v, obj: COMPLEMENTS[v.base] }))

const REGULAR_FRAMES = framed(REGULAR_VERBS)
const IRREGULAR_FRAMES = framed(IRREGULAR_VERBS)
const ALL_FRAMES = framed(ALL_VERBS)

const gradedFrames = (list: Frame[], difficulty: number): Frame[] => {
  const cap: Tier = difficulty <= 2 ? 1 : difficulty <= 3 ? 2 : 3
  const out = list.filter((f) => f.verb.tier <= cap)
  return out.length >= 4 ? out : list
}

/* ------------------------------------------------------------------ *
 * Shared helpers
 * ------------------------------------------------------------------ */

const someone = (rng: Rng) => rng.pick([...GIRLS, ...BOYS])

/** "What is the plural of X?" over any plural class. */
function pluralQuestion(rng: Rng, word: NounWord, why: string) {
  return mc(rng, `What is the plural of "${word.s}"?`, word.p, pluralWrongs(word), {
    speak: `What is the plural of ${word.s}?`,
    explanation: `One ${word.s}, two ${word.p}. ${why}`,
  })
}

/** The same idea in a sentence, which reads more naturally at Basic 1. */
function pluralInSentence(rng: Rng, word: NounWord, count: number, why: string) {
  const name = someone(rng)
  return mc(rng, `Which word fits?\n${name} has ${count} ____.`, word.p, pluralWrongs(word), {
    speak: `Which word fits? ${name} has ${count} blank.`,
    explanation: `${count} means more than one, so we say "${count} ${word.p}". ${why}`,
  })
}

/* ------------------------------------------------------------------ *
 * Plurals
 * ------------------------------------------------------------------ */

const pluralS: SkillDef = {
  id: 'ng.en.forms.plural-s',
  title: 'One and many',
  yearBand: 'b1',
  concepts: ['plural-regular'],
  hint: 'For most words, just add s: one book, two books.',
  helpAtHome: 'Count things aloud — one spoon, two spoons — and stress the s at the end.',
  generate: ({ rng, difficulty, locale }): Item => {
    const pool = graded(REGULAR_NOUNS, difficulty)
    const word = rng.pick(pool)
    const variant = rng.int(1, difficulty <= 2 ? 3 : 4)

    if (variant === 1) return pluralQuestion(rng, word, 'Most words just add s.')
    if (variant === 2) return pluralInSentence(rng, word, rng.int(2, 9), 'Most words just add s.')

    if (variant === 3) {
      const noun = thing(rng, locale)
      const count = rng.int(2, 6)
      return mc(rng, 'Which sentence is correct?', `I can see ${count} ${noun.many}.`, [
        `I can see ${count} ${noun.one}.`,
      ], {
        visual: { kind: 'objects', glyph: noun.glyph, count, perRow: 5 },
        explanation: `There is more than one, so we use the plural "${noun.many}".`,
      })
    }

    const board = rng.sample(pool, 6)
    return tapMany(
      rng,
      'Tap every word that means MORE THAN ONE',
      board.map((w, i) => (i % 2 === 0 ? { value: w.p, correct: true } : { value: w.s, correct: false })),
      { explanation: 'A plural word usually ends in s.' },
    )
  },
}

const pluralEs: SkillDef = {
  id: 'ng.en.forms.plural-es',
  title: 'Plurals that add -es',
  yearBand: 'b3',
  prerequisites: ['ng.en.forms.plural-s'],
  concepts: ['plural-es', 'plural-ies'],
  hint: 'After s, x, ch or sh add -es. After a consonant + y, change the y to -ies.',
  helpAtHome: 'Write bus, box, church and baby, then ask for the plural of each out loud.',
  generate: ({ rng, difficulty }): Item => {
    const variant = rng.int(1, difficulty <= 2 ? 2 : 4)

    if (variant === 1) {
      return pluralQuestion(rng, rng.pick(graded(ES_NOUNS, difficulty)), 'Words ending in s, x, z, ch or sh add -es.')
    }
    if (variant === 2) {
      return pluralQuestion(rng, rng.pick(graded(IES_NOUNS, difficulty)), 'A consonant before the y turns the y into -ies.')
    }
    if (variant === 3) {
      // The trap: a vowel before the y keeps the y and only adds s.
      return pluralQuestion(rng, rng.pick(graded(YS_NOUNS, difficulty)), 'A vowel before the y means the y stays and we only add s.')
    }

    const board = rng.shuffle([
      ...rng.sample(graded(ES_NOUNS, difficulty), 3).map((w) => ({ value: w.s, correct: true })),
      ...rng.sample(graded(REGULAR_NOUNS, difficulty), 3).map((w) => ({ value: w.s, correct: false })),
    ])
    return tapMany(rng, 'Tap every word that adds -es to make its plural', board, {
      explanation: 'Only words ending in s, x, z, ch or sh need -es.',
    })
  },
}

const pluralIrregular: SkillDef = {
  id: 'ng.en.forms.plural-irregular',
  title: 'Tricky plurals',
  yearBand: 'b4',
  prerequisites: ['ng.en.forms.plural-es'],
  concepts: ['plural-irregular'],
  hint: 'Some words change completely: man becomes men. A few do not change at all.',
  helpAtHome: 'Chant the odd ones on the way to school: man/men, foot/feet, child/children.',
  generate: ({ rng, difficulty }): Item => {
    const variant = rng.int(1, difficulty <= 2 ? 2 : 4)

    if (variant === 1) {
      return pluralQuestion(rng, rng.pick(graded(IRREGULAR_NOUNS, difficulty)), 'This one breaks the rule and has to be remembered.')
    }
    if (variant === 2) {
      return pluralQuestion(rng, rng.pick(graded(VES_NOUNS, difficulty)), 'The f changes to v before we add -es.')
    }
    if (variant === 3) {
      const word = rng.pick(graded(IRREGULAR_NOUNS, difficulty))
      const count = rng.int(2, 8)
      return mc(rng, `Which word fits?\nI counted ${count} ____.`, word.p, pluralWrongs(word), {
        speak: `Which word fits? I counted ${count} blank.`,
        explanation: `The plural of "${word.s}" is "${word.p}".`,
      })
    }

    const board = rng.shuffle([
      ...rng.sample(graded(IRREGULAR_NOUNS, difficulty), 3).map((w) => ({ value: w.s, correct: true })),
      ...rng.sample(graded(REGULAR_NOUNS, difficulty), 3).map((w) => ({ value: w.s, correct: false })),
    ])
    return tapMany(rng, 'Tap every word with a TRICKY plural (not just + s or -es)', board, {
      explanation: 'Words like man, child and foot change their spelling completely.',
    })
  },
}

/* ------------------------------------------------------------------ *
 * Tenses
 * ------------------------------------------------------------------ */

const presentTense: SkillDef = {
  id: 'ng.en.forms.present-tense',
  title: 'Happening now',
  yearBand: 'b2',
  prerequisites: ['ng.en.wordtypes.verbs'],
  concepts: ['present-tense'],
  hint: 'With he, she or it the verb takes an s: she walks, he sings.',
  helpAtHome: 'Describe what everyone does each morning: "Daddy cooks, Mummy sweeps, I dress."',
  generate: ({ rng, difficulty }): Item => {
    const { verb, obj } = rng.pick(gradedFrames(REGULAR_FRAMES, difficulty))
    const variant = rng.int(1, difficulty <= 2 ? 2 : 3)

    if (variant === 1) {
      const name = someone(rng)
      return mc(rng, `Which word fits?\n${name} ____ ${obj} every morning.`, verb.s, [
        verb.base, verb.ing, `to ${verb.base}`,
      ], {
        speak: `Which word fits? ${name} blank ${obj} every morning.`,
        explanation: `${name} is one person, so the verb takes an s: "${name} ${verb.s}".`,
      })
    }

    if (variant === 2) {
      const subject = rng.pick(['They', 'We', 'The children', 'My friends'])
      return mc(rng, `Which word fits?\n${subject} ____ ${obj} every day.`, verb.base, [
        verb.s, verb.ing, `to ${verb.base}`,
      ], {
        speak: `Which word fits? ${subject} blank ${obj} every day.`,
        explanation: `"${subject}" means more than one, so the verb has no s: "${subject} ${verb.base}".`,
      })
    }

    return mc(rng, `Finish this: he ____ ${obj}.`, verb.s, [verb.base, verb.ing, verb.past], {
      explanation: `With he, she or it we say "${verb.s}".`,
    })
  },
}

const pastRegular: SkillDef = {
  id: 'ng.en.forms.past-ed',
  title: 'It happened yesterday',
  yearBand: 'b3',
  prerequisites: ['ng.en.forms.present-tense'],
  concepts: ['past-tense-regular'],
  hint: 'Most verbs add -ed for the past: walk becomes walked.',
  helpAtHome: 'At bedtime ask "what did you do today?" and listen for the -ed endings.',
  generate: ({ rng, difficulty }): Item => {
    const { verb, obj } = rng.pick(gradedFrames(REGULAR_FRAMES, difficulty))
    const variant = rng.int(1, difficulty <= 2 ? 2 : 3)

    if (variant === 1) {
      const name = someone(rng)
      return mc(rng, `Which word fits?\nYesterday ${name} ____ ${obj}.`, verb.past, [
        verb.base, verb.s, verb.ing,
      ], {
        speak: `Which word fits? Yesterday ${name} blank ${obj}.`,
        explanation: `"Yesterday" means it is finished, so we use the past tense "${verb.past}".`,
      })
    }

    if (variant === 2) {
      return mc(rng, `What is the past tense of "${verb.base}"?`, verb.past, [
        `${verb.base}ed`, verb.s, verb.ing,
      ], {
        explanation:
          verb.past === `${verb.base}ed`
            ? `Just add -ed: ${verb.base} → ${verb.past}.`
            : `${verb.base} → ${verb.past}. The spelling changes a little before -ed.`,
      })
    }

    const board = rng.shuffle([
      ...rng.sample(graded(REGULAR_VERBS, difficulty), 3).map((w) => ({ value: w.past, correct: true })),
      ...rng.sample(graded(REGULAR_VERBS, difficulty), 3).map((w) => ({ value: w.ing, correct: false })),
    ])
    return tapMany(rng, 'Tap every word that is in the PAST tense', board, {
      explanation: 'Past-tense verbs here end in -ed. Words ending in -ing are happening now.',
    })
  },
}

const pastIrregular: SkillDef = {
  id: 'ng.en.forms.past-irregular',
  title: 'Tricky past tenses',
  yearBand: 'b4',
  prerequisites: ['ng.en.forms.past-ed'],
  concepts: ['past-tense-irregular'],
  hint: 'Some verbs change instead of adding -ed: go becomes went, never "goed".',
  helpAtHome: 'Say a verb and race to give the past: run/ran, eat/ate, buy/bought.',
  generate: ({ rng, difficulty }): Item => {
    const { verb, obj } = rng.pick(gradedFrames(IRREGULAR_FRAMES, difficulty))
    const wrongs = [...(verb.wrong ?? []), verb.base, verb.ing]
    const variant = rng.int(1, difficulty <= 2 ? 2 : 3)

    if (variant === 1) {
      return mc(rng, `What is the past tense of "${verb.base}"?`, verb.past, rng.shuffle(wrongs), {
        explanation: `${verb.base} → ${verb.past}. It never takes -ed.`,
      })
    }

    if (variant === 2) {
      const name = someone(rng)
      const when = rng.pick(['Last week', 'Yesterday', 'Last Saturday', 'This morning'])
      return mc(rng, `Which word fits?\n${when} ${name} ____ ${obj}.`, verb.past, rng.shuffle(wrongs), {
        speak: `Which word fits? ${when} ${name} blank ${obj}.`,
        explanation: `"${when}" is finished, so we say "${verb.past}", not "${(verb.wrong ?? [])[0] ?? `${verb.base}ed`}".`,
      })
    }

    const board = rng.shuffle([
      ...rng.sample(graded(IRREGULAR_VERBS, difficulty), 3).map((w) => ({ value: w.past, correct: true })),
      ...rng
        .sample(graded(IRREGULAR_VERBS, difficulty), 3)
        .map((w) => ({ value: (w.wrong ?? [`${w.base}ed`])[0], correct: false })),
    ])
    return tapMany(rng, 'Tap every word that is a REAL past tense', board, {
      explanation: '"Runned" and "goed" are not English words — the real past forms are ran and went.',
    })
  },
}

const futureTense: SkillDef = {
  id: 'ng.en.forms.future',
  title: 'It will happen',
  yearBand: 'b3',
  prerequisites: ['ng.en.forms.present-tense'],
  concepts: ['future-tense'],
  hint: 'Put "will" in front and leave the verb alone: will walk, will go.',
  helpAtHome: 'Plan tomorrow out loud: "We will go, we will buy, we will visit."',
  generate: ({ rng, difficulty }): Item => {
    const { verb, obj } = rng.pick(gradedFrames(ALL_FRAMES, difficulty))
    const name = someone(rng)
    const variant = rng.int(1, difficulty <= 2 ? 2 : 3)

    if (variant === 1) {
      const when = rng.pick(['Tomorrow', 'Next week', 'Next month', 'On Saturday'])
      return mc(rng, `Which words fit?\n${when} ${name} ____ ${obj}.`, `will ${verb.base}`, [
        `will ${verb.past}`, `will ${verb.s}`, verb.past,
      ], {
        speak: `Which words fit? ${when} ${name} blank ${obj}.`,
        explanation: `After "will" the verb stays as it is: "will ${verb.base}".`,
      })
    }

    if (variant === 2) {
      return mc(rng, `Put "${verb.base}" into the future tense.`, `will ${verb.base}`, [
        verb.past, verb.s, `will ${verb.ing}`,
      ], { explanation: `The future is "will" plus the plain verb: will ${verb.base}.` })
    }

    const tense = rng.pick(['past', 'present', 'future'] as const)
    const sentence =
      tense === 'past' ? `${name} ${verb.past} ${obj}.`
        : tense === 'present' ? `${name} ${verb.s} ${obj} every day.`
          : `${name} will ${verb.base} ${obj}.`
    const label = tense === 'past' ? 'Past' : tense === 'present' ? 'Present' : 'Future'
    return mc(rng, `Which tense is this sentence in?\n${sentence}`, label,
      ['Past', 'Present', 'Future'].filter((t) => t !== label), {
      explanation:
        tense === 'future' ? '"Will" tells you it has not happened yet.'
          : tense === 'past' ? 'It has already finished, so it is the past tense.'
            : 'It happens every day, so it is the present tense.',
    })
  },
}

const continuous: SkillDef = {
  id: 'ng.en.forms.continuous',
  title: 'Happening right now',
  yearBand: 'b5',
  prerequisites: ['ng.en.forms.past-ed'],
  concepts: ['present-continuous'],
  hint: 'Use is, am or are with the -ing form: she is writing, they are writing.',
  helpAtHome: 'Give a running commentary on what everybody is doing right now, -ing and all.',
  generate: ({ rng, difficulty }): Item => {
    const { verb, obj } = rng.pick(gradedFrames(ALL_FRAMES, difficulty))
    const variant = rng.int(1, difficulty <= 3 ? 2 : 3)

    if (variant === 1) {
      const name = someone(rng)
      return mc(rng, `Which words fit?\nLook! ${name} ____ ${obj} right now.`, `is ${verb.ing}`, [
        `are ${verb.ing}`, `is ${verb.base}`, `am ${verb.ing}`,
      ], {
        speak: `Which words fit? Look, ${name} blank ${obj} right now.`,
        explanation: `${name} is one person, so we say "is ${verb.ing}".`,
      })
    }

    if (variant === 2) {
      const subject = rng.pick(['The children', 'They', 'My cousins', 'The traders'])
      return mc(rng, `Which words fit?\nListen! ${subject} ____ ${obj} at the moment.`, `are ${verb.ing}`, [
        `is ${verb.ing}`, `am ${verb.ing}`, `are ${verb.base}`,
      ], {
        speak: `Which words fit? Listen, ${subject} blank ${obj} at the moment.`,
        explanation: `"${subject}" means more than one, so we say "are ${verb.ing}".`,
      })
    }

    return mc(rng, `What is the -ing form of "${verb.base}"?`, verb.ing, [
      `${verb.base}ing`, verb.past, verb.s,
    ], {
      explanation:
        verb.ing === `${verb.base}ing`
          ? `Just add -ing: ${verb.base} → ${verb.ing}.`
          : `${verb.base} → ${verb.ing}. The spelling changes a little before -ing.`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * Comparing
 *
 * Adjectives are split by what they can sensibly describe, because "Ada is
 * more expensive" and "the basket is hungrier" are both nonsense.
 * ------------------------------------------------------------------ */

const PERSON_ADJ = new Set([
  'tall', 'short', 'old', 'young', 'strong', 'weak', 'fast', 'happy', 'hungry', 'brave',
  'lucky', 'busy', 'friendly', 'healthy', 'lazy', 'noisy', 'sad', 'angry', 'thirsty',
  'sleepy', 'silly', 'funny', 'quick', 'slow', 'rich', 'poor', 'thin', 'generous',
  'honest', 'careful', 'intelligent', 'obedient', 'cheerful', 'thoughtful', 'popular',
  'famous', 'helpful', 'sensible',
])

const THING_ADJ = new Set([
  'big', 'small', 'heavy', 'long', 'wide', 'sweet', 'hot', 'cold', 'dirty', 'bright',
  'sharp', 'new', 'deep', 'high', 'low', 'tasty', 'muddy', 'dusty', 'large', 'soft',
  'smooth', 'rough', 'warm', 'wet', 'beautiful', 'expensive', 'colourful', 'delicious',
  'useful', 'important', 'interesting', 'dangerous', 'comfortable', 'exciting',
  'valuable', 'crowded', 'wonderful', 'powerful', 'difficult', 'peaceful',
])

/** Wrong forms: the other degree, plus both over-applied rules. */
function compareWrongs(adj: AdjWord, correct: string): string[] {
  const out: string[] = []
  const seen = new Set([correct])
  const add = (w: string) => {
    if (!w || seen.has(w)) return
    seen.add(w)
    out.push(w)
  }
  add(correct === adj.er ? adj.est : adj.er)
  add(`${adj.base}er`)
  add(`${adj.base}est`)
  add(`more ${adj.base}`)
  add(`most ${adj.base}`)
  return out
}

function compareItem(rng: Rng, adj: AdjWord, superlative: boolean, difficulty: number) {
  const correct = superlative ? adj.est : adj.er
  const wrong = compareWrongs(adj, correct)

  if (PERSON_ADJ.has(adj.base)) {
    const [x, y, z] = rng.sample([...GIRLS, ...BOYS], 3)
    return superlative
      ? mc(rng, `Which words fit?\n${x}, ${y} and ${z} are all ${adj.base}. ${z} is the ____.`, correct, wrong, {
        speak: `Which words fit? ${x}, ${y} and ${z} are all ${adj.base}. ${z} is the blank.`,
        explanation: `Comparing three or more, we use "${adj.est}".`,
      })
      : mc(rng, `Which words fit?\n${x} is ${adj.base}. ${y} is even ____ than ${x}.`, correct, wrong, {
        speak: `Which words fit? ${x} is ${adj.base}. ${y} is even blank than ${x}.`,
        explanation: `Comparing just two, we use "${adj.er}".`,
      })
  }

  if (THING_ADJ.has(adj.base)) {
    const noun = rng.pick(graded(SAFE_SENTENCE_NOUNS, difficulty))
    return superlative
      ? mc(rng, `Which words fit?\nAll three ${noun.p} are ${adj.base}. This one is the ____.`, correct, wrong, {
        speak: `Which words fit? All three ${noun.p} are ${adj.base}. This one is the blank.`,
        explanation: `Comparing three or more, we use "${adj.est}".`,
      })
      : mc(rng, `Which words fit?\nThis ${noun.s} is ${adj.base}. That ${noun.s} is even ____.`, correct, wrong, {
        speak: `Which words fit? This ${noun.s} is ${adj.base}. That ${noun.s} is even blank.`,
        explanation: `Comparing just two, we use "${adj.er}".`,
      })
  }

  // good / bad and anything unclassified: keep it abstract, which is always true.
  return mc(
    rng,
    superlative
      ? `Comparing THREE or more things, what do we say?\n${adj.base} → ____`
      : `Comparing TWO things, what do we say?\n${adj.base} → ____`,
    correct,
    wrong,
    { explanation: `${adj.base}, ${adj.er}, ${adj.est}.` },
  )
}

const comparatives: SkillDef = {
  id: 'ng.en.forms.comparatives',
  title: 'Bigger and biggest',
  yearBand: 'b3',
  prerequisites: ['ng.en.wordtypes.adjectives'],
  concepts: ['comparatives-er'],
  hint: 'Comparing two things? Use -er. Comparing three or more? Use -est.',
  helpAtHome: 'Line up three objects and ask which is big, bigger and biggest.',
  generate: ({ rng, difficulty }): Item => {
    const adj = rng.pick(graded(ER_ADJECTIVES, difficulty))
    const variant = rng.int(1, difficulty <= 2 ? 2 : 3)

    if (variant === 1) return compareItem(rng, adj, false, difficulty)
    if (variant === 2) return compareItem(rng, adj, true, difficulty)

    const wantEst = rng.chance(0.5)
    return mc(
      rng,
      wantEst ? `${adj.base} → ${adj.er} → ?` : `${adj.base} → ? → ${adj.est}`,
      wantEst ? adj.est : adj.er,
      compareWrongs(adj, wantEst ? adj.est : adj.er),
      {
        speak: `Finish the pattern. ${adj.base}, ${wantEst ? `${adj.er}, blank` : `blank, ${adj.est}`}.`,
        explanation: `${adj.base}, ${adj.er}, ${adj.est}.`,
      },
    )
  },
}

const comparativeMore: SkillDef = {
  id: 'ng.en.forms.comparative-more',
  title: 'More and most',
  yearBand: 'b5',
  prerequisites: ['ng.en.forms.comparatives'],
  concepts: ['comparatives-more', 'comparatives-irregular'],
  hint: 'Long words take "more" and "most". Good and bad change completely.',
  helpAtHome: 'Compare two meals or two journeys — "more delicious", "the most tiring".',
  generate: ({ rng, difficulty }): Item => {
    const useIrregular = rng.chance(difficulty >= 4 ? 0.4 : 0.25)
    const adj = useIrregular ? rng.pick(IRREGULAR_ADJECTIVES) : rng.pick(graded(MORE_ADJECTIVES, difficulty))
    const variant = rng.int(1, 3)

    if (variant === 1) return compareItem(rng, adj, false, difficulty)
    if (variant === 2) return compareItem(rng, adj, true, difficulty)

    return mc(rng, 'Which one is correct?', adj.er, compareWrongs(adj, adj.er), {
      explanation:
        adj.mode === 'more'
          ? `"${adj.base}" is a long word, so we say "${adj.er}" — never "${adj.base}er".`
          : `"${adj.base}" changes completely: ${adj.base}, ${adj.er}, ${adj.est}.`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * Prefixes and suffixes
 * ------------------------------------------------------------------ */

const OTHER_PREFIXES = ['un', 're', 'dis', 'mis', 'pre']
const OTHER_SUFFIXES = ['ful', 'less', 'ness', 'er', 'ment']

function affixWrongs(word: AffixWord, prefix: boolean): string[] {
  const out: string[] = []
  const seen = new Set([word.built, word.root])
  const add = (w: string) => {
    if (!w || seen.has(w)) return
    seen.add(w)
    out.push(w)
  }
  const bank = prefix ? OTHER_PREFIXES : OTHER_SUFFIXES
  for (const affix of bank.filter((x) => x !== word.affix)) {
    add(prefix ? `${affix}${word.root}` : `${word.root}${affix}`)
  }
  return out
}

const prefixes: SkillDef = {
  id: 'ng.en.forms.prefixes',
  title: 'Un-, re-, dis-, mis-',
  yearBand: 'b5',
  prerequisites: ['ng.en.wordtypes.adjectives'],
  concepts: ['prefixes'],
  hint: 'A prefix goes at the front and changes the meaning. "Un-" and "dis-" usually mean not.',
  helpAtHome: 'Say a word and ask for its "un-" version: happy/unhappy, tidy/untidy, lock/unlock.',
  generate: ({ rng, difficulty }): Item => {
    const word = rng.pick(graded(PREFIX_WORDS, difficulty))
    const variant = rng.int(1, difficulty <= 2 ? 2 : 3)

    if (variant === 1) {
      return mc(rng, `Which word means "${word.gloss}"?`, word.built, rng.shuffle(affixWrongs(word, true)), {
        explanation: `${word.affix}- + ${word.root} = ${word.built}, which means ${word.gloss}.`,
      })
    }

    if (variant === 2) {
      return mc(
        rng,
        `Which prefix goes in front of "${word.root}" to mean "${word.gloss}"?`,
        `${word.affix}-`,
        rng.shuffle(OTHER_PREFIXES.filter((p) => p !== word.affix).map((p) => `${p}-`)),
        { explanation: `${word.affix}- + ${word.root} = ${word.built}.` },
      )
    }

    const meaning = rng.pick(PREFIX_MEANINGS)
    return mc(rng, `Which prefix means "${meaning.meaning}"?`, meaning.affix, rng.shuffle(meaning.wrong), {
      explanation: `"${meaning.affix}" means ${meaning.meaning}.`,
    })
  },
}

const suffixes: SkillDef = {
  id: 'ng.en.forms.suffixes',
  title: '-ful, -less, -ness, -er',
  yearBand: 'b6',
  prerequisites: ['ng.en.forms.prefixes'],
  concepts: ['suffixes'],
  hint: 'A suffix goes on the end. "-ful" means full of; "-less" means without.',
  helpAtHome: 'Take a root like "care" and build every word you can: careful, careless, carer.',
  generate: ({ rng, difficulty }): Item => {
    const word = rng.pick(graded(SUFFIX_WORDS, difficulty))
    const variant = rng.int(1, difficulty <= 2 ? 2 : 3)

    if (variant === 1) {
      return mc(rng, `Which word means "${word.gloss}"?`, word.built, rng.shuffle(affixWrongs(word, false)), {
        explanation: `${word.root} + -${word.affix} = ${word.built}, which means ${word.gloss}.`,
      })
    }

    if (variant === 2) {
      return mc(
        rng,
        `Which ending turns "${word.root}" into a word meaning "${word.gloss}"?`,
        `-${word.affix}`,
        rng.shuffle(OTHER_SUFFIXES.filter((s) => s !== word.affix).map((s) => `-${s}`)),
        { explanation: `${word.root} + -${word.affix} = ${word.built}.` },
      )
    }

    const meaning = rng.pick(SUFFIX_MEANINGS)
    return mc(
      rng,
      `What does the ending "${meaning.affix}" mean?`,
      meaning.meaning,
      SUFFIX_MEANINGS.filter((m) => m.affix !== meaning.affix).map((m) => m.meaning),
      { explanation: `"${meaning.affix}" means ${meaning.meaning}.` },
    )
  },
}

export const wordFormsStrand: StrandDef = {
  id: 'ng.en.forms',
  name: 'Word Forms Grove',
  blurb: 'Singular and plural, tenses, comparing, prefixes and suffixes',
  theme: 'grove',
  skills: [
    pluralS,
    presentTense,
    pluralEs,
    pastRegular,
    futureTense,
    comparatives,
    pluralIrregular,
    pastIrregular,
    continuous,
    comparativeMore,
    prefixes,
    suffixes,
  ],
}
