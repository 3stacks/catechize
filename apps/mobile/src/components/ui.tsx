import { useCallback, useEffect, useRef, type DependencyList, type ReactNode } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDataVersion } from '../../../../src/store/sync.ts'
import { useAsync } from '../../../../src/useAsync.ts'
import { font, useColors } from '../lib/theme.ts'

// The building blocks of the screens. They follow the classes of the web app
// (src/styles.css): cards, buttons, segmented controls, lists and badges.

/**
 * Load a screen's data. It loads again when sync brings new data, and when the
 * screen comes back into view (for example after a drill).
 */
export function useScreenData<T>(fn: () => Promise<T>, deps: DependencyList) {
  const v = useDataVersion()
  const [value, error, reload] = useAsync(fn, [...deps, v])
  const reloadRef = useRef(reload)
  useEffect(() => {
    reloadRef.current = reload
  })
  const first = useRef(true)
  useFocusEffect(
    useCallback(() => {
      if (first.current) first.current = false
      else reloadRef.current()
    }, []),
  )
  return [value, error, reload] as const
}

/** A screen that scrolls. Tab screens leave the bottom inset to the tab bar. */
export function Screen({ children, tab = false, style }: { children: ReactNode; tab?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = useColors()
  const insets = useSafeAreaInsets()
  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[s.screen, { paddingBottom: (tab ? 0 : insets.bottom) + 32 }, style]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag">
      {children}
    </ScrollView>
  )
}

export function Loading() {
  const c = useColors()
  return (
    <View style={[s.center, { backgroundColor: c.bg }]}>
      <ActivityIndicator color={c.muted} />
    </View>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  const c = useColors()
  return (
    <View style={[s.center, { backgroundColor: c.bg }]}>
      <Text style={[s.body, { color: c.muted, textAlign: 'center' }]}>{children}</Text>
    </View>
  )
}

type Variant = 'body' | 'muted' | 'small' | 'smallMuted' | 'h1' | 'h2' | 'h3' | 'label'

/** Text in one of the app's styles. */
export function T({ v = 'body', style, children, ...rest }: TextProps & { v?: Variant; style?: StyleProp<TextStyle> }) {
  const c = useColors()
  const colour = v === 'muted' || v === 'smallMuted' || v === 'label' ? c.muted : c.text
  const header = v === 'h1' || v === 'h2' || v === 'h3'
  return (
    <Text style={[s[v], { color: colour }, style]} accessibilityRole={header ? 'header' : undefined} {...rest}>
      {children}
    </Text>
  )
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors()
  return <View style={[s.card, { backgroundColor: c.surface, borderColor: c.line }, style]}>{children}</View>
}

/** A titled part of a screen. */
export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      {title ? <T v="h2">{title}</T> : null}
      {children}
    </View>
  )
}

export function Row({ children, style, wrap }: { children: ReactNode; style?: StyleProp<ViewStyle>; wrap?: boolean }) {
  return <View style={[s.row, wrap && s.wrap, style]}>{children}</View>
}

export const Spacer = () => <View style={s.flex} />

interface ButtonProps {
  title: string
  onPress: () => void
  kind?: 'primary' | 'default' | 'ghost'
  small?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

export function Button({ title, onPress, kind = 'default', small, disabled, style, accessibilityLabel }: ButtonProps) {
  const c = useColors()
  const bg = kind === 'primary' ? c.accent : kind === 'default' ? c.surface : 'transparent'
  const fg = kind === 'primary' ? c.accentInk : c.accent
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        s.button,
        small && s.buttonSmall,
        { backgroundColor: bg, borderColor: kind === 'default' ? c.line : 'transparent', opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
        style,
      ]}>
      <Text style={[s.buttonText, small && s.buttonTextSmall, { color: fg }]}>{title}</Text>
    </Pressable>
  )
}

/** A text that works as a link. */
export function Link({ children, onPress, style }: { children: ReactNode; onPress: () => void; style?: StyleProp<TextStyle> }) {
  const c = useColors()
  return (
    <Text accessibilityRole="link" onPress={onPress} style={[{ color: c.accent, fontFamily: font.medium }, style]}>
      {children}
    </Text>
  )
}

export function Segmented<V extends string | number>({ options, value, onChange }: { options: readonly (readonly [V, string])[]; value: V | undefined; onChange: (v: V) => void }) {
  const c = useColors()
  return (
    <View style={[s.segmented, { backgroundColor: c.surface2, borderColor: c.line }]} accessibilityRole="radiogroup">
      {options.map(([v, label]) => {
        const on = v === value
        return (
          <Pressable
            key={String(v)}
            onPress={() => onChange(v)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={[s.segment, on && { backgroundColor: c.surface, borderColor: c.line }]}>
            <Text style={[s.segmentText, { color: on ? c.text : c.muted, fontFamily: on ? font.semibold : font.medium }]}>{label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** A list in a card, one row for each item. */
export function List({ children }: { children: ReactNode }) {
  const c = useColors()
  return <View style={[s.list, { backgroundColor: c.surface, borderColor: c.line }]}>{children}</View>
}

export function ListItem({ children, onPress, first }: { children: ReactNode; onPress?: () => void; first?: boolean }) {
  const c = useColors()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [s.listItem, !first && { borderTopColor: c.line, borderTopWidth: StyleSheet.hairlineWidth }, pressed && onPress && { backgroundColor: c.surface2 }]}>
      {children}
      {onPress ? <Text style={[s.chevron, { color: c.muted }]}>›</Text> : null}
    </Pressable>
  )
}

export function Badge({ children }: { children: ReactNode }) {
  const c = useColors()
  return (
    <View style={[s.badge, { backgroundColor: c.accentSoft }]}>
      <Text style={[s.badgeText, { color: c.accent }]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  )
}

/** A progress bar, 0 to 1. */
export function Bar({ value, style }: { value: number; style?: StyleProp<ViewStyle> }) {
  const c = useColors()
  return (
    <View style={[s.bar, { backgroundColor: c.surface2 }, style]}>
      <View style={[s.barFill, { backgroundColor: c.accent, width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }]} />
    </View>
  )
}

export const s = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  screen: { padding: 16, gap: 20 },
  section: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrap: { flexWrap: 'wrap' },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 24 },
  muted: { fontFamily: font.regular, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  smallMuted: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6, textTransform: 'uppercase' },
  h1: { fontFamily: font.heavy, fontSize: 28, lineHeight: 34 },
  h2: { fontFamily: font.heavy, fontSize: 21, lineHeight: 26 },
  h3: { fontFamily: font.bold, fontSize: 18, lineHeight: 24 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 16, gap: 10 },
  button: { minHeight: 44, paddingHorizontal: 16, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  buttonSmall: { minHeight: 34, paddingHorizontal: 10 },
  buttonText: { fontFamily: font.semibold, fontSize: 16 },
  buttonTextSmall: { fontSize: 14 },
  segmented: { flexDirection: 'row', borderRadius: 10, padding: 3, borderWidth: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  segment: { flex: 1, minHeight: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent', paddingHorizontal: 4 },
  segmentText: { fontSize: 14 },
  list: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 52 },
  chevron: { fontSize: 22, lineHeight: 24, marginLeft: 4 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, minWidth: 52, alignItems: 'center' },
  badgeText: { fontFamily: font.bold, fontSize: 12 },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
})
