/**
 * Postgres access shared by the API routes.
 *
 * Chosen over Redis because the same database has to carry Paystack
 * licences, payments and webhook state later, and migrating analytics off a
 * key-value store once real money depends on it would be the wrong order to
 * do things in.
 *
 * Point DATABASE_URL at a **pooled** connection string — Neon, Vercel
 * Postgres and Supabase all provide one. A serverless function can be
 * cold-started per request, so an unpooled connection exhausts the server's
 * slots quickly under any real traffic.
 */

import pg from 'pg'

let pool
let ready

/**
 * Whether to negotiate TLS, and how.
 *
 * TLS on by default for anything not local, because the alternative on a hosted
 * database is credentials in clear text. Certificates are not verified: managed
 * providers routinely serve certs signed by their own authority, and a verify
 * failure here would present as "the database is down".
 *
 * `sslmode=disable` in the URL is honoured, because some Postgres images — a few
 * Railway templates among them — are built without TLS support at all, and
 * insisting on it produces "the server does not support SSL connections" and a
 * long search for a problem that is one query parameter.
 */
function sslFor(url) {
  if (/[?&]sslmode=disable/.test(url)) return false
  if (/@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url)) return false
  return { rejectUnauthorized: false }
}

export function db() {
  if (!process.env.DATABASE_URL) return null
  pool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    ssl: sslFor(process.env.DATABASE_URL),
  })
  return pool
}

/**
 * Create the tables on first use.
 *
 * Deliberately idempotent and run inline rather than as a migration step:
 * there is one deploy target and a handful of tables, and a missing migration
 * run is a worse failure mode than a few wasted milliseconds.
 */
export async function ensureSchema() {
  const p = db()
  if (!p) return false
  /*
   * Caching the promise is what makes this cheap on warm invocations, but a
   * cached *rejected* promise would poison every later request in the same
   * container — one transient connection blip and the endpoint stays broken
   * until the next deploy. Clear it on failure so the next call retries.
   */
  ready ??= p
    .query(`
    create table if not exists installs (
      id           text primary key,
      first_seen   date not null default current_date,
      last_seen    date not null default current_date,
      curriculum   text,
      year_band    text,
      children     int,
      app_version  text
    );

    create table if not exists events (
      id          bigserial primary key,
      install_id  text,
      day         date not null,
      kind        text not null,
      subject     text,
      questions   int  not null default 0,
      correct     int  not null default 0,
      duration_ms int  not null default 0,
      created_at  timestamptz not null default now()
    );
    create index if not exists events_day_idx  on events (day);
    create index if not exists events_kind_idx on events (kind);

    create table if not exists summaries (
      id          bigserial primary key,
      install_id  text,
      week        text,
      app_version text,
      body        text not null,
      created_at  timestamptz not null default now()
    );

    create table if not exists feedback (
      id          bigserial primary key,
      install_id  text,
      category    text,
      message     text not null,
      contact     text,
      summary     text,
      app_version text,
      created_at  timestamptz not null default now()
    );

    /*
     * Accounts and money.
     *
     * A parent is the only person with an identity here. Children are never
     * rows: no name, no age, no answers. The link between a paying adult and
     * a playing child is the access code, and it stops at the device.
     */
    create table if not exists parents (
      id          bigserial primary key,
      email       text not null unique,
      name        text,
      phone       text,
      country     text,
      children    int  not null default 1,
      /* Where they came from: 'site', 'app' or 'admin'. */
      source      text not null default 'site',
      note        text,
      created_at  timestamptz not null default now()
    );

    /*
     * Coupons are the codes handed out — one code can cover many families
     * (the first-20 batch is a single code with 20 uses), which is why uses
     * are counted here and each redemption is recorded separately.
     */
    create table if not exists coupons (
      code        text primary key,
      /* 'free-forever' | 'annual' | 'lifetime' */
      plan        text not null,
      /* How long it grants. null means it never expires. */
      months      int,
      max_uses    int  not null default 1,
      uses        int  not null default 0,
      note        text,
      active      boolean not null default true,
      expires_at  timestamptz,
      created_by  text,
      created_at  timestamptz not null default now()
    );

    /*
     * One row per family. The code is what a parent types into the app, and is
     * the only thing that travels between the two halves of the product.
     *
     * expires_at null means "never" — a free-forever family and a lifetime
     * buyer are the same shape, which is deliberate: the first 20 families
     * were promised permanence, so it must not be a special case that a
     * later cleanup job can quietly get wrong.
     */
    create table if not exists subscriptions (
      id          bigserial primary key,
      parent_id   bigint not null references parents (id),
      code        text not null unique,
      /* 'none' until something grants access, then the plan that did. */
      plan        text not null default 'none',
      /* 'pending' | 'active' | 'expired' | 'revoked' */
      status      text not null default 'pending',
      /* What granted it: 'signup' | 'coupon' | 'paystack' | 'admin' */
      source      text not null default 'signup',
      coupon_code text,
      children    int  not null default 1,
      started_at  timestamptz,
      expires_at  timestamptz,
      note        text,
      created_at  timestamptz not null default now(),
      updated_at  timestamptz not null default now()
    );
    create index if not exists subscriptions_parent_idx on subscriptions (parent_id);

    create table if not exists redemptions (
      id            bigserial primary key,
      coupon_code   text not null,
      parent_id     bigint not null references parents (id),
      created_at    timestamptz not null default now(),
      /* One family cannot burn a twenty-use batch on its own. */
      unique (coupon_code, parent_id)
    );

    /*
     * Devices that have activated a licence.
     *
     * Not an enforcement mechanism — it is how you notice a code that has
     * been forwarded to forty people, which is the only realistic abuse of a
     * gate this soft.
     */
    create table if not exists licence_devices (
      id          bigserial primary key,
      code        text not null,
      install_id  text not null,
      first_seen  timestamptz not null default now(),
      last_seen   timestamptz not null default now(),
      unique (code, install_id)
    );

    create table if not exists payments (
      id          bigserial primary key,
      parent_id   bigint references parents (id),
      reference   text not null unique,
      provider    text not null default 'paystack',
      plan        text,
      /* Minor units — kobo for NGN. Never a float. */
      amount      bigint not null default 0,
      currency    text,
      /* 'pending' | 'success' | 'failed' */
      status      text not null default 'pending',
      channel     text,
      paid_at     timestamptz,
      created_at  timestamptz not null default now()
    );

    /*
     * One row per warning already sent, so a reminder goes once.
     *
     * A separate table rather than a column on subscriptions, because it is the
     * shape that keeps working: a second sort of reminder is a new kind, and an
     * extension is a delete rather than a nullable field to remember to clear.
     */
    create table if not exists reminders (
      id          bigserial primary key,
      code        text not null,
      kind        text not null,
      sent_at     timestamptz not null default now(),
      unique (code, kind)
    );

    /*
     * Bank transfers, waiting to be checked by a human.
     *
     * The realistic way a Nigerian parent pays: they move money in their bank
     * app and tell you they have. So this is a claim, not a payment — nothing
     * here grants anything until somebody has looked at their statement and
     * approved it. The row is kept afterwards either way, because "I paid and
     * you said no" is a conversation that needs a record.
     *
     * The proof image lives in this table as base64 rather than in object
     * storage. It is one small file per paying family, it wants exactly the same
     * access control as the row it belongs to, and adding a bucket, its
     * credentials and its lifecycle rules to save a few kilobytes of Postgres
     * would be the more complicated choice, not the simpler one.
     */
    create table if not exists payment_requests (
      id            bigserial primary key,
      parent_id     bigint not null references parents (id),
      plan          text not null,
      /* What they say they paid, in minor units. Checked, never trusted. */
      amount        bigint not null default 0,
      currency      text,
      /* Their bank's transfer reference, and the name on the sending account. */
      reference     text,
      sender_name   text,
      paid_on       date,
      note          text,
      proof_type    text,
      proof         text,
      /* 'pending' | 'approved' | 'declined' */
      status        text not null default 'pending',
      reviewed_by   text,
      reviewed_at   timestamptz,
      decision_note text,
      created_at    timestamptz not null default now()
    );
    create index if not exists payment_requests_status_idx on payment_requests (status);

    create table if not exists admin_users (
      id          bigserial primary key,
      email       text not null unique,
      pw_hash     text not null,
      name        text,
      last_login  timestamptz,
      created_at  timestamptz not null default now()
    );

    /*
     * Every grant, extension and revocation, with who did it. Small enough to
     * be free, and the first thing you want when a family says they paid and
     * the app disagrees.
     */
    create table if not exists admin_audit (
      id          bigserial primary key,
      actor       text,
      action      text not null,
      target      text,
      detail      text,
      created_at  timestamptz not null default now()
    );

    /*
     * Failed code attempts, by hashed IP, so guessing at access codes can be
     * rate-limited. The IP itself is never stored — only a keyed hash, which
     * answers "same caller?" without recording who.
     */
    create table if not exists code_attempts (
      id          bigserial primary key,
      ip_hash     text,
      created_at  timestamptz not null default now()
    );
    create index if not exists code_attempts_idx on code_attempts (created_at);
  `)
    .catch((err) => {
      ready = undefined
      throw err
    })
  await ready
  return true
}

/**
 * Why the database is unreachable, in words a human can act on.
 *
 * Postgres errors are terse and the useful part is usually the code, so this
 * maps the handful we actually hit onto the fix.
 */
export function explain(err) {
  const code = err?.code
  const msg = err?.message ?? String(err)
  if (!process.env.DATABASE_URL) return 'DATABASE_URL is not set on this deployment.'

  /*
   * The mistake that costs an afternoon, named so it costs a minute instead.
   *
   * Railway hands you two connection strings and puts the private one in
   * `DATABASE_URL`. `postgres.railway.internal` resolves only from inside
   * Railway's own network, so anything hosted elsewhere — Vercel, a laptop —
   * gets ENOTFOUND and a message about DNS, which sends you looking at the
   * wrong thing entirely. Render, Fly and Heroku all have a version of this.
   */
  const url = process.env.DATABASE_URL
  if (/\.railway\.internal/.test(url) || /\.railway\.internal/.test(msg)) {
    return (
      'DATABASE_URL points at postgres.railway.internal, which only resolves inside Railway’s own ' +
      'network — so nothing hosted elsewhere can reach it. In Railway, open the Postgres service → ' +
      'Variables and copy DATABASE_PUBLIC_URL instead (the host looks like xyz.proxy.rlwy.net with a ' +
      'high port number). If it is not there, enable Settings → Networking → Public Networking first.'
    )
  }
  if (/\.internal(:|\/|$)/.test(url)) {
    return (
      'DATABASE_URL uses a .internal hostname, which is private to your database provider’s network ' +
      'and unreachable from this deployment. Use the public or external connection string instead.'
    )
  }

  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return `Cannot resolve the database host — check DATABASE_URL. (${msg})`
  }
  if (code === 'ECONNREFUSED') return `The database refused the connection. (${msg})`
  if (code === 'ETIMEDOUT' || /timeout/i.test(msg)) {
    return `Timed out connecting. Use the POOLED connection string, not the direct one. (${msg})`
  }
  if (code === '28P01') return 'Password authentication failed — DATABASE_URL has the wrong credentials.'
  if (code === '3D000') return 'That database does not exist — check the name in DATABASE_URL.'
  if (code === '42501') return 'The database user is not allowed to create tables.'
  if (/does not support SSL/i.test(msg)) {
    return (
      'That Postgres was built without TLS support, so it refuses an encrypted connection. Append ' +
      '?sslmode=disable to DATABASE_URL — but only on a private network or a proxy you trust, because ' +
      'it sends the password in clear text.'
    )
  }
  if (/self.signed|certificate/i.test(msg)) return `TLS problem reaching the database. (${msg})`
  return msg
}

/** Small helper so routes do not each repeat the null-pool dance. */
export async function query(text, params = []) {
  const p = db()
  if (!p) return null
  await ensureSchema()
  return p.query(text, params)
}

/**
 * Thrown when a route needs the database and there isn't one.
 *
 * Usage pings can shrug that off and log to stdout; a licence cannot. Nobody
 * should be told they have access because the database was asleep.
 */
export class NoDatabase extends Error {
  constructor() {
    super('DATABASE_URL is not set on this deployment.')
    this.name = 'NoDatabase'
  }
}

/** Like `query`, but for routes where a missing database is a hard failure. */
export async function must(text, params = []) {
  const result = await query(text, params)
  if (!result) throw new NoDatabase()
  return result
}

/** First row, or undefined. */
export async function one(text, params = []) {
  const result = await must(text, params)
  return result.rows[0]
}

/** All rows. */
export async function all(text, params = []) {
  const result = await must(text, params)
  return result.rows
}

/**
 * Record an admin action.
 *
 * Never allowed to fail the action it describes — a lost audit line is
 * annoying, a grant that half-happened is worse.
 */
export async function audit(actor, action, target, detail) {
  try {
    await query(`insert into admin_audit (actor, action, target, detail) values ($1, $2, $3, $4)`, [
      actor ?? null,
      action,
      target ?? null,
      detail == null ? null : String(detail).slice(0, 500),
    ])
  } catch (err) {
    console.error('[brainy:audit]', err instanceof Error ? err.message : err)
  }
}

/**
 * Add whole months to a date, in JavaScript rather than in SQL.
 *
 * Postgres would do `now() + interval '12 months'` perfectly well, but every
 * expiry then depends on the database's clock and time zone rather than the
 * one the rest of the code reasons about — and it is one more thing the
 * in-memory Postgres the smoke test runs against does not implement.
 */
export function addMonths(months, from = new Date()) {
  if (months == null) return null
  const d = new Date(from.getTime())
  const day = d.getDate()
  d.setMonth(d.getMonth() + months)
  // 31 January + 1 month is 28 February, not 3 March.
  if (d.getDate() < day) d.setDate(0)
  return d
}
