import { useEffect, useState } from 'react'
import { addVerse } from '../data/load.ts'
import { passageFromId } from '../lib/refs.ts'
import { href } from '../router.ts'

/**
 * `#/add/John.3.16`: add a passage to "My verses", then open it. The "Memorise
 * this verse" buttons on the website link here.
 */
export function AddPassage({ id }: { id: string }) {
  const [error, setError] = useState<string>()
  useEffect(() => {
    const p = passageFromId(id)
    if (!p) {
      setError(`"${id}" is not a Bible reference.`)
      return
    }
    addVerse(p).then(
      // Replace the history entry, so Back does not add the verse again.
      (unitId) => location.replace(href('unit', 'verses', unitId)),
      () => setError('Could not load that passage.'),
    )
  }, [id])
  return <p className="empty">{error ?? 'Adding the passage…'}</p>
}
