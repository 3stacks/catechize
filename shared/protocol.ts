// The sync protocol shared by the app (src/store/sync.ts) and the server
// (server/). Every learner record is a JSON document addressed by table and
// id. Conflicts resolve last-writer-wins per record, on the client's
// updated-at time `u`. Deletions travel as records with `data: null`.

/** Tables that sync. Everything else in IndexedDB stays on the device. */
export const SYNCED_TABLES = ['cards', 'log', 'courses', 'learned', 'verses', 'settings', 'notes'] as const
export type SyncedTable = (typeof SYNCED_TABLES)[number]

export const isSyncedTable = (t: unknown): t is SyncedTable => typeof t === 'string' && (SYNCED_TABLES as readonly string[]).includes(t)

export interface Change {
  tbl: SyncedTable
  id: string
  /** The record, or null when it was deleted. */
  data: Record<string, unknown> | null
  /** Client time of the change (ms epoch). The larger `u` wins. */
  u: number
}

export interface SyncRequest {
  /** The epoch the client last synced with, if any. */
  epoch?: string
  /** The server sequence number the client has pulled up to. */
  since: number
  changes: Change[]
}

export interface SyncResponse {
  /** Identifies the server database. When it changes, the client starts again from seq 0 and pushes everything. */
  epoch: string
  /** Pull up to here next time. */
  seq: number
  /** Changes after `since`, oldest first. */
  changes: Change[]
  /** More changes wait; call again with the new `seq`. */
  more: boolean
  /** The client was ahead of the server (a restored backup). It must push every record again. */
  reset?: true
}

export interface Health {
  ok: true
  /** The server wants `Authorization: Bearer <token>`. */
  auth: boolean
  version: string
}

/** Limits that keep a single request bounded. The client batches to these. */
export const MAX_PUSH = 500
export const MAX_PULL = 1000
export const MAX_ID = 200
