/**
 * Bundles and runs the badge reachability test.
 *
 * Same shape as the other checks in here: esbuild from Vite, no extra
 * dependency and no test runner needed to import a couple of pure functions.
 */

import { build } from 'esbuild'
import { mkdir } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const outfile = path.join(root, 'node_modules', '.cache', 'kolo', 'badges.mjs')

await mkdir(path.dirname(outfile), { recursive: true })

await build({
  entryPoints: [path.join(root, 'scripts', 'badges-entry.ts')],
  bundle: true,
  outfile,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  logLevel: 'warning',
})

await import(pathToFileURL(outfile).href)
