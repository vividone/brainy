/**
 * Parent zone. PIN-gated, and deliberately answers only three questions:
 * is he learning, what should I help with, and how much is he playing.
 */

import { useMemo, useRef, useState } from 'react'
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
import { Mascot } from '../components/Mascot'
import { CHARACTERS } from '../game/characters'
import { formatDuration, friendlyDate, recentDays } from '../lib/dates'
import { useLearnerData, useProfile, useSettings, useStore } from '../state/store'
import { useBands, useCurriculum, useProgress } from '../state/selectors'
import { buildAnalytics } from '../state/analytics'
import { setSpeechRate, speak } from '../lib/speech'

/* ------------------------------------------------------------------ *
 * PIN gate
 * ------------------------------------------------------------------ */

function Gate({ onPass, onBack }: { onPass: () => void; onBack: () => void }) {
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

type Tab = 'progress' | 'help' | 'children' | 'settings'

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
  const profile = useProfile()
  const settings = useSettings()
  const { byDay, history, totals, streak } = useLearnerData()
  const updateSettings = store.updateSettings
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

  const stats = useMemo(
    () => buildAnalytics(curriculum, bands, profile.yearBand, progress, byDay, history),
    [curriculum, bands, profile.yearBand, progress, byDay, history],
  )

  /** Subject shown in the difficulty hint — the one they are most active in. */
  const subject = useMemo(() => {
    const playable = curriculum.subjects.filter((s) => s.available && s.strands.length > 0)
    const busiest = [...stats.subjects].sort((a, b) => b.questions - a.questions)[0]
    return (
      curriculum.subjects.find((s) => s.id === busiest?.id && s.available) ??
      playable[0] ??
      curriculum.subjects[0]
    )
  }, [curriculum, stats.subjects])

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
            ['children', '👧 Children'],
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

          {/* Readiness for their own class — the headline a parent wants. */}
          <Card className="p-5 border-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-black text-slate-900">
                  {curriculum.yearBands.find((b) => b.id === profile.yearBand)?.label} readiness
                </h2>
                <p className="text-sm font-bold text-slate-500">
                  {stats.classMasteredCount} of {stats.classSkillCount} skills in {profile.name}'s own class
                  are at mastered or better.
                </p>
              </div>
              <p className="shrink-0 text-4xl font-black tabular-nums text-violet-600">
                {Math.round(stats.classReadiness * 100)}%
              </p>
            </div>
            <ProgressBar
              pct={stats.classReadiness * 100}
              className="mt-3 h-4"
              barClass="bg-gradient-to-r from-violet-400 to-violet-600"
              label="Class readiness"
            />
            <p className="mt-2 text-xs font-semibold text-slate-400">
              Earlier classes are tracked separately as revision, so this measures the year they are
              actually in.
            </p>
          </Card>

          {/* 30-day consistency. Habit is the thing that predicts progress. */}
          <Card className="p-5 border-slate-200">
            <div className="flex items-baseline justify-between">
              <h2 className="font-black text-slate-900">Last 30 days</h2>
              <span className="text-sm font-bold text-slate-500">
                {stats.daysPlayedLast30} active {stats.daysPlayedLast30 === 1 ? 'day' : 'days'}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-10 gap-1.5">
              {stats.activity.map((d) => {
                const level =
                  d.questions === 0 ? 0 : d.questions < 6 ? 1 : d.questions < 15 ? 2 : d.questions < 30 ? 3 : 4
                const shade = ['bg-slate-100', 'bg-violet-200', 'bg-violet-400', 'bg-violet-500', 'bg-violet-700'][level]
                return (
                  <div
                    key={d.day}
                    className={`aspect-square rounded-md ${shade}`}
                    title={`${d.day}: ${d.questions} questions, ${d.minutes} min`}
                  />
                )
              })}
            </div>
            <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] font-bold text-slate-400">
              <span>Less</span>
              {['bg-slate-100', 'bg-violet-200', 'bg-violet-400', 'bg-violet-500', 'bg-violet-700'].map((c) => (
                <span key={c} className={`size-3 rounded ${c}`} />
              ))}
              <span>More</span>
            </div>
          </Card>

          {/* Accuracy over time, and retention after a gap. */}
          <Card className="p-5 border-slate-200">
            <h2 className="font-black text-slate-900 mb-3">Are they improving?</h2>
            <div className="flex items-end justify-between gap-2 h-28">
              {stats.accuracyTrend.map((w) => (
                <div key={w.label} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                  <span className="text-[10px] font-black text-slate-500 tabular-nums">
                    {w.accuracy === null ? '' : `${Math.round(w.accuracy * 100)}%`}
                  </span>
                  <div
                    className={`w-full rounded-t-md ${w.accuracy === null ? 'bg-slate-100' : 'bg-emerald-500'}`}
                    style={{ height: `${w.accuracy === null ? 3 : Math.max(4, w.accuracy * 100)}%` }}
                    title={`${w.questions} questions`}
                  />
                  <span className="text-[10px] font-black text-slate-400 text-center leading-tight">
                    {w.label}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              First-try accuracy per week. It can dip when they move up a level — that is the app making
              things harder, not them getting worse.
            </p>

            <div className="mt-4 rounded-2xl bg-slate-50 p-3">
              <p className="font-black text-slate-800">
                Retention:{' '}
                {stats.retention.rate === null ? (
                  <span className="text-slate-400">not enough data yet</span>
                ) : (
                  <span className="text-emerald-600">{Math.round(stats.retention.rate * 100)}%</span>
                )}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                {stats.retention.answered > 0
                  ? `Of ${stats.retention.answered} questions brought back days later, ${stats.retention.correct} were right first time. This is the honest measure of whether things stuck.`
                  : 'Once skills come back around for spaced review, this will show how much stuck.'}
              </p>
            </div>
          </Card>

          {/* Per-subject, now that there is more than one. */}
          {stats.subjects.length > 1 && (
            <Card className="p-5 border-slate-200">
              <h2 className="font-black text-slate-900 mb-3">By subject</h2>
              <div className="space-y-3">
                {stats.subjects.map((s) => {
                  const pct = Math.round(s.mastery * 100)
                  const colour =
                    pct >= 75 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : pct > 0 ? 'bg-rose-400' : 'bg-slate-300'
                  return (
                    <div key={s.id}>
                      <div className="flex justify-between text-sm font-bold text-slate-600">
                        <span>
                          {s.icon} {s.name}
                        </span>
                        <span className="tabular-nums">
                          {pct}% · {s.masteredCount}/{s.skillCount} mastered
                        </span>
                      </div>
                      <ProgressBar pct={pct} className="mt-1 h-3" barClass={colour} label={s.name} />
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Strongest and weakest, plus what is slipping. */}
          {(stats.strongest.length > 0 || stats.goingRusty.length > 0) && (
            <Card className="p-5 border-slate-200">
              <h2 className="font-black text-slate-900 mb-3">Strengths and gaps</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-600 mb-1.5">
                    Strongest
                  </p>
                  {stats.strongest.length === 0 ? (
                    <p className="text-sm font-semibold text-slate-400">Not enough data yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {stats.strongest.map((s) => (
                        <li key={s.id} className="flex justify-between gap-2 text-sm">
                          <span className="font-bold text-slate-700 truncate">{s.title}</span>
                          <span className="shrink-0 font-black text-emerald-600 tabular-nums">
                            {Math.round(s.mastery * 100)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-rose-600 mb-1.5">
                    Needs work
                  </p>
                  {stats.weakest.length === 0 ? (
                    <p className="text-sm font-semibold text-slate-400">Not enough data yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {stats.weakest.map((s) => (
                        <li key={s.id} className="flex justify-between gap-2 text-sm">
                          <span className="font-bold text-slate-700 truncate">{s.title}</span>
                          <span className="shrink-0 font-black text-rose-600 tabular-nums">
                            {Math.round(s.mastery * 100)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {stats.goingRusty.length > 0 && (
                <div className="mt-4 rounded-2xl bg-amber-50 border-2 border-amber-200 p-3">
                  <p className="text-xs font-black uppercase tracking-wide text-amber-700">Going rusty</p>
                  <p className="text-sm font-bold text-amber-900">
                    {stats.goingRusty.map((s) => s.title).join(', ')}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-amber-700">
                    Mastered once, but not practised lately. Five minutes each would bring them back.
                  </p>
                </div>
              )}
            </Card>
          )}

          <Card className="p-5 border-slate-200">
            <h2 className="font-black text-slate-900 mb-3">Mastery by topic — {subject.name}</h2>
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
              {stats.medianSessionMinutes !== null &&
                ` · typical session ${stats.medianSessionMinutes < 1 ? 'under a minute' : `${Math.round(stats.medianSessionMinutes)} min`}`}
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
      {tab === 'children' && <ChildrenTab />}
      {tab === 'settings' && <SettingsTab />}
    </Screen>
  )

  /** Add, switch, rename and remove the children who share this device. */
  function ChildrenTab() {
    const learners = useStore((s) => s.learners)
    const data = useStore((s) => s.data)
    const activeId = useStore((s) => s.activeLearnerId)
    const [adding, setAdding] = useState(false)
    const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
    const [name, setName] = useState('')
    const [age, setAge] = useState<number | null>(null)
    const [characterId, setCharacterId] = useState(CHARACTERS[0].id)

    const suggested = age === null ? null : bandForAge(curriculum.id, age)

    return (
      <div className="mt-4 space-y-4">
        {learners.map((l) => {
          const d = data[l.id]
          const isActive = l.id === activeId
          const bandLabel = listCurricula()
            .find((c) => c.id === l.curriculumId)
            ?.yearBands.find((b) => b.id === l.yearBand)?.label
          return (
            <Card key={l.id} className={`p-4 border-slate-200 ${isActive ? 'ring-2 ring-slate-900' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="size-16 shrink-0">
                  <Mascot
                    characterId={data[l.id]?.economy.equipped.character}
                    petId={data[l.id]?.economy.equipped.pet}
                    mood="happy"
                    className="w-full h-full"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <input
                    value={l.name}
                    onChange={(e) => store.renameLearner(l.id, e.target.value)}
                    className="w-full bg-transparent text-lg font-black text-slate-900 outline-none focus:bg-slate-50 rounded px-1"
                    aria-label={`Name for ${l.name}`}
                  />
                  <p className="px-1 text-sm font-bold text-slate-500">
                    {bandLabel} · {d?.totals.questions ?? 0} questions · level{' '}
                    {Math.max(1, Math.floor((d?.economy.xp ?? 0) / 100) + 1)}
                  </p>
                </div>
                {isActive ? (
                  <Pill className="bg-slate-900 text-white shrink-0">Playing</Pill>
                ) : (
                  <Btn variant="secondary" size="sm" onClick={() => store.switchLearner(l.id)}>
                    Switch to
                  </Btn>
                )}
              </div>
              {learners.length > 1 && (
                <button
                  onClick={() => setConfirmRemove(l.id)}
                  className="mt-2 text-sm font-bold text-rose-600 hover:underline"
                >
                  Remove {l.name}
                </button>
              )}
            </Card>
          )
        })}

        {adding ? (
          <Card className="p-5 border-slate-300">
            <h2 className="font-black text-slate-900 mb-3">Add a child</h2>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 16))}
              placeholder="First name"
              className="w-full h-14 rounded-2xl border-2 border-slate-300 px-4 text-xl font-black"
            />
            <p className="mt-3 font-black text-slate-800">Age</p>
            <div className="mt-2 grid grid-cols-4 sm:grid-cols-7 gap-2">
              {ageOptions(curriculum.id).map((a) => (
                <button
                  key={a}
                  onClick={() => setAge(a)}
                  className={`min-h-12 rounded-2xl border-2 font-black ${a === age ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                >
                  {a}
                </button>
              ))}
            </div>
            {suggested && (
              <p className="mt-2 text-sm font-bold text-slate-500">
                That is usually {suggested.label}. You can change it afterwards.
              </p>
            )}
            <p className="mt-3 font-black text-slate-800">Character</p>
            <div className="mt-2 grid grid-cols-6 gap-2">
              {CHARACTERS.filter((c) => c.price === 0).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCharacterId(c.id)}
                  aria-label={c.name}
                  className={`rounded-xl border-2 p-1 ${c.id === characterId ? 'border-slate-900' : 'border-slate-200'}`}
                >
                  <Mascot characterId={c.id} mood="happy" className="w-full h-10" />
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Btn variant="secondary" size="md" full onClick={() => setAdding(false)}>
                Cancel
              </Btn>
              <Btn
                size="md"
                full
                disabled={!name.trim() || age === null}
                onClick={() => {
                  store.addLearner({
                    name,
                    curriculumId: curriculum.id,
                    yearBand: bandForAge(curriculum.id, age ?? 7).id,
                    age: age ?? undefined,
                    characterId,
                  })
                  setAdding(false)
                  setName('')
                  setAge(null)
                }}
              >
                Add child
              </Btn>
            </div>
          </Card>
        ) : (
          <Btn variant="secondary" size="lg" full onClick={() => setAdding(true)}>
            ＋ Add another child
          </Btn>
        )}

        <Card className="p-5 border-slate-200">
          <p className="text-sm font-semibold text-slate-500">
            Each child keeps their own progress, coins, streak and report. Nothing is shared between
            them except the sound setting and this grown-up code.
          </p>
        </Card>

        <Modal
          open={confirmRemove !== null}
          onClose={() => setConfirmRemove(null)}
          title="Remove this child?"
        >
          <p className="font-bold text-slate-600">
            This permanently deletes {learners.find((l) => l.id === confirmRemove)?.name}'s progress,
            coins and report on this device. Export a backup first if you might want it back.
          </p>
          <div className="mt-5 flex gap-3">
            <Btn variant="secondary" size="lg" full onClick={() => setConfirmRemove(null)}>
              Cancel
            </Btn>
            <Btn
              variant="danger"
              size="lg"
              full
              onClick={() => {
                if (confirmRemove) store.removeLearner(confirmRemove)
                setConfirmRemove(null)
              }}
            >
              Remove
            </Btn>
          </div>
        </Modal>
      </div>
    )
  }

  function SettingsTab() {
    const [confirmReset, setConfirmReset] = useState(false)
    const [importMessage, setImportMessage] = useState<string | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)
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
              ⬇ Export backup
            </Btn>
            <Btn variant="secondary" size="md" onClick={() => fileRef.current?.click()}>
              ⬆ Restore backup
            </Btn>
            <Btn variant="danger" size="md" onClick={() => setConfirmReset(true)}>
              Reset progress
            </Btn>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              const result = store.importSave(await file.text())
              setImportMessage(result.message)
            }}
          />
          {importMessage && (
            <p className="mt-3 rounded-xl bg-slate-100 p-3 font-bold text-slate-700">{importMessage}</p>
          )}

          {/*
            This is also the cross-device story until cloud sync exists: export
            on the old tablet, send the file to yourself, restore on the new
            one. Restoring merges by child rather than replacing, so a sibling
            already on the target device is not wiped.
          */}
          <p className="mt-3 text-xs font-semibold text-slate-400">
            Moving to a new device? Export here, send the file to yourself, and restore it there.
            Restoring merges children rather than replacing them, so a sibling already on the other
            device is kept.
          </p>
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
