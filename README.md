# Kolo

A gamified curriculum-practice app for lower-primary children. Short daily sessions, coins and streaks, a mascot to dress up, and a parent report that says what to help with.

**What is built:** the full structure for **Basic 1–6 × 7 subjects × 3 curricula** (Nigerian UBE, British National Curriculum, US Common Core), with the class derived from the child's age.

**What is authored:** Nigerian Mathematics across Basic 1–6 (76 skills), plus compact British and American maths packs. The other six subjects — Quantitative Reasoning, Verbal Reasoning, English Grammar, Science, Basic Technology and Social Studies — are declared with their topic lists visible in the app, but the questions are not written yet. Adding them is content work against an unchanged engine.

Full product spec and architecture: [prd.md](prd.md).

---

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and produce `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Types only |
| `npm run smoke` | **Exercise every question generator** — see below |
| `npm run icons` | Regenerate the PWA icons |

### Deploying

It is a static site with no backend. `npm run build` then upload `dist/` to Netlify, Vercel, Cloudflare Pages or any static host. The free tier of any of them is more than enough.

On a phone or tablet, open the site and use "Add to home screen" — it installs as a PWA and works fully offline after the first load.

---

## The content smoke test

`npm run smoke` generates ~10,000 questions across every skill at every difficulty and checks each one is well-formed: the correct answer passes the answer checker, multiple choice has no duplicate or impossible options, tap-many always has at least one right and one wrong option, fractions never shade more parts than exist, and prerequisites point at skills that exist.

It also warns about skills whose question space is small enough that a child would start memorising rather than learning.

Run it after touching anything in `src/content/`. It catches in two seconds the kind of bug that otherwise surfaces as a child stuck on an unanswerable question.

---

## How it fits together

```
src/
  engine/     curriculum-agnostic core — types, seeded RNG, registry,
              session builder, mastery model, scoring, answer checking
  content/
    ng-ube/   Nigerian pack: locale + 42 maths skills across 7 strands
    uk-nc/    British pack (small, proves the switch)
    shared/   authoring helpers used by packs, never by the engine
  state/      zustand store persisted to localStorage, selectors, and the
              parent-report analytics
  screens/    onboarding, home, subject, island, session, results, shop, room, parent
  components/ question renderers, SVG visual renderer, mascot, UI primitives
  lib/        speech, synthesised sound, date helpers
  game/       cosmetics, badges, island theming
```

**The one architectural rule:** `engine/` never imports from `content/`. Packs register themselves through `engine/registry`. That is what makes a second curriculum cheap.

### Keeping questions fresh

Three mechanisms, in order of leverage:

1. **Generation, not a bank** (below). The question space is a product of the generator's parameters, not a list someone typed.
2. **Locale pools.** Every word problem draws a name, an object and often a place from `src/content/<pack>/locale.ts`. The Nigerian pack has 48 names × 34 objects × 14 shops, so the *same* sum arrives in over 22,000 different dressings. **Adding a name to that list is worth more than adding a generator** — it multiplies across every skill at once.
3. **Per-skill recent-question memory.** Random draws collide long before a pool is exhausted (the birthday problem). The save remembers the last 24 question signatures per skill and the builder refuses to regenerate them, so "fresh" means fresh across days rather than only within one session.

`npm run smoke` prints a **content depth** report — how many skills never repeated in 200 draws, and the thinnest skills with a rough runway in sessions. Use it to decide where more variety is actually needed rather than guessing.

### Questions are generated, not stored

There is no question bank. Each skill owns a `generate(ctx)` function that builds a fresh question from a seeded RNG at a requested difficulty (1–5). `add-3digit` alone can produce hundreds of thousands of valid, correctly-levelled questions, and word problems draw names and objects from locale pools so the same arithmetic arrives dressed differently each time.

Seeding means a session is reproducible, which is how the parent zone can show the actual questions that were missed.

### Adding a skill

```ts
const mySkill: SkillDef = {
  id: 'ng.maths.number.my-skill',   // namespaced by curriculum
  title: 'Child-facing title',
  yearBand: 'b3',
  prerequisites: ['ng.maths.number.place-value'],
  hint: 'One short nudge.',
  helpAtHome: 'One line for the parent zone.',
  generate: ({ rng, difficulty, locale }) =>
    entry(`${a} + ${b} = ?`, a + b, { explanation: `${a} + ${b} = ${a + b}` }),
}
```

Add it to a strand's `skills` array and run `npm run smoke`. Helpers (`mc`, `entry`, `tf`, `order`, `tapMany`, `money`, …) live in `src/content/shared/authoring.ts`.

### Adding a curriculum

1. Create `src/content/<id>/` exporting a `Curriculum` — id, locale, year bands, subjects → strands → skills.
2. Register it in `src/content/index.ts`.

No engine change, no UI change, no data migration. Progress is stored per curriculum, so switching in the parent zone never loses anything on either side.

---

## Design decisions worth knowing

These are the ones most likely to look like bugs if you don't know they were deliberate. Reasoning is in [prd.md](prd.md).

- **No lives, no fail state.** A wrong answer shows the right one with a one-line explanation, then re-queues an easier question on the same skill. Sessions always finish.
- **Finishing always pays.** Coins and XP land regardless of score; only stars reflect accuracy.
- **Timers are off by default.** Timing a child still building fluency mostly measures anxiety. "Beat the Clock" is opt-in in the parent zone, and the countdown length (15–120s) is a parent setting — one number can't suit both a times-table drill and a word problem.
- **Difficulty is adaptive by default, overridable by a parent.** Auto targets ~80% success. A parent can pin levels 1–5 instead, which also suspends the automatic drop after three wrong answers — a pinned level stays pinned. Mastery keeps tracking underneath either way.
- **Parents pick an age, not a class.** Age 7 resolves to Basic 3 / Year 3 / Grade 2 automatically, and switching curriculum re-derives the class rather than carrying an id that means a different level abroad. The class can still be set directly.
- **Earlier classes are revision, not a gate.** A Basic 6 child starts on Basic 6 work: untouched prerequisites from earlier classes are assumed met, and earlier levels are unlocked from the start and labelled *Revision*. Without this, every older child would begin at "Counting to 20".
- **Long questions are read aloud automatically.** Reading is the bottleneck at this age, not the maths — a child who can't read "altogether" would otherwise be recorded as having a maths gap.
- **Difficulty adapts silently.** Three wrong in a row quietly drops the level. The child is never told.
- **Earlier year bands stay in the mix.** Choosing Basic 3 includes Basic 2 content as revision.
- **No leaderboards or comparison with other children.** He competes with himself.

## Privacy

No accounts, no analytics, no third-party scripts, no network calls after load. Everything — including the child's first name — stays in `localStorage` on the device. This is deliberate: it is the strongest position under NDPR, GDPR-K and COPPA at once, and the right default for a children's app.

If cloud sync is ever added, that changes materially and needs designing properly — parent-held accounts, verifiable parental consent, data minimisation, a published policy. See prd.md §12.

## Licence

Private project. Not licensed for redistribution yet.
