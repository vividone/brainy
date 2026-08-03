/** Big on-screen number pad. The only numeric input a child ever sees. */

import { sfx } from '../lib/sound'

interface Props {
  value: string
  onChange: (next: string) => void
  onSubmit: () => void
  maxDigits?: number
  disabled?: boolean
  canSubmit: boolean
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const

export function NumberPad({ value, onChange, onSubmit, maxDigits = 4, disabled, canSubmit }: Props) {
  const press = (key: (typeof KEYS)[number]) => {
    if (disabled) return
    sfx.tap()
    if (key === 'clear') return onChange('')
    if (key === 'back') return onChange(value.slice(0, -1))
    if (value.length >= maxDigits) return
    if (value === '0') return onChange(key)
    onChange(value + key)
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {KEYS.map((key) => (
          <button
            key={key}
            onClick={() => press(key)}
            disabled={disabled}
            aria-label={key === 'back' ? 'Delete' : key === 'clear' ? 'Clear' : key}
            className={`h-16 sm:h-[4.5rem] rounded-2xl border-2 border-b-4 text-2xl sm:text-3xl font-black transition
              active:translate-y-[2px] active:border-b-2 disabled:opacity-40 disabled:pointer-events-none
              ${
                key === 'clear'
                  ? 'bg-rose-100 border-rose-300 text-rose-700'
                  : key === 'back'
                    ? 'bg-amber-100 border-amber-300 text-amber-800'
                    : 'bg-white border-brand-300 text-brand-900 hover:bg-brand-50'
              }`}
          >
            {key === 'back' ? '⌫' : key === 'clear' ? 'C' : key}
          </button>
        ))}
      </div>

      <button
        onClick={() => {
          if (!canSubmit || disabled) return
          sfx.tap()
          onSubmit()
        }}
        disabled={!canSubmit || disabled}
        className="mt-3 w-full h-16 sm:h-[4.5rem] rounded-2xl border-2 border-b-4 border-emerald-700 bg-emerald-500
          text-white text-2xl font-black transition active:translate-y-[2px] active:border-b-2
          disabled:opacity-40 disabled:pointer-events-none"
      >
        Check ✓
      </button>
    </div>
  )
}
