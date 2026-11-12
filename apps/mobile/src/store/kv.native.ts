import { sqlite } from './sqlite.native'

// See kv.ts.
export const kv = {
  get(key: string): string | undefined {
    return sqlite.getFirstSync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key)?.value
  },
  set(key: string, value: string) {
    sqlite.runSync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', key, value)
  },
  remove(key: string) {
    sqlite.runSync('DELETE FROM kv WHERE key = ?', key)
  },
}
