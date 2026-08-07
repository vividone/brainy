/**
 * Switches an operator can flip from the dashboard, without a deploy.
 *
 * Deliberately tiny and deliberately not environment variables. Everything
 * configured here is a decision somebody makes on a Tuesday afternoon and may
 * reverse on the Wednesday — whether the website asks for donations, for
 * instance — and asking for a redeploy to change one of those is how a switch
 * ends up left in the wrong position for a month.
 *
 * A missing row means the default, so switching something on and off again
 * leaves the same behaviour as never having touched it.
 */

import { one, query } from './db.js'

/** The flags this file knows about, and what they do if nobody has said. */
export const FLAG_DEFAULTS = {
  /*
   * Whether the marketing site shows the support section with the account
   * details in it. On, because it was asked for and the copy is written; off is
   * one click away and takes effect on the next page load.
   */
  donations: true,
}

export async function flag(key) {
  const fallback = FLAG_DEFAULTS[key] ?? false
  try {
    const row = await one(`select value from app_settings where key = $1`, [key])
    if (!row) return fallback
    return row.value === 'on'
  } catch {
    /*
     * A flag is never worth failing a request over. If the database is
     * unreachable the caller gets the default, which is the same answer it would
     * have had before anybody flipped anything.
     */
    return fallback
  }
}

export async function setFlag(key, on, by) {
  await query(
    `insert into app_settings (key, value, updated_by, updated_at)
     values ($1, $2, $3, now())
     on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`,
    [key, on ? 'on' : 'off', by ?? null],
  )
  return Boolean(on)
}
