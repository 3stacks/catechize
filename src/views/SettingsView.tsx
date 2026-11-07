import { track } from '../lib/track.ts'
import { useState } from 'react'
import { loadIndex } from '../data/load.ts'
import { db, getSettings, saveSettings, type Settings } from '../store/db.ts'
import { getToken, setToken, syncNow, useDataVersion, useSyncState } from '../store/sync.ts'
import { backupSummary, download, parseBackup, reviewsCsv, restore, takeout } from '../store/takeout.ts'
import { useAsync } from '../useAsync.ts'
import { disableReminders, enableReminders, pushSupport, reminderHour } from '../lib/push.ts'

const KOFI = 'https://ko-fi.com/lukeboyle'

export function SettingsView() {
  const v = useDataVersion()
  const [loaded, , reload] = useAsync(async () => ({ settings: await getSettings(), index: await loadIndex() }), [v])
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

      <ReminderCard />

      <SyncCard />

      <DataCard onImported={reload} />

      <section className="card">
        <h3>Support Hearers</h3>
        <p className="muted small">Hearers is free, with no ads. It counts visits without cookies, and your answers and progress stay on your device. If it helps you, you can buy me a coffee.</p>
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

const HOURS = Array.from({ length: 24 }, (_, h) => h)
const hourLabel = (h: number) =>
  new Date(2000, 0, 1, h).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

/** A daily notification when answers are due. Each device chooses for itself. */
function ReminderCard() {
  const [support] = useAsync(pushSupport, [])
  const [hour, setHour] = useState(reminderHour)
  const [pick, setPick] = useState(hour ?? 8)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const turnOn = async (h: number) => {
    setBusy(true)
    setError(undefined)
    const e = await enableReminders(h)
    setBusy(false)
    if (e) setError(e)
    else setHour(h)
  }

  // No server to send reminders (the hosted app, or a server without VAPID keys): show nothing.
  if (support && !support.ok && support.reason === 'server') return null

  return (
    <section className="card">
      <h3>Daily reminder</h3>
      {!support ? (
        <p className="muted small">Checking…</p>
      ) : !support.ok ? (
        <p className="muted small">
          {support.reason === 'install'
            ? 'On iPhone and iPad, add Hearers to the Home Screen first: tap Share, then Add to Home Screen. Then open it from there to turn on reminders.'
            : 'This browser cannot show reminders.'}
        </p>
      ) : (
        <>
          <div className="row wrap">
            <select
              value={pick}
              disabled={busy}
              onChange={(e) => {
                const h = +e.target.value
                setPick(h)
                if (hour !== undefined) void turnOn(h)
              }}
              aria-label="Reminder time"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
            {hour === undefined ? (
              <button className="primary" disabled={busy} onClick={() => turnOn(pick)}>
                Turn on
              </button>
            ) : (
              <button
                className="ghost"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  await disableReminders()
                  setBusy(false)
                  setHour(undefined)
                }}
              >
                Turn off
              </button>
            )}
          </div>
          <p className="muted small">
            {hour === undefined ? 'Get a notification on this device at this time when answers are due.' : `On. You get a notification at ${hourLabel(hour)} on days with answers to review.`} The
            reminder service stores only this device's notification address, the time, your time zone and when the next answer is due. Your answers and progress stay on the device.
          </p>
          {error && <p className="small reminder-error">{error}</p>}
        </>
      )}
    </section>
  )
}

function SyncCard() {
  const sync = useSyncState()
  const [token, setTokenInput] = useState(getToken())
  if (sync.kind === 'off')
    return (
      <section className="card">
        <h3>Sync</h3>
        <p className="muted small">This copy of Hearers has no server, so your progress stays on this device. Run the Hearers server to sync between devices.</p>
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

/** Data takeout: download everything, or the review history for a spreadsheet, and import a backup. */
function DataCard({ onImported }: { onImported: () => void }) {
  const [msg, setMsg] = useState<{ text: string; error?: boolean }>()
  const day = () => new Date().toISOString().slice(0, 10)

  return (
    <section className="card">
      <h3>Your data</h3>
      <p className="muted small">
        Your data is yours. Download all of it at any time: progress, review history, your verses, memory aids and settings. To move to another device, import the file there.
      </p>
      <div className="row wrap">
        <button
          onClick={async () => {
            download(`hearers-${day()}.json`, 'application/json', JSON.stringify(await takeout()))
            track('Data downloaded', { kind: 'json' })
            setMsg({ text: 'Downloaded.' })
          }}
        >
          Download all data
        </button>
        <button
          className="ghost"
          onClick={async () => {
            download(`hearers-reviews-${day()}.csv`, 'text/csv', reviewsCsv(await db.log.toArray()))
            track('Data downloaded', { kind: 'csv' })
            setMsg({ text: 'Downloaded.' })
          }}
        >
          Review history (CSV)
        </button>
        <label className="button ghost">
          Import data
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const input = e.currentTarget
              const f = input.files?.[0]
              input.value = '' // so the same file can be chosen again
              if (!f) return
              try {
                const backup = parseBackup(await f.text())
                const n = backupSummary(backup)
                const when = n.at ? ` from ${new Date(n.at).toLocaleDateString()}` : ''
                if (!confirm(`Replace all data on this device with the backup${when}? It has ${n.learned} answers learned, ${n.reviews} reviews and ${n.verses} verses.`)) return
                await restore(backup)
                track('Data imported')
                setMsg({ text: 'Imported.' })
                onImported()
              } catch (err) {
                setMsg({ text: (err as Error).message, error: true })
              }
            }}
          />
        </label>
      </div>
      {msg && <p className={msg.error ? 'small error-text' : 'muted small'}>{msg.text}</p>}
    </section>
  )
}
