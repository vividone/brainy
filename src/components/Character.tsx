/**
 * The human character, drawn as inline SVG from a `CharacterDef`.
 *
 * Parameterised rather than hand-drawn per character: skin, hair colour,
 * hair style and outfit are inputs, so a new character is six lines of data
 * and no new artwork. Cosmetics from the shop layer on top.
 */

import type { CharacterDef, HairStyle } from '../game/characters'

const INK = '#3b2464'

export type Mood = 'idle' | 'happy' | 'sad' | 'think' | 'celebrate'

function Hair({ style, colour }: { style: HairStyle; colour: string }) {
  const stroke = { stroke: INK, strokeWidth: 3.5, strokeLinejoin: 'round' as const }
  switch (style) {
    case 'afro':
      return (
        <g>
          <circle cx="100" cy="60" r="42" fill={colour} {...stroke} />
          <circle cx="70" cy="72" r="20" fill={colour} {...stroke} />
          <circle cx="130" cy="72" r="20" fill={colour} {...stroke} />
        </g>
      )
    case 'braids':
      return (
        <g>
          <path d="M62 72 q4 -44 38 -44 q34 0 38 44 z" fill={colour} {...stroke} />
          {[68, 80, 120, 132].map((x, i) => (
            <g key={x}>
              <rect x={x - 5} y={70} width="10" height={i % 2 ? 52 : 40} rx="5" fill={colour} {...stroke} />
              <circle cx={x} cy={i % 2 ? 126 : 114} r="5" fill="#fbbf24" stroke={INK} strokeWidth="2.5" />
            </g>
          ))}
        </g>
      )
    case 'bun':
      return (
        <g>
          <circle cx="100" cy="26" r="16" fill={colour} {...stroke} />
          <path d="M62 72 q4 -42 38 -42 q34 0 38 42 z" fill={colour} {...stroke} />
        </g>
      )
    case 'curls':
      return (
        <g>
          <path d="M62 70 q4 -42 38 -42 q34 0 38 42 z" fill={colour} {...stroke} />
          {[68, 86, 114, 132].map((x) => (
            <circle key={x} cx={x} cy="40" r="13" fill={colour} {...stroke} />
          ))}
        </g>
      )
    case 'fade':
      return <path d="M64 68 q6 -34 36 -34 q30 0 36 34 q-36 -14 -72 0 z" fill={colour} {...stroke} />
    case 'ponytail':
      return (
        <g>
          <path d="M62 72 q4 -44 38 -44 q34 0 38 44 z" fill={colour} {...stroke} />
          <path d="M136 62 q28 10 24 46 q-3 22 -18 24 q10 -30 -10 -60 z" fill={colour} {...stroke} />
        </g>
      )
    case 'headscarf':
      return (
        <g>
          <path d="M58 78 q0 -50 42 -50 q42 0 42 50 q-42 -16 -84 0 z" fill={colour} {...stroke} />
          <path d="M58 78 q-6 34 14 54 q-30 -6 -32 -34 q-2 -18 18 -20 z" fill={colour} {...stroke} />
          <path d="M142 78 q6 34 -14 54 q30 -6 32 -34 q2 -18 -18 -20 z" fill={colour} {...stroke} />
        </g>
      )
    case 'locs':
      return (
        <g>
          <path d="M62 70 q4 -42 38 -42 q34 0 38 42 z" fill={colour} {...stroke} />
          {[64, 76, 124, 136].map((x, i) => (
            <rect key={x} x={x - 4} y={64} width="8" height={i % 2 ? 46 : 34} rx="4" fill={colour} {...stroke} />
          ))}
        </g>
      )
    case 'cap':
      return (
        <g>
          <path d="M62 66 q38 -36 76 0 z" fill={colour} {...stroke} />
          <path d="M138 66 q26 2 30 12 l-32 2 z" fill={colour} {...stroke} />
        </g>
      )
    case 'short':
    default:
      return <path d="M62 72 q4 -44 38 -44 q34 0 38 44 q-38 -18 -76 0 z" fill={colour} {...stroke} />
  }
}

export function Character({
  def,
  mood = 'idle',
  className = '',
  float = false,
  hat,
  eyes,
  neck,
}: {
  def: CharacterDef
  mood?: Mood
  className?: string
  float?: boolean
  hat?: React.ReactNode
  eyes?: React.ReactNode
  neck?: React.ReactNode
}) {
  const smiling = mood === 'happy' || mood === 'celebrate'
  const pupilY = mood === 'think' ? 84 : mood === 'sad' ? 92 : 88
  const armAngle = mood === 'celebrate' ? -50 : 0

  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={`${def.name}, your character`}
      className={`${className} ${float ? 'animate-float' : ''}`}
    >
      {/* Body */}
      <path
        d="M58 200 q0 -56 42 -56 q42 0 42 56 z"
        fill={def.outfit}
        stroke={INK}
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      <path d="M84 146 q16 12 32 0 l0 12 q-16 10 -32 0 z" fill={def.outfitTrim} stroke={INK} strokeWidth="3" />

      {/* Arms */}
      <g transform={`rotate(${armAngle} 60 168)`}>
        <rect x="44" y="152" width="18" height="42" rx="9" fill={def.outfit} stroke={INK} strokeWidth="4" />
        <circle cx="53" cy="196" r="9" fill={def.skin} stroke={INK} strokeWidth="3.5" />
      </g>
      <g transform={`rotate(${-armAngle} 140 168)`}>
        <rect x="138" y="152" width="18" height="42" rx="9" fill={def.outfit} stroke={INK} strokeWidth="4" />
        <circle cx="147" cy="196" r="9" fill={def.skin} stroke={INK} strokeWidth="3.5" />
      </g>

      {/* Neck and head */}
      <rect x="90" y="122" width="20" height="22" fill={def.skin} stroke={INK} strokeWidth="3.5" />
      <ellipse cx="100" cy="86" rx="42" ry="44" fill={def.skin} stroke={INK} strokeWidth="4.5" />

      {/* Ears */}
      <circle cx="58" cy="90" r="9" fill={def.skin} stroke={INK} strokeWidth="3.5" />
      <circle cx="142" cy="90" r="9" fill={def.skin} stroke={INK} strokeWidth="3.5" />

      <Hair style={def.hairStyle} colour={def.hair} />

      {/* Face */}
      {smiling ? (
        <>
          <path d="M74 86 q10 -12 20 0" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M106 86 q10 -12 20 0" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="84" cy={pupilY} rx="6" ry="7" fill={INK} />
          <ellipse cx="116" cy={pupilY} rx="6" ry="7" fill={INK} />
          <circle cx="86" cy={pupilY - 2.5} r="2" fill="#ffffff" />
          <circle cx="118" cy={pupilY - 2.5} r="2" fill="#ffffff" />
        </>
      )}

      {mood === 'sad' ? (
        <path d="M88 110 q12 -8 24 0" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      ) : (
        <path
          d={smiling ? 'M84 104 q16 18 32 0' : 'M88 106 q12 8 24 0'}
          fill="none"
          stroke={INK}
          strokeWidth="4"
          strokeLinecap="round"
        />
      )}

      {smiling && (
        <>
          <ellipse cx="68" cy="102" rx="8" ry="6" fill="#fb7185" opacity="0.5" />
          <ellipse cx="132" cy="102" rx="8" ry="6" fill="#fb7185" opacity="0.5" />
        </>
      )}

      {neck}
      {eyes}
      {hat}
    </svg>
  )
}
