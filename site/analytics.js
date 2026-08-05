/**
 * Google Analytics — for the marketing site, and nowhere else.
 *
 * Loaded by index.html and privacy.html only. It is deliberately *not*
 * referenced by the app at /play/ or by /admin, and the build fails if a Google
 * script ever appears in the app bundle (see scripts/build-site.mjs). The reason
 * is the promise the product is built on: the app makes no network request after
 * loading, and a child's tablet has no third-party script on it. A landing page
 * read by adults deciding whether to try something is a different question.
 *
 * This is the standard gtag snippet, in a file rather than pasted into two pages
 * so there is one place to change it, plus three things it does not have on its
 * own:
 *
 *  1. **Path guards.** Nothing loads under /play/ or /admin, whatever includes
 *     this file. The dashboard is excluded because its page paths are nobody
 *     else's business, and the app because a child's tablet gets no trackers.
 *  2. **Environment guards.** localhost and *.vercel.app report nothing.
 *     Development traffic is still traffic, and a property polluted by your own
 *     laptop refreshing forty times is one you stop trusting.
 *  3. **Advertising features off.** No Google Signals, no ad personalisation, no
 *     remarketing audiences. This measures whether a page works, not who is
 *     reading it — which is the difference between analytics and adtech on a
 *     product aimed at children's parents.
 *
 * The measurement id is substituted at build time from `scripts/build-site.mjs`,
 * overridable with `GA_MEASUREMENT_ID`. Setting that to an empty string builds a
 * site with no analytics at all.
 */

;(function () {
  /* Replaced during `npm run build`. Left as-is, analytics stay off. */
  var MEASUREMENT_ID = '__GA_MEASUREMENT_ID__'

  if (!/^G-[A-Z0-9]+$/.test(MEASUREMENT_ID)) return

  /*
   * Belt and braces. This script is not referenced from the app or the
   * dashboard, but a stray copy-paste should not be what stands between a
   * child's tablet and a tracker.
   */
  var path = window.location.pathname
  if (path.indexOf('/play') === 0 || path.indexOf('/admin') === 0) return

  var host = window.location.hostname
  var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || /\.local$/.test(host)
  var isPreview = /\.vercel\.app$/.test(host)
  if (isLocal || isPreview) return

  window.dataLayer = window.dataLayer || []
  function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag = gtag

  /*
   * Storage for advertising is refused explicitly rather than left to default.
   * Nothing here is for selling to anybody, and this is the switch that keeps it
   * that way even if a feature is later turned on in the GA console.
   */
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted',
  })

  var script = document.createElement('script')
  script.async = true
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID)
  document.head.appendChild(script)

  gtag('js', new Date())
  gtag('config', MEASUREMENT_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_flags: 'SameSite=Lax;Secure',
  })
})()
