/** Word Meaning — Nigerian UBE Basic 1 → Basic 6. */

import type { Rng } from '../../../engine/rng'
import type { Item, SkillDef, StrandDef } from '../../../engine/types'
import { mc, tapMany, tf } from '../../shared/authoring'
import {
  ANTONYMS,
  CATEGORIES,
  SYNONYMS,
  bandOf,
  categoriesClash,
  capitalise,
  pickTier,
  tierFor,
  type Category,
} from './words'

/* ------------------------------------------------------------------ *
 * Category helpers — shared by the three group-based skills.
 * ------------------------------------------------------------------ */

/** A group that can safely be used against `target` (no overlap of meaning). */
function foreignCategory(rng: Rng, target: Category, tier: number): Category {
  const safe = bandOf(CATEGORIES, tier).filter((c) => !categoriesClash(target, c))
  return rng.pick(safe.length ? safe : CATEGORIES.filter((c) => !categoriesClash(target, c)))
}

/** `n` words that belong to no group clashing with `target`. */
function outsiders(rng: Rng, target: Category, tier: number, n: number): string[] {
  const out: string[] = []
  let guard = 0
  while (out.length < n && guard++ < 40) {
    const other = foreignCategory(rng, target, tier)
    const word = rng.pick(other.members)
    if (target.members.includes(word) || out.includes(word)) continue
    out.push(word)
  }
  return out
}

/* ------------------------------------------------------------------ *
 * Opposites
 * ------------------------------------------------------------------ */

const oppositesEasy: SkillDef = {
  id: 'ng.vr.meaning.opposites-easy',
  title: 'Opposites',
  yearBand: 'b1',
  concepts: ['antonyms-basic'],
  hint: 'An opposite is the word that means the other way round — hot and cold.',
  helpAtHome: 'Play "say the opposite" while walking: you say big, she says small.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(1, difficulty)
    const entry = pickTier(rng, ANTONYMS, tier)
    const answer = rng.pick(entry.opposite)

    if (difficulty >= 3 && rng.chance(0.3)) {
      // Same-or-opposite check. Half the questions come from the synonym list,
      // where the honest answer is "no".
      const useSame = rng.chance(0.5)
      if (useSame) {
        const syn = pickTier(rng, SYNONYMS, tier)
        const other = rng.pick(syn.same)
        return tf(`Are "${syn.word}" and "${other}" opposites?`, false, {
          trueLabel: 'Yes',
          falseLabel: 'No',
          explanation: `No — "${syn.word}" and "${other}" mean the same thing.`,
        })
      }
      return tf(`Are "${entry.word}" and "${answer}" opposites?`, true, {
        trueLabel: 'Yes',
        falseLabel: 'No',
        explanation: `Yes — "${entry.word}" is the opposite of "${answer}".`,
      })
    }

    return mc(rng, `Which word is the OPPOSITE of "${entry.word}"?`, answer, rng.sample(entry.wrong, 3), {
      speak: `Which word means the opposite of ${entry.word}?`,
      explanation: `The opposite of "${entry.word}" is "${answer}".`,
    })
  },
}

const antonyms: SkillDef = {
  id: 'ng.vr.meaning.antonyms',
  title: 'Trickier opposites',
  yearBand: 'b4',
  prerequisites: ['ng.vr.meaning.opposites-easy'],
  concepts: ['antonyms-advanced'],
  hint: 'Careful — one of the choices usually means the SAME, not the opposite.',
  helpAtHome: 'When a new word comes up in reading, ask "what is the opposite of that?"',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(3, difficulty)
    const entry = pickTier(rng, ANTONYMS, tier)
    const variant = rng.int(1, 3)

    if (variant === 1) {
      const answer = rng.pick(entry.opposite)
      return mc(rng, `Which word is the OPPOSITE of "${entry.word}"?`, answer, rng.sample(entry.wrong, 3), {
        speak: `Which word means the opposite of ${entry.word}?`,
        explanation: `"${entry.word}" and "${answer}" are opposites. The others are close in meaning to "${entry.word}".`,
      })
    }

    if (variant === 2) {
      // Which PAIR are opposites? The wrong pairs are synonym pairs, so they
      // are safely never opposites.
      const answer = rng.pick(entry.opposite)
      const syns = rng.sample(bandOf(SYNONYMS, tier), 3)
      return mc(
        rng,
        'Which pair of words are OPPOSITES?',
        `${entry.word} — ${answer}`,
        syns.map((s) => `${s.word} — ${s.same[0]}`),
        { explanation: `"${entry.word}" and "${answer}" are opposites. The other pairs mean the same as each other.` },
      )
    }

    const trap = rng.pick(entry.wrong)
    return tf(`"${entry.word}" and "${trap}" are opposites.`, false, {
      explanation: `Not quite. The opposite of "${entry.word}" is "${entry.opposite[0]}".`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * Synonyms
 * ------------------------------------------------------------------ */

const sameMeaning: SkillDef = {
  id: 'ng.vr.meaning.same-meaning',
  title: 'Words that mean the same',
  yearBand: 'b2',
  concepts: ['synonyms-basic'],
  hint: 'Try each word in a sentence and see which one you could swap in.',
  helpAtHome: 'Ask for another word that would fit: "big" — "large", "huge".',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(1, difficulty)
    const entry = pickTier(rng, SYNONYMS, tier)
    const flip = rng.chance(0.35)
    const cue = flip ? rng.pick(entry.same) : entry.word
    const answer = flip ? entry.word : rng.pick(entry.same)

    return mc(rng, `Which word means the SAME as "${cue}"?`, answer, rng.sample(entry.wrong, 3), {
      speak: `Which word means the same as ${cue}?`,
      explanation: `"${cue}" and "${answer}" mean the same thing.`,
    })
  },
}

const synonyms: SkillDef = {
  id: 'ng.vr.meaning.synonyms',
  title: 'Choosing the best word',
  yearBand: 'b4',
  prerequisites: ['ng.vr.meaning.same-meaning'],
  concepts: ['synonyms-advanced'],
  hint: 'One choice means the same, one means the opposite. Read them all before you tap.',
  helpAtHome: 'Swap a plain word in something they wrote for a stronger one — "big" becomes "enormous".',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(3, difficulty)
    const entry = pickTier(rng, SYNONYMS, tier)
    const variant = rng.int(1, 3)

    if (variant === 1) {
      const flip = rng.chance(0.35)
      const cue = flip ? rng.pick(entry.same) : entry.word
      const answer = flip ? entry.word : rng.pick(entry.same)
      return mc(rng, `Which word means the SAME as "${cue}"?`, answer, rng.sample(entry.wrong, 3), {
        speak: `Which word means the same as ${cue}?`,
        explanation: `"${cue}" and "${answer}" mean the same thing.`,
      })
    }

    if (variant === 2) {
      const opps = rng.sample(bandOf(ANTONYMS, tier), 3)
      return mc(
        rng,
        'Which pair of words mean the SAME?',
        `${entry.word} — ${entry.same[0]}`,
        opps.map((o) => `${o.word} — ${o.opposite[0]}`),
        { explanation: `"${entry.word}" and "${entry.same[0]}" mean the same. The other pairs are opposites.` },
      )
    }

    // Odd one out on meaning: three words that match, one that does not.
    const twins = bandOf(SYNONYMS, tier).filter((s) => s.same.length >= 2)
    const group = twins.length ? rng.pick(twins) : entry
    if (group.same.length < 2) {
      const answer = rng.pick(group.same)
      return mc(rng, `Which word means the SAME as "${group.word}"?`, answer, rng.sample(group.wrong, 3), {
        explanation: `"${group.word}" and "${answer}" mean the same thing.`,
      })
    }
    const odd = rng.pick(group.wrong)
    return mc(rng, 'Which word does NOT belong with the others?', odd, [group.word, group.same[0], group.same[1]], {
      explanation: `"${group.word}", "${group.same[0]}" and "${group.same[1]}" all mean the same. "${odd}" does not.`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * Odd one out and word groups
 * ------------------------------------------------------------------ */

const oddOneOut: SkillDef = {
  id: 'ng.vr.meaning.odd-one-out',
  title: 'Odd one out',
  yearBand: 'b2',
  concepts: ['classification-basic'],
  hint: 'Ask yourself what three of them have in common.',
  helpAtHome: 'Name three things from one group and one from another, and ask which is the stranger.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(1, difficulty)
    const target = pickTier(rng, CATEGORIES, tier)
    const shown = rng.sample(target.members, 3)
    const [odd] = outsiders(rng, target, tier, 1)
    const stray = odd ?? 'stone'

    return mc(rng, 'Which word does NOT belong with the others?', stray, shown, {
      explanation: `${shown.join(', ')} are all ${target.name.toLowerCase()}. "${stray}" is not.`,
    })
  },
}

const oddOneOutHard: SkillDef = {
  id: 'ng.vr.meaning.odd-one-out-hard',
  title: 'Odd one out — harder',
  yearBand: 'b5',
  prerequisites: ['ng.vr.meaning.odd-one-out', 'ng.vr.meaning.same-meaning'],
  concepts: ['classification-advanced'],
  hint: 'The link may be what the words MEAN, not what kind of thing they are.',
  helpAtHome: 'Try it with meanings: brave, bold, fearless, afraid — which is the odd one?',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(3, difficulty)
    const useMeaning = difficulty >= 3 ? rng.chance(0.55) : rng.chance(0.3)

    if (useMeaning) {
      const twins = bandOf(SYNONYMS, tier).filter((s) => s.same.length >= 2)
      if (twins.length) {
        const group = rng.pick(twins)
        const odd = rng.pick(group.wrong)
        return mc(rng, 'Which word does NOT belong with the others?', odd, [group.word, group.same[0], group.same[1]], {
          explanation: `"${group.word}", "${group.same[0]}" and "${group.same[1]}" all mean about the same. "${odd}" does not.`,
        })
      }
    }

    const target = pickTier(rng, CATEGORIES, tier)
    const shown = rng.sample(target.members, 3)
    const [odd] = outsiders(rng, target, tier, 1)
    const stray = odd ?? 'honesty'
    return mc(rng, 'Which word does NOT belong with the others?', stray, shown, {
      explanation: `${shown.join(', ')} are all ${target.name.toLowerCase()}. "${stray}" is not.`,
    })
  },
}

const wordGroups: SkillDef = {
  id: 'ng.vr.meaning.word-groups',
  title: 'Sorting words into groups',
  yearBand: 'b3',
  prerequisites: ['ng.vr.meaning.odd-one-out'],
  concepts: ['classification-groups'],
  hint: 'Say the word and then ask "what kind of thing is that?"',
  helpAtHome: 'While shopping, ask which shelf a thing belongs on — fruit, drinks, cleaning.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(2, difficulty)
    const target = pickTier(rng, CATEGORIES, tier)
    const variant = rng.int(1, 3)

    if (variant === 1) {
      const word = rng.pick(target.members)
      const others: string[] = []
      let guard = 0
      while (others.length < 3 && guard++ < 30) {
        const c = foreignCategory(rng, target, tier)
        if (c.members.includes(word) || others.includes(c.name)) continue
        others.push(c.name)
      }
      return mc(rng, `Which group does "${word}" belong to?`, target.name, others, {
        explanation: `"${word}" is one of the ${target.name.toLowerCase()}.`,
      })
    }

    if (variant === 2) {
      const word = rng.pick(target.members)
      const wrong = outsiders(rng, target, tier, 3)
      return mc(rng, `Which word belongs with ${target.name.toLowerCase()}?`, word, wrong, {
        explanation: `"${word}" is one of the ${target.name.toLowerCase()}.`,
      })
    }

    const right = rng.sample(target.members, 3)
    const wrong = outsiders(rng, target, tier, 3)
    const options = [
      ...right.map((v) => ({ value: v, correct: true })),
      ...wrong.map((v) => ({ value: v, correct: false })),
    ]
    return tapMany(rng, `Tap all the ${target.name.toLowerCase()}`, options, {
      explanation: `${right.join(', ')} are ${target.name.toLowerCase()}.`,
    })
  },
}

const generalWord: SkillDef = {
  id: 'ng.vr.meaning.general-word',
  title: 'The word that covers them all',
  yearBand: 'b6',
  prerequisites: ['ng.vr.meaning.word-groups'],
  concepts: ['classification-general-term'],
  hint: 'Three of them are examples. One is the name for the whole group.',
  helpAtHome: 'Ask for the umbrella word: "hammer, saw, spanner — what are they all?"',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(3, difficulty)
    const target = pickTier(rng, CATEGORIES, tier)
    const variant = rng.int(1, 2)
    const shown = rng.sample(target.members, 3)

    if (variant === 1) {
      const others: string[] = []
      let guard = 0
      while (others.length < 3 && guard++ < 30) {
        const c = foreignCategory(rng, target, tier)
        if (c.general === target.general || others.includes(c.general)) continue
        others.push(c.general)
      }
      return mc(
        rng,
        `${capitalise(shown[0])}, ${shown[1]} and ${shown[2]} are all examples of what?`,
        target.general,
        others,
        { explanation: `${shown.join(', ')} are all ${target.name.toLowerCase()}.` },
      )
    }

    // The general word hidden among its own examples.
    return mc(rng, 'Which word includes all the others?', target.general, shown, {
      explanation: `${shown.join(', ')} are all ${target.name.toLowerCase()}.`,
    })
  },
}

export const meaningStrand: StrandDef = {
  id: 'ng.vr.meaning',
  name: 'Meaning Grove',
  blurb: 'Same, opposite, and which word does not belong',
  theme: 'grove',
  skills: [
    oppositesEasy,
    sameMeaning,
    oddOneOut,
    wordGroups,
    synonyms,
    antonyms,
    oddOneOutHard,
    generalWord,
  ],
}
