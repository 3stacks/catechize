import { useColorScheme } from 'react-native'

// The colours of the web app (src/styles.css). The web app gives some of them
// in oklch. These are the same colours in sRGB.
const light = {
  bg: '#f8fafc',
  surface: '#ffffff',
  surface2: '#f1f5f9',
  text: '#0f172a',
  muted: '#64748b',
  line: '#e2e8f0',
  accent: '#883231',
  accentInk: '#ffffff',
  accentSoft: '#fbe8e5',
  ok: '#15803d',
  hard: '#b45309',
  again: '#b91c1c',
  mark: '#e7a8a2',
}
export type Colors = typeof light
const dark: Colors = {
  bg: '#0f172a',
  surface: '#1e293b',
  surface2: '#273449',
  text: '#f1f5f9',
  muted: '#94a3b8',
  line: '#334155',
  accent: '#e7a8a2',
  accentInk: '#0f172a',
  accentSoft: '#4a2228',
  ok: '#4ade80',
  hard: '#fbbf24',
  again: '#f87171',
  mark: '#af504b',
}

export const useColors = (): Colors => (useColorScheme() === 'dark' ? dark : light)

/**
 * Inter, loaded in src/app/_layout.tsx. React Native picks a weight by font
 * family, not by fontWeight. The web app uses Cabinet Grotesk for headings,
 * but its licence does not allow the font files in an app, so headings use
 * the heaviest Inter.
 */
export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  heavy: 'Inter_800ExtraBold',
}

/** The colour of each FSRS grade (Again, Hard, Good, Easy). */
export const gradeColour = (c: Colors, g: number) => (g === 1 ? c.again : g === 2 ? c.hard : c.ok)
