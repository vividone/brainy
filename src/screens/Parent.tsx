/**
 * Parent zone. PIN-gated, and deliberately answers only three questions:
 * is he learning, what should I help with, and how much is he playing.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { sendForget } from '@/lib/usage'
import { BAND_LABEL, BAND_STYLE, band, currentMastery, difficultyFor } from '../engine/mastery'
import {
  ageOptions,
  bandForAge,
  playableBands,
  getSkill,
  includedBands,
  listCurricula,
  nextFocusSkill,
  skillsInStrand,
} from '../engine/registry'
import type { Difficulty } from '../engine/types'
import { Btn, Card, IconBtn, Modal, Pill, ProgressBar, Screen } from '../components/ui'
import { Mascot } from '../components/Mascot'
import { InstallCard } from '../components/InstallCard'
import { PinGate } from '../components/PinGate'
import { APP_VERSION, CHARACTERS } from '../game/characters'
import { formatDuration, friendlyDate, recentDays } from '../lib/dates'
import { installState } from '../lib/install'
import {
  remindersAvailable,
  reminderState,
  turnOffReminders,
  turnOnReminders,
  type ReminderState,
} from '../lib/reminders'
import { useLearnerData, useProfile, useSettings, useStore } from '../state/store'
import { useBands, useCurriculum, useProgress } from '../state/selectors'
import { buildAnalytics, buildSharableSummary, type Analytics } from '../state/analytics'
import { setSpeechRate, speak } from '../lib/speech'
import { sendReport } from '../lib/report'
import {
  activate,
  checkout,
  formatMoney,
  prices,
  readAsBase64,
  revalidate,
  signUp,
  submitTransfer,
  type Prices,
} from '../lib/licence'
import {
  pullProgress,
  requestCode,
  setKeepProgress as setKeepProgressOnServer,
  setParentPin as setParentPinOnServer,
  signOut,
  verifyCode,
} from '../lib/account'
import { syncNow } from '../state/syncRunner'
import type { SyncLearner } from '../state/sync'
import { useEntitlement } from '../state/entitlement'
import { isoWeek } from '../state/weekly'
import { FeedbackCard } from './Feedback'

/* ------------------------------------------------------------------ *
 * PIN gate
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */

type Tab = 'progress' | 'help' | 'children' | 'access' | 'settings'

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
  // Subscribed, not read once: the banner has to disappear the moment
  // registration succeeds on the Access tab.
  const licence = useStore((st) => st.device.licence)

  const profile = useProfile()
  const { byDay, history, totals, streak } = useLearnerData()
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

  if (!unlocked) return <PinGate title="Grown-ups only" onPass={() => setUnlocked(true)} onBack={onBack} />

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

      {/* A grid rather than a flex row: five tabs sharing the width equally
          left each one too narrow to read on a phone. */}
      <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-2">
        {(
          [
            ['progress', '📊 Progress'],
            ['help', '💡 How to help'],
            ['children', '👧 Children'],
            ['access', '🔑 Access'],
            ['settings', '⚙️ Settings'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex min-h-12 items-center justify-center px-2 rounded-2xl border-2
              font-black text-sm sm:text-base leading-tight transition
              ${tab === id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/*
        Shown on every tab until registration is done.

        A parent only reaches this state by setup failing to reach the server,
        so it is a genuinely unfinished job rather than a nag — and the reason
        it matters is concrete: without an account there is no way to give this
        family their access back if the tablet is lost, and no way to honour a
        free place to a person rather than to whoever is holding the device.
      */}
      {!licence && tab !== 'access' && (
        <button
          onClick={() => setTab('access')}
          className="mt-4 w-full rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-left"
        >
          <p className="font-black text-amber-900">Finish registering</p>
          <p className="mt-0.5 text-sm font-semibold text-amber-800">
            Setup could not reach us, so this device has no account yet. Without one we cannot
            restore your access if the tablet is lost. Tap to finish. It takes a moment.
          </p>
        </button>
      )}

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
                  <span className="text-[11px] sm:text-xs font-black text-slate-400">
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
            <div className="mt-2 flex items-center justify-end gap-1.5 text-[11px] sm:text-xs font-bold text-slate-400">
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
                  <span className="text-[11px] sm:text-xs font-black text-slate-500 tabular-nums">
                    {w.accuracy === null ? '' : `${Math.round(w.accuracy * 100)}%`}
                  </span>
                  <div
                    className={`w-full rounded-t-md ${w.accuracy === null ? 'bg-slate-100' : 'bg-emerald-500'}`}
                    style={{ height: `${w.accuracy === null ? 3 : Math.max(4, w.accuracy * 100)}%` }}
                    title={`${w.questions} questions`}
                  />
                  <span className="text-[11px] sm:text-xs font-black text-slate-400 text-center leading-tight">
                    {w.label}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              First-try accuracy per week. It can dip when they move up a level. That is the app making
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
            <h2 className="font-black text-slate-900 mb-3">Mastery by topic: {subject.name}</h2>
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
      {tab === 'access' && <AccessTab />}
      {tab === 'settings' && <SettingsTab autoHint={autoHint} stats={stats} />}
    </Screen>
  )
}

/** Add, switch, rename and remove the children who share this device. */
function ChildrenTab() {
  const store = useStore()
  const curriculum = useCurriculum()
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
                  className="w-full min-h-12 rounded-xl border-2 border-transparent bg-transparent px-2
                    text-lg font-black text-slate-900 outline-none hover:border-slate-200
                    focus:border-slate-900 focus:bg-white"
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
            <button
              onClick={() => setConfirmRemove(l.id)}
              className="mt-2 inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-bold
                text-rose-600 hover:bg-rose-50"
            >
              Remove {l.name}
            </button>
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
        {learners.length === 1 && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 font-bold text-amber-900">
            This is your only child, so Brainy will go back to the setup screen. Your grown-up code
            and settings are kept.
          </p>
        )}
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

/* ------------------------------------------------------------------ *
 * Access
 * ------------------------------------------------------------------ */

/**
 * What this family can open, and the three ways to change it: a code, a
 * payment, or leaving an email address and being sent one.
 *
 * The whole screen is written on the assumption that a parent arrived here
 * confused — because most of them will have, after a child asked why a subject
 * is shut. So it leads with what they have, says plainly what is free for ever,
 * and only then offers to sell anything.
 */
/**
 * The one switch that decides whether anything about a child leaves the tablet.
 *
 * Off by default, and off is the honest default: an account exists to hold a
 * licence and an email address, and keeping a child's progress is a separate
 * decision with a separate answer. So this is a distinct control with its own
 * explanation, not a line of small print under "create an account".
 *
 * The copy names what goes up *and what does not*, because "we keep their
 * progress" could reasonably be read as "you keep a log of everything my child
 * does", and that is exactly what is being refused.
 *
 * Turning it off deletes what was kept. Withdrawn consent that only stops future
 * uploads would mean "we stopped adding to the pile", which is not what a parent
 * asking to be forgotten means.
 */
function KeepProgressSwitch({ token }: { token: string }) {
  const on = useStore((s) => s.device.keepProgress)
  const lastSyncAt = useStore((s) => s.device.lastSyncAt)
  const setKeep = useStore((s) => s.setKeepProgress)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [confirmOff, setConfirmOff] = useState(false)

  const apply = async (next: boolean) => {
    setBusy(true)
    setNote(null)
    const result = await setKeepProgressOnServer(token, next)
    setBusy(false)
    if (!result.ok) return setNote(result.error ?? 'Could not change that just now.')
    setKeep(Boolean(result.keepProgress))
    setNote(
      next
        ? 'On. Their progress will be in your account within a minute or two.'
        : 'Off, and what we were keeping has been deleted.',
    )
    if (next) void syncNow({ force: true })
  }

  return (
    <>
      <div className="mt-4 rounded-2xl border-2 border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-black text-slate-800">Keep their progress in my account</p>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              On, so a new tablet — or this one after installing it to the home screen — picks up
              exactly where they left off. We keep their <b>first name, age, class, mastery scores,
              stars, coins, streak and badges</b>.
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              We never keep the questions they got wrong, a day-by-day record of when they played, or
              anything they typed. Those stay on this tablet, and the server refuses them.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={on}
            aria-label="Keep their progress in my account"
            disabled={busy}
            onClick={() => (on ? setConfirmOff(true) : void apply(true))}
            className={`mt-1 grid h-11 w-16 shrink-0 items-center rounded-full border-2 transition
              disabled:opacity-50
              ${on ? 'bg-emerald-500 border-emerald-600' : 'bg-slate-200 border-slate-300'}`}
          >
            <span
              className={`block size-7 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-7' : 'translate-x-0.5'}`}
            />
          </button>
        </div>
        {note && <p className="mt-2 text-sm font-bold text-slate-700">{note}</p>}
        {on && lastSyncAt && (
          <p className="mt-2 text-xs font-semibold text-slate-400">
            Last kept up to date {friendlyDate(lastSyncAt).toLowerCase()}.
          </p>
        )}
      </div>

      <Modal open={confirmOff} onClose={() => setConfirmOff(false)} title="Stop keeping their progress?">
        <p className="font-bold text-slate-600">
          What we are holding will be deleted. Nothing on this tablet changes: every star, coin and
          streak stays exactly where it is. But a new tablet will start them again from the beginning.
        </p>
        <div className="mt-5 flex gap-3">
          <Btn variant="secondary" size="lg" full onClick={() => setConfirmOff(false)}>
            Cancel
          </Btn>
          <Btn
            variant="danger"
            size="lg"
            full
            onClick={() => {
              setConfirmOff(false)
              void apply(false)
            }}
          >
            Stop and delete
          </Btn>
        </div>
      </Modal>
    </>
  )
}

/**
 * The account, in the grown-up area.
 *
 * Three jobs, in order of how often each is needed: tell a parent which account
 * this tablet is signed in to, let them sign in if it is not, and let them sign
 * out. The middle one matters most — it is the recovery path for a tablet that
 * was set up before accounts existed, or where setup was completed offline, and
 * it is the same six-digit flow as first run rather than a second mechanism.
 *
 * Signing out is deliberately blunt about what it does and does not do: it forgets
 * the account on this device and touches nothing a child has done.
 */
function AccountCard() {
  const token = useStore((s) => s.device.authToken)
  const parentEmail = useStore((s) => s.device.parentEmail)
  const signedInAction = useStore((s) => s.signedIn)
  const signedOutAction = useStore((s) => s.signedOut)
  const setLicence = useStore((s) => s.setLicence)
  const adoptRemote = useStore((s) => s.adoptRemote)

  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState(parentEmail ?? '')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<{ good: boolean; text: string } | null>(null)

  if (token) {
    return (
      <Card className="p-5 border-slate-200">
        <h2 className="font-black text-slate-900 mb-1">Your account</h2>
        <p className="text-sm font-semibold text-slate-600">
          Signed in as <b className="text-slate-900">{parentEmail}</b>. This is what puts your access
          back on a new tablet.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn
            variant="secondary"
            size="sm"
            disabled={busy === 'out'}
            onClick={async () => {
              setBusy('out')
              await signOut(token)
              signedOutAction()
              setBusy(null)
            }}
          >
            {busy === 'out' ? 'Signing out…' : 'Sign out of this tablet'}
          </Btn>
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-400">
          Signing out forgets your email on this device. It does not cancel anything, and it does not
          touch a single thing your child has done. Their progress is on this tablet either way.
        </p>

        <KeepProgressSwitch token={token} />
      </Card>
    )
  }

  return (
    <Card className="p-5 border-amber-300 bg-amber-50">
      <h2 className="font-black text-amber-900 mb-1">No account on this tablet</h2>
      <p className="text-sm font-semibold text-amber-800">
        Without one we cannot put your access back if this tablet is lost or replaced, and you cannot
        open Brainy on a second one. It takes a moment: no password, just a code by email.
      </p>

      {!open ? (
        <Btn size="md" className="mt-3" onClick={() => setOpen(true)}>
          Sign in or create an account
        </Btn>
      ) : (
        <div className="mt-3 space-y-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value.slice(0, 120))}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            disabled={sent}
            className="w-full h-12 rounded-2xl border-2 border-amber-300 bg-white px-3 font-bold
              text-slate-900 outline-none focus:border-amber-500 disabled:text-slate-500"
          />
          {sent && (
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              className="w-full h-14 rounded-2xl border-2 border-amber-300 bg-white px-3 text-2xl font-black
                tracking-[0.3em] text-slate-900 outline-none focus:border-amber-500"
            />
          )}
          <div className="flex flex-wrap gap-2">
            {!sent ? (
              <Btn
                size="md"
                disabled={!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) || busy === 'code'}
                onClick={async () => {
                  setBusy('code')
                  setNote(null)
                  const result = await requestCode(email.trim())
                  setBusy(null)
                  if (result.ok) setSent(true)
                  else setNote({ good: false, text: result.error ?? 'Could not send a code.' })
                }}
              >
                {busy === 'code' ? 'Sending…' : 'Email me a code'}
              </Btn>
            ) : (
              <Btn
                size="md"
                disabled={code.length !== 6 || busy === 'verify'}
                onClick={async () => {
                  setBusy('verify')
                  setNote(null)
                  const result = await verifyCode(email.trim(), code)
                  setBusy(null)
                  if (!result.ok) {
                    return setNote({ good: false, text: result.error ?? 'That code was not accepted.' })
                  }
                  signedInAction({
                    token: result.token!,
                    email: result.account?.email ?? email.trim(),
                    keepProgress: result.account?.keepProgress,
                    parentPin: result.account?.parentPin,
                    licence: result.licence,
                  })
                  /* A sign-in carries the family's current licence, so a tablet
                     that was set up offline gets its paid subjects here. */
                  if (result.licence) setLicence(result.licence)

                  /*
                   * And, if this family keeps progress, their children. This is
                   * the recovery path for a tablet that opened blank: sign in,
                   * and the child comes back with their mastery and coins.
                   */
                  let restored = 0
                  if (result.account?.keepProgress) {
                    const held = await pullProgress(result.token!)
                    if (held.ok && held.learners?.length) {
                      adoptRemote(held.learners as SyncLearner[])
                      restored = held.learners.length
                    }
                  }
                  setNote({
                    good: true,
                    text: restored
                      ? `Signed in, and brought back ${restored} ${restored === 1 ? 'child' : 'children'}.`
                      : 'Signed in. Your access is up to date.',
                  })
                }}
              >
                {busy === 'verify' ? 'Checking…' : 'Sign in'}
              </Btn>
            )}
            <Btn variant="secondary" size="md" onClick={() => { setOpen(false); setSent(false); setNote(null) }}>
              Cancel
            </Btn>
          </div>
          {note && (
            <p className={`rounded-2xl p-3 font-bold ${note.good ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
              {note.text}
            </p>
          )}
        </div>
      )}
    </Card>
  )
}

/**
 * For the family who set up in a browser before the install gate existed, or
 * who took the "set up in this browser instead" route past it.
 *
 * The install is not a nicety for them: on iOS the home-screen app cannot read
 * anything this tab saved, so the icon opens on a blank first run. The order
 * that works is keep-progress on, install, sign in — and the order that loses a
 * month of stars is install, then panic. So this says the order out loud, and
 * only appears while it is still relevant.
 */
function MoveToHomeScreenCard() {
  const [state, setState] = useState(installState)
  useEffect(() => installState().subscribe(() => setState(installState())), [])
  const keepProgress = useStore((s) => s.device.keepProgress)
  const setKeep = useStore((s) => s.setKeepProgress)
  const token = useStore((s) => s.device.authToken)
  const store = useStore()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ good: boolean; text: string } | null>(null)

  if (state.installed) return null

  /* The file route: the same export the Your-data card offers, named for the job
     so a parent can find it in Files afterwards. No upload, no account needed. */
  const downloadBackup = () => {
    const blob = new Blob([store.exportSave()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `brainy-move-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setNote({
      good: true,
      text: 'Saved. In the installed app, tap "Restore a backup" on the first screen and choose that file.',
    })
  }

  /* The account route: one tap, and it is the same switch as below rather than a
     second hidden mechanism. Turning it on here uploads at once so the progress
     is waiting by the time they sign in on the icon. */
  const bringAcross = async () => {
    if (!token) {
      return setNote({
        good: false,
        text: 'Sign in first, in the card above, and this becomes one tap.',
      })
    }
    setBusy(true)
    setNote(null)
    const result = await setKeepProgressOnServer(token, true)
    if (!result.ok) {
      setBusy(false)
      return setNote({ good: false, text: result.error ?? 'Could not do that just now.' })
    }
    setKeep(true)
    await syncNow({ force: true })
    setBusy(false)
    setNote({
      good: true,
      text: 'Done. Their progress is in your account, so signing in on the icon brings it across.',
    })
  }

  return (
    <Card className="p-5 border-brand-300 bg-brand-50">
      <h2 className="font-black text-brand-900 mb-1">Move Brainy to the home screen</h2>
      <p className="text-sm font-semibold text-brand-700">
        You are using Brainy in a browser tab. The home-screen app is faster, opens full screen and
        works with no internet. On an iPhone or iPad it also starts with <b>its own storage</b> and
        cannot read what this tab saved, so bring their work across before you switch.
      </p>

      <div className="mt-3 space-y-2">
        {keepProgress ? (
          <p className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-3 text-sm font-bold text-emerald-900">
            ✓ Their progress is already in your account. Install below, open it from the icon, and tap
            Sign in.
          </p>
        ) : (
          <>
            <Btn size="md" full disabled={busy} onClick={() => void bringAcross()}>
              {busy ? 'Bringing it across…' : 'Bring their progress across'}
            </Btn>
            <p className="text-xs font-semibold text-brand-500">
              Turns on <b>Keep their progress in my account</b> and uploads it now: first name, age,
              class, mastery scores, stars, coins, streak and badges. Never the questions they got
              wrong, never a day-by-day record, never anything they typed. Off again in one tap below,
              which deletes it.
            </p>
          </>
        )}
        <button
          onClick={downloadBackup}
          className="min-h-11 text-sm font-bold text-brand-500 underline decoration-2 underline-offset-2"
        >
          Or move it with a file instead, and upload nothing
        </button>
      </div>

      {note && (
        <p className={`mt-3 text-sm font-bold ${note.good ? 'text-emerald-700' : 'text-rose-700'}`}>
          {note.text}
        </p>
      )}

      <div className="mt-3">
        <InstallCard />
      </div>
    </Card>
  )
}

function AccessTab() {
  const { full, licence } = useEntitlement()
  const setLicence = useStore((s) => s.setLicence)
  const installId = useStore((s) => s.device.installId)

  const [offer, setOffer] = useState<Prices | null>(null)
  const [email, setEmail] = useState(licence?.email ?? '')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ good: boolean; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  useEffect(() => {
    let cancelled = false
    void prices().then((p) => {
      if (!cancelled) setOffer(p)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const run = async (label: string, work: () => Promise<{ good: boolean; text: string }>) => {
    setBusy(label)
    setMessage(null)
    try {
      setMessage(await work())
    } finally {
      setBusy(null)
    }
  }

  const redeem = () =>
    run('redeem', async () => {
      const result = await activate({ code, email: email.trim() || undefined, installId })
      if (result.ok && result.licence) {
        setLicence(result.licence)
        setCode('')
        return {
          good: true,
          text: result.emailed
            ? 'Done. Everything is open, and we have emailed your code to you.'
            : 'Done. Everything is open. Your family code is at the top of this screen.',
        }
      }
      return {
        good: false,
        text: result.needsEmail ? 'Add your email address above, then try the code again.' : (result.error ?? 'That did not work.'),
      }
    })

  const recheck = () =>
    run('recheck', async () => {
      if (!licence) return { good: false, text: 'Nothing to check yet.' }
      const result = await revalidate(licence.code, installId)
      if (result.ok && result.licence) {
        setLicence(result.licence)
        return { good: true, text: 'Checked. This is up to date.' }
      }
      /*
       * `gone` is the one answer that removes anything: the server positively
       * does not know this code. Every other failure leaves the licence alone,
       * because a flat signal must never cost a family their access.
       */
      if (result.gone) {
        setLicence(null)
        return { good: false, text: 'That code no longer exists. Get in touch and we will sort it out.' }
      }
      return { good: false, text: result.error ?? 'Could not check just now.' }
    })

  const buy = (plan: 'annual' | 'lifetime') =>
    run(plan, async () => {
      const result = await checkout({ email: email.trim(), plan, installId })
      if (result.ok && result.url) {
        window.location.assign(result.url)
        return { good: true, text: 'Taking you to the payment page…' }
      }
      return { good: false, text: result.error ?? 'Could not start the payment.' }
    })

  const keepPosted = () =>
    run('signup', async () => {
      const result = await signUp({ email: email.trim(), installId })
      if (result.ok && result.licence) {
        /* Only store it if it actually grants something — a pending row is a
           record on our side, not a licence, and pretending otherwise would put
           "pending" in front of a parent as though it were a state they must
           fix. */
        if (result.licence.status === 'active') setLicence(result.licence)
        const base = result.licence.status === 'active'
          ? 'You have a free place, so everything is open.'
          : 'Thank you. We have your address and will be in touch.'
        return {
          good: true,
          text: result.note ?? (result.emailed ? `${base} Check your email for a copy.` : base),
        }
      }
      return { good: false, text: result.error ?? 'Could not save that address.' }
    })

  const emailValid = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(email.trim())

  const expiryLine = () => {
    if (!licence) return null
    if (!licence.expiresAt) return 'It never expires.'
    const d = Math.ceil((new Date(licence.expiresAt).getTime() - Date.now()) / 86_400_000)
    const on = new Date(licence.expiresAt).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    if (d < 0) return `Ran out on ${on}.`
    return `Runs until ${on}, ${d} day${d === 1 ? '' : 's'} to go.`
  }

  return (
    <div className="mt-4 space-y-4">
      {/* ---- Who they are signed in as ---- */}
      <AccountCard />

      <MoveToHomeScreenCard />

      {/* ---- What they have ---- */}
      <Card className={`p-5 ${full ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}>
        <h2 className="font-black text-slate-900 mb-1">
          {full ? 'Everything is open' : 'Maths is open, the rest is not'}
        </h2>
        <p className="text-sm font-semibold text-slate-600">
          {full
            ? `${licence?.planLabel ?? 'Full access'}. ${expiryLine() ?? ''}`
            : licence
              ? `${licence.planLabel ?? 'Your plan'}. ${expiryLine()}`
              : 'Your child’s class in maths, and every earlier class of it, is free permanently. The other subjects need a code or a licence.'}
        </p>

        {licence && (
          <div className="mt-4 rounded-2xl bg-white border-2 border-slate-200 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Your family code</p>
            <p className="mt-0.5 text-xl font-black tracking-wider text-slate-900">{licence.code}</p>
            {licence.email && (
              <p className="mt-1 text-xs font-semibold text-slate-400">Attached to {licence.email}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn
                variant="secondary"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(licence.code)
                    setCopied(true)
                  } catch {
                    setCopied(false)
                  }
                }}
              >
                {copied ? '✓ Copied' : '📋 Copy'}
              </Btn>
              <Btn variant="secondary" size="sm" disabled={busy === 'recheck'} onClick={recheck}>
                {busy === 'recheck' ? 'Checking…' : '↻ Check again'}
              </Btn>
              <Btn variant="secondary" size="sm" onClick={() => setConfirmRemove(true)}>
                Remove from this device
              </Btn>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-400">
              Use this code to open Brainy on another tablet. It works offline once activated, and is
              checked with us about once a week, never in the middle of a quest.
            </p>
          </div>
        )}
      </Card>

      {/* ---- Email, shared by everything below ---- */}
      <Card className="p-5 border-slate-200">
        <h2 className="font-black text-slate-900 mb-1">Your email address</h2>
        <p className="text-sm font-semibold text-slate-500 mb-3">
          The only personal detail Brainy ever stores, and it is yours, not your child’s. It exists so
          your access can be restored on a new tablet and so we can reach you about it, never for
          marketing, and never passed on.
        </p>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value.slice(0, 160))}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          className="w-full h-14 rounded-2xl border-2 border-slate-300 px-4 font-bold text-slate-900
            placeholder:text-slate-300 outline-none focus:border-slate-900"
        />
        {!licence && (
          <Btn
            variant="secondary"
            size="md"
            className="mt-3"
            disabled={!emailValid || busy === 'signup'}
            onClick={keepPosted}
          >
            {busy === 'signup' ? 'Saving…' : 'Keep me posted'}
          </Btn>
        )}
      </Card>

      {/* ---- A code ---- */}
      <Card className="p-5 border-slate-200">
        <h2 className="font-black text-slate-900 mb-1">Have a code?</h2>
        <p className="text-sm font-semibold text-slate-500 mb-3">
          Whether it is a free-family code we sent you or your own family code from another tablet, it
          goes here.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 40))}
            placeholder="FAMILY-7K3M"
            autoCapitalize="characters"
            autoComplete="off"
            className="h-14 flex-1 min-w-[12rem] rounded-2xl border-2 border-slate-300 px-4 font-black
              tracking-wider text-slate-900 placeholder:text-slate-300 outline-none focus:border-slate-900"
          />
          <Btn size="md" disabled={code.trim().length < 4 || busy === 'redeem'} onClick={redeem}>
            {busy === 'redeem' ? 'Checking…' : 'Use code'}
          </Btn>
        </div>
      </Card>

      {/* ---- Paying ---- */}
      <Card className="p-5 border-slate-200">
        <h2 className="font-black text-slate-900 mb-1">
          {full ? 'Renew or extend' : 'Open everything else'}
        </h2>
        <p className="text-sm font-semibold text-slate-500 mb-3">
          One licence covers <b>every child on this tablet</b>, every subject and every class in
          their curriculum. Brothers and sisters are included, not extra. No advertising in any version,
          and nothing a child can buy from inside the app.
        </p>

        {offer?.enabled && offer.plans.length > 0 ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              {offer.plans.map((plan) => (
                <Btn
                  key={plan.id}
                  size="md"
                  variant={plan.id === 'annual' ? 'primary' : 'secondary'}
                  disabled={!emailValid || busy === plan.id}
                  onClick={() => buy(plan.id)}
                >
                  {busy === plan.id
                    ? 'Opening…'
                    : `${plan.label} · ${formatMoney(plan.amount, offer.currency)}`}
                </Btn>
              ))}
            </div>
            {!emailValid && (
              <p className="mt-2 text-xs font-bold text-slate-400">
                Add your email address above first: the receipt goes there.
              </p>
            )}
            <p className="mt-3 text-xs font-semibold text-slate-400">
              Payment is handled by Paystack, who hold the card details and the receipt. Brainy never
              sees a card number.
            </p>
          </>
        ) : (
          <p className="rounded-2xl bg-slate-50 p-3 font-bold text-slate-600">
            Payments are not switched on yet. Leave your email above and we will send you a code. The
            first twenty families get a free year of every subject.
          </p>
        )}
      </Card>

      {/*
        ---- Paying by bank transfer ----

        Shown to a family who has no access yet, and to one whose access has an
        end date. It used to be hidden the moment `full` went true, which quietly
        meant a licence could be *bought* by transfer but never renewed by one —
        on the payment method most Nigerian families actually use. A licence with
        no expiry is the one case where it stays hidden: there is nothing to renew
        and a payment form in front of somebody who owes nothing is a trap.
      */}
      {offer?.transfer.enabled && (!full || licence?.expiresAt) && (
        <TransferCard
          offer={offer}
          email={email}
          emailValid={emailValid}
          renewing={Boolean(full)}
          onSent={() =>
            setMessage({
              good: true,
              text: full
                ? 'Sent. We will check it and extend your access from the date it runs out.'
                : 'Sent. We will check it and email your code.',
            })
          }
        />
      )}

      {message && (
        <p
          className={`rounded-2xl p-4 font-bold ${message.good ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}
        >
          {message.text}
        </p>
      )}

      <Card className="p-5 border-slate-200">
        <h2 className="font-black text-slate-900 mb-2">What is free, for everyone</h2>
        <ul className="space-y-2 text-sm font-semibold text-slate-600">
          <li>
            <b className="text-slate-900">Maths, permanently</b>: your child’s class and every earlier
            class as revision. No time limit, no trial, no card.
          </li>
          <li>
            <b className="text-slate-900">Everything already earned</b>: stars, coins, characters and
            streaks are never taken away, whatever your plan does.
          </li>
          <li>
            <b className="text-slate-900">A quest already started always finishes.</b> Nothing here ever
            interrupts your child mid-question.
          </li>
        </ul>
      </Card>

      <Modal
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remove the licence from this tablet?"
      >
        <p className="font-bold text-slate-600">
          The other subjects will close on this device. Nothing is cancelled and nothing is refunded:
          your code keeps working, and typing it back in reopens everything. Progress is untouched.
        </p>
        <div className="mt-5 flex gap-3">
          <Btn variant="secondary" size="lg" full onClick={() => setConfirmRemove(false)}>
            Cancel
          </Btn>
          <Btn
            variant="danger"
            size="lg"
            full
            onClick={() => {
              setLicence(null)
              setConfirmRemove(false)
              setMessage({ good: true, text: 'Removed from this device.' })
            }}
          >
            Remove
          </Btn>
        </div>
      </Modal>
    </div>
  )
}

/**
 * Paying by bank transfer.
 *
 * The realistic way a Nigerian family pays: move the money in the bank app, then
 * tell somebody. Two things this screen has to get right, because getting them
 * wrong costs a parent real money and real trust:
 *
 *  - **It must not imply that submitting unlocks anything.** It says, before and
 *    after sending, that a person checks first and the code comes by email.
 *  - **The account details must be impossible to mistype.** They are shown large,
 *    with a copy button on the account number, because a digit wrong in a
 *    transfer is a phone call to a bank, not a retry.
 */
function TransferCard({
  offer,
  email,
  emailValid,
  renewing,
  onSent,
}: {
  renewing?: boolean
  offer: Prices
  email: string
  emailValid: boolean
  onSent: () => void
}) {
  const submittedAt = useStore((s) => s.device.transferSubmittedAt)
  const updateSettings = useStore((s) => s.updateSettings)
  const [open, setOpen] = useState(false)
  const [plan, setPlan] = useState<'annual' | 'lifetime'>('annual')
  const [senderName, setSenderName] = useState('')
  const [reference, setReference] = useState('')
  const [paidOn, setPaidOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [proof, setProof] = useState<{ name: string; base64: string; type: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const chosen = offer.plans.find((p) => p.id === plan) ?? offer.plans[0]

  const submit = async () => {
    setBusy(true)
    setProblem(null)
    const result = await submitTransfer({
      email: email.trim(),
      plan,
      amount: chosen?.amount,
      senderName: senderName.trim() || undefined,
      reference: reference.trim() || undefined,
      paidOn,
      proof: proof?.base64,
      proofType: proof?.type,
    })
    setBusy(false)
    if (!result.ok) return setProblem(result.error ?? 'Could not send that.')
    updateSettings({ transferSubmittedAt: new Date().toISOString() })
    setOpen(false)
    setProof(null)
    onSent()
  }

  return (
    <Card className="p-5 border-slate-200">
      <h2 className="font-black text-slate-900 mb-1">
        {renewing ? 'Renew by bank transfer' : 'Or pay by bank transfer'}
      </h2>
      <p className="text-sm font-semibold text-slate-500 mb-3">
        Transfer the amount to the account below, then tell us. Someone checks it against the account
        {renewing
          ? ' and adds the time on to the end of what you already have, usually the same day. Nothing you have now is disturbed.'
          : ' and emails your access code, usually the same day.'}
      </p>

      <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-4">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">{offer.transfer.bank}</p>
        <p className="mt-0.5 font-black text-slate-900">{offer.transfer.accountName}</p>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <span className="text-2xl font-black tracking-wider text-slate-900 tabular-nums">
            {offer.transfer.accountNumber}
          </span>
          <Btn
            variant="secondary"
            size="sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(offer.transfer.accountNumber ?? '')
                setCopied(true)
              } catch {
                setCopied(false)
              }
            }}
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </Btn>
        </div>
        <p className="mt-2 text-sm font-bold text-slate-600">
          {offer.plans
            .map((p) => `${p.label}: ${formatMoney(p.amount, offer.currency)}`)
            .join(' · ')}
        </p>
        {offer.transfer.instructions && (
          <p className="mt-2 text-sm font-semibold text-slate-500">{offer.transfer.instructions}</p>
        )}
      </div>

      {submittedAt && !open && (
        <div className="mt-3 rounded-2xl bg-amber-50 border-2 border-amber-200 p-4">
          <p className="font-black text-amber-900">We are checking your transfer</p>
          <p className="text-sm font-semibold text-amber-800 mt-0.5">
            Sent {friendlyDate(new Date(submittedAt).getTime()).toLowerCase()}. Your code arrives by
            email once the money is confirmed, then type it into the box above. Nothing is unlocked
            until then.
          </p>
          <Btn variant="secondary" size="sm" className="mt-2" onClick={() => setOpen(true)}>
            Send the details again
          </Btn>
        </div>
      )}

      {!open && !submittedAt && (
        <Btn size="md" className="mt-3" disabled={!emailValid} onClick={() => setOpen(true)}>
          I have made the transfer
        </Btn>
      )}
      {!emailValid && !submittedAt && (
        <p className="mt-2 text-xs font-bold text-slate-400">
          Add your email address above first: the code goes there.
        </p>
      )}

      {open && (
        <div className="mt-4 space-y-3">
          <div>
            <p className="font-black text-slate-800 text-sm mb-1">Which plan did you pay for?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {offer.plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlan(p.id)}
                  className={`min-h-12 rounded-2xl border-2 px-3 font-black text-sm transition
                    ${p.id === plan ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
                >
                  {p.label} · {formatMoney(p.amount, offer.currency)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="block font-black text-slate-800 text-sm mb-1">Name on the account</span>
              <input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value.slice(0, 80))}
                placeholder="who the transfer came from"
                className="w-full h-12 rounded-2xl border-2 border-slate-300 px-3 font-semibold outline-none focus:border-slate-900"
              />
            </label>
            <label className="block">
              <span className="block font-black text-slate-800 text-sm mb-1">Date paid</span>
              <input
                type="date"
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
                className="w-full h-12 rounded-2xl border-2 border-slate-300 px-3 font-semibold outline-none focus:border-slate-900"
              />
            </label>
          </div>

          <label className="block">
            <span className="block font-black text-slate-800 text-sm mb-1">
              Transfer reference <span className="font-semibold text-slate-400">(optional)</span>
            </span>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value.slice(0, 80))}
              placeholder="whatever your bank called it"
              className="w-full h-12 rounded-2xl border-2 border-slate-300 px-3 font-semibold outline-none focus:border-slate-900"
            />
          </label>

          <div>
            <p className="font-black text-slate-800 text-sm mb-1">
              Screenshot of the receipt <span className="font-semibold text-slate-400">(optional)</span>
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                /* Checked here as well as on the server, so a parent finds out
                   before waiting for an upload to fail. */
                if (file.size > 1_500_000) {
                  return setProblem('That file is a bit big. Anything under 1.5 MB is fine.')
                }
                setProblem(null)
                const { base64, type } = await readAsBase64(file)
                setProof({ name: file.name, base64, type })
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Btn variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                📎 Attach
              </Btn>
              {proof && <span className="text-sm font-bold text-slate-600">{proof.name}</span>}
              {proof && (
                <Btn variant="secondary" size="sm" onClick={() => setProof(null)}>
                  Remove
                </Btn>
              )}
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Helps us find it faster, but the name and date are usually enough.
            </p>
          </div>

          {problem && <p className="rounded-2xl bg-rose-50 p-3 font-bold text-rose-800">{problem}</p>}

          <div className="flex flex-wrap gap-2">
            <Btn size="md" disabled={busy} onClick={submit}>
              {busy ? 'Sending…' : 'Send for checking'}
            </Btn>
            <Btn variant="secondary" size="md" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
          </div>
          <p className="text-xs font-semibold text-slate-400">
            Sending this does not unlock anything by itself. A person confirms the money first, then your
            code arrives by email.
          </p>
        </div>
      )}
    </Card>
  )
}

/**
 * One of the two code boxes.
 *
 * At module scope, not inside ChangeCodeCard. Declared in the render body it
 * would be a new component type on every keystroke, so React would unmount the
 * input and mount a fresh one — and the parent would lose focus after each digit,
 * which makes a four-digit field impossible to type into.
 */
function CodeField({
  id,
  label,
  value,
  reveal,
  onChange,
}: {
  id: string
  label: string
  value: string
  reveal: boolean
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-black uppercase tracking-wide text-slate-400 mb-1">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        type={reveal ? 'text' : 'password'}
        inputMode="numeric"
        autoComplete="off"
        placeholder="••••"
        className="h-14 w-44 rounded-2xl border-2 border-slate-300 px-4 text-2xl font-black
          tracking-[0.4em] text-slate-900 outline-none focus:border-slate-900"
      />
    </div>
  )
}

/** 1234, 0000, 1111 … and 4321. The four a child tries first, and 1234 is the one we ship with. */
const GUESSABLE = new Set([
  '1234',
  '4321',
  '0000',
  '1111',
  '2222',
  '3333',
  '4444',
  '5555',
  '6666',
  '7777',
  '8888',
  '9999',
  '1212',
  '2580',
])

/**
 * Changing the grown-up code, which is the day a child works out the old one.
 *
 * The field this replaces was prefilled with the live code and had a reveal eye
 * beside it, so the most common way to change the code was also a way to display
 * it — and a child watching over a shoulder learns it at exactly that moment.
 * Three changes fall out of that:
 *
 * - Nothing is prefilled. Seeing the current code is a separate, deliberate tap,
 *   and it hides itself again after a few seconds rather than sitting on screen.
 * - The new code is typed twice. There is no recovery route from a typo — a
 *   mistyped code locks the parent out of their own settings, on a device whose
 *   whole point is that it works offline — so confirming is not friction, it is
 *   the only safety net there is.
 * - The obvious codes are refused, with a suggestion instead of a scolding. A
 *   parent replacing a code their child guessed will otherwise reach for 1111.
 */
/**
 * Daily-quest reminders, offered here and nowhere else.
 *
 * A browser gives a site one chance at the notification prompt: a parent who
 * taps "Block" can only undo it in browser settings, which most people never
 * find. So the ask happens behind the grown-up code, on a button that says what
 * it is for, and never on a child's screen or during setup.
 *
 * It also refuses to offer a switch that cannot work. No push in this browser,
 * an iPhone still in Safari rather than on the home screen, no keys configured at
 * our end: each is named, because "nothing happened" is the one outcome a parent
 * cannot act on.
 */
function RemindersCard() {
  const token = useStore((s) => s.device.authToken)
  const [state, setState] = useState<ReminderState | 'loading'>('loading')
  const [available, setAvailable] = useState<boolean | null>(null)
  const [hour, setHour] = useState(17)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    void reminderState().then(setState)
    void remindersAvailable().then(setAvailable)
  }, [])

  if (!token) return null
  if (state === 'loading' || available === null) return null

  const HOURS = [15, 16, 17, 18, 19, 20]
  const label = (h: number) => `${h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}`

  return (
    <Card className="p-5 border-slate-200">
      <h2 className="font-black text-slate-900 mb-1">A daily reminder</h2>
      <p className="text-sm font-semibold text-slate-500 mb-3">
        One notification a day, at a time you choose, and only on the days they have not played yet. It
        says nothing about your child, not even their name.
      </p>

      {!available && (
        <p className="rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-600">
          Reminders are not switched on at our end yet. Nothing for you to do; it will appear here when
          they are.
        </p>
      )}

      {available && state === 'needs-install' && (
        <p className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900">
          On an iPhone or iPad, reminders only work once Brainy is on the home screen. Add it from
          Safari’s Share menu, open it from the icon, and this will be waiting.
        </p>
      )}

      {available && state === 'unsupported' && (
        <p className="rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-600">
          This browser cannot send notifications. Everything else works as normal.
        </p>
      )}

      {available && state === 'blocked' && (
        <p className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900">
          Your browser is set to block notifications from Brainy, and only you can change that, in
          browser settings for this site. We cannot ask again from here.
        </p>
      )}

      {available && state === 'on' && (
        <>
          <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900">
            ✓ On for this device.
          </p>
          <Btn
            variant="secondary"
            size="md"
            className="mt-3"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await turnOffReminders(token)
              setBusy(false)
              setState('off')
              setNote('Off. No more reminders on this device.')
            }}
          >
            Turn it off
          </Btn>
        </>
      )}

      {available && state === 'off' && (
        <>
          <p className="font-black text-slate-800">Remind us at</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {HOURS.map((h) => (
              <button
                key={h}
                onClick={() => setHour(h)}
                className={`min-h-11 rounded-2xl border-2 px-4 font-black ${h === hour ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
              >
                {label(h)}
              </button>
            ))}
          </div>
          <Btn
            size="md"
            className="mt-3"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setNote(null)
              const result = await turnOnReminders(token, hour)
              setBusy(false)
              if (!result.ok) {
                setState(await reminderState())
                return setNote(result.error ?? null)
              }
              setState('on')
              setNote(`Set for ${label(hour)}, on days they have not played.`)
            }}
          >
            {busy ? 'Setting up…' : `Remind me at ${label(hour)}`}
          </Btn>
          <p className="mt-2 text-xs font-semibold text-slate-400">
            Your browser will ask permission next. Say no and nothing changes, though we cannot ask a
            second time.
          </p>
        </>
      )}

      {note && <p className="mt-3 text-sm font-bold text-slate-700">{note}</p>}
    </Card>
  )
}

function ChangeCodeCard() {
  const current = useStore((s) => s.device.parentPin)
  const updateSettings = useStore((s) => s.updateSettings)
  const token = useStore((s) => s.device.authToken)

  const [open, setOpen] = useState(false)
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [reveal, setReveal] = useState(false)
  const [peek, setPeek] = useState(false)
  const [saved, setSaved] = useState(false)

  /* A revealed code should not be left on screen for the next person holding
     the tablet, so it puts itself away. */
  useEffect(() => {
    if (!peek) return
    const t = window.setTimeout(() => setPeek(false), 8000)
    return () => window.clearTimeout(t)
  }, [peek])

  const complete = /^\d{4}$/.test(next)
  const guessable = complete && GUESSABLE.has(next)
  const mismatch = again.length === 4 && again !== next
  const unchanged = complete && next === current
  const canSave = complete && again === next && !guessable && !unchanged

  const suggest = () => {
    let code = ''
    do {
      code = String(Math.floor(Math.random() * 10_000)).padStart(4, '0')
    } while (GUESSABLE.has(code) || code === current)
    setNext(code)
    setAgain(code)
    setReveal(true)
  }

  const close = () => {
    setOpen(false)
    setNext('')
    setAgain('')
    setReveal(false)
  }

  return (
    <Card className="p-5 border-slate-200">
      <h2 className="font-black text-slate-900 mb-1">Grown-up code</h2>
      <p className="text-xs font-semibold text-slate-400 mb-3">
        Four digits, guarding this area. Change it the moment your child works it out, and they will.
      </p>

      {!open ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-2xl font-black tracking-[0.4em] text-slate-800">
            {peek ? current : '••••'}
          </span>
          <Btn variant="secondary" size="md" onClick={() => setPeek((v) => !v)}>
            {peek ? '🙈 Hide' : '👁 Show mine'}
          </Btn>
          <Btn size="md" onClick={() => setOpen(true)}>
            Change code
          </Btn>
          {saved && <span className="text-sm font-bold text-emerald-700">Saved. The old code no longer works.</span>}
          {current === '1234' && (
            <p className="w-full rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900">
              This is still the code Brainy ships with. Any child who has seen another tablet will try it
              first.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <CodeField id="pin-new" label="New code" value={next} reveal={reveal} onChange={setNext} />
            <CodeField id="pin-again" label="Again, to be sure" value={again} reveal={reveal} onChange={setAgain} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Btn variant="secondary" size="sm" onClick={() => setReveal((v) => !v)}>
              {reveal ? '🙈 Hide digits' : '👁 Show digits'}
            </Btn>
            <Btn variant="secondary" size="sm" onClick={suggest}>
              🎲 Suggest one
            </Btn>
          </div>

          {guessable && (
            <p className="text-sm font-bold text-amber-700">
              That is one of the first codes a child tries. Pick another, or tap Suggest one.
            </p>
          )}
          {unchanged && <p className="text-sm font-bold text-slate-500">That is the code you already have.</p>}
          {mismatch && <p className="text-sm font-bold text-rose-700">The two do not match.</p>}

          <p className="text-xs font-semibold text-slate-400">
            {token
              ? 'Saved to your account as well, so your other tablets use the same code. Forget it and you can reset it from the code pad with an email.'
              : 'This tablet has no account, so this code lives here only. Sign in above and it is saved to your account, which is how you would reset it if you forgot it.'}
          </p>

          <div className="flex flex-wrap gap-2">
            <Btn
              size="md"
              disabled={!canSave}
              onClick={() => {
                updateSettings({ parentPin: next })
                /* The account copy is what a second tablet adopts and what a
                   forgotten code is reset against. Best effort: a failed upload
                   must not stop a parent changing the code on the tablet in
                   their hand, and the next successful change carries it up. */
                if (token) void setParentPinOnServer(token, next)
                setSaved(true)
                close()
              }}
            >
              Save the new code
            </Btn>
            <Btn variant="secondary" size="md" onClick={close}>
              Cancel
            </Btn>
          </div>
        </div>
      )}
    </Card>
  )
}

/**
 * Questions the child said were wrong, for a grown-up to look at.
 *
 * The child taps "I think this is wrong" during a quest and it lands here.
 * Nothing has left the tablet at that point, and nothing does until this card
 * is used: the parent reads the question, decides whether it really is broken
 * or whether their child misread it, and only then sends it. That ordering is
 * the whole point. It is also the more useful report for us, because it arrives
 * with a grown-up's judgement attached.
 */
function FlaggedCard() {
  const flagged = useStore((s) => s.device.flagged)
  const resolveFlag = useStore((s) => s.resolveFlag)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const open = useMemo(() => flagged.filter((f) => !f.sent), [flagged])
  if (open.length === 0) return null

  return (
    <Card className="p-5 border-amber-300 bg-amber-50">
      <h2 className="font-black text-amber-900 mb-1">
        {open.length === 1 ? 'A question your child flagged' : `${open.length} questions your child flagged`}
      </h2>
      <p className="text-sm font-semibold text-amber-800 mb-3">
        They tapped &ldquo;I think this is wrong&rdquo; during a quest. Nothing has been sent. Have a
        look, and send us the ones that really are wrong: a report with a grown-up&apos;s eye on it is
        the most useful thing we get.
      </p>

      <div className="space-y-3">
        {open.map((f) => (
          <div key={f.id} className="rounded-2xl border-2 border-amber-200 bg-white p-3">
            <p className="text-xs font-black uppercase tracking-wide text-amber-500">
              {f.learnerName} · {friendlyDate(f.at)}
            </p>
            <p className="mt-1 font-bold text-slate-800">{f.prompt}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              They answered <b className="text-slate-700">{f.given}</b>. Brainy wanted{' '}
              <b className="text-slate-700">{f.expected}</b>.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Btn
                size="sm"
                disabled={busy === f.id}
                onClick={async () => {
                  setBusy(f.id)
                  setNote(null)
                  const ok = await sendReport({
                    type: 'feedback',
                    app: APP_VERSION,
                    category: 'wrong',
                    /* No name and no date: the question, the answer given and the
                       expected one are all we need to fix it. */
                    message: [
                      'Flagged by the child during a quest.',
                      `skill: ${f.skillId}`,
                      `question: ${f.prompt}`,
                      `they answered: ${f.given}`,
                      `expected: ${f.expected}`,
                    ].join('\n'),
                  })
                  setBusy(null)
                  if (ok) resolveFlag(f.id, true)
                  else setNote('Could not send that just now. It is still here, so try again later.')
                }}
              >
                {busy === f.id ? 'Sending…' : 'Send this to us'}
              </Btn>
              <Btn variant="secondary" size="sm" onClick={() => resolveFlag(f.id, false)}>
                It was fine
              </Btn>
            </div>
          </div>
        ))}
      </div>
      {note && <p className="mt-3 text-sm font-bold text-rose-700">{note}</p>}
    </Card>
  )
}

function SettingsTab({ autoHint, stats }: { autoHint: string; stats: Analytics }) {
  const store = useStore()
  const profile = useProfile()
  const settings = useSettings()
  const curriculum = useCurriculum()
  const updateSettings = store.updateSettings
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteUnderstood, setDeleteUnderstood] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [forgetNote, setForgetNote] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [lockNote, setLockNote] = useState(useStore.getState().device.lockNote)
  const [copied, setCopied] = useState<string | null>(null)
  const { totals } = useLearnerData()
  const summaryText = buildSharableSummary(
    curriculum.id,
    profile.yearBand,
    stats,
    totals,
    APP_VERSION,
  )
  const fileRef = useRef<HTMLInputElement>(null)

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
      className={`grid h-11 w-16 items-center rounded-full border-2 transition ${on ? 'bg-emerald-500 border-emerald-600' : 'bg-slate-200 border-slate-300'}`}
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
                /*
                 * Land on a class that can actually be taught. bandForAge can
                 * return a year the pack has nothing for — a 7-year-old on the
                 * American pack maps to Grade 2, which exists, but a
                 * 5-year-old maps to Kindergarten, which is empty.
                 */
                const teachable = playableBands(c.id)
                const wanted = profile.age
                  ? bandForAge(c.id, profile.age).id
                  : c.yearBands.some((b) => b.id === profile.yearBand)
                    ? profile.yearBand
                    : c.yearBands[Math.min(2, c.yearBands.length - 1)].id
                const band = teachable.some((b) => b.id === wanted)
                  ? wanted
                  : (teachable[0]?.id ?? wanted)
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
          {playableBands(curriculum.id).map((b) => (
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
            class directly to match your child's current or next class.
          </p>
        )}
        <p className="mt-2 text-xs font-semibold text-slate-400">
          Includes {includedBands(curriculum.id, profile.yearBand).length} year band
          {includedBands(curriculum.id, profile.yearBand).length === 1 ? '' : 's'} of content, and earlier years
          stay in the mix as revision.
        </p>
      </Card>

      <Card className="p-5 border-slate-200">
        <h2 className="font-black text-slate-900 mb-1">Difficulty</h2>
        <p className="text-xs font-semibold text-slate-400 mb-3">
          Auto aims for about 8 right out of 10: hard enough to be learning, easy enough to stay
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
                <span className="block text-[11px] sm:text-xs uppercase tracking-wide opacity-80">{choice.label}</span>
              </button>
            )
          })}
        </div>

        <p className="mt-3 text-sm font-bold text-slate-500">
          {settings.difficultyOverride === null
            ? autoHint
            : `Every question will be pitched at level ${settings.difficultyOverride}. Mastery is still tracked, but the level will not move on its own, including when he gets several wrong in a row.`}
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
          hint="Adds a countdown to each question. Off by default, because timing tends to measure anxiety at this age."
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

      <RemindersCard />

      <ChangeCodeCard />

      {/*
        Pausing the app.

        First card in Settings on purpose: a parent reaching for this is
        usually reaching for it in a hurry, at bedtime or over homework.
      */}
      <Card className="p-5 border-slate-200">
        <h2 className="font-black text-slate-900 mb-1">Pause Brainy</h2>
        <p className="text-sm font-semibold text-slate-500 mb-3">
          Locks the app for everyone on this device. Your child sees a friendly &ldquo;taking a
          break&rdquo; screen and needs this code to get back in.
        </p>
        <label htmlFor="locknote" className="block font-black text-slate-800 text-sm">
          Leave them a message (optional)
        </label>
        <input
          id="locknote"
          value={lockNote}
          onChange={(e) => setLockNote(e.target.value.slice(0, 80))}
          placeholder="e.g. Homework first, then Brainy!"
          className="mt-1 w-full h-12 rounded-2xl border-2 border-slate-300 px-3 font-semibold outline-none focus:border-slate-900"
        />
        <Btn
          variant="danger"
          size="lg"
          full
          className="mt-3"
          onClick={() => store.setLocked(true, lockNote)}
        >
          🔒 Lock now
        </Btn>
        <p className="mt-2 text-xs font-semibold text-slate-400">
          This is a soft lock, not a security feature. An older child who knows their way around a
          browser could clear its storage. It is here so &ldquo;not now&rdquo; sticks without taking
          the tablet away.
        </p>
      </Card>

      {/*
        Helping us improve without breaking the promise.

        The app still makes no network requests. This builds a de-identified
        summary, shows the parent exactly what it says, and copies it to the
        clipboard — they decide whether to send it and to whom.
      */}
      <Card className="p-5 border-slate-200">
        <h2 className="font-black text-slate-900 mb-1">Help improve Brainy</h2>
        <p className="text-sm font-semibold text-slate-500 mb-3">
          There is no tracking in Brainy, so the only way we learn what is working is if you tell us.
          This builds a short summary with no name, no dates and nothing your child typed, just which
          topics are going badly, which is how we find questions that are wrong or badly pitched. Read
          it before you send it.
        </p>
        {/* The one consent in the app. Everything that leaves the device is behind it. */}
        <div className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 p-3 mb-3">
          <div className="min-w-0">
            <p className="font-black text-slate-800">Share anonymous usage data</p>
            <p className="text-xs font-semibold text-slate-500">
              On by default, and off in one tap. Brainy sends how often it is opened, how many
              questions were answered, and which topics score worst, plus a random code so the same
              tablet is not counted twice. Never your child&apos;s name, age, or anything they typed.
              Turning it off deletes the code and asks us to delete what was already sent.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={settings.shareUsage}
            aria-label="Share anonymous usage data"
            onClick={async () => {
              if (!settings.shareUsage) {
                setForgetNote(null)
                store.setShareUsage(true)
                return
              }
              /*
               * Turning off used to stop collection but strand the rows
               * already sent, because destroying the id removed the only way
               * to find them. Grab it first, flip the switch straight away so
               * the toggle stays responsive, then ask the server to erase
               * them using the copy we kept.
               */
              const { installId } = useStore.getState().device
              store.setShareUsage(false)
              if (!installId) return
              setForgetNote('Deleting what we already had…')
              setForgetNote(
                (await sendForget(installId))
                  ? 'Sharing is off, and the records we already had have been deleted.'
                  : 'Sharing is off, so nothing more will be sent. We could not reach our server to delete the records already sent. They carry no name, and the code that linked them to this tablet is now gone.',
              )
            }}
            className={`mt-1 grid h-11 w-16 shrink-0 items-center rounded-full border-2 transition ${settings.shareUsage ? 'bg-emerald-500 border-emerald-600' : 'bg-slate-200 border-slate-300'}`}
          >
            <span
              className={`block size-7 rounded-full bg-white shadow transition-transform ${settings.shareUsage ? 'translate-x-7' : 'translate-x-0.5'}`}
            />
          </button>
        </div>

        {forgetNote && (
          <p className="mb-3 rounded-xl bg-slate-100 p-3 text-sm font-bold text-slate-700">{forgetNote}</p>
        )}

        <Btn variant="secondary" size="md" onClick={() => setShowSummary((v) => !v)}>
          {showSummary ? 'Hide summary' : '📋 See what would be sent'}
        </Btn>
        {showSummary && (
          <div className="mt-3">
            <pre className="max-h-64 overflow-auto rounded-xl bg-slate-900 p-3 text-xs leading-relaxed text-slate-100 whitespace-pre-wrap">
              {summaryText}
            </pre>
            <div className="mt-2 flex flex-wrap gap-2">
              <Btn
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(summaryText)
                    setCopied('Copied. Paste it wherever you like.')
                  } catch {
                    setCopied('Could not copy. Select the text above instead.')
                  }
                }}
              >
                Copy to clipboard
              </Btn>
              <Btn
                size="sm"
                variant="secondary"
                onClick={async () => {
                  setCopied('Sending…')
                  const ok = await sendReport({
                    type: 'weekly',
                    week: isoWeek(),
                    app: APP_VERSION,
                    children: [summaryText],
                    installId: useStore.getState().device.installId ?? undefined,
                  })
                  setCopied(ok ? 'Sent. Thank you.' : 'Could not send. Copy it and message us instead.')
                }}
              >
                Send it now
              </Btn>
              {copied && <span className="self-center text-sm font-bold text-emerald-700">{copied}</span>}
            </div>
          </div>
        )}
      </Card>

      <FlaggedCard />

      <FeedbackCard summary={summaryText} />

      <Card className="p-5 border-slate-200">
        <h2 className="font-black text-slate-900 mb-1">Your data</h2>
        <p className="text-sm font-semibold text-slate-500 mb-3">
          Their answers, their report and everything they typed are on this device only. What we hold
          in your account is your email, your licence and their scores, and the switch above turns that
          off and deletes it. No advertising, ever.
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

      {/*
        Kept in its own card rather than beside "Reset progress". The two read
        alike at a glance but one keeps the children and the other does not,
        and a mis-tap here cannot be undone.
      */}
      <Card className="p-5 border-rose-200 bg-rose-50/40">
        <h2 className="font-black text-rose-900 mb-1">Delete everything</h2>
        <p className="text-sm font-semibold text-rose-800/70 mb-3">
          Removes every child, all their progress and coins, your grown-up code and every setting,
          and takes Brainy back to how it was before you first opened it. There is no account to
          recover it from, so export a backup first if there is any chance you will want it.
        </p>
        <Btn
          variant="danger"
          size="md"
          onClick={() => {
            setDeleteUnderstood(false)
            setDeleteError(null)
            setConfirmDelete(true)
          }}
        >
          Delete everything
        </Btn>
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

      <Modal
        open={confirmDelete}
        onClose={() => (deleting ? undefined : setConfirmDelete(false))}
        title="Delete everything?"
      >
        <p className="font-bold text-slate-600">This removes, permanently and on this device:</p>
        <ul className="mt-2 space-y-1 font-bold text-slate-600">
          <li>· Every child and their whole history</li>
          <li>· All coins, characters and pets</li>
          <li>· Your grown-up code and every setting</li>
        </ul>
        {settings.licence && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 font-bold text-amber-900">
            Your access code <b>{settings.licence.code}</b> is removed from this device too. The
            licence itself is not cancelled. Write the code down and you can enter it again here or
            on another device.
          </p>
        )}
        {settings.shareUsage && (
          <p className="mt-3 rounded-xl bg-slate-100 p-3 font-bold text-slate-700">
            You are sharing anonymous usage. We will ask our server to delete those records too
            before wiping this device. After that the link to them is gone for good.
          </p>
        )}

        <label className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-slate-200 bg-white p-3">
          <input
            type="checkbox"
            checked={deleteUnderstood}
            onChange={(e) => setDeleteUnderstood(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-rose-600"
          />
          <span className="font-bold text-slate-700">
            I understand this cannot be undone and no backup can be recovered afterwards.
          </span>
        </label>

        {deleteError && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 font-bold text-amber-900">{deleteError}</p>
        )}

        <div className="mt-5 flex gap-3">
          <Btn
            variant="secondary"
            size="lg"
            full
            disabled={deleting}
            onClick={() => setConfirmDelete(false)}
          >
            Cancel
          </Btn>
          <Btn variant="secondary" size="lg" full disabled={deleting} onClick={download}>
            ⬇ Back up
          </Btn>
        </div>
        <Btn
          variant="danger"
          size="lg"
          full
          className="mt-3"
          disabled={!deleteUnderstood || deleting}
          onClick={async () => {
            setDeleting(true)
            setDeleteError(null)
            /*
             * Server first, device second. The install id is the only handle
             * on those rows, so wiping it before the call would leave them
             * permanently unreachable — the opposite of what was asked for.
             * If the call fails the device is left untouched and the parent
             * is told, rather than being assured of a deletion that did not
             * happen.
             */
            const { installId, shareUsage } = useStore.getState().device
            if (shareUsage && installId && !(await sendForget(installId))) {
              setDeleting(false)
              setDeleteError(
                'Could not reach our server to delete the shared usage records, so nothing has been deleted yet. Check your connection and try again, or turn off "Help improve Brainy" first to delete just this device.',
              )
              return
            }
            store.resetEverything()
          }}
        >
          {deleting ? 'Deleting…' : 'Delete everything'}
        </Btn>
      </Modal>
    </div>
  )
}
