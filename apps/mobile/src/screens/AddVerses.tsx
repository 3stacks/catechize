import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput } from 'react-native'
import { addVerse } from '../../../../src/data/load.ts'
import { suggestions } from '../../../../src/data/suggest.ts'
import { formatPassage, parseRefs, type Passage } from '../../../../src/lib/refs.ts'
import { useAsync } from '../../../../src/useAsync.ts'
import { Button, Card, Row, T } from '../components/ui.tsx'
import { font, useColors } from '../lib/theme.ts'

/** Add Scripture to "My verses": by reference, or from the proof texts of what the learner knows. The same as src/views/AddVerses.tsx. */
export function AddVerses({ have, onAdded }: { have: Set<string>; onAdded: () => void }) {
  const c = useColors()
  const [input, setInput] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [list] = useAsync(() => suggestions(have), [[...have].join()])

  const add = async (passages: Passage[]) => {
    setBusy(true)
    try {
      for (const p of passages) await addVerse(p)
      onAdded()
    } catch {
      setError('Could not load that passage.')
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    const { passages, errors } = parseRefs(input)
    if (errors.length || !passages.length) {
      setError(`Type a reference such as "Romans 8:28" or "Psalm 23".${errors.length ? ` Not understood: ${errors.join(', ')}.` : ''}`)
      return
    }
    setError(undefined)
    await add(passages)
    setInput('')
  }

  return (
    <Card>
      <T v="h3">Add a passage</T>
      <Row>
        <TextInput
          style={[st.input, { backgroundColor: c.bg, borderColor: c.line, color: c.text }]}
          placeholder="Romans 8:28–30"
          placeholderTextColor={c.muted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => void submit()}
          returnKeyType="done"
          autoCorrect={false}
          editable={!busy}
          accessibilityLabel="Bible reference"
        />
        <Button kind="primary" title="Add" onPress={() => void submit()} disabled={busy || !input.trim()} />
      </Row>
      {error && <T v="small" style={{ color: c.again }}>{error}</T>}
      {list && list.length > 0 && (
        <>
          <T v="smallMuted">Proof texts from what you learn:</T>
          {list.map((s) => (
            <Pressable
              key={s.id}
              disabled={busy}
              onPress={() => void add([s.passage])}
              accessibilityRole="button"
              accessibilityLabel={`Add ${formatPassage(s.passage)}`}
              style={({ pressed }) => [st.suggestion, { borderColor: c.line, backgroundColor: pressed ? c.surface2 : c.surface }]}>
              <Text style={[st.suggestionText, { color: c.text }]}>
                <Text style={{ fontFamily: font.semibold }}>{formatPassage(s.passage)}</Text>
                <Text style={{ color: c.muted }}> · {s.from}</Text>
              </Text>
              <Text style={[st.plus, { color: c.accent }]}>+</Text>
            </Pressable>
          ))}
        </>
      )}
    </Card>
  )
}

const st = StyleSheet.create({
  input: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, minHeight: 44, fontFamily: font.regular, fontSize: 16 },
  suggestion: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  suggestionText: { flex: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 20 },
  plus: { fontFamily: font.bold, fontSize: 20, marginLeft: 8 },
})
