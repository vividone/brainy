/**
 * The only code in Brainy that talks to a server.
 *
 * Both paths are explicitly chosen by a parent: the weekly summary is behind
 * a switch that is off by default, and feedback is a form they filled in.
 * Nothing here runs on its own, and every failure is silent from the child's
 * point of view — a lost report must never interrupt a session or surface an
 * error to a seven-year-old.
 */

const ENDPOINT = '/api/report'
const TIMEOUT_MS = 8000

export interface WeeklyReport {
  type: 'weekly'
  /** Present only when the parent has opted in; absent otherwise. */
  installId?: string
  /** ISO-week bucket, e.g. "2026-W31". Coarse on purpose — no timestamps. */
  week: string
  app: string
  /** One entry per child on the device, with no name and no identifier. */
  children: string[]
}

export interface FeedbackReport {
  type: 'feedback'
  installId?: string
  app: string
  category: string
  message: string
  /** Optional, and only if the parent typed it so we can reply. */
  contact?: string
  /** The same anonymous summary, attached only if the parent ticked the box. */
  summary?: string
}

export type Report = WeeklyReport | FeedbackReport

/**
 * POST a report. Resolves false rather than throwing — every caller has a
 * clipboard fallback, and offline is a normal state for this app, not an
 * error worth surfacing.
 */
export async function sendReport(report: Report): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
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
