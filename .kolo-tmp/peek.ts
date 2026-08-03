import { verbalSubject } from '../src/content/ng-ube/verbal/index'
import { ngLocale } from '../src/content/ng-ube/locale'
import { makeRng } from '../src/engine/rng'
import { describeAnswer } from '../src/engine/answer'
import type { Difficulty } from '../src/engine/types'

let n = 0
for (const strand of verbalSubject.strands) {
  console.log(`\n=== ${strand.name} (${strand.id}) ===`)
  for (const skill of strand.skills) {
    console.log(`\n-- ${skill.id} [${skill.yearBand}] ${skill.title}`)
    for (const d of [1, 3, 5] as Difficulty[]) {
      for (let s = 0; s < 3; s++) {
        const item = skill.generate({ rng: makeRng(++n * 7919 + d * 13), difficulty: d, locale: ngLocale })
        console.log(`  d${d} | ${item.prompt.replace(/\n/g, ' / ')}`)
        console.log(`       => ${describeAnswer(item)}${item.type === 'multiple-choice' ? '   [' + item.choices.map((c) => c.label).join(' | ') + ']' : ''}`)
        if (item.explanation) console.log(`       ~ ${item.explanation}`)
      }
    }
  }
}
