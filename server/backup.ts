import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { Store } from './store.ts'

// Write a consistent snapshot of the database while the server runs.
//   node server/backup.ts /data/backup/catechize.db
// Run it inside the container, so SQLite locks work: a copy of the live file
// from the host can catch a write half done.

const out = process.argv[2]
if (!out) {
  console.error('usage: node server/backup.ts <output.db>')
  process.exit(2)
}
const target = resolve(out)
mkdirSync(dirname(target), { recursive: true })
if (existsSync(target)) rmSync(target) // VACUUM INTO refuses to overwrite
const store = new Store(join(process.env.DATA_DIR ?? 'data', 'catechize.db'))
store.backup(target)
store.close()
console.log(`backup written to ${target}`)
