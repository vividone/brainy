/**
 * Layout helpers for the Quantitative Reasoning figures.
 *
 * QR is a picture subject on paper — triangles, circles, boxes and pyramids
 * with numbers written into them. The engine's `Visual` kinds do not cover
 * those, and inventing new ones would mean touching the renderer, so the
 * figures are drawn in the prompt string instead.
 *
 * One catch: the session screen renders prompts with `whitespace-pre-line`,
 * which keeps newlines but collapses runs of ordinary spaces. Non-breaking
 * spaces survive, so every bit of alignment here uses those.
 */

import type { Rng } from '../../../engine/rng'

/** Non-breaking space — the only space the prompt renderer will not collapse. */
export const NB = '\u00A0'

export const pad = (n: number): string => NB.repeat(Math.max(0, n))

/**
 * A believable wrong version of `n`, for "is this right?" questions.
 *
 * Off by a little, never zero (that would make the wrong answer right) and
 * never negative, because a figure showing \u22121 announces itself as wrong
 * before the child has done any thinking.
 */
export function nearMiss(rng: Rng, n: number, spread: 1 | 2 = 1): number {
  const slips = spread === 1 ? [-2, -1, 1, 2] : [-3, -2, 2, 3]
  const safe = slips.filter((s) => n + s >= 0)
  return n + rng.pick(safe.length ? safe : [spread])
}

/** Roughly centre `s` in a field `width` wide. */
export const centre = (s: string, width: number): string =>
  pad(Math.round((width - s.length) / 2)) + s

/* ------------------------------------------------------------------ *
 * Pools
 * ------------------------------------------------------------------ */

/** Stand-in symbols for coded values. Deliberately not letters or digits. */
export const SYMBOLS: string[] = ['★', '▲', '●', '■', '◆', '♥']

/** Distinct glyphs for repeating picture patterns — no two look alike. */
export const PATTERN_GLYPHS: string[] = ['🔴', '🔵', '🟡', '🟢', '🟣', '🟠', '⭐', '🔶', '🔷', '⬛']

/** Tiles for grid figures. */
export const GRID_GLYPHS: string[] = ['🟦', '🟩', '🟨', '🟧', '⬜']

export const ARROWS: string[] = ['↑', '→', '↓', '←']
export const ARROW_WORDS: string[] = ['up', 'right', 'down', 'left']
export const COMPASS: string[] = ['North', 'East', 'South', 'West']

/** 1–3 quarter turns, named the way a primary worksheet names them. */
export const TURN_NAMES: string[] = ['no turn', 'a quarter turn', 'a half turn', 'three quarter turns']

/* ------------------------------------------------------------------ *
 * Figures
 * ------------------------------------------------------------------ */

/**
 *      7
 *    3   4
 *     (14)
 */
export function triangleFigure(
  top: number | string,
  left: number | string,
  right: number | string,
  middle: number | string,
): string {
  const width = 11
  return [
    centre(String(top), width),
    centre(`${left}${pad(5)}${right}`, width),
    centre(`(${middle})`, width),
  ].join('\n')
}

/**
 *  3      5
 *    (14)
 *  4      2
 */
export function squareFigure(
  tl: number | string,
  tr: number | string,
  bl: number | string,
  br: number | string,
  middle: number | string,
): string {
  const top = `${tl}${pad(7)}${tr}`
  return [top, centre(`(${middle})`, top.length), `${bl}${pad(7)}${br}`].join('\n')
}

/**
 * Bricks, base row first in `rows`, drawn top row first.
 *
 *     (23)
 *   (10) (13)
 *  (4) (6) (7)
 */
export function pyramidFigure(rows: (number | string)[][]): string {
  const drawn = rows.map((r) => r.map((v) => `(${v})`).join(pad(1)))
  const width = Math.max(...drawn.map((d) => d.length))
  return drawn
    .map((d) => centre(d, width))
    .reverse()
    .join('\n')
}

/** `5 → (+ 3) → ?` */
export const machineFigure = (
  input: number | string,
  ops: string[],
  output: number | string,
): string => `${input} → ${ops.map((o) => `(${o})`).join(' → ')} → ${output}`

/** `2 → 6` lines for an in/out table. */
export const pairLines = (ins: (number | string)[], outs: (number | string)[]): string =>
  ins.map((v, i) => `${v} → ${outs[i]}`).join('\n')
