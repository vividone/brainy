/**
 * The pet companion, drawn as inline SVG from a `PetDef`.
 *
 * Each species is a handful of shapes over a shared body, so the roster can
 * grow without an asset pipeline and every pet stays under a kilobyte.
 */

import type { PetDef, Species } from '../game/characters'

const INK = '#3b2464'

export type Mood = 'idle' | 'happy' | 'sad' | 'think' | 'celebrate'

function Face({ mood, cx, cy, gap = 13 }: { mood: Mood; cx: number; cy: number; gap?: number }) {
  const smiling = mood === 'happy' || mood === 'celebrate'
  if (smiling) {
    return (
      <g fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round">
        <path d={`M${cx - gap - 7} ${cy} q7 -9 14 0`} />
        <path d={`M${cx + gap - 7} ${cy} q7 -9 14 0`} />
      </g>
    )
  }
  const dy = mood === 'think' ? -3 : mood === 'sad' ? 3 : 0
  return (
    <g>
      <circle cx={cx - gap} cy={cy + dy} r="5.5" fill={INK} />
      <circle cx={cx + gap} cy={cy + dy} r="5.5" fill={INK} />
      <circle cx={cx - gap + 2} cy={cy + dy - 2} r="2" fill="#fff" />
      <circle cx={cx + gap + 2} cy={cy + dy - 2} r="2" fill="#fff" />
    </g>
  )
}

function Body({ species, def, mood }: { species: Species; def: PetDef; mood: Mood }) {
  const s = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round' as const }
  const body = def.body
  const belly = def.belly

  switch (species) {
    case 'owl':
      return (
        <g>
          <ellipse cx="100" cy="122" rx="52" ry="52" fill={body} {...s} />
          <ellipse cx="100" cy="132" rx="32" ry="36" fill={belly} {...s} />
          <path d="M66 66 L72 40 L90 60 Z M134 66 L128 40 L110 60 Z" fill={body} {...s} />
          <circle cx="100" cy="90" r="46" fill={body} {...s} />
          <circle cx="87" cy="88" r="17" fill="#fff" {...s} />
          <circle cx="113" cy="88" r="17" fill="#fff" {...s} />
          <Face mood={mood} cx={100} cy={88} gap={26} />
          <polygon points="100,102 108,113 92,113" fill="#f59e0b" {...s} />
        </g>
      )
    case 'cat':
      return (
        <g>
          <ellipse cx="100" cy="130" rx="46" ry="44" fill={body} {...s} />
          <ellipse cx="100" cy="140" rx="26" ry="28" fill={belly} {...s} />
          <path d="M66 66 L64 34 L94 56 Z M134 66 L136 34 L106 56 Z" fill={body} {...s} />
          <circle cx="100" cy="86" r="42" fill={body} {...s} />
          <Face mood={mood} cx={100} cy={84} />
          <polygon points="100,96 106,104 94,104" fill="#fb7185" {...s} />
          <g stroke={INK} strokeWidth="3" strokeLinecap="round">
            <line x1="60" y1="98" x2="38" y2="94" />
            <line x1="60" y1="104" x2="38" y2="108" />
            <line x1="140" y1="98" x2="162" y2="94" />
            <line x1="140" y1="104" x2="162" y2="108" />
          </g>
          <path d="M146 140 q28 -6 22 -38" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
        </g>
      )
    case 'dog':
      return (
        <g>
          <ellipse cx="100" cy="132" rx="46" ry="42" fill={body} {...s} />
          <ellipse cx="100" cy="142" rx="26" ry="26" fill={belly} {...s} />
          <circle cx="100" cy="86" r="42" fill={body} {...s} />
          <ellipse cx="56" cy="86" rx="14" ry="30" fill={body} {...s} />
          <ellipse cx="144" cy="86" rx="14" ry="30" fill={body} {...s} />
          <Face mood={mood} cx={100} cy={80} />
          <ellipse cx="100" cy="102" rx="16" ry="12" fill={belly} {...s} />
          <ellipse cx="100" cy="97" rx="7" ry="5" fill={INK} />
        </g>
      )
    case 'rabbit':
      return (
        <g>
          <ellipse cx="100" cy="136" rx="42" ry="40" fill={body} {...s} />
          <ellipse cx="100" cy="144" rx="24" ry="24" fill={belly} {...s} />
          <ellipse cx="82" cy="42" rx="12" ry="34" fill={body} {...s} />
          <ellipse cx="118" cy="42" rx="12" ry="34" fill={body} {...s} />
          <ellipse cx="82" cy="44" rx="6" ry="24" fill="#fbcfe8" />
          <ellipse cx="118" cy="44" rx="6" ry="24" fill="#fbcfe8" />
          <circle cx="100" cy="94" r="38" fill={body} {...s} />
          <Face mood={mood} cx={100} cy={90} />
          <polygon points="100,102 106,110 94,110" fill="#fb7185" {...s} />
        </g>
      )
    case 'chick':
      return (
        <g>
          <ellipse cx="100" cy="118" rx="48" ry="46" fill={body} {...s} />
          <ellipse cx="100" cy="128" rx="28" ry="30" fill={belly} {...s} />
          <path d="M96 62 q4 -18 10 -4" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <circle cx="100" cy="86" r="38" fill={body} {...s} />
          <Face mood={mood} cx={100} cy={82} />
          <polygon points="100,94 110,102 90,102" fill="#f97316" {...s} />
          <path d="M76 168 l-8 12 M76 168 l0 14 M76 168 l8 12" stroke="#f97316" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M124 168 l-8 12 M124 168 l0 14 M124 168 l8 12" stroke="#f97316" strokeWidth="5" strokeLinecap="round" fill="none" />
        </g>
      )
    case 'parrot':
      return (
        <g>
          <ellipse cx="100" cy="126" rx="42" ry="48" fill={body} {...s} />
          <ellipse cx="100" cy="136" rx="24" ry="32" fill={belly} {...s} />
          <path d="M92 48 q10 -22 22 -6 q-8 4 -10 16 z" fill="#ef4444" {...s} />
          <circle cx="100" cy="84" r="38" fill={body} {...s} />
          <Face mood={mood} cx={100} cy={80} />
          <path d="M100 92 q16 4 12 18 q-10 6 -16 -6 z" fill="#f59e0b" {...s} />
          <ellipse cx="148" cy="126" rx="12" ry="28" fill="#16a34a" {...s} />
        </g>
      )
    case 'goat':
      return (
        <g>
          <ellipse cx="100" cy="132" rx="46" ry="42" fill={body} {...s} />
          <ellipse cx="100" cy="142" rx="26" ry="26" fill={belly} {...s} />
          <path d="M74 56 q-16 -24 -2 -30 q10 6 10 26 z" fill="#a8a29e" {...s} />
          <path d="M126 56 q16 -24 2 -30 q-10 6 -10 26 z" fill="#a8a29e" {...s} />
          <ellipse cx="100" cy="90" rx="36" ry="40" fill={body} {...s} />
          <ellipse cx="58" cy="92" rx="14" ry="9" fill={body} {...s} />
          <ellipse cx="142" cy="92" rx="14" ry="9" fill={body} {...s} />
          <Face mood={mood} cx={100} cy={84} />
          <ellipse cx="100" cy="106" rx="13" ry="10" fill={belly} {...s} />
          <path d="M100 126 q-6 16 0 22 q6 -6 0 -22" fill="#e7e5e4" {...s} />
        </g>
      )
    case 'tortoise':
      return (
        <g>
          <ellipse cx="100" cy="132" rx="58" ry="42" fill={def.belly} {...s} />
          <path d="M46 132 a54 44 0 0 1 108 0 z" fill={body} {...s} />
          {[70, 100, 130].map((x) => (
            <path key={x} d={`M${x} 96 l14 18 l-14 18 l-14 -18 z`} fill={def.belly} stroke={INK} strokeWidth="3" />
          ))}
          <circle cx="160" cy="132" r="22" fill={def.belly} {...s} />
          <Face mood={mood} cx={164} cy={128} gap={8} />
          <ellipse cx="56" cy="168" rx="14" ry="9" fill={def.belly} {...s} />
          <ellipse cx="140" cy="168" rx="14" ry="9" fill={def.belly} {...s} />
        </g>
      )
    case 'fish':
      return (
        <g>
          <ellipse cx="94" cy="110" rx="54" ry="42" fill={body} {...s} />
          <ellipse cx="86" cy="118" rx="30" ry="24" fill={belly} {...s} />
          <path d="M148 110 l38 -28 l0 56 z" fill={body} {...s} />
          <path d="M92 68 l16 -22 l10 24 z" fill={body} {...s} />
          <Face mood={mood} cx={70} cy={102} gap={0} />
          <circle cx="70" cy="102" r="8" fill="#fff" stroke={INK} strokeWidth="3" />
          <circle cx="70" cy="102" r="4" fill={INK} />
          <path d="M48 116 q10 8 20 2" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </g>
      )
    case 'monkey':
      return (
        <g>
          <ellipse cx="100" cy="132" rx="44" ry="42" fill={body} {...s} />
          <ellipse cx="100" cy="142" rx="26" ry="26" fill={belly} {...s} />
          <circle cx="58" cy="86" r="16" fill={body} {...s} />
          <circle cx="142" cy="86" r="16" fill={body} {...s} />
          <circle cx="58" cy="86" r="8" fill={belly} />
          <circle cx="142" cy="86" r="8" fill={belly} />
          <circle cx="100" cy="88" r="40" fill={body} {...s} />
          <ellipse cx="100" cy="98" rx="28" ry="24" fill={belly} {...s} />
          <Face mood={mood} cx={100} cy={80} />
          <ellipse cx="100" cy="100" rx="5" ry="4" fill={INK} />
          <path d="M88 110 q12 10 24 0" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </g>
      )
    case 'elephant':
      return (
        <g>
          <ellipse cx="100" cy="134" rx="50" ry="42" fill={body} {...s} />
          <ellipse cx="100" cy="144" rx="28" ry="26" fill={belly} {...s} />
          <ellipse cx="54" cy="84" rx="24" ry="30" fill={body} {...s} />
          <ellipse cx="146" cy="84" rx="24" ry="30" fill={body} {...s} />
          <circle cx="100" cy="88" r="40" fill={body} {...s} />
          <Face mood={mood} cx={100} cy={80} />
          <path d="M100 100 q-4 28 10 38 q12 8 16 -6" fill="none" stroke={INK} strokeWidth="12" strokeLinecap="round" />
          <path d="M100 100 q-4 28 10 38 q12 8 16 -6" fill="none" stroke={body} strokeWidth="7" strokeLinecap="round" />
        </g>
      )
    case 'dragon':
      return (
        <g>
          <ellipse cx="100" cy="130" rx="46" ry="44" fill={body} {...s} />
          <ellipse cx="100" cy="140" rx="26" ry="28" fill={belly} {...s} />
          <path d="M60 96 L30 74 L44 118 Z" fill="#f97316" {...s} />
          <path d="M140 96 L170 74 L156 118 Z" fill="#f97316" {...s} />
          <circle cx="100" cy="84" r="40" fill={body} {...s} />
          <path d="M80 46 l8 -18 l8 18 z M104 44 l8 -18 l8 18 z" fill="#fbbf24" {...s} />
          <Face mood={mood} cx={100} cy={80} />
          <ellipse cx="100" cy="100" rx="16" ry="11" fill={belly} {...s} />
          <circle cx="94" cy="98" r="2.5" fill={INK} />
          <circle cx="106" cy="98" r="2.5" fill={INK} />
        </g>
      )
  }
}

export function Pet({
  def,
  mood = 'idle',
  className = '',
  float = false,
}: {
  def: PetDef
  mood?: Mood
  className?: string
  float?: boolean
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={def.name}
      className={`${className} ${float ? 'animate-float' : ''}`}
    >
      <Body species={def.species} def={def} mood={mood} />
    </svg>
  )
}
