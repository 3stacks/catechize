import { useState } from 'react'
import { loadIndex } from '../data/load.ts'
import { db, getSettings, newId, saveSettings, type Settings } from '../store/db.ts'
import { getToken, reviveDates, setToken, syncNow, useDataVersion, useSyncState } from '../store/sync.ts'
import { SYNCED_TABLES } from '../../shared/protocol.ts'
import { useAsync } from '../useAsync.ts'

const KOFI = 'https://ko-fi.com/lukeboyle'

export function SettingsView() {
  const v = useDataVersion()
  const [loaded, , reload] = useAsync(async () => ({ settings: await getSettings(), index: await loadIndex() }), [v])
  const [msg, setMsg] = useState('')
  if (!loaded) return <p className="empty">Loading…</p>
  const { settings: s, index } = loaded
  const set = async (patch: Partial<Settings>) => {
    await saveSettings(patch)
    reload()
  }

  return (
    <div className="stack">
      <h1>Settings</h1>

      <section className="card">
        <h3>Tradition</h3>
        <div className="segmented">
          {(
            [
              ['reformed', 'Reformed'],
              ['lutheran', 'Lutheran'],
              ['both', 'Both'],
            ] as const
          ).map(([t, label]) => (
            <button key={t} className={s.tradition === t ? 'on' : ''} onClick={() => set({ tradition: t })}>
              {label}
            </button>
          ))}
        </div>
        <p className="muted small">Chooses the catechisms and confessions in your library. The creeds and Scripture are always there. Progress you have made elsewhere stays in your reviews.</p>
      </section>

      <section className="card">
        <h3>Typing</h3>
        <div className="segmented">
          <button className={s.inputMode === 'first-letter' ? 'on' : ''} onClick={() => set({ inputMode: 'first-letter' })}>
            First letters
          </button>
          <button className={s.inputMode === 'full-word' ? 'on' : ''} onClick={() => set({ inputMode: 'full-word' })}>
            Whole words
          </button>
        </div>
        <p className="muted small">
          First letters is fast and works well on a phone: type <code>m c e i t g G</code> for "Man's chief end is to glorify God". Whole words is stricter.
        </p>
      </section>

      <section className="card">
        <h3>Target recall</h3>
        <div className="segmented">
          {[0.85, 0.9, 0.95].map((r) => (
            <button key={r} className={s.retention === r ? 'on' : ''} onClick={() => set({ retention: r })}>
              {Math.round(r * 100)}%
            </button>
          ))}
        </div>
        <p className="muted small">Higher means more frequent reviews. 90% suits most people.</p>
      </section>

      <section className="card">
        <label className="row">
          <input type="checkbox" checked={s.fade} onChange={(e) => set({ fade: e.target.checked })} />
          <span>Fade stage when learning: type the text with half the words hidden before the full test</span>
        </label>
        <label className="row">
          <input type="checkbox" checked={s.lordsDayReviewOnly} onChange={(e) => set({ lordsDayReviewOnly: e.target.checked })} />
          <span>Reviews only on the Lord's Day (no new material on Sundays)</span>
        </label>
      </section>

      <section className="card">
        <h3>Daily review limit</h3>
        <div className="segmented">
          {[0, 20, 40, 80].map((n) => (
            <button key={n} className={s.dailyReviewLimit === n ? 'on' : ''} onClick={() => set({ dailyReviewLimit: n })}>
              {n === 0 ? 'None' : n}
            </button>
          ))}
        </div>
        <p className="muted small">The most answers to review in one day. After a break, a limit spreads the backlog over a few days. The most overdue come first.</p>
      </section>

      <SyncCard />

      <section className="card">
        <h3>Your progress</h3>
        <p className="muted small">Export a backup to keep a copy, or to move your progress to a device that does not sync.</p>
        <div className="row wrap">
          <button onClick={() => exportProgress().then(() => setMsg('Exported.'))}>Export backup</button>
          <label className="button ghost">
            Import backup
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                if (!confirm('Replace all progress on this device with the backup?')) return
                await importProgress(await f.text())
                setMsg('Imported.')
                reload()
              }}
            />
          </label>
          <span className="muted small">{msg}</span>
        </div>
      </section>

      <section className="card">
        <h3>Support Catechize</h3>
        <p className="muted small">Catechize is free, with no ads and no tracking. If it helps you, you can buy me a coffee.</p>
        <a className="button" href={KOFI} target="_blank" rel="noopener noreferrer">
          Support on Ko-fi
        </a>
      </section>

      <section>
        <h3>Sources</h3>
        <ul className="sources">
          {index.docs.map((d) => (
            <li key={d.id}>
              <strong>{d.title}</strong>: {d.source.url ? <a href={d.source.url}>{d.source.name}</a> : d.source.name} ({d.source.license}).
              {d.source.note ? ` ${d.source.note}` : ''}
            </li>
          ))}
          <li>
            <strong>Scripture</strong>: King James Version (1769), public domain, via scrollmapper/bible_databases.
          </li>
        </ul>
        <p className="muted small">Data built {new Date(index.builtAt).toLocaleString()}.</p>
      </section>
    </div>
  )
}

function SyncCard() {
  const sync = useSyncState()
  const [token, setTokenInput] = useState(getToken())
  if (sync.kind === 'off')
    return (
      <section className="card">
        <h3>Sync</h3>
        <p className="muted small">This copy of Catechize has no server, so your progress stays on this device. Run the Catechize server to sync between devices.</p>
      </section>
    )
  return (
    <section className="card">
      <h3>Sync</h3>
      {sync.kind === 'locked' ? (
        <>
          <p className="small">The server needs its access token before it syncs.</p>
          <form
            className="row wrap"
            onSubmit={(e) => {
              e.preventDefault()
              setToken(token.trim())
            }}
          >
            <input className="search grow" type="password" autoComplete="off" value={token} onChange={(e) => setTokenInput(e.target.value)} placeholder="Access token" aria-label="Access token" />
            <button className="primary">Save</button>
          </form>
        </>
      ) : (
        <div className="row wrap">
          <span className="small">
            {sync.kind === 'syncing'
              ? 'Syncing…'
              : sync.error
                ? `Sync failed: ${sync.error}. It tries again soon.`
                : sync.at
                  ? `Progress syncs to the server. Last sync ${new Date(sync.at).toLocaleTimeString()}.`
                  : 'Progress syncs to the server.'}
          </span>
          <span className="spacer" />
          <button className="ghost" disabled={sync.kind === 'syncing'} onClick={() => void syncNow()}>
            Sync now
          </button>
        </div>
      )}
    </section>
  )
}

const TABLES = SYNCED_TABLES

async function exportProgress() {
  const dump: Record<string, unknown[]> = {}
  for (const t of TABLES) dump[t] = (await db.table(t).toArray()).map(({ _dirty, ...r }) => r)
  const blob = new Blob([JSON.stringify({ app: 'catechize', version: 2, at: new Date().toISOString(), ...dump })], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `catechize-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

/**
 * Replace all progress with a backup. With sync on, the backup also replaces
 * the progress on the server and on other devices: the rows it does not have
 * are deleted everywhere.
 */
async function importProgress(json: string) {
  const data = JSON.parse(json)
  if (data.app !== 'catechize') throw new Error('Not a Catechize backup')
  // Version 1 kept the review log in "reviews", with number ids.
  if (data.version === 1 && Array.isArray(data.reviews)) data.log = data.reviews.map((r: Record<string, unknown>) => ({ ...r, id: newId() }))
  const now = Date.now()
  await db.transaction('rw', [...TABLES.map((t) => db.table(t)), db.tombstones], async () => {
    for (const t of TABLES) {
      const table = db.table(t)
      const keep = new Set<string>()
      const rows = ((data[t] ?? []) as Record<string, unknown>[]).map((r) => {
        const { _dirty, _u, ...row } = reviveDates(t, r)
        keep.add(String(row[table.schema.primKey.keyPath as string]))
        return row
      })
      const gone = ((await table.toCollection().primaryKeys()) as string[]).filter((k) => !keep.has(String(k)))
      await table.bulkDelete(gone)
      await db.tombstones.bulkPut(gone.map((id) => ({ key: `${t}:${id}`, tbl: t, id: String(id), u: now })))
      // Imported rows count as new changes, so they win over older copies elsewhere.
      await table.bulkPut(rows)
    }
  })
  void syncNow()
}
