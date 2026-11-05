// Shape of the generated files under public/data. One model covers catechisms,
// confessions, creeds, the Decalogue and (later) Scripture passages: a document
// is a list of units, a unit is one memorisable text split into chunks.

/** [start, end) character offsets into a unit's text. */
export type Span = [number, number]

export type DocKind = 'catechism' | 'confession' | 'creed' | 'law' | 'scripture'

/** Which confessional tradition a document belongs to. Creeds and Scripture are common to both. */
export type Tradition = 'common' | 'reformed' | 'lutheran'

export interface Source {
  name: string
  url?: string
  license: string
  note?: string
}

export interface Group {
  title: string
  units: string[] // unit ids
}

export interface DocSummary {
  id: string
  title: string
  short: string
  kind: DocKind
  tradition: Tradition
  year?: string
  unitCount: number
  source: Source
}

export interface Doc extends DocSummary {
  groups: Group[]
  units: Unit[]
}

export interface Unit {
  id: string // "wsc-33", "wcf-1.6", "apostles-2", "dec-2l"
  ref: string // "Q. 33", "1.6", "Art. II", "Exod 20:4–6"
  prompt: string // the question, or what to recite ("The second commandment (full)")
  text: string
  chunks: Span[]
  proofs: Proof[] // footnoted proof texts, each attached to the phrase it supports
  notes?: Note[] // phrase-level annotations (creed harmony rows)
}

export interface Proof {
  span: Span
  refs: string[] // passage ids, see lib/refs.ts passageId()
}

export interface Note {
  span: Span
  refs: string[]
  hymn?: string
  parallel?: { unitId: string; span: Span; label: string }
}

/** A side-by-side table linking phrases or units across documents. */
export interface Harmony {
  id: string
  title: string
  tradition: Tradition
  description?: string
  columns: { key: string; label: string; docId?: string }[]
  sections: { title: string; rows: HarmonyRow[] }[]
}

export interface HarmonyRow {
  label?: string
  cells: Record<string, CellRef[]>
  refs?: string[]
  hymn?: string
}

export interface CellRef {
  unitId: string
  span?: Span // omitted = the whole unit
  text: string // display text, so the table renders without loading every doc
}

export interface DataIndex {
  builtAt: string
  docs: DocSummary[]
  harmonies: { id: string; title: string; tradition: Tradition }[]
}

/** KJV book file: chapters[c-1][v-1]. */
export type BookText = string[][]
