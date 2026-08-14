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

## Working on it locally

```
npm run dev            # site at /, dashboard at /admin, app at /play/
npm run dev:api        # the API on :3001, which /api is proxied to
```

Two commands, two terminals, one origin — the same arrangement as production,
where `vercel.json` proxies `/api` to Railway. That matters for more than
convenience: the admin session cookie is `SameSite=Strict`, so a cross-origin dev
setup would behave differently from the real thing in exactly the area hardest to
debug.

**Vite prints only `/play/`**, because that is the app's `base`. The other routes
exist and are listed underneath its banner:

| | |
|---|---|
| `/` | the landing page |
| `/admin` | the dashboard |
| `/privacy` | the privacy notice |
| `/play/` | the app, with hot reloading |

The site files are served straight from `site/` — they have no build step — and the
paths mirror the rewrites in `vercel.json`, so a link that works here works
deployed. Analytics are inert locally: the measurement id is only substituted at
build time, and `localhost` is excluded anyway.

`npm run dev:api` needs no configuration to start. Without `DATABASE_URL` it runs
and says so, and the routes that need a database answer 503 rather than pretending;
copy `.env.example` to `.env` when you want sign-in, email or payments to work.
`/admin` signs in with the development credentials it prints.

**On Windows, use `localhost` rather than `127.0.0.1`** — Vite binds to `::1`, so
the IPv4 address refuses the connection with no useful error.

To check the built output exactly as a host would serve it:

```
npm run build
npm run serve          # http://localhost:4200
```

That is the one that catches build-only problems — asset hashing, the service
worker, and the `/play/` scope.

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

**Vercel no longer runs the API.** It serves the pages and proxies `/api/*` to a Fastify service on
Railway — see *The API service* below. After that move, the only variable Vercel needs is
`GA_MEASUREMENT_ID`; every secret lives on Railway.

The config also sets the cache headers that matter: hashed assets are immutable for a year, but `sw.js` and the app shell must revalidate every time, or an update never reaches a device that has already installed it.


## Scheduled jobs

Three jobs, all on **Railway**, because that is where the database is and because Vercel's Hobby plan
only allows one cron a day — the reminder pass needs to run hourly to honour the hour each family
picked.

Railway schedules a job by **starting a service and expecting it to exit**. So each one is a separate
service in the same project, deployed from this same repo, with a start command instead of a server:

| Service | Start command | Schedule | What it does |
|---|---|---|---|
| `cron-remind` | `npm run cron remind` | `0 * * * *` | Sends the daily-quest reminder to families whose chosen hour it now is and who have not played today |
| `cron-expiring` | `npm run cron expiring` | `0 9 * * *` | Emails a warning about a week before a licence runs out |
| `cron-retain` | `npm run cron retain` | `0 3 * * 1` | The retention sweep: old codes, revoked tokens, dormant progress |

Each needs `DATABASE_URL` (the private `postgres.railway.internal` one), `CRON_SECRET`, and whatever
the job itself uses: `RESEND_API_KEY` for the two that email, the three `VAPID_*` variables for
reminders. Railway's variable references make this one click per service rather than a copy-paste.

**Do not put a schedule on the API service.** Railway would restart it at every firing, and a cron
that takes the API down every hour is worse than no cron.

The runner is `scripts/cron.mjs`. It calls the same handler the HTTP route calls, with the same
`CRON_SECRET` guard, so there is one implementation of each job rather than a scheduled copy that
drifts. It exits non-zero when a run fails, which is what makes a failure visible in Railway's history
rather than silent.

Run one by hand at any time:

```bash
railway run npm run cron remind
```

Or over HTTP, which still works and is useful from a laptop:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://api-brainy.fortbridge.app/api/cron/remind
```


## The API service

```
browser ──▶ brainy.fortbridge.app          Vercel: pages, /play/, /admin
                    │  /api/*
                    ▼
            api-brainy.fortbridge.app      Railway: Fastify (server/)
                    │  private network
                    ▼
            postgres.railway.internal      Railway: Postgres, no public port
```

The API used to be Vercel serverless functions. It moved for one reason: Vercel has no fixed egress
IPs, so reaching Postgres from there meant leaving the database open to the internet behind only a
password. Running inside Railway means `postgres.railway.internal` and **public networking switched
off**. The framework choice was incidental; the network topology was the point.

Everything stays on one origin because Vercel proxies `/api/*`, so the admin cookie keeps
`SameSite=Strict`, there is no CORS, and no client code knows the API moved.

### Setting it up

**The same repository serves both.** Vercel builds `dist/` from it and Railway runs `server/` from it.
Nothing needs splitting out.

1. Railway → **New Service → GitHub repo**, **in the same project as the Postgres** — that is what
   makes the private hostname available. Leave the root directory as `/`.
2. `railway.json` in the repo sets the start command (`node server/index.js`) and the healthcheck
   (`/healthz`). It also skips the frontend build, which Railway would otherwise run on every deploy
   for a service that never serves it.
3. **Settings → Watch Paths**, so a change to the marketing copy does not redeploy the API:

   ```
   server/**
   package.json
   package-lock.json
   railway.json
   ```

4. Set the variables (the table below). For `DATABASE_URL`, use Railway's own reference syntax rather
   than pasting a string — it then stays correct when credentials rotate:

   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```

   That resolves to the **private** `postgres.railway.internal` URL, which is the one you want.
   Do **not** set `PORT`; Railway provides it.
5. Railway → Settings → Networking → **Custom Domain** → `api-brainy.fortbridge.app`, and add the
   CNAME it shows you wherever `fortbridge.app` DNS lives. A domain you own is stable and independent
   of Railway's generated name, which is why `vercel.json` names it rather than an `up.railway.app`
   host. Wait for the certificate.
6. **Verify the API on its own domain, before touching Vercel:**

   ```
   curl https://api-brainy.fortbridge.app/healthz
   npm run preflight -- https://api-brainy.fortbridge.app
   ```

7. Deploy Vercel. `vercel.json` already proxies `/api/*` to that host.
8. Delete every server secret from Vercel. It then needs only `GA_MEASUREMENT_ID`.
9. Railway Postgres → **Settings → Networking → Public Networking OFF**.

**Point Paystack at the API directly**, not through the proxy:
`https://api-brainy.fortbridge.app/api/webhook`. The signature is an HMAC over the exact bytes, so the
fewer things between Paystack and the handler the better — and a webhook that keeps working when the
front end is mid-deploy is worth having.

**Scheduled jobs run on Railway, not Vercel.** See *Scheduled jobs* below; `vercel.json` no longer
declares any `crons`.

**Optional build slimming.** Nixpacks runs `npm ci`, which installs Vite, Tailwind and TypeScript that
this service never uses. Setting the Railway variable `NIXPACKS_INSTALL_CMD=npm ci --omit=dev` skips
them. Safe because everything `server/` imports — `fastify`, `@fastify/helmet`, `pg` — is a production
dependency; it is worth knowing that this is the reason that must stay true.

**Two traps.** Vercel checks the filesystem *before* rewrites, so the proxy only works because there
is no longer an `api/` directory — which also means the cutover cannot be gradual. And if you ever
roll back to serverless, re-enable public networking **first**, or the restored functions cannot reach
the database.

Running it locally:

```
npm start                       # the API on :8080, needs DATABASE_URL
npm run smoke:server            # boots it against an in-memory Postgres and drives it over HTTP
```

### Database

One Postgres carries usage data, parent sign-ups, licences and payments, which is why it is Postgres
rather than a key-value store.

Because the API now runs *inside* Railway, use the **private** connection string — the one Railway
itself calls `DATABASE_URL`, with host `postgres.railway.internal`. Then switch **Public Networking
off**: the database becomes unreachable from anywhere except the API service, which is the whole
point of the topology above.

Tables are created at startup — there is no migration step to remember, and a `DATABASE_URL` that
does not work is a failed boot rather than a puzzle in the logs an hour later.

TLS handling, in `server/lib/db.js`:

| Host | TLS |
|---|---|
| `*.internal` | none — private network, and those images usually have no certificate |
| localhost | none |
| anything public | **certificate verified**; `DATABASE_SSL_NO_VERIFY=1` is the deliberate opt-out |

That last row used to be `rejectUnauthorized: false`, which encrypts without authenticating — fine on a
private network, but it was being used across the public internet, where anything in the middle could
present its own certificate and read the credentials.

If you ever see `getaddrinfo ENOTFOUND postgres.railway.internal`, whatever threw it is **not running
inside Railway** — `explain()` says so in those words rather than quoting a resolver error. Use
`DATABASE_PUBLIC_URL` for anything hosted elsewhere, which means turning public networking back on.

The pool holds ten connections (`DATABASE_POOL_MAX`), which is right for one long-lived process. The
old value of one was a serverless constraint, not a preference.

### Which variables go where

Everything below lives on the **Railway service**, with two exceptions: `GA_MEASUREMENT_ID` stays on
**Vercel** because it is baked in at build time, and `PORT` is set by Railway itself. After the cutover
Vercel holds no secrets at all — one place has the database credentials and the Paystack key.

| Variable | Required | What it does |
|---|---|---|
| `DATABASE_URL` | for everything server-side | The **private** Postgres URL. Use `${{Postgres.DATABASE_URL}}` |
| `ADMIN_EMAIL` | to sign in to `/admin` | The admin account's address |
| `ADMIN_PASSWORD` | to sign in to `/admin` | At least 10 characters. **This pair is the password reset** — change it here and the login changes |
| `ADMIN_SESSION_SECRET` | recommended | Any long random string; signs the admin session cookie. Falls back to a value derived from `ADMIN_TOKEN` |
| `ADMIN_TOKEN` | optional | Machine credential for `curl`/cron against `/api/admin/*` and `/api/stats` |
| `PAYSTACK_SECRET_KEY` | to take payments | `sk_live_…` or `sk_test_…`. Unset ⇒ checkout is switched off and the app says so |
| `PRICE_ANNUAL_MINOR` | optional | Price in **minor units** — ₦5,000 is `500000`. Default `500000` |
| `PRICE_LIFETIME_MINOR` | optional | Default `1500000` (₦15,000) |
| `PAYSTACK_CURRENCY` | optional | Default `NGN` |
| `BANK_NAME`, `BANK_ACCOUNT_NAME`, `BANK_ACCOUNT_NUMBER` | to accept transfers | All three, or the option is hidden from parents entirely |
| `BANK_INSTRUCTIONS` | optional | One line shown under the account details, e.g. *"Use your email as the narration."* |
| `SIGNUP_COUPON` | optional | A coupon code every sign-up tries automatically — this is how the twenty free places are honoured without a human in the loop |
| `PUBLIC_BASE_URL` | optional | Overrides the origin used in emails and the Paystack return URL. Derived from the request otherwise |
| `RESEND_API_KEY` | to send email | `re_…` from Resend. Unset ⇒ nothing is sent and every would-be email is logged instead |
| `EMAIL_FROM` | with Resend | e.g. `Brainy <brainy@fortbridge.app>`. Must be on a domain verified in Resend |
| `EMAIL_REPLY_TO` | optional | Where replies go, if not the From address |
| `OPERATOR_EMAIL` | optional | Emails **you** on every sign-up, redemption and payment |
| `CRON_SECRET` | for the scheduled jobs | Any long random string. Every `/api/cron/*` route refuses to run without it, and so does `npm run cron` |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | for daily reminders | **Railway only, and on both the API service and `cron-remind`, with identical values.** Generate one pair with `npx web-push generate-vapid-keys`. The API hands the public key to browsers and accepts subscriptions; the cron service signs the sends. Different pairs on the two services means every send is rejected and, after five failures, each family's reminder is deleted. Use a Railway shared variable rather than pasting twice. Rotating them invalidates every existing subscription |
| `VAPID_SUBJECT` | with the keys | A `mailto:` or `https:` URL a push service can use to reach a human. Defaults to `mailto:brainy@fortbridge.app` |
| `REPORT_WEBHOOK_URL` | optional | **Outbound only, and nothing to do with Paystack.** Pushes a copy of each sign-up, payment, transfer and feedback to somewhere you already look — Slack, Discord, Apps Script. Redundant once `OPERATOR_EMAIL` is set, and it must never point back at this deployment |
| `GA_MEASUREMENT_ID` | optional | Overrides the Google Analytics property for the **website**. Defaults to the live one in `scripts/build-site.mjs`; set it to an empty string to build with analytics off |

With none of them set, the app still works: usage pings write to the function log, and maths — which
is free for everybody — needs no server at all. What breaks without `DATABASE_URL` is sign-ups and
codes, and those say so plainly rather than pretending to have worked.

### The admin dashboard

**`https://brainy.fortbridge.app/admin`** — sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`. The
account is created in the database on first sign-in and re-synced from the environment every time, so
changing the variables is the password reset.

Seven tabs:

| Tab | What it answers |
|---|---|
| **Overview** | Sign-ups, active licences, free vs paid, money taken, coupon places left, what is expiring |
| **Families** | Every parent, their code, plan, expiry, how many tablets used it, what they paid — with **grant**, **+1 year**, **revoke**, **restore** |
| **Coupons** | Make a code for one family or twenty, turn one off, see who claimed it |
| **Payments** | Every transaction and its reference |
| **Usage** | The anonymous half: activations, active devices, questions per day, accuracy by subject |
| **Feedback** | What parents have written in |
| **Log** | Every grant, extension and revocation, and who made it |

The two halves are deliberately unjoinable: **Usage** knows install ids and nothing about people,
**Families** knows people and nothing about children. `robots.txt` excludes `/admin` and the page is
`noindex`.

### Licensing and Paystack

What is gated, from prd.md §14.2: **mathematics is free permanently for everybody** — the child's own
class and every earlier class as revision. The other subjects need an active licence. Nothing ever
interrupts a session that has started.

Four ways a family gets access:

1. **A coupon.** Make one in *Coupons* — `FAMILY-7K3M`, 20 uses, free forever — and hand it out. One
   family can only consume one use however many times they type it. Set `SIGNUP_COUPON` to that code
   and the landing-page form claims a place automatically until they run out. The *Coupons* tab has a
   one-click **first run** button that creates the twenty-place code and tells you what to paste.
2. **A card payment.** `POST /api/pay/initialise` mints the reference and the amount server-side, sends
   the parent to Paystack, and Paystack returns them to `/play/?ref=…`, which the app turns into a
   licence. Both the webhook and that return path go through one function that **re-verifies the
   transaction against Paystack's API before granting anything** — a signed webhook alone is not
   trusted, and a reference this server never created grants nothing.
3. **A bank transfer**, reviewed by you — see below.
4. **By hand**, in *Families* → *Give a family access*. Apologies, edge cases, and the twenty-first
   family you decide counts anyway.

### Bank transfers

The realistic way a Nigerian family pays. Set the three `BANK_*` variables and the grown-up area shows
the account details next to the card buttons; leave them unset and the option does not exist.

The flow, and the one thing that matters about it:

1. The parent transfers the money in their bank app, then taps **I have made the transfer** and sends
   the plan, the name on the sending account, the date, an optional reference and an optional
   screenshot (≤ 1.5 MB, image or PDF).
2. `POST /api/pay/request` stores that as a **claim and grants absolutely nothing.** Nothing a parent
   types can change what they are entitled to, which is why the endpoint is safe to leave open. They
   get an email saying, in those words, that nothing is unlocked yet.
3. You open **Transfers** in the dashboard. Check the amount against *your own bank statement* — the
   figure shown is what they say they paid. The receipt they attached is fetched per row through the
   admin guard (`Cache-Control: private, no-store`), never from a public URL.
4. **Confirm and send the code** grants the licence, records it as a payment so it appears in the money
   figures, and emails them the code. **Decline** asks for a reason and emails that instead — worded to
   be answerable, because most declines are a transfer still in flight or a name that did not match.

Submitting twice replaces the open claim rather than creating a second one, so there is always exactly
one thing per family to look at. Approving twice is refused.

The proof image is stored in Postgres as base64 rather than in object storage: one small file per
paying family, wanting exactly the same access control as the row it belongs to. Adding a bucket, its
credentials and its lifecycle rules to save a few kilobytes would be the more complicated choice.

**Set the webhook up** in the Paystack dashboard → Settings → API Keys & Webhooks → Webhook URL. It is
a URL, not an environment variable, and either of these works — they reach the same function, the
short one through a rewrite in `vercel.json`:

```
https://brainy.fortbridge.app/api/webhook        ← shorter, use this
https://brainy.fortbridge.app/api/pay/webhook    ← the underlying route
```

A Vercel rewrite passes the method, headers and raw body through untouched, which matters here more
than anywhere else: the signature is an HMAC over exactly those bytes. It verifies
`x-paystack-signature` (HMAC-SHA512) and returns 401 to anything unsigned. The secret key lives only
in the environment and is never in the client bundle.

Do not confuse this with `REPORT_WEBHOOK_URL`, which points the other way — outbound copies to Slack
or similar. Nothing calls that.

The licence is stored on the device, so paid subjects open in airplane mode. It is re-checked about
once a week, and **only a definite "this code does not exist" ever removes it** — a failed check, a
flat signal or a dead server leaves a family exactly as they were.

### Google Analytics — website only

The property is **`G-T76WQTXYYE`**, and it measures the landing page and the privacy notice. It is
deliberately absent from three places: the app at `/play/`, the dashboard at `/admin`, and any
localhost or `*.vercel.app` hostname.

- **It is one file**, [`site/analytics.js`](site/analytics.js), loaded by `index.html` and
  `privacy.html` only. The measurement id is substituted at build time from
  `scripts/build-site.mjs`, so there is one place to change it.
- **The build enforces the boundary.** `npm run build` scans `dist/play/**` for
  `googletagmanager`, `google-analytics`, `gtag(` and `dataLayer`, and *fails* if any appears. It also
  fails if `admin.html` ever references the analytics file. The claim on the landing page that the app
  carries no third-party script is therefore checked rather than trusted.
- **It loads on every visit**, like the standard snippet. There is no consent banner.
- **Advertising features are off** in code: no Google Signals, no ad personalisation, no remarketing.
  Analytics, not adtech.

Because localhost and preview deployments are excluded, the way to test the tag is a real visit to the
production domain, watching for the `collect` request in the Network tab.

Set `GA_MEASUREMENT_ID=""` to build with analytics off entirely.

**One thing to keep an eye on.** Analytics cookies set without asking are the part of this that EU/UK
visitors have a right to object to, and Nigeria's NDPR takes a similar line. That is a business
decision rather than a technical one and it is recorded here rather than argued: if the audience turns
out to be substantially European, a consent banner is the fix, and `site/analytics.js` is the only file
that would change. The privacy notice tells visitors plainly what runs and how to block it.

### Email, via Resend

Four messages, and every one exists because a parent would otherwise be stuck:

| When | Message |
|---|---|
| A free place claimed, a coupon redeemed, or a grant made by hand | **Your Brainy access code** — the code, and how to use it |
| A sign-up that granted nothing | **Thanks for signing up** — says plainly that nothing is unlocked, and points at free maths |
| A successful payment | **Payment received** — amount, reference, and the code |
| Seven days before an annual licence lapses | **Your access runs out in 7 days** — and what will *not* be lost |

No newsletter, no drip sequence, no marketing. Each is sent once: a parent who submits the form twice
or re-types a coupon on a second tablet is not emailed again, because nothing happened.

**Setting it up:**

1. Resend → **Domains → Add domain** → `fortbridge.app` (or a subdomain like `mail.fortbridge.app`,
   which keeps Brainy's sending reputation separate from any other mail on the root domain).
2. Add the DNS records Resend shows you — a **DKIM** `TXT`, an **SPF** `TXT` on the sending subdomain,
   and the `MX` for return-path. Wait for all of them to go green. Until the domain is verified, Resend
   will only deliver to the address that owns the account, which looks exactly like "email is broken".
3. Set `RESEND_API_KEY` and `EMAIL_FROM` in Vercel, then redeploy.
4. Optional but worth it: add a **DMARC** record (`_dmarc.fortbridge.app`, `v=DMARC1; p=none;
   rua=mailto:you@…`) so you can see what receivers make of your mail before tightening it.
5. Send yourself one: sign up on the landing page with your own address, and check the code arrives and
   the link in it opens the app.

With `RESEND_API_KEY` unset nothing sends, every would-be message is logged with its subject and
recipient, and the rest of the product is unaffected — the code is always shown on screen as well, so
email is the copy a parent can find again in a month rather than the only copy.

**Renewal warnings** run from Vercel Cron, declared in `vercel.json` (`0 9 * * *`, daily at 09:00 UTC).
Set `CRON_SECRET` or the endpoint refuses to run — a public endpoint that sends email is a public
endpoint that sends spam. The job is a courtesy, not a mechanism: expiry is evaluated whenever a
licence is looked at, so if the cron never fires the only thing lost is the warning. Run it by hand
with `curl -H "Authorization: Bearer $CRON_SECRET" https://brainy.fortbridge.app/api/cron/expiring`.

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
- [ ] `/admin` signs in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` and refuses a wrong password
- [ ] The feedback form sends, and its **Copy instead** fallback works with the phone offline
- [ ] Maths opens with no licence; another subject shows the friendly locked card
- [ ] The landing-page form accepts an address, and the row appears in *Families*
- [ ] A coupon made in *Coupons* unlocks everything from grown-up area → **Access**
- [ ] The same coupon typed twice by the same family consumes only one use
- [ ] The code arrives by email, and the link in it opens the app
- [ ] The landing page asks about analytics once, and **nothing** is requested from Google until you agree
- [ ] `/play/` requests nothing from Google at all, before or after agreeing (check the Network tab)
- [ ] The footer *Cookies* link reopens the question, and declining removes the `_ga*` cookies
- [ ] `npm run preflight -- https://brainy.fortbridge.app` reports nothing broken
- [ ] With the `BANK_*` variables set, **Access** shows the account details and the transfer form sends
- [ ] The claim appears under **Transfers**, the receipt opens, and *Confirm* emails the code
- [ ] With `PAYSTACK_SECRET_KEY` set, **Access** shows the prices and checkout reaches Paystack
- [ ] Paying with a test card returns to `/play/?ref=…` and lands on "Everything is unlocked"
- [ ] *Revoke* in *Families*, then **Check again** in the app, closes the paid subjects
- [ ] Airplane mode after activating: the paid subjects still open

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

After it:

```
npm run preflight -- https://brainy.fortbridge.app
```

Every check is a real request to the running site, so it catches what a build cannot — an unpooled
database URL, a Resend key pasted with a trailing space, a `SIGNUP_COUPON` naming a coupon nobody
created. It is read-only, creates nothing and sends no email, so it is safe against production. Export
`ADMIN_TOKEN` first and it additionally reports email delivery, free places remaining and how many
transfers are waiting.

`.env.example` lists every variable with a note on what each one switches on.

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

## vercel.json, annotated

JSON has no comments, and **Vercel's schema rejects any key it does not recognise** — including
`_comment`, which fails the deploy with *"should NOT have additional property"*. So the reasoning that
would otherwise sit next to each rule lives here instead. `npm run build` fails if an unknown key
creeps back in, so this is caught locally rather than by a rejected deploy.

**The `/api/*` rewrite.** Everything under `/api/` is proxied to the Fastify service on Railway, which
keeps the browser on one origin: the admin session cookie stays `SameSite=Strict`, there is no CORS,
and no client code knows where the API lives. Two things about it are easy to get wrong — Vercel checks
the filesystem *before* rewrites, so this only works because there is no longer an `api/` directory;
and if the destination host is wrong the failure is a proxy error rather than anything obvious, which
is what `npm run preflight` exists to catch.

**Three Content-Security-Policies, over deliberately non-overlapping paths.** `/play/(.*)`, `/admin`
plus `/admin.html`, and `/` plus `/privacy.html`. Two matching rules would send two CSP headers, and a
browser enforces the *intersection* of both — an excellent way to break a page while every rule looks
correct read on its own. The catch-all `/(.*)` at the bottom sets no CSP for exactly that reason; it
carries only the headers that are safe to combine.

- `/play/` — the app. `script-src 'self'`, no exceptions: a child's tablet loads no third-party code,
  and the build fails if any appears.
- `/admin` — shows parents' email addresses and bank receipts, so it frames nowhere and posts nowhere.
  Receipts are same-origin images from `/api/admin/proof`.
- `/` and `/privacy.html` — the marketing pages, and the only place Google Analytics is allowed.
  `'unsafe-inline'` stays in `style-src` because those pages use `style=` attributes; it is absent from
  `script-src`, which is the one that matters, and the inline scripts were moved into `/site.js` and
  `/admin.js` to make that possible.

## Two things that are easy to break

**Do not set `cleanUrls` *or* `trailingSlash` in `vercel.json`.** Both do the
same damage. `trailingSlash: false` was added while removing `cleanUrls` and
reintroduced the exact bug it was meant to fix — caught only by
`npm run preflight` against the real deployment, because the local static
server does not canonicalise trailing slashes the way Vercel does. After any
change to `vercel.json`, deploy and run preflight; a passing local test proves
nothing about this. It canonicalises `/play/` to
`/play`, and `/play` sits outside the service worker's `/play/` scope. Chrome
then finds no controlling worker and silently stops offering to install the
app — no error, the "Install" option just never appears. `/admin` and
`/privacy` are served by explicit rewrites instead, which do the same job
without touching `/play/`.

**`DATABASE_URL` must be the pooled connection string.** An unpooled one
exhausts Postgres connections under serverless cold starts. If `/admin` cannot
load, it now prints the actual database error and what to do about it, rather
than a blank failure.
