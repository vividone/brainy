/**
 * Exercises every generator in every registered curriculum at every
 * difficulty and checks the items it produces are well-formed.
 *
 * A broken generator is invisible until a child hits it mid-session, so this
 * runs the whole content library in a couple of seconds instead.
 */

import { registerAllCurricula } from '../src/content'
import { listCurricula } from '../src/engine/registry'
import { makeRng } from '../src/engine/rng'
import { checkAnswer, describeAnswer, itemSignature } from '../src/engine/answer'
import type { Difficulty, Item, SkillDef } from '../src/engine/types'

const SAMPLES_PER_DIFFICULTY = 40

const problems: string[] = []
const warnings: string[] = []

function check(cond: boolean, where: string, message: string, list = problems) {
  if (!cond) list.push(`${where}: ${message}`)
}

function validate(item: Item, where: string) {
  check(!!item.prompt?.trim(), where, 'empty prompt')
  check(item.prompt.length < 220, where, `prompt is very long (${item.prompt.length} chars)`, warnings)

  switch (item.type) {
    case 'multiple-choice': {
      check(item.choices.length >= 2, where, `only ${item.choices.length} choice(s)`)
      check(
        item.choices.some((c) => c.id === item.answerId),
        where,
        'answerId is not among the choices',
      )
      const labels = item.choices.map((c) => c.label ?? JSON.stringify(c.visual))
      check(new Set(labels).size === labels.length, where, `duplicate choices: ${labels.join(' | ')}`)
      check(
        item.choices.every((c) => c.label !== undefined || c.visual !== undefined),
        where,
        'a choice has neither label nor visual',
      )
      break
    }
    case 'numeric-entry':
      check(Number.isFinite(item.answer), where, 'answer is not a finite number')
      check(Number.isInteger(item.answer), where, `non-integer answer ${item.answer}`)
      check(item.answer >= 0, where, `negative answer ${item.answer}`)
      break
    case 'true-false':
      check(typeof item.answer === 'boolean', where, 'answer is not boolean')
      break
    case 'order': {
      check(item.tokens.length >= 2, where, 'fewer than 2 tokens')
      check(item.correctOrder.length === item.tokens.length, where, 'correctOrder length mismatch')
      const ids = new Set(item.tokens.map((t) => t.id))
      check(item.correctOrder.every((id) => ids.has(id)), where, 'correctOrder references unknown token')
      const labels = item.tokens.map((t) => t.label)
      check(new Set(labels).size === labels.length, where, `duplicate tokens: ${labels.join(' | ')}`)
      break
    }
    case 'tap-many': {
      check(item.options.length >= 2, where, 'fewer than 2 options')
      check(item.correctIds.length >= 1, where, 'no correct option')
      check(item.correctIds.length < item.options.length, where, 'every option is correct', warnings)
      const ids = new Set(item.options.map((o) => o.id))
      check(item.correctIds.every((id) => ids.has(id)), where, 'correctIds references unknown option')
      break
    }
    case 'match': {
      check(item.left.length === Object.keys(item.pairs).length, where, 'pairs do not cover every left item')
      const rightIds = new Set(item.right.map((r) => r.id))
      check(Object.values(item.pairs).every((id) => rightIds.has(id)), where, 'pair points at unknown right item')
      break
    }
    case 'number-line':
      check(item.answer >= item.min && item.answer <= item.max, where, 'answer outside the line')
      break
    case 'count-objects':
      check(item.count > 0, where, 'count must be positive')
      check(item.count <= 40, where, `counting ${item.count} objects is a lot for age 7`, warnings)
      break
  }

  // Fractions offered at this age must be proper. A Basic 2/3 child has never
  // met a fraction bigger than a whole, so an option like 2/1 is not a mistake
  // they could plausibly make — it is just noise in the choice list.
  const properFraction = (label: string | undefined) => {
    const m = label?.match(/^(\d+)\s*\/\s*(\d+)$/)
    if (!m) return true
    return Number(m[1]) < Number(m[2]) && Number(m[2]) > 1
  }
  if (item.type === 'multiple-choice') {
    for (const c of item.choices) {
      check(properFraction(c.label), where, `improper fraction option "${c.label}"`)
    }
  }
  if (item.type === 'order') {
    for (const t of item.tokens) {
      check(properFraction(t.label), where, `improper fraction token "${t.label}"`)
    }
  }

  const v = item.visual
  if (v?.kind === 'fraction') {
    check(v.parts >= 2, where, 'fraction with fewer than 2 parts')
    check(v.shaded >= 0 && v.shaded <= v.parts, where, `shaded ${v.shaded} of ${v.parts}`)
  }
  if (v?.kind === 'clock') {
    check(v.hour >= 1 && v.hour <= 12, where, `clock hour ${v.hour}`)
    check(v.minute >= 0 && v.minute < 60, where, `clock minute ${v.minute}`)
  }
  if (v?.kind === 'groups') check(v.groups * v.per <= 60, where, 'too many objects to draw', warnings)

  // The correct answer must actually pass the checker the app uses.
  const correctResponse =
    item.type === 'multiple-choice'
      ? item.answerId
      : item.type === 'numeric-entry'
        ? item.answer
        : item.type === 'true-false'
          ? item.answer
          : item.type === 'number-line'
            ? item.answer
            : item.type === 'count-objects'
              ? item.count
              : item.type === 'order'
                ? item.correctOrder
                : item.type === 'tap-many'
                  ? item.correctIds
                  : item.pairs
  check(checkAnswer(item, correctResponse), where, 'the correct answer fails checkAnswer()')
  check(!!describeAnswer(item), where, 'describeAnswer() produced nothing')
}

registerAllCurricula()

let skillCount = 0
let itemCount = 0
const noExplanation: string[] = []
/** Distinct questions observed per skill, for the content-depth report. */
const depth: { id: string; distinct: number; draws: number; forms: number; topShare: number }[] = []

/**
 * The *shape* of a question, with its variable parts blanked out.
 *
 * Exact-duplicate counting is not what a child experiences. A skill that asks
 * "Which word means the same as 'X'?" two hundred times has two hundred
 * distinct questions and exactly one question form — and it feels like the
 * same question every time. This is the metric that matches the complaint.
 */
function promptShape(prompt: string): string {
  return prompt
    .replace(/\d+/g, '#')
    .replace(/["'“”‘’][^"'“”‘’]{1,40}["'“”‘’]/g, 'W')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90)
}

for (const curriculum of listCurricula()) {
  for (const subject of curriculum.subjects) {
    for (const strand of subject.strands) {
      for (const skill of strand.skills as SkillDef[]) {
        skillCount++
        let explained = 0
        // Signature, not prompt text: shape questions all share one prompt
        // and differ only in the picture.
        const signatures = new Set<string>()
        const shapes = new Map<string, number>()

        for (let d = 1 as Difficulty; d <= 5; d = (d + 1) as Difficulty) {
          for (let s = 0; s < SAMPLES_PER_DIFFICULTY; s++) {
            const rng = makeRng(d * 100_003 + s * 7919 + skillCount * 31)
            const where = `${skill.id} d${d} #${s}`
            let item: Item
            try {
              item = skill.generate({ rng, difficulty: d, locale: curriculum.locale })
            } catch (err) {
              problems.push(`${where}: generator threw — ${(err as Error).message}`)
              continue
            }
            itemCount++
            signatures.add(itemSignature(item))
            const shape = promptShape(item.prompt)
            shapes.set(shape, (shapes.get(shape) ?? 0) + 1)
            if (item.explanation) explained++
            validate(item, where)
          }
        }

        // A skill with a tiny question space gets memorised rather than
        // learned, which is the whole failure mode generation exists to avoid.
        const draws = 5 * SAMPLES_PER_DIFFICULTY
        const topCount = Math.max(0, ...shapes.values())
        depth.push({
          id: skill.id,
          distinct: signatures.size,
          draws,
          forms: shapes.size,
          topShare: draws ? topCount / draws : 1,
        })
        if (signatures.size / draws < 0.3) {
          warnings.push(
            `${skill.id}: low variety — only ${signatures.size} distinct questions in ${draws} draws`,
          )
        }
        if (explained === 0) noExplanation.push(skill.id)
        if (!skill.hint) warnings.push(`${skill.id}: no hint`)
        if (!skill.helpAtHome) warnings.push(`${skill.id}: no helpAtHome tip for the parent zone`)
      }
    }
  }
}

// Prerequisites must point at skills that exist, or session planning silently
// stalls on a skill that can never become ready.
for (const curriculum of listCurricula()) {
  const ids = new Set<string>()
  for (const s of curriculum.subjects) for (const st of s.strands) for (const sk of st.skills) ids.add(sk.id)
  for (const s of curriculum.subjects) {
    for (const st of s.strands) {
      for (const sk of st.skills) {
        for (const p of sk.prerequisites ?? []) {
          if (!ids.has(p)) problems.push(`${sk.id}: prerequisite "${p}" does not exist`)
        }
      }
    }
  }
}

for (const id of noExplanation) warnings.push(`${id}: never sets an explanation`)

console.log(`\nChecked ${itemCount} generated items across ${skillCount} skills.\n`)

/*
 * Content depth. `distinct/draws` is a *sample* of each skill's question
 * space, not its size: a skill that returns 200 distinct questions in 200
 * draws has not been exhausted, it has simply never repeated. Skills whose
 * ratio drops well below 1.0 are the ones a child will start recognising.
 */
{
  const draws = 5 * SAMPLES_PER_DIFFICULTY
  const saturated = depth.filter((d) => d.distinct === d.draws).length
  const thin = [...depth].sort((a, b) => a.distinct - b.distinct).slice(0, 20)

  const buckets: [string, number][] = [
    ['< 25   (repeats within a week)', depth.filter((d) => d.distinct < 25).length],
    ['25-59  (repeats within a month)', depth.filter((d) => d.distinct >= 25 && d.distinct < 60).length],
    ['60-119', depth.filter((d) => d.distinct >= 60 && d.distinct < 120).length],
    ['120+  (deep)', depth.filter((d) => d.distinct >= 120).length],
  ]

  console.log('Content depth')
  console.log(`  ${saturated}/${depth.length} skills never repeated in ${draws} draws`)
  for (const [label, n] of buckets) console.log(`  ${label.padEnd(34)} ${n} skills`)

  // Question *shape* is what a child notices. One form repeated with fresh
  // numbers still feels like the same question.
  const oneForm = depth.filter((d) => d.forms <= 1)
  const samey = depth.filter((d) => d.forms > 1 && d.topShare > 0.6)
  console.log('\n  Question forms')
  console.log(`    ${oneForm.length} skills ask exactly ONE question shape`)
  console.log(`    ${samey.length} more lean on one shape for over 60% of draws`)
  if (oneForm.length) {
    console.log('    single-shape skills:')
    for (const d of [...oneForm].sort((a, b) => a.id.localeCompare(b.id)).slice(0, 30)) {
      console.log(`      ${d.id}`)
    }
    if (oneForm.length > 30) console.log(`      … and ${oneForm.length - 30} more`)
  }
  if (samey.length) {
    console.log('    dominated by one shape:')
    for (const d of [...samey].sort((a, b) => b.topShare - a.topShare)) {
      console.log(`      ${d.id.padEnd(42)} ${Math.round(d.topShare * 100)}% one shape, ${d.forms} forms`)
    }
  }

  console.log('\n  thinnest by distinct questions:')
  for (const d of thin.slice(0, 8)) {
    const sessions = Math.max(1, Math.round(d.distinct / 6))
    console.log(`    ${d.id.padEnd(42)} ${String(d.distinct).padStart(3)} distinct  (~${sessions} sessions)`)
  }
  console.log()
}

if (warnings.length) {
  console.log(`⚠ ${warnings.length} warning(s):`)
  for (const w of warnings.slice(0, 40)) console.log(`  · ${w}`)
  if (warnings.length > 40) console.log(`  … and ${warnings.length - 40} more`)
  console.log()
}

if (problems.length) {
  console.log(`✖ ${problems.length} problem(s):`)
  const shown = new Set<string>()
  for (const p of problems) {
    const key = p.split(':')[0].split(' ')[0] + p.slice(p.indexOf(':'))
    if (shown.has(key)) continue
    shown.add(key)
    console.log(`  · ${p}`)
    if (shown.size >= 40) break
  }
  console.log(`\n(${problems.length} total, ${shown.size} unique shown)`)
  process.exit(1)
}

console.log('✔ All generators produce valid items.')
