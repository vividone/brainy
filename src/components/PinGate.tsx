/**
 * The four-digit grown-up code pad.
 *
 * Shared by the parent zone and the lock screen so there is one place that
 * decides what the pad looks like and how a wrong code is reported.
 *
 * It is a soft gate, not a security boundary: a determined older child can
 * clear the browser's storage. It is there to stop a seven-year-old wandering
 * into settings, and to make "not now" stick without confiscating the tablet.
 */

import { useState } from 'react'
import { Card, IconBtn, Screen } from './ui'
import { useStore } from '../state/store'

interface Props {
  onPass: () => void
  onBack?: () => void
  title: string
  prompt?: string
  emoji?: string
  children?: React.ReactNode
}

export function PinGate({ onPass, onBack, title, prompt, emoji = '🔒', children }: Props) {
  const pin = useStore((s) => s.device.parentPin)
  const [entry, setEntry] = useState('')
  const [error, setError] = useState(false)

  const submit = (value: string) => {
    if (value === pin) return onPass()
    setError(true)
    setEntry('')
    window.setTimeout(() => setError(false), 600)
  }

  const press = (digit: string) => {
    const next = entry + digit
    setEntry(next)
    if (next.length === 4) window.setTimeout(() => submit(next), 120)
  }

  return (
    <Screen className="max-w-md">
      <header className="flex items-center gap-3 pt-1">
        {onBack && (
          <IconBtn label="Back" onClick={onBack}>
            ←
          </IconBtn>
        )}
        <h1 className="text-2xl font-black text-brand-900">{title}</h1>
      </header>

      {children}

      <Card className={`mt-6 p-6 text-center ${error ? 'animate-shake border-rose-400' : ''}`}>
        <p className="text-5xl">{emoji}</p>
        <p className="mt-2 font-bold text-brand-600">{prompt ?? 'Enter the 4-digit code'}</p>

        <div className="mt-4 flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`size-5 rounded-full border-2 ${i < entry.length ? 'bg-brand-600 border-brand-700' : 'border-brand-300'}`}
            />
          ))}
        </div>
        {error && <p className="mt-3 font-black text-rose-600">Not quite, try again</p>}

        <div className="mt-6 grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              onClick={() => press(d)}
              className="h-16 rounded-2xl border-2 border-b-4 border-brand-300 bg-white text-2xl font-black text-brand-900"
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => setEntry('')}
            className="h-16 rounded-2xl border-2 border-b-4 border-rose-300 bg-rose-50 font-black text-rose-700"
          >
            C
          </button>
          <button
            onClick={() => press('0')}
            className="h-16 rounded-2xl border-2 border-b-4 border-brand-300 bg-white text-2xl font-black text-brand-900"
          >
            0
          </button>
          <button
            onClick={() => setEntry(entry.slice(0, -1))}
            className="h-16 rounded-2xl border-2 border-b-4 border-amber-300 bg-amber-50 font-black text-amber-800"
          >
            ⌫
          </button>
        </div>
      </Card>
    </Screen>
  )
}
