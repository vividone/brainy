/**
 * Kolo the owl. Pure SVG, themed by colour, dressed by owned cosmetics.
 *
 * Everything the shop sells is drawn here rather than loaded as an image, so
 * a new hat is a few lines of markup instead of an asset pipeline.
 */

import { colourById } from '../game/cosmetics'

export type Mood = 'idle' | 'happy' | 'sad' | 'think' | 'celebrate'

interface Props {
  colour?: string
  mood?: Mood
  hat?: string | null
  eyes?: string | null
  neck?: string | null
  className?: string
  float?: boolean
}

const INK = '#3b2464'

function Hat({ id }: { id: string }) {
  switch (id) {
    case 'hat.cap':
      return (
        <g>
          <path d="M62 62 q38 -34 76 0 z" fill="#ef4444" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <path d="M138 62 q26 2 30 12 l-32 2 z" fill="#dc2626" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <circle cx="100" cy="40" r="6" fill="#fbbf24" stroke={INK} strokeWidth="3" />
        </g>
      )
    case 'hat.party':
      return (
        <g>
          <polygon points="100,10 126,64 74,64" fill="#ec4899" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <circle cx="100" cy="10" r="7" fill="#fbbf24" stroke={INK} strokeWidth="3" />
          <circle cx="92" cy="46" r="4" fill="#fde68a" />
          <circle cx="108" cy="56" r="4" fill="#a7f3d0" />
        </g>
      )
    case 'hat.crown':
      return (
        <g>
          <path
            d="M64 62 L64 30 L82 46 L100 22 L118 46 L136 30 L136 62 Z"
            fill="#fbbf24"
            stroke={INK}
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <circle cx="100" cy="52" r="5" fill="#ef4444" stroke={INK} strokeWidth="2.5" />
          <circle cx="78" cy="56" r="4" fill="#38bdf8" stroke={INK} strokeWidth="2.5" />
          <circle cx="122" cy="56" r="4" fill="#38bdf8" stroke={INK} strokeWidth="2.5" />
        </g>
      )
    case 'hat.wizard':
      return (
        <g>
          <path d="M100 4 L132 62 L68 62 Z" fill="#4338ca" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <path d="M58 62 q42 12 84 0 q-42 14 -84 0 z" fill="#3730a3" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <path d="M96 30 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z" fill="#fde047" />
        </g>
      )
    case 'hat.cowboy':
      return (
        <g>
          <path d="M70 60 q4 -30 30 -30 q26 0 30 30 z" fill="#a16207" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <path d="M46 62 q54 16 108 0 q-54 12 -108 0 z" fill="#854d0e" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <rect x="70" y="52" width="60" height="9" fill="#facc15" stroke={INK} strokeWidth="2.5" />
        </g>
      )
    default:
      return null
  }
}

function EyeWear({ id }: { id: string }) {
  switch (id) {
    case 'eyes.round':
      return (
        <g fill="none" stroke={INK} strokeWidth="4">
          <circle cx="80" cy="96" r="19" />
          <circle cx="120" cy="96" r="19" />
          <line x1="99" y1="96" x2="101" y2="96" />
          <line x1="61" y1="94" x2="52" y2="90" />
          <line x1="139" y1="94" x2="148" y2="90" />
        </g>
      )
    case 'eyes.shades':
      return (
        <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
          <path d="M60 88 h34 a4 4 0 0 1 4 4 v8 a10 10 0 0 1 -20 4 l-18 -8 z" fill="#1f2937" />
          <path d="M140 88 h-34 a4 4 0 0 0 -4 4 v8 a10 10 0 0 0 20 4 l18 -8 z" fill="#1f2937" />
          <line x1="94" y1="90" x2="106" y2="90" />
        </g>
      )
    case 'eyes.star':
      return (
        <g stroke={INK} strokeWidth="3.5" fill="#fde047">
          {[80, 120].map((cx) => (
            <polygon
              key={cx}
              points={Array.from({ length: 10 }, (_, i) => {
                const r = i % 2 === 0 ? 20 : 9
                const a = ((-90 + 36 * i) * Math.PI) / 180
                return `${cx + r * Math.cos(a)},${96 + r * Math.sin(a)}`
              }).join(' ')}
            />
          ))}
        </g>
      )
    default:
      return null
  }
}

function NeckWear({ id }: { id: string }) {
  switch (id) {
    case 'neck.bowtie':
      return (
        <g stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
          <polygon points="100,140 78,130 78,152" fill="#ef4444" />
          <polygon points="100,140 122,130 122,152" fill="#ef4444" />
          <circle cx="100" cy="141" r="6" fill="#b91c1c" />
        </g>
      )
    case 'neck.scarf':
      return (
        <g stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
          <path d="M68 136 q32 16 64 0 l4 14 q-36 18 -72 0 z" fill="#f43f5e" />
          <path d="M120 148 l14 26 -16 4 -8 -24 z" fill="#fb7185" />
        </g>
      )
    case 'neck.cape':
      return (
        <g stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
          <path d="M62 132 q38 -14 76 0 l22 62 q-60 18 -120 0 z" fill="#dc2626" opacity="0.95" />
          <path d="M62 132 q38 -14 76 0 l-6 10 q-32 -10 -64 0 z" fill="#fbbf24" />
        </g>
      )
    case 'neck.medal':
      return (
        <g stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
          <path d="M84 128 L100 158 L116 128" fill="none" stroke="#2563eb" strokeWidth="6" />
          <circle cx="100" cy="166" r="13" fill="#fbbf24" />
          <text x="100" y="172" textAnchor="middle" fontSize="15" fontWeight="900" fill={INK}>
            1
          </text>
        </g>
      )
    default:
      return null
  }
}

export function Mascot({
  colour = 'violet',
  mood = 'idle',
  hat,
  eyes,
  neck,
  className = '',
  float = false,
}: Props) {
  const c = colourById(colour)
  const hidePupils = eyes === 'eyes.shades' || eyes === 'eyes.star'

  const moodLabel: Record<Mood, string> = {
    idle: 'Kolo the owl',
    happy: 'Kolo the owl, smiling',
    sad: 'Kolo the owl, looking thoughtful',
    think: 'Kolo the owl, thinking',
    celebrate: 'Kolo the owl, celebrating',
  }

  const pupilY = mood === 'think' ? 90 : mood === 'sad' ? 100 : 96
  const wingAngle = mood === 'celebrate' ? -28 : mood === 'happy' ? -12 : 0

  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={moodLabel[mood]}
      className={`${className} ${float ? 'animate-float' : ''}`}
    >
      {/* Body */}
      <ellipse cx="100" cy="126" rx="60" ry="58" fill={c.body} stroke={INK} strokeWidth="5" />
      <ellipse cx="100" cy="136" rx="38" ry="42" fill={c.belly} stroke={INK} strokeWidth="4" />

      {/* Feet */}
      <path d="M78 178 l-10 12 M78 178 l0 14 M78 178 l10 12" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M122 178 l-10 12 M122 178 l0 14 M122 178 l10 12" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" fill="none" />

      {/* Wings */}
      <g transform={`rotate(${wingAngle} 48 120)`}>
        <ellipse cx="46" cy="126" rx="15" ry="32" fill={c.wing} stroke={INK} strokeWidth="4.5" />
      </g>
      <g transform={`rotate(${-wingAngle} 152 120)`}>
        <ellipse cx="154" cy="126" rx="15" ry="32" fill={c.wing} stroke={INK} strokeWidth="4.5" />
      </g>

      {/* Head */}
      <path d="M62 70 L70 44 L88 62 Z" fill={c.body} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M138 70 L130 44 L112 62 Z" fill={c.body} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <circle cx="100" cy="94" r="54" fill={c.body} stroke={INK} strokeWidth="5" />

      {/* Eyes */}
      {!hidePupils && (
        <>
          <circle cx="80" cy="96" r="20" fill="#ffffff" stroke={INK} strokeWidth="4" />
          <circle cx="120" cy="96" r="20" fill="#ffffff" stroke={INK} strokeWidth="4" />
          {mood === 'happy' || mood === 'celebrate' ? (
            <>
              <path d="M68 98 q12 -14 24 0" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
              <path d="M108 98 q12 -14 24 0" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="80" cy={pupilY} r="9" fill={INK} />
              <circle cx="120" cy={pupilY} r="9" fill={INK} />
              <circle cx="83.5" cy={pupilY - 3.5} r="3.2" fill="#ffffff" />
              <circle cx="123.5" cy={pupilY - 3.5} r="3.2" fill="#ffffff" />
            </>
          )}
        </>
      )}

      {/* Beak */}
      {mood === 'sad' ? (
        <path d="M92 116 q8 -6 16 0 q-8 12 -16 0 z" fill="#f59e0b" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      ) : (
        <polygon points="100,110 110,122 90,122" fill="#f59e0b" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      )}

      {/* Cheeks when pleased */}
      {(mood === 'happy' || mood === 'celebrate') && (
        <>
          <ellipse cx="58" cy="112" rx="10" ry="7" fill="#fb7185" opacity="0.55" />
          <ellipse cx="142" cy="112" rx="10" ry="7" fill="#fb7185" opacity="0.55" />
        </>
      )}

      {neck && <NeckWear id={neck} />}
      {eyes && <EyeWear id={eyes} />}
      {hat && <Hat id={hat} />}
    </svg>
  )
}

/** The mascot wired to the current save. */
export function useMascotProps(profileColour: string, equipped: Partial<Record<string, string>>) {
  return {
    colour: profileColour,
    hat: equipped.hat ?? null,
    eyes: equipped.eyes ?? null,
    neck: equipped.neck ?? null,
  }
}
