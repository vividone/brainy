/**
 * One subject: its islands, or — if it is not authored yet — what it will
 * cover when it lands.
 *
 * Splitting this out of Home is what let the subject list become a grid.
 */

import { useMemo } from 'react'
import { Btn, Card, IconBtn, Pill, ProgressBar, Screen } from '../components/ui'
import { islandStyle } from '../game/theme'
import { sfx } from '../lib/sound'
import {
  subjectStyle,
  summariseStrands,
  summariseSubject,
  totalStarsEarned,
  useBands,
  useCurriculum,
  useLevelStars,
  useProgress,
} from '../state/selectors'
import { useStore } from '../state/store'

interface Props {
  subjectId: string
  onBack: () => void
  onOpenIsland: (strandId: string) => void
}

export function Subject({ subjectId, onBack, onOpenIsland }: Props) {
  const curriculum = useCurriculum()
  const bands = useBands()
  const progress = useProgress()
  const levelStars = useLevelStars()
  const yearBand = useStore((s) => s.profile.yearBand)

  const subject = curriculum.subjects.find((s) => s.id === subjectId)

  const strands = useMemo(
    () => (subject ? summariseStrands(curriculum.id, subject, bands, progress, levelStars) : []),
    [curriculum.id, subject, bands, progress, levelStars],
  )
  const summary = useMemo(
    () => (subject ? summariseSubject(curriculum.id, subject, bands, progress, levelStars) : null),
    [curriculum.id, subject, bands, progress, levelStars],
  )

  if (!subject || !summary) return null

  const style = subjectStyle(subject.color)
  const bandLabel = curriculum.yearBands.find((b) => b.id === yearBand)?.label ?? ''
  const totalStars = totalStarsEarned(levelStars)
  const ready = subject.available && strands.length > 0

  return (
    <Screen>
      <header className="flex items-center gap-3 pt-1">
        <IconBtn label="Back" onClick={onBack}>
          ←
        </IconBtn>
        <div
          className={`grid place-items-center size-14 shrink-0 rounded-2xl bg-gradient-to-br ${style.grad} text-3xl border-2 border-white`}
        >
          {subject.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black text-brand-900 truncate">{subject.name}</h1>
          <p className="text-sm font-semibold text-brand-500">{bandLabel}</p>
        </div>
        {ready && (
          <Pill className="bg-yellow-100 text-yellow-900 shrink-0">
            ⭐ {summary.starsEarned}/{summary.starsPossible}
          </Pill>
        )}
      </header>

      {ready ? (
        <>
          <Card className={`mt-4 p-4 ${style.soft} border-transparent`}>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl font-black text-brand-900 tabular-nums">{summary.skillCount}</p>
                <p className="text-[11px] font-black uppercase tracking-wide text-brand-400">Skills</p>
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-600 tabular-nums">{summary.masteredCount}</p>
                <p className="text-[11px] font-black uppercase tracking-wide text-brand-400">Mastered</p>
              </div>
              <div>
                <p className="text-2xl font-black text-amber-600 tabular-nums">
                  {Math.round(summary.mastery * 100)}%
                </p>
                <p className="text-[11px] font-black uppercase tracking-wide text-brand-400">Overall</p>
              </div>
            </div>
          </Card>

          <ol className="mt-4 space-y-3">
            {strands.map((s) => {
              const island = islandStyle(s.strand.theme)
              const pct = s.starsPossible ? (s.starsEarned / s.starsPossible) * 100 : 0
              const complete = s.starsPossible > 0 && s.starsEarned === s.starsPossible

              return (
                <li key={s.strand.id}>
                  <Card
                    onClick={
                      s.unlocked
                        ? () => {
                            sfx.whoosh()
                            onOpenIsland(s.strand.id)
                          }
                        : undefined
                    }
                    className={`p-3 sm:p-4 flex items-center gap-3 sm:gap-4 ${s.unlocked ? '' : 'opacity-60'}`}
                  >
                    <div
                      className={`grid place-items-center size-16 sm:size-20 shrink-0 rounded-2xl bg-gradient-to-br ${island.gradient} text-3xl sm:text-4xl border-2 border-white shadow-inner`}
                    >
                      {s.unlocked ? island.emoji : '🔒'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg sm:text-xl font-black text-brand-900 truncate">
                          {s.strand.name}
                        </h3>
                        {complete && (
                          <span className="text-xl" title="Island complete">
                            🏆
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-brand-500 truncate">
                        {s.unlocked
                          ? s.strand.blurb
                          : `Earn ${s.requiredStars} stars to unlock (you have ${totalStars})`}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <ProgressBar
                          pct={pct}
                          className="h-2.5 flex-1"
                          barClass="bg-gradient-to-r from-amber-400 to-amber-500"
                          label={`${s.strand.name} progress`}
                        />
                        <span className="text-xs font-black text-brand-500 tabular-nums shrink-0">
                          ⭐ {s.starsEarned}/{s.starsPossible}
                        </span>
                      </div>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ol>
        </>
      ) : (
        <Card className="mt-4 p-6 sm:p-8 text-center">
          <div className="text-6xl mb-3">{subject.icon}</div>
          <h2 className="text-2xl font-black text-brand-900">{subject.name}</h2>
          <p className="mt-2 font-bold text-brand-500 max-w-md mx-auto">{subject.comingSoon}</p>
          <Pill className="mt-4 bg-brand-100 text-brand-700">Coming soon</Pill>

          {subject.plannedTopics && subject.plannedTopics.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-black uppercase tracking-wide text-brand-400 mb-2">
                What will be in here
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {subject.plannedTopics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full bg-brand-50 border-2 border-brand-200 px-3 py-1.5 text-sm font-bold text-brand-700"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <Btn variant="secondary" size="lg" full className="mt-6" onClick={onBack}>
        ← All subjects
      </Btn>
    </Screen>
  )
}
