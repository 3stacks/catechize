import * as Haptics from 'expo-haptics'
import { useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react'
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Unit } from '../../../../src/data/types.ts'
import { chunkResults, cycleGrade, gradeLabel, toRecord, type WordStatus } from '../../../../src/lib/drill.ts'
import { normWord, tokenize, type Token } from '../../../../src/lib/grade.ts'
import type { InputMode } from '../../../../src/store/db.ts'
import { recordDrill, type ChunkResult } from '../../../../src/store/srs.ts'
import { Button, Row, Spacer, T } from '../components/ui.tsx'
import { speak, stopSpeaking } from '../lib/speech.ts'
import { font, gradeColour, useColors, type Colors } from '../lib/theme.ts'

// One drill over one unit. The same stages and grading as src/views/Drill.tsx:
//   read   – see (and hear) the whole text, with the learner's memory aid
//   trace  – type through it with the words shown faintly (practice, not graded)
//   fade   – type it with every other word hidden (practice, not graded)
//   recall – type it with the tested chunks hidden; each chunk is graded
// A review starts at recall and hides only the chunks that are due (or all of
// them for a whole-recitation review). The grades are saved on Continue, after
// the learner has had the chance to forgive a typo, or when the learner leaves.
//
// The web app can also listen to the learner ("Say it"). Expo Go has no speech
// recognition, so the mobile app does not have that part.

type Stage = 'read' | 'trace' | 'fade' | 'recall' | 'done'

interface Props {
  unit: Unit
  docId: string
  inputMode: InputMode
  /** learn: read → trace → (fade) → recall all chunks. review: recall the listed chunks. */
  kind: 'learn' | 'review'
  dueChunks?: number[]
  whole?: boolean
  /** Include the fade stage when learning. */
  fade?: boolean
  /** false: practice only, the schedule is not touched. */
  record?: boolean
  /** The learner's memory aid for this unit. */
  note?: string
  onDone: (results: ChunkResult[]) => void
}

const MAX_STRIKES = 3

/** True while the on-screen keyboard shows. */
function useKeyboardShown() {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setShown(true))
    const hide = Keyboard.addListener('keyboardDidHide', () => setShown(false))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])
  return shown
}

const buzz = () => {
  if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined)
}

export function Drill({ unit, docId, inputMode, kind, dueChunks, whole, fade = true, record = true, note, onDone }: Props) {
  const c = useColors()
  const insets = useSafeAreaInsets()
  const keyboard = useKeyboardShown()
  const tokens = useMemo(() => tokenize(unit.text), [unit.text])
  const chunkOf = useMemo(() => tokens.map((t) => Math.max(0, unit.chunks.findIndex(([s, e]) => t.start >= s && t.end <= e))), [tokens, unit.chunks])
  const tested = useMemo(() => {
    if (kind === 'learn' || whole) return new Set(unit.chunks.map((_, i) => i))
    return new Set(dueChunks ?? [])
  }, [kind, whole, dueChunks, unit.chunks])

  const [stage, setStage] = useState<Stage>(kind === 'learn' ? 'read' : 'recall')
  const [status, setStatus] = useState<WordStatus[]>(() => tokens.map(() => 'pending'))
  const [strikes, setStrikes] = useState<number[]>(() => tokens.map(() => 0))
  const [cursor, setCursor] = useState(0)
  const [buffer, setBuffer] = useState('')
  const [results, setResults] = useState<ChunkResult[] | null>(null)
  const input = useRef<ComponentRef<typeof TextInput>>(null)

  // The sequence of token indices the learner must produce in this stage.
  const order = useMemo(() => tokens.map((_, i) => i).filter((i) => stage === 'trace' || stage === 'fade' || tested.has(chunkOf[i])), [tokens, stage, tested, chunkOf])

  // Save once: on Continue, or when the learner leaves before pressing it.
  const pending = useRef<ChunkResult[] | null>(null)
  const save = () => {
    const toSave = pending.current
    pending.current = null
    if (!toSave || !record) return Promise.resolve()
    return recordDrill(unit, docId, toRecord(toSave, whole), inputMode)
  }
  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  })
  useEffect(
    () => () => {
      stopSpeaking()
      void saveRef.current()
    },
    [],
  )

  const focus = () => setTimeout(() => input.current?.focus(), 50)

  const restart = (next: Stage) => {
    setStage(next)
    setStatus(tokens.map(() => 'pending'))
    setStrikes(tokens.map(() => 0))
    setCursor(0)
    setBuffer('')
    focus()
  }

  useEffect(() => {
    if (stage === 'trace' || stage === 'fade' || stage === 'recall') focus()
  }, [stage])

  const current = order[cursor]

  const advance = (i: number, s: WordStatus) => {
    const nextStatus = status.slice()
    nextStatus[i] = s
    setStatus(nextStatus)
    setBuffer('')
    const nextCursor = cursor + 1
    setCursor(nextCursor)
    if (nextCursor >= order.length) finish(nextStatus)
  }

  const strike = (i: number) => {
    const n = strikes.slice()
    n[i]++
    setStrikes(n)
    buzz()
    if (n[i] >= MAX_STRIKES) advance(i, 'revealed')
  }

  const finish = (final: WordStatus[]) => {
    if (stage === 'trace') return restart(fade ? 'fade' : 'recall')
    if (stage === 'fade') return restart('recall')
    const graded = chunkResults(order, chunkOf, final)
    pending.current = graded
    setResults(graded)
    setStage('done')
    input.current?.blur()
  }

  /** The learner says a chunk was right after all (a typo). */
  const regrade = (index: number) => {
    if (!results) return
    const next = results.map((r) => (r.index === index ? { ...r, grade: cycleGrade(r.grade) } : r))
    pending.current = next
    setResults(next)
  }

  const onKey = (raw: string) => {
    if (current === undefined) return
    const t = tokens[current]
    if (inputMode === 'first-letter') {
      for (const ch of raw) {
        if (!/[a-z0-9]/i.test(ch)) continue
        if (ch.toLowerCase() === t.norm[0]) advance(current, strikes[current] > 0 ? 'slip' : 'ok')
        else strike(current)
        return // one key per word
      }
      return
    }
    // full-word: collect until space/enter, then check
    const text = buffer + raw
    if (/\s$/.test(text)) {
      const typed = normWord(text.trim())
      if (!typed) return setBuffer('')
      if (typed === t.norm) advance(current, strikes[current] > 0 ? 'slip' : 'ok')
      else advance(current, 'given')
      return
    }
    setBuffer(text)
  }

  const hint = () => current !== undefined && advance(current, 'revealed')

  const memoryAid = note ? (
    <View style={[st.aid, { backgroundColor: c.surface2 }]}>
      <T v="small">
        <Text style={{ color: c.muted }}>Your memory aid: </Text>
        {note}
      </T>
    </View>
  ) : null

  const bottom = { paddingBottom: Math.max(insets.bottom, 12) }

  if (stage === 'read')
    return (
      <View style={[st.fill, { backgroundColor: c.bg }]}>
        <ScrollView contentContainerStyle={st.body}>
          <Prompt unit={unit} />
          <Text style={[st.text, { color: c.text }]}>
            {unit.chunks.map(([s, e], i) => (
              <Text key={i} style={i % 2 === 1 ? { backgroundColor: c.surface2 } : undefined}>
                {unit.text.slice(s, e)}{' '}
              </Text>
            ))}
          </Text>
          {memoryAid}
        </ScrollView>
        <Row style={[st.bar, bottom, { borderTopColor: c.line, backgroundColor: c.bg }]}>
          <Button kind="ghost" title="Listen" onPress={() => speak(unit.text)} />
          <Spacer />
          <Button kind="ghost" title="Skip to test" onPress={() => restart('recall')} />
          <Button kind="primary" title="Trace it" onPress={() => restart('trace')} />
        </Row>
      </View>
    )

  if (stage === 'done' && results)
    return (
      <View style={[st.fill, { backgroundColor: c.bg }]}>
        <ScrollView contentContainerStyle={st.body}>
          <Prompt unit={unit} />
          <Words unit={unit} tokens={tokens} status={status} chunkOf={chunkOf} tested={tested} stage={stage} current={-1} buffer="" c={c} />
          {memoryAid}
          <View style={st.results}>
            {results.map((r) => (
              <View key={r.index} style={[st.result, { borderColor: c.line, backgroundColor: c.surface }]}>
                <View style={[st.dot, { backgroundColor: gradeColour(c, r.grade) }]} />
                <Text style={[st.resultText, { color: c.text }]}>{unit.text.slice(...unit.chunks[r.index])}</Text>
                <Pressable
                  onPress={() => regrade(r.index)}
                  accessibilityRole="button"
                  accessibilityHint="Tap to change the grade, for a typo"
                  hitSlop={8}
                  style={[st.grade, { borderColor: gradeColour(c, r.grade) }]}>
                  <Text style={[st.gradeText, { color: gradeColour(c, r.grade) }]}>{gradeLabel(r.grade)}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
        <Row style={[st.bar, bottom, { borderTopColor: c.line, backgroundColor: c.bg }]}>
          <T v="smallMuted" style={st.flex}>
            {record ? 'Tap a grade to change it.' : 'Practice only: your schedule is unchanged.'}
          </T>
          <Button kind="primary" title="Continue" onPress={() => void save().then(() => onDone(results))} />
        </Row>
      </View>
    )

  return (
    <KeyboardAvoidingView style={[st.fill, { backgroundColor: c.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
      <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="always">
        <Prompt unit={unit} />
        <T v="smallMuted">
          {stage === 'trace' ? 'Trace: type the ' : stage === 'fade' ? 'Fade: half the words are gone. Type the ' : 'Recall: type the '}
          {inputMode === 'first-letter' ? 'first letter of each word' : 'each word, then space'}
        </T>
        <Pressable onPress={() => input.current?.focus()} accessible={false}>
          <Words
            unit={unit}
            tokens={tokens}
            status={status}
            chunkOf={chunkOf}
            tested={tested}
            stage={stage}
            current={current ?? -1}
            buffer={buffer}
            struck={current !== undefined && strikes[current] > 0}
            c={c}
          />
        </Pressable>
      </ScrollView>
      <TextInput
        ref={input}
        style={st.capture}
        value=""
        onChangeText={onKey}
        onSubmitEditing={() => inputMode === 'full-word' && onKey(' ')}
        submitBehavior="submit"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect={false}
        spellCheck={false}
        // Android: no word suggestions above the keyboard.
        keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
        importantForAutofill="no"
        caretHidden
        accessibilityLabel="Type here"
      />
      <Row style={[st.bar, !keyboard && bottom, { borderTopColor: c.line, backgroundColor: c.bg }]}>
        <Text style={[st.progress, { color: c.muted }]}>
          {cursor}/{order.length}
        </Text>
        <Spacer />
        <Button kind="ghost" title="Show word" onPress={hint} />
      </Row>
    </KeyboardAvoidingView>
  )
}

function Prompt({ unit }: { unit: Unit }) {
  const c = useColors()
  return (
    <Text style={[st.prompt, { color: c.text }]}>
      <Text style={{ color: c.accent }}>{unit.ref} </Text>
      {unit.prompt}
    </Text>
  )
}

/** The text, word by word, as the stage shows it. */
function Words(props: {
  unit: Unit
  tokens: Token[]
  status: WordStatus[]
  chunkOf: number[]
  tested: Set<number>
  stage: Stage
  current: number
  buffer: string
  struck?: boolean
  c: Colors
}) {
  const { unit, tokens, status, chunkOf, tested, stage, current, buffer, struck, c } = props
  const parts: ReactNode[] = []
  let at = 0
  tokens.forEach((t, i) => {
    if (t.start > at) parts.push(unit.text.slice(at, t.start))
    at = t.end
    const hidden = stage === 'fade' ? i % 2 === 1 : stage !== 'trace' && tested.has(chunkOf[i])
    const s = status[i]
    let colour = c.text
    let shown: string = t.word
    if (s === 'ok') colour = c.text
    else if (s === 'slip' || s === 'given') colour = c.hard
    else if (s === 'revealed') colour = c.again
    else if (stage === 'trace') colour = i === current ? c.muted : c.line
    else if (hidden) {
      colour = c.line
      shown = '_'.repeat(Math.max(2, t.word.length))
    } else colour = c.muted
    if (i === current && buffer) {
      shown = buffer
      colour = c.accent
    }
    parts.push(
      <Text key={i} style={[{ color: colour }, i === current && { backgroundColor: struck ? c.mark : c.accentSoft }]}>
        {shown}
      </Text>,
    )
  })
  if (at < unit.text.length) parts.push(unit.text.slice(at))
  return (
    <Text style={st.text} accessibilityLabel={stage === 'done' ? unit.text : undefined}>
      {parts}
    </Text>
  )
}

const st = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  body: { padding: 16, gap: 14 },
  prompt: { fontFamily: font.bold, fontSize: 19, lineHeight: 25 },
  text: { fontFamily: font.regular, fontSize: 20, lineHeight: 35 },
  aid: { borderRadius: 10, padding: 12 },
  bar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderTopWidth: StyleSheet.hairlineWidth },
  progress: { fontFamily: font.medium, fontSize: 14, fontVariant: ['tabular-nums'] },
  capture: { position: 'absolute', width: 1, height: 1, opacity: 0, left: -10, bottom: 0 },
  results: { gap: 8 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  resultText: { flex: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 21 },
  grade: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, minWidth: 64, alignItems: 'center' },
  gradeText: { fontFamily: font.semibold, fontSize: 14 },
})
