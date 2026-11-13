// The scheduler of fake-indexeddb, for React Native. metro.config.js uses this
// file in place of fake-indexeddb/build/*/lib/scheduling.js.
//
// IndexedDB ends a transaction when the current task ends, after the
// microtasks. fake-indexeddb uses setImmediate for "the next task". In
// bridgeless React Native, setImmediate is a microtask. So a transaction
// committed before the awaits of Dexie were done, and the app showed
// "Transaction committed too early" at start. setTimeout is a true task.
export const queueTask = (fn: () => void): void => {
  setTimeout(fn, 0)
}
