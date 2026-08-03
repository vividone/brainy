/** Word Links — Nigerian UBE Basic 2 → Basic 6. */

import type { Rng } from '../../../engine/rng'
import type { Item, SkillDef, StrandDef } from '../../../engine/types'
import { mc, tapMany, tf } from '../../shared/authoring'
import {
  ANALOGIES,
  DEFINITIONS,
  HOMONYMS,
  HOMOPHONES,
  SENTENCES,
  bandOf,
  capitalise,
  pickTier,
  tierFor,
  type AnalogyGroup,
  type Definition,
} from './words'

/* ------------------------------------------------------------------ *
 * Analogies
 * ------------------------------------------------------------------ */

/** Second halves from other relations — safely wrong for this one. */
function foreignEnds(rng: Rng, group: AnalogyGroup, tier: number, avoid: string[], n: number): string[] {
  const others = bandOf(ANALOGIES, tier).filter((g) => g.relation !== group.relation)
  const out: string[] = []
  let guard = 0
  while (out.length < n && guard++ < 40) {
    if (!others.length) break
    const g = rng.pick(others)
    const pair = rng.pick(g.pairs)
    const word = rng.chance(0.5) ? pair[1] : pair[0]
    if (avoid.includes(word) || out.includes(word)) continue
    out.push(word)
  }
  return out
}

function analogyItem(rng: Rng, group: AnalogyGroup, tier: number): Item {
  const [p1, p2] = rng.sample(group.pairs, 2)
  const backwards = rng.chance(0.35)
  const [a1, b1] = backwards ? [p1[1], p1[0]] : p1
  const [a2, b2] = backwards ? [p2[1], p2[0]] : p2

  const sameRelation = backwards ? p1[0] : p1[1]
  const near = sameRelation === b2 ? [] : [sameRelation]
  const wrong = [...near, ...foreignEnds(rng, group, tier, [b2, a2, a1, b1, ...near], 3)].slice(0, 3)

  return mc(rng, `${capitalise(a1)} is to ${b1} as ${a2} is to ___`, b2, wrong, {
    speak: `${a1} is to ${b1} as ${a2} is to what?`,
    // Always described in the pair's natural direction, whichever way round
    // the question was asked.
    explanation: `${capitalise(p1[1])} is ${group.relation} ${p1[0]}, and ${p2[1]} is ${group.relation} ${p2[0]}.`,
  })
}

const analogies: SkillDef = {
  id: 'ng.vr.links.analogies',
  title: 'Word pairs',
  yearBand: 'b3',
  concepts: ['analogies-basic'],
  hint: 'Work out how the first two words are joined, then do the same to the third.',
  helpAtHome: 'Play it out loud: "cow is to calf as dog is to…?"',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(1, difficulty)
    const group = pickTier(rng, ANALOGIES, tier)
    return analogyItem(rng, group, tier)
  },
}

const analogiesHard: SkillDef = {
  id: 'ng.vr.links.analogies-hard',
  title: 'Word pairs — harder',
  yearBand: 'b5',
  prerequisites: ['ng.vr.links.analogies'],
  concepts: ['analogies-advanced'],
  hint: 'Say the link out loud in words: "a calf is the young of a cow".',
  helpAtHome: 'Ask them to explain the link, not just the answer — that is the real skill.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(3, difficulty)
    const group = pickTier(rng, ANALOGIES, tier)

    if (rng.chance(0.4)) {
      // Which other pair is joined in the same way?
      const [p1, p2] = rng.sample(group.pairs, 2)
      const others = bandOf(ANALOGIES, tier).filter((g) => g.relation !== group.relation)
      const fakes: string[] = []
      let guard = 0
      while (fakes.length < 3 && guard++ < 30) {
        if (!others.length) break
        const g = rng.pick(others)
        const pair = rng.pick(g.pairs)
        const label = `${pair[0]} : ${pair[1]}`
        if (fakes.includes(label)) continue
        fakes.push(label)
      }
      return mc(rng, `Which pair goes together in the SAME way as\n${p1[0]} : ${p1[1]}`, `${p2[0]} : ${p2[1]}`, fakes, {
        speak: `Which pair goes together in the same way as ${p1[0]} and ${p1[1]}?`,
        explanation: `${capitalise(p1[1])} is ${group.relation} ${p1[0]}, and ${p2[1]} is ${group.relation} ${p2[0]}.`,
      })
    }

    return analogyItem(rng, group, tier)
  },
}

/* ------------------------------------------------------------------ *
 * Homophones
 * ------------------------------------------------------------------ */

const homophones: SkillDef = {
  id: 'ng.vr.links.homophones',
  title: 'Sound the same, spelled differently',
  yearBand: 'b3',
  concepts: ['homophones'],
  hint: 'Read the whole sentence first. Which spelling makes sense there?',
  helpAtHome: 'Say a word like "pair" and ask for the other spelling and what it means.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(1, difficulty)
    const set = pickTier(rng, HOMOPHONES, tier)
    const variant = rng.int(1, 3)

    if (variant === 1) {
      const clue = rng.pick(set.clues)
      const wrong = set.words.filter((w) => w !== clue.word)
      return mc(rng, `Which word completes the sentence?\n${clue.sentence}`, clue.word, wrong, {
        speak: `Which word completes this sentence? ${clue.sentence.replace('___', 'blank')}`,
        explanation: `"${clue.word}" is the spelling that fits: ${clue.sentence.replace('___', clue.word)}`,
      })
    }

    if (variant === 2) {
      const [cue, answer] = rng.sample(set.words, 2)
      const others = bandOf(HOMOPHONES, tier).filter((s) => s.words[0] !== set.words[0])
      const wrong: string[] = []
      let guard = 0
      while (wrong.length < 3 && guard++ < 30) {
        const w = rng.pick(rng.pick(others).words)
        if (set.words.includes(w) || wrong.includes(w)) continue
        wrong.push(w)
      }
      return mc(rng, `Which word sounds exactly the same as "${cue}"?`, answer, wrong, {
        explanation: `"${cue}" and "${answer}" sound the same but mean different things.`,
      })
    }

    const truth = rng.chance(0.5)
    const [cue, partner] = rng.sample(set.words, 2)
    const others = bandOf(HOMOPHONES, tier).filter((s) => s.words[0] !== set.words[0])
    const stranger = others.length ? rng.pick(rng.pick(others).words) : 'market'
    const shown = truth ? partner : stranger
    const actually = set.words.includes(shown) && shown !== cue
    return tf(`"${cue}" and "${shown}" sound exactly the same.`, actually, {
      trueLabel: 'Yes',
      falseLabel: 'No',
      explanation: actually
        ? `Yes — they sound the same but are spelled differently.`
        : `No — "${cue}" sounds like "${set.words.find((w) => w !== cue)}", not "${shown}".`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * Homonyms
 * ------------------------------------------------------------------ */

const homonyms: SkillDef = {
  id: 'ng.vr.links.homonyms',
  title: 'One word, two meanings',
  yearBand: 'b5',
  prerequisites: ['ng.vr.links.homophones'],
  concepts: ['homonyms'],
  hint: 'The same word can do two jobs. Think of the word in two different sentences.',
  helpAtHome: 'Say "bat" and see how many different meanings you can find between you.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(1, difficulty)
    const entry = pickTier(rng, HOMONYMS, tier)
    const flip = rng.chance(0.5)
    const [first, second] = flip ? [entry.meanings[1], entry.meanings[0]] : entry.meanings
    const others = bandOf(HOMONYMS, tier).filter((h) => h.word !== entry.word)
    const variant = rng.int(1, 4)

    // Both meanings at once, with three meanings that belong to other words.
    if (variant === 3 && others.length >= 3) {
      const strangers = rng.sample(others, 3).map((h) => rng.pick(h.meanings))
      const options = [
        ...entry.meanings.map((v) => ({ value: v, correct: true })),
        ...strangers.map((v) => ({ value: v, correct: false })),
      ]
      return tapMany(rng, `Tap the TWO meanings of "${entry.word}"`, options, {
        speak: `Tap the two meanings of the word ${entry.word}`,
        explanation: `"${entry.word}" can mean ${entry.meanings[0]}, and it can also mean ${entry.meanings[1]}.`,
      })
    }

    if (variant === 4 && others.length) {
      const truth = rng.chance(0.5)
      const shown = truth ? first : rng.pick(rng.pick(others).meanings)
      const real = entry.meanings.includes(shown)
      return tf(`"${entry.word}" can mean "${shown}".`, real, {
        trueLabel: 'Yes',
        falseLabel: 'No',
        explanation: real
          ? `Yes — and it can also mean ${entry.meanings.find((m) => m !== shown)}.`
          : `No — "${entry.word}" means ${entry.meanings[0]}, or ${entry.meanings[1]}.`,
      })
    }

    if (variant === 1) {
      const wrong = rng
        .sample(bandOf(HOMONYMS, tier), 4)
        .filter((h) => h.word !== entry.word)
        .slice(0, 3)
        .map((h) => h.word)
      return mc(rng, `Which word can mean BOTH\n"${first}" and "${second}"?`, entry.word, wrong, {
        speak: `Which word can mean both ${first}, and ${second}?`,
        explanation: `"${entry.word}" has both meanings.`,
      })
    }

    const wrong = rng
      .sample(bandOf(HOMONYMS, tier), 4)
      .filter((h) => h.word !== entry.word)
      .slice(0, 3)
      .map((h) => rng.pick(h.meanings))
    return mc(rng, `"${entry.word}" can mean "${first}".\nWhat else can it mean?`, second, wrong, {
      speak: `The word ${entry.word} can mean ${first}. What else can it mean?`,
      explanation: `"${entry.word}" also means ${second}.`,
    })
  },
}

/* ------------------------------------------------------------------ *
 * Sentence completion
 * ------------------------------------------------------------------ */

const sentenceComplete: SkillDef = {
  id: 'ng.vr.links.sentence-complete',
  title: 'Finish the sentence',
  yearBand: 'b2',
  concepts: ['sentence-completion-basic'],
  hint: 'Read the whole sentence with each word in the gap and listen for the one that fits.',
  helpAtHome: 'Leave a word out when you read together and let them supply it.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(1, difficulty)
    const gap = pickTier(rng, SENTENCES, tier)

    if (rng.chance(0.3)) {
      const truth = rng.chance(0.5)
      const shown = truth ? gap.answer : rng.pick(gap.wrong)
      return tf(`Does "${shown}" complete this sentence correctly?\n${gap.text}`, truth, {
        trueLabel: 'Yes',
        falseLabel: 'No',
        explanation: gap.text.replace('___', gap.answer.toUpperCase()),
      })
    }

    return mc(rng, `Which word completes the sentence?\n${gap.text}`, gap.answer, gap.wrong, {
      speak: `Which word completes this sentence? ${gap.text.replace('___', 'blank')}`,
      explanation: gap.text.replace('___', gap.answer.toUpperCase()),
    })
  },
}

const sentenceCompleteHard: SkillDef = {
  id: 'ng.vr.links.sentence-complete-hard',
  title: 'Finish the sentence — harder',
  yearBand: 'b5',
  prerequisites: ['ng.vr.links.sentence-complete'],
  concepts: ['sentence-completion-advanced'],
  hint: 'Two choices may nearly fit. Pick the one that matches the whole meaning.',
  helpAtHome: 'Read a newspaper sentence aloud, leaving out one strong word, and discuss the options.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(3, difficulty)
    const gap = pickTier(rng, SENTENCES, tier)

    if (rng.chance(0.3)) {
      const truth = rng.chance(0.5)
      const shown = truth ? gap.answer : rng.pick(gap.wrong)
      return tf(`Does "${shown}" complete this sentence correctly?\n${gap.text}`, truth, {
        trueLabel: 'Yes',
        falseLabel: 'No',
        explanation: gap.text.replace('___', gap.answer.toUpperCase()),
      })
    }

    return mc(rng, `Which word completes the sentence?\n${gap.text}`, gap.answer, gap.wrong, {
      speak: `Which word completes this sentence? ${gap.text.replace('___', 'blank')}`,
      explanation: gap.text.replace('___', gap.answer.toUpperCase()),
    })
  },
}

/* ------------------------------------------------------------------ *
 * Definitions
 * ------------------------------------------------------------------ */

const sameKind = (list: readonly Definition[], kind: Definition['kind']): Definition[] =>
  list.filter((d) => d.kind === kind)

const KINDS: Definition['kind'][] = ['person', 'place', 'thing', 'group']

const KIND_LABEL: Record<Definition['kind'], string> = {
  person: 'a person',
  place: 'a place',
  thing: 'a thing',
  group: 'a group',
}

const definitions: SkillDef = {
  id: 'ng.vr.links.definitions',
  title: 'What the word means',
  yearBand: 'b6',
  prerequisites: ['ng.vr.links.sentence-complete'],
  concepts: ['definitions'],
  hint: 'Break the word up. "Pedestrian" shares its start with "pedal" — both are about feet.',
  helpAtHome: 'Keep a dictionary near the table and look up one new word each evening.',
  generate: ({ rng, difficulty }): Item => {
    const tier = tierFor(1, difficulty)
    const entry = pickTier(rng, DEFINITIONS, tier)
    const band = bandOf(DEFINITIONS, tier)
    const family = sameKind(band, entry.kind)
    const others = rng.sample(family.filter((d) => d.word !== entry.word), 3)

    if (others.length < 2) {
      const anyOthers = rng.sample(DEFINITIONS.filter((d) => d.word !== entry.word), 3)
      return mc(rng, `Which word means "${entry.meaning}"?`, entry.word, anyOthers.map((d) => d.word), {
        explanation: `A ${entry.word} is ${entry.meaning}.`,
      })
    }

    const variant = rng.int(1, 4)

    // Yes or no. The wrong meanings belong to another word of the same kind,
    // so they read plausibly and have to be ruled out on meaning alone.
    if (variant === 3) {
      const truth = rng.chance(0.5)
      const shown = truth ? entry.meaning : others[0].meaning
      return tf(`Does "${entry.word}" mean "${shown}"?`, truth, {
        trueLabel: 'Yes',
        falseLabel: 'No',
        explanation: truth
          ? `Yes — "${entry.word}" means ${entry.meaning}.`
          : `No — that is what "${others[0].word}" means. "${entry.word}" means ${entry.meaning}.`,
      })
    }

    // Sort by what the word names, not by what it means exactly.
    if (variant === 4) {
      const kinds = KINDS.filter((k) => sameKind(band, k).length >= 3)
      const kind = kinds.length ? rng.pick(kinds) : null
      const outside = kind ? band.filter((d) => d.kind !== kind) : []
      if (kind && outside.length >= 2) {
        const right = rng.sample(sameKind(band, kind), 3)
        const wrong = rng.sample(outside, 2)
        const options = [
          ...right.map((d) => ({ value: d.word, correct: true })),
          ...wrong.map((d) => ({ value: d.word, correct: false })),
        ]
        return tapMany(rng, `Tap every word that names ${KIND_LABEL[kind]}`, options, {
          explanation: `${capitalise(right.map((d) => d.word).join(', '))} all name ${KIND_LABEL[kind]}.`,
        })
      }
    }

    if (variant === 1) {
      return mc(rng, `Which word means "${entry.meaning}"?`, entry.word, others.map((d) => d.word), {
        speak: `Which word means ${entry.meaning}?`,
        explanation: `"${entry.word}" means ${entry.meaning}.`,
      })
    }

    return mc(rng, `What does "${entry.word}" mean?`, entry.meaning, others.map((d) => d.meaning), {
      speak: `What does the word ${entry.word} mean?`,
      explanation: `"${entry.word}" means ${entry.meaning}.`,
    })
  },
}

export const linksStrand: StrandDef = {
  id: 'ng.vr.links',
  name: 'Link Bay',
  blurb: 'Word pairs, sound-alikes and finishing sentences',
  theme: 'bay',
  skills: [
    sentenceComplete,
    analogies,
    homophones,
    homonyms,
    analogiesHard,
    sentenceCompleteHard,
    definitions,
  ],
}
