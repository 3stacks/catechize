import { BOOKS, bookByOsis, findBook } from './books.ts'

// A contiguous passage. Verse 0 / end verse 0 mean "whole chapter".
export interface Passage {
  book: string // OSIS id
  c1: number
  v1: number
  c2: number
  v2: number
}

export interface ParseResult {
  passages: Passage[]
  errors: string[]
}

const BOOK_RE = /^((?:[1-3]|i{1,3})\s*)?[A-Za-z][A-Za-z ]*?\.?(?=\s*\d)/i

/**
 * Parse a free-text reference list. Book, then chapter, carry forward across
 * ',' and ';' the way footnotes are written:
 *   "Job 4:17, 35:10, Is. 17:7, 54:5"   "II Pet.1:20-21; 3:2, 15-16"
 *   "Matt. 19:4-5 with Gen. 2:24"        "Jude 17, 21"
 * After "c:v", a bare number following ',' is a verse in that chapter; one
 * following ';' is a whole chapter.
 */
export function parseRefs(input: string): ParseResult {
  const passages: Passage[] = []
  const errors: string[] = []
  let book: string | undefined
  let chapter: number | undefined

  const parts = input
    .replace(/\b(I{1,3})(?=[A-Z][a-z])/g, '$1 ') // "ICor." → "I Cor."
    .replace(/\b(with|see|cf\.?)(?=\s)/gi, ';')
    .replace(/[()]/g, ';')
    .replace(/(\d)ff\b/g, '$1')
    .replace(/[–—]/g, '-')
    .split(/(?=[;,])/)

  for (const part of parts) {
    // After ';' a bare number starts a new chapter ("Ps. 103:1-5; 136");
    // after ',' it is another verse in the current chapter.
    if (part.startsWith(';')) chapter = undefined
    const raw = part.replace(/^[;,]/, '').trim()
    if (!raw) continue
    let rest = raw
    const m = rest.match(BOOK_RE)
    if (m) {
      const b = findBook(m[0])
      if (b) {
        book = b.osis
        chapter = undefined
        rest = rest.slice(m[0].length).trim()
      }
    }
    if (!book) {
      errors.push(`no book for "${raw}"`)
      continue
    }
    const single = bookByOsis(book).chapters === 1

    // c:v-c:v | c:v-v | c:v | v-v | v | c (whole chapter)
    let r: RegExpMatchArray | null
    if ((r = rest.match(/^(\d+)[:.](\d+)\s*-\s*(\d+)[:.](\d+)$/))) {
      chapter = +r[3]
      passages.push({ book, c1: +r[1], v1: +r[2], c2: +r[3], v2: +r[4] })
    } else if ((r = rest.match(/^(\d+)[:.](\d+)(?:\s*-\s*(\d+))?[a-z]?$/))) {
      chapter = +r[1]
      passages.push({ book, c1: chapter, v1: +r[2], c2: chapter, v2: r[3] ? +r[3] : +r[2] })
    } else if ((r = rest.match(/^(\d+)(?:\s*-\s*(\d+))?[a-z]?$/))) {
      const a = +r[1]
      const b = r[2] ? +r[2] : a
      if (single) passages.push({ book, c1: 1, v1: a, c2: 1, v2: b })
      else if (chapter !== undefined) passages.push({ book, c1: chapter, v1: a, c2: chapter, v2: b })
      else passages.push({ book, c1: a, v1: 0, c2: b, v2: 0 })
    } else {
      errors.push(`unparsed "${raw}"`)
      continue
    }

    const p = passages[passages.length - 1]
    const max = bookByOsis(book).chapters
    if (p.c1 < 1 || p.c1 > max || p.c2 > max) {
      passages.pop()
      errors.push(`"${raw}": ${book} has ${max} chapters`)
    }
  }
  return { passages, errors }
}

/**
 * Parse OSIS ids as used by Creeds.json: "Rom.11.36", "Ps.73.24-Ps.73.28",
 * "Heb.8-Heb.10", and comma lists "Luke.16.29,Luke.16.31".
 */
export function parseOsis(ref: string): Passage[] {
  const out: Passage[] = []
  for (const one of ref.split(',')) {
    const [a, b] = one.trim().split('-')
    const pa = a.split('.')
    const book = findBook(pa[0])?.osis
    if (!book || pa.length < 2) continue
    const c1 = +pa[1]
    const v1 = pa[2] ? +pa[2] : 0
    let c2 = c1
    let v2 = v1
    if (b) {
      // the end may repeat the book ("Ps.73.28") or not ("73.28", "28")
      const pb = b.split('.')
      if (findBook(pb[0])) pb.shift()
      if (v1 === 0) c2 = +pb[0]
      else if (pb.length === 2) [c2, v2] = [+pb[0], +pb[1]]
      else v2 = +pb[0]
    }
    if ([c1, v1, c2, v2].some(Number.isNaN)) continue
    out.push({ book, c1, v1, c2, v2 })
  }
  return out
}

export function formatPassage(p: Passage): string {
  const name = bookByOsis(p.book).name
  if (p.v1 === 0) return p.c1 === p.c2 ? `${name} ${p.c1}` : `${name} ${p.c1}–${p.c2}`
  if (bookByOsis(p.book).chapters === 1 && p.c1 === 1 && p.c2 === 1)
    return p.v1 === p.v2 ? `${name} ${p.v1}` : `${name} ${p.v1}–${p.v2}`
  if (p.c1 === p.c2) return p.v1 === p.v2 ? `${name} ${p.c1}:${p.v1}` : `${name} ${p.c1}:${p.v1}–${p.v2}`
  return `${name} ${p.c1}:${p.v1}–${p.c2}:${p.v2}`
}

/** Compact id used as a key in data files: "Rom.8.28-30", "Ps.73.24-28", "Gen.1". */
export function passageId(p: Passage): string {
  if (p.v1 === 0) return p.c1 === p.c2 ? `${p.book}.${p.c1}` : `${p.book}.${p.c1}-${p.c2}`
  if (p.c1 === p.c2) return p.v1 === p.v2 ? `${p.book}.${p.c1}.${p.v1}` : `${p.book}.${p.c1}.${p.v1}-${p.v2}`
  return `${p.book}.${p.c1}.${p.v1}-${p.c2}.${p.v2}`
}

export function passageFromId(id: string): Passage | undefined {
  const m = id.match(/^(\w+)\.(\d+)(?:\.(\d+))?(?:-(\d+)(?:\.(\d+))?)?$/)
  if (!m) return undefined
  const book = m[1]
  const c1 = +m[2]
  const v1 = m[3] ? +m[3] : 0
  if (!m[4]) return { book, c1, v1, c2: c1, v2: v1 }
  if (!m[3]) return { book, c1, v1: 0, c2: +m[4], v2: 0 }
  if (m[5]) return { book, c1, v1, c2: +m[4], v2: +m[5] }
  return { book, c1, v1, c2: c1, v2: +m[4] }
}

export { BOOKS }
