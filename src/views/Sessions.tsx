import { useState } from 'react'
import { loadDoc, loadUnit } from '../data/load.ts'
import type { Unit } from '../data/types.ts'
import { href } from '../router.ts'
import { db, getSettings } from '../store/db.ts'
import { dueUnits, learnedToday, type DueUnit } from '../store/srs.ts'
import { useAsync } from '../useAsync.ts'
import { Drill } from './Drill.tsx'

/** Work through everything due, one unit at a time. */
export function ReviewSession() {
  const [data] = useAsync(async () => {
    const [due, settings] = await Promise.all([dueUnits(), getSettings()])
    return { due, settings }
  }, [])
  const [i, setI] = useState(0)

  if (!data) return <p className="empty">Loading…</p>
  const { due, settings } = data
  if (i >= due.length)
    return (
      <div className="card hero">
        <h1>{due.length ? 'Review done' : 'Nothing due'}</h1>
        <p>{due.length ? `${due.length} ${due.length === 1 ? 'answer' : 'answers'} reviewed.` : 'Come back later, or learn something new.'}</p>
        <a className="button primary" href={href()}>
          Back to today
        </a>
      </div>
    )
  return (
    <>
      <div className="session-bar">
        <span>
          Review {i + 1} of {due.length}
        </span>
        <a href={href()} className="muted">
          Stop
        </a>
      </div>
      <DueDrill key={due[i].unitId} item={due[i]} inputMode={settings.inputMode} onDone={() => setI(i + 1)} />
    </>
  )
}

function DueDrill({ item, inputMode, onDone }: { item: DueUnit; inputMode: 'first-letter' | 'full-word'; onDone: () => void }) {
  const [unit] = useAsync(() => loadUnit(item.docId, item.unitId), [item.unitId])
  if (!unit) return <p className="empty">Loading…</p>
  return (
    <Drill
      unit={unit}
      docId={item.docId}
      inputMode={inputMode}
      kind="review"
      whole={item.whole}
      // chunk indices beyond the current text (if chunking changed) are ignored
      dueChunks={item.chunks.filter((c) => c < unit.chunks.length)}
      onDone={onDone}
    />
  )
}

/** Learn a specific unit, or the next unlearned unit of a course. */
export function LearnSession({ docId, unitId }: { docId: string; unitId?: string }) {
  const [round, setRound] = useState(0)
  const [data] = useAsync(async () => {
    const settings = await getSettings()
    let unit: Unit | undefined
    if (unitId && round === 0) unit = await loadUnit(docId, unitId)
    else {
      const doc = await loadDoc(docId)
      const learned = new Set((await db.learned.where('docId').equals(docId).toArray()).map((l) => l.unitId))
      unit = doc.units.find((u) => !learned.has(u.id))
    }
    const course = await db.courses.get(docId)
    const today = await learnedToday(docId)
    return { unit, settings, course, today }
  }, [docId, unitId, round])

  if (!data) return <p className="empty">Loading…</p>
  const { unit, settings, course, today } = data
  if (!unit)
    return (
      <div className="card hero">
        <h1>All learned</h1>
        <p>Everything in this document has been learned.</p>
        <a className="button primary" href={href()}>
          Back to today
        </a>
      </div>
    )

  return (
    <>
      <div className="session-bar">
        <span>{unitId && round === 0 ? 'Learn' : `New today: ${today}${course ? ` of ${course.perDay}` : ''}`}</span>
        <a href={unitId ? href('unit', docId, unitId) : href()} className="muted">
          Stop
        </a>
      </div>
      <Drill
        key={unit.id + round}
        unit={unit}
        docId={docId}
        inputMode={settings.inputMode}
        kind="learn"
        onDone={() => {
          // Within a course, carry on to the next unit while today's allowance lasts.
          if (!unitId && course && today + 1 < course.perDay) setRound((r) => r + 1)
          else location.hash = (unitId ? href('unit', docId, unitId) : href()).slice(1)
        }}
      />
    </>
  )
}
