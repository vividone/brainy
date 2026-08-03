/** Money — naira and kobo, adding, change and shopping. */

import { numericDistractors } from '../../../engine/rng'
import type { Item, SkillDef, StrandDef } from '../../../engine/types'
import { entry, mc, money, person, thing } from '../../shared/authoring'

const recognise: SkillDef = {
  id: 'ng.maths.money.recognise',
  title: 'Naira and kobo',
  yearBand: 'b2',
  concepts: ['money-recognition'],
  hint: 'Add the notes together, starting with the biggest.',
  helpAtHome: 'Let him count out real notes and coins when you pay for something.',
  generate: ({ rng, difficulty, locale }): Item => {
    const pool = locale.currency.notes.filter((n) => n <= [50, 100, 200, 500, 1000][difficulty - 1])
    const count = Math.min(4, 1 + difficulty)
    const notes = Array.from({ length: rng.int(2, count) }, () => rng.pick(pool))
    const total = notes.reduce((a, b) => a + b, 0)

    if (rng.chance(0.6)) {
      return entry(`How much money is this?`, total, {
        prefix: locale.currency.symbol,
        visual: { kind: 'money', denominations: notes, symbol: locale.currency.symbol },
        explanation: `${notes.join(' + ')} = ${total}`,
      })
    }

    const kobo = locale.currency.subunit
    if (kobo && difficulty >= 3) {
      const nairaCount = rng.int(1, 5)
      return mc(
        rng,
        `How many ${kobo.plural} make ${money(nairaCount, locale)}?`,
        nairaCount * kobo.per,
        numericDistractors(rng, nairaCount * kobo.per, 3, { min: 10, max: 1000 }),
        { explanation: `1 naira = ${kobo.per} ${kobo.plural}, so ${nairaCount} naira = ${nairaCount * kobo.per} ${kobo.plural}.` },
      )
    }

    const [x, y] = rng.sample(pool.length >= 2 ? pool : locale.currency.notes, 2)
    const hi = Math.max(x, y)
    const lo = Math.min(x, y)
    return mc(rng, 'Which is worth more?', money(hi, locale), [money(lo, locale)], {
      explanation: `${money(hi, locale)} is more than ${money(lo, locale)}.`,
    })
  },
}

const addMoney: SkillDef = {
  id: 'ng.maths.money.add',
  title: 'Adding money',
  yearBand: 'b3',
  prerequisites: ['ng.maths.money.recognise', 'ng.maths.ops.add-2digit'],
  concepts: ['money-addition'],
  hint: 'Add it like a normal sum, then put the naira sign back on.',
  helpAtHome: 'Add up two items in the shop before checking the total.',
  generate: ({ rng, difficulty, locale }): Item => {
    const cap = [50, 100, 300, 600, 900][difficulty - 1]
    const step = difficulty <= 2 ? 5 : 1
    const a = rng.step(10, cap, step)
    const b = rng.step(10, cap, step)
    const noun1 = thing(rng, locale)
    const noun2 = thing(rng, locale)
    const who = person(rng, locale)

    return entry(
      `A ${noun1.one} costs ${money(a, locale)} and a ${noun2.one} costs ${money(b, locale)}.\nHow much does ${who} pay for both?`,
      a + b,
      {
        prefix: locale.currency.symbol,
        maxDigits: 4,
        explanation: `${a} + ${b} = ${a + b}`,
      },
    )
  },
}

const change: SkillDef = {
  id: 'ng.maths.money.change',
  title: 'Working out change',
  yearBand: 'b3',
  prerequisites: ['ng.maths.money.add', 'ng.maths.ops.sub-2digit'],
  concepts: ['money-change'],
  hint: 'Take the cost away from the money you gave.',
  helpAtHome: 'Ask him to check your change at the shop before you leave the counter.',
  generate: ({ rng, difficulty, locale }): Item => {
    const notes = locale.currency.notes.filter((n) => n >= 50)
    const paid = rng.pick(difficulty <= 2 ? notes.filter((n) => n <= 200) : notes)
    const step = difficulty <= 2 ? 10 : difficulty <= 4 ? 5 : 1
    const cost = rng.step(step, paid - step, step)
    const noun = thing(rng, locale)
    const who = person(rng, locale)

    return entry(
      `${who} buys a ${noun.one} for ${money(cost, locale)} and pays with ${money(paid, locale)}.\nHow much change?`,
      paid - cost,
      {
        prefix: locale.currency.symbol,
        maxDigits: 4,
        explanation: `${paid} − ${cost} = ${paid - cost}`,
      },
    )
  },
}

const shopping: SkillDef = {
  id: 'ng.maths.money.shopping',
  title: 'Buying and selling',
  yearBand: 'b3',
  prerequisites: ['ng.maths.money.change', 'ng.maths.ops.times-tables'],
  concepts: ['money-word-problems'],
  hint: 'Work out one step at a time. What do you need to find first?',
  helpAtHome: 'Give him a budget at the market and let him work out what fits.',
  generate: ({ rng, difficulty, locale }): Item => {
    const noun = thing(rng, locale)
    const who = person(rng, locale)
    const shop = rng.pick(locale.shops)
    const kind = rng.int(1, difficulty >= 3 ? 3 : 2)

    if (kind === 1) {
      const price = rng.step(10, [30, 50, 80, 150, 250][difficulty - 1], 5)
      const qty = rng.int(2, difficulty >= 4 ? 8 : 5)
      return entry(
        `At ${shop}, one ${noun.one} costs ${money(price, locale)}.\nHow much do ${qty} ${noun.many} cost?`,
        price * qty,
        { prefix: locale.currency.symbol, maxDigits: 4, explanation: `${price} × ${qty} = ${price * qty}` },
      )
    }

    if (kind === 2) {
      const price = rng.step(10, 100, 10)
      const budget = price * rng.int(2, 6) + rng.step(0, 50, 10)
      return entry(
        `${who} has ${money(budget, locale)}. Each ${noun.one} costs ${money(price, locale)}.\nHow many ${noun.many} can ${who} buy?`,
        Math.floor(budget / price),
        { explanation: `${budget} ÷ ${price} = ${Math.floor(budget / price)} with ${budget % price} left over.` },
      )
    }

    const cost = rng.step(20, 150, 5)
    const sold = cost + rng.step(5, 60, 5)
    return entry(
      `${who} buys a ${noun.one} for ${money(cost, locale)} and sells it for ${money(sold, locale)}.\nHow much profit?`,
      sold - cost,
      { prefix: locale.currency.symbol, explanation: `${sold} − ${cost} = ${sold - cost} profit.` },
    )
  },
}

export const moneyStrand: StrandDef = {
  id: 'ng.maths.money',
  name: 'Market Square',
  blurb: 'Naira, kobo, change and buying things',
  theme: 'city',
  skills: [recognise, addMoney, change, shopping],
}
