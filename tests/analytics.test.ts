import { afterEach, describe, expect, it, vi } from 'vitest'
import { bootSource, countedHost, forwardingOrigin, handleAnalytics, stampCollectBody, websiteId } from '../functions/_lib/analytics.ts'

const WEBSITE = 'b59e9c65-ae32-47f1-8400-119fcf4861c4'
const OTHER = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const ENV = { ANALYTICS_FORWARDING_URL: 'https://umami.example/ignored', ANALYTICS_WEBSITE_ID: WEBSITE.toUpperCase() }
const req = (url: string, init?: RequestInit) => new Request(url, init)

afterEach(() => vi.unstubAllGlobals())

describe('settings', () => {
  it('reads the Umami origin and the website id', () => {
    expect(forwardingOrigin(' https://umami.example/script.js?x=1 ')).toBe('https://umami.example')
    expect(forwardingOrigin('https://user:pass@umami.example')).toBeNull()
    expect(forwardingOrigin('ftp://umami.example')).toBeNull()
    expect(websiteId('catechize.pages.dev')).toBeNull()
    expect(websiteId(WEBSITE.toUpperCase())).toBe(WEBSITE)
  })

  it('counts production and the extra hosts only', () => {
    expect(countedHost('catechize.pages.dev', {})).toBe(true)
    expect(countedHost('hearers.app', {})).toBe(true)
    expect(countedHost('www.hearers.app', {})).toBe(true)
    expect(countedHost('feat-x.catechize.pages.dev', {})).toBe(false)
    expect(countedHost('localhost', {})).toBe(false)
    expect(countedHost('catechize.org', {})).toBe(false)
    expect(countedHost('www.catechize.org', { ANALYTICS_HOSTS: 'catechize.org, WWW.catechize.org' })).toBe(true)
  })
})

describe('stampCollectBody', () => {
  it('puts our id on an event, and refuses an event for another website', () => {
    const ok = stampCollectBody(JSON.stringify({ type: 'event', payload: { website: 'catechize.pages.dev', url: '/' } }), WEBSITE)
    expect(ok.ok && JSON.parse(ok.body).payload.website).toBe(WEBSITE)
    expect(stampCollectBody(JSON.stringify({ payload: { website: OTHER } }), WEBSITE)).toEqual({ ok: false, status: 400 })
    expect(stampCollectBody('not json', WEBSITE)).toEqual({ ok: false, status: 400 })
    expect(stampCollectBody('x'.repeat(10_001), WEBSITE)).toEqual({ ok: false, status: 413 })
  })
})

describe('handleAnalytics', () => {
  it('gives an empty boot.js on a preview, and the loader on production', async () => {
    const preview = await handleAnalytics(req('https://feat-x.catechize.pages.dev/a/boot.js'), ENV)
    expect(await preview.text()).toBe('/* analytics off */\n')
    const off = await handleAnalytics(req('https://catechize.pages.dev/a/boot.js'), {})
    expect(await off.text()).toBe('/* analytics off: ANALYTICS_FORWARDING_URL is empty; ANALYTICS_WEBSITE_ID is empty */\n')
    const bad = await handleAnalytics(req('https://hearers.app/a/boot.js'), { ANALYTICS_FORWARDING_URL: 'umami.example', ANALYTICS_WEBSITE_ID: '"' + WEBSITE + '"' })
    const text = await bad.text()
    expect(text).toBe('/* analytics off: ANALYTICS_FORWARDING_URL is not an http(s) URL; ANALYTICS_WEBSITE_ID is not a UUID */\n')
    expect(text).not.toContain(WEBSITE)
    const on = await handleAnalytics(req('https://catechize.pages.dev/a/boot.js'), ENV)
    expect(await on.text()).toBe(bootSource(WEBSITE))
    expect(on.headers.get('cache-control')).toBe('no-store')
  })

  it('forwards an event to Umami with the visitor IP, and never follows a redirect', async () => {
    const fetch = vi.fn(async () => new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetch)
    const r = await handleAnalytics(
      req('https://catechize.pages.dev/a/api/send', { method: 'POST', body: JSON.stringify({ type: 'event', payload: { url: '/' } }), headers: { 'cf-connecting-ip': '203.0.113.9' } }),
      ENV,
    )
    expect(r.status).toBe(200)
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://umami.example/api/send')
    expect(init.redirect).toBe('manual')
    expect(new Headers(init.headers).get('x-real-ip')).toBe('203.0.113.9')
    expect(JSON.parse(init.body as string).payload.website).toBe(WEBSITE)
  })

  it('refuses the proxy on a host it does not count', async () => {
    vi.stubGlobal('fetch', vi.fn())
    expect((await handleAnalytics(req('https://evil.example/a/script.js'), ENV)).status).toBe(404)
  })
})

describe('the loader', () => {
  it('is the same in the app (index.html) as on the website', async () => {
    const { readFileSync } = await import('node:fs')
    const { ANALYTICS_LOADER } = await import('../shared/analytics-loader.ts')
    expect(readFileSync(new URL('../index.html', import.meta.url), 'utf8')).toContain(ANALYTICS_LOADER)
  })
})
