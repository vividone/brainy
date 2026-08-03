/**
 * Home — the child's front door: streak, daily quest, and the subject grid.
 *
 * The subjects were a horizontally scrolling tab row. With seven subjects
 * that meant most of them were off-screen and a 7-year-old never found them.
 * A grid shows every subject at once, and tapping one opens it.
 */

import { useMemo } from 'react'
import { Mascot } from '../components/Mascot'
import { Btn, Card, IconBtn, Pill, ProgressBar, Screen } from '../components/ui'
import { levelProgress } from '../engine/scoring'
import { useLearnerData, useProfile } from '../state/store'
import {
  subjectStyle,
  summariseSubject,
  totalStarsEarned,
  useBands,
  useCurriculum,
  useLevelStars,
  useProgress,
} from '../state/selectors'
import { subjectsForBand } from '../engine/registry'
import { sfx } from '../lib/sound'

interface Props {
  onOpenSubject: (subjectId: string) => void
  onDailyQuest: () => void
  onOpenShop: () => void
  onOpenRoom: () => void
  onOpenParent: () => void
}

export function Home({ onOpenSubject, onDailyQuest, onOpenShop, onOpenRoom, onOpenParent }: Props) {
  const curriculum = useCurriculum()
  const bands = useBands()
  const progress = useProgress()
  const levelStars = useLevelStars()
  const profile = useProfile()
  const { economy, streak } = useLearnerData()

  const level = levelProgress(economy.xp)
  const stars = totalStarsEarned(levelStars)
  const bandLabel = curriculum.yearBands.find((b) => b.id === profile.yearBand)?.label ?? ''

  /* Only the subjects this class actually takes — Agric Science on a Basic 1
     child's home screen would be noise, not motivation. */
  const subjects = useMemo(
    () =>
      subjectsForBand(curriculum.id, profile.yearBand).map((s) =>
        summariseSubject(curriculum.id, s, bands, progress, levelStars),
      ),
    [curriculum.id, profile.yearBand, bands, progress, levelStars],
  )

  return (
    <Screen>
      {/* Top bar ------------------------------------------------------- */}
      <header className="flex items-center gap-3 pt-1">
        <button
          onClick={() => {
            sfx.tap()
            onOpenRoom()
          }}
          className="shrink-0 size-16 sm:size-20 rounded-full bg-white border-3 border-brand-300 p-1 active:translate-y-[2px]"
          style={{ borderWidth: 3 }}
          aria-label="Open my room"
        >
          <Mascot
            colour={profile.colour}
            mood="happy"
            hat={economy.equipped.hat}
            eyes={economy.equipped.eyes}
            neck={economy.equipped.neck}
            className="w-full h-full"
          />
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-xl sm:text-2xl font-black text-brand-900 truncate">Hi {profile.name}!</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-black text-brand-500 shrink-0">LVL {level.level}</span>
            <ProgressBar pct={level.pct} className="h-2.5" label={`Level ${level.level} progress`} />
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex gap-1.5">
            <Pill className="bg-amber-100 text-amber-900" title="Coins">
              🪙 {economy.coins}
            </Pill>
            <Pill
              className={streak.current > 0 ? 'bg-orange-100 text-orange-900' : 'bg-slate-100 text-slate-500'}
              title="Day streak"
            >
              🔥 {streak.current}
            </Pill>
          </div>
          <Pill className="bg-yellow-100 text-yellow-900" title="Total stars">
            ⭐ {stars}
          </Pill>
        </div>

        <IconBtn label="Grown-ups" onClick={onOpenParent} className="shrink-0">
          👤
        </IconBtn>
      </header>

      {/* Daily quest --------------------------------------------------- */}
      <Card className="mt-5 overflow-hidden border-brand-400">
        <div className="bg-gradient-to-r from-brand-600 to-brand-500 p-5 text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-wide text-brand-100">Today's quest</p>
              <h2 className="text-2xl sm:text-3xl font-black">Daily Quest</h2>
              <p className="text-brand-100 font-bold text-sm mt-1">
                Picked just for you — new skills plus a bit of revision.
              </p>
            </div>
            <span className="text-5xl sm:text-6xl shrink-0" aria-hidden>
              🎯
            </span>
          </div>
          <Btn variant="gold" size="lg" full className="mt-4" onClick={onDailyQuest}>
            Start ▶
          </Btn>
        </div>
      </Card>

      {/* Subjects ------------------------------------------------------ */}
      <p className="mt-6 mb-2 text-sm font-black uppercase tracking-wide text-brand-400">
        {bandLabel} · Choose a subject
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {subjects.map((s) => {
          const style = subjectStyle(s.subject.color)
          const pct = s.starsPossible ? (s.starsEarned / s.starsPossible) * 100 : 0
          const ready = s.subject.available && s.skillCount > 0

          return (
            <Card
              key={s.subject.id}
              onClick={() => {
                sfx.whoosh()
                onOpenSubject(s.subject.id)
              }}
              className="p-0 overflow-hidden"
            >
              <div className={`bg-gradient-to-br ${style.grad} px-3 py-4 text-center relative`}>
                <span className="block text-4xl sm:text-5xl" aria-hidden>
                  {s.subject.icon}
                </span>
                {!ready && (
                  <span className="absolute top-2 right-2 text-lg" title="Coming soon">
                    🔒
                  </span>
                )}
              </div>

              <div className="p-3">
                <p className="font-black text-brand-900 leading-tight text-sm sm:text-base">
                  {s.subject.name}
                </p>

                {ready ? (
                  <>
                    <div className="mt-2 flex items-center gap-1.5">
                      <ProgressBar
                        pct={pct}
                        className="h-2 flex-1"
                        barClass="bg-gradient-to-r from-amber-400 to-amber-500"
                        label={`${s.subject.name} progress`}
                      />
                      <span className="text-[11px] font-black text-brand-500 tabular-nums shrink-0">
                        {s.starsEarned}/{s.starsPossible}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-brand-400">
                      {s.masteredCount} of {s.skillCount} skills mastered
                    </p>
                  </>
                ) : (
                  <p className="mt-1.5 text-xs font-bold text-brand-400">Coming soon — tap to see</p>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Bottom actions ------------------------------------------------ */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Btn variant="secondary" size="lg" onClick={onOpenShop}>
          🛍️ Shop
        </Btn>
        <Btn variant="secondary" size="lg" onClick={onOpenRoom}>
          🏠 My Room
        </Btn>
      </div>
    </Screen>
  )
}
