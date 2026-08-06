import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildSession } from './engine/session'
import { subjectsForBand, type Level } from './engine/registry'
import type { SessionPlan, SessionResult } from './engine/types'
import { Home } from './screens/Home'
import { Island } from './screens/Island'
import { Onboarding } from './screens/Onboarding'
import { Parent } from './screens/Parent'
import { Results } from './screens/Results'
import { Room } from './screens/Room'
import { Session } from './screens/Session'
import { Shop } from './screens/Shop'
import { Subject } from './screens/Subject'
import { WhoIsPlaying } from './screens/WhoIsPlaying'
import { Locked } from './screens/Locked'
import { Unlocked } from './screens/Unlocked'
import { useBands, useCurriculum, useProgress } from './state/selectors'
import { useLearnerData, useProfile, useSettings, useStore, type Awards } from './state/store'
import { setSoundEnabled } from './lib/sound'
import { setSpeechEnabled, setSpeechRate } from './lib/speech'
import { sendReport } from './lib/report'
import { buildWeeklySummaries, isoWeek } from './state/weekly'
import { sendEvent } from './lib/usage'
import { dayKey } from './lib/dates'
import { APP_VERSION } from './game/characters'
import { claim, daysSinceCheck, revalidate, type StoredLicence } from './lib/licence'
import { subjectOpen, useEntitlement } from './state/entitlement'
import { syncAfterSession, syncNow } from './state/syncRunner'

/** How often a stored licence is checked against the server. */
const LICENCE_RECHECK_DAYS = 7

type Route =
  | { name: 'home' }
  | { name: 'subject'; subjectId: string }
  | { name: 'island'; strandId: string; subjectId: string }
  | { name: 'session'; plan: SessionPlan }
  | { name: 'results'; result: SessionResult; awards: Awards }
  | { name: 'shop' }
  | { name: 'room' }
  | { name: 'parent' }

export default function App() {
  const onboarded = useStore((s) => s.onboarded)
  const settings = useSettings()
  const finishSession = useStore((s) => s.finishSession)

  const curriculum = useCurriculum()
  const bands = useBands()
  const progress = useProgress()
  const yearBand = useProfile().yearBand
  const seenItems = useLearnerData().seenItems

  /*
   * Ask who is playing once per app open, and decide that at mount only.
   *
   * Deriving it from the live child count meant that adding a second child in
   * the parent zone instantly threw the grown-up out onto the picker,
   * mid-task. Whether to ask is a question about how the app was opened, not
   * about how many children currently exist.
   */
  const [needsPicker, setNeedsPicker] = useState(() => useStore.getState().learners.length > 1)

  const entitlement = useEntitlement()
  const setLicence = useStore((s) => s.setLicence)
  /** Set only when a parent has just come back from paying. */
  const [justUnlocked, setJustUnlocked] = useState<StoredLicence | null>(null)
  const [payProblem, setPayProblem] = useState<string | null>(null)

  const [route, setRoute] = useState<Route>({ name: 'home' })
  /** Remembered so "Play again" can rebuild the same kind of session. */
  const [lastLaunch, setLastLaunch] = useState<{ kind: 'daily' } | { kind: 'level'; level: Level } | null>(null)

  /* Push settings into the media libraries, which are plain modules. */
  useEffect(() => setSoundEnabled(settings.sound), [settings.sound])
  useEffect(() => setSpeechEnabled(settings.speech), [settings.speech])
  useEffect(() => setSpeechRate(settings.speechRate), [settings.speechRate])

  useEffect(() => {
    document.documentElement.classList.toggle('font-dyslexic', settings.dyslexiaFont)
    document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion)
  }, [settings.dyslexiaFont, settings.reduceMotion])

  /*
   * The weekly summary, if a parent switched it on.
   *
   * Runs once per ISO week, after a short delay so it never competes with
   * the app starting up, and marks the week only on success so a failed
   * send retries next launch rather than being lost.
   */
  const locked = useStore((s) => s.device.locked)
  const device = useStore((s) => s.device)
  const markShared = useStore((s) => s.markShared)
  const markPinged = useStore((s) => s.markPinged)

  /*
   * Usage pings and the weekly summary, both behind the same opt-in.
   *
   * Delayed so they never compete with start-up, and each one records that it
   * succeeded only after it did, so a failed send retries on the next launch
   * rather than being silently lost.
   */
  useEffect(() => {
    if (!device.shareUsage || !device.installId) return
    const installId = device.installId

    const timer = window.setTimeout(async () => {
      const state = useStore.getState()
      const learner = state.learners.find((l) => l.id === state.activeLearnerId)

      if (!state.device.activationSent) {
        const ok = await sendEvent({
          installId,
          app: APP_VERSION,
          kind: 'activate',
          curriculum: learner?.curriculumId,
          yearBand: learner?.yearBand,
          children: state.learners.length,
        })
        if (ok) markPinged({ activationSent: true })
      }

      const today = dayKey()
      if (state.device.lastOpenPing !== today) {
        const ok = await sendEvent({
          installId,
          app: APP_VERSION,
          kind: 'open',
          curriculum: learner?.curriculumId,
          yearBand: learner?.yearBand,
          children: state.learners.length,
        })
        if (ok) markPinged({ lastOpenPing: today })
      }

      const week = isoWeek()
      if (state.device.lastSharedWeek !== week) {
        const children = buildWeeklySummaries(state)
        if (children.length > 0) {
          const ok = await sendReport({ type: 'weekly', week, app: APP_VERSION, children, installId })
          if (ok) markShared(week)
        }
      }
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [device.shareUsage, device.installId, device.activationSent, device.lastOpenPing, device.lastSharedWeek, markPinged, markShared])

  /*
   * Coming back from a payment.
   *
   * Paystack returns the parent to /play/?ref=…, so this is where a completed
   * checkout turns into a licence on the device that started it. It runs once
   * and strips the reference immediately: a reload should not repeat it, and a
   * payment reference has no business sitting in the address bar of a tablet
   * that gets handed to a child.
   */
  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get('ref')
    if (!reference) return

    const url = new URL(window.location.href)
    url.searchParams.delete('ref')
    window.history.replaceState({}, '', url.toString())

    let cancelled = false
    void claim(reference, useStore.getState().device.installId).then((result) => {
      if (cancelled) return
      if (result.ok && result.licence) {
        setLicence(result.licence)
        setJustUnlocked(result.licence)
      } else {
        setPayProblem(
          result.error ??
            'We could not confirm that payment. Nothing is lost. Check the grown-up area in a minute.',
        )
      }
    })
    return () => {
      cancelled = true
    }
  }, [setLicence])

  /*
   * Re-check the licence occasionally.
   *
   * Weekly rather than on every launch, delayed so it never competes with the
   * app starting, and — the important part — it can only ever *grant* or
   * confirm. A licence is dropped in exactly one case: the server positively
   * says it does not know that code. Anything else, including no answer at all,
   * leaves the family exactly as they were. See src/lib/licence.ts.
   */
  const licence = entitlement.licence
  useEffect(() => {
    if (!licence || daysSinceCheck(licence) < LICENCE_RECHECK_DAYS) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return

    const timer = window.setTimeout(async () => {
      const result = await revalidate(licence.code, useStore.getState().device.installId)
      if (result.ok && result.licence) setLicence(result.licence)
      else if (result.gone) setLicence(null)
    }, 8000)
    return () => window.clearTimeout(timer)
  }, [licence, setLicence])

  /*
   * Reconcile with the account shortly after launch.
   *
   * This is the moment that fixes "I installed the app and everything was gone":
   * a freshly installed tablet has a token in its save, asks the account what it
   * holds, and adopts it. Delayed so it never competes with the app starting, and
   * it does nothing at all unless the parent has both signed in and asked us to
   * keep progress.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void syncNow()
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [])

  /* Back button and Escape both go up one level rather than leaving the app. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setRoute((r) => {
        if (r.name === 'island') return { name: 'subject', subjectId: r.subjectId }
        if (r.name === 'subject' || r.name === 'shop' || r.name === 'room' || r.name === 'parent') {
          return { name: 'home' }
        }
        return r
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /**
   * Rotate the daily quest across whichever subjects are authored, so a week
   * covers the range rather than seven days of maths. Keyed to the date so it
   * is stable within a day — the child gets the same quest if they reopen it.
   */
  const dailySubjectId = useMemo(() => {
    const playable = subjectsForBand(curriculum.id, yearBand).filter(
      (s) =>
        s.available &&
        s.strands.some((strand) => strand.skills.length > 0) &&
        /* A daily quest that rotates into a locked subject would put the one
           screen a child taps without thinking behind a paywall. */
        subjectOpen(s.id, entitlement.full),
    )
    if (playable.length === 0) return 'maths'
    const dayIndex = Math.floor(new Date().setHours(0, 0, 0, 0) / 86_400_000)
    return playable[dayIndex % playable.length].id
  }, [curriculum.id, yearBand, entitlement.full])

  const startDaily = useCallback(() => {
    const plan = buildSession({
      curriculumId: curriculum.id,
      subjectId: dailySubjectId,
      mode: 'daily',
      bands,
      progress,
      length: settings.sessionLength,
      difficultyOverride: settings.difficultyOverride,
      avoid: seenItems,
    })
    if (plan.items.length === 0) return
    setLastLaunch({ kind: 'daily' })
    setRoute({ name: 'session', plan })
  }, [bands, curriculum.id, dailySubjectId, progress, seenItems, settings.sessionLength, settings.difficultyOverride])

  const startLevel = useCallback(
    (level: Level) => {
      /* Belt and braces: the subject screen already refuses to open a locked
         subject, but nothing that starts a session should assume that. */
      if (!subjectOpen(level.subjectId, entitlement.full)) return
      const plan = buildSession({
        curriculumId: curriculum.id,
        subjectId: level.subjectId,
        mode: level.kind === 'challenge' ? 'challenge' : 'level',
        strandId: level.strandId,
        skillId: level.skillId,
        levelKey: level.key,
        bands,
        progress,
        length: settings.sessionLength,
        difficultyOverride: settings.difficultyOverride,
        avoid: seenItems,
      })
      if (plan.items.length === 0) return
      setLastLaunch({ kind: 'level', level })
      setRoute({ name: 'session', plan })
    },
    [
      bands,
      curriculum.id,
      progress,
      seenItems,
      settings.sessionLength,
      settings.difficultyOverride,
      entitlement.full,
    ],
  )

  const handleFinish = useCallback(
    (raw: SessionResult) => {
      // Called from an event handler, not an effect, so StrictMode cannot
      // double-award coins and XP.
      const { awards, result } = finishSession(raw)
      setRoute({ name: 'results', result, awards })

      /* Upload what just happened, a couple of seconds from now. Debounced, and
         silent whether it works or not. */
      syncAfterSession()

      const { device: d } = useStore.getState()
      if (d.shareUsage && d.installId) {
        void sendEvent({
          installId: d.installId,
          app: APP_VERSION,
          kind: 'session',
          subject: result.subjectId,
          questions: result.total,
          correct: result.correctFirstTry,
          durationMs: result.durationMs,
        })
      }
    },
    [finishSession],
  )

  const playAgain = useCallback(() => {
    if (lastLaunch?.kind === 'level') startLevel(lastLaunch.level)
    else startDaily()
  }, [lastLaunch, startDaily, startLevel])

  if (!onboarded) return <Onboarding />
  /*
   * The lock sits above everything, including the child picker and any
   * session in progress. A parent who locks it means now, not after this
   * quest finishes.
   */
  if (locked) return <Locked />

  /*
   * Just back from paying. Above the child picker on purpose — the grown-up is
   * the one holding the tablet at this moment, and they need to see the code.
   */
  if (justUnlocked || payProblem) {
    return (
      <Unlocked
        licence={justUnlocked}
        problem={payProblem}
        onDone={() => {
          setJustUnlocked(null)
          setPayProblem(null)
        }}
      />
    )
  }
  if (needsPicker) {
    return (
      <WhoIsPlaying
        onPicked={() => {
          setNeedsPicker(false)
          setRoute({ name: 'home' })
        }}
      />
    )
  }

  switch (route.name) {
    case 'session':
      return (
        <Session
          key={route.plan.id}
          plan={route.plan}
          onFinish={handleFinish}
          onQuit={() => setRoute({ name: 'home' })}
        />
      )

    case 'results':
      return (
        <Results
          result={route.result}
          awards={route.awards}
          onPlayAgain={playAgain}
          onHome={() =>
            setRoute(
              route.result.strandId
                ? { name: 'island', strandId: route.result.strandId, subjectId: route.result.subjectId }
                : { name: 'home' },
            )
          }
        />
      )

    case 'subject':
      return (
        <Subject
          subjectId={route.subjectId}
          onBack={() => setRoute({ name: 'home' })}
          onOpenIsland={(strandId) => setRoute({ name: 'island', strandId, subjectId: route.subjectId })}
          onOpenParent={() => setRoute({ name: 'parent' })}
        />
      )

    case 'island':
      return (
        <Island
          strandId={route.strandId}
          onBack={() => setRoute({ name: 'subject', subjectId: route.subjectId })}
          onPlay={startLevel}
        />
      )

    case 'shop':
      return <Shop onBack={() => setRoute({ name: 'home' })} />

    case 'room':
      return <Room onBack={() => setRoute({ name: 'home' })} />

    case 'parent':
      return <Parent onBack={() => setRoute({ name: 'home' })} />

    default:
      return (
        <Home
          onOpenSubject={(subjectId) => setRoute({ name: 'subject', subjectId })}
          onDailyQuest={startDaily}
          onOpenShop={() => setRoute({ name: 'shop' })}
          onOpenRoom={() => setRoute({ name: 'room' })}
          onOpenParent={() => setRoute({ name: 'parent' })}
        />
      )
  }
}
