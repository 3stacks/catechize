import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { MAX_ID, MAX_PULL, isSyncedTable, type Change, type SyncResponse } from '../shared/protocol.ts'

// Learner state in SQLite. One table holds every synced record as JSON, keyed
// by (tbl, id). `seq` is a server-wide change counter: a client pulls every
// row whose seq is past the last one it saw. Views expose the main tables as
// columns so the database is easy to query with the sqlite3 shell.

const SCHEMA = `
CREATE TABLE IF NOT EXISTS records (
  tbl  TEXT    NOT NULL,
  id   TEXT    NOT NULL,
  data TEXT,              -- JSON; NULL once deleted (a tombstone)
  u    INTEGER NOT NULL,  -- client change time, ms epoch; last writer wins
  seq  INTEGER NOT NULL,  -- server change counter
  PRIMARY KEY (tbl, id)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS records_seq ON records (seq);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE VIEW IF NOT EXISTS cards AS
  SELECT id,
         data ->> 'unitId' AS unit_id,
         data ->> 'docId'  AS doc_id,
         data ->> 'kind'   AS kind,
         data ->> 'index'  AS chunk,
         datetime((data ->> 'due') / 1000, 'unixepoch') AS due,
         data -> 'card' ->> 'stability' AS stability,
         data -> 'card' ->> 'lapses'    AS lapses
  FROM records WHERE tbl = 'cards' AND data IS NOT NULL;

CREATE VIEW IF NOT EXISTS reviews AS
  SELECT id,
         data ->> 'cardId' AS card_id,
         data ->> 'unitId' AS unit_id,
         datetime((data ->> 'at') / 1000, 'unixepoch') AS at,
         data ->> 'rating' AS rating,
         data ->> 'errors' AS errors,
         data ->> 'words'  AS words,
         data ->> 'mode'   AS mode
  FROM records WHERE tbl = 'log' AND data IS NOT NULL;
`

export class Store {
  readonly db: DatabaseSync
  /** Identifies this database. A new or replaced database gets a new epoch, and clients resync from scratch. */
  readonly epoch: string

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
    this.db = new DatabaseSync(path)
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000;')
    this.db.exec(SCHEMA)
    this.db.prepare("INSERT OR IGNORE INTO meta (key, value) VALUES ('epoch', ?)").run(randomUUID())
    this.epoch = (this.db.prepare("SELECT value FROM meta WHERE key = 'epoch'").get() as { value: string }).value
  }

  private seq(): number {
    const row = this.db.prepare('SELECT coalesce(max(seq), 0) AS seq FROM records').get() as { seq: number }
    return row.seq
  }

  /**
   * Apply a client's changes (last writer wins) and return what it has not
   * seen yet. Runs in one transaction, so a failed request changes nothing.
   */
  sync(since: number, changes: Change[], epoch?: string, limit = MAX_PULL): SyncResponse {
    const get = this.db.prepare('SELECT u FROM records WHERE tbl = ? AND id = ?')
    const put = this.db.prepare(
      `INSERT INTO records (tbl, id, data, u, seq) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (tbl, id) DO UPDATE SET data = excluded.data, u = excluded.u, seq = excluded.seq`,
    )
    const pull = this.db.prepare('SELECT tbl, id, data, u, seq FROM records WHERE seq > ? ORDER BY seq LIMIT ?')

    this.db.exec('BEGIN IMMEDIATE')
    try {
      let seq = this.seq()
      // A client that synced with another database, or that is ahead of this
      // one (it was restored from an older backup), pulls everything again and
      // then pushes everything it has.
      const reset = (epoch !== undefined && epoch !== this.epoch) || since > seq
      if (reset) since = 0
      for (const c of changes) {
        const have = get.get(c.tbl, c.id) as { u: number } | undefined
        if (have && have.u > c.u) continue // the stored record is newer
        put.run(c.tbl, c.id, c.data === null ? null : JSON.stringify(c.data), c.u, ++seq)
      }
      const rows = pull.all(since, limit + 1) as { tbl: Change['tbl']; id: string; data: string | null; u: number; seq: number }[]
      this.db.exec('COMMIT')
      const more = rows.length > limit
      const page = rows.slice(0, limit)
      return {
        epoch: this.epoch,
        seq: page.length ? page[page.length - 1].seq : since,
        changes: page.map((r) => ({ tbl: r.tbl, id: r.id, data: r.data === null ? null : JSON.parse(r.data), u: r.u })),
        more,
        ...(reset ? { reset: true } : {}),
      }
    } catch (e) {
      this.db.exec('ROLLBACK')
      throw e
    }
  }

  /** A consistent copy of the database at `path` (for backups). */
  backup(path: string) {
    this.db.prepare('VACUUM INTO ?').run(path)
  }

  close() {
    this.db.close()
  }
}

/** Check a request body. Returns an error message, or undefined when it is valid. */
export function invalidChanges(changes: unknown): string | undefined {
  if (!Array.isArray(changes)) return 'changes must be an array'
  for (const c of changes as Partial<Change>[]) {
    if (!c || typeof c !== 'object') return 'change must be an object'
    if (!isSyncedTable(c.tbl)) return `unknown table: ${String(c.tbl)}`
    if (typeof c.id !== 'string' || !c.id || c.id.length > MAX_ID) return 'bad id'
    if (typeof c.u !== 'number' || !Number.isFinite(c.u)) return 'bad u'
    if (c.data !== null && (typeof c.data !== 'object' || Array.isArray(c.data))) return 'data must be an object or null'
  }
  return undefined
}
