import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import type { Unit } from '../../../../src/data/types.ts'
import type { Row, RowStore } from './persist.ts'

// The mobile app keeps Dexie in memory and writes each change through to
// SQLite (persist.ts). Here an array stands in for SQLite. Each "launch" is a
// fresh copy of the store modules with a new, empty IndexedDB, as when the app
// starts again. The root `npm test` runs this file.

const unit: Unit = {
  id: 'wsc-1',
  ref: 'Q. 1',
  prompt: 'What is the chief end of man?',
  text: "Man's chief end is to glorify God, and to enjoy him for ever.",
  chunks: [
    [0, 34],
    [35, 62],
  ],
  proofs: [],
}

function memoryStore(): RowStore & { rows: Map<string, Row> } {
  const rows = new Map<string, Row>()
  return {
    rows,
    all: () => [...rows.values()],
    write(put, del, clear) {
      for (const tbl of clear) for (const [k, r] of rows) if (r.tbl === tbl) rows.delete(k)
      for (const r of put) rows.set(`${r.tbl}:${r.id}`, r)
      for (const r of del) rows.delete(`${r.tbl}:${r.id}`)
    },
  }
}

let n = 0
async function launch(store: RowStore) {
  vi.resetModules()
  ;(globalThis as { catechizeDbName?: string }).catechizeDbName = `persist-${++n}`
  const db = await import('../../../../src/store/db.ts')
  const srs = await import('../../../../src/store/srs.ts')
  const takeout = await import('../../../../src/store/takeout.ts')
  const { persist } = await import('./persist.ts')
  const p = persist(db.db, store, 0)
  await p.hydrate()
  return { ...db, ...srs, ...takeout, ...p }
}

const strip = (dump: Record<string, unknown>) => ({ ...dump, at: undefined })

describe('persist', () => {
  it('keeps every row across a restart, with the same shape', async () => {
    const store = memoryStore()
    const a = await launch(store)
    await a.saveSettings({ tradition: 'reformed', inputMode: 'full-word' })
    await a.db.courses.put({ docId: 'wsc', perDay: 2, startedAt: 1 })
    await a.recordDrill(unit, 'wsc', [
      { index: 0, grade: 3, errors: 0, words: 6 },
      { index: 1, grade: 2, errors: 1, words: 7 },
    ], 'first-letter')
    await a.saveNote('wsc-1', 'wsc', 'Glory, then joy')
    await a.db.meta.put({ key: 'seq', value: 42 })
    await a.flush()

    expect([...store.rows.keys()].sort()).toEqual(
      expect.arrayContaining(['cards:wsc-1#0', 'cards:wsc-1#1', 'courses:wsc', 'learned:wsc-1', 'meta:seq', 'notes:wsc-1', 'settings:settings']),
    )
    expect([...store.rows.keys()].filter((k) => k.startsWith('log:'))).toHaveLength(2)

    const b = await launch(store)
    expect(strip(await b.takeout())).toEqual(strip(await a.takeout()))
    const card = await b.db.cards.get('wsc-1#0')
    expect(card?.card.due).toBeInstanceOf(Date)
    expect(await b.dueUnits(Date.now() + 365 * 86_400_000)).toHaveLength(1)
    expect((await b.db.meta.get('seq'))?.value).toBe(42)
  })

  it('keeps the push flag and change time of each row', async () => {
    const store = memoryStore()
    const a = await launch(store)
    await a.db.courses.put({ docId: 'wsc', perDay: 1, startedAt: 1 })
    // A row as sync stores it from the server: clean, with the server's time.
    await a.db.courses.put({ docId: 'hc', perDay: 1, startedAt: 1, _u: 123, [a.SYNC_MARK]: 'clean' } as never)
    await a.flush()
    const before = await a.db.courses.toArray()

    const b = await launch(store)
    expect(await b.db.courses.toArray()).toEqual(before)
    expect((await b.db.courses.get('hc'))?._dirty).toBe(0)
    expect((await b.db.courses.get('hc'))?._u).toBe(123)
    expect((await b.db.courses.get('wsc'))?._dirty).toBe(1)
  })

  it('writes deletions and tombstones', async () => {
    const store = memoryStore()
    const a = await launch(store)
    await a.recordDrill(unit, 'wsc', [{ index: 0, grade: 3, errors: 0, words: 6 }], 'first-letter')
    await a.flush()
    await a.resetUnit('wsc-1')
    await a.flush()
    expect([...store.rows.keys()].some((k) => k.startsWith('cards:') || k.startsWith('log:') || k.startsWith('learned:'))).toBe(false)
    expect([...store.rows.keys()]).toContain('tombstones:cards:wsc-1#0')

    const b = await launch(store)
    expect(await b.db.cards.count()).toBe(0)
    expect(await b.db.tombstones.count()).toBe(3)
  })

  it('leaves the store as it was when a transaction fails', async () => {
    const store = memoryStore()
    const a = await launch(store)
    await a.db.courses.put({ docId: 'wsc', perDay: 1, startedAt: 1 })
    await a.flush()
    const before = new Map(store.rows)
    await expect(
      a.db.transaction('rw', a.db.courses, async () => {
        await a.db.courses.put({ docId: 'wsc', perDay: 5, startedAt: 1 })
        await a.db.courses.put({ docId: 'hc', perDay: 5, startedAt: 1 })
        throw new Error('stop')
      }),
    ).rejects.toThrow('stop')
    await a.flush()
    expect(store.rows).toEqual(before)
  })

  it('empties a table that is cleared', async () => {
    const store = memoryStore()
    const a = await launch(store)
    await a.db.meta.bulkPut([
      { key: 'seq', value: 1 },
      { key: 'epoch', value: 'x' },
    ])
    await a.flush()
    await a.db.meta.clear()
    await a.flush()
    expect([...store.rows.keys()].some((k) => k.startsWith('meta:'))).toBe(false)
  })
})
