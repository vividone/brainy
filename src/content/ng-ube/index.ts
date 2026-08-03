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
    /*
     * Science and Technology are one subject, as NERDC timetables them:
     * "Basic Science and Technology".
     */
    {
      id: 'science',
      name: 'Basic Science & Technology',
      icon: '🔬',
      color: 'emerald',
      available: false,
      comingSoon: 'Living things, the body, weather, materials, tools and simple machines.',
      plannedTopics: [
        'Living & non-living things',
        'The body & five senses',
        'Plants & animals',
        'Food & nutrition',
        'Water, air & weather',
        'Hygiene & safety',
        'Materials: wood, metal, plastic',
        'Everyday tools & workshop safety',
        'Simple machines & levers',
        'Electricity & circuits',
        'Light, sound & heat',
        'Technical drawing basics',
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
    {
      id: 'history',
      name: 'History',
      icon: '🏛️',
      color: 'stone',
      available: false,
      comingSoon: 'Nigeria past and present — peoples, kingdoms, heroes and independence.',
      plannedTopics: [
        'My family history',
        'Our town and its origins',
        'Early Nigerian kingdoms',
        'Benin, Oyo, Kanem-Borno',
        'The Sokoto Caliphate',
        'Colonial Nigeria',
        'Independence and after',
        'National heroes',
      ],
      strands: [],
    },
    {
      id: 'computer',
      name: 'Computer Studies',
      icon: '💻',
      color: 'cyan',
      available: false,
      comingSoon: 'Parts of a computer, typing, safety online and the first ideas of coding.',
      plannedTopics: [
        'Parts of a computer',
        'Input and output devices',
        'Using a keyboard & mouse',
        'Files and folders',
        'The internet & staying safe',
        'Word processing basics',
        'Spreadsheets basics',
        'First steps in coding',
      ],
      strands: [],
    },
    /*
     * Upper basic only. NERDC introduces these in Basic 4, so they stay
     * hidden for younger children rather than sitting there locked.
     */
    {
      id: 'home-ec',
      name: 'Home Economics',
      icon: '🏡',
      color: 'pink',
      available: false,
      yearBands: ['b4', 'b5', 'b6'],
      comingSoon: 'Food, clothing, the home and looking after yourself and others.',
      plannedTopics: [
        'Food groups & balanced diet',
        'Kitchen safety & hygiene',
        'Cooking methods',
        'Sewing & mending',
        'Caring for clothes',
        'Keeping the home clean',
        'Family and childcare',
        'Managing money at home',
      ],
      strands: [],
    },
    {
      id: 'agric',
      name: 'Agricultural Science',
      icon: '🌾',
      color: 'lime',
      available: false,
      yearBands: ['b4', 'b5', 'b6'],
      comingSoon: 'Crops, animals, farm tools and where our food comes from.',
      plannedTopics: [
        'What farming is',
        'Farm tools & their uses',
        'Crop plants of Nigeria',
        'Planting & harvesting',
        'Farm animals',
        'Soil and its types',
        'Pests and diseases',
        'Processing & storing food',
      ],
      strands: [],
    },
    {
      id: 'vocational',
      name: 'Vocational Studies',
      icon: '🛠️',
      color: 'slate',
      available: false,
      yearBands: ['b4', 'b5', 'b6'],
      comingSoon: 'Trades, crafts, entrepreneurship and useful skills for life.',
      plannedTopics: [
        'Trades and occupations',
        'Local crafts & materials',
        'Simple woodwork & metalwork',
        'Basic electrical work',
        'Starting a small business',
        'Buying, selling & profit',
        'Saving and budgeting',
        'Safety at work',
      ],
      strands: [],
    },
  ],
}
