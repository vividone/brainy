/**
 * Postgres access shared by the API routes.
 *
 * Chosen over Redis because the same database carries licences, payments and
 * webhook state as well as analytics, and migrating off a key-value store once
 * real money depended on it would have been the wrong order to do things in.
 *
 * The preferred `DATABASE_URL` is now a **private** one — `postgres.railway.internal`
 * or equivalent — reachable only from inside the host's own network, so the
 * database needs no internet-facing port at all. That is why this API stopped
 * being serverless: functions with no fixed egress address cannot use a private
 * database.
 */

import pg from 'pg'

let pool
let ready

/**
 * How many connections one process may hold.
 *
 * `1` was right for serverless, where a function could cold-start per request and
 * a larger pool per instance multiplied into exhausting the server's slots. A
 * single long-lived process is the opposite case: it wants a real pool, and there
 * is exactly one of it.
 */
const POOL_MAX = Number(process.env.DATABASE_POOL_MAX ?? 10)

/**
 * Whether to negotiate TLS, and whether to believe the certificate.
 *
 * Three cases, in order of how much they are trusted:
 *
 *  - **A private network** (`*.railway.internal`, `*.internal`) — no TLS. The
 *    traffic never leaves the host's own network, and the provider's Postgres
 *    image usually has no certificate to offer anyway. Demanding TLS here fails
 *    with "the server does not support SSL connections".
 *  - **Localhost** — no TLS, for the same reason plus obviousness.
 *  - **Anything else** — TLS with the certificate **verified**. This used to pass
 *    `rejectUnauthorized: false`, which encrypts but authenticates nothing: an
 *    attacker positioned between here and a database exposed on the public
 *    internet could present any certificate and read the credentials. Verification
 *    is the default now, and `DATABASE_SSL_NO_VERIFY=1` is the deliberate,
 *    documented way to accept a provider whose chain does not validate.
 *
 * `sslmode=disable` in the URL is still honoured, because some Postgres images are
 * built without TLS support and that error message sends people looking in
 * entirely the wrong place.
 */
function sslFor(url) {
  if (/[?&]sslmode=disable/.test(url)) return false
  if (/@[^/@]*\.internal[:/]/.test(url)) return false
  if (/@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url)) return false
  if (process.env.DATABASE_SSL_NO_VERIFY === '1') return { rejectUnauthorized: false }
  return { rejectUnauthorized: true }
}

export function db() {
  if (!process.env.DATABASE_URL) return null
  pool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: POOL_MAX,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
    ssl: sslFor(process.env.DATABASE_URL),
  })
  /*
   * A pooled client can die between uses — a network blip, a database restart.
   * `pg` emits that on the pool, and an unhandled 'error' event takes the whole
   * process down with it. Logged and swallowed; the next acquire makes a new one.
   */
  pool.on('error', (err) => console.error('[brainy:db] idle client error', err.message))
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

    /*
     * Parent sign-in: a six-digit code, emailed.
     *
     * Only a hash of the code is stored, for the same reason a password is
     * hashed — a leaked table must not be a set of working sign-ins. the attempt count
     * is what stops a six-digit space being walked in a few seconds, and it is
     * counted per code rather than per caller so it cannot be reset by changing
     * network.
     *
     * There is no password anywhere in this design. Parents on a shared tablet
     * forget passwords, and a reset flow is just this table with more steps.
     */
    create table if not exists auth_codes (
      id          bigserial primary key,
      email       text not null,
      code_hash   text not null,
      attempts    int  not null default 0,
      consumed_at timestamptz,
      expires_at  timestamptz not null,
      created_at  timestamptz not null default now()
    );
    create index if not exists auth_codes_email_idx on auth_codes (email);

    /*
     * One row per signed-in device, so a token can be revoked without ending
     * every other device a family owns — the tablet that was lost, not the one
     * still in use. Again only a hash: this is a bearer credential.
     *
     * The label is whatever the client reported about itself, for the parent to
     * recognise ("Chrome on Android"). Never a device fingerprint.
     */
    create table if not exists device_tokens (
      id          bigserial primary key,
      parent_id   bigint not null references parents (id),
      token_hash  text not null unique,
      label       text,
      created_at  timestamptz not null default now(),
      last_seen   timestamptz not null default now(),
      revoked_at  timestamptz
    );
    create index if not exists device_tokens_parent_idx on device_tokens (parent_id);

    /*
     * Children, but only for accounts that asked us to keep them.
     *
     * This table stays EMPTY unless a parent has ticked the progress opt-in. An
     * account on its own uploads nothing about a child — that is the promise in
     * site/privacy.html and it has to be true in the schema's behaviour, not
     * just in the copy. The id is the one the client already generated, so a
     * learner keeps its identity across devices without a mapping table.
     *
     * A null deleted_at is a soft delete: a parent who removes a child by accident on
     * one tablet has thirty days before the row goes, and until then the other
     * tablet does not silently resurrect it.
     */
    create table if not exists learners (
      id            text primary key,
      parent_id     bigint not null references parents (id),
      name          text,
      age           int,
      curriculum_id text,
      year_band     text,
      colour        text,
      created_at    timestamptz not null default now(),
      updated_at    timestamptz not null default now(),
      deleted_at    timestamptz
    );
    create index if not exists learners_parent_idx on learners (parent_id);

    /*
     * Account preferences — currently one, and the important one.
     *
     * A separate table rather than a column on the parents table because it
     * already exists in production and ensureSchema() only ever creates: adding
     * a column would need an ALTER, which means a migration story this project
     * does not have yet. A new table costs a join and needs no migration at all.
     *
     * keep_progress is now on for a new account, because an account whose whole
     * job is getting a family's work back on the next tablet cannot start by not
     * keeping it. A row here therefore records a *decision*, and its absence is
     * the default: see prefsFor(), which reads a missing row as on and an
     * explicit false as off. Off still deletes what was kept, which is what
     * makes it a real choice rather than a flag.
     */
    /*
     * A child's progress, for accounts that asked us to keep it.
     *
     * Stored as one opaque document per child, and the server never looks inside
     * it. That is partly simplicity — the save format changes and this table
     * does not care — but mostly it is the privacy posture: we must not end up
     * owning a queryable database of which children are behind at what. The only
     * columns are the ones needed to decide whether an upload is newer than what
     * is already here.
     *
     * Deliberately text rather than jsonb. Nothing queries inside it, so jsonb
     * would buy only validation we already do in JavaScript before writing.
     *
     * prev_state is exactly one step of undo. Two tablets played offline mean the
     * later upload wins and the earlier window is superseded; keeping the
     * previous document turns that from a lost month into a support request that
     * can be answered.
     */
    create table if not exists learner_state (
      learner_id    text primary key references learners (id),
      revision      bigint not null default 0,
      state         text not null,
      prev_revision bigint,
      prev_state    text,
      device_label  text,
      updated_at    timestamptz not null default now()
    );

    create table if not exists account_prefs (
      parent_id     bigint primary key references parents (id),
      keep_progress boolean not null default true,
      updated_at    timestamptz not null default now()
    );

    /*
     * Switches an operator can flip without a deploy.
     *
     * One row per setting, values as text so a boolean today does not stop this
     * holding a message tomorrow. It exists because the alternative for "should
     * the website ask for donations" was another environment variable, and this
     * project has already lost hours to variables set on the wrong platform: the
     * database is the one place both the API and the dashboard already agree on.
     */
    create table if not exists app_settings (
      key        text primary key,
      value      text not null,
      updated_by text,
      updated_at timestamptz not null default now()
    );

    /*
     * Columns added to tables that already exist somewhere.
     *
     * create table if not exists cannot add one, and this project still has no
     * migration tool, so new columns arrive as idempotent ALTERs kept together
     * here rather than scattered through the definitions above. Both Postgres
     * and the pg-mem the tests run on support this form, so it costs nothing on
     * a fresh database and does the right thing on an old one.
     *
     * plan_months: how long a grant was for, in months, recorded so a licence can
     * describe itself honestly. A coupon may grant any period now, so the plan
     * name alone no longer says how long anything lasts - a three-month code on
     * the annual plan would otherwise tell the parent "One year".
     */
    alter table subscriptions add column if not exists plan_months int;
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
