import type { Row, RowStore } from './persist.ts'
import { sqlite } from './sqlite.native'

// The rows of the learner's data, in SQLite. See persist.ts.
export const openRows = (): RowStore => ({
  all: () => sqlite.getAllSync<Row>('SELECT tbl, id, data FROM rows'),
  write(put, del, clear) {
    sqlite.withTransactionSync(() => {
      for (const tbl of clear) sqlite.runSync('DELETE FROM rows WHERE tbl = ?', tbl)
      for (const r of put) sqlite.runSync('INSERT OR REPLACE INTO rows (tbl, id, data) VALUES (?, ?, ?)', r.tbl, r.id, r.data)
      for (const r of del) sqlite.runSync('DELETE FROM rows WHERE tbl = ? AND id = ?', r.tbl, r.id)
    })
  },
})
