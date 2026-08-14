/**
 * Meteor Rush — the optional arcade round.
 *
 * A room the child chooses to walk into, never the way in. Everything else in
 * Brainy is deliberately unhurried; this is the one place that is fast, and it
 * is opt-in precisely so the rest can stay calm.
 *
 * Four rules it does not break, all of them from prd.md §6.5 and §11:
 *
 *  - **No lives, no game-over.** The round is a fixed number of meteors and
 *    always plays all of them. A meteor that gets past you costs the bonus for
 *    that meteor and nothing else — there is no counter ticking towards being
 *    shut out, and the planet takes no damage.
 *  - **It never touches the mastery model.** Answers here are not recorded as
 *    practice. A child rushing a question under time pressure gets things wrong
 *    for reasons that have nothing to do with understanding, and feeding that
 *    into the spaced-review model would poison the thing the app is actually
 *    for. It pays restoration points; it pays no coins, no XP and no streak.
 *  - **Reduced motion is a real fallback, not a degradation.** With it on there
 *    is no drift and no clock: the same meteors, the same reward, answered at
 *    whatever pace the child likes. A child who cannot use the timed version
 *    gets the whole feature, not a worse one.
 *  - **Nothing flashes.** The drift is slow and linear and the only animation on
 *    a hit is a single pop, well under 3 Hz.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildSession } from '../engine/session'
import type { Item, MultipleChoiceItem, TrueFalseItem } from '../engine/types'
import { Btn, Card, IconBtn, ProgressBar, Screen } from '../components/ui'
import { VisualView } from '../components/VisualView'
import { RUSH_SIZE } from '../game/planet'
import { buzz, sfx } from '../lib/sound'
import { useBands, useCurriculum, useProgress } from '../state/selectors'
import { useSettings } from '../state/store'

/** Seconds a meteor takes to cross the sky. Generous on purpose. */
const DRIFT_SECONDS = 14

/** Only question types a child can answer with one tap. */
type TappableItem = MultipleChoiceItem | TrueFalseItem
const isTappable = (item: Item): item is TappableItem =>
  item.type === 'multiple-choice' || item.type === 'true-false'

interface Props {
  subjectId: string
  onDone: (deflected: number, total: number) => void
  onQuit: () => void
}

export function MeteorRush({ subjectId, onDone, onQuit }: Props) {
  const curriculum = useCurriculum()
  const bands = useBands()
  const progress = useProgress()
  const settings = useSettings()

  /*
   * Honour the operating system as well as the in-app switch. A parent who has
   * set reduced motion device-wide should not have to find our toggle too.
   */
  const still =
    settings.reduceMotion ||
    (typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true)

  /*
   * Draw a round from the ordinary session builder, then keep only the
   * one-tap questions. Over-fetching and filtering is what keeps this honest:
   * the questions are real curriculum questions at the child's real level,
   * rather than a separate easier pool written to make the game feel good.
   */
  const meteors = useMemo(() => {
    const plan = buildSession({
      curriculumId: curriculum.id,
      subjectId,
      mode: 'daily',
      bands,
      progress,
      length: RUSH_SIZE * 3,
    })
    return plan.items
      .map((p) => p.item)
      .filter(isTappable)
      .slice(0, RUSH_SIZE)
  }, [curriculum.id, subjectId, bands, progress])

  const [index, setIndex] = useState(0)
  const [deflected, setDeflected] = useState(0)
  const [hit, setHit] = useState<'yes' | 'no' | null>(null)
  /** Restarts the drift animation for each new meteor. */
  const [driftKey, setDriftKey] = useState(0)
  const timer = useRef<number | null>(null)

  const current = meteors[index]
  const done = index >= meteors.length

  const clearTimer = () => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = null
  }

  const next = useCallback(
    (wasDeflected: boolean) => {
      clearTimer()
      setHit(wasDeflected ? 'yes' : 'no')
      if (wasDeflected) {
        setDeflected((d) => d + 1)
        sfx.correct()
        buzz(14)
      } else {
        sfx.whoosh()
      }

      const finalDeflected = deflected + (wasDeflected ? 1 : 0)
      const last = index + 1 >= meteors.length

      window.setTimeout(() => {
        /*
         * Paid out from here rather than from an effect watching a `done` flag.
         * StrictMode double-invokes effects in development, and an effect that
         * awards anything is a bug waiting for a second render — the same
         * reason `handleFinish` in App.tsx is wired to an event.
         */
        if (last) {
          sfx.complete()
          onDone(finalDeflected, meteors.length)
          return
        }
        setHit(null)
        setIndex((i) => i + 1)
        setDriftKey((k) => k + 1)
      }, 620)
    },
    [deflected, index, meteors.length, onDone],
  )

  /* The clock, and only when motion is allowed. A missed meteor simply drifts
     past — nothing is lost but the point it was worth. */
  useEffect(() => {
    if (still || !current || hit) return
    timer.current = window.setTimeout(() => next(false), DRIFT_SECONDS * 1000)
    return clearTimer
  }, [still, current, hit, next, driftKey])

  useEffect(() => clearTimer, [])

  if (meteors.length === 0) {
    return (
      <Screen>
        <header className="flex items-center gap-3 pt-1">
          <IconBtn label="Back" onClick={onQuit}>
            ←
          </IconBtn>
          <h1 className="flex-1 text-2xl font-black text-brand-900">☄️ Meteor Rush</h1>
        </header>
        <Card className="mt-6 p-6 text-center">
          <p className="text-5xl">🔭</p>
          <p className="mt-3 font-black text-brand-900">The sky is clear today.</p>
          <p className="mt-1 font-bold text-brand-500">
            There is nothing to practise in this class yet, so there are no meteors to send.
          </p>
          <Btn variant="secondary" size="lg" full className="mt-5" onClick={onQuit}>
            Back to Earth
          </Btn>
        </Card>
      </Screen>
    )
  }

  if (done) return null

  const answer = (correct: boolean) => {
    if (hit) return
    next(correct)
  }

  const choices: { id: string; label: string; correct: boolean }[] =
    current.type === 'multiple-choice'
      ? current.choices.map((c) => ({
          id: c.id,
          label: c.label ?? '?',
          correct: c.id === current.answerId,
        }))
      : [
          { id: 'true', label: current.trueLabel ?? 'True', correct: current.answer === true },
          { id: 'false', label: current.falseLabel ?? 'False', correct: current.answer === false },
        ]

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-slate-900 via-indigo-950 to-brand-900">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {/* Header ---------------------------------------------------- */}
        <header className="flex items-center gap-3">
          <IconBtn label="Leave Meteor Rush" onClick={onQuit}>
            ✕
          </IconBtn>
          <div className="flex-1">
            <ProgressBar
              pct={(index / meteors.length) * 100}
              className="h-4"
              barClass="bg-gradient-to-r from-amber-300 to-amber-500"
              label="Round progress"
            />
          </div>
          <span className="shrink-0 font-black text-amber-300 tabular-nums">
            ☄️ {deflected}/{meteors.length}
          </span>
        </header>

        {/* Sky --------------------------------------------------------- */}
        <div className="relative mt-4 h-36 sm:h-44 overflow-hidden rounded-3xl border-3 border-brand-500/40 bg-slate-950/50" style={{ borderWidth: 3 }}>
          <span className="absolute left-8 top-4 text-xs" aria-hidden>✨</span>
          <span className="absolute right-12 top-10 text-xs" aria-hidden>⭐</span>
          <span className="absolute left-1/3 top-16 text-xs" aria-hidden>✨</span>

          {/* The meteor. With reduced motion it simply sits there. */}
          <div
            key={driftKey}
            className={`absolute left-1/2 -translate-x-1/2 text-5xl ${
              hit === 'yes' ? 'animate-pop' : ''
            }`}
            style={
              still
                ? { top: '38%' }
                : {
                    animation: `rush-drift ${DRIFT_SECONDS}s linear forwards`,
                  }
            }
            aria-hidden
          >
            {hit === 'yes' ? '💥' : '☄️'}
          </div>

          {/* Earth along the bottom, the thing being defended. */}
          <div className="absolute inset-x-0 bottom-0 h-10 rounded-t-[100%] bg-gradient-to-t from-sky-600 to-emerald-500" />
        </div>

        {/* Question ---------------------------------------------------- */}
        <main className="mt-4 flex-1">
          <p
            className="text-center text-xl sm:text-2xl font-black text-white leading-snug"
            aria-live="polite"
          >
            {current.prompt}
          </p>

          {/*
            The visual is not decoration — "How many chickens are there?" is an
            unanswerable question without it. Rendered on a light panel because
            VisualView draws for a white background and these questions are the
            one thing on this screen a child must be able to read.
          */}
          {current.visual && (
            <div className="mx-auto mt-3 h-24 sm:h-28 w-full max-w-md rounded-2xl bg-white/95 p-2">
              <VisualView visual={current.visual} />
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            {choices.map((c) => (
              <button
                key={c.id}
                onClick={() => answer(c.correct)}
                disabled={hit !== null}
                className="min-h-16 rounded-2xl border-3 border-brand-400/50 bg-white/95 px-4 py-3 text-xl font-black text-brand-900 active:translate-y-[2px] disabled:opacity-60"
                style={{ borderWidth: 3 }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {hit === 'no' && (
            <p className="mt-4 text-center font-bold text-amber-200 animate-pop" aria-live="assertive">
              That one got past — no harm done. Here comes the next.
            </p>
          )}
        </main>

        <p className="mt-4 text-center text-xs font-bold text-brand-300">
          {still
            ? 'Take as long as you like. Nothing here is timed.'
            : 'Answer before it reaches Earth. Nothing is lost if it does.'}
        </p>
      </div>
    </div>
  )
}
