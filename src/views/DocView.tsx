import { useState } from 'react'
import { loadDoc } from '../data/load.ts'
import { href } from '../router.ts'
import { db, removeRows } from '../store/db.ts'
import { useDataVersion } from '../store/sync.ts'
import { unitProgress, type UnitProgress } from '../store/srs.ts'
import { useAsync } from '../useAsync.ts'
import { AddVerses } from './AddVerses.tsx'

const HARMONY_FOR: Record<string, { id: string; label: string }> = {
  apostles: { id: 'creeds', label: "Compare with the Nicene Creed, with proof texts and hymns" },
  nicene: { id: 'creeds', label: "Compare with the Apostles' Creed, with proof texts and hymns" },
  decalogue: { id: 'decalogue', label: 'See each commandment in the WSC, WLC and Heidelberg' },
}

export function DocView({ docId }: { docId: string }) {
  const v = useDataVersion()
  const [data, , reload] = useAsync(async () => {
    const doc = await loadDoc(docId)
    const progress = await unitProgress(doc.units.map((u) => u.id))
    const course = await db.courses.get(docId)
    return { doc, progress, course }
  }, [docId, v])
  const [filter, setFilter] = useState('')

  if (!data) return <p className="empty">Loading…</p>
  const { doc, progress, course } = data
  const units = new Map(doc.units.map((u) => [u.id, u]))
  const learned = [...progress.values()].filter((p) => p.learned).length
  const q = filter.trim().toLowerCase()
  const harmony = HARMONY_FOR[docId]

  const startCourse = async (perDay: number) => {
    if (perDay <= 0) await db.transaction('rw', db.courses, db.tombstones, () => removeRows('courses', [docId]))
    else await db.courses.put({ docId, perDay, startedAt: course?.startedAt ?? Date.now() })
    reload()
  }

  return (
    <div className="stack">
      <section>
        <h1>{doc.title}</h1>
        <p className="muted small">
          {doc.year ? `${doc.year} · ` : ''}
          {learned}/{doc.units.length} learned
          {doc.source.note ? ` · ${doc.source.note}` : ''}
        </p>
        {harmony && (
          <a className="button ghost" href={href('harmony', harmony.id)}>
            {harmony.label}
          </a>
        )}
      </section>

      {docId !== 'verses' && (
        <section className="card">
          <div className="row wrap">
            <span>{course ? 'New units per day' : 'Memorise this in order'}</span>
            <span className="spacer" />
            <div className="segmented">
              {(course ? [0, 1, 2, 3, 5] : [1, 2, 3]).map((n) => (
                <button key={n} className={course?.perDay === n ? 'on' : ''} onClick={() => startCourse(n)}>
                  {n === 0 ? 'Stop' : `${n}/day`}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {doc.units.length > 12 && (
        <input className="search" placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      )}

      {docId === 'verses' && <AddVerses have={new Set(doc.units.map((u) => u.id))} onAdded={reload} />}

      {doc.units.length === 0 && docId === 'verses' && (
        <p className="empty">No verses yet. Add a passage above. You can also open any proof text and choose "Memorise this passage".</p>
      )}

      {doc.groups.map((g) => {
        const items = g.units
          .map((id) => units.get(id)!)
          .filter((u) => !q || u.prompt.toLowerCase().includes(q) || u.text.toLowerCase().includes(q) || u.ref.toLowerCase().includes(q))
        if (!items.length) return null
        return (
          <details key={g.title} open={doc.groups.length <= 12 || !!q}>
            <summary>{g.title}</summary>
            <div className="list">
              {items.map((u) => (
                <a key={u.id} className="list-item" href={href('unit', docId, u.id)}>
                  <span className="ref">{u.ref}</span>
                  {/* A verse's prompt is its reference: show its opening words. */}
                  <span className="grow">{u.prompt === u.ref ? opening(u.text) : u.prompt.replace(/^WCF [\d.]+: /, '')}</span>
                  <Pips p={progress.get(u.id)!} />
                </a>
              ))}
            </div>
          </details>
        )
      })}
    </div>
  )
}

const opening = (text: string) => {
  const words = text.split(/\s+/)
  return words.length > 12 ? `${words.slice(0, 12).join(' ')}…` : text
}

export function Pips({ p }: { p: UnitProgress }) {
  if (!p.learned) return null
  return (
    <span className="pips" title={`${p.mature}/${p.chunks} parts mature${p.wholeUnlocked ? ', whole recitation unlocked' : ''}`}>
      <span className="pip-bar">
        <span style={{ width: `${(p.mature / Math.max(1, p.chunks)) * 100}%` }} />
      </span>
      {p.wholeUnlocked && <span className="pip-whole">✓</span>}
    </span>
  )
}
