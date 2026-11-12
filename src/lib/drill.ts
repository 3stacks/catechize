// The grading rules of a drill, shared by the web app (src/views/Drill.tsx)
// and the mobile app. The screens only collect what the learner typed or said.

import { gradeChunk, AGAIN, EASY, GOOD, HARD, type Grade } from './grade.ts'
import type { ChunkResult } from '../store/srs.ts'

/** What happened to one word of the text during a drill. */
export type WordStatus = 'pending' | 'ok' | 'slip' | 'revealed' | 'given'

/** Grade each chunk that the drill tested, from the status of its words. */
export function chunkResults(order: number[], chunkOf: number[], final: WordStatus[]): ChunkResult[] {
  const byChunk = new Map<number, { errors: number; words: number; revealed: boolean }>()
  order.forEach((i) => {
    const c = chunkOf[i]
    const r = byChunk.get(c) ?? { errors: 0, words: 0, revealed: false }
    r.words++
    if (final[i] === 'slip' || final[i] === 'given') r.errors++
    if (final[i] === 'revealed') r.revealed = true
    byChunk.set(c, r)
  })
  return [...byChunk].map(([index, r]) => ({
    index,
    grade: gradeChunk(r.errors, r.words, r.revealed),
    errors: r.errors,
    words: r.words,
  }))
}

/** The next grade when the learner taps a result: Again, then Hard, then Good. */
export const cycleGrade = (g: Grade): Grade => (g === AGAIN ? HARD : g === HARD ? GOOD : AGAIN)

/**
 * What to save. A whole recitation gets one overall grade; chunks that broke
 * down are also sent back through their own reviews.
 */
export function toRecord(chunkResults: ChunkResult[], whole?: boolean): ChunkResult[] {
  if (!whole) return chunkResults
  const errors = chunkResults.reduce((n, r) => n + r.errors, 0)
  const words = chunkResults.reduce((n, r) => n + r.words, 0)
  const grade = chunkResults.some((r) => r.grade === AGAIN) ? AGAIN : gradeChunk(errors, words, false)
  // The learner may have forgiven every slip: then the whole recitation is Good.
  const forgiven = chunkResults.every((r) => r.grade >= GOOD)
  const wholeResult: ChunkResult = { index: -1, grade: forgiven ? GOOD : grade, errors, words }
  return [wholeResult, ...chunkResults.filter((r) => r.grade === AGAIN)]
}

export function gradeLabel(g: Grade) {
  return { [AGAIN]: 'Again', [HARD]: 'Hard', [GOOD]: 'Good', [EASY]: 'Easy' }[g]
}
