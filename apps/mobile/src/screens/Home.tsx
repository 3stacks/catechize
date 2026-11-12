import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { loadDoc, loadIndex } from '../../../../src/data/load.ts'
import { track } from '../../../../src/lib/track.ts'
import { db, getSettings, inTradition, saveSettings, type TraditionChoice } from '../../../../src/store/db.ts'
import { reviewQueue } from '../../../../src/store/queue.ts'
import { learnedToday } from '../../../../src/store/srs.ts'
import { loadStats, troubleSpots } from '../../../../src/store/stats.ts'
import { Bar, Button, Card, Link, Loading, Row, Screen, Section, Spacer, T, useScreenData } from '../components/ui.tsx'
import { font, useColors } from '../lib/theme.ts'

// The Today tab. The same content as src/views/Home.tsx.

export const isLordsDay = () => new Date().getDay() === 0
export const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)

async function loadHome() {
  const settings = await getSettings()
  const [index, queue, courses, trouble, stats] = await Promise.all([loadIndex(), reviewQueue(settings), db.courses.toArray(), troubleSpots(), loadStats()])
  const courseInfo = await Promise.all(
    courses.map(async (c) => {
      const doc = await loadDoc(c.docId)
      const learned = await db.learned.where('docId').equals(c.docId).count()
      const today = await learnedToday(c.docId)
      const learnedIds = new Set((await db.learned.where('docId').equals(c.docId).toArray()).map((l) => l.unitId))
      const next = doc.units.find((u) => !learnedIds.has(u.id))
      return { course: c, doc, learned, today, next }
    }),
  )
  return { index, due: queue.due, held: queue.held, courseInfo, settings, trouble, streak: stats.streak }
}

export function Home() {
  const c = useColors()
  const [data, , reload] = useScreenData(loadHome, [])
  if (!data) return <Loading />
  const { due, held, courseInfo, settings, trouble, streak } = data
  const dueChunks = due.reduce((n, u) => n + u.chunks.length + (u.whole ? 1 : 0), 0)
  const restDay = settings.lordsDayReviewOnly && isLordsDay()

  return (
    <Screen tab>
      <Card style={{ backgroundColor: c.accentSoft, borderColor: c.accentSoft }}>
        <Row>
          <T v="h1" style={st.flexShrink}>
            {greeting()}
          </T>
          <Spacer />
          {streak.days > 0 && (
            <Pressable
              onPress={() => router.navigate('/progress')}
              accessibilityLabel={`${streak.days} day streak. ${streak.today ? 'Reviewed today' : 'Review today to keep your streak'}`}
              style={[st.streak, { backgroundColor: streak.today ? c.accent : c.surface }]}>
              <Ionicons name="flame" size={15} color={streak.today ? c.accentInk : c.accent} />
              <Text style={[st.streakText, { color: streak.today ? c.accentInk : c.accent }]}>
                {streak.days} {streak.days === 1 ? 'day' : 'days'}
              </Text>
            </Pressable>
          )}
        </Row>
        {due.length ? (
          <>
            <T>
              <Text style={{ fontFamily: font.bold }}>{due.length}</Text> {due.length === 1 ? 'answer' : 'answers'} to review ({dueChunks} {dueChunks === 1 ? 'part' : 'parts'}).
            </T>
            <Button kind="primary" title="Start review" onPress={() => router.push('/review')} />
          </>
        ) : (
          <T>{held ? `Today's review limit is reached. ${held} more wait for tomorrow.` : 'Nothing due for review.'}</T>
        )}
        {trouble.length > 0 && (
          <T v="small">
            <Link onPress={() => router.push('/trouble')}>
              Practise {trouble.length} {trouble.length === 1 ? 'answer' : 'answers'} with trouble spots
            </Link>{' '}
            <Text style={{ color: c.muted }}>(does not change your schedule)</Text>
          </T>
        )}
      </Card>

      {!settings.tradition && <TraditionPicker onPick={reload} />}

      <Section title="Memorising">
        {restDay && <T v="smallMuted">Lord&apos;s Day: reviews only, no new material today.</T>}
        {courseInfo.length === 0 && (
          <Card>
            <T>Choose something to memorise. {starters(settings.tradition).length > 1 ? 'A catechism' : 'The catechism'} is a good place to start.</T>
            {starters(settings.tradition).map(([id, label]) => (
              <Button key={id} kind="primary" title={label} onPress={() => router.push(`/doc/${id}`)} />
            ))}
          </Card>
        )}
        {courseInfo.map(({ course, doc, learned, today, next }) => {
          const left = Math.max(0, course.perDay - today)
          return (
            <Card key={course.docId}>
              <Pressable onPress={() => router.push(`/doc/${doc.id}`)} accessibilityRole="link">
                <Row>
                  <T v="h3" style={st.flexShrink}>
                    {doc.title}
                  </T>
                  <Spacer />
                  <T v="smallMuted">
                    {learned}/{doc.units.length}
                  </T>
                </Row>
              </Pressable>
              <Bar value={learned / Math.max(1, doc.units.length)} />
              {next ? (
                <>
                  <T v="smallMuted">
                    Next: {next.ref} {truncate(next.prompt, 60)}
                  </T>
                  {restDay ? null : left > 0 ? (
                    <Button title={`Learn (${left} today)`} onPress={() => router.push(`/learn/${doc.id}`)} />
                  ) : (
                    <Button kind="ghost" title="Learn one more" onPress={() => router.push(`/learn/${doc.id}`)} />
                  )}
                </>
              ) : (
                <T v="smallMuted">Every unit learned. Reviews will keep it fresh.</T>
              )}
            </Card>
          )
        })}
      </Section>

      <Section title="Study">
        <Tile title="Apostles' and Nicene Creeds" sub="Phrase by phrase, with proof texts and hymns" onPress={() => router.push('/harmony/creeds')} />
        {inTradition('reformed', settings.tradition) && (
          <Tile title="The Ten Commandments" sub="In the Shorter, Larger and Heidelberg Catechisms" onPress={() => router.push('/harmony/decalogue')} />
        )}
        {inTradition('lutheran', settings.tradition) && (
          <Tile title="The Six Chief Parts" sub="Luther's Small Catechism: Commandments, Creed, Prayer and the Sacraments" onPress={() => router.push('/doc/lsc')} />
        )}
        <Tile title="My verses" sub="Scripture you have added from proof texts" onPress={() => router.push('/doc/verses')} />
      </Section>
    </Screen>
  )
}

function Tile({ title, sub, onPress }: { title: string; sub: string; onPress: () => void }) {
  const c = useColors()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      style={({ pressed }) => [st.tile, { backgroundColor: pressed ? c.surface2 : c.surface, borderColor: c.line }]}>
      <View style={st.flexShrink}>
        <Text style={[st.tileTitle, { color: c.text }]}>{title}</Text>
        <Text style={[st.tileSub, { color: c.muted }]}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.muted} />
    </Pressable>
  )
}

const starters = (t: TraditionChoice | undefined): [string, string][] =>
  t === 'lutheran'
    ? [['lsc', "Open Luther's Small Catechism"]]
    : t === 'reformed'
      ? [['wsc', 'Open the Shorter Catechism']]
      : [
          ['wsc', 'Westminster Shorter Catechism'],
          ['lsc', "Luther's Small Catechism"],
        ]

/** Asked once. Creeds and Scripture show either way; Settings can change it. */
function TraditionPicker({ onPick }: { onPick: () => void }) {
  const pick = async (tradition: TraditionChoice) => {
    await saveSettings({ tradition })
    track('Tradition chosen', { tradition })
    onPick()
  }
  return (
    <Card>
      <T v="h3">Which confessions do you hold?</T>
      <T v="smallMuted">This chooses the catechisms and confessions in your library. The creeds and Scripture are always there. You can change it in Settings.</T>
      <Button kind="primary" title="Reformed" onPress={() => pick('reformed')} />
      <Button kind="primary" title="Lutheran" onPress={() => pick('lutheran')} />
      <Button kind="ghost" title="Show both" onPress={() => pick('both')} />
      <T v="smallMuted">
        Reformed: Westminster Standards, Heidelberg Catechism, Belgic Confession, Canons of Dort. Lutheran: Luther&apos;s Small and Large Catechisms.
      </T>
    </Card>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (isLordsDay()) return "The Lord's Day"
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

const st = StyleSheet.create({
  flexShrink: { flexShrink: 1 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  streakText: { fontFamily: font.bold, fontSize: 14 },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 16 },
  tileTitle: { fontFamily: font.bold, fontSize: 16, lineHeight: 22 },
  tileSub: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, marginTop: 2 },
})
