import { db, type CardRow, type ReviewRow } from './db.ts'

// Progress numbers for the Today and Progress screens. The pure functions take
// rows, so they are easy to test; load* reads them from the database.

const DAY = 86_400_000

/** Local calendar day, "2026-11-06". */
export const dayKey = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const startOfDay = (ms = Date.now()) => {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Step whole local days (safe across daylight-saving changes). */
const addDays = (ms: number, n: number) => {
  const d = new Date(ms)
  d.setDate(d.getDate() + n)
  return d.getTime()
}

/** Reviews per local day. */
export function perDay(log: Pick<ReviewRow, 'at'>[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of log) m.set(dayKey(r.at), (m.get(dayKey(r.at)) ?? 0) + 1)
  return m
}

/**
 * Days in a row with at least one review, ending today. A streak that ended
 * yesterday still counts until today is over: there is still time to keep it.
 */
export function streak(days: Map<string, number> | Set<string>, now = Date.now()): { days: number; today: boolean } {
  const has = (ms: number) => days.has(dayKey(ms))
  const today = has(now)
  let n = 0
  for (let d = today ? now : addDays(now, -1); has(d); d = addDays(d, -1)) n++
  return { days: n, today }
}

/** Longest run of review days ever. */
export function longestStreak(days: Map<string, number> | Set<string>): number {
  const keys = [...days.keys()].sort()
  let best = 0
  let run = 0
  let prev: number | undefined
  for (const k of keys) {
    const [y, m, d] = k.split('-').map(Number)
    const t = new Date(y, m - 1, d).getTime()
    run = prev !== undefined && dayKey(addDays(prev, 1)) === k ? run + 1 : 1
    best = Math.max(best, run)
    prev = t
  }
  return best
}

/** Units due on each of the next `n` days. Day 0 includes everything overdue. */
export function forecast(cards: Pick<CardRow, 'due' | 'unitId'>[], n = 14, now = Date.now()): number[] {
  const out = Array.from({ length: n }, () => new Set<string>())
  const start = startOfDay(now)
  for (const c of cards) {
    let i = 0
    while (i < n && c.due >= addDays(start, i + 1)) i++
    if (i < n) out[i].add(c.unitId)
  }
  return out.map((s) => s.size)
}

/**
 * Share of reviews recalled (not "Again") over the last `days` days. Only
 * true reviews count: the first attempt at a card is learning, not recall.
 */
export function retention(log: Pick<ReviewRow, 'cardId' | 'at' | 'rating'>[], days = 30, now = Date.now()) {
  const sorted = [...log].sort((a, b) => a.at - b.at)
  const seen = new Set<string>()
  const since = now - days * DAY
  let pass = 0
  let total = 0
  for (const r of sorted) {
    const first = !seen.has(r.cardId)
    seen.add(r.cardId)
    if (first || r.at < since) continue
    total++
    if (r.rating > 1) pass++
  }
  return { pass, total, rate: total ? pass / total : undefined }
}

/** Chunks the learner keeps forgetting: four or more lapses and still not mature. */
export const LEECH_LAPSES = 4
export const MATURE_DAYS = 21
export const isLeech = (c: Pick<CardRow, 'kind' | 'card'>) =>
  c.kind === 'chunk' && c.card.lapses >= LEECH_LAPSES && c.card.stability < MATURE_DAYS

export interface TroubleUnit {
  unitId: string
  docId: string
  chunks: number[]
  lapses: number
}

/** Units with trouble spots, worst first. */
export async function troubleSpots(): Promise<TroubleUnit[]> {
  const rows = await db.cards.where('kind').equals('chunk').filter(isLeech).toArray()
  const by = new Map<string, TroubleUnit>()
  for (const r of rows) {
    const u = by.get(r.unitId) ?? { unitId: r.unitId, docId: r.docId, chunks: [], lapses: 0 }
    u.chunks.push(r.index)
    u.lapses += r.card.lapses
    by.set(r.unitId, u)
  }
  return [...by.values()].sort((a, b) => b.lapses - a.lapses)
}

/** Distinct units reviewed today, for the daily review limit. */
export async function unitsReviewedToday(now = Date.now()): Promise<number> {
  const rows = await db.log.where('at').aboveOrEqual(startOfDay(now)).toArray()
  return new Set(rows.map((r) => r.unitId)).size
}

export async function loadStats(now = Date.now()) {
  const [log, cards, learned] = await Promise.all([db.log.toArray(), db.cards.toArray(), db.learned.toArray()])
  const days = perDay(log)
  const chunks = cards.filter((c) => c.kind === 'chunk')
  const byDoc = new Map<string, { learned: number; mature: number; chunks: number }>()
  for (const l of learned) {
    const d = byDoc.get(l.docId) ?? { learned: 0, mature: 0, chunks: 0 }
    d.learned++
    byDoc.set(l.docId, d)
  }
  for (const c of chunks) {
    const d = byDoc.get(c.docId) ?? { learned: 0, mature: 0, chunks: 0 }
    d.chunks++
    if (c.card.stability >= MATURE_DAYS) d.mature++
    byDoc.set(c.docId, d)
  }
  return {
    days,
    streak: streak(days, now),
    longest: longestStreak(days),
    forecast: forecast(cards, 14, now),
    retention: retention(log, 30, now),
    reviews: log.length,
    learned: learned.length,
    chunks: chunks.length,
    mature: chunks.filter((c) => c.card.stability >= MATURE_DAYS).length,
    whole: cards.filter((c) => c.kind === 'whole').length,
    leeches: chunks.filter(isLeech).length,
    byDoc,
  }
}
