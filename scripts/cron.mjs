/**
 * One scheduled job, run once, then exit.
 *
 * This is the shape Railway's scheduler wants: it starts a service at the
 * appointed minute and expects the process to finish. A long-running server
 * would simply be killed at the next firing, so the API service must never carry
 * a schedule — the cron services are separate deployments of this same repo with
 * a different start command.
 *
 *   npm run cron remind      one reminder pass, meant hourly
 *   npm run cron expiring    licence renewal warnings, meant daily
 *   npm run cron retain      the retention sweep, meant weekly
 *
 * It calls the route handlers in process rather than over HTTP. There is one
 * implementation of each job, and it is the one the API exposes: a second copy
 * of "who should be reminded" that only the scheduler runs is a second copy that
 * drifts. The handlers expect a request, so they are given one, complete with the
 * same `CRON_SECRET` header a caller from outside would need. Nothing is exempt
 * from the guard just because it happens to be local.
 *
 * Exit codes matter here: Railway shows a failed run when the process exits
 * non-zero, and a job that fails silently at 5pm every day is a job nobody
 * notices has stopped.
 */

import { NoDatabase } from '../server/lib/db.js'

const JOBS = {
  remind: '../server/routes/cron/remind.js',
  expiring: '../server/routes/cron/expiring.js',
  retain: '../server/routes/cron/retain.js',
}

const name = (process.argv[2] ?? process.env.CRON_JOB ?? '').trim()

if (!Object.hasOwn(JOBS, name)) {
  console.error(
    `[cron] unknown job ${JSON.stringify(name)}. One of: ${Object.keys(JOBS).join(', ')}.\n` +
      'Set it as the argument to the start command, or as CRON_JOB.',
  )
  process.exit(2)
}

if (!process.env.CRON_SECRET) {
  console.error('[cron] CRON_SECRET is not set on this service. The job would refuse to run anyway.')
  process.exit(2)
}

if (!process.env.DATABASE_URL) {
  console.error('[cron] DATABASE_URL is not set on this service.')
  process.exit(2)
}

/** The minimum of a request these handlers read. */
const req = {
  method: 'POST',
  url: `/api/cron/${name}`,
  headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
}

let status = 0
let body = null
const res = {
  status(code) {
    status = code
    return this
  },
  json(payload) {
    body = payload
    return this
  },
  setHeader() {},
  end() {
    return this
  },
}

const started = Date.now()
try {
  const { default: handler } = await import(JOBS[name])
  await handler(req, res)
} catch (err) {
  if (err instanceof NoDatabase) {
    console.error(`[cron:${name}] no database reachable`)
    process.exit(1)
  }
  console.error(`[cron:${name}] threw`, err)
  process.exit(1)
}

const seconds = ((Date.now() - started) / 1000).toFixed(1)
console.log(`[cron:${name}] ${status} in ${seconds}s ${JSON.stringify(body)}`)

/*
 * A 200 with `ok: false` is still a failure worth seeing in Railway's run
 * history, so the exit code follows the body rather than the status alone.
 */
process.exit(status === 200 && body?.ok !== false ? 0 : 1)
