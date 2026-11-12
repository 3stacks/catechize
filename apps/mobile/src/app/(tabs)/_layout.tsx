import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router'
import type { ComponentProps } from 'react'
import type { ColorValue } from 'react-native'
import { font, useColors } from '../../lib/theme.ts'

type Icon = ComponentProps<typeof Ionicons>['name']

function icon(name: Icon) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={String(color)} size={size} />
  }
}

// The four parts of the web app's top bar, as tabs.
export default function TabsLayout() {
  const c = useColors()
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerTitleStyle: { fontFamily: font.heavy, color: c.text, fontSize: 20 },
        headerShadowVisible: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line },
        tabBarLabelStyle: { fontFamily: font.medium },
        sceneStyle: { backgroundColor: c.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today', headerTitle: 'Hearers', tabBarIcon: icon('sunny-outline') }} />
      <Tabs.Screen name="library" options={{ title: 'Library', tabBarIcon: icon('library-outline') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('stats-chart-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings-outline') }} />
    </Tabs>
  )
}
