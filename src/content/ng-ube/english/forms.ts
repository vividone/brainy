/** Word Forms — Nigerian UBE Basic 1 → Basic 6. Plurals, tenses, comparatives, affixes. */

import type { Rng } from '../../../engine/rng'
import type { Item, SkillDef, StrandDef } from '../../../engine/types'
import { mc, tapMany, tf, thing } from '../../shared/authoring'
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
 * Plural question forms
 *
 * Six ways to ask the same rule. Asking "what is the plural of X?" two
 * hundred times teaches a child to recognise the question, not the rule.
 * ------------------------------------------------------------------ */

/**
 * Wrong singulars: the plural left as it is, and the naive un-pluralisings a
 * child produces when the rule is applied backwards ("leave" from "leaves").
 */
function singularWrongs(word: NounWord): string[] {
  const out: string[] = []
  const seen = new Set([word.s])
  const add = (w: string) => {
    if (!w || w.length < 2 || seen.has(w)) return
    seen.add(w)
    out.push(w)
  }
  add(word.p)
  if (/ves$/.test(word.p)) add(word.p.replace(/ves$/, 've'))
  // "glasss" is not a mistake anybody makes, so it is noise rather than a
  // distractor.
  if (!/s$/.test(word.s)) add(`${word.s}s`)
  if (/s$/.test(word.p)) add(word.p.slice(0, -1))
  add(`${word.p}s`)
  return out
}

/** Going backwards is a different skill from going forwards, and it shows. */
function singularQuestion(rng: Rng, word: NounWord, why: string) {
  return mc(rng, `What is the singular of "${word.p}"?`, word.s, singularWrongs(word), {
    speak: `What is the singular of ${word.p}?`,
    explanation: `Two ${word.p}, one ${word.s}. ${why}`,
  })
}

/** Spotting somebody else's mistake is the skill a marker actually needs. */
function wrongPluralHunt(rng: Rng, pool: NounWord[], why: string) {
  const [bad, ...rest] = rng.sample(pool, 4)
  const spelling = pluralWrongs(bad)[0] ?? `${bad.s}s`
  return mc(rng, 'Which plural is spelt wrongly?', spelling, rest.map((w) => w.p), {
    explanation: `"${spelling}" is wrong — the plural of "${bad.s}" is "${bad.p}". ${why}`,
  })
}

/** Naming the rule, rather than applying it. */
const PLURAL_RULE = {
  es: 'It ends in s, x, ch or sh, so we add -es.',
  o: 'It ends in o, so we add -es.',
  ies: 'There is a consonant before the y, so the y becomes -ies.',
  ys: 'There is a vowel before the y, so the y stays and we only add -s.',
  ves: 'The f or fe changes to v before we add -es.',
  odd: 'It changes its spelling completely, so it has to be remembered.',
} as const

type PluralRuleKey = keyof typeof PLURAL_RULE

function ruleQuestion(rng: Rng, word: NounWord, key: PluralRuleKey, others: PluralRuleKey[]) {
  return mc(
    rng,
    `Why does "${word.s}" become "${word.p}"?`,
    PLURAL_RULE[key],
    others.filter((k) => k !== key).map((k) => PLURAL_RULE[k]),
    { explanation: `${word.s} → ${word.p}. ${PLURAL_RULE[key]}` },
  )
}

/** True or false, which forces a judgement instead of a comparison. */
function pluralTrueFalse(rng: Rng, word: NounWord) {
  const truth = rng.chance(0.5)
  const shown = truth ? word.p : (pluralWrongs(word)[0] ?? `${word.s}s`)
  return tf(`The plural of "${word.s}" is "${shown}".`, truth, {
    explanation: `The plural of "${word.s}" is "${word.p}".`,
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
      // "3 fish" is every bit as correct as "3 fishes", so the one noun in the
      // locale pool with two defensible plurals is kept out of this question.
      const pool2 = locale.objects.filter((o) => o.one !== 'fish')
      const noun = pool2.length ? rng.pick(pool2) : thing(rng, locale)
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
    /** Which of the three -es-family rules this word follows. */
    const ruleOf = (w: NounWord): PluralRuleKey =>
      /(?:s|x|z|ch|sh)$/.test(w.s) ? 'es' : /o$/.test(w.s) ? 'o' : /[aeiou]y$/.test(w.s) ? 'ys' : 'ies'

    const es = graded(ES_NOUNS, difficulty)
    const ies = graded(IES_NOUNS, difficulty)
    const ys = graded(YS_NOUNS, difficulty)
    // The whole point of this skill is the contrast, so most forms draw from
    // all three families at once and the y-trap stays live.
    const mixed = [...es, ...ies, ...ys]
    const variant = rng.int(1, 7)

    if (variant === 1) {
      const bank = rng.pick([es, ies, ys])
      const word = rng.pick(bank)
      return pluralQuestion(
        rng,
        word,
        bank === es ? 'Words ending in s, x, z, ch or sh add -es.'
          : bank === ies ? 'A consonant before the y turns the y into -ies.'
            : 'A vowel before the y means the y stays and we only add s.',
      )
    }

    if (variant === 2) {
      return pluralInSentence(rng, rng.pick(mixed), rng.int(2, 9), 'Look at the letter before the ending.')
    }

    if (variant === 3) {
      // Going backwards: "babies" → "baby", not "babie".
      const word = rng.pick([...es, ...ies])
      return singularQuestion(
        rng,
        word,
        /(?:ies)$/.test(word.p)
          ? 'The -ies goes back to a single y.'
          : 'Take the whole -es off, not just the s.',
      )
    }

    if (variant === 4) {
      return wrongPluralHunt(rng, mixed, 'Check the letter just before the ending.')
    }

    if (variant === 5) {
      const word = rng.pick(mixed)
      return ruleQuestion(rng, word, ruleOf(word), ['es', 'o', 'ies', 'ys'])
    }

    if (variant === 6) {
      return pluralTrueFalse(rng, rng.pick(mixed))
    }

    // "mattress" also takes -es, so it cannot sit on the not-es side of the board.
    const plainS = graded(REGULAR_NOUNS, difficulty).filter((w) => !/(?:s|x|z|ch|sh|o)$/.test(w.s))
    const board = rng.shuffle([
      ...rng.sample(es, 3).map((w) => ({ value: w.s, correct: true })),
      ...rng.sample(plainS, 3).map((w) => ({ value: w.s, correct: false })),
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
    const odd = graded(IRREGULAR_NOUNS, difficulty)
    const ves = graded(VES_NOUNS, difficulty)
    const mixed = [...odd, ...ves]
    // sheep and deer look identical either way, so they cannot answer a
    // "what is the singular?" or a "why does it change?" question.
    const changes = mixed.filter((w) => w.s !== w.p)
    const variant = rng.int(1, 7)

    if (variant === 1) {
      const useVes = rng.chance(0.5)
      return pluralQuestion(
        rng,
        rng.pick(useVes ? ves : odd),
        useVes ? 'The f changes to v before we add -es.' : 'This one breaks the rule and has to be remembered.',
      )
    }

    if (variant === 2) {
      const word = rng.pick(mixed)
      const count = rng.int(2, 9)
      const name = someone(rng)
      return mc(rng, `Which word fits?\n${name} counted ${count} ____.`, word.p, pluralWrongs(word), {
        speak: `Which word fits? ${name} counted ${count} blank.`,
        explanation: `The plural of "${word.s}" is "${word.p}".`,
      })
    }

    if (variant === 3) {
      const word = rng.pick(changes)
      return singularQuestion(
        rng,
        word,
        /ves$/.test(word.p)
          ? 'Going backwards, the v turns into an f or fe again.'
          : 'These words change shape completely, so the singular has to be remembered too.',
      )
    }

    if (variant === 4) {
      return wrongPluralHunt(rng, mixed, 'These plurals cannot be built by adding s.')
    }

    if (variant === 5) {
      const word = rng.pick(changes)
      return ruleQuestion(rng, word, /ves$/.test(word.p) ? 'ves' : 'odd', ['ves', 'odd', 'es', 'ies'])
    }

    if (variant === 6) {
      return pluralTrueFalse(rng, rng.pick(mixed))
    }

    const board = rng.shuffle([
      ...rng.sample(odd, 3).map((w) => ({ value: w.s, correct: true })),
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

/** The last word of a complement, which is always a noun worth offering. */
const tailOf = (obj: string) => obj.split(' ').slice(-1)[0]

/**
 * "One word here is in the wrong tense — which?"
 *
 * A completely different job from producing the right form, and the one a
 * child has to do when checking their own writing. Asking about *tense*
 * rather than about correctness keeps the answer single: the verb is the only
 * word in the sentence that has one.
 */
function spotWrongVerb(rng: Rng, name: string, when: string, bad: string, obj: string, right: string) {
  return mc(rng, `Which word is in the wrong tense?\n${when} ${name} ${bad} ${obj}.`, bad, [
    name, when, tailOf(obj),
  ], {
    speak: `Which word is in the wrong tense? ${when} ${name} ${bad} ${obj}.`,
    explanation: `"${when}" is finished, so it must be "${right}", not "${bad}".`,
  })
}

/** Yes or no on a whole sentence, rather than a choice between four forms. */
function judgeSentence(rng: Rng, name: string, when: string, verb: VerbWord, obj: string, wrongForm: string) {
  const correct = rng.chance(0.5)
  const shown = correct ? verb.past : wrongForm
  return tf(`Is this sentence correct?\n${when} ${name} ${shown} ${obj}.`, correct, {
    trueLabel: 'Yes',
    falseLabel: 'No',
    speak: `Is this sentence correct? ${when} ${name} ${shown} ${obj}.`,
    explanation: `The past tense of "${verb.base}" is "${verb.past}".`,
  })
}

/** How the spelling changes before -ed. Four rules, and they never overlap. */
const ED_RULE = {
  plain: 'We just add -ed to the end.',
  e: 'It already ends in e, so we add only -d.',
  y: 'The y changes to i before we add -ed.',
  double: 'The last letter is doubled before we add -ed.',
} as const

type EdRuleKey = keyof typeof ED_RULE

function edRuleOf(verb: VerbWord): EdRuleKey | null {
  if (verb.past === `${verb.base}ed`) return 'plain'
  if (/e$/.test(verb.base) && verb.past === `${verb.base}d`) return 'e'
  if (verb.past === `${verb.base.slice(0, -1)}ied`) return 'y'
  if (verb.past === `${verb.base}${verb.base.slice(-1)}ed`) return 'double'
  return null
}

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
    const name = someone(rng)
    const when = rng.pick(['Yesterday', 'Last week', 'Last Saturday', 'This morning'])
    const variant = rng.int(1, difficulty <= 2 ? 4 : 6)

    if (variant === 1) {
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

    // The mistake a child writes is the plain verb left in a past sentence.
    if (variant === 3) return spotWrongVerb(rng, name, when, verb.base, obj, verb.past)

    if (variant === 4) {
      // "walked" already *is* base + ed, so the wrong form has to be the plain
      // verb instead, or the false half of the question would be true. Verbs
      // ending in e get the same treatment: nobody writes "tasteed".
      const wrongForm =
        verb.past === `${verb.base}ed` || /e$/.test(verb.base) ? verb.base : `${verb.base}ed`
      return judgeSentence(rng, name, when, verb, obj, wrongForm)
    }

    if (variant === 5) {
      const key = edRuleOf(verb)
      if (key) {
        return mc(
          rng,
          `Why does "${verb.base}" become "${verb.past}"?`,
          ED_RULE[key],
          (Object.keys(ED_RULE) as EdRuleKey[]).filter((k) => k !== key).map((k) => ED_RULE[k]),
          { explanation: `${verb.base} → ${verb.past}. ${ED_RULE[key]}` },
        )
      }
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
    const madeUp = (verb.wrong ?? [])[0] ?? `${verb.base}ed`
    const name = someone(rng)
    const when = rng.pick(['Last week', 'Yesterday', 'Last Saturday', 'This morning'])
    const variant = rng.int(1, difficulty <= 2 ? 4 : 6)

    if (variant === 1) {
      return mc(rng, `What is the past tense of "${verb.base}"?`, verb.past, rng.shuffle(wrongs), {
        explanation: `${verb.base} → ${verb.past}. It never takes -ed.`,
      })
    }

    if (variant === 2) {
      return mc(rng, `Which word fits?\n${when} ${name} ____ ${obj}.`, verb.past, rng.shuffle(wrongs), {
        speak: `Which word fits? ${when} ${name} blank ${obj}.`,
        explanation: `"${when}" is finished, so we say "${verb.past}", not "${madeUp}".`,
      })
    }

    // The made-up form is what a child actually writes, so it is what they
    // have to learn to catch.
    if (variant === 3) return spotWrongVerb(rng, name, when, madeUp, obj, verb.past)

    if (variant === 4) return judgeSentence(rng, name, when, verb, obj, madeUp)

    if (variant === 5) {
      // Backwards: given the past form, name the verb it came from.
      const others = rng.sample(
        graded(IRREGULAR_VERBS, difficulty).filter((v) => v.base !== verb.base && v.past !== verb.past),
        3,
      )
      return mc(rng, `Which verb does "${verb.past}" come from?`, verb.base, others.map((v) => v.base), {
        explanation: `${verb.base} → ${verb.past}.`,
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
    const pool = graded(PREFIX_WORDS, difficulty)
    const word = rng.pick(pool)
    const variant = rng.int(1, difficulty <= 2 ? 3 : 5)

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

    if (variant === 3) {
      const meaning = rng.pick(PREFIX_MEANINGS)
      return mc(rng, `Which prefix means "${meaning.meaning}"?`, meaning.affix, rng.shuffle(meaning.wrong), {
        explanation: `"${meaning.affix}" means ${meaning.meaning}.`,
      })
    }

    // Reading the built word instead of building it.
    if (variant === 4) {
      const others = rng.sample(pool.filter((w) => w.gloss !== word.gloss), 3)
      return mc(rng, `What does "${word.built}" mean?`, word.gloss, others.map((w) => w.gloss), {
        explanation: `${word.built} is ${word.affix}- + ${word.root}, so it means ${word.gloss}.`,
      })
    }

    const stranger = rng.pick(pool.filter((w) => w.root !== word.root))
    return mc(rng, `What is the root word inside "${word.built}"?`, word.root, [
      word.built, `${word.affix}-`, stranger.root,
    ], {
      explanation: `Take the prefix ${word.affix}- off "${word.built}" and "${word.root}" is left.`,
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
    const pool = graded(SUFFIX_WORDS, difficulty)
    const word = rng.pick(pool)
    const variant = rng.int(1, difficulty <= 2 ? 3 : 5)

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

    if (variant === 3) {
      const meaning = rng.pick(SUFFIX_MEANINGS)
      return mc(
        rng,
        `What does the ending "${meaning.affix}" mean?`,
        meaning.meaning,
        SUFFIX_MEANINGS.filter((m) => m.affix !== meaning.affix).map((m) => m.meaning),
        { explanation: `"${meaning.affix}" means ${meaning.meaning}.` },
      )
    }

    if (variant === 4) {
      const others = rng.sample(pool.filter((w) => w.gloss !== word.gloss), 3)
      return mc(rng, `What does "${word.built}" mean?`, word.gloss, others.map((w) => w.gloss), {
        explanation: `${word.built} is ${word.root} + -${word.affix}, so it means ${word.gloss}.`,
      })
    }

    const stranger = rng.pick(pool.filter((w) => w.root !== word.root))
    return mc(rng, `What is the root word inside "${word.built}"?`, word.root, [
      word.built, `-${word.affix}`, stranger.root,
    ], {
      explanation: `"${word.built}" is built from the root word "${word.root}" plus the ending -${word.affix}.`,
    })
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
