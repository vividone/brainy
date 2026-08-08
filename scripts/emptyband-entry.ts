/** Confirms no curriculum can offer a class it cannot teach. */
import { registerAllCurricula } from '../src/content'
import { ageOptions, bandForAge, listCurricula, playableBands, includedBands, subjectsForBand } from '../src/engine/registry'

registerAllCurricula()
let bad = 0

for (const c of listCurricula()) {
  const playable = playableBands(c.id).map((b) => b.id)
  const ages = ageOptions(c.id)
  console.log(`\n${c.id}`)
  console.log(`  teachable classes : ${playable.join(', ') || 'NONE'}`)
  console.log(`  ages offered      : ${ages.join(', ') || 'NONE'}`)

  for (const age of ages) {
    const band = bandForAge(c.id, age)
    const bands = includedBands(c.id, band.id)
    const reachable = subjectsForBand(c.id, band.id)
      .filter((s) => s.available)
      .flatMap((s) => s.strands.flatMap((st) => st.skills))
      .filter((s) => bands.includes(s.yearBand)).length
    if (reachable === 0) {
      console.log(`  ✖ age ${age} -> ${band.id} has NOTHING to play`)
      bad++
    }
  }
}
console.log(bad ? `\n✖ ${bad} age(s) still lead to an empty app` : '\n✔ every age offered leads to a class with content')
