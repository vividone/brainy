/**
 * Keeping a child's progress, and refusing to keep anything else.
 *
 * This is the file where the promise in the privacy notice either is or is not
 * true, so it is written to be readable by somebody checking that claim rather
 * than by somebody adding a feature.
 *
 * The client already sends a minimised payload — `src/state/sync.ts` builds it
 * from a whitelist. This validates it against **the same whitelist and rejects
 * anything else**, and the rejection is the point. Stripping unknown keys would
 * be friendlier and would make the guarantee unverifiable: a modified client, or
 * a future careless change to the builder, would quietly start uploading a
 * child's session history and nothing would say so. A 422 says so loudly, and it
 * is what the smoke test asserts.
 *
 * What is deliberately never accepted:
 *
 *   history     the last 60 sessions, with every question answered wrongly
 *   byDay       a day-by-day record of when a child was using a tablet
 *   seenItems   which questions they have been shown recently
 *
 * Those three are the difference between "how far have they got" and "a log of
 * what this child has been doing", and the second is not ours to hold. The cost
 * is real and stated in the notice: a restored tablet has the child's mastery,
 * coins and streak, but its parent report starts its weekly chart again.
 */

import { all, one, query } from './db.js'

/** Per-child document ceiling. Mastery for a whole curriculum is a few KB. */
export const MAX_STATE_BYTES = 128 * 1024
/** Children per upload. A family, not a school. */
export const MAX_LEARNERS = 12

/* ------------------------------------------------------------------ *
 * The whitelist
 * ------------------------------------------------------------------ */

const PROFILE_FIELDS = ['name', 'age', 'curriculumId', 'yearBand', 'colour']

/**
 * Every key allowed inside a learner's state document, and how to check it.
 *
 * `deep` means "an object of objects we do not inspect further" — the progress
 * map is keyed by skill id, and enumerating skills here would mean this file
 * needed editing every time content was authored.
 */
const STATE_FIELDS = {
  settings: 'object',
  progress: 'deep',
  levelStars: 'deep',
  economy: 'object',
  streak: 'object',
  badges: 'array',
  totals: 'object',
  answerStreak: 'number',
  bestAnswerStreak: 'number',
}

/** Named explicitly so the error can say what was wrong rather than "bad key". */
const REFUSED = {
  history: 'a record of every session and every question answered wrongly',
  byDay: 'a day-by-day log of when the tablet was used',
  seenItems: 'which questions the child has recently been shown',
}

const typeOk = (value, kind) => {
  if (value === undefined || value === null) return true
  if (kind === 'number') return typeof value === 'number' && Number.isFinite(value)
  if (kind === 'array') return Array.isArray(value)
  return typeof value === 'object' && !Array.isArray(value)
}

/**
 * Check one learner from an upload.
 *
 * Returns `{ ok: false, error }` rather than throwing, because the caller turns
 * several of these into one 422 that names every problem at once — a client
 * author fixing this wants the whole list, not the first item.
 */
export function validateLearner(entry) {
  if (!entry || typeof entry !== 'object') return { ok: false, error: 'not an object' }

  const id = typeof entry.id === 'string' ? entry.id.slice(0, 64) : null
  if (!id) return { ok: false, error: 'missing id' }

  const revision = Number(entry.revision)
  if (!Number.isInteger(revision) || revision < 0) return { ok: false, error: `${id}: revision must be a whole number` }

  const state = entry.state
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return { ok: false, error: `${id}: state must be an object` }
  }

  for (const [key] of Object.entries(state)) {
    if (Object.hasOwn(REFUSED, key)) {
      return { ok: false, error: `${id}: "${key}" is never accepted — it is ${REFUSED[key]}` }
    }
    if (!Object.hasOwn(STATE_FIELDS, key)) {
      return { ok: false, error: `${id}: "${key}" is not a field we keep` }
    }
    if (!typeOk(state[key], STATE_FIELDS[key])) {
      return { ok: false, error: `${id}: "${key}" is the wrong shape` }
    }
  }

  const size = Buffer.byteLength(JSON.stringify(state), 'utf8')
  if (size > MAX_STATE_BYTES) {
    return { ok: false, error: `${id}: ${size} bytes is more than we keep per child` }
  }

  /* The profile travels alongside the state, not inside it. */
  const profile = {}
  for (const field of PROFILE_FIELDS) {
    if (entry.profile && entry.profile[field] !== undefined) profile[field] = entry.profile[field]
  }

  return { ok: true, learner: { id, revision, state, profile, size } }
}

/* ------------------------------------------------------------------ *
 * Reading and writing
 * ------------------------------------------------------------------ */

/** Everything this account has asked us to keep, ready to hand back. */
export async function readAll(parentId) {
  const rows = await all(
    `select l.id, l.name, l.age, l.curriculum_id, l.year_band, l.colour,
            s.revision, s.state, s.updated_at
     from learners l
     left join learner_state s on s.learner_id = l.id
     where l.parent_id = $1 and l.deleted_at is null
     order by l.created_at`,
    [parentId],
  )

  return rows.map((row) => ({
    id: row.id,
    revision: Number(row.revision ?? 0),
    profile: {
      name: row.name,
      age: row.age,
      curriculumId: row.curriculum_id,
      yearBand: row.year_band,
      colour: row.colour,
    },
    /* Parsed here so a corrupt row is a null rather than a 500 that takes the
       whole sync down for a family's other children. */
    state: row.state ? safeParse(row.state) : null,
    updatedAt: row.updated_at ?? null,
  }))
}

function safeParse(text) {
  try {
    return JSON.parse(text)
  } catch {
    console.error('[brainy:sync] stored state was not valid JSON')
    return null
  }
}

/**
 * Store one learner's state, if what arrived is newer than what is here.
 *
 * Last-writer-wins **per child**, on a revision the client increments. Not a
 * timestamp: device clocks are wrong often enough that a tablet set to next year
 * would win every conflict forever. A revision is only ever compared with the
 * previous revision of the same child, so it needs no agreement between devices
 * beyond counting upwards.
 *
 * Returns what the client should now believe, so a rejected upload comes back
 * with the newer copy attached rather than just a "no".
 */
export async function writeOne(parentId, learner, deviceLabel) {
  /* Never trust the id: it has to belong to this account. */
  const owned = await one(`select id from learners where id = $1 and parent_id = $2`, [learner.id, parentId])
  if (!owned) return { status: 'unknown' }

  const existing = await one(`select revision, state from learner_state where learner_id = $1`, [learner.id])
  const currentRevision = Number(existing?.revision ?? 0)

  if (existing && learner.revision <= currentRevision) {
    return {
      status: 'stale',
      revision: currentRevision,
      state: existing.state ? safeParse(existing.state) : null,
    }
  }

  const document = JSON.stringify(learner.state)
  if (existing) {
    await query(
      `update learner_state set
         prev_revision = revision, prev_state = state,
         revision = $2, state = $3, device_label = $4, updated_at = now()
       where learner_id = $1`,
      [learner.id, learner.revision, document, deviceLabel ?? null],
    )
  } else {
    await query(
      `insert into learner_state (learner_id, revision, state, device_label) values ($1, $2, $3, $4)`,
      [learner.id, learner.revision, document, deviceLabel ?? null],
    )
  }

  return { status: 'stored', revision: learner.revision }
}

/** Remove one child's kept progress, leaving the licence and the account alone. */
export async function forgetState(parentId, learnerId) {
  const owned = await one(`select id from learners where id = $1 and parent_id = $2`, [learnerId, parentId])
  if (!owned) return false
  await query(`delete from learner_state where learner_id = $1`, [learnerId])
  return true
}
