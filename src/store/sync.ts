import { useEffect, useState } from 'react'
import { db, SYNC_MARK, type SyncMark } from './db.ts'
import { MAX_PUSH, SYNCED_TABLES, type Change, type Health, type SyncRequest, type SyncResponse, type SyncedTable } from '../../shared/protocol.ts'
import { apiBase, isOffline, isVisible, loadToken, onWake, storeToken } from './host.ts'

// Copies learner state between IndexedDB and the server's SQLite database.
//
// Push: every row with _dirty = 1, and every tombstone.
// Pull: every server change past the last sequence number seen here.
// Last writer wins per row, on the row's change time (_u).
//
// The app works the same with no server (a static host, or offline): sync
// finds no API and stays idle. It runs at start, shortly after each change,
// when the device comes back online or the app comes back into view, and
// every few minutes. host.ts says where the server is.

const EVERY = 5 * 60_000

export type SyncState =
  | { kind: 'off' } // no server
  | { kind: 'locked' } // the server wants a token
  | { kind: 'idle'; at?: number; error?: string }
  | { kind: 'syncing' }

let state: SyncState = { kind: 'idle' }
let version = 0 // bumps when a pull changes local data
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((f) => f())
const setState = (s: SyncState) => {
  state = s
  emit()
}

export const getToken = () => loadToken()

export function setToken(token: string) {
  storeToken(token)
  sessionToken = token
  void syncNow()
}
let sessionToken = ''

export const headers = (): HeadersInit => {
  const t = getToken() || sessionToken
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }
}

const meta = {
  get: async <T,>(key: string, fallback: T): Promise<T> => ((await db.meta.get(key))?.value as T) ?? fallback,
  set: (key: string, value: unknown) => db.meta.put({ key, value }),
}

let server: Health | null | undefined // undefined = not probed yet
async function probe(): Promise<Health | null> {
  if (server !== undefined) return server
  const api = apiBase()
  if (!api) return (server = null)
  try {
    const r = await fetch(api + 'health', { cache: 'no-store' })
    const ct = r.headers.get('content-type') ?? ''
    server = r.ok && ct.includes('json') ? ((await r.json()) as Health) : null
  } catch {
    // offline: try again next time
    return null
  }
  return server
}

/** Look for the server again on the next sync, for example after the learner changes its address. */
export function forgetServer() {
  server = undefined
  setState({ kind: 'idle' })
}

let running: Promise<void> | null = null
let again = false

/** Sync now, or once more after the sync in progress. */
export function syncNow(): Promise<void> {
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    try {
      do {
        again = false
        await syncOnce()
      } while (again)
    } finally {
      running = null
    }
  })()
  return running
}

async function syncOnce() {
  if (isOffline()) return
  const health = await probe()
  if (!health) {
    if (server === null) setState({ kind: 'off' })
    return
  }
  setState({ kind: 'syncing' })
  try {
    let changed = false
    for (let round = 0; round < 1000; round++) {
      const { changes, pushed } = await collect()
      const req: SyncRequest = {
        epoch: await meta.get<string | undefined>('epoch', undefined),
        since: await meta.get('seq', 0),
        changes,
      }
      const r = await fetch(apiBase() + 'sync', { method: 'POST', headers: headers(), body: JSON.stringify(req) })
      if (r.status === 401) return setState({ kind: 'locked' })
      if (!r.ok) throw new Error(`server said ${r.status}`)
      const res = (await r.json()) as SyncResponse
      changed = (await apply(res, pushed)) || changed
      if (res.reset) {
        // The server lost what this device knew it had. Send everything again.
        await markAllDirty()
        changed = true
        continue
      }
      if (!res.more && changes.length < MAX_PUSH && !(await hasPending())) break
    }
    if (changed) {
      version++
      emit()
    }
    setState({ kind: 'idle', at: Date.now() })
  } catch (e) {
    setState({ kind: 'idle', at: (state.kind === 'idle' && state.at) || undefined, error: (e as Error).message })
  }
}

type Pushed = { tbl: SyncedTable; id: string; u: number; tomb: boolean }[]

/** Local changes not yet pushed, up to one request's worth. */
async function collect(): Promise<{ changes: Change[]; pushed: Pushed }> {
  const changes: Change[] = []
  const pushed: Pushed = []
  for (const tbl of SYNCED_TABLES) {
    if (changes.length >= MAX_PUSH) break
    const table = db.table(tbl)
    const rows = await table.where('_dirty').equals(1).limit(MAX_PUSH - changes.length).toArray()
    for (const row of rows) {
      const { _dirty, _u, ...data } = row as Record<string, unknown>
      const id = String((row as Record<string, unknown>)[table.schema.primKey.keyPath as string])
      changes.push({ tbl, id, data, u: (_u as number) ?? Date.now() })
      pushed.push({ tbl, id, u: (_u as number) ?? 0, tomb: false })
    }
  }
  if (changes.length < MAX_PUSH) {
    const tombs = await db.tombstones.limit(MAX_PUSH - changes.length).toArray()
    for (const t of tombs) {
      // Deleted and then created again: the new row is what counts.
      if (await db.table(t.tbl).get(t.id)) {
        await db.tombstones.delete(t.key)
        continue
      }
      changes.push({ tbl: t.tbl, id: t.id, data: null, u: t.u })
      pushed.push({ tbl: t.tbl, id: t.id, u: t.u, tomb: true })
    }
  }
  return { changes, pushed }
}

const hasPending = async () => {
  for (const tbl of SYNCED_TABLES) if ((await db.table(tbl).where('_dirty').equals(1).count()) > 0) return true
  return (await db.tombstones.count()) > 0
}

/** Store the server's changes and mark what was pushed as clean. Returns true when local data changed. */
async function apply(res: SyncResponse, pushed: Pushed): Promise<boolean> {
  let changed = false
  const tables = [...SYNCED_TABLES.map((t) => db.table(t)), db.tombstones, db.meta]
  applying = true
  await db.transaction('rw', tables, async () => {
    // What was pushed is on the server now, unless it changed again meanwhile.
    for (const p of pushed) {
      if (p.tomb) {
        const t = await db.tombstones.get(`${p.tbl}:${p.id}`)
        if (t && t.u === p.u) await db.tombstones.delete(t.key)
        continue
      }
      const row = (await db.table(p.tbl).get(p.id)) as { _u?: number; _dirty?: number } | undefined
      if (row && row._u === p.u && row._dirty) await db.table(p.tbl).update(p.id, { [SYNC_MARK]: 'clean' satisfies SyncMark })
    }

    for (const c of res.changes) {
      const table = db.table(c.tbl)
      const local = (await table.get(c.id)) as { _u?: number; _dirty?: number } | undefined
      const tomb = await db.tombstones.get(`${c.tbl}:${c.id}`)
      const localU = local?._u ?? tomb?.u ?? -1
      // Keep a local change that is newer than the server's.
      if ((local?._dirty || tomb) && localU > c.u) continue
      if (local && !local._dirty && local._u === c.u) continue // already have it
      if (c.data === null) {
        if (local) {
          await table.delete(c.id)
          changed = true
        }
      } else {
        await table.put({ ...reviveDates(c.tbl, c.data), _u: c.u, [SYNC_MARK]: 'clean' satisfies SyncMark })
        changed = true
      }
      if (tomb) await db.tombstones.delete(tomb.key)
    }

    await db.meta.put({ key: 'seq', value: res.seq })
    await db.meta.put({ key: 'epoch', value: res.epoch })
  }).finally(() => (applying = false))
  return changed
}

/** FSRS cards hold Date objects; JSON carries them as strings. */
export function reviveDates(tbl: string, data: Record<string, unknown>) {
  if (tbl !== 'cards' || !data.card) return data
  const card = { ...(data.card as Record<string, unknown>) }
  for (const k of ['due', 'last_review']) if (typeof card[k] === 'string') card[k] = new Date(card[k] as string)
  return { ...data, card }
}

async function markAllDirty() {
  applying = true
  await db.transaction('rw', SYNCED_TABLES.map((t) => db.table(t)), async () => {
    for (const t of SYNCED_TABLES)
      await db
        .table(t)
        .toCollection()
        .modify({ [SYNC_MARK]: 'dirty' satisfies SyncMark })
  }).finally(() => (applying = false))
  await db.meta.put({ key: 'seq', value: 0 })
}

// ------------------------------------------------------------------ scheduling

let timer: ReturnType<typeof setTimeout> | undefined
/** True while sync writes server rows, so those writes do not schedule another push. */
let applying = false

/** Push soon after a local change. Several changes close together go as one request. */
export function syncSoon(delay = 1500) {
  if (applying) return
  clearTimeout(timer)
  timer = setTimeout(() => void syncNow(), delay)
}

export function startSync() {
  void syncNow()
  onWake(() => void syncNow())
  setInterval(() => isVisible() && void syncNow(), EVERY)
  // Every local write to a synced table schedules a push.
  for (const t of SYNCED_TABLES) {
    const table = db.table(t)
    table.hook('creating', function () {
      this.onsuccess = () => syncSoon()
    })
    table.hook('updating', function () {
      this.onsuccess = () => syncSoon()
    })
  }
  db.tombstones.hook('creating', function () {
    this.onsuccess = () => syncSoon()
  })
}

// ------------------------------------------------------------------ React

export function useSyncState(): SyncState {
  const [, set] = useState(0)
  useEffect(() => {
    const f = () => set((n) => n + 1)
    listeners.add(f)
    return () => void listeners.delete(f)
  }, [])
  return state
}

/** Changes when a pull brought in new data. Add it to a loader's deps to refresh. */
export function useDataVersion(): number {
  useSyncState()
  return version
}
