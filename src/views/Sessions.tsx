import { useEffect, useState } from 'react'
import { track } from '../lib/track.ts'
import { loadDoc, loadUnit } from '../data/load.ts'
import type { Unit } from '../data/types.ts'
import { href } from '../router.ts'
import { db, getNote, getSettings, type Settings } from '../store/db.ts'
import { dueUnits, learnedToday, type DueUnit } from '../store/srs.ts'
import { troubleSpots, unitsReviewedToday, type TroubleUnit } from '../store/stats.ts'
import { useAsync } from '../useAsync.ts'
import { Drill } from './Drill.tsx'

/** Units to review now, within the daily limit. */
export async function reviewQueue(settings: Settings): Promise<{ due: DueUnit[]; held: number }> {
  const all = await dueUnits()
  if (!settings.dailyReviewLimit) return { due: all, held: 0 }
  const left = Math.max(0, settings.dailyReviewLimit - (await unitsReviewedToday()))
  return { due: all.slice(0, left), held: Math.max(0, all.length - left) }
}

/** Work through everything due, one unit at a time. */
export function ReviewSession() {
  const [data] = useAsync(async () => {
    const settings = await getSettings()
    return { ...(await reviewQueue(settings)), settings }
  }, [])
  const [i, setI] = useState(0)
  const finished = !!data && data.due.length > 0 && i >= data.due.length
  useEffect(() => {
    if (finished) track('Review done', { answers: data!.due.length })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  if (!data) return <p className="empty">Loading…</p>
  const { due, held, settings } = data
  if (i >= due.length)
    return (
      <div className="card hero">
        <h1>{due.length ? 'Review done' : 'Nothing due'}</h1>
        <p>
          {due.length ? `${due.length} ${due.length === 1 ? 'answer' : 'answers'} reviewed.` : 'Come back later, or learn something new.'}
          {held ? ` ${held} more wait for tomorrow (daily limit).` : ''}
        </p>
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
      <UnitDrill key={due[i].unitId} docId={due[i].docId} unitId={due[i].unitId} settings={settings} chunks={due[i].chunks} whole={due[i].whole} onDone={() => setI(i + 1)} />
    </>
  )
}

/** Practise the parts that keep slipping. Practice only: the schedule is not touched. */
export function TroubleSession() {
  const [data] = useAsync(async () => ({ units: await troubleSpots(), settings: await getSettings() }), [])
  const [i, setI] = useState(0)
  if (!data) return <p className="empty">Loading…</p>
  const { units, settings } = data
  if (i >= units.length)
    return (
      <div className="card hero">
        <h1>{units.length ? 'Practice done' : 'No trouble spots'}</h1>
        <p>{units.length ? 'Those parts come back in your normal reviews too.' : 'Nothing keeps slipping. Well done.'}</p>
        <a className="button primary" href={href()}>
          Back to today
        </a>
      </div>
    )
  const u: TroubleUnit = units[i]
  return (
    <>
      <div className="session-bar">
        <span>
          Trouble spot {i + 1} of {units.length}
        </span>
        <a href={href()} className="muted">
          Stop
        </a>
      </div>
      <UnitDrill key={u.unitId} docId={u.docId} unitId={u.unitId} settings={settings} chunks={u.chunks} record={false} onDone={() => setI(i + 1)} />
    </>
  )
}

function UnitDrill(props: { docId: string; unitId: string; settings: Settings; chunks: number[]; whole?: boolean; record?: boolean; onDone: () => void }) {
  const { docId, unitId, settings } = props
  const [data] = useAsync(async () => ({ unit: await loadUnit(docId, unitId), note: await getNote(unitId) }), [unitId])
  if (!data) return <p className="empty">Loading…</p>
  if (!data.unit) {
    // The text is gone (a removed verse, a renamed unit): skip it.
    setTimeout(props.onDone, 0)
    return null
  }
  return (
    <Drill
      unit={data.unit}
      docId={docId}
      inputMode={settings.inputMode}
      kind="review"
      whole={props.whole}
      // chunk indices beyond the current text (if chunking changed) are ignored
      dueChunks={props.chunks.filter((c) => c < data.unit!.chunks.length)}
      record={props.record}
      note={data.note?.text}
      onDone={props.onDone}
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
    const note = unit ? await getNote(unit.id) : undefined
    return { unit, settings, course, today, note }
  }, [docId, unitId, round])

  if (!data) return <p className="empty">Loading…</p>
  const { unit, settings, course, today, note } = data
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
        fade={settings.fade}
        note={note?.text}
        onDone={() => {
          // Within a course, carry on to the next unit while today's allowance lasts.
          if (!unitId && course && today + 1 < course.perDay) setRound((r) => r + 1)
          else location.hash = (unitId ? href('unit', docId, unitId) : href()).slice(1)
        }}
      />
    </>
  )
}
