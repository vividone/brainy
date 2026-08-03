/**
 * The child's avatar.
 *
 * Kept under the original name and prop surface so every existing call site
 * still works, but it now renders the *chosen character* rather than a single
 * fixed owl. The owl became one of the pets.
 */

import { Character, type Mood } from './Character'
import { Pet } from './Pet'
import { characterById, petById } from '../game/characters'

export type { Mood }

interface Props {
  /** Legacy prop from when everyone had the same owl. Ignored. */
  colour?: string
  characterId?: string
  petId?: string
  mood?: Mood
  hat?: string | null
  eyes?: string | null
  neck?: string | null
  className?: string
  float?: boolean
  /** `buddy` shows the pet alongside; `pet` shows only the pet. */
  variant?: 'character' | 'buddy' | 'pet'
}

const INK = '#3b2464'

/* Cosmetics are drawn against the character's head: centre (100, 86), r 42. */

function Hat({ id }: { id: string }) {
  const s = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round' as const }
  switch (id) {
    case 'hat.cap':
      return (
        <g>
          <path d="M62 58 q38 -34 76 0 z" fill="#ef4444" {...s} />
          <path d="M138 58 q26 2 30 12 l-32 2 z" fill="#dc2626" {...s} />
          <circle cx="100" cy="34" r="6" fill="#fbbf24" stroke={INK} strokeWidth="3" />
        </g>
      )
    case 'hat.party':
      return (
        <g>
          <polygon points="100,4 126,58 74,58" fill="#ec4899" {...s} />
          <circle cx="100" cy="6" r="7" fill="#fbbf24" stroke={INK} strokeWidth="3" />
          <circle cx="92" cy="40" r="4" fill="#fde68a" />
          <circle cx="108" cy="50" r="4" fill="#a7f3d0" />
        </g>
      )
    case 'hat.crown':
      return (
        <g>
          <path d="M64 58 L64 24 L82 42 L100 16 L118 42 L136 24 L136 58 Z" fill="#fbbf24" {...s} />
          <circle cx="100" cy="48" r="5" fill="#ef4444" stroke={INK} strokeWidth="2.5" />
          <circle cx="78" cy="52" r="4" fill="#38bdf8" stroke={INK} strokeWidth="2.5" />
          <circle cx="122" cy="52" r="4" fill="#38bdf8" stroke={INK} strokeWidth="2.5" />
        </g>
      )
    case 'hat.wizard':
      return (
        <g>
          <path d="M100 0 L132 58 L68 58 Z" fill="#4338ca" {...s} />
          <path d="M58 58 q42 12 84 0 q-42 14 -84 0 z" fill="#3730a3" {...s} />
          <path d="M96 26 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z" fill="#fde047" />
        </g>
      )
    case 'hat.cowboy':
      return (
        <g>
          <path d="M72 54 q4 -28 28 -28 q24 0 28 28 z" fill="#a16207" {...s} />
          <path d="M48 58 q52 16 104 0 q-52 12 -104 0 z" fill="#854d0e" {...s} />
          <rect x="72" y="46" width="56" height="9" fill="#facc15" stroke={INK} strokeWidth="2.5" />
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
          <circle cx="84" cy="88" r="15" />
          <circle cx="116" cy="88" r="15" />
          <line x1="99" y1="88" x2="101" y2="88" />
          <line x1="69" y1="86" x2="60" y2="84" />
          <line x1="131" y1="86" x2="140" y2="84" />
        </g>
      )
    case 'eyes.shades':
      return (
        <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
          <path d="M66 80 h28 a4 4 0 0 1 4 4 v6 a9 9 0 0 1 -18 3 l-14 -7 z" fill="#1f2937" />
          <path d="M134 80 h-28 a4 4 0 0 0 -4 4 v6 a9 9 0 0 0 18 3 l14 -7 z" fill="#1f2937" />
          <line x1="94" y1="82" x2="106" y2="82" />
        </g>
      )
    case 'eyes.star':
      return (
        <g stroke={INK} strokeWidth="3.5" fill="#fde047">
          {[84, 116].map((cx) => (
            <polygon
              key={cx}
              points={Array.from({ length: 10 }, (_, i) => {
                const r = i % 2 === 0 ? 15 : 7
                const a = ((-90 + 36 * i) * Math.PI) / 180
                return `${cx + r * Math.cos(a)},${88 + r * Math.sin(a)}`
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
  const s = { stroke: INK, strokeWidth: 3.5, strokeLinejoin: 'round' as const }
  switch (id) {
    case 'neck.bowtie':
      return (
        <g {...s}>
          <polygon points="100,140 80,131 80,149" fill="#ef4444" />
          <polygon points="100,140 120,131 120,149" fill="#ef4444" />
          <circle cx="100" cy="140" r="6" fill="#b91c1c" />
        </g>
      )
    case 'neck.scarf':
      return (
        <g {...s}>
          <path d="M74 138 q26 14 52 0 l4 14 q-30 16 -60 0 z" fill="#f43f5e" />
          <path d="M118 150 l14 26 -16 4 -8 -24 z" fill="#fb7185" />
        </g>
      )
    case 'neck.cape':
      return (
        <g {...s}>
          <path d="M64 140 q36 -14 72 0 l20 58 q-56 16 -112 0 z" fill="#dc2626" opacity="0.95" />
          <path d="M64 140 q36 -14 72 0 l-6 10 q-30 -10 -60 0 z" fill="#fbbf24" />
        </g>
      )
    case 'neck.medal':
      return (
        <g {...s}>
          <path d="M86 136 L100 166 L114 136" fill="none" stroke="#2563eb" strokeWidth="6" />
          <circle cx="100" cy="172" r="13" fill="#fbbf24" />
          <text x="100" y="178" textAnchor="middle" fontSize="15" fontWeight="900" fill={INK}>
            1
          </text>
        </g>
      )
    default:
      return null
  }
}

export function Mascot({
  characterId,
  petId,
  mood = 'idle',
  hat,
  eyes,
  neck,
  className = '',
  float = false,
  variant = 'character',
}: Props) {
  const character = characterById(characterId)
  const pet = petById(petId)

  if (variant === 'pet') {
    return <Pet def={pet} mood={mood} className={className} float={float} />
  }

  const avatar = (
    <Character
      def={character}
      mood={mood}
      float={float}
      className={variant === 'buddy' ? 'h-full' : className}
      hat={hat ? <Hat id={hat} /> : undefined}
      eyes={eyes ? <EyeWear id={eyes} /> : undefined}
      neck={neck ? <NeckWear id={neck} /> : undefined}
    />
  )

  if (variant !== 'buddy') return avatar

  return (
    <div className={`flex items-end justify-center gap-1 ${className}`}>
      <span className="h-full flex-1 max-w-[62%]">{avatar}</span>
      <span className="h-[62%] flex-1 max-w-[38%]">
        <Pet def={pet} mood={mood} float={float} className="w-full h-full" />
      </span>
    </div>
  )
}
