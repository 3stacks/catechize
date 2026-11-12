import { router, Stack } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { loadDoc } from '../../../../src/data/load.ts'
import type { Unit } from '../../../../src/data/types.ts'
import { db, removeRows } from '../../../../src/store/db.ts'
import { unitProgress, type UnitProgress } from '../../../../src/store/srs.ts'
import { Button, Card, Loading, Row, Segmented, Spacer, T, useScreenData } from '../components/ui.tsx'
import { font, useColors } from '../lib/theme.ts'
import { AddVerses } from './AddVerses.tsx'

// One document: a course, a filter, and its units by group. The same content
// as src/views/DocView.tsx. A SectionList draws only the rows on the screen,
// so the long documents (WLC, Large Catechism) scroll smoothly.

const HARMONY_FOR: Record<string, { id: string; label: string }> = {
  apostles: { id: 'creeds', label: 'Compare with the Nicene Creed, with proof texts and hymns' },
  nicene: { id: 'creeds', label: "Compare with the Apostles' Creed, with proof texts and hymns" },
  decalogue: { id: 'decalogue', label: 'See each commandment in the WSC, WLC and Heidelberg' },
}

export function DocView({ docId }: { docId: string }) {
  const c = useColors()
  const insets = useSafeAreaInsets()
  const [data, , reload] = useScreenData(async () => {
    const doc = await loadDoc(docId)
    const progress = await unitProgress(doc.units.map((u) => u.id))
    const course = await db.courses.get(docId)
    return { doc, progress, course }
  }, [docId])
  const [filter, setFilter] = useState('')
  const [toggled, setToggled] = useState<Record<string, boolean>>({})

  const q = filter.trim().toLowerCase()
  const sections = useMemo(() => {
    if (!data) return []
    const units = new Map(data.doc.units.map((u) => [u.id, u]))
    const openAll = data.doc.groups.length <= 12
    return data.doc.groups
      .map((g) => {
        const items = g.units
          .map((id) => units.get(id)!)
          .filter((u) => u && (!q || u.prompt.toLowerCase().includes(q) || u.text.toLowerCase().includes(q) || u.ref.toLowerCase().includes(q)))
        const open = !!q || (toggled[g.title] ?? openAll)
        return { title: g.title, count: items.length, open, data: open ? items : [] }
      })
      .filter((s) => s.count > 0)
  }, [data, q, toggled])

  if (!data) return <Loading />
  const { doc, progress, course } = data
  const learned = [...progress.values()].filter((p) => p.learned).length
  const harmony = HARMONY_FOR[docId]

  const startCourse = async (perDay: number) => {
    if (perDay <= 0) await db.transaction('rw', db.courses, db.tombstones, () => removeRows('courses', [docId]))
    else await db.courses.put({ docId, perDay, startedAt: course?.startedAt ?? Date.now() })
    reload()
  }

  const header = (
    <View style={st.header}>
      <View style={st.gap6}>
        <T v="h1">{doc.title}</T>
        <T v="smallMuted">
          {doc.year ? `${doc.year} · ` : ''}
          {learned}/{doc.units.length} learned
          {doc.source.note ? ` · ${doc.source.note}` : ''}
        </T>
      </View>
      {harmony && <Button kind="default" title={harmony.label} onPress={() => router.push(`/harmony/${harmony.id}`)} />}

      {docId !== 'verses' && (
        <Card>
          <T>{course ? 'New units per day' : 'Memorise this in order'}</T>
          <Segmented
            options={(course ? [0, 1, 2, 3, 5] : [1, 2, 3]).map((n) => [n, n === 0 ? 'Stop' : `${n}/day`] as const)}
            value={course?.perDay}
            onChange={(n) => void startCourse(n)}
          />
        </Card>
      )}

      {doc.units.length > 12 && (
        <TextInput
          style={[st.search, { backgroundColor: c.surface, borderColor: c.line, color: c.text }]}
          placeholder="Filter…"
          placeholderTextColor={c.muted}
          value={filter}
          onChangeText={setFilter}
          clearButtonMode="while-editing"
          autoCorrect={false}
          accessibilityLabel="Filter"
        />
      )}

      {docId === 'verses' && <AddVerses have={new Set(doc.units.map((u) => u.id))} onAdded={reload} />}

      {doc.units.length === 0 && docId === 'verses' && (
        <T v="muted">No verses yet. Add a passage above. You can also open any proof text and choose &quot;Memorise this passage&quot;.</T>
      )}
    </View>
  )

  return (
    <>
      <Stack.Screen options={{ title: doc.short }} />
      <SectionList
        style={{ backgroundColor: c.bg }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        sections={sections}
        keyExtractor={(u) => u.id}
        ListHeaderComponent={header}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Pressable
            onPress={() => setToggled((t) => ({ ...t, [section.title]: !section.open }))}
            accessibilityRole="button"
            accessibilityState={{ expanded: section.open }}
            style={st.groupHead}>
            <Text style={[st.groupTitle, { color: c.text }]}>
              {section.open ? '▾' : '▸'} {section.title}
            </Text>
          </Pressable>
        )}
        renderItem={({ item, index, section }) => (
          <UnitRow unit={item} docId={docId} progress={progress.get(item.id)!} first={index === 0} last={index === section.data.length - 1} />
        )}
      />
    </>
  )
}

function UnitRow({ unit, docId, progress, first, last }: { unit: Unit; docId: string; progress: UnitProgress; first: boolean; last: boolean }) {
  const c = useColors()
  // A verse's prompt is its reference: show its opening words.
  const label = unit.prompt === unit.ref ? opening(unit.text) : unit.prompt.replace(/^WCF [\d.]+: /, '')
  return (
    <Pressable
      onPress={() => router.push(`/unit/${docId}/${unit.id}`)}
      accessibilityRole="link"
      style={({ pressed }) => [
        st.unit,
        { backgroundColor: pressed ? c.surface2 : c.surface, borderColor: c.line },
        first && st.unitFirst,
        last && st.unitLast,
        !first && { borderTopWidth: 0 },
      ]}>
      <Text style={[st.ref, { color: c.accent }]}>{unit.ref}</Text>
      <Text style={[st.unitText, { color: c.text }]}>{label}</Text>
      <Pips p={progress} />
    </Pressable>
  )
}

const opening = (text: string) => {
  const words = text.split(/\s+/)
  return words.length > 12 ? `${words.slice(0, 12).join(' ')}…` : text
}

export function Pips({ p }: { p: UnitProgress }) {
  const c = useColors()
  if (!p?.learned) return null
  return (
    <Row style={st.pips}>
      <View style={[st.pipBar, { backgroundColor: c.surface2 }]} accessibilityLabel={`${p.mature} of ${p.chunks} parts mature`}>
        <View style={{ height: '100%', width: `${(p.mature / Math.max(1, p.chunks)) * 100}%`, backgroundColor: c.ok }} />
      </View>
      {p.wholeUnlocked ? <Text style={{ color: c.ok, fontFamily: font.bold }}>✓</Text> : <Spacer />}
    </Row>
  )
}

const st = StyleSheet.create({
  header: { gap: 16, marginBottom: 8 },
  gap6: { gap: 6 },
  search: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, minHeight: 44, fontFamily: font.regular, fontSize: 16 },
  groupHead: { paddingTop: 16, paddingBottom: 8 },
  groupTitle: { fontFamily: font.bold, fontSize: 16 },
  unit: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderWidth: StyleSheet.hairlineWidth },
  unitFirst: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  unitLast: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  ref: { fontFamily: font.semibold, fontSize: 13, minWidth: 52 },
  unitText: { flex: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 21 },
  pips: { width: 44, gap: 4 },
  pipBar: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
})
