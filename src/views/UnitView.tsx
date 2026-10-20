import { useState } from 'react'
import { loadDoc, loadUnit } from '../data/load.ts'
import type { Span, Unit } from '../data/types.ts'
import { href } from '../router.ts'
import { db } from '../store/db.ts'
import { resetUnit, unitProgress, daysUntil } from '../store/srs.ts'
import { useAsync } from '../useAsync.ts'
import { speak } from '../lib/speech.ts'
import { ProofSheet, type SheetContent } from './ProofSheet.tsx'

export function UnitView({ docId, unitId }: { docId: string; unitId: string }) {
  const [data, , reload] = useAsync(async () => {
    const [doc, unit, progress] = await Promise.all([loadDoc(docId), loadUnit(docId, unitId), unitProgress([unitId])])
    return { doc, unit, progress: progress.get(unitId)! }
  }, [docId, unitId])
  const [sheet, setSheet] = useState<SheetContent>()

  if (!data) return <p className="empty">Loading…</p>
  const { doc, unit, progress } = data
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
        </p>
      </section>

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
                await db.verses.delete(unit.id)
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

      <nav className="pager">
        {prev ? <a href={href('unit', docId, prev.id)}>← {prev.ref}</a> : <span />}
        {next ? <a href={href('unit', docId, next.id)}>{next.ref} →</a> : <span />}
      </nav>

      {sheet && <ProofSheet content={sheet} onClose={() => setSheet(undefined)} />}
    </div>
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
