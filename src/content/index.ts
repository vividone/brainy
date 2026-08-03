/**
 * The only place that knows which curriculum packs exist.
 *
 * Adding a curriculum: create the folder, export a `Curriculum`, add two
 * lines here. Nothing in `engine/` or `screens/` changes.
 */

import { registerCurriculum } from '../engine/registry'
import { ngUbe } from './ng-ube'
import { ukNc } from './uk-nc'

let registered = false

export function registerAllCurricula(): void {
  if (registered) return
  registerCurriculum(ngUbe)
  registerCurriculum(ukNc)
  registered = true
}

export const DEFAULT_CURRICULUM_ID = ngUbe.id
export const DEFAULT_YEAR_BAND = 'b3'
