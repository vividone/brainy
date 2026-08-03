# Kolo — Product Requirements & Architecture

> **Working title:** *Kolo* (Yoruba/Nigerian Pidgin for a child's savings box). The learner earns coins that drop into their kolo and spends them on their mascot and world. The name is warm and locally rooted, short, and travels fine internationally. Placeholder — easy to change, it lives in one config constant.

| | |
|---|---|
| **Author** | Victor Olaitan |
| **Date** | 2 August 2026 |
| **Status** | Living document — phase 1 shipped, phase 2 in progress |
| **Primary learner** | 7-year-old, finishing Basic 2, entering Basic 3 |
| **v1 scope** | Structure for Basic 1–6 × 7 subjects × 3 curricula. Mathematics authored end to end; other subjects structured, not yet written. Tablet-first web app, no accounts. |

---

## 1. Summary

Kolo is a gamified practice app for lower-primary children. It turns curriculum-aligned drilling into a short daily game: 5–10 minute sessions, immediate feedback, coins, streaks, a mascot to dress up, and a world map that opens up as skills are mastered.

It spans the whole of primary — **Basic 1 to Basic 6** — across seven subjects, with British and American equivalents of each class:

1. **Mathematics**
2. **Quantitative Reasoning**
3. **Verbal Reasoning**
4. **English Grammar**
5. **Basic Science**
6. **Basic Technology**
7. **Social Studies**

Quantitative and Verbal Reasoning are deliberately kept **separate subjects** rather than the single combined "QR & VR" line some schemes use. Nigerian schools timetable and examine them separately, common entrance assesses them separately, and — the reason that actually matters here — a child is very often strong at one and weak at the other. A blended score would hide exactly the gap a parent needs to see.

The immediate goal is one child staying sharp across the Basic 2 → Basic 3 transition — consolidating what he already knows and meeting Basic 3 material before school does. The secondary goal is that the same product can be handed to other parents, initially free, potentially paid.

### Why this is worth building rather than buying

Existing options fall into three buckets, none of which fit:

- **International apps** (Khan Academy Kids, Prodigy, IXL) — strong engineering, wrong curriculum. No Quantitative/Verbal Reasoning as Nigerian schools teach it, dollar-denominated money problems, no Roman numerals at this stage, cultural references that don't land.
- **Nigerian offerings** — usually curriculum-correct but shallow on game design and engineering; often video-first rather than practice-first.
- **Worksheets / past papers** — correct content, zero motivation, and a parent has to mark them.

The gap is *curriculum-correct content inside a genuinely good game loop*, with a parent view that says what to help with. That's the product.

---

## 2. Users

### 2.1 Primary user — the child (age 6–8)

Design constraints that follow directly from the age:

- **Reading is a bottleneck, not the skill under test.** A child who can do the maths may fail a word problem because they can't read "altogether". Every question must be readable aloud on demand.
- **Fine motor control is limited.** Tap targets ≥ 64 px, generous spacing, no drag-and-drop that requires precision, no double-taps.
- **Attention span is 5–12 minutes.** Sessions must be short and finish with a clear, satisfying end.
- **Failure is discouraging, not motivating.** A 7-year-old who loses a life and gets kicked out of a level often just stops playing. See §5.4.
- **They cannot manage their own settings.** Anything configurable is behind the parent gate.

### 2.2 Secondary user — the parent

Wants three things, in this order: *is my child actually learning?*, *what should I help with?*, *is this safe and not wasting their screen time?* The parent zone answers exactly those three questions and nothing else.

### 2.3 Tertiary user — other parents (future)

The product must be shareable as a link with no setup ritual: open it, pick a curriculum and year, type a first name, start playing. Every step between the link and the first question loses people.

---

## 3. Goals and non-goals

### 3.1 Goals

| # | Goal | How we'll know |
|---|---|---|
| G1 | Child voluntarily plays most days | 5+ active days a week, self-initiated |
| G2 | Measurable mastery growth across Basic 3 maths strands | Mastery score per skill rising; review items answered correctly after a gap |
| G3 | Parent gets a useful weekly picture in under 60 seconds | Parent zone opens straight onto "strongest / needs work / this week" |
| G4 | Content is genuinely curriculum-correct | Every skill traceable to a named curriculum strand |
| G5 | Architecture supports a second curriculum without a rewrite | UK pack added by dropping in a folder, no engine changes |
| G6 | Works offline on a tablet | Full session playable in airplane mode after first load |

### 3.2 Non-goals for v1

- No user accounts, login, or cloud sync.
- No multiplayer, leaderboards, or any child-to-child contact.
- No chat, no user-generated content, no AI tutor in-app.
- No video lessons. This is a practice app, not a teaching app. (Short hint cards, yes; lessons, no.)
- No payments in phase 1 (see §14 for the model, phase 5 for delivery).
- Subjects beyond Mathematics are structured but not authored in phase 1 — the engine, navigation and data model already accommodate them, so adding each is content work rather than engineering work.

---

## 4. Product principles

1. **The game is the wrapper, the curriculum is the payload.** Never distort a maths concept to fit a game mechanic.
2. **No dead ends.** A child can always try again immediately, without cost, without leaving the screen.
3. **Reward effort, not just correctness.** Coins for attempts and completion; stars for accuracy. A child having a hard day still leaves with something.
4. **Short by default.** The default session is 10 questions. Playing more is a choice the child makes, never a requirement.
5. **The child never sees a setting.** Difficulty, curriculum, sound, and time limits are all parent-side.
6. **Every question is readable aloud.** Tap the speaker, hear the question. Non-negotiable at this age.
7. **Nothing leaves the device.** No analytics beacons, no third-party scripts, no fonts from a CDN. This is a children's app; the safest data policy is having no data.
8. **Offline-first.** The tablet in the back of a car with no signal is a real use case.

---

## 5. Learning model

### 5.1 The content hierarchy

```
Curriculum        ng-ube (Nigeria) | uk-nc (England) | us-ccss (United States)
  └─ Subject      maths | quantitative | verbal | english | science | technology | social
      └─ Strand   "Number & Numeration", "Basic Operations", …
          └─ Skill    "Add two 3-digit numbers with regrouping"
              └─ Generator   a function producing unlimited question instances
                  └─ Item    one concrete question shown to the child
```

A **Skill** is the atomic unit of progress and the thing mastery is tracked against. It carries:

- a stable `id` (`ng.maths.b3.add-3digit-regroup`)
- a child-facing title ("Adding big numbers")
- the year band it belongs to (`b2`, `b3`)
- `prerequisites` — other skill ids that should come first
- one or more **generators**, each accepting a difficulty level 1–5
- optional authored items, for content that can't be generated (definitions, diagrams)

### 5.2 Procedural generation, not a question bank

This is the single most important content decision.

A static bank of, say, 500 questions sounds like a lot. A child doing 10 questions a day exhausts it in under two months, and starts recognising answers well before that — at which point they are practising recall of the app, not the maths.

So **questions are generated**, from parameterised templates with a seeded random number generator. `add-3digit-regroup` at difficulty 3 can produce hundreds of thousands of distinct, valid, correctly-levelled questions. Word problems draw names, objects, and settings from Nigerian-flavoured pools (Ada, Chidi, Tunde, Amaka; mangoes, textbooks, okada rides; a shop in Ikeja), so the same arithmetic arrives dressed differently every time.

Seeding matters for two reasons: a session can be reproduced exactly for debugging, and the parent zone can show the actual questions a child got wrong.

Authored items remain supported for cases generation handles badly — naming a 3D shape from a picture, science facts, a specific verbal-reasoning idiom. The engine treats both uniformly.

### 5.3 Mastery and adaptivity

Each skill holds a **mastery score** in 0.0–1.0 per learner.

- Correct first try: `mastery += 0.15 × (1 − mastery)` — diminishing returns near the top
- Correct after a hint or retry: `+0.06 × (1 − mastery)`
- Incorrect: `mastery −= 0.10`, floored at 0
- Decay: −0.02 per week untouched, floored at 0.3 once a skill has ever crossed 0.8 — you don't fall all the way back to zero on something you truly learned

Bands: **Not started** (0) · **Learning** (<0.4) · **Getting it** (0.4–0.75) · **Mastered** (≥0.75) · **Fluent** (≥0.9 and held for 14 days).

**Difficulty selection** maps mastery to generator difficulty, aiming for roughly 75–85% success — high enough to feel good, low enough to be learning:

| Mastery | Difficulty |
|---|---|
| < 0.25 | 1 |
| 0.25–0.45 | 2 |
| 0.45–0.65 | 3 |
| 0.65–0.85 | 4 |
| > 0.85 | 5 |

If a child gets three wrong in a row within a session, difficulty drops one level immediately and a hint card is offered. The child is never told this happened.

**Parent override.** A parent can pin every question to a fixed level 1–5 instead of letting mastery drive it. When pinned, the adaptive rules above are suspended entirely — including the three-wrong-in-a-row drop — because a parent who asks for level 2 expects level 2, not level 2 quietly drifting. Mastery is still tracked underneath, so switching back to Auto resumes exactly where the child actually is.

Auto remains the default and the recommendation: it targets the 75–85% success band that keeps a child both learning and willing. The override exists because a parent watching their own child sometimes knows something the model doesn't — a topic covered at school last week, a bad day, a child who is bored and wants it harder.

### 5.4 No-fail design

Deliberately **not** using hearts/lives. Duolingo's model works on adults with an established habit; on a 7-year-old, being locked out mid-session reliably converts frustration into quitting. Instead:

- Wrong answer → gentle sound, the correct answer is shown and briefly explained, question is re-queued later in the session at lower difficulty.
- Sessions always complete. Accuracy determines **stars** (1–3), never whether you finish.
- Coins are earned for finishing regardless of score, with a bonus scaled by accuracy.

Optional **Beat the Clock** mode adds timing — but as a distinct, opt-in game, framed as a race, never as the default. Default sessions are untimed, because timing a child who is still building fluency mostly measures anxiety.

When it is on, the parent sets the countdown: 15, 30, 45, 60, 90 or 120 seconds per question. One fixed number cannot be right for both a times-table drill and a three-sentence word problem, and it certainly isn't right across the whole 6–8 age range, so this is a parent dial rather than a constant.

### 5.5 Spaced review

A lightweight Leitner system keeps old skills alive. Each mastered skill has a review box (1–5) with intervals of 1, 3, 7, 16, and 35 days. A correct review promotes; incorrect demotes to box 1.

Every session is composed as roughly:

- **60% current focus** — the skill(s) the child is working on now
- **25% review** — skills whose review date has come up, oldest first
- **15% stretch** — one skill up the prerequisite graph, at difficulty 1, to seed what's next

If nothing is due for review, that share goes to the focus skill.

### 5.6 Skill selection

The next focus skill is the first skill, in curriculum order, that satisfies: all prerequisites at mastery ≥ 0.6, and its own mastery < 0.75. This gives a natural progression that still lets a strong child move fast.

---

## 6. Gamification design

### 6.1 The loop

```
Open app → see mascot, streak, and the map
         → tap a glowing island (a strand)
         → tap a level (a session of 10 questions)
         → answer, get instant feedback, watch progress bar fill
         → results: stars, coins, XP, "new best" moments
         → coins drop into the kolo → shop → dress the mascot
         → tomorrow's streak flame is visible on the way out
```

### 6.2 Currencies and progression

| Element | Purpose | Rules |
|---|---|---|
| **XP** | Long-term progress | 10 per correct first try, 4 per correct retry, 25 session completion bonus |
| **Level** | Status | Thresholds rise gently: 100, 250, 450, 700, 1000 … Level-up is a full-screen celebration |
| **Coins** | Spending | 1 per correct answer, +5 completion, +5 for 3 stars, +10 daily first-session bonus |
| **Stars** | Per-session quality | 1 star ≥ 50% first-try accuracy, 2 ≥ 75%, 3 ≥ 90% |
| **Streak** | Habit | Consecutive days with ≥1 completed session. One "streak freeze" auto-granted per week |
| **Badges** | Milestones | "First Mango" (first session), "Sharp Sharp" (10 in a row correct), "Kolo Full" (500 coins), one per strand mastered, streak badges at 3/7/14/30 |

Deliberately **no** in-app leaderboards or comparisons with other children. At seven, that teaches the wrong lesson and the child in question is competing with himself.

### 6.3 The world

The map is a small island world. Each **strand** is an island; each island holds 5–8 **levels** (sessions). Completing an island unlocks the bridge to the next and awards a trophy displayed in the child's room. Islands are themed to the maths: Number Island (a market), Operation Falls, Fraction Grove (mango orchard — halves and quarters of real things), Measure Bay, Shape City, Data Beach.

### 6.4 The mascot

An owl called **Kolo**. Reacts to answers (celebrates, encourages, never scolds), delivers hints, and is the thing coins get spent on: hats, glasses, capes, and room decorations. Cosmetic only — nothing bought ever affects learning, and nothing is ever gated behind money.

Cosmetics are rendered as **inline SVG driven by config**, not image assets. Adding a hat is a data change, and the whole app stays under a megabyte.

### 6.5 What we deliberately avoid

- No timers on by default · no lives · no losing progress · no ads, ever · no external links in the child UI · no comparative scoring · no dark patterns around the streak (missing a day costs the flame, nothing more, and a freeze is granted weekly).

---

## 7. Screens

| Screen | Purpose | Notes |
|---|---|---|
| **First run** | Pick curriculum + year, enter first name, choose mascot colour, set parent PIN | Under 30 seconds. No email, no account. |
| **Home / Map** | The island world, streak, level, coin balance | The default landing screen |
| **Level select** | Levels within an island, stars earned on each | Locked levels visibly locked but never scolding |
| **Session** | One question at a time, progress bar, speaker button, hint button | The core screen; see §7.1 |
| **Results** | Stars, coins earned, XP bar, badges unlocked, "play again" / "back to map" | Celebration is generous but under 5 seconds to skip |
| **Kolo (shop)** | Spend coins on mascot cosmetics and room items | |
| **My Room** | The mascot, trophies, badges | Pure reward, no function. Kids love it. |
| **Parent zone** | PIN-gated. Progress, weak skills, time on task, settings | See §7.2 |

### 7.1 Question types

The engine supports a fixed set of interaction types so new content is content, not code:

| Type | Interaction | Example use |
|---|---|---|
| `multiple-choice` | Tap one of 2–4 large cards | Almost everything |
| `numeric-entry` | Big on-screen number pad | Arithmetic where typing the answer matters |
| `true-false` | Two large buttons | Quick checks, science later |
| `order` | Tap items in sequence to order them | "Smallest to largest" |
| `match` | Tap left, tap right, they connect | Shapes to names, Roman numerals |
| `tap-many` | Select all that apply | "Tap all the even numbers" |
| `number-line` | Tap a position on a line | Place value, estimation, fractions |
| `count-objects` | Tap objects to count them | Early counting, groups |

Every type: ≥64 px targets, immediate visual + audio feedback, works with one finger, no drag precision required.

### 7.2 Parent zone

PIN-gated by a 4-digit code (a simple maths question guards the entrance too — effective at this age). Contains:

- **This week** — days played, sessions, minutes, questions answered
- **Mastery by strand** — a bar per strand, colour-coded by band
- **Needs attention** — the three lowest-mastery skills that have been attempted, each with the actual questions missed and a one-line "how to help at home" tip
- **Settings** — curriculum, year band, **difficulty (Auto or pinned 1–5)**, session length, Beat the Clock on/off and **seconds per question**, sound, read-aloud on/off and speed, dyslexia-friendly font, reduced motion, parent code, reset progress, export progress as JSON

  The difficulty control shows what Auto is currently choosing ("Auto is pitching *Adding big numbers* at level 3 of 5") before a parent decides to override it — otherwise the choice is blind.

The "how to help" tip is the highest-value thing in this screen and the most likely reason a parent recommends the app to another parent.

---

## 8. Content plan

v1 authors **Nigerian Mathematics** only. The rest is specified here so the data model is right and the work is sequenced.

### 8.1 Mathematics — Nigerian UBE, Basic 2 → Basic 3 *(v1)*

| Strand | Skills |
|---|---|
| **Number & Numeration** | Count/read/write to 200 (B2) and to 1000 (B3) · Place value HTU · Compare & order 3-digit numbers · Odd & even · Skip counting 2s/3s/5s/10s/100s · Roman numerals I–XX · Ordinal numbers to 20 |
| **Basic Operations** | Add 2-digit (no regrouping → regrouping) · Add 3-digit with regrouping · Subtract 2-digit and 3-digit with borrowing · Multiplication as repeated addition · Times tables 2, 3, 4, 5, 10 · Division as equal sharing · Missing-number open sentences · Word problems (mixed) |
| **Fractions** | Halves, quarters, thirds of a shape · Fractions of a set of objects · Compare simple fractions · Equivalence (½ = 2/4) |
| **Money** | Recognise naira notes & kobo coins · Add amounts · Give change · Buying-and-selling word problems |
| **Measurement** | Length in m/cm · Weight in kg/g · Capacity in litres · Time: reading o'clock, half past, quarter past/to · Days, months, calendar · Simple durations |
| **Geometry** | 2D shapes and their properties · 3D shapes and everyday objects · Lines: horizontal, vertical, curved · Right angles · Symmetry |
| **Everyday Statistics** | Read a pictogram · Read a simple bar chart · Sort and tally |

Roughly 40 skills. Every one gets at least one generator.

### 8.2 Quantitative Reasoning *(phase 2)*

Number sequences and patterns · missing numbers in shapes (the classic triangle/circle puzzles) · number machines (in/out boxes) · coding and decoding numbers · figure analogies · counting squares and shapes in a figure · matching and sorting · spatial rotation · simple area by counting · ordering by size.

Generates well — nearly all of it is parameterisable, so this is the cheapest of the remaining packs to build.

### 8.3 Verbal Reasoning *(phase 2)*

Synonyms · antonyms · odd one out · word analogies · alphabetical ordering · coded words (letter shifts) · jumbled words · homonyms and homophones · completing sentences · letter sequences · rhyming words · plurals.

Together these are the subjects international apps simply don't have, and the main reason a Nigerian parent would choose this over Khan Academy Kids.

Verbal is the harder of the two to build: it needs curated word lists per year band, vetted for reading level, so authored items will outnumber generated ones. Coding/decoding, letter sequences and alphabetical ordering do generate well, and should be built first.

### 8.4 Basic Science and Technology *(phase 3)*

Living and non-living things · parts of the body and the five senses · plants: parts and needs · animals: groups, habitats, young · food and nutrition, balanced diet · water: sources, uses, safety · air and weather · our environment and keeping it clean · personal hygiene · safety at home and school · materials and their properties · simple machines · light, sound and heat · energy and where it comes from · basic technology: tools and simple machines around us.

Science is the most diagram-dependent subject and will need a small library of inline SVG illustrations. Plan for that; don't let it block phases 1 and 2.

### 8.5 UK curriculum *(phase 4)*

Year 2 → Year 3 National Curriculum for maths, reasoning framed as 11+ preparation, and Key Stage 2 science. Sterling replaces naira, names and settings shift, Roman numerals move to Year 4 (where the National Curriculum actually puts them), and the two reasoning subjects keep the split but take the names British 11+ practice uses — "Non-Verbal Reasoning (11+)" and "Verbal Reasoning (11+)". A v1 stub ships to prove the switch works end to end.

---

## 9. Curriculum switching

The requirement — Nigerian now, British later, switchable — determines the architecture, so it's designed in from the first commit rather than bolted on.

### 9.0 Age, not class, is what a parent knows

A parent reliably knows their child's age. They do not reliably know that Basic 3, Year 3 and Grade 2 are the same level, and they should not have to.

So every year band declares the age range it covers, and the class is derived:

| Age | Nigeria | England | United States |
|---|---|---|---|
| 5 | Basic 1 | Year 1 | Kindergarten |
| 6 | Basic 2 | Year 2 | Grade 1 |
| 7 | Basic 3 | Year 3 | Grade 2 |
| 8 | Basic 4 | Year 4 | Grade 3 |
| 9 | Basic 5 | Year 5 | Grade 4 |
| 10–11 | Basic 6 | Year 6 | Grade 5 |

Onboarding asks the age, suggests the class, and lets the parent change it — a child held back or moved up is common enough to matter. Switching curriculum later re-derives the class from the age rather than carrying across an id that means a different level abroad.

### 9.0.1 Placement: an older child must not start at Basic 1

Bands are cumulative (§9.1), which is right for revision but produces a bad first session for an older child: every Basic 6 skill has a prerequisite chain running back to Basic 1, so a naive "first unmastered skill with met prerequisites" search sends an 11-year-old to *Counting to 20*.

Two rules fix it:

1. **An untouched prerequisite from an earlier class is assumed met.** Only prerequisites within the child's own class are enforced. Earlier material surfaces when the child actually gets something wrong, not pre-emptively.
2. **Levels from earlier classes are unlocked from the start** and labelled *Revision*. They are available, not a gate. Only the child's own class gates sequentially.

The net effect: a Basic 6 child starts on Basic 6 work, with all the earlier material sitting there if they or their parent want it.

### 9.1 Rules

1. **The engine knows nothing about any specific curriculum.** No hard-coded "₦", no hard-coded strand names, no `if (curriculum === 'ng')` anywhere outside the content layer. This rule is what makes the second curriculum cheap.
2. **A curriculum is a self-contained package** exporting a manifest: id, display name, locale, currency, year bands, and its subjects → strands → skills.
3. **Locale data travels with the curriculum** — currency symbol and denominations, name pools, place and object pools, measurement conventions, date formats.
4. **Skill ids are namespaced by curriculum** (`ng.maths.b3.…`, `uk.maths.y3.…`). Progress is therefore stored per curriculum and never collides.
5. **Switching curriculum preserves progress in both.** Switch to UK, play, switch back to Nigerian — the Nigerian progress is exactly where it was. Progress is keyed `{learnerId}.{curriculumId}.{skillId}`.
6. **Cross-curriculum concept tags are optional metadata.** A skill may declare `concepts: ['place-value-3-digit']`, which later allows an equivalence map so a child switching schools carries credit across. Recorded now, used later.

### 9.2 Adding a curriculum

Create `src/content/<id>/`, export a manifest, register it. No engine change, no UI change, no migration. The UK stub in v1 exists specifically to prove this claim rather than assert it.

---

## 10. Technical architecture

### 10.1 Stack

| Layer | Choice | Why |
|---|---|---|
| Build | **Vite** | Fast, boring, excellent PWA story |
| UI | **React 19 + TypeScript** | Types matter a lot for a content model this size |
| Styling | **Tailwind CSS v4** | Fast iteration; kid-scale sizing enforced by design tokens |
| Animation | **CSS keyframes** | The "juice" that makes it feel like a game, with no animation library to ship |
| State | **Zustand + persist** | Small, no boilerplate, localStorage persistence built in |
| Storage | **localStorage** (v1) | Zero setup. IndexedDB migration path if data grows |
| Offline | **vite-plugin-pwa** (Workbox) | Installable, full offline after first load |
| Audio | **Web Audio API, synthesised** | No audio assets to ship or license |
| Speech | **Web Speech API** | Built into every target browser, free, offline on most |
| Graphics | **Inline SVG** | Themeable, tiny, scales to any screen, no asset pipeline |
| Backend | **None** | Deliberately |
| Hosting | Static — Netlify / Vercel / Cloudflare Pages | Free tier is more than enough |

No third-party fonts, no CDN scripts, no analytics SDK. The app is one static bundle.

### 10.2 Module layout

```
src/
  engine/          curriculum-agnostic. types, seeded RNG, registry,
                   session builder, mastery model, scoring
  content/
    ng-ube/        Nigerian pack — manifest, locale, maths skills + generators
    uk-nc/         UK pack — stub proving the switch
  state/           zustand store, persistence, migrations
  screens/         map, session, results, shop, room, parent, onboarding
  components/      question renderers, number pad, mascot, chrome
  lib/             speech, sound, haptics, formatting
```

The dependency rule: `content → engine`, `screens → engine + state`, and **never** `engine → content`. Content packs are discovered through a registry, not imported by the engine.

### 10.3 Core types (sketch)

```ts
type Difficulty = 1 | 2 | 3 | 4 | 5

interface Skill {
  id: string                    // "ng.maths.b3.add-3digit-regroup"
  title: string                 // child-facing
  strandId: string
  yearBand: string              // "b2" | "b3"
  prerequisites: string[]
  concepts?: string[]           // cross-curriculum equivalence tags
  generate: (rng: Rng, difficulty: Difficulty, locale: Locale) => Item
  hint?: string
}

interface Item {
  skillId: string
  prompt: string                // read aloud verbatim
  type: QuestionType
  payload: unknown              // shape depends on type
  answer: Answer
  explanation?: string          // shown after a wrong answer
}
```

### 10.4 Persistence

One versioned object in localStorage under `kolo.save.v1`:

```
profile      name, mascot config, curriculum, year band, created date
settings     sound, speech rate, session length, font, timed mode, parent PIN
progress     per curriculum: { skillId: { mastery, attempts, correct,
                               lastSeen, reviewBox, reviewDue } }
economy      xp, level, coins, owned cosmetics, equipped
history      last 60 sessions: date, skills, accuracy, duration, missed items
streak       current, longest, lastPlayed, freezesAvailable
```

A `version` field plus a migration chain means the save survives schema changes — which matters once it's on someone else's tablet and can't be wiped.

### 10.5 Performance targets

Cold load < 2 s on a mid-range Android tablet over 3G · question transition < 100 ms · total bundle < 500 KB gzipped · 60 fps animation · fully functional offline.

---

## 11. Accessibility

- Read-aloud on every question and every answer option, via Web Speech API, with parent-adjustable rate.
- Minimum 64 px touch targets, 16 px spacing.
- WCAG AA contrast throughout; correctness never signalled by colour alone — always colour **plus** icon **plus** sound.
- Optional dyslexia-friendly font and increased letter spacing.
- Full keyboard navigation (helps assistive tech and desktop use).
- Reduced-motion mode honouring `prefers-reduced-motion`.
- No flashing above 3 Hz.
- Portrait and landscape both supported; the app never demands rotation.

---

## 12. Privacy, safety and compliance

This is a children's product, which raises the bar and shapes several decisions above.

**v1 posture — no data collection at all.** No accounts, no email, no analytics, no third-party scripts, no network calls after load. Everything lives in the browser's localStorage on the device. A child's first name is entered locally and never transmitted. This is the strongest possible position under Nigeria's NDPR, GDPR-K, and COPPA simultaneously: obligations largely attach to *collecting* or *processing* personal data, and we do neither.

**When cloud sync arrives, this changes materially** and must be designed properly rather than incrementally:

- Parent-held accounts only; children never have credentials.
- Verifiable parental consent before any child data is stored (COPPA if there will be US users).
- Data minimisation: store skill ids and scores, never free text from a child.
- NDPR registration and a published privacy policy before any paid launch in Nigeria.
- Explicit retention and deletion policy, with parent-initiated export and delete.

**Content safety:** no chat, no user-generated content, no child-to-child contact, no external links in the child-facing UI, and no advertising in any tier. The parent zone is the only place that can navigate away.

---

## 13. Roadmap

Phases 1–3 are content work on an unchanged engine. That is the whole point of the architecture in §9 and §10.

| Phase | Deliverable | Status |
|---|---|---|
| **1** | Engine, game loop, parent zone, PWA. Nigerian Maths Basic 1–6. UK and US maths packs. Age-based placement. Parent-set difficulty and timer. | **Done** |
| **2** | Quantitative Reasoning, Verbal Reasoning and English Grammar packs, Basic 1–6 | In progress |
| **3** | Basic Science, Basic Technology and Social Studies packs (needs an SVG illustration library for science) | Planned |
| **4** | Full UK and US packs across all subjects and years | Planned |
| **5** | **Licensing and payments** — see §14 | Planned |
| **6** | **Multi-child profiles** on one device — see §14.3 | Planned |
| **7** | Optional cloud sync and cross-device. The point at which §12's second half becomes mandatory work. | Planned |
| **8** | Distribution: shareable link, then Play Store via TWA if the pull is there | Planned |
| **9** | School licences — the largest revenue opportunity, but a different product with teacher dashboards and class management | Someday |

---

## 14. Commercial model

Decided, not yet built. Recorded here so the architecture does not foreclose it.

### 14.1 Licensing mechanism: signed keys, not accounts

The app has no backend and no accounts, and §12 explains why that is worth protecting. Gating on payment does **not** require giving that up.

- Parent pays through Paystack. Paystack — not us — holds their email and card details.
- They receive a **licence key**, signed with a private key held offline.
- The app verifies the key against a bundled public key. Verification is local; the app still makes no network calls.
- The app stays a static site on free hosting. No servers, no database, no child data in transit.

Stripe or Paddle covers international buyers; Paddle acts as merchant of record and handles VAT and sales tax, which is a real administrative saving for a one-person operation.

### 14.2 What is free

Gating by **content**, never by time. A countdown that locks a child out mid-thought is hostile, and any client-side time limit is trivially bypassed anyway.

- The child's own class in **Mathematics** is free, permanently, for everyone.
- Other subjects and other classes are part of the paid licence.
- **No paywall ever interrupts a session.** A started quest always finishes.
- No advertising in any tier, ever.

### 14.3 Pricing

- **₦5,000 per year** in Nigeria, with a one-time lifetime option offered at launch as an early-adopter reward.
- Priced regionally elsewhere — roughly **$15–20 per year** — still well under Khan Academy Kids' peers and IXL.
- **The first 20 families to sign up get it free forever, for one child.** They are the people taking a risk on an unproven app, and their feedback is worth more than their subscription. Additional children on the same licence are paid, at a reduced per-child rate.
- One licence covers one child. Multi-child support (phase 6) adds profiles on one device, each with its own progress, mascot and report.

### 14.4 The charity commitment

The intention is that **half the money funds development and hosting, and half goes to charity.** Two things must be settled before that is stated publicly, because a public charity claim is a regulated representation, not marketing copy:

1. **Define the base precisely.** "50% of revenue" and "50% of profit" differ substantially once payment processing (1.5–3%) and tax are accounted for. Nigerian tax relief on donations is capped and applies only to approved bodies under the 5th Schedule of CITA, so donating 50% of *revenue* can mean paying tax on money already given away. This needs an accountant's sign-off before publication.
2. **Name one registered charity, and publish what was actually donated,** with receipts, on a regular cycle. Vague "half goes to charity" claims are where well-intentioned projects get into difficulty.

### 14.5 Scale reality

₦5,000/year × 200 families is roughly ₦1m/year — about $650. Half to charity leaves around ₦500k for development and hosting. At that size this is a worthwhile gesture, not a business. It becomes materially significant at thousands of families, or through school licences (phase 9).

### 14.6 Sequencing

Ship free to roughly 20 families on an unlisted link **first**, and find out whether children keep playing. That single question determines whether anything else here is worth building. Payments come only once retention is real — and those first families keep it free permanently.

---

## 15. Success metrics

**Learning:** mastery growth per strand over 4 weeks · review retention (accuracy on items re-seen after ≥7 days) · proportion of skills reaching Mastered.

**Engagement:** active days per week · median session length · sessions per active day · streak length · voluntary second sessions.

**Product:** parent-zone opens per week · time to first question on a cold start · offline sessions completed.

The primary metric for v1 is simply: **does he choose to play it without being asked?** Everything else is diagnostics.

---

## 16. Open questions

1. **Name.** *Kolo* is a placeholder. It's one constant to change.
2. **Voice.** Web Speech API voices are typically a British or American default. A Nigerian-accented voice would land better but needs either a paid TTS service (breaks the no-network rule) or recorded audio (breaks generation, since generated questions can't be pre-recorded). Recommendation: ship with the system voice, revisit if it grates.
3. **Year-band handling mid-year.** He's between Basic 2 and Basic 3. v1 mixes both bands with B3 weighted higher; worth watching whether that pitches right in practice.
4. **Session length.** 10 questions is the default. Adjustable in the parent zone; the real answer comes from watching him play.
5. **Second-child support.** Deferred to phase 5 — but the save format is keyed by learner from the start so it isn't a migration later.
