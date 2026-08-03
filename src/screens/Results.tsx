/**
 * End of a session. Generous celebration, but skippable in a couple of taps.
 *
 * Finishing always pays: coins and XP land regardless of score, and only the
 * stars reflect accuracy (prd.md §5.4).
 */

import { useEffect, useState } from 'react'
import type { SessionResult } from '../engine/types'
import { levelProgress } from '../engine/scoring'
import { Mascot } from '../components/Mascot'
import { Btn, Card, Screen, Stars } from '../components/ui'
import { BADGES } from '../game/cosmetics'
import { PRAISE } from '../game/theme'
import { sfx } from '../lib/sound'
import { speak } from '../lib/speech'
import { useLearnerData, useProfile, useSettings } from '../state/store'
import type { Awards } from '../state/store'

interface Props {
  result: SessionResult
  awards: Awards
  onPlayAgain: () => void
  onHome: () => void
}

export function Results({ result, awards, onPlayAgain, onHome }: Props) {
  const profile = useProfile()
  const { economy, streak } = useLearnerData()
  const settings = useSettings()
  const [shownStars, setShownStars] = useState(0)
  const level = levelProgress(economy.xp)

  const accuracy = result.total ? Math.round((result.correctFirstTry / result.total) * 100) : 0
  const tier = result.stars === 3 ? 'great' : result.stars === 2 ? 'good' : 'okay'
  const [praise] = useState(() => PRAISE[tier][Math.floor(Math.random() * PRAISE[tier].length)])

  /* Reveal stars one at a time, each with its own chime. */
  useEffect(() => {
    sfx.complete()
    if (settings.speech) window.setTimeout(() => speak(praise), 400)
    const timers = Array.from({ length: result.stars }, (_, i) =>
      window.setTimeout(() => {
        setShownStars(i + 1)
        sfx.star(i)
      }, 500 + i * 420),
    )
    if (awards.leveledUpTo) {
      timers.push(window.setTimeout(() => sfx.levelUp(), 500 + result.stars * 420 + 300))
    }
    return () => timers.forEach(window.clearTimeout)
  }, [result.stars, awards.leveledUpTo, praise, settings.speech])

  const newBadges = BADGES.filter((b) => awards.badges.includes(b.id))

  return (
    <Screen className="max-w-2xl">
      <div className="pt-6 text-center">
        <div className="mx-auto size-32 sm:size-40">
          <Mascot
            colour={profile.colour}
            mood={result.stars >= 2 ? 'celebrate' : 'happy'}
            hat={economy.equipped.hat}
            eyes={economy.equipped.eyes}
            neck={economy.equipped.neck}
            className="w-full h-full animate-pop"
          />
        </div>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black text-brand-900">{praise}</h1>
        <p className="font-bold text-brand-500">{result.title}</p>

        <div className="mt-4 flex justify-center">
          <Stars count={shownStars} size="text-5xl sm:text-6xl" />
        </div>
      </div>

      <Card className="mt-6 p-5">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-3xl font-black text-emerald-600 tabular-nums">
              {result.correctFirstTry}/{result.total}
            </p>
            <p className="text-xs font-black uppercase tracking-wide text-brand-400">First try</p>
          </div>
          <div>
            <p className="text-3xl font-black text-amber-600 tabular-nums">+{result.coinsEarned}</p>
            <p className="text-xs font-black uppercase tracking-wide text-brand-400">Coins 🪙</p>
          </div>
          <div>
            <p className="text-3xl font-black text-brand-600 tabular-nums">+{result.xpEarned}</p>
            <p className="text-xs font-black uppercase tracking-wide text-brand-400">XP</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-sm font-black text-brand-500 mb-1">
            <span>Level {level.level}</span>
            <span className="tabular-nums">
              {level.into}/{level.needed} XP
            </span>
          </div>
          <div className="h-4 w-full rounded-full bg-brand-100 overflow-hidden border border-brand-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-[width] duration-1000"
              style={{ width: `${level.pct}%` }}
            />
          </div>
        </div>

        <p className="mt-3 text-center text-sm font-bold text-brand-500">{accuracy}% right first time</p>
      </Card>

      {awards.leveledUpTo && (
        <Card className="mt-4 p-5 text-center border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-100 animate-pop">
          <p className="text-5xl">🎖️</p>
          <p className="mt-1 text-2xl font-black text-amber-900">Level {awards.leveledUpTo}!</p>
          <p className="font-bold text-amber-700">You levelled up. Keep going!</p>
        </Card>
      )}

      {awards.streakContinued && (
        <Card className="mt-4 p-4 flex items-center gap-3 border-orange-300 bg-orange-50">
          <span className="text-4xl">🔥</span>
          <div>
            <p className="text-xl font-black text-orange-900">{streak.current} day streak!</p>
            <p className="text-sm font-bold text-orange-700">
              {awards.freezeUsed
                ? 'A streak freeze covered the day you missed.'
                : 'Come back tomorrow to keep it alive.'}
            </p>
          </div>
        </Card>
      )}

      {newBadges.length > 0 && (
        <Card className="mt-4 p-5 border-brand-400">
          <p className="text-sm font-black uppercase tracking-wide text-brand-400 mb-3">New badges</p>
          <div className="flex flex-wrap gap-3">
            {newBadges.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-2 rounded-2xl bg-brand-50 border-2 border-brand-200 px-3 py-2 animate-pop"
              >
                <span className="text-3xl">{b.emoji}</span>
                <div>
                  <p className="font-black text-brand-900 leading-tight">{b.name}</p>
                  <p className="text-xs font-bold text-brand-500">{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Btn size="lg" onClick={onPlayAgain}>
          Play again 🔁
        </Btn>
        <Btn variant="secondary" size="lg" onClick={onHome}>
          Back to the map
        </Btn>
      </div>
    </Screen>
  )
}
