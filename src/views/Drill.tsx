import { useEffect, useMemo, useRef, useState } from 'react'
import type { Unit } from '../data/types.ts'
import { normWord, scoreSpoken, tokenize, type Token } from '../lib/grade.ts'
import { chunkResults as gradeWords, cycleGrade, gradeLabel, toRecord, type WordStatus } from '../lib/drill.ts'
import type { InputMode, ReviewRow } from '../store/db.ts'
import { recordDrill, type ChunkResult } from '../store/srs.ts'
import { canListen, listen, speak } from '../lib/speech.ts'

// One drill over one unit. Stages:
//   read   – see (and optionally hear) the whole text, with the learner's memory aid
//   trace  – type through it with the words shown faintly (practice, not graded)
//   fade   – type it with every other word hidden (practice, not graded)
//   recall – type or say it with the tested chunks hidden; each chunk is graded
// A review starts at recall and hides only the chunks that are due (or all of
// them for a whole-recitation review). The grades are saved on Continue, after
// the learner has had the chance to forgive a typo.

type Stage = 'read' | 'trace' | 'fade' | 'recall' | 'done'
type Status = WordStatus

interface Props {
  unit: Unit
  docId: string
  inputMode: InputMode
  /** learn: read → trace → (fade) → recall all chunks. review: recall the listed chunks. */
  kind: 'learn' | 'review'
  dueChunks?: number[]
  whole?: boolean
  /** Include the fade stage when learning. */
  fade?: boolean
  /** false: practice only, the schedule is not touched. */
  record?: boolean
  /** The learner's memory aid for this unit. */
  note?: string
  onDone: (results: ChunkResult[]) => void
}

const MAX_STRIKES = 3

export function Drill({ unit, docId, inputMode, kind, dueChunks, whole, fade = true, record = true, note, onDone }: Props) {
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
  const mode = useRef<ReviewRow['mode']>(inputMode)
  const [heard, setHeard] = useState<{ settled: string; pending: string } | null>(null)
  const [micError, setMicError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const mic = useRef<{ stop: () => string } | null>(null)

  // The sequence of token indices the learner must produce in this stage.
  const order = useMemo(
    () => tokens.map((_, i) => i).filter((i) => stage === 'trace' || stage === 'fade' || tested.has(chunkOf[i])),
    [tokens, stage, tested, chunkOf],
  )

  // Save once: on Continue, or when the learner leaves before pressing it.
  const pending = useRef<ChunkResult[] | null>(null)
  const save = () => {
    const toSave = pending.current
    pending.current = null
    if (!toSave || !record) return Promise.resolve()
    return recordDrill(unit, docId, toRecord(toSave, whole), mode.current)
  }
  useEffect(
    () => () => {
      mic.current?.stop()
      void save()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
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
    if (stage === 'trace' || stage === 'fade' || stage === 'recall') input.current?.focus()
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
    if (stage === 'trace') return restart(fade ? 'fade' : 'recall')
    if (stage === 'fade') return restart('recall')
    const chunkResults = gradeWords(order, chunkOf, final)
    pending.current = chunkResults
    setResults(chunkResults)
    setStage('done')
  }

  /** The learner says a chunk was right after all (a typo, a misheard word). */
  const regrade = (index: number) => {
    if (!results) return
    const next = results.map((r) => (r.index === index ? { ...r, grade: cycleGrade(r.grade) } : r))
    pending.current = next
    setResults(next)
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

  // Recite aloud: listen, then score what was heard against the words still to come.
  const startListening = () => {
    setMicError('')
    setHeard({ settled: '', pending: '' })
    try {
      mic.current = listen(
        (settled, pending) => setHeard({ settled, pending }),
        (msg) => {
          setMicError(msg)
          mic.current?.stop()
          mic.current = null
          setHeard(null)
        },
      )
    } catch (e) {
      setMicError((e as Error).message)
      setHeard(null)
    }
  }
  const stopListening = () => {
    const said = mic.current?.stop() ?? ''
    mic.current = null
    const text = [said, heard?.pending].filter(Boolean).join(' ')
    setHeard(null)
    if (!text.trim()) return
    const rest = order.slice(cursor)
    const ok = scoreSpoken(
      rest.map((i) => tokens[i].word),
      text,
    )
    const next = status.slice()
    rest.forEach((i, k) => (next[i] = ok[k] ? (strikes[i] > 0 ? 'slip' : 'ok') : 'given'))
    setStatus(next)
    setCursor(order.length)
    mode.current = 'spoken'
    finish(next)
  }

  const memoryAid = note ? (
    <p className="memory-aid">
      <span className="muted small">Your memory aid: </span>
      {note}
    </p>
  ) : null

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
        {memoryAid}
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
        {memoryAid}
        <div className="results">
          {results.map((r) => (
            <div key={r.index} className={`result g${r.grade}`}>
              <span className="dot" />
              <span className="result-text">{unit.text.slice(...unit.chunks[r.index])}</span>
              <button className="result-grade" onClick={() => regrade(r.index)} title="Tap to change the grade, for a typo or a misheard word">
                {gradeLabel(r.grade)}
              </button>
            </div>
          ))}
        </div>
        <div className="row">
          <span className="muted small">{record ? 'Tap a grade to change it.' : 'Practice only: your schedule is unchanged.'}</span>
          <span className="spacer" />
          <button className="primary" onClick={() => save().then(() => onDone(results))} autoFocus>
            Continue
          </button>
        </div>
      </div>
    )

  const listening = heard !== null
  return (
    <div className="drill" onClick={() => !listening && input.current?.focus()}>
      <Prompt unit={unit} />
      <div className="stage-label">
        {stage === 'trace' ? 'Trace: type the ' : stage === 'fade' ? 'Fade: half the words are gone. Type the ' : 'Recall: type the '}
        {inputMode === 'first-letter' ? 'first letter of each word' : 'each word, then space'}
        {stage === 'recall' && canListen() ? ', or say it aloud' : ''}
      </div>
      <TextView
        unit={unit}
        tokens={tokens}
        status={status}
        chunkOf={chunkOf}
        tested={tested}
        stage={stage}
        current={listening ? -1 : (current ?? -1)}
        buffer={buffer}
        shake={shake}
        struck={current !== undefined && strikes[current] > 0}
      />
      {listening && (
        <p className="heard" aria-live="polite">
          {heard.settled} <span className="muted">{heard.pending}</span>
          {!heard.settled && !heard.pending && <span className="muted">Listening…</span>}
        </p>
      )}
      {micError && <p className="note">{micError}</p>}
      <input
        ref={input}
        className="key-capture"
        aria-label="Type here"
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value=""
        disabled={listening}
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
        {stage === 'recall' &&
          canListen() &&
          (listening ? (
            <button className="primary" onClick={stopListening}>
              Done speaking
            </button>
          ) : (
            <button className="ghost" onClick={startListening}>
              Say it
            </button>
          ))}
        {!listening && (
          <button className="ghost" onClick={hint}>
            Show word
          </button>
        )}
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
    const hidden = stage === 'fade' ? i % 2 === 1 : stage !== 'trace' && tested.has(chunkOf[i])
    const s = status[i]
    let cls = 'w'
    let shown: React.ReactNode = t.word
    if (s === 'ok') cls += ' ok'
    else if (s === 'slip' || s === 'given') cls += ' slip'
    else if (s === 'revealed') cls += ' revealed'
    else if (stage === 'trace') cls += ' ghost'
    else if (hidden) {
      cls += ' blank'
      shown = <span style={{ width: `${Math.max(2, t.word.length) * 0.55}em` }} className="blank-bar" />
    } else cls += stage === 'fade' ? ' ghost-strong' : ' context'
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
