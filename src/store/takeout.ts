import { SYNCED_TABLES } from '../../shared/protocol.ts'
import { db, newId, type ReviewRow } from './db.ts'
import { reviveDates, syncNow } from './sync.ts'

// Data takeout: all of the learner's data as one JSON file, which the app can
// import again, and the review history as a CSV file for a spreadsheet.

const TABLES = SYNCED_TABLES

/** Every row of every learner table, in the backup format. */
export async function takeout(now = new Date()) {
  const dump: Record<string, unknown[]> = {}
  for (const t of TABLES) dump[t] = (await db.table(t).toArray()).map(({ _dirty, ...r }) => r)
  return { app: 'catechize', version: 2, at: now.toISOString(), ...dump }
}

const RATING = ['', 'Again', 'Hard', 'Good', 'Easy']

const cell = (v: unknown) => {
  const s = String(v ?? '')
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** The review history, one row for each review, oldest first. */
export function reviewsCsv(rows: ReviewRow[]): string {
  const head = ['date', 'document', 'unit', 'part', 'rating', 'errors', 'words', 'mode']
  const lines = [...rows]
    .sort((a, b) => a.at - b.at)
    .map((r) => {
      const part = r.cardId.split('#')[1] ?? ''
      const doc = r.unitId.startsWith('kjv-') ? 'verses' : r.unitId.split('-')[0]
      return [new Date(r.at).toISOString(), doc, r.unitId, part === 'whole' ? 'whole' : Number(part) + 1, RATING[r.rating] ?? r.rating, r.errors, r.words, r.mode].map(cell).join(',')
    })
  return [head.join(','), ...lines].join('\r\n') + '\r\n'
}

export type Backup = Record<string, unknown> & { app: 'catechize' }

/** Read a backup file. Throws an error with a message for the learner when the file is not a backup. */
export function parseBackup(json: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('This file is not a Catechize backup. It is not JSON.')
  }
  const b = data as Record<string, unknown> | null
  if (!b || typeof b !== 'object' || b.app !== 'catechize') throw new Error('This file is not a Catechize backup.')
  if (typeof b.version !== 'number' || b.version > 2) throw new Error('This backup comes from a newer version of Catechize. Update the app, then try again.')
  for (const t of [...TABLES, 'reviews']) {
    if (b[t] !== undefined && !Array.isArray(b[t])) throw new Error(`This backup is damaged: "${t}" is not a list.`)
  }
  return b as Backup
}

/** How much a backup holds, to show before the learner replaces their data. */
export function backupSummary(b: Backup) {
  const n = (t: string) => (Array.isArray(b[t]) ? (b[t] as unknown[]).length : 0)
  return { learned: n('learned'), reviews: n('log') + n('reviews'), verses: n('verses'), at: typeof b.at === 'string' ? b.at : undefined }
}

/**
 * Replace all data on this device with a backup. With sync on, the backup also
 * replaces the data on the server and on other devices: the rows it does not
 * have are deleted everywhere.
 */
export async function restore(data: Backup) {
  // Version 1 kept the review log in "reviews", with number ids.
  if (data.version === 1 && Array.isArray(data.reviews)) data.log = data.reviews.map((r: Record<string, unknown>) => ({ ...r, id: newId() }))
  const now = Date.now()
  await db.transaction('rw', [...TABLES.map((t) => db.table(t)), db.tombstones], async () => {
    for (const t of TABLES) {
      const table = db.table(t)
      const keep = new Set<string>()
      const rows = ((data[t] ?? []) as Record<string, unknown>[]).map((r) => {
        const { _dirty, _u, ...row } = reviveDates(t, r)
        keep.add(String(row[table.schema.primKey.keyPath as string]))
        return row
      })
      const gone = ((await table.toCollection().primaryKeys()) as string[]).filter((k) => !keep.has(String(k)))
      await table.bulkDelete(gone)
      await db.tombstones.bulkPut(gone.map((id) => ({ key: `${t}:${id}`, tbl: t, id: String(id), u: now })))
      // Imported rows count as new changes, so they win over older copies elsewhere.
      await table.bulkPut(rows)
    }
  })
  void syncNow()
}

/** Save text as a file on the learner's device. */
export function download(name: string, type: string, text: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
