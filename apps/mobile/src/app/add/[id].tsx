import { useLocalSearchParams } from 'expo-router'
import { AddPassage } from '../../screens/AddPassage.tsx'

export default function AddRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <AddPassage key={id} id={id} />
}
