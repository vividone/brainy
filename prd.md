# Brainy — Product Requirements & Architecture

> **Name:** *Brainy*, powered by **Fortbridge Technologies Ltd**, at **brainy.fortbridge.app**.
> The app was built as *Kolo* (Yoruba/Nigerian Pidgin for a child's savings box) and renamed once it
> was going to be handed to other families: *Kolo* is warm but needs explaining to anyone outside
> Nigeria, and the first thing a stranger's product has to do is be understood. The coin-box idea
> survives in the shop; the owl mascot did not survive at all (§6.4).
>
> One piece of the old name is deliberately still in the code: the localStorage key is
> `kolo.save.v1` and **must never be changed**. It is the address of every child's progress on every
> tablet already out there, and renaming it for tidiness would orphan all of them silently.

| | |
|---|---|
| **Author** | Victor Olaitan |
| **Date** | 4 August 2026 |
| **Status** | Living document — phases 1, 5 and 6 shipped; phase 2 in progress |
| **Primary learner** | 7-year-old, finishing Basic 2, entering Basic 3 |
| **Scope now** | Basic 1–6 × 11 subjects × 3 curricula, structured. Mathematics authored end to end across all three curricula; QR, VR and English Grammar authored and being deepened; the fact-heavy subjects structured but not yet written. Tablet-first installable web app. No child accounts, ever. |

---

## 1. Summary

Brainy is a gamified practice app for primary children. It turns curriculum-aligned drilling into a short daily game: 5–10 minute sessions, immediate feedback, coins, streaks, a character and pet the child picks and adds to, and a world map that opens up as skills are mastered.

It spans the whole of primary — **Basic 1 to Basic 6** — with British and American equivalents of each class.

**Taught throughout primary (Basic 1–6):**

1. **Mathematics**
2. **Quantitative Reasoning**
3. **Verbal Reasoning**
4. **English Grammar**
5. **Basic Science & Technology**
6. **Social Studies**
7. **History**
8. **Computer Studies**

**Upper basic only (Basic 4–6):**

9. **Home Economics**
10. **Agricultural Science**
11. **Vocational Studies**

Two grouping decisions worth stating, because both could reasonably have gone the other way:

- **Science and Technology are one subject**, as NERDC timetables them ("Basic Science and Technology"). Splitting them would invent a distinction the syllabus does not make.
- **Quantitative and Verbal Reasoning are two subjects**, not the combined "QR & VR" line some schemes use. Nigerian schools timetable and examine them separately, common entrance assesses them separately, and — the reason that actually matters here — a child is very often strong at one and weak at the other. A blended score would hide exactly the gap a parent needs to see.

Subjects can declare which classes they belong to. A Basic 1 child never sees an Agricultural Science card, locked or otherwise: an option they cannot take is noise, not motivation.

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

The product must be shareable as a link with no setup ritual: open it, answer a few questions, start playing. Every step between the link and the first question loses people.

**Revised: setup is parent-led, not child-led.** The original design put the child straight into a
name-and-colour flow. That was wrong on two counts — a 7-year-old cannot pick their own year band,
and the parent is the person who needs to understand what the app is before handing over the tablet.
Setup now addresses the grown-up throughout, ends by setting the parent code, and hands over
explicitly ("Give the tablet to Jaymin"). It costs perhaps twenty seconds and it means the first
adult to open Brainy has seen what it does, what it collects, and where the grown-up area is.

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

- No multiplayer, leaderboards, or any child-to-child contact.
- No chat, no user-generated content, no AI tutor in-app.
- No video lessons. This is a practice app, not a teaching app. (Short hint cards, yes; lessons, no.)
- Subjects beyond Mathematics are structured but not authored in phase 1 — the engine, navigation and data model already accommodate them, so adding each is content work rather than engineering work.

**Revised: "no accounts, no backend" split in two.** The original non-goal was a single line — *no
user accounts, login, or cloud sync* — and it has been separated into a part that hardened and a part
that gave way.

- **Hardened, and now a principle rather than a non-goal: children never have accounts.** No
  credentials, no row in any table, no name or answer leaving the device. Nothing in the licensing
  or analytics work touched this, and §12 exists to keep it that way.
- **Gave way: adults can have one.** A parent who claims a free place, redeems a code or pays needs
  somewhere for that to live, and "the licence is on this tablet only" fails the first time a tablet
  is replaced — which is exactly when a family most needs it to work. So there is a small backend
  holding parents, licences and payments (§14.1), and a parent-held access code that carries a
  licence to a new device.
- **Still deferred: cloud sync of a child's progress.** Moving between devices is done with an
  export file (§10.4), not a server. Sync is phase 7 precisely because it is the step that would put
  a child's data somewhere other than their own tablet, and it needs the design work in §12 rather
  than an incremental slide into it.

---

## 4. Product principles

1. **The game is the wrapper, the curriculum is the payload.** Never distort a maths concept to fit a game mechanic.
2. **No dead ends.** A child can always try again immediately, without cost, without leaving the screen.
3. **Reward effort, not just correctness.** Coins for attempts and completion; stars for accuracy. A child having a hard day still leaves with something.
4. **Short by default.** The default session is 10 questions. Playing more is a choice the child makes, never a requirement.
5. **The child never sees a setting.** Difficulty, curriculum, sound, and time limits are all parent-side.
6. **Every question is readable aloud.** Tap the speaker, hear the question. Non-negotiable at this age.
7. **Nothing about the child leaves the device.** No analytics beacons, no third-party scripts, no fonts from a CDN, and no name, age, answer or score ever transmitted. This is a children's app; the safest data policy is having no data. The only things that ever go anywhere are a grown-up's own decisions — opt-in usage counts, and the email address behind a licence (§12, §14.1).
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

**Revised: "hundreds of thousands of combinations" is not the same as variety.** The count above is
true and was still the wrong measure. A child reported seeing repeated questions in Quantitative
Reasoning, Verbal Reasoning and English Grammar while the arithmetic combinatorics said that was
nearly impossible — because what a child recognises is not the numbers, it is the *shape* of the
question. Twenty templates each producing thousands of variants still reads as twenty questions.

Three things came out of that, and they apply to every pack:

- **Signatures.** Every generated question carries a signature, recorded per skill, and the session
  builder will not serve one that has been seen recently. Generation retries until it finds a new
  one.
- **Shape, measured.** Variety is now measured as distinct *forms* — the question text with digits
  normalised to `#` and quoted words to `W` — not distinct strings. This is the number that
  corresponds to what a child perceives, and it is reported per skill by the smoke test.
- **Breadth over depth when authoring.** A skill with four templates and huge numeric range is worse
  than one with twelve templates and a modest range. Content review now asks for the second.

The word-heavy subjects are the hard case: verbal reasoning and grammar have far less room to vary
than arithmetic, because the vocabulary must stay age-appropriate. Their answer is bigger authored
pools rather than cleverer generation.

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
Open app → see your character and pet, streak, and the subject grid
         → tap a subject, then a glowing island (a strand)
         → tap a level (a session of 10 questions)
         → answer, get instant feedback, watch progress bar fill
         → results: stars, coins, XP, "new best" moments
         → coins drop into the coin box → shop → new characters, pets and outfits
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
| **Badges** | Milestones | "First Mango" (first session), "Sharp Sharp" (10 in a row correct), "Coin Box Full" (500 coins), one per strand mastered, streak badges at 3/7/14/30 |

Deliberately **no** in-app leaderboards or comparisons with other children. At seven, that teaches the wrong lesson and the child in question is competing with himself.

### 6.3 The world

The map is a small island world. Each **strand** is an island; each island holds 5–8 **levels** (sessions). Completing an island unlocks the bridge to the next and awards a trophy displayed in the child's room. Islands are themed to the maths: Number Island (a market), Operation Falls, Fraction Grove (mango orchard — halves and quarters of real things), Measure Bay, Shape City, Data Beach.

### 6.4 The character and pet

**Revised: one fixed mascot became a character the child chooses.** The original design was a single
owl called Kolo that the child dressed up. Watching a 7-year-old actually use it changed the
decision: the strongest pull was not decorating a mascot he had been given, it was *having one that
was his*. Picking is now the first thing that happens after setup, and the child chooses two things —
a **human character** and a **pet**.

- **16 characters and 12 pets.** A handful of each are free so the first choice is a real choice and
  not a single default with fifteen padlocks. The rest cost coins.
- **Buying more is the main coin sink**, and the reason to come back to the shop. This is the
  mechanic that visibly increased voluntary play, which is why it was expanded rather than left as
  hats and capes.
- **Cosmetic only.** Nothing bought ever affects learning, difficulty or progression, and nothing is
  purchasable with money — coins are earned by answering questions and by nothing else. A paid
  licence buys access to the app, never an advantage inside it.

Characters, pets and cosmetics are rendered as **inline SVG driven by config**, not image assets.
Adding one is a data change, and the whole app stays small enough to install over a slow connection.

### 6.5 What we deliberately avoid

- No timers on by default · no lives · no losing progress · no ads, ever · no external links in the child UI · no comparative scoring · no dark patterns around the streak (missing a day costs the flame, nothing more, and a freeze is granted weekly).

---

## 7. Screens

| Screen | Purpose | Notes |
|---|---|---|
| **First run** | Parent-led: child's **age** (class is derived), curriculum, first name, sharing choice, parent code | Addressed to the grown-up throughout, then hands over explicitly. Also the way in for **Restore a backup** — see below. |
| **Pick your buddy** | Choose a human character and a pet | The first thing the child does. Free options only until they earn coins. |
| **Home** | Subject **grid**, streak, level, coin balance, character and pet | The default landing screen |
| **Subject** | One subject's strands, mastery, and what it covers by class | See the note below on why this exists |
| **Level select** | Levels within an island, stars earned on each | Locked levels visibly locked but never scolding |
| **Session** | One question at a time, progress bar, speaker button, hint button | The core screen; see §7.1 |
| **Results** | Stars, coins earned, XP bar, badges unlocked, "play again" / "back to map" | Celebration is generous but under 5 seconds to skip |
| **Shop** | Spend coins on characters, pets and cosmetics | The main coin sink; see §6.4 |
| **My Room** | Character, pet, trophies, badges, collections | Pure reward, no function. Kids love it. |
| **Who is playing?** | Pick a child, when a device has more than one | Only appears when there is more than one; never in the way of a single-child family |
| **Taking a break** | The whole app, paused by a grown-up, with an optional note | Warm rather than punitive; "I am a grown-up" leads to the code pad |
| **Parent zone** | Code-gated. Progress, analysis, children, access, settings | See §7.2 |

**Revised: the subject row became a grid, and subjects got their own screen.** Subjects were
originally a horizontally scrolling row on the home screen. With three subjects that was fine; with
eleven it became a carousel a child had to swipe through, and the ones off-screen were effectively
invisible. Two changes followed from watching that:

- **A grid, not a row.** Everything available is visible at once, without scrolling, which is also
  how a child discovers a subject they have not tried.
- **A subject opens its own screen** rather than expanding in place, showing that subject's strands,
  mastery so far, and what it covers at this class. A parent asking "is this actually teaching him
  the Basic 3 syllabus?" gets an answer without leaving the child's side of the app.

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

Gated by a 4-digit code (a simple maths question guards the entrance too — effective at this age).
It grew from one screen into tabs, because a single scrolling page could no longer hold it:

**Progress**

- **This week** — days played, sessions, minutes, questions answered
- **Class readiness** — how much of the current class's material is mastered, which is the question
  a parent actually has, phrased the way they ask it
- **Accuracy trend** — six weeks, so a bad week reads as a bad week rather than as a verdict
- **Mastery by subject and strand** — a bar each, colour-coded by band
- **Strongest and needs attention** — deliberately drawn from opposite ends of a single ranking, so
  the same skill can never appear in both lists
- **Retention** — accuracy on review items seen after a gap, which is the only honest measure of
  whether anything stuck, plus what is **going rusty** and due for review
- **Needs attention** entries carry the actual questions missed and a one-line "how to help at home"
  tip. This remains the highest-value thing in the app for a parent and the most likely reason one
  recommends it to another.

**Children** — add a child, rename, switch, and remove. Each child keeps their own progress, coins,
streak and report; the only shared things are the sound setting and the grown-up code.

**Access** — the family's licence: plan, how many children it covers, and where to enter or change
an access code (§14.1).

**Settings** — curriculum, year band, **difficulty (Auto or pinned 1–5)**, session length, Beat the
Clock on/off and **seconds per question**, sound, read-aloud on/off and speed, dyslexia-friendly
font, reduced motion, grown-up code, **lock the app**, **Help improve Brainy** (the one consent),
feedback, export and restore a backup, reset progress, and **delete everything**.

  The difficulty control shows what Auto is currently choosing ("Auto is pitching *Adding big
  numbers* at level 3 of 5") before a parent decides to override it — otherwise the choice is blind.

**Added: a parent can lock the app.** Screen-time arguments are the most common reason a good
learning app gets deleted, so ending the session is a first-class feature rather than something a
parent has to do by confiscating the tablet. Locking shows a warm "Taking a break" screen with the
child's buddy and an optional note from the parent, and unlocking needs the grown-up code.

**Added: a parent can remove a child, or delete everything.** Both matter for a product handed to
other families — a shared or borrowed tablet needs a way to clear a child off it, and a parent who
changes their mind is owed a real exit rather than a settings page that only adds. Removing the last
child returns to setup but keeps the grown-up's own code and preferences; **Delete everything**
wipes the device back to a fresh install and, when usage sharing was on, erases the server-side
records first — see §12.

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

### 8.4 Basic Science & Technology *(phase 3)*

Living and non-living things · parts of the body and the five senses · plants: parts and needs · animals: groups, habitats, young · food and nutrition · water: sources, uses, safety · air and weather · our environment · personal hygiene · safety at home and school · materials and their properties · everyday tools and workshop safety · simple machines and levers · electricity and circuits · light, sound and heat · technical drawing basics.

One subject, not two — NERDC timetables it as "Basic Science and Technology", and splitting it would invent a distinction the syllabus does not make.

Science is the most diagram-dependent subject and will need a small library of inline SVG illustrations. Plan for that; don't let it block phases 1 and 2.

### 8.5 Social Studies, History and Computer Studies *(phase 3)*

**Social Studies** — family and relationships · our community and its leaders · Nigerian states and capitals · culture, festivals and languages · national symbols · rights and responsibilities · transport and communication · safety and road signs.

**History** — my family history · our town and its origins · early Nigerian kingdoms · Benin, Oyo and Kanem-Borno · the Sokoto Caliphate · colonial Nigeria · independence and after · national heroes.

**Computer Studies** — parts of a computer · input and output devices · keyboard and mouse · files and folders · the internet and staying safe · word processing · spreadsheets · first steps in coding.

These three are fact-heavy rather than generatable, so they need the most careful checking and the most authored (rather than generated) items. History in particular must be accurate and even-handed; get it reviewed by someone who teaches it.

### 8.6 Upper basic: Home Economics, Agricultural Science, Vocational Studies *(phase 3)*

Introduced at Basic 4 and hidden entirely for younger classes.

**Home Economics** — food groups and balanced diet · kitchen safety and hygiene · cooking methods · sewing and mending · caring for clothes · keeping the home clean · family and childcare · managing money at home.

**Agricultural Science** — what farming is · farm tools · crop plants of Nigeria · planting and harvesting · farm animals · soil types · pests and diseases · processing and storing food.

**Vocational Studies** — trades and occupations · local crafts and materials · simple woodwork and metalwork · basic electrical work · starting a small business · buying, selling and profit · saving and budgeting · safety at work.

### 8.7 Sourcing the fact-heavy subjects

Maths, Quantitative Reasoning and much of English generate from rules. Science & Technology, Social Studies, History and Computer Studies do not — they rest on facts that must be **correct**, at the **right depth for the class**, and matched to what the child's school actually teaches. Guessing at that is how an app quietly teaches a child something wrong.

**What is most useful to gather, in priority order:**

1. **The NERDC/UBE curriculum document for each subject.** This is the single highest-value item. It gives the official scope and sequence per class — what a Basic 4 child is expected to know about soil, versus Basic 6. Often published free by NERDC. Without it, the class-by-class split is guesswork.
2. **One mainstream textbook per subject**, at roughly the level his school uses. Textbooks show the *depth* and *vocabulary* expected — the curriculum says "Nigerian kingdoms", the textbook shows whether that means three names or eight with dates.
3. **His actual scheme of work**, if the school publishes one. This beats everything else for term-by-term ordering.
4. **Past common-entrance papers** for the reasoning and upper-primary subjects — they show the exact question styles children are assessed on.

**Authoritative references for facts that must be exact:**

- States and capitals, national symbols, the constitution: official Nigerian government sources rather than textbook summaries, which sometimes lag reorganisations.
- Historical dates and figures: at least two independent sources before a fact becomes an answer key.

**How the material gets used.** Facts are not copyrightable, but a specific question's wording — and the selection and arrangement of a question bank — can be. So these sources are used as a **reference for what to teach and to what depth**, and every question is written fresh against that. No copying of question banks, and no reproducing a textbook's exercises. This matters more, not less, once the app is being sold.

**History needs a human reviewer.** More than any other subject here, it involves contested framing and periodisation. Before it goes in front of a child, someone who teaches Nigerian history should read it.

### 8.8 UK and US curricula *(phase 4)*

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
| UI | **React 18 + TypeScript** | Types matter a lot for a content model this size |
| Styling | **Tailwind CSS v4** | Fast iteration; kid-scale sizing enforced by design tokens |
| Animation | **CSS keyframes** | The "juice" that makes it feel like a game, with no animation library to ship |
| State | **Zustand + persist** | Small, no boilerplate, localStorage persistence built in |
| Storage | **localStorage** (v1) | Zero setup. IndexedDB migration path if data grows |
| Offline | **vite-plugin-pwa** (Workbox) | Installable, full offline after first load |
| Audio | **Web Audio API, synthesised** | No audio assets to ship or license |
| Speech | **Web Speech API** | Built into every target browser, free, offline on most |
| Graphics | **Inline SVG** | Themeable, tiny, scales to any screen, no asset pipeline |
| Backend | **A handful of serverless functions + Postgres** | None for the game itself. Opt-in usage data, parent sign-ups, licences and payments only — see §12 and §14.1 |
| Hosting | **Vercel** | Chosen over Netlify because the same platform serves the static app and the `api/` functions; one deploy, one place for environment variables |
| Database | **Postgres** (pooled connection) | Chosen over a key-value store because the same database has to carry licences and payments later, and moving money off Redis afterwards is the wrong order |

No third-party fonts, no CDN scripts, no analytics SDK. The app is one static bundle, and a whole
session plays with the network off.

**URL layout.** The marketing site is at the root, the app at **`/play/`**, the dashboard at
`/admin`. One deployment-shaped decision is worth recording because it is invisible and cost real
time: **`cleanUrls` must stay off in `vercel.json`.** It canonicalises `/play/` to `/play`, which
falls outside the service worker's `/play/` scope — Chrome then finds no controlling worker and
silently stops offering to install the app. There is no error; the Install option simply never
appears. `/admin` and `/privacy` are served by explicit rewrites instead.

**What the backend is not.** It never holds a child's name, age, answers or progress, and the game
loop makes no request to it: gameplay, mastery, the parent report and every setting are computed on the
device from localStorage. It exists for three things a static site genuinely cannot do — receive usage
data a parent opted into, remember that a family has a licence so it survives a new tablet, and take a
payment. The functions are plain JavaScript in `api/`, with no build step and no framework, for the
same reason the game has no backend: fewer moving parts than the problem requires is the goal.

### 10.2 Module layout

```
src/
  engine/          curriculum-agnostic. types, seeded RNG, registry,
                   session builder, mastery model, scoring
  content/
    ng-ube/        Nigerian pack — manifest, locale, skills + generators
    uk-nc/         UK pack
    us-ccss/       US pack
    shared/        generators reused across packs
  state/           zustand store, persistence, migrations, analytics
  screens/         home, subject, island, session, results, shop, room,
                   parent, onboarding, locked, feedback
  components/      question renderers, number pad, characters, chrome
  game/            characters, pets, shop catalogue
  lib/             speech, sound, haptics, formatting, usage, licence
api/               plain-JS serverless functions. no build step, no framework
site/              marketing site, privacy notice, admin dashboard
scripts/           content and API smoke tests, build helpers
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

One versioned object in localStorage under `kolo.save.v1` — a key that **must never change**, for
the reason given at the top of this document.

**Revised: the save is keyed by learner.** It began as a single child at the top level. It is now
split into things that belong to the *device* and things that belong to a *child*, because those
have genuinely different owners:

```
learners[]   id, name, curriculum, year band, age, colour, created
activeLearnerId
data         per learner id:
  settings     speech, rate, session length, timed mode, seconds, difficulty, font
  progress     per curriculum: { skillId: { mastery, attempts, correct,
                                 lastSeen, reviewBox, reviewDue } }
  economy      xp, coins, owned characters/pets/cosmetics, equipped
  history      last 60 sessions: date, skills, accuracy, duration, missed items
  streak       current, longest, lastPlayed, freezes
  seenItems    question signatures, so the same question is not served twice
device       sound, reduced motion, parent code, locked + note, licence,
             sharing consent + install id
```

A `version` field plus a migration chain means the save survives schema changes — which matters once
it is on someone else's tablet and cannot be wiped. The single-child-to-multi-child change was made
as a real migration, not a version bump: **bumping the version without a `migrate` function silently
discards every existing save**, which would have wiped a child's whole history on upgrade.

**Moving between devices is a file, not a server.** `localStorage` is per-origin, so a child playing
on `localhost` and the same child on `brainy.fortbridge.app` are simply different stores and always
will be. Export writes a backup; restore merges it **by child id**, so restoring onto a tablet that
already has a sibling adds to it rather than replacing it. Three decisions inside that are worth
recording:

- **Restore is offered during setup**, not only from the parent zone. Requiring a throwaway child
  before you can restore is exactly backwards for the one person who already has a backup.
- **The parent code travels; the sharing consent does not.** Without the code, a restored tablet
  quietly falls back to the default `1234` — guessable by a child, and it would open the grown-up
  area. The install id is the opposite case: copying it would make two tablets report as one and
  would move a consent given on one device onto another, so it is stripped from the backup entirely
  and consent is asked for again.

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

**The line that has held throughout: no child data ever leaves the device.** No name, no age, no
answers, no progress, no free text. A child has no account, no credentials and no row in any table.
Everything the game does is computed locally from localStorage, and a whole session plays with the
network off. That is the promise the rest of this section protects.

**What does leave the device, and only because a grown-up chose it:**

| What | Whose | Consent |
|---|---|---|
| Usage counts and the weekly summary (§12 below) | The device, via a random install id | Off by default; an unticked box during setup, reversible any time, and switching it off deletes the id **and** asks the server to erase the rows |
| A parent's email address, and their name and phone if given | The parent's own | Only by claiming a free place, entering a code or paying — never for maths, which needs no sign-up |
| Payment amount, currency, reference | The parent's own | Only on a purchase. Card details go to Paystack and never to us |

This is a deliberate narrowing of the original "collect nothing at all" posture, and it is worth being
precise about what changed. **Nothing about a child** became collectable. What became collectable is
*an adult's contact detail, because they asked us for something that needs one* — restoring their
access on a new tablet, or honouring a free place to a person rather than to whoever holds a code.
Under the NDPA and UK GDPR that email address is personal data and is treated as such: named in the privacy
notice, never used for marketing, never passed on, and erasable on request.

**Still true:** no third-party scripts, no analytics SDK, no advertising, no tracking pixels, no
profiling, and no ability to join the two halves of the data — the usage tables know an install id and
nothing about people, the licence tables know people and nothing about children.

**When cloud sync of a child's progress arrives, this changes materially** and must be designed
properly rather than incrementally. A licence is *not* that step, and must not be mistaken for it:

- Parent-held accounts only; children never have credentials.
- Verifiable parental consent before any child data is stored (COPPA if there will be US users).
- Data minimisation: store skill ids and scores, never free text from a child.
- NDPA registration where the thresholds are met, and a published privacy notice before any paid launch in Nigeria.
- Explicit retention and deletion policy, with parent-initiated export and delete.

### 12.1 The compliance position, stated once

**Revised: the notice cited no law at all.** It was accurate and readable and named nothing it was
accountable under, which is the failure mode of a privacy policy written by engineers — honest about
practice, silent on obligation. Reviewing a competitor made the gap obvious: they cited the NDPA and
we did not, while our actual practices were the stronger of the two.

- **Controller:** Fortbridge Technologies Ltd, named in the notice, with a working address for
  requests. *(Outstanding: RC number and registered office, marked TODO in `site/privacy.html`.)*
- **Governing law:** the **Nigeria Data Protection Act 2023**. Not the NDPR 2019, which the earlier
  drafts of this document cited and which the Act has since overtaken.
- **Where UK GDPR or COPPA would give a family a stronger right than the NDPA, we apply the
  stronger one.** Three curricula means three jurisdictions, and holding one high standard is
  simpler to implement and to explain than tracking the minimum of each.
- **Lawful basis is stated per purpose**, in a table: consent for anything optional, contract for a
  licence, legal obligation for payment records, legitimate interest for the hashed IPs behind
  code-guess rate limiting.
- **Children (ages ~5–12, Basic 1–6) are handled by avoidance, not by consent.** Every one of them
  is a child under all three regimes. Rather than build verifiable parental consent, we do not
  process a child's personal data at all — no account, no name, no answer leaving the tablet. This
  is why the "nothing about the child leaves the device" rule is a compliance boundary and not
  merely a principle, and why it must survive any future feature.
- **Retention periods are enforced, not aspirational.** `server/routes/cron/retain.js` runs weekly and deletes
  to the published schedule; the numbers in the job and the numbers in the notice are the same
  numbers on purpose. Before this existed the notice promised deletion that nothing performed —
  which turns an honest policy into a false statement without anybody deciding to lie.
- **Breach:** reportable to the NDPC within 72 hours, stated in the notice, along with the blunt
  version of what a breach could expose — a list of parents' email addresses and their licences,
  and not one child's name, age, answer or score.
- **Complaint routes are published** (NDPC, and the ICO for UK families), because a rights section
  that only points back at us is not a rights section.
- **Free text is the one leak vector**, and it is guarded at the point of entry: the feedback box
  asks parents to leave names out, and now also checks the message against the names on that tablet
  and warns before sending. A warning rather than a block — it is the parent's message, and refusing
  to send over a false positive would cost us the bug report.

### 12.2 Registration is the parent's, and only the parent's

**Revised: setup now registers the grown-up.** The landing page used to lead with *no sign-up*, and
maths was playable indefinitely without one. Two things were wrong with that. A free-forever place
cannot be honoured to a person you never captured — only to whoever is holding a code. And a product
that intends to sell subscriptions cannot advertise that no account is needed.

Setup gained a fourth step, **Your account**, between the class and the grown-up code: email,
optionally a name, and a "Create my account" that calls `/api/signup`. It is worded explicitly as
*this is your account, not your child's*, because that distinction is the whole privacy position and
a parent reading "register" will reasonably assume the worst.

- **The child still registers for nothing.** No credentials, no row, no name leaving the tablet.
  Adding parent registration changed who has an account, not whether a child does — see §12.1, which
  this must never be allowed to erode.
- **Registration is the path, not a suggestion.** There is no skip on the screen. `Next` is disabled
  until an account exists.
- **Except when the network fails, and then it yields.** If the request cannot reach us, the parent
  is told, offered "carry on for now", and the grown-up area then shows a *Finish registering*
  prompt on every tab until it is done. Refusing to complete setup offline would break the promise
  the product is sold on and would lock out precisely the poor-coverage families it is for. The
  escape hatch appears only *after* a real failure — offering it up front would make registering
  look optional, which is the thing this change exists to fix.
- **Paying is still separate from registering.** Registering creates a `pending` subscription and
  grants nothing on its own; a coupon, a free place or a payment is what makes it `active`. Maths
  remains free for everybody and needs no card at any point. "Register, subscribe, pay when
  necessary" — in that order, and the third step often never happens.

**Content safety:** no chat, no user-generated content, no child-to-child contact, no external links in the child-facing UI, and no advertising in any tier. The parent zone is the only place that can navigate away.

---

## 13. Roadmap

Phases 1–3 are content work on an unchanged engine. That is the whole point of the architecture in §9 and §10.

| Phase | Deliverable | Status |
|---|---|---|
| **1** | Engine, game loop, parent zone, PWA. Nigerian Maths Basic 1–6. UK and US maths packs. Age-based placement. Parent-set difficulty and timer. | **Done** |
| **2** | Quantitative Reasoning, Verbal Reasoning and English Grammar packs, Basic 1–6 | Authored; being deepened for variety (§5.2) |
| **3** | Basic Science, Basic Technology and Social Studies packs (needs an SVG illustration library for science) | Planned |
| **4** | Full UK and US packs across all subjects and years | Planned |
| **5** | **Licensing and payments** — parent sign-ups, coupons, Paystack, and an admin dashboard. See §14 | **Done** |
| **6** | **Multi-child profiles** on one device, parent-led setup, backup/restore between devices, parent lock, characters and pets | **Done** |
| **7** | Optional cloud sync and cross-device. The point at which §12's second half becomes mandatory work. | Planned |
| **8** | Distribution: shareable link, then Play Store via TWA if the pull is there | Planned |
| **9** | School licences — the largest revenue opportunity, but a different product with teacher dashboards and class management | Someday |

---

## 14. Commercial model

**Built.** This section describes what exists rather than what is intended; §14.1 records where the
built thing departs from the original plan and why.

### 14.1 Licensing mechanism: parent-held codes, checked by a small backend

The original plan was offline signed keys — a licence blob verified against a public key bundled in
the app, so the product could stay a static site with no server at all. That was the right instinct
and the wrong mechanism, for three reasons that only became obvious once the free-family promise was
written down:

1. **A parent changing tablet has to be able to get their access back.** With offline keys, a lost key
   is a lost licence, and the only recovery is a human re-issuing one by hand — from a record we had
   deliberately not kept.
2. **Nothing could ever be corrected.** A key granted by mistake, a chargeback, a code forwarded to a
   class WhatsApp group: an offline key cannot be revoked, so every error is permanent.
3. **The database already existed.** Usage data (§12) had already put a Postgres behind the app, so
   "no server" was no longer the state being protected. What is actually worth protecting is *no child
   data leaving the device*, and that survives intact.

So instead:

- A parent gives an **email address** — theirs, never the child's — by claiming a free place, entering
  a code, or paying. That is the only personal data the system holds.
- They get a **family access code** (`BRN-XXXX-XXXX`). Typing it into the grown-up area activates the
  device; typing it into a second tablet activates that one too.
- The licence is **stored on the device**, so paid subjects work fully offline. It is re-checked about
  once a week, and **only a definite "this code does not exist" ever withdraws it** — a failed check,
  a flat signal or a dead server changes nothing. The cost of that rule is that a revoked licence can
  keep working offline for a while, which is the right way round: the alternative punishes the one
  family who did nothing wrong.
- Card payment goes through **Paystack**, who hold the card details and the receipt. The amount and the
  reference are minted server-side, and both the webhook and the app's return-from-checkout path
  re-verify the transaction against Paystack's own API before granting anything.
- **Bank transfer is a first-class way to pay, not a fallback.** Card penetration in Nigeria is not
  what a Lagos developer's own wallet suggests, and a product that only accepts cards is a product
  that quietly declines most of its market. So a parent can transfer to a named account and submit a
  claim — plan, sending name, date, and optionally a screenshot. The claim **grants nothing**: an
  operator confirms the money against their own statement, and approval is what creates the licence
  and emails the code. That keeps the trust model honest in both directions — nothing a parent types
  buys them anything, and nothing is taken on trust from us either, because every decision lands in
  the audit log with a name against it.
- Children are never rows. No name, no age, no answers, no progress — the link between a paying adult
  and a playing child is the code, and it stops at the device.

Stripe or Paddle covers international buyers later; Paddle acts as merchant of record and handles VAT
and sales tax, which is a real administrative saving for a one-person operation.

### 14.1.1 Administration

`/admin` is a real dashboard behind an email-and-password login (`api/admin/*`, session cookie,
scrypt-hashed passwords seeded from the environment). It shows sign-ups, licences, coupons, payments
and an audit log, alongside the anonymous usage numbers — and the two halves are deliberately
unjoinable, so the screen showing people cannot be crossed with the screen showing children's
activity. Every grant, extension and revocation records who made it: that log is the answer when a
parent says they paid and the app disagrees.

### 14.2 What is free

Gating by **content**, never by time. A countdown that locks a child out mid-thought is hostile, and any client-side time limit is trivially bypassed anyway.

- The child's own class in **Mathematics** is free, permanently, for everyone — **and every earlier
  class of it**, because bands are cumulative (§9.1) and charging for revision of material the child
  has already been given free would be a nasty little trap.
- Other subjects are part of the paid licence.
- **No paywall ever interrupts a session.** Gating happens where a level is *chosen*, never inside
  one. As implemented, that is enforced in three places at once: the subject grid, the subject screen,
  and the function that starts a session.
- **The daily quest never rotates into a locked subject.** It is the one thing a child taps without
  reading, so it must always land somewhere they can play.
- **Nothing already earned is ever taken away.** Stars, coins, characters, streaks and history survive
  a lapsed licence untouched — what closes is access to new content in the paid subjects.
- No advertising in any tier, ever.

### 14.3 Pricing

- **₦5,000 per year** in Nigeria, with a one-time lifetime option offered at launch as an early-adopter reward.
- Priced regionally elsewhere — roughly **$15–20 per year** — still well under Khan Academy Kids' peers and IXL.
- **The first 20 families to sign up get it free forever, for one child.** They are the people taking a risk on an unproven app, and their feedback is worth more than their subscription. Additional children on the same licence are paid, at a reduced per-child rate.
- One licence covers one child. Multi-child support **shipped in phase 6**: several children share one device, each with their own progress, character, pet and report, and the licence records how many children it covers.

### 14.4 The charity commitment

The intention is that **half the money funds development and hosting, and half goes to charity.** Two things must be settled before that is stated publicly, because a public charity claim is a regulated representation, not marketing copy:

1. **Define the base precisely.** "50% of revenue" and "50% of profit" differ substantially once payment processing (1.5–3%) and tax are accounted for. Nigerian tax relief on donations is capped and applies only to approved bodies under the 5th Schedule of CITA, so donating 50% of *revenue* can mean paying tax on money already given away. This needs an accountant's sign-off before publication.
2. **Name one registered charity, and publish what was actually donated,** with receipts, on a regular cycle. Vague "half goes to charity" claims are where well-intentioned projects get into difficulty.

### 14.5 Scale reality

₦5,000/year × 200 families is roughly ₦1m/year — about $650. Half to charity leaves around ₦500k for development and hosting. At that size this is a worthwhile gesture, not a business. It becomes materially significant at thousands of families, or through school licences (phase 9).

### 14.6 Sequencing

Ship free to roughly 20 families on an unlisted link **first**, and find out whether children keep playing. That single question determines whether anything else here is worth building. Payments come only once retention is real — and those first families keep it free permanently.

The machinery for all of it is now built, which does not change the sequencing — it removes the
excuse. Leaving `PAYSTACK_SECRET_KEY` unset switches checkout off entirely, and the app says so in
plain words rather than showing a broken button; coupons remain the only way in. `SIGNUP_COUPON`
points at a twenty-use code, so the promise in §14.3 is honoured by whoever gets there first and stops
being offered the moment the places run out — with no flag to remember to turn off.

---

## 15. Success metrics

**Learning:** mastery growth per strand over 4 weeks · review retention (accuracy on items re-seen after ≥7 days) · proportion of skills reaching Mastered.

**Engagement:** active days per week · median session length · sessions per active day · streak length · voluntary second sessions.

**Product:** parent-zone opens per week · time to first question on a cold start · offline sessions completed.

The primary metric for v1 is simply: **does he choose to play it without being asked?** Everything else is diagnostics.

---

## 16. Open questions

1. **Voice.** Web Speech API voices are typically a British or American default. A Nigerian-accented voice would land better but needs either a paid TTS service (breaks the no-network rule) or recorded audio (breaks generation, since generated questions can't be pre-recorded). Recommendation: ship with the system voice, revisit if it grates.
2. **Year-band handling mid-year.** He's between Basic 2 and Basic 3. v1 mixes both bands with B3 weighted higher; worth watching whether that pitches right in practice.
3. **Session length.** 10 questions is the default. Adjustable in the parent zone; the real answer comes from watching him play.
4. **How deep is deep enough?** Question variety is now measured rather than guessed — the smoke
   test reports distinct questions per skill and the distribution of question *shapes*. A handful of
   Quantitative Reasoning skills sit just under the threshold and are known work. The open question
   is what the threshold should actually be: the number that matters is how long before a child sees
   a repeat they recognise, and that is a question about him, not about the generator.
5. **Whether the first 20 stay 20.** The free-forever promise is deliberately hard to reverse
   (§14). If uptake is fast, the question is whether to honour more than twenty rather than close
   the door on a number chosen before anyone had used it.

**Settled since the first draft:** the name (*Brainy*), second-child support (shipped, phase 6),
how a child moves between devices (an export file, §10.4), and whether to collect usage data at all
(yes, opt-in and erasable — §12).

---

## 17. Decisions revised since the first draft

Everything here was a considered decision that later evidence overturned. Recorded so the reasoning
is not lost and the same ground is not re-argued.

| # | Originally | Now | What changed the decision |
|---|---|---|---|
| 1 | Named *Kolo* | Named **Brainy**, by Fortbridge Technologies Ltd | Fine for one family, needs explaining to everyone else. The storage key stays `kolo.save.v1` — renaming it would orphan every existing save |
| 2 | One owl mascot to dress up | A **character and a pet the child picks**, more buyable with coins | The pull was owning one, not decorating one. This is the change that visibly increased voluntary play |
| 3 | Child-led setup | **Parent-led setup** | A 7-year-old cannot choose a year band, and the adult should see what the app is before handing it over |
| 4 | Parent picks the class | Parent picks the **age**; class is derived | Parents know an age with certainty and a class only sometimes — and never for an unfamiliar curriculum |
| 5 | Subjects in a scrolling row | A **grid**, and a screen per subject | Three subjects fitted a row; eleven made it a carousel where most were invisible |
| 6 | Quantitative & Verbal Reasoning as one subject | **Two subjects** | Nigerian schools timetable and examine them separately, and a child is usually strong at one and weak at the other. A blended score hides the gap |
| 7 | Fixed 45-second timer | Parent-set timer, and difficulty per child | 45 seconds is a guess. The parent watching the child is better placed than the default |
| 8 | Nothing ever leaves the device | **Opt-in, erasable usage data** | With nothing at all, there is no way to learn that a question is wrong or badly pitched. The honest fix is consent, not collection — see 9 |
| 9 | "Anonymous" usage data | Described as **pseudonymous** | A stable install id is a persistent identifier. Calling it anonymous in a children's product would have been the comfortable word rather than the true one |
| 10 | Opting out just stops collection | Opting out **also erases what was sent** | Otherwise "delete my data" meant deleting the whole account. Erasure runs *before* the id is destroyed, because the id is the only handle on those rows |
| 11 | Offline signed licence keys | **Parent-held codes checked by a backend** | See §14.1. A tablet-only licence fails the first time a tablet is replaced |
| 12 | Static host, any provider | **Vercel**, app at `/play/` | One platform for the site and the functions. And `cleanUrls` must stay off, or the PWA silently stops being installable (§10.1) |
| 13 | Single child per device | **Multi-child**, with per-child everything | Siblings share tablets. Shipped in phase 6 rather than waiting for cloud sync |
| 14 | Cloud sync for a new device | **Export and restore a file** | Sync moves a child's data off their tablet, which is the one thing §12 protects. A file does the job now and defers that properly to phase 7 |
| 15 | Maths playable with no sign-up at all | **The parent registers at setup** — the child never does | "No registration required" contradicted a subscription business, and a free place cannot be held for a person you never captured. Registration is the parent's; the child still has no account and never will |
| 16 | No way out | **Remove a child; delete everything** | A product handed to other families needs a real exit, not a settings page that only adds |
