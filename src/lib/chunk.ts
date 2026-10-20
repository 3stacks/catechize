// Split a memorisation text into clause-sized chunks, returned as [start, end)
// character offsets so chunks, proof-text spans and annotations all address
// the same string.
//
// Chunking is a shortest-path over word boundaries. Each chunk costs more the
// further it is from TARGET words (steeply past MAX), and each cut costs by
// what is there: a full stop or semicolon is nearly free, a comma cheap,
// cutting before a conjunction dearer, cutting mid-phrase dearest. Preferred
// cuts (where footnotes fall, or where an annotated phrase ends) get a small
// discount. The result keeps natural clauses together without lopsided tails.

export type Span = [number, number]

export const MIN_WORDS = 3
export const TARGET_WORDS = 8
export const MAX_WORDS = 14

const CONJ = new Set(['and', 'but', 'or', 'nor', 'whereby', 'wherein', 'which', 'who', 'whom', 'that', 'by', 'unto', 'with', 'for', 'as', 'yet', 'so', 'because', 'whether'])

export function chunk(text: string, preferred: number[] = []): Span[] {
  const words = [...text.matchAll(/\S+/g)].map((m) => ({ s: m.index!, e: m.index! + m[0].length, w: m[0] }))
  const n = words.length
  if (n === 0) return []

  const prefer = new Set(preferred)
  // cutCost[j]: cost of cutting between word j-1 and word j (1 ≤ j < n).
  const cutCost = new Array<number>(n).fill(0)
  for (let j = 1; j < n; j++) {
    const prev = words[j - 1].w
    const next = words[j].w.toLowerCase().replace(/[^a-z]/g, '')
    let c: number
    if (/[.;:?!]["')’]*$/.test(prev)) c = 0
    else if (/[,]["')’]*$/.test(prev)) c = 1.5
    else if (CONJ.has(next)) c = 5
    else c = 12
    // a preferred offset anywhere between the two words
    for (let k = words[j - 1].e; k <= words[j].s; k++) if (prefer.has(k)) c -= 0.75
    cutCost[j] = c
  }

  const segCost = (w: number) => {
    if (w > MAX_WORDS) return 50 + (w - MAX_WORDS) * 10
    if (w < MIN_WORDS) return (MIN_WORDS - w) * 6 + 2
    return ((w - TARGET_WORDS) * (w - TARGET_WORDS)) / 6
  }

  const best = new Array<number>(n + 1).fill(Infinity)
  const back = new Array<number>(n + 1).fill(0)
  best[0] = 0
  for (let j = 1; j <= n; j++) {
    for (let i = Math.max(0, j - MAX_WORDS * 3); i < j; i++) {
      const c = best[i] + segCost(j - i) + (j < n ? cutCost[j] : 0)
      if (c < best[j]) {
        best[j] = c
        back[j] = i
      }
    }
  }

  const spans: Span[] = []
  for (let j = n; j > 0; j = back[j]) spans.unshift([words[back[j]].s, words[j - 1].e])
  return spans
}
