import { useState } from 'react'
import { addVerse } from '../data/load.ts'
import { suggestions } from '../data/suggest.ts'
import { formatPassage, parseRefs, type Passage } from '../lib/refs.ts'
import { useAsync } from '../useAsync.ts'

/** Add Scripture to "My verses": by reference, or from the proof texts of what the learner knows. */
export function AddVerses({ have, onAdded }: { have: Set<string>; onAdded: () => void }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [list] = useAsync(() => suggestions(have), [[...have].join()])

  const add = async (passages: Passage[]) => {
    setBusy(true)
    try {
      for (const p of passages) await addVerse(p)
      onAdded()
    } catch {
      setError('Could not load that passage.')
    } finally {
      setBusy(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { passages, errors } = parseRefs(input)
    if (errors.length || !passages.length) {
      setError(`Type a reference such as "Romans 8:28" or "Psalm 23".${errors.length ? ` Not understood: ${errors.join(', ')}.` : ''}`)
      return
    }
    setError(undefined)
    await add(passages)
    setInput('')
  }

  return (
    <section className="card stack-sm">
      <h3>Add a passage</h3>
      <form className="row" onSubmit={submit}>
        <input className="search grow-input" placeholder="Romans 8:28–30" value={input} onChange={(e) => setInput(e.target.value)} aria-label="Bible reference" disabled={busy} />
        <button className="primary" disabled={busy || !input.trim()}>
          Add
        </button>
      </form>
      {error && <p className="small error-text">{error}</p>}
      {list && list.length > 0 && (
        <>
          <p className="muted small">Proof texts from what you learn:</p>
          <div className="suggestions">
            {list.map((s) => (
              <button key={s.id} className="suggestion" disabled={busy} onClick={() => add([s.passage])}>
                <span>
                  <strong>{formatPassage(s.passage)}</strong>
                  <span className="muted small"> · {s.from}</span>
                </span>
                <span className="plus" aria-hidden="true">
                  +
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
