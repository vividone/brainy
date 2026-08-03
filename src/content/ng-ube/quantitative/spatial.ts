/**
 * Compass Bay — spatial reasoning.
 *
 * Ordering by size, matching a number to a picture, turns and directions,
 * grid positions, and area and perimeter counted rather than calculated.
 * The maths pack teaches area as length × width; here it is arrived at by
 * counting squares, which is the reasoning version of the same idea.
 */

import type { Choice, Item, MatchItem, SkillDef, StrandDef } from '../../../engine/types'
import { entry, mc, order, tapMany, tf } from '../../shared/authoring'
import { ARROWS, ARROW_WORDS, COMPASS, GRID_GLYPHS, nearMiss, TURN_NAMES } from './figures'

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
    const noun = rng.pick(locale.objects)
    const glyph = noun.glyph
    const sizes = rng.sample(
      Array.from({ length: top }, (_, i) => i + 1),
      count,
    )
    const rising = [...sizes].sort((a, b) => a - b)
    const pile = (n: number) => glyph.repeat(n)

    switch (rng.pick(['order', 'most', 'middle', 'more'] as const)) {
      // Picking one group out is a smaller step than ordering all of them,
      // and it is where a child who cannot yet order should start.
      case 'most': {
        const biggest = rng.chance(0.5)
        const want = biggest ? rising[rising.length - 1] : rising[0]
        return mc(
          rng,
          `Which group has the ${biggest ? 'most' : 'fewest'} ${noun.many}?`,
          pile(want),
          rising.filter((n) => n !== want).map(pile),
          { explanation: `The groups have ${rising.join(', ')} ${noun.many}.` },
        )
      }

      case 'middle': {
        const three = rng.sample(rising, 3).sort((a, b) => a - b)
        return mc(
          rng,
          'Which group is in the middle — not the most, not the fewest?',
          pile(three[1]),
          [pile(three[0]), pile(three[2])],
          { explanation: `These three have ${three.join(', ')} ${noun.many}, so ${three[1]} sits in the middle.` },
        )
      }

      case 'more': {
        const line = rising[Math.floor(rising.length / 2)]
        return tapMany(
          rng,
          `Tap every group with more than ${line} ${noun.many}.`,
          rising.map((n) => ({ value: pile(n), correct: n > line })),
          { explanation: `The groups have ${rising.join(', ')} ${noun.many}.` },
        )
      }

      default: {
        const ascending = rng.chance(0.5)
        const sorted = ascending ? rising : [...rising].reverse()
        return order(
          rng,
          ascending ? 'Tap the groups from smallest to biggest' : 'Tap the groups from biggest to smallest',
          sorted.map(pile),
          { explanation: `In order they are ${sorted.join(', ')}.` },
        )
      }
    }
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
    const area = rows * cols

    // Halving and dividing back out of an area both need a step the youngest
    // children have not met yet.
    const forms =
      difficulty <= 2
        ? (['area', 'check', 'compare', 'tapArea'] as const)
        : (['area', 'check', 'compare', 'tapArea', 'half', 'side'] as const)

    switch (rng.pick(forms)) {
      case 'check': {
        const ok = rng.chance(0.5)
        const claimed = ok ? area : nearMiss(rng, area, 2)
        return tf(`Each square is 1 square centimetre.\nIs the area of this shape ${claimed} cm²?`, ok, {
          visual,
          explanation: `${rows} rows of ${cols} squares is ${area} square centimetres.`,
        })
      }

      // Comparing two areas without drawing either of them.
      case 'compare': {
        let r2 = rng.int(2, cap + 1)
        let c2 = rng.int(2, cap + 1)
        let guard = 0
        while (r2 * c2 === area && guard++ < 20) {
          r2 = rng.int(2, cap + 1)
          c2 = rng.int(2, cap + 1)
        }
        if (r2 * c2 === area) c2 += 1
        const mine = `${rows} by ${cols}`
        const other = `${r2} by ${c2}`
        const mineWins = area > r2 * c2
        return mc(rng, 'Which rectangle has the bigger area?', mineWins ? mine : other, [
          mineWins ? other : mine,
        ], {
          explanation: `${rows} × ${cols} = ${area} squares, and ${r2} × ${c2} = ${r2 * c2} squares.`,
        })
      }

      // One area, several shapes: the point that area does not fix the shape.
      case 'tapArea': {
        const fits: string[] = []
        for (let x = 2; x * x <= area; x++) {
          if (area % x === 0 && area / x >= 2) fits.push(`${x} by ${area / x}`)
        }
        // Turning the one rectangle on its side is a second right answer, and
        // a useful one: the area does not change when the shape does.
        if (fits.length === 1) {
          const [w, h] = fits[0].split(' by ')
          if (w !== h) fits.push(`${h} by ${w}`)
        }
        const right = rng.sample(fits, 2)
        const seen = new Set(right)
        let guard = 0
        while (seen.size < 4 && guard++ < 200) {
          const x = rng.int(2, cap + 2)
          const y = rng.int(2, cap + 2)
          if (x * y !== area) seen.add(`${x} by ${y}`)
        }
        const wrong = [...seen].filter((s) => !right.includes(s))
        // area × area is never area itself once area is 2 or more.
        if (!wrong.length) wrong.push(`${area} by ${area}`)
        return tapMany(
          rng,
          `Tap every rectangle with an area of ${area} squares.`,
          [
            ...right.map((s) => ({ value: s, correct: true })),
            ...wrong.map((s) => ({ value: s, correct: false })),
          ],
          {
            explanation:
              right.length > 1
                ? `${right.join(' and ')} both cover ${area} squares.`
                : `${right[0]} covers ${area} squares.`,
          },
        )
      }

      case 'half': {
        // An odd number of squares cannot be halved into whole ones.
        const wide = area % 2 === 0 ? cols : cols + 1
        const whole = rows * wide
        return entry('Half of this shape is painted.\nWhat is the area of the painted half?', whole / 2, {
          visual: { kind: 'array', rows, cols: wide, glyph },
          suffix: ' squares',
          maxDigits: 3,
          explanation: `The whole shape is ${rows} × ${wide} = ${whole} squares, and half of that is ${whole / 2}.`,
        })
      }

      case 'side':
        return entry(
          `A rectangle covers ${area} squares. It is ${cols} squares wide.\nHow many squares long is it?`,
          rows,
          { maxDigits: 2, explanation: `${area} ÷ ${cols} = ${rows}` },
        )

      default:
        return entry('Each square is 1 square centimetre.\nWhat is the area of this shape?', area, {
          visual,
          suffix: ' cm²',
          maxDigits: 3,
          explanation: `${rows} rows of ${cols} squares is ${area} square centimetres.`,
        })
    }
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

    const forms =
      difficulty <= 2
        ? (['right', 'howRight', 'howUp', 'check'] as const)
        : (['right', 'left', 'howRight', 'howUp', 'back', 'check'] as const)

    switch (rng.pick(forms)) {
      case 'howRight':
        return entry(
          `A counter moves from ${at(x, y)} to ${at(x + dx, y + dy)}.\nHow many squares did it move to the RIGHT?`,
          dx,
          { maxDigits: 2, explanation: `${x + dx} − ${x} = ${dx} squares to the right.` },
        )

      case 'howUp':
        return entry(
          `A counter moves from ${at(x, y)} to ${at(x + dx, y + dy)}.\nHow many squares did it move UP?`,
          dy,
          { maxDigits: 2, explanation: `${y + dy} − ${y} = ${dy} squares up. Up is the second number.` },
        )

      case 'left': {
        const back = rng.int(1, 3)
        return mc(
          rng,
          `A counter is at ${at(x, y)}. It moves ${back} left and ${dy} up.\nWhere is it now?`,
          at(x - back, y + dy),
          [at(x + back, y + dy), at(x - back, y - dy), at(y + dy, x - back)],
          {
            explanation: `Left takes ${back} off the first number and up adds ${dy} to the second: ${at(x - back, y + dy)}.`,
          },
        )
      }

      // Given where it landed, work back to where it set off.
      case 'back':
        return mc(
          rng,
          `A counter moved ${dx} right and ${dy} up, and landed on ${at(x + dx, y + dy)}.\nWhere did it start?`,
          at(x, y),
          [at(x + dx * 2, y + dy * 2), at(x + dx, y), at(x + dx, y + dy)],
          {
            explanation: `Undo the move: take ${dx} off the first number and ${dy} off the second, which gives ${at(x, y)}.`,
          },
        )

      case 'check': {
        const ok = rng.chance(0.5)
        const landing = ok ? at(x + dx, y + dy) : at(x + dy, y + dx)
        return tf(
          `A counter at ${at(x, y)} moves ${dx} right and ${dy} up.\nDoes it land on ${landing}?`,
          ok || dx === dy,
          {
            explanation: `Right adds ${dx} to the first number and up adds ${dy} to the second: ${at(x + dx, y + dy)}.`,
          },
        )
      }

      default:
        return mc(
          rng,
          `A counter is at ${at(x, y)}. It moves ${dx} right and ${dy} up.\nWhere is it now?`,
          at(x + dx, y + dy),
          [at(x + dy, y + dx), at(x - dx, y + dy), at(x + dx, y - dy)],
          {
            explanation: `Right adds ${dx} to the first number and up adds ${dy} to the second: ${at(x + dx, y + dy)}.`,
          },
        )
    }
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
    const perimeter = 2 * (rows + cols)

    switch (rng.pick(['round', 'side', 'strip', 'check', 'compare', 'square'] as const)) {
      case 'side': {
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

      case 'strip': {
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

      case 'check': {
        const ok = rng.chance(0.5)
        const claimed = ok ? perimeter : nearMiss(rng, perimeter, 2)
        return tf(`Is the distance all the way round this rectangle ${claimed} units?`, ok, {
          visual,
          explanation: `${cols} + ${rows} + ${cols} + ${rows} = ${perimeter} edges.`,
        })
      }

      // Bigger area, shorter fence — the confusion worth meeting head on.
      case 'compare': {
        let r2 = rng.int(2, cap + 1)
        let c2 = rng.int(2, cap + 1)
        let guard = 0
        while (r2 + c2 === rows + cols && guard++ < 20) {
          r2 = rng.int(2, cap + 1)
          c2 = rng.int(2, cap + 1)
        }
        if (r2 + c2 === rows + cols) c2 += 1
        const mine = `${rows} by ${cols}`
        const other = `${r2} by ${c2}`
        const mineWins = perimeter > 2 * (r2 + c2)
        return mc(rng, 'Which rectangle has the longer distance all the way round?', mineWins ? mine : other, [
          mineWins ? other : mine,
        ], {
          explanation: `${mine} measures ${perimeter} units round, and ${other} measures ${2 * (r2 + c2)}.`,
        })
      }

      // Working back from the distance round to one side.
      case 'square': {
        const side = rng.int(2, cap + 2)
        return entry(
          `A square measures ${4 * side} units all the way round.\nHow long is one side?`,
          side,
          {
            maxDigits: 2,
            explanation: `A square has 4 equal sides, so ${4 * side} ÷ 4 = ${side}.`,
          },
        )
      }

      default:
        return entry('How many unit edges go all the way round this rectangle?', perimeter, {
          visual,
          suffix: ' units',
          maxDigits: 3,
          explanation: `${cols} + ${rows} + ${cols} + ${rows} = ${perimeter} edges.`,
        })
    }
  },
}

export const spatialStrand: StrandDef = {
  id: 'ng.qr.spatial',
  name: 'Compass Bay',
  blurb: 'Sorting by size, turns and directions, and area counted in squares',
  theme: 'bay',
  skills: [orderSize, matchGroups, quarterTurns, areaSquares, pathDirections, gridMove, edgeCount],
}
