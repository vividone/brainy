/** Level select for one island (strand). */

import { BAND_LABEL, BAND_STYLE, band, currentMastery } from '../engine/mastery'
import { buildLevels, getSkill, getStrand } from '../engine/registry'
import { Btn, Card, IconBtn, Screen, Stars } from '../components/ui'
import { islandStyle } from '../game/theme'
import { levelUnlocked, useBands, useCurriculum, useLevelStars, useProgress } from '../state/selectors'
import { sfx } from '../lib/sound'
import type { Level } from '../engine/registry'

interface Props {
  strandId: string
  onBack: () => void
  onPlay: (level: Level) => void
}

export function Island({ strandId, onBack, onPlay }: Props) {
  const curriculum = useCurriculum()
  const bands = useBands()
  const progress = useProgress()
  const levelStars = useLevelStars()

  const strand = getStrand(curriculum.id, strandId)
  const levels = buildLevels(curriculum.id, strandId, bands)
  if (!strand) return null

  const style = islandStyle(strand.theme)
  const earned = levels.reduce((sum, l) => sum + (levelStars[l.key] ?? 0), 0)

  return (
    <Screen>
      <header className="flex items-center gap-3 pt-1">
        <IconBtn label="Back to the map" onClick={onBack}>
          ←
        </IconBtn>
        <div
          className={`grid place-items-center size-14 shrink-0 rounded-2xl bg-gradient-to-br ${style.gradient} text-3xl border-2 border-white`}
        >
          {style.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black text-brand-900 truncate">{strand.name}</h1>
          <p className="text-sm font-semibold text-brand-500 truncate">{strand.blurb}</p>
        </div>
        <span className="shrink-0 rounded-full bg-yellow-100 px-3 py-1.5 font-black text-yellow-900">
          ⭐ {earned}/{levels.length * 3}
        </span>
      </header>

      <ol className="mt-5 space-y-3">
        {levels.map((level, i) => {
          const unlocked = levelUnlocked(levels, i, levelStars)
          const stars = levelStars[level.key] ?? 0
          const skill = level.skillId ? getSkill(curriculum.id, level.skillId) : undefined
          const mastery = level.skillId ? currentMastery(progress, level.skillId) : 0
          const b = level.skillId ? band(progress[level.skillId]) : 'new'
          const isChallenge = level.kind === 'challenge'

          return (
            <li key={level.key}>
              <Card
                onClick={
                  unlocked
                    ? () => {
                        sfx.whoosh()
                        onPlay(level)
                      }
                    : undefined
                }
                className={`p-4 flex items-center gap-4 ${unlocked ? '' : 'opacity-55'} ${isChallenge ? 'border-amber-400 bg-amber-50' : ''}`}
              >
                <div
                  className={`grid place-items-center size-14 shrink-0 rounded-2xl text-xl font-black border-2
                    ${
                      !unlocked
                        ? 'bg-slate-100 border-slate-200 text-slate-400'
                        : isChallenge
                          ? 'bg-amber-400 border-amber-600 text-amber-950'
                          : stars > 0
                            ? 'bg-emerald-500 border-emerald-700 text-white'
                            : 'bg-brand-600 border-brand-800 text-white'
                    }`}
                >
                  {!unlocked ? '🔒' : isChallenge ? '🏆' : i + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black text-brand-900 truncate">{level.title}</p>
                  {isChallenge ? (
                    <p className="text-sm font-bold text-amber-700">Everything on this island, all mixed up</p>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${BAND_STYLE[b].chip}`}>
                        {BAND_LABEL[b]}
                      </span>
                      <div className="h-2 flex-1 max-w-32 rounded-full bg-brand-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${BAND_STYLE[b].bar}`}
                          style={{ width: `${Math.round(mastery * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {skill?.hint && unlocked && stars === 0 && (
                    <p className="mt-1 text-xs font-semibold text-brand-400 truncate">💡 {skill.hint}</p>
                  )}
                </div>

                <Stars count={stars} size="text-xl" />
              </Card>
            </li>
          )
        })}
      </ol>

      <Btn variant="secondary" size="lg" full className="mt-6" onClick={onBack}>
        ← Back to the map
      </Btn>
    </Screen>
  )
}
