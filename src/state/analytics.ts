/**
 * Everything the parent report shows, computed from the save.
 *
 * Kept out of the screen so the numbers can be reasoned about (and later
 * tested) on their own, and so Parent.tsx stays readable.
 */

import { currentMastery } from '../engine/mastery'
import { getSkill, skillsInStrand, subjectsForBand } from '../engine/registry'
import type { Curriculum, ProgressMap, SessionResult, SubjectDef } from '../engine/types'
import { dayKey, recentDays } from '../lib/dates'
import type { DayStat } from './store'

export interface SkillRow {
  id: string
  title: string
  subjectId: string
  strandName: string
  mastery: number
  attempts: number
  correct: number
  lastSeen: number
}

export interface SubjectRow {
  id: string
  name: string
  icon: string
  colour: string
  skillCount: number
  startedCount: number
  masteredCount: number
  mastery: number
  /** Questions answered in this subject, all time. */
  questions: number
  correct: number
}

export interface Analytics {
  /** Share of the child's *own class* skills at mastered or better, 0-1. */
  classReadiness: number
  classSkillCount: number
  classMasteredCount: number

  /** Last 30 days: day key -> questions answered. Drives the heatmap. */
  activity: { day: string; questions: number; correct: number; minutes: number }[]
  /** Consecutive days with any activity, ending today. */
  daysPlayedLast30: number

  /** Weekly first-try accuracy for the last 6 weeks, oldest first. */
  accuracyTrend: { label: string; accuracy: number | null; questions: number }[]

  subjects: SubjectRow[]
  strongest: SkillRow[]
  weakest: SkillRow[]

  /**
   * First-try accuracy on questions the engine served as spaced review.
   * The honest measure of retention: did it stick after a gap?
   */
  retention: { answered: number; correct: number; rate: number | null }

  /** Median session length in minutes, and typical questions per session. */
  medianSessionMinutes: number | null
  sessionsLogged: number

  /** Skills whose mastery has decayed below 0.5 after once being mastered. */
  goingRusty: SkillRow[]
}

const median = (values: number[]): number | null => {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function buildAnalytics(
  curriculum: Curriculum,
  bands: string[],
  currentBand: string,
  progress: ProgressMap,
  byDay: Record<string, DayStat>,
  history: SessionResult[],
  now = Date.now(),
): Analytics {
  /* ---- every in-band skill, flattened ---- */
  const rows: SkillRow[] = []
  const subjects: SubjectRow[] = []

  for (const subject of subjectsForBand(curriculum.id, currentBand) as SubjectDef[]) {
    let questions = 0
    let correct = 0
    const subjectSkills: SkillRow[] = []

    for (const strand of subject.strands) {
      for (const skill of skillsInStrand(curriculum.id, strand.id, bands)) {
        const p = progress[skill.id]
        const row: SkillRow = {
          id: skill.id,
          title: skill.title,
          subjectId: subject.id,
          strandName: strand.name,
          mastery: currentMastery(progress, skill.id, now),
          attempts: p?.attempts ?? 0,
          correct: p?.correct ?? 0,
          lastSeen: p?.lastSeen ?? 0,
        }
        subjectSkills.push(row)
        rows.push(row)
        questions += row.attempts
        correct += row.correct
      }
    }

    if (subjectSkills.length === 0) continue
    subjects.push({
      id: subject.id,
      name: subject.name,
      icon: subject.icon,
      colour: subject.color,
      skillCount: subjectSkills.length,
      startedCount: subjectSkills.filter((s) => s.attempts > 0).length,
      masteredCount: subjectSkills.filter((s) => s.mastery >= 0.75).length,
      mastery: subjectSkills.reduce((sum, s) => sum + s.mastery, 0) / subjectSkills.length,
      questions,
      correct,
    })
  }

  /* ---- readiness for their own class ---- */
  const classSkills = rows.filter((r) => {
    const skill = getSkill(curriculum.id, r.id)
    return skill?.yearBand === currentBand
  })
  const classMastered = classSkills.filter((r) => r.mastery >= 0.75).length

  /* ---- activity ---- */
  const activity = recentDays(30, new Date(now)).map((day) => {
    const stat = byDay[day]
    return {
      day,
      questions: stat?.questions ?? 0,
      correct: stat?.correct ?? 0,
      minutes: Math.round((stat?.ms ?? 0) / 60000),
    }
  })

  /* ---- weekly accuracy trend ---- */
  const accuracyTrend: Analytics['accuracyTrend'] = []
  for (let w = 5; w >= 0; w--) {
    const end = new Date(now)
    end.setDate(end.getDate() - w * 7)
    const days = recentDays(7, end)
    let q = 0
    let c = 0
    for (const d of days) {
      q += byDay[d]?.questions ?? 0
      c += byDay[d]?.correct ?? 0
    }
    accuracyTrend.push({
      label: w === 0 ? 'This week' : `${w}w ago`,
      accuracy: q > 0 ? c / q : null,
      questions: q,
    })
  }

  /* ---- retention on spaced-review items ---- */
  let reviewAnswered = 0
  let reviewCorrect = 0
  for (const session of history) {
    for (const answer of session.answers) {
      if (answer.role !== 'review') continue
      reviewAnswered++
      if (answer.correctFirstTry) reviewCorrect++
    }
  }

  /*
   * Strongest and weakest must not overlap. With only two skills attempted,
   * a naive "top 5 / bottom 5" lists the same skill as both a strength and a
   * gap, which reads as a bug and tells the parent nothing.
   */
  const attempted = [...rows.filter((r) => r.attempts >= 2)].sort((a, b) => b.mastery - a.mastery)
  const half = Math.floor(attempted.length / 2)
  const strongest = attempted.slice(0, Math.min(5, half))
  const weakest = attempted.slice(-Math.min(5, attempted.length - half)).reverse()

  const sessionMinutes = history.map((h) => h.durationMs / 60000).filter((m) => m > 0 && m < 120)

  return {
    classReadiness: classSkills.length ? classMastered / classSkills.length : 0,
    classSkillCount: classSkills.length,
    classMasteredCount: classMastered,

    activity,
    daysPlayedLast30: activity.filter((a) => a.questions > 0).length,

    accuracyTrend,
    subjects,

    strongest,
    weakest,

    retention: {
      answered: reviewAnswered,
      correct: reviewCorrect,
      rate: reviewAnswered > 0 ? reviewCorrect / reviewAnswered : null,
    },

    medianSessionMinutes: median(sessionMinutes),
    sessionsLogged: history.length,

    // Once mastered, then left alone long enough to slip. The single most
    // actionable list for a parent: these need five minutes, not a lesson.
    goingRusty: rows
      .filter((r) => {
        const p = progress[r.id]
        return Boolean(p?.everMastered) && r.mastery < 0.6
      })
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 5),
  }
}

export const todayKey = () => dayKey()

/* ------------------------------------------------------------------ *
 * Sharable summary
 * ------------------------------------------------------------------ */

/**
 * A de-identified summary a parent can choose to send us.
 *
 * The app makes no network requests, and this does not change that: the text
 * is copied to the clipboard and the parent decides whether to send it, to
 * whom, and after reading it. That is the only honest way to square "nothing
 * leaves the device" with needing to know whether the app works.
 *
 * What is deliberately absent, and why:
 *
 * - **No name, no id, no timestamps.** A persistent install id plus a
 *   fine-grained history is a behavioural fingerprint of one child. Under
 *   NDPR and GDPR that is pseudonymised data, not anonymous data, and it
 *   would carry every obligation we are trying to avoid.
 * - **No question text and nothing the child typed.** Only skill ids, which
 *   are our own identifiers for content we wrote.
 * - **Counts are bucketed**, so a single family is not distinguishable by an
 *   unusual exact number.
 *
 * What it does carry is the thing that actually improves the app: which
 * *skills* children get wrong. A skill sitting at 30% across many families is
 * a badly pitched or broken question, not a struggling child.
 */
export function buildSharableSummary(
  curriculumId: string,
  yearBand: string,
  stats: Analytics,
  totals: { questions: number; correct: number },
  appVersion: string,
): string {
  const bucket = (n: number): string => {
    if (n === 0) return '0'
    if (n < 10) return '1-9'
    if (n < 25) return '10-24'
    if (n < 50) return '25-49'
    if (n < 100) return '50-99'
    if (n < 250) return '100-249'
    if (n < 500) return '250-499'
    return '500+'
  }
  const pct = (x: number) => `${Math.round(x * 100)}%`
  const accuracy = totals.questions ? totals.correct / totals.questions : 0

  const lines: string[] = [
    `Brainy usage summary (${appVersion})`,
    `curriculum: ${curriculumId} · class: ${yearBand}`,
    `questions answered: ${bucket(totals.questions)}`,
    `first-try accuracy: ${pct(accuracy)}`,
    `active days in last 30: ${stats.daysPlayedLast30}`,
    `class readiness: ${pct(stats.classReadiness)}`,
    stats.retention.rate === null
      ? 'retention: not enough data'
      : `retention on review: ${pct(stats.retention.rate)} of ${bucket(stats.retention.answered)}`,
    '',
    'by subject:',
    ...stats.subjects
      .filter((s) => s.questions > 0)
      .map((s) => `  ${s.id}: ${pct(s.questions ? s.correct / s.questions : 0)} over ${bucket(s.questions)}`),
    '',
    'skills with the lowest accuracy (these are the ones worth checking):',
    ...stats.weakest
      .filter((s) => s.attempts >= 3)
      .map((s) => `  ${s.id}: ${pct(s.correct / Math.max(1, s.attempts))} over ${bucket(s.attempts)}`),
  ]

  return lines.join('\n')
}
