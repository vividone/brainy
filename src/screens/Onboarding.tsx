/**
 * First run. Under 30 seconds, no email, no account (prd.md §7).
 *
 * Every step between opening the link and the first question loses a family,
 * so this asks the four things the app genuinely cannot work without.
 */

import { useState } from 'react'
import { ageOptions, bandForAge, listCurricula } from '../engine/registry'
import { MASCOT_COLOURS } from '../game/cosmetics'
import { Mascot } from '../components/Mascot'
import { Btn, Card, Screen } from '../components/ui'
import { useStore } from '../state/store'
import { sfx } from '../lib/sound'

export function Onboarding() {
  const completeOnboarding = useStore((s) => s.completeOnboarding)
  const curricula = listCurricula()

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [curriculumId, setCurriculumId] = useState(curricula[0]?.id ?? 'ng-ube')
  const [age, setAge] = useState<number | null>(null)
  /** Set only when a parent overrides the class suggested by the age. */
  const [bandOverride, setBandOverride] = useState<string | null>(null)
  const [colour, setColour] = useState('violet')
  const [pin, setPin] = useState('')

  const curriculum = curricula.find((c) => c.id === curriculumId) ?? curricula[0]
  const bands = curriculum?.yearBands ?? []
  const ages = ageOptions(curriculumId)
  const suggested = age === null ? null : bandForAge(curriculumId, age)
  const effectiveBand = bandOverride ?? suggested?.id ?? ''

  const steps = ['Who is playing?', 'How old are they?', 'Choose your buddy', 'Grown-up code']
  const canContinue = [name.trim().length > 0, Boolean(effectiveBand), true, /^\d{4}$/.test(pin)][step]

  const finish = () => {
    sfx.complete()
    completeOnboarding({
      name,
      curriculumId,
      yearBand: effectiveBand,
      age: age ?? undefined,
      colour,
      parentPin: pin,
    })
  }

  return (
    <Screen className="max-w-2xl">
      <div className="pt-4 pb-6 text-center">
        <div className="mx-auto size-28 sm:size-32">
          <Mascot colour={colour} mood="happy" float className="w-full h-full" />
        </div>
        <h1 className="mt-2 text-4xl font-black text-brand-800">Kolo</h1>
        <p className="text-brand-500 font-bold">Learn. Play. Level up.</p>
      </div>

      <div className="mb-4 flex justify-center gap-2" aria-hidden>
        {steps.map((_, i) => (
          <span
            key={i}
            className={`h-2.5 rounded-full transition-all ${i === step ? 'w-8 bg-brand-600' : i < step ? 'w-2.5 bg-brand-400' : 'w-2.5 bg-brand-200'}`}
          />
        ))}
      </div>

      <Card className="p-5 sm:p-6">
        <h2 className="text-2xl font-black text-brand-900 mb-4">{steps[step]}</h2>

        {step === 0 && (
          <div>
            <label htmlFor="child-name" className="block font-bold text-brand-700 mb-2">
              First name only
            </label>
            <input
              id="child-name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 16))}
              placeholder="e.g. Tunde"
              autoComplete="off"
              className="w-full h-16 rounded-2xl border-3 border-brand-300 bg-white px-4 text-2xl font-black
                text-brand-900 placeholder:text-brand-300 focus:border-brand-500 outline-none"
              style={{ borderWidth: 3 }}
            />
            <p className="mt-3 text-sm font-semibold text-brand-500">
              This stays on this device. Nothing is sent anywhere, and there is no account to create.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <p className="font-bold text-brand-700 mb-2">Age</p>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {ages.map((a) => (
                  <button
                    key={a}
                    onClick={() => {
                      sfx.tap()
                      setAge(a)
                      setBandOverride(null)
                    }}
                    className={`min-h-16 rounded-2xl border-3 text-xl font-black transition
                      ${a === age ? 'border-brand-600 bg-brand-100 text-brand-900' : 'border-brand-200 bg-white text-brand-700'}`}
                    style={{ borderWidth: 3 }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="font-bold text-brand-700 mb-2">Curriculum</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {curricula.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      sfx.tap()
                      setCurriculumId(c.id)
                      setBandOverride(null)
                    }}
                    className={`min-h-16 rounded-2xl border-3 px-3 text-left font-black transition
                      ${c.id === curriculumId ? 'border-brand-600 bg-brand-100 text-brand-900' : 'border-brand-200 bg-white text-brand-700'}`}
                    style={{ borderWidth: 3 }}
                  >
                    <span className="text-2xl mr-1.5">{c.flag}</span>
                    <span className="text-sm">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* The class is worked out from the age, but a parent who has held
                a child back or moved them up gets the final say. */}
            {suggested && (
              <div className="rounded-2xl bg-brand-50 border-2 border-brand-200 p-4">
                <p className="font-bold text-brand-700">
                  At {age}, that is usually{' '}
                  <span className="text-brand-900 font-black">{suggested.label}</span>.
                </p>
                <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {bands.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        sfx.tap()
                        setBandOverride(b.id)
                      }}
                      className={`min-h-14 rounded-xl border-2 font-black text-sm transition
                        ${b.id === effectiveBand ? 'border-brand-600 bg-brand-600 text-white' : 'border-brand-200 bg-white text-brand-600'}`}
                    >
                      {b.short}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-sm font-semibold text-brand-500">
                  Tap a different class if that is not right. Earlier years stay in the mix as revision,
                  so nothing goes rusty.
                </p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="grid grid-cols-3 gap-3">
              {MASCOT_COLOURS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    sfx.tap()
                    setColour(c.id)
                  }}
                  aria-label={c.name}
                  className={`rounded-2xl border-3 p-2 transition ${c.id === colour ? 'border-brand-600 bg-brand-50 scale-105' : 'border-brand-200 bg-white'}`}
                  style={{ borderWidth: 3 }}
                >
                  <Mascot colour={c.id} mood="happy" className="w-full h-20" />
                  <span className="block text-sm font-black text-brand-700">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <label htmlFor="pin" className="block font-bold text-brand-700 mb-2">
              Choose a 4-digit code for the grown-up area
            </label>
            <input
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              placeholder="1234"
              className="w-full h-16 rounded-2xl border-3 border-brand-300 bg-white px-4 text-3xl font-black
                tracking-[0.5em] text-brand-900 placeholder:text-brand-200 focus:border-brand-500 outline-none"
              style={{ borderWidth: 3 }}
            />
            <p className="mt-3 text-sm font-semibold text-brand-500">
              Progress reports and settings live behind this code, so they stay out of small hands.
            </p>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          {step > 0 && (
            <Btn variant="secondary" size="lg" onClick={() => setStep(step - 1)}>
              Back
            </Btn>
          )}
          <Btn
            size="lg"
            full
            disabled={!canContinue}
            onClick={() => (step === steps.length - 1 ? finish() : setStep(step + 1))}
          >
            {step === steps.length - 1 ? "Let's play! 🚀" : 'Next'}
          </Btn>
        </div>
      </Card>
    </Screen>
  )
}
