/*
 * Brainy admin.
 *
 * Plain HTML and one script, no build step, served as a static file next
 * to the marketing site — the same reasoning as the API routes being
 * plain JS. It talks to /api/admin/* with a session cookie, so no secret
 * is ever held in this page or in storage; signing out is one request.
 *
 * Everything a parent typed is escaped on the way in. The only untrusted
 * strings here are their names, notes and feedback, and this page is the
 * one place they are ever rendered.
 */

const root = document.getElementById('root')
const flashHost = document.getElementById('flash')

const el = (html) => {
  const t = document.createElement('template')
  t.innerHTML = html.trim()
  return t.content.firstElementChild
}
const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const fmt = (n) => Number(n ?? 0).toLocaleString('en')
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) + '%' : '—')

/** Amounts arrive in minor units — kobo — and must never become floats on the way in. */
const money = (minor, currency) => {
  const value = Number(minor ?? 0) / 100
  try {
    return value.toLocaleString('en-NG', {
      style: 'currency',
      currency: currency || 'NGN',
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    })
  } catch {
    return `${currency || ''} ${value.toLocaleString('en')}`.trim()
  }
}
const date = (v) => (v ? new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const when = (v) => (v ? new Date(v).toLocaleString() : '—')
const days = (v) => (v ? Math.round((new Date(v) - Date.now()) / 86400000) : null)

function flash(message, kind = 'ok') {
  flashHost.innerHTML = ''
  const box = el(`<div class="${kind}">${esc(message)}</div>`)
  flashHost.append(box)
  setTimeout(() => box.remove(), kind === 'ok' ? 3500 : 7000)
}

/* ---------------------------------------------------------------- *
 * Talking to the API
 * ---------------------------------------------------------------- */

class Unauthorised extends Error {}

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    /* fall through to the status-based message */
  }
  if (res.status === 401) throw new Unauthorised(data?.error || 'Not signed in.')
  if (!res.ok || data?.ok === false) {
    const err = new Error(data?.error || `Server returned ${res.status}.`)
    err.hint = data?.hint
    throw err
  }
  return data
}

/* ---------------------------------------------------------------- *
 * Sign in
 * ---------------------------------------------------------------- */

function signIn(message) {
  root.innerHTML = ''
  const box = el(`<div class="gate">
    <h1><img src="/brand.svg" alt="" class="mark" /> Brainy Admin</h1>
    <p class="sub">Management Portal for Licences and Payments.</p>
    <div id="msg"></div>
    <div class="field"><label for="email">Email</label><input id="email" type="email" autocomplete="username" /></div>
    <!--
      A reveal toggle, because a mistyped long password is indistinguishable
      from a wrong one and this login has no "forgot password" to fall back
      on — the answer would be editing an environment variable and
      redeploying. The eye is inside the field rather than beside it so the
      layout does not shift when it appears.
    -->
    <div class="field">
      <label for="pw">Password</label>
      <div class="reveal">
        <input id="pw" type="password" autocomplete="current-password" />
        <button type="button" id="pw-see" aria-controls="pw" aria-pressed="false" aria-label="Show password" title="Show password">👁</button>
      </div>
    </div>
    <button id="go" style="width:100%;margin-top:0.4rem">Sign in</button>
   
  </div>`)
  root.append(box)
  if (message) box.querySelector('#msg').append(el(`<p class="err" style="margin-bottom:0.8rem">${esc(message)}</p>`))

  const email = box.querySelector('#email')
  const pw = box.querySelector('#pw')
  const go = box.querySelector('#go')

  const see = box.querySelector('#pw-see')
  see.onclick = () => {
    const shown = pw.type === 'text'
    pw.type = shown ? 'password' : 'text'
    see.setAttribute('aria-pressed', String(!shown))
    see.setAttribute('aria-label', shown ? 'Show password' : 'Hide password')
    see.title = shown ? 'Show password' : 'Hide password'
    see.textContent = shown ? '👁' : '🙈'
    /* Keep the caret where it was: toggling `type` moves it to the end in
       some browsers, which is disorienting mid-word. */
    const at = pw.selectionStart
    pw.focus()
    if (at !== null) pw.setSelectionRange(at, at)
  }

  const submit = async () => {
    go.disabled = true
    go.textContent = 'Signing in…'
    try {
      const data = await api('/admin/login', {
        method: 'POST',
        body: { email: email.value.trim(), password: pw.value },
      })
      dashboard(data.admin)
    } catch (err) {
      go.disabled = false
      go.textContent = 'Sign in'
      box.querySelector('#msg').innerHTML = `<p class="err" style="margin-bottom:0.8rem">${esc(err.message)}</p>`
      pw.select()
    }
  }
  go.onclick = submit
  for (const input of [email, pw]) input.onkeydown = (e) => { if (e.key === 'Enter') submit() }
  email.focus()
}

/* ---------------------------------------------------------------- *
 * Shell
 * ---------------------------------------------------------------- */

const TABS = [
  ['overview', 'Overview'],
  ['families', 'Families'],
  ['transfers', 'Transfers'],
  ['coupons', 'Coupons'],
  ['payments', 'Payments'],
  ['usage', 'Usage'],
  ['feedback', 'Feedback'],
  ['audit', 'Log'],
]

let current = 'overview'

function dashboard(admin) {
  root.innerHTML = ''
  root.append(
    el(`<div>
      <div class="bar">
        <h1><img src="/brand.svg" alt="" class="mark" /> Brainy admin</h1>
        <span class="who">${esc(admin?.email ?? '')} · <a href="#" id="out">sign out</a></span>
      </div>
      <div class="tabs" id="tabs"></div>
      <div id="view"></div>
    </div>`),
  )

  const tabs = root.querySelector('#tabs')
  for (const [id, label] of TABS) {
    const button = el(`<button data-tab="${id}">${label}</button>`)
    button.onclick = () => show(id)
    tabs.append(button)
  }
  root.querySelector('#out').onclick = async (e) => {
    e.preventDefault()
    try {
      await api('/admin/logout', { method: 'POST' })
    } catch {
      /* signing out locally is what matters */
    }
    signIn('Signed out.')
  }
  show(current)
}

const VIEWS = {}

async function show(tab) {
  current = tab
  for (const button of root.querySelectorAll('[data-tab]')) {
    button.setAttribute('aria-current', String(button.dataset.tab === tab))
  }
  const view = root.querySelector('#view')
  view.innerHTML = '<p class="sub">Loading…</p>'
  try {
    view.innerHTML = ''
    view.append(await VIEWS[tab]())
  } catch (err) {
    if (err instanceof Unauthorised) return signIn('That session has expired. Sign in again.')
    view.innerHTML = ''
    view.append(
      el(`<div class="card">
        <h3>Could not load this</h3>
        <p class="err">${esc(err.message)}</p>
        ${err.hint ? `<p class="note">${esc(err.hint)}</p>` : ''}
        <p class="note">
          Accounts and licences need <code>DATABASE_URL</code> (the <b>pooled</b> connection
          string). Until it is set the app itself is unaffected — a family already holding a
          licence keeps working offline.
        </p>
      </div>`),
    )
  }
}

const reload = () => show(current)

/** Run an action, report it, and refresh the tab. */
async function act(button, label, run) {
  const original = button.textContent
  button.disabled = true
  button.textContent = '…'
  try {
    await run()
    flash(label)
    await reload()
  } catch (err) {
    if (err instanceof Unauthorised) return signIn('That session has expired. Sign in again.')
    button.disabled = false
    button.textContent = original
    flash(err.message, 'err')
  }
}

const copy = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    flash(`Copied ${text}`)
  } catch {
    flash('Could not copy — select it instead.', 'err')
  }
}

const statusTag = (status) => `<span class="tag ${esc(status)}">${esc(status)}</span>`

/*
 * How long a code actually grants, which is no longer the same question as which
 * plan it is on. `months` overrides the plan when it is set; when it is not, the
 * plan's own length applies, and for the two open-ended plans that is for ever.
 */
const PLAN_MONTHS = { 'free-forever': null, annual: 12, lifetime: null }
const grantsFor = (c) => {
  const months = c.months ?? PLAN_MONTHS[c.plan]
  if (months == null) return 'never expires'
  if (months === 12) return '1 year'
  if (months % 12 === 0) return `${months / 12} years`
  return `${months} months`
}

/*
 * The tag prints how a licence is *billed*, never how long it runs.
 *
 * It used to print the plan id with the dashes taken out, which was fine while
 * a plan implied a duration and became a lie the moment coupons could grant any
 * period: a three-month free place came out tagged FREE FOREVER. The length is
 * always beside it — the coupon's granted period, or the family's expiry column —
 * so the tag has one job and cannot contradict it.
 */
/**
 * A period select's value, in the three states the API distinguishes.
 *
 * `undefined` (the blank option) leaves the plan's own length alone, `null`
 * means it never expires, and a number is that many months. A falsy check would
 * collapse the first two, which are opposites.
 */
const periodValue = (raw) => {
  if (raw === '') return undefined
  if (raw === 'never') return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

const PLAN_TAG_TEXT = { 'free-forever': 'free place', annual: 'paid', lifetime: 'paid' }
const planTag = (plan) =>
  plan && plan !== 'none'
    ? `<span class="tag plan">${esc(PLAN_TAG_TEXT[plan] ?? plan.replace(/-/g, ' '))}</span>`
    : '<span class="tag pending">no plan</span>'

/** "in 24 days", "12 days ago", or "never" — the useful form of an expiry. */
const expiry = (value) => {
  if (!value) return '<b>never</b>'
  const d = days(value)
  const label = d < 0 ? `${Math.abs(d)} days ago` : d === 0 ? 'today' : `in ${d} days`
  return `${esc(date(value))}<br><span class="note">${esc(label)}</span>`
}

/* ---------------------------------------------------------------- *
 * Overview
 * ---------------------------------------------------------------- */

VIEWS.overview = async () => {
  const data = await api('/admin/overview')
  const box = document.createElement('div')

  const byStatus = {}
  const byPlan = {}
  for (const row of data.subscriptions) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + row.n
    if (row.status === 'active') byPlan[row.plan] = (byPlan[row.plan] ?? 0) + row.n
  }
  const activeCoupons = data.coupons.filter((c) => c.active && c.uses < c.max_uses)
  const placesLeft = activeCoupons.reduce((a, c) => a + (c.max_uses - c.uses), 0)

  box.append(
    el(`<div>
      <p class="sub">Sign-ups, licences and payments · ${esc(when(data.generatedAt))}</p>
      <div class="tiles grid4">
        <div class="tile"><b>${fmt(data.parents.total)}</b><span>Parents signed up</span></div>
        <div class="tile"><b>${fmt(data.parents.new_7d)}</b><span>New this week</span></div>
        <div class="tile"><b>${fmt(byStatus.active ?? 0)}</b><span>Active licences</span></div>
        <div class="tile"><b>${fmt(byPlan['free-forever'] ?? 0)}</b><span>Free families</span></div>
        <div class="tile"><b>${fmt((byPlan.annual ?? 0) + (byPlan.lifetime ?? 0))}</b><span>Paid licences</span></div>
        <div class="tile"><b>${esc(money(data.money.total, data.currency))}</b><span>Taken, all time</span></div>
        <div class="tile"><b>${esc(money(data.money.last_30d, data.currency))}</b><span>Last 30 days</span></div>
        <div class="tile"><b>${fmt(placesLeft)}</b><span>Coupon places left</span></div>
      </div>

      <h2>Needs you</h2>
      <div class="tiles">
        <div class="tile" style="${data.transfersPending ? 'border-color:#7c3aed;box-shadow:0 0 0 2px #ede9fe' : ''}">
          <b>${fmt(data.transfersPending)}</b><span>Transfers to check</span>
        </div>
        <div class="tile"><b>${fmt(byStatus.pending ?? 0)}</b><span>Signed up, no access</span></div>
        <div class="tile"><b>${fmt(byStatus.expired ?? 0)}</b><span>Expired</span></div>
        <div class="tile"><b>${fmt(byStatus.revoked ?? 0)}</b><span>Revoked</span></div>
        <div class="tile"><b>${fmt(data.expiring.length)}</b><span>Expiring in 30 days</span></div>
      </div>
    </div>`),
  )

  const prices = Object.entries(data.prices)
    .filter(([, p]) => p.sellable)
    .map(([id, p]) => `<code>${esc(id)}</code> ${esc(p.label)} — <b>${esc(money(p.amount, data.currency))}</b>`)
    .join(' · ')

  const yes = (on) => (on ? '<span class="tag active">on</span>' : '<span class="tag expired">off</span>')

  box.append(
    el(`<div class="grid2" style="margin-top:1rem">
      <div class="card">
        <h3>Prices in force</h3>
        <p style="margin:0;font-weight:600">${prices || 'No sellable plans configured.'}</p>
        <p class="note">
          Set by <code>PRICE_ANNUAL_MINOR</code> and <code>PRICE_LIFETIME_MINOR</code> in minor
          units (kobo), so ₦5,000 is <code>500000</code>. Nothing in the app can change what is
          charged.
        </p>
      </div>
      <div class="card">
        <h3>Wiring</h3>
        <table>
          <tbody>
            <tr><td>Checkout (Paystack)</td><td>${yes(data.paystack?.configured)}</td></tr>
            <tr><td>Bank transfer</td><td>${yes(data.transfer?.enabled)}</td></tr>
            <tr><td>Email to families (Resend)</td><td>${yes(data.email?.configured)}</td></tr>
            <tr><td>Copies to you</td><td>${yes(data.email?.operator)}</td></tr>
            <tr><td>Renewal warnings</td><td>${yes(data.email?.reminders)}</td></tr>
            <tr>
              <td>Free places on sign-up</td>
              <td>${
                data.signupCoupon
                  ? data.signupCoupon.missing
                    ? '<span class="tag revoked">code missing</span>'
                    : `<span class="tag active">${esc(data.signupCoupon.code)}</span>`
                  : '<span class="tag expired">off</span>'
              }</td>
            </tr>
          </tbody>
        </table>
        ${
          data.signupCoupon && !data.signupCoupon.missing
            ? `<p class="note">
                 ${fmt(data.signupCoupon.max_uses - data.signupCoupon.uses)} of
                 ${fmt(data.signupCoupon.max_uses)} places left. When they run out, sign-ups
                 quietly go back to being a waiting list.
               </p>`
            : data.signupCoupon?.missing
              ? `<p class="note">
                   <code>SIGNUP_COUPON</code> names <code>${esc(data.signupCoupon.code)}</code>, which
                   does not exist — every sign-up is silently getting the waiting-list email. Create
                   it under Coupons, or clear the variable.
                 </p>`
              : `<p class="note">
                   Set <code>SIGNUP_COUPON</code> to a coupon code and the landing-page form claims a
                   free place automatically until they run out. Coupons → <b>first run</b>.
                 </p>`
        }
        ${
          data.email?.configured
            ? `<p class="note">Sending as <code>${esc(data.email.from ?? 'default')}</code>.</p>`
            : `<p class="note">
                 With <code>RESEND_API_KEY</code> unset, no family is ever emailed their code —
                 they only see it on screen. Codes still work; losing one just becomes your
                 problem to solve by hand.
               </p>`
        }
      </div>
    </div>`),
  )

  box.append(el('<h2>Latest sign-ups</h2>'))
  box.append(
    el(`<div class="card scroll">${
      data.recent.length
        ? `<table><thead><tr><th>When</th><th>Email</th><th>Name</th><th>Code</th><th>Plan</th><th>Status</th></tr></thead><tbody>
            ${data.recent
              .map(
                (r) => `<tr>
                  <td>${esc(date(r.created_at))}</td>
                  <td>${esc(r.email)}</td>
                  <td>${esc(r.name ?? '—')}</td>
                  <td><span class="mono">${esc(r.code ?? '—')}</span></td>
                  <td>${planTag(r.plan)}</td>
                  <td>${statusTag(r.status ?? 'pending')}</td>
                </tr>`,
              )
              .join('')}
          </tbody></table>`
        : '<p class="empty">Nobody has signed up yet.</p>'
    }</div>`),
  )

  if (data.expiring.length) {
    box.append(el('<h2>Expiring soon</h2>'))
    box.append(
      el(`<div class="card scroll"><table>
        <thead><tr><th>Code</th><th>Plan</th><th>Expires</th></tr></thead>
        <tbody>${data.expiring
          .map(
            (r) =>
              `<tr><td><span class="mono">${esc(r.code)}</span></td><td>${planTag(r.plan)}</td><td>${expiry(r.expires_at)}</td></tr>`,
          )
          .join('')}</tbody></table></div>`),
    )
  }

  return box
}

/* ---------------------------------------------------------------- *
 * Families
 * ---------------------------------------------------------------- */

let familyQuery = ''
/** The code the first-run button made, so the next step survives a refresh. */
let firstRunNote = null

VIEWS.families = async () => {
  const data = await api(`/admin/families${familyQuery ? `?q=${encodeURIComponent(familyQuery)}` : ''}`)
  const box = document.createElement('div')

  /* Granting access by hand — bank transfers, apologies, and the
     twenty-first family you decide counts anyway. */
  const granter = el(`<div class="card">
    <h3>Give a family access</h3>
    <div class="row">
      <div style="flex:2 1 220px"><label for="g-email">Their email</label><input id="g-email" type="email" placeholder="parent@example.com" /></div>
      <div><label for="g-name">Name (optional)</label><input id="g-name" /></div>
      <div><label for="g-plan">Counts as</label><select id="g-plan">
        <option value="free-forever">Free place</option>
        <option value="annual">Paid</option>
        <option value="lifetime">Paid, lifetime</option>
      </select></div>
      <div><label for="g-months">Access for</label><select id="g-months">
        <option value="">The plan's own length</option>
        <option value="1">1 month</option>
        <option value="3">3 months</option>
        <option value="6">6 months</option>
        <option value="12">12 months</option>
        <option value="24">2 years</option>
        <option value="never">Never expires</option>
      </select></div>
      <div><label for="g-note">Note</label><input id="g-note" placeholder="why" /></div>
      <div style="flex:0 0 auto"><button id="g-go">Grant</button></div>
    </div>
    <p class="note">
      They still need their code to unlock a tablet — it appears in the table below, and in the
      grown-up area once they enter it.
    </p>
  </div>`)
  granter.querySelector('#g-go').onclick = (e) =>
    act(e.target, 'Access granted.', async () => {
      const result = await api('/admin/licence/grant', {
        method: 'POST',
        body: {
          email: granter.querySelector('#g-email').value.trim(),
          name: granter.querySelector('#g-name').value.trim() || undefined,
          plan: granter.querySelector('#g-plan').value,
          /* Undefined means "whatever the plan says", null means never. */
          months: periodValue(granter.querySelector('#g-months').value),
          note: granter.querySelector('#g-note').value.trim() || undefined,
        },
      })
      await copy(result.licence.code)
    })
  box.append(granter)

  const search = el(`<div class="card" style="margin-top:1rem">
    <div class="row">
      <div style="flex:3 1 240px"><label for="q">Search by email, name or code</label><input id="q" value="${esc(familyQuery)}" /></div>
      <div style="flex:0 0 auto"><button class="ghost" id="q-go">Search</button></div>
      <div style="flex:0 0 auto"><button class="ghost" id="q-all">Show all</button></div>
    </div>
  </div>`)
  const runSearch = () => {
    familyQuery = search.querySelector('#q').value.trim()
    reload()
  }
  search.querySelector('#q-go').onclick = runSearch
  search.querySelector('#q').onkeydown = (e) => { if (e.key === 'Enter') runSearch() }
  search.querySelector('#q-all').onclick = () => {
    familyQuery = ''
    reload()
  }
  box.append(search)

  box.append(el(`<h2>${fmt(data.families.length)} famil${data.families.length === 1 ? 'y' : 'ies'}</h2>`))

  if (!data.families.length) {
    box.append(el('<div class="card"><p class="empty">Nothing to show.</p></div>'))
    return box
  }

  const table = el(`<div class="card scroll"><table>
    <thead><tr>
      <th>Parent</th><th>Code</th><th>Plan</th><th>Status</th><th>Expires</th>
      <th class="n">Devices</th><th class="n">Paid</th><th>Actions</th>
    </tr></thead>
    <tbody></tbody>
  </table></div>`)
  const tbody = table.querySelector('tbody')

  for (const f of data.families) {
    const tr = el(`<tr>
      <td>
        <b>${esc(f.email)}</b>
        ${f.name ? `<br><span class="note">${esc(f.name)}</span>` : ''}
        ${f.phone ? `<br><span class="note">${esc(f.phone)}</span>` : ''}
        <br><span class="note">joined ${esc(date(f.created_at))} · via ${esc(f.source ?? '—')}</span>
        ${f.note ? `<br><span class="note">${esc(f.note)}</span>` : ''}
      </td>
      <td><span class="mono">${esc(f.code ?? '—')}</span></td>
      <td>${planTag(f.plan)}${f.coupon_code ? `<br><span class="note">${esc(f.coupon_code)}</span>` : ''}</td>
      <td>${statusTag(f.status ?? 'pending')}<br><span class="note">${esc(f.granted_by ?? '')}</span></td>
      <td>${f.status === 'pending' ? '—' : expiry(f.expires_at)}</td>
      <td class="n">${fmt(f.devices)}${f.lastDevice ? `<br><span class="note">${esc(date(f.lastDevice))}</span>` : ''}</td>
      <td class="n">${f.paid ? esc(money(f.paid, data.currency)) : '—'}</td>
      <td class="acts"></td>
    </tr>`)

    const acts = tr.querySelector('.acts')
    if (f.code) {
      const copyBtn = el('<button class="ghost sm">Copy code</button>')
      copyBtn.onclick = () => copy(f.code)
      acts.append(copyBtn)

      if (f.status !== 'pending' && f.email) {
        /* The commonest support request: a new tablet and a lost code. */
        const mail = el('<button class="ghost sm">Email code</button>')
        mail.onclick = (e) =>
          act(e.target, `Code sent to ${f.email}.`, () =>
            api('/admin/licence/email', { method: 'POST', body: { code: f.code } }),
          )
        acts.append(mail)
      }

      if (f.expires_at) {
        const extendBtn = el('<button class="ghost sm">+1 year</button>')
        extendBtn.onclick = (e) =>
          act(e.target, 'Extended by a year.', () =>
            api('/admin/licence/extend', { method: 'POST', body: { code: f.code, months: 12 } }),
          )
        acts.append(extendBtn)
      }

      if (f.status === 'revoked') {
        const restore = el('<button class="ghost sm">Restore</button>')
        restore.onclick = (e) =>
          act(e.target, 'Restored.', () =>
            api('/admin/licence/restore', { method: 'POST', body: { code: f.code } }),
          )
        acts.append(restore)
      } else if (f.status !== 'pending') {
        const revoke = el('<button class="danger sm">Revoke</button>')
        revoke.onclick = (e) => {
          if (!confirm(`Revoke access for ${f.email}? They keep their progress; new subjects lock again.`)) return
          act(e.target, 'Revoked.', () =>
            api('/admin/licence/revoke', { method: 'POST', body: { code: f.code } }),
          )
        }
        acts.append(revoke)
      }

      if (f.status === 'pending') {
        /* A free year, which is what the site promises the first twenty families.
           For any other length, use "Give a family access" above. */
        const give = el('<button class="sm">Free year</button>')
        give.onclick = (e) =>
          act(e.target, 'Access granted.', () =>
            api('/admin/licence/grant', {
              method: 'POST',
              body: { email: f.email, plan: 'free-forever', months: 12 },
            }),
          )
        acts.append(give)
      }
    }
    tbody.append(tr)
  }

  box.append(table)
  box.append(
    el(`<p class="note">
      Devices is how many tablets have used that code. One or two is a family; twenty is a code
      that has been forwarded, which is worth a conversation rather than an enforcement rule.
    </p>`),
  )
  return box
}

/* ---------------------------------------------------------------- *
 * Transfers — the one tab with work in it
 * ---------------------------------------------------------------- */

VIEWS.transfers = async () => {
  const data = await api('/admin/transfers')
  const box = document.createElement('div')
  const pending = data.transfers.filter((t) => t.status === 'pending')

  box.append(
    el(`<div class="card">
      <h3>How this works</h3>
      <p style="margin:0;font-weight:600">
        A parent transfers the money and tells us. <b>Nothing is granted until you approve here.</b>
        Check the amount against your own bank statement first — the figure below is what
        <em>they say</em> they paid. Approving grants the licence and emails them the code;
        declining emails them a reason they can act on.
      </p>
    </div>`),
  )

  /*
   * The account, in full, at the top of the tab that needs it.
   *
   * The dashboard only ever showed a yes/no for "bank transfer configured",
   * which answers the wrong question: what an operator needs, and what a parent
   * will read out over the phone, is the number itself. Shown here rather than in
   * the health table because this is the page where a transfer is matched against
   * a statement, and it is the same account the website and the app publish.
   */
  const acct = data.transfer ?? {}
  if (acct.enabled) {
    const card = el(`<div class="card" style="border-color:#a7f3d0;background:#f0fdf9">
      <h3>The account parents pay into</h3>
      <table style="margin-top:0.4rem">
        <tbody>
          <tr><th style="width:9rem">Bank</th><td><b>${esc(acct.bank)}</b></td></tr>
          <tr><th>Account name</th><td><b>${esc(acct.accountName)}</b></td></tr>
          <tr><th>Account number</th>
            <td><span class="mono" style="font-size:1.15rem;letter-spacing:0.06em">${esc(acct.accountNumber)}</span></td></tr>
          ${acct.instructions ? `<tr><th>We tell them</th><td>${esc(acct.instructions)}</td></tr>` : ''}
        </tbody>
      </table>
      <div style="margin-top:0.8rem"><button class="ghost sm" id="acct-copy">Copy the number</button></div>
      <p class="note">
        From <code>BANK_NAME</code>, <code>BANK_ACCOUNT_NAME</code> and <code>BANK_ACCOUNT_NUMBER</code>
        on the server. Change them there and every place that shows this changes with it: the grown-up
        area, the website's support section, and here.
      </p>
    </div>`)
    card.querySelector('#acct-copy').onclick = () => copy(acct.accountNumber)
    box.append(card)

    /*
     * The website's donation section, on or off from here.
     *
     * A switch rather than another environment variable: this is a decision that
     * gets reversed, and asking for a redeploy to reverse it is how a section
     * stays up for a month after somebody wanted it down. It shows the same
     * account as above, which is why it lives beside it.
     */
    const on = Boolean(data.donations?.enabled)
    const ask = el(`<div class="card">
      <h3>Asking for donations on the website</h3>
      <p style="margin:0 0 0.8rem;font-weight:600">
        ${on
          ? 'The <b>Help keep it free</b> section is <b>showing</b> on brainy.fortbridge.app, with the account above in it.'
          : 'The <b>Help keep it free</b> section is <b>hidden</b>. Nobody is being asked for anything.'}
      </p>
      <button class="${on ? 'danger' : ''}" id="don-go">${on ? 'Hide it' : 'Show it'}</button>
      <p class="note">
        Takes effect on the next page load, and changes nothing a family has already paid.
        Turning it off does not touch bank transfers for licences.
      </p>
    </div>`)
    ask.querySelector('#don-go').onclick = (e) =>
      act(e.target, on ? 'Hidden from the website.' : 'Showing on the website.', () =>
        api('/admin/settings', { method: 'POST', body: { key: 'donations', on: !on } }),
      )
    box.append(ask)
  } else {
    box.append(
      el(`<div class="card" style="border-color:#fde68a;background:#fffbeb">
        <h3>No account is configured</h3>
        <p style="margin:0;font-weight:600">
          Set <code>BANK_NAME</code>, <code>BANK_ACCOUNT_NAME</code> and
          <code>BANK_ACCOUNT_NUMBER</code> on the server. All three, or the transfer option stays
          hidden from parents and the website's support section says to email us instead.
        </p>
      </div>`),
    )
  }

  box.append(
    el(`<h2>${pending.length ? `${fmt(pending.length)} waiting` : 'Nothing waiting'}</h2>`),
  )

  if (!data.transfers.length) {
    box.append(
      el(`<div class="card"><p class="empty">
        No bank transfers yet. If <code>BANK_NAME</code>, <code>BANK_ACCOUNT_NAME</code> and
        <code>BANK_ACCOUNT_NUMBER</code> are not set, the option is hidden from parents entirely.
      </p></div>`),
    )
    return box
  }

  for (const t of data.transfers) {
    const claimed = money(t.amount, t.currency ?? data.currency)
    const card = el(`<div class="card" style="margin-bottom:1rem${t.status === 'pending' ? '' : ';opacity:0.7'}">
      <div class="row" style="align-items:flex-start">
        <div style="flex:2 1 260px">
          <p style="margin:0;font-weight:800">${esc(t.email)}${t.name ? ` · ${esc(t.name)}` : ''}</p>
          ${t.phone ? `<p class="note" style="margin:0">${esc(t.phone)}</p>` : ''}
          <p class="note" style="margin:0.2rem 0 0">
            sent ${esc(when(t.created_at))}${t.code ? ` · code <span class="mono">${esc(t.code)}</span>` : ''}
          </p>
        </div>
        <div style="flex:1 1 160px">
          <p style="margin:0;font-weight:800">${planTag(t.plan)}</p>
          <p style="margin:0.3rem 0 0;font-size:1.25rem;font-weight:900">${esc(claimed)}</p>
          <p class="note" style="margin:0">they say they paid</p>
        </div>
        <div style="flex:1 1 160px">
          <p class="note" style="margin:0">on ${esc(t.paid_on ? date(t.paid_on) : '—')}</p>
          <p class="note" style="margin:0">from ${esc(t.sender_name ?? '—')}</p>
          <p class="note" style="margin:0">ref ${esc(t.reference ?? '—')}</p>
        </div>
        <div style="flex:0 0 auto">${statusTag(t.status === 'approved' ? 'active' : t.status === 'declined' ? 'revoked' : 'pending')}</div>
      </div>
      ${t.note ? `<p class="note" style="margin-top:0.5rem">“${esc(t.note)}”</p>` : ''}
      <div class="proof" style="margin-top:0.6rem"></div>
      <div class="acts" style="margin-top:0.8rem"></div>
      ${
        t.status !== 'pending'
          ? `<p class="note" style="margin-top:0.6rem">
               ${esc(t.status)} by ${esc(t.reviewed_by ?? '—')} ${esc(when(t.reviewed_at))}
               ${t.decision_note ? `· “${esc(t.decision_note)}”` : ''}
             </p>`
          : ''
      }
    </div>`)

    /* The receipt is fetched per row rather than embedded in the list —
       twenty base64 images would be megabytes of JSON to draw a table. */
    const proofBox = card.querySelector('.proof')
    if (t.has_proof) {
      if (String(t.proof_type).startsWith('image/')) {
        const view = el('<button class="ghost sm">🧾 Show receipt</button>')
        view.onclick = () => {
          view.replaceWith(
            el(`<a href="/api/admin/proof?id=${t.id}" target="_blank" rel="noopener">
                  <img src="/api/admin/proof?id=${t.id}" alt="Receipt"
                       style="max-width:min(420px,100%);border-radius:12px;border:1px solid var(--line)" />
                </a>`),
          )
        }
        proofBox.append(view)
      } else {
        proofBox.append(
          el(`<a class="mono" href="/api/admin/proof?id=${t.id}" target="_blank" rel="noopener">🧾 open receipt (${esc(t.proof_type)})</a>`),
        )
      }
    } else {
      proofBox.append(el('<span class="note">No receipt attached — check the statement by name and date.</span>'))
    }

    const acts = card.querySelector('.acts')
    if (t.status === 'pending') {
      const approve = el('<button class="sm">✓ Confirm and send the code</button>')
      approve.onclick = (e) => {
        if (!confirm(`Confirm ${claimed} received from ${t.email}? This grants the licence and emails their code.`)) return
        act(e.target, `Approved — code emailed to ${t.email}.`, () =>
          api('/admin/transfers/approve', { method: 'POST', body: { id: t.id } }),
        )
      }
      acts.append(approve)

      const decline = el('<button class="danger sm">Decline</button>')
      decline.onclick = (e) => {
        const reason = prompt(
          'What should we tell them? (e.g. "we cannot see the transfer yet", "the amount was short")',
          'We could not find the transfer on our statement yet.',
        )
        if (reason === null) return
        act(e.target, 'Declined — they have been emailed.', () =>
          api('/admin/transfers/decline', { method: 'POST', body: { id: t.id, note: reason } }),
        )
      }
      acts.append(decline)
    }

    box.append(card)
  }

  return box
}

/* ---------------------------------------------------------------- *
 * Coupons
 * ---------------------------------------------------------------- */

VIEWS.coupons = async () => {
  const data = await api('/admin/coupons')
  const box = document.createElement('div')

  /*
   * First run. The twenty free places from prd.md §14.3 are a single
   * twenty-use code plus one environment variable, and doing it by hand is
   * exactly the kind of two-step that gets half-done — the code created and
   * the variable forgotten, so every sign-up quietly gets a waiting-list
   * email instead of a licence.
   */
  const firstRun = el(`<div class="card" style="margin-bottom:1rem;border-color:#c4b5fd">
    <h3>First run — the twenty free places</h3>
    <p style="margin:0 0 0.8rem;font-weight:600">
      Creates one code with twenty uses, a free year each. Then set
      <code>SIGNUP_COUPON</code> to it in Vercel and redeploy, and the landing-page form claims a
      place automatically until they are gone.
    </p>
    <button id="fr-go">Create the twenty free places</button>
    <div id="fr-out"></div>
  </div>`)
  firstRun.querySelector('#fr-go').onclick = (e) =>
    act(e.target, 'Created.', async () => {
      const result = await api('/admin/coupons', {
        method: 'POST',
        body: { plan: 'free-forever', months: 12, maxUses: 20, note: 'the first twenty families' },
      })
      await copy(result.coupon.code)
      /*
       * Held outside the view, because `act` refreshes the tab on success
       * and would throw away anything written into this DOM. The next step
       * is a variable in Vercel, and a toast that vanishes in three seconds
       * is not where you put an instruction someone has to act on.
       */
      firstRunNote = result.coupon.code
    })
  if (firstRunNote) {
    firstRun.querySelector('#fr-out').innerHTML =
      `<p class="ok" style="margin-top:0.8rem">Created <b>${esc(firstRunNote)}</b> and copied it.
       Now set <code>SIGNUP_COUPON=${esc(firstRunNote)}</code> in Vercel and redeploy.</p>`
  }
  box.append(firstRun)

  const maker = el(`<div class="card">
    <h3>Make a code</h3>
    <div class="row">
      <div><label for="c-plan">Counts as</label><select id="c-plan">
        <option value="free-forever">Free place</option>
        <option value="annual">Paid, one year</option>
        <option value="lifetime">Paid, lifetime</option>
      </select></div>
      <div><label for="c-months">Access for</label><select id="c-months">
        <option value="">The plan's own length</option>
        <option value="1">1 month</option>
        <option value="2">2 months</option>
        <option value="3">3 months</option>
        <option value="6">6 months</option>
        <option value="12">12 months</option>
        <option value="18">18 months</option>
        <option value="24">2 years</option>
        <option value="36">3 years</option>
        <option value="custom">Some other number of months…</option>
        <option value="never">Never expires</option>
      </select></div>
      <div id="c-custom-wrap" style="display:none"><label for="c-custom">How many months</label>
        <input id="c-custom" type="number" min="1" max="240" placeholder="e.g. 4" /></div>
      <div><label for="c-uses">How many families</label><input id="c-uses" type="number" min="1" value="1" /></div>
      <div><label for="c-code">Code (blank to generate)</label><input id="c-code" placeholder="FAMILY-2026" /></div>
      <div><label for="c-note">Note</label><input id="c-note" placeholder="first 20 families" /></div>
      <div><label for="c-exp">Usable until</label><input id="c-exp" type="date" /></div>
      <div style="flex:0 0 auto"><button id="c-go">Create</button></div>
    </div>
    <p class="note">
      One code can cover a whole batch — twenty uses is the twenty free families, and each family
      can only claim it once however many times they type it.
    </p>
    <p class="note">
      <b>Counts as</b> is only how it is reported: a free place shows in the free-families tile and gets
      the free-place email, the other two count as paid. <b>Access for</b> is how long it actually lasts,
      and it overrides the plan — so &ldquo;free place&rdquo; for &ldquo;12 months&rdquo; is a free year,
      not a free forever. Access is counted from the day a family redeems the code, not from today.
    </p>
  </div>`)
  /* The custom box only exists once it is asked for. */
  const periodSelect = maker.querySelector('#c-months')
  const customWrap = maker.querySelector('#c-custom-wrap')
  periodSelect.onchange = () => {
    customWrap.style.display = periodSelect.value === 'custom' ? '' : 'none'
  }

  /*
   * Three different things the API needs to be told apart, so they are spelled
   * out here rather than left to a falsy check: `undefined` means "use whatever
   * the plan says", `null` means "never expires", and a number is a number.
   */
  const chosenMonths = () => {
    const value = periodSelect.value
    if (value === '') return undefined
    if (value === 'never') return null
    if (value === 'custom') {
      const n = Number(maker.querySelector('#c-custom').value)
      return Number.isFinite(n) && n > 0 ? Math.min(240, Math.round(n)) : undefined
    }
    return Number(value)
  }

  maker.querySelector('#c-go').onclick = (e) =>
    act(e.target, 'Code created and copied.', async () => {
      const result = await api('/admin/coupons', {
        method: 'POST',
        body: {
          plan: maker.querySelector('#c-plan').value,
          months: chosenMonths(),
          maxUses: Number(maker.querySelector('#c-uses').value || 1),
          code: maker.querySelector('#c-code').value.trim() || undefined,
          note: maker.querySelector('#c-note').value.trim() || undefined,
          expiresAt: maker.querySelector('#c-exp').value || undefined,
        },
      })
      await copy(result.coupon.code)
    })
  box.append(maker)

  box.append(el('<h2>Codes</h2>'))
  if (!data.coupons.length) {
    box.append(el('<div class="card"><p class="empty">No codes yet.</p></div>'))
    return box
  }

  const table = el(`<div class="card scroll"><table>
    <thead><tr>
      <th>Code</th><th>Grants</th><th class="n">Claimed</th><th>Usable until</th><th>Note</th><th>Actions</th>
    </tr></thead><tbody></tbody></table></div>`)
  const tbody = table.querySelector('tbody')

  for (const c of data.coupons) {
    const spent = c.uses >= c.max_uses
    const tr = el(`<tr style="${c.active && !spent ? '' : 'opacity:0.55'}">
      <td><span class="mono">${esc(c.code)}</span>${c.active ? '' : '<br><span class="tag revoked">off</span>'}</td>
      <td>${planTag(c.plan)}<br><span class="note">${esc(grantsFor(c))}</span></td>
      <td class="n">${fmt(c.uses)} / ${fmt(c.max_uses)}</td>
      <td>${c.expires_at ? esc(date(c.expires_at)) : '<b>no limit</b>'}</td>
      <td>${esc(c.note ?? '—')}</td>
      <td class="acts"></td>
    </tr>`)

    const acts = tr.querySelector('.acts')
    const copyBtn = el('<button class="ghost sm">Copy</button>')
    copyBtn.onclick = () => copy(c.code)
    acts.append(copyBtn)

    const toggle = el(`<button class="${c.active ? 'danger' : 'ghost'} sm">${c.active ? 'Turn off' : 'Turn on'}</button>`)
    toggle.onclick = (e) =>
      act(e.target, c.active ? 'Code turned off.' : 'Code turned on.', () =>
        api('/admin/coupons/active', { method: 'POST', body: { code: c.code, active: !c.active } }),
      )
    acts.append(toggle)

    /*
     * Only offered for a coupon nobody has claimed. Once it has been
     * used it is the record behind somebody's access, and the server
     * refuses anyway — showing a button that always fails would be
     * worse than not showing one.
     */
    if (!c.uses && !c.claims) {
      const del = el('<button class="ghost sm">Delete</button>')
      del.onclick = (e) => {
        if (!confirm(`Delete ${c.code}? It has never been used, so nothing depends on it.`)) return
        act(e.target, 'Code deleted.', () =>
          api('/admin/coupons/delete', { method: 'POST', body: { code: c.code } }),
        )
      }
      acts.append(del)
    }

    tbody.append(tr)
  }

  box.append(table)
  return box
}

/* ---------------------------------------------------------------- *
 * Payments
 * ---------------------------------------------------------------- */

VIEWS.payments = async () => {
  const data = await api('/admin/payments')
  const box = document.createElement('div')
  const paid = data.payments.filter((p) => p.status === 'success')
  const total = paid.reduce((a, p) => a + Number(p.amount ?? 0), 0)

  box.append(
    el(`<div class="tiles">
      <div class="tile"><b>${fmt(paid.length)}</b><span>Successful</span></div>
      <div class="tile"><b>${esc(money(total, data.currency))}</b><span>Total taken</span></div>
      <div class="tile"><b>${fmt(data.payments.filter((p) => p.status === 'pending').length)}</b><span>Started, unpaid</span></div>
    </div>`),
  )

  box.append(el('<h2>Transactions</h2>'))
  box.append(
    el(`<div class="card scroll">${
      data.payments.length
        ? `<table><thead><tr><th>When</th><th>Email</th><th>Plan</th><th class="n">Amount</th><th>Status</th><th>How</th><th>Reference</th></tr></thead><tbody>
            ${data.payments
              .map(
                (p) => `<tr>
                  <td>${esc(date(p.paid_at ?? p.created_at))}</td>
                  <td>${esc(p.email ?? '—')}</td>
                  <td>${planTag(p.plan)}</td>
                  <td class="n">${esc(money(p.amount, p.currency ?? data.currency))}</td>
                  <td>${statusTag(p.status === 'success' ? 'active' : p.status === 'pending' ? 'pending' : 'revoked')}
                      <br><span class="note">${esc(p.status)}</span></td>
                  <td>${esc(p.channel ?? '—')}</td>
                  <td><span class="mono">${esc(p.reference)}</span></td>
                </tr>`,
              )
              .join('')}
          </tbody></table>`
        : '<p class="empty">No payments yet. With PAYSTACK_SECRET_KEY unset, checkout is switched off and coupons are the only way in.</p>'
    }</div>`),
  )
  box.append(
    el(`<p class="note">
      Paystack holds the card details and the receipt. What is stored here is an email address, a
      reference, an amount and whether it went through.
    </p>`),
  )
  return box
}

/* ---------------------------------------------------------------- *
 * Usage — the anonymous half, from /api/stats
 * ---------------------------------------------------------------- */

function chart(rows, key, label) {
  const max = Math.max(1, ...rows.map((r) => Number(r[key])))
  const bars = rows
    .map((r) => {
      const v = Number(r[key])
      return `<div style="height:${Math.max(2, (v / max) * 100)}%" data-label="${esc(r.day)}: ${fmt(v)} ${esc(label)}"></div>`
    })
    .join('')
  return `<div class="chart">${bars}</div>
    <div class="axis"><span>${esc(rows[0]?.day ?? '')}</span><span>${esc(rows[rows.length - 1]?.day ?? '')}</span></div>`
}

VIEWS.usage = async () => {
  const data = await api('/stats')
  const box = document.createElement('div')
  const i = data.installs
  const r = data.retention
  const totals = data.daily.reduce(
    (a, d) => ({
      sessions: a.sessions + Number(d.sessions),
      questions: a.questions + Number(d.questions),
      correct: a.correct + Number(d.correct),
      minutes: a.minutes + Number(d.duration_ms) / 60000,
    }),
    { sessions: 0, questions: 0, correct: 0, minutes: 0 },
  )
  const today = data.daily[data.daily.length - 1]

  box.append(
    el(`<div>
      <p class="sub">Only families who opted in · ${esc(when(data.generatedAt))}</p>
      <div class="tiles">
        <div class="tile"><b>${fmt(i.total)}</b><span>Activations</span></div>
        <div class="tile"><b>${fmt(i.children)}</b><span>Children</span></div>
        <div class="tile"><b>${fmt(today ? today.devices : 0)}</b><span>Active today</span></div>
        <div class="tile"><b>${fmt(i.active_7d)}</b><span>Active this week</span></div>
        <div class="tile"><b>${fmt(i.new_7d)}</b><span>New this week</span></div>
        <div class="tile"><b>${pct(r.retained_7d, r.eligible_7d)}</b><span>Back after 1wk</span></div>
      </div>
    </div>`),
  )

  box.append(el('<h2>Devices opening Brainy each day</h2>'))
  box.append(
    el(`<div class="card">${data.daily.length ? chart(data.daily, 'devices', 'devices') : '<p class="empty">No activity yet.</p>'}</div>`),
  )
  box.append(el('<h2>Questions answered each day</h2>'))
  box.append(
    el(`<div class="card">${data.daily.length ? chart(data.daily, 'questions', 'questions') : '<p class="empty">No activity yet.</p>'}</div>`),
  )

  box.append(
    el(`<div class="tiles" style="margin-top:1rem">
      <div class="tile"><b>${fmt(totals.sessions)}</b><span>Quests (30d)</span></div>
      <div class="tile"><b>${fmt(totals.questions)}</b><span>Questions (30d)</span></div>
      <div class="tile"><b>${pct(totals.correct, totals.questions)}</b><span>First-try accuracy</span></div>
      <div class="tile"><b>${fmt(Math.round(totals.minutes))}</b><span>Minutes practised</span></div>
    </div>`),
  )

  box.append(el('<h2>By subject</h2>'))
  box.append(
    el(`<div class="card scroll">${
      data.subjects.length
        ? `<table><thead><tr><th>Subject</th><th class="n">Quests</th><th class="n">Questions</th><th class="n">Accuracy</th></tr></thead><tbody>
            ${data.subjects
              .map(
                (s) =>
                  `<tr><td>${esc(s.subject)}</td><td class="n">${fmt(s.sessions)}</td><td class="n">${fmt(s.questions)}</td><td class="n">${pct(s.correct, s.questions)}</td></tr>`,
              )
              .join('')}
          </tbody></table>`
        : '<p class="empty">No sessions yet.</p>'
    }</div>`),
  )

  box.append(el('<h2>Curriculum and class</h2>'))
  box.append(
    el(`<div class="card scroll">${
      data.split.length
        ? `<table><thead><tr><th>Curriculum</th><th>Class</th><th class="n">Installs</th></tr></thead><tbody>
            ${data.split
              .map((s) => `<tr><td>${esc(s.curriculum)}</td><td>${esc(s.year_band)}</td><td class="n">${fmt(s.installs)}</td></tr>`)
              .join('')}
          </tbody></table>`
        : '<p class="empty">Nothing yet.</p>'
    }</div>`),
  )

  box.append(
    el(`<p class="note">
      A floor, not a total: this covers only the families who opted in, and an install is a browser
      profile rather than a person. It cannot be matched to anybody in Families — deliberately.
    </p>`),
  )
  return box
}

/* ---------------------------------------------------------------- *
 * Feedback and the log
 * ---------------------------------------------------------------- */

VIEWS.feedback = async () => {
  const data = await api('/stats')
  const box = document.createElement('div')
  box.append(el('<h2 style="margin-top:0.5rem">What parents have said</h2>'))
  box.append(
    el(`<div class="card scroll">${
      data.feedback.length
        ? `<table><thead><tr><th>When</th><th>Kind</th><th>Message</th><th>Reply to</th></tr></thead><tbody>
            ${data.feedback
              .map(
                (f) => `<tr>
                  <td>${esc(date(f.created_at))}</td>
                  <td>${esc(f.category ?? '')}</td>
                  <td>${esc(f.message ?? '')}</td>
                  <td>${esc(f.contact ?? '')}</td>
                </tr>`,
              )
              .join('')}
          </tbody></table>`
        : '<p class="empty">No feedback yet.</p>'
    }</div>`),
  )
  return box
}

VIEWS.audit = async () => {
  const data = await api('/admin/audit')
  const box = document.createElement('div')
  box.append(el('<h2 style="margin-top:0.5rem">Every change, and who made it</h2>'))
  box.append(
    el(`<div class="card scroll">${
      data.audit.length
        ? `<table><thead><tr><th>When</th><th>Who</th><th>Did what</th><th>To</th><th>Detail</th></tr></thead><tbody>
            ${data.audit
              .map(
                (a) => `<tr>
                  <td>${esc(when(a.created_at))}</td>
                  <td>${esc(a.actor ?? '—')}</td>
                  <td><span class="mono">${esc(a.action)}</span></td>
                  <td>${esc(a.target ?? '—')}</td>
                  <td>${esc(a.detail ?? '')}</td>
                </tr>`,
              )
              .join('')}
          </tbody></table>`
        : '<p class="empty">Nothing has happened yet.</p>'
    }</div>`),
  )
  box.append(
    el(`<p class="note">
      This is the answer when a parent says they paid and the app disagrees. Grants, extensions,
      revocations and coupon changes all land here.
    </p>`),
  )
  return box
}

/* ---------------------------------------------------------------- *
 * Start
 * ---------------------------------------------------------------- */

api('/admin/me')
  .then((data) => dashboard(data.admin))
  .catch(() => signIn())
