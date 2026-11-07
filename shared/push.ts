// Daily review reminders by Web Push, sent by the self-hosted server (server/).
//
// A push carries no payload. The service worker counts what is due from the
// device's own IndexedDB when the push arrives, so the sender stores only the
// push subscription, a reminder hour, a time zone and the next due time.
// With no payload there is nothing to encrypt: a push is an empty POST signed
// with a VAPID key (RFC 8292). Uses Web Crypto only, with no dependencies.

export interface Reminder {
  /** The push service URL from PushSubscription.endpoint. */
  endpoint: string
  /** Local hour to remind at, 0–23. */
  hour: number
  /** IANA time zone, for example "Australia/Brisbane". */
  tz: string
  /** Earliest due time on the device (ms epoch), or null when nothing is scheduled. */
  nextDue: number | null
}

export interface StoredReminder extends Reminder {
  /** When the last reminder went out (ms epoch). */
  lastSent: number | null
}

export interface VapidKeys {
  /** Uncompressed P-256 public key, base64url (65 bytes). Given to pushManager.subscribe. */
  publicKey: string
  /** P-256 private scalar d, base64url (32 bytes). Secret. */
  privateKey: string
  /** Contact for the push services: a mailto: or https: URL. */
  subject: string
}

// Push services of the main browsers. The sender only posts to these, so it
// cannot be used to send requests to other hosts.
const PUSH_HOSTS = [
  /(^|\.)googleapis\.com$/, // Chrome, Edge on Android, Samsung Internet
  /(^|\.)google\.com$/, // Chromium builds
  /(^|\.)mozilla\.com$/, // Firefox
  /(^|\.)push\.apple\.com$/, // Safari
  /(^|\.)notify\.windows\.com$/, // Edge on Windows
]

export function isPushEndpoint(s: unknown): s is string {
  if (typeof s !== 'string' || s.length > 1024) return false
  try {
    const u = new URL(s)
    return u.protocol === 'https:' && PUSH_HOSTS.some((h) => h.test(u.hostname))
  } catch {
    return false
  }
}

function validTz(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.length > 64) return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** The reminder in a request body, or an error message. */
export function parseReminder(body: unknown): Reminder | string {
  const b = body as Partial<Reminder> | null
  if (!b || typeof b !== 'object') return 'expected a JSON object'
  if (!isPushEndpoint(b.endpoint)) return 'endpoint: not a known push service'
  if (!Number.isInteger(b.hour) || b.hour! < 0 || b.hour! > 23) return 'hour: 0 to 23'
  if (!validTz(b.tz)) return 'tz: not a time zone'
  if (b.nextDue !== null && !(Number.isFinite(b.nextDue) && b.nextDue! > 0)) return 'nextDue: ms epoch or null'
  return { endpoint: b.endpoint, hour: b.hour!, tz: b.tz, nextDue: b.nextDue ?? null }
}

/** Hour and calendar day at `t` in time zone `tz`. */
function local(t: number, tz: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(t)
  const get = (k: string) => parts.find((p) => p.type === k)!.value
  return { hour: +get('hour'), day: `${get('year')}-${get('month')}-${get('day')}` }
}

/**
 * Send now? Yes when it is the reminder hour where the learner is, something is
 * due, and no reminder went out earlier the same local day.
 */
export function isReminderTime(r: StoredReminder, now: number): boolean {
  if (r.nextDue === null || r.nextDue > now) return false
  const here = local(now, r.tz)
  if (here.hour !== r.hour) return false
  return r.lastSent === null || local(r.lastSent, r.tz).day !== here.day
}

// ------------------------------------------------------------------ VAPID

const enc = new TextEncoder()

export function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/** A new key pair. Run `node server/vapid.ts` to print one. */
export async function generateVapidKeys(): Promise<Omit<VapidKeys, 'subject'>> {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair
  const jwk = (await crypto.subtle.exportKey('jwk', pair.privateKey)) as JsonWebKey
  const raw = (await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer
  return { publicKey: b64url(raw), privateKey: jwk.d! }
}

async function signingKey(keys: VapidKeys): Promise<CryptoKey> {
  const pub = fromB64url(keys.publicKey)
  if (pub.length !== 65 || pub[0] !== 4) throw new Error('VAPID public key: expected 65 bytes, uncompressed')
  const jwk: JsonWebKey = { kty: 'EC', crv: 'P-256', d: keys.privateKey, x: b64url(pub.slice(1, 33)), y: b64url(pub.slice(33)), ext: true }
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
}

/** The Authorization header for one push service (RFC 8292). */
export async function vapidAuth(endpoint: string, keys: VapidKeys, now = Date.now()): Promise<string> {
  const head = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = b64url(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: keys.subject })))
  // Web Crypto gives ECDSA signatures as r || s, which is the JWS format.
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await signingKey(keys), enc.encode(`${head}.${claims}`))
  return `vapid t=${head}.${claims}.${b64url(sig)}, k=${keys.publicKey}`
}

export type PushResult = 'sent' | 'gone' | 'failed'

/** Send one empty push. "gone" means the subscription has ended: delete it. */
export async function sendPush(endpoint: string, keys: VapidKeys): Promise<PushResult> {
  if (!isPushEndpoint(endpoint)) return 'gone'
  try {
    const r = await fetch(endpoint, {
      method: 'POST',
      // A reminder that cannot be delivered within four hours is stale.
      headers: { Authorization: await vapidAuth(endpoint, keys), TTL: String(4 * 3600), Urgency: 'normal', 'Content-Length': '0' },
    })
    if (r.status === 404 || r.status === 410) return 'gone'
    return r.ok ? 'sent' : 'failed'
  } catch {
    return 'failed'
  }
}

/** Send every reminder that is due. Calls `save` with each outcome. */
export async function sendDueReminders(all: StoredReminder[], keys: VapidKeys, save: (r: StoredReminder, result: PushResult) => void | Promise<void>, now = Date.now()): Promise<number> {
  let sent = 0
  for (const r of all) {
    if (!isReminderTime(r, now)) continue
    const result = await sendPush(r.endpoint, keys)
    if (result === 'sent') sent++
    await save(r, result)
  }
  return sent
}
