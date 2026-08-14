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
import { badgeById, requirementMet } from '../game/badges'
import { PLANET_UNLOCK, earthRestored, threatDone } from '../game/planet'
import { subjectOpen, useEntitlement } from '../state/entitlement'
import { sfx } from '../lib/sound'
import { nudgeFor } from '../lib/nudge'

interface Props {
  onOpenSubject: (subjectId: string) => void
  onDailyQuest: () => void
  onOpenShop: () => void
  onOpenRoom: () => void
  onOpenPlanet: () => void
  onOpenParent: () => void
}

export function Home({
  onOpenSubject,
  onDailyQuest,
  onOpenShop,
  onOpenRoom,
  onOpenPlanet,
  onOpenParent,
}: Props) {
  const curriculum = useCurriculum()
  const bands = useBands()
  const progress = useProgress()
  const levelStars = useLevelStars()
  const profile = useProfile()
  const { economy, streak, badges, planet } = useLearnerData()
  /* What today looks like for this child: waiting, at risk, or done. */
  const nudge = useMemo(() => nudgeFor(streak), [streak])
  const { full } = useEntitlement()

  /* Mission Earth: opened by a badge, never by spending. See game/planet.ts. */
  const planetOpen = requirementMet(PLANET_UNLOCK, badges)
  const earthPct = useMemo(() => earthRestored(planet?.regions ?? {}), [planet])
  const missionWaiting = planetOpen && !threatDone(planet?.lastThreatDay)
  const planetHint = useMemo(() => {
    const grit = PLANET_UNLOCK.anyOf.map(badgeById).find((b) => b?.family === 'grit')
    return grit ? `${grit.description} to open this` : 'Keep playing to open this'
  }, [])

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
      {/*
        Wraps, because it does not fit.

        At 320px the row has 288px to work with, and the fixed parts — a 64px
        mascot, a 48px grown-up button, three pills that grow with the numbers in
        them, and the gaps between — use all of it before the greeting gets a
        pixel. The name truncated to nothing and the level bar became a sliver.
        So below sm the pills drop to their own line, and the top row keeps the
        three things a child navigates by.
      */}
      <header className="flex flex-wrap items-center gap-3 pt-1">
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
            characterId={economy.equipped.character}
            petId={economy.equipped.pet}
            mood="happy"
            hat={economy.equipped.hat}
            eyes={economy.equipped.eyes}
            neck={economy.equipped.neck}
            className="w-full h-full"
          />
        </button>

        {/*
          basis-40, not just flex-1.

          Everything else on this row is shrink-0, and flex-1 alone means a
          flex-basis of 0%: the name claims no width when the browser decides
          where to break the line, so it never pushes the pills down. It just
          takes whatever is left over, and once the fixed parts fill the row that
          is nothing — the greeting truncates to zero and vanishes while the
          mascot, pills and button stay exactly where they were. Claiming 10rem
          up front means a tight row wraps the pills instead, which is the layout
          the small screens already use.
        */}
        <div className="min-w-0 flex-1 basis-40">
          {/*
            Wraps rather than truncates.

            A child seeing "Hi J…" on their own home screen is worse than a
            greeting on two lines: the name is the one word on this screen that
            is theirs. Long Nigerian names are normal, not an edge case, so the
            greeting drops a size on phones, breaks mid-word if it has to, and is
            capped at two lines so a very long name cannot push the quest card
            off the screen.
          */}
          <p className="text-lg sm:text-2xl font-black text-brand-900 leading-tight [overflow-wrap:anywhere] line-clamp-2">
            {/* A blank name would render "Hi !", which reads as a broken row
                rather than a missing name. */}
            Hi {profile.name?.trim() || 'there'}!
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-black text-brand-500 shrink-0">LVL {level.level}</span>
            <ProgressBar pct={level.pct} className="h-2.5" label={`Level ${level.level} progress`} />
          </div>
        </div>

        <div className="order-last flex w-full shrink-0 flex-wrap gap-1.5 sm:order-none sm:w-auto sm:justify-end">
          <Pill className="bg-amber-100 text-amber-900" title="Coins">
            🪙 {economy.coins}
          </Pill>
          <Pill
            className={streak.current > 0 ? 'bg-orange-100 text-orange-900' : 'bg-slate-100 text-slate-500'}
            title="Day streak"
          >
            🔥 {streak.current}
          </Pill>
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
              <p className="text-sm font-black uppercase tracking-wide text-brand-100">
                {nudge.kind === 'done' ? 'Today' : "Today's quest"}
              </p>
              <h2 className="text-2xl sm:text-3xl font-black">
                {nudge.kind === 'done' ? 'Quest complete' : 'Daily Quest'}
              </h2>
              <p className="text-brand-100 font-bold text-sm mt-1">{nudge.line}</p>
            </div>
            <span className="text-5xl sm:text-6xl shrink-0" aria-hidden>
              {nudge.kind === 'done' ? '✅' : nudge.kind === 'streak' ? '🔥' : '🎯'}
            </span>
          </div>
          <Btn variant="gold" size="lg" full className="mt-4" onClick={onDailyQuest}>
            {nudge.action}
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
          const authored = s.subject.available && s.skillCount > 0
          /*
           * Two different kinds of locked, and a child should be able to tell
           * them apart: not written yet, and not paid for. Both stay tappable —
           * the card explains itself on the next screen, which is a better
           * answer to a curious seven-year-old than a card that ignores them.
           */
          const open = subjectOpen(s.subject.id, full)
          const ready = authored && open

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
                  <span
                    className="absolute top-2 right-2 text-lg"
                    title={authored ? 'Ask a grown-up' : 'Coming soon'}
                  >
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
                  <p className="mt-1.5 text-xs font-bold text-brand-400">
                    {authored ? 'Ask a grown-up to open this' : 'Coming soon, tap to see'}
                  </p>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Mission Earth -------------------------------------------------- */}
      {/*
        Shown locked rather than hidden, with the goal stated, on the same
        principle as the shop: a child who cannot see a thing exists cannot
        want it, and a padlock with an instruction under it is something to go
        and do this afternoon.
      */}
      <Card
        className="mt-4 p-0 overflow-hidden"
        onClick={
          planetOpen
            ? () => {
                sfx.whoosh()
                onOpenPlanet()
              }
            : undefined
        }
      >
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-brand-800 p-4 flex items-center gap-4">
          <span className="text-4xl sm:text-5xl shrink-0" aria-hidden>
            {!planetOpen ? '🔒' : missionWaiting ? '⚠️' : '🌍'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black uppercase tracking-wide text-brand-200">Mission Earth</p>
            {planetOpen ? (
              <>
                <p className="text-xl font-black text-white">{earthPct}% restored</p>
                <p className="text-sm font-bold text-brand-100">
                  {missionWaiting
                    ? 'A mission is waiting for you today.'
                    : 'Spend your coins on putting something right.'}
                </p>
              </>
            ) : (
              <p className="text-sm font-bold text-brand-100">{planetHint}</p>
            )}
          </div>
        </div>
      </Card>

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
