import { router, Stack } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { loadHarmony } from '../../../../src/data/load.ts'
import { bookByOsis } from '../../../../src/lib/books.ts'
import { formatPassage, passageFromId } from '../../../../src/lib/refs.ts'
import { useAsync } from '../../../../src/useAsync.ts'
import { Link, Loading, Screen, Section, T } from '../components/ui.tsx'
import { font, useColors } from '../lib/theme.ts'
import { ProofSheet, type SheetContent } from './ProofSheet.tsx'

// A harmony: phrases or units side by side across documents. The same content
// as src/views/HarmonyView.tsx. A phone is too narrow for the web app's table,
// so each row is a card: the first column on top, the other columns below it.

export function HarmonyView({ id }: { id: string }) {
  const c = useColors()
  const [h] = useAsync(() => loadHarmony(id), [id])
  const [sheet, setSheet] = useState<SheetContent>()
  if (!h) return <Loading />
  const [first, ...others] = h.columns

  return (
    <Screen>
      <Stack.Screen options={{ title: id === 'creeds' ? 'Creeds' : 'Commandments' }} />
      <View style={st.gap}>
        <T v="h1">{h.title}</T>
        {h.description && <T v="muted">{h.description}</T>}
      </View>
      {h.sections.map((s) => (
        <Section key={s.title} title={s.title}>
          {s.rows.map((r, i) => (
            <View key={i} style={[st.row, { backgroundColor: c.surface, borderColor: c.line }]}>
              {r.cells[first.key]?.map((cell) => (
                <Pressable key={cell.unitId + (cell.span?.join() ?? '')} onPress={() => router.push(`/unit/${first.docId}/${cell.unitId}`)} accessibilityRole="link">
                  <Text style={[st.first, { color: c.text }]}>{cell.text}</Text>
                </Pressable>
              ))}
              {others.map((col) =>
                r.cells[col.key]?.length ? (
                  <View key={col.key} style={st.other}>
                    <Text style={[st.colLabel, { color: c.muted }]}>{col.label}</Text>
                    <View style={st.cells}>
                      {r.cells[col.key].map((cell) => {
                        // Phrases read as text; whole-unit references are compact chips ("Q. 45").
                        const prose = !!cell.span
                        return (
                          <Pressable
                            key={cell.unitId + (cell.span?.join() ?? '')}
                            onPress={() => router.push(`/unit/${col.docId}/${cell.unitId}`)}
                            accessibilityRole="link"
                            accessibilityLabel={cell.text}
                            style={prose ? st.prose : [st.chip, { backgroundColor: c.accentSoft }]}>
                            <Text style={prose ? [st.proseText, { color: c.text }] : [st.chipText, { color: c.accent }]}>
                              {prose ? cell.text : cell.text.split(' ').slice(0, 2).join(' ')}
                            </Text>
                          </Pressable>
                        )
                      })}
                    </View>
                  </View>
                ) : null,
              )}
              {(r.refs?.length || r.hymn) && id === 'creeds' ? (
                <View style={[st.meta, { borderTopColor: c.line }]}>
                  {r.refs?.length ? (
                    <Link onPress={() => setSheet({ phrase: Object.values(r.cells).flat()[0]?.text ?? '', refs: r.refs!, hymn: r.hymn })} style={st.small}>
                      {r.refs.map((x) => short(x)).join('; ')}
                    </Link>
                  ) : null}
                  {r.hymn && <T v="smallMuted">♪ {r.hymn}</T>}
                </View>
              ) : null}
            </View>
          ))}
          {id === 'decalogue' && <T v="smallMuted">Each row&apos;s Deuteronomy 5 parallel is on the commandment&apos;s page.</T>}
        </Section>
      ))}
      <ProofSheet content={sheet} onClose={() => setSheet(undefined)} />
    </Screen>
  )
}

/** Compact reference using the OSIS abbreviation: "Jas 2:19", "1 Pet 3:21". */
function short(id: string) {
  const p = passageFromId(id)
  if (!p) return id
  const abbr = p.book.replace(/^(\d)/, '$1 ')
  return formatPassage(p).replace(bookByOsis(p.book).name, abbr)
}

const st = StyleSheet.create({
  gap: { gap: 6 },
  row: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 14, gap: 10 },
  first: { fontFamily: font.semibold, fontSize: 16, lineHeight: 23 },
  other: { gap: 4 },
  colLabel: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  cells: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  prose: { width: '100%' },
  proseText: { fontFamily: font.regular, fontSize: 15, lineHeight: 22 },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontFamily: font.semibold, fontSize: 13 },
  meta: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, gap: 4 },
  small: { fontSize: 14 },
})
