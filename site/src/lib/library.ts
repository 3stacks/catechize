// Build-time access to the app's data (public/data at the repository root).
// The content pages are static: Next.js reads these files once, at build time.
import fs from 'node:fs'
import path from 'node:path'

const DATA = path.join(process.cwd(), '..', 'public', 'data')
const read = <T,>(file: string): T => JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'))

export interface Unit {
  id: string
  ref: string
  prompt: string
  text: string
}

export interface Doc {
  id: string
  title: string
  kind: string
  groups: { title: string; units: string[] }[]
  units: Unit[]
  source: { name: string; url?: string; license: string; note?: string }
}

const docCache = new Map<string, Doc>()
export function loadDoc(id: string): Doc {
  if (!docCache.has(id)) docCache.set(id, read<Doc>(`docs/${id}.json`))
  return docCache.get(id)!
}

// --------------------------------------------------------------- Scripture

/** OSIS book code → display name and URL slug. Only the books that the verse pages use. */
export const BOOKS: Record<string, { name: string; slug: string }> = {
  Gen: { name: 'Genesis', slug: 'genesis' },
  Exod: { name: 'Exodus', slug: 'exodus' },
  Deut: { name: 'Deuteronomy', slug: 'deuteronomy' },
  Josh: { name: 'Joshua', slug: 'joshua' },
  Ps: { name: 'Psalm', slug: 'psalm' },
  Prov: { name: 'Proverbs', slug: 'proverbs' },
  Isa: { name: 'Isaiah', slug: 'isaiah' },
  Jer: { name: 'Jeremiah', slug: 'jeremiah' },
  Lam: { name: 'Lamentations', slug: 'lamentations' },
  Mic: { name: 'Micah', slug: 'micah' },
  Matt: { name: 'Matthew', slug: 'matthew' },
  John: { name: 'John', slug: 'john' },
  Rom: { name: 'Romans', slug: 'romans' },
  '1Cor': { name: '1 Corinthians', slug: '1-corinthians' },
  '2Cor': { name: '2 Corinthians', slug: '2-corinthians' },
  Gal: { name: 'Galatians', slug: 'galatians' },
  Eph: { name: 'Ephesians', slug: 'ephesians' },
  Phil: { name: 'Philippians', slug: 'philippians' },
  Col: { name: 'Colossians', slug: 'colossians' },
  '2Tim': { name: '2 Timothy', slug: '2-timothy' },
  Heb: { name: 'Hebrews', slug: 'hebrews' },
  '1Pet': { name: '1 Peter', slug: '1-peter' },
  '1John': { name: '1 John', slug: '1-john' },
}

/** A passage in one chapter: "John.3.16" or "Prov.3.5-6". */
export interface Ref {
  book: string
  c: number
  v1: number
  v2: number
}

export function parseRef(id: string): Ref {
  const m = id.match(/^(\w+)\.(\d+)\.(\d+)(?:-(\d+))?$/)
  if (!m) throw new Error(`Not a passage id: ${id}`)
  return { book: m[1], c: +m[2], v1: +m[3], v2: +(m[4] ?? m[3]) }
}

export const refLabel = (r: Ref) => `${BOOKS[r.book].name} ${r.c}:${r.v1}${r.v2 > r.v1 ? `–${r.v2}` : ''}`
export const refSlug = (r: Ref) => `${BOOKS[r.book].slug}-${r.c}-${r.v1}${r.v2 > r.v1 ? `-${r.v2}` : ''}`

const kjvCache = new Map<string, string[][]>()
/** All verses of a chapter in the KJV, verse 1 first. */
export function chapter(book: string, c: number): string[] {
  if (!kjvCache.has(book)) kjvCache.set(book, read<string[][]>(`kjv/${book}.json`))
  return kjvCache.get(book)![c - 1]
}

export function verses(r: Ref): { v: number; text: string }[] {
  const ch = chapter(r.book, r.c)
  const out = []
  for (let v = r.v1; v <= r.v2; v++) out.push({ v, text: ch[v - 1] })
  return out
}

// ------------------------------------------------- where the confessions cite a verse

interface Cited {
  units: Record<string, [string, string]>
  verses: Record<string, string[]>
}
let cited: Cited | undefined

/** The questions and articles that cite a verse of the passage, in document order. */
export function citedIn(r: Ref): { docId: string; unitId: string; label: string }[] {
  cited ??= read<Cited>('cited.json')
  const ids = new Set<string>()
  for (let v = r.v1; v <= r.v2; v++) for (const id of cited.verses[`${r.book}.${r.c}.${v}`] ?? []) ids.add(id)
  return [...ids].map((unitId) => ({ unitId, docId: cited!.units[unitId][0], label: cited!.units[unitId][1] }))
}

export function findUnit(docId: string, unitId: string): Unit | undefined {
  return loadDoc(docId).units.find((u) => u.id === unitId)
}
