import { forgetServer, setToken, syncNow } from '../../../../src/store/sync.ts'
import { serverUrl, storeServerUrl } from '../shims/sync-host.ts'

// The address of a self-hosted Hearers server. Sync uses the same protocol as
// the web app (shared/protocol.ts). See src/shims/sync-host.ts.

export { serverUrl }

/** Check an address. Returns a message for the learner, or undefined when it is correct. */
export function checkServerUrl(url: string): string | undefined {
  if (!url) return undefined
  if (!/^https?:\/\/[^\s/]+/i.test(url)) return 'Type the full address. It starts with https://.'
  return undefined
}

/** Use a server, or no server (an empty address). */
export function setServerUrl(url: string) {
  const next = url.trim().replace(/\/+$/, '')
  if (next === serverUrl()) return
  storeServerUrl(next)
  // A token belongs to one server.
  setToken('')
  forgetServer()
  void syncNow()
}
