import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { loadIndex } from '../../../../src/data/load.ts'
import { dayKey, loadStats, startOfDay } from '../../../../src/store/stats.ts'
import { Card, Link, List, ListItem, Loading, Screen, T, useScreenData } from '../components/ui.tsx'
import { font, useColors } from '../lib/theme.ts'

// The Progress tab. The same numbers as src/views/StatsView.tsx.

const WEEKS = 26

export function StatsView() {
  const c = useColors()
  const [data] = useScreenData(async () => ({ stats: await loadStats(), index: await loadIndex() }), [])
  if (!data) return <Loading />
  const { stats: s, index } = data
  const rate = s.retention.rate

  return (
    <Screen tab>
      <View style={st.tiles}>
        <Tile value={s.streak.days} label="day streak" sub={s.streak.today ? 'Done today' : s.streak.days ? 'Review today to keep it' : `Longest: ${s.longest}`} />
        <Tile value={s.learned} label="answers learned" sub={`${s.whole} ready to recite whole`} />
        <Tile value={s.chunks ? `${Math.round((s.mature / s.chunks) * 100)}%` : '–'} label="parts mature" sub={`${s.mature} of ${s.chunks} parts at 21+ days`} />
        <Tile value={rate === undefined ? '–' : `${Math.round(rate * 100)}%`} label="recall, 30 days" sub={`${s.retention.pass} of ${s.retention.total} reviews`} />
      </View>

      <Card>
        <T v="h3">Activity</T>
        <Heatmap days={s.days} />
        <T v="smallMuted">
          {s.reviews} reviews in total. Longest streak: {s.longest} {s.longest === 1 ? 'day' : 'days'}.
        </T>
      </Card>

      <Card>
        <T v="h3">Coming up</T>
        <Forecast counts={s.forecast} />
        <T v="smallMuted">Answers due on each of the next 14 days, today in bold. Today includes anything overdue.</T>
      </Card>

      {s.leeches > 0 && (
        <Card>
          <T v="h3">Trouble spots</T>
          <T>
            {s.leeches} {s.leeches === 1 ? 'part keeps' : 'parts keep'} slipping. <Link onPress={() => router.push('/trouble')}>Drill them</Link>, or add a memory aid to the answer.
          </T>
        </Card>
      )}

      {s.byDoc.size > 0 && (
        <View style={st.gap}>
          <T v="h3">By document</T>
          <List>
            {[...s.byDoc].map(([docId, d], i) => {
              const doc = index.docs.find((x) => x.id === docId)
              return (
                <ListItem key={docId} first={i === 0} onPress={() => router.push(`/doc/${docId}`)}>
                  <View style={st.grow}>
                    <Text style={[st.docTitle, { color: c.text }]}>{doc?.title ?? (docId === 'verses' ? 'My verses' : docId)}</Text>
                    <Text style={[st.docSub, { color: c.muted }]}>
                      Learned {d.learned}
                      {doc ? ` / ${doc.unitCount}` : ''} · mature parts {d.mature} / {d.chunks}
                    </Text>
                  </View>
                </ListItem>
              )
            })}
          </List>
        </View>
      )}
    </Screen>
  )
}

function Tile({ value, label, sub }: { value: React.ReactNode; label: string; sub: string }) {
  const c = useColors()
  return (
    <View style={[st.tile, { backgroundColor: c.surface, borderColor: c.line }]}>
      <Text style={[st.value, { color: c.text }]}>{value}</Text>
      <Text style={[st.label, { color: c.text }]}>{label}</Text>
      <Text style={[st.sub, { color: c.muted }]}>{sub}</Text>
    </View>
  )
}

/** Reviews per day for the last 26 weeks, one column per week, Sunday at the top. */
function Heatmap({ days }: { days: Map<string, number> }) {
  const c = useColors()
  const today = startOfDay()
  const end = new Date(today)
  end.setDate(end.getDate() + (6 - end.getDay())) // the Saturday of this week
  const weeks: { key: string; n: number; future: boolean }[][] = []
  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    const key = dayKey(d.getTime())
    const w = Math.floor((WEEKS * 7 - 1 - i) / 7)
    ;(weeks[w] ??= []).push({ key, n: days.get(key) ?? 0, future: d.getTime() > today })
  }
  const max = Math.max(1, ...weeks.flat().map((x) => x.n))
  // Four steps of one hue, light to dark; empty days are the surface tint.
  const level = (n: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)))
  const alpha = ['', '55', '88', 'bb', 'ff']
  return (
    <View style={st.heatmap} accessibilityRole="image" accessibilityLabel={`Reviews per day over the last ${WEEKS} weeks`}>
      {weeks.map((week, w) => (
        <View key={w} style={st.week}>
          {week.map((d) => {
            const l = level(d.n)
            return <View key={d.key} style={[st.cell, { backgroundColor: d.future ? 'transparent' : l === 0 ? c.surface2 : c.accent + alpha[l] }]} />
          })}
        </View>
      ))}
    </View>
  )
}

function Forecast({ counts }: { counts: number[] }) {
  const c = useColors()
  const max = Math.max(1, ...counts)
  const label = (i: number) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toLocaleDateString(undefined, { weekday: 'narrow' })
  }
  return (
    <View style={st.forecast} accessibilityRole="image" accessibilityLabel={`Answers due: ${counts.map((n, i) => `${i === 0 ? 'today' : `day ${i}`} ${n}`).join(', ')}`}>
      {counts.map((n, i) => (
        <View key={i} style={st.fcCol}>
          <Text style={[st.fcN, { color: c.muted }]}>{n || ''}</Text>
          <View style={st.fcTrack}>
            <View style={[st.fcBar, { height: `${(n / max) * 100}%`, backgroundColor: c.accent }]} />
          </View>
          <Text style={[st.fcDay, { color: i === 0 ? c.text : c.muted, fontFamily: i === 0 ? font.bold : font.regular }]}>{label(i)}</Text>
        </View>
      ))}
    </View>
  )
}

const st = StyleSheet.create({
  gap: { gap: 10 },
  grow: { flex: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexGrow: 1, flexBasis: '45%', borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 14, gap: 2 },
  value: { fontFamily: font.heavy, fontSize: 28, lineHeight: 34 },
  label: { fontFamily: font.semibold, fontSize: 14 },
  sub: { fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  heatmap: { flexDirection: 'row', gap: 2, justifyContent: 'space-between' },
  week: { flex: 1, gap: 2 },
  cell: { aspectRatio: 1, borderRadius: 2 },
  forecast: { flexDirection: 'row', gap: 4, height: 120 },
  fcCol: { flex: 1, alignItems: 'center' },
  fcN: { fontFamily: font.medium, fontSize: 10, height: 14 },
  fcTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  fcBar: { width: '100%', borderRadius: 3, minHeight: 2 },
  fcDay: { fontSize: 12, marginTop: 4 },
  docTitle: { fontFamily: font.semibold, fontSize: 15 },
  docSub: { fontFamily: font.regular, fontSize: 13, marginTop: 2 },
})
