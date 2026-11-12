import { useLocalSearchParams } from 'expo-router'
import { UnitView } from '../../../screens/UnitView.tsx'

export default function UnitRoute() {
  const { docId, unitId } = useLocalSearchParams<{ docId: string; unitId: string }>()
  return <UnitView key={`${docId}/${unitId}`} docId={docId} unitId={unitId} />
}
