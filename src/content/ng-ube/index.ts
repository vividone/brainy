/** Nigerian UBE / NERDC curriculum pack. */

import type { Curriculum } from '../../engine/types'
import { ngLocale } from './locale'
import { numberStrand } from './maths/number'
import { operationsStrand } from './maths/operations'
import { fractionsStrand } from './maths/fractions'
import { moneyStrand } from './maths/money'
import { measurementStrand } from './maths/measurement'
import { geometryStrand } from './maths/geometry'
import { dataStrand } from './maths/data'

export const ngUbe: Curriculum = {
  id: 'ng-ube',
  name: 'Nigerian (UBE)',
  country: 'Nigeria',
  flag: '🇳🇬',
  locale: ngLocale,
  yearBands: [
    { id: 'b1', label: 'Basic 1', short: 'B1' },
    { id: 'b2', label: 'Basic 2', short: 'B2' },
    { id: 'b3', label: 'Basic 3', short: 'B3' },
    { id: 'b4', label: 'Basic 4', short: 'B4' },
  ],
  subjects: [
    {
      id: 'maths',
      name: 'Mathematics',
      icon: '🔢',
      color: 'violet',
      available: true,
      strands: [
        numberStrand,
        operationsStrand,
        fractionsStrand,
        moneyStrand,
        measurementStrand,
        geometryStrand,
        dataStrand,
      ],
    },
    /*
     * Quantitative and Verbal Reasoning are separate subjects, not one.
     * Nigerian schools timetable and examine them separately, they are
     * assessed separately at common entrance, and a child is very often
     * strong at one and weak at the other — which a single blended score
     * would hide from the parent report.
     */
    {
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
    },
    {
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
    },
    {
      id: 'science',
      name: 'Basic Science & Technology',
      icon: '🔬',
      color: 'emerald',
      available: false,
      comingSoon: 'Living things, the body, water, weather and simple machines.',
      plannedTopics: [
        'Living & non-living things',
        'The body & five senses',
        'Plants & animals',
        'Food & nutrition',
        'Water, air & weather',
        'Hygiene & safety',
        'Materials & simple machines',
        'Light, sound & heat',
      ],
      strands: [],
    },
  ],
}
