// Where the static data comes from. The web app fetches each file once per
// session and keeps it in memory. The service worker makes the files available
// offline.
//
// The mobile app (apps/mobile) has its own copy of this module, with every file
// in its bundle. Its Metro config swaps the copy in at bundle time.

const base = import.meta.env.BASE_URL + 'data/'
const cache = new Map<string, Promise<unknown>>()

/** A file under public/data, for example "docs/wsc.json". */
export function get<T>(path: string): Promise<T> {
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

/** Chapters of the Self-Interpreting Bible that are online (scripts/fetch-sib.mjs). */
export interface SibIndex {
  base: string
  books: Record<string, [slug: string, chapters: number[]]>
}

export const sib: Promise<SibIndex | undefined> = fetch(import.meta.env.BASE_URL + 'sib.json')
  .then((r) => (r.ok ? (r.json() as Promise<SibIndex>) : undefined))
  .catch(() => undefined)
