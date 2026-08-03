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
import { quantitativeSubject } from './quantitative'
import { verbalSubject } from './verbal'
import { englishSubject } from './english'

export const ngUbe: Curriculum = {
  id: 'ng-ube',
  name: 'Nigerian (UBE)',
  country: 'Nigeria',
  flag: '🇳🇬',
  locale: ngLocale,
  yearBands: [
    { id: 'b1', label: 'Basic 1', short: 'B1', ageRange: [5, 6] },
    { id: 'b2', label: 'Basic 2', short: 'B2', ageRange: [6, 7] },
    { id: 'b3', label: 'Basic 3', short: 'B3', ageRange: [7, 8] },
    { id: 'b4', label: 'Basic 4', short: 'B4', ageRange: [8, 9] },
    { id: 'b5', label: 'Basic 5', short: 'B5', ageRange: [9, 10] },
    { id: 'b6', label: 'Basic 6', short: 'B6', ageRange: [10, 12] },
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
     * Each remaining subject lives in its own folder so it can be authored
     * independently — see src/content/ng-ube/<subject>/index.ts.
     */
    quantitativeSubject,
    verbalSubject,
    englishSubject,
    {
      id: 'science',
      name: 'Basic Science',
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
    {
      id: 'technology',
      name: 'Basic Technology',
      icon: '🔧',
      color: 'slate',
      available: false,
      comingSoon: 'Tools, materials, drawing and how everyday things are made.',
      plannedTopics: [
        'Everyday tools & their uses',
        'Workshop safety',
        'Materials: wood, metal, plastic',
        'Measuring & marking out',
        'Simple machines & levers',
        'Technical drawing basics',
        'Electricity & circuits',
        'Computers & devices',
      ],
      strands: [],
    },
    {
      id: 'social',
      name: 'Social Studies',
      icon: '🌍',
      color: 'orange',
      available: false,
      comingSoon: 'Family, community, Nigeria, culture and being a good citizen.',
      plannedTopics: [
        'Family & relationships',
        'Our community & leaders',
        'Nigerian states & capitals',
        'Culture, festivals & languages',
        'National symbols',
        'Rights & responsibilities',
        'Transport & communication',
        'Safety & road signs',
      ],
      strands: [],
    },
  ],
}
