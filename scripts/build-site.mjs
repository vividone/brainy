/**
 * Copies the marketing site into `dist/` alongside the built app.
 *
 * Layout after a build:
 *   dist/index.html      landing page
 *   dist/privacy.html    privacy notice
 *   dist/analytics.js    consent-gated Google Analytics, website only
 *   dist/img/            marketing screenshots
 *   dist/play/           the PWA
 *
 * It also does the two things that keep analytics where they belong: it puts the
 * measurement id in, from the environment rather than the repository, and it
 * refuses to finish if a Google script has found its way into the app.
 */

import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const site = path.join(root, 'site')
const dist = path.join(root, 'dist')

await mkdir(dist, { recursive: true })
await cp(site, dist, { recursive: true })

/* ------------------------------------------------------------------ *
 * Google Analytics — marketing site only
 * ------------------------------------------------------------------ */

const PLACEHOLDER = '__GA_MEASUREMENT_ID__'
const analyticsFile = path.join(dist, 'analytics.js')

/**
 * The GA4 property this site reports into.
 *
 * It lives here rather than in `site/analytics.js` so that file stays free of
 * anything environment-specific, and here rather than only in an environment
 * variable so a fresh clone of this repository builds a working site without
 * anybody having to be told a secret it is not. A measurement id is public — it
 * ships in the page to every visitor — so there is nothing to protect.
 *
 * `GA_MEASUREMENT_ID` overrides it, and `GA_MEASUREMENT_ID=""` switches
 * analytics off entirely for that build.
 */
const PRODUCTION_ID = 'G-T76WQTXYYE'

const measurementId = (process.env.GA_MEASUREMENT_ID ?? PRODUCTION_ID).trim()

/*
 * Substituted at build time rather than pasted into the page, so there is one
 * place the id lives and one place to change it. Localhost and preview
 * deployments are excluded by the script itself rather than by building
 * differently — see the host check in site/analytics.js — because the build that
 * gets tested should be the build that ships.
 */
if (measurementId && !/^G-[A-Z0-9]+$/.test(measurementId)) {
  throw new Error(
    `GA_MEASUREMENT_ID is "${measurementId}", which is not a GA4 measurement id (expected G-XXXXXXXXXX).`,
  )
}

if (measurementId) {
  const analytics = await readFile(analyticsFile, 'utf8')
  if (!analytics.includes(PLACEHOLDER)) {
    throw new Error(`site/analytics.js no longer contains ${PLACEHOLDER}; the id cannot be injected.`)
  }
  await writeFile(analyticsFile, analytics.replace(PLACEHOLDER, measurementId), 'utf8')
}

/*
 * The invariant, checked rather than assumed: the app ships no third-party
 * script. This is a promise made in the privacy notice and on the landing page,
 * and the cheapest place to keep it honest is a failing build.
 */
const FORBIDDEN = ['googletagmanager', 'google-analytics', 'gtag(', 'dataLayer']

async function filesIn(dir) {
  const found = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) found.push(...(await filesIn(full)))
    else if (/\.(js|html|css|webmanifest)$/.test(entry.name)) found.push(full)
  }
  return found
}

const appFiles = await filesIn(path.join(dist, 'play'))
const leaks = []
for (const file of appFiles) {
  const contents = await readFile(file, 'utf8')
  for (const needle of FORBIDDEN) {
    if (contents.includes(needle)) leaks.push(`${path.relative(dist, file)} contains "${needle}"`)
  }
}
if (leaks.length > 0) {
  throw new Error(
    `Analytics leaked into the app, which must stay free of third-party scripts:\n  ${leaks.join('\n  ')}`,
  )
}

/* The dashboard is excluded too — it is behind a login and shows parents'
   email addresses, so its page paths are nobody else's business. */
const adminHtml = await readFile(path.join(dist, 'admin.html'), 'utf8')
if (adminHtml.includes('analytics.js')) {
  throw new Error('admin.html must not load analytics.js.')
}

const entries = await readdir(dist)
console.log(`site → dist/ (${entries.join(', ')})`)
console.log(
  measurementId
    ? `analytics: ${measurementId}, website only, after consent`
    : 'analytics: off (GA_MEASUREMENT_ID not set)',
)
