/**
 * First run — parent-led, and account-first.
 *
 * Addressed to the grown-up throughout. A 5-to-11-year-old cannot judge their own
 * school year, choose a curriculum or set a PIN, and a parent needs to know what
 * this thing does with their child's data before handing over a tablet. The
 * child's only decision is their character and pet, and the last step hands the
 * device over explicitly.
 *
 * Two things changed shape here, both for the same underlying reason — the app
 * used to have nowhere to put anything, and now it does:
 *
 * **The account comes second, before anything about the child.** It is what makes
 * a lost tablet recoverable and a licence portable, so asking for it after a
 * parent has already invested five screens of effort gets it skipped. Signing in
 * is also the *only* thing on this screen a returning parent needs, which is why
 * it is offered on the very first one.
 *
 * **Installing is offered first of all.** On iOS a home-screen app has its own
 * storage container, so setting up in Safari and installing afterwards means
 * starting over. Doing it in this order costs nothing and removes the problem.
 *
 * The order of the rest is deliberate too: nothing about the child is entered
 * until the grown-up's own business is settled, so a parent who abandons setup
 * half way has told us nothing about a child.
 */

import { useMemo, useRef, useState } from 'react'
import { ageOptions, bandForAge, listCurricula, playableBands } from '../engine/registry'
import { APP_NAME, CHARACTERS, PETS } from '../game/characters'
import { Character } from '../components/Character'
import { Pet } from '../components/Pet'
import { Mascot } from '../components/Mascot'
import { InstallCard } from '../components/InstallCard'
import { Btn, Card, Screen } from '../components/ui'
import { useStore } from '../state/store'
import { sfx } from '../lib/sound'
import { activate, checkout, formatMoney, prices, type Prices } from '../lib/licence'
import { pullProgress, requestCode, verifyCode } from '../lib/account'
import type { SyncLearner } from '../state/sync'

const STEPS = [
  { key: 'welcome', title: 'Welcome' },
  { key: 'account', title: 'Your account' },
  { key: 'access', title: 'What is open' },
  { key: 'child', title: 'About your child' },
  { key: 'pin', title: 'Your grown-up code' },
  { key: 'buddy', title: 'Over to them' },
] as const

const EMAIL_OK = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function Onboarding() {
  const completeOnboarding = useStore((s) => s.completeOnboarding)
  const completeRestoredSetup = useStore((s) => s.completeRestoredSetup)
  /*
   * Select the raw array and narrow it here.
   *
   * `useStore((s) => s.learners.filter(...))` allocates a new array on every
   * call, so zustand's Object.is check sees a change every time and the
   * component re-renders until React gives up — error #185, a blank app that
   * never starts. The selector has to return something referentially stable.
   */
  const allLearners = useStore((s) => s.learners)
  const restoredLearners = useMemo(
    () => allLearners.filter((l) => l.name.trim() !== ''),
    [allLearners],
  )
  /* Read through a selector, not `getState()` during render: the reference is
     stable, and this way the mascot updates if the data arrives a beat later. */
  const restoredEquipped = useStore((s) => {
    const first = s.learners.find((l) => l.name.trim() !== '')
    return first ? s.data[first.id]?.economy?.equipped : undefined
  })
  const importSave = useStore((s) => s.importSave)
  const setLicence = useStore((s) => s.setLicence)
  const signedInAction = useStore((s) => s.signedIn)
  const adoptRemote = useStore((s) => s.adoptRemote)
  const licence = useStore((s) => s.device.licence)
  const authToken = useStore((s) => s.device.authToken)
  const installId = useStore((s) => s.device.installId)

  const restoreRef = useRef<HTMLInputElement>(null)
  const [restoreNote, setRestoreNote] = useState<string | null>(null)
  const curricula = listCurricula()

  const [step, setStep] = useState(0)

  /* ---- the grown-up's account ---- */
  const [parentEmail, setParentEmail] = useState('')
  const [parentName, setParentName] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  /**
   * Set only after a request to the server has actually failed.
   *
   * An account is required — but Brainy is sold on working with no connection,
   * and a hard block would strand exactly the families in poor-coverage areas the
   * product is for, at the first screen, forever. So a *failure* opens a way past;
   * being offline is not a choice offered up front, and the grown-up area keeps
   * asking until it is done.
   */
  const [deferred, setDeferred] = useState(false)
  const signedIn = Boolean(authToken)
  /** How many children a sign-in brought back, so the flow can say so. */
  const [restoredCount, setRestoredCount] = useState(0)

  /* ---- access ---- */
  const [offer, setOffer] = useState<Prices | null>(null)
  const [accessCode, setAccessCode] = useState('')
  const [accessNote, setAccessNote] = useState<string | null>(null)

  /* ---- the child ---- */
  const [name, setName] = useState('')
  const [age, setAge] = useState<number | null>(null)
  const [curriculumId, setCurriculumId] = useState(curricula[0]?.id ?? 'ng-ube')
  /** Set only when a parent overrides the class suggested by the age. */
  const [bandOverride, setBandOverride] = useState<string | null>(null)
  const [characterId, setCharacterId] = useState(CHARACTERS[0].id)
  const [petId, setPetId] = useState(PETS[0].id)
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(true)
  /* Unticked on purpose. A pre-ticked box is not consent. */
  const [shareUsage, setShareUsage] = useState(true)
  const [done, setDone] = useState(false)

  const curriculum = curricula.find((c) => c.id === curriculumId) ?? curricula[0]
  /*
   * Only classes with something in them. The British and American packs do
   * not cover every year yet, and offering an empty one hands a child a blank
   * map with no next skill — see bandHasContent in the registry.
   */
  const bands = curriculum ? playableBands(curriculum.id) : []
  const ages = ageOptions(curriculumId)
  const suggested = age === null ? null : bandForAge(curriculumId, age)
  const effectiveBand = bandOverride ?? suggested?.id ?? ''
  const firstName = name.trim() || 'your child'
  const unlocked = licence?.full === true
  /**
   * A parent who signed in and got their family back.
   *
   * Derived from the store rather than from `restoredCount` alone, so it survives
   * a reload part-way through setup — the children are already in the save by
   * then, and asking for them again would be absurd.
   */
  const restored = restoredCount > 0 || restoredLearners.length > 0

  const canContinue = [
    true,
    signedIn || deferred,
    true,
    restored || (name.trim().length > 0 && age !== null && Boolean(effectiveBand)),
    /^\d{4}$/.test(pin),
    true,
  ][step]

  const finish = () => {
    sfx.complete()
    /*
     * The restored path never calls `completeOnboarding`: that action replaces
     * `learners` with the single child it is given, which would delete the family
     * signing in had just brought back.
     */
    if (restored) return completeRestoredSetup({ parentPin: pin, shareUsage })
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

  /** Ask for a six-digit code. Also used by "send it again". */
  const askForCode = async () => {
    setBusy('code')
    setProblem(null)
    const result = await requestCode(parentEmail.trim())
    setBusy(null)
    if (result.ok) {
      setCodeSent(true)
      setCode('')
    } else setProblem(result.error ?? 'We could not send a code.')
  }

  const submitCode = async () => {
    setBusy('verify')
    setProblem(null)
    const result = await verifyCode(parentEmail.trim(), code.trim(), parentName.trim() || undefined)
    setBusy(null)
    if (!result.ok) return setProblem(result.error ?? 'That code was not accepted.')

    signedInAction({
      token: result.token!,
      email: result.account?.email ?? parentEmail.trim(),
      keepProgress: result.account?.keepProgress,
      licence: result.licence,
    })

    /*
     * A returning parent whose account keeps progress gets their children back
     * here, before being asked to describe a child they have already described.
     * This is the answer to "I installed the app and everything was gone", and
     * skipping ahead to hand-over is the difference between recovery feeling like
     * recovery and feeling like starting again.
     */
    if (result.account?.keepProgress) {
      const held = await pullProgress(result.token!)
      if (held.ok && held.learners?.length) {
        adoptRemote(held.learners as SyncLearner[])
        setRestoredCount(held.learners.length)
      }
    }

    /* Prices are only needed once we know whether they already have access. */
    void prices().then(setOffer)
    setStep(2)
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
              {APP_NAME} gives your child short daily practice, five to ten minutes, in maths,
              reasoning and more, matched to their school year.
            </p>
            <ul className="space-y-2.5">
              {[
                ['🎯', 'It adapts', 'Questions get harder as they improve, and quietly easier when they struggle.'],
                ['📊', 'You get a report', 'See what they are strong at, what to help with, and how to help.'],
                [
                  '🔒',
                  'Your child never signs in',
                  'You have the account. They have no login, and nothing they type ever leaves the tablet.',
                ],
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

            <InstallCard />

            {/*
              The returning parent — a new tablet, or the installed app opening
              blank for the first time. This is the single most valuable button on
              the screen for them and the least interesting for everybody else, so
              it is prominent but second.
            */}
            <div className="rounded-2xl border-2 border-brand-200 bg-white p-4">
              <p className="font-black text-brand-900">Used Brainy before?</p>
              <p className="text-sm font-semibold text-brand-500 mt-0.5">
                Sign in with your email and we will put your licence back. There is no password: we send a code.
              </p>
              <Btn variant="secondary" size="md" className="mt-3" onClick={() => setStep(1)}>
                Sign in
              </Btn>
            </div>

            <div className="rounded-2xl border-2 border-brand-200 bg-white p-4">
              <p className="font-black text-brand-900">Have a backup file?</p>
              <p className="text-sm font-semibold text-brand-500 mt-0.5">
                Exported from another tablet in the grown-up area. Brings progress, coins and streaks
                across as well.
              </p>
              <Btn variant="secondary" size="md" className="mt-3" onClick={() => restoreRef.current?.click()}>
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
                <p className="mt-2 rounded-xl bg-emerald-50 p-3 font-bold text-emerald-800">{restoreNote}</p>
              )}
            </div>
          </div>
        )}

        {/* ---- 1. Account ---- */}
        {step === 1 && (
          <div className="space-y-4">
            {signedIn ? (
              <div className="rounded-2xl border-3 border-emerald-300 bg-emerald-50 p-4">
                <p className="font-black text-emerald-900">Signed in as {parentEmail.trim()}</p>
                <p className="mt-1 font-semibold text-emerald-800">
                  {unlocked
                    ? 'Every subject is open on this tablet.'
                    : 'Maths is open. You can add a code or a licence on the next screen.'}
                </p>
                {restoredCount > 0 && (
                  <p className="mt-2 font-black text-emerald-900">
                    ✓ Brought back {restoredCount === 1 ? 'your child' : `${restoredCount} children`}, with
                    their stars, coins and streak.
                  </p>
                )}
              </div>
            ) : (
              <>
                <p className="font-semibold text-brand-600">
                  This account is yours, not {firstName}&apos;s. It is how your access and their
                  progress come back if this tablet is lost, replaced, or you add a second one. We keep
                  their first name, age and scores in it for exactly that reason, never the questions
                  they got wrong or anything they type, and you can switch it off in the grown-up area
                  whenever you like. There is no password: we email you a six-digit code.
                </p>

                <div>
                  <label htmlFor="p-email" className="block font-bold text-brand-700 mb-2">
                    Your email
                  </label>
                  <input
                    id="p-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value.slice(0, 120))}
                    placeholder="you@example.com"
                    disabled={codeSent}
                    className="w-full h-14 rounded-2xl border-3 border-brand-300 bg-white px-4 text-lg
                      font-bold text-brand-900 placeholder:text-brand-200 focus:border-brand-500 outline-none
                      disabled:bg-brand-50 disabled:text-brand-500"
                  />
                </div>

                {!codeSent ? (
                  <>
                    <div>
                      <label htmlFor="p-name" className="block font-bold text-brand-700 mb-2">
                        Your name <span className="font-semibold text-brand-400">(optional)</span>
                      </label>
                      <input
                        id="p-name"
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value.slice(0, 60))}
                        placeholder="So we know what to call you"
                        className="w-full h-14 rounded-2xl border-3 border-brand-300 bg-white px-4 text-lg
                          font-bold text-brand-900 placeholder:text-brand-200 focus:border-brand-500 outline-none"
                      />
                    </div>
                    <Btn
                      size="lg"
                      full
                      disabled={!EMAIL_OK.test(parentEmail.trim()) || busy === 'code'}
                      onClick={askForCode}
                    >
                      {busy === 'code' ? 'Sending…' : 'Email me a code'}
                    </Btn>
                  </>
                ) : (
                  <>
                    <div>
                      <label htmlFor="p-code" className="block font-bold text-brand-700 mb-2">
                        The six-digit code we just emailed
                      </label>
                      <input
                        id="p-code"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                        className="w-full h-16 rounded-2xl border-3 border-brand-300 bg-white px-4 text-3xl
                          font-black tracking-[0.4em] text-brand-900 placeholder:text-brand-200
                          focus:border-brand-500 outline-none"
                      />
                      <p className="mt-2 text-sm font-semibold text-brand-500">
                        It is in the subject line too, so you may not need to open the email. Nothing
                        arrived? Check the address above for a typo. We cannot tell you whether an
                        address exists, so a mistyped one looks exactly like a slow one.
                      </p>
                    </div>
                    <Btn size="lg" full disabled={code.length !== 6 || busy === 'verify'} onClick={submitCode}>
                      {busy === 'verify' ? 'Checking…' : 'Sign in'}
                    </Btn>
                    <div className="flex gap-3">
                      <button
                        onClick={askForCode}
                        disabled={busy === 'code'}
                        className="flex-1 text-sm font-bold text-brand-500 hover:underline"
                      >
                        {busy === 'code' ? 'Sending…' : 'Send it again'}
                      </button>
                      <button
                        onClick={() => {
                          setCodeSent(false)
                          setCode('')
                          setProblem(null)
                        }}
                        className="flex-1 text-sm font-bold text-brand-500 hover:underline"
                      >
                        Use a different email
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {problem && (
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="font-bold text-amber-900">{problem}</p>
                {/*
                  Only offered once a request has actually failed. Presenting a way
                  past this screen before then would make registering look
                  optional, which is the thing this step exists to change.
                */}
                <button onClick={() => setDeferred(true)} className="mt-2 text-sm font-bold text-amber-900 underline">
                  Carry on without an account for now
                </button>
              </div>
            )}
            {deferred && !signedIn && (
              <p className="rounded-2xl bg-brand-50 p-3 text-sm font-bold text-brand-700">
                No problem. {firstName} can start now, and maths works with no account at all. The
                grown-up area will remind you, and until then a new tablet cannot get your access back.
              </p>
            )}
          </div>
        )}

        {/* ---- 2. Access ---- */}
        {step === 2 && (
          <div className="space-y-4">
            {unlocked ? (
              <div className="rounded-2xl border-3 border-emerald-300 bg-emerald-50 p-4">
                <p className="font-black text-emerald-900">
                  {licence?.plan === 'free-forever' ? 'You have one of the free family places' : 'Everything is open'}
                </p>
                <p className="mt-1 font-semibold text-emerald-800">
                  Every subject is open, for every child on this tablet.{' '}
                  {licence?.expiresAt
                    ? `Runs until ${new Date(licence.expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.`
                    : 'It never expires.'}
                </p>
                {licence?.code && (
                  <p className="mt-2 text-sm font-bold text-emerald-800">
                    Your family code is <span className="tracking-wider">{licence.code}</span>, emailed to
                    you as well.
                  </p>
                )}
              </div>
            ) : (
              <>
                <p className="font-semibold text-brand-600">
                  <b className="text-brand-900">Maths is free, permanently</b>: {firstName}&apos;s class
                  and every earlier class as revision, with no card and no time limit. The other subjects
                  need a code or a licence, and you can sort that out now or whenever you like.
                </p>

                <div className="rounded-2xl border-2 border-brand-200 bg-white p-4">
                  <p className="font-black text-brand-900">Have a code?</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value.toUpperCase().slice(0, 40))}
                      placeholder="FAMILY-7K3M"
                      autoCapitalize="characters"
                      autoComplete="off"
                      className="h-14 flex-1 min-w-[11rem] rounded-2xl border-2 border-brand-300 px-4 font-black
                        tracking-wider text-brand-900 placeholder:text-brand-200 outline-none focus:border-brand-500"
                    />
                    <Btn
                      size="md"
                      disabled={accessCode.trim().length < 4 || busy === 'redeem'}
                      onClick={async () => {
                        setBusy('redeem')
                        setAccessNote(null)
                        const result = await activate({
                          code: accessCode.trim(),
                          email: parentEmail.trim() || undefined,
                          installId,
                        })
                        setBusy(null)
                        if (result.ok && result.licence) {
                          setLicence(result.licence)
                          setAccessCode('')
                        } else setAccessNote(result.error ?? 'That code was not accepted.')
                      }}
                    >
                      {busy === 'redeem' ? 'Checking…' : 'Use it'}
                    </Btn>
                  </div>
                </div>

                {offer?.enabled && offer.plans.length > 0 && (
                  <div className="rounded-2xl border-2 border-brand-200 bg-white p-4">
                    <p className="font-black text-brand-900">Or open everything now</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {offer.plans.map((plan) => (
                        <Btn
                          key={plan.id}
                          size="md"
                          variant={plan.id === 'annual' ? 'primary' : 'secondary'}
                          disabled={!EMAIL_OK.test(parentEmail.trim()) || busy === plan.id}
                          onClick={async () => {
                            setBusy(plan.id)
                            setAccessNote(null)
                            const result = await checkout({
                              email: parentEmail.trim(),
                              plan: plan.id,
                              installId,
                            })
                            setBusy(null)
                            if (result.ok && result.url) window.location.assign(result.url)
                            else setAccessNote(result.error ?? 'Could not start the payment.')
                          }}
                        >
                          {busy === plan.id ? 'Opening…' : `${plan.label} · ${formatMoney(plan.amount, offer.currency)}`}
                        </Btn>
                      ))}
                    </div>
                    <p className="mt-2 text-xs font-semibold text-brand-400">
                      Card payment through Paystack. Prefer a bank transfer? The grown-up area takes those,
                      once setup is done.
                    </p>
                  </div>
                )}

                {accessNote && <p className="rounded-2xl bg-amber-50 p-3 font-bold text-amber-900">{accessNote}</p>}

                <p className="text-sm font-semibold text-brand-500">
                  Nothing here is required. Tap Next and {firstName} starts on maths.
                </p>
              </>
            )}
          </div>
        )}

        {/* ---- 3. The child ---- */}
        {step === 3 && restored && (
          /*
           * Nothing to ask. They told us about their children once already, and
           * asking again is what makes a recovery feel like starting over.
           */
          <div className="space-y-4">
            <div className="rounded-2xl border-3 border-emerald-300 bg-emerald-50 p-4">
              <p className="font-black text-emerald-900">
                {restoredLearners.length === 1 ? 'Your child is back' : 'Your children are back'}
              </p>
              <ul className="mt-2 space-y-1">
                {restoredLearners.map((l) => (
                  <li key={l.id} className="font-bold text-emerald-800">
                    • {l.name}
                    {l.age ? `, ${l.age}` : ''} ·{' '}
                    {curricula.find((c) => c.id === l.curriculumId)?.yearBands.find((b) => b.id === l.yearBand)
                      ?.label ?? l.yearBand}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm font-semibold text-emerald-800">
                Their stars, coins, streak and everything they had mastered came with them.
              </p>
            </div>
            <p className="text-sm font-semibold text-brand-500">
              You can add another child later in the grown-up area.
            </p>
          </div>
        )}
        {step === 3 && !restored && (
          <div className="space-y-5">
            <div>
              <label htmlFor="child-name" className="block font-bold text-brand-700 mb-2">
                Your child&apos;s first name
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

            <div>
              <p className="font-bold text-brand-700 mb-2">Which curriculum do they follow?</p>
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
                  At {age}, that is usually <span className="text-brand-900 font-black">{suggested.label}</span>.
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
                  revision either way, and you can change all of this later.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ---- 4. Grown-up code ---- */}
        {step === 4 && (
          <div>
            <label htmlFor="pin" className="block font-bold text-brand-700 mb-2">
              Choose a 4-digit code
            </label>
            {/*
              Visible while it is being chosen, unlike the same field in Settings.
              A typo here becomes a parent locked out of their own settings, and
              there is no existing secret to shield yet.
            */}
            <div className="relative">
              <input
                id="pin"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                placeholder="1234"
                className="w-full h-16 rounded-2xl border-3 border-brand-300 bg-white pl-4 pr-14 text-3xl font-black
                  tracking-[0.5em] text-brand-900 placeholder:text-brand-200 focus:border-brand-500 outline-none"
                style={{ borderWidth: 3 }}
              />
              <button
                type="button"
                onClick={() => setShowPin((v) => !v)}
                aria-pressed={showPin}
                aria-label={showPin ? 'Hide the code' : 'Show the code'}
                className="absolute right-0 top-0 grid h-16 w-12 place-items-center text-xl text-brand-400"
              >
                {showPin ? '🙈' : '👁'}
              </button>
            </div>
            <p className="mt-3 text-sm font-semibold text-brand-500">
              This guards the grown-up area, where the progress report and all the settings live:
              difficulty, session length, timers and read-aloud. Pick something {firstName} will not guess.
            </p>

            {/*
              Usage sharing, stated plainly with the box already ticked. Separate
              from the account: signing in tells us who to email, this decides
              whether anonymous counts are collected at all.
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
                    Sends how often Brainy is opened, how many questions were answered, and which topics
                    score worst, plus a random code so the same tablet is not counted twice. Never{' '}
                    {firstName}&apos;s name, age, or anything they type.
                  </span>
                  <span className="block text-sm font-semibold text-brand-500 mt-1">
                    On unless you untick it, and you can switch it off any time in the grown-up area.
                    Switching it off deletes the code and the counts kept under it.
                  </span>
                </span>
              </label>
            </div>
          </div>
        )}

        {/* ---- 5. Hand over ---- */}
        {step === 5 && !done && restored && (
          /* Their character and pet came back with them; picking again would
             overwrite something the child chose. */
          <div className="text-center py-2">
            <div className="mx-auto size-28">
              <Mascot
                characterId={restoredEquipped?.character}
                petId={restoredEquipped?.pet}
                mood="celebrate"
                variant="buddy"
                float
                className="w-full h-full"
              />
            </div>
            <p className="mt-3 font-bold text-brand-700">
              Everything is back as it was. Hand the tablet over and they can carry straight on.
            </p>
          </div>
        )}
        {step === 5 && !done && !restored && (
          <div className="space-y-5">
            <div>
              <p className="font-bold text-brand-700 mb-2">
                Last thing, and this one is {firstName}&apos;s: who would they like to be?
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

        {step === 5 && done && (
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
              /* Prices are fetched on the way into the access step, not at mount:
                 a family who never reaches it never makes the request. */
              if (step === 1 && !offer) void prices().then(setOffer)
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
                  ? 'Start playing 🚀'
                  : 'Finish setup'}
          </Btn>
        </div>
      </Card>

      {step === 0 && (
        <p className="mt-4 text-center text-xs font-semibold text-brand-400">
          Their answers and their report stay in this browser on this device and are never uploaded.
          The account holds your email, what you are entitled to, and their scores, so a new tablet
          picks up where they left off. One tap in the grown-up area stops that and deletes it.
        </p>
      )}
    </Screen>
  )
}
