/**
 * Google Analytics — for the marketing site, and nowhere else.
 *
 * Loaded by index.html and privacy.html only. It is deliberately *not*
 * referenced by the app at /play/ or by /admin, and the build fails if a
 * Google script ever appears in the app bundle (see scripts/build-site.mjs).
 * The reason is the promise the product is built on: the app makes no network
 * request after loading, and a child's tablet has no third-party script on it.
 * A landing page read by adults deciding whether to try something is a
 * different question, and knowing which parts of it they read is a fair one.
 *
 * Three rules follow from that, and they are why this file exists instead of a
 * pasted gtag snippet:
 *
 *  1. **Nothing loads until a visitor says yes.** No cookieless pings, no
 *     "legitimate interest", no consent-mode-denied telemetry. Before consent
 *     there is no request to Google at all. A pre-ticked box is not consent, and
 *     neither is a banner whose only button is "OK".
 *  2. **Do Not Track and Global Privacy Control are honoured** — and silently.
 *     Someone who has already expressed this preference should not be asked to
 *     express it again, so they never see the banner.
 *  3. **Advertising features are off.** No Google Signals, no ad
 *     personalisation, no remarketing audiences. This measures whether a page
 *     works, not who is reading it.
 *
 * The measurement id is substituted at build time from `GA_MEASUREMENT_ID`. With
 * that variable unset — local builds, previews, anyone else's checkout — this
 * whole file is inert and no banner appears, because a site with no cookies has
 * no business asking about cookies.
 */

;(function () {
  /* Replaced during `npm run build`. Left as-is, analytics stay off. */
  var MEASUREMENT_ID = '__GA_MEASUREMENT_ID__'
  var STORAGE_KEY = 'brainy.analytics'

  if (!/^G-[A-Z0-9]+$/.test(MEASUREMENT_ID)) return

  /*
   * Belt and braces. This script is not referenced from the app or the
   * dashboard, but a stray copy-paste should not be what stands between a
   * child's tablet and a tracker.
   */
  var path = window.location.pathname
  if (path.indexOf('/play') === 0 || path.indexOf('/admin') === 0) return

  /*
   * Only the real site reports. Development and preview traffic is still
   * traffic, and a property polluted with your own laptop refreshing a page
   * forty times is a property you stop trusting — which makes it worse than no
   * analytics at all.
   */
  var host = window.location.hostname
  var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || /\.local$/.test(host)
  var isPreview = /\.vercel\.app$/.test(host)
  if (isLocal || isPreview) return

  /** localStorage throws in some private-browsing modes; never break the page. */
  function remembered() {
    try {
      return window.localStorage.getItem(STORAGE_KEY)
    } catch (e) {
      return null
    }
  }

  function remember(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value)
    } catch (e) {
      /* A visitor who cannot be remembered is asked again. That is the right
         way round: the alternative is assuming consent we cannot evidence. */
    }
  }

  /** An existing preference, expressed by the browser rather than to us. */
  function objects() {
    return (
      navigator.globalPrivacyControl === true ||
      navigator.doNotTrack === '1' ||
      window.doNotTrack === '1' ||
      navigator.msDoNotTrack === '1'
    )
  }

  var loaded = false

  function load() {
    if (loaded) return
    loaded = true

    window.dataLayer = window.dataLayer || []
    function gtag() {
      window.dataLayer.push(arguments)
    }
    window.gtag = gtag

    /*
     * Storage for advertising is refused outright rather than left to default.
     * Nothing here is for selling to anybody, and this is the switch that keeps
     * it that way even if someone later turns a feature on in the GA console.
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
  }

  /* ---------------------------------------------------------------- *
   * The banner
   * ---------------------------------------------------------------- */

  var banner = null

  function close() {
    if (!banner) return
    banner.remove()
    banner = null
  }

  /**
   * Withdrawing actually withdraws.
   *
   * Google's own documented opt-out flag stops an already-loaded tag dead, and
   * the cookies it wrote are expired here rather than left for the visitor to
   * clear themselves. "You can delete them in your browser settings" is a way of
   * saying no.
   */
  function revoke() {
    window['ga-disable-' + MEASUREMENT_ID] = true
    if (window.gtag) {
      window.gtag('consent', 'update', { analytics_storage: 'denied' })
    }

    /* `_ga`, `_ga_<container>`, and the older `_gid`. Expired on this host and on
       the dot-prefixed domain, which is where GA actually sets them. */
    var hostname = window.location.hostname
    var domains = ['', '; domain=' + hostname, '; domain=.' + hostname]
    var names = document.cookie.split(';').map(function (pair) {
      return pair.split('=')[0].trim()
    })
    names.forEach(function (name) {
      if (name.indexOf('_ga') !== 0 && name.indexOf('_gid') !== 0) return
      domains.forEach(function (domain) {
        document.cookie = name + '=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT' + domain
      })
    })
  }

  function decide(choice) {
    remember(choice)
    close()
    if (choice === 'granted') load()
    else revoke()
  }

  function ask() {
    if (banner) return

    banner = document.createElement('div')
    banner.setAttribute('role', 'dialog')
    banner.setAttribute('aria-live', 'polite')
    banner.setAttribute('aria-label', 'Analytics on this website')
    banner.style.cssText = [
      'position:fixed',
      'left:1rem',
      'right:1rem',
      'bottom:1rem',
      'z-index:2147483000',
      'max-width:34rem',
      'margin:0 auto',
      'background:#ffffff',
      'border:2px solid #ede9fe',
      'border-radius:18px',
      'box-shadow:0 12px 40px rgba(30,27,75,0.18)',
      'padding:1.1rem 1.25rem',
      "font-family:'Nunito','Segoe UI Variable','Segoe UI',system-ui,-apple-system,sans-serif",
      'color:#1e1b4b',
      'line-height:1.55',
    ].join(';')

    /*
     * The copy says what it is for and what it is not for. "We value your
     * privacy" says nothing; "which pages people read, and never inside the
     * app" is the actual answer to what a visitor wants to know.
     */
    var text = document.createElement('p')
    text.style.cssText = 'margin:0 0 0.9rem;font-weight:600;font-size:0.95rem'
    text.innerHTML =
      '<b style="display:block;font-weight:900;margin-bottom:0.2rem">May we count this visit?</b>' +
      'Google Analytics tells us which pages of this website people read, so we know what is worth ' +
      'writing. It sets a cookie. It is never used for advertising, and it is <b>not in the app</b> — ' +
      'nothing about your child is ever measured. ' +
      '<a href="/privacy.html#analytics" style="color:#6d28d9;font-weight:800">What it collects</a>'

    var row = document.createElement('div')
    row.style.cssText = 'display:flex;gap:0.6rem;flex-wrap:wrap'

    function button(label, primary, choice) {
      var b = document.createElement('button')
      b.type = 'button'
      b.textContent = label
      b.style.cssText = [
        'flex:1 1 9rem',
        'min-height:46px',
        'padding:0 1.1rem',
        'border-radius:12px',
        'font:inherit',
        'font-weight:800',
        'cursor:pointer',
        primary ? 'background:#7c3aed;color:#fff;border:2px solid #6d28d9' : 'background:#fff;color:#1e1b4b;border:2px solid #ede9fe',
      ].join(';')
      b.addEventListener('click', function () {
        decide(choice)
      })
      return b
    }

    /* Both choices are the same size and one tap apart. Making "no" harder to
       find than "yes" is the whole thing this product is against. */
    row.appendChild(button('Yes, that’s fine', true, 'granted'))
    row.appendChild(button('No thanks', false, 'denied'))

    banner.appendChild(text)
    banner.appendChild(row)
    document.body.appendChild(banner)
  }

  /* ---------------------------------------------------------------- *
   * Start, and let a visitor change their mind
   * ---------------------------------------------------------------- */

  var choice = remembered()

  if (choice === 'granted') load()
  else if (choice !== 'denied' && !objects()) ask()

  /**
   * Any element marked `data-analytics-choice` reopens the question — the
   * footer link on both pages. Withdrawing has to be as easy as agreeing was,
   * and burying it in a paragraph of the privacy notice would not be.
   */
  document.addEventListener('click', function (event) {
    var trigger = event.target.closest && event.target.closest('[data-analytics-choice]')
    if (!trigger) return
    event.preventDefault()
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      /* ignored — the banner still opens */
    }
    ask()
  })
})()
