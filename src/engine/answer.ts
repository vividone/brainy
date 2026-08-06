/**
 * Answer checking and human-readable rendering.
 *
 * Kept out of the UI so the same logic serves the session runner and the
 * parent zone's "what he actually answered" list.
 */

import type { Item } from './types'

export type Response = string | number | boolean | string[] | Record<string, string> | null

/**
 * A stable fingerprint for "the child has already seen this question".
 *
 * Prompt text alone is not enough: every shape question asks "What is this
 * shape called?" and differs only in the picture.
 */
export function itemSignature(item: Item): string {
  const parts: unknown[] = [item.type, item.prompt, item.visual]
  switch (item.type) {
    case 'multiple-choice':
      parts.push(
        item.choices.map((c) => c.label ?? JSON.stringify(c.visual)).sort(),
        item.choices.find((c) => c.id === item.answerId)?.label ?? JSON.stringify(item.choices.find((c) => c.id === item.answerId)?.visual),
      )
      break
    case 'numeric-entry':
    case 'number-line':
      parts.push(item.answer)
      break
    case 'true-false':
      parts.push(item.answer)
      break
    case 'count-objects':
      parts.push(item.glyph, item.count)
      break
    case 'order':
      parts.push(item.correctOrder.map((id) => item.tokens.find((t) => t.id === id)?.label))
      break
    case 'tap-many':
      parts.push(item.options.map((o) => o.label).sort(), item.correctIds.length)
      break
    case 'match':
      parts.push(Object.entries(item.pairs).sort())
      break
  }
  return JSON.stringify(parts)
}

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|')

export function isComplete(item: Item, response: Response): boolean {
  if (response === null || response === undefined) return false
  switch (item.type) {
    case 'order':
      return Array.isArray(response) && response.length === item.tokens.length
    case 'match':
      return (
        typeof response === 'object' &&
        !Array.isArray(response) &&
        Object.keys(response).length === item.left.length
      )
    case 'tap-many':
      return Array.isArray(response) && response.length > 0
    case 'numeric-entry':
    case 'count-objects':
      return typeof response === 'number' && Number.isFinite(response)
    default:
      return true
  }
}

export function checkAnswer(item: Item, response: Response): boolean {
  switch (item.type) {
    case 'multiple-choice':
      return response === item.answerId
    case 'numeric-entry':
      return typeof response === 'number' && response === item.answer
    case 'true-false':
      return response === item.answer
    case 'number-line':
      return typeof response === 'number' && response === item.answer
    case 'count-objects':
      return typeof response === 'number' && response === item.count
    case 'order':
      return Array.isArray(response) && response.join('|') === item.correctOrder.join('|')
    case 'tap-many':
      return Array.isArray(response) && sameSet(response, item.correctIds)
    case 'match': {
      if (typeof response !== 'object' || response === null || Array.isArray(response)) return false
      const entries = Object.entries(item.pairs)
      return entries.length === Object.keys(response).length &&
        entries.every(([l, r]) => response[l] === r)
    }
  }
}

const labelOf = (choices: { id: string; label?: string }[], id: string) =>
  choices.find((c) => c.id === id)?.label ?? id

/** Render a response for the parent zone. */
export function describeResponse(item: Item, response: Response): string {
  if (response === null || response === undefined) return '(blank)'
  switch (item.type) {
    case 'multiple-choice':
      return labelOf(item.choices, String(response))
    case 'true-false':
      return response ? (item.trueLabel ?? 'True') : (item.falseLabel ?? 'False')
    case 'order':
      return Array.isArray(response)
        ? response.map((id) => labelOf(item.tokens, id)).join(', ')
        : '(blank)'
    case 'tap-many':
      return Array.isArray(response)
        ? response.map((id) => labelOf(item.options, id)).join(', ')
        : '(blank)'
    case 'match':
      return typeof response === 'object' && !Array.isArray(response)
        ? Object.entries(response)
            .map(([l, r]) => `${labelOf(item.left, l)}→${labelOf(item.right, r)}`)
            .join(', ')
        : '(blank)'
    default:
      return String(response)
  }
}

/** Render the correct answer for the parent zone and the "here's the answer" card. */
export function describeAnswer(item: Item): string {
  switch (item.type) {
    case 'multiple-choice':
      return labelOf(item.choices, item.answerId)
    case 'numeric-entry':
      return `${item.prefix ?? ''}${item.answer}${item.suffix ?? ''}`
    case 'true-false':
      return item.answer ? (item.trueLabel ?? 'True') : (item.falseLabel ?? 'False')
    case 'number-line':
      return String(item.answer)
    case 'count-objects':
      return String(item.count)
    case 'order':
      return item.correctOrder.map((id) => labelOf(item.tokens, id)).join(', ')
    case 'tap-many':
      return item.correctIds.map((id) => labelOf(item.options, id)).join(', ')
    case 'match':
      return Object.entries(item.pairs)
        .map(([l, r]) => `${labelOf(item.left, l)}→${labelOf(item.right, r)}`)
        .join(', ')
  }
}
