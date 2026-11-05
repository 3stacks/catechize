import { describe, expect, it } from 'vitest'
import { forecast, longestStreak, perDay, retention, streak } from './stats.ts'

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime()

describe('streak', () => {
  const days = perDay([{ at: at(2026, 11, 3) }, { at: at(2026, 11, 4) }, { at: at(2026, 11, 5) }])
  it('counts days in a row ending today', () => {
    expect(streak(days, at(2026, 11, 5))).toEqual({ days: 3, today: true })
  })
  it('keeps yesterday’s streak alive until today ends', () => {
    expect(streak(days, at(2026, 11, 6))).toEqual({ days: 3, today: false })
  })
  it('breaks after a missed day', () => {
    expect(streak(days, at(2026, 11, 7)).days).toBe(0)
  })
  it('finds the longest run', () => {
    expect(longestStreak(perDay([{ at: at(2026, 1, 1) }, { at: at(2026, 1, 2) }, { at: at(2026, 1, 5) }]))).toBe(2)
  })
})

describe('forecast', () => {
  it('counts units, not chunks, and folds overdue into today', () => {
    const now = at(2026, 11, 6, 9)
    const cards = [
      { unitId: 'a', due: at(2026, 11, 1) },
      { unitId: 'a', due: at(2026, 11, 6, 20) },
      { unitId: 'b', due: at(2026, 11, 7, 8) },
      { unitId: 'c', due: at(2027, 1, 1) },
    ]
    expect(forecast(cards, 3, now)).toEqual([1, 1, 0])
  })
})

describe('retention', () => {
  it('ignores the first attempt at each card', () => {
    const now = at(2026, 11, 6)
    const log = [
      { cardId: 'x', at: at(2026, 11, 1), rating: 1 }, // learning
      { cardId: 'x', at: at(2026, 11, 2), rating: 3 },
      { cardId: 'x', at: at(2026, 11, 4), rating: 1 },
      { cardId: 'y', at: at(2026, 11, 4), rating: 3 }, // learning
    ]
    expect(retention(log, 30, now)).toEqual({ pass: 1, total: 2, rate: 0.5 })
  })
})
