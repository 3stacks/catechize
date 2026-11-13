// One import for each weight, so the app carries only these five font files.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular'
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium'
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold'
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold'
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold'
import { useFonts } from '@expo-google-fonts/inter/useFonts'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { ScrollView, Text } from 'react-native'
import { boot } from '../store/boot.ts'
import { font, useColors } from '../lib/theme.ts'

// Show the splash screen until the fonts and the learner's data load.
SplashScreen.preventAutoHideAsync().catch(() => {})

export default function Layout() {
  const c = useColors()
  const [loaded, failed] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold })
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string>()
  useEffect(() => {
    boot().then(
      () => setReady(true),
      (e: Error) => {
        // In a development build, show the stack: the message alone does not say which step failed.
        if (__DEV__) console.error(e)
        setError(__DEV__ ? `${e.message}\n\n${e.stack ?? ''}` : e.message)
      },
    )
  }, [])
  const shown = (loaded || failed) && (ready || error)
  useEffect(() => {
    if (shown) SplashScreen.hideAsync().catch(() => {})
  }, [shown])
  if (!shown) return null
  if (error)
    return (
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <Text selectable style={{ color: c.text, fontSize: 16, textAlign: 'center' }}>
          Hearers cannot open your data. {error}
        </Text>
      </ScrollView>
    )

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.accent,
          headerTitleStyle: { fontFamily: font.bold, color: c.text },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: c.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Today' }} />
        <Stack.Screen name="doc/[docId]" options={{ title: '' }} />
        <Stack.Screen name="unit/[docId]/[unitId]" options={{ title: '' }} />
        <Stack.Screen name="harmony/[id]" options={{ title: '' }} />
        <Stack.Screen name="review" options={{ title: 'Review', gestureEnabled: true }} />
        <Stack.Screen name="trouble" options={{ title: 'Trouble spots' }} />
        <Stack.Screen name="learn/[docId]" options={{ title: 'Learn' }} />
        <Stack.Screen name="add/[id]" options={{ title: 'My verses' }} />
      </Stack>
    </>
  )
}
