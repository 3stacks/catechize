// React Native has no IndexedDB. The app runs the shared Dexie code
// (../../../../src/store) on fake-indexeddb, a complete IndexedDB in memory.
// persist.ts writes each change through to SQLite, and loads the rows back
// when the app starts.
//
// Dexie reads these globals when it loads, so index.ts imports this file first.
import './polyfills'
import { IDBKeyRange, indexedDB } from 'fake-indexeddb'

const g = globalThis as Record<string, unknown>
g.indexedDB = indexedDB
g.IDBKeyRange = IDBKeyRange
