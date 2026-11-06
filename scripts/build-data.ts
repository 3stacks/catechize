// Build public/data from sources/. Run scripts/fetch-sources.sh first.
//
//   node scripts/build-data.ts
//
// Every proof reference is parsed and checked against the KJV; anything that
// does not resolve is reported (and dropped) rather than shipped broken.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { BookText, CellRef, DataIndex, Doc, Group, Harmony, HarmonyRow, Proof, Span, Tradition, Unit } from '../src/data/types.ts'
import { BOOKS, findBook } from '../src/lib/books.ts'
import { chunk } from '../src/lib/chunk.ts'
import { normWord, tokenize } from '../src/lib/grade.ts'
import { parseOsis, parseRefs, passageId, type Passage } from '../src/lib/refs.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'sources')
const CACHE = join(SRC, 'cache')
const OUT = join(ROOT, 'public', 'data')

const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const creeds = (name: string) => readJson(join(CACHE, `${name}.json`))
const warnings: string[] = []
const warn = (m: string) => warnings.push(m)

// ---------------------------------------------------------------- KJV

const kjvRaw = readJson(join(CACHE, 'kjv.json'))
const kjv = new Map<string, BookText>()
kjvRaw.books.forEach((b: { name: string; chapters: { verses: { text: string }[] }[] }, i: number) => {
  const osis = BOOKS[i].osis
  if (findBook(b.name)?.osis !== osis) throw new Error(`KJV book order mismatch at ${b.name}`)
  kjv.set(
    osis,
    b.chapters.map((c) => c.verses.map((v) => v.text.replace(/[–]/g, '-').trim())),
  )
})

function exists(p: Passage): boolean {
  const book = kjv.get(p.book)
  if (!book) return false
  const okC = (c: number) => c >= 1 && c <= book.length
  if (!okC(p.c1) || !okC(p.c2)) return false
  if (p.v1 === 0) return true
  return p.v1 >= 1 && p.v1 <= book[p.c1 - 1].length && p.v2 >= 1 && p.v2 <= book[p.c2 - 1].length
}

/** Parse and validate references; returns passage ids. */
function refs(input: string | string[], where: string, osis = false): string[] {
  const list = Array.isArray(input) ? input : [input]
  const out: string[] = []
  for (const r of list) {
    let ps: Passage[]
    if (osis) {
      ps = parseOsis(r)
      if (!ps.length) warn(`${where}: bad OSIS "${r}"`)
    } else {
      const res = parseRefs(r)
      for (const e of res.errors) warn(`${where}: ${e}`)
      ps = res.passages
    }
    for (const p of ps) {
      if (exists(p)) out.push(passageId(p))
      else warn(`${where}: ${passageId(p)} is not in the KJV`)
    }
  }
  return [...new Set(out)]
}

// ---------------------------------------------------------------- helpers

/**
 * Strip "[n]" footnote markers from a text, returning the clean text and where
 * each marker sat. A marker attaches to the phrase before it, back to the
 * previous marker (or the start of the text).
 */
function stripMarkers(withProofs: string): { text: string; markers: { id: string; at: number }[] } {
  const markers: { id: string; at: number }[] = []
  let text = ''
  let last = 0
  // Collapse whitespace first so recorded offsets stay valid in the output.
  withProofs = withProofs.replace(/\s+/g, ' ').trim()
  for (const m of withProofs.matchAll(/\s*\[(\w+)\]/g)) {
    text += withProofs.slice(last, m.index)
    markers.push({ id: m[1], at: text.length })
    last = m.index! + m[0].length
  }
  text += withProofs.slice(last)
  return { text, markers }
}

function proofsFromMarkers(
  text: string,
  markers: { id: string; at: number }[],
  lookup: (id: string) => string[] | undefined,
  where: string,
): Proof[] {
  const out: Proof[] = []
  let start = 0
  for (const { id, at } of markers) {
    const r = lookup(id)
    if (!r) warn(`${where}: no proof list for marker [${id}]`)
    else if (r.length) {
      const span = trim(text, [start, at])
      out.push({ span, refs: r })
    }
    start = at
  }
  return out
}

function trim(text: string, [s, e]: Span): Span {
  while (s < e && /[\s,;:.]/.test(text[s])) s++
  while (e > s && /\s/.test(text[e - 1])) e--
  return [s, e]
}

function makeUnit(id: string, ref: string, prompt: string, text: string, proofs: Proof[] = []): Unit {
  // Prefer chunk boundaries where footnotes fall: they mark the Assembly's own clause breaks.
  const cuts = proofs.map((p) => p.span[1])
  return { id, ref, prompt, text, chunks: chunk(text, cuts), proofs }
}

// Creeds and Scripture belong to every tradition. The Ten Commandments document
// uses the Reformed numbering, and the Small Catechism carries Luther's own.
const TRADITION: Record<string, Tradition> = {
  wsc: 'reformed', wlc: 'reformed', wcf: 'reformed', hc: 'reformed', bc: 'reformed', dort: 'reformed', decalogue: 'reformed',
  lsc: 'lutheran', llc: 'lutheran',
  apostles: 'common', nicene: 'common', athanasian: 'common', chalcedon: 'common',
}

function doc(d: Omit<Doc, 'unitCount' | 'tradition'>): Doc {
  const ids = new Set(d.units.map((u) => u.id))
  if (ids.size !== d.units.length) throw new Error(`${d.id}: duplicate unit ids`)
  for (const g of d.groups) for (const u of g.units) if (!ids.has(u)) throw new Error(`${d.id}: group ${g.title} names missing ${u}`)
  const tradition = TRADITION[d.id]
  if (!tradition) throw new Error(`${d.id}: no tradition`)
  return { ...d, tradition, unitCount: d.units.length }
}

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

/** Locate a phrase inside a text by words, ignoring case and punctuation. */
function findPhrase(text: string, phrase: string, from = 0): Span | undefined {
  const t = tokenize(text)
  const p = tokenize(phrase).map((x) => x.norm)
  if (!p.length) return undefined
  const scan = (lo: number) => {
    for (let i = lo; i + p.length <= t.length; i++)
      if (p.every((w, k) => t[i + k].norm === w)) return [t[i].start, t[i + p.length - 1].end] as Span
    return undefined
  }
  const startTok = t.findIndex((x) => x.start >= from)
  return (startTok >= 0 ? scan(startTok) : undefined) ?? scan(0)
}

// ---------------------------------------------------------------- WSC

const SOURCE_CREEDS = {
  name: 'Creeds.json (NonlinearFruit)',
  url: 'https://github.com/NonlinearFruit/Creeds.json',
}

function buildWsc(): Doc {
  const data: { Number: number; Question: string; Answer: string }[] = creeds('westminster_shorter_catechism').Data

  // OPC proof texts, footnoted against the OPC wording. The 1647 wording in
  // Creeds.json differs slightly, so markers are mapped across by aligning words.
  const coffee = readFileSync(join(CACHE, 'wsc-proofs.coffee'), 'utf8')
  const opc = new Map<number, { answer: string; proofs: Record<string, string[]> }>()
  for (const m of coffee.matchAll(/number:\s*(\d+),[\s\S]*?answer:\s*"((?:[^"\\]|\\.)*)",\s*proofTexts:\s*\{([\s\S]*?)\n\s*\},/g)) {
    const proofs: Record<string, string[]> = {}
    for (const p of m[3].matchAll(/"(\d+)":\s*\[([^\]]*)\]/g)) proofs[p[1]] = [...p[2].matchAll(/"([^"]*)"/g)].map((x) => x[1])
    opc.set(+m[1], { answer: m[2].replace(/\\"/g, '"'), proofs })
  }
  // Typos in the OPC footnotes, checked against the 1648 proofs.
  const fix: Record<string, string> = { 'Isa. 18:20': 'Isa. 8:20', 'Acts 21:41, 42': 'Acts 2:41, 42' }
  for (const o of opc.values()) for (const k in o.proofs) o.proofs[k] = o.proofs[k].map((r) => fix[r] ?? r)
  if (opc.size !== 107) warn(`WSC proofs: parsed ${opc.size}/107 answers`)

  const units = data.map((q) => {
    const text = q.Answer.trim()
    const o = opc.get(q.Number)
    let proofs: Proof[] = []
    if (o) {
      const { text: opcText, markers } = stripMarkers(o.answer)
      const mapped = markers.map((mk) => ({ id: mk.id, at: mapOffset(opcText, text, mk.at) }))
      proofs = proofsFromMarkers(text, mapped, (id) => (o.proofs[id] ? refs(o.proofs[id], `WSC ${q.Number}`) : undefined), `WSC ${q.Number}`)
    }
    return makeUnit(`wsc-${q.Number}`, `Q. ${q.Number}`, q.Question, text, proofs)
  })

  const groups: [string, number, number][] = [
    ["Man's chief end and the Scriptures", 1, 3],
    ['God and his decrees', 4, 11],
    ['Creation, providence and the fall', 12, 19],
    ['The covenant of grace and Christ the Redeemer', 20, 28],
    ['The application of redemption', 29, 38],
    ['The moral law', 39, 42],
    ['The Ten Commandments', 43, 82],
    ['Faith, repentance and the means of grace', 83, 97],
    ["Prayer and the Lord's Prayer", 98, 107],
  ]
  return doc({
    id: 'wsc',
    title: 'Westminster Shorter Catechism',
    short: 'WSC',
    kind: 'catechism',
    year: '1647',
    source: {
      ...SOURCE_CREEDS,
      license: 'Public domain',
      note: '1647 text. Proof texts are the OPC footnotes (github.com/ReformedDevs/hubot-wsc), aligned onto this wording.',
    },
    groups: groups.map(([title, a, b]) => ({ title: `${title} (${a}–${b})`, units: range(a, b).map((n) => `wsc-${n}`) })),
    units,
  })
}

/** Map a character offset in text A to the corresponding offset in text B by aligning words (LCS). */
function mapOffset(a: string, b: string, at: number): number {
  const A = tokenize(a)
  const B = tokenize(b)
  const n = A.length
  const m = B.length
  const L = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) L[i][j] = A[i].norm === B[j].norm ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const toB = new Array<number>(n).fill(-1)
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (A[i].norm === B[j].norm) toB[i++] = j++
    else if (L[i + 1][j] >= L[i][j + 1]) i++
    else j++
  }
  // The marker follows the last A-token starting before `at` (OPC markers sit
  // before trailing punctuation: "grace [1],"); use the
  // nearest aligned token at or before it.
  for (let k = A.reduce((acc, t, i) => (t.start < at ? i : acc), -1); k >= 0; k--) if (toB[k] >= 0) return B[toB[k]].end
  return 0
}

// ---------------------------------------------------------------- WLC, HC

interface CatQ {
  Number: number
  Question: string
  Answer: string
  AnswerWithProofs?: string
  Proofs?: { Id: number; References: string[] }[]
}

function catechismUnits(prefix: string, label: string, data: CatQ[]): Unit[] {
  return data.map((q) => {
    let text = q.Answer.replace(/\s+/g, ' ').trim()
    let proofs: Proof[] = []
    if (q.AnswerWithProofs && q.Proofs) {
      const s = stripMarkers(q.AnswerWithProofs)
      text = s.text
      const byId = new Map(q.Proofs.map((p) => [String(p.Id), p.References]))
      proofs = proofsFromMarkers(text, s.markers, (id) => {
        const r = byId.get(id)
        return r && refs(r, `${label} ${q.Number}`, true)
      }, `${label} ${q.Number}`)
    }
    return makeUnit(`${prefix}-${q.Number}`, `Q. ${q.Number}`, q.Question.replace(/\s+/g, ' ').trim(), text, proofs)
  })
}

function buildWlc(): Doc {
  const units = catechismUnits('wlc', 'WLC', creeds('westminster_larger_catechism').Data)
  const groups: [string, number, number][] = [
    ['The end of man and the Scriptures', 1, 5],
    ['What man ought to believe concerning God', 6, 90],
    ['The duty which God requires of man', 91, 98],
    ['The Ten Commandments', 99, 152],
    ['The means of grace', 153, 177],
    ["Prayer and the Lord's Prayer", 178, 196],
  ]
  return doc({
    id: 'wlc',
    title: 'Westminster Larger Catechism',
    short: 'WLC',
    kind: 'catechism',
    year: '1648',
    source: { ...SOURCE_CREEDS, license: 'Public domain' },
    groups: groups.map(([title, a, b]) => ({ title: `${title} (${a}–${b})`, units: range(a, b).map((n) => `wlc-${n}`) })),
    units,
  })
}

// Lord's Day boundaries: the first question of each of the 52 Lord's Days.
const LORDS_DAYS = [
  1, 3, 6, 9, 12, 16, 20, 24, 26, 27, 29, 31, 33, 35, 37, 40, 45, 46, 50, 53, 54, 57, 59, 62, 65, 69, 72, 75, 78, 80, 83, 86,
  88, 92, 96, 99, 101, 103, 104, 105, 108, 110, 112, 113, 116, 120, 122, 123, 124, 125, 126, 127,
]

function buildHc(): Doc {
  const units = catechismUnits('hc', 'HC', creeds('heidelberg_catechism').Data)
  if (LORDS_DAYS.length !== 52) throw new Error('HC: expected 52 Lord\'s Days')
  const groups: Group[] = LORDS_DAYS.map((a, i) => {
    const b = (LORDS_DAYS[i + 1] ?? 130) - 1
    return { title: `Lord's Day ${i + 1} (${a === b ? a : `${a}–${b}`})`, units: range(a, b).map((n) => `hc-${n}`) }
  })
  return doc({
    id: 'hc',
    title: 'Heidelberg Catechism',
    short: 'HC',
    kind: 'catechism',
    year: '1563',
    source: {
      ...SOURCE_CREEDS,
      license: 'Labelled public domain upstream; see note',
      note: 'This English text appears to be the Canadian Reformed Book of Praise translation, which is under copyright. Fine for private use; swap for Schaff (1877) before any public release.',
    },
    groups,
    units,
  })
}

// ---------------------------------------------------------------- WCF

function buildWcf(): Doc {
  const data: { Chapter: string; Title: string; Sections: { Section: string; Content: string; ContentWithProofs?: string; Proofs?: { Id: number; References: string[] }[] }[] }[] =
    creeds('westminster_confession_of_faith').Data
  const groups: Group[] = []
  const units: Unit[] = []
  for (const ch of data) {
    const ids: string[] = []
    for (const s of ch.Sections) {
      const ref = `${ch.Chapter}.${s.Section}`
      let text = s.Content.replace(/\s+/g, ' ').trim()
      let proofs: Proof[] = []
      if (s.ContentWithProofs && s.Proofs) {
        const st = stripMarkers(s.ContentWithProofs)
        text = st.text
        const byId = new Map(s.Proofs.map((p) => [String(p.Id), p.References]))
        proofs = proofsFromMarkers(text, st.markers, (id) => {
          const r = byId.get(id)
          return r && refs(r, `WCF ${ref}`, true)
        }, `WCF ${ref}`)
      }
      units.push(makeUnit(`wcf-${ref}`, ref, `WCF ${ref}: ${ch.Title}`, text, proofs))
      ids.push(`wcf-${ref}`)
    }
    groups.push({ title: `${ch.Chapter}. ${ch.Title}`, units: ids })
  }
  return doc({
    id: 'wcf',
    title: 'Westminster Confession of Faith',
    short: 'WCF',
    kind: 'confession',
    year: '1646',
    source: { ...SOURCE_CREEDS, license: 'Public domain', note: 'Original 1646 text (chapters 20, 23 and 31 differ from the American revision).' },
    groups,
    units,
  })
}

// ---------------------------------------------------------------- Belgic, Dort

function buildBelgic(): Doc {
  const data: { Article: number; Title: string; Content: string }[] = creeds('belgic_confession_of_faith').Data
  const units = data.map((a) =>
    makeUnit(`bc-${a.Article}`, `Art. ${a.Article}`, `Article ${a.Article}: ${a.Title}`, a.Content.replace(/\s+/g, ' ').trim()),
  )
  return doc({
    id: 'bc',
    title: 'Belgic Confession',
    short: 'BC',
    kind: 'confession',
    year: '1561',
    source: {
      ...SOURCE_CREEDS,
      license: 'Labelled public domain upstream; see note',
      note: 'This English text appears to be the CRC 1985 translation, which is under copyright. Fine for private use; swap for a public-domain translation before any public release.',
    },
    groups: [{ title: 'Articles 1–37', units: units.map((u) => u.id) }],
    units,
  })
}

const HEADS: Record<string, string> = { '1': 'First Head', '2': 'Second Head', '3&4': 'Third and Fourth Heads', '4': 'Fifth Head' }

function buildDort(): Doc {
  const data: { Chapter: string; Title: string; Sections: { Section: string; Content: string }[] }[] = creeds('canons_of_dort').Data
  const groups: Group[] = []
  const units: Unit[] = []
  data.forEach((head, i) => {
    // Creeds.json numbers the fifth head "4"; key by position instead.
    const headNo = ['1', '2', '3-4', '5'][i]
    const headName = Object.values(HEADS)[i]
    const ids: string[] = []
    for (const s of head.Sections) {
      const rejection = s.Section.startsWith('R')
      const n = s.Section.slice(1)
      const id = `dort-${headNo}-${s.Section.toLowerCase()}`
      const ref = `${headNo}.${rejection ? 'R' : ''}${n}`
      const prompt = `${headName}, ${rejection ? 'Rejection of Errors' : 'Article'} ${n}: ${head.Title}`
      units.push(makeUnit(id, ref, prompt, s.Content.replace(/\s+/g, ' ').trim()))
      ids.push(id)
    }
    groups.push({ title: `${headName}: ${head.Title}`, units: ids })
  })
  return doc({
    id: 'dort',
    title: 'Canons of Dort',
    short: 'CD',
    kind: 'confession',
    year: '1619',
    source: { ...SOURCE_CREEDS, license: 'Public domain', note: 'Older translation; Scripture is quoted inline rather than footnoted.' },
    groups,
    units,
  })
}

// ---------------------------------------------------------------- Apostles' and Nicene (annotated)

const ROMAN = ['I', 'II', 'III']
// Corrections to the annotated docx's Scripture cells.
const CREED_REF_FIXES: Record<string, string> = {
  'Phil. 3, 25': 'Philem. 3, 25', // Philemon has one chapter; "Phil. 3, 25" cannot be Philippians
}

function buildCreeds(): { apostles: Doc; nicene: Doc; harmony: Harmony } {
  const annotated = readJson(join(SRC, 'creeds-annotated.json'))
  const canon = readJson(join(SRC, 'creeds-text.json'))
  const titles = annotated.articles.map((a: { title: string }) => a.title.replace(/^Article [IV]+:\s*/, ''))

  const units = {
    apostles: (canon.apostles as string[]).map((t, i) => ({ ...makeUnit(`apostles-${i + 1}`, `Art. ${ROMAN[i]}`, `Apostles' Creed, Article ${ROMAN[i]}: ${titles[i]}`, t), notes: [] as Unit['notes'] })),
    nicene: (canon.nicene as string[]).map((t, i) => ({ ...makeUnit(`nicene-${i + 1}`, `Art. ${ROMAN[i]}`, `Nicene Creed, Article ${ROMAN[i]}: ${titles[i]}`, t), notes: [] as Unit['notes'] })),
  }

  const sections: Harmony['sections'] = []
  annotated.articles.forEach((art: { title: string; rows: { apostles: string | null; nicene: string | null; scripture: string | null; hymn: string | null }[] }, i: number) => {
    const ap = units.apostles[i]
    const ni = units.nicene[i]
    let apCursor = 0
    let niCursor = 0
    const rows: HarmonyRow[] = []
    for (const row of art.rows) {
      let scripture = row.scripture ?? ''
      for (const [bad, good] of Object.entries(CREED_REF_FIXES)) if (scripture.includes(bad)) scripture = scripture.replace(bad, good)
      const r = scripture ? refs(scripture, `Creeds ${ROMAN[i]} "${row.apostles ?? row.nicene}"`) : []
      const apSpan = row.apostles ? findPhrase(ap.text, row.apostles, apCursor) : undefined
      const niSpan = row.nicene ? findPhrase(ni.text, row.nicene, niCursor) : undefined
      if (row.apostles && !apSpan) warn(`Apostles' ${ROMAN[i]}: phrase not found "${row.apostles}"`)
      if (row.nicene && !niSpan) warn(`Nicene ${ROMAN[i]}: phrase not found "${row.nicene}"`)
      if (apSpan) apCursor = apSpan[1]
      if (niSpan) niCursor = niSpan[1]
      const hymn = row.hymn ?? undefined
      if (apSpan)
        ap.notes!.push({ span: apSpan, refs: r, hymn, parallel: niSpan && { unitId: ni.id, span: niSpan, label: 'Nicene' } })
      if (niSpan)
        ni.notes!.push({ span: niSpan, refs: r, hymn, parallel: apSpan && { unitId: ap.id, span: apSpan, label: "Apostles'" } })
      const cell = (u: Unit, s?: Span): CellRef[] => (s ? [{ unitId: u.id, span: s, text: u.text.slice(s[0], s[1]) }] : [])
      rows.push({ cells: { apostles: cell(ap, apSpan), nicene: cell(ni, niSpan) }, refs: r, hymn })
    }
    sections.push({ title: art.title, rows })
  })

  // The docx's phrase rows also make good chunk boundaries: prefer them.
  for (const u of [...units.apostles, ...units.nicene]) u.chunks = chunk(u.text, u.notes!.map((n) => n.span[1]))

  const source = {
    name: "Apostles' and Nicene Creeds (annotated harmony)",
    license: 'Private',
    note: "Luke's annotated harmony: phrase-by-phrase Scripture and hymn references (R = Rejoice!, LSB = Lutheran Service Book).",
  }
  const groupOf = (us: Unit[]) => [{ title: 'Articles', units: us.map((u) => u.id) }]
  return {
    apostles: doc({ id: 'apostles', title: "Apostles' Creed", short: 'AC', kind: 'creed', source, groups: groupOf(units.apostles), units: units.apostles }),
    nicene: doc({ id: 'nicene', title: 'Nicene Creed', short: 'NC', kind: 'creed', year: '381', source, groups: groupOf(units.nicene), units: units.nicene }),
    harmony: {
      id: 'creeds',
      title: "Apostles' and Nicene Creeds",
      tradition: 'common',
      description: 'Phrase by phrase, with proof texts and hymns.',
      columns: [
        { key: 'apostles', label: "Apostles'", docId: 'apostles' },
        { key: 'nicene', label: 'Nicene', docId: 'nicene' },
      ],
      sections,
    },
  }
}

// ---------------------------------------------------------------- Athanasian, Chalcedon

function buildSimpleCreed(id: string, file: string, title: string, short: string, year: string): Doc {
  const raw = creeds(file)
  // Upstream has one or two long paragraphs; pack whole sentences into
  // units of up to ~40 words so each is a sensible thing to recite.
  const sentences = (raw.Data.Content as string).replace(/\s+/g, ' ').trim().split(/(?<=[.;:])\s+(?=[A-Z])/)
  const paras: string[] = []
  for (const sentence of sentences) {
    const last = paras[paras.length - 1]
    if (last && (last + ' ' + sentence).split(' ').length <= 40) paras[paras.length - 1] = last + ' ' + sentence
    else paras.push(sentence)
  }
  const units = paras.map((p, i) => makeUnit(`${id}-${i + 1}`, `§${i + 1}`, `${title}, section ${i + 1}`, p))
  return doc({
    id,
    title,
    short,
    kind: 'creed',
    year,
    source: { ...SOURCE_CREEDS, license: 'Public domain', url: raw.Metadata.SourceUrl ?? SOURCE_CREEDS.url },
    groups: [{ title: 'Sections', units: units.map((u) => u.id) }],
    units,
  })
}

// ---------------------------------------------------------------- Decalogue

// Reformed numbering (images are the second commandment; coveting is one, the tenth).
// Short forms are the traditional catechetical summaries; long forms are Exodus 20 KJV.
const COMMANDMENTS: { n: string; name: string; short?: string; ex: [number, number]; deut: string; wsc: [number, number]; wlc: [number, number]; hc?: [number, number] }[] = [
  { n: 'pre', name: 'The preface', ex: [2, 2], deut: 'Deut. 5:6', wsc: [43, 44], wlc: [101, 101], hc: [92, 93] },
  { n: '1', name: 'The first commandment', ex: [3, 3], deut: 'Deut. 5:7', wsc: [45, 48], wlc: [103, 106], hc: [94, 95] },
  { n: '2', name: 'The second commandment', short: 'Thou shalt not make unto thee any graven image.', ex: [4, 6], deut: 'Deut. 5:8-10', wsc: [49, 52], wlc: [107, 110], hc: [96, 98] },
  { n: '3', name: 'The third commandment', short: 'Thou shalt not take the name of the LORD thy God in vain.', ex: [7, 7], deut: 'Deut. 5:11', wsc: [53, 56], wlc: [111, 114], hc: [99, 102] },
  { n: '4', name: 'The fourth commandment', short: 'Remember the sabbath day, to keep it holy.', ex: [8, 11], deut: 'Deut. 5:12-15', wsc: [57, 62], wlc: [115, 121], hc: [103, 103] },
  { n: '5', name: 'The fifth commandment', short: 'Honour thy father and thy mother.', ex: [12, 12], deut: 'Deut. 5:16', wsc: [63, 66], wlc: [123, 133], hc: [104, 104] },
  { n: '6', name: 'The sixth commandment', ex: [13, 13], deut: 'Deut. 5:17', wsc: [67, 69], wlc: [134, 136], hc: [105, 107] },
  { n: '7', name: 'The seventh commandment', ex: [14, 14], deut: 'Deut. 5:18', wsc: [70, 72], wlc: [137, 139], hc: [108, 109] },
  { n: '8', name: 'The eighth commandment', ex: [15, 15], deut: 'Deut. 5:19', wsc: [73, 75], wlc: [140, 142], hc: [110, 111] },
  { n: '9', name: 'The ninth commandment', ex: [16, 16], deut: 'Deut. 5:20', wsc: [76, 78], wlc: [143, 145], hc: [112, 112] },
  { n: '10', name: 'The tenth commandment', short: 'Thou shalt not covet.', ex: [17, 17], deut: 'Deut. 5:21', wsc: [79, 81], wlc: [146, 148], hc: [113, 113] },
]

function buildDecalogue(all: Map<string, Doc>): { doc: Doc; harmony: Harmony } {
  const exodus = kjv.get('Exod')![19]
  // Every "Lord" in Exodus 20 renders the divine name.
  const verses = (a: number, b: number) => exodus.slice(a - 1, b).join(' ').replace(/\bLord\b/g, 'LORD')
  const exRef = ([a, b]: [number, number]) => (a === b ? `Exod 20:${a}` : `Exod 20:${a}–${b}`)

  const units: Unit[] = []
  const groups: Group[] = []
  const rows: HarmonyRow[] = []
  for (const c of COMMANDMENTS) {
    const long = verses(...c.ex)
    const parallel = refs(c.deut, `Decalogue ${c.n}`)
    const whole = (t: string): Proof[] => [{ span: [0, t.length], refs: parallel }]
    const ids: string[] = []
    if (c.short) {
      units.push(makeUnit(`dec-${c.n}s`, 'Short', `${c.name} (short form)`, c.short, whole(c.short)))
      units.push(makeUnit(`dec-${c.n}l`, exRef(c.ex), `${c.name} (Exodus 20)`, long, whole(long)))
      ids.push(`dec-${c.n}s`, `dec-${c.n}l`)
    } else {
      units.push(makeUnit(`dec-${c.n}`, exRef(c.ex), c.name, long, whole(long)))
      ids.push(`dec-${c.n}`)
    }
    groups.push({ title: c.name[0].toUpperCase() + c.name.slice(1), units: ids })

    const cite = (docId: string, prefix: string, r?: [number, number]): CellRef[] =>
      r ? range(...r).map((n) => {
        const u = all.get(docId)!.units.find((x) => x.id === `${prefix}-${n}`)!
        return { unitId: u.id, text: `${u.ref} ${u.prompt}` }
      }) : []
    rows.push({
      label: c.name,
      cells: {
        // the short form (or the only form), then a link to the full text
        decalogue: ids.map((id, k) => ({ unitId: id, text: k === 0 ? units.find((u) => u.id === id)!.text : `${exRef(c.ex)} in full` })),
        wsc: cite('wsc', 'wsc', c.wsc),
        wlc: cite('wlc', 'wlc', c.wlc),
        hc: cite('hc', 'hc', c.hc),
      },
      refs: parallel,
    })
  }
  return {
    doc: doc({
      id: 'decalogue',
      title: 'The Ten Commandments',
      short: '10C',
      kind: 'law',
      source: { name: 'King James Version (1769), Exodus 20', license: 'Public domain', note: 'Reformed numbering. Short forms are the traditional summaries; long forms are the full text.' },
      groups,
      units,
    }),
    harmony: {
      id: 'decalogue',
      title: 'The Ten Commandments in the catechisms',
      tradition: 'reformed',
      description: 'Each commandment with its exposition in the Shorter and Larger Catechisms and the Heidelberg Catechism.',
      columns: [
        { key: 'decalogue', label: 'Commandment', docId: 'decalogue' },
        { key: 'wsc', label: 'WSC', docId: 'wsc' },
        { key: 'wlc', label: 'WLC', docId: 'wlc' },
        { key: 'hc', label: 'Heidelberg', docId: 'hc' },
      ],
      sections: [{ title: 'Exodus 20 / Deuteronomy 5', rows }],
    },
  }
}

// ---------------------------------------------------------------- Luther's catechisms

const SOURCE_TRIGLOT = { name: 'Triglot Concordia (1921), tr. F. Bente and W. H. T. Dau', license: 'Public domain' }

// Scripture behind the Small Catechism's parts, shown as "see also" links.
const LSC_REFS: Record<string, string> = {
  'lsc-c1': 'Exod. 20:3', 'lsc-c2': 'Exod. 20:7', 'lsc-c3': 'Exod. 20:8-11', 'lsc-c4': 'Exod. 20:12', 'lsc-c5': 'Exod. 20:13',
  'lsc-c6': 'Exod. 20:14', 'lsc-c7': 'Exod. 20:15', 'lsc-c8': 'Exod. 20:16', 'lsc-c9': 'Exod. 20:17', 'lsc-c10': 'Exod. 20:17',
  'lsc-cclose': 'Exod. 20:5-6', 'lsc-p0': 'Matt. 6:9', 'lsc-p1': 'Matt. 6:9', 'lsc-p2': 'Matt. 6:10', 'lsc-p3': 'Matt. 6:10',
  'lsc-p4': 'Matt. 6:11', 'lsc-p5': 'Matt. 6:12', 'lsc-p6': 'Matt. 6:13', 'lsc-p7': 'Matt. 6:13',
  'lsc-b1': 'Matt. 28:19', 'lsc-b2': 'Mark 16:16', 'lsc-b3': 'Titus 3:5-8', 'lsc-b4': 'Rom. 6:4',
  'lsc-s2': 'Matt. 26:26-28; Mark 14:22-24; Luke 22:19-20; 1 Cor. 11:23-25',
  'lsc-blessing': 'Ps. 145:15-16', 'lsc-thanks': 'Ps. 106:1; 136:25; 147:9-11',
}

function buildSmallCatechism(): Doc {
  const data: { parts: { title: string; units: { id: string; ref: string; prompt: string; text: string }[] }[] } = readJson(join(SRC, 'small-catechism.json'))
  const units: Unit[] = []
  const groups: Group[] = []
  for (const part of data.parts) {
    for (const u of part.units) {
      const r = LSC_REFS[u.id] ? refs(LSC_REFS[u.id], `LSC ${u.ref}`) : []
      units.push(makeUnit(u.id, u.ref, u.prompt, u.text, r.length ? [{ span: [0, u.text.length], refs: r }] : []))
    }
    groups.push({ title: part.title, units: part.units.map((u) => u.id) })
  }
  return doc({
    id: 'lsc',
    title: "Luther's Small Catechism",
    short: 'SC',
    kind: 'catechism',
    year: '1529',
    source: { ...SOURCE_TRIGLOT, url: 'https://bookofconcord.org/small-catechism/', note: 'Bracketed editorial additions are left out. Each part is the text, then its explanation, as it is taught.' },
    groups,
    units,
  })
}

// Section headings in the Large Catechism, in order. A paragraph that matches
// starts a new group; the paragraphs under it are its units.
const LLC_HEADINGS: [RegExp, string][] = [
  [/^Preface$/, 'Preface'],
  [/^SHORT PREFACE/, 'Short Preface'],
  [/^Part First\. The Ten Commandments/, 'The Ten Commandments'],
  [/^The (First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth) Commandment\.$/, '$0'],
  [/^\[Exposition of the Appendix to the First Commandment\.\]$/, 'Appendix to the First Commandment'],
  [/^The Ninth and Tenth Commandments$/, '$0'],
  [/^Conclusion of the Ten Commandments\.$/, 'Conclusion of the Ten Commandments'],
  [/^Part Second\. OF THE CREED\.$/, 'The Creed'],
  [/^Article (I|II|III)\.$/, 'The Creed, $0'],
  [/^Part Third\. OF PRAYER\.$/, 'Prayer'],
  [/^The Lord's Prayer\.$/, "The Lord's Prayer"],
  [/^The (First|Second|Third|Fourth|Fifth|Sixth) Petition\.$/, '$0'],
  [/^The Seventh and Last Petition\.$/, 'The Seventh Petition'],
  [/^Part Fourth\.$/, 'Baptism'],
  [/^\[Part Fifth\.\]$/, 'The Sacrament of the Altar'],
]

function buildLargeCatechism(): Doc {
  const raw = readFileSync(join(CACHE, 'large-catechism.txt'), 'utf8').replace(/\r\n/g, '\n')
  // From the preface to the end of Luther's text (before the transcriber's note).
  const body = raw.slice(raw.indexOf('\nPreface\n'), raw.indexOf('This text was converted to ASCII format for Project Wittenberg'))
  const paras = body.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const groups: Group[] = []
  const units: Unit[] = []
  let group: Group | undefined
  let carry = ''
  for (const p of paras) {
    const h = LLC_HEADINGS.find(([re]) => re.test(p))
    if (h) {
      group = { title: h[1].replace('$0', p.replace(/[.\[\]]/g, '').trim()), units: [] }
      groups.push(group)
      continue
    }
    // Headings, quoted commandments and list items in the short preface are
    // not prose to memorise.
    if (p.split(' ').length < 8 || /^\d+\. /.test(p) || /^A Christian, Profitable/.test(p) || /^(OF |THE |First\.|Secondly\.|Thirdly\.)/.test(p)) continue
    // A lead-in that ends in a colon belongs with the passage it introduces.
    if (p.endsWith(':')) {
      carry += p + ' '
      continue
    }
    if (!group) throw new Error('LLC: text before the first heading')
    const n = units.length + 1
    const k = group.units.length + 1
    // Bracketed passages are the Triglot editors' additions from the Latin text.
    const text = (carry + p).replace(/\s*\[[^\]]*\]/g, '').replace(/\s+([,.;:])/g, '$1')
    carry = ''
    units.push(makeUnit(`llc-${n}`, `¶${n}`, `${group.title}, paragraph ${k}`, text))
    group.units.push(`llc-${n}`)
  }
  if (units.length < 300) warn(`LLC: only ${units.length} paragraphs`)
  return doc({
    id: 'llc',
    title: "Luther's Large Catechism",
    short: 'LC',
    kind: 'catechism',
    year: '1529',
    source: { ...SOURCE_TRIGLOT, url: 'https://www.gutenberg.org/ebooks/1722', note: 'From Project Gutenberg. One unit per paragraph; paragraph numbers are this app\'s own, not the Triglot\'s.' },
    groups: groups.filter((g) => g.units.length),
    units,
  })
}

// ---------------------------------------------------------------- write

const docs = new Map<string, Doc>()
for (const d of [buildWsc(), buildWlc(), buildWcf(), buildHc(), buildBelgic(), buildDort(), buildSmallCatechism(), buildLargeCatechism()]) docs.set(d.id, d)
const cr = buildCreeds()
docs.set('apostles', cr.apostles)
docs.set('nicene', cr.nicene)
docs.set('athanasian', buildSimpleCreed('athanasian', 'athanasian_creed', 'Athanasian Creed', 'Ath', '6th c.'))
docs.set('chalcedon', buildSimpleCreed('chalcedon', 'chalcedonian_definition', 'Chalcedonian Definition', 'Chal', '451'))
const dec = buildDecalogue(docs)
docs.set('decalogue', dec.doc)
const harmonies = [cr.harmony, dec.harmony]

const ORDER = ['wsc', 'wlc', 'wcf', 'decalogue', 'hc', 'bc', 'dort', 'lsc', 'llc', 'apostles', 'nicene', 'athanasian', 'chalcedon']

rmSync(OUT, { recursive: true, force: true })
mkdirSync(join(OUT, 'docs'), { recursive: true })
mkdirSync(join(OUT, 'harmonies'), { recursive: true })
mkdirSync(join(OUT, 'kjv'), { recursive: true })

for (const d of docs.values()) writeFileSync(join(OUT, 'docs', `${d.id}.json`), JSON.stringify(d))
for (const h of harmonies) writeFileSync(join(OUT, 'harmonies', `${h.id}.json`), JSON.stringify(h))
for (const [osis, text] of kjv) writeFileSync(join(OUT, 'kjv', `${osis}.json`), JSON.stringify(text))

const index: DataIndex = {
  builtAt: new Date().toISOString(),
  docs: ORDER.map((id) => {
    const { groups: _g, units: _u, ...summary } = docs.get(id)!
    return summary
  }),
  harmonies: harmonies.map((h) => ({ id: h.id, title: h.title, tradition: h.tradition })),
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 1))

// ---------------------------------------------------------------- report

for (const id of ORDER) {
  const d = docs.get(id)!
  const chunks = d.units.reduce((n, u) => n + u.chunks.length, 0)
  const proofs = d.units.reduce((n, u) => n + u.proofs.reduce((m, p) => m + p.refs.length, 0) + (u.notes ?? []).reduce((m, p) => m + p.refs.length, 0), 0)
  console.log(`${d.short.padEnd(5)} ${String(d.units.length).padStart(4)} units ${String(chunks).padStart(5)} chunks ${String(proofs).padStart(5)} refs  ${d.title}`)
}
console.log(`${warnings.length} warning(s)`)
for (const w of warnings) console.log('  ' + w)
void normWord
