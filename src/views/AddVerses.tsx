import { useState } from 'react'
import { addVerse, loadUnit } from '../data/load.ts'
import { formatPassage, parseRefs, passageFromId, type Passage } from '../lib/refs.ts'
import { db, getSettings } from '../store/db.ts'
import { useAsync } from '../useAsync.ts'

interface Suggestion {
  id: string // passage id
  passage: Passage
  /** Where the proof text comes from, for example "WSC Q. 1". */
  from: string
}

const SHORT: Record<string, string> = { wsc: 'WSC', wlc: 'WLC', hc: 'Heidelberg', wcf: 'WCF', lsc: 'Small Catechism', llc: 'Large Catechism', bc: 'Belgic', dort: 'Dort' }

/**
 * Proof texts of the answers the learner has learned, newest first. Before the
 * learner learns anything, the proof texts of the first catechism questions.
 */
async function suggestions(have: Set<string>, max = 6): Promise<Suggestion[]> {
  const learned = await db.learned.orderBy('at').reverse().limit(30).toArray()
  let from = learned.filter((l) => l.docId !== 'verses').map((l) => ({ docId: l.docId, unitId: l.unitId }))
  if (!from.length) {
    const lutheran = (await getSettings()).tradition === 'lutheran'
    from = lutheran ? [{ docId: 'lsc', unitId: 'lsc-1' }] : [1, 2, 3].map((n) => ({ docId: 'wsc', unitId: `wsc-${n}` }))
  }
  // Up to two proof texts from each answer, so the list covers several answers.
  const out: Suggestion[] = []
  const seen = new Set<string>()
  for (const { docId, unitId } of from) {
    const unit = await loadUnit(docId, unitId).catch(() => undefined)
    if (!unit) continue
    let taken = 0
    for (const id of unit.proofs.flatMap((p) => p.refs)) {
      const passage = passageFromId(id)
      // Whole chapters are too long to memorise as one passage.
      if (!passage || passage.v1 === 0 || seen.has(id) || have.has(`kjv-${id}`)) continue
      seen.add(id)
      out.push({ id, passage, from: `${SHORT[docId] ?? docId.toUpperCase()} ${unit.ref}` })
      if (out.length >= max) return out
      if (++taken === 2) break
    }
  }
  return out
}

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
