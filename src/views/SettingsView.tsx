import { useState } from 'react'
import { loadIndex } from '../data/load.ts'
import { db, getSettings, saveSettings, type Settings } from '../store/db.ts'
import { useAsync } from '../useAsync.ts'

export function SettingsView() {
  const [loaded, , reload] = useAsync(async () => ({ settings: await getSettings(), index: await loadIndex() }), [])
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
          <input type="checkbox" checked={s.lordsDayReviewOnly} onChange={(e) => set({ lordsDayReviewOnly: e.target.checked })} />
          <span>Reviews only on the Lord's Day (no new material on Sundays)</span>
        </label>
      </section>

      <section className="card">
        <h3>Your progress</h3>
        <p className="muted small">Progress is stored on this device only. Export a backup to move it to another device.</p>
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

const TABLES = ['cards', 'reviews', 'courses', 'learned', 'verses', 'settings'] as const

async function exportProgress() {
  const dump: Record<string, unknown[]> = {}
  for (const t of TABLES) dump[t] = await db.table(t).toArray()
  const blob = new Blob([JSON.stringify({ app: 'catechize', version: 1, at: new Date().toISOString(), ...dump })], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `catechize-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

async function importProgress(json: string) {
  const data = JSON.parse(json)
  if (data.app !== 'catechize') throw new Error('Not a Catechize backup')
  // Dates inside FSRS cards come back as strings; revive them.
  const revive = (c: { card: Record<string, unknown> }) => {
    for (const k of ['due', 'last_review']) if (typeof c.card[k] === 'string') c.card[k] = new Date(c.card[k] as string)
    return c
  }
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear()
      const rows = (data[t] ?? []) as { card: Record<string, unknown> }[]
      await db.table(t).bulkPut(t === 'cards' ? rows.map(revive) : rows)
    }
  })
}
