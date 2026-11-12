import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { loadIndex } from '../../../../src/data/load.ts'
import type { DocKind } from '../../../../src/data/types.ts'
import { db, getSettings, inTradition } from '../../../../src/store/db.ts'
import { Badge, Link, List, ListItem, Loading, Screen, Section, T, useScreenData } from '../components/ui.tsx'
import { font, useColors } from '../lib/theme.ts'

// The Library tab. The same content as src/views/Library.tsx.

const SECTIONS: [DocKind, string][] = [
  ['catechism', 'Catechisms'],
  ['confession', 'Confessions'],
  ['creed', 'Creeds'],
  ['law', 'The Law'],
]

export function Library() {
  const [data] = useScreenData(async () => ({ index: await loadIndex(), verses: await db.verses.count(), settings: await getSettings() }), [])
  if (!data) return <Loading />
  const { verses, settings } = data
  const t = settings.tradition
  const docs = data.index.docs.filter((d) => inTradition(d.tradition, t))
  const harmonies = data.index.harmonies.filter((h) => inTradition(h.tradition, t))
  return (
    <Screen tab>
      {t && t !== 'both' && (
        <T v="smallMuted">
          Showing {t === 'reformed' ? 'Reformed' : 'Lutheran'} confessions, with the creeds and Scripture.{' '}
          <Link onPress={() => router.navigate('/settings')}>Change</Link>
        </T>
      )}
      {SECTIONS.filter(([kind]) => docs.some((d) => d.kind === kind)).map(([kind, title]) => (
        <Section key={kind} title={title}>
          <List>
            {docs
              .filter((d) => d.kind === kind)
              .map((d, i) => (
                <ListItem key={d.id} first={i === 0} onPress={() => router.push(`/doc/${d.id}`)}>
                  <Badge>{d.short}</Badge>
                  <Item title={d.title} sub={`${d.year ? `${d.year} · ` : ''}${d.unitCount} ${unitWord(kind, d.unitCount)}`} />
                </ListItem>
              ))}
          </List>
        </Section>
      ))}
      <Section title="Scripture">
        <List>
          <ListItem first onPress={() => router.push('/doc/verses')}>
            <Badge>KJV</Badge>
            <Item title="My verses" sub={`${verses} added`} />
          </ListItem>
        </List>
      </Section>
      <Section title="Harmonies">
        <List>
          {harmonies.map((h, i) => (
            <ListItem key={h.id} first={i === 0} onPress={() => router.push(`/harmony/${h.id}`)}>
              <Badge>≡</Badge>
              <Item title={h.title} />
            </ListItem>
          ))}
        </List>
      </Section>
    </Screen>
  )
}

function Item({ title, sub }: { title: string; sub?: string }) {
  const c = useColors()
  return (
    <View style={st.grow}>
      <Text style={[st.title, { color: c.text }]}>{title}</Text>
      {sub ? <Text style={[st.sub, { color: c.muted }]}>{sub}</Text> : null}
    </View>
  )
}

function unitWord(kind: DocKind, n: number) {
  const w = kind === 'catechism' ? 'question' : kind === 'confession' ? 'section' : kind === 'law' ? 'text' : 'part'
  return n === 1 ? w : w + 's'
}

const st = StyleSheet.create({
  grow: { flex: 1 },
  title: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22 },
  sub: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, marginTop: 1 },
})
