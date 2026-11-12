import type { RowStore } from './persist.ts'

// On the web, IndexedDB keeps the rows itself. rows.native.ts keeps them in SQLite.
export const openRows = (): RowStore | undefined => undefined
