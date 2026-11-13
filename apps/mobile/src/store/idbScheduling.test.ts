import { createRequire } from 'node:module'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { queueTask } from './idbScheduling.ts'

// In bridgeless React Native, setImmediate is a microtask. fake-indexeddb uses
// setImmediate for its tasks, so a Dexie transaction committed before its
// awaits were done (idbScheduling.ts). These tests make setImmediate a
// microtask, as on the device.

const here = path.dirname(new URL(import.meta.url).pathname)
const app = path.resolve(here, '../..')
const scheduling = (build: string) => path.join(app, `node_modules/fake-indexeddb/build/${build}/lib/scheduling.js`)
const real = globalThis.setImmediate
let n = 0

// fake-indexeddb calls globalThis.setImmediate for each task. Vitest loads the
// package outside Vite, so a mock cannot replace its scheduling.js. These tests
// set setImmediate instead. The last test checks the swap in Metro.
async function transaction() {
  const { indexedDB, IDBKeyRange } = await import('fake-indexeddb')
  const { default: Dexie } = await import('dexie')
  const db = new Dexie(`scheduling-${++n}`, { indexedDB, IDBKeyRange })
  db.version(1).stores({ rows: 'id' })
  await db.transaction('rw', db.tables, async () => {
    await db.table('rows').bulkPut([{ id: '1' }, { id: '2' }])
    await db.table('rows').put({ id: '3' })
  })
  return db.table('rows').count()
}

describe('fake-indexeddb in React Native', () => {
  afterEach(() => {
    globalThis.setImmediate = real
  })

  it('commits too early when setImmediate is a microtask', async () => {
    globalThis.setImmediate = ((fn: () => void) => queueMicrotask(fn)) as unknown as typeof setImmediate
    await expect(transaction()).rejects.toThrow('Transaction committed too early')
  })

  it('completes the transaction with the scheduler of the app', async () => {
    globalThis.setImmediate = queueTask as unknown as typeof setImmediate
    await expect(transaction()).resolves.toBe(3)
  })

  it('uses the scheduler of the app in Metro, for each build of fake-indexeddb', () => {
    const require = createRequire(import.meta.url)
    const config = require(path.join(app, 'metro.config.js')) as {
      resolver: { resolveRequest: (context: unknown, moduleName: string, platform: string) => { type: string; filePath?: string } }
    }
    for (const build of ['esm', 'cjs']) {
      const context = {
        originModulePath: path.join(app, `node_modules/fake-indexeddb/build/${build}/lib/Database.js`),
        resolveRequest: () => ({ type: 'sourceFile', filePath: scheduling(build) }),
      }
      expect(config.resolver.resolveRequest(context, './scheduling.js', 'ios').filePath).toBe(path.join(app, 'src/store/idbScheduling.ts'))
    }
  })
})
