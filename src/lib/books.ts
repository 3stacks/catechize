// The 66 books in canonical order: OSIS id, display name, chapter count, aliases.
// Aliases are matched after lowercasing and stripping dots/spaces, and with
// roman-numeral prefixes ("II Pet") normalised to arabic ("2pet").

export interface Book {
  osis: string
  name: string
  chapters: number
  aliases: string[]
}

export const BOOKS: Book[] = [
  { osis: 'Gen', name: 'Genesis', chapters: 50, aliases: ['ge', 'gn'] },
  { osis: 'Exod', name: 'Exodus', chapters: 40, aliases: ['ex', 'exo'] },
  { osis: 'Lev', name: 'Leviticus', chapters: 27, aliases: ['le', 'lv'] },
  { osis: 'Num', name: 'Numbers', chapters: 36, aliases: ['nu', 'nm', 'nb'] },
  { osis: 'Deut', name: 'Deuteronomy', chapters: 34, aliases: ['de', 'dt'] },
  { osis: 'Josh', name: 'Joshua', chapters: 24, aliases: ['jos', 'jsh'] },
  { osis: 'Judg', name: 'Judges', chapters: 21, aliases: ['jdg', 'jg', 'jdgs'] },
  { osis: 'Ruth', name: 'Ruth', chapters: 4, aliases: ['ru', 'rth'] },
  { osis: '1Sam', name: '1 Samuel', chapters: 31, aliases: ['1sa', '1sm'] },
  { osis: '2Sam', name: '2 Samuel', chapters: 24, aliases: ['2sa', '2sm'] },
  { osis: '1Kgs', name: '1 Kings', chapters: 22, aliases: ['1ki', '1kin', '1kg'] },
  { osis: '2Kgs', name: '2 Kings', chapters: 25, aliases: ['2ki', '2kin', '2kg'] },
  { osis: '1Chr', name: '1 Chronicles', chapters: 29, aliases: ['1ch', '1chron'] },
  { osis: '2Chr', name: '2 Chronicles', chapters: 36, aliases: ['2ch', '2chron'] },
  { osis: 'Ezra', name: 'Ezra', chapters: 10, aliases: ['ezr'] },
  { osis: 'Neh', name: 'Nehemiah', chapters: 13, aliases: ['ne'] },
  { osis: 'Esth', name: 'Esther', chapters: 10, aliases: ['est', 'es'] },
  { osis: 'Job', name: 'Job', chapters: 42, aliases: ['jb'] },
  { osis: 'Ps', name: 'Psalms', chapters: 150, aliases: ['psa', 'psalm', 'pss', 'psm'] },
  { osis: 'Prov', name: 'Proverbs', chapters: 31, aliases: ['pr', 'prv', 'pro'] },
  { osis: 'Eccl', name: 'Ecclesiastes', chapters: 12, aliases: ['ec', 'ecc', 'eccles', 'qoh'] },
  { osis: 'Song', name: 'Song of Solomon', chapters: 8, aliases: ['so', 'sos', 'songofsongs', 'cant', 'canticles'] },
  { osis: 'Isa', name: 'Isaiah', chapters: 66, aliases: ['is'] },
  { osis: 'Jer', name: 'Jeremiah', chapters: 52, aliases: ['je', 'jr'] },
  { osis: 'Lam', name: 'Lamentations', chapters: 5, aliases: ['la'] },
  { osis: 'Ezek', name: 'Ezekiel', chapters: 48, aliases: ['eze', 'ezk'] },
  { osis: 'Dan', name: 'Daniel', chapters: 12, aliases: ['da', 'dn'] },
  { osis: 'Hos', name: 'Hosea', chapters: 14, aliases: ['ho'] },
  { osis: 'Joel', name: 'Joel', chapters: 3, aliases: ['jl'] },
  { osis: 'Amos', name: 'Amos', chapters: 9, aliases: ['am'] },
  { osis: 'Obad', name: 'Obadiah', chapters: 1, aliases: ['ob'] },
  { osis: 'Jonah', name: 'Jonah', chapters: 4, aliases: ['jon', 'jnh'] },
  { osis: 'Mic', name: 'Micah', chapters: 7, aliases: ['mi'] },
  { osis: 'Nah', name: 'Nahum', chapters: 3, aliases: ['na'] },
  { osis: 'Hab', name: 'Habakkuk', chapters: 3, aliases: ['hb'] },
  { osis: 'Zeph', name: 'Zephaniah', chapters: 3, aliases: ['zep', 'zp'] },
  { osis: 'Hag', name: 'Haggai', chapters: 2, aliases: ['hg'] },
  { osis: 'Zech', name: 'Zechariah', chapters: 14, aliases: ['zec', 'zc'] },
  { osis: 'Mal', name: 'Malachi', chapters: 4, aliases: ['ml'] },
  { osis: 'Matt', name: 'Matthew', chapters: 28, aliases: ['mt', 'mat'] },
  { osis: 'Mark', name: 'Mark', chapters: 16, aliases: ['mk', 'mr', 'mrk'] },
  { osis: 'Luke', name: 'Luke', chapters: 24, aliases: ['lk', 'lu'] },
  { osis: 'John', name: 'John', chapters: 21, aliases: ['jn', 'jhn', 'joh'] },
  { osis: 'Acts', name: 'Acts', chapters: 28, aliases: ['ac', 'act'] },
  { osis: 'Rom', name: 'Romans', chapters: 16, aliases: ['ro', 'rm'] },
  { osis: '1Cor', name: '1 Corinthians', chapters: 16, aliases: ['1co'] },
  { osis: '2Cor', name: '2 Corinthians', chapters: 13, aliases: ['2co'] },
  { osis: 'Gal', name: 'Galatians', chapters: 6, aliases: ['ga'] },
  { osis: 'Eph', name: 'Ephesians', chapters: 6, aliases: ['ep'] },
  { osis: 'Phil', name: 'Philippians', chapters: 4, aliases: ['php', 'pp'] },
  { osis: 'Col', name: 'Colossians', chapters: 4, aliases: ['co'] },
  { osis: '1Thess', name: '1 Thessalonians', chapters: 5, aliases: ['1th', '1thes'] },
  { osis: '2Thess', name: '2 Thessalonians', chapters: 3, aliases: ['2th', '2thes'] },
  { osis: '1Tim', name: '1 Timothy', chapters: 6, aliases: ['1ti', '1tm'] },
  { osis: '2Tim', name: '2 Timothy', chapters: 4, aliases: ['2ti', '2tm'] },
  { osis: 'Titus', name: 'Titus', chapters: 3, aliases: ['tit', 'ti'] },
  { osis: 'Phlm', name: 'Philemon', chapters: 1, aliases: ['philem', 'phm', 'pm'] },
  { osis: 'Heb', name: 'Hebrews', chapters: 13, aliases: ['he'] },
  { osis: 'Jas', name: 'James', chapters: 5, aliases: ['jam', 'jm'] },
  { osis: '1Pet', name: '1 Peter', chapters: 5, aliases: ['1pe', '1pt', '1p'] },
  { osis: '2Pet', name: '2 Peter', chapters: 3, aliases: ['2pe', '2pt', '2p'] },
  { osis: '1John', name: '1 John', chapters: 5, aliases: ['1jn', '1jo', '1joh'] },
  { osis: '2John', name: '2 John', chapters: 1, aliases: ['2jn', '2jo'] },
  { osis: '3John', name: '3 John', chapters: 1, aliases: ['3jn', '3jo'] },
  { osis: 'Jude', name: 'Jude', chapters: 1, aliases: ['jud', 'jd'] },
  { osis: 'Rev', name: 'Revelation', chapters: 22, aliases: ['re', 'rv', 'revelationofjohn', 'apoc'] },
]

const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/^(iii|ii|i)(?=[\s.]+[a-z])/, (m) => String(m.length))
    .replace(/[.\s]/g, '')

const ALIAS = new Map<string, Book>()
for (const b of BOOKS) {
  for (const a of [b.osis, b.name, ...b.aliases]) ALIAS.set(normalise(a), b)
}

export function findBook(token: string): Book | undefined {
  const key = normalise(token)
  const exact = ALIAS.get(key)
  if (exact) return exact
  // Unambiguous prefix of a full name ("Thes" → Thessalonians needs a number, so
  // only accept when exactly one book matches).
  const hits = BOOKS.filter((b) => normalise(b.name).startsWith(key))
  return hits.length === 1 ? hits[0] : undefined
}

export const bookIndex = (osis: string) => BOOKS.findIndex((b) => b.osis === osis)
export const bookByOsis = (osis: string) => BOOKS[bookIndex(osis)]
