/**
 * Every route in one table.
 *
 * Paths keep the `/api/` prefix they had as serverless functions, because Vercel
 * proxies `/api/*` here verbatim and the clients send relative paths. Changing
 * them would mean touching every call site in the app, the marketing site and the
 * dashboard for no benefit.
 *
 * **`bodyLimit` is load-bearing.** Fastify parses the body before a handler runs,
 * which means the `readJson(req, 16 * 1024)` limits inside the handlers no longer
 * reject anything — by the time they are consulted the bytes are already in
 * memory. The real limit is the one declared here. Fastify's default is 1 MB,
 * which would refuse the 2 MB receipt upload that `pay/request` is built for, so
 * getting this wrong fails in both directions.
 *
 * Methods are listed generously on purpose. Several handlers check `req.method`
 * themselves and answer 405 with an `Allow` header, which is more useful than
 * Fastify's 404 — so the route accepts the method and lets the handler refuse it.
 */

import account from './routes/account.js'
import activate from './routes/activate.js'
import admin from './routes/admin.js'
import auth from './routes/auth.js'
import event from './routes/event.js'
import forget from './routes/forget.js'
import payInitialise from './routes/pay/initialise.js'
import payRequest from './routes/pay/request.js'
import payWebhook from './routes/pay/webhook.js'
import report from './routes/report.js'
import retain from './routes/cron/retain.js'
import expiring from './routes/cron/expiring.js'
import signup from './routes/signup.js'
import stats from './routes/stats.js'

const KB = 1024
const MB = 1024 * KB

/** The default for anything that takes a small JSON body. */
const SMALL = 16 * KB

export const ROUTES = [
  /* Usage ingest and reports — opt-in, anonymous, and must never fail loudly. */
  { url: '/api/event', methods: ['GET', 'POST'], handler: event, bodyLimit: SMALL },
  { url: '/api/report', methods: ['GET', 'POST'], handler: report, bodyLimit: 64 * KB },
  { url: '/api/forget', methods: ['GET', 'POST'], handler: forget, bodyLimit: 8 * KB },

  /* Accounts, licences and codes. */
  { url: '/api/signup', methods: ['GET', 'POST'], handler: signup, bodyLimit: SMALL },
  { url: '/api/activate', methods: ['GET', 'POST'], handler: activate, bodyLimit: SMALL },

  /*
   * Parent sign-in. Small bodies by definition — an email and six digits — and
   * deliberately tight, because these are the two unauthenticated routes that can
   * cause an email to be sent.
   */
  { url: '/api/auth/*', methods: ['GET', 'POST'], handler: auth, bodyLimit: 8 * KB },
  { url: '/api/account', methods: ['GET', 'POST', 'DELETE'], handler: account, bodyLimit: SMALL },
  { url: '/api/account/*', methods: ['GET', 'POST', 'DELETE'], handler: account, bodyLimit: SMALL },

  /* Money. */
  { url: '/api/pay/initialise', methods: ['GET', 'POST'], handler: payInitialise, bodyLimit: SMALL },
  /*
   * A phone screenshot of a bank receipt, base64-encoded. The handler caps the
   * attachment at 2 MB itself; this leaves room for that plus the fields around it.
   */
  { url: '/api/pay/request', methods: ['GET', 'POST'], handler: payRequest, bodyLimit: 3 * MB },
  /*
   * Both paths reach the same function: `/api/webhook` is the short one registered
   * in the Paystack dashboard, and the long one is what the file is called. Kept
   * here rather than as a host rewrite so it survives moving hosts again.
   */
  { url: '/api/pay/webhook', methods: ['POST'], handler: payWebhook, bodyLimit: 128 * KB },
  { url: '/api/webhook', methods: ['POST'], handler: payWebhook, bodyLimit: 128 * KB },

  /* The dashboard. One handler with an internal router; `lib/http.js` pathParts
     reads the segments after `/api/admin/` straight off the URL. */
  { url: '/api/admin', methods: ['GET', 'POST'], handler: admin, bodyLimit: SMALL },
  { url: '/api/admin/*', methods: ['GET', 'POST'], handler: admin, bodyLimit: SMALL },

  /* Scheduled jobs, guarded by CRON_SECRET rather than by who can reach them. */
  { url: '/api/cron/expiring', methods: ['GET', 'POST'], handler: expiring, bodyLimit: SMALL },
  { url: '/api/cron/retain', methods: ['GET', 'POST'], handler: retain, bodyLimit: SMALL },

  /* Anonymous usage numbers. Behind the admin guard. */
  { url: '/api/stats', methods: ['GET'], handler: stats, bodyLimit: SMALL },
]
