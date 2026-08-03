/**
 * Generates the PWA icons by drawing Kolo the owl pixel by pixel and encoding
 * PNGs with Node's built-in zlib.
 *
 * Deliberately dependency-free: no sharp, no canvas, nothing to install on a
 * fresh clone, and the icons stay in sync with the mascot's colours.
 */

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const publicDir = path.join(root, 'public')
mkdirSync(publicDir, { recursive: true })

/* ---------- PNG encoding ---------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

const crc32 = (buf) => {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ---------- drawing ---------- */

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]

class Canvas {
  constructor(size) {
    this.size = size
    this.data = Buffer.alloc(size * size * 4)
  }

  /** Alpha-blended pixel write; `a` is 0-1. */
  px(x, y, [r, g, b], a = 1) {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size || a <= 0) return
    const i = (y * this.size + x) * 4
    const dstA = this.data[i + 3] / 255
    const outA = a + dstA * (1 - a)
    if (outA === 0) return
    for (let c = 0; c < 3; c++) {
      this.data[i + c] = Math.round((this.data[i + c] * dstA * (1 - a) + [r, g, b][c] * a) / outA)
    }
    this.data[i + 3] = Math.round(outA * 255)
  }

  /** Fills where `fn(x, y)` returns a signed distance <= 0, anti-aliased. */
  fill(fn, colour, alpha = 1) {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const d = fn(x + 0.5, y + 0.5)
        if (d <= 0) this.px(x, y, colour, alpha)
        else if (d < 1) this.px(x, y, colour, alpha * (1 - d))
      }
    }
  }

  circle(cx, cy, r, colour, alpha = 1) {
    this.fill((x, y) => Math.hypot(x - cx, y - cy) - r, colour, alpha)
  }

  ellipse(cx, cy, rx, ry, colour, alpha = 1) {
    this.fill((x, y) => (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry), colour, alpha)
  }

  roundedRect(x0, y0, w, h, r, colour) {
    this.fill((x, y) => {
      const dx = Math.max(x0 + r - x, 0, x - (x0 + w - r))
      const dy = Math.max(y0 + r - y, 0, y - (y0 + h - r))
      return Math.hypot(dx, dy) - r
    }, colour)
  }

  triangle(p1, p2, p3, colour) {
    const sign = (a, b, c) => (a[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (a[1] - c[1])
    this.fill((x, y) => {
      const p = [x, y]
      const d1 = sign(p, p1, p2)
      const d2 = sign(p, p2, p3)
      const d3 = sign(p, p3, p1)
      const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
      const hasPos = d1 > 0 || d2 > 0 || d3 > 0
      return hasNeg && hasPos ? 1 : 0
    }, colour)
  }
}

/** Draws the icon. `inset` leaves safe-zone padding for maskable icons. */
function drawIcon(size, { inset = 0, background = true } = {}) {
  const c = new Canvas(size)
  const u = size / 100
  const s = (1 - inset) // content scale
  const cx = size / 2

  if (background) {
    // Vertical gradient backdrop, rounded for non-maskable use.
    const top = hex('#8b5cf6')
    const bottom = hex('#5b21b6')
    for (let y = 0; y < size; y++) {
      const t = y / (size - 1)
      const colour = top.map((v, i) => Math.round(v + (bottom[i] - v) * t))
      for (let x = 0; x < size; x++) c.px(x, y, colour, 1)
    }
    if (inset === 0) {
      // Knock the corners off by clearing outside a rounded rect.
      const r = size * 0.22
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = Math.max(r - x, 0, x - (size - r))
          const dy = Math.max(r - y, 0, y - (size - r))
          const d = Math.hypot(dx, dy) - r
          if (d > 0) {
            const i = (y * size + x) * 4
            c.data[i + 3] = d >= 1 ? 0 : Math.round(255 * (1 - d))
          }
        }
      }
    }
  }

  const bodyY = 62 * u * s + size * inset * 0.5
  const headY = 44 * u * s + size * inset * 0.5
  const scale = u * s
  const body = hex('#fbbf24')
  const belly = hex('#fde68a')
  const white = hex('#ffffff')
  const ink = hex('#3b2464')
  const beak = hex('#f97316')

  // Ear tufts
  c.triangle(
    [cx - 26 * scale, headY - 18 * scale],
    [cx - 32 * scale, headY - 42 * scale],
    [cx - 8 * scale, headY - 26 * scale],
    body,
  )
  c.triangle(
    [cx + 26 * scale, headY - 18 * scale],
    [cx + 32 * scale, headY - 42 * scale],
    [cx + 8 * scale, headY - 26 * scale],
    body,
  )

  // Body and head
  c.ellipse(cx, bodyY, 30 * scale, 28 * scale, body)
  c.ellipse(cx, bodyY + 3 * scale, 19 * scale, 19 * scale, belly)
  c.circle(cx, headY, 30 * scale, body)

  // Eyes
  c.circle(cx - 12 * scale, headY - 2 * scale, 12 * scale, white)
  c.circle(cx + 12 * scale, headY - 2 * scale, 12 * scale, white)
  c.circle(cx - 12 * scale, headY - 2 * scale, 6 * scale, ink)
  c.circle(cx + 12 * scale, headY - 2 * scale, 6 * scale, ink)
  c.circle(cx - 10 * scale, headY - 4.5 * scale, 2.2 * scale, white)
  c.circle(cx + 14 * scale, headY - 4.5 * scale, 2.2 * scale, white)

  // Beak
  c.triangle(
    [cx, headY + 8 * scale],
    [cx - 6 * scale, headY + 18 * scale],
    [cx + 6 * scale, headY + 18 * scale],
    beak,
  )

  return encodePng(size, size, c.data)
}

const files = [
  ['icon-192.png', drawIcon(192)],
  ['icon-512.png', drawIcon(512)],
  ['icon-512-maskable.png', drawIcon(512, { inset: 0.22 })],
  ['apple-touch-icon.png', drawIcon(180)],
]

for (const [name, buffer] of files) {
  writeFileSync(path.join(publicDir, name), buffer)
  console.log(`wrote public/${name} (${(buffer.length / 1024).toFixed(1)} KB)`)
}

/* A crisp SVG favicon for desktop tabs. */
writeFileSync(
  path.join(publicDir, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#5b21b6"/>
  </linearGradient></defs>
  <rect width="100" height="100" rx="22" fill="url(#g)"/>
  <path d="M24 26 L20 6 L42 18 Z M76 26 L80 6 L58 18 Z" fill="#fbbf24"/>
  <ellipse cx="50" cy="64" rx="30" ry="28" fill="#fbbf24"/>
  <ellipse cx="50" cy="67" rx="19" ry="19" fill="#fde68a"/>
  <circle cx="50" cy="44" r="30" fill="#fbbf24"/>
  <circle cx="38" cy="42" r="12" fill="#fff"/><circle cx="62" cy="42" r="12" fill="#fff"/>
  <circle cx="38" cy="42" r="6" fill="#3b2464"/><circle cx="62" cy="42" r="6" fill="#3b2464"/>
  <path d="M50 52 L44 62 L56 62 Z" fill="#f97316"/>
</svg>
`,
)
console.log('wrote public/favicon.svg')
