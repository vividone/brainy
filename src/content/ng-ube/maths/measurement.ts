/** Measurement — length, mass, capacity, time and the calendar. */

import { numericDistractors } from '../../../engine/rng'
import type { Item, SkillDef, StrandDef } from '../../../engine/types'
import { entry, mc, order, person } from '../../shared/authoring'
import { DAYS, DAYS_IN_MONTH, MONTHS, ordinalShort } from '../../shared/words'

const length: SkillDef = {
  id: 'ng.maths.measure.length',
  title: 'Measuring length',
  yearBand: 'b2',
  concepts: ['length-cm-m'],
  hint: 'Start at 0 on the ruler and count the marks.',
  helpAtHome: 'Measure shoes, books and tables with a ruler or tape together.',
  generate: ({ rng, difficulty }): Item => {
    const variant = rng.int(1, difficulty >= 3 ? 3 : 2)

    if (variant === 1) {
      const total = difficulty <= 2 ? 10 : 15
      const cm = rng.int(2, total - 1)
      return entry('How long is the pencil, in centimetres?', cm, {
        visual: { kind: 'ruler', lengthCm: cm, totalCm: total },
        suffix: ' cm',
        maxDigits: 2,
        explanation: `The pencil ends at the ${cm} cm mark.`,
      })
    }

    if (variant === 2) {
      const metres = rng.int(1, 9)
      return mc(rng, `How many centimetres are in ${metres} metre${metres > 1 ? 's' : ''}?`, metres * 100, numericDistractors(rng, metres * 100, 3, { min: 10, max: 2000, near: [metres * 10, metres * 1000] }), {
        explanation: `1 m = 100 cm, so ${metres} m = ${metres * 100} cm.`,
      })
    }

    const items: [string, string][] = [
      ['a pencil', 'cm'],
      ['a classroom door', 'm'],
      ['your thumb', 'cm'],
      ['a football pitch', 'm'],
      ['an exercise book', 'cm'],
      ['the road to school', 'm'],
    ]
    const [thing, unit] = rng.pick(items)
    return mc(rng, `Which unit would you use to measure ${thing}?`, unit === 'cm' ? 'Centimetres (cm)' : 'Metres (m)', [
      unit === 'cm' ? 'Metres (m)' : 'Centimetres (cm)',
    ], { explanation: `We measure ${thing} in ${unit === 'cm' ? 'centimetres' : 'metres'}.` })
  },
}

const mass: SkillDef = {
  id: 'ng.maths.measure.mass',
  title: 'Weight: grams and kilograms',
  yearBand: 'b3',
  prerequisites: ['ng.maths.measure.length'],
  concepts: ['mass-g-kg'],
  hint: '1 kilogram is 1000 grams.',
  helpAtHome: 'Weigh rice or garri on a kitchen scale and read the number together.',
  generate: ({ rng, difficulty }): Item => {
    const variant = rng.int(1, difficulty >= 3 ? 3 : 2)

    if (variant === 1) {
      const grams = rng.step(100, 1000, 100)
      return entry('What does the scale show, in grams?', grams, {
        visual: { kind: 'scale', grams, maxGrams: 1000 },
        suffix: ' g',
        maxDigits: 4,
        explanation: `The needle points to ${grams} g.`,
      })
    }

    if (variant === 2) {
      const kg = rng.int(1, 9)
      return mc(rng, `How many grams are in ${kg} kilogram${kg > 1 ? 's' : ''}?`, kg * 1000, numericDistractors(rng, kg * 1000, 3, { min: 100, max: 20000, near: [kg * 100, kg * 10] }), {
        explanation: `1 kg = 1000 g, so ${kg} kg = ${kg * 1000} g.`,
      })
    }

    const pairs: [string, string][] = [
      ['a bag of cement', 'kg'],
      ['one biro', 'g'],
      ['a small boy', 'kg'],
      ['a slice of bread', 'g'],
      ['a bag of rice', 'kg'],
      ['a pencil', 'g'],
    ]
    const [thing, unit] = rng.pick(pairs)
    return mc(rng, `Would you weigh ${thing} in grams or kilograms?`, unit === 'g' ? 'Grams (g)' : 'Kilograms (kg)', [
      unit === 'g' ? 'Kilograms (kg)' : 'Grams (g)',
    ], { explanation: `${thing.charAt(0).toUpperCase() + thing.slice(1)} is measured in ${unit === 'g' ? 'grams' : 'kilograms'}.` })
  },
}

const capacity: SkillDef = {
  id: 'ng.maths.measure.capacity',
  title: 'How much it holds',
  yearBand: 'b3',
  prerequisites: ['ng.maths.measure.mass'],
  concepts: ['capacity-litres'],
  hint: '1 litre is 1000 millilitres.',
  helpAtHome: 'Compare a sachet of water, a bottle and a bucket — which holds more?',
  generate: ({ rng, difficulty }): Item => {
    const variant = rng.int(1, difficulty >= 3 ? 3 : 2)

    if (variant === 1) {
      const capacityMl = 1000
      const ml = rng.step(100, 900, 100)
      return entry('How much water is in the jug, in millilitres?', ml, {
        visual: { kind: 'jug', millilitres: ml, capacity: capacityMl },
        suffix: ' ml',
        maxDigits: 4,
        explanation: `The water reaches the ${ml} ml line.`,
      })
    }

    if (variant === 2) {
      const litres = rng.int(1, 8)
      return mc(rng, `How many millilitres are in ${litres} litre${litres > 1 ? 's' : ''}?`, litres * 1000, numericDistractors(rng, litres * 1000, 3, { min: 100, max: 20000, near: [litres * 100] }), {
        explanation: `1 litre = 1000 ml, so ${litres} litres = ${litres * 1000} ml.`,
      })
    }

    const a = rng.int(1, 5)
    const b = rng.int(1, 5)
    return entry(`A bucket holds ${a} litres. A jerrycan holds ${b} litres.\nHow many litres altogether?`, a + b, {
      suffix: ' litres',
      explanation: `${a} + ${b} = ${a + b} litres`,
    })
  },
}

const timeClock: SkillDef = {
  id: 'ng.maths.measure.time-clock',
  title: "Telling the time: o'clock",
  yearBand: 'b2',
  concepts: ['time-oclock'],
  hint: 'The short hand tells you the hour. The long hand on 12 means o’clock.',
  helpAtHome: 'Ask what time it is on a real clock face, not a phone.',
  generate: ({ rng, difficulty }): Item => {
    const hour = rng.int(1, 12)
    const half = difficulty >= 3 && rng.chance(0.5)
    const minute = half ? 30 : 0
    const label = half ? `Half past ${hour}` : `${hour} o'clock`

    if (rng.chance(0.6)) {
      const others = [
        `${(hour % 12) + 1} o'clock`,
        `Half past ${hour}`,
        `${hour === 1 ? 12 : hour - 1} o'clock`,
      ].filter((o) => o !== label)
      return mc(rng, 'What time is it?', label, others, {
        visual: { kind: 'clock', hour, minute },
        explanation: `The short hand is ${half ? 'between ' + hour + ' and ' + ((hour % 12) + 1) : 'on ' + hour} and the long hand is on ${half ? 6 : 12}.`,
      })
    }

    return mc(
      rng,
      `Which clock shows ${label.toLowerCase()}?`,
      { visual: { kind: 'clock', hour, minute } },
      [
        { visual: { kind: 'clock', hour: (hour % 12) + 1, minute } },
        { visual: { kind: 'clock', hour, minute: half ? 0 : 30 } },
        { visual: { kind: 'clock', hour: hour === 1 ? 12 : hour - 1, minute } },
      ],
    )
  },
}

const timeQuarters: SkillDef = {
  id: 'ng.maths.measure.time-half-quarter',
  title: 'Quarter past and quarter to',
  yearBand: 'b3',
  prerequisites: ['ng.maths.measure.time-clock'],
  concepts: ['time-quarters'],
  hint: 'A quarter of the way round is 15 minutes — the long hand on 3.',
  helpAtHome: 'Say times out loud as "quarter past seven" instead of "seven fifteen".',
  generate: ({ rng, difficulty }): Item => {
    const hour = rng.int(1, 12)
    const options = difficulty <= 2 ? [15, 30] : difficulty <= 4 ? [15, 30, 45] : [0, 15, 30, 45]
    const minute = rng.pick(options)
    const nextHour = (hour % 12) + 1
    const label =
      minute === 0
        ? `${hour} o'clock`
        : minute === 15
          ? `Quarter past ${hour}`
          : minute === 30
            ? `Half past ${hour}`
            : `Quarter to ${nextHour}`

    const all = [
      `${hour} o'clock`,
      `Quarter past ${hour}`,
      `Half past ${hour}`,
      `Quarter to ${nextHour}`,
    ].filter((l) => l !== label)

    return mc(rng, 'What time is it?', label, all, {
      visual: { kind: 'clock', hour, minute },
      explanation:
        minute === 45
          ? `The long hand is on 9, which is 15 minutes before ${nextHour} o'clock.`
          : `The long hand is on ${minute / 5}, which means ${minute} minutes past.`,
    })
  },
}

const calendar: SkillDef = {
  id: 'ng.maths.measure.calendar',
  title: 'Days, weeks and months',
  yearBand: 'b3',
  concepts: ['calendar'],
  hint: 'There are 7 days in a week and 12 months in a year.',
  helpAtHome: 'Point at a wall calendar and count days to the next holiday.',
  generate: ({ rng, difficulty }): Item => {
    const variant = rng.int(1, difficulty >= 3 ? 4 : 3)

    if (variant === 1) {
      const i = rng.int(0, 6)
      const after = rng.chance(0.5)
      const answer = DAYS[(i + (after ? 1 : 6)) % 7]
      return mc(rng, after ? `Which day comes after ${DAYS[i]}?` : `Which day comes before ${DAYS[i]}?`, answer, rng.sample(DAYS.filter((d) => d !== answer && d !== DAYS[i]), 3))
    }

    if (variant === 2) {
      const i = rng.int(0, 11)
      return mc(rng, `Which month comes after ${MONTHS[i]}?`, MONTHS[(i + 1) % 12], rng.sample(MONTHS.filter((_, j) => j !== (i + 1) % 12 && j !== i), 3), {
        explanation: `${MONTHS[i]} is month ${i + 1}, so next is ${MONTHS[(i + 1) % 12]}.`,
      })
    }

    if (variant === 3) {
      const weeks = rng.int(2, difficulty >= 4 ? 8 : 4)
      return entry(`How many days are there in ${weeks} weeks?`, weeks * 7, {
        explanation: `1 week = 7 days, so ${weeks} × 7 = ${weeks * 7}.`,
      })
    }

    const i = rng.int(0, 11)
    return mc(rng, `How many days are in ${MONTHS[i]}?`, DAYS_IN_MONTH[i], [28, 30, 31].filter((d) => d !== DAYS_IN_MONTH[i]), {
      explanation: `${MONTHS[i]} has ${DAYS_IN_MONTH[i]} days${i === 1 ? ' (29 in a leap year)' : ''}.`,
    })
  },
}

const duration: SkillDef = {
  id: 'ng.maths.measure.duration',
  title: 'How long does it take?',
  yearBand: 'b3',
  prerequisites: ['ng.maths.measure.time-half-quarter'],
  concepts: ['durations'],
  hint: 'Count on in hours first, then the minutes.',
  helpAtHome: 'Time how long chores take, and work out finishing times together.',
  generate: ({ rng, difficulty, locale }): Item => {
    const variant = rng.int(1, difficulty >= 3 ? 3 : 2)
    const who = person(rng, locale)

    if (variant === 1) {
      const hours = rng.int(1, 5)
      return entry(`How many minutes are there in ${hours} hour${hours > 1 ? 's' : ''}?`, hours * 60, {
        explanation: `1 hour = 60 minutes, so ${hours} × 60 = ${hours * 60}.`,
      })
    }

    if (variant === 2) {
      const start = rng.int(1, 9)
      const hours = rng.int(1, 3)
      return entry(
        `${who} starts reading at ${start} o'clock and stops at ${start + hours} o'clock.\nHow many hours did ${who} read?`,
        hours,
        { maxDigits: 2, explanation: `From ${start} to ${start + hours} is ${hours} hour${hours > 1 ? 's' : ''}.` },
      )
    }

    const startHour = rng.int(1, 10)
    const startMin = rng.pick([0, 15, 30])
    const addMin = rng.pick([15, 30, 45])
    const totalMin = startMin + addMin
    const endHour = startHour + Math.floor(totalMin / 60)
    const endMin = totalMin % 60
    const fmt = (h: number, m: number) => `${h}:${String(m).padStart(2, '0')}`
    return mc(
      rng,
      `A lesson starts at ${fmt(startHour, startMin)} and lasts ${addMin} minutes.\nWhat time does it finish?`,
      fmt(endHour, endMin),
      [fmt(endHour + 1, endMin), fmt(startHour, endMin), fmt(endHour, (endMin + 15) % 60)],
      { explanation: `${fmt(startHour, startMin)} plus ${addMin} minutes is ${fmt(endHour, endMin)}.` },
    )
  },
}

const orderEvents: SkillDef = {
  id: 'ng.maths.measure.order-time',
  title: 'Putting times in order',
  yearBand: 'b3',
  prerequisites: ['ng.maths.measure.calendar'],
  concepts: ['ordering-time'],
  hint: 'Think about what happens first in a normal day.',
  helpAtHome: 'Talk through the order of the school day at bedtime.',
  generate: ({ rng }): Item => {
    if (rng.chance(0.5)) {
      const start = rng.int(0, 8)
      const picked = [0, 1, 2, 3].map((i) => MONTHS[(start + i) % 12])
      return order(rng, 'Put these months in the right order', picked, {
        explanation: `They follow each other: ${picked.join(', ')}.`,
      })
    }
    const start = rng.int(0, 6)
    const picked = [0, 1, 2, 3].map((i) => DAYS[(start + i) % 7])
    return order(rng, 'Put these days in the right order', picked, {
      explanation: `Starting from ${picked[0]}: ${picked.join(', ')}.`,
    })
  },
}

const dateReading: SkillDef = {
  id: 'ng.maths.measure.dates',
  title: 'Reading dates',
  yearBand: 'b3',
  prerequisites: ['ng.maths.measure.calendar'],
  concepts: ['reading-dates'],
  hint: 'The first number is the day, then comes the month.',
  helpAtHome: 'Write the date together at the top of homework every day.',
  generate: ({ rng }): Item => {
    const m = rng.int(0, 11)
    const d = rng.int(1, DAYS_IN_MONTH[m])
    if (rng.chance(0.5)) {
      return mc(rng, `How do we say ${d}/${m + 1}/2026?`, `${ordinalShort(d)} of ${MONTHS[m]}`, [
        `${ordinalShort(m + 1)} of ${MONTHS[(d - 1) % 12]}`,
        `${ordinalShort(d)} of ${MONTHS[(m + 1) % 12]}`,
        `${ordinalShort(d + 1)} of ${MONTHS[m]}`,
      ])
    }
    return entry(`${MONTHS[m]} is which month of the year?`, m + 1, {
      maxDigits: 2,
      explanation: `${MONTHS[m]} is month number ${m + 1}.`,
    })
  },
}

export const measurementStrand: StrandDef = {
  id: 'ng.maths.measure',
  name: 'Measure Bay',
  blurb: 'Length, weight, capacity, clocks and calendars',
  theme: 'bay',
  skills: [length, timeClock, mass, capacity, timeQuarters, calendar, duration, orderEvents, dateReading],
}
