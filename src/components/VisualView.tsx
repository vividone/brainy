/**
 * Renders a `Visual` descriptor as inline SVG.
 *
 * Content describes what to show, this decides how. Inline SVG keeps the
 * whole app under a megabyte with no asset pipeline (prd.md §10.1).
 */

import type { Shape2D, Shape3D, Visual } from '../engine/types'

const INK = '#4c1d95'
const FILL = '#c4b5fd'
const ACCENT = '#f59e0b'

function Frame({
  children,
  viewBox = '0 0 200 140',
  className = '',
  label,
}: {
  children: React.ReactNode
  viewBox?: string
  className?: string
  label: string
}) {
  return (
    <svg
      viewBox={viewBox}
      role="img"
      aria-label={label}
      className={`w-full h-full ${className}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {children}
    </svg>
  )
}

/* ------------------------------------------------------------------ *
 * 2D shapes
 * ------------------------------------------------------------------ */

const polygonPoints = (sides: number, cx: number, cy: number, r: number, rotate = -90): string =>
  Array.from({ length: sides }, (_, i) => {
    const a = ((rotate + (360 / sides) * i) * Math.PI) / 180
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
  }).join(' ')

function Shape2DPath({ name, fill = FILL }: { name: Shape2D; fill?: string }) {
  const common = { fill, stroke: INK, strokeWidth: 4, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'circle':
      return <circle cx="100" cy="70" r="52" {...common} />
    case 'oval':
      return <ellipse cx="100" cy="70" rx="66" ry="42" {...common} />
    case 'square':
      return <rect x="50" y="20" width="100" height="100" rx="4" {...common} />
    case 'rectangle':
      return <rect x="32" y="30" width="136" height="80" rx="4" {...common} />
    case 'triangle':
      return <polygon points="100,18 158,120 42,120" {...common} />
    case 'pentagon':
      return <polygon points={polygonPoints(5, 100, 70, 54)} {...common} />
    case 'hexagon':
      return <polygon points={polygonPoints(6, 100, 70, 54, 0)} {...common} />
    case 'octagon':
      return <polygon points={polygonPoints(8, 100, 70, 54, 22.5)} {...common} />
    case 'rhombus':
      return <polygon points="100,18 156,70 100,122 44,70" {...common} />
    case 'star':
      return (
        <polygon
          points={Array.from({ length: 10 }, (_, i) => {
            const r = i % 2 === 0 ? 56 : 24
            const a = ((-90 + 36 * i) * Math.PI) / 180
            return `${100 + r * Math.cos(a)},${70 + r * Math.sin(a)}`
          }).join(' ')}
          {...common}
        />
      )
  }
}

function Shape3DDrawing({ name }: { name: Shape3D }) {
  const face = { fill: FILL, stroke: INK, strokeWidth: 3.5, strokeLinejoin: 'round' as const }
  const top = { fill: '#ddd6fe', stroke: INK, strokeWidth: 3.5, strokeLinejoin: 'round' as const }
  const side = { fill: '#a78bfa', stroke: INK, strokeWidth: 3.5, strokeLinejoin: 'round' as const }

  switch (name) {
    case 'cube':
      return (
        <g>
          <polygon points="55,50 115,50 115,110 55,110" {...face} />
          <polygon points="55,50 80,28 140,28 115,50" {...top} />
          <polygon points="115,50 140,28 140,88 115,110" {...side} />
        </g>
      )
    case 'cuboid':
      return (
        <g>
          <polygon points="40,55 130,55 130,105 40,105" {...face} />
          <polygon points="40,55 62,32 152,32 130,55" {...top} />
          <polygon points="130,55 152,32 152,82 130,105" {...side} />
        </g>
      )
    case 'sphere':
      return (
        <g>
          <circle cx="100" cy="70" r="50" {...face} />
          <ellipse cx="100" cy="70" rx="50" ry="18" fill="none" stroke={INK} strokeWidth="2.5" strokeDasharray="5 5" />
          <circle cx="82" cy="52" r="12" fill="#ffffff" opacity="0.55" />
        </g>
      )
    case 'cylinder':
      return (
        <g>
          <path d="M55 40 L55 100 A45 16 0 0 0 145 100 L145 40 Z" {...face} />
          <ellipse cx="100" cy="40" rx="45" ry="16" {...top} />
        </g>
      )
    case 'cone':
      return (
        <g>
          <path d="M100 18 L148 104 A48 16 0 0 1 52 104 Z" {...face} />
          <ellipse cx="100" cy="104" rx="48" ry="16" {...top} />
        </g>
      )
    case 'pyramid':
      return (
        <g>
          <polygon points="100,20 150,100 50,100" {...face} />
          <polygon points="100,20 150,100 176,78" {...side} />
          <polygon points="50,100 150,100 176,78 76,78" {...top} />
        </g>
      )
  }
}

/* ------------------------------------------------------------------ *
 * The renderer
 * ------------------------------------------------------------------ */

export function VisualView({ visual }: { visual: Visual }) {
  switch (visual.kind) {
    /* ---- fractions ---- */
    case 'fraction': {
      const { parts, shaded, shape } = visual
      if (shape === 'circle') {
        const slices = Array.from({ length: parts }, (_, i) => {
          const a0 = (i / parts) * 2 * Math.PI - Math.PI / 2
          const a1 = ((i + 1) / parts) * 2 * Math.PI - Math.PI / 2
          const r = 56
          const large = a1 - a0 > Math.PI ? 1 : 0
          const d =
            parts === 1
              ? 'M100 14 A56 56 0 1 1 99.9 14 Z'
              : `M100 70 L${100 + r * Math.cos(a0)} ${70 + r * Math.sin(a0)} A${r} ${r} 0 ${large} 1 ${100 + r * Math.cos(a1)} ${70 + r * Math.sin(a1)} Z`
          return <path key={i} d={d} fill={i < shaded ? ACCENT : '#ffffff'} stroke={INK} strokeWidth="3" />
        })
        return <Frame label={`${shaded} of ${parts} parts shaded`}>{slices}</Frame>
      }
      const horizontal = shape === 'bar'
      const total = horizontal ? 176 : 100
      const cells = Array.from({ length: parts }, (_, i) => {
        const size = total / parts
        return horizontal ? (
          <rect
            key={i}
            x={12 + i * size}
            y={40}
            width={size}
            height={60}
            fill={i < shaded ? ACCENT : '#ffffff'}
            stroke={INK}
            strokeWidth="3"
          />
        ) : (
          <rect
            key={i}
            x={50}
            y={20 + i * (100 / parts)}
            width={100}
            height={100 / parts}
            fill={i < shaded ? ACCENT : '#ffffff'}
            stroke={INK}
            strokeWidth="3"
          />
        )
      })
      return <Frame label={`${shaded} of ${parts} parts shaded`}>{cells}</Frame>
    }

    case 'shape2d':
      return (
        <Frame label={`a ${visual.name}`}>
          <g transform={visual.rotate ? `rotate(${visual.rotate} 100 70)` : undefined}>
            <Shape2DPath name={visual.name} />
          </g>
        </Frame>
      )

    case 'shape3d':
      return (
        <Frame label={`a ${visual.name}`}>
          <Shape3DDrawing name={visual.name} />
        </Frame>
      )

    case 'symmetry': {
      const line =
        visual.axis === 'v'
          ? { x1: 100, y1: 8, x2: 100, y2: 132 }
          : visual.axis === 'h'
            ? { x1: 20, y1: 70, x2: 180, y2: 70 }
            : { x1: 34, y1: 128, x2: 166, y2: 12 }
      return (
        <Frame label={`a ${visual.name} with a dotted line`}>
          <Shape2DPath name={visual.name} />
          <line {...line} stroke="#dc2626" strokeWidth="4" strokeDasharray="9 7" strokeLinecap="round" />
        </Frame>
      )
    }

    /* ---- number ---- */
    case 'baseTen': {
      const blocks: React.ReactNode[] = []
      let x = 8
      for (let h = 0; h < visual.hundreds; h++) {
        blocks.push(
          <g key={`h${h}`} transform={`translate(${x} 14)`}>
            <rect width="30" height="30" fill="#8b5cf6" stroke={INK} strokeWidth="2" rx="2" />
            {[6, 12, 18, 24].map((o) => (
              <g key={o}>
                <line x1={o} y1="0" x2={o} y2="30" stroke="#ffffff" strokeWidth="1" opacity="0.6" />
                <line x1="0" y1={o} x2="30" y2={o} stroke="#ffffff" strokeWidth="1" opacity="0.6" />
              </g>
            ))}
          </g>,
        )
        x += 34
      }
      x = 8
      for (let t = 0; t < visual.tens; t++) {
        blocks.push(
          <g key={`t${t}`} transform={`translate(${x} 56)`}>
            <rect width="9" height="30" fill="#34d399" stroke={INK} strokeWidth="1.6" rx="1.5" />
            {[6, 12, 18, 24].map((o) => (
              <line key={o} x1="0" y1={o} x2="9" y2={o} stroke="#ffffff" strokeWidth="1" opacity="0.7" />
            ))}
          </g>,
        )
        x += 13
      }
      x = 8
      for (let o = 0; o < visual.ones; o++) {
        blocks.push(
          <rect
            key={`o${o}`}
            x={x}
            y={100}
            width="9"
            height="9"
            fill={ACCENT}
            stroke={INK}
            strokeWidth="1.6"
            rx="1.5"
          />,
        )
        x += 13
      }
      return (
        <Frame
          viewBox="0 0 200 125"
          label={`${visual.hundreds} hundreds, ${visual.tens} tens and ${visual.ones} units`}
        >
          {blocks}
        </Frame>
      )
    }

    case 'tally': {
      const groups = Math.floor(visual.count / 5)
      const rest = visual.count % 5
      const marks: React.ReactNode[] = []
      let gx = 12
      const drawGroup = (n: number, slash: boolean, key: string) => {
        const g: React.ReactNode[] = []
        for (let i = 0; i < n; i++) {
          g.push(<line key={`${key}-${i}`} x1={gx + i * 9} y1="24" x2={gx + i * 9} y2="72" stroke={INK} strokeWidth="5" strokeLinecap="round" />)
        }
        if (slash) g.push(<line key={`${key}-s`} x1={gx - 5} y1="70" x2={gx + 40} y2="26" stroke={INK} strokeWidth="5" strokeLinecap="round" />)
        gx += slash ? 58 : n * 9 + 14
        return g
      }
      for (let i = 0; i < groups; i++) marks.push(...(drawGroup(4, true, `g${i}`) as React.ReactNode[]))
      if (rest) marks.push(...(drawGroup(rest, false, 'r') as React.ReactNode[]))
      return (
        <Frame viewBox={`0 0 ${Math.max(200, gx + 10)} 96`} label={`tally marks showing ${visual.count}`}>
          {marks}
        </Frame>
      )
    }

    /* ---- objects ---- */
    case 'objects': {
      const perRow = visual.perRow ?? Math.min(10, Math.ceil(Math.sqrt(visual.count) * 1.6))
      const rows = Math.ceil(visual.count / perRow)
      return (
        <div
          className="grid gap-1 justify-center content-center w-full h-full"
          style={{ gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))` }}
          role="img"
          aria-label={`${visual.count} objects`}
        >
          {Array.from({ length: visual.count }, (_, i) => (
            <span
              key={i}
              className="text-center leading-none select-none"
              style={{ fontSize: `clamp(1rem, ${Math.max(1.4, 9 / Math.max(perRow, rows))}rem, 2.6rem)` }}
            >
              {visual.glyph}
            </span>
          ))}
        </div>
      )
    }

    case 'array':
      return (
        <div
          className="grid gap-1 justify-center content-center w-full h-full"
          style={{ gridTemplateColumns: `repeat(${visual.cols}, minmax(0, 1fr))` }}
          role="img"
          aria-label={`${visual.rows} rows of ${visual.cols}`}
        >
          {Array.from({ length: visual.rows * visual.cols }, (_, i) => (
            <span
              key={i}
              className="text-center leading-none"
              style={{ fontSize: `clamp(0.8rem, ${Math.max(1.1, 8 / Math.max(visual.cols, visual.rows))}rem, 2rem)` }}
            >
              {visual.glyph}
            </span>
          ))}
        </div>
      )

    case 'groups':
      return (
        <div className="flex flex-wrap gap-2 justify-center items-center w-full h-full" role="img" aria-label={`${visual.groups} groups of ${visual.per}`}>
          {Array.from({ length: visual.groups }, (_, g) => (
            <div
              key={g}
              className="rounded-2xl border-3 border-dashed border-brand-400 bg-white/70 px-2 py-1.5 grid gap-0.5"
              style={{
                gridTemplateColumns: `repeat(${Math.min(visual.per, 3)}, minmax(0, 1fr))`,
                borderWidth: 3,
              }}
            >
              {Array.from({ length: visual.per }, (_, i) => (
                <span key={i} className="text-xl sm:text-2xl leading-none text-center">
                  {visual.glyph}
                </span>
              ))}
            </div>
          ))}
        </div>
      )

    /* ---- data ---- */
    case 'pictogram':
      return (
        <div className="w-full h-full flex flex-col justify-center gap-1.5 px-1" role="img" aria-label="a pictogram">
          {visual.rows.map((row) => (
            <div key={row.label} className="flex items-center gap-2">
              <span className="w-20 sm:w-24 shrink-0 text-right text-sm sm:text-base font-bold text-brand-900 truncate">
                {row.label}
              </span>
              <span className="flex gap-0.5 text-xl sm:text-2xl leading-none">
                {Array.from({ length: row.count }, (_, i) => (
                  <span key={i}>{visual.glyph}</span>
                ))}
              </span>
            </div>
          ))}
          <div className="mt-1 text-center text-xs sm:text-sm font-bold text-brand-700">
            Key: {visual.glyph} = {visual.unit}
          </div>
        </div>
      )

    case 'barChart': {
      const max = Math.max(...visual.bars.map((b) => b.value), 1)
      const ticks = Math.min(max, 10)
      return (
        <div className="w-full h-full flex gap-2 px-2 py-1" role="img" aria-label="a bar chart">
          <div className="flex flex-col-reverse justify-between text-[10px] sm:text-xs font-bold text-brand-700 pb-6">
            {Array.from({ length: ticks + 1 }, (_, i) => (
              <span key={i}>{Math.round((max / ticks) * i)}</span>
            ))}
          </div>
          <div className="flex-1 flex items-end justify-around gap-2 border-l-3 border-b-3 border-brand-900 pb-0" style={{ borderLeftWidth: 3, borderBottomWidth: 3 }}>
            {visual.bars.map((bar, i) => (
              <div key={bar.label} className="flex-1 flex flex-col items-center justify-end h-full">
                <div
                  className="w-full max-w-14 rounded-t-lg border-2 border-brand-900"
                  style={{
                    height: `${(bar.value / max) * 82}%`,
                    background: ['#8b5cf6', '#f59e0b', '#10b981', '#f43f5e'][i % 4],
                  }}
                />
                <span className="mt-1 text-[10px] sm:text-xs font-bold text-brand-900 truncate max-w-full">
                  {bar.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    /* ---- measurement ---- */
    case 'clock': {
      const hourAngle = ((visual.hour % 12) + visual.minute / 60) * 30
      const minuteAngle = visual.minute * 6
      const hand = (angle: number, length: number, width: number) => {
        const rad = ((angle - 90) * Math.PI) / 180
        return (
          <line
            x1="70"
            y1="70"
            x2={70 + length * Math.cos(rad)}
            y2={70 + length * Math.sin(rad)}
            stroke={INK}
            strokeWidth={width}
            strokeLinecap="round"
          />
        )
      }
      return (
        <Frame viewBox="0 0 140 140" label={`a clock showing ${visual.hour}:${String(visual.minute).padStart(2, '0')}`}>
          <circle cx="70" cy="70" r="64" fill="#ffffff" stroke={INK} strokeWidth="5" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = ((i * 30 - 90) * Math.PI) / 180
            return (
              <text
                key={i}
                x={70 + 50 * Math.cos(a)}
                y={70 + 50 * Math.sin(a) + 6}
                textAnchor="middle"
                fontSize="15"
                fontWeight="800"
                fill={INK}
              >
                {i === 0 ? 12 : i}
              </text>
            )
          })}
          {Array.from({ length: 60 }, (_, i) => {
            if (i % 5 === 0) return null
            const a = ((i * 6 - 90) * Math.PI) / 180
            return (
              <circle key={i} cx={70 + 61 * Math.cos(a)} cy={70 + 61 * Math.sin(a)} r="1.2" fill="#a78bfa" />
            )
          })}
          {hand(hourAngle, 32, 7)}
          {hand(minuteAngle, 46, 4.5)}
          <circle cx="70" cy="70" r="5" fill={ACCENT} stroke={INK} strokeWidth="2.5" />
        </Frame>
      )
    }

    case 'ruler': {
      const total = visual.totalCm ?? 15
      const unit = 184 / total
      return (
        <Frame viewBox="0 0 200 110" label={`a pencil measured against a ruler, ${visual.lengthCm} centimetres`}>
          <g>
            <rect x="8" y="18" width={visual.lengthCm * unit - 12} height="16" rx="3" fill="#fcd34d" stroke={INK} strokeWidth="2.5" />
            <polygon
              points={`${8 + visual.lengthCm * unit - 12},18 ${8 + visual.lengthCm * unit},26 ${8 + visual.lengthCm * unit - 12},34`}
              fill="#fbbf24"
              stroke={INK}
              strokeWidth="2.5"
            />
          </g>
          <rect x="8" y="52" width="184" height="44" rx="4" fill="#fef3c7" stroke={INK} strokeWidth="3" />
          {Array.from({ length: total + 1 }, (_, i) => (
            <g key={i}>
              <line x1={8 + i * unit} y1="52" x2={8 + i * unit} y2={i % 5 === 0 ? 72 : 64} stroke={INK} strokeWidth="2" />
              {i % 5 === 0 && (
                <text x={8 + i * unit} y="90" textAnchor="middle" fontSize="11" fontWeight="800" fill={INK}>
                  {i}
                </text>
              )}
            </g>
          ))}
        </Frame>
      )
    }

    case 'scale': {
      const maxG = visual.maxGrams ?? 1000
      const angle = -120 + (visual.grams / maxG) * 240
      const rad = ((angle - 90) * Math.PI) / 180
      return (
        <Frame viewBox="0 0 180 140" label={`a scale showing ${visual.grams} grams`}>
          <path d="M20 120 L160 120 L150 132 L30 132 Z" fill="#a78bfa" stroke={INK} strokeWidth="3" />
          <circle cx="90" cy="70" r="52" fill="#ffffff" stroke={INK} strokeWidth="4" />
          {Array.from({ length: 11 }, (_, i) => {
            const a = ((-120 + i * 24 - 90) * Math.PI) / 180
            return (
              <g key={i}>
                <line
                  x1={90 + 40 * Math.cos(a)}
                  y1={70 + 40 * Math.sin(a)}
                  x2={90 + 47 * Math.cos(a)}
                  y2={70 + 47 * Math.sin(a)}
                  stroke={INK}
                  strokeWidth={i % 5 === 0 ? 3 : 1.5}
                />
                {i % 5 === 0 && (
                  <text
                    x={90 + 31 * Math.cos(a)}
                    y={70 + 31 * Math.sin(a) + 4}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="800"
                    fill={INK}
                  >
                    {(maxG / 10) * i}
                  </text>
                )}
              </g>
            )
          })}
          <line x1="90" y1="70" x2={90 + 38 * Math.cos(rad)} y2={70 + 38 * Math.sin(rad)} stroke="#dc2626" strokeWidth="4" strokeLinecap="round" />
          <circle cx="90" cy="70" r="5" fill={INK} />
        </Frame>
      )
    }

    case 'jug': {
      const pct = Math.min(1, visual.millilitres / visual.capacity)
      const top = 24
      const bottom = 118
      const waterTop = bottom - (bottom - top) * pct
      return (
        <Frame viewBox="0 0 160 140" label={`a jug holding ${visual.millilitres} millilitres`}>
          <rect x={waterTop < bottom ? 46 : 46} y={waterTop} width="68" height={bottom - waterTop} fill="#38bdf8" opacity="0.85" />
          <rect x="46" y={top} width="68" height={bottom - top} rx="6" fill="none" stroke={INK} strokeWidth="4" />
          <path d="M114 44 q22 6 22 24 q0 18 -22 22" fill="none" stroke={INK} strokeWidth="4" />
          {Array.from({ length: 5 }, (_, i) => {
            const y = bottom - ((i + 1) / 5) * (bottom - top)
            return (
              <g key={i}>
                <line x1="46" y1={y} x2="66" y2={y} stroke={INK} strokeWidth="2" />
                <text x="40" y={y + 4} textAnchor="end" fontSize="10" fontWeight="800" fill={INK}>
                  {Math.round(((i + 1) / 5) * visual.capacity)}
                </text>
              </g>
            )
          })}
        </Frame>
      )
    }

    case 'money':
      return (
        <div className="flex flex-wrap gap-2 justify-center items-center w-full h-full" role="img" aria-label="banknotes">
          {visual.denominations.map((d, i) => (
            <div
              key={i}
              className="rounded-lg border-3 border-emerald-800 bg-gradient-to-br from-emerald-200 to-emerald-300 px-3 py-2 shadow-sm"
              style={{ borderWidth: 3 }}
            >
              <div className="text-lg sm:text-xl font-black text-emerald-900 leading-none">
                {visual.symbol}
                {d}
              </div>
            </div>
          ))}
        </div>
      )

    /* ---- lines & angles ---- */
    case 'lineType': {
      const stroke = { stroke: INK, strokeWidth: 8, strokeLinecap: 'round' as const, fill: 'none' }
      const path =
        visual.variant === 'horizontal' ? (
          <line x1="24" y1="70" x2="176" y2="70" {...stroke} />
        ) : visual.variant === 'vertical' ? (
          <line x1="100" y1="16" x2="100" y2="124" {...stroke} />
        ) : visual.variant === 'slanting' ? (
          <line x1="32" y1="118" x2="168" y2="22" {...stroke} />
        ) : (
          <path d="M24 96 Q70 12 100 70 T176 44" {...stroke} />
        )
      return <Frame label={`a ${visual.variant} line`}>{path}</Frame>
    }

    case 'angle': {
      const rad = (visual.degrees * Math.PI) / 180
      const x = 40 + 120 * Math.cos(-rad)
      const y = 110 + 120 * Math.sin(-rad)
      const isRight = visual.degrees === 90
      return (
        <Frame label={`an angle of ${visual.degrees} degrees`}>
          <line x1="40" y1="110" x2="176" y2="110" stroke={INK} strokeWidth="7" strokeLinecap="round" />
          <line x1="40" y1="110" x2={x} y2={y} stroke={INK} strokeWidth="7" strokeLinecap="round" />
          {isRight ? (
            <rect x="40" y="86" width="24" height="24" fill="none" stroke={ACCENT} strokeWidth="4" />
          ) : (
            <path
              d={`M74 110 A34 34 0 0 ${visual.degrees > 180 ? 1 : 0} ${40 + 34 * Math.cos(-rad)} ${110 + 34 * Math.sin(-rad)}`}
              fill="none"
              stroke={ACCENT}
              strokeWidth="4"
            />
          )}
          <circle cx="40" cy="110" r="5" fill={INK} />
        </Frame>
      )
    }

    case 'text':
      return (
        <div className="w-full h-full grid place-items-center">
          <span className="text-3xl sm:text-5xl font-black text-brand-900 tracking-wide">{visual.text}</span>
        </div>
      )
  }
}
