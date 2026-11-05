import { describe, expect, it } from 'vitest'
import { Store, invalidChanges } from './store.ts'

const card = (id: string, u: number, due = 1) => ({ tbl: 'cards' as const, id, data: { id, due }, u })

describe('Store.sync', () => {
  it('stores changes and returns them past the given seq', () => {
    const s = new Store(':memory:')
    const a = s.sync(0, [card('a', 10), card('b', 10)])
    expect(a.changes.map((c) => c.id)).toEqual(['a', 'b'])
    expect(a.seq).toBe(2)
    expect(s.sync(a.seq, []).changes).toEqual([])
  })

  it('keeps the newer record when two devices disagree', () => {
    const s = new Store(':memory:')
    s.sync(0, [card('a', 20, 2)])
    const r = s.sync(0, [card('a', 10, 1)]) // older write arrives late
    expect(r.changes).toEqual([{ tbl: 'cards', id: 'a', data: { id: 'a', due: 2 }, u: 20 }])
  })

  it('keeps tombstones so other devices learn of a deletion', () => {
    const s = new Store(':memory:')
    const first = s.sync(0, [card('a', 10)])
    s.sync(first.seq, [{ tbl: 'cards', id: 'a', data: null, u: 11 }])
    expect(s.sync(first.seq, []).changes).toEqual([{ tbl: 'cards', id: 'a', data: null, u: 11 }])
  })

  it('pages large pulls', () => {
    const s = new Store(':memory:')
    s.sync(0, Array.from({ length: 5 }, (_, i) => card(`c${i}`, 1)))
    const p1 = s.sync(0, [], undefined, 2)
    expect(p1.more).toBe(true)
    const p2 = s.sync(p1.seq, [], undefined, 2)
    const p3 = s.sync(p2.seq, [], undefined, 2)
    expect([...p1.changes, ...p2.changes, ...p3.changes].map((c) => c.id)).toEqual(['c0', 'c1', 'c2', 'c3', 'c4'])
    expect(p3.more).toBe(false)
  })

  it('asks a client from another database to start again', () => {
    const s = new Store(':memory:')
    s.sync(0, [card('a', 1)])
    expect(s.sync(1, [], 'some-other-epoch').reset).toBe(true)
    expect(s.sync(99, [], s.epoch).reset).toBe(true) // ahead of a restored backup
    expect(s.sync(1, [], s.epoch).reset).toBeUndefined()
  })
})

describe('invalidChanges', () => {
  it('rejects unknown tables and bad shapes', () => {
    expect(invalidChanges([card('a', 1)])).toBeUndefined()
    expect(invalidChanges([{ tbl: 'users', id: 'a', data: {}, u: 1 }])).toMatch(/unknown table/)
    expect(invalidChanges([{ tbl: 'cards', id: '', data: {}, u: 1 }])).toMatch(/id/)
    expect(invalidChanges([{ tbl: 'cards', id: 'a', data: [], u: 1 }])).toMatch(/data/)
    expect(invalidChanges('x')).toMatch(/array/)
  })
})
