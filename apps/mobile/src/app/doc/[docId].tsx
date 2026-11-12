import { useLocalSearchParams } from 'expo-router'
import { DocView } from '../../screens/DocView.tsx'

export default function DocRoute() {
  const { docId } = useLocalSearchParams<{ docId: string }>()
  return <DocView key={docId} docId={docId} />
}
