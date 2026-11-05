import type { DocKind } from '../data/types.ts'
import { loadIndex } from '../data/load.ts'
import { href } from '../router.ts'
import { db, getSettings, inTradition } from '../store/db.ts'
import { useAsync } from '../useAsync.ts'

const SECTIONS: [DocKind, string][] = [
  ['catechism', 'Catechisms'],
  ['confession', 'Confessions'],
  ['creed', 'Creeds'],
  ['law', 'The Law'],
]

export function Library() {
  const [data] = useAsync(async () => ({ index: await loadIndex(), verses: await db.verses.count(), settings: await getSettings() }), [])
  if (!data) return <p className="empty">Loading…</p>
  const { verses, settings } = data
  const t = settings.tradition
  const docs = data.index.docs.filter((d) => inTradition(d.tradition, t))
  const harmonies = data.index.harmonies.filter((h) => inTradition(h.tradition, t))
  return (
    <div className="stack">
      {t && t !== 'both' && (
        <p className="muted small">
          Showing {t === 'reformed' ? 'Reformed' : 'Lutheran'} confessions, with the creeds and Scripture. <a href={href('settings')}>Change</a>
        </p>
      )}
      {SECTIONS.filter(([kind]) => docs.some((d) => d.kind === kind)).map(([kind, title]) => (
        <section key={kind}>
          <h2>{title}</h2>
          <div className="list">
            {docs
              .filter((d) => d.kind === kind)
              .map((d) => (
                <a key={d.id} className="list-item" href={href('doc', d.id)}>
                  <span className="badge">{d.short}</span>
                  <span className="grow">
                    <strong>{d.title}</strong>
                    <span className="muted small">
                      {d.year ? `${d.year} · ` : ''}
                      {d.unitCount} {unitWord(kind, d.unitCount)}
                    </span>
                  </span>
                </a>
              ))}
          </div>
        </section>
      ))}
      <section>
        <h2>Scripture</h2>
        <div className="list">
          <a className="list-item" href={href('doc', 'verses')}>
            <span className="badge">KJV</span>
            <span className="grow">
              <strong>My verses</strong>
              <span className="muted small">{verses} added</span>
            </span>
          </a>
        </div>
      </section>
      <section>
        <h2>Harmonies</h2>
        <div className="list">
          {harmonies.map((h) => (
            <a key={h.id} className="list-item" href={href('harmony', h.id)}>
              <span className="badge">≡</span>
              <span className="grow">
                <strong>{h.title}</strong>
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}

function unitWord(kind: DocKind, n: number) {
  const w = kind === 'catechism' ? 'question' : kind === 'confession' ? 'section' : kind === 'law' ? 'text' : 'part'
  return n === 1 ? w : w + 's'
}
