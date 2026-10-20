import { loadDoc, loadIndex } from '../data/load.ts'
import { href } from '../router.ts'
import { db, getSettings } from '../store/db.ts'
import { dueUnits, learnedToday } from '../store/srs.ts'
import { useAsync } from '../useAsync.ts'

export const isLordsDay = () => new Date().getDay() === 0

async function loadHome() {
  const [index, due, courses, settings] = await Promise.all([loadIndex(), dueUnits(), db.courses.toArray(), getSettings()])
  const courseInfo = await Promise.all(
    courses.map(async (c) => {
      const doc = await loadDoc(c.docId)
      const learned = await db.learned.where('docId').equals(c.docId).count()
      const today = await learnedToday(c.docId)
      const learnedIds = new Set((await db.learned.where('docId').equals(c.docId).toArray()).map((l) => l.unitId))
      const next = doc.units.find((u) => !learnedIds.has(u.id))
      return { course: c, doc, learned, today, next }
    }),
  )
  return { index, due, courseInfo, settings }
}

export function Home() {
  const [data] = useAsync(loadHome, [])
  if (!data) return <p className="empty">Loading…</p>
  const { due, courseInfo, settings } = data
  const dueChunks = due.reduce((n, u) => n + u.chunks.length + (u.whole ? 1 : 0), 0)
  const restDay = settings.lordsDayReviewOnly && isLordsDay()

  return (
    <div className="stack">
      <section className="card hero">
        <h1>{greeting()}</h1>
        {due.length ? (
          <>
            <p>
              <strong>{due.length}</strong> {due.length === 1 ? 'answer' : 'answers'} to review ({dueChunks} {dueChunks === 1 ? 'part' : 'parts'}).
            </p>
            <a className="button primary" href={href('review')}>
              Start review
            </a>
          </>
        ) : (
          <p>Nothing due for review.</p>
        )}
      </section>

      <section>
        <h2>Memorising</h2>
        {restDay && <p className="note">Lord's Day: reviews only, no new material today.</p>}
        {courseInfo.length === 0 && (
          <div className="card">
            <p>Choose something to memorise. The Shorter Catechism is a good place to start.</p>
            <a className="button primary" href={href('doc', 'wsc')}>
              Open the Shorter Catechism
            </a>
          </div>
        )}
        {courseInfo.map(({ course, doc, learned, today, next }) => {
          const left = Math.max(0, course.perDay - today)
          return (
            <div className="card course" key={course.docId}>
              <div className="course-head">
                <a href={href('doc', doc.id)}>
                  <h3>{doc.title}</h3>
                </a>
                <span className="muted">
                  {learned}/{doc.units.length}
                </span>
              </div>
              <div className="bar">
                <span style={{ width: `${(learned / Math.max(1, doc.units.length)) * 100}%` }} />
              </div>
              {next ? (
                <div className="row">
                  <span className="muted small">
                    Next: {next.ref} {truncate(next.prompt, 60)}
                  </span>
                  <span className="spacer" />
                  {restDay ? null : left > 0 ? (
                    <a className="button" href={href('learn', doc.id)}>
                      Learn ({left} today)
                    </a>
                  ) : (
                    <a className="button ghost" href={href('learn', doc.id)}>
                      Learn one more
                    </a>
                  )}
                </div>
              ) : (
                <p className="muted small">Every unit learned. Reviews will keep it fresh.</p>
              )}
            </div>
          )
        })}
      </section>

      <section>
        <h2>Study</h2>
        <div className="tiles">
          <a className="tile" href={href('harmony', 'creeds')}>
            <strong>Apostles' and Nicene Creeds</strong>
            <span>Phrase by phrase, with proof texts and hymns</span>
          </a>
          <a className="tile" href={href('harmony', 'decalogue')}>
            <strong>The Ten Commandments</strong>
            <span>In the Shorter, Larger and Heidelberg Catechisms</span>
          </a>
          <a className="tile" href={href('doc', 'verses')}>
            <strong>My verses</strong>
            <span>Scripture you have added from proof texts</span>
          </a>
        </div>
      </section>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (isLordsDay()) return "The Lord's Day"
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)
