/**
 * Verbal Reasoning — Nigerian UBE, Basic 1–6.
 *
 * Word puzzles, opposites and the letter games that build vocabulary. Kept
 * separate from English Grammar: this is reasoning with words, not the rules
 * of the language.
 *
 * The vocabulary itself lives in `words.ts`, graded into five tiers. Every
 * generator here picks a tier from the child's difficulty and then does the
 * shuffling — which is what lets a pack that needs real words still produce
 * a fresh question every time.
 */

import type { SubjectDef } from '../../../engine/types'
import { gamesStrand } from './games'
import { lettersStrand } from './letters'
import { linksStrand } from './links'
import { meaningStrand } from './meaning'

export const verbalSubject: SubjectDef = {
  id: 'verbal',
  name: 'Verbal Reasoning',
  icon: '🔤',
  color: 'amber',
  available: true,
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
  strands: [meaningStrand, gamesStrand, lettersStrand, linksStrand],
}
