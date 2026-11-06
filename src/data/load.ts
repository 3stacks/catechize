import { db } from '../store/db.ts'
import type { BookText, DataIndex, Doc, Harmony, Unit } from './types.ts'
import { passageFromId, type Passage } from '../lib/refs.ts'
import { chunk } from '../lib/chunk.ts'
import { formatPassage, passageId } from '../lib/refs.ts'

// Static data is fetched once per session and kept in memory; the service
// worker makes it available offline.

const base = import.meta.env.BASE_URL + 'data/'
const cache = new Map<string, Promise<unknown>>()

function get<T>(path: string): Promise<T> {
  if (!cache.has(path))
    cache.set(
      path,
      fetch(base + path).then((r) => {
        if (!r.ok) throw new Error(`${path}: ${r.status}`)
        return r.json()
      }),
    )
  return cache.get(path) as Promise<T>
}

export const loadIndex = () => get<DataIndex>('index.json')
export const loadHarmony = (id: string) => get<Harmony>(`harmonies/${id}.json`)

export async function loadDoc(id: string): Promise<Doc> {
  if (id === 'verses') return versesDoc()
  return get<Doc>(`docs/${id}.json`)
}

export async function loadUnit(docId: string, unitId: string): Promise<Unit | undefined> {
  if (docId === 'verses') return db.verses.get(unitId)
  return (await loadDoc(docId)).units.find((u) => u.id === unitId)
}

const loadBook = (osis: string) => get<BookText>(`kjv/${osis}.json`)

export interface Verse {
  c: number
  v: number
  text: string
}

export async function loadPassage(p: Passage): Promise<Verse[]> {
  const book = await loadBook(p.book)
  const out: Verse[] = []
  for (let c = p.c1; c <= p.c2; c++) {
    const verses = book[c - 1] ?? []
    const from = p.v1 === 0 || c > p.c1 ? 1 : p.v1
    const to = p.v2 === 0 || c < p.c2 ? verses.length : p.v2
    for (let v = from; v <= to; v++) out.push({ c, v, text: verses[v - 1] })
  }
  return out
}

export async function loadPassageById(id: string) {
  const p = passageFromId(id)
  return p ? loadPassage(p) : []
}

// ---------------------------------------------------------------- the learner's verses

async function versesDoc(): Promise<Doc> {
  const units = await db.verses.orderBy('addedAt').toArray()
  return {
    id: 'verses',
    title: 'My verses',
    short: 'Verses',
    kind: 'scripture',
    tradition: 'common',
    unitCount: units.length,
    source: { name: 'King James Version (1769)', license: 'Public domain' },
    groups: [{ title: 'Added verses', units: units.map((u) => u.id) }],
    units,
  }
}

/** Add a Scripture passage to the learner's memory list (does not schedule it yet). */
export async function addVerse(p: Passage): Promise<string> {
  const id = `kjv-${passageId(p)}`
  if (await db.verses.get(id)) return id
  const verses = await loadPassage(p)
  const text = verses.map((v) => v.text).join(' ')
  await db.verses.put({
    id,
    docId: 'verses',
    ref: formatPassage(p),
    prompt: formatPassage(p),
    text,
    chunks: chunk(text),
    proofs: [],
    addedAt: Date.now(),
  })
  return id
}
