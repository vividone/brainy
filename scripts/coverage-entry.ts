/**
 * What we actually teach, per curriculum, subject, class and strand.
 *
 * Written to compare our skill list against the official scheme of work
 * rather than against memory. Prints a plain inventory and, given a scheme
 * file, the topics in it we have nothing for.
 */

import { registerAllCurricula } from '../src/content'
import { listCurricula, subjectsForBand } from '../src/engine/registry'
import type { SkillDef } from '../src/engine/types'

registerAllCurricula()

const only = process.argv[2] ?? 'ng-ube'

for (const curriculum of listCurricula()) {
  if (curriculum.id !== only) continue
  console.log(`\n${'='.repeat(70)}\n${curriculum.flag} ${curriculum.name} (${curriculum.id})\n${'='.repeat(70)}`)

  for (const band of curriculum.yearBands) {
    const subjects = subjectsForBand(curriculum.id, band.id)
    const rows: string[] = []
    let bandTotal = 0

    for (const subject of subjects) {
      const strands = subject.strands ?? []
      const skills: SkillDef[] = strands.flatMap((s) => s.skills ?? [])
      const here = skills.filter((s) => s.yearBand === band.id)
      if (!here.length) continue
      bandTotal += here.length

      const byStrand = new Map<string, string[]>()
      for (const s of here) {
        const strand = strands.find((st) => st.skills?.includes(s))
        const key = strand?.name ?? '(none)'
        if (!byStrand.has(key)) byStrand.set(key, [])
        byStrand.get(key)!.push(s.title)
      }
      rows.push(`  ${subject.name} — ${here.length}`)
      for (const [strand, titles] of byStrand) {
        rows.push(`     ${strand}: ${titles.join(' · ')}`)
      }
    }

    console.log(`\n${band.label} (${band.id}) — ${bandTotal} skills`)
    console.log(rows.join('\n') || '  (nothing)')
  }
}
