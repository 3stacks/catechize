import { loadIndex } from '../data/load.ts'
import { href } from '../router.ts'
import { dayKey, loadStats, startOfDay } from '../store/stats.ts'
import { useDataVersion } from '../store/sync.ts'
import { useAsync } from '../useAsync.ts'

const WEEKS = 26

export function StatsView() {
  const v = useDataVersion()
  const [data] = useAsync(async () => ({ stats: await loadStats(), index: await loadIndex() }), [v])
  if (!data) return <p className="empty">Loading…</p>
  const { stats: s, index } = data
  const rate = s.retention.rate

  return (
    <div className="stack">
      <h1>Progress</h1>

      <section className="stat-tiles">
        <Tile value={s.streak.days} label="day streak" sub={s.streak.today ? 'Done today' : s.streak.days ? 'Review today to keep it' : `Longest: ${s.longest}`} />
        <Tile value={s.learned} label="answers learned" sub={`${s.whole} ready to recite whole`} />
        <Tile value={s.chunks ? `${Math.round((s.mature / s.chunks) * 100)}%` : '–'} label="parts mature" sub={`${s.mature} of ${s.chunks} parts at 21+ days`} />
        <Tile value={rate === undefined ? '–' : `${Math.round(rate * 100)}%`} label="recall, 30 days" sub={`${s.retention.pass} of ${s.retention.total} reviews`} />
      </section>

      <section className="card">
        <h3>Activity</h3>
        <Heatmap days={s.days} />
        <p className="muted small">
          {s.reviews} reviews in total. Longest streak: {s.longest} {s.longest === 1 ? 'day' : 'days'}.
        </p>
      </section>

      <section className="card">
        <h3>Coming up</h3>
        <Forecast counts={s.forecast} />
        <p className="muted small">Answers due on each of the next 14 days, today in bold. Today includes anything overdue.</p>
      </section>

      {s.leeches > 0 && (
        <section className="card">
          <h3>Trouble spots</h3>
          <p>
            {s.leeches} {s.leeches === 1 ? 'part keeps' : 'parts keep'} slipping.{' '}
            <a href={href('trouble')}>Drill them</a>, or add a memory aid to the answer.
          </p>
        </section>
      )}

      {s.byDoc.size > 0 && (
        <section className="card">
          <h3>By document</h3>
          <table className="doc-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Learned</th>
                <th>Mature parts</th>
              </tr>
            </thead>
            <tbody>
              {[...s.byDoc].map(([docId, d]) => {
                const doc = index.docs.find((x) => x.id === docId)
                return (
                  <tr key={docId}>
                    <td>
                      <a href={href('doc', docId)}>{doc?.title ?? (docId === 'verses' ? 'My verses' : docId)}</a>
                    </td>
                    <td>
                      {d.learned}
                      {doc ? ` / ${doc.unitCount}` : ''}
                    </td>
                    <td>
                      {d.mature} / {d.chunks}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}

function Tile({ value, label, sub }: { value: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="stat-tile">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      <div className="muted small">{sub}</div>
    </div>
  )
}

/** Reviews per day for the last 26 weeks, one column per week, Sunday at the top. */
function Heatmap({ days }: { days: Map<string, number> }) {
  const today = startOfDay()
  const end = new Date(today)
  end.setDate(end.getDate() + (6 - end.getDay())) // the Saturday of this week
  const cells: { key: string; n: number; future: boolean; date: Date }[] = []
  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    const key = dayKey(d.getTime())
    cells.push({ key, n: days.get(key) ?? 0, future: d.getTime() > today, date: d })
  }
  const max = Math.max(1, ...cells.map((c) => c.n))
  // Four steps of one hue, light to dark; empty days are the surface tint.
  const level = (n: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)))
  return (
    <div className="heatmap" role="img" aria-label={`Reviews per day over the last ${WEEKS} weeks`}>
      {cells.map((c) => (
        <span
          key={c.key}
          className={c.future ? 'hm future' : `hm l${level(c.n)}`}
          title={c.future ? undefined : `${c.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}: ${c.n} ${c.n === 1 ? 'review' : 'reviews'}`}
        />
      ))}
    </div>
  )
}

function Forecast({ counts }: { counts: number[] }) {
  const max = Math.max(1, ...counts)
  const label = (i: number) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toLocaleDateString(undefined, { weekday: 'narrow' })
  }
  return (
    <div className="forecast" role="img" aria-label={`Answers due: ${counts.map((n, i) => `${i === 0 ? 'today' : `day ${i}`} ${n}`).join(', ')}`}>
      {counts.map((n, i) => (
        <div key={i} className="fc-col" title={`${i === 0 ? 'Today' : `In ${i} ${i === 1 ? 'day' : 'days'}`}: ${n} due`}>
          <span className="fc-n">{n || ''}</span>
          <span className="fc-bar" style={{ height: `${(n / max) * 100}%` }} />
          <span className={i === 0 ? 'fc-day today' : 'fc-day'}>{label(i)}</span>
        </div>
      ))}
    </div>
  )
}
