/**
 * Bundles and runs the content smoke test.
 *
 * Uses the esbuild that ships with Vite, so there is no extra dependency and
 * no need for a full test runner just to exercise the generators.
 */

import { build } from 'esbuild'
import { mkdir } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const outfile = path.join(root, 'node_modules', '.cache', 'kolo', 'smoke.mjs')

await mkdir(path.dirname(outfile), { recursive: true })

await build({
  entryPoints: [path.join(root, 'scripts', 'smoke-entry.ts')],
  bundle: true,
  outfile,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  logLevel: 'warning',
})

await import(pathToFileURL(outfile).href)
