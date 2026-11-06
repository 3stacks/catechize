import { parseReminder, sendDueReminders, type StoredReminder, type VapidKeys } from '../../shared/push.ts'

// Daily review reminders for the hosted app (catechize.pages.dev), which has
// no server of its own. Same API as the self-hosted server (server/main.ts):
//   GET  /api/push/key      the VAPID public key
//   POST /api/push          { endpoint, hour, tz, nextDue }
//   POST /api/push/remove   { endpoint }
// A cron trigger sends the reminders that are due. The database holds only
// the subscription endpoint, the hour, the time zone and the next due time.

interface Env {
  DB: D1Database
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
  VAPID_SUBJECT: string
  /** Comma-separated origins that may call the API, for example https://catechize.pages.dev */
  ALLOWED_ORIGINS: string
}

const keys = (env: Env): VapidKeys => ({ publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT })

function allowedOrigin(req: Request, env: Env): string | undefined {
  const origin = req.headers.get('Origin') ?? ''
  const list = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  // Branch previews of the Pages project: https://<branch>.catechize.pages.dev
  const ok = list.some((o) => o === origin || (o.startsWith('https://') && origin.endsWith('.' + o.slice(8))))
  return ok ? origin : undefined
}

function json(body: unknown, status: number, origin?: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    },
  })
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const path = new URL(req.url).pathname.replace(/\/+$/, '')
    const origin = allowedOrigin(req, env)
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: origin ? 204 : 403,
        headers: origin
          ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' }
          : {},
      })
    }
    if (path === '/api/push/key' && req.method === 'GET') return json({ publicKey: env.VAPID_PUBLIC_KEY }, 200, origin)
    if (path !== '/api/push' && path !== '/api/push/remove') return json({ error: 'not found' }, 404, origin)
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405, origin)
    if (!origin) return json({ error: 'origin not allowed' }, 403)
    const text = await req.text()
    if (text.length > 4096) return json({ error: 'body too large' }, 413, origin)
    let body: unknown
    try {
      body = JSON.parse(text)
    } catch {
      return json({ error: 'expected JSON' }, 400, origin)
    }
    if (path === '/api/push/remove') {
      const endpoint = (body as { endpoint?: unknown } | null)?.endpoint
      if (typeof endpoint !== 'string') return json({ error: 'endpoint required' }, 400, origin)
      await env.DB.prepare('DELETE FROM reminders WHERE endpoint = ?').bind(endpoint).run()
      return json({ ok: true }, 200, origin)
    }
    const r = parseReminder(body)
    if (typeof r === 'string') return json({ error: r }, 400, origin)
    await env.DB.prepare(
      `INSERT INTO reminders (endpoint, hour, tz, next_due) VALUES (?, ?, ?, ?)
       ON CONFLICT (endpoint) DO UPDATE SET hour = excluded.hour, tz = excluded.tz, next_due = excluded.next_due`,
    )
      .bind(r.endpoint, r.hour, r.tz, r.nextDue)
      .run()
    return json({ ok: true }, 200, origin)
  },

  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    const now = Date.now()
    // Only rows with something due and nothing sent in the last 20 hours can be due now.
    const { results } = await env.DB.prepare('SELECT endpoint, hour, tz, next_due, last_sent FROM reminders WHERE next_due <= ? AND (last_sent IS NULL OR last_sent < ?)')
      .bind(now, now - 20 * 3600_000)
      .all<{ endpoint: string; hour: number; tz: string; next_due: number; last_sent: number | null }>()
    const due: StoredReminder[] = results.map((r) => ({ endpoint: r.endpoint, hour: r.hour, tz: r.tz, nextDue: r.next_due, lastSent: r.last_sent }))
    const sent = await sendDueReminders(due, keys(env), async (r, result) => {
      if (result === 'sent') await env.DB.prepare('UPDATE reminders SET last_sent = ? WHERE endpoint = ?').bind(now, r.endpoint).run()
      if (result === 'gone') await env.DB.prepare('DELETE FROM reminders WHERE endpoint = ?').bind(r.endpoint).run()
    })
    console.log(`reminders: ${due.length} candidates, ${sent} sent`)
  },
}
