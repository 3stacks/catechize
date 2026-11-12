import Constants from 'expo-constants'
import { useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { loadIndex } from '../../../../src/data/load.ts'
import { track } from '../../../../src/lib/track.ts'
import { db, getSettings, saveSettings, type Settings } from '../../../../src/store/db.ts'
import { getToken, setToken, syncNow, useSyncState } from '../../../../src/store/sync.ts'
import { backupSummary, parseBackup, restore, reviewsCsv, takeout } from '../../../../src/store/takeout.ts'
import { useAsync } from '../../../../src/useAsync.ts'
import { Button, Card, Link, Loading, Row, Screen, Segmented, Spacer, T, useScreenData } from '../components/ui.tsx'
import { confirm } from '../lib/confirm.ts'
import { openFile, saveFile } from '../lib/files.ts'
import { open } from '../lib/open.ts'
import { canRemind, disableReminders, enableReminders, reminderHour } from '../lib/reminders.ts'
import { checkServerUrl, serverUrl, setServerUrl } from '../lib/server.ts'
import { font, useColors } from '../lib/theme.ts'

// The Settings tab. The same settings as src/views/SettingsView.tsx. The
// reminder, the sync server and the backup files work in the ways of a phone.

const KOFI = 'https://ko-fi.com/lukeboyle'

export function SettingsView() {
  const [loaded, , reload] = useScreenData(async () => ({ settings: await getSettings(), index: await loadIndex() }), [])
  if (!loaded) return <Loading />
  const { settings: s, index } = loaded
  const set = async (patch: Partial<Settings>) => {
    await saveSettings(patch)
    reload()
  }

  return (
    <Screen tab>
      <Card>
        <T v="h3">Tradition</T>
        <Segmented
          options={[
            ['reformed', 'Reformed'],
            ['lutheran', 'Lutheran'],
            ['both', 'Both'],
          ]}
          value={s.tradition}
          onChange={(tradition) => void set({ tradition })}
        />
        <T v="smallMuted">Chooses the catechisms and confessions in your library. The creeds and Scripture are always there. Progress you have made elsewhere stays in your reviews.</T>
      </Card>

      <Card>
        <T v="h3">Typing</T>
        <Segmented
          options={[
            ['first-letter', 'First letters'],
            ['full-word', 'Whole words'],
          ]}
          value={s.inputMode}
          onChange={(inputMode) => void set({ inputMode })}
        />
        <T v="smallMuted">First letters is fast and works well on a phone: type “m c e i t g G” for “Man&apos;s chief end is to glorify God”. Whole words is stricter.</T>
      </Card>

      <Card>
        <T v="h3">Target recall</T>
        <Segmented options={[0.85, 0.9, 0.95].map((r) => [r, `${Math.round(r * 100)}%`] as const)} value={s.retention} onChange={(retention) => void set({ retention })} />
        <T v="smallMuted">Higher means more frequent reviews. 90% suits most people.</T>
      </Card>

      <Card>
        <Toggle value={s.fade} onChange={(fade) => void set({ fade })} label="Fade stage when learning: type the text with half the words hidden before the full test" />
        <Toggle value={s.lordsDayReviewOnly} onChange={(lordsDayReviewOnly) => void set({ lordsDayReviewOnly })} label="Reviews only on the Lord's Day (no new material on Sundays)" />
      </Card>

      <Card>
        <T v="h3">Daily review limit</T>
        <Segmented options={[0, 20, 40, 80].map((n) => [n, n === 0 ? 'None' : String(n)] as const)} value={s.dailyReviewLimit} onChange={(dailyReviewLimit) => void set({ dailyReviewLimit })} />
        <T v="smallMuted">The most answers to review in one day. After a break, a limit spreads the backlog over a few days. The most overdue come first.</T>
      </Card>

      {canRemind && <ReminderCard />}

      <SyncCard />

      <DataCard onImported={reload} />

      {/* The App Store does not allow a link to outside payments, so iOS does not show this card. */}
      {Platform.OS !== 'ios' && (
        <Card>
          <T v="h3">Support Hearers</T>
          <T v="smallMuted">Hearers is free, with no ads. Your answers and progress stay on your device. If it helps you, you can buy me a coffee.</T>
          <Button title="Support on Ko-fi" onPress={() => open(KOFI)} />
        </Card>
      )}

      <View style={st.gap}>
        <T v="h3">Sources</T>
        {index.docs.map((d) => (
          <T key={d.id} v="small">
            <Text style={{ fontFamily: font.semibold }}>{d.title}</Text>: {d.source.url ? <Link onPress={() => open(d.source.url!)}>{d.source.name}</Link> : d.source.name} ({d.source.license}).
            {d.source.note ? ` ${d.source.note}` : ''}
          </T>
        ))}
        <T v="small">
          <Text style={{ fontFamily: font.semibold }}>Scripture</Text>: King James Version (1769), public domain, via scrollmapper/bible_databases.
        </T>
        <T v="smallMuted">
          Data built {new Date(index.builtAt).toLocaleString()}. App version {Constants.expoConfig?.version ?? '–'}.
        </T>
      </View>
    </Screen>
  )
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const c = useColors()
  return (
    <Row style={st.toggle}>
      <T style={st.flex}>{label}</T>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.accent }} accessibilityLabel={label} />
    </Row>
  )
}

const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

/** A daily notification when answers are due. Local to this device: no server. */
function ReminderCard() {
  const c = useColors()
  const [hour, setHour] = useState(reminderHour)
  const [pick, setPick] = useState(hour ?? 8)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const turnOn = async (h: number) => {
    setBusy(true)
    setError(undefined)
    const e = await enableReminders(h).catch((err: Error) => err.message)
    setBusy(false)
    if (e) setError(e)
    else setHour(h)
  }

  return (
    <Card>
      <T v="h3">Daily reminder</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.hours}>
        {Array.from({ length: 24 }, (_, h) => (
          <Pressable
            key={h}
            disabled={busy}
            onPress={() => {
              setPick(h)
              if (hour !== undefined) void turnOn(h)
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: pick === h }}
            style={[st.hour, { borderColor: pick === h ? c.accent : c.line, backgroundColor: pick === h ? c.accentSoft : c.surface }]}>
            <Text style={{ color: pick === h ? c.accent : c.text, fontFamily: font.medium }}>{hourLabel(h)}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {hour === undefined ? (
        <Button kind="primary" disabled={busy} title="Turn on" onPress={() => void turnOn(pick)} />
      ) : (
        <Button
          kind="ghost"
          disabled={busy}
          title="Turn off"
          onPress={async () => {
            setBusy(true)
            await disableReminders()
            setBusy(false)
            setHour(undefined)
          }}
        />
      )}
      <T v="smallMuted">
        {hour === undefined
          ? 'Get a notification at this time on days with answers to review.'
          : `On. You get a notification at ${hourLabel(hour)} on days with answers to review.`}{' '}
        The phone makes the reminder. It sends nothing to a server.
      </T>
      {error && <T v="small" style={{ color: c.again }}>{error}</T>}
    </Card>
  )
}

/** Sync with a self-hosted Hearers server, with the same protocol as the web app. */
function SyncCard() {
  const c = useColors()
  const sync = useSyncState()
  const [url, setUrl] = useState(serverUrl)
  const [saved, setSaved] = useState(serverUrl)
  const [token, setTokenInput] = useState(getToken)
  const [error, setError] = useState<string>()
  // Sync stays quiet when the server does not answer, so check the address here.
  const [reached] = useAsync(
    async () => (saved ? fetch(`${saved}/api/health`, { headers: { Accept: 'application/json' } }).then((r) => r.ok, () => false) : undefined),
    [saved, sync.kind],
  )

  const save = () => {
    const e = checkServerUrl(url.trim())
    setError(e)
    if (e) return
    setServerUrl(url)
    setSaved(serverUrl())
  }

  const status =
    !saved || sync.kind === 'off'
      ? saved
        ? 'The app cannot find a Hearers server at this address.'
        : 'No server. Your progress stays on this device.'
      : reached === false
        ? 'The app cannot reach this address. Check the address and the connection.'
        : sync.kind === 'locked'
        ? 'The server needs its access token before it syncs.'
        : sync.kind === 'syncing'
          ? 'Syncing…'
          : sync.error
            ? `Sync failed: ${sync.error}. It tries again soon.`
            : sync.at
              ? `Progress syncs to the server. Last sync ${new Date(sync.at).toLocaleTimeString()}.`
              : 'The app looks for the server…'

  return (
    <Card>
      <T v="h3">Sync</T>
      <T v="smallMuted">To sync your progress between devices, run your own Hearers server. Then type its address here. The address must start with https://.</T>
      <TextInput
        style={[st.input, { backgroundColor: c.bg, borderColor: c.line, color: c.text }]}
        value={url}
        onChangeText={setUrl}
        placeholder="https://hearers.example.org"
        placeholderTextColor={c.muted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        returnKeyType="done"
        onSubmitEditing={save}
        accessibilityLabel="Server address"
      />
      {error && <T v="small" style={{ color: c.again }}>{error}</T>}
      <Row wrap>
        <Button kind="primary" title="Save" onPress={save} disabled={url.trim().replace(/\/+$/, '') === saved} />
        {saved ? (
          <Button
            kind="ghost"
            title="Stop sync"
            onPress={() => {
              setUrl('')
              setServerUrl('')
              setSaved('')
            }}
          />
        ) : null}
        <Spacer />
        {saved && sync.kind !== 'off' && sync.kind !== 'locked' ? <Button kind="ghost" disabled={sync.kind === 'syncing'} title="Sync now" onPress={() => void syncNow()} /> : null}
      </Row>
      <T v="small">{status}</T>
      {saved && sync.kind === 'locked' && (
        <Row>
          <TextInput
            style={[st.input, st.flex, { backgroundColor: c.bg, borderColor: c.line, color: c.text }]}
            value={token}
            onChangeText={setTokenInput}
            placeholder="Access token"
            placeholderTextColor={c.muted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => setToken(token.trim())}
            accessibilityLabel="Access token"
          />
          <Button kind="primary" title="Save" onPress={() => setToken(token.trim())} />
        </Row>
      )}
    </Card>
  )
}

/** Data takeout: share everything, or the review history for a spreadsheet, and import a backup. */
function DataCard({ onImported }: { onImported: () => void }) {
  const c = useColors()
  const [msg, setMsg] = useState<{ text: string; error?: boolean }>()
  const day = () => new Date().toISOString().slice(0, 10)
  const attempt = async (f: () => Promise<void>) => {
    try {
      await f()
    } catch (err) {
      setMsg({ text: (err as Error).message, error: true })
    }
  }

  return (
    <Card>
      <T v="h3">Your data</T>
      <T v="smallMuted">
        Your data is yours. Save all of it at any time: progress, review history, your verses, memory aids and settings. The file is the same as the web app&apos;s. To move to another device, import the file there.
      </T>
      <Button
        title="Save all data"
        onPress={() =>
          attempt(async () => {
            await saveFile(`hearers-${day()}.json`, 'application/json', JSON.stringify(await takeout()))
            track('Data downloaded', { kind: 'json' })
            setMsg({ text: 'Saved.' })
          })
        }
      />
      <Button
        kind="ghost"
        title="Review history (CSV)"
        onPress={() =>
          attempt(async () => {
            await saveFile(`hearers-reviews-${day()}.csv`, 'text/csv', reviewsCsv(await db.log.toArray()))
            track('Data downloaded', { kind: 'csv' })
            setMsg({ text: 'Saved.' })
          })
        }
      />
      <Button
        kind="ghost"
        title="Import data"
        onPress={() =>
          attempt(async () => {
            const text = await openFile()
            if (text === undefined) return
            const backup = parseBackup(text)
            const n = backupSummary(backup)
            const when = n.at ? ` from ${new Date(n.at).toLocaleDateString()}` : ''
            const ok = await confirm(
              'Import',
              `Replace all data on this device with the backup${when}? It has ${n.learned} answers learned, ${n.reviews} reviews and ${n.verses} verses.`,
              'Replace',
            )
            if (!ok) return
            await restore(backup)
            track('Data imported')
            setMsg({ text: 'Imported.' })
            onImported()
          })
        }
      />
      {msg && <T v="small" style={{ color: msg.error ? c.again : c.muted }}>{msg.text}</T>}
    </Card>
  )
}

const st = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 8 },
  toggle: { gap: 12, paddingVertical: 4 },
  hours: { gap: 6, paddingVertical: 2 },
  hour: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, minHeight: 44, fontFamily: font.regular, fontSize: 16 },
})
