import { AppState } from 'react-native'
import type * as Web from '../../../../src/store/host.ts'
import { kv } from '../store/kv'

// The mobile app's copy of src/store/host.ts (metro.config.js swaps it in).
// The web app syncs with the server that serves it. The mobile app has no such
// server: the learner can type the address of a self-hosted Hearers server in
// Settings. With no address, sync stays off and all data stays on the device.

const SERVER_KEY = 'hearers.server'
const TOKEN_KEY = 'catechize.token'

/** The address that the learner typed, for example "https://hearers.example.org". */
export const serverUrl = () => kv.get(SERVER_KEY) ?? ''

export function storeServerUrl(url: string) {
  if (url) kv.set(SERVER_KEY, url)
  else kv.remove(SERVER_KEY)
}

export const apiBase = (): string | undefined => {
  const url = serverUrl().trim().replace(/\/+$/, '')
  return url ? `${url}/api/` : undefined
}

export const loadToken = () => kv.get(TOKEN_KEY) ?? ''

export function storeToken(token: string) {
  if (token) kv.set(TOKEN_KEY, token)
  else kv.remove(TOKEN_KEY)
}

// A fetch that fails counts as offline. The next sync tries again.
export const isOffline = () => false

export const isVisible = () => AppState.currentState === 'active'

export function onWake(f: () => void) {
  AppState.addEventListener('change', (state) => state === 'active' && f())
}

// The same exports as the web module.
void ({ apiBase, loadToken, storeToken, isOffline, isVisible, onWake } satisfies typeof Web)
