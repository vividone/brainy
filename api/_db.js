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

export function db() {
  if (!process.env.DATABASE_URL) return null
  pool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
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
  ready ??= p.query(`
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
  `)
  await ready
  return true
}

/** Small helper so routes do not each repeat the null-pool dance. */
export async function query(text, params = []) {
  const p = db()
  if (!p) return null
  await ensureSchema()
  return p.query(text, params)
}
