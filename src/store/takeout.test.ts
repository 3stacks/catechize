import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { db, type ReviewRow } from './db.ts'
import { backupSummary, parseBackup, restore, reviewsCsv, takeout } from './takeout.ts'

const review = (o: Partial<ReviewRow>): ReviewRow => ({ id: 'r', cardId: 'wsc-1#0', unitId: 'wsc-1', at: 0, rating: 3, errors: 0, words: 8, mode: 'first-letter', ...o })

describe('reviewsCsv', () => {
  it('writes one row for each review, oldest first, with readable values', () => {
    const csv = reviewsCsv([
      review({ id: 'b', at: Date.UTC(2026, 10, 2), cardId: 'kjv-Rom.8.28#whole', unitId: 'kjv-Rom.8.28', rating: 1, errors: 3 }),
      review({ id: 'a', at: Date.UTC(2026, 10, 1) }),
    ])
    expect(csv.split('\r\n')).toEqual([
      'date,document,unit,part,rating,errors,words,mode',
      '2026-11-01T00:00:00.000Z,wsc,wsc-1,1,Good,0,8,first-letter',
      '2026-11-02T00:00:00.000Z,verses,kjv-Rom.8.28,whole,Again,3,8,first-letter',
      '',
    ])
  })

  it('quotes cells with commas and quotes', () => {
    expect(reviewsCsv([review({ mode: 'a, "b"' as ReviewRow['mode'] })])).toContain('"a, ""b"""')
  })
})

describe('parseBackup', () => {
  it('refuses files that are not backups', () => {
    expect(() => parseBackup('not json')).toThrow('not JSON')
    expect(() => parseBackup('{"app":"other"}')).toThrow('not a Hearers backup')
    expect(() => parseBackup('{"app":"catechize","version":3}')).toThrow('newer version')
    expect(() => parseBackup('{"app":"catechize","version":2,"log":{}}')).toThrow('"log" is not a list')
  })

  it('counts what a backup holds', () => {
    const b = parseBackup(JSON.stringify({ app: 'catechize', version: 2, at: '2026-11-07T00:00:00.000Z', learned: [{}, {}], log: [{}], verses: [] }))
    expect(backupSummary(b)).toEqual({ learned: 2, reviews: 1, verses: 0, at: '2026-11-07T00:00:00.000Z' })
  })
})

describe('takeout and restore', () => {
  it('gives back the same data after a round trip, and removes rows the backup does not have', async () => {
    await db.learned.put({ unitId: 'wsc-1', docId: 'wsc', at: 1 })
    await db.log.put(review({ id: 'r1' }))
    const backup = parseBackup(JSON.stringify(await takeout()))
    await db.learned.put({ unitId: 'wsc-2', docId: 'wsc', at: 2 })
    await restore(backup)
    expect((await db.learned.toArray()).map((r) => r.unitId)).toEqual(['wsc-1'])
    expect((await db.log.toArray()).map((r) => r.id)).toEqual(['r1'])
    expect(await db.tombstones.get('learned:wsc-2')).toBeTruthy()
  })
})
