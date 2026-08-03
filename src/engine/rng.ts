/**
 * Seeded pseudo-random number generator.
 *
 * Every question in the app comes from one of these. Seeding means a session
 * can be replayed exactly — which is how the parent zone shows the real
 * questions a child got wrong without storing every question it ever asked.
 */

export interface Rng {
  /** Float in [0, 1). */
  next(): number
  /** Integer in [min, max], inclusive both ends. */
  int(min: number, max: number): number
  /** True with probability `p`. */
  chance(p: number): boolean
  pick<T>(items: readonly T[]): T
  /** `n` distinct items, or all of them if `n` exceeds the list length. */
  sample<T>(items: readonly T[], n: number): T[]
  shuffle<T>(items: readonly T[]): T[]
  /** Integer in [min, max] that is a multiple of `step`. */
  step(min: number, max: number, step: number): number
}

/** mulberry32 — small, fast, good enough for question generation. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const rng: Rng = {
    next,
    int: (min, max) => {
      if (max < min) [min, max] = [max, min]
      return Math.floor(next() * (max - min + 1)) + min
    },
    chance: (p) => next() < p,
    pick: (items) => {
      if (items.length === 0) throw new Error('rng.pick called with an empty list')
      return items[Math.floor(next() * items.length)]
    },
    sample: (items, n) => rng.shuffle(items).slice(0, Math.max(0, Math.min(n, items.length))),
    shuffle: (items) => {
      const out = items.slice()
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[out[i], out[j]] = [out[j], out[i]]
      }
      return out
    },
    step: (min, max, step) => {
      const lo = Math.ceil(min / step)
      const hi = Math.floor(max / step)
      return rng.int(lo, hi) * step
    },
  }

  return rng
}

export const randomSeed = (): number => Math.floor(Math.random() * 0x7fffffff)

/**
 * Build a set of plausible wrong answers around a correct numeric answer.
 *
 * Good distractors are the mistakes a child actually makes — off by one, off
 * by ten, forgot to carry — not random numbers. A child who can eliminate
 * three obviously-silly options has learned nothing.
 */
export function numericDistractors(
  rng: Rng,
  answer: number,
  count: number,
  opts: { min?: number; max?: number; near?: number[] } = {},
): number[] {
  const min = opts.min ?? 0
  const max = opts.max ?? Math.max(answer * 2, answer + 20)
  const seen = new Set<number>([answer])
  const out: number[] = []

  const candidates = [
    ...(opts.near ?? []),
    answer + 1,
    answer - 1,
    answer + 10,
    answer - 10,
    answer + 2,
    answer - 2,
    answer + 100,
    answer - 100,
    answer + 9,
    answer - 9,
    answer + 11,
    answer - 11,
  ]

  for (const c of rng.shuffle(candidates)) {
    if (out.length >= count) break
    if (!Number.isFinite(c) || seen.has(c) || c < min || c > max) continue
    seen.add(c)
    out.push(c)
  }

  // Top up with anything valid if the shaped candidates ran dry.
  let guard = 0
  while (out.length < count && guard++ < 200) {
    const c = rng.int(min, max)
    if (seen.has(c)) continue
    seen.add(c)
    out.push(c)
  }

  return out
}
