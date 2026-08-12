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

import { useEffect, useState } from 'react'
import { Btn, Card, IconBtn, Screen } from './ui'
import { useStore } from '../state/store'
import { requestCode, setParentPin } from '../lib/account'

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

      <ForgotCode />
    </Screen>
  )
}

/**
 * "I have forgotten it."
 *
 * The way out of a four-digit code with no other way out. It asks the account's
 * email address for a six-digit code, exactly as signing in does, and then lets
 * the parent choose a new grown-up code. The old one is never shown: recovery
 * here means replacing it, not being told it.
 *
 * A child can tap this all day and get no further, because the next step is in
 * their parent's inbox. That is the whole security model, and it is a better one
 * than the pad it rescues.
 *
 * Hidden entirely when this device has no account, because there would be
 * nowhere to send the code. Those families get the honest instruction instead.
 */
function ForgotCode() {
  const token = useStore((s) => s.device.authToken)
  const email = useStore((s) => s.device.parentEmail)
  const updateSettings = useStore((s) => s.updateSettings)

  const [step, setStep] = useState<'closed' | 'sending' | 'code' | 'done'>('closed')
  const [code, setCode] = useState('')
  const [pin, setPin] = useState('')
  const [note, setNote] = useState<string | null>(null)

  /*
   * Ask for the code once, when the parent opens this and not before. In an
   * effect rather than in the render body, where React would send a fresh email
   * on every re-render and twice per open in development.
   */
  useEffect(() => {
    if (step !== 'sending' || !email) return
    let cancelled = false
    void requestCode(email).then((result) => {
      if (cancelled) return
      setNote(result.ok ? null : (result.error ?? 'We could not send that just now.'))
      setStep('code')
    })
    return () => {
      cancelled = true
    }
  }, [step, email])

  if (step === 'closed') {
    return (
      <button
        onClick={() => setStep(token && email ? 'sending' : 'code')}
        className="mx-auto mt-5 block min-h-11 text-sm font-bold text-brand-400 underline decoration-2 underline-offset-2"
      >
        Forgotten the code?
      </button>
    )
  }

  if (!token || !email) {
    return (
      <Card className="mt-5 p-5">
        <p className="font-black text-brand-900">No account on this tablet</p>
        <p className="mt-1 text-sm font-semibold text-brand-600">
          A new code is emailed to the account this tablet is signed in to, and this one is not signed
          in. If you have a backup file, your code is inside it. Otherwise write to
          brainy@fortbridge.app and we will help.
        </p>
      </Card>
    )
  }

  if (step === 'sending') {
    return (
      <Card className="mt-5 p-5">
        <p className="font-black text-brand-900">Sending a code to {email}…</p>
      </Card>
    )
  }

  if (step === 'done') {
    return (
      <Card className="mt-5 p-5 border-emerald-300 bg-emerald-50">
        <p className="font-black text-emerald-900">Done. Your new code works now.</p>
        <p className="mt-1 text-sm font-semibold text-emerald-800">
          It is saved to your account too, so your other tablets will use it as well.
        </p>
      </Card>
    )
  }

  return (
    <Card className="mt-5 p-5">
      <p className="font-black text-brand-900">Check {email}</p>
      <p className="mt-1 text-sm font-semibold text-brand-600">
        We have sent a six-digit code. Type it below with the new grown-up code you would like.
      </p>

      <label htmlFor="fc-code" className="mt-3 block text-xs font-black uppercase tracking-wide text-brand-400">
        The six-digit code from your email
      </label>
      <input
        id="fc-code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        className="mt-1 h-14 w-full rounded-2xl border-2 border-brand-300 px-4 text-2xl font-black tracking-[0.3em] text-brand-900 outline-none focus:border-brand-500"
      />

      <label htmlFor="fc-pin" className="mt-3 block text-xs font-black uppercase tracking-wide text-brand-400">
        Your new four-digit grown-up code
      </label>
      <input
        id="fc-pin"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
        inputMode="numeric"
        autoComplete="off"
        className="mt-1 h-14 w-full rounded-2xl border-2 border-brand-300 px-4 text-2xl font-black tracking-[0.4em] text-brand-900 outline-none focus:border-brand-500"
      />

      {note && <p className="mt-3 text-sm font-bold text-rose-700">{note}</p>}

      <Btn
        size="md"
        full
        className="mt-4"
        disabled={code.length !== 6 || pin.length !== 4}
        onClick={async () => {
          setNote(null)
          const result = await setParentPin(token, pin, { code })
          if (!result.ok) return setNote(result.error ?? 'That did not work.')
          /* Local and account together: the pad reads the local copy, and every
             other tablet picks the new one up when it next signs in. */
          updateSettings({ parentPin: result.parentPin ?? pin })
          setStep('done')
        }}
      >
        Save the new code
      </Btn>
    </Card>
  )
}
