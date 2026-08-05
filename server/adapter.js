/**
 * Runs a Vercel-style `(req, res)` handler as a Fastify route.
 *
 * This shim exists so the handlers themselves did not have to be rewritten when
 * the API moved off serverless. That is not laziness about the shape — it is what
 * keeps `scripts/api-smoke.mjs` meaningful. Those 200-odd assertions call the
 * handlers directly with a fake `req`/`res`, and they are the only evidence that
 * moving hosts changed no behaviour. Rewriting the handlers into Fastify's own
 * idiom would have thrown that evidence away at exactly the moment it was needed.
 *
 * The shim is deliberately small, and the handlers are free to grow into
 * something more Fastify-shaped later, one at a time, with the tests still green.
 */

/**
 * Normalise what a handler is allowed to assume about the request.
 *
 * `body` and `rawBody` are always present, so `readJson()` and `readRaw()` in
 * lib/http.js never fall through to reading the stream — Fastify has already
 * consumed it, and a handler waiting on a spent stream is a hang rather than an
 * error. The raw bytes come from the content-type parser in index.js, which is
 * what makes the Paystack signature check possible.
 */
function shimRequest(request) {
  const req = request.raw
  req.headers = request.headers
  req.url = request.url
  req.method = request.method
  req.body = request.body ?? {}
  req.rawBody = request.rawBody ?? Buffer.alloc(0)
  return req
}

/**
 * The three methods every handler uses, and nothing else.
 *
 * `end(buffer)` is here for one caller — the admin route that serves a bank
 * receipt as image bytes — and it is the reason this cannot just be
 * `reply.send(await handler(...))`.
 */
function shimReply(reply) {
  let sent = false
  return {
    res: {
      status(code) {
        reply.code(code)
        return this
      },
      json(body) {
        sent = true
        reply.send(body)
        return this
      },
      setHeader(name, value) {
        reply.header(name, value)
        return this
      },
      end(payload) {
        sent = true
        reply.send(payload ?? '')
        return this
      },
    },
    wasSent: () => sent,
  }
}

export function asRoute(handler) {
  return async function route(request, reply) {
    const req = shimRequest(request)
    const { res, wasSent } = shimReply(reply)

    await handler(req, res)

    /*
     * A handler that returns without answering would otherwise leave the request
     * hanging until Fastify's timeout. Every current handler answers on every
     * path; this is the guard for the one that eventually will not.
     */
    if (!wasSent()) {
      request.log.error({ url: request.url }, 'handler returned without sending')
      reply.code(500).send({ ok: false, error: 'The server did not answer.' })
    }
  }
}
