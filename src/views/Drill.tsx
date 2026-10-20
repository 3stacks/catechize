import { useEffect, useMemo, useRef, useState } from 'react'
import type { Unit } from '../data/types.ts'
import { gradeChunk, normWord, tokenize, AGAIN, EASY, GOOD, HARD, type Grade, type Token } from '../lib/grade.ts'
import type { InputMode } from '../store/db.ts'
import { recordDrill, type ChunkResult } from '../store/srs.ts'
import { speak } from '../lib/speech.ts'

// One drill over one unit. Stages:
//   read   – see (and optionally hear) the whole text
//   trace  – type through it with the words shown faintly (practice, not graded)
//   recall – type it with the tested chunks hidden; each chunk is graded
// A review starts at recall and hides only the chunks that are due (or all of
// them for a whole-recitation review).

type Stage = 'read' | 'trace' | 'recall' | 'done'
type Status = 'pending' | 'ok' | 'slip' | 'revealed' | 'given'

interface Props {
  unit: Unit
  docId: string
  inputMode: InputMode
  /** learn: read → trace → recall all chunks. review: recall the listed chunks. */
  kind: 'learn' | 'review'
  dueChunks?: number[]
  whole?: boolean
  onDone: (results: ChunkResult[]) => void
}

const MAX_STRIKES = 3

export function Drill({ unit, docId, inputMode, kind, dueChunks, whole, onDone }: Props) {
  const tokens = useMemo(() => tokenize(unit.text), [unit.text])
  const chunkOf = useMemo(
    () => tokens.map((t) => Math.max(0, unit.chunks.findIndex(([s, e]) => t.start >= s && t.end <= e))),
    [tokens, unit.chunks],
  )
  const tested = useMemo(() => {
    if (kind === 'learn' || whole) return new Set(unit.chunks.map((_, i) => i))
    return new Set(dueChunks ?? [])
  }, [kind, whole, dueChunks, unit.chunks])

  const [stage, setStage] = useState<Stage>(kind === 'learn' ? 'read' : 'recall')
  const [status, setStatus] = useState<Status[]>(() => tokens.map(() => 'pending'))
  const [strikes, setStrikes] = useState<number[]>(() => tokens.map(() => 0))
  const [cursor, setCursor] = useState(0)
  const [buffer, setBuffer] = useState('')
  const [shake, setShake] = useState(0)
  const [results, setResults] = useState<ChunkResult[] | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const saved = useRef<Promise<void>>(Promise.resolve())

  // The sequence of token indices the learner must produce in this stage.
  const order = useMemo(
    () => tokens.map((_, i) => i).filter((i) => stage === 'trace' || tested.has(chunkOf[i])),
    [tokens, stage, tested, chunkOf],
  )

  const restart = (next: Stage) => {
    setStage(next)
    setStatus(tokens.map(() => 'pending'))
    setStrikes(tokens.map(() => 0))
    setCursor(0)
    setBuffer('')
    setTimeout(() => input.current?.focus(), 0)
  }

  useEffect(() => {
    if (stage === 'trace' || stage === 'recall') input.current?.focus()
  }, [stage])

  const current = order[cursor]

  const advance = (i: number, s: Status) => {
    const nextStatus = status.slice()
    nextStatus[i] = s
    setStatus(nextStatus)
    setBuffer('')
    const nextCursor = cursor + 1
    setCursor(nextCursor)
    if (nextCursor >= order.length) finish(nextStatus)
  }

  const strike = (i: number) => {
    const n = strikes.slice()
    n[i]++
    setStrikes(n)
    setShake((x) => x + 1)
    if (n[i] >= MAX_STRIKES) advance(i, 'revealed')
  }

  const finish = (final: Status[]) => {
    if (stage === 'trace') {
      restart('recall')
      return
    }
    const byChunk = new Map<number, { errors: number; words: number; revealed: boolean }>()
    order.forEach((i) => {
      const c = chunkOf[i]
      const r = byChunk.get(c) ?? { errors: 0, words: 0, revealed: false }
      r.words++
      if (final[i] === 'slip' || final[i] === 'given') r.errors++
      if (final[i] === 'revealed') r.revealed = true
      byChunk.set(c, r)
    })
    const chunkResults: ChunkResult[] = [...byChunk].map(([index, r]) => ({
      index,
      grade: gradeChunk(r.errors, r.words, r.revealed),
      errors: r.errors,
      words: r.words,
    }))
    let toRecord = chunkResults
    if (whole) {
      // The whole card gets the overall grade; chunks that broke down are sent
      // back through their own reviews.
      const errors = chunkResults.reduce((n, r) => n + r.errors, 0)
      const words = chunkResults.reduce((n, r) => n + r.words, 0)
      const revealed = [...byChunk.values()].some((r) => r.revealed)
      const wholeResult: ChunkResult = { index: -1, grade: gradeChunk(errors, words, revealed), errors, words }
      toRecord = [wholeResult, ...chunkResults.filter((r) => r.grade === AGAIN)]
    }
    setResults(chunkResults)
    setStage('done')
    saved.current = recordDrill(unit, docId, toRecord, inputMode)
  }

  const onKey = (raw: string) => {
    if (current === undefined) return
    const t = tokens[current]
    if (inputMode === 'first-letter') {
      for (const ch of raw) {
        if (!/[a-z0-9]/i.test(ch)) continue
        if (ch.toLowerCase() === t.norm[0]) advance(current, strikes[current] > 0 ? 'slip' : 'ok')
        else strike(current)
        return // one key per word
      }
      return
    }
    // full-word: collect until space/enter, then check
    const text = buffer + raw
    if (/\s$/.test(text)) {
      const typed = normWord(text.trim())
      if (!typed) return setBuffer('')
      if (typed === t.norm) advance(current, strikes[current] > 0 ? 'slip' : 'ok')
      else advance(current, 'given')
      return
    }
    setBuffer(text)
  }

  const hint = () => current !== undefined && advance(current, 'revealed')

  if (stage === 'read')
    return (
      <div className="drill">
        <Prompt unit={unit} />
        <p className="drill-text reading">
          {unit.chunks.map(([s, e], i) => (
            <span key={i} className="chunk">
              {unit.text.slice(s, e)}{' '}
            </span>
          ))}
        </p>
        <div className="row">
          <button className="ghost" onClick={() => speak(unit.text)}>
            Listen
          </button>
          <span className="spacer" />
          <button className="ghost" onClick={() => restart('recall')}>
            Skip to test
          </button>
          <button className="primary" onClick={() => restart('trace')}>
            Trace it
          </button>
        </div>
      </div>
    )

  if (stage === 'done' && results)
    return (
      <div className="drill">
        <Prompt unit={unit} />
        <TextView unit={unit} tokens={tokens} status={status} chunkOf={chunkOf} tested={tested} stage={stage} current={-1} buffer="" />
        <div className="results">
          {results.map((r) => (
            <div key={r.index} className={`result g${r.grade}`}>
              <span className="dot" />
              <span className="result-text">{unit.text.slice(...unit.chunks[r.index])}</span>
              <span className="result-grade">{gradeLabel(r.grade)}</span>
            </div>
          ))}
        </div>
        <div className="row">
          <span className="spacer" />
          <button className="primary" onClick={() => saved.current.then(() => onDone(results))} autoFocus>
            Continue
          </button>
        </div>
      </div>
    )

  return (
    <div className="drill" onClick={() => input.current?.focus()}>
      <Prompt unit={unit} />
      <div className="stage-label">
        {stage === 'trace' ? 'Trace: type the ' : 'Recall: type the '}
        {inputMode === 'first-letter' ? 'first letter of each word' : 'each word, then space'}
      </div>
      <TextView
        unit={unit}
        tokens={tokens}
        status={status}
        chunkOf={chunkOf}
        tested={tested}
        stage={stage}
        current={current ?? -1}
        buffer={buffer}
        shake={shake}
        struck={current !== undefined && strikes[current] > 0}
      />
      <input
        ref={input}
        className="key-capture"
        aria-label="Type here"
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value=""
        onChange={(e) => onKey(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && inputMode === 'full-word') onKey(' ')
        }}
      />
      <div className="row">
        <span className="progress-text">
          {cursor}/{order.length}
        </span>
        <span className="spacer" />
        <button className="ghost" onClick={hint}>
          Show word
        </button>
      </div>
    </div>
  )
}

function Prompt({ unit }: { unit: Unit }) {
  return (
    <div className="prompt">
      <span className="ref">{unit.ref}</span>
      <span>{unit.prompt}</span>
    </div>
  )
}

function TextView(props: {
  unit: Unit
  tokens: Token[]
  status: Status[]
  chunkOf: number[]
  tested: Set<number>
  stage: Stage
  current: number
  buffer: string
  shake?: number
  struck?: boolean
}) {
  const { unit, tokens, status, chunkOf, tested, stage, current, buffer, shake, struck } = props
  const parts: React.ReactNode[] = []
  let at = 0
  tokens.forEach((t, i) => {
    if (t.start > at) parts.push(unit.text.slice(at, t.start))
    at = t.end
    const hiddenChunk = tested.has(chunkOf[i]) && stage !== 'trace'
    const s = status[i]
    let cls = 'w'
    let shown: React.ReactNode = t.word
    if (s === 'ok') cls += ' ok'
    else if (s === 'slip' || s === 'given') cls += ' slip'
    else if (s === 'revealed') cls += ' revealed'
    else if (stage === 'trace') cls += ' ghost'
    else if (hiddenChunk) {
      cls += ' blank'
      shown = <span style={{ width: `${Math.max(2, t.word.length) * 0.55}em` }} className="blank-bar" />
    } else cls += ' context'
    if (i === current) {
      cls += struck ? ' current struck' : ' current'
      if (buffer) shown = <span className="buffer">{buffer}</span>
    }
    parts.push(
      <span key={i === current ? `c${shake}` : i} className={cls}>
        {shown}
      </span>,
    )
  })
  if (at < unit.text.length) parts.push(unit.text.slice(at))
  return <p className="drill-text">{parts}</p>
}

export function gradeLabel(g: Grade) {
  return { [AGAIN]: 'Again', [HARD]: 'Hard', [GOOD]: 'Good', [EASY]: 'Easy' }[g]
}
