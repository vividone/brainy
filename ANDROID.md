# Brainy on Android — a native app beside the web one

A plan for shipping a genuinely native Android app that shares the expensive
two-thirds of this codebase with the web app, rather than forking it.

**Decisions already taken** (see [Open questions](#12-open-questions) for what is not):

| Decision | Choice |
|---|---|
| Approach | **Expo / React Native**, monorepo, shared `packages/core` |
| Payment on Android | **Redeem-only** — codes bought on the website, no in-app purchase |
| Progress storage | **Cloud sync** — already built and shipped (§7) |

Read [prd.md](prd.md) first for why the product is shaped the way it is. This
document only covers what changes to put it on a phone.

> **Revised after the accounts and sync work landed.** Parent accounts, consented
> progress sync and the split-out API server all shipped since the first draft.
> That deleted most of a stage and changed the shape of two others — see §7.

---

## 1. Why a port is cheap here, and what exactly is cheap

The one architectural rule in [README.md](README.md) — `engine/` never imports
from `content/` — had a second payoff that was never written down: **it also
kept the DOM out of both of them.**

| Layer | Lines | What happens to it |
|---|---|---|
| [src/content/](src/content/) | 15,555 | **Moves verbatim.** Pure TypeScript |
| [src/engine/](src/engine/) | 1,318 | **Moves verbatim.** Pure TypeScript |
| [src/state/](src/state/) | 2,045 | Moves, minus the storage adapter and the sync runner's timers |
| [src/game/](src/game/) | 269 | Moves verbatim |
| [src/lib/](src/lib/) | 1,114 | Split: logic moves, platform calls go behind an interface. `install.ts` is discarded |
| [src/screens/](src/screens/) | 5,101 | **Rewritten** for React Native |
| [src/components/](src/components/) | 2,186 | **Rewritten**, but the SVG renderer is mechanical |

**17,142 of ~27,600 lines (62%) move without edits** — and it is the two-thirds
that took the longest to write. The 180 authored skills, every generator, the
locale pools, the mastery model, the Leitner review boxes, the `avoid: seenItems`
freshness logic: none of it knows a browser exists.

The web-API surface is still small and still clustered in `lib/` plus a handful
of screens. That is the whole thing to abstract.

**The rule this plan exists to enforce:** the content pack has exactly one copy.
A second copy of 15,555 lines of generators means every future skill is authored
twice and `npm run smoke` only ever guards one of them.

---

## 2. Target layout

The API is **no longer in this repository**. [vercel.json](vercel.json) rewrites
`/api/:path*` to `https://api-brainy.fortbridge.app`, and the server lives in its
own project under `server/lib/` and `server/routes/`. That is good news for this
plan: the contract between client and server is already an HTTP boundary that
something other than a Vite build has to satisfy.

```
brainy/
  package.json                pnpm workspaces
  packages/
    core/                     ← the shared 17k lines
      engine/                 verbatim from src/engine/
      content/                verbatim from src/content/
      game/                   verbatim from src/game/
      state/                  store, selectors, analytics, weekly, sync, syncRunner
      lib/                    dates, report, usage, licence, account
      platform.ts             the interface every host must satisfy  (§4)
      tokens.ts               design tokens: colours, radii, tap targets  (§6)
  apps/
    web/                      today's Vite app, unchanged in behaviour
      platform.web.ts         localStorage, Web Audio, Web Speech, Blob, install prompt
      screens/ components/    today's TSX, untouched
    mobile/
      platform.native.ts      MMKV, expo-speech, expo-clipboard, expo-file-system
      screens/ components/    the new native UI
```

### The relative-URL problem, which is not optional

Every server call in the app is a **relative path** — `/api/auth/verify`,
`/api/sync`, `/api/activate`, `/api/report`, `/api/event`, `/api/forget`,
`/api/pay/*`. That works on the web because Vercel rewrites them. **In React
Native a relative `fetch` has no origin and simply fails.**

So `platform.apiBase` is a required part of the interface, not a nicety, and
every call site in [account.ts](src/lib/account.ts), [licence.ts](src/lib/licence.ts),
[report.ts](src/lib/report.ts) and [usage.ts](src/lib/usage.ts) has to route
through it. Do this during Stage 0 while there is still one consumer: it is a
find-and-replace then, and a scavenger hunt later.

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
4. **Introduce `platform.apiBase`** and route every `/api/…` call through it
   (§2). Web sets it to `''` and nothing changes.
5. Point the test scripts at the package. `smoke.mjs`, `api-smoke.mjs`,
   `server-smoke.mjs`, `preflight.mjs` and `coverage-entry.ts` all need to
   resolve `packages/core`. **The content smoke test must run against the
   package** — that is what stops the two apps drifting.
6. Keep the `@/` alias working in the web app so the diff stays import-only.

**Done when:** `npm run build`, `npm run smoke`, `npm run typecheck` and
`npm run smoke:api` all pass, and a deployed build is byte-for-byte equivalent in
behaviour. No feature work in this stage.

---

## 4. Stage 1 — the platform interface (3–4 days)

One interface in `packages/core/platform.ts`, satisfied twice. Everything
platform-specific goes through it; nothing in `core/` imports a host API.

```ts
export interface Platform {
  apiBase: string                                    // '' on web, absolute on native
  storage: { get(k: string): string | null; set(k: string, v: string): void; remove(k: string): void }
  sfx: Record<SfxName, () => void>
  speech: { speak(text: string, opts?: { force?: boolean }): void; cancel(): void; supported(): boolean
            setEnabled(on: boolean): void; setRate(rate: number): void }
  clipboard: { write(text: string): Promise<boolean> }
  files: { save(name: string, json: string): Promise<boolean>; pick(): Promise<string | null> }
  deviceLabel(): string                              // shown in the parent's device list
  online(): boolean
  onResume(fn: () => void): () => void               // drives sync; see §7
  openUrl(url: string): Promise<void>
  timers: { set(fn: () => void, ms: number): number; clear(id: number): void }
}
```

`timers` is there because [syncRunner.ts](src/state/syncRunner.ts) and
[App.tsx](src/App.tsx) both call `window.setTimeout` directly. React Native has
a global `setTimeout`, so this could be skipped — but routing it through the
interface keeps `core/` free of any global-shape assumption, which is the rule
that makes the package testable in Node.

### The seams, with honest costs

| Seam | Web today | Native | Cost |
|---|---|---|---|
| API base | relative, Vercel rewrite | absolute URL | **Small, but load-bearing.** See §2 |
| Storage | `localStorage` | `react-native-mmkv` | **Trivial.** MMKV is *synchronous*, so zustand hydrates with no flash. Needs a dev build — no Expo Go |
| Read-aloud | Web Speech API | `expo-speech` | **Small.** Same shape; `getAvailableVoicesAsync` replaces the `onvoiceschanged` dance in [speech.ts](src/lib/speech.ts) |
| SVG visuals | inline SVG JSX | `react-native-svg` | **Small.** Same primitives, capitalised. `className` → props |
| Clipboard | `navigator.clipboard` | `expo-clipboard` | **Trivial** |
| Backup file | `Blob` + download | `expo-file-system` + `expo-sharing` + `expo-document-picker` | **Small.** `exportSave`/`importSave` logic untouched |
| Device label | `navigator.userAgent` parsing | `expo-device` | **Trivial, and an upgrade.** See below |
| Install prompt | `beforeinstallprompt` | — | **Deleted.** See below |
| `fetch` | native | native | **None** |
| **Sound** | Web Audio oscillators | see below | **The one genuine unknown** |

### `deviceLabel()` gets better, not worse

[account.ts](src/lib/account.ts) parses the user agent to produce *"Chrome on
Android"* so a parent can tell which tablet to sign out. On native,
`expo-device` gives the actual model — *"Galaxy Tab A9"*. That is strictly more
useful for the one job the label has, and it stays coarse enough to honour the
comment's intent: *"Coarse on purpose — not a fingerprint."*

### `install.ts` and `InstallCard.tsx` do not port

[install.ts](src/lib/install.ts) (110 lines) and
[InstallCard.tsx](src/components/InstallCard.tsx) exist entirely to solve
*"getting a web app onto a home screen"* — `beforeinstallprompt`, the iOS Share
instructions, the standalone-mode check. On Android the app **is** installed.
All of it is deleted from the mobile build, and the Onboarding slot at
[Onboarding.tsx:275](src/screens/Onboarding.tsx#L275) simply has one fewer card.

Worth noting what that removes: `install.ts`'s doc comment explains the iOS
storage-container trap — *"a parent who sets Brainy up in the browser and
installs afterwards finds an empty app."* Sync already fixed that properly, and
native never had the problem.

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
   leaves for a checkout, so that effect and the `Unlocked` screen's just-paid
   variant do not port. Code redemption stays. See §8 for what else comes out.
3. **Locked / picker precedence is load-bearing.** `locked` above the child
   picker above everything, and the comments in `App.tsx` explain why. Preserve
   the order exactly, including on cold start from a notification.

Also in this stage: EAS build set up and an internal-track install on a real
device. Get a `.aab` onto a phone in week one, not week six.

---

## 6. Stage 3 — the UI port (3–4 weeks)

This is now the bulk of the work — 7,287 lines of screens and components, up from
6,108 when this plan was first drafted, because the accounts and sync UI landed
inside `Parent.tsx` and `Onboarding.tsx`.

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

### What the `className=` usages cost

Genuinely mechanical: colours, padding, radii, font weight, flex rows/columns.

Needs real thought: CSS **grid** has no RN equivalent and becomes flex — and note
that two recent commits (`c410752`, `7e8b9e0`) were specifically about *"grids
that fill their rows"* and *"grids that do not strand a card"*. Whatever those
fixed, a flex reimplementation will have to solve again from scratch; read those
diffs before porting the shop and island layouts.

`hover:` states are meaningless on touch and simply drop. The chunky
`border-b-4` / `active:translate-y-[2px]` press effect in
[ui.tsx](src/components/ui.tsx) — which is most of the app's personality —
needs rebuilding with `Pressable` and a transform.

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
| 9 | [Onboarding.tsx](src/screens/Onboarding.tsx) | **888** | Doubled since the first draft — now carries sign-in and the sync consent. The usage-consent box ships **unticked**; do not let a port quietly re-tick it. Drop the `InstallCard` |
| 10 | WhoIsPlaying / Locked / PinGate / Unlocked / Feedback | 762 | |
| 11 | [Parent.tsx](src/screens/Parent.tsx) | **2,246** | **The single biggest item in the whole plan.** Grew 37% with the account, device-list and keep-progress UI. Budget 1.5 weeks. Split it into per-tab files as you port — it is past the size where one file is defensible |

Verify against the design decisions in README.md as you go. The ones most likely
to be lost in a rewrite: no fail state, finishing always pays, timers off by
default, difficulty adapts silently, long questions read aloud automatically.

---

## 7. Stage 4 — sync (2–3 days, not two weeks)

**This stage is mostly already done.** Parent accounts and consented progress
sync shipped in `39455e6` and `1803c19`. The first draft of this plan plotted a
1.5–2 week build with an end-to-end encrypted blob and a password-derived key.
That is moot: what shipped is a different and, for this port, better answer.

### What exists, and why it ports easily

| Piece | File | Native cost |
|---|---|---|
| Passwordless email-code sign-in | [account.ts](src/lib/account.ts) | Base URL only |
| Field whitelist for uploads | [sync.ts](src/state/sync.ts) | **None** — pure functions |
| Revision-based conflict resolution | [store.ts](src/state/store.ts) `adoptRemote` | **None** |
| Scheduling, dedupe, rate limiting | [syncRunner.ts](src/state/syncRunner.ts) | Timers + `onResume` |
| Consent flag, server-authoritative | `keepProgress` | **None** |
| Privacy notice covering all of it | [site/privacy.html](site/privacy.html) §Keeping their progress | Already written |

The privacy problem I flagged in the first draft got solved without encryption.
Instead of *"the server cannot read it"*, [sync.ts](src/state/sync.ts) makes it
*"the server never receives it"* — `history`, `byDay` and `seenItems` are
excluded by a whitelist that the server independently rejects violations of:

> *Together those are the difference between "how far have they got" and "a log
> of what this child has been doing". The first is what a parent wants back on a
> new tablet; the second is surveillance of a seven-year-old.*

For the Android port that is strictly easier than what I proposed. There is no
key derivation to reimplement natively, no recovery-code UX, and no
forgotten-password failure mode to design around — because there is no password.

### The three real jobs

1. **Base URL.** Covered by §2.
2. **`onResume` instead of tab focus.** [syncRunner.ts](src/state/syncRunner.ts)
   syncs after a session and rate-limits to one pass per 20s. On Android, resuming
   from background is the moment that matters — a parent who signs in on a new
   tablet expects their children there when they open it, not after the first
   quest. Wire `AppState` `active` to `syncNow()`; the existing dedupe and
   `MIN_GAP_MS` guard already make that safe to call freely.
3. **`navigator.onLine` → `NetInfo`.** `syncNow` and the licence recheck in
   `App.tsx` both gate on it. Behind `platform.online()`, both work unchanged.

### One thing to preserve exactly

`signedOut()` fires only on a definite 401 — never on a timeout, a flat signal,
or a tablet in a car. Both [account.ts](src/lib/account.ts) and
[licence.ts](src/lib/licence.ts) are built on that rule, and mobile networks are
where it will actually be tested. A port that treats "request failed" as
"signed out" would sign families out on the school run.

---

## 8. Stage 5 — Play Store (3–5 days, plus review latency)

### Redeem-only means removing code, not just adding a policy note

This is sharper than the first draft implied. [site/index.html](site/index.html)
currently promises:

> *Once the free places are gone: card or **bank transfer**, both from the
> grown-up area inside the app.*

Both of those are live in [Parent.tsx](src/screens/Parent.tsx), which imports
`checkout` and `submitTransfer` from [licence.ts](src/lib/licence.ts) and calls
`/api/pay/initialise` and `/api/pay/request`. **On Android, both flows come out.**
That is a concrete deletion in the parent area, not an abstract compliance item.

What the Android build keeps: code redemption via `/api/activate`, and the
account sign-in that carries a licence across devices.

What it must not do: link to, or steer a parent toward, the website's checkout.
Practically, the paywall copy stops at *"Enter your access code"*, and the
Android app never mentions where to get one.

Google's position here has been shifting under regulatory pressure. **Re-check
the current policy text before submission** rather than trusting this paragraph.

### A marketing claim the app build has to keep true

[site/index.html](site/index.html) says, in the privacy section:

> *No third-party code in the app at all. […] the app itself has no analytics, no
> Google script and nothing embedded, and the build refuses to publish if that
> ever changes.*

[scripts/build-site.mjs](scripts/build-site.mjs) enforces that for the web build.
**Nothing enforces it for an Android build**, and the default instinct on a new
Expo app is to add Firebase Analytics or Crashlytics. Doing so would make a
published claim on the marketing site false, and would complicate the Families
questionnaire for no benefit. Add the equivalent check to the mobile build and
treat it as a release gate.

### Designed for Families

The existing privacy posture is close to ideal, which makes the questionnaire
easy to answer honestly:

- [ ] Target age group declared; app in the Families programme
- [ ] **No ads**, and no analytics SDK (above)
- [ ] Data Safety form: the opt-in `installId`, the account email, and the
      `keepProgress` sync payload — all three, all declared as optional
- [ ] IARC content rating questionnaire
- [ ] Privacy policy URL — already live and already covers sync
- [ ] Account deletion route reachable from inside the app (Play requires it, and
      `/api/forget` plus sign-out already do the work)
- [ ] Current target API level, AAB, signing via EAS
- [ ] Internal → closed → production tracks

The unticked consent box, the mint-on-consent / destroy-on-withdrawal `installId`
lifecycle, and the upload whitelist are exactly what this programme wants to see.
Say so in the submission notes.

---

## 9. What must not regress

A rewrite is where quiet behaviour changes hide. Guard these explicitly:

- The usage-consent box ships **unticked**, and `keepProgress` starts **off** for
  every new account. A pre-ticked box is not consent.
- `buildSyncPayload` is a whitelist. Copy it field by field; never refactor it
  into a spread-with-deletions, which fails in the dangerous direction.
- `history`, `byDay` and `seenItems` never leave the device, and
  `mergeRemoteState` never blanks them from a download.
- A dead token is the only thing that clears an account. Timeouts change nothing.
- A failed licence check never removes access. Only a positive "no such code" does.
- `revision` only ever counts up, and is compared only against the same child.
- `exportSave` never includes `installId`, the consent flags, or the auth token.
- Restore merges by child id and never wipes a sibling.
- `seenItems` keeps 24 signatures per skill — it is why practice feels fresh.
- Sessions have no fail state and always finish.

---

## 10. Effort

| Stage | Work | Estimate |
|---|---|---|
| 0 | Monorepo extraction, API base URL, web unchanged | 2–3 days |
| 1 | Platform interface + both adapters | 3–4 days |
| 2 | Shell, navigation, back button, EAS on a device | 2 days |
| 3 | UI port (`Parent.tsx` is 1.5 weeks of it) | 3–4 weeks |
| 4 | Sync: base URL, `onResume`, NetInfo | 2–3 days |
| 5 | Store compliance, payment-flow removal, release | 3–5 days |
| | **Total focused work** | **6–8 weeks** |

Slightly *less* than the first draft despite a larger UI, because Stage 4 shrank
from two weeks to two days and took all its legal and policy line items with it.

Stages 0–3 produce a shippable Android app. Sync can follow the first release if
schedule pressure demands it, though there is now little reason to defer it.

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Relative `/api/` paths silently fail in RN | Fix in Stage 0 with one consumer, not later with two (§2) |
| NativeWind vs Tailwind v4 | Share tokens, not the framework (§6). Makes the choice reversible |
| Web Audio has no RN equivalent | Timebox the library, fall back to pre-rendered files |
| `Parent.tsx` is 2,246 lines and still growing | Split into per-tab files while porting; budget 1.5 weeks |
| Grid → flex reintroduces bugs already fixed | Read `c410752` and `7e8b9e0` before porting shop and island |
| An analytics SDK creeps into the Expo app | Release gate mirroring `build-site.mjs`; the marketing site makes a public promise (§8) |
| Flaky mobile networks read as "signed out" | Only a 401 clears a token — test on a real cellular connection, not a simulator |
| Content forks between apps | `packages/core` is the only copy, and `npm run smoke` runs against it |
| Play review rejects redeem-only framing | Card and transfer flows removed from the build; re-read current policy before submitting |
| `order` / `match` gestures on touch | Prototype in Stage 3 item 3, before the screens depend on them |

---

## 12. Open questions

- **The website says nothing about an Android app.** Once there is a listing,
  [site/index.html](site/index.html)'s *"Open Brainy"* calls to action and the
  install messaging need a pass — and the privacy notice needs a line about the
  Play distribution. Small, but it is release-blocking copy, not follow-up.
- **iOS.** Expo makes it mostly free later, but App Store rules on redeem-only are
  stricter than Play's. Out of scope here; do not architect against it.
- **Tablet layouts.** The web app uses `sm:` breakpoints throughout; Android
  tablets are a real share of the target market and deserve their own pass.
- **Local notifications for the daily quest.** Powerful for streaks, and squarely
  in Families-policy territory.
