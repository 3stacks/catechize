import { router, Stack } from 'expo-router'
import { useEffect, useState, type ReactNode } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { loadDoc, loadReading, loadUnit } from '../../../../src/data/load.ts'
import type { Span, Unit } from '../../../../src/data/types.ts'
import { db, getNote, removeRows, saveNote } from '../../../../src/store/db.ts'
import { daysUntil, resetUnit, unitProgress } from '../../../../src/store/srs.ts'
import { isLeech } from '../../../../src/store/stats.ts'
import { useAsync } from '../../../../src/useAsync.ts'
import { Button, Card, Link, Loading, Empty, Row, Screen, Spacer, T, useScreenData } from '../components/ui.tsx'
import { confirm } from '../lib/confirm.ts'
import { open } from '../lib/open.ts'
import { speak, stopSpeaking } from '../lib/speech.ts'
import { font, useColors } from '../lib/theme.ts'
import { ProofSheet, type SheetContent } from './ProofSheet.tsx'

// One unit: its text with the proof texts, the memory aid, and the drill. The
// same content as src/views/UnitView.tsx.

export function UnitView({ docId, unitId }: { docId: string; unitId: string }) {
  const c = useColors()
  const [data, , reload] = useScreenData(async () => {
    const [doc, unit, progress, note, cards] = await Promise.all([
      loadDoc(docId),
      loadUnit(docId, unitId),
      unitProgress([unitId]),
      getNote(unitId),
      db.cards.where('unitId').equals(unitId).toArray(),
    ])
    return { doc, unit, progress: progress.get(unitId)!, note: note?.text ?? '', trouble: cards.filter(isLeech).length }
  }, [docId, unitId])
  const [sheet, setSheet] = useState<SheetContent>()
  useEffect(() => stopSpeaking, [])

  if (!data) return <Loading />
  const { doc, unit, progress, note, trouble } = data
  if (!unit) return <Empty>Not found.</Empty>

  const i = doc.units.findIndex((u) => u.id === unitId)
  const prev = doc.units[i - 1]
  const next = doc.units[i + 1]

  return (
    <Screen>
      <Stack.Screen options={{ title: `${doc.short} ${unit.ref}` }} />
      <View style={st.gap}>
        <Text style={[st.prompt, { color: c.text }]} accessibilityRole="header">
          <Text style={{ color: c.accent }}>{unit.ref} </Text>
          {unit.prompt}
        </Text>
        <AnnotatedText unit={unit} onOpen={setSheet} />
        <T v="smallMuted">
          {unit.proofs.length || unit.notes?.length ? 'Tap an underlined phrase for its proof texts. ' : ''}
          {unit.chunks.length} {unit.chunks.length === 1 ? 'part' : 'parts'}
          {progress.learned && progress.nextDue !== undefined ? ` · ${progress.mature}/${progress.chunks} mature · next review ${dueText(progress.nextDue)}` : ''}
          {trouble ? ` · ${trouble} trouble ${trouble === 1 ? 'spot' : 'spots'}` : ''}
        </T>
      </View>

      <MemoryAid key={unitId + note} unitId={unitId} docId={docId} initial={note} prompt={trouble > 0} />

      <Button kind="primary" title={progress.learned ? 'Practise' : 'Learn this'} onPress={() => router.push(`/learn/${docId}?unit=${encodeURIComponent(unit.id)}`)} />
      <Row wrap>
        <Button kind="ghost" title="Listen" onPress={() => speak(unit.text)} />
        <Spacer />
        {progress.learned && (
          <Button
            kind="ghost"
            title="Reset"
            onPress={async () => {
              if (await confirm('Reset', 'Forget your progress on this unit?', 'Reset')) {
                await resetUnit(unit.id)
                reload()
              }
            }}
          />
        )}
        {docId === 'verses' && (
          <Button
            kind="ghost"
            title="Remove"
            onPress={async () => {
              if (!(await confirm('Remove', 'Remove this passage from My verses?', 'Remove'))) return
              await resetUnit(unit.id)
              await db.transaction('rw', db.verses, db.notes, db.tombstones, async () => {
                await removeRows('verses', [unit.id])
                if (await db.notes.get(unit.id)) await removeRows('notes', [unit.id])
              })
              router.back()
            }}
          />
        )}
      </Row>

      <FurtherReading unitId={unitId} />

      <Row>
        {prev ? <Link onPress={() => router.replace(`/unit/${docId}/${prev.id}`)}>← {prev.ref}</Link> : null}
        <Spacer />
        {next ? <Link onPress={() => router.replace(`/unit/${docId}/${next.id}`)}>{next.ref} →</Link> : null}
      </Row>

      <ProofSheet content={sheet} onClose={() => setSheet(undefined)} />
    </Screen>
  )
}

/** Links to public-domain expositions of this answer: a chapter where one exists, then whole books. */
function FurtherReading({ unitId }: { unitId: string }) {
  const c = useColors()
  const [reading] = useAsync(() => loadReading().catch(() => undefined), [])
  const list = reading?.units[unitId]
  if (!reading || !list?.length) return null
  return (
    <Card>
      <T v="h3">Further reading</T>
      {list.map(([work, title, url, kind]) => {
        const [book, author, year] = reading.works[work]
        const host = url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
        return (
          <Text key={url} style={[st.reading, { color: c.text }]}>
            <Link onPress={() => open(url)}>{kind === 'book' ? `${book} (whole book)` : title} ↗</Link>
            <Text style={{ color: c.muted }}>
              {' '}
              {author}
              {kind === 'book' ? `, ${year}` : `, ${book}, ${year}`}
              {kind === 'excerpt' ? ' (extract)' : ''} · {host}
            </Text>
          </Text>
        )
      })}
    </Card>
  )
}

/**
 * The learner's own hook for an answer: a picture, an acrostic, a linked verse.
 * Shown before each drill of the unit. Saved as the learner types.
 */
function MemoryAid({ unitId, docId, initial, prompt }: { unitId: string; docId: string; initial: string; prompt: boolean }) {
  const c = useColors()
  const [text, setText] = useState(initial)
  const [opened, setOpened] = useState(!!initial)
  useEffect(() => {
    if (text === initial) return
    const t = setTimeout(() => void saveNote(unitId, docId, text), 600)
    return () => clearTimeout(t)
  }, [text, initial, unitId, docId])
  if (!opened)
    return <Button kind="ghost" small title={prompt ? 'This one keeps slipping. Add a memory aid' : 'Add a memory aid'} onPress={() => setOpened(true)} style={st.start} />
  return (
    <Card>
      <T v="label">Memory aid</T>
      <TextInput
        style={[st.memory, { color: c.text, borderColor: c.line, backgroundColor: c.bg }]}
        multiline
        value={text}
        placeholder="A picture, an acrostic, a verse it echoes. You see this before each drill."
        placeholderTextColor={c.muted}
        onChangeText={setText}
        onBlur={() => text !== initial && void saveNote(unitId, docId, text)}
        accessibilityLabel="Memory aid"
      />
    </Card>
  )
}

const dueText = (ms: number) => {
  const d = daysUntil(ms)
  return d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`
}

/** The unit's text with its footnoted phrases and harmony notes as phrases to tap. */
function AnnotatedText({ unit, onOpen }: { unit: Unit; onOpen: (s: SheetContent) => void }) {
  const c = useColors()
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

  const parts: ReactNode[] = []
  let at = 0
  marks.forEach((m, i) => {
    if (m.span[0] < at) return // overlapping; keep the first
    if (m.span[0] > at) parts.push(unit.text.slice(at, m.span[0]))
    parts.push(
      <Text key={i} onPress={m.open} accessibilityRole="link" style={[st.mark, { textDecorationColor: c.mark }]}>
        {unit.text.slice(...m.span)}
      </Text>,
    )
    at = m.span[1]
  })
  parts.push(unit.text.slice(at))

  const whole = unit.proofs.length === 1 && unit.proofs[0].span[1] === unit.text.length && unit.proofs[0].span[0] === 0 ? unit.proofs[0] : undefined
  return (
    <>
      <Text style={[st.unitText, { color: c.text }]}>
        {parts}
      </Text>
      {whole && <Button kind="ghost" small title="See also: parallel passage" onPress={() => onOpen({ phrase: unit.text, refs: whole.refs })} style={st.start} />}
    </>
  )
}

const st = StyleSheet.create({
  gap: { gap: 12 },
  start: { alignSelf: 'flex-start' },
  prompt: { fontFamily: font.bold, fontSize: 21, lineHeight: 27 },
  unitText: { fontFamily: font.regular, fontSize: 19, lineHeight: 33 },
  mark: { textDecorationLine: 'underline', textDecorationStyle: 'solid' },
  memory: { minHeight: 64, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10, fontFamily: font.regular, fontSize: 16, lineHeight: 22, textAlignVertical: 'top' },
  reading: { fontFamily: font.regular, fontSize: 15, lineHeight: 22 },
})
