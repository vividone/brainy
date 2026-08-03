/**
 * Quantitative Reasoning — Nigerian UBE, Basic 1–6.
 *
 * A separate subject from Verbal Reasoning: Nigerian schools timetable and
 * examine them separately, and a child is often strong at one and weak at the
 * other, which a blended score would hide from the parent report.
 */

import type { SubjectDef } from '../../../engine/types'

export const quantitativeSubject: SubjectDef = {
  id: 'quantitative',
  name: 'Quantitative Reasoning',
  icon: '🧮',
  color: 'sky',
  available: false,
  comingSoon: 'Number puzzles, patterns and the shape problems used in common entrance.',
  plannedTopics: [
    'Number sequences & patterns',
    'Missing numbers in shapes',
    'Number machines (in / out)',
    'Coding & decoding numbers',
    'Figure analogies',
    'Counting squares & shapes',
    'Spatial reasoning',
    'Ordering & matching',
  ],
  strands: [],
}
