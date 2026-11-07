import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AddressInfo } from 'node:net'
import { createApp } from './main.ts'
import { Store } from './store.ts'
import { generateVapidKeys } from '../shared/push.ts'

describe('/api/push', () => {
  const store = new Store(':memory:')
  let base = ''
  let publicKey = ''
  beforeAll(async () => {
    const keys = await generateVapidKeys()
    publicKey = keys.publicKey
    const app = createApp(store, { token: 't', staticDir: '/nonexistent', vapid: { ...keys, subject: 'mailto:a@b.c' } })
    await new Promise<void>((ok) => app.listen(0, '127.0.0.1', ok))
    base = `http://127.0.0.1:${(app.address() as AddressInfo).port}/api/push`
    afterAll(() => app.close())
  })
  const post = (path: string, body: unknown, auth = true) => fetch(base + path, { method: 'POST', headers: auth ? { Authorization: 'Bearer t' } : {}, body: JSON.stringify(body) })
  const r = { endpoint: 'https://fcm.googleapis.com/fcm/send/x', hour: 8, tz: 'UTC', nextDue: null }

  it('gives the public key', async () => {
    expect(await (await fetch(base + '/key')).json()).toEqual({ publicKey })
  })
  it('stores and removes a reminder, with the token', async () => {
    expect((await post('', r, false)).status).toBe(401)
    expect((await post('', { ...r, hour: 30 })).status).toBe(400)
    expect((await post('', r)).status).toBe(200)
    expect(store.reminders()).toHaveLength(1)
    expect((await post('/remove', { endpoint: r.endpoint })).status).toBe(200)
    expect(store.reminders()).toHaveLength(0)
  })
  it('is off without keys', async () => {
    const app = createApp(new Store(':memory:'), { staticDir: '/nonexistent', vapid: undefined })
    await new Promise<void>((ok) => app.listen(0, '127.0.0.1', ok))
    const res = await fetch(`http://127.0.0.1:${(app.address() as AddressInfo).port}/api/push/key`)
    app.close()
    expect(res.status).toBe(404)
  })
})
