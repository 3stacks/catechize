import { db } from '../store/db.ts'
import { headers } from '../store/sync.ts'

// Daily review reminders by Web Push. The sender is the self-hosted server
// when there is one (/api/push), or else the Cloudflare Worker for the hosted
// app (VITE_PUSH_URL at build time). It stores only this device's push
// subscription, the reminder hour, the time zone and the next due time. The
// service worker (public/push-sw.js) counts what is due when a push arrives.
//
// The choice lives on this device only (localStorage), because each device has
// its own subscription.

const KEY = 'catechize.reminder'
const SAME_ORIGIN = import.meta.env.BASE_URL + 'api/push'
const HOSTED = (import.meta.env.VITE_PUSH_URL as string | undefined)?.replace(/\/+$/, '')

interface Saved {
  base: string
  hour: number
  /** The last values sent, so an unchanged schedule sends nothing. */
  sent?: { nextDue: number | null; tz: string }
}

const load = (): Saved | undefined => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? undefined
  } catch {
    return undefined
  }
}
const save = (s: Saved | undefined) => {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s))
    else localStorage.removeItem(KEY)
  } catch {
    // storage is blocked: reminders still work until the page closes
  }
}

export type PushSupport = { ok: true } | { ok: false; reason: 'browser' | 'install' | 'server' }

const isIos = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const standalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

/** The push API to use, with its public key: this server first, then the hosted Worker. */
async function sender(): Promise<{ base: string; key: string } | undefined> {
  for (const base of [SAME_ORIGIN, HOSTED]) {
    if (!base) continue
    try {
      const r = await fetch(`${base}/key`)
      if (!r.ok || !r.headers.get('content-type')?.includes('json')) continue
      const { publicKey } = (await r.json()) as { publicKey?: string }
      if (publicKey) return { base, key: publicKey }
    } catch {
      // not reachable: try the next one
    }
  }
  return undefined
}

export async function pushSupport(): Promise<PushSupport> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    // iPhone and iPad have Web Push only for apps added to the home screen.
    return { ok: false, reason: isIos() && !standalone() ? 'install' : 'browser' }
  }
  return (await sender()) ? { ok: true } : { ok: false, reason: 'server' }
}

export const reminderHour = (): number | undefined => load()?.hour

const toKey = (b64: string) => {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

async function subscription(key?: string) {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub || !key) return sub ?? undefined
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) })
}

const post = (base: string, path: string, body: unknown) =>
  fetch(base + path, { method: 'POST', headers: base === SAME_ORIGIN ? headers() : { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

const nextDue = async () => (await db.cards.orderBy('due').first())?.due ?? null

/** Turn reminders on at a local hour (0–23), or change the hour. Returns an error message on failure. */
export async function enableReminders(hour: number): Promise<string | undefined> {
  const s = await sender()
  if (!s) return 'Reminders are not available here.'
  if ((await Notification.requestPermission()) !== 'granted') return 'Notifications are blocked. Allow them in the browser settings, then try again.'
  try {
    const sub = await subscription(s.key)
    if (!sub) return 'Could not subscribe to notifications.'
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const due = await nextDue()
    const r = await post(s.base, '', { endpoint: sub.endpoint, hour, tz, nextDue: due })
    if (!r.ok) return `The reminder service said no (${r.status}).`
    save({ base: s.base, hour, sent: { nextDue: due, tz } })
  } catch (e) {
    return (e as Error).message
  }
}

export async function disableReminders() {
  const s = load()
  save(undefined)
  const sub = await subscription().catch(() => undefined)
  if (s && sub) await post(s.base, '/remove', { endpoint: sub.endpoint }).catch(() => undefined)
  await sub?.unsubscribe().catch(() => undefined)
}

let timer: ReturnType<typeof setTimeout> | undefined

/** Tell the sender when the next answer is due. Called after the schedule changes. */
export function scheduleChanged() {
  if (!load()) return
  clearTimeout(timer)
  timer = setTimeout(async () => {
    const s = load()
    if (!s || Notification.permission !== 'granted') return
    const due = await nextDue()
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (s.sent && s.sent.nextDue === due && s.sent.tz === tz) return
    const sub = await subscription().catch(() => undefined)
    if (!sub) return
    const r = await post(s.base, '', { endpoint: sub.endpoint, hour: s.hour, tz, nextDue: due }).catch(() => undefined)
    if (r?.ok) save({ ...s, sent: { nextDue: due, tz } })
  }, 3000)
}

/** Watch the schedule on this device: reviews here, and changes pulled from other devices. */
export function watchSchedule() {
  if (!('serviceWorker' in navigator)) return
  db.cards.hook('creating', () => scheduleChanged())
  db.cards.hook('updating', () => scheduleChanged())
  db.cards.hook('deleting', () => scheduleChanged())
  scheduleChanged()
}
