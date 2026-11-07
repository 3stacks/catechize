import { describe, expect, it } from 'vitest'
import { b64url, fromB64url, generateVapidKeys, isPushEndpoint, isReminderTime, parseReminder, vapidAuth, type StoredReminder } from './push.ts'

const FCM = 'https://fcm.googleapis.com/fcm/send/abc'
// 2026-11-06 08:15 in Brisbane (UTC+10, no daylight saving)
const AT_8 = Date.UTC(2026, 10, 5, 22, 15)
const rem = (o: Partial<StoredReminder> = {}): StoredReminder => ({ endpoint: FCM, hour: 8, tz: 'Australia/Brisbane', nextDue: AT_8 - 1000, lastSent: null, ...o })

describe('isReminderTime', () => {
  it('sends at the local hour when something is due', () => {
    expect(isReminderTime(rem(), AT_8)).toBe(true)
  })
  it('waits for the local hour', () => {
    expect(isReminderTime(rem({ hour: 9 }), AT_8)).toBe(false)
    expect(isReminderTime(rem({ tz: 'UTC' }), AT_8)).toBe(false)
  })
  it('sends nothing when nothing is due', () => {
    expect(isReminderTime(rem({ nextDue: null }), AT_8)).toBe(false)
    expect(isReminderTime(rem({ nextDue: AT_8 + 60_000 }), AT_8)).toBe(false)
  })
  it('sends once a local day', () => {
    expect(isReminderTime(rem({ lastSent: AT_8 - 10 * 60_000 }), AT_8)).toBe(false)
    expect(isReminderTime(rem({ lastSent: AT_8 - 24 * 3600_000 }), AT_8)).toBe(true)
  })
})

describe('parseReminder', () => {
  it('accepts a valid body', () => {
    expect(parseReminder({ endpoint: FCM, hour: 7, tz: 'Europe/London', nextDue: null })).toEqual({ endpoint: FCM, hour: 7, tz: 'Europe/London', nextDue: null })
  })
  it('refuses other hosts, bad hours and bad zones', () => {
    expect(parseReminder({ endpoint: 'https://example.com/x', hour: 7, tz: 'UTC', nextDue: null })).toMatch(/endpoint/)
    expect(parseReminder({ endpoint: FCM, hour: 24, tz: 'UTC', nextDue: null })).toMatch(/hour/)
    expect(parseReminder({ endpoint: FCM, hour: 7, tz: 'Mars/Base', nextDue: null })).toMatch(/tz/)
  })
  it('knows the main push services', () => {
    expect(isPushEndpoint('https://web.push.apple.com/abc')).toBe(true)
    expect(isPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x')).toBe(true)
    expect(isPushEndpoint('https://jmt17.google.com/fcm/send/x')).toBe(true)
    expect(isPushEndpoint('https://google.com.evil.example/x')).toBe(false)
    expect(isPushEndpoint('http://fcm.googleapis.com/x')).toBe(false)
  })
})

describe('vapidAuth', () => {
  it('signs a JWT that the public key verifies', async () => {
    const keys = { ...(await generateVapidKeys()), subject: 'mailto:a@b.c' }
    const auth = await vapidAuth(FCM, keys, AT_8)
    const [, t, k] = auth.match(/^vapid t=([^,]+), k=(.+)$/)!
    expect(k).toBe(keys.publicKey)
    const [h, c, sig] = t.split('.')
    const claims = JSON.parse(new TextDecoder().decode(fromB64url(c)))
    expect(claims).toMatchObject({ aud: 'https://fcm.googleapis.com', sub: 'mailto:a@b.c' })
    const pub = await crypto.subtle.importKey('raw', fromB64url(keys.publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, fromB64url(sig), new TextEncoder().encode(`${h}.${c}`))
    expect(ok).toBe(true)
  })
  it('round-trips base64url', () => {
    const b = new Uint8Array([0, 251, 255, 62, 63])
    expect(fromB64url(b64url(b))).toEqual(b)
  })
})
