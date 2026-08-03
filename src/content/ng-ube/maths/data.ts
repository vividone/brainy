/** Everyday Statistics — tallies, pictograms and bar charts. */

import type { Item, SkillDef, StrandDef } from '../../../engine/types'
import { entry, mc, thing } from '../../shared/authoring'
import { upperDataSkills } from './upper'

const CATEGORY_SETS: string[][] = [
  ['Rice', 'Beans', 'Yam', 'Bread'],
  ['Football', 'Running', 'Swimming', 'Cycling'],
  ['Red', 'Blue', 'Green', 'Yellow'],
  ['Mango', 'Orange', 'Banana', 'Pawpaw'],
  ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
  ['Dog', 'Cat', 'Goat', 'Bird'],
]

const tally: SkillDef = {
  id: 'ng.maths.data.tally',
  title: 'Tally marks',
  yearBand: 'b2',
  concepts: ['tally-marks'],
  hint: 'Every gate of five is four lines with one across them.',
  helpAtHome: 'Tally cars passing the house for two minutes, then count them up.',
  generate: ({ rng, difficulty }): Item => {
    const count = rng.int(3, [8, 12, 18, 25, 30][difficulty - 1])
    if (rng.chance(0.6)) {
      return entry('How many does this tally show?', count, {
        visual: { kind: 'tally', count },
        maxDigits: 2,
        explanation: `${Math.floor(count / 5)} group${Math.floor(count / 5) === 1 ? '' : 's'} of five and ${count % 5} more makes ${count}.`,
      })
    }
    return mc(
      rng,
      `Which tally shows ${count}?`,
      { visual: { kind: 'tally', count } },
      [
        { visual: { kind: 'tally' as const, count: count + 1 } },
        { visual: { kind: 'tally' as const, count: Math.max(1, count - 1) } },
        { visual: { kind: 'tally' as const, count: count + 5 } },
      ],
    )
  },
}

const pictogram: SkillDef = {
  id: 'ng.maths.data.pictogram',
  title: 'Reading pictograms',
  yearBand: 'b3',
  prerequisites: ['ng.maths.data.tally'],
  concepts: ['pictogram'],
  hint: 'Check the key first — one picture may stand for more than one thing.',
  helpAtHome: 'Draw a pictogram of favourite foods in the family.',
  generate: ({ rng, difficulty, locale }): Item => {
    const cats = rng.sample(rng.pick(CATEGORY_SETS), difficulty >= 3 ? 4 : 3)
    const unit = difficulty >= 4 ? rng.pick([2, 5]) : 1
    const rows = cats.map((label) => ({ label, count: rng.int(1, 6) }))
    const glyph = thing(rng, locale).glyph
    const visual = { kind: 'pictogram' as const, glyph, unit, rows }

    const variant = rng.int(1, 4)

    if (variant === 1) {
      const row = rng.pick(rows)
      return entry(`How many for ${row.label}?`, row.count * unit, {
        visual,
        maxDigits: 2,
        explanation:
          unit === 1
            ? `${row.label} has ${row.count} pictures, so ${row.count}.`
            : `${row.count} pictures × ${unit} each = ${row.count * unit}.`,
      })
    }

    if (variant === 2) {
      const most = rows.reduce((a, b) => (b.count > a.count ? b : a))
      return mc(rng, 'Which has the MOST?', most.label, rows.filter((r) => r.label !== most.label).map((r) => r.label), {
        visual,
        explanation: `${most.label} has the longest row.`,
      })
    }

    if (variant === 3) {
      const least = rows.reduce((a, b) => (b.count < a.count ? b : a))
      return mc(rng, 'Which has the FEWEST?', least.label, rows.filter((r) => r.label !== least.label).map((r) => r.label), {
        visual,
        explanation: `${least.label} has the shortest row.`,
      })
    }

    const total = rows.reduce((sum, r) => sum + r.count * unit, 0)
    return entry('How many altogether?', total, {
      visual,
      maxDigits: 3,
      explanation: `${rows.map((r) => r.count * unit).join(' + ')} = ${total}`,
    })
  },
}

const barChart: SkillDef = {
  id: 'ng.maths.data.bar-chart',
  title: 'Reading bar charts',
  yearBand: 'b3',
  prerequisites: ['ng.maths.data.pictogram'],
  concepts: ['bar-chart'],
  hint: 'Follow the top of the bar across to the numbers on the side.',
  helpAtHome: 'Make a bar chart of the weather each day for a week.',
  generate: ({ rng, difficulty }): Item => {
    const labels = rng.sample(rng.pick(CATEGORY_SETS), difficulty >= 3 ? 4 : 3)
    const bars = labels.map((label) => ({ label, value: rng.int(1, [6, 8, 10, 12, 20][difficulty - 1]) }))
    const visual = { kind: 'barChart' as const, bars }
    const variant = rng.int(1, 4)

    if (variant === 1) {
      const bar = rng.pick(bars)
      return entry(`How many for ${bar.label}?`, bar.value, {
        visual,
        maxDigits: 2,
        explanation: `The ${bar.label} bar reaches ${bar.value}.`,
      })
    }

    if (variant === 2) {
      const most = bars.reduce((a, b) => (b.value > a.value ? b : a))
      return mc(rng, 'Which bar is the tallest?', most.label, bars.filter((b) => b.label !== most.label).map((b) => b.label), {
        visual,
        explanation: `${most.label} reaches ${most.value}, the highest.`,
      })
    }

    if (variant === 3) {
      const [a, b] = rng.sample(bars, 2)
      return entry(`How many more for ${a.value >= b.value ? a.label : b.label} than ${a.value >= b.value ? b.label : a.label}?`, Math.abs(a.value - b.value), {
        visual,
        maxDigits: 2,
        explanation: `${Math.max(a.value, b.value)} − ${Math.min(a.value, b.value)} = ${Math.abs(a.value - b.value)}`,
      })
    }

    const total = bars.reduce((sum, b) => sum + b.value, 0)
    return entry('How many altogether?', total, {
      visual,
      maxDigits: 3,
      explanation: `${bars.map((b) => b.value).join(' + ')} = ${total}`,
    })
  },
}

export const dataStrand: StrandDef = {
  id: 'ng.maths.data',
  name: 'Data Beach',
  blurb: 'Tallies, pictograms and bar charts',
  theme: 'beach',
  skills: [tally, pictogram, barChart, ...upperDataSkills],
}
