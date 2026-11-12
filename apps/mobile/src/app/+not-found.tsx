import { Stack } from 'expo-router'
import { Empty } from '../components/ui.tsx'

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Empty>Not found.</Empty>
    </>
  )
}
