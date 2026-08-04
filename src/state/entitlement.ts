/**
 * What this family can open.
 *
 * The rule, from prd.md §14.2, is gating by **content, never by time**: a
 * child's own class in Mathematics — and every earlier class of it, because
 * revision is the same subject — is free permanently, for everybody. The other
 * subjects are what a licence buys.
 *
 * Two things this deliberately never does:
 *
 *  - interrupt a session. Locking happens where a level is *chosen*, so a quest
 *    that has started always finishes. A paywall in front of a seven-year-old
 *    mid-question is indefensible.
 *  - lock anything a child has already been playing. The free subject is the
 *    one the app leads with, so a family that never pays keeps a complete
 *    product rather than a crippled one.
 */

import { entitled, type StoredLicence } from '../lib/licence'
import { useStore } from './store'

/**
 * Free for everyone, in every curriculum.
 *
 * Subject ids are shared across the three curriculum packs, so this is one set
 * rather than one per curriculum — and if a pack ever named maths something
 * else, the honest failure is that it becomes paid and somebody notices, not
 * that the engine starts knowing about curricula.
 */
export const FREE_SUBJECTS: ReadonlySet<string> = new Set(['maths'])

export interface Entitlement {
  /** Everything is open. */
  full: boolean
  licence: StoredLicence | null
  /** True once a parent has a licence of any kind, including a lapsed one. */
  known: boolean
}

export function useEntitlement(): Entitlement {
  const licence = useStore((s) => s.device.licence)
  return { full: entitled(licence), licence: licence ?? null, known: Boolean(licence) }
}

export const isFreeSubject = (subjectId: string): boolean => FREE_SUBJECTS.has(subjectId)

/** Whether a subject can be opened at all. */
export const subjectOpen = (subjectId: string, full: boolean): boolean =>
  full || FREE_SUBJECTS.has(subjectId)
