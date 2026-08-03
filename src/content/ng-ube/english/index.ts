/**
 * English Grammar — Nigerian UBE, Basic 1–6.
 *
 * The rules of the language: parts of speech, word forms, sentence building
 * and punctuation. Vocabulary reasoning — synonyms, analogies, odd one out —
 * deliberately lives in Verbal Reasoning instead, because Nigerian schools
 * timetable and examine the two separately.
 *
 * Everything is generated from graded word banks in `words.ts` and hand-checked
 * sentence banks in `banks.ts`, so a child meets the same rule dressed
 * differently every time rather than memorising a fixed question set.
 */

import type { SubjectDef } from '../../../engine/types'
import { wordFormsStrand } from './forms'
import { punctuationStrand } from './punctuation'
import { sentencesStrand } from './sentences'
import { wordTypesStrand } from './wordtypes'

export const englishSubject: SubjectDef = {
  id: 'english',
  name: 'English Grammar',
  icon: '📖',
  color: 'rose',
  available: true,
  strands: [wordTypesStrand, wordFormsStrand, sentencesStrand, punctuationStrand],
}
