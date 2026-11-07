import { useEffect, useState } from 'react'
import { loadDoc, loadReading, loadUnit } from '../data/load.ts'
import type { Span, Unit } from '../data/types.ts'
import { href } from '../router.ts'
import { db, getNote, removeRows, saveNote } from '../store/db.ts'
import { resetUnit, unitProgress, daysUntil } from '../store/srs.ts'
import { isLeech } from '../store/stats.ts'
import { useDataVersion } from '../store/sync.ts'
import { useAsync } from '../useAsync.ts'
import { speak } from '../lib/speech.ts'
import { ProofSheet, type SheetContent } from './ProofSheet.tsx'

export function UnitView({ docId, unitId }: { docId: string; unitId: string }) {
  const v = useDataVersion()
  const [data, , reload] = useAsync(async () => {
    const [doc, unit, progress, note, cards] = await Promise.all([
      loadDoc(docId),
      loadUnit(docId, unitId),
      unitProgress([unitId]),
      getNote(unitId),
      db.cards.where('unitId').equals(unitId).toArray(),
    ])
    return { doc, unit, progress: progress.get(unitId)!, note: note?.text ?? '', trouble: cards.filter(isLeech).length }
  }, [docId, unitId, v])
  const [sheet, setSheet] = useState<SheetContent>()

  if (!data) return <p className="empty">Loading…</p>
  const { doc, unit, progress, note, trouble } = data
  if (!unit) return <p className="empty">Not found.</p>

  const i = doc.units.findIndex((u) => u.id === unitId)
  const prev = doc.units[i - 1]
  const next = doc.units[i + 1]

  return (
    <div className="stack">
      <nav className="crumbs">
        <a href={href('doc', docId)}>{doc.title}</a>
      </nav>
      <section>
        <div className="prompt big">
          <span className="ref">{unit.ref}</span>
          <span>{unit.prompt}</span>
        </div>
        <AnnotatedText unit={unit} onOpen={setSheet} />
        <p className="muted small">
          {unit.proofs.length || unit.notes?.length ? 'Tap an underlined phrase for its proof texts. ' : ''}
          {unit.chunks.length} {unit.chunks.length === 1 ? 'part' : 'parts'}
          {progress.learned && progress.nextDue !== undefined
            ? ` · ${progress.mature}/${progress.chunks} mature · next review ${dueText(progress.nextDue)}`
            : ''}
          {trouble ? ` · ${trouble} trouble ${trouble === 1 ? 'spot' : 'spots'}` : ''}
        </p>
      </section>

      <MemoryAid key={unitId + note} unitId={unitId} docId={docId} initial={note} prompt={trouble > 0} />

      <div className="row wrap">
        <button className="ghost" onClick={() => speak(unit.text)}>
          Listen
        </button>
        <span className="spacer" />
        {progress.learned && (
          <button
            className="ghost"
            onClick={async () => {
              if (confirm('Forget your progress on this unit?')) {
                await resetUnit(unit.id)
                reload()
              }
            }}
          >
            Reset
          </button>
        )}
        {docId === 'verses' && (
          <button
            className="ghost"
            onClick={async () => {
              if (confirm('Remove this passage from My verses?')) {
                await resetUnit(unit.id)
                await db.transaction('rw', db.verses, db.notes, db.tombstones, async () => {
                  await removeRows('verses', [unit.id])
                  if (await db.notes.get(unit.id)) await removeRows('notes', [unit.id])
                })
                location.hash = href('doc', 'verses').slice(1)
              }
            }}
          >
            Remove
          </button>
        )}
        <a className="button primary" href={href('learn', docId, unit.id)}>
          {progress.learned ? 'Practise' : 'Learn this'}
        </a>
      </div>

      <FurtherReading unitId={unitId} />

      <nav className="pager">
        {prev ? <a href={href('unit', docId, prev.id)}>← {prev.ref}</a> : <span />}
        {next ? <a href={href('unit', docId, next.id)}>{next.ref} →</a> : <span />}
      </nav>

      {sheet && <ProofSheet content={sheet} onClose={() => setSheet(undefined)} />}
    </div>
  )
}

/** Links to public-domain expositions of this answer: a chapter where one exists, then whole books. */
function FurtherReading({ unitId }: { unitId: string }) {
  const [reading] = useAsync(() => loadReading().catch(() => undefined), [])
  const list = reading?.units[unitId]
  if (!reading || !list?.length) return null
  return (
    <section className="card reading">
      <h3>Further reading</h3>
      <ul>
        {list.map(([work, title, url, kind]) => {
          const [book, author, year] = reading.works[work]
          const host = new URL(url).hostname.replace(/^www\./, '')
          return (
            <li key={url}>
              <a href={url} target="_blank" rel="noopener">
                {kind === 'book' ? `${book} (whole book)` : title} ↗
              </a>
              <span className="muted small">
                {' '}
                {author}
                {kind === 'book' ? `, ${year}` : `, ${book}, ${year}`}
                {kind === 'excerpt' ? ' (extract)' : ''} · {host}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/**
 * The learner's own hook for an answer: a picture, an acrostic, a linked verse.
 * Shown before each drill of the unit. Saved as the learner types.
 */
function MemoryAid({ unitId, docId, initial, prompt }: { unitId: string; docId: string; initial: string; prompt: boolean }) {
  const [text, setText] = useState(initial)
  const [open, setOpen] = useState(!!initial)
  useEffect(() => {
    if (text === initial) return
    const t = setTimeout(() => void saveNote(unitId, docId, text), 600)
    return () => clearTimeout(t)
  }, [text, initial, unitId, docId])
  if (!open)
    return (
      <button className="ghost small" onClick={() => setOpen(true)}>
        {prompt ? 'This one keeps slipping. Add a memory aid' : 'Add a memory aid'}
      </button>
    )
  return (
    <section className="card">
      <label className="memory-label" htmlFor="memory-aid">
        Memory aid
      </label>
      <textarea
        id="memory-aid"
        className="memory-input"
        rows={2}
        value={text}
        placeholder="A picture, an acrostic, a verse it echoes. You see this before each drill."
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== initial && void saveNote(unitId, docId, text)}
      />
    </section>
  )
}

const dueText = (ms: number) => {
  const d = daysUntil(ms)
  return d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`
}

/** The unit's text with its footnoted phrases and harmony notes as tappable spans. */
function AnnotatedText({ unit, onOpen }: { unit: Unit; onOpen: (s: SheetContent) => void }) {
  type Mark = { span: Span; open: () => void }
  const marks: Mark[] = []
  for (const p of unit.proofs) {
    // A proof covering the whole of a short text (the Decalogue's Deut. 5
    // parallels) is shown as a link below rather than underlining everything.
    if (p.span[0] === 0 && p.span[1] === unit.text.length && unit.proofs.length === 1) continue
    marks.push({ span: p.span, open: () => onOpen({ phrase: unit.text.slice(...p.span), refs: p.refs }) })
  }
  for (const n of unit.notes ?? [])
    marks.push({
      span: n.span,
      open: async () => {
        let parallel: SheetContent['parallel']
        if (n.parallel) {
          const other = await loadUnit(n.parallel.unitId.split('-')[0], n.parallel.unitId)
          parallel = { ...n.parallel, text: other ? other.text.slice(...n.parallel.span) : '' }
        }
        onOpen({ phrase: unit.text.slice(...n.span), refs: n.refs, hymn: n.hymn, parallel })
      },
    })
  marks.sort((a, b) => a.span[0] - b.span[0])

  const parts: React.ReactNode[] = []
  let at = 0
  marks.forEach((m, i) => {
    if (m.span[0] < at) return // overlapping; keep the first
    if (m.span[0] > at) parts.push(unit.text.slice(at, m.span[0]))
    parts.push(
      <button key={i} className="mark" onClick={m.open}>
        {unit.text.slice(...m.span)}
      </button>,
    )
    at = m.span[1]
  })
  parts.push(unit.text.slice(at))

  const whole = unit.proofs.length === 1 && unit.proofs[0].span[1] === unit.text.length && unit.proofs[0].span[0] === 0 ? unit.proofs[0] : undefined
  return (
    <>
      <p className="unit-text">{parts}</p>
      {whole && (
        <button className="ghost small" onClick={() => onOpen({ phrase: unit.text, refs: whole.refs })}>
          See also: parallel passage
        </button>
      )}
    </>
  )
}
