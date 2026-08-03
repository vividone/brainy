/** Home — the island map, the daily quest, and everything the child owns. */

import { useMemo, useState } from 'react'
import { Mascot } from '../components/Mascot'
import { Btn, Card, IconBtn, Pill, ProgressBar, Screen, Stars } from '../components/ui'
import { levelProgress } from '../engine/scoring'
import { islandStyle } from '../game/theme'
import { useStore } from '../state/store'
import { summariseStrands, totalStarsEarned, useBands, useCurriculum, useLevelStars, useProgress } from '../state/selectors'
import { sfx } from '../lib/sound'

interface Props {
  onOpenIsland: (strandId: string) => void
  onDailyQuest: () => void
  onOpenShop: () => void
  onOpenRoom: () => void
  onOpenParent: () => void
}

export function Home({ onOpenIsland, onDailyQuest, onOpenShop, onOpenRoom, onOpenParent }: Props) {
  const curriculum = useCurriculum()
  const bands = useBands()
  const progress = useProgress()
  const levelStars = useLevelStars()
  const { profile, economy, streak } = useStore()
  const [subjectId, setSubjectId] = useState('maths')

  const subject = curriculum.subjects.find((s) => s.id === subjectId) ?? curriculum.subjects[0]
  const level = levelProgress(economy.xp)
  const stars = totalStarsEarned(levelStars)

  const strands = useMemo(
    () => summariseStrands(curriculum.id, subject, bands, progress, levelStars),
    [curriculum.id, subject, bands, progress, levelStars],
  )

  const bandLabel = curriculum.yearBands.find((b) => b.id === profile.yearBand)?.label ?? ''

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
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {curriculum.subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              sfx.tap()
              setSubjectId(s.id)
            }}
            className={`shrink-0 min-h-12 rounded-2xl border-3 px-4 font-black transition
              ${s.id === subject.id ? 'border-brand-600 bg-brand-600 text-white' : 'border-brand-200 bg-white text-brand-700'}
              ${s.available ? '' : 'opacity-60'}`}
            style={{ borderWidth: 3 }}
          >
            {s.icon} {s.name}
            {!s.available && <span className="ml-1.5 text-xs">🔒</span>}
          </button>
        ))}
      </div>

      {/* Islands ------------------------------------------------------- */}
      {!subject.available ? (
        <Card className="mt-4 p-6 sm:p-8 text-center">
          <div className="text-6xl mb-3">{subject.icon}</div>
          <h3 className="text-2xl font-black text-brand-900">{subject.name}</h3>
          <p className="mt-2 font-bold text-brand-500 max-w-md mx-auto">{subject.comingSoon}</p>
          <Pill className="mt-4 bg-brand-100 text-brand-700">Coming soon</Pill>

          {subject.plannedTopics && subject.plannedTopics.length > 0 && (
            <div className="mt-5">
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
      ) : (
        <div className="mt-4">
          <p className="text-sm font-black uppercase tracking-wide text-brand-400 mb-2">
            {bandLabel} · {subject.name}
          </p>

          <ol className="relative space-y-3">
            {strands.map((s, i) => {
              const style = islandStyle(s.strand.theme)
              const pct = s.starsPossible ? (s.starsEarned / s.starsPossible) * 100 : 0
              const complete = s.starsEarned === s.starsPossible && s.starsPossible > 0

              return (
                <li key={s.strand.id} className="relative">
                  {i > 0 && (
                    <span
                      aria-hidden
                      className="absolute -top-3 left-9 h-3 w-1 rounded-full bg-brand-200"
                    />
                  )}
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
                      className={`grid place-items-center size-16 sm:size-20 shrink-0 rounded-2xl bg-gradient-to-br ${style.gradient} text-3xl sm:text-4xl border-2 border-white shadow-inner`}
                    >
                      {s.unlocked ? style.emoji : '🔒'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg sm:text-xl font-black text-brand-900 truncate">
                          {s.strand.name}
                        </h3>
                        {complete && <span className="text-xl" title="Island complete">🏆</span>}
                      </div>
                      <p className="text-sm font-semibold text-brand-500 truncate">
                        {s.unlocked ? s.strand.blurb : `Earn ${s.requiredStars} stars to unlock`}
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
        </div>
      )}

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

/** Small reusable star row used on the island screen too. */
export { Stars }
