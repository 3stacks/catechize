import type { DBCore, DBCoreMutateRequest, DBCoreTable, Dexie } from 'dexie'
import { SYNCED_TABLES } from '../../../../shared/protocol.ts'
import { SYNC_MARK, type SyncMark } from '../../../../src/store/db.ts'
import { reviveDates } from '../../../../src/store/sync.ts'

// Keeps a copy of every Dexie row in a durable store (SQLite on the device).
//
// The app runs the shared Dexie code on an IndexedDB in memory. A Dexie
// middleware notes each table and key that a write touches. Shortly after, the
// flush reads those keys back from Dexie and writes the result to the store:
// the row if it is there, a deletion if not. Because the flush reads the
// committed state, a transaction that fails leaves the store as it was.
//
// At start, hydrate() loads the rows back into Dexie with their own change
// time (_u) and their own push flag (_dirty), so sync carries on where it was.
//
// The rows keep the shape of the web app's rows, so a backup moves between the
// web app and the mobile app with no change.

export interface Row {
  tbl: string
  id: string
  /** The Dexie row as JSON. */
  data: string
}

export interface RowStore {
  all(): Row[]
  /** Empty the `clear` tables, then write `put` and delete `del`, in one transaction. */
  write(put: Row[], del: Pick<Row, 'tbl' | 'id'>[], clear: string[]): void
}

const SYNCED: readonly string[] = SYNCED_TABLES

export function persist(db: Dexie, store: RowStore, delay = 100) {
  /** Keys written since the last flush, per table. 'all': the whole table changed. */
  const touched = new Map<string, Set<string> | 'all'>()
  let quiet = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let flushing: Promise<void> = Promise.resolve()

  const note = (tbl: string, keys: unknown[] | 'all') => {
    const seen = touched.get(tbl)
    if (seen === 'all') return
    if (keys === 'all') touched.set(tbl, 'all')
    else {
      const set = seen ?? new Set<string>()
      for (const k of keys) set.add(String(k))
      touched.set(tbl, set)
    }
    clearTimeout(timer)
    timer = setTimeout(() => void flush(), delay)
  }

  const keysOf = (table: DBCoreTable, req: DBCoreMutateRequest): unknown[] | 'all' => {
    if (req.type === 'deleteRange') return 'all'
    if (req.type === 'delete') return req.keys
    if (req.keys) return req.keys
    const path = table.schema.primaryKey.keyPath
    if (typeof path !== 'string') return 'all'
    return req.values.map((v) => (v as Record<string, unknown>)[path])
  }

  // Level 1 is below Dexie's hooks (level 2), so the values carry _u and _dirty.
  db.use({
    stack: 'dbcore',
    name: 'Persist',
    level: 1,
    create: (down: DBCore): DBCore => ({
      ...down,
      table(name) {
        const table = down.table(name)
        return {
          ...table,
          mutate: (req) =>
            table.mutate(req).then((res) => {
              if (!quiet) note(name, keysOf(table, req))
              return res
            }),
        }
      },
    }),
  })

  async function flushOnce() {
    if (!touched.size) return
    const work = [...touched]
    touched.clear()
    const put: Row[] = []
    const del: Pick<Row, 'tbl' | 'id'>[] = []
    const clear: string[] = []
    for (const [tbl, keys] of work) {
      const table = db.table(tbl)
      if (keys === 'all') {
        clear.push(tbl)
        const path = table.schema.primKey.keyPath as string
        for (const row of await table.toArray()) put.push({ tbl, id: String(row[path]), data: JSON.stringify(row) })
        continue
      }
      const ids = [...keys]
      const rows = await table.bulkGet(ids)
      ids.forEach((id, i) => (rows[i] === undefined ? del.push({ tbl, id }) : put.push({ tbl, id, data: JSON.stringify(rows[i]) })))
    }
    store.write(put, del, clear)
  }

  /** Write every change so far to the store. Call it when the app goes to the background. */
  function flush(): Promise<void> {
    clearTimeout(timer)
    flushing = flushing.then(flushOnce, flushOnce)
    return flushing
  }

  /** Load the stored rows into Dexie. Call it once, before anything else reads the database. */
  async function hydrate() {
    const byTable = new Map<string, Record<string, unknown>[]>()
    for (const r of store.all()) {
      const row = reviveDates(r.tbl, JSON.parse(r.data) as Record<string, unknown>)
      // The mark tells the hooks of db.ts to keep _u and the push flag as they are.
      const mark: SyncMark = row._dirty ? 'dirty' : 'clean'
      const list = byTable.get(r.tbl) ?? []
      list.push(SYNCED.includes(r.tbl) ? { ...row, [SYNC_MARK]: mark } : row)
      byTable.set(r.tbl, list)
    }
    const names = new Set(db.tables.map((t) => t.name))
    quiet = true
    try {
      await db.transaction('rw', db.tables, async () => {
        for (const [tbl, rows] of byTable) if (names.has(tbl)) await db.table(tbl).bulkPut(rows)
      })
    } finally {
      quiet = false
    }
  }

  return { hydrate, flush }
}
