/**
 * Empties `dist/` before a build.
 *
 * Vite only empties its own `outDir` (`dist/app`), so without this any file
 * left over from an earlier output layout stays at the root of `dist/` and
 * gets deployed alongside the real site.
 */

import { rm } from 'node:fs/promises'
import path from 'node:path'

const dist = path.resolve(import.meta.dirname, '..', 'dist')
await rm(dist, { recursive: true, force: true })
console.log('cleaned dist/')
