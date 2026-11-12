import { router } from 'expo-router'
import { useState } from 'react'
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { addVerse, loadPassageById, sibHref } from '../../../../src/data/load.ts'
import type { Note } from '../../../../src/data/types.ts'
import { formatPassage, passageFromId } from '../../../../src/lib/refs.ts'
import { useAsync } from '../../../../src/useAsync.ts'
import { Button, Link, Row, T } from '../components/ui.tsx'
import { open } from '../lib/open.ts'
import { font, useColors } from '../lib/theme.ts'

export interface SheetContent {
  phrase: string
  refs: string[]
  hymn?: string
  parallel?: Note['parallel'] & { text: string }
}

/** A sheet with the proof texts of a phrase, in the KJV. The same content as src/views/ProofSheet.tsx. */
export function ProofSheet({ content, onClose }: { content: SheetContent | undefined; onClose: () => void }) {
  const c = useColors()
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={!!content} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {content && (
        <View style={[st.sheet, { backgroundColor: c.bg, paddingTop: Platform.OS === 'ios' ? 8 : insets.top }]}>
          <Row style={[st.head, { borderBottomColor: c.line }]}>
            <Text style={[st.phrase, { color: c.text }]} numberOfLines={3}>
              “{content.phrase}”
            </Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
              <Text style={[st.close, { color: c.accent }]}>Done</Text>
            </Pressable>
          </Row>
          <ScrollView contentContainerStyle={[st.body, { paddingBottom: insets.bottom + 32 }]}>
            {content.parallel && (
              <T>
                <Text style={{ color: c.muted }}>{content.parallel.label}: </Text>
                <Link
                  onPress={() => {
                    const p = content.parallel!
                    onClose()
                    router.push(`/unit/${p.unitId.split('-')[0]}/${p.unitId}`)
                  }}>
                  {content.parallel.text}
                </Link>
              </T>
            )}
            {content.hymn && <T style={{ fontFamily: font.medium }}>♪ {content.hymn}</T>}
            {content.refs.length === 0 && <T v="muted">No proof texts for this phrase.</T>}
            {content.refs.map((id) => (
              <Passage key={id} id={id} />
            ))}
          </ScrollView>
        </View>
      )}
    </Modal>
  )
}

function Passage({ id }: { id: string }) {
  const c = useColors()
  const [verses] = useAsync(() => loadPassageById(id), [id])
  const p = passageFromId(id)
  const [brown] = useAsync(async () => (p ? sibHref(p) : undefined), [id])
  const [added, setAdded] = useState(false)
  const [more, setMore] = useState(false)
  if (!p) return null
  const long = (verses?.length ?? 0) > 12
  return (
    <View style={[st.passage, { backgroundColor: c.surface, borderColor: c.line }]}>
      <Row wrap>
        <Text style={[st.passageRef, { color: c.text }]}>{formatPassage(p)}</Text>
        <View style={st.flex} />
        <Button
          small
          kind="ghost"
          disabled={added}
          title={added ? 'Added to My verses' : 'Memorise this passage'}
          onPress={async () => {
            await addVerse(p)
            setAdded(true)
          }}
        />
      </Row>
      {verses ? (
        <Text style={[st.verses, { color: c.text }]} numberOfLines={long && !more ? 8 : undefined} onPress={long ? () => setMore(!more) : undefined}>
          {verses.map((v) => (
            <Text key={`${v.c}:${v.v}`}>
              <Text style={[st.sup, { color: c.muted }]}>{p.c1 !== p.c2 ? `${v.c}:${v.v}` : v.v} </Text>
              {v.text}{' '}
            </Text>
          ))}
        </Text>
      ) : (
        <T v="smallMuted">Loading…</T>
      )}
      {long && !more && <Link onPress={() => setMore(true)}>Show all</Link>}
      {brown && (
        <Link onPress={() => open(brown)} style={st.small}>
          Open {formatPassage({ ...p, c2: p.c1, v2: p.v1 })} in the Self-Interpreting Bible ↗
        </Link>
      )}
    </View>
  )
}

const st = StyleSheet.create({
  flex: { flex: 1 },
  sheet: { flex: 1 },
  head: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, alignItems: 'flex-start' },
  phrase: { flex: 1, fontFamily: font.semibold, fontSize: 16, lineHeight: 22 },
  close: { fontFamily: font.semibold, fontSize: 16, paddingTop: 1 },
  body: { padding: 16, gap: 14 },
  passage: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 14, gap: 8 },
  passageRef: { fontFamily: font.bold, fontSize: 16 },
  verses: { fontFamily: font.regular, fontSize: 16, lineHeight: 25 },
  sup: { fontFamily: font.semibold, fontSize: 11 },
  small: { fontSize: 14 },
})
