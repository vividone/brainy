/** Geometry — 2D and 3D shapes, lines, angles and symmetry. */

import type { Item, Shape2D, Shape3D, SkillDef, StrandDef } from '../../../engine/types'
import { entry, mc, tapMany, tf } from '../../shared/authoring'
import { upperShapeSkills } from './upper'

const SHAPE_FACTS: Record<Shape2D, { name: string; sides: number; corners: number }> = {
  circle: { name: 'Circle', sides: 0, corners: 0 },
  triangle: { name: 'Triangle', sides: 3, corners: 3 },
  square: { name: 'Square', sides: 4, corners: 4 },
  rectangle: { name: 'Rectangle', sides: 4, corners: 4 },
  pentagon: { name: 'Pentagon', sides: 5, corners: 5 },
  hexagon: { name: 'Hexagon', sides: 6, corners: 6 },
  octagon: { name: 'Octagon', sides: 8, corners: 8 },
  oval: { name: 'Oval', sides: 0, corners: 0 },
  star: { name: 'Star', sides: 10, corners: 10 },
  rhombus: { name: 'Rhombus', sides: 4, corners: 4 },
}

const SHAPE3D_FACTS: Record<Shape3D, { name: string; faces: number; everyday: string }> = {
  cube: { name: 'Cube', faces: 6, everyday: 'a die' },
  cuboid: { name: 'Cuboid', faces: 6, everyday: 'a matchbox' },
  sphere: { name: 'Sphere', faces: 1, everyday: 'a football' },
  cylinder: { name: 'Cylinder', faces: 3, everyday: 'a tin of milk' },
  cone: { name: 'Cone', faces: 2, everyday: 'an ice cream cone' },
  pyramid: { name: 'Pyramid', faces: 5, everyday: 'a tent' },
}

const shapes2d: SkillDef = {
  id: 'ng.maths.shapes.2d',
  title: 'Flat shapes',
  yearBand: 'b2',
  concepts: ['2d-shapes'],
  hint: 'Count the straight sides around the outside.',
  helpAtHome: 'Spot shapes on signs, tiles and windows on the way to school.',
  generate: ({ rng, difficulty }): Item => {
    const pool: Shape2D[] = (
      [
        ['circle', 'square', 'triangle'],
        ['circle', 'square', 'triangle', 'rectangle'],
        ['circle', 'square', 'triangle', 'rectangle', 'oval'],
        ['circle', 'square', 'triangle', 'rectangle', 'oval', 'pentagon'],
        ['circle', 'square', 'triangle', 'rectangle', 'oval', 'pentagon', 'hexagon', 'octagon'],
      ] as Shape2D[][]
    )[difficulty - 1]

    const target = rng.pick(pool)
    const others = pool.filter((s) => s !== target)

    const facts = SHAPE_FACTS[target]
    const describe =
      facts.sides === 0
        ? `A ${facts.name.toLowerCase()} has no straight sides.`
        : `A ${facts.name.toLowerCase()} has ${facts.sides} sides and ${facts.corners} corners.`

    if (rng.chance(0.5)) {
      return mc(
        rng,
        'What is this shape called?',
        facts.name,
        rng.sample(others, 3).map((s) => SHAPE_FACTS[s].name),
        { visual: { kind: 'shape2d', name: target }, explanation: describe },
      )
    }

    return mc(
      rng,
      `Which one is a ${facts.name.toLowerCase()}?`,
      { visual: { kind: 'shape2d', name: target } },
      rng.sample(others, 3).map((s) => ({ visual: { kind: 'shape2d' as const, name: s } })),
      { explanation: describe },
    )
  },
}

const shapeProperties: SkillDef = {
  id: 'ng.maths.shapes.properties',
  title: 'Sides and corners',
  yearBand: 'b3',
  prerequisites: ['ng.maths.shapes.2d'],
  concepts: ['shape-properties'],
  hint: 'Touch each side as you count so you do not count one twice.',
  helpAtHome: 'Draw shapes together and count sides and corners out loud.',
  generate: ({ rng, difficulty }): Item => {
    const pool: Shape2D[] = (
      [
        ['triangle', 'square'],
        ['triangle', 'square', 'rectangle'],
        ['triangle', 'square', 'rectangle', 'pentagon'],
        ['triangle', 'square', 'rectangle', 'pentagon', 'hexagon'],
        ['triangle', 'square', 'rectangle', 'pentagon', 'hexagon', 'octagon'],
      ] as Shape2D[][]
    )[difficulty - 1]

    const target = rng.pick(pool)
    const facts = SHAPE_FACTS[target]
    const askSides = rng.chance(0.6)

    if (rng.chance(0.35)) {
      // The target must be on the board, and so must at least one wrong
      // answer, or the question has no correct pick or no wrong pick.
      const wrong = pool.filter((s) => SHAPE_FACTS[s].sides !== facts.sides)
      const options = rng.shuffle([target, ...rng.sample(wrong, 3)])
      if (wrong.length > 0) {
        return tapMany(
          rng,
          `Tap every shape with ${facts.sides} sides`,
          options.map((s) => ({
            value: SHAPE_FACTS[s].name,
            correct: SHAPE_FACTS[s].sides === facts.sides,
          })),
          { explanation: `A ${facts.name.toLowerCase()} has ${facts.sides} sides.` },
        )
      }
    }

    return entry(
      askSides
        ? `How many sides does a ${facts.name.toLowerCase()} have?`
        : `How many corners does a ${facts.name.toLowerCase()} have?`,
      askSides ? facts.sides : facts.corners,
      {
        visual: { kind: 'shape2d', name: target },
        maxDigits: 2,
        explanation: `A ${facts.name.toLowerCase()} has ${facts.sides} sides and ${facts.corners} corners.`,
      },
    )
  },
}

const shapes3d: SkillDef = {
  id: 'ng.maths.shapes.3d',
  title: 'Solid shapes',
  yearBand: 'b3',
  prerequisites: ['ng.maths.shapes.2d'],
  concepts: ['3d-shapes'],
  hint: 'Solid shapes take up space — you can hold them.',
  helpAtHome: 'Find a tin, a box and a ball at home and name each solid shape.',
  generate: ({ rng, difficulty }): Item => {
    const pool: Shape3D[] = (
      [
        ['cube', 'sphere'],
        ['cube', 'sphere', 'cylinder'],
        ['cube', 'sphere', 'cylinder', 'cone'],
        ['cube', 'cuboid', 'sphere', 'cylinder', 'cone'],
        ['cube', 'cuboid', 'sphere', 'cylinder', 'cone', 'pyramid'],
      ] as Shape3D[][]
    )[difficulty - 1]

    const target = rng.pick(pool)
    const others = pool.filter((s) => s !== target)
    const facts = SHAPE3D_FACTS[target]
    const variant = rng.int(1, difficulty >= 3 ? 3 : 2)

    if (variant === 1) {
      return mc(
        rng,
        'What is this solid shape called?',
        facts.name,
        rng.sample(others, 3).map((s) => SHAPE3D_FACTS[s].name),
        { visual: { kind: 'shape3d', name: target } },
      )
    }

    if (variant === 2) {
      return mc(
        rng,
        `Which solid shape is like ${facts.everyday}?`,
        facts.name,
        rng.sample(others, 3).map((s) => SHAPE3D_FACTS[s].name),
        { explanation: `${facts.everyday.charAt(0).toUpperCase() + facts.everyday.slice(1)} is shaped like a ${facts.name.toLowerCase()}.` },
      )
    }

    return entry(`How many faces does a ${facts.name.toLowerCase()} have?`, facts.faces, {
      visual: { kind: 'shape3d', name: target },
      maxDigits: 2,
      explanation: `A ${facts.name.toLowerCase()} has ${facts.faces} face${facts.faces === 1 ? '' : 's'}.`,
    })
  },
}

const lines: SkillDef = {
  id: 'ng.maths.shapes.lines',
  title: 'Lines',
  yearBand: 'b2',
  concepts: ['line-types'],
  hint: 'Horizontal lies flat like the ground. Vertical stands up like a wall.',
  helpAtHome: 'Point out horizontal and vertical lines in doors, tables and gates.',
  generate: ({ rng, difficulty }): Item => {
    const kinds = (difficulty <= 2
      ? (['horizontal', 'vertical'] as const)
      : (['horizontal', 'vertical', 'curved', 'slanting'] as const)) as readonly (
      | 'horizontal'
      | 'vertical'
      | 'curved'
      | 'slanting'
    )[]
    const target = rng.pick(kinds)
    const label = (k: string) => k.charAt(0).toUpperCase() + k.slice(1)
    const describe: Record<string, string> = {
      horizontal: 'A horizontal line lies flat, like the ground.',
      vertical: 'A vertical line stands straight up, like a wall.',
      curved: 'A curved line bends — it is not straight.',
      slanting: 'A slanting line leans over, like a ladder against a wall.',
    }

    /*
     * There are only four kinds of line, so the pictures alone give a tiny
     * question space. Real-world examples are what make this skill deep —
     * and they are the point of the topic anyway.
     */
    const EXAMPLES: Record<string, string[]> = {
      horizontal: ['the top of a table', 'the floor of a room', 'the horizon at the beach', 'a bench seat', 'the line of a closed book', 'a zebra crossing stripe'],
      vertical: ['a door frame', 'a flagpole', 'the trunk of a palm tree', 'a lamp post', 'the side of a fridge', 'a goal post'],
      curved: ['a rainbow', 'the letter S', 'the edge of a plate', 'a bicycle tyre', 'a banana', 'the rim of a cup'],
      slanting: ['a ladder against a wall', 'a roof edge', 'a slide in the playground', 'the letter Z stroke', 'a ramp', 'a kite string in the wind'],
    }

    const variant = rng.int(1, 3)

    if (variant === 1) {
      return mc(
        rng,
        'What kind of line is this?',
        label(target),
        kinds.filter((k) => k !== target).map(label),
        { visual: { kind: 'lineType', variant: target }, explanation: describe[target] },
      )
    }

    if (variant === 2) {
      return mc(
        rng,
        `Which one is a ${target} line?`,
        { visual: { kind: 'lineType', variant: target } },
        kinds.filter((k) => k !== target).map((k) => ({ visual: { kind: 'lineType' as const, variant: k } })),
        { explanation: describe[target] },
      )
    }

    const example = rng.pick(EXAMPLES[target])
    return mc(
      rng,
      `What kind of line is ${example}?`,
      label(target),
      kinds.filter((k) => k !== target).map(label),
      { explanation: describe[target] },
    )
  },
}

const rightAngles: SkillDef = {
  id: 'ng.maths.shapes.right-angles',
  title: 'Right angles',
  yearBand: 'b3',
  prerequisites: ['ng.maths.shapes.lines'],
  concepts: ['right-angles'],
  hint: 'A right angle is a perfect corner, like the corner of this page.',
  helpAtHome: 'Use the corner of a book to test whether corners around the house are right angles.',
  generate: ({ rng, difficulty }): Item => {
    // Sampled from the range rather than a fixed handful, so the drawings
    // themselves stop repeating.
    const notRight = () => (rng.chance(0.5) ? rng.int(15, 82) : rng.int(98, 168))
    const variant = rng.int(1, difficulty >= 3 ? 4 : 2)

    if (variant === 1) {
      const isRight = rng.chance(0.5)
      const degrees = isRight ? 90 : notRight()
      return tf('Is this a right angle?', isRight, {
        visual: { kind: 'angle', degrees },
        trueLabel: 'Yes',
        falseLabel: 'No',
        explanation: isRight
          ? 'Yes — a right angle is a square corner.'
          : `No — this angle is ${degrees < 90 ? 'smaller' : 'bigger'} than a right angle.`,
      })
    }

    if (variant === 2) {
      const shapes: [Shape2D, number][] = [
        ['square', 4],
        ['rectangle', 4],
        ['triangle', 0],
        ['circle', 0],
        ['pentagon', 0],
        ['hexagon', 0],
      ]
      const [shape, count] = rng.pick(shapes)
      return entry(`How many right angles does a ${shape} have?`, count, {
        visual: { kind: 'shape2d', name: shape },
        maxDigits: 1,
        explanation:
          count > 0
            ? `Every corner of a ${shape} is a square corner, so there are ${count}.`
            : `A ${shape} has no square corners at all.`,
      })
    }

    if (variant === 3) {
      const degrees = notRight()
      return mc(
        rng,
        'Is this angle bigger or smaller than a right angle?',
        degrees < 90 ? 'Smaller' : 'Bigger',
        [degrees < 90 ? 'Bigger' : 'Smaller'],
        {
          visual: { kind: 'angle', degrees },
          explanation: `A right angle is a square corner. This one is ${degrees < 90 ? 'narrower' : 'wider'}.`,
        },
      )
    }

    // Real-world corners — the point of the topic, and a deep question space.
    const CORNERS: [string, boolean][] = [
      ['the corner of a exercise book', true],
      ['the corner of a door', true],
      ['the corner of a window frame', true],
      ['the corner of a chessboard square', true],
      ['the corner of a room where two walls meet', true],
      ['the corner of a table', true],
      ['the point of a slice of cake', false],
      ['the point of a pencil tip', false],
      ['the corner of a triangular road sign', false],
      ['the opening of a pair of scissors', false],
      ['the tip of an arrow head', false],
      ['the spread of an open fan', false],
    ]
    const [thing, isRight] = rng.pick(CORNERS)
    return tf(`Is ${thing} a right angle?`, isRight, {
      trueLabel: 'Yes',
      falseLabel: 'No',
      explanation: isRight
        ? 'Yes — it is a square corner, like the corner of this page.'
        : 'No — it is not a square corner.',
    })
  },
}

const symmetry: SkillDef = {
  id: 'ng.maths.shapes.symmetry',
  title: 'Symmetry',
  yearBand: 'b3',
  prerequisites: ['ng.maths.shapes.properties'],
  concepts: ['symmetry'],
  hint: 'If you folded it on the line, would both halves match exactly?',
  helpAtHome: 'Fold paper shapes in half and see which ones match perfectly.',
  generate: ({ rng }): Item => {
    /** Whether the drawn axis really is a line of symmetry for that shape. */
    const isSymmetry: Record<string, Record<'v' | 'h' | 'diagonal', boolean>> = {
      square: { v: true, h: true, diagonal: true },
      rectangle: { v: true, h: true, diagonal: false },
      circle: { v: true, h: true, diagonal: true },
      triangle: { v: true, h: false, diagonal: false },
      oval: { v: true, h: true, diagonal: false },
    }

    /*
     * Capital letters are the classic symmetry exercise and a much bigger
     * pool than the handful of shapes — 26 letters × three question forms,
     * versus five shapes × three axes.
     */
    const LETTER_LINES: Record<string, number> = {
      A: 1, B: 1, C: 1, D: 1, E: 1, F: 0, G: 0, H: 2, I: 2, J: 0, K: 1, L: 0,
      M: 1, N: 0, O: 2, P: 0, Q: 0, R: 0, S: 0, T: 1, U: 1, V: 1, W: 1, X: 2,
      Y: 1, Z: 0,
    }
    const letters = Object.keys(LETTER_LINES)

    const variant = rng.int(1, 4)

    if (variant === 1) {
      const shape = rng.pick(Object.keys(isSymmetry) as Shape2D[])
      const axis = rng.pick(['v', 'h', 'diagonal'] as const)
      const correct = isSymmetry[shape][axis]
      return tf('Is the dotted line a line of symmetry?', correct, {
        visual: { kind: 'symmetry', name: shape, axis },
        trueLabel: 'Yes',
        falseLabel: 'No',
        explanation: correct
          ? 'Yes — fold along the line and both halves match exactly.'
          : 'No — if you folded along that line the halves would not match.',
      })
    }

    if (variant === 2) {
      const letter = rng.pick(letters)
      const symmetric = LETTER_LINES[letter] > 0
      return tf(`Can the letter ${letter} be folded so both halves match exactly?`, symmetric, {
        visual: { kind: 'text', text: letter },
        trueLabel: 'Yes',
        falseLabel: 'No',
        explanation: symmetric
          ? `Yes — ${letter} has ${LETTER_LINES[letter]} line${LETTER_LINES[letter] === 1 ? '' : 's'} of symmetry.`
          : `No — ${letter} cannot be folded onto itself.`,
      })
    }

    if (variant === 3) {
      const symmetric = letters.filter((l) => LETTER_LINES[l] > 0)
      const asymmetric = letters.filter((l) => LETTER_LINES[l] === 0)
      const options = rng.shuffle([...rng.sample(symmetric, 3), ...rng.sample(asymmetric, 3)])
      return tapMany(
        rng,
        'Tap every letter that has a line of symmetry',
        options.map((l) => ({ value: l, correct: LETTER_LINES[l] > 0 })),
        { explanation: 'A letter is symmetrical if you can fold it so both halves match.' },
      )
    }

    const shape = rng.pick(['square', 'rectangle', 'circle', 'triangle', 'hexagon', 'oval'] as Shape2D[])
    const counts: Partial<Record<Shape2D, number>> = {
      square: 4,
      rectangle: 2,
      circle: 8,
      triangle: 3,
      hexagon: 6,
      oval: 2,
    }
    const answer = counts[shape] ?? 1
    return mc(
      rng,
      `How many lines of symmetry does a ${shape} have?`,
      shape === 'circle' ? 'Too many to count' : String(answer),
      shape === 'circle' ? ['1', '2', '4'] : ['1', '2', '3', '4', '6'].filter((v) => v !== String(answer)),
      {
        visual: { kind: 'shape2d', name: shape },
        explanation:
          shape === 'circle'
            ? 'A circle can be folded in half through the middle any way you like.'
            : `A ${shape} folds onto itself in ${answer} different ways.`,
      },
    )
  },
}

export const geometryStrand: StrandDef = {
  id: 'ng.maths.shapes',
  name: 'Shape City',
  blurb: 'Flat shapes, solid shapes, lines and angles',
  theme: 'city',
  skills: [shapes2d, lines, shapeProperties, shapes3d, rightAngles, symmetry, ...upperShapeSkills],
}
