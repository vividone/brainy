/**
 * Copies the marketing site into `dist/` alongside the built app.
 *
 * Layout after a build:
 *   dist/index.html      landing page
 *   dist/privacy.html    privacy notice
 *   dist/img/            marketing screenshots
 *   dist/app/            the PWA
 */

import { cp, mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const site = path.join(root, 'site')
const dist = path.join(root, 'dist')

await mkdir(dist, { recursive: true })
await cp(site, dist, { recursive: true })

const entries = await readdir(dist)
console.log(`site → dist/ (${entries.join(', ')})`)
