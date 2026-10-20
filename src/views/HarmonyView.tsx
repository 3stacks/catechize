import { useState } from 'react'
import { loadHarmony } from '../data/load.ts'
import { bookByOsis } from '../lib/books.ts'
import { formatPassage, passageFromId } from '../lib/refs.ts'
import { href } from '../router.ts'
import { useAsync } from '../useAsync.ts'
import { ProofSheet, type SheetContent } from './ProofSheet.tsx'

export function HarmonyView({ id }: { id: string }) {
  const [h] = useAsync(() => loadHarmony(id), [id])
  const [sheet, setSheet] = useState<SheetContent>()
  if (!h) return <p className="empty">Loading…</p>

  return (
    <div className="stack">
      <section>
        <h1>{h.title}</h1>
        {h.description && <p className="muted">{h.description}</p>}
      </section>
      {h.sections.map((s) => (
        <section key={s.title}>
          <h2>{s.title}</h2>
          <div className={`harmony harmony-${id}`} style={{ '--cols': h.columns.length } as React.CSSProperties}>
            <div className="h-row h-head">
              {h.columns.map((c) => (
                <div key={c.key}>{c.docId ? <a href={href('doc', c.docId)}>{c.label}</a> : c.label}</div>
              ))}
            </div>
            {s.rows.map((r, i) => (
              <div className="h-row" key={i}>
                {h.columns.map((c, ci) => (
                  <div key={c.key} className={ci === 0 ? 'h-first' : 'h-other'}>
                    {r.cells[c.key]?.map((cell, k) => {
                      // Phrases and the first cell of a row read as text; other
                      // whole-unit references are compact chips ("Q. 45").
                      const prose = !!cell.span || (ci === 0 && k === 0)
                      return (
                        <a
                          key={cell.unitId + (cell.span?.join() ?? '')}
                          href={href('unit', c.docId!, cell.unitId)}
                          className={prose ? 'h-cell' : 'h-chip'}
                          title={cell.text}
                        >
                          {prose || ci === 0 ? cell.text : cell.text.split(' ').slice(0, 2).join(' ')}
                        </a>
                      )
                    })}
                  </div>
                ))}
                {(r.refs?.length || r.hymn) && id === 'creeds' ? (
                  <div className="h-meta">
                    {r.refs?.length ? (
                      <button
                        className="link"
                        onClick={() =>
                          setSheet({ phrase: Object.values(r.cells).flat()[0]?.text ?? '', refs: r.refs!, hymn: r.hymn })
                        }
                      >
                        {r.refs.map((x) => short(x)).join('; ')}
                      </button>
                    ) : null}
                    {r.hymn && <span className="hymn-cell">♪ {r.hymn}</span>}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          {id === 'decalogue' && (
            <p className="muted small">Each row's Deuteronomy 5 parallel is on the commandment's page.</p>
          )}
        </section>
      ))}
      {sheet && <ProofSheet content={sheet} onClose={() => setSheet(undefined)} />}
    </div>
  )
}

/** Compact reference using the OSIS abbreviation: "Jas 2:19", "1 Pet 3:21". */
function short(id: string) {
  const p = passageFromId(id)
  if (!p) return id
  const abbr = p.book.replace(/^(\d)/, '$1 ')
  return formatPassage(p).replace(bookByOsis(p.book).name, abbr)
}
