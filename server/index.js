/**
 * The Brainy API, as one long-lived Fastify process.
 *
 * It ran as Vercel serverless functions until the database became the thing worth
 * protecting. Vercel has no fixed egress IPs, so reaching Postgres from there
 * meant leaving the database open to the internet behind a password. Running here,
 * inside Railway alongside the database, means `postgres.railway.internal` and
 * public networking switched off entirely. That is the whole reason for this file;
 * the framework is incidental.
 *
 * What it is NOT for: the game. Every question, every mastery score and the parent
 * report are computed on the device from localStorage, and a whole session plays
 * with the network off. This process handles opt-in usage data, parent accounts,
 * licences and payments. Nothing a child does passes through it.
 */

import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import { asRoute } from './adapter.js'
import { ROUTES } from './routes.js'
import { ensureSchema, explain } from './lib/db.js'

const PORT = Number(process.env.PORT ?? 8080)
const HOST = process.env.HOST ?? '0.0.0.0'

export function build() {
  const app = Fastify({
    /*
     * Railway terminates TLS and forwards the client address. Without this,
     * `request.ip` is the proxy and every caller looks like the same one — which
     * would quietly turn per-caller rate limiting into a global one.
     */
    trustProxy: true,
    bodyLimit: 16 * 1024,
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      /*
       * Bodies are never logged. They contain email addresses, bank receipts and
       * access codes, and a log is the easiest place for those to end up
       * somewhere nobody meant them to be.
       */
      serializers: {
        req: (request) => ({ method: request.method, url: request.url }),
      },
    },
  })

  /*
   * One parser, both forms of the body.
   *
   * The Paystack webhook verifies an HMAC over the exact bytes it was sent, so it
   * needs the buffer; every other route wants the parsed object. Keeping both here
   * means no route has to opt out of parsing and risk being the one that silently
   * verifies a signature over re-serialised JSON.
   */
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (request, body, done) => {
    request.rawBody = body
    if (body.length === 0) return done(null, {})
    try {
      done(null, JSON.parse(body.toString('utf8')))
    } catch {
      const err = new Error('Malformed JSON')
      err.statusCode = 400
      done(err)
    }
  })

  /*
   * Headers for API responses only. The pages are served by the static host, which
   * sets its own — including the Content-Security-Policy, which cannot live here
   * because this process never serves HTML.
   */
  app.register(helmet, { contentSecurityPolicy: false, crossOriginResourcePolicy: false })

  /* Railway's healthcheck. Deliberately does not touch the database: a database
     blip should not cause the platform to kill and restart a working process. */
  app.get('/healthz', async () => ({ ok: true, service: 'brainy-api' }))

  for (const { url, methods, handler, bodyLimit } of ROUTES) {
    app.route({ method: methods, url, bodyLimit, handler: asRoute(handler) })
  }

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ ok: false, error: `No route for ${request.method} ${request.url}` })
  })

  app.setErrorHandler((error, request, reply) => {
    /* Fastify's own rejections — body too large, malformed JSON — carry a status
       and a message a caller can act on. Anything else is ours and is not
       described to the outside world. */
    const status = error.statusCode ?? 500
    if (status >= 500) request.log.error({ err: error }, 'unhandled')
    reply.code(status).send({
      ok: false,
      error: status >= 500 ? 'Something went wrong our end.' : error.message,
    })
  })

  return app
}

/**
 * Start listening — but only after the schema exists.
 *
 * As serverless functions this ran lazily on the first query of every cold start.
 * A long-lived process can do it once, before accepting traffic, which removes a
 * per-request check and makes a broken `DATABASE_URL` a startup failure rather
 * than a puzzle in the logs an hour later.
 */
export async function start() {
  const app = build()

  try {
    const ready = await ensureSchema()
    app.log.info(ready ? 'schema ready' : 'no DATABASE_URL — running without a database')
  } catch (err) {
    app.log.error(`database unavailable: ${explain(err)}`)
    /*
     * Deliberately fatal. Every route this process serves needs the database, so
     * a container that cannot reach it is not degraded, it is broken — and
     * exiting lets the platform restart and retry rather than serving 500s.
     */
    process.exit(1)
  }

  await app.listen({ port: PORT, host: HOST })

  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, async () => {
      app.log.info(`${signal} — closing`)
      await app.close()
      process.exit(0)
    })
  }

  return app
}

/* Only start when run directly, so the smoke test can import `build()`. */
if (process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  start()
}
