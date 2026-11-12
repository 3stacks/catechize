import { useLocalSearchParams } from 'expo-router'
import { LearnSession } from '../../screens/Sessions.tsx'

/** /learn/wsc learns the next unit of the course. /learn/wsc?unit=wsc-1 learns one unit. */
export default function LearnRoute() {
  const { docId, unit } = useLocalSearchParams<{ docId: string; unit?: string }>()
  return <LearnSession key={`${docId}/${unit ?? ''}`} docId={docId} unitId={unit || undefined} />
}
