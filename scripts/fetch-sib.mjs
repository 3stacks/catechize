// Record which chapters of the Self-Interpreting Bible are online, so a proof
// text can link to the verse there, with the notes of John Brown.
//   node scripts/fetch-sib.mjs
// CI runs this before each build. If the site is not reachable, the build keeps
// the copy in git.
import { writeFileSync } from 'node:fs'

const BASE = process.env.SIB_URL ?? 'https://self-interpreting-bible.pages.dev'
const OUT = new URL('../public/sib.json', import.meta.url)

try {
  const r = await fetch(`${BASE}/backlinks.json`, { signal: AbortSignal.timeout(20_000) })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const { annotated, annotatedSlug } = await r.json()
  const books = Object.fromEntries(Object.entries(annotated).map(([code, chapters]) => [code, [annotatedSlug[code], chapters]]))
  writeFileSync(OUT, JSON.stringify({ base: BASE, books }) + '\n')
  console.log(`sib.json: ${Object.keys(books).length} books`)
} catch (e) {
  console.warn(`sib.json not updated (${e.message}). The copy in git stays.`)
}
