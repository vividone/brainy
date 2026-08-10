/** My Room — trophies, badges and the dressed-up mascot. Pure reward. */

import { useMemo } from 'react'
import { Mascot } from '../components/Mascot'
import { Card, IconBtn, Pill, ProgressBar, Screen } from '../components/ui'
import {
  BADGES,
  GROUP_LABEL,
  GROUP_ORDER,
  badgeProgressAll,
  badgesInOrder,
  type BadgeGroup,
} from '../game/badges'
import { characterById, petById } from '../game/characters'
import { levelProgress } from '../engine/scoring'
import { subjectsForBand } from '../engine/registry'
import { islandStyle } from '../game/theme'
import { useLearnerData, useProfile } from '../state/store'
import {
  summariseStrands,
  totalStarsEarned,
  useBadgeContext,
  useBands,
  useCurriculum,
  useLevelStars,
  useProgress,
} from '../state/selectors'

const ROOM_BACKDROPS: Record<string, string> = {
  'room.sky': 'from-sky-200 via-sky-100 to-white',
  'room.night': 'from-indigo-900 via-indigo-700 to-purple-500',
  'room.jungle': 'from-green-300 via-lime-200 to-emerald-100',
  'room.space': 'from-slate-900 via-purple-900 to-indigo-800',
}

export function Room({ onBack }: { onBack: () => void }) {
  const profile = useProfile()
  const { economy, streak, badges, totals } = useLearnerData()
  const curriculum = useCurriculum()
  const bands = useBands()
  const progress = useProgress()
  const levelStars = useLevelStars()
  const badgeCtx = useBadgeContext()

  const level = levelProgress(economy.xp)
  const stars = totalStarsEarned(levelStars)

  /*
   * Trophies from every subject this child takes, not just maths.
   *
   * This read `subjects.find(s => s.id === 'maths')`, which was fine when maths
   * was the only authored subject and quietly wrong afterwards: a child who
   * three-starred every level of a Verbal Reasoning island won a trophy that
   * existed in the data and appeared nowhere on the one screen built to show it.
   */
  const trophies = useMemo(
    () =>
      subjectsForBand(curriculum.id, profile.yearBand).flatMap((subject) =>
        summariseStrands(curriculum.id, subject, bands, progress, levelStars)
          .filter((s) => s.starsPossible > 0 && s.starsEarned === s.starsPossible)
          .map((s) => ({ strand: s.strand, icon: subject.icon })),
      ),
    [curriculum.id, profile.yearBand, bands, progress, levelStars],
  )

  const held = useMemo(() => new Set(badges), [badges])
  const progressById = useMemo(() => badgeProgressAll(badgeCtx), [badgeCtx])
  /* Only ids the roster still knows, so a retired badge can never inflate the
     count past the total shown beside it. */
  const earnedCount = BADGES.filter((b) => held.has(b.id)).length

  const byGroup = useMemo(() => {
    const groups = new Map<BadgeGroup, ReturnType<typeof badgesInOrder>>()
    for (const badge of badgesInOrder()) {
      const list = groups.get(badge.group) ?? []
      list.push(badge)
      groups.set(badge.group, list)
    }
    return GROUP_ORDER.filter((g) => groups.has(g)).map((g) => ({ group: g, badges: groups.get(g)! }))
  }, [])

  const room = economy.equipped.room
  const backdrop = (room && ROOM_BACKDROPS[room]) ?? 'from-brand-100 via-brand-50 to-white'
  const dark = room === 'room.night' || room === 'room.space'

  return (
    <Screen>
      <header className="flex items-center gap-3 pt-1">
        <IconBtn label="Back" onClick={onBack}>
          ←
        </IconBtn>
        <h1 className="flex-1 text-2xl font-black text-brand-900">🏠 {profile.name}'s Room</h1>
        <Pill className="bg-amber-100 text-amber-900">🪙 {economy.coins}</Pill>
      </header>

      <div
        className={`mt-4 rounded-3xl border-3 border-brand-300 bg-gradient-to-b ${backdrop} p-6 text-center relative overflow-hidden`}
        style={{ borderWidth: 3 }}
      >
        {dark && (
          <>
            <span className="absolute left-6 top-5 text-xl">✨</span>
            <span className="absolute right-8 top-10 text-sm">⭐</span>
            <span className="absolute left-1/3 top-3 text-xs">✨</span>
            <span className="absolute right-1/4 top-20 text-base">⭐</span>
          </>
        )}
        <div className="mx-auto size-44 sm:size-52 relative">
          <Mascot
            characterId={economy.equipped.character}
            petId={economy.equipped.pet}
            mood="happy"
            hat={economy.equipped.hat}
            eyes={economy.equipped.eyes}
            neck={economy.equipped.neck}
            float
            className="w-full h-full"
          />
        </div>
        <p className={`mt-2 text-2xl font-black ${dark ? 'text-white' : 'text-brand-900'}`}>
          {characterById(economy.equipped.character).name} &amp; {petById(economy.equipped.pet).name.split(' ')[0]}
        </p>
        <p className={`font-bold ${dark ? 'text-brand-100' : 'text-brand-500'}`}>
          Level {level.level} · {stars} ⭐ · {streak.longest} day best streak
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Questions', value: String(totals.questions), emoji: '❓' },
          { label: 'Correct', value: String(totals.correct), emoji: '✅' },
          { label: 'Badges', value: `${earnedCount}/${BADGES.length}`, emoji: '🏅' },
        ].map((s) => (
          <Card key={s.label} className="p-3 text-center">
            <p className="text-2xl">{s.emoji}</p>
            <p className="text-2xl font-black text-brand-900 tabular-nums">{s.value}</p>
            <p className="text-xs font-black uppercase tracking-wide text-brand-400">{s.label}</p>
          </Card>
        ))}
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-black text-brand-900 mb-2">🏆 Trophies</h2>
        {trophies.length === 0 ? (
          <Card className="p-5 text-center">
            <p className="font-bold text-brand-500">
              Get all three stars on every level of an island to win its trophy.
            </p>
          </Card>
        ) : (
          <div className="flex flex-wrap gap-3">
            {trophies.map((t) => {
              const style = islandStyle(t.strand.theme)
              return (
                <div
                  key={t.strand.id}
                  className={`rounded-2xl bg-gradient-to-br ${style.gradient} p-3 text-center border-2 border-white shadow`}
                >
                  <span className="block text-3xl">{style.emoji}</span>
                  <span className="block text-xs font-black text-white drop-shadow">{t.strand.name}</span>
                  <span className="block text-[10px] font-bold text-white/80">{t.icon}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/*
        Grouped rather than one flat wall of tiles, and every locked badge says
        how far along it is. A padlock with no goal behind it is just a reminder
        of something you have not done; "4 of 7 days" is something to go and do.
      */}
      <section className="mt-6">
        <h2 className="text-lg font-black text-brand-900 mb-1">🏅 Badges</h2>
        <p className="text-sm font-bold text-brand-400 mb-3">
          {earnedCount} of {BADGES.length} won
        </p>

        {byGroup.map(({ group, badges: list }) => (
          <div key={group} className="mt-4">
            <p className="text-xs font-black uppercase tracking-wide text-brand-400 mb-2">
              {GROUP_LABEL[group]}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {list.map((b) => {
                const earned = held.has(b.id)
                const p = progressById[b.id]
                const showBar = !earned && !b.binary && p.have > 0

                return (
                  <Card key={b.id} className={`p-3 ${earned ? '' : 'opacity-60'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl shrink-0">{earned ? b.emoji : '🔒'}</span>
                      <div className="min-w-0">
                        <p className="font-black text-brand-900 text-sm leading-tight truncate">{b.name}</p>
                        <p className="text-xs font-bold text-brand-500 leading-tight">{b.description}</p>
                      </div>
                    </div>

                    {showBar && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <ProgressBar
                          pct={p.pct}
                          className="h-2 flex-1"
                          barClass="bg-gradient-to-r from-brand-400 to-brand-600"
                          label={`${b.name} progress`}
                        />
                        <span className="text-[11px] font-black text-brand-500 tabular-nums shrink-0">
                          {p.have}/{p.need}
                        </span>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
      </section>
    </Screen>
  )
}
