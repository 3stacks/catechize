import { openDatabaseSync } from 'expo-sqlite'

// One SQLite file on the device holds all of the learner's data.
//   rows: one row for each Dexie row, as JSON (persist.ts)
//   kv:   values that this device keeps for itself, such as the sync server address (kv.native.ts)
export const sqlite = openDatabaseSync('hearers.db')
sqlite.execSync(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS rows (tbl TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (tbl, id)) WITHOUT ROWID;
  CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
`)
