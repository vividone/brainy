/**
 * Small helpers that make writing question generators terse.
 *
 * These live in `content/`, not `engine/`, because they are an authoring
 * convenience rather than part of the engine contract.
 */

import type { Rng } from '../../engine/rng'
import type {
  Locale,
  MultipleChoiceItem,
  NumericEntryItem,
  ObjectNoun,
  OrderItem,
  TapManyItem,
  TrueFalseItem,
  Visual,
} from '../../engine/types'

export type Opt = string | number | { label?: string; visual?: Visual }

const norm = (o: Opt): { label?: string; visual?: Visual } =>
  typeof o === 'object' && o !== null ? o : { label: String(o) }

const keyOf = (o: { label?: string; visual?: Visual }) => o.label ?? JSON.stringify(o.visual)

type Extras = Partial<Pick<MultipleChoiceItem, 'speak' | 'explanation' | 'visual'>>

/**
 * Build a multiple-choice item. Ids are assigned before shuffling so the
 * answer id stays stable no matter where the correct card lands.
 */
export function mc(
  rng: Rng,
  prompt: string,
  correct: Opt,
  wrong: Opt[],
  extras: Extras = {},
): MultipleChoiceItem {
  const right = norm(correct)
  const seen = new Set([keyOf(right)])
  const distinct = wrong
    .map(norm)
    .filter((w) => {
      const k = keyOf(w)
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .slice(0, 3)

  const tagged = [{ ...right, id: 'c0' }, ...distinct.map((w, i) => ({ ...w, id: `c${i + 1}` }))]

  return {
    skillId: '',
    type: 'multiple-choice',
    prompt,
    choices: rng.shuffle(tagged),
    answerId: 'c0',
    ...extras,
  }
}

export function entry(
  prompt: string,
  answer: number,
  extras: Extras & Partial<Pick<NumericEntryItem, 'prefix' | 'suffix' | 'maxDigits'>> = {},
): NumericEntryItem {
  return { skillId: '', type: 'numeric-entry', prompt, answer, ...extras }
}

export function tf(
  prompt: string,
  answer: boolean,
  extras: Extras & Partial<Pick<TrueFalseItem, 'trueLabel' | 'falseLabel'>> = {},
): TrueFalseItem {
  return { skillId: '', type: 'true-false', prompt, answer, ...extras }
}

/** Tap the given labels in the correct order. `values` must already be ordered. */
export function order(
  rng: Rng,
  prompt: string,
  values: (string | number)[],
  extras: Extras = {},
): OrderItem {
  const tokens = values.map((v, i) => ({ id: `t${i}`, label: String(v) }))
  return {
    skillId: '',
    type: 'order',
    prompt,
    tokens: rng.shuffle(tokens),
    correctOrder: tokens.map((t) => t.id),
    ...extras,
  }
}

export function tapMany(
  rng: Rng,
  prompt: string,
  options: { value: string | number; correct: boolean }[],
  extras: Extras = {},
): TapManyItem {
  const tagged = options.map((o, i) => ({ id: `o${i}`, label: String(o.value), correct: o.correct }))
  return {
    skillId: '',
    type: 'tap-many',
    prompt,
    options: rng.shuffle(tagged).map(({ id, label }) => ({ id, label })),
    correctIds: tagged.filter((o) => o.correct).map((o) => o.id),
    ...extras,
  }
}

/* ------------------------------------------------------------------ *
 * Locale-aware text
 * ------------------------------------------------------------------ */

/** `₦450`. Whole units only — kobo is handled explicitly where it matters. */
export const money = (amount: number, locale: Locale): string =>
  `${locale.currency.symbol}${amount.toLocaleString('en')}`

export const plural = (n: number, noun: ObjectNoun): string => `${n} ${n === 1 ? noun.one : noun.many}`

export const person = (rng: Rng, locale: Locale): string => rng.pick(locale.names)

/** Two different names, for problems that need both. */
export function twoPeople(rng: Rng, locale: Locale): [string, string] {
  const [a, b] = rng.sample(locale.names, 2)
  return [a, b ?? locale.names[0]]
}

export const thing = (rng: Rng, locale: Locale): ObjectNoun => rng.pick(locale.objects)

/**
 * Speak-friendly version of an arithmetic expression. Screen readers and the
 * Web Speech API handle "34 + 12" inconsistently; spelling it out is reliable.
 */
export const sayMaths = (text: string): string =>
  text
    .replace(/\+/g, ' plus ')
    .replace(/−|-/g, ' minus ')
    .replace(/×/g, ' times ')
    .replace(/÷/g, ' divided by ')
    .replace(/=/g, ' equals ')
    .replace(/\s+/g, ' ')
    .trim()
