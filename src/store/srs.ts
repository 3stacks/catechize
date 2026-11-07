import { track } from '../lib/track.ts'
import { createEmptyCard, fsrs, State, type Card, type Grade as FsrsGrade } from 'ts-fsrs'
import type { Unit } from '../data/types.ts'
import { AGAIN, type Grade } from '../lib/grade.ts'
import { db, getSettings, newId, removeRows, type ReviewRow } from './db.ts'

// Scheduling is per chunk. A unit's "whole" card (recite the full answer with
// nothing showing) is created once every chunk is stable, so long answers are
// built up from parts and then rehearsed as one.

/** Days of stability every chunk needs before the whole-recitation card unlocks. */
export const WHOLE_UNLOCK_DAYS = 14

const DAY = 86_400_000

async function scheduler() {
  const s = await getSettings()
  return fsrs({ request_retention: s.retention, enable_fuzz: true })
}

export interface ChunkResult {
  index: number // chunk index, or -1 for the whole recitation
  grade: Grade
  errors: number
  words: number
}

/**
 * Record the outcome of a drill on one unit. Creates cards on first sight
 * (that is what "learning" a unit means), reviews each chunk that was tested,
 * and unlocks or reviews the whole card.
 */
export async function recordDrill(unit: Unit, docId: string, results: ChunkResult[], mode: ReviewRow['mode'], now = new Date()) {
  const f = await scheduler()
  const at = now.getTime()
  let first = false

  await db.transaction('rw', db.cards, db.log, db.learned, async () => {
    for (const r of results) {
      const id = `${unit.id}#${r.index < 0 ? 'whole' : r.index}`
      const existing = await db.cards.get(id)
      const card: Card = existing ? existing.card : createEmptyCard<Card>(now)
      const next = f.next(card, now, r.grade as FsrsGrade).card
      await db.cards.put({
        id,
        unitId: unit.id,
        docId,
        kind: r.index < 0 ? 'whole' : 'chunk',
        index: r.index,
        due: next.due.getTime(),
        card: next,
      })
      await db.log.add({ id: newId(), cardId: id, unitId: unit.id, at, rating: r.grade, errors: r.errors, words: r.words, mode })
    }
    first = !(await db.learned.get(unit.id))
    if (first) await db.learned.put({ unitId: unit.id, docId, at })

    // Unlock the whole card when every chunk is stable enough.
    const chunks = await db.cards.where('unitId').equals(unit.id).and((c) => c.kind === 'chunk').toArray()
    const hasWhole = await db.cards.get(`${unit.id}#whole`)
    const stable =
      unit.chunks.length > 1 &&
      chunks.length === unit.chunks.length &&
      chunks.every((c) => c.card.state === State.Review && c.card.stability >= WHOLE_UNLOCK_DAYS)
    if (stable && !hasWhole) {
      const card = createEmptyCard<Card>(now)
      await db.cards.put({ id: `${unit.id}#whole`, unitId: unit.id, docId, kind: 'whole', index: -1, due: at, card })
    }
  })
  if (first) track('Unit learned', { doc: docId })
}

export interface DueUnit {
  unitId: string
  docId: string
  chunks: number[] // due chunk indices
  whole: boolean // the whole-recitation card is due
  due: number // earliest due
}

/** Units with anything due, earliest first. */
export async function dueUnits(now = Date.now()): Promise<DueUnit[]> {
  const rows = await db.cards.where('due').belowOrEqual(now).toArray()
  const byUnit = new Map<string, DueUnit>()
  for (const r of rows) {
    const u = byUnit.get(r.unitId) ?? { unitId: r.unitId, docId: r.docId, chunks: [], whole: false, due: r.due }
    if (r.kind === 'whole') u.whole = true
    else u.chunks.push(r.index)
    u.due = Math.min(u.due, r.due)
    byUnit.set(r.unitId, u)
  }
  return [...byUnit.values()].sort((a, b) => a.due - b.due)
}

export interface UnitProgress {
  learned: boolean
  chunks: number
  mature: number // chunks with stability ≥ 21 days
  wholeUnlocked: boolean
  nextDue?: number
}

export async function unitProgress(unitIds: string[]): Promise<Map<string, UnitProgress>> {
  const rows = await db.cards.where('unitId').anyOf(unitIds).toArray()
  const out = new Map<string, UnitProgress>()
  for (const id of unitIds) out.set(id, { learned: false, chunks: 0, mature: 0, wholeUnlocked: false })
  for (const r of rows) {
    const p = out.get(r.unitId)!
    p.learned = true
    if (r.kind === 'whole') p.wholeUnlocked = true
    else {
      p.chunks++
      if (r.card.stability >= 21) p.mature++
    }
    p.nextDue = p.nextDue === undefined ? r.due : Math.min(p.nextDue, r.due)
  }
  return out
}

/** How many units were first learned today (local time), for the daily new-unit allowance. */
export async function learnedToday(docId?: string): Promise<number> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const rows = await db.learned.where('at').aboveOrEqual(start.getTime()).toArray()
  return docId ? rows.filter((r) => r.docId === docId).length : rows.length
}

/** Forget a unit entirely (cards, reviews and learned flag), on every device. */
export async function resetUnit(unitId: string) {
  await db.transaction('rw', db.cards, db.log, db.learned, db.tombstones, async () => {
    await removeRows('cards', (await db.cards.where('unitId').equals(unitId).primaryKeys()) as string[])
    await removeRows('log', (await db.log.where('unitId').equals(unitId).primaryKeys()) as string[])
    if (await db.learned.get(unitId)) await removeRows('learned', [unitId])
  })
}

export const isFailing = (g: Grade) => g === AGAIN
export const daysUntil = (ms: number) => Math.max(0, Math.round((ms - Date.now()) / DAY))
