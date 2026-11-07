import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { createReadStream, readFileSync, statSync } from 'node:fs'
import { extname, join, resolve, sep } from 'node:path'
import { timingSafeEqual } from 'node:crypto'
import { MAX_PUSH, type Health, type SyncRequest } from '../shared/protocol.ts'
import { Store, invalidChanges } from './store.ts'
import { parseReminder, sendDueReminders, type VapidKeys } from '../shared/push.ts'

// Serves the built PWA from dist/ and the sync API from /api. One process,
// one SQLite file, no other dependencies.
//
//   PORT              default 3000
//   DATA_DIR          default ./data; the database is DATA_DIR/catechize.db
//   STATIC_DIR        default ./dist
//   CATECHIZE_TOKEN   optional; when set, /api/sync and /api/push need "Authorization: Bearer <token>"
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
//                     optional; turn on daily review reminders. `node server/vapid.ts` prints a pair.
//   VAPID_SUBJECT     contact for the push services, default mailto:admin@localhost

const PORT = Number(process.env.PORT ?? 3000)
const DATA_DIR = process.env.DATA_DIR ?? 'data'
const STATIC_DIR = resolve(process.env.STATIC_DIR ?? 'dist')
const TOKEN = process.env.CATECHIZE_TOKEN || ''
const MAX_BODY = 4_000_000
const VAPID: VapidKeys | undefined =
  process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
    ? { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY, subject: process.env.VAPID_SUBJECT || 'mailto:admin@localhost' }
    : undefined
const VERSION = (JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }).version

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
}

export function createApp(store: Store, opts: { token?: string; staticDir?: string; vapid?: VapidKeys } = {}) {
  const token = opts.token ?? TOKEN
  const root = opts.staticDir ?? STATIC_DIR
  const vapid = 'vapid' in opts ? opts.vapid : VAPID

  const authorised = (req: IncomingMessage) => {
    if (!token) return true
    const got = Buffer.from(req.headers.authorization ?? '')
    const want = Buffer.from(`Bearer ${token}`)
    return got.length === want.length && timingSafeEqual(got, want)
  }

  async function api(req: IncomingMessage, res: ServerResponse, path: string) {
    if (path === '/api/health' && req.method === 'GET') {
      const body: Health = { ok: true, auth: !!token, version: VERSION }
      return json(res, 200, body)
    }
    if (path === '/api/sync') {
      if (req.method !== 'POST') return json(res, 405, { error: 'POST only' })
      if (!authorised(req)) return json(res, 401, { error: 'unauthorised' })
      let body: SyncRequest
      try {
        body = JSON.parse(await readBody(req))
      } catch (e) {
        return json(res, (e as { status?: number }).status ?? 400, { error: (e as Error).message })
      }
      const bad = invalidChanges(body?.changes)
      if (bad) return json(res, 400, { error: bad })
      if (body.changes.length > MAX_PUSH) return json(res, 413, { error: `at most ${MAX_PUSH} changes per request` })
      const since = Number.isInteger(body.since) && body.since >= 0 ? body.since : 0
      const epoch = typeof body.epoch === 'string' ? body.epoch : undefined
      return json(res, 200, store.sync(since, body.changes, epoch))
    }
    if (path === '/api/push/key' && req.method === 'GET') {
      if (!vapid) return json(res, 404, { error: 'reminders are off on this server' })
      return json(res, 200, { publicKey: vapid.publicKey })
    }
    if (path === '/api/push' || path === '/api/push/remove') {
      if (!vapid) return json(res, 404, { error: 'reminders are off on this server' })
      if (req.method !== 'POST') return json(res, 405, { error: 'POST only' })
      if (!authorised(req)) return json(res, 401, { error: 'unauthorised' })
      let body: unknown
      try {
        body = JSON.parse(await readBody(req))
      } catch (e) {
        return json(res, (e as { status?: number }).status ?? 400, { error: (e as Error).message })
      }
      if (path === '/api/push/remove') {
        const endpoint = (body as { endpoint?: unknown } | null)?.endpoint
        if (typeof endpoint !== 'string') return json(res, 400, { error: 'endpoint required' })
        store.removeReminder(endpoint)
        return json(res, 200, { ok: true })
      }
      const r = parseReminder(body)
      if (typeof r === 'string') return json(res, 400, { error: r })
      store.putReminder(r)
      return json(res, 200, { ok: true })
    }
    return json(res, 404, { error: 'not found' })
  }

  function file(req: IncomingMessage, res: ServerResponse, path: string) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'GET only' })
    let rel = decodeURIComponent(path)
    if (rel.endsWith('/')) rel += 'index.html'
    const full = resolve(join(root, rel))
    if (full !== root && !full.startsWith(root + sep)) return json(res, 404, { error: 'not found' })
    let st
    try {
      st = statSync(full)
      if (!st.isFile()) throw new Error()
    } catch {
      return json(res, 404, { error: 'not found' })
    }
    const etag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`
    // Hashed build assets never change. Everything else (the shell, the
    // service worker, the data files) must revalidate so updates arrive.
    const cache = rel.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache'
    res.setHeader('Cache-Control', cache)
    res.setHeader('ETag', etag)
    res.setHeader('Content-Type', TYPES[extname(full)] ?? 'application/octet-stream')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    if (req.headers['if-none-match'] === etag) {
      res.statusCode = 304
      return res.end()
    }
    res.setHeader('Content-Length', st.size)
    if (req.method === 'HEAD') return res.end()
    createReadStream(full).pipe(res)
  }

  return createServer(async (req, res) => {
    try {
      const path = new URL(req.url ?? '/', 'http://x').pathname
      if (path.startsWith('/api/')) await api(req, res, path)
      else file(req, res, path)
    } catch (e) {
      console.error(e)
      if (!res.headersSent) json(res, 500, { error: 'internal error' })
      else res.end()
    }
  })
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((ok, fail) => {
    const parts: Buffer[] = []
    let size = 0
    req.on('data', (b: Buffer) => {
      size += b.length
      if (size > MAX_BODY) {
        fail(Object.assign(new Error('body too large'), { status: 413 }))
        req.destroy()
      } else parts.push(b)
    })
    req.on('end', () => ok(Buffer.concat(parts).toString('utf8')))
    req.on('error', fail)
  })
}

if (import.meta.main) {
  const store = new Store(join(DATA_DIR, 'catechize.db'))
  const server = createApp(store).listen(PORT, () => {
    console.log(`catechize ${VERSION} on :${PORT}, data in ${resolve(DATA_DIR)}${TOKEN ? ', token required' : ''}${VAPID ? ', reminders on' : ''}`)
  })
  // Check for due reminders every five minutes.
  const timer = VAPID
    ? setInterval(() => {
        sendDueReminders(store.reminders(), VAPID, (r, result) => {
          if (result === 'sent') store.markSent(r.endpoint, Date.now())
          if (result === 'gone') store.removeReminder(r.endpoint)
        }).catch((e) => console.error('reminders:', e))
      }, 5 * 60_000)
    : undefined
  const stop = () => {
    clearInterval(timer)
    server.close()
    store.close()
    process.exit(0)
  }
  process.on('SIGTERM', stop)
  process.on('SIGINT', stop)
}
