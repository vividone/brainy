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

One Postgres carries usage data, parent sign-ups, licences and payments, which is why it is Postgres
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
| `DATABASE_URL` | for everything server-side | Pooled Postgres connection string |
| `ADMIN_EMAIL` | to sign in to `/admin` | The admin account's address |
| `ADMIN_PASSWORD` | to sign in to `/admin` | At least 10 characters. **This pair is the password reset** — change it here and the login changes |
| `ADMIN_SESSION_SECRET` | recommended | Any long random string; signs the admin session cookie. Falls back to a value derived from `ADMIN_TOKEN` |
| `ADMIN_TOKEN` | optional | Machine credential for `curl`/cron against `/api/admin/*` and `/api/stats` |
| `PAYSTACK_SECRET_KEY` | to take payments | `sk_live_…` or `sk_test_…`. Unset ⇒ checkout is switched off and the app says so |
| `PRICE_ANNUAL_MINOR` | optional | Price in **minor units** — ₦5,000 is `500000`. Default `500000` |
| `PRICE_LIFETIME_MINOR` | optional | Default `1500000` (₦15,000) |
| `PAYSTACK_CURRENCY` | optional | Default `NGN` |
| `SIGNUP_COUPON` | optional | A coupon code every sign-up tries automatically — this is how the twenty free places are honoured without a human in the loop |
| `PUBLIC_BASE_URL` | optional | Overrides the origin used in emails and the Paystack return URL. Derived from the request otherwise |
| `RESEND_API_KEY` | to send email | `re_…` from Resend. Unset ⇒ nothing is sent and every would-be email is logged instead |
| `EMAIL_FROM` | with Resend | e.g. `Brainy <brainy@fortbridge.app>`. Must be on a domain verified in Resend |
| `EMAIL_REPLY_TO` | optional | Where replies go, if not the From address |
| `OPERATOR_EMAIL` | optional | Emails **you** on every sign-up, redemption and payment |
| `CRON_SECRET` | for renewal warnings | Any long random string. Vercel sends it as a Bearer token; without it `/api/cron/expiring` refuses to run |
| `REPORT_WEBHOOK_URL` | optional | Also POST feedback, sign-ups and payments to Slack, Discord or Apps Script |

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

Three ways a family gets access:

1. **A coupon.** Make one in *Coupons* — `FAMILY-7K3M`, 20 uses, free forever — and hand it out. One
   family can only consume one use however many times they type it. Set `SIGNUP_COUPON` to that code
   and the landing-page form claims a place automatically until they run out.
2. **A payment.** `POST /api/pay/initialise` mints the reference and the amount server-side, sends the
   parent to Paystack, and Paystack returns them to `/play/?ref=…`, which the app turns into a
   licence. Both the webhook and that return path go through one function that **re-verifies the
   transaction against Paystack's API before granting anything** — a signed webhook alone is not
   trusted, and a reference this server never created grants nothing.
3. **By hand**, in *Families* → *Give a family access*. Bank transfers, apologies, and the
   twenty-first family you decide counts anyway.

**Set the webhook up** in the Paystack dashboard → Settings → API Keys & Webhooks → Webhook URL:
`https://brainy.fortbridge.app/api/pay/webhook`. It verifies `x-paystack-signature` (HMAC-SHA512 over
the raw body) and returns 401 to anything unsigned. The secret key lives only in the environment and
is never in the client bundle.

The licence is stored on the device, so paid subjects open in airplane mode. It is re-checked about
once a week, and **only a definite "this code does not exist" ever removes it** — a failed check, a
flat signal or a dead server leaves a family exactly as they were.

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

## Two things that are easy to break

**Do not turn on `cleanUrls` in `vercel.json`.** It canonicalises `/play/` to
`/play`, and `/play` sits outside the service worker's `/play/` scope. Chrome
then finds no controlling worker and silently stops offering to install the
app — no error, the "Install" option just never appears. `/admin` and
`/privacy` are served by explicit rewrites instead, which do the same job
without touching `/play/`.

**`DATABASE_URL` must be the pooled connection string.** An unpooled one
exhausts Postgres connections under serverless cold starts. If `/admin` cannot
load, it now prints the actual database error and what to do about it, rather
than a blank failure.
