/**
 * Exercises the API routes against an in-memory Postgres.
 *
 * The same reasoning as the content smoke test: a broken endpoint is
 * invisible until a real parent's feedback silently vanishes, and finding
 * that out from production logs is too late. This runs the actual handlers,
 * with the actual SQL, in about a second.
 */

import { newDb } from 'pg-mem'
import { Readable } from 'node:stream'
import pg from 'pg'

const mem = newDb()

/*
 * pg-mem implements very few built-ins. These exist in real Postgres, so they
 * are taught to the double rather than avoided in the production SQL — the
 * point of this harness is to test the query we actually ship.
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
// The handlers construct their own pool from `pg`; point that at pg-mem.
pg.Pool = adapter.Pool

process.env.DATABASE_URL = 'postgres://memory/brainy'
process.env.ADMIN_TOKEN = 'test-token'
delete process.env.REPORT_WEBHOOK_URL

const event = await import('../api/event.js')
const report = await import('../api/report.js')
const stats = await import('../api/stats.js')

async function call(mod, payload, { method = 'POST', url = '/', headers = {} } = {}) {
  const req = Object.assign(Readable.from([Buffer.from(JSON.stringify(payload))]), {
    method,
    url,
    headers,
  })
  let status = 0
  let body = null
  const res = {
    status(s) { status = s; return this },
    json(b) { body = b; return this },
    end() { return this },
    setHeader() {},
  }
  await mod.default(req, res)
  return { status, body }
}

const problems = []
const check = (label, actual, expected) => {
  const ok = actual === expected
  console.log(`  ${ok ? '✔' : '✖'} ${label.padEnd(38)} ${actual}${ok ? '' : ` (expected ${expected})`}`)
  if (!ok) problems.push(label)
}

const today = new Date().toISOString().slice(0, 10)
const ID = 'install-test-0001'

console.log('\nIngest')
check('activate', (await call(event, { installId: ID, app: 'v1.0', day: today, kind: 'activate', curriculum: 'ng-ube', yearBand: 'b3', children: 2 })).status, 200)
check('daily open', (await call(event, { installId: ID, app: 'v1.0', day: today, kind: 'open', curriculum: 'ng-ube', yearBand: 'b3', children: 2 })).status, 200)
check('session', (await call(event, { installId: ID, app: 'v1.0', day: today, kind: 'session', subject: 'maths', questions: 10, correct: 8, durationMs: 300_000 })).status, 200)
check('second install', (await call(event, { installId: 'install-test-0002', app: 'v1.0', day: today, kind: 'open', curriculum: 'uk-nc', yearBand: 'y3', children: 1 })).status, 200)

console.log('\nRejects bad input')
check('unknown kind', (await call(event, { installId: ID, day: today, kind: 'nope' })).status, 400)
check('missing install id', (await call(event, { day: today, kind: 'open' })).status, 400)
check('malformed day', (await call(event, { installId: ID, day: 'yesterday', kind: 'open' })).status, 400)
check('GET refused', (await call(event, {}, { method: 'GET' })).status, 405)

console.log('\nReports')
check('feedback stored', (await call(report, { type: 'feedback', app: 'v1.0', category: 'wrong', message: 'the clock question is off', contact: 'a@b.co', installId: ID })).status, 200)
check('weekly stored', (await call(report, { type: 'weekly', app: 'v1.0', week: '2026-W31', children: ['a summary'], installId: ID })).status, 200)

console.log('\nDashboard')
check('no token refused', (await call(stats, {}, { method: 'GET', url: '/api/stats' })).status, 401)

const ok = await call(stats, {}, { method: 'GET', url: '/api/stats', headers: { 'x-admin-token': 'test-token' } })
check('with token', ok.status, 200)

if (ok.body?.ok) {
  const { installs, daily, subjects, split, feedback } = ok.body
  check('activations counted', installs.total, 2)
  check('children summed', installs.children, 3)
  check('a day of activity', daily.length >= 1, true)
  check('devices that day', Number(daily.at(-1)?.devices ?? 0), 2)
  check('questions that day', Number(daily.at(-1)?.questions ?? 0), 10)
  check('subject rows', subjects.length, 1)
  check('subject accuracy source', Number(subjects[0]?.correct ?? 0), 8)
  check('curriculum split rows', split.length, 2)
  check('feedback visible', feedback.length, 1)
} else {
  problems.push(`stats returned ${JSON.stringify(ok.body)}`)
}

console.log()
if (problems.length) {
  console.log(`✖ ${problems.length} problem(s): ${problems.join(', ')}`)
  process.exit(1)
}
console.log('✔ API routes behave correctly against a real schema.')
