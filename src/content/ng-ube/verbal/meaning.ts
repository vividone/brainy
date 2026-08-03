/** Word Meaning — Nigerian UBE Basic 1 → Basic 6. */

import type { Rng } from '../../../engine/rng'
import type { Item, SkillDef, StrandDef } from '../../../engine/types'
import { mc, order, tapMany, tf } from '../../shared/authoring'
import {
  ANTONYMS,
  CATEGORIES,
  CONTRASTS,
  DEGREES,
  SWAPS,
  SYNONYMS,
  bandOf,
  categoriesClash,
  capitalise,
  pickTier,
  tierFor,
  type Category,
  type WordPair,
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

/** `n` group names that cannot be confused with `target`. */
function foreignNames(rng: Rng, target: Category, tier: number, n: number): string[] {
  const out: string[] = []
  let guard = 0
  while (out.length < n && guard++ < 40) {
    const c = foreignCategory(rng, target, tier)
    if (out.includes(c.name)) continue
    out.push(c.name)
  }
  return out
}

/** Read a list as "mango, orange and banana". */
const listWords = (words: string[]): string =>
  words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`

/* ------------------------------------------------------------------ *
 * Shared question forms
 *
 * Four of the meaning skills used to ask their one question in their one
 * way. These builders give each of them several genuinely different ways in,
 * so two hundred fresh words stop feeling like one question.
 * ------------------------------------------------------------------ */

/** Words on a scale, asked as an ordering or as "which is the strongest?". */
function degreeItem(rng: Rng, tier: number): Item {
  const s = pickTier(rng, DEGREES, tier)
  const ladder = `From ${s.low} to ${s.high}: ${s.words.join(', ')}.`

  if (rng.chance(0.5)) {
    return order(rng, `Put these words in order — ${s.low} first.`, s.words, { explanation: ladder })
  }

  const strongest = rng.chance(0.5)
  const answer = strongest ? s.words[s.words.length - 1] : s.words[0]
  return mc(rng, `Which of these is the ${strongest ? s.high : s.low}?`, answer, s.words.filter((w) => w !== answer), {
    speak: `Which of these is the ${strongest ? s.high : s.low}?`,
    explanation: ladder,
  })
}

/** The opposite, met in a sentence rather than in a list. */
function contrastItem(rng: Rng, tier: number): Item {
  const c = pickTier(rng, CONTRASTS, tier)
  return mc(rng, `Finish the sentence with the OPPOSITE word.\n${c.text}`, c.answer, c.wrong, {
    speak: `Finish the sentence with the opposite word. ${c.text.replace('___', 'blank')}`,
    explanation: `${c.text.replace('___', c.answer.toUpperCase())} "${c.answer}" is the opposite of "${c.cue}".`,
  })
}

/** A synonym met in a sentence: swap the capitalised word for another. */
function swapItem(rng: Rng, tier: number): Item {
  const s = pickTier(rng, SWAPS, tier)
  const answer = rng.pick(s.same)
  const shown = s.text.replace('___', s.word.toUpperCase())
  return mc(rng, `Which word could take the place of ${s.word.toUpperCase()}?\n${shown}`, answer, s.wrong, {
    speak: `Which word could take the place of ${s.word}? ${shown}`,
    explanation: `${s.text.replace('___', answer)} "${answer}" means the same as "${s.word}".`,
  })
}

/** Synonym entries with enough listed synonyms for a multi-answer question. */
const richSynonyms = (tier: number): WordPair[] =>
  bandOf(SYNONYMS, tier).filter((s) => s.same.length >= 2 && s.wrong.length >= 3)

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
    const variant = rng.int(1, 5)

    // Same-or-opposite check. Half of these come from the synonym list, where
    // the honest answer is "no" — which is the whole point of asking.
    if (variant === 2) {
      if (rng.chance(0.5)) {
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

    // Tap-every: the near-misses stay on screen next to the real opposite,
    // which is where "warm is not the opposite of hot" finally lands.
    if (variant === 3) {
      const correct = entry.opposite.slice(0, 2)
      const options = [
        ...correct.map((v) => ({ value: v, correct: true })),
        ...rng.sample(entry.wrong, Math.max(3, 5 - correct.length)).map((v) => ({ value: v, correct: false })),
      ]
      return tapMany(rng, `Tap every word that means the OPPOSITE of "${entry.word}"`, options, {
        speak: `Tap every word that means the opposite of ${entry.word}`,
        explanation:
          correct.length > 1
            ? `"${correct[0]}" and "${correct[1]}" are both opposites of "${entry.word}".`
            : `Only "${correct[0]}" is the opposite of "${entry.word}".`,
      })
    }

    if (variant === 4) return contrastItem(rng, tier)

    // Spot the pair. The wrong pairs are synonym pairs, so they are safely
    // never opposites. Held back at the easiest level, where reading four
    // pairs is more work than the reasoning is worth.
    if (variant === 5 && difficulty >= 2) {
      const syns = rng.sample(bandOf(SYNONYMS, tier), 3)
      return mc(
        rng,
        'Which pair of words are OPPOSITES?',
        `${entry.word} — ${answer}`,
        syns.map((s) => `${s.word} — ${s.same[0]}`),
        { explanation: `"${entry.word}" and "${answer}" are opposites. The other pairs mean the same as each other.` },
      )
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
    const variant = rng.int(1, 4)

    if (variant === 4) return contrastItem(rng, tier)

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
    const variant = rng.int(1, 6)

    // True or false. Half are drawn from the same entry's `wrong` list, which
    // holds real words a child might grab at — so "no" has to be earned.
    if (variant === 2) {
      const truth = rng.chance(0.5)
      const other = truth ? rng.pick(entry.same) : rng.pick(entry.wrong)
      return tf(`Do "${entry.word}" and "${other}" mean the same?`, truth, {
        trueLabel: 'Yes',
        falseLabel: 'No',
        explanation: truth
          ? `Yes — you could swap "${other}" in for "${entry.word}".`
          : `No — "${entry.word}" means something else. "${rng.pick(entry.same)}" would mean the same.`,
      })
    }

    if (variant === 3) {
      const rich = richSynonyms(tier)
      if (rich.length) {
        const group = rng.pick(rich)
        const correct = group.same.slice(0, 2)
        const options = [
          ...correct.map((v) => ({ value: v, correct: true })),
          ...rng.sample(group.wrong, 3).map((v) => ({ value: v, correct: false })),
        ]
        return tapMany(rng, `Tap every word that means the same as "${group.word}"`, options, {
          speak: `Tap every word that means the same as ${group.word}`,
          explanation: `"${correct[0]}" and "${correct[1]}" both mean the same as "${group.word}".`,
        })
      }
    }

    // Three match, one does not — the same knowledge, asked backwards.
    if (variant === 4) {
      const rich = richSynonyms(tier)
      if (rich.length) {
        const group = rng.pick(rich)
        const odd = rng.pick(group.wrong)
        return mc(rng, 'Three of these words mean the SAME. Which one does NOT?', odd, [
          group.word,
          group.same[0],
          group.same[1],
        ], {
          explanation: `"${group.word}", "${group.same[0]}" and "${group.same[1]}" all mean about the same. "${odd}" does not.`,
        })
      }
    }

    if (variant === 5) return swapItem(rng, tier)
    if (variant === 6) return degreeItem(rng, tier)

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
    const variant = rng.int(1, 4)

    if (variant === 4) return swapItem(rng, tier)

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
    const group = target.name.toLowerCase()
    const variant = rng.int(1, 5)

    // Name the link instead of the stranger. Spotting the odd word is only
    // half the skill; saying what the other three share is the other half.
    if (variant === 2) {
      const shown = rng.sample(target.members, 3)
      return mc(rng, `Which group do ${listWords(shown)} belong to?`, target.name, foreignNames(rng, target, tier, 3), {
        speak: `Which group do ${listWords(shown)} belong to?`,
        explanation: `${capitalise(shown[0])}, ${shown[1]} and ${shown[2]} are all ${group}.`,
      })
    }

    // Odd one out, turned round: which word JOINS the group?
    if (variant === 3) {
      const [a, b, c, joiner] = rng.sample(target.members, 4)
      return mc(rng, `Which word belongs with ${listWords([a, b, c])}?`, joiner, outsiders(rng, target, tier, 3), {
        speak: `Which word belongs with ${listWords([a, b, c])}?`,
        explanation: `${capitalise(joiner)} goes with them — they are all ${group}.`,
      })
    }

    if (variant === 4) {
      const truth = rng.chance(0.5)
      const word = truth ? rng.pick(target.members) : (outsiders(rng, target, tier, 1)[0] ?? 'stone')
      return tf(`Would you put "${word}" with the ${group}?`, truth, {
        trueLabel: 'Yes',
        falseLabel: 'No',
        explanation: truth
          ? `Yes — "${word}" belongs with the ${group}.`
          : `No — "${word}" does not belong with the ${group}.`,
      })
    }

    if (variant === 5) {
      const right = rng.sample(target.members, 3)
      const wrong = outsiders(rng, target, tier, 2)
      if (wrong.length === 2) {
        const options = [
          ...right.map((v) => ({ value: v, correct: false })),
          ...wrong.map((v) => ({ value: v, correct: true })),
        ]
        return tapMany(rng, 'Three of these words belong together. Tap the TWO that do not.', options, {
          explanation: `${right.join(', ')} are all ${group}. "${wrong[0]}" and "${wrong[1]}" are not.`,
        })
      }
    }

    const shown = rng.sample(target.members, 3)
    const stray = outsiders(rng, target, tier, 1)[0] ?? 'stone'
    return mc(rng, 'Which word does NOT belong with the others?', stray, shown, {
      explanation: `${shown.join(', ')} are all ${group}. "${stray}" is not.`,
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
    const target = pickTier(rng, CATEGORIES, tier)
    const group = target.name.toLowerCase()
    const variant = rng.int(1, 5)

    // The meaning link, not the "kind of thing" link.
    if (variant === 1 || variant === 2) {
      const twins = richSynonyms(tier)
      if (twins.length) {
        const set = rng.pick(twins)
        const odd = rng.pick(set.wrong)
        const shown = [set.word, set.same[0], set.same[1]]
        if (variant === 1) {
          return mc(rng, 'Three of these words mean about the SAME. Which is the odd one?', odd, shown, {
            explanation: `"${set.word}", "${set.same[0]}" and "${set.same[1]}" all mean about the same. "${odd}" does not.`,
          })
        }
        return mc(rng, 'Which word does NOT belong with the others?', odd, shown, {
          explanation: `"${set.word}", "${set.same[0]}" and "${set.same[1]}" all mean about the same. "${odd}" does not.`,
        })
      }
    }

    // Say what the three that stay have in common.
    if (variant === 3) {
      const shown = rng.sample(target.members, 3)
      const stray = outsiders(rng, target, tier, 1)[0] ?? 'honesty'
      return mc(
        rng,
        `${capitalise(listWords(shown))} belong together and ${stray} does not. What links the three?`,
        target.name,
        foreignNames(rng, target, tier, 3),
        { explanation: `${capitalise(shown[0])}, ${shown[1]} and ${shown[2]} are all ${group}. ${capitalise(stray)} is not.` },
      )
    }

    if (variant === 4) {
      const [a, b, c, joiner] = rng.sample(target.members, 4)
      return mc(rng, `Which word would join ${listWords([a, b, c])}?`, joiner, outsiders(rng, target, tier, 3), {
        explanation: `${capitalise(joiner)} joins them — they are all ${group}.`,
      })
    }

    if (variant === 5) {
      const right = rng.sample(target.members, 3)
      const wrong = outsiders(rng, target, tier, 2)
      if (wrong.length === 2) {
        const options = [
          ...right.map((v) => ({ value: v, correct: false })),
          ...wrong.map((v) => ({ value: v, correct: true })),
        ]
        return tapMany(rng, 'Three of these words belong together. Tap the TWO that do not.', options, {
          explanation: `${right.join(', ')} are all ${group}. "${wrong[0]}" and "${wrong[1]}" are not.`,
        })
      }
    }

    const shown = rng.sample(target.members, 3)
    const stray = outsiders(rng, target, tier, 1)[0] ?? 'honesty'
    return mc(rng, 'Which word does NOT belong with the others?', stray, shown, {
      explanation: `${shown.join(', ')} are all ${group}. "${stray}" is not.`,
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
    const variant = rng.int(1, 3)
    const shown = rng.sample(target.members, 3)

    // Does the umbrella word cover this example? The "no" cases come from a
    // group that cannot overlap, so the answer is never arguable.
    if (variant === 3) {
      const truth = rng.chance(0.5)
      const word = truth ? rng.pick(target.members) : (outsiders(rng, target, tier, 1)[0] ?? 'honesty')
      return tf(`Is "${word}" a kind of ${target.general}?`, truth, {
        trueLabel: 'Yes',
        falseLabel: 'No',
        explanation: truth
          ? `Yes — "${target.general}" is the word that covers "${word}" and the rest of the ${target.name.toLowerCase()}.`
          : `No — "${word}" does not belong with the ${target.name.toLowerCase()}.`,
      })
    }

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
