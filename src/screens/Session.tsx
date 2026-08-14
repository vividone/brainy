/**
 * The core screen: one question at a time.
 *
 * The no-fail rules from prd.md §5.4 live here. A wrong answer shows the
 * right one, explains it in a sentence, and re-queues a fresh question on the
 * same skill at a lower level. Nothing ever ends the session early.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  checkAnswer,
  describeAnswer,
  describeResponse,
  itemSignature,
  type Response,
} from '../engine/answer'
import { getSkill } from '../engine/registry'
import { makeRng } from '../engine/rng'
import { generateItem } from '../engine/session'
import type { AnsweredItem, Difficulty, PlannedItem, SessionPlan, SessionResult } from '../engine/types'
import { Mascot } from '../components/Mascot'
import { QuestionView, isInstantType, type AnswerStatus } from '../components/QuestionView'
import { VisualView } from '../components/VisualView'
import { Btn, IconBtn, Modal, ProgressBar } from '../components/ui'
import { CORRECT_WORDS, WRONG_WORDS } from '../game/theme'
import { buzz, sfx } from '../lib/sound'
import { cancelSpeech, speak } from '../lib/speech'
import { setSafeToReload } from '../lib/updates'
import { useLearnerData, useSettings, useStore } from '../state/store'

const REVEAL_MS = 1100
const MAX_REQUEUES = 3

interface Props {
  plan: SessionPlan
  onFinish: (result: SessionResult) => void
  onQuit: () => void
}

export function Session({ plan, onFinish, onQuit }: Props) {
  const settings = useSettings()
  const { economy } = useLearnerData()
  const recordAnswer = useStore((s) => s.recordAnswer)
  const recordSeen = useStore((s) => s.recordSeen)
  const flagQuestion = useStore((s) => s.flagQuestion)
  const learnerName = useStore((s) => s.learners.find((l) => l.id === s.activeLearnerId)?.name ?? 'Your child')

  const [queue, setQueue] = useState<PlannedItem[]>(plan.items)
  const [index, setIndex] = useState(0)
  const [response, setResponse] = useState<Response>(null)
  const [status, setStatus] = useState<AnswerStatus>('answering')
  const [usedHint, setUsedHint] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [confirmQuit, setConfirmQuit] = useState(false)
  const [wrongStreak, setWrongStreak] = useState(0)
  const [requeues, setRequeues] = useState(0)
  const [answers, setAnswers] = useState<AnsweredItem[]>([])
  const [secondsLeft, setSecondsLeft] = useState(settings.timerSeconds)
  const [flash, setFlash] = useState<{ text: string; kind: 'good' | 'bad' } | null>(null)
  /*
   * "This looks wrong", from the child.
   *
   * Deliberately small and capped at three a quest. It has to be here, in the
   * moment they disagree, because a seven-year-old will not remember which
   * question upset them by the time a grown-up is free. But it must not become
   * a button worth tapping for its own sake, so it is quiet, it says nothing
   * exciting when tapped, and it grants nothing.
   */
  const [flaggedNow, setFlaggedNow] = useState<string[]>([])

  const startedAt = useRef(Date.now())
  const advanceTimer = useRef<number | null>(null)
  const current = queue[index]
  const skill = current ? getSkill(plan.curriculumId, current.skillId) : undefined

  /* Read long prompts aloud automatically — reading is the bottleneck at
     this age, not the maths (prd.md §2.1). */
  useEffect(() => {
    if (!current) return
    setResponse(null)
    setStatus('answering')
    setUsedHint(false)
    setShowHint(false)
    setSecondsLeft(settings.timerSeconds)
    const text = current.item.speak ?? current.item.prompt
    if (settings.speech && text.length > 34) {
      const t = window.setTimeout(() => speak(text), 260)
      return () => window.clearTimeout(t)
    }
  }, [index, current, settings.speech, settings.timerSeconds])

  useEffect(() => () => cancelSpeech(), [])

  /*
   * Hold any pending update until the quest is over. A child three questions in
   * who is bounced to a fresh screen has lost the session and the trust in one
   * go; the new version can wait four minutes.
   */
  useEffect(() => {
    setSafeToReload(false)
    return () => setSafeToReload(true)
  }, [])

  const finish = useCallback(
    (finalAnswers: AnsweredItem[]) => {
      const result: SessionResult = {
        planId: plan.id,
        mode: plan.mode,
        curriculumId: plan.curriculumId,
        subjectId: plan.subjectId,
        strandId: plan.strandId,
        skillId: plan.skillId,
        levelKey: plan.levelKey,
        title: plan.title,
        finishedAt: Date.now(),
        durationMs: Date.now() - startedAt.current,
        total: finalAnswers.length,
        correctFirstTry: finalAnswers.filter((a) => a.correctFirstTry).length,
        stars: 0,
        xpEarned: 0,
        coinsEarned: 0,
        answers: finalAnswers,
      }
      cancelSpeech()
      onFinish(result)
    },
    [onFinish, plan],
  )

  const advance = useCallback(
    (nextQueue: PlannedItem[], finalAnswers: AnsweredItem[]) => {
      if (index + 1 >= nextQueue.length) finish(finalAnswers)
      else setIndex((i) => i + 1)
    },
    [finish, index],
  )

  /** Rebuild the questions still to come, one difficulty notch easier. */
  const softenRemaining = useCallback(
    (from: number) => {
      setQueue((prev) => {
        const rng = makeRng(plan.seed + from * 977)
        return prev.map((planned, i) => {
          if (i <= from) return planned
          const nextDifficulty = Math.max(1, planned.difficulty - 1) as Difficulty
          if (nextDifficulty === planned.difficulty) return planned
          const item = generateItem(plan.curriculumId, planned.skillId, nextDifficulty, rng)
          return item ? { ...planned, item, difficulty: nextDifficulty } : planned
        })
      })
    },
    [plan.curriculumId, plan.seed],
  )

  const submit = useCallback(
    (value: Response) => {
      if (!current || status !== 'answering') return
      const correct = checkAnswer(current.item, value)

      const answer: AnsweredItem = {
        skillId: current.skillId,
        prompt: current.item.prompt,
        correctFirstTry: correct,
        attempts: 1,
        usedHint,
        role: current.role,
        difficulty: current.difficulty,
        given: describeResponse(current.item, value),
        expected: describeAnswer(current.item),
      }
      const nextAnswers = [...answers, answer]
      setAnswers(nextAnswers)
      // Remember the exact question so tomorrow's session does not repeat it.
      recordSeen(current.skillId, itemSignature(current.item))

      recordAnswer(current.skillId, {
        correct,
        firstTry: correct,
        usedHint,
        isReview: current.role === 'review',
      })

      if (correct) {
        setStatus('correct')
        setWrongStreak(0)
        sfx.correct()
        buzz(14)
        setFlash({ text: CORRECT_WORDS[Math.floor(Math.random() * CORRECT_WORDS.length)], kind: 'good' })
        advanceTimer.current = window.setTimeout(() => {
          setFlash(null)
          advance(queue, nextAnswers)
        }, REVEAL_MS)
        return
      }

      setStatus('wrong')
      sfx.wrong()
      buzz([10, 60, 10])
      setFlash({ text: WRONG_WORDS[Math.floor(Math.random() * WRONG_WORDS.length)], kind: 'bad' })

      const pinned = settings.difficultyOverride !== null
      const streak = wrongStreak + 1
      setWrongStreak(streak)
      // Three in a row means the level is wrong for them right now. Drop it
      // quietly — the child is never told this happened. Skipped when a parent
      // has pinned the level: they asked for that level, so they get it.
      if (streak >= 3 && !pinned) {
        softenRemaining(index)
        setWrongStreak(0)
      }

      // Re-queue a fresh question on the same skill so the child gets another
      // go at the idea rather than just being told the answer.
      if (requeues < MAX_REQUEUES) {
        const rng = makeRng(plan.seed + index * 7717 + requeues)
        const easier = pinned ? current.difficulty : (Math.max(1, current.difficulty - 1) as Difficulty)
        const item = generateItem(plan.curriculumId, current.skillId, easier, rng)
        if (item) {
          setQueue((prev) => [...prev, { ...current, item, difficulty: easier }])
          setRequeues((r) => r + 1)
        }
      }

      if (settings.speech && current.item.explanation) {
        window.setTimeout(() => speak(current.item.explanation!), 500)
      }
    },
    [
      advance,
      answers,
      current,
      index,
      plan.curriculumId,
      plan.seed,
      queue,
      recordAnswer,
      recordSeen,
      requeues,
      settings.speech,
      settings.difficultyOverride,
      softenRemaining,
      status,
      usedHint,
      wrongStreak,
    ],
  )

  /* Timed mode is opt-in and framed as a race, never the default. */
  useEffect(() => {
    if (!settings.timedMode || status !== 'answering' || !current) return
    if (secondsLeft <= 0) {
      submit(response)
      return
    }
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [settings.timedMode, status, secondsLeft, current, response, submit])

  useEffect(() => () => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current)
  }, [])

  const mood = useMemo(() => {
    if (status === 'correct') return 'celebrate' as const
    if (status === 'wrong') return 'sad' as const
    return 'idle' as const
  }, [status])

  if (!current) return null

  const total = queue.length
  const answered = answers.length

  const handleChange = (value: Response) => {
    setResponse(value)
    if (isInstantType(current.item)) submit(value)
  }

  return (
    // Column layout so the feedback bar always lands at the bottom of the
    // screen rather than floating under short questions.
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-brand-50 via-white to-brand-100">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {/* Header ---------------------------------------------------- */}
        <header className="flex items-center gap-3">
          <IconBtn label="Leave this quest" onClick={() => setConfirmQuit(true)}>
            ✕
          </IconBtn>
          <div className="flex-1">
            <ProgressBar
              pct={(answered / Math.max(total, 1)) * 100}
              className="h-4"
              barClass="bg-gradient-to-r from-emerald-400 to-emerald-500"
              label="Quest progress"
            />
          </div>
          <span className="shrink-0 font-black text-brand-600 tabular-nums">
            {Math.min(answered + 1, total)}/{total}
          </span>
          {settings.timedMode && (
            <span
              className={`shrink-0 rounded-full px-3 py-1 font-black tabular-nums ${secondsLeft <= 10 ? 'bg-rose-100 text-rose-700' : 'bg-brand-100 text-brand-700'}`}
            >
              ⏱ {secondsLeft}
            </span>
          )}
        </header>

        {/* Question -------------------------------------------------- */}
        <main className="mt-4">
          <div className="rounded-3xl border-3 border-brand-200 bg-white p-4 sm:p-5 shadow-[0_4px_0_0_rgba(124,58,237,0.12)]" style={{ borderWidth: 3 }}>
            <div className="flex items-start gap-3">
              <p className="flex-1 whitespace-pre-line text-xl sm:text-2xl font-black leading-snug text-brand-900">
                {current.item.prompt}
              </p>
              <IconBtn
                label="Read the question aloud"
                onClick={() => speak(current.item.speak ?? current.item.prompt, { force: true })}
                className="shrink-0"
              >
                🔊
              </IconBtn>
            </div>

            {current.item.visual && (
              <div className="mt-3 h-40 sm:h-52 w-full">
                <VisualView visual={current.item.visual} />
              </div>
            )}
          </div>

          <div className="mt-4">
            <QuestionView
              item={current.item}
              response={response}
              onChange={handleChange}
              onSubmit={() => submit(response)}
              status={status}
              revealed={status !== 'answering'}
            />
          </div>

          {/* Hint -------------------------------------------------- */}
          {status === 'answering' && skill?.hint && (
            <div className="mt-4 text-center">
              {showHint ? (
                <p className="inline-block rounded-2xl bg-amber-100 px-4 py-3 font-bold text-amber-900 animate-pop">
                  💡 {skill.hint}
                </p>
              ) : (
                <button
                  onClick={() => {
                    sfx.tap()
                    setShowHint(true)
                    setUsedHint(true)
                    speak(skill.hint!)
                  }}
                  className="rounded-full bg-amber-100 px-5 py-2.5 font-black text-amber-800 hover:bg-amber-200 min-h-12"
                >
                  💡 Need a hint?
                </button>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Feedback bar ------------------------------------------------ */}
      {status !== 'answering' && (
        <div
          className={`sticky bottom-0 z-20 shrink-0 border-t-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 animate-pop
            ${status === 'correct' ? 'border-emerald-500 bg-emerald-50' : 'border-rose-400 bg-rose-50'}`}
        >
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="size-16 shrink-0">
              <Mascot
                characterId={economy.equipped.character}
            petId={economy.equipped.pet}
                mood={mood}
                hat={economy.equipped.hat}
                eyes={economy.equipped.eyes}
                neck={economy.equipped.neck}
                className="w-full h-full"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`text-xl font-black ${status === 'correct' ? 'text-emerald-800' : 'text-rose-800'}`}
                aria-live="assertive"
              >
                {flash?.text ?? (status === 'correct' ? 'Correct!' : 'Not quite')}
              </p>
              {status === 'wrong' && (
                <p className="text-sm sm:text-base font-bold text-rose-900">
                  The answer is <span className="underline">{describeAnswer(current.item)}</span>.
                  {current.item.explanation ? ` ${current.item.explanation}` : ''}
                </p>
              )}
              {status === 'wrong' &&
                (flaggedNow.includes(itemSignature(current.item)) ? (
                  <p className="mt-1 text-sm font-bold text-rose-700">
                    Saved for a grown-up to check. Thank you 💚
                  </p>
                ) : (
                  flaggedNow.length < 3 && (
                    <button
                      onClick={() => {
                        sfx.tap()
                        flagQuestion({
                          learnerName,
                          skillId: current.skillId,
                          prompt: current.item.prompt,
                          given: describeResponse(current.item, response),
                          expected: describeAnswer(current.item),
                        })
                        setFlaggedNow((f) => [...f, itemSignature(current.item)])
                      }}
                      className="mt-1 min-h-11 text-sm font-bold text-rose-700 underline decoration-2 underline-offset-2"
                    >
                      I think this is wrong
                    </button>
                  )
                ))}
            </div>
            {status === 'wrong' && (
              <Btn
                variant="danger"
                size="md"
                className="shrink-0"
                onClick={() => {
                  setFlash(null)
                  advance(queue, answers)
                }}
              >
                Got it 👍
              </Btn>
            )}
          </div>
        </div>
      )}

      <Modal open={confirmQuit} onClose={() => setConfirmQuit(false)} title="Leave this quest?">
        <p className="font-bold text-brand-600">
          Your answers so far are already saved. You can come back any time.
        </p>
        <div className="mt-5 flex gap-3">
          <Btn variant="secondary" size="lg" full onClick={() => setConfirmQuit(false)}>
            Keep playing
          </Btn>
          <Btn
            variant="danger"
            size="lg"
            full
            onClick={() => {
              cancelSpeech()
              if (answers.length > 0) finish(answers)
              else onQuit()
            }}
          >
            Leave
          </Btn>
        </div>
      </Modal>
    </div>
  )
}
