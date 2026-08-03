# Deploying Brainy to brainy.accurify.co

## What a build produces

```
npm run build
```

```
dist/
  index.html        landing page
  privacy.html      privacy notice
  robots.txt        allows the landing page, disallows /app/
  sitemap.xml
  img/              marketing screenshots
  app/              the PWA (index.html, assets/, sw.js, manifest, icons)
```

The marketing site owns the root; the app lives at `/app/`. Both ship from one `dist/`, so there is one deploy, not two.

Check it locally exactly as a host would serve it:

```
npm run serve          # http://localhost:4200
```

`vite preview` is not a substitute — it applies the app's `/app/` base to the whole server and redirects the root away from the landing page.

---

## Netlify (recommended)

`netlify.toml` is already in the repo, so there is nothing to configure in the UI.

1. Push this repo to GitHub.
2. Netlify → **Add new site → Import an existing project** → pick the repo.
3. It reads `netlify.toml`: build `npm run build`, publish `dist`. Deploy.
4. **Domain settings → Add a domain** → `brainy.accurify.co`.
5. At whoever hosts `accurify.co` DNS, add:

   | Type | Name | Value |
   |---|---|---|
   | CNAME | `brainy` | `<your-site>.netlify.app` |

6. Wait for the certificate to issue (usually minutes). **HTTPS is not optional** — service workers, and therefore offline and install-to-home-screen, only work over HTTPS.

The config also sets the cache headers that matter: hashed assets are immutable for a year, but `sw.js` and the app shell must revalidate every time or an update never reaches a device that has already installed it.

### Vercel

No config file needed:

- Build command `npm run build`
- Output directory `dist`
- Add `brainy.accurify.co` under Domains, then the same CNAME.

Vercel serves `dist/` as-is, so `/` and `/app/` both work. You will want to add the same cache headers for `/app/sw.js` via `vercel.json` if updates start sticking.

### Cloudflare Pages

- Build command `npm run build`, output directory `dist`.
- If `accurify.co` is already on Cloudflare, the subdomain is a click rather than a CNAME.
- Turn **Auto Minify off for HTML** — it can rewrite the inlined SVG in the landing page.

---

## After deploying, check these

Worth doing on a real phone, not just a laptop.

- [ ] `https://brainy.accurify.co/` shows the landing page
- [ ] `https://brainy.accurify.co/app/` opens the app and onboarding starts
- [ ] "Add to home screen" is offered (Chrome on Android, Share → Add to Home Screen on iOS)
- [ ] Opened from the home screen it runs full-screen with no browser chrome
- [ ] Put the phone in airplane mode, reopen it — a whole quest should still play
- [ ] The grown-up area opens with the code set during onboarding
- [ ] `https://brainy.accurify.co/privacy.html` loads

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
npm run build      # typecheck is part of this
```

---

## Sharing with the first 20 families

The link is all they need — no store, no install, no account. Something like:

> Brainy is a short daily practice app for Basic 1–6: maths, reasoning and English, matched to your child's class. Five minutes a day.
>
> https://brainy.accurify.co
>
> Nothing to install and no sign-up. On a phone, use "Add to home screen" so it opens like an app and works without data.
>
> It's free permanently for the first 20 families. I'd genuinely like to know what your child makes of it.

**What to ask them for.** There is no analytics in Brainy, so the app cannot tell you what is working. Two ways to find out:

1. **Ask.** At twenty families, a WhatsApp group and three questions beats any dashboard: does your child open it without being asked, what confused them, what looked wrong.
2. **The in-app summary.** Grown-up area → Settings → *Help improve Brainy*. It builds a de-identified summary — curriculum, class, bucketed counts, accuracy, and the topics scoring worst — and copies it to the clipboard for the parent to send. Nothing is transmitted by the app itself. The lowest-accuracy skills are the useful part: a skill sitting at 30% across several families is a badly worded question, not a struggling child.
