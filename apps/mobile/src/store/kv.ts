// Small values that this device keeps for itself: the sync server, the token,
// the reminder time. On the web they are in localStorage. kv.native.ts keeps
// them in SQLite. Both are synchronous, because sync reads the token
// synchronously.
export const kv = {
  get(key: string): string | undefined {
    try {
      return localStorage.getItem(key) ?? undefined
    } catch {
      return undefined
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value)
    } catch {
      // Storage is blocked. The value lasts until the page closes.
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key)
    } catch {
      // Storage is blocked. There is nothing to remove.
    }
  },
}
