/**
 * English Grammar — Nigerian UBE, Basic 1–6.
 *
 * The rules of the language: parts of speech, tenses, punctuation and
 * sentence building. Vocabulary reasoning lives in Verbal Reasoning.
 */

import type { SubjectDef } from '../../../engine/types'

export const englishSubject: SubjectDef = {
  id: 'english',
  name: 'English Grammar',
  icon: '📖',
  color: 'rose',
  available: false,
  comingSoon: 'Parts of speech, tenses, punctuation and sentence building.',
  plannedTopics: [
    'Nouns, verbs & adjectives',
    'Singular & plural',
    'Pronouns & articles',
    'Tenses (past, present, future)',
    'Punctuation & capital letters',
    'Sentence building',
    'Prepositions & conjunctions',
    'Comprehension basics',
  ],
  strands: [],
}
