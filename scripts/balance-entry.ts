/**
 * Flags questions whose answer is effectively fixed.
 *
 * A true/false that is always true, or a multiple-choice whose answer is the
 * same value every time, teaches a child to guess rather than to think. The
 * smoke test cannot see it: every item is individually well-formed.
 */
import { registerAllCurricula } from '../src/content'
import { listCurricula } from '../src/engine/registry'
import { makeRng } from '../src/engine/rng'
import { describeAnswer } from '../src/engine/answer'
import type { Difficulty, SkillDef } from '../src/engine/types'

registerAllCurricula()
const DRAWS = 60
let flagged = 0

for (const c of listCurricula()) {
  const skills: SkillDef[] = c.subjects.flatMap((s) => s.strands.flatMap((st) => st.skills))
  for (const skill of skills) {
    const answers: string[] = []
    let kind = ''
    for (let i = 0; i < DRAWS; i++) {
      const item = skill.generate({
        rng: makeRng(7000 + i * 131),
        difficulty: ((i % 5) + 1) as Difficulty,
        locale: c.locale,
      })
      kind = item.type
      answers.push(describeAnswer(item))
    }
    const distinct = new Set(answers).size
    if (kind === 'true-false' && distinct < 2) {
      console.log(`✖ ${skill.id}: true/false is always "${answers[0]}"`)
      flagged++
    } else if (kind !== 'true-false' && distinct === 1) {
      console.log(`✖ ${skill.id}: the answer is always "${answers[0]}"`)
      flagged++
    }
  }
}
console.log(flagged ? `\n✖ ${flagged} skill(s) with a fixed answer` : '\n✔ no skill has a fixed answer')
