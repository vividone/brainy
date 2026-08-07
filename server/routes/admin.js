/**
 * The admin API — accounts, licences, coupons and money.
 *
 * One function with an internal router rather than a file per endpoint. Two
 * reasons: every one of these needs the same three lines of authentication, and
 * a hosting plan has a serverless-function budget that a dozen one-line files
 * spends for nothing.
 *
 * Reads are lists a person looks at. Writes are the four things that actually
 * change what a family can do — grant, extend, revoke, restore — plus coupons,
 * and every one of them lands in `admin_audit` with who did it. When a parent
 * says "I paid and it says my access ran out", that table is the answer.
 *
 * Deliberately absent: anything that reads a child's work. There is nothing
 * here to read — it never left the tablet.
 */

import { NoDatabase, all, audit, explain, one, query } from '../lib/db.js'
import { FLAG_DEFAULTS, flag, setFlag } from '../lib/settings.js'
import { clip, email as parseEmail, num, pathParts, readJson, searchParams } from '../lib/http.js'
import {
  clearSession,
  issueSession,
  loginBlocked,
  noteFailedLogin,
  readSession,
  requireAdmin,
  seedAdmin,
  sessionSecret,
  verifyPassword,
} from '../lib/auth.js'
import {
  PLANS,
  CURRENCY,
  bankDetails,
  ensureSubscription,
  expireIfDue,
  findOrCreateParent,
  grant,
  isPlan,
  licencePayload,
  normaliseCode,
  randomCoupon,
} from '../lib/licence.js'
import {
  emailConfigured,
  sendLicence,
  sendReceipt,
  sendTransferDeclined,
} from '../lib/email.js'

const LIST_LIMIT = 500

/* ------------------------------------------------------------------ *
 * Sessions
 * ------------------------------------------------------------------ */

async function login(req, res) {
  if (!sessionSecret()) {
    return res.status(503).json({
      ok: false,
      error: 'Set ADMIN_SESSION_SECRET (or ADMIN_TOKEN) on the deployment before signing in.',
    })
  }

  const body = await readJson(req, 8 * 1024).catch(() => ({}))
  const address = parseEmail(body?.email)
  const password = typeof body?.password === 'string' ? body.password : ''

  if (await loginBlocked(req)) {
    return res.status(429).json({ ok: false, error: 'Too many attempts. Try again in a few minutes.' })
  }

  const seed = await seedAdmin()
  const anyAdmin = await one(`select count(*)::int as n from admin_users`)
  if ((anyAdmin?.n ?? 0) === 0) {
    return res.status(503).json({
      ok: false,
      error: `No admin account exists yet — ${seed.reason ?? 'set ADMIN_EMAIL and ADMIN_PASSWORD'}.`,
    })
  }

  const user = address ? await one(`select * from admin_users where email = $1`, [address]) : null
  if (!user || !(await verifyPassword(password, user.pw_hash))) {
    await noteFailedLogin(req)
    // One message for both cases: a different one for "no such account" tells a
    // stranger which addresses are worth guessing a password for.
    return res.status(401).json({ ok: false, error: 'That email and password do not match.' })
  }

  await query(`update admin_users set last_login = now() where id = $1`, [user.id])
  issueSession(req, res, user)
  await audit(user.email, 'admin.login', null, null)
  return res.status(200).json({ ok: true, admin: { email: user.email, name: user.name ?? null } })
}

function logout(req, res) {
  clearSession(res)
  return res.status(200).json({ ok: true })
}

async function me(req, res) {
  const session = await readSession(req)
  if (!session) return res.status(401).json({ ok: false, error: 'Not signed in.' })
  return res.status(200).json({ ok: true, admin: session })
}

/* ------------------------------------------------------------------ *
 * Reads
 * ------------------------------------------------------------------ */

/**
 * The numbers on the front page.
 *
 * Sign-ups, what each family is on, and what has actually been paid — the three
 * questions the old usage dashboard could not answer because it had no idea who
 * anybody was.
 */
async function overview(req, res) {
  /*
   * Windows are computed here rather than as `now() - interval '7 days'`. Two
   * reasons: the boundaries then match the ones every other route reasons
   * about instead of depending on the database's clock and time zone, and
   * intervals are among the things the in-memory Postgres in the smoke test
   * does not implement — so this stays a query that is actually tested.
   */
  const ago = (n) => new Date(Date.now() - n * 86_400_000).toISOString()
  const ahead = (n) => new Date(Date.now() + n * 86_400_000).toISOString()

  const parents = await one(
    `select count(*)::int                             as total,
            count(*) filter (where created_at >= $1)::int as new_7d,
            count(*) filter (where created_at >= $2)::int as new_30d,
            coalesce(sum(children), 0)::int           as children
     from parents`,
    [ago(7), ago(30)],
  )

  const subs = await all(`
    select plan, status, count(*)::int as n
    from subscriptions
    group by plan, status
    order by n desc
  `)

  const expiring = await all(
    `select code, plan, expires_at
     from subscriptions
     where status = 'active' and expires_at is not null and expires_at <= $1
     order by expires_at
     limit 20`,
    [ahead(30)],
  )

  const money = await one(
    `select coalesce(sum(amount), 0)::bigint as total,
            count(*)::int                    as payments,
            coalesce(sum(amount) filter (where paid_at >= $1), 0)::bigint as last_30d
     from payments
     where status = 'success'`,
    [ago(30)],
  )

  const coupons = await all(`
    select code, plan, months, max_uses, uses, active, expires_at, note
    from coupons
    order by created_at desc
    limit 50
  `)

  const recent = await all(`
    select p.email, p.name, p.created_at, s.code, s.plan, s.status, s.source, s.expires_at
    from parents p
    left join subscriptions s on s.parent_id = p.id
    order by p.created_at desc
    limit 10
  `)

  /* Bank transfers are the only thing here that needs a human today, so the
     count belongs on the front page rather than one tab in. */
  const waiting = await one(
    `select count(*)::int as pending from payment_requests where status = 'pending'`,
  )

  /*
   * Whether the free-places promise is actually wired, and how many are left.
   * `SIGNUP_COUPON` naming a code that does not exist is a silent failure
   * otherwise — every sign-up would quietly get the holding email instead.
   */
  const signupCode = normaliseCode(process.env.SIGNUP_COUPON)
  const signupCoupon = signupCode
    ? ((await one(`select code, plan, uses, max_uses, active from coupons where code = $1`, [signupCode])) ?? {
        code: signupCode,
        missing: true,
      })
    : null

  return res.status(200).json({
    ok: true,
    generatedAt: new Date().toISOString(),
    currency: CURRENCY(),
    /*
     * Surfaced because a missing key is silent otherwise: codes would still be
     * shown on screen, families would still be created, and nobody would notice
     * that not one of them was ever emailed.
     */
    email: {
      configured: emailConfigured(),
      from: emailConfigured() ? (process.env.EMAIL_FROM ?? null) : null,
      operator: Boolean(process.env.OPERATOR_EMAIL),
      reminders: Boolean(process.env.CRON_SECRET),
    },
    paystack: { configured: Boolean(process.env.PAYSTACK_SECRET_KEY) },
    transfer: bankDetails(),
    donations: { enabled: await flag('donations') },
    transfersPending: waiting?.pending ?? 0,
    signupCoupon,
    prices: Object.fromEntries(
      Object.entries(PLANS).map(([id, plan]) => [
        id,
        { label: plan.label, amount: plan.amount, months: plan.months, sellable: plan.sellable },
      ]),
    ),
    parents,
    subscriptions: subs,
    expiring,
    money,
    coupons,
    recent,
  })
}

/**
 * Every family, with what they are on and how far it has spread.
 *
 * Three queries stitched together rather than one with correlated subqueries:
 * the counts are per-code and per-parent aggregates, and doing them separately
 * keeps each query something the in-memory Postgres in the smoke test can
 * actually run — which is the difference between this being tested and not.
 */
async function families(req, res) {
  const params = searchParams(req)
  const q = clip(params.get('q'), 80)
  const limit = Math.min(num(params.get('limit'), LIST_LIMIT, 200) || 200, LIST_LIMIT)

  const rows = q
    ? await all(
        `select p.id, p.email, p.name, p.phone, p.country, p.children, p.source, p.note, p.created_at,
                s.code, s.plan, s.status, s.source as granted_by, s.coupon_code,
                s.started_at, s.expires_at, s.note as licence_note
         from parents p
         left join subscriptions s on s.parent_id = p.id
         where lower(p.email) like $1 or lower(coalesce(p.name, '')) like $1 or upper(coalesce(s.code, '')) like $2
         order by p.created_at desc
         limit $3`,
        [`%${q.toLowerCase()}%`, `%${q.toUpperCase()}%`, limit],
      )
    : await all(
        `select p.id, p.email, p.name, p.phone, p.country, p.children, p.source, p.note, p.created_at,
                s.code, s.plan, s.status, s.source as granted_by, s.coupon_code,
                s.started_at, s.expires_at, s.note as licence_note
         from parents p
         left join subscriptions s on s.parent_id = p.id
         order by p.created_at desc
         limit $1`,
        [limit],
      )

  const devices = await all(
    `select code, count(*)::int as devices, max(last_seen) as last_seen
     from licence_devices group by code`,
  )
  const paid = await all(
    `select parent_id, coalesce(sum(amount), 0)::bigint as paid, count(*)::int as payments
     from payments where status = 'success' group by parent_id`,
  )

  const byCode = new Map(devices.map((d) => [d.code, d]))
  const byParent = new Map(paid.map((p) => [String(p.parent_id), p]))

  return res.status(200).json({
    ok: true,
    currency: CURRENCY(),
    families: rows.map((r) => ({
      ...r,
      devices: byCode.get(r.code)?.devices ?? 0,
      lastDevice: byCode.get(r.code)?.last_seen ?? null,
      paid: Number(byParent.get(String(r.id))?.paid ?? 0),
      payments: byParent.get(String(r.id))?.payments ?? 0,
    })),
  })
}

async function coupons(req, res) {
  const rows = await all(`
    select c.code, c.plan, c.months, c.max_uses, c.uses, c.active, c.note,
           c.expires_at, c.created_by, c.created_at
    from coupons c
    order by c.active desc, c.created_at desc
    limit 200
  `)
  const claims = await all(
    `select coupon_code, count(*)::int as claims from redemptions group by coupon_code`,
  )
  const byCode = new Map(claims.map((c) => [c.coupon_code, c.claims]))
  return res.status(200).json({
    ok: true,
    coupons: rows.map((r) => ({ ...r, claims: byCode.get(r.code) ?? 0 })),
  })
}

async function payments(req, res) {
  const rows = await all(`
    select y.reference, y.plan, y.amount, y.currency, y.status, y.channel, y.paid_at, y.created_at,
           p.email
    from payments y
    left join parents p on p.id = y.parent_id
    order by y.created_at desc
    limit 200
  `)
  return res.status(200).json({ ok: true, currency: CURRENCY(), payments: rows })
}

/**
 * Bank transfers waiting to be checked, newest first.
 *
 * The proof image is deliberately *not* in this response — a list of twenty
 * requests would be twenty base64 images, several megabytes of JSON to render a
 * table. It is fetched per row by `GET proof` when somebody actually looks.
 */
async function transfers(req, res) {
  const status = clip(searchParams(req).get('status'), 20)
  const rows = await all(
    `select r.id, r.plan, r.amount, r.currency, r.reference, r.sender_name, r.paid_on, r.note,
            r.status, r.reviewed_by, r.reviewed_at, r.decision_note, r.created_at,
            r.proof_type, (r.proof is not null) as has_proof,
            p.email, p.name, p.phone, s.code, s.status as licence_status, s.plan as licence_plan
     from payment_requests r
     join parents p on p.id = r.parent_id
     left join subscriptions s on s.parent_id = p.id
     where ($1 = '' or r.status = $1)
     order by case when r.status = 'pending' then 0 else 1 end, r.created_at desc
     limit 200`,
    [status ?? ''],
  )
  /* The account itself travels with the queue, because checking a transfer means
     reading the two side by side, and an operator who has to go and find the
     account number elsewhere is an operator who eventually checks it against the
     wrong one. */
  return res.status(200).json({
    ok: true,
    currency: CURRENCY(),
    transfer: bankDetails(),
    donations: { enabled: await flag('donations') },
    transfers: rows,
  })
}

/**
 * The receipt a parent attached.
 *
 * Served through the admin guard rather than from a public URL, because it is a
 * bank document with somebody's name and account on it. `Cache-Control: private,
 * no-store` so it does not sit in a shared proxy or a browser cache after
 * sign-out.
 */
async function proof(req, res) {
  const id = num(searchParams(req).get('id'), 1e12, 0)
  if (!id) return res.status(400).json({ ok: false, error: 'Which request?' })

  const row = await one(`select proof, proof_type from payment_requests where id = $1`, [id])
  if (!row?.proof) return res.status(404).json({ ok: false, error: 'No receipt attached.' })

  const buffer = Buffer.from(row.proof, 'base64')
  res.setHeader('Content-Type', row.proof_type || 'application/octet-stream')
  res.setHeader('Content-Length', String(buffer.length))
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Content-Disposition', 'inline')
  return res.status(200).end(buffer)
}

/**
 * Approve a transfer: grant the licence, then email the code.
 *
 * Approving is what *creates* the entitlement — the parent's claim never did —
 * so the order matters. The grant is recorded first and the email second, because
 * a family with access and no email can be helped in one click, while an email
 * promising access that was never granted is a support conversation that starts
 * with an apology.
 */
async function approveTransfer(req, admin, res) {
  const body = await readJson(req, 8 * 1024).catch(() => ({}))
  const id = num(body?.id, 1e12, 0)
  if (!id) return res.status(400).json({ ok: false, error: 'Which request?' })

  const request = await one(`select * from payment_requests where id = $1`, [id])
  if (!request) return res.status(404).json({ ok: false, error: 'No such request.' })
  if (request.status !== 'pending') {
    return res.status(409).json({ ok: false, error: `That request was already ${request.status}.` })
  }

  const parent = await one(`select * from parents where id = $1`, [request.parent_id])
  const subscription = await ensureSubscription(request.parent_id)

  /* The plan they asked for, unless you override it — a family who paid for a
     year and asked for lifetime by mistake is one dropdown away from being fixed. */
  const plan = isPlan(clip(body?.plan, 24) ?? '') ? clip(body.plan, 24) : request.plan
  const months = monthsFor(plan, body?.months)

  const updated = await grant({
    subscription,
    plan,
    months,
    source: 'transfer',
    note: `bank transfer ${Number(request.amount) / 100} ${request.currency ?? ''} ${request.reference ?? ''}`.trim(),
  })

  await query(
    `update payment_requests set status = 'approved', reviewed_by = $2, reviewed_at = now(), decision_note = $3
     where id = $1`,
    [id, admin.email, clip(body?.note, 400)],
  )

  /* A real payment, so it belongs in the money figures alongside the card ones. */
  await query(
    `insert into payments (parent_id, reference, provider, plan, amount, currency, status, channel, paid_at)
     values ($1, $2, 'transfer', $3, $4, $5, 'success', 'bank transfer', now())
     on conflict (reference) do nothing`,
    [request.parent_id, `transfer_${id}`, plan, request.amount, request.currency ?? CURRENCY()],
  )

  await audit(admin.email, 'transfer.approved', parent?.email ?? String(id), `${plan} · ${request.amount}`)

  const licence = licencePayload(updated, parent)
  const sent = await sendReceipt(licence, {
    reference: request.reference || `transfer ${id}`,
    plan,
    amount: request.amount,
    currency: request.currency ?? CURRENCY(),
  })

  return res.status(200).json({ ok: true, licence, emailed: Boolean(sent?.ok) })
}

/** Decline a transfer, with a reason the parent can act on. */
async function declineTransfer(req, admin, res) {
  const body = await readJson(req, 8 * 1024).catch(() => ({}))
  const id = num(body?.id, 1e12, 0)
  if (!id) return res.status(400).json({ ok: false, error: 'Which request?' })

  const request = await one(`select * from payment_requests where id = $1`, [id])
  if (!request) return res.status(404).json({ ok: false, error: 'No such request.' })
  if (request.status !== 'pending') {
    return res.status(409).json({ ok: false, error: `That request was already ${request.status}.` })
  }

  const parent = await one(`select * from parents where id = $1`, [request.parent_id])
  const reason = clip(body?.note, 400)

  await query(
    `update payment_requests set status = 'declined', reviewed_by = $2, reviewed_at = now(), decision_note = $3
     where id = $1`,
    [id, admin.email, reason],
  )
  await audit(admin.email, 'transfer.declined', parent?.email ?? String(id), reason ?? null)

  const sent = await sendTransferDeclined(
    {
      email: parent?.email,
      name: parent?.name,
      plan: request.plan,
      planLabel: PLANS[request.plan]?.label,
    },
    reason,
  )

  return res.status(200).json({ ok: true, emailed: Boolean(sent?.ok) })
}

async function auditLog(req, res) {
  const rows = await all(
    `select actor, action, target, detail, created_at from admin_audit order by id desc limit 200`,
  )
  return res.status(200).json({ ok: true, audit: rows })
}

/* ------------------------------------------------------------------ *
 * Writes
 * ------------------------------------------------------------------ */

/** Months for a plan, allowing an explicit override for an odd case. */
function monthsFor(plan, given) {
  if (given === null) return null
  if (given !== undefined && given !== '') {
    const n = num(given, 240, 0)
    return n > 0 ? n : null
  }
  return PLANS[plan]?.months ?? null
}

async function createCoupon(req, admin, res) {
  const body = await readJson(req, 8 * 1024).catch(() => ({}))
  const plan = clip(body?.plan, 24) ?? 'free-forever'
  if (!isPlan(plan)) return res.status(400).json({ ok: false, error: 'Unknown plan.' })

  const code = normaliseCode(body?.code) ?? randomCoupon(plan)
  const months = monthsFor(plan, body?.months)
  const maxUses = Math.max(1, num(body?.maxUses, 10_000, 1))
  const expiresAt = body?.expiresAt ? new Date(body.expiresAt) : null
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return res.status(400).json({ ok: false, error: 'That expiry date is not a date.' })
  }

  const existing = await one(`select code from coupons where code = $1`, [code])
  if (existing) return res.status(409).json({ ok: false, error: 'That code already exists.' })

  const row = await one(
    `insert into coupons (code, plan, months, max_uses, note, expires_at, created_by)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning *`,
    [code, plan, months, maxUses, clip(body?.note, 200), expiresAt, admin.email],
  )
  await audit(admin.email, 'coupon.created', code, `${plan} · ${maxUses} use(s)`)
  return res.status(200).json({ ok: true, coupon: row })
}

/**
 * Flip one of the dashboard switches.
 *
 * Only the flags this build knows about, by name, so a typo cannot write a row
 * nothing ever reads and leave somebody believing they turned something off.
 */
async function setSetting(req, admin, res) {
  const body = await readJson(req, 4 * 1024).catch(() => ({}))
  const key = clip(body?.key, 40)
  if (!key || !Object.hasOwn(FLAG_DEFAULTS, key)) {
    return res.status(400).json({ ok: false, error: 'Unknown setting.' })
  }
  const on = Boolean(body?.on)
  await setFlag(key, on, admin.email)
  await audit(admin.email, 'setting.changed', key, on ? 'on' : 'off')
  return res.status(200).json({ ok: true, key, enabled: on })
}

/**
 * Delete a coupon outright.
 *
 * Refused once anybody has redeemed it, and that is the whole design. A
 * redeemed coupon is the paper trail behind somebody's access: `subscriptions`
 * records which code granted it and `redemptions` records who used it, so
 * removing the row would leave a family holding access nothing explains — and
 * for a first-twenty family that access is meant to be permanent. Deactivating
 * stops all future use and costs nothing, so that is what we offer instead.
 *
 * An unused coupon has no such history and is simply a mistake to be tidied
 * away.
 */
async function deleteCoupon(req, admin, res) {
  const body = await readJson(req, 8 * 1024).catch(() => ({}))
  const code = normaliseCode(body?.code)
  if (!code) return res.status(400).json({ ok: false, error: 'Which code?' })

  const row = await one(`select * from coupons where code = $1`, [code])
  if (!row) return res.status(404).json({ ok: false, error: 'No such code.' })

  const claimed = await one(`select count(*)::int as n from redemptions where coupon_code = $1`, [code])
  const granted = await one(`select count(*)::int as n from subscriptions where coupon_code = $1`, [code])
  const used = (claimed?.n ?? 0) + (granted?.n ?? 0)
  if (used > 0 || (row.uses ?? 0) > 0) {
    return res.status(409).json({
      ok: false,
      error: `${code} has already been used, so deleting it would leave a family with access nothing explains. Switch it off instead — that stops any further use.`,
    })
  }

  await query(`delete from coupons where code = $1`, [code])
  await audit(admin.email, 'coupon.deleted', code, `plan ${row.plan}, ${row.max_uses} uses, never claimed`)
  return res.status(200).json({ ok: true, deleted: code })
}

async function setCouponActive(req, admin, res) {
  const body = await readJson(req, 8 * 1024).catch(() => ({}))
  const code = normaliseCode(body?.code)
  const active = Boolean(body?.active)
  if (!code) return res.status(400).json({ ok: false, error: 'Which code?' })

  const row = await one(`update coupons set active = $2 where code = $1 returning *`, [code, active])
  if (!row) return res.status(404).json({ ok: false, error: 'No such code.' })
  await audit(admin.email, active ? 'coupon.enabled' : 'coupon.disabled', code, null)
  return res.status(200).json({ ok: true, coupon: row })
}

/**
 * Give a family access directly.
 *
 * The manual path matters more than it looks: somebody pays by bank transfer,
 * somebody's card fails three times and you have had enough, somebody is the
 * twenty-first family and you decide they count. Without this the answer to all
 * three is "write some SQL", and that is how mistakes get made at the point
 * money is involved.
 */
async function grantAccess(req, admin, res) {
  const body = await readJson(req, 8 * 1024).catch(() => ({}))
  const address = parseEmail(body?.email)
  if (!address) return res.status(400).json({ ok: false, error: 'An email address is needed.' })

  const plan = clip(body?.plan, 24) ?? 'free-forever'
  if (!isPlan(plan)) return res.status(400).json({ ok: false, error: 'Unknown plan.' })

  const parent = await findOrCreateParent({
    email: address,
    name: clip(body?.name, 80),
    phone: clip(body?.phone, 32),
    children: num(body?.children, 20, 1),
    source: 'admin',
    note: clip(body?.note, 400),
  })
  const subscription = await ensureSubscription(parent.id)
  const months = monthsFor(plan, body?.months)

  const updated = await grant({
    subscription,
    plan,
    months,
    source: 'admin',
    note: clip(body?.note, 200),
  })
  await audit(admin.email, 'licence.granted', address, `${plan} · ${months ?? 'no'} months`)

  const licence = licencePayload(updated, parent)
  /*
   * Send them the code unless told not to.
   *
   * A grant made by hand is usually the end of a conversation — a bank transfer,
   * an apology, a family you decided counts — and the code is the point of it, so
   * emailing it is the default. `notify: false` covers the case where you are
   * already replying to them yourself and a second email would be noise.
   */
  const sent = body?.notify === false ? { skipped: true } : await sendLicence(licence, {
    reason: plan === 'free-forever' ? 'free-place' : undefined,
  })

  return res.status(200).json({ ok: true, licence, emailed: Boolean(sent?.ok) })
}

async function extend(req, admin, res) {
  const body = await readJson(req, 8 * 1024).catch(() => ({}))
  const code = normaliseCode(body?.code)
  const months = Math.max(1, num(body?.months, 240, 12))
  if (!code) return res.status(400).json({ ok: false, error: 'Which code?' })

  const sub = await one(`select * from subscriptions where code = $1`, [code])
  if (!sub) return res.status(404).json({ ok: false, error: 'No such code.' })
  if (sub.expires_at === null && sub.status === 'active') {
    return res.status(409).json({ ok: false, error: 'That licence never expires — there is nothing to extend.' })
  }

  const updated = await grant({
    subscription: sub,
    plan: sub.plan === 'none' ? 'annual' : sub.plan,
    months,
    source: 'admin',
  })
  await audit(admin.email, 'licence.extended', code, `+${months} months`)

  const parent = await one(`select * from parents where id = $1`, [sub.parent_id])
  const licence = licencePayload(updated, parent)
  /* Worth telling them: an extension they do not know about is one they may pay
     for again. Reuses the licence email, whose body already states the new run. */
  if (body?.notify !== false) await sendLicence(licence)

  /* Extending clears any renewal warning, so the next one can be sent in time. */
  await query(`delete from reminders where code = $1 and kind = 'expiring'`, [code])

  return res.status(200).json({ ok: true, licence })
}

async function setStatus(req, admin, res, status) {
  const body = await readJson(req, 8 * 1024).catch(() => ({}))
  const code = normaliseCode(body?.code)
  if (!code) return res.status(400).json({ ok: false, error: 'Which code?' })

  const sub = await one(`select * from subscriptions where code = $1`, [code])
  if (!sub) return res.status(404).json({ ok: false, error: 'No such code.' })

  /*
   * Restoring re-derives the status from the dates rather than assuming
   * `active`: un-revoking a licence whose year ran out last month should leave
   * it expired, not hand back five weeks nobody paid for.
   */
  const resolved =
    status === 'active' && sub.expires_at && new Date(sub.expires_at).getTime() <= Date.now()
      ? 'expired'
      : status

  const updated = await one(
    `update subscriptions set status = $2, updated_at = now() where id = $1 returning *`,
    [sub.id, resolved],
  )
  await audit(admin.email, `licence.${status === 'revoked' ? 'revoked' : 'restored'}`, code, resolved)
  return res.status(200).json({ ok: true, licence: licencePayload(updated, null) })
}

/**
 * Send a family their code again.
 *
 * The commonest support request there will ever be — "I have a new tablet and I
 * cannot find the code" — and without this the answer is copying it out of a
 * table and into a mail client by hand, which is how a code reaches the wrong
 * person.
 */
async function emailLicence(req, admin, res) {
  const body = await readJson(req, 8 * 1024).catch(() => ({}))
  const code = normaliseCode(body?.code)
  if (!code) return res.status(400).json({ ok: false, error: 'Which code?' })

  const sub = await expireIfDue(await one(`select * from subscriptions where code = $1`, [code]))
  if (!sub) return res.status(404).json({ ok: false, error: 'No such code.' })
  const parent = await one(`select * from parents where id = $1`, [sub.parent_id])
  if (!parent?.email) return res.status(409).json({ ok: false, error: 'That family has no email address.' })

  const licence = licencePayload(sub, parent)
  if (!licence.full) {
    /* Sending "here is your code, everything is open" to a family whose licence
       has lapsed or been revoked would be a lie in writing. */
    return res.status(409).json({
      ok: false,
      error: `That licence is ${licence.status}, so there is nothing to send. Grant or restore it first.`,
    })
  }

  const sent = await sendLicence(licence)
  await audit(admin.email, 'licence.emailed', parent.email, sent.ok ? 'sent' : (sent.error ?? 'failed'))
  if (!sent.ok) {
    return res.status(502).json({
      ok: false,
      error: sent.skipped ? 'Email is not configured on this deployment.' : `Could not send: ${sent.error}`,
    })
  }
  return res.status(200).json({ ok: true, to: parent.email })
}

/**
 * A family's own licence, looked up by code — the "what does this parent
 * actually see?" question, answered from the same function the app calls.
 */
async function lookup(req, res) {
  const code = normaliseCode(searchParams(req).get('code'))
  if (!code) return res.status(400).json({ ok: false, error: 'No code given.' })
  const sub = await expireIfDue(await one(`select * from subscriptions where code = $1`, [code]))
  if (!sub) return res.status(404).json({ ok: false, error: 'No such code.' })
  const parent = await one(`select * from parents where id = $1`, [sub.parent_id])
  const devices = await all(
    `select install_id, first_seen, last_seen from licence_devices where code = $1 order by last_seen desc limit 50`,
    [code],
  )
  return res.status(200).json({ ok: true, licence: licencePayload(sub, parent), devices })
}

/* ------------------------------------------------------------------ *
 * Router
 * ------------------------------------------------------------------ */

export default async function handler(req, res) {
  /*
   * The sub-route arrives as ?path=coupons/active, put there by the rewrite in
   * vercel.json.
   *
   * This used to be a `[...path].js` catch-all, which read well and did not
   * work: Vercel routed one segment to it and answered its own 404 for
   * anything deeper, so every two-part route — coupons/active, licence/grant,
   * transfers/approve — was dead in production while passing every local test,
   * because the failure was in the platform's routing and never reached our
   * code. An explicit rewrite onto an ordinary file depends on nothing clever.
   *
   * pathParts is still the fallback so a direct hit on /api/admin/... keeps
   * working, which is what `vercel dev` and the smoke test do.
   */
  const declared = searchParams(req).get('path')
  const parts = declared ? declared.split('/').filter(Boolean) : pathParts(req, 'admin/')
  const route = `${req.method} ${parts.join('/')}`

  try {
    /* The only two that do not need a session. */
    if (route === 'POST login') return await login(req, res)
    if (route === 'POST logout') return logout(req, res)
    if (route === 'GET me') return me(req, res)

    const admin = await requireAdmin(req, res)
    if (!admin) return

    switch (route) {
      case 'GET overview':
        return await overview(req, res)
      case 'GET families':
        return await families(req, res)
      case 'GET coupons':
        return await coupons(req, res)
      case 'GET payments':
        return await payments(req, res)
      case 'GET audit':
        return await auditLog(req, res)
      case 'GET licence':
        return await lookup(req, res)
      case 'GET transfers':
        return await transfers(req, res)
      case 'GET proof':
        return await proof(req, res)

      case 'POST transfers/approve':
        return await approveTransfer(req, admin, res)
      case 'POST transfers/decline':
        return await declineTransfer(req, admin, res)

      case 'POST settings':
        return await setSetting(req, admin, res)

      case 'POST coupons':
        return await createCoupon(req, admin, res)
      case 'POST coupons/active':
        return await setCouponActive(req, admin, res)
      case 'POST coupons/delete':
        return await deleteCoupon(req, admin, res)
      case 'POST licence/grant':
        return await grantAccess(req, admin, res)
      case 'POST licence/extend':
        return await extend(req, admin, res)
      case 'POST licence/email':
        return await emailLicence(req, admin, res)
      case 'POST licence/revoke':
        return await setStatus(req, admin, res, 'revoked')
      case 'POST licence/restore':
        return await setStatus(req, admin, res, 'active')

      default:
        return res.status(404).json({ ok: false, error: `No admin route for ${route}.` })
    }
  } catch (err) {
    if (err instanceof NoDatabase) {
      return res.status(503).json({
        ok: false,
        error: 'DATABASE_URL is not set on this deployment.',
        hint: 'Set the pooled connection string, then redeploy.',
      })
    }
    console.error('[brainy:admin]', err)
    return res.status(500).json({
      ok: false,
      error: explain(err),
      hint: 'Check DATABASE_URL is the pooled connection string, then redeploy.',
    })
  }
}
