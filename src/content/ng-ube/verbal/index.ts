/**
 * Verbal Reasoning — Nigerian UBE, Basic 1–6.
 *
 * Word puzzles, opposites and the letter games that build vocabulary. Kept
 * separate from English Grammar: this is reasoning with words, not the rules
 * of the language.
 */

import type { SubjectDef } from '../../../engine/types'

export const verbalSubject: SubjectDef = {
  id: 'verbal',
  name: 'Verbal Reasoning',
  icon: '🔤',
  color: 'amber',
  available: false,
  comingSoon: 'Word puzzles, opposites and the letter games that build vocabulary.',
  plannedTopics: [
    'Synonyms & antonyms',
    'Odd one out',
    'Word analogies',
    'Alphabetical order',
    'Coded words',
    'Jumbled words',
    'Homonyms & homophones',
    'Letter sequences',
  ],
  strands: [],
}
