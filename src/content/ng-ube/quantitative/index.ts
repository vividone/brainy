/**
 * Quantitative Reasoning — Nigerian UBE, Basic 1–6.
 *
 * A separate subject from Verbal Reasoning: Nigerian schools timetable and
 * examine them separately, and a child is often strong at one and weak at the
 * other, which a blended score would hide from the parent report.
 *
 * The whole subject is one idea repeated in five costumes — *find the hidden
 * rule, then apply it*. Patterns hide the rule in a sequence, Shape City hides
 * it in a figure, Machine Falls in a box, Code Forest in a symbol, and Compass
 * Bay in a picture. That is also why it generates so well: the rule is a
 * parameter, so a skill that looks like a fixed worksheet puzzle can produce
 * many thousands of genuinely different questions.
 */

import type { SubjectDef } from '../../../engine/types'
import { codesStrand } from './codes'
import { machinesStrand } from './machines'
import { patternsStrand } from './patterns'
import { shapesStrand } from './shapes'
import { spatialStrand } from './spatial'

export const quantitativeSubject: SubjectDef = {
  id: 'quantitative',
  name: 'Quantitative Reasoning',
  icon: '🧮',
  color: 'sky',
  available: true,
  strands: [patternsStrand, machinesStrand, shapesStrand, codesStrand, spatialStrand],
}
