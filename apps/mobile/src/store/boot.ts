import { AppState } from 'react-native'
import { db } from '../../../../src/store/db.ts'
import { startSync } from '../../../../src/store/sync.ts'
import { watchSchedule } from '../lib/reminders.ts'
import { persist } from './persist.ts'
import { openRows } from './rows'

let booted: Promise<void> | undefined

/**
 * Load the learner's data, then start sync and the reminders. The screens wait
 * for this (src/app/_layout.tsx). On the web, the data is already in IndexedDB.
 */
export function boot(): Promise<void> {
  booted ??= (async () => {
    const rows = openRows()
    if (rows) {
      const store = persist(db, rows)
      await store.hydrate()
      // Write the last changes before the system can stop the app.
      AppState.addEventListener('change', (state) => state !== 'active' && void store.flush())
    }
    startSync()
    watchSchedule()
  })()
  return booted
}
