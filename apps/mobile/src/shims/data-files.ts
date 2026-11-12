import type * as Web from '../../../../src/data/files.ts'
import { files } from '../../data/files.ts'

// The mobile app's copy of src/data/files.ts (metro.config.js swaps it in).
// Every data file is in the bundle, so the app works with no connection.
// scripts/mobile-data.ts writes data/ and data/files.ts.

export function get<T>(path: string): Promise<T> {
  const file = files[path]
  return file ? Promise.resolve(file() as T) : Promise.reject(new Error(`${path}: the app has no such file`))
}

export const sib: Promise<Web.SibIndex | undefined> = get<Web.SibIndex>('sib.json').catch(() => undefined)

// The same exports as the web module.
void ({ get, sib } satisfies typeof Web)
