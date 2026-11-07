// Anonymous usage events for the hosted app, sent through the analytics loader
// in index.html (see functions/_lib/analytics.ts). On a self-hosted server and
// on a branch preview, the loader is off and this does nothing.

type Props = Record<string, string | number | boolean>

declare global {
  interface Window {
    /** Queues until /a/boot.js loads Umami. Absent where analytics is off or blocked. */
    plausible?: (event: string, options?: { props?: Props }) => void
  }
}

/** Send an event. Never send text that the learner typed, or anything from their data beyond counts and document ids. */
export function track(event: string, props?: Props) {
  try {
    window.plausible?.(event, props ? { props } : undefined)
  } catch {
    // analytics must never break the app
  }
}
