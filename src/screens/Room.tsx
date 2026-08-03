/** My Room — trophies, badges and the dressed-up mascot. Pure reward. */

import { Mascot } from '../components/Mascot'
import { Card, IconBtn, Pill, Screen } from '../components/ui'
import { BADGES } from '../game/cosmetics'
import { levelProgress } from '../engine/scoring'
import { islandStyle } from '../game/theme'
import { useStore } from '../state/store'
import { summariseStrands, totalStarsEarned, useBands, useCurriculum, useLevelStars, useProgress } from '../state/selectors'

const ROOM_BACKDROPS: Record<string, string> = {
  'room.sky': 'from-sky-200 via-sky-100 to-white',
  'room.night': 'from-indigo-900 via-indigo-700 to-purple-500',
  'room.jungle': 'from-green-300 via-lime-200 to-emerald-100',
  'room.space': 'from-slate-900 via-purple-900 to-indigo-800',
}

export function Room({ onBack }: { onBack: () => void }) {
  const { profile, economy, streak, badges, totals } = useStore()
  const curriculum = useCurriculum()
  const bands = useBands()
  const progress = useProgress()
  const levelStars = useLevelStars()

  const level = levelProgress(economy.xp)
  const stars = totalStarsEarned(levelStars)
  const maths = curriculum.subjects.find((s) => s.id === 'maths')
  const strands = maths ? summariseStrands(curriculum.id, maths, bands, progress, levelStars) : []
  const trophies = strands.filter((s) => s.starsPossible > 0 && s.starsEarned === s.starsPossible)

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
            colour={profile.colour}
            mood="happy"
            hat={economy.equipped.hat}
            eyes={economy.equipped.eyes}
            neck={economy.equipped.neck}
            float
            className="w-full h-full"
          />
        </div>
        <p className={`mt-2 text-2xl font-black ${dark ? 'text-white' : 'text-brand-900'}`}>Kolo</p>
        <p className={`font-bold ${dark ? 'text-brand-100' : 'text-brand-500'}`}>
          Level {level.level} · {stars} ⭐ · {streak.longest} day best streak
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Questions', value: totals.questions, emoji: '❓' },
          { label: 'Correct', value: totals.correct, emoji: '✅' },
          { label: 'Badges', value: badges.length, emoji: '🏅' },
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
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-black text-brand-900 mb-2">🏅 Badges</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {BADGES.map((b) => {
            const earned = badges.includes(b.id)
            return (
              <Card key={b.id} className={`p-3 flex items-center gap-2 ${earned ? '' : 'opacity-45'}`}>
                <span className="text-3xl shrink-0">{earned ? b.emoji : '🔒'}</span>
                <div className="min-w-0">
                  <p className="font-black text-brand-900 text-sm leading-tight truncate">{b.name}</p>
                  <p className="text-xs font-bold text-brand-500 leading-tight">{b.description}</p>
                </div>
              </Card>
            )
          })}
        </div>
      </section>
    </Screen>
  )
}
