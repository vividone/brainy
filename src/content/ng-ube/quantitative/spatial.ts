/**
 * Compass Bay — spatial reasoning.
 *
 * Ordering by size, matching a number to a picture, turns and directions,
 * grid positions, and area and perimeter counted rather than calculated.
 * The maths pack teaches area as length × width; here it is arrived at by
 * counting squares, which is the reasoning version of the same idea.
 */

import type { Choice, Item, MatchItem, SkillDef, StrandDef } from '../../../engine/types'
import { entry, mc, order } from '../../shared/authoring'
import { ARROWS, ARROW_WORDS, COMPASS, GRID_GLYPHS, TURN_NAMES } from './figures'

const orderSize: SkillDef = {
  id: 'ng.qr.spatial.order-size',
  title: 'Smallest to biggest',
  yearBand: 'b1',
  concepts: ['order-by-size'],
  hint: 'Count each group first, then find the smallest one.',
  helpAtHome: 'Make three little piles of beans and ask him to line them up smallest first.',
  generate: ({ rng, difficulty, locale }): Item => {
    const count = difficulty <= 2 ? 3 : difficulty === 3 ? 4 : 5
    const top = [5, 6, 7, 8, 9][difficulty - 1]
    const glyph = rng.pick(locale.objects).glyph
    const sizes = rng.sample(
      Array.from({ length: top }, (_, i) => i + 1),
      count,
    )
    const ascending = rng.chance(0.5)
    const sorted = [...sizes].sort((a, b) => (ascending ? a - b : b - a))

    return order(
      rng,
      ascending ? 'Tap the groups from smallest to biggest' : 'Tap the groups from biggest to smallest',
      sorted.map((n) => glyph.repeat(n)),
      { explanation: `In order they are ${sorted.join(', ')}.` },
    )
  },
}

const matchGroups: SkillDef = {
  id: 'ng.qr.spatial.match-groups',
  title: 'Match the number',
  yearBand: 'b2',
  prerequisites: ['ng.qr.spatial.order-size'],
  concepts: ['matching'],
  hint: 'Count one group at a time and find its number.',
  helpAtHome: 'Write numbers on paper scraps and match them to piles of stones.',
  generate: ({ rng, difficulty, locale }): Item => {
    const count = difficulty <= 2 ? 3 : 4
    const noun = rng.pick(locale.objects)
    const top = [5, 6, 8, 9, 9][difficulty - 1]
    const sizes = rng.sample(
      Array.from({ length: top }, (_, i) => i + 1),
      count,
    )

    const left: Choice[] = sizes.map((n, i) => ({ id: `l${i}`, label: String(n) }))
    const rightOrder = rng.shuffle(sizes.map((_, i) => i))
    const right: Choice[] = rightOrder.map((source, i) => ({
      id: `r${i}`,
      label: noun.glyph.repeat(sizes[source]),
    }))
    const pairs: Record<string, string> = {}
    rightOrder.forEach((source, i) => {
      pairs[`l${source}`] = `r${i}`
    })

    const item: MatchItem = {
      skillId: '',
      type: 'match',
      prompt: `Match each number to its group of ${noun.many}.`,
      left,
      right,
      pairs,
      explanation: `The groups have ${[...sizes].sort((a, b) => a - b).join(', ')} ${noun.many}.`,
    }
    return item
  },
}

const quarterTurns: SkillDef = {
  id: 'ng.qr.spatial.quarter-turns',
  title: 'Quarter turns',
  yearBand: 'b3',
  concepts: ['rotation'],
  hint: 'A quarter turn clockwise goes up, right, down, left — like a clock.',
  helpAtHome: 'Stand up and make quarter turns together, saying which way you face each time.',
  generate: ({ rng, difficulty, locale }): Item => {
    const from = rng.int(0, 3)
    const quarters = rng.int(1, 3)
    const clockwise = difficulty <= 2 ? true : rng.chance(0.5)
    const way = clockwise ? 'clockwise' : 'anticlockwise'
    const to = (((from + (clockwise ? quarters : -quarters)) % 4) + 4) % 4
    const variant = rng.int(1, difficulty <= 2 ? 2 : 4)

    if (variant === 2) {
      // Say how big the turn was, rather than where it ended up.
      const forward = (to - from + 4) % 4
      return entry(
        `An arrow points ${ARROWS[from]}. It turns clockwise until it points ${ARROWS[to]}.\nHow many quarter turns is that?`,
        forward,
        {
          speak: `An arrow points ${ARROW_WORDS[from]}. It turns clockwise until it points ${ARROW_WORDS[to]}. How many quarter turns is that?`,
          maxDigits: 1,
          explanation: `Going clockwise from ${ARROW_WORDS[from]} to ${ARROW_WORDS[to]} takes ${forward} quarter turn${forward === 1 ? '' : 's'}.`,
        },
      )
    }

    if (variant === 3) {
      const who = rng.pick(locale.names)
      return mc(
        rng,
        `${who} is facing ${COMPASS[from]} and turns ${TURN_NAMES[quarters]} ${way}.\nWhich way is ${who} facing now?`,
        COMPASS[to],
        COMPASS.filter((c) => c !== COMPASS[to]),
        { explanation: `${TURN_NAMES[quarters]} ${way} from ${COMPASS[from]} lands on ${COMPASS[to]}.` },
      )
    }

    if (variant === 4) {
      // A clock face is the rotation every child has already stared at.
      const at = rng.int(1, 12)
      const land = (q: number) => (((at - 1 + (clockwise ? 3 * q : -3 * q)) % 12) + 12) % 12 + 1
      const answer = land(quarters)
      return mc(
        rng,
        `A clock hand points at ${at}. It turns ${TURN_NAMES[quarters]} ${way}.\nWhich number does it point at now?`,
        answer,
        [land(quarters === 1 ? 2 : 1), land(quarters === 3 ? 2 : 3), at],
        { explanation: `Each quarter turn moves the hand on 3 numbers, so it lands on ${answer}.` },
      )
    }

    return mc(
      rng,
      `The arrow points ${ARROWS[from]}. Turn it ${TURN_NAMES[quarters]} ${way}.\nWhich way does it point now?`,
      ARROWS[to],
      ARROWS.filter((a) => a !== ARROWS[to]),
      {
        speak: `An arrow points ${ARROW_WORDS[from]}. Turn it ${TURN_NAMES[quarters]} ${way}. Which way does it point now?`,
        explanation: `${TURN_NAMES[quarters]} ${way} from ${ARROW_WORDS[from]} points ${ARROW_WORDS[to]}.`,
      },
    )
  },
}

const areaSquares: SkillDef = {
  id: 'ng.qr.spatial.area-squares',
  title: 'Area by counting',
  yearBand: 'b3',
  prerequisites: ['ng.qr.shapes.count-squares'],
  concepts: ['area-counting'],
  hint: 'Count the squares in one row, then count the rows and multiply.',
  helpAtHome: 'Cover a book with sticky notes and count them — that is its area.',
  generate: ({ rng, difficulty }): Item => {
    const cap = [3, 4, 5, 7, 9][difficulty - 1]
    const rows = rng.int(2, cap)
    const cols = rng.int(2, cap)
    const glyph = rng.pick(GRID_GLYPHS)
    const visual = { kind: 'array', rows, cols, glyph } as const
    const variant = difficulty <= 2 ? 1 : rng.int(1, 3)

    if (variant === 2 && (rows * cols) % 2 === 0) {
      return entry('Half of this shape is painted.\nWhat is the area of the painted half?', (rows * cols) / 2, {
        visual,
        suffix: ' squares',
        maxDigits: 3,
        explanation: `The whole shape is ${rows} × ${cols} = ${rows * cols} squares, and half of that is ${(rows * cols) / 2}.`,
      })
    }

    if (variant === 3) {
      return entry(
        `A rectangle covers ${rows * cols} squares. It is ${cols} squares wide.\nHow many squares long is it?`,
        rows,
        {
          maxDigits: 2,
          explanation: `${rows * cols} ÷ ${cols} = ${rows}`,
        },
      )
    }

    return entry('Each square is 1 square centimetre.\nWhat is the area of this shape?', rows * cols, {
      visual,
      suffix: ' cm²',
      maxDigits: 3,
      explanation: `${rows} rows of ${cols} squares is ${rows * cols} square centimetres.`,
    })
  },
}

const pathDirections: SkillDef = {
  id: 'ng.qr.spatial.path-directions',
  title: 'Which way now?',
  yearBand: 'b4',
  prerequisites: ['ng.qr.spatial.quarter-turns'],
  concepts: ['rotation'],
  hint: 'Do one turn at a time and say which way you face after each one.',
  helpAtHome: 'Walk a route round the house calling out "left", "right" and the direction you end up facing.',
  generate: ({ rng, difficulty, locale }): Item => {
    const who = rng.pick(locale.names)
    const variant = rng.int(1, difficulty <= 2 ? 2 : 3)

    if (variant === 2) {
      // Steps that partly cancel out — reasoning, not walking.
      const east = rng.int(2, [6, 8, 10, 15, 20][difficulty - 1])
      const west = rng.int(1, east)
      const north = rng.int(1, [5, 7, 9, 12, 15][difficulty - 1])
      const asksEast = rng.chance(0.6)
      return entry(
        `${who} walks ${east} steps east, ${north} steps north, then ${west} steps west.\nHow many steps ${asksEast ? 'east' : 'north'} of the start is ${who} now?`,
        asksEast ? east - west : north,
        {
          maxDigits: 3,
          explanation: asksEast
            ? `${east} steps east then ${west} back west leaves ${east - west} steps east.`
            : `Only one part of the walk went north, so ${who} is ${north} steps north.`,
        },
      )
    }

    const from = rng.int(0, 3)
    const turns = difficulty <= 2 ? 2 : rng.int(2, 3)
    const moves = Array.from({ length: turns }, () => (rng.chance(0.5) ? 1 : -1))
    let facing = from
    for (const m of moves) facing = (((facing + m) % 4) + 4) % 4
    const words = moves.map((m) => (m === 1 ? 'right' : 'left')).join(', then ')

    if (variant === 3) {
      return mc(
        rng,
        `${who} faces ${COMPASS[from]}, then turns ${words}.\nWhich way is ${who} facing?`,
        COMPASS[facing],
        COMPASS.filter((c) => c !== COMPASS[facing]),
        { explanation: `Each turn is a quarter turn, so ${who} ends up facing ${COMPASS[facing]}.` },
      )
    }

    return mc(
      rng,
      `An arrow points ${ARROWS[from]}, then turns ${words}.\nWhich way does it point?`,
      ARROWS[facing],
      ARROWS.filter((a) => a !== ARROWS[facing]),
      {
        speak: `An arrow points ${ARROW_WORDS[from]}, then turns ${words}. Which way does it point?`,
        explanation: `Each turn is a quarter turn, so it ends up pointing ${ARROW_WORDS[facing]}.`,
      },
    )
  },
}

const gridMove: SkillDef = {
  id: 'ng.qr.spatial.grid-move',
  title: 'Moving on a grid',
  yearBand: 'b5',
  prerequisites: ['ng.qr.spatial.path-directions'],
  concepts: ['coordinates'],
  hint: 'Across first, then up. Right adds to the first number, up adds to the second.',
  helpAtHome: 'Play a treasure grid on squared paper — "two across, three up".',
  generate: ({ rng, difficulty }): Item => {
    // Coordinates start at 4 so that every "off by a move in the wrong
    // direction" distractor is still a real square on the grid.
    const size = [8, 9, 10, 12, 14][difficulty - 1]
    const x = rng.int(4, size)
    const y = rng.int(4, size)
    const dx = rng.int(1, 3)
    const dy = rng.int(1, 3)
    const at = (a: number, b: number) => `(${a}, ${b})`
    const variant = difficulty <= 2 ? 1 : rng.int(1, 3)

    if (variant === 2) {
      return entry(
        `A counter moves from ${at(x, y)} to ${at(x + dx, y + dy)}.\nHow many squares did it move to the RIGHT?`,
        dx,
        {
          maxDigits: 2,
          explanation: `${x + dx} − ${x} = ${dx} squares to the right.`,
        },
      )
    }

    if (variant === 3) {
      const back = rng.int(1, 3)
      return mc(
        rng,
        `A counter is at ${at(x, y)}. It moves ${back} left and ${dy} up.\nWhere is it now?`,
        at(x - back, y + dy),
        [at(x + back, y + dy), at(x - back, y - dy), at(y + dy, x - back)],
        { explanation: `Left takes ${back} off the first number and up adds ${dy} to the second: ${at(x - back, y + dy)}.` },
      )
    }

    return mc(
      rng,
      `A counter is at ${at(x, y)}. It moves ${dx} right and ${dy} up.\nWhere is it now?`,
      at(x + dx, y + dy),
      [at(x + dy, y + dx), at(x - dx, y + dy), at(x + dx, y - dy)],
      { explanation: `Right adds ${dx} to the first number and up adds ${dy} to the second: ${at(x + dx, y + dy)}.` },
    )
  },
}

const edgeCount: SkillDef = {
  id: 'ng.qr.spatial.edge-count',
  title: 'All the way round',
  yearBand: 'b6',
  prerequisites: ['ng.qr.spatial.area-squares'],
  concepts: ['perimeter-counting'],
  hint: 'Walk round the outside in your head, counting one edge at a time.',
  helpAtHome: 'Trace round a tile floor counting edges — the distance round is the perimeter.',
  generate: ({ rng, difficulty }): Item => {
    const cap = [4, 5, 6, 8, 9][difficulty - 1]
    const rows = rng.int(2, cap)
    const cols = rng.int(2, cap)
    const glyph = rng.pick(GRID_GLYPHS)
    const visual = { kind: 'array', rows, cols, glyph } as const
    const variant = difficulty <= 2 ? 1 : rng.int(1, 3)

    if (variant === 2) {
      const perimeter = 2 * (rows + cols)
      const known = rng.chance(0.5) ? cols : rows
      const other = known === cols ? rows : cols
      return entry(
        `A rectangle has a perimeter of ${perimeter} units and one side is ${known} units.\nHow long is the side next to it?`,
        other,
        {
          maxDigits: 2,
          explanation: `Half the perimeter is ${rows + cols}, and ${rows + cols} − ${known} = ${other}.`,
        },
      )
    }

    if (variant === 3) {
      const strip = rng.int(2, [4, 5, 6, 8, 10][difficulty - 1])
      return entry(
        `${strip} squares are joined in one straight line.\nHow many unit edges go all the way round the shape?`,
        2 * strip + 2,
        {
          maxDigits: 3,
          explanation: `${strip} edges along the top, ${strip} along the bottom and 1 at each end: ${2 * strip + 2}.`,
        },
      )
    }

    return entry('How many unit edges go all the way round this rectangle?', 2 * (rows + cols), {
      visual,
      suffix: ' units',
      maxDigits: 3,
      explanation: `${cols} + ${rows} + ${cols} + ${rows} = ${2 * (rows + cols)} edges.`,
    })
  },
}

export const spatialStrand: StrandDef = {
  id: 'ng.qr.spatial',
  name: 'Compass Bay',
  blurb: 'Sorting by size, turns and directions, and area counted in squares',
  theme: 'bay',
  skills: [orderSize, matchGroups, quarterTurns, areaSquares, pathDirections, gridMove, edgeCount],
}
