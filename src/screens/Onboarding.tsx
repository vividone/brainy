/**
 * First run — parent-led.
 *
 * Deliberately addressed to the grown-up, not the child. A 5-to-11-year-old
 * cannot judge their own school year, choose a curriculum or set a PIN, and a
 * parent needs to know what this thing does with their child's data before
 * handing over a tablet. The child's only decision is their character and pet, and
 * the last step hands the device over explicitly.
 */

import { useRef, useState } from 'react'
import { ageOptions, bandForAge, listCurricula } from '../engine/registry'
import { APP_NAME, CHARACTERS, PETS } from '../game/characters'
import { Character } from '../components/Character'
import { Pet } from '../components/Pet'
import { Mascot } from '../components/Mascot'
import { Btn, Card, Screen } from '../components/ui'
import { useStore } from '../state/store'
import { sfx } from '../lib/sound'

const STEPS = [
  { key: 'welcome', title: 'Welcome' },
  { key: 'child', title: 'About your child' },
  { key: 'class', title: 'Curriculum and class' },
  { key: 'pin', title: 'Your grown-up code' },
  { key: 'buddy', title: 'Over to them' },
] as const

export function Onboarding() {
  const completeOnboarding = useStore((s) => s.completeOnboarding)
  const importSave = useStore((s) => s.importSave)
  const restoreRef = useRef<HTMLInputElement>(null)
  const [restoreNote, setRestoreNote] = useState<string | null>(null)
  const curricula = listCurricula()

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [age, setAge] = useState<number | null>(null)
  const [curriculumId, setCurriculumId] = useState(curricula[0]?.id ?? 'ng-ube')
  /** Set only when a parent overrides the class suggested by the age. */
  const [bandOverride, setBandOverride] = useState<string | null>(null)
  const [characterId, setCharacterId] = useState(CHARACTERS[0].id)
  const [petId, setPetId] = useState(PETS[0].id)
  const [pin, setPin] = useState('')
  /* Unticked on purpose. A pre-ticked box is not consent. */
  const [shareUsage, setShareUsage] = useState(false)
  const [done, setDone] = useState(false)

  const curriculum = curricula.find((c) => c.id === curriculumId) ?? curricula[0]
  const bands = curriculum?.yearBands ?? []
  const ages = ageOptions(curriculumId)
  const suggested = age === null ? null : bandForAge(curriculumId, age)
  const effectiveBand = bandOverride ?? suggested?.id ?? ''
  const firstName = name.trim() || 'your child'

  const canContinue = [
    true,
    name.trim().length > 0 && age !== null,
    Boolean(effectiveBand),
    /^\d{4}$/.test(pin),
    true,
  ][step]

  const finish = () => {
    sfx.complete()
    completeOnboarding({
      name,
      curriculumId,
      yearBand: effectiveBand,
      age: age ?? undefined,
      characterId,
      petId,
      parentPin: pin,
      shareUsage,
    })
  }

  return (
    <Screen className="max-w-2xl">
      <div className="pt-4 pb-5 text-center">
        <div className="mx-auto size-24 sm:size-28">
          <Mascot characterId={characterId} petId={petId} mood="happy" variant="buddy" float className="w-full h-full" />
        </div>
        <h1 className="mt-2 text-4xl font-black text-brand-800">{APP_NAME}</h1>
        <p className="text-brand-500 font-bold">Learn. Play. Level up.</p>
      </div>

      <div className="mb-4 flex justify-center gap-2" aria-hidden>
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`h-2.5 rounded-full transition-all ${i === step ? 'w-8 bg-brand-600' : i < step ? 'w-2.5 bg-brand-400' : 'w-2.5 bg-brand-200'}`}
          />
        ))}
      </div>

      <Card className="p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-wide text-brand-400 mb-1">
          For the grown-up · step {step + 1} of {STEPS.length}
        </p>
        <h2 className="text-2xl font-black text-brand-900 mb-4">{STEPS[step].title}</h2>

        {/* ---- 0. Welcome ---- */}
        {step === 0 && (
          <div className="space-y-4">
            <p className="font-bold text-brand-700">
              {APP_NAME} gives your child short daily practice — five to ten minutes — in maths, reasoning and
              more, matched to their school year.
            </p>
            <ul className="space-y-2.5">
              {[
                ['🎯', 'It adapts', 'Questions get harder as they improve, and quietly easier when they struggle.'],
                ['📊', 'You get a report', 'See what they are strong at, what to help with, and how to help.'],
                ['🔒', 'Nothing leaves this device', 'No account, no email, no tracking, no ads. Ever.'],
                ['✈️', 'Works offline', 'Once loaded, it plays with no internet at all.'],
              ].map(([emoji, title, body]) => (
                <li key={title} className="flex gap-3">
                  <span className="text-2xl shrink-0" aria-hidden>
                    {emoji}
                  </span>
                  <span>
                    <span className="block font-black text-brand-900">{title}</span>
                    <span className="block text-sm font-semibold text-brand-500">{body}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm font-semibold text-brand-400">Setting up takes about a minute.</p>

            {/*
              Moving from another device.

              Restoring used to mean creating a throwaway child first, because
              the grown-up area is only reachable after setup — which is
              exactly backwards for the one person who already has a backup.
            */}
            <div className="rounded-2xl border-2 border-brand-200 bg-white p-4">
              <p className="font-black text-brand-900">Already using Brainy on another device?</p>
              <p className="text-sm font-semibold text-brand-500 mt-0.5">
                Export a backup there (grown-up area → Settings), then restore it here. Everything
                comes across: progress, coins, streaks and the report.
              </p>
              <Btn
                variant="secondary"
                size="md"
                className="mt-3"
                onClick={() => restoreRef.current?.click()}
              >
                ⬆ Restore a backup
              </Btn>
              <input
                ref={restoreRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  const result = importSave(await file.text())
                  setRestoreNote(result.message)
                }}
              />
              {restoreNote && (
                <p className="mt-2 rounded-xl bg-emerald-50 p-3 font-bold text-emerald-800">
                  {restoreNote}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ---- 1. Child ---- */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label htmlFor="child-name" className="block font-bold text-brand-700 mb-2">
                Your child's first name
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
              <p className="mt-2 text-sm font-semibold text-brand-500">
                First name only, and it stays on this device. It is only used to greet them.
              </p>
            </div>

            <div>
              <p className="font-bold text-brand-700 mb-2">How old are they?</p>
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
          </div>
        )}

        {/* ---- 2. Curriculum and class ---- */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <p className="font-bold text-brand-700 mb-2">Which curriculum does {firstName} follow?</p>
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
                  Change it if {firstName} is ahead or repeating a year. Earlier classes stay available as
                  revision either way — you can change all of this later.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ---- 3. PIN ---- */}
        {step === 3 && (
          <div>
            <label htmlFor="pin" className="block font-bold text-brand-700 mb-2">
              Choose a 4-digit code
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
              This guards the grown-up area, where the progress report and all the settings live —
              difficulty, session length, timers and read-aloud. Pick something {firstName} will not guess.
            </p>

            {/*
              The one consent request, asked plainly and left unticked.
              A pre-ticked box is not consent, particularly for a children's
              product, and this is the only thing that ever leaves the device.
            */}
            <div className="mt-5 rounded-2xl border-2 border-brand-200 bg-brand-50 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareUsage}
                  onChange={(e) => setShareUsage(e.target.checked)}
                  className="mt-1 size-5 shrink-0"
                />
                <span>
                  <span className="block font-black text-brand-900">
                    Help improve Brainy with anonymous usage data
                  </span>
                  <span className="block text-sm font-semibold text-brand-600 mt-1">
                    Sends how often Brainy is opened, how many questions were answered, and which
                    topics score worst — plus a random code so the same tablet is not counted twice.
                    Never {firstName}&apos;s name, age, or anything they type.
                  </span>
                  <span className="block text-sm font-semibold text-brand-500 mt-1">
                    Entirely optional, and you can change it any time in the grown-up area.
                  </span>
                </span>
              </label>
            </div>
          </div>
        )}

        {/* ---- 4. Hand over ---- */}
        {step === 4 && !done && (
          <div className="space-y-5">
            <div>
              <p className="font-bold text-brand-700 mb-2">
                Last thing, and this one is {firstName}'s: who would they like to be?
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {CHARACTERS.filter((c) => c.price === 0).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      sfx.tap()
                      setCharacterId(c.id)
                    }}
                    aria-label={c.name}
                    className={`rounded-2xl border-3 p-1 transition ${c.id === characterId ? 'border-brand-600 bg-brand-50 scale-105' : 'border-brand-200 bg-white'}`}
                    style={{ borderWidth: 3 }}
                  >
                    <Character def={c} mood="happy" className="w-full h-16" />
                    <span className="block text-xs font-black text-brand-700">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="font-bold text-brand-700 mb-2">And a pet to come along?</p>
              <div className="grid grid-cols-3 gap-2">
                {PETS.filter((p) => p.price === 0).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      sfx.tap()
                      setPetId(p.id)
                    }}
                    aria-label={p.name}
                    className={`rounded-2xl border-3 p-1 transition ${p.id === petId ? 'border-brand-600 bg-brand-50 scale-105' : 'border-brand-200 bg-white'}`}
                    style={{ borderWidth: 3 }}
                  >
                    <Pet def={p} mood="happy" className="w-full h-16" />
                    <span className="block text-xs font-black text-brand-700">{p.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-sm font-semibold text-brand-500">
                More characters and pets can be earned with coins from playing.
              </p>
            </div>
          </div>
        )}

        {step === 4 && done && (
          <div className="text-center py-4">
            <div className="mx-auto size-32">
              <Mascot characterId={characterId} petId={petId} mood="celebrate" variant="buddy" float className="w-full h-full" />
            </div>
            <p className="mt-3 text-2xl font-black text-brand-900">All set!</p>
            <p className="mt-1 font-bold text-brand-500">
              Hand the tablet to {firstName} and let them tap Start.
            </p>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          {step > 0 && !done && (
            <Btn variant="secondary" size="lg" onClick={() => setStep(step - 1)}>
              Back
            </Btn>
          )}
          <Btn
            size="lg"
            full
            disabled={!canContinue}
            onClick={() => {
              if (step < STEPS.length - 1) return setStep(step + 1)
              if (!done) {
                sfx.unlock()
                return setDone(true)
              }
              finish()
            }}
          >
            {step === 0
              ? 'Get started'
              : step < STEPS.length - 1
                ? 'Next'
                : done
                  ? `Start playing 🚀`
                  : 'Finish setup'}
          </Btn>
        </div>
      </Card>

      {step === 0 && (
        <p className="mt-4 text-center text-xs font-semibold text-brand-400">
          {APP_NAME} stores everything in this browser on this device. It makes no network requests after
          loading, and there is nothing to sign up for.
        </p>
      )}
    </Screen>
  )
}
