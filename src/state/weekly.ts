/**
 * Builds the anonymous weekly summary for every child on the device.
 *
 * Kept separate from the parent screen because it runs unattended once a
 * week, and it should be readable on its own to check what it sends.
 */

import { getCurriculum, hasCurriculum, includedBands } from '../engine/registry'
import { APP_VERSION } from '../game/characters'
import { buildAnalytics, buildSharableSummary } from './analytics'
import type { Store } from './store'

/** ISO-week bucket, e.g. `2026-W31`. Deliberately coarser than a date. */
export function isoWeek(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/**
 * One summary string per child who has actually answered something.
 *
 * A child with no activity is left out entirely: an empty report tells us
 * nothing and is one more thing leaving a device for no reason.
 */
export function buildWeeklySummaries(state: Store): string[] {
  const out: string[] = []

  for (const learner of state.learners) {
    const data = state.data[learner.id]
    if (!data || data.totals.questions === 0) continue

    const curriculumId = hasCurriculum(learner.curriculumId) ? learner.curriculumId : null
    if (!curriculumId) continue

    const curriculum = getCurriculum(curriculumId)
    const known = curriculum.yearBands.some((b) => b.id === learner.yearBand)
    const bands = includedBands(
      curriculumId,
      known ? learner.yearBand : curriculum.yearBands[curriculum.yearBands.length - 1].id,
    )

    const stats = buildAnalytics(
      curriculum,
      bands,
      learner.yearBand,
      data.progress[curriculumId] ?? {},
      data.byDay,
      data.history,
    )

    out.push(
      buildSharableSummary(curriculumId, learner.yearBand, stats, data.totals, APP_VERSION),
    )
  }

  return out
}
