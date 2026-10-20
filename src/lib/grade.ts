// Word-level checking and automatic grading. Nothing here asks the learner to
// rate themselves: a chunk's FSRS rating comes from how many words they got
// wrong and whether they had to reveal any.

export interface Token {
  word: string // as written, with punctuation
  norm: string // lowercased, punctuation stripped, curly quotes folded
  start: number
  end: number
}

export const normWord = (w: string) =>
  w
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9']/g, '')
    .replace(/^'+|'+$/g, '')

export function tokenize(text: string, offset = 0): Token[] {
  const out: Token[] = []
  for (const m of text.matchAll(/\S+/g)) {
    const norm = normWord(m[0])
    if (!norm) continue // stray punctuation such as " - "
    out.push({ word: m[0], norm, start: offset + m.index!, end: offset + m.index! + m[0].length })
  }
  return out
}

export const firstLetter = (t: Token) => t.norm[0]

/** First-letter mode: does this keypress match the word? Digits match digits. */
export const keyMatches = (t: Token, key: string) => key.toLowerCase() === firstLetter(t)

export type Op =
  | { kind: 'ok'; expected: string; typed: string }
  | { kind: 'wrong'; expected: string; typed: string }
  | { kind: 'missing'; expected: string }
  | { kind: 'extra'; typed: string }

/** Align typed words against expected words (LCS), pairing leftovers as substitutions. */
export function diffWords(expected: string[], typed: string[]): Op[] {
  const E = expected.map(normWord)
  const T = typed.map(normWord)
  const n = E.length
  const m = T.length
  const L = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) L[i][j] = E[i] === T[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])

  const ops: Op[] = []
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && E[i] === T[j]) {
      ops.push({ kind: 'ok', expected: expected[i++], typed: typed[j++] })
    } else if (i < n && j < m && L[i + 1][j + 1] === L[i][j]) {
      ops.push({ kind: 'wrong', expected: expected[i++], typed: typed[j++] })
    } else if (j < m && (i === n || L[i][j + 1] >= L[i + 1][j])) {
      ops.push({ kind: 'extra', typed: typed[j++] })
    } else {
      ops.push({ kind: 'missing', expected: expected[i++] })
    }
  }
  return ops
}

export const errorCount = (ops: Op[]) => ops.filter((o) => o.kind !== 'ok').length

// FSRS ratings (same numbering as ts-fsrs Rating).
export type Grade = 1 | 2 | 3 | 4
export const AGAIN: Grade = 1
export const HARD: Grade = 2
export const GOOD: Grade = 3
export const EASY: Grade = 4

/**
 * One slip in a long chunk is "Hard", not a failure. Any reveal is a failure,
 * because the learner did not produce the word.
 */
export function gradeChunk(errors: number, wordCount: number, revealed: boolean): Grade {
  if (revealed) return AGAIN
  if (errors === 0) return GOOD
  if (errors === 1 || errors / wordCount <= 0.1) return HARD
  return AGAIN
}
