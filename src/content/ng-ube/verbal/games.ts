/** Word Games — Nigerian UBE Basic 1 → Basic 6. */

import type { Rng } from '../../../engine/rng'
import type { Item, SkillDef, StrandDef } from '../../../engine/types'
import { mc, tapMany, tf } from '../../shared/authoring'
import {
  ANAGRAMS,
  CATEGORIES,
  COMPOUNDS,
  HIDDEN_WORDS,
  PLURALS,
  RHYMES,
  WORD_POOL,
  bandOf,
  isAnagram,
  pickTier,
  scramble,
  sortedLetters,
  spell,
  tierFor,
  upper,
  wordsOfLength,
} from './words'

/** Every compound spelled out, so it never turns up as a "simple word". */
const COMPOUND_SET = new Set(COMPOUNDS.map((c) => c.a + c.b))

const simpleWords = (tier: number, min: number, max: number): string[] =>
  wordsOfLength(tier, min, max).filter((w) => !COMPOUND_SET.has(w))

/* ------------------------------------------------------------------ *
 * Rhyming words
 * ------------------------------------------------------------------ */

/** Words from families other than `keep` — guaranteed not to rhyme with it. */
function nonRhymes(rng: Rng, keep: string, tier: number, n: number): string[] {
  const others = bandOf(RHYMES, tier).filter((f) => f.sound !== keep)
  const out: string[] = []
  let guard = 0
  while (out.length < n && guard++ < 40) {
    const word = rng.pick(rng.pick(others).words)
    if (!out.includes(word)) out.push(word)
  }
  return out
}

const rhymes: SkillDef = {
  id: 'ng.vr.games.rhymes',
  title: 'Words that rhyme',
  yearBand: 'b1',
  concepts: ['rhyme'],
  hint: 'Say the words out loud. Rhyming words end with the same sound.',
  helpAtHome: 'Sing songs and clap out rhymes — cat, hat, mat, that.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(1, difficulty)
    const family = pickTier(rng, RHYMES, tier)
    const variant = rng.int(1, 3)

    if (variant === 1) {
      const [cue, answer] = rng.sample(family.words, 2)
      return mc(rng, `Which word rhymes with "${cue}"?`, answer, nonRhymes(rng, family.sound, tier, 3), {
        explanation: `"${cue}" and "${answer}" both end with the ${family.sound} sound.`,
      })
    }

    if (variant === 2) {
      const picked = rng.sample(family.words, 3)
      const cue = picked[0]
      const right = picked.slice(1)
      const wrong = nonRhymes(rng, family.sound, tier, 3)
      return tapMany(
        rng,
        `Tap every word that rhymes with "${cue}"`,
        [
          ...right.map((v) => ({ value: v, correct: true })),
          ...wrong.map((v) => ({ value: v, correct: false })),
        ],
        { explanation: `${right.join(' and ')} rhyme with "${cue}" — they all end ${family.sound}.` },
      )
    }

    const same = rng.chance(0.5)
    const [cue, partner] = rng.sample(family.words, 2)
    const other = nonRhymes(rng, family.sound, tier, 1)[0]
    return tf(`Do "${cue}" and "${same ? partner : other}" rhyme?`, same, {
      trueLabel: 'Yes',
      falseLabel: 'No',
      explanation: same
        ? `Yes — "${cue}" and "${partner}" both end ${family.sound}.`
        : `No — "${cue}" ends ${family.sound}, but "${other}" does not.`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * Missing letters
 *
 * Every word comes with the name of its group, which is what keeps the
 * answer unique — "a colour: R _ D" can only be RED.
 * ------------------------------------------------------------------ */

const missingLetters: SkillDef = {
  id: 'ng.vr.games.missing-letters',
  title: 'Missing letters',
  yearBand: 'b1',
  concepts: ['word-completion'],
  hint: 'Say the word slowly and listen for the sound that is missing.',
  helpAtHome: 'Write a familiar word with one letter rubbed out and let them fill it in.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(1, difficulty)
    const group = pickTier(rng, CATEGORIES, tier)
    const long = group.members.filter((m) => m.length >= 4 && /^[a-z]+$/.test(m))
    const pool = long.length >= 3 ? long : group.members.filter((m) => m.length >= 3)
    const word = rng.pick(pool)

    if (difficulty >= 4 && word.length >= 5 && /^[a-z]+$/.test(word)) {
      // Vowels stripped out — pick the word that fits the skeleton.
      const skeleton = word.replace(/[aeiou]/g, '_')
      const matches = (w: string) =>
        w.length === word.length && w.replace(/[aeiou]/g, '_') === skeleton
      const wrong = group.members.filter((m) => m !== word && !matches(m)).slice(0, 3)
      if (wrong.length >= 2) {
        return mc(
          rng,
          `The vowels have fallen out of a word.\n${group.name}: ${upper(skeleton).split('').join(' ')}`,
          word,
          wrong,
          {
            speak: `Which of these words fits the pattern? It is one of the ${group.name.toLowerCase()}.`,
            explanation: `${upper(word)} fits, because its consonants are ${upper(word.replace(/[aeiou]/g, ''))}.`,
          },
        )
      }
    }

    const at = rng.int(0, word.length - 1)
    const shown = word
      .split('')
      .map((c, i) => (i === at ? '_' : c.toUpperCase()))
      .join(' ')
    const answer = word[at].toUpperCase()
    const wrong = rng
      .shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''))
      .filter((c) => c !== answer)
      .slice(0, 3)

    return mc(rng, `Which letter is missing?\n${group.name}: ${shown}`, answer, wrong, {
      speak: `Which letter is missing from this word? It is one of the ${group.name.toLowerCase()}.`,
      explanation: `The word is ${upper(word)}.`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * Jumbled words
 * ------------------------------------------------------------------ */

function jumbleItem(rng: Rng, word: string, clue: string | null, wrongPool: string[]): Item {
  const mixed = scramble(rng, word)
  const wrong = wrongPool
    .filter((w) => w !== word && !isAnagram(w, word) && sortedLetters(w) !== sortedLetters(word))
    .slice(0, 3)
  return mc(
    rng,
    clue
      ? `Rearrange the letters to make a word.\n${clue}: ${spell(mixed)}`
      : `Rearrange the letters to make a word.\n${spell(mixed)}`,
    word,
    wrong,
    {
      speak: `Rearrange these letters to make a word: ${mixed.split('').join(' ')}`,
      explanation: `${mixed} rearranges to ${upper(word)}.`,
    },
  )
}

const jumbled: SkillDef = {
  id: 'ng.vr.games.jumbled',
  title: 'Jumbled words',
  yearBand: 'b2',
  concepts: ['anagram-basic'],
  hint: 'Look for a letter that could start a word, then try the rest.',
  helpAtHome: 'Write a word on scraps of paper, one letter each, and mix them up.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(1, difficulty)
    const maxLen = [4, 4, 5, 6, 6][difficulty - 1]
    const chosen = rng.pick(wordsOfLength(tier, 3, maxLen))
    const others = rng
      .shuffle(wordsOfLength(tier, chosen.length, chosen.length))
      .filter((w) => w !== chosen)
    const backup = rng.shuffle(WORD_POOL.map((w) => w.word)).filter((w) => w !== chosen)
    return jumbleItem(rng, chosen, null, [...others, ...backup])
  },
}

const jumbledHard: SkillDef = {
  id: 'ng.vr.games.jumbled-hard',
  title: 'Jumbled words — longer',
  yearBand: 'b4',
  prerequisites: ['ng.vr.games.jumbled'],
  concepts: ['anagram-advanced'],
  hint: 'The clue tells you what kind of word it is. Try the likely first letter.',
  helpAtHome: 'Jumble the name of something in the room and race to unscramble it.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(3, difficulty)
    const useClue = rng.chance(0.5)

    if (useClue) {
      const group = pickTier(rng, CATEGORIES, tier)
      const members = group.members.filter((m) => /^[a-z]+$/.test(m) && m.length >= 4)
      if (members.length >= 4) {
        const word = rng.pick(members)
        return jumbleItem(rng, word, group.name, members.filter((m) => m !== word))
      }
    }

    const minLen = [4, 5, 5, 6, 6][difficulty - 1]
    const chosen = rng.pick(wordsOfLength(tier, minLen, 9))
    const sameLength = rng
      .shuffle(wordsOfLength(tier, chosen.length - 1, chosen.length + 1))
      .filter((w) => w !== chosen)
    return jumbleItem(rng, chosen, null, sameLength)
  },
}

/* ------------------------------------------------------------------ *
 * Anagrams
 * ------------------------------------------------------------------ */

const anagrams: SkillDef = {
  id: 'ng.vr.games.anagrams',
  title: 'Same letters, new word',
  yearBand: 'b5',
  prerequisites: ['ng.vr.games.jumbled-hard'],
  concepts: ['anagram-pairs'],
  hint: 'Count the letters first — an anagram must use every letter exactly once.',
  helpAtHome: 'LISTEN and SILENT use the same six letters. Hunt for more together.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(2, difficulty)
    const entry = pickTier(rng, ANAGRAMS, tier)
    const flip = rng.chance(0.5)
    const cue = flip ? entry.b : entry.a
    const answer = flip ? entry.a : entry.b
    const variant = rng.int(1, 3)

    if (variant === 1) {
      // Widen the net if the tight length window is too sparse at this tier —
      // otherwise the question can end up with a single option on screen.
      const near = wordsOfLength(tier, cue.length - 1, cue.length + 1)
      const pool = near.length >= 6 ? near : wordsOfLength(tier, cue.length - 2, cue.length + 2)
      const wrong = rng
        .shuffle(pool)
        .filter((w) => w !== cue && w !== answer && !isAnagram(w, cue))
        .slice(0, 3)
      if (wrong.length >= 2) {
        return mc(rng, `Which word uses exactly the same letters as "${cue}"?`, answer, wrong, {
          explanation: `${upper(cue)} and ${upper(answer)} both use the letters ${spell(sortedLetters(cue))}.`,
        })
      }
    }

    if (variant === 2) {
      const fakes: string[] = []
      let guard = 0
      while (fakes.length < 3 && guard++ < 40) {
        const [x, y] = rng.sample(bandOf(ANAGRAMS, tier), 2)
        if (!x || !y) break
        const pair = `${x.a} — ${y.b}`
        if (isAnagram(x.a, y.b) || fakes.includes(pair)) continue
        fakes.push(pair)
      }
      if (fakes.length >= 2) {
        return mc(rng, 'Which pair of words use exactly the same letters?', `${entry.a} — ${entry.b}`, fakes, {
          explanation: `${upper(entry.a)} and ${upper(entry.b)} are made from the very same letters.`,
        })
      }
    }

    const other = rng.pick(bandOf(ANAGRAMS, tier)).b
    const partner = rng.chance(0.5) || other === cue ? answer : other
    const truth = isAnagram(cue, partner)
    return tf(`"${cue}" and "${partner}" use exactly the same letters.`, truth, {
      explanation: truth
        ? `True — both are made from ${spell(sortedLetters(cue))}.`
        : `False — "${cue}" and "${partner}" do not use the same letters.`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * Compound words
 * ------------------------------------------------------------------ */

const compound: SkillDef = {
  id: 'ng.vr.games.compound',
  title: 'Two words in one',
  yearBand: 'b3',
  concepts: ['compound-words'],
  hint: 'Cover half the word with your finger. Is what is left a word on its own?',
  helpAtHome: 'Spot compound words on signs: bus stop, football, motorway, classroom.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(1, difficulty)
    const entry = pickTier(rng, COMPOUNDS, tier)
    const whole = entry.a + entry.b
    const variant = rng.int(1, 3)

    if (variant === 1) {
      const plain = rng.shuffle(simpleWords(tier + 1, 4, 9)).slice(0, 3)
      return mc(rng, 'Which of these words is made from TWO smaller words?', whole, plain, {
        explanation: `${upper(whole)} is "${entry.a}" and "${entry.b}" joined together.`,
      })
    }

    if (variant === 2) {
      const [other1, other2] = rng.sample(bandOf(COMPOUNDS, tier), 2)
      const wrong = [
        `${other1.a} + ${entry.b}`,
        `${entry.a} + ${other1.b}`,
        `${other2.a} + ${other2.b}`,
      ].filter((w) => w !== `${entry.a} + ${entry.b}`)
      return mc(rng, `Which two words make ${upper(whole)}?`, `${entry.a} + ${entry.b}`, wrong, {
        explanation: `${upper(whole)} = ${entry.a} + ${entry.b}.`,
      })
    }

    const wantStart = rng.chance(0.5)
    const answer = wantStart ? entry.a : entry.b
    const other = rng.pick(bandOf(COMPOUNDS, tier))
    const wrong = [wantStart ? entry.b : entry.a, other.a, other.b].filter((w) => w !== answer)
    return mc(
      rng,
      `Which small word is hidden at the ${wantStart ? 'START' : 'END'} of ${upper(whole)}?`,
      answer,
      wrong,
      { explanation: `${upper(whole)} is ${entry.a} + ${entry.b}, so the ${wantStart ? 'first' : 'last'} part is "${answer}".` },
    )
  },
}

/* ------------------------------------------------------------------ *
 * Hidden words
 * ------------------------------------------------------------------ */

const hiddenWords: SkillDef = {
  id: 'ng.vr.games.hidden-words',
  title: 'Words inside words',
  yearBand: 'b4',
  prerequisites: ['ng.vr.games.compound'],
  concepts: ['hidden-words'],
  hint: 'The hidden letters sit side by side, in the same order, without skipping any.',
  helpAtHome: 'Look at long words on packets and find the little words hiding inside them.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(1, difficulty)
    const entry = pickTier(rng, HIDDEN_WORDS, tier)
    const variant = rng.int(1, 2)

    if (variant === 1) {
      const near = rng
        .shuffle(WORD_POOL.map((w) => w.word))
        .filter(
          (w) =>
            !entry.word.includes(w) &&
            w !== entry.hidden &&
            Math.abs(w.length - entry.hidden.length) <= 1,
        )
      const any = rng.shuffle(WORD_POOL.map((w) => w.word)).filter((w) => !entry.word.includes(w))
      const wrong = [...near, ...any].slice(0, 3)
      return mc(rng, `Which small word is hidden inside ${upper(entry.word)}?`, entry.hidden, wrong, {
        speak: `Which small word is hidden inside the word ${entry.word}?`,
        explanation: `${upper(entry.word)} — the letters ${upper(entry.hidden)} sit together inside it.`,
      })
    }

    const others = rng
      .shuffle(bandOf(HIDDEN_WORDS, tier))
      .filter((h) => !h.word.includes(entry.hidden) && h.word !== entry.word)
      .slice(0, 3)
      .map((h) => h.word)
    return mc(rng, `In which word is "${entry.hidden}" hiding?`, entry.word, others, {
      explanation: `${upper(entry.word)} contains the letters ${upper(entry.hidden)} side by side.`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * Plurals
 * ------------------------------------------------------------------ */

/** Wrong plural forms a child might actually write. */
function wrongPlurals(one: string, many: string): string[] {
  const stem = one.replace(/y$/, '')
  const candidates = [
    `${one}s`,
    `${one}es`,
    `${stem}ies`,
    `${one}ies`,
    `${one}en`,
    one.replace(/f$/, 'ves'),
  ]
  const seen = new Set([one, many])
  const out: string[] = []
  for (const c of candidates) {
    if (seen.has(c)) continue
    seen.add(c)
    out.push(c)
  }
  return out
}

const plurals: SkillDef = {
  id: 'ng.vr.games.plurals',
  title: 'One and many',
  yearBand: 'b2',
  concepts: ['plurals'],
  hint: 'Most words just add -s, but some change completely: one child, two children.',
  helpAtHome: 'Point at things and ask for "one… two…": one knife, two knives.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(1, difficulty)
    const entry = pickTier(rng, PLURALS, tier)
    const variant = rng.int(1, 3)

    if (variant === 1) {
      return mc(rng, `What is the plural of "${entry.one}"?`, entry.many, wrongPlurals(entry.one, entry.many), {
        explanation:
          entry.one === entry.many
            ? `"${entry.one}" does not change — one ${entry.one}, two ${entry.many}.`
            : `One ${entry.one}, two ${entry.many}.`,
      })
    }

    if (variant === 2) {
      const others = rng
        .sample(bandOf(PLURALS, tier), 4)
        .filter((p) => p.one !== entry.one)
        .slice(0, 3)
        .map((p) => p.one)
      return mc(rng, `"${entry.many}" is the plural of which word?`, entry.one, others, {
        explanation: `One ${entry.one}, two ${entry.many}.`,
      })
    }

    const truth = rng.chance(0.5)
    const shown = truth ? entry.many : (wrongPlurals(entry.one, entry.many)[0] ?? `${entry.one}s`)
    return tf(`The plural of "${entry.one}" is "${shown}".`, truth, {
      explanation: `The plural of "${entry.one}" is "${entry.many}".`,
    })
  },
}

export const gamesStrand: StrandDef = {
  id: 'ng.vr.games',
  name: 'Word Market',
  blurb: 'Rhymes, jumbles, hidden words and words made of two words',
  theme: 'market',
  skills: [rhymes, missingLetters, jumbled, plurals, compound, hiddenWords, jumbledHard, anagrams],
}
