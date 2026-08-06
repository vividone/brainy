/**
 * Renders the interactive part of a question.
 *
 * The prompt, speaker and feedback banner live in the session screen; this
 * component owns only the answering surface. Every type here obeys the same
 * rules: 64px targets, one finger, no drag precision (prd.md §7.1).
 */

import type { Choice, Item } from '../engine/types'
import type { Response } from '../engine/answer'
import { VisualView } from './VisualView'
import { NumberPad } from './NumberPad'
import { sfx } from '../lib/sound'
import { speak } from '../lib/speech'

export type AnswerStatus = 'answering' | 'correct' | 'wrong'

interface Props {
  item: Item
  response: Response
  onChange: (value: Response) => void
  onSubmit: () => void
  status: AnswerStatus
  /** Which choice ids to mark, once the answer has been checked. */
  revealed: boolean
}

/** Choices auto-submit on tap; everything else needs an explicit Check. */
export const isInstantType = (item: Item): boolean =>
  item.type === 'multiple-choice' || item.type === 'true-false'

function choiceState(
  choiceId: string,
  answerId: string,
  chosen: Response,
  revealed: boolean,
): 'idle' | 'selected' | 'right' | 'wrong' {
  if (!revealed) return chosen === choiceId ? 'selected' : 'idle'
  if (choiceId === answerId) return 'right'
  if (chosen === choiceId) return 'wrong'
  return 'idle'
}

const STATE_CLASS: Record<string, string> = {
  idle: 'bg-white border-brand-300 text-brand-900 hover:border-brand-500 hover:bg-brand-50',
  selected: 'bg-brand-100 border-brand-600 text-brand-900',
  right: 'bg-emerald-100 border-emerald-600 text-emerald-900',
  wrong: 'bg-rose-100 border-rose-500 text-rose-900 opacity-80',
  /*
   * "This was one of the answers, and you did not tap it."
   *
   * Only tap-many needs it, and it exists because without it the reveal was
   * unreadable: every correct option went solid green whether the child had
   * tapped it or not, so a child who picked three of the four right words saw
   * four green tiles and the words "Not quite" and concluded the app was
   * broken. The tick and cross below say what they actually did; this says
   * what they left out.
   */
  missed: 'bg-white border-dashed border-emerald-500 text-emerald-800',
}

function ChoiceCard({
  choice,
  state,
  onPick,
  disabled,
  hasVisuals,
}: {
  choice: Choice
  state: string
  onPick: () => void
  disabled: boolean
  hasVisuals: boolean
}) {
  return (
    <button
      onClick={onPick}
      disabled={disabled}
      aria-pressed={state === 'selected'}
      className={`relative flex items-center justify-center rounded-3xl border-3 border-b-[6px] p-3 font-black transition
        active:translate-y-[2px] disabled:pointer-events-none
        ${hasVisuals ? 'min-h-32 sm:min-h-40' : 'min-h-[4.5rem] text-2xl sm:text-3xl'}
        ${STATE_CLASS[state]}`}
      style={{ borderWidth: 3, borderBottomWidth: 6 }}
    >
      {choice.visual ? (
        <span className="block w-full h-24 sm:h-32">
          <VisualView visual={choice.visual} />
        </span>
      ) : (
        <span className="px-1 break-words leading-tight">{choice.label}</span>
      )}
      {state === 'right' && <span className="absolute top-1.5 right-2 text-2xl">✅</span>}
      {state === 'wrong' && <span className="absolute top-1.5 right-2 text-2xl">❌</span>}
    </button>
  )
}

export function QuestionView({ item, response, onChange, onSubmit, status, revealed }: Props) {
  const locked = status !== 'answering'

  switch (item.type) {
    case 'multiple-choice': {
      const hasVisuals = item.choices.some((c) => c.visual)
      const cols = hasVisuals || item.choices.length > 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'
      return (
        <div className={`grid ${cols} gap-3 sm:gap-4`}>
          {item.choices.map((choice) => (
            <ChoiceCard
              key={choice.id}
              choice={choice}
              hasVisuals={hasVisuals}
              state={choiceState(choice.id, item.answerId, response, revealed)}
              disabled={locked}
              onPick={() => {
                if (choice.label) speak(choice.label)
                onChange(choice.id)
              }}
            />
          ))}
        </div>
      )
    }

    case 'true-false': {
      const options: { value: boolean; label: string; emoji: string }[] = [
        { value: true, label: item.trueLabel ?? 'True', emoji: '👍' },
        { value: false, label: item.falseLabel ?? 'False', emoji: '👎' },
      ]
      return (
        <div className="grid grid-cols-2 gap-4">
          {options.map((o) => {
            const state = !revealed
              ? response === o.value
                ? 'selected'
                : 'idle'
              : o.value === item.answer
                ? 'right'
                : response === o.value
                  ? 'wrong'
                  : 'idle'
            return (
              <button
                key={String(o.value)}
                onClick={() => onChange(o.value)}
                disabled={locked}
                className={`min-h-28 rounded-3xl border-3 border-b-[6px] text-2xl sm:text-3xl font-black transition
                  active:translate-y-[2px] disabled:pointer-events-none ${STATE_CLASS[state]}`}
                style={{ borderWidth: 3, borderBottomWidth: 6 }}
              >
                <span className="block text-4xl mb-1">{o.emoji}</span>
                {o.label}
              </button>
            )
          })}
        </div>
      )
    }

    case 'numeric-entry': {
      const text = typeof response === 'number' ? String(response) : typeof response === 'string' ? response : ''
      return (
        <div className="space-y-4">
          <div
            className={`mx-auto flex h-20 w-full max-w-sm items-center justify-center rounded-2xl border-3 text-4xl font-black tabular-nums
              ${revealed ? (status === 'correct' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-rose-500 bg-rose-50 text-rose-800') : 'border-brand-300 bg-white text-brand-900'}`}
            style={{ borderWidth: 3 }}
            aria-live="polite"
            aria-label={`Your answer: ${text || 'empty'}`}
          >
            {item.prefix && <span className="text-brand-500 mr-1">{item.prefix}</span>}
            <span>{text || <span className="text-brand-300">?</span>}</span>
            {item.suffix && <span className="text-brand-500 ml-1 text-2xl">{item.suffix}</span>}
          </div>
          <NumberPad
            value={text}
            maxDigits={item.maxDigits ?? 4}
            disabled={locked}
            canSubmit={text.length > 0}
            onChange={(next) => onChange(next === '' ? null : Number(next))}
            onSubmit={onSubmit}
          />
        </div>
      )
    }

    case 'count-objects': {
      const marked = typeof response === 'number' ? response : 0
      const perRow = item.perRow ?? 5
      return (
        <div className="space-y-4">
          <div
            className="grid gap-2 justify-center mx-auto"
            style={{ gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: item.count }, (_, i) => {
              const on = i < marked
              return (
                <button
                  key={i}
                  disabled={locked}
                  onClick={() => {
                    sfx.tap()
                    // Tapping any marked object un-marks back to that point,
                    // so a miscount is one tap to fix rather than a restart.
                    onChange(i < marked ? i : i + 1)
                  }}
                  aria-label={`Object ${i + 1}${on ? ', counted' : ''}`}
                  className={`grid place-items-center size-16 sm:size-[4.5rem] rounded-2xl border-3 text-3xl sm:text-4xl transition
                    ${on ? 'bg-emerald-100 border-emerald-500 scale-95' : 'bg-white border-brand-200'}`}
                  style={{ borderWidth: 3 }}
                >
                  {item.glyph}
                </button>
              )
            })}
          </div>
          <div className="text-center">
            <span className="inline-block rounded-full bg-brand-100 px-6 py-2 text-2xl font-black text-brand-800 tabular-nums">
              Counted: {marked}
            </span>
          </div>
          <button
            onClick={onSubmit}
            disabled={locked || marked === 0}
            className="mx-auto block w-full max-w-sm h-16 rounded-2xl border-2 border-b-4 border-emerald-700
              bg-emerald-500 text-white text-2xl font-black active:translate-y-[2px] disabled:opacity-40"
          >
            Check ✓
          </button>
        </div>
      )
    }

    case 'order': {
      const picked = Array.isArray(response) ? response : []
      const remaining = item.tokens.filter((t) => !picked.includes(t.id))
      return (
        <div className="space-y-4">
          <div className="min-h-20 rounded-2xl border-3 border-dashed border-brand-300 bg-white/70 p-2 flex flex-wrap gap-2 items-center justify-center" style={{ borderWidth: 3 }}>
            {picked.length === 0 && <span className="text-brand-400 font-bold">Tap them in order…</span>}
            {picked.map((id, i) => {
              const token = item.tokens.find((t) => t.id === id)!
              const right = revealed && item.correctOrder[i] === id
              const wrong = revealed && item.correctOrder[i] !== id
              return (
                <button
                  key={id}
                  disabled={locked}
                  onClick={() => {
                    sfx.tap()
                    onChange(picked.filter((p) => p !== id))
                  }}
                  className={`min-h-14 min-w-16 px-4 rounded-xl border-3 text-xl font-black
                    ${right ? 'bg-emerald-100 border-emerald-500' : wrong ? 'bg-rose-100 border-rose-500' : 'bg-brand-100 border-brand-500 text-brand-900'}`}
                  style={{ borderWidth: 3 }}
                >
                  <span className="mr-1 text-xs align-super text-brand-500">{i + 1}</span>
                  {token.label}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {remaining.map((t) => (
              <button
                key={t.id}
                disabled={locked}
                onClick={() => {
                  sfx.tap()
                  speak(t.label)
                  onChange([...picked, t.id])
                }}
                className="min-h-16 min-w-20 px-5 rounded-2xl border-3 border-b-[6px] border-brand-300 bg-white
                  text-2xl font-black text-brand-900 active:translate-y-[2px] hover:bg-brand-50"
                style={{ borderWidth: 3, borderBottomWidth: 6 }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={onSubmit}
            disabled={locked || picked.length !== item.tokens.length}
            className="mx-auto block w-full max-w-sm h-16 rounded-2xl border-2 border-b-4 border-emerald-700
              bg-emerald-500 text-white text-2xl font-black active:translate-y-[2px] disabled:opacity-40"
          >
            Check ✓
          </button>
        </div>
      )
    }

    case 'tap-many': {
      const picked = Array.isArray(response) ? response : []
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {item.options.map((o) => {
              const on = picked.includes(o.id)
              const isRight = item.correctIds.includes(o.id)
              const state = !revealed
                ? on
                  ? 'selected'
                  : 'idle'
                : isRight
                  ? on
                    ? 'right'
                    : 'missed'
                  : on
                    ? 'wrong'
                    : 'idle'
              return (
                <button
                  key={o.id}
                  disabled={locked}
                  aria-pressed={on}
                  onClick={() => {
                    sfx.tap()
                    onChange(on ? picked.filter((p) => p !== o.id) : [...picked, o.id])
                  }}
                  className={`relative min-h-20 rounded-2xl border-3 border-b-[6px] text-2xl font-black transition
                    active:translate-y-[2px] ${STATE_CLASS[state]}`}
                  style={{ borderWidth: 3, borderBottomWidth: 6 }}
                >
                  {o.label}
                  {on && !revealed && <span className="absolute top-1 right-2 text-lg">✔</span>}
                  {revealed && on && <span className="absolute top-1 right-2 text-lg">{isRight ? '✔' : '✗'}</span>}
                  {revealed && !on && isRight && (
                    <span className="absolute bottom-1 inset-x-0 text-[0.65rem] font-black uppercase tracking-wide text-emerald-700">
                      missed
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <button
            onClick={onSubmit}
            disabled={locked || picked.length === 0}
            className="mx-auto block w-full max-w-sm h-16 rounded-2xl border-2 border-b-4 border-emerald-700
              bg-emerald-500 text-white text-2xl font-black active:translate-y-[2px] disabled:opacity-40"
          >
            Check ✓
          </button>
        </div>
      )
    }

    case 'match': {
      const pairs = (typeof response === 'object' && response !== null && !Array.isArray(response) ? response : {}) as Record<string, string>
      const pendingLeft = Object.keys(pairs).length < item.left.length ? null : null
      void pendingLeft
      const usedRight = new Set(Object.values(pairs))
      // Two taps: pick a left item, then its partner on the right.
      const activeLeft = item.left.find((l) => !pairs[l.id])?.id
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              {item.left.map((l) => (
                <div
                  key={l.id}
                  className={`min-h-16 rounded-2xl border-3 grid place-items-center text-xl font-black px-2
                    ${pairs[l.id] ? 'bg-emerald-50 border-emerald-400' : l.id === activeLeft ? 'bg-brand-100 border-brand-600' : 'bg-white border-brand-200'}`}
                  style={{ borderWidth: 3 }}
                >
                  {l.visual ? <span className="block w-full h-16"><VisualView visual={l.visual} /></span> : l.label}
                  {pairs[l.id] && (
                    <span className="text-sm text-emerald-700">
                      → {item.right.find((r) => r.id === pairs[l.id])?.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {item.right.map((r) => (
                <button
                  key={r.id}
                  disabled={locked || usedRight.has(r.id) || !activeLeft}
                  onClick={() => {
                    if (!activeLeft) return
                    sfx.tap()
                    onChange({ ...pairs, [activeLeft]: r.id })
                  }}
                  className="w-full min-h-16 rounded-2xl border-3 border-b-4 border-brand-300 bg-white text-xl
                    font-black text-brand-900 disabled:opacity-35 active:translate-y-[2px]"
                  style={{ borderWidth: 3 }}
                >
                  {r.visual ? <span className="block w-full h-14"><VisualView visual={r.visual} /></span> : r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 max-w-sm mx-auto">
            <button
              onClick={() => onChange({})}
              disabled={locked || Object.keys(pairs).length === 0}
              className="h-14 flex-1 rounded-2xl border-2 border-b-4 border-amber-400 bg-amber-100 font-black text-amber-800 disabled:opacity-40"
            >
              Start again
            </button>
            <button
              onClick={onSubmit}
              disabled={locked || Object.keys(pairs).length !== item.left.length}
              className="h-14 flex-1 rounded-2xl border-2 border-b-4 border-emerald-700 bg-emerald-500 text-white text-xl font-black disabled:opacity-40"
            >
              Check ✓
            </button>
          </div>
        </div>
      )
    }

    case 'number-line': {
      const ticks: number[] = []
      for (let v = item.min; v <= item.max; v += item.step) ticks.push(v)
      const labelEvery = item.labelEvery ?? Math.max(1, Math.round(ticks.length / 6))
      const chosen = typeof response === 'number' ? response : null
      return (
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-1 overflow-x-auto pb-2 pt-6 px-1">
            {ticks.map((v, i) => {
              const on = chosen === v
              const right = revealed && v === item.answer
              const wrong = revealed && on && v !== item.answer
              return (
                <button
                  key={v}
                  disabled={locked}
                  onClick={() => {
                    sfx.tap()
                    onChange(v)
                  }}
                  aria-label={String(v)}
                  className="relative flex flex-col items-center gap-1 shrink-0"
                >
                  <span
                    className={`w-3 rounded-full transition-all ${i % labelEvery === 0 ? 'h-10' : 'h-6'}
                      ${right ? 'bg-emerald-500' : wrong ? 'bg-rose-500' : on ? 'bg-brand-600' : 'bg-brand-300'}`}
                  />
                  <span
                    className={`text-sm font-black tabular-nums ${i % labelEvery === 0 ? 'text-brand-800' : 'text-transparent'}`}
                  >
                    {v}
                  </span>
                  {on && <span className="absolute -top-6 text-2xl">📍</span>}
                </button>
              )
            })}
          </div>
          <button
            onClick={onSubmit}
            disabled={locked || chosen === null}
            className="mx-auto block w-full max-w-sm h-16 rounded-2xl border-2 border-b-4 border-emerald-700
              bg-emerald-500 text-white text-2xl font-black active:translate-y-[2px] disabled:opacity-40"
          >
            Check ✓
          </button>
        </div>
      )
    }
  }
}
