/**
 * Anonymous usage pings.
 *
 * Nothing here runs unless a parent has explicitly opted in, and the install
 * id does not exist until they do. Every send is fire-and-forget: a lost ping
 * is worth nothing next to interrupting a child, so failures are silent and
 * only the activation is ever retried.
 *
 * What is deliberately never sent: the child's name, their age, anything they
 * typed, and any timestamp finer than the day. The id distinguishes one
 * browser profile from another so the same tablet is not counted twice — it
 * is not tied to a person and cannot be resolved to one.
 */

import { dayKey } from './dates'

const ENDPOINT = '/api/event'
const TIMEOUT_MS = 6000

export interface UsageEvent {
  installId: string
  app: string
  /** Local day, so a dashboard groups by the family's day, not UTC. */
  day: string
  kind: 'activate' | 'open' | 'session'
  curriculum?: string
  yearBand?: string
  subject?: string
  questions?: number
  correct?: number
  durationMs?: number
  /** How many children share this device. A count, never who they are. */
  children?: number
}

export async function sendEvent(event: Omit<UsageEvent, 'day'>): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...event, day: dayKey() } satisfies UsageEvent),
      signal: controller.signal,
      keepalive: true,
    })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Ask the server to erase everything held under this install id.
 *
 * Deliberately not fire-and-forget like the pings above: a parent is standing
 * there having asked for their data to be deleted, and they are owed a true
 * answer. The caller must therefore await this *before* wiping the device,
 * because the id is the only handle on those rows and clearing it first would
 * strand them permanently.
 */
export async function sendForget(installId: string): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch('/api/forget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installId }),
      signal: controller.signal,
    })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}
