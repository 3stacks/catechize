import { useState } from 'react'
import { addVerse, loadPassageById } from '../data/load.ts'
import type { Note } from '../data/types.ts'
import { formatPassage, passageFromId } from '../lib/refs.ts'
import { href } from '../router.ts'
import { useAsync } from '../useAsync.ts'
import { useEscape } from '../useEscape.ts'

export interface SheetContent {
  phrase: string
  refs: string[]
  hymn?: string
  parallel?: Note['parallel'] & { text: string }
}

/** Bottom sheet listing the proof texts for a tapped phrase, with the KJV text. */
export function ProofSheet({ content, onClose }: { content: SheetContent; onClose: () => void }) {
  useEscape(onClose)
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Proof texts">
        <div className="sheet-head">
          <q>{content.phrase}</q>
          <button className="ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {content.parallel && (
          <p className="parallel">
            <span className="muted small">{content.parallel.label}:</span>{' '}
            <a href={href('unit', content.parallel.unitId.split('-')[0], content.parallel.unitId)}>{content.parallel.text}</a>
          </p>
        )}
        {content.hymn && <p className="hymn">♪ {content.hymn}</p>}
        {content.refs.length === 0 && <p className="muted">No proof texts for this phrase.</p>}
        {content.refs.map((id) => (
          <Passage key={id} id={id} />
        ))}
      </div>
    </div>
  )
}

function Passage({ id }: { id: string }) {
  const [verses] = useAsync(() => loadPassageById(id), [id])
  const [added, setAdded] = useState(false)
  const p = passageFromId(id)
  if (!p) return null
  const long = (verses?.length ?? 0) > 12
  return (
    <div className="passage">
      <div className="passage-head">
        <strong>{formatPassage(p)}</strong>
        <button
          className="ghost small"
          disabled={added}
          onClick={async () => {
            await addVerse(p)
            setAdded(true)
          }}
        >
          {added ? 'Added to My verses' : 'Memorise this passage'}
        </button>
      </div>
      {verses ? (
        <p className={long ? 'verses clamp' : 'verses'}>
          {verses.map((v) => (
            <span key={`${v.c}:${v.v}`}>
              <sup>{p.c1 !== p.c2 ? `${v.c}:${v.v}` : v.v}</sup>
              {v.text}{' '}
            </span>
          ))}
        </p>
      ) : (
        <p className="muted small">Loading…</p>
      )}
    </div>
  )
}
