// Site analytics: a same-origin proxy in front of Umami, as on lector.dev.
//
// The page loads /a/boot.js. When analytics is on for this host, boot.js loads
// the Umami tracker from /a/script.js, and the tracker sends its events to
// /a/api/send. This function forwards both to Umami. The Umami address
// (ANALYTICS_FORWARDING_URL) never reaches the browser.
//
// Analytics is on only when both settings are present and the host is the
// production site (or a host in ANALYTICS_HOSTS). Branch previews, localhost
// and self-hosted servers get an empty boot.js.
//
// Keep this file under functions/_lib. It has no onRequest export, so Pages
// does not route it.

const MAX_BODY = 10_000
const MAX_SCRIPT = 1_000_000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const OFF = '/* analytics off */\n'

/** The production host. Add a custom domain with ANALYTICS_HOSTS. */
const PRODUCTION = ['catechize.pages.dev']

export interface AnalyticsEnv {
  /** The Umami origin, for example https://umami.example.com. Empty: analytics off. */
  ANALYTICS_FORWARDING_URL?: string
  /** The Umami website UUID for Catechize. */
  ANALYTICS_WEBSITE_ID?: string
  /** More hosts to count, comma-separated: for example "catechize.org,www.catechize.org". */
  ANALYTICS_HOSTS?: string
}

export function forwardingOrigin(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (url.username || url.password) return null
  return url.origin
}

function bareHost(hostname: string | null | undefined): string | null {
  const host = hostname?.trim().toLowerCase().replace(/:\d+$/, '')
  return host || null
}

/** Is this a host that analytics counts? */
export function countedHost(hostname: string | null | undefined, env: AnalyticsEnv): boolean {
  const host = bareHost(hostname)
  if (!host) return false
  const extra = (env.ANALYTICS_HOSTS ?? '')
    .split(',')
    .map((h) => bareHost(h))
    .filter(Boolean)
  return [...PRODUCTION, ...extra].includes(host)
}

export function websiteId(raw: string | undefined | null): string | null {
  const value = raw?.trim().toLowerCase()
  return value && UUID_RE.test(value) ? value : null
}

const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID_RE.test(value)

/** The host of the request, if analytics counts it. The URL wins. The Host header covers a local proxy. */
export function acceptedHost(request: Request, env: AnalyticsEnv): string | null {
  let fromUrl: string | null = null
  try {
    fromUrl = bareHost(new URL(request.url).hostname)
  } catch {
    fromUrl = null
  }
  if (countedHost(fromUrl, env)) return fromUrl
  const fromHeader = bareHost(request.headers.get('host'))
  return countedHost(fromHeader, env) ? fromHeader : null
}

export function clientIp(headers: Headers): string | null {
  const cf = headers.get('cf-connecting-ip')?.trim()
  if (cf) return cf
  const real = headers.get('x-real-ip')?.split(',')[0]?.trim()
  if (real) return real
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
}

type Stamp = { ok: true; body: string } | { ok: false; status: number }

/** Put our website id on an event. Refuse an event for another Umami website. */
export function stampCollectBody(raw: string, website: string): Stamp {
  if (raw.length > MAX_BODY) return { ok: false, status: 413 }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, status: 400 }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, status: 400 }
  const payload = (parsed as { payload?: unknown }).payload
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { ok: false, status: 400 }
  const record = payload as { website?: unknown }
  if (isUuid(record.website) && record.website.toLowerCase() !== website) return { ok: false, status: 400 }
  record.website = website
  return { ok: true, body: JSON.stringify(parsed) }
}

/**
 * Load the tracker with the website id set before src, because a cached
 * script can run as soon as src is set. Then send the queued events, and send
 * each later `plausible(name, { props })` call to umami.track.
 */
export function bootSource(id: string): string {
  return (
    `(function(){var id=${JSON.stringify(id)};` +
    `var el=document.createElement("script");el.async=true;` +
    `el.setAttribute("data-website-id",id);` +
    `el.addEventListener("load",function(){` +
    `var queued=(window.plausible&&window.plausible.q)||[];` +
    `window.plausible=function(){var options=arguments[1];var data=options&&options.props;` +
    `if(window.umami&&typeof window.umami.track==="function")window.umami.track(arguments[0],data);};` +
    `for(var i=0;i<queued.length;i++)window.plausible(queued[i][0],queued[i][1]);});` +
    `el.src="/a/script.js";document.head.appendChild(el);})();\n`
  )
}

const scriptResponse = (body: string, cache: string) =>
  new Response(body, { status: 200, headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': cache } })

function plain(status: number): Response {
  const message = status === 404 ? 'not found' : status === 413 ? 'too large' : status === 400 ? 'bad request' : 'bad gateway'
  return new Response(message, { status, headers: { 'cache-control': 'no-store' } })
}

// Workers accept "follow" or "manual". The proxy does not follow a redirect.
async function fetchUpstream(url: string, init: RequestInit = {}): Promise<Response> {
  const upstream = await fetch(url, { ...init, redirect: 'manual' })
  if (upstream.status >= 300 && upstream.status < 400) throw new Error('redirect')
  return upstream
}

async function proxyScript(origin: string): Promise<Response> {
  let upstream: Response
  try {
    upstream = await fetchUpstream(`${origin}/script.js`)
  } catch {
    return plain(502)
  }
  if (!upstream.ok) return plain(502)
  const body = await upstream.text()
  if (body.length > MAX_SCRIPT) return plain(502)
  return scriptResponse(body, 'public, max-age=3600')
}

async function proxySend(request: Request, origin: string, website: string, host: string): Promise<Response> {
  const declared = Number(request.headers.get('content-length') || '0')
  if (Number.isFinite(declared) && declared > MAX_BODY) return plain(413)
  const stamped = stampCollectBody(await request.text(), website)
  if (!stamped.ok) return plain(stamped.status)

  const headers = new Headers({ 'content-type': 'application/json', 'x-forwarded-host': host })
  const userAgent = request.headers.get('user-agent')
  if (userAgent) headers.set('user-agent', userAgent)
  const cache = request.headers.get('x-umami-cache')
  if (cache) headers.set('x-umami-cache', cache)
  const ip = clientIp(request.headers)
  if (ip) headers.set('x-real-ip', ip)

  let upstream: Response
  try {
    upstream = await fetchUpstream(`${origin}/api/send`, { method: 'POST', headers, body: stamped.body })
  } catch {
    return plain(502)
  }
  const out = new Headers({ 'cache-control': 'no-store' })
  const type = upstream.headers.get('content-type')
  if (type) out.set('content-type', type)
  const outCache = upstream.headers.get('x-umami-cache')
  if (outCache) out.set('x-umami-cache', outCache)
  return new Response(upstream.body, { status: upstream.status, headers: out })
}

export async function handleAnalytics(request: Request, env: AnalyticsEnv): Promise<Response> {
  const path = new URL(request.url).pathname
  const host = acceptedHost(request, env)
  const origin = forwardingOrigin(env.ANALYTICS_FORWARDING_URL)
  const website = websiteId(env.ANALYTICS_WEBSITE_ID)

  if (request.method === 'GET' && path === '/a/boot.js') return scriptResponse(host && origin && website ? bootSource(website) : OFF, 'no-store')
  if (!host || !origin || !website) return plain(404)
  if (request.method === 'GET' && path === '/a/script.js') return proxyScript(origin)
  if (request.method === 'POST' && path === '/a/api/send') return proxySend(request, origin, website, host)
  return plain(404)
}
