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

*Planned. Nothing below is built yet.*

A game section about restoring Earth, opened by a badge and funded by coins.
Three layers, each with a different job.

**The design that makes it worth building: a mission *is* a session.** It builds
a real plan through the existing session builder, renders through the existing
question screen, and pays exactly what any session pays — coins, XP, mastery,
streak, badges. The planet impact is *additional*. The child believes they are
playing a game about saving the world; they are doing their maths practice.

### Layer 1 — The Planet

Six regions — Forest, Ocean, Ice, Desert, City, Sky. Coins buy restoration
actions; Earth's health is the mean across regions and climbs as the child
plays.

**Regions never decay.** Restoration only goes up. Decay would make a returning
pull out of *losing progress*, which prd.md §6.5 forbids outright. The reason to
come back is that new threats arrive, never that yesterday's work rotted.

### Layer 2 — Missions

One threat a day — asteroid, oil spill, wildfire, plastic tide — resolved by
playing a short session themed to it. Impact scales with stars: three stars
restore fully, zero stars still restore a little.

**Never negative, and no game-over.** A hard day means slower progress, not
damage. The planet cannot die.

### Layer 3 — Meteor Rush

An opt-in arcade round, never the default way in. The round always ends after a
fixed number of asteroids; misses cost bonus, never health. No lives counter, no
game-over.

Shipped last because it is the layer most likely to exclude somebody: it needs a
reduced-motion fallback, 64 px tap targets, and nothing flashing above 3 Hz
(prd.md §11).

### Environmental facts must be sourced

Each restoration action shows a short fact about the real world. **These are
factual claims and must carry a citation, not be written from memory** — the
same discipline prd.md §8.7 already applies to the fact-heavy school subjects.
A children's education product asserting a wrong number about the climate is
worse than saying nothing.

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
| 3a | Mission Earth — the planet and its restoration actions | Planned |
| 3b | Mission Earth — daily threats and missions | Planned |
| 3c | Mission Earth — Meteor Rush | Planned |
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
