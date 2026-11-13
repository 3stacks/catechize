// Checks the shape of the generated Heidelberg and Belgic data. Progress in the
// app and on the server uses the unit ids, so a new source text must keep them.

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Doc } from '../src/data/types.ts'

const load = (id: string): Doc => JSON.parse(readFileSync(new URL(`../public/data/docs/${id}.json`, import.meta.url), 'utf8'))
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

function checkUnits(doc: Doc) {
  for (const u of doc.units) {
    expect(u.text.length, u.id).toBeGreaterThan(0)
    expect(u.text, u.id).toBe(u.text.replace(/\s+/g, ' ').trim())
    // The chunks cover the text in order, with only spaces between them.
    expect(u.chunks[0][0], u.id).toBe(0)
    expect(u.chunks[u.chunks.length - 1][1], u.id).toBe(u.text.length)
    for (let i = 1; i < u.chunks.length; i++) expect(u.text.slice(u.chunks[i - 1][1], u.chunks[i][0]).trim(), u.id).toBe('')
    for (const p of u.proofs) {
      expect(p.span[0], u.id).toBeLessThan(p.span[1])
      expect(p.span[1], u.id).toBeLessThanOrEqual(u.text.length)
      expect(p.refs.length, u.id).toBeGreaterThan(0)
    }
  }
}

describe('Heidelberg Catechism', () => {
  const hc = load('hc')
  it('keeps the unit ids and the Lord’s Days', () => {
    expect(hc.units.map((u) => u.id)).toEqual(range(129).map((n) => `hc-${n}`))
    expect(hc.unitCount).toBe(129)
    expect(hc.groups).toHaveLength(52)
    expect(hc.groups.flatMap((g) => g.units)).toEqual(range(129).map((n) => `hc-${n}`))
  })
  it('uses the public-domain Schaff text', () => {
    expect(hc.source.license).toBe('Public domain')
    expect(hc.source.url).toBe('https://ccel.org/ccel/schaff/creeds3')
    expect(hc.units[0].prompt).toBe('What is thy only comfort in life and in death?')
  })
  it('has well-formed units', () => checkUnits(hc))
})

describe('Belgic Confession', () => {
  const bc = load('bc')
  it('keeps the unit ids', () => {
    expect(bc.units.map((u) => u.id)).toEqual(range(37).map((n) => `bc-${n}`))
    expect(bc.unitCount).toBe(37)
  })
  it('uses the public-domain Schaff text', () => {
    expect(bc.source.license).toBe('Public domain')
    expect(bc.source.url).toBe('https://ccel.org/ccel/schaff/creeds3')
    expect(bc.units[0].text).toMatch(/^We all believe with the heart, and confess with the mouth/)
  })
  it('has well-formed units', () => checkUnits(bc))
})
