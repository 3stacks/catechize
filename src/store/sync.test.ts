import 'fake-indexeddb/auto'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createApp } from '../../server/main.ts'
import { Store } from '../../server/store.ts'
import type { Unit } from '../data/types.ts'

// Two devices sync through a real server and a real SQLite database. Each
// device is a fresh copy of the store modules with its own IndexedDB.

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

let server: Server
let base = ''
const realFetch = globalThis.fetch

async function serve(store: Store) {
  server?.close()
  server = createApp(store, { token: '', staticDir: '/nonexistent' }).listen(0)
  await new Promise((ok) => server.once('listening', ok))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

beforeAll(async () => {
  await serve(new Store(':memory:'))
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => realFetch(base + url, init))
})
afterAll(() => {
  server.close()
  vi.unstubAllGlobals()
})

let n = 0
async function device() {
  vi.resetModules()
  ;(globalThis as { catechizeDbName?: string }).catechizeDbName = `device-${++n}`
  const db = await import('./db.ts')
  const sync = await import('./sync.ts')
  const srs = await import('./srs.ts')
  return { ...db, ...sync, ...srs }
}

describe('sync between devices', () => {
  it('copies progress, notes and settings, and deletions, both ways', async () => {
    const a = await device()
    await a.recordDrill(unit, 'wsc', [{ index: 0, grade: 3, errors: 0, words: 6 }], 'first-letter')
    await a.saveNote('wsc-1', 'wsc', 'Glory first, then joy')
    await a.db.courses.put({ docId: 'wsc', perDay: 2, startedAt: 1 })
    await a.syncNow()
    expect(await a.db.cards.where('_dirty').equals(1).count()).toBe(0)

    const b = await device()
    await b.syncNow()
    expect((await b.db.cards.get('wsc-1#0'))?.card.due).toBeInstanceOf(Date)
    expect(await b.db.log.count()).toBe(1)
    expect((await b.getNote('wsc-1'))?.text).toBe('Glory first, then joy')
    expect((await b.db.courses.get('wsc'))?.perDay).toBe(2)
    // Pulled rows are clean: nothing to push back.
    expect(await b.db.cards.where('_dirty').equals(1).count()).toBe(0)

    // B forgets the unit; A hears about it.
    await b.resetUnit('wsc-1')
    await b.syncNow()
    await a.syncNow()
    expect(await a.db.cards.count()).toBe(0)
    expect(await a.db.log.count()).toBe(0)
    expect(await a.db.learned.count()).toBe(0)
  })

  it('keeps the later change when both devices edit the same row', async () => {
    const a = await device()
    const b = await device()
    await a.saveSettings({ retention: 0.85 })
    await new Promise((r) => setTimeout(r, 5))
    await b.saveSettings({ retention: 0.95 })
    await b.syncNow() // the later edit reaches the server first
    await a.syncNow() // the earlier edit loses, and A takes B's value
    await b.syncNow()
    expect((await a.getSettings()).retention).toBe(0.95)
    expect((await b.getSettings()).retention).toBe(0.95)
  })

  it('pushes everything again to a new, empty server', async () => {
    const a = await device()
    await a.recordDrill(unit, 'wsc', [{ index: 1, grade: 3, errors: 0, words: 5 }], 'first-letter')
    await a.syncNow()
    await serve(new Store(':memory:')) // the server lost its data
    await a.syncNow()
    const b = await device()
    await b.syncNow()
    expect(await b.db.cards.get('wsc-1#1')).toBeDefined()
  })
})

describe('upgrade from version 1', () => {
  it('moves the review log to string ids and queues old progress for the first sync', async () => {
    const { default: Dexie } = await import('dexie')
    const name = 'device-old'
    const old = new Dexie(name)
    old.version(1).stores({ cards: 'id, unitId, docId, due, kind', reviews: '++id, cardId, unitId, at', courses: 'docId', learned: 'unitId, docId, at', verses: 'id, addedAt', settings: 'id' })
    await old.table('reviews').add({ cardId: 'wsc-1#0', unitId: 'wsc-1', at: 5, rating: 3, errors: 0, words: 6, mode: 'first-letter' })
    await old.table('learned').put({ unitId: 'wsc-1', docId: 'wsc', at: 5 })
    old.close()

    vi.resetModules()
    ;(globalThis as { catechizeDbName?: string }).catechizeDbName = name
    const { db } = await import('./db.ts')
    const log = await db.log.toArray()
    expect(log).toHaveLength(1)
    expect(typeof log[0].id).toBe('string')
    expect(log[0]._dirty).toBe(1)
    expect((await db.learned.get('wsc-1'))?._dirty).toBe(1)
    expect(db.tables.map((t) => t.name)).not.toContain('reviews')
  })
})
