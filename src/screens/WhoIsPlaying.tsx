/**
 * Profile picker, shown on launch when more than one child shares the device.
 *
 * The Netflix pattern, because it is one children already understand: big
 * faces, one tap, no reading required. Picking a sibling by mistake is
 * recoverable — progress is stored per child, so nothing merges — and a
 * grown-up can switch back from the parent zone.
 */

import { Mascot } from '../components/Mascot'
import { Card, Screen } from '../components/ui'
import { levelProgress } from '../engine/scoring'
import { sfx } from '../lib/sound'
import { useStore } from '../state/store'

export function WhoIsPlaying({ onPicked }: { onPicked: () => void }) {
  const learners = useStore((s) => s.learners)
  const data = useStore((s) => s.data)
  const switchLearner = useStore((s) => s.switchLearner)

  return (
    <Screen className="max-w-3xl">
      <div className="pt-8 pb-6 text-center">
        <h1 className="text-3xl sm:text-4xl font-black text-brand-900">Who's playing?</h1>
        <p className="mt-1 font-bold text-brand-500">Tap your buddy to start.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {learners.map((learner) => {
          const d = data[learner.id]
          const level = levelProgress(d?.economy.xp ?? 0)
          const streak = d?.streak.current ?? 0

          return (
            <Card
              key={learner.id}
              className="p-4 text-center"
              onClick={() => {
                sfx.whoosh()
                switchLearner(learner.id)
                onPicked()
              }}
            >
              <div className="mx-auto size-24 sm:size-28">
                <Mascot
                  characterId={d?.economy.equipped.character}
                  petId={d?.economy.equipped.pet}
                  mood="happy"
                  hat={d?.economy.equipped.hat}
                  eyes={d?.economy.equipped.eyes}
                  neck={d?.economy.equipped.neck}
                  className="w-full h-full"
                />
              </div>
              <p className="mt-2 text-xl font-black text-brand-900 truncate">{learner.name}</p>
              <p className="text-xs font-black uppercase tracking-wide text-brand-400">
                Level {level.level}
                {streak > 0 && ` · 🔥 ${streak}`}
              </p>
            </Card>
          )
        })}
      </div>

      <p className="mt-8 text-center text-sm font-semibold text-brand-400">
        Grown-ups can add or remove a child in the grown-up area.
      </p>
    </Screen>
  )
}
