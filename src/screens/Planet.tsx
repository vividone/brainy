/**
 * Mission Earth — spend what you have earned on putting something right.
 *
 * The counterweight to the Shop. Same coins, same child, opposite instinct:
 * one is a collection you own, this is a world you improve. See GAMIFY.md.
 *
 * Everything on this screen counts *up*. There is no damage figure, no warning
 * colour and no countdown, because the audience is six to eight years old and a
 * planet that visibly deteriorates is not motivation at that age, it is
 * something to lie awake about.
 */

import { useMemo, useState } from 'react'
import { Btn, Card, IconBtn, Pill, ProgressBar, Screen } from '../components/ui'
import {
  REGIONS,
  REGION_MAX,
  RUSH_SIZE,
  actionCost,
  rushDone,
  actionsForRegion,
  earthMood,
  earthRestored,
  regionRestored,
  threatDone,
  threatForDay,
  type PlanetAction,
  type RegionId,
  type Threat,
} from '../game/planet'
import { sfx } from '../lib/sound'
import { emptyPlanet, useLearnerData, useStore } from '../state/store'

/** Blend two hex colours. Used to green the planet as it recovers. */
function mix(from: string, to: string, t: number): string {
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const [r1, g1, b1] = parse(from)
  const [r2, g2, b2] = parse(to)
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * Math.max(0, Math.min(1, t)))
  return `#${[lerp(r1, r2), lerp(g1, g2), lerp(b1, b2)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`
}

/**
 * The planet, drawn rather than downloaded.
 *
 * Inline SVG like every other piece of art in the app (prd.md §6.4), so it
 * costs nothing to load and works offline. The land and sea both warm from a
 * washed-out grey towards full colour as the child restores things, which is
 * the whole reward for spending: you can see it.
 */
function Globe({ restored }: { restored: number }) {
  /*
   * Both ends stay recognisably Earth.
   *
   * Mixing from neutral grey made a barely-started planet look like the Moon:
   * a child's first sight of Mission Earth was a grey disc with pale craters,
   * which is a puzzle rather than an invitation. The dull end is a muted blue
   * and a muted green — tired, not dead — and full restoration is where the
   * colour actually arrives.
   */
  const t = restored / 100
  const sea = mix('#5b7c99', '#0ea5e9', t)
  const land = mix('#7d9469', '#22c55e', t)

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" role="img" aria-label={`Earth, ${restored}% restored`}>
      <defs>
        <radialGradient id="glow" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="100" cy="100" r="86" fill={sea} />

      {/* Continents — suggestive rather than accurate, and deliberately not a
          real map: a child should not read a political border into a game. */}
      {/* Landmasses — suggestive, and deliberately not a real map: a child
          should not read a political border into a game. Large enough that the
          disc reads as a living planet rather than a cratered rock. */}
      <g fill={land}>
        <path d="M54 46c22-14 46-8 58 6s6 30-14 38-42 6-52-10-8-26 8-34z" />
        <path d="M104 92c24-10 48 2 54 22s-10 40-34 44-44-8-48-28 6-30 28-38z" />
        <path d="M38 104c14-6 28 2 30 18s-8 28-22 28-26-12-26-26 6-16 18-20z" />
        <path d="M136 40c16-4 28 6 28 18s-12 20-28 18-22-12-20-24 6-10 20-12z" />
      </g>

      <circle cx="100" cy="100" r="86" fill="url(#glow)" />
      <circle cx="100" cy="100" r="86" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="3" />
    </svg>
  )
}

export function Planet({
  onBack,
  onStartMission,
  onStartRush,
}: {
  onBack: () => void
  /** Absent while no subject has anything playable — the card then explains. */
  onStartMission?: (threat: Threat) => void
  /** Absent for the same reason: no questions, no meteors. */
  onStartRush?: () => void
}) {
  const { economy, planet: saved } = useLearnerData()
  const planet = saved ?? emptyPlanet()
  const restorePlanet = useStore((s) => s.restorePlanet)

  /* Derived from the date, never stored. See game/planet.ts. */
  const threat = useMemo(() => threatForDay(), [])
  const missionDone = threatDone(planet.lastThreatDay)
  const rushPlayed = rushDone(planet.lastRushDay)
  const threatRegion = REGIONS.find((r) => r.id === threat.regionId)

  const [openRegion, setOpenRegion] = useState<RegionId | null>(null)
  /** The fact from the most recent action, shown until they move on. */
  const [lastFact, setLastFact] = useState<PlanetAction | null>(null)

  const restored = useMemo(() => earthRestored(planet.regions), [planet.regions])
  const region = openRegion ? REGIONS.find((r) => r.id === openRegion) : undefined

  const doAction = (action: PlanetAction) => {
    if (!restorePlanet(action.id)) return
    sfx.unlock()
    setLastFact(action)
  }

  return (
    <Screen>
      <header className="flex items-center gap-3 pt-1">
        <IconBtn label={region ? 'Back to Earth' : 'Back'} onClick={() => (region ? setOpenRegion(null) : onBack())}>
          ←
        </IconBtn>
        <h1 className="flex-1 text-2xl font-black text-brand-900 truncate">
          {region ? `${region.emoji} ${region.name}` : '🌍 Mission Earth'}
        </h1>
        <Pill className="bg-amber-100 text-amber-900">🪙 {economy.coins}</Pill>
      </header>

      {!region ? (
        <>
          {/* The planet ------------------------------------------------ */}
          <div className="mt-4 rounded-3xl border-3 border-brand-300 bg-gradient-to-b from-slate-900 via-indigo-900 to-brand-900 p-6 text-center relative overflow-hidden" style={{ borderWidth: 3 }}>
            <span className="absolute left-6 top-5 text-sm">✨</span>
            <span className="absolute right-10 top-8 text-xs">⭐</span>
            <span className="absolute left-1/4 bottom-6 text-xs">✨</span>
            <span className="absolute right-1/4 top-4 text-sm">⭐</span>

            <div className="mx-auto size-40 sm:size-48">
              <Globe restored={restored} />
            </div>
            <p className="mt-3 text-4xl font-black text-white tabular-nums">{restored}%</p>
            <p className="text-sm font-black uppercase tracking-wide text-brand-200">Restored</p>
            <p className="mt-2 font-bold text-brand-100">{earthMood(restored)}</p>
          </div>

          {/* Today's mission ------------------------------------------- */}
          {/*
            An invitation, never a deadline. A threat left alone does nothing
            at all — no damage, no lost ground, and nothing said about it on the
            way back in. Tomorrow simply brings a different one.
          */}
          <Card className="mt-4 p-0 overflow-hidden border-brand-400">
            <div
              className={`p-5 ${
                missionDone
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                  : 'bg-gradient-to-r from-brand-600 to-brand-500'
              } text-white`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-black uppercase tracking-wide text-brand-100">
                    Today's mission
                  </p>
                  <h2 className="text-xl sm:text-2xl font-black">
                    {missionDone ? 'All done. Thank you!' : threat.name}
                  </h2>
                  <p className="text-brand-100 font-bold text-sm mt-1">
                    {missionDone
                      ? 'Come back tomorrow — there is always something to put right.'
                      : `${threat.blurb} ${threatRegion ? `Helps ${threatRegion.name}.` : ''}`}
                  </p>
                </div>
                <span className="text-5xl shrink-0" aria-hidden>
                  {missionDone ? '✅' : threat.emoji}
                </span>
              </div>

              {!missionDone &&
                (onStartMission ? (
                  <Btn variant="gold" size="lg" full className="mt-4" onClick={() => onStartMission(threat)}>
                    Send help ▶
                  </Btn>
                ) : (
                  <p className="mt-4 rounded-2xl bg-white/15 px-4 py-3 text-sm font-bold">
                    There is nothing to practise in this class yet, so this mission cannot start.
                  </p>
                ))}
            </div>
          </Card>

          {/* Meteor Rush ----------------------------------------------- */}
          {/*
            Offered, never pushed: a second card below the mission rather than
            the way in. The rest of the app is deliberately unhurried, and this
            is the one fast thing in it — a child should have to choose it.
          */}
          {onStartRush && (
            <Card className="mt-3 p-4 flex items-center gap-3">
              <span className="text-4xl shrink-0" aria-hidden>
                ☄️
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-black text-brand-900">Meteor Rush</p>
                <p className="text-sm font-bold text-brand-400">
                  {rushPlayed
                    ? 'Played today. Back again tomorrow.'
                    : `Deflect ${RUSH_SIZE} meteors. Just for fun — it helps a little too.`}
                </p>
              </div>
              <Btn
                size="sm"
                variant={rushPlayed ? 'secondary' : 'primary'}
                className="shrink-0"
                disabled={rushPlayed}
                onClick={onStartRush}
              >
                {rushPlayed ? 'Done' : 'Play'}
              </Btn>
            </Card>
          )}

          <p className="mt-6 mb-2 text-sm font-black uppercase tracking-wide text-brand-400">
            Choose somewhere to help
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {REGIONS.map((r) => {
              const pct = regionRestored(planet.regions[r.id])
              const full = pct >= 100
              return (
                <Card
                  key={r.id}
                  onClick={() => {
                    sfx.whoosh()
                    setOpenRegion(r.id)
                    setLastFact(null)
                  }}
                  className="p-0 overflow-hidden"
                >
                  <div className={`bg-gradient-to-br ${r.gradient} px-3 py-4 text-center relative`}>
                    <span className="block text-4xl sm:text-5xl" aria-hidden>
                      {r.emoji}
                    </span>
                    {full && (
                      <span className="absolute top-2 right-2 text-lg" title="Fully restored">
                        ✅
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-black text-brand-900 leading-tight text-sm sm:text-base">{r.name}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <ProgressBar
                        pct={pct}
                        className="h-2 flex-1"
                        barClass="bg-gradient-to-r from-emerald-400 to-emerald-600"
                        label={`${r.name} restored`}
                      />
                      <span className="text-[11px] font-black text-brand-500 tabular-nums shrink-0">{pct}%</span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-brand-400 leading-tight">{r.blurb}</p>
                  </div>
                </Card>
              )
            })}
          </div>

          <p className="mt-6 text-center text-sm font-bold text-brand-400">
            Every coin you earn answering questions can go into this.
          </p>
        </>
      ) : (
        <>
          {/* One region ------------------------------------------------ */}
          {(() => {
            const points = planet.regions[region.id] ?? 0
            const pct = regionRestored(points)
            const full = points >= REGION_MAX
            return (
              <>
                <Card className="mt-4 p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl shrink-0">{region.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          pct={pct}
                          className="h-3 flex-1"
                          barClass="bg-gradient-to-r from-emerald-400 to-emerald-600"
                          label={`${region.name} restored`}
                        />
                        <span className="text-sm font-black text-brand-600 tabular-nums shrink-0">{pct}%</span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-brand-500">
                        {full ? 'Fully restored. Wonderful work.' : region.blurb}
                      </p>
                    </div>
                  </div>
                </Card>

                {lastFact && (
                  <Card className="mt-4 p-5 border-emerald-400 bg-emerald-50 animate-pop">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl shrink-0">{lastFact.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wide text-emerald-600">Did you know</p>
                        <p className="mt-1 font-bold text-emerald-900">{lastFact.fact}</p>
                        {lastFact.source && (
                          <p className="mt-2 text-xs font-semibold text-emerald-700">{lastFact.source}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                <div className="mt-4 space-y-3">
                  {actionsForRegion(region.id).map((a) => {
                    const cost = actionCost(a)
                    const affordable = economy.coins >= cost
                    return (
                      <Card key={a.id} className="p-4 flex items-center gap-3">
                        <span className="text-3xl shrink-0" aria-hidden>
                          {a.emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-brand-900 leading-tight">{a.name}</p>
                          <p className="text-xs font-bold text-brand-400">
                            +{a.impact}% to {region.name}
                          </p>
                        </div>
                        <Btn
                          size="sm"
                          className="shrink-0"
                          variant={affordable && !full ? 'gold' : 'secondary'}
                          disabled={!affordable || full}
                          onClick={() => doAction(a)}
                        >
                          🪙 {cost}
                        </Btn>
                      </Card>
                    )
                  })}
                </div>

                {!full && economy.coins < actionCost(actionsForRegion(region.id)[0]) && (
                  <p className="mt-4 text-center text-sm font-bold text-brand-400">
                    Answer a few more questions to earn coins for this.
                  </p>
                )}
              </>
            )
          })()}

          <Btn variant="secondary" size="lg" full className="mt-6" onClick={() => setOpenRegion(null)}>
            ← Back to Earth
          </Btn>
        </>
      )}
    </Screen>
  )
}

/*
 * Default export as well as the named one: App loads this screen with
 * React.lazy so a child who never opens Mission Earth never downloads it, and
 * lazy() needs a module with a default. The bundle budget in prd.md §10.5 is
 * 500 KB gzipped for everything, which this has to fit inside.
 */
export default Planet
