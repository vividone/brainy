/**
 * Parent zone. PIN-gated, and deliberately answers only three questions:
 * is he learning, what should I help with, and how much is he playing.
 */

import { useMemo, useState } from 'react'
import { BAND_LABEL, BAND_STYLE, band, currentMastery, difficultyFor } from '../engine/mastery'
import {
  ageOptions,
  bandForAge,
  getSkill,
  includedBands,
  listCurricula,
  nextFocusSkill,
  skillsInStrand,
} from '../engine/registry'
import type { Difficulty } from '../engine/types'
import { Btn, Card, IconBtn, Modal, Pill, ProgressBar, Screen } from '../components/ui'
import { formatDuration, friendlyDate, recentDays } from '../lib/dates'
import { useStore } from '../state/store'
import { useBands, useCurriculum, useProgress } from '../state/selectors'
import { setSpeechRate, speak } from '../lib/speech'

/* ------------------------------------------------------------------ *
 * PIN gate
 * ------------------------------------------------------------------ */

function Gate({ onPass, onBack }: { onPass: () => void; onBack: () => void }) {
  const pin = useStore((s) => s.settings.parentPin)
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
        <IconBtn label="Back" onClick={onBack}>
          ←
        </IconBtn>
        <h1 className="text-2xl font-black text-brand-900">Grown-ups only</h1>
      </header>

      <Card className={`mt-8 p-6 text-center ${error ? 'animate-shake border-rose-400' : ''}`}>
        <p className="text-5xl">🔒</p>
        <p className="mt-2 font-bold text-brand-600">Enter the 4-digit code</p>

        <div className="mt-4 flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`size-5 rounded-full border-2 ${i < entry.length ? 'bg-brand-600 border-brand-700' : 'border-brand-300'}`}
            />
          ))}
        </div>
        {error && <p className="mt-3 font-black text-rose-600">Not quite — try again</p>}

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

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */

type Tab = 'progress' | 'help' | 'settings'

/** Parent-facing difficulty options. `null` hands the choice back to the engine. */
const DIFFICULTY_CHOICES: { value: Difficulty | null; label: string }[] = [
  { value: null, label: 'Adapts' },
  { value: 1, label: 'Gentlest' },
  { value: 2, label: 'Easy' },
  { value: 3, label: 'Steady' },
  { value: 4, label: 'Stretch' },
  { value: 5, label: 'Hardest' },
]

export function Parent({ onBack }: { onBack: () => void }) {
  const [unlocked, setUnlocked] = useState(false)
  const [tab, setTab] = useState<Tab>('progress')

  const store = useStore()
  const { profile, settings, byDay, history, totals, streak, updateSettings } = store
  const curriculum = useCurriculum()
  const bands = useBands()
  const progress = useProgress()

  const week = useMemo(() => {
    const days = recentDays(7)
    const stats = days.map((d) => byDay[d] ?? { sessions: 0, questions: 0, correct: 0, ms: 0 })
    return {
      days,
      stats,
      daysPlayed: stats.filter((s) => s.sessions > 0).length,
      sessions: stats.reduce((a, s) => a + s.sessions, 0),
      questions: stats.reduce((a, s) => a + s.questions, 0),
      ms: stats.reduce((a, s) => a + s.ms, 0),
      maxQuestions: Math.max(1, ...stats.map((s) => s.questions)),
    }
  }, [byDay])

  const subject = curriculum.subjects.find((s) => s.id === 'maths') ?? curriculum.subjects[0]

  const strandRows = useMemo(
    () =>
      subject.strands
        .map((strand) => {
          const skills = skillsInStrand(curriculum.id, strand.id, bands)
          const attempted = skills.filter((s) => (progress[s.id]?.attempts ?? 0) > 0)
          const mean = skills.length
            ? skills.reduce((sum, s) => sum + currentMastery(progress, s.id), 0) / skills.length
            : 0
          return { strand, skills, attempted: attempted.length, mean }
        })
        .filter((r) => r.skills.length > 0),
    [subject, curriculum.id, bands, progress],
  )

  /* The three weakest skills he has actually attempted — the only ones worth
     a parent's time. Unattempted skills are "not taught yet", not a gap. */
  const needsWork = useMemo(() => {
    const attempted = Object.entries(progress)
      .filter(([, p]) => p.attempts >= 2)
      .map(([id, p]) => ({ id, p, mastery: currentMastery(progress, id) }))
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 3)

    return attempted.map((entry) => {
      const skill = getSkill(curriculum.id, entry.id)
      const missed = history
        .flatMap((h) => h.answers)
        .filter((a) => a.skillId === entry.id && !a.correctFirstTry)
        .slice(0, 3)
      return { ...entry, skill, missed }
    })
  }, [progress, history, curriculum.id])

  const accuracy = totals.questions ? Math.round((totals.correct / totals.questions) * 100) : 0

  /* What the adaptive engine would pick right now — the useful thing to know
     before deciding whether to override it. */
  const autoHint = useMemo(() => {
    const focus = nextFocusSkill(curriculum.id, subject.id, bands, progress)
    if (!focus) return 'The level is chosen automatically from how each skill is going.'
    const level = difficultyFor(currentMastery(progress, focus.id))
    return `Right now Auto is pitching "${focus.title}" at level ${level} of 5, and will move it as he improves.`
  }, [curriculum.id, subject.id, bands, progress])

  if (!unlocked) return <Gate onPass={() => setUnlocked(true)} onBack={onBack} />

  return (
    <Screen bg="bg-slate-50">
      <header className="flex items-center gap-3 pt-1">
        <IconBtn label="Back to the game" onClick={onBack}>
          ←
        </IconBtn>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black text-slate-900 truncate">{profile.name}'s progress</h1>
          <p className="text-sm font-bold text-slate-500">
            {curriculum.flag} {curriculum.name} ·{' '}
            {curriculum.yearBands.find((b) => b.id === profile.yearBand)?.label}
          </p>
        </div>
      </header>

      <div className="mt-4 flex gap-2">
        {(
          [
            ['progress', '📊 Progress'],
            ['help', '💡 How to help'],
            ['settings', '⚙️ Settings'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 min-h-12 rounded-2xl border-2 font-black transition
              ${tab === id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ---- Progress ---- */}
      {tab === 'progress' && (
        <div className="mt-4 space-y-4">
          <Card className="p-5 border-slate-200">
            <h2 className="font-black text-slate-900 mb-3">This week</h2>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                ['Days', week.daysPlayed],
                ['Quests', week.sessions],
                ['Questions', week.questions],
                ['Streak', streak.current],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-2xl font-black text-slate-900 tabular-nums">{value as number}</p>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label as string}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-end justify-between gap-1.5 h-24">
              {week.stats.map((s, i) => (
                <div key={week.days[i]} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                  <div
                    className={`w-full rounded-t-md ${s.questions ? 'bg-violet-500' : 'bg-slate-200'}`}
                    style={{ height: `${Math.max(4, (s.questions / week.maxQuestions) * 100)}%` }}
                    title={`${s.questions} questions`}
                  />
                  <span className="text-[10px] font-black text-slate-400">
                    {new Date(week.days[i]).toLocaleDateString(undefined, { weekday: 'narrow' })}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-center text-sm font-bold text-slate-500">
              {formatDuration(week.ms)} of practice this week
            </p>
          </Card>

          <Card className="p-5 border-slate-200">
            <h2 className="font-black text-slate-900 mb-3">Mastery by topic</h2>
            <div className="space-y-3">
              {strandRows.map((row) => {
                const pct = Math.round(row.mean * 100)
                const colour =
                  pct >= 75 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : pct > 0 ? 'bg-rose-400' : 'bg-slate-300'
                return (
                  <div key={row.strand.id}>
                    <div className="flex justify-between text-sm font-bold text-slate-600">
                      <span>{row.strand.name}</span>
                      <span className="tabular-nums">
                        {pct}% · {row.attempted}/{row.skills.length} skills started
                      </span>
                    </div>
                    <ProgressBar pct={pct} className="mt-1 h-3" barClass={colour} label={row.strand.name} />
                  </div>
                )
              })}
            </div>
            <p className="mt-4 text-xs font-semibold text-slate-400">
              Mastery falls slowly if a topic is left alone, so these bars reflect what he can do today, not
              what he could once do.
            </p>
          </Card>

          <Card className="p-5 border-slate-200">
            <h2 className="font-black text-slate-900 mb-1">All time</h2>
            <p className="text-sm font-bold text-slate-500">
              {totals.questions} questions · {accuracy}% right first time · {formatDuration(totals.ms)} ·
              longest streak {streak.longest} {streak.longest === 1 ? 'day' : 'days'}
            </p>
            {history.length > 0 && (
              <div className="mt-3 divide-y divide-slate-100">
                {history.slice(0, 6).map((h, i) => (
                  <div key={`${h.planId}-${i}`} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{h.title}</p>
                      <p className="text-xs font-semibold text-slate-400">{friendlyDate(h.finishedAt)}</p>
                    </div>
                    <span className="shrink-0 font-black text-slate-500 tabular-nums">
                      {h.correctFirstTry}/{h.total} {'⭐'.repeat(h.stars)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ---- How to help ---- */}
      {tab === 'help' && (
        <div className="mt-4 space-y-4">
          {needsWork.length === 0 ? (
            <Card className="p-6 text-center border-slate-200">
              <p className="text-4xl">🌱</p>
              <p className="mt-2 font-black text-slate-800">Nothing to flag yet</p>
              <p className="font-bold text-slate-500">
                Once he has answered a few questions, the topics worth practising together will appear here.
              </p>
            </Card>
          ) : (
            needsWork.map((entry) => {
              const b = band(entry.p)
              return (
                <Card key={entry.id} className="p-5 border-slate-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-lg font-black text-slate-900">{entry.skill?.title ?? entry.id}</h3>
                      <p className="text-sm font-bold text-slate-500">
                        {entry.p.correct}/{entry.p.attempts} correct · last seen {friendlyDate(entry.p.lastSeen)}
                      </p>
                    </div>
                    <Pill className={BAND_STYLE[b].chip}>{BAND_LABEL[b]}</Pill>
                  </div>

                  {entry.skill?.helpAtHome && (
                    <div className="mt-3 rounded-2xl bg-amber-50 border-2 border-amber-200 p-3">
                      <p className="text-xs font-black uppercase tracking-wide text-amber-700">Try at home</p>
                      <p className="font-bold text-amber-900">{entry.skill.helpAtHome}</p>
                    </div>
                  )}

                  {entry.missed.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400 mb-1">
                        Recently missed
                      </p>
                      <ul className="space-y-1.5">
                        {entry.missed.map((m, i) => (
                          <li key={i} className="rounded-xl bg-slate-50 p-2.5 text-sm">
                            <p className="font-bold text-slate-800 whitespace-pre-line">{m.prompt}</p>
                            <p className="font-semibold text-slate-500">
                              He said <span className="text-rose-600">{m.given}</span> · answer{' '}
                              <span className="text-emerald-600">{m.expected}</span>
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* ---- Settings ---- */}
      {tab === 'settings' && <SettingsTab />}
    </Screen>
  )

  function SettingsTab() {
    const [confirmReset, setConfirmReset] = useState(false)
    const [pinDraft, setPinDraft] = useState(settings.parentPin)

    const download = () => {
      const blob = new Blob([store.exportSave()], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kolo-progress-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    }

    const Row = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
      <div className="flex items-center justify-between gap-4 py-3">
        <div className="min-w-0">
          <p className="font-black text-slate-800">{label}</p>
          {hint && <p className="text-xs font-semibold text-slate-400">{hint}</p>}
        </div>
        <div className="shrink-0">{children}</div>
      </div>
    )

    const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={on}
        className={`h-9 w-16 rounded-full border-2 transition ${on ? 'bg-emerald-500 border-emerald-600' : 'bg-slate-200 border-slate-300'}`}
      >
        <span
          className={`block size-7 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-7' : 'translate-x-0.5'}`}
        />
      </button>
    )

    return (
      <div className="mt-4 space-y-4">
        <Card className="p-5 border-slate-200">
          <h2 className="font-black text-slate-900 mb-1">Curriculum</h2>
          <p className="text-xs font-semibold text-slate-400 mb-3">
            Progress is kept separately for each curriculum, so switching never loses anything.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {listCurricula().map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  // Re-derive the class from the child's age rather than
                  // keeping an id that means a different level elsewhere.
                  const band = profile.age
                    ? bandForAge(c.id, profile.age).id
                    : c.yearBands.some((b) => b.id === profile.yearBand)
                      ? profile.yearBand
                      : c.yearBands[Math.min(2, c.yearBands.length - 1)].id
                  store.setCurriculum(c.id, band)
                }}
                className={`min-h-14 rounded-2xl border-2 px-3 text-left font-black transition
                  ${c.id === curriculum.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
              >
                <span className="text-xl mr-1.5">{c.flag}</span>
                <span className="text-sm">{c.name}</span>
              </button>
            ))}
          </div>

          <p className="mt-4 font-black text-slate-800">Age</p>
          <div className="mt-2 grid grid-cols-4 sm:grid-cols-7 gap-2">
            {ageOptions(curriculum.id).map((a) => (
              <button
                key={a}
                onClick={() => {
                  store.setAge(a)
                  store.setCurriculum(curriculum.id, bandForAge(curriculum.id, a).id)
                }}
                className={`min-h-12 rounded-2xl border-2 font-black transition
                  ${a === profile.age ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
              >
                {a}
              </button>
            ))}
          </div>

          <p className="mt-4 font-black text-slate-800">Class</p>
          <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2">
            {curriculum.yearBands.map((b) => (
              <button
                key={b.id}
                onClick={() => store.setCurriculum(curriculum.id, b.id)}
                className={`min-h-12 rounded-2xl border-2 font-black text-sm transition
                  ${b.id === profile.yearBand ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
              >
                {b.short}
              </button>
            ))}
          </div>
          {profile.age !== undefined && (
            <p className="mt-2 text-xs font-semibold text-slate-400">
              Age {profile.age} is usually {bandForAge(curriculum.id, profile.age).label} here. Change the
              class directly if your child is ahead or repeating a year.
            </p>
          )}
          <p className="mt-2 text-xs font-semibold text-slate-400">
            Includes {includedBands(curriculum.id, profile.yearBand).length} year band
            {includedBands(curriculum.id, profile.yearBand).length === 1 ? '' : 's'} of content — earlier years
            stay in the mix as revision.
          </p>
        </Card>

        <Card className="p-5 border-slate-200">
          <h2 className="font-black text-slate-900 mb-1">Difficulty</h2>
          <p className="text-xs font-semibold text-slate-400 mb-3">
            Auto aims for about 8 right out of 10 — hard enough to be learning, easy enough to stay
            willing. Pin a level if you would rather choose it yourself.
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {DIFFICULTY_CHOICES.map((choice) => {
              const selected = settings.difficultyOverride === choice.value
              return (
                <button
                  key={choice.label}
                  onClick={() => updateSettings({ difficultyOverride: choice.value })}
                  className={`min-h-16 rounded-2xl border-2 px-1 font-black leading-tight transition
                    ${selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                >
                  <span className="block text-lg">{choice.value ?? 'Auto'}</span>
                  <span className="block text-[10px] uppercase tracking-wide opacity-80">{choice.label}</span>
                </button>
              )
            })}
          </div>

          <p className="mt-3 text-sm font-bold text-slate-500">
            {settings.difficultyOverride === null
              ? autoHint
              : `Every question will be pitched at level ${settings.difficultyOverride}. Mastery is still tracked, but the level will not move on its own — including when he gets several wrong in a row.`}
          </p>
        </Card>

        <Card className="p-5 border-slate-200 divide-y divide-slate-100">
          <h2 className="font-black text-slate-900 pb-2">Play</h2>

          <Row label="Questions per quest" hint="10 suits most 6–8 year olds">
            <div className="flex gap-1.5">
              {[5, 10, 15, 20].map((n) => (
                <button
                  key={n}
                  onClick={() => updateSettings({ sessionLength: n })}
                  className={`size-12 rounded-xl border-2 font-black ${settings.sessionLength === n ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </Row>

          <Row
            label="Beat the Clock"
            hint="Adds a countdown to each question. Off by default — timing tends to measure anxiety at this age."
          >
            <Toggle on={settings.timedMode} onToggle={() => updateSettings({ timedMode: !settings.timedMode })} />
          </Row>

          {settings.timedMode && (
            <Row label="Seconds per question" hint="Word problems need longer than a times table">
              <div className="flex flex-wrap justify-end gap-1.5">
                {[15, 30, 45, 60, 90, 120].map((n) => (
                  <button
                    key={n}
                    onClick={() => updateSettings({ timerSeconds: n })}
                    className={`min-h-11 px-3 rounded-xl border-2 font-black tabular-nums ${settings.timerSeconds === n ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                  >
                    {n}s
                  </button>
                ))}
              </div>
            </Row>
          )}

          <Row label="Sound effects">
            <Toggle on={settings.sound} onToggle={() => updateSettings({ sound: !settings.sound })} />
          </Row>

          <Row label="Read questions aloud" hint="Long questions are read automatically; the speaker button always works">
            <Toggle on={settings.speech} onToggle={() => updateSettings({ speech: !settings.speech })} />
          </Row>

          <Row label="Reading speed">
            <div className="flex items-center gap-2">
              {[
                [0.7, 'Slow'],
                [0.9, 'Normal'],
                [1.15, 'Fast'],
              ].map(([rate, label]) => (
                <button
                  key={label as string}
                  onClick={() => {
                    updateSettings({ speechRate: rate as number })
                    setSpeechRate(rate as number)
                    speak('This is how fast I will read.', { force: true })
                  }}
                  className={`min-h-11 px-3 rounded-xl border-2 font-black text-sm ${settings.speechRate === rate ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                >
                  {label as string}
                </button>
              ))}
            </div>
          </Row>

          <Row label="Easier-to-read font" hint="Rounder letters with wider spacing">
            <Toggle
              on={settings.dyslexiaFont}
              onToggle={() => updateSettings({ dyslexiaFont: !settings.dyslexiaFont })}
            />
          </Row>

          <Row label="Reduce animation">
            <Toggle
              on={settings.reduceMotion}
              onToggle={() => updateSettings({ reduceMotion: !settings.reduceMotion })}
            />
          </Row>
        </Card>

        <Card className="p-5 border-slate-200">
          <h2 className="font-black text-slate-900 mb-2">Grown-up code</h2>
          <div className="flex gap-2">
            <input
              value={pinDraft}
              onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              className="h-14 w-40 rounded-2xl border-2 border-slate-300 px-4 text-2xl font-black tracking-[0.4em]"
            />
            <Btn
              variant="secondary"
              size="md"
              disabled={!/^\d{4}$/.test(pinDraft) || pinDraft === settings.parentPin}
              onClick={() => updateSettings({ parentPin: pinDraft })}
            >
              Save
            </Btn>
          </div>
        </Card>

        <Card className="p-5 border-slate-200">
          <h2 className="font-black text-slate-900 mb-1">Your data</h2>
          <p className="text-sm font-semibold text-slate-500 mb-3">
            Everything is stored on this device only. Nothing is uploaded, and there is no account, no
            tracking and no advertising.
          </p>
          <div className="flex flex-wrap gap-2">
            <Btn variant="secondary" size="md" onClick={download}>
              ⬇ Export progress
            </Btn>
            <Btn variant="danger" size="md" onClick={() => setConfirmReset(true)}>
              Reset progress
            </Btn>
          </div>
        </Card>

        <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset all progress?">
          <p className="font-bold text-slate-600">
            This clears mastery, stars, streaks and history for every curriculum. Coins and the wardrobe are
            kept. It cannot be undone.
          </p>
          <div className="mt-5 flex gap-3">
            <Btn variant="secondary" size="lg" full onClick={() => setConfirmReset(false)}>
              Cancel
            </Btn>
            <Btn
              variant="danger"
              size="lg"
              full
              onClick={() => {
                store.resetProgress()
                setConfirmReset(false)
              }}
            >
              Reset
            </Btn>
          </div>
        </Modal>
      </div>
    )
  }
}
