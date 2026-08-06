/** Prints real questions from named skills, to be read by a human. */
import { registerAllCurricula } from '../src/content'
import { listCurricula } from '../src/engine/registry'
import { makeRng } from '../src/engine/rng'
import { describeAnswer } from '../src/engine/answer'
import type { SkillDef } from '../src/engine/types'

registerAllCurricula()
const wanted = process.argv.slice(2)
const all: SkillDef[] = []
for (const c of listCurricula()) for (const s of c.subjects) for (const st of s.strands ?? []) all.push(...(st.skills ?? []))

for (const id of wanted) {
  const skill = all.find((s) => s.id === id)
  if (!skill) { console.log(`?? ${id} not found`); continue }
  console.log(`\n===== ${skill.title} (${skill.id}) =====`)
  for (let i = 0; i < 5; i++) {
    const item = skill.generate({ rng: makeRng(1000 + i * 37), difficulty: ((i % 3) + 2) as 2 | 3 | 4, locale: listCurricula()[0].locale })
    console.log(`\n  ${item.prompt.replace(/\n/g, '\n  ')}`)
    if (item.type === 'multiple-choice') console.log(`    options: ${item.choices.map((o) => o.label).join('  |  ')}`)
    if (item.type === 'tap-many') console.log(`    options: ${item.options.map((o) => o.label).join('  |  ')}`)
    console.log(`    answer:  ${describeAnswer(item)}`)
    if (item.explanation) console.log(`    why:     ${item.explanation}`)
  }
}
