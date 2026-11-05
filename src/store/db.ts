import Dexie, { type EntityTable, type Table } from 'dexie'
import type { Card } from 'ts-fsrs'
import type { Unit } from '../data/types.ts'
import type { TraditionChoice } from '../lib/tradition.ts'
import { SYNCED_TABLES, type SyncedTable } from '../../shared/protocol.ts'

// Learner state lives in IndexedDB on the device, so the app works offline.
// When the app is served by its own server, src/store/sync.ts copies every
// change to SQLite there and pulls changes from other devices. Text and proofs
// come from the static data files; only scheduling, progress, notes and the
// learner's own verses are stored here.

/** Fields every synced row carries. Set by the hooks below, not by callers. */
export interface Synced {
  /** Last change, ms epoch. Last writer wins when devices disagree. */
  _u?: number
  /** 1 = changed here and not yet pushed to the server. */
  _dirty?: 0 | 1
}

export interface CardRow extends Synced {
  id: string // `${unitId}#${chunkIndex}` or `${unitId}#whole`
  unitId: string
  docId: string
  kind: 'chunk' | 'whole'
  index: number // chunk index; -1 for whole
  due: number // ms epoch, mirrors card.due for indexing
  card: Card
}

/** One graded attempt at one card. Append-only. */
export interface ReviewRow extends Synced {
  id: string
  cardId: string
  unitId: string
  at: number
  rating: number
  errors: number
  words: number
  mode: InputMode | 'spoken'
}

/** A course works through a document in order, a few new units a day. */
export interface CourseRow extends Synced {
  docId: string
  perDay: number
  startedAt: number
}

export interface LearnedRow extends Synced {
  unitId: string
  docId: string
  at: number
}

/** The learner's own memory aid for a unit: a picture, an acrostic, a link. */
export interface NoteRow extends Synced {
  unitId: string
  docId: string
  text: string
}

/** Scripture the learner has added (from a proof text, or by reference). */
export type VerseUnit = Unit & Synced & { docId: 'verses'; addedAt: number }

export type InputMode = 'first-letter' | 'full-word'

export interface Settings extends Synced {
  id: 'settings'
  inputMode: InputMode
  retention: number
  lordsDayReviewOnly: boolean
  /** Hide part of the text between tracing and recall when learning. */
  fade: boolean
  /** Most reviews in one day. Units over the limit wait for the next day. 0 = no limit. */
  dailyReviewLimit: number
  /** Which confessions and catechisms to show. Unset until the learner chooses. */
  tradition?: TraditionChoice
}

export { inTradition, type TraditionChoice } from '../lib/tradition.ts'

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  inputMode: 'first-letter',
  retention: 0.9,
  lordsDayReviewOnly: false,
  fade: true,
  dailyReviewLimit: 0,
}

/** A synced row deleted on this device, waiting to be pushed. */
export interface Tombstone {
  key: string // `${tbl}:${id}`
  tbl: SyncedTable
  id: string
  u: number
}

/** Device-local values: sync position, server epoch. Never synced. */
export interface MetaRow {
  key: string
  value: unknown
}

// Tests give each simulated device its own database name.
const DB_NAME = (globalThis as { catechizeDbName?: string }).catechizeDbName ?? 'catechize'

export const db = new Dexie(DB_NAME) as Dexie & {
  cards: EntityTable<CardRow, 'id'>
  log: EntityTable<ReviewRow, 'id'>
  courses: EntityTable<CourseRow, 'docId'>
  learned: EntityTable<LearnedRow, 'unitId'>
  verses: EntityTable<VerseUnit, 'id'>
  settings: EntityTable<Settings, 'id'>
  notes: EntityTable<NoteRow, 'unitId'>
  tombstones: EntityTable<Tombstone, 'key'>
  meta: EntityTable<MetaRow, 'key'>
}

db.version(1).stores({
  cards: 'id, unitId, docId, due, kind',
  reviews: '++id, cardId, unitId, at',
  courses: 'docId',
  learned: 'unitId, docId, at',
  verses: 'id, addedAt',
  settings: 'id',
})

// v2: every synced table gets a _dirty index; the review log moves to string
// ids (so two devices never pick the same id); notes, tombstones and meta are new.
db.version(2)
  .stores({
    cards: 'id, unitId, docId, due, kind, _dirty',
    log: 'id, cardId, unitId, at, _dirty',
    courses: 'docId, _dirty',
    learned: 'unitId, docId, at, _dirty',
    verses: 'id, addedAt, _dirty',
    settings: 'id, _dirty',
    notes: 'unitId, docId, _dirty',
    tombstones: 'key',
    meta: 'key',
  })
  .upgrade(async (tx) => {
    const now = Date.now()
    const old = await tx.table('reviews').toArray()
    await tx.table('log').bulkPut(old.map(({ id: _id, ...r }) => ({ ...r, id: newId(), _u: r.at ?? now, _dirty: 1 })))
    for (const t of ['cards', 'courses', 'learned', 'verses', 'settings'])
      await tx
        .table(t)
        .toCollection()
        .modify((r: Synced) => {
          r._u = now
          r._dirty = 1
        })
  })

db.version(3).stores({ reviews: null })

// ------------------------------------------------------------------ change tracking

/**
 * Marker on a row written by the sync code. `clean` stores a server row as is;
 * `dirty` keeps the row's own time but queues it to push again.
 * Rows without the marker are the app's own writes: they get the current time
 * and wait to be pushed.
 */
export const SYNC_MARK = '_sync'
export type SyncMark = 'clean' | 'dirty'

for (const name of SYNCED_TABLES) {
  const table = db.table(name) as Table<Record<string, unknown>>
  table.hook('creating', (_key, obj) => {
    const mark = obj[SYNC_MARK] as SyncMark | undefined
    delete obj[SYNC_MARK]
    if (mark) obj._dirty = mark === 'dirty' ? 1 : 0
    else {
      obj._u = Date.now()
      obj._dirty = 1
    }
  })
  table.hook('updating', (mods) => {
    const m = mods as Record<string, unknown>
    const mark = m[SYNC_MARK] as SyncMark | undefined
    if (mark) return { [SYNC_MARK]: undefined, _dirty: mark === 'dirty' ? 1 : 0 }
    return { _u: Date.now(), _dirty: 1 }
  })
}

/**
 * Delete rows and remember the deletion so other devices delete them too.
 * Call inside a transaction that includes `db.tombstones`.
 */
export async function removeRows(tbl: SyncedTable, ids: string[]) {
  if (!ids.length) return
  const u = Date.now()
  await db.table(tbl).bulkDelete(ids)
  await db.tombstones.bulkPut(ids.map((id) => ({ key: `${tbl}:${id}`, tbl, id, u })))
}

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`

// ------------------------------------------------------------------ settings

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await db.settings.get('settings')) }
}

export async function saveSettings(patch: Partial<Settings>) {
  const { _u, _dirty, ...current } = await getSettings()
  await db.settings.put({ ...current, ...patch, id: 'settings' })
}

// ------------------------------------------------------------------ notes

export const getNote = (unitId: string) => db.notes.get(unitId)

export async function saveNote(unitId: string, docId: string, text: string) {
  await db.transaction('rw', db.notes, db.tombstones, async () => {
    if (text.trim()) await db.notes.put({ unitId, docId, text })
    else if (await db.notes.get(unitId)) await removeRows('notes', [unitId])
  })
}
