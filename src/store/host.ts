// What sync needs from the place where the app runs. The web app syncs with
// the server that serves it, keeps the token in localStorage, and syncs again
// when the browser comes back online or the tab comes back into view.
//
// The mobile app (apps/mobile) has its own copy of this module. Its Metro
// config swaps the copy in at bundle time.

const TOKEN_KEY = 'catechize.token'

/** The sync API, ending in a slash. Undefined when this copy of the app has no server. */
export const apiBase = (): string | undefined => import.meta.env.BASE_URL + 'api/'

export function loadToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

export function storeToken(token: string) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // private mode: the token lasts for this session only
  }
}

export const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false

export const isVisible = () => document.visibilityState === 'visible'

/** Call `f` when the device comes back online or the app comes back into view. */
export function onWake(f: () => void) {
  addEventListener('online', f)
  document.addEventListener('visibilitychange', () => isVisible() && f())
}
