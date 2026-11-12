import { track } from '../lib/track.ts'
import { db } from '../store/db.ts'
import type { BookText, DataIndex, Doc, Harmony, Unit } from './types.ts'
import { passageFromId, type Passage } from '../lib/refs.ts'
import { chunk } from '../lib/chunk.ts'
import { formatPassage, passageId } from '../lib/refs.ts'
import { get, sib } from './files.ts'

// files.ts reads the static data: the web app fetches it, the mobile app has it in its bundle.

export const loadIndex = () => get<DataIndex>('index.json')
export const loadHarmony = (id: string) => get<Harmony>(`harmonies/${id}.json`)

/** Public-domain expositions per unit (scripts/build-data.ts, from sources/reading.json). */
export interface ReadingIndex {
  works: Record<string, [title: string, author: string, year: number]>
  units: Record<string, [work: string, title: string, url: string, kind?: 'excerpt' | 'book'][]>
}
export const loadReading = () => get<ReadingIndex>('reading.json')

/** Link to the first verse of a passage in the Self-Interpreting Bible, if that chapter is online. */
export async function sibHref(p: Passage): Promise<string | undefined> {
  const book = (await sib)?.books[p.book]
  if (!book || !book[1].includes(p.c1)) return undefined
  return `${(await sib)!.base}/${book[0]}-${p.c1}.html${p.v1 ? `#v${p.c1}-${p.v1}` : ''}`
}

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
  track('Verse added', { book: p.book })
  return id
}
