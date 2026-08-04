# Brainy on Android — a native app beside the web one

A plan for shipping a genuinely native Android app that shares the expensive
two-thirds of this codebase with the web app, rather than forking it.

**Decisions already taken** (see [Open questions](#12-open-questions) for what is not):

| Decision | Choice |
|---|---|
| Approach | **Expo / React Native**, monorepo, shared `packages/core` |
| Payment on Android | **Redeem-only** — codes bought on the website, no in-app purchase |
| Progress storage | **Cloud sync**, parent-held accounts, end-to-end encrypted |

Read [prd.md](prd.md) first for why the product is shaped the way it is. This
document only covers what changes to put it on a phone.

---

## 1. Why a port is cheap here, and what exactly is cheap

The one architectural rule in [README.md](README.md) — `engine/` never imports
from `content/` — had a second payoff that was never written down: **it also
kept the DOM out of both of them.**

| Layer | Lines | What happens to it |
|---|---|---|
| [src/content/](src/content/) | 15,555 | **Moves verbatim.** Pure TypeScript |
| [src/engine/](src/engine/) | 1,318 | **Moves verbatim.** Pure TypeScript |
| [src/state/](src/state/) | 1,546 | Moves, minus the `persist` storage adapter |
| [src/game/](src/game/) | 269 | Moves verbatim |
| [src/lib/](src/lib/) | 624 | Split: logic moves, platform calls go behind an interface |
| [src/screens/](src/screens/) | 4,001 | **Rewritten** for React Native |
| [src/components/](src/components/) | 2,107 | **Rewritten**, but the SVG renderer is mechanical |
| [api/](api/) | 2,581 | **Unchanged**, plus new sync routes (§8) |

**16,873 of ~25,400 lines (66%) move without edits** — and it is the two-thirds
that took the longest to write. The 180 authored skills, every generator, the
locale pools, the mastery model, the Leitner review boxes, the `avoid: seenItems`
freshness logic: none of it knows a browser exists.

Only **16 files in `src/` touch a web API at all**, and they cluster in
`lib/` plus a handful of screens. That is the whole surface to abstract.

**The rule this plan exists to enforce:** the content pack has exactly one copy.
A second copy of 15,555 lines of generators means every future skill is authored
twice and `npm run smoke` only ever guards one of them.

---

## 2. Target layout

```
brainy/
  package.json                pnpm workspaces
  packages/
    core/                     ← the shared 17k lines
      engine/                 verbatim from src/engine/
      content/                verbatim from src/content/
      game/                   verbatim from src/game/
      state/                  store, selectors, analytics, weekly
      lib/                    dates, report, usage, licence  (fetch is universal)
      platform.ts             the interface every host must satisfy  (§4)
      tokens.ts               design tokens: colours, radii, tap targets  (§6)
  apps/
    web/                      today's Vite app, unchanged in behaviour
      platform.web.ts         localStorage, Web Audio, Web Speech, Blob
      screens/ components/    today's TSX, untouched
    mobile/
      platform.native.ts      MMKV, expo-speech, expo-clipboard, expo-file-system
      screens/ components/    the new native UI
  api/                        stays at the repo root — one deployment
```

`api/` does not move. Both clients speak the same HTTP, and Vercel already
builds from the root.

---

## 3. Stage 0 — extract `packages/core` (2–3 days)

Do this **before writing any Android code**, and ship it to production with the
web app behaving identically. If the extraction is wrong, that must surface while
there is still only one consumer.

1. `pnpm-workspace.yaml`, move `apps/web` into place, keep `npm run dev` working
   from the root via a workspace script.
2. Move `engine/`, `content/`, `game/` into `packages/core` unchanged. Fix
   imports only.
3. Move `state/` and the portable half of `lib/`. The store's `persist` block
   gains an injected storage adapter instead of assuming `localStorage`.
4. Point `scripts/smoke.mjs` and `scripts/api-smoke.mjs` at the package. **The
   content smoke test must run against `packages/core`** — that is what stops the
   two apps drifting.
5. Keep the `@/` alias working in the web app so the diff stays import-only.

**Done when:** `npm run build`, `npm run smoke`, `npm run typecheck` and
`npm run smoke:api` all pass, and a deployed build is byte-for-byte equivalent in
behaviour. No feature work in this stage.

---

## 4. Stage 1 — the platform interface (3–4 days)

One interface in `packages/core/platform.ts`, satisfied twice. Everything
platform-specific goes through it; nothing in `core/` imports a host API.

```ts
export interface Platform {
  storage: { get(k: string): string | null; set(k: string, v: string): void; remove(k: string): void }
  sfx: Record<SfxName, () => void>
  speech: { speak(text: string, opts?: { force?: boolean }): void; cancel(): void; supported(): boolean
            setEnabled(on: boolean): void; setRate(rate: number): void }
  clipboard: { write(text: string): Promise<boolean> }
  files: { save(name: string, json: string): Promise<boolean>; pick(): Promise<string | null> }
  openUrl(url: string): Promise<void>
  online(): boolean
}
```

### The seams, with honest costs

| Seam | Web today | Native | Cost |
|---|---|---|---|
| Storage | `localStorage` | `react-native-mmkv` | **Trivial.** MMKV is *synchronous*, so zustand hydrates with no flash. Note it needs a dev build — no Expo Go |
| Read-aloud | Web Speech API | `expo-speech` | **Small.** Same shape; `getAvailableVoicesAsync` replaces the `onvoiceschanged` dance in [speech.ts](src/lib/speech.ts) |
| SVG visuals | inline SVG JSX | `react-native-svg` | **Small.** Same primitives, capitalised. `className` → props |
| Clipboard (9 uses) | `navigator.clipboard` | `expo-clipboard` | **Trivial** |
| Backup file | `Blob` + download | `expo-file-system` + `expo-sharing` + `expo-document-picker` | **Small.** `exportSave`/`importSave` logic is untouched |
| `fetch` | native | native | **None** |
| **Sound** | Web Audio oscillators | see below | **The one genuine unknown** |

### Sound is the only real research task

[sound.ts](src/lib/sound.ts) synthesises every effect from oscillators, on
purpose: *"No audio files means nothing to download, nothing to license, and no
silent-failure-on-slow-network."* React Native has no oscillator primitive.

- **Option A:** a Web Audio implementation for RN (Software Mansion publish one).
  Keeps `sound.ts` nearly as-is. **Verify it covers `exponentialRampToValueAtTime`
  and scheduled `start`/`stop` before committing** — the whole file depends on both.
- **Option B:** pre-render the ~8 effects to short `.m4a` files in a build script
  and play them with an Expo audio module. Boring, certain, costs you the
  no-assets property and a few hundred KB.

Timebox Option A to one day. Fall back to B without regret; it is not a
user-visible difference.

---

## 5. Stage 2 — shell and navigation (2 days)

[App.tsx](src/App.tsx) is a `useState` route union, which ports almost directly.
Three things must change:

1. **Hardware back button.** Today only Escape is handled. `BackHandler` must map
   to the same up-one-level rules — island → subject → home — and only exit the
   app from `home`. A back press that drops a child out of the app mid-quest is
   the single most likely bad review.
2. **The payment return path goes away.** The `?ref=` handling exists because
   Paystack redirects back to `/play/`. Redeem-only means the Android app never
   leaves for a checkout, so that effect and the `Unlocked` screen's
   just-paid variant do not port. Code redemption stays.
3. **Locked / picker precedence is load-bearing.** `locked` above the child
   picker above everything, and the comments in `App.tsx` explain why. Preserve
   the order exactly, including on cold start from a notification.

Also in this stage: EAS build set up and an internal-track install on a real
device. Get a `.aab` onto a phone in week one, not week six.

---

## 6. Stage 3 — the UI port (2–3 weeks)

### Styling: share tokens, not a framework

The web app is on **Tailwind v4** (`@tailwindcss/vite` ^4). NativeWind targets
Tailwind v3. Rather than betting the port on that gap closing, extract
`packages/core/tokens.ts`:

```ts
export const tone = { brand600: '#7c3aed', /* … */ }
export const tap  = { sm: 44, md: 56, lg: 64 }   // from ui.tsx SIZES
export const radius = { xl: 12, '2xl': 16 }
```

Web keeps Tailwind and feeds the tokens into its config. Mobile uses NativeWind
**if** it is viable on v4, and plain `StyleSheet` if not — with either choice the
tokens are identical, so the decision stops being load-bearing.

### What the 732 `className=` usages cost

Genuinely mechanical: colours, padding, radii, font weight, flex rows/columns.

Needs real thought: CSS **grid** (`grid place-items-center`, the shop and island
layouts) has no RN equivalent and becomes flex. `hover:` states are meaningless
on touch and simply drop. The chunky `border-b-4` / `active:translate-y-[2px]`
press effect in [ui.tsx](src/components/ui.tsx) — which is most of the app's
personality — needs rebuilding with `Pressable` and a transform.

### Port order, easiest first, so the pipeline is proven before the hard screens

| # | File | Lines | Notes |
|---|---|---|---|
| 1 | [ui.tsx](src/components/ui.tsx) | 231 | Do first. Everything depends on `Btn`/`IconBtn` |
| 2 | [VisualView.tsx](src/components/VisualView.tsx) | 632 | 65 SVG elements → `react-native-svg`. Mechanical, and it unblocks every question type |
| 3 | [QuestionView.tsx](src/components/QuestionView.tsx) | 448 | 8 question types. `order`/`match` need gesture work |
| 4 | [NumberPad.tsx](src/components/NumberPad.tsx) | — | Tap targets already sized for 7-year-olds |
| 5 | [Session.tsx](src/screens/Session.tsx) | 418 | Timer, read-aloud, adaptive drop. The core loop |
| 6 | Mascot / Character / Pet | 628 | SVG + animation. `reduceMotion` must keep working |
| 7 | Home / Subject / Island / Results | 762 | Island map layout is the fiddly one |
| 8 | Shop / Room | 310 | Grid → flex |
| 9 | [Onboarding.tsx](src/screens/Onboarding.tsx) | 427 | Includes the **unticked** usage-consent box — do not let a port quietly re-tick it |
| 10 | WhoIsPlaying / Locked / PinGate / Unlocked / Feedback | 522 | |
| 11 | [Parent.tsx](src/screens/Parent.tsx) | **1,640** | **The single biggest item in the whole plan.** Budget a week. Consider splitting it into tabs as separate files while porting |

Verify against the design decisions in README.md as you go. The ones most likely
to be lost in a rewrite: no fail state, finishing always pays, timers off by
default, difficulty adapts silently, long questions read aloud automatically.

---

## 7. Stage 4 — parent accounts and cloud sync (1.5–2 weeks)

### The problem to design around

[api/_db.js](api/_db.js) states the current principle plainly:

> *A parent is the only person with an identity here. Children are never rows: no
> name, no age, no answers. The link between a paying adult and a playing child is
> the access code, and it stops at the device.*

Naive sync destroys that — it puts every child's name, age and answer history in
Postgres, and turns the strongest available position under NDPR, GDPR-K and COPPA
into an ordinary one requiring verifiable parental consent, a retention schedule
and a breach plan.

### The design: end-to-end encrypted blob sync

The server stores ciphertext it cannot read. Children still are not rows.

1. **Account.** Parent email + password. Reuse the machinery already in
   [api/_auth.js](api/_auth.js): `scrypt` hashing, signed short-lived cookies,
   and the `code_attempts` rate limiter. A `parents` row already exists.
2. **Payload.** Exactly what `exportSave()` already produces — which deliberately
   strips `installId` and the consent flags.
3. **Key.** Derived client-side from the password via `scrypt`/PBKDF2, plus a
   printable **recovery code** shown once at sign-up. The key never goes to the
   server.
4. **Server sees:** `parent_id`, `blob` (ciphertext), `save_version`, `updated_at`,
   `device_label`. Nothing else.
5. **Conflict resolution:** reuse the rule `importSave` and the `merge` hook
   already establish — *match children by id, incoming copy wins, never wipe a
   sibling*. Last-writer-wins **per child**, not per field. One rule, two
   entry points, no third behaviour to reason about.
6. **The device stays the source of truth.** Sync is a convenience over the
   existing export/restore, not a dependency. Airplane mode must change nothing,
   exactly as the licence design in [licence.ts](src/lib/licence.ts) already
   insists: *the network is never allowed to take access away from a child in
   the moment.*

New routes: `api/sync/push.js`, `api/sync/pull.js`, `api/account/*`. Extend
[api/forget.js](api/forget.js) to erase an account's blobs.

**State the cost honestly in the UI:** a forgotten password with a lost recovery
code means the cloud copy is unreadable. That is the price of the server not
being able to read it, and it is the right trade — but a parent must be told
once, in plain words, at sign-up.

### Non-code work this stage owns

These are deliverables, not paperwork to do later:

- [ ] Verifiable parental consent flow for account creation
- [ ] Retention and deletion policy, published
- [ ] [site/privacy.html](site/privacy.html) rewritten — it currently says *"no
      network calls after load"*, which sync makes untrue
- [ ] Play Data Safety form updated to declare account data and the encrypted blob
- [ ] prd.md §12 updated: it currently describes cloud sync as hypothetical

### Licence and sync compose well

Because access hangs off a `parents` row and the licence already travels in a
backup, a signed-in parent gets their entitlement on every device from one
redemption. Redeem-only stops being a downgrade and starts being coherent.

---

## 8. Stage 5 — Play Store (3–5 days, plus review latency)

### Redeem-only, done compliantly

The app accepts codes and grants via the existing
[api/activate.js](api/activate.js). What it must **not** do is link to, or steer
a parent toward, the website's checkout — that is what Play policy restricts.
Practically: the paywall copy says *"Ask a grown-up to enter your access code"*
and stops there. The website and email carry the purchase journey.

Google's position here has been shifting under regulatory pressure. **Re-check
the current policy text before submission** rather than trusting this paragraph.

### Designed for Families

The existing privacy posture is close to ideal for this, which makes the
questionnaire easy to answer honestly:

- [ ] Target age group declared; app in the Families programme
- [ ] **No ads.** If that ever changes, only Families-certified networks
- [ ] Data Safety form: the opt-in pseudonymous `installId`, plus §8's account data
- [ ] IARC content rating questionnaire
- [ ] Privacy policy URL — already live
- [ ] Current target API level, AAB, signing via EAS
- [ ] Internal → closed → production tracks

The unticked consent box and the mint-on-consent / destroy-on-withdrawal
`installId` lifecycle are exactly what this programme wants to see. Say so in
the submission notes.

---

## 9. What must not regress

A rewrite is where quiet behaviour changes hide. Guard these explicitly:

- The usage-consent box ships **unticked**. A pre-ticked box is not consent.
- `installId` is minted only at consent and destroyed on withdrawal.
- A failed licence check never removes access. Only a positive "no such code" does.
- `exportSave` never includes `installId` or consent flags.
- Restore merges by child id and never wipes a sibling.
- `seenItems` keeps 24 signatures per skill — it is why practice feels fresh.
- Sessions have no fail state and always finish.

---

## 10. Effort

| Stage | Work | Estimate |
|---|---|---|
| 0 | Monorepo extraction, web unchanged | 2–3 days |
| 1 | Platform interface + both adapters | 3–4 days |
| 2 | Shell, navigation, back button, EAS on a device | 2 days |
| 3 | UI port (Parent.tsx is a week of it) | 2–3 weeks |
| 4 | Accounts, E2E sync, consent, policy | 1.5–2 weeks |
| 5 | Store compliance and release | 3–5 days |
| | **Total focused work** | **7–9 weeks** |

Stages 0–3 produce a shippable free-tier Android app. Stage 4 is separable and
could follow the first release.

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| NativeWind vs Tailwind v4 | Share tokens, not the framework (§6). Makes the choice reversible |
| Web Audio has no RN equivalent | Timebox the library, fall back to pre-rendered files |
| `Parent.tsx` is 1,640 lines | Split into tab files while porting; budget a full week |
| Cloud sync widens the legal surface | E2E encryption keeps children out of the database; §8 lists the non-code deliverables as blocking |
| Content forks between apps | `packages/core` is the only copy, and `npm run smoke` runs against it |
| Play review rejects redeem-only framing | No external purchase links in-app; re-read current policy before submitting |
| `order` / `match` gestures on touch | Prototype in Stage 3 item 3, before the screens depend on them |

---

## 12. Open questions

- iOS. Expo makes it mostly free later, but App Store rules on redeem-only are
  stricter than Play's. Out of scope here; do not architect against it.
- Tablet layouts. The web app uses `sm:` breakpoints throughout; Android tablets
  are a real share of the target market and deserve their own pass.
- Whether the daily-quest rotation should drive a local notification. Powerful
  for streaks, and squarely in Families-policy territory.
