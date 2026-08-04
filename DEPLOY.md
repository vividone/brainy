# Deploying Brainy to brainy.fortbridge.app

## What a build produces

```
npm run build
```

```
dist/
  index.html        landing page
  privacy.html      privacy notice
  robots.txt        allows the landing page, disallows /play/
  sitemap.xml
  img/              marketing screenshots
  play/             the PWA (index.html, assets/, sw.js, manifest, icons)
```

The marketing site owns the root; the app lives at `/play/`. Both ship from one `dist/`, so there is one deploy, not two.

Check it locally exactly as a host would serve it:

```
npm run serve          # http://localhost:4200
```

`vite preview` is not a substitute — it applies the app's `/play/` base to the whole server and redirects the root away from the landing page.

---

## Vercel

`vercel.json` is in the repo, so there is nothing to configure in the dashboard.

1. Push this repo to GitHub.
2. Vercel → **Add New… → Project** → import the repo.
3. Framework preset **Other**. It reads `vercel.json`: build `npm run build`, output `dist`.
4. Deploy.
5. **Settings → Domains** → add `brainy.fortbridge.app`.
6. Wherever `fortbridge.app` DNS lives, add the record Vercel shows you:

   | Type | Name | Value |
   |---|---|---|
   | CNAME | `brainy` | `cname.vercel-dns.com` |

7. Wait for the certificate. **HTTPS is not optional** — service workers, and so offline and
   add-to-home-screen, only work over HTTPS.

`api/report.js` is picked up automatically as a serverless function at `/api/report`. There is nothing to wire up.

The config also sets the cache headers that matter: hashed assets are immutable for a year, but `sw.js` and the app shell must revalidate every time, or an update never reaches a device that has already installed it.

### Database

The same Postgres carries usage data now and Paystack licences later, which is why it is Postgres
rather than a key-value store.

1. Vercel → **Storage → Create Database → Postgres** (Neon under the hood). Or bring your own from
   Neon or Supabase.
2. Set **`DATABASE_URL`** to the **pooled** connection string. Vercel Postgres supplies this
   automatically; with Neon or Supabase, take the one labelled *pooled* or *connection pooling*. A
   serverless function can cold-start per request, and an unpooled URL exhausts the server's
   connection slots quickly.
3. Redeploy. Tables are created on first use — there is no migration step to remember.

| Variable | Required | What it does |
|---|---|---|
| `DATABASE_URL` | for stats | Pooled Postgres connection string |
| `ADMIN_TOKEN` | for the dashboard | Any long random string; guards `/api/stats` |
| `REPORT_WEBHOOK_URL` | optional | Also POST feedback to Slack, Discord, Apps Script or an email relay |

With none of them set the endpoints still return 200 and write to the function log, so a missing
variable never breaks the app for a family.

### The dashboard

**`https://brainy.fortbridge.app/admin`** — enter `ADMIN_TOKEN`. It shows activations, children,
active today and this week, one-week retention, devices and questions per day for 30 days, accuracy
by subject, the curriculum and class split, and recent feedback.

Read it as a **floor, not a total**: it only covers families who opted in. `robots.txt` excludes it
and the page is `noindex`.

### Later: Paystack

The schema is deliberately ready for it. Payments will want `licences` and `payments` tables
alongside the existing ones, plus `api/paystack/initialise.js` and `api/paystack/webhook.js`. The
webhook must verify the `x-paystack-signature` HMAC before trusting anything, and the secret key
must only ever live in an environment variable on the server — never in the client bundle.

## After deploying, check these

Worth doing on a real phone, not just a laptop.

- [ ] `https://brainy.fortbridge.app/` shows the landing page
- [ ] `https://brainy.fortbridge.app/play/` opens the app and onboarding starts
- [ ] "Add to home screen" is offered (Chrome on Android, Share → Add to Home Screen on iOS)
- [ ] Opened from the home screen it runs full-screen with no browser chrome
- [ ] Put the phone in airplane mode, reopen it — a whole quest should still play
- [ ] The grown-up area opens with the code set during onboarding
- [ ] `https://brainy.fortbridge.app/privacy.html` loads
- [ ] Setup asks about usage data and the box starts **unticked**
- [ ] Declining it sends nothing (check the Network tab — there should be no `/api` calls at all)
- [ ] Accepting it produces `activate` and `open` rows, and finishing a quest produces `session`
- [ ] `/admin` loads with `ADMIN_TOKEN` and refuses a wrong one
- [ ] The feedback form sends, and its **Copy instead** fallback works with the phone offline

**iOS note.** Safari does not prompt to install; a parent has to use Share → Add to Home Screen. Worth saying so explicitly when you share the link, or most iPhone users will just use it in the browser and never get the offline behaviour.

---

## Shipping an update

`git push` and the host rebuilds. Devices that already installed it pick the new version up on next launch — `registerType: 'autoUpdate'` means the service worker replaces itself in the background.

Two things to remember:

- **Never change the localStorage key** (`kolo.save.v1`, kept from the app's earlier name). Changing it orphans every save on every device.
- **When the save shape changes, bump `SAVE_VERSION` and add a migration.** There is a `migrate` in `src/state/store.ts` with a worked example. Without one, zustand silently discards the old save — which is a child's entire history.

Before any deploy:

```
npm run smoke      # every generator, every difficulty
npm run smoke:api  # the API routes against an in-memory Postgres
npm run build      # typecheck is part of this
```

---

## Sharing with the first 20 families

The link is all they need — no store, no install, no account. Something like:

> Brainy is a short daily practice app for Basic 1–6: maths, reasoning and English, matched to your child's class. Five minutes a day.
>
> https://brainy.fortbridge.app
>
> Nothing to install and no sign-up. On a phone, use "Add to home screen" so it opens like an app and works without data.
>
> It's free permanently for the first 20 families. I'd genuinely like to know what your child makes of it.

**What to ask them for.** There is no analytics in Brainy, so the app cannot tell you what is working. Two ways to find out:

1. **Ask.** At twenty families, a WhatsApp group and three questions beats any dashboard: does your child open it without being asked, what confused them, what looked wrong.
2. **The in-app summary.** Grown-up area → Settings → *Help improve Brainy*. The parent can read the exact text, copy it, send it once, or switch on a weekly send. It carries curriculum, class, bucketed counts, accuracy and the topics scoring worst — and no name, no identifier and no dates. The lowest-accuracy skills are the useful part: a skill sitting at 30% across several families is a badly worded question, not a struggling child.

   Because there is no identifier, you cannot tell one family's reports from another's, or follow a family over time. That is deliberate — an id plus a history would make it personal data again. It still answers the question that matters, which is *which content is broken*.

3. **The feedback form.** Same screen. Categories first ("a question looks wrong", "something confused my child"), because an open text box gets nothing while a named category gets the report that fixes content.
