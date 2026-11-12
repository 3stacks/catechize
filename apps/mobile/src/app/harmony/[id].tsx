import { useLocalSearchParams } from 'expo-router'
import { HarmonyView } from '../../screens/HarmonyView.tsx'

export default function HarmonyRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <HarmonyView key={id} id={id} />
}
