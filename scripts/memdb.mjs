/**
 * Points `pg` at an in-memory Postgres, for the smoke tests.
 *
 * Extracted so the transport test and the handler test cannot drift into
 * disagreeing about what the database does. (`scripts/api-smoke.mjs` still has its
 * own copy of this; folding it in here is a tidy-up worth doing next time that
 * file is open, not while it is being edited.)
 */

import { newDb } from 'pg-mem'
import pg from 'pg'

export function installMemoryPostgres() {
  const mem = newDb()

  /*
   * pg-mem implements very few built-ins. These exist in real Postgres, so they
   * are taught to the double rather than avoided in the production SQL — the point
   * of the harness is to test the query we actually ship.
   */
  mem.public.registerFunction({
    name: 'greatest',
    args: ['date', 'date'],
    returns: 'date',
    implementation: (a, b) => (a > b ? a : b),
  })
  mem.public.registerFunction({
    name: 'greatest',
    args: ['int', 'int'],
    returns: 'int',
    implementation: (a, b) => Math.max(a ?? 0, b ?? 0),
  })

  const adapter = mem.adapters.createPg()

  /*
   * pg-mem's lexer rejects non-ASCII inside a block comment, which real Postgres
   * accepts happily — and the schema is heavily commented, em dashes and all.
   * Strip comments on the way in rather than flatten the punctuation of the
   * production schema to suit a test dependency.
   */
  const stripComments = (sql) => sql.replace(/\/\*[\s\S]*?\*\//g, '')
  const original = adapter.Pool.prototype.query
  adapter.Pool.prototype.query = function (text, params) {
    return original.call(this, typeof text === 'string' ? stripComments(text) : text, params)
  }

  pg.Pool = adapter.Pool
  process.env.DATABASE_URL = 'postgres://memory/brainy'

  return mem
}
