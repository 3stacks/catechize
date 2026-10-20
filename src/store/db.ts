import Dexie, { type EntityTable } from 'dexie'
import type { Card } from 'ts-fsrs'
import type { Unit } from '../data/types.ts'

// All learner state lives in IndexedDB on the device. Text and proofs come from
// the static data files; only scheduling, progress and the learner's own
// verses are stored here.

export interface CardRow {
  id: string // `${unitId}#${chunkIndex}` or `${unitId}#whole`
  unitId: string
  docId: string
  kind: 'chunk' | 'whole'
  index: number // chunk index; -1 for whole
  due: number // ms epoch, mirrors card.due for indexing
  card: Card
}

export interface ReviewRow {
  id?: number
  cardId: string
  unitId: string
  at: number
  rating: number
  errors: number
  words: number
  mode: InputMode
}

/** A course works through a document in order, a few new units a day. */
export interface CourseRow {
  docId: string
  perDay: number
  startedAt: number
}

export interface LearnedRow {
  unitId: string
  docId: string
  at: number
}

/** Scripture the learner has added (from a proof text, or by reference). */
export type VerseUnit = Unit & { docId: 'verses'; addedAt: number }

export type InputMode = 'first-letter' | 'full-word'

export interface Settings {
  id: 'settings'
  inputMode: InputMode
  retention: number
  lordsDayReviewOnly: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  inputMode: 'first-letter',
  retention: 0.9,
  lordsDayReviewOnly: false,
}

export const db = new Dexie('catechize') as Dexie & {
  cards: EntityTable<CardRow, 'id'>
  reviews: EntityTable<ReviewRow, 'id'>
  courses: EntityTable<CourseRow, 'docId'>
  learned: EntityTable<LearnedRow, 'unitId'>
  verses: EntityTable<VerseUnit, 'id'>
  settings: EntityTable<Settings, 'id'>
}

db.version(1).stores({
  cards: 'id, unitId, docId, due, kind',
  reviews: '++id, cardId, unitId, at',
  courses: 'docId',
  learned: 'unitId, docId, at',
  verses: 'id, addedAt',
  settings: 'id',
})

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await db.settings.get('settings')) }
}

export async function saveSettings(patch: Partial<Settings>) {
  await db.settings.put({ ...(await getSettings()), ...patch, id: 'settings' })
}
