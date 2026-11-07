import { track } from '../lib/track.ts'
import { loadDoc, loadIndex } from '../data/load.ts'
import { href } from '../router.ts'
import { db, getSettings, inTradition, saveSettings, type TraditionChoice } from '../store/db.ts'
import { learnedToday } from '../store/srs.ts'
import { loadStats, troubleSpots } from '../store/stats.ts'
import { useDataVersion } from '../store/sync.ts'
import { useAsync } from '../useAsync.ts'
import { reviewQueue } from './Sessions.tsx'

export const isLordsDay = () => new Date().getDay() === 0

async function loadHome() {
  const settings = await getSettings()
  const [index, queue, courses, trouble, stats] = await Promise.all([loadIndex(), reviewQueue(settings), db.courses.toArray(), troubleSpots(), loadStats()])
  const due = queue.due
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
  return { index, due, held: queue.held, courseInfo, settings, trouble, streak: stats.streak }
}

export function Home() {
  const v = useDataVersion()
  const [data, , reload] = useAsync(loadHome, [v])
  if (!data) return <p className="empty">Loading…</p>
  const { due, held, courseInfo, settings, trouble, streak } = data
  const dueChunks = due.reduce((n, u) => n + u.chunks.length + (u.whole ? 1 : 0), 0)
  const restDay = settings.lordsDayReviewOnly && isLordsDay()

  return (
    <div className="stack">
      <section className="card hero">
        <div className="hero-head">
          <h1>{greeting()}</h1>
          {streak.days > 0 && (
            <a className={streak.today ? 'streak done' : 'streak'} href={href('progress')} title={streak.today ? 'Reviewed today' : 'Review today to keep your streak'}>
              <Flame />
              {streak.days} {streak.days === 1 ? 'day' : 'days'}
              <span className="visually-hidden"> streak</span>
            </a>
          )}
        </div>
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
          <p>{held ? `Today's review limit is reached. ${held} more wait for tomorrow.` : 'Nothing due for review.'}</p>
        )}
        {trouble.length > 0 && (
          <p className="small">
            <a href={href('trouble')}>
              Practise {trouble.length} {trouble.length === 1 ? 'answer' : 'answers'} with trouble spots
            </a>{' '}
            <span className="muted">(does not change your schedule)</span>
          </p>
        )}
      </section>

      {!settings.tradition && <TraditionPicker onPick={reload} />}

      <section>
        <h2>Memorising</h2>
        {restDay && <p className="note">Lord's Day: reviews only, no new material today.</p>}
        {courseInfo.length === 0 && (
          <div className="card">
            <p>Choose something to memorise. {starters(settings.tradition).length > 1 ? 'A catechism' : 'The catechism'} is a good place to start.</p>
            <div className="row wrap">
              {starters(settings.tradition).map(([id, label]) => (
                <a key={id} className="button primary" href={href('doc', id)}>
                  {label}
                </a>
              ))}
            </div>
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
          {inTradition('reformed', settings.tradition) && (
            <a className="tile" href={href('harmony', 'decalogue')}>
              <strong>The Ten Commandments</strong>
              <span>In the Shorter, Larger and Heidelberg Catechisms</span>
            </a>
          )}
          {inTradition('lutheran', settings.tradition) && (
            <a className="tile" href={href('doc', 'lsc')}>
              <strong>The Six Chief Parts</strong>
              <span>Luther's Small Catechism: Commandments, Creed, Prayer and the Sacraments</span>
            </a>
          )}
          <a className="tile" href={href('doc', 'verses')}>
            <strong>My verses</strong>
            <span>Scripture you have added from proof texts</span>
          </a>
        </div>
      </section>
    </div>
  )
}

const starters = (t: TraditionChoice | undefined): [string, string][] =>
  t === 'lutheran'
    ? [['lsc', "Open Luther's Small Catechism"]]
    : t === 'reformed'
      ? [['wsc', 'Open the Shorter Catechism']]
      : [
          ['wsc', 'Westminster Shorter Catechism'],
          ['lsc', "Luther's Small Catechism"],
        ]

/** Asked once. Creeds and Scripture show either way; Settings can change it. */
function TraditionPicker({ onPick }: { onPick: () => void }) {
  const pick = async (tradition: TraditionChoice) => {
    await saveSettings({ tradition })
    track('Tradition chosen', { tradition })
    onPick()
  }
  return (
    <section className="card">
      <h3>Which confessions do you hold?</h3>
      <p className="muted small">
        This chooses the catechisms and confessions in your library. The creeds and Scripture are always there. You can change it in Settings.
      </p>
      <div className="row wrap">
        <button className="primary" onClick={() => pick('reformed')}>
          Reformed
        </button>
        <button className="primary" onClick={() => pick('lutheran')}>
          Lutheran
        </button>
        <button className="ghost" onClick={() => pick('both')}>
          Show both
        </button>
      </div>
      <p className="muted small">
        Reformed: Westminster Standards, Heidelberg Catechism, Belgic Confession, Canons of Dort. Lutheran: Luther's Small and Large Catechisms.
      </p>
    </section>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (isLordsDay()) return "The Lord's Day"
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)

/** The usual streak icon. */
function Flame() {
  return (
    <svg className="flame" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2c.5 3-1.4 4.9-3 6.6C7.4 10.3 6 12 6 14.5A6 6 0 0 0 12 21a6 6 0 0 0 6-6.3c0-2.3-1-4.3-2.4-5.8-.3 1.4-1 2.5-2.1 3.1.4-3.6-.6-7.3-1.5-10Zm.2 11.4c1.6 1.2 2.3 2.4 2.3 3.6A2.5 2.5 0 0 1 12 19.5 2.5 2.5 0 0 1 9.5 17c0-1.3.9-2.3 2.7-3.6Z"
      />
    </svg>
  )
}
