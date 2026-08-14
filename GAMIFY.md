# The meta-game

Everything in Brainy that is not a question: coins, badges, the collection, the
map, and Mission Earth. What it is for, what it must never do, and where it
currently stands.

Product spec and architecture: [prd.md](prd.md). Content coverage:
[CONTENT-NG.md](CONTENT-NG.md), [CONTENT-UK.md](CONTENT-UK.md),
[CONTENT-US.md](CONTENT-US.md).

---

## What it is for

A seven-year-old does not open a maths app because they want to be better at
maths. They open it because something in there is theirs. The meta-game's whole
job is to be the reason the app gets opened, and then to get out of the way.

The line it must not cross is **prd.md §4.1**: *the game is the wrapper, the
curriculum is the payload — never distort a maths concept to fit a game
mechanic.* A mission may dress a division problem as an asteroid intercept. It
may not invent physics so that a mechanic works out neatly.

---

## The loop

```
Open app  → streak, level, coins, your character and pet
          → Daily Quest, or a level on a map, or a mission on Earth
          → answer questions, get instant feedback
          → results: stars, coins, XP, badges
          → coins → the Shop (things for me)
                  → Mission Earth (things for the world)
          → tomorrow's streak flame is visible on the way out
```

Two sinks, deliberately. The Shop is a collection you own; Mission Earth is a
world you improve. They pull differently and they pull on different children.

---

## One currency, and why

Coins are the only currency, and the only way to get them is answering
questions. There is no second resource, no gems, no energy, and nothing costs
real money — a paid licence buys access to subjects, never an advantage inside
one (prd.md §6.4).

A second currency was considered for Mission Earth and rejected: a six-year-old
tracking two wallets is confusion, not depth.

The arithmetic, recorded so that whoever next changes a price can see what they
are moving:

| | |
|---|--:|
| Coins for a 10-question session, first of the day, all correct | **30** |
| Coins for later sessions the same day | **~20** |
| Total cost of everything in the Shop | **~7,085** |
| Daily play needed to own the Shop outright | **~8 months** |

That 8 months is the number that constrains everything else. **Mission Earth's
actions are priced at 5–40 coins against the Shop's 40–600**, so the planet is
the everyday spend and the collection stays the big-ticket one. Pricing planet
actions like cosmetics would push the collection past a year and make both feel
hopeless.

Earn rates live in [`src/engine/scoring.ts`](src/engine/scoring.ts).

---

## Badges

27 badges, in one table in [`src/game/badges.ts`](src/game/badges.ts).

### One table, two derivations

Each badge names a `metric` and a `threshold`. Awarding asks whether the metric
has reached the threshold; the Room asks how far along it is. Both derive from
the same row.

This is not tidiness. Badges used to be a display list in `cosmetics.ts` and a
hand-written ladder of `award(...)` calls in the store, and the two drifted:
**`island-master` shipped in the roster and was never in the award list**, so
for the life of the app it sat padlocked in every child's Room, unwinnable, and
looking exactly like something they had not got round to yet. A badge that can
be shown is now a badge that can be won, by construction.

### Two families

| Family | Won by | Examples |
|---|---|---|
| `grit` | Turning up | streaks, questions answered, coins saved, coming back after a week away |
| `craft` | Getting good | perfect rounds, answer streaks, skills mastered, islands cleared |

Every gate in the Shop accepts **either family** (see below). A child who finds
the work hard and a child who finds it easy open the same doors by different
routes. Gating the collection on accuracy alone would punish precisely the child
this app exists for.

`comeback` is the clearest statement of the principle: a child returning after a
week away gets a badge for coming back, never a penalty for having been gone.

### Two invariants, enforced by `npm run badges`

1. **Every badge is winnable.** The check builds a child who has done everything
   and asserts all 27 fire. This is what would have caught `island-master`.
2. **Every badge is winnable without paying.** A free family gets Mathematics and
   nothing else (prd.md §14.2). The check builds the thinnest free child in the
   product — **Basic 1 Nigerian maths: 7 skills, 2 islands, 9 levels** — and
   asserts the only badges out of reach are `skill-10` and `skill-25`, which need
   more skills than one class contains and arrive as the child moves up.

That second check is the important one. A rule like *"master every subject"*
reads perfectly well, is unwinnable without a licence, and would turn the
collection into pay-to-collect without anyone deciding to. The allowlist of
class-gated badges is deliberately explicit so adding to it is a decision
somebody makes on purpose.

---

## The collection and its gates

The Shop holds characters, pets, hats, glasses, neckwear and rooms
([`src/game/cosmetics.ts`](src/game/cosmetics.ts),
[`src/game/characters.ts`](src/game/characters.ts)). Everything is cosmetic;
nothing bought ever changes a question, a difficulty or a progression.

**Coins alone buy most of it.** The top item in each slot also needs a badge —
coins prove you turned up, the badge proves something happened while you were
there. Mid-range items stay pure coins so the Shop never stalls with nothing to
save for.

| Item | Price | Opens with (craft) | …or (grit) |
|---|--:|---|---|
| Golden Crown | 250 | `island-master` | `streak-14` |
| Hero Cape | 200 | `perfect` | `century` |
| Gold Medal | 300 | `island-perfect` | `streak-30` |
| Space Room | 320 | `level-10` | `thousand` |
| Musa | 450 | `skill-10` | `five-hundred` |
| Ember the Dragon | 600 | `subject-master` | `marathon` |

A locked item **states its goal on the card** — "Win a Perfect Round to open" —
never a bare padlock. A visible goal is something to go and do; a mystery
padlock is only a reminder of something you have not done.

`npm run badges` asserts that every gate names at least one badge the thinnest
free child can win, and that every badge id in a gate actually exists. A typo'd
gate would otherwise lock an item permanently and look identical to a design
choice.

---

## Mission Earth

*Layers 1 and 2 are built. Layer 3 is planned.*

A game section about restoring Earth, opened by a badge and funded by coins.
Three layers, each with a different job.

It opens with `skill-1` **or** `streak-3` — master one skill, or play three days
running. A badge and not a price: charging coins to enter would shut out the
child who has just spent theirs in the Shop, and the fun part of the app should
not be somewhere a child can lock themselves out of.

**The design that makes it worth building: a mission *is* a session.** It builds
a real plan through the existing session builder, renders through the existing
question screen, and pays exactly what any session pays — coins, XP, mastery,
streak, badges. The planet impact is *additional*. The child believes they are
playing a game about saving the world; they are doing their maths practice.

### Layer 1 — The Planet · built

Six regions — Forests, Oceans, The Poles, Drylands, Cities, The Air — with three
actions each. Coins buy restoration; the figure on screen is the mean across
regions and climbs as the child plays.

**Regions never decay.** Restoration only goes up. Decay would make a returning
pull out of *losing progress*, which prd.md §6.5 forbids outright. The reason to
come back is that new threats arrive, never that yesterday's work rotted.

**Nothing counts down, and nothing is called health.** The figure is *restored*,
regions start at a 20% baseline rather than at zero, and there is no damage
number and no warning colour anywhere on the screen. A planet that visibly
deteriorates is not motivation for a six-year-old; it is something to lie awake
about.

**Every action is the same value for money** — four coins per point, whatever
you buy. There is no optimal purchase to work out and no wrong choice to regret,
so what a child picks is a question of what they want to do rather than
arithmetic they can lose at. Prices are derived from impact rather than typed,
and `npm run badges` fails if that ever stops being true.

| | |
|---|--:|
| Cheapest action | **8 coins** |
| Dearest action | **36 coins** |
| To fill one region | **320 coins** |
| To restore the whole Earth | **1,920 coins** |

About two months of daily play, against roughly eight for the Shop — which is
what keeps both sinks alive at once.

### Layer 2 — Missions · built

One threat a day — asteroid, wildfire, oil spill, plastic tide, drought, smog,
thinning ice, heatwave — dealt with by playing a session. Eight kinds, each tied
to the regions it can strike, and every region is reachable.

**A mission *is* a session.** It goes through the ordinary session builder, on
the same subject rotation and the same adaptive difficulty, and it pays coins,
XP, mastery, streak and badges exactly as any other session does. Finishing it
also restores a region. A child who believes they are saving the world is doing
their maths practice, and that is the only version of this worth building.

The engine knows nothing about any of it. There is no new `SessionMode` — one
would have to be understood by the parent report and everything else that
switches on mode, and all it would buy is a different title, which the app
overrides on the plan instead.

| Stars | Points restored |
|---|--:|
| 3 | 6 |
| 2 | 4 |
| 1 | 2 |
| 0 | **1** |

**Zero stars still pays.** Finishing always pays (prd.md §5.4), and a child who
found today hard has still turned up and still helped. A mission worth nothing
on a bad day would be the one place in the app that punished effort.

At those rates missions alone restore Earth in about 120 days of daily play, and
coins do the rest — which is the balance both layers need. Missions only, and
spending coins here would be pointless; coins only, and a child saving for the
Shop could never make progress.

**A threat is an invitation, not a deadline.** One left alone does nothing at
all: no damage, no lost ground, nothing said about it on the way back in.
Tomorrow brings a different one. The threat is *derived from the date* rather
than stored, so a child who closes the app mid-mission finds the same one
waiting, two tablets agree without syncing it, and the save records only which
day's mission is done.

**Never negative, and no game-over.** A hard day means slower progress, not
damage. The planet cannot die.

**And the maths stays honest.** The screen says "answer questions to send help".
It never claims the sums *are* the asteroid's trajectory. prd.md §4.1 forbids
bending a concept to fit a mechanic, and inventing science so a wrapper feels
clever is exactly that.

### Layer 3 — Meteor Rush · built

Eight meteors, each carrying a one-tap question, drifting slowly towards Earth.
Answer to deflect. Offered as a second card below the mission, never as the way
in — the rest of the app is deliberately unhurried, and a child should have to
choose the one fast thing in it.

**It never touches the mastery model.** This is the decision that matters most
here. Answers given under a clock are a bad measure of what a child understands:
they get things wrong for reasons that have nothing to do with the maths, and
feeding that into the spaced-review model would degrade the one part of the app
that has to be right. So Meteor Rush pays restoration points and nothing else —
no coins, no XP, no streak, no mastery. Coins stay tied to real practice.

Rounds pay 1–3 points, once a day, into whichever region is furthest from
restored, so the reward always lands somewhere it shows. A round with nothing
deflected still pays 1: turning up is worth something, which is the same rule
missions follow.

**No lives, no game-over.** The round always plays all eight meteors. One that
gets past costs the point it was worth and nothing else — no damage, no counter
ticking towards being shut out.

**Reduced motion is a real fallback, not a degradation.** With it on there is no
drift and no clock: the same eight meteors, the same reward, answered at
whatever pace suits. A child who cannot play the timed version gets the whole
feature rather than a worse one. The screen checks the setting in JavaScript
and drops the timer, rather than relying on the CSS rule — which would stop the
animation and leave the clock running.

### Environmental facts must be sourced

Each restoration action shows a short fact about the real world. **These are
factual claims and must carry a citation, not be written from memory** — the
same discipline prd.md §8.7 already applies to the fact-heavy school subjects.
A children's education product asserting a wrong number about the climate is
worse than saying nothing.

All 18 have been checked against the body named beside them: NOAA, NASA, the
US EPA, the US Forest Service, WHO, UNEP, UNCCD, FAO, the British Antarctic
Survey and National Geographic Education. Three carry no citation at all, and
that is the rule working rather than failing — a bicycle burning no fuel and a
solar panel turning light into electricity are definitional, and attributing
arithmetic-grade physics to an agency report is fake precision.

The failure the first draft actually produced is worth naming, because it is
the one to watch for. The *facts* were broadly sound; the *attributions* were
not. Sentences carried authoritative-looking citations — "IPCC Sixth Assessment
Report, Working Group III (2022)" — that had been chosen because they sounded
right, not because anyone had opened the document. A citation is itself a claim:
that the named body said this. **An unverified citation is worse than none**,
because it borrows an institution's credibility for a sentence nobody there
wrote. One fact was invented outright — penguins facing "a longer swim for
dinner" — which the British Antarctic Survey does not say and which has been
replaced with what it does.

`npm run badges` reports the cited/definitional split and fails on a blank
source, so the gap shows up as a number rather than as an authority-shaped hole
under a sentence.

The 18 facts live beside their actions in
[`src/game/planet.ts`](src/game/planet.ts), each with the body it comes from —
IPCC, NASA, WHO, UNEP, UNCCD, FAO, NOAA, IUCN, IEA, EPA, WWF and the British
Antarctic Survey. They are deliberately written qualitative wherever a precise
figure would be hard to stand behind: *"soot landing on snow makes it darker,
and dark snow melts faster"* rather than a melt rate.

`npm run badges` refuses an action with an empty fact or an empty source, so a
new action cannot be added with an unsourced claim in it.

> **Outstanding:** the drafted facts have not yet been checked against their
> cited sources by a human. That review is required before this ships to
> families.

---

## What we deliberately avoid

From prd.md §6.5, restated here where it actually bites:

- **No lives.** Nothing counts down towards being shut out.
- **No losing progress.** Not stars, not mastery, not planet health, not coins.
- **No timers on by default.** Timed mode is opt-in and parent-side; Meteor Rush
  is a room the child chooses to walk into.
- **No comparison between children.** No leaderboards, no ranks. At seven that
  teaches the wrong lesson, and the child is competing with themselves.
- **No dark patterns around the streak.** Missing a day costs the flame and
  nothing else, and a freeze is granted weekly.
- **No ads, ever. No external links in the child's side of the app.**

---

## Where this stands

| Phase | What | Status |
|---|---|---|
| 1 | Badges become real: one table, 27 badges, reachability tests, cross-subject trophies, progress on locked badges | **Done** |
| 2 | Badges become keys: gates on the top of each slot, requirements stated in child words | **Done** |
| 3a | Mission Earth — the planet and its restoration actions | **Done** |
| 3b | Mission Earth — daily threats and missions | **Done** |
| 3c | Mission Earth — Meteor Rush | **Done** |
| 4 | The Room as a trophy hall; streak shields made visible | Planned |
| 5 | Level titles, unlock animation and sound | Planned |

---

## Decisions revised

Recorded so the reasoning is not lost and the same ground is not re-argued.

**Badges were stickers; they are now keys.** Thirteen badges gated nothing and
were displayed in one screen the child rarely opened. Coins alone bought the
entire collection, which meant the collection recorded time spent and nothing
else — a child who played 300 sessions badly owned exactly what a child who
mastered Basic 4 owned. Badges now open the top of each slot, so the collection
records that something happened.

**The award list and the display list were merged.** They were two places, they
disagreed, and `island-master` was unwinnable for as long as it existed. One
table now, and a test that fails if any badge becomes unreachable.

**Trophies were maths-only.** The Room read `subjects.find(s => s.id ===
'maths')`, which was correct while maths was the only authored subject and
quietly wrong afterwards: a child who three-starred a Verbal Reasoning island
won a trophy that existed in the save and appeared on no screen.

**Mission Earth will not have its own currency.** Considered and rejected —
see *One currency, and why*.

**The planet will not decay.** A world that degrades while you are away is the
strongest possible reason to come back daily, and it is exactly the dark pattern
§6.5 rules out. Threats arriving does the same job without punishing a child for
a week at their grandmother's.

**Meteor Rush pays no coins.** The obvious reward for an arcade round is coins,
and it was the wrong one twice over: it would have made a timed game the fastest
way to earn, and it would have meant recording rushed answers as practice.
Restoration points instead — the round helps Earth, and the mastery model never
hears about it.

**Missions did not get their own session mode.** The obvious way to build them
was a fourth `SessionMode` in the engine. That would have pushed a game concept
into `engine/types.ts`, which every content pack and the parent report both
depend on, in exchange for a different title string. The app overrides the title
on the plan instead, and the engine still knows nothing about Mission Earth.
