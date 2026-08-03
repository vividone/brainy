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
    {
      id: 'reasoning',
      name: 'Quantitative & Verbal Reasoning',
      icon: '🧩',
      color: 'amber',
      available: false,
      comingSoon: 'Patterns, analogies, codes, opposites and word puzzles are on the way.',
      strands: [],
    },
    {
      id: 'science',
      name: 'Basic Science & Technology',
      icon: '🔬',
      color: 'emerald',
      available: false,
      comingSoon: 'Living things, the body, water, weather and simple machines are on the way.',
      strands: [],
    },
  ],
}
