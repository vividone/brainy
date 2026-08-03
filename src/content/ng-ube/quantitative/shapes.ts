/**
 * Shape City — the classic Nigerian common-entrance figure puzzles.
 *
 * Numbers arranged in a circle, triangle, square or pyramid, following a rule
 * that is never written down. At low difficulty the rule is stated and the
 * child only applies it; from difficulty 3 a worked figure is shown instead
 * and the rule has to be deduced first. That is the whole skill.
 */

import type { Item, SkillDef, StrandDef } from '../../../engine/types'
import { entry } from '../../shared/authoring'
import { GRID_GLYPHS, pad, pyramidFigure, squareFigure, triangleFigure } from './figures'

const circlePairs: SkillDef = {
  id: 'ng.qr.shapes.circle-pairs',
  title: 'Fill the middle',
  yearBand: 'b2',
  prerequisites: ['ng.qr.patterns.count-on'],
  concepts: ['figure-puzzle'],
  hint: 'Add the two outside numbers together.',
  helpAtHome: 'Draw three circles in a row, write a number in each end one, and fill the middle together.',
  generate: ({ rng, difficulty }): Item => {
    const cap = [5, 9, 12, 20, 30][difficulty - 1]
    const a = rng.int(1, cap)
    const b = rng.int(1, cap)

    if (difficulty <= 3 || rng.chance(0.5)) {
      return entry(`Add the two outside numbers.\n(${a})${pad(4)}( ? )${pad(4)}(${b})`, a + b, {
        speak: `Add the two outside numbers, ${a} and ${b}. What goes in the middle?`,
        maxDigits: 3,
        explanation: `${a} + ${b} = ${a + b}`,
      })
    }

    const total = a + b
    return entry(`The middle is the outside numbers added.\n(${a})${pad(3)}(${total})${pad(3)}( ? )`, b, {
      speak: `The middle is the outside numbers added. One outside number is ${a} and the middle is ${total}. What is the other outside number?`,
      maxDigits: 3,
      explanation: `${total} − ${a} = ${b}`,
    })
  },
}

const triangleSum: SkillDef = {
  id: 'ng.qr.shapes.triangle-sum',
  title: 'Triangle puzzles',
  yearBand: 'b3',
  prerequisites: ['ng.qr.shapes.circle-pairs'],
  concepts: ['figure-puzzle'],
  hint: 'The middle number comes from the three corners added together.',
  helpAtHome: 'Draw a triangle, write a number at each corner, and ask what belongs in the middle.',
  generate: ({ rng, difficulty }): Item => {
    const cap = [6, 9, 12, 20, 40][difficulty - 1]
    const [a, b, c] = [rng.int(1, cap), rng.int(1, cap), rng.int(1, cap)]
    const total = a + b + c

    if (difficulty >= 4 && rng.chance(0.45)) {
      return entry(`The middle is the three corners added.\n${triangleFigure(a, b, '?', total)}`, c, {
        speak: `A triangle has ${a} and ${b} at two corners and ${total} in the middle. The middle is the three corners added. What is the last corner?`,
        maxDigits: 3,
        explanation: `${total} − ${a} − ${b} = ${c}`,
      })
    }

    if (difficulty >= 3) {
      const [x, y, z] = [rng.int(1, cap), rng.int(1, cap), rng.int(1, cap)]
      return entry(
        `Study the first triangle, then finish the second.\n${triangleFigure(x, y, z, x + y + z)}\n${triangleFigure(a, b, c, '?')}`,
        total,
        {
          speak: `In the first triangle the corners ${x}, ${y} and ${z} give ${x + y + z} in the middle. What goes in the middle of a triangle with corners ${a}, ${b} and ${c}?`,
          maxDigits: 3,
          explanation: `The middle is the corners added: ${a} + ${b} + ${c} = ${total}.`,
        },
      )
    }

    return entry(`Add the three corners.\n${triangleFigure(a, b, c, '?')}`, total, {
      speak: `Add the three corners ${a}, ${b} and ${c}.`,
      maxDigits: 3,
      explanation: `${a} + ${b} + ${c} = ${total}`,
    })
  },
}

const countSquares: SkillDef = {
  id: 'ng.qr.shapes.count-squares',
  title: 'Counting squares',
  yearBand: 'b3',
  prerequisites: ['ng.qr.spatial.order-size'],
  concepts: ['count-figures'],
  hint: 'Count along one row, then count how many rows there are.',
  helpAtHome: 'Count floor tiles by rows rather than one by one — it is much faster and never miscounts.',
  generate: ({ rng, difficulty }): Item => {
    const cap = [3, 4, 5, 6, 7][difficulty - 1]
    const rows = rng.int(2, cap)
    const cols = rng.int(2, cap)
    const glyph = rng.pick(GRID_GLYPHS)
    const visual = { kind: 'array', rows, cols, glyph } as const
    const variant = rng.int(1, 3)

    if (variant === 2) {
      return entry('How many ROWS of squares are there?', rows, {
        visual,
        maxDigits: 2,
        explanation: `There are ${rows} rows, with ${cols} squares in each.`,
      })
    }

    if (variant === 3) {
      return entry('How many squares are in ONE row?', cols, {
        visual,
        maxDigits: 2,
        explanation: `Each row has ${cols} squares.`,
      })
    }

    return entry('How many small squares are in this figure?', rows * cols, {
      visual,
      maxDigits: 3,
      explanation: `${rows} rows of ${cols} is ${rows} × ${cols} = ${rows * cols}.`,
    })
  },
}

const squareCorners: SkillDef = {
  id: 'ng.qr.shapes.square-corners',
  title: 'Square puzzles',
  yearBand: 'b4',
  prerequisites: ['ng.qr.shapes.triangle-sum'],
  concepts: ['figure-puzzle'],
  hint: 'Test the corners of the finished square: added? subtracted? multiplied?',
  helpAtHome: 'Draw a square with a number at each corner and invent a rule for the middle together.',
  generate: ({ rng, difficulty }): Item => {
    // 1 = all four added, 2 = one diagonal minus the other, 3 = diagonal products.
    const rule = difficulty <= 2 ? 1 : difficulty === 3 ? rng.int(1, 2) : rng.int(1, 3)
    const cap = rule === 3 ? 9 : [6, 9, 12, 15, 20][difficulty - 1]

    /** Corners are top-left, top-right, bottom-left, bottom-right. */
    const quad = (): [number, number, number, number] => {
      let [a, b, c, d] = [rng.int(1, cap), rng.int(1, cap), rng.int(1, cap), rng.int(1, cap)]
      // Keep the answer non-negative by putting the bigger diagonal first.
      if (rule === 2 && a + d < b + c) [a, b, c, d] = [b, a, d, c]
      if (rule === 3 && a * d < b * c) [a, b, c, d] = [b, a, d, c]
      return [a, b, c, d]
    }
    const apply = ([a, b, c, d]: [number, number, number, number]): number =>
      rule === 1 ? a + b + c + d : rule === 2 ? a + d - (b + c) : a * d - b * c

    const puzzle = quad()
    const answer = apply(puzzle)
    const [pa, pb, pc, pd] = puzzle
    const say = `The last square has ${pa} and ${pb} on top and ${pc} and ${pd} underneath. What goes in the middle?`

    if (rule === 1) {
      return entry(`Add all four corners.\n${squareFigure(pa, pb, pc, pd, '?')}`, answer, {
        speak: `Add all four corners: ${pa}, ${pb}, ${pc} and ${pd}.`,
        maxDigits: 4,
        explanation: `${pa} + ${pb} + ${pc} + ${pd} = ${answer}`,
      })
    }

    const e1 = quad()
    const e2 = quad()
    const workings =
      rule === 2
        ? `Add one diagonal, then take away the other: ${pa} + ${pd} − (${pb} + ${pc}) = ${answer}.`
        : `Multiply each diagonal, then subtract: ${pa} × ${pd} − ${pb} × ${pc} = ${answer}.`

    return entry(
      `Find the rule, then fill the ?.\n${squareFigure(...e1, apply(e1))}\n${squareFigure(...e2, apply(e2))}\n${squareFigure(pa, pb, pc, pd, '?')}`,
      answer,
      { speak: say, maxDigits: 4, explanation: workings },
    )
  },
}

const figureRule: SkillDef = {
  id: 'ng.qr.shapes.figure-rule',
  title: 'Find the hidden rule',
  yearBand: 'b4',
  prerequisites: ['ng.qr.shapes.triangle-sum'],
  concepts: ['figure-analogy'],
  hint: 'Try adding first. If that does not fit, try taking away, then multiplying.',
  helpAtHome: 'Give two examples of a secret rule and let him guess the third — then swap over.',
  generate: ({ rng, difficulty }): Item => {
    type Rule = { apply: (a: number, b: number) => number; say: (a: number, b: number) => string }
    const RULES: Record<string, Rule> = {
      sum: { apply: (a, b) => a + b, say: (a, b) => `${a} + ${b} = ${a + b}` },
      diff: { apply: (a, b) => a - b, say: (a, b) => `${a} − ${b} = ${a - b}` },
      prod: { apply: (a, b) => a * b, say: (a, b) => `${a} × ${b} = ${a * b}` },
      doubleSum: { apply: (a, b) => 2 * (a + b), say: (a, b) => `(${a} + ${b}) × 2 = ${2 * (a + b)}` },
      prodMinusSum: {
        apply: (a, b) => a * b - (a + b),
        say: (a, b) => `${a} × ${b} − (${a} + ${b}) = ${a * b - (a + b)}`,
      },
    }
    const names = [
      ['sum'],
      ['sum', 'diff'],
      ['sum', 'diff', 'prod'],
      ['sum', 'diff', 'prod', 'doubleSum'],
      ['diff', 'prod', 'doubleSum', 'prodMinusSum'],
    ][difficulty - 1]
    const name = rng.pick(names)
    const rule = RULES[name]
    const cap = [8, 9, 9, 12, 12][difficulty - 1]

    // `diff` must not go negative, and `prodMinusSum` needs both above 1.
    const low = name === 'prodMinusSum' ? 2 : 1
    const pair = (): [number, number] => {
      const a = rng.int(low + 1, cap)
      const b = name === 'diff' ? rng.int(low, a) : rng.int(low, cap)
      return [a, b]
    }

    const rows: [number, number][] = [pair(), pair(), pair()]
    const [qa, qb] = rows[2]
    const answer = rule.apply(qa, qb)
    const lines = [
      `${rows[0][0]} , ${rows[0][1]} → ${rule.apply(...rows[0])}`,
      `${rows[1][0]} , ${rows[1][1]} → ${rule.apply(...rows[1])}`,
      `${qa} , ${qb} → ?`,
    ].join('\n')

    return entry(`Find the rule, then fill the ?.\n${lines}`, answer, {
      speak: `${rows[0][0]} and ${rows[0][1]} give ${rule.apply(...rows[0])}. ${rows[1][0]} and ${rows[1][1]} give ${rule.apply(...rows[1])}. What do ${qa} and ${qb} give?`,
      maxDigits: 4,
      explanation: rule.say(qa, qb),
    })
  },
}

const numberPyramid: SkillDef = {
  id: 'ng.qr.shapes.number-pyramid',
  title: 'Number pyramid',
  yearBand: 'b5',
  prerequisites: ['ng.qr.shapes.square-corners'],
  concepts: ['figure-puzzle'],
  hint: 'Every brick is the two bricks below it added together.',
  helpAtHome: 'Draw three bricks in a row, add pairs upwards, then rub one brick out and swap roles.',
  generate: ({ rng, difficulty }): Item => {
    const baseSize = difficulty <= 3 ? 3 : 4
    const cap = [5, 8, 12, 12, 20][difficulty - 1]
    const rows: number[][] = [Array.from({ length: baseSize }, () => rng.int(1, cap))]
    while (rows[rows.length - 1].length > 1) {
      const prev = rows[rows.length - 1]
      rows.push(prev.slice(1).map((v, i) => v + prev[i]))
    }

    const cells: [number, number][] = []
    rows.forEach((row, ri) => row.forEach((_, ci) => cells.push([ri, ci])))
    // Easy: the missing brick is the top one, so it is pure addition. Harder:
    // a brick lower down, which means working backwards.
    const candidates = difficulty <= 2 ? cells.filter(([ri]) => ri === rows.length - 1) : cells
    const [br, bc] = rng.pick(candidates)
    const answer = rows[br][bc]
    const display = rows.map((row, ri) => row.map((v, ci) => (ri === br && ci === bc ? '?' : String(v))))

    let explanation: string
    if (br > 0) {
      explanation = `${rows[br - 1][bc]} + ${rows[br - 1][bc + 1]} = ${answer}`
    } else if (bc < rows[1].length) {
      explanation = `${rows[1][bc]} − ${rows[0][bc + 1]} = ${answer}`
    } else {
      explanation = `${rows[1][bc - 1]} − ${rows[0][bc - 1]} = ${answer}`
    }

    return entry(`Each brick is the two bricks below it added.\n${pyramidFigure(display)}`, answer, {
      speak: `In this pyramid every brick is the two bricks below it added together. What is the missing brick? The bottom row is ${rows[0].join(', ')}.`,
      maxDigits: 4,
      explanation,
    })
  },
}

const countAllSquares: SkillDef = {
  id: 'ng.qr.shapes.count-all-squares',
  title: 'How many squares?',
  yearBand: 'b6',
  prerequisites: ['ng.qr.shapes.count-squares', 'ng.qr.spatial.area-squares'],
  concepts: ['count-figures'],
  hint: 'Work size by size: the 1 by 1 squares, then the 2 by 2 ones, and so on.',
  helpAtHome: 'Draw a 3 by 3 grid and hunt for every square in it — there are 14, not 9.',
  generate: ({ rng, difficulty }): Item => {
    const cap = [4, 5, 6, 6, 7][difficulty - 1]
    const rows = rng.int(3, cap)
    const cols = rng.int(3, cap)
    const glyph = rng.pick(GRID_GLYPHS)
    const visual = { kind: 'array', rows, cols, glyph } as const
    const variant = difficulty <= 2 ? rng.int(1, 2) : rng.int(1, 4)

    if (variant === 1) {
      return entry('How many 2 by 2 squares can you find in this grid?', (rows - 1) * (cols - 1), {
        visual,
        maxDigits: 3,
        explanation: `A 2 by 2 square can start in ${rows - 1} places going down and ${cols - 1} going across: ${rows - 1} × ${cols - 1} = ${(rows - 1) * (cols - 1)}.`,
      })
    }

    if (variant === 2) {
      const inner = (rows - 2) * (cols - 2)
      return entry('How many small squares are NOT touching the outside edge?', inner, {
        visual,
        maxDigits: 3,
        explanation: `Take one square off each side: ${rows - 2} × ${cols - 2} = ${inner}.`,
      })
    }

    if (variant === 3) {
      const edge = rows * cols - (rows - 2) * (cols - 2)
      return entry('How many small squares are ON the outside edge?', edge, {
        visual,
        maxDigits: 3,
        explanation: `${rows} × ${cols} = ${rows * cols} altogether, minus the ${(rows - 2) * (cols - 2)} inside ones, leaves ${edge}.`,
      })
    }

    let total = 0
    const sizes: string[] = []
    for (let k = 1; k <= Math.min(rows, cols); k++) {
      const n = (rows - k + 1) * (cols - k + 1)
      total += n
      sizes.push(`${n} of size ${k}`)
    }
    return entry('How many squares of EVERY size are in this grid?', total, {
      visual,
      maxDigits: 3,
      explanation: `${sizes.join(', ')} — that is ${total} altogether.`,
    })
  },
}

export const shapesStrand: StrandDef = {
  id: 'ng.qr.shapes',
  name: 'Shape City',
  blurb: 'Missing numbers in circles, triangles, squares and pyramids',
  theme: 'city',
  skills: [
    circlePairs,
    triangleSum,
    countSquares,
    squareCorners,
    figureRule,
    numberPyramid,
    countAllSquares,
  ],
}
