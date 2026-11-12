import { router, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { loadDoc, loadUnit } from '../../../../src/data/load.ts'
import type { Unit } from '../../../../src/data/types.ts'
import { track } from '../../../../src/lib/track.ts'
import { db, getNote, getSettings, type Settings } from '../../../../src/store/db.ts'
import { reviewQueue } from '../../../../src/store/queue.ts'
import { learnedToday } from '../../../../src/store/srs.ts'
import { troubleSpots, type TroubleUnit } from '../../../../src/store/stats.ts'
import { useAsync } from '../../../../src/useAsync.ts'
import { Button, Card, Loading, Screen, T } from '../components/ui.tsx'
import { Drill } from './Drill.tsx'

// Review, learn and trouble-spot sessions. The same logic as src/views/Sessions.tsx.

const back = () => (router.canGoBack() ? router.back() : router.replace('/'))

function Finished({ title, text }: { title: string; text: string }) {
  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <Card>
        <T v="h1">{title}</T>
        <T>{text}</T>
        <Button kind="primary" title="Back to today" onPress={back} />
      </Card>
    </Screen>
  )
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

  if (!data) return <Loading />
  const { due, held, settings } = data
  if (i >= due.length)
    return (
      <Finished
        title={due.length ? 'Review done' : 'Nothing due'}
        text={
          (due.length ? `${due.length} ${due.length === 1 ? 'answer' : 'answers'} reviewed.` : 'Come back later, or learn something new.') +
          (held ? ` ${held} more wait for tomorrow (daily limit).` : '')
        }
      />
    )
  return (
    <>
      <Stack.Screen options={{ title: `Review ${i + 1} of ${due.length}` }} />
      <UnitDrill key={due[i].unitId} docId={due[i].docId} unitId={due[i].unitId} settings={settings} chunks={due[i].chunks} whole={due[i].whole} onDone={() => setI(i + 1)} />
    </>
  )
}

/** Practise the parts that keep slipping. Practice only: the schedule is not touched. */
export function TroubleSession() {
  const [data] = useAsync(async () => ({ units: await troubleSpots(), settings: await getSettings() }), [])
  const [i, setI] = useState(0)
  if (!data) return <Loading />
  const { units, settings } = data
  if (i >= units.length)
    return (
      <Finished
        title={units.length ? 'Practice done' : 'No trouble spots'}
        text={units.length ? 'Those parts come back in your normal reviews too.' : 'Nothing keeps slipping. Well done.'}
      />
    )
  const u: TroubleUnit = units[i]
  return (
    <>
      <Stack.Screen options={{ title: `Trouble spot ${i + 1} of ${units.length}` }} />
      <UnitDrill key={u.unitId} docId={u.docId} unitId={u.unitId} settings={settings} chunks={u.chunks} record={false} onDone={() => setI(i + 1)} />
    </>
  )
}

function UnitDrill(props: { docId: string; unitId: string; settings: Settings; chunks: number[]; whole?: boolean; record?: boolean; onDone: () => void }) {
  const { docId, unitId, settings, onDone } = props
  const [data] = useAsync(async () => ({ unit: await loadUnit(docId, unitId), note: await getNote(unitId) }), [unitId])
  const missing = !!data && !data.unit
  useEffect(() => {
    // The text is gone (a removed verse, a renamed unit): skip it.
    if (missing) onDone()
  }, [missing, onDone])
  if (!data) return <Loading />
  if (!data.unit) return <View />
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
    const note = unit ? await getNote(unit.id) : undefined
    return { unit, settings, course, today, note }
  }, [docId, unitId, round])

  if (!data) return <Loading />
  const { unit, settings, course, today, note } = data
  if (!unit) return <Finished title="All learned" text="Everything in this document has been learned." />

  return (
    <>
      <Stack.Screen options={{ title: unitId && round === 0 ? 'Learn' : `New today: ${today}${course ? ` of ${course.perDay}` : ''}` }} />
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
          else back()
        }}
      />
    </>
  )
}
