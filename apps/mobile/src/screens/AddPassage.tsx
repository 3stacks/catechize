import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { addVerse } from '../../../../src/data/load.ts'
import { passageFromId } from '../../../../src/lib/refs.ts'
import { Empty } from '../components/ui.tsx'

/**
 * hearers://add/John.3.16: add a passage to "My verses", then open it. The
 * same as src/views/AddPassage.tsx, which the website's "Memorise this verse"
 * buttons open.
 */
export function AddPassage({ id }: { id: string }) {
  const [failed, setFailed] = useState(false)
  const p = passageFromId(id)
  const error = !p ? `"${id}" is not a Bible reference.` : failed ? 'Could not load that passage.' : undefined
  useEffect(() => {
    const p = passageFromId(id)
    if (!p) return
    addVerse(p).then(
      // Replace this screen, so Back does not add the verse again.
      (unitId) => router.replace(`/unit/verses/${unitId}`),
      () => setFailed(true),
    )
  }, [id])
  return <Empty>{error ?? 'Adding the passage…'}</Empty>
}
