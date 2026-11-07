import { href, useRoute } from './router.ts'
import { Home } from './views/Home.tsx'
import { Library } from './views/Library.tsx'
import { DocView } from './views/DocView.tsx'
import { UnitView } from './views/UnitView.tsx'
import { HarmonyView } from './views/HarmonyView.tsx'
import { ReviewSession, LearnSession, TroubleSession } from './views/Sessions.tsx'
import { SettingsView } from './views/SettingsView.tsx'
import { StatsView } from './views/StatsView.tsx'
import { AddPassage } from './views/AddPassage.tsx'

export function App() {
  const [page, ...args] = useRoute()
  return (
    <div className="app">
      <header className="top">
        <a href={href()} className="brand">
          Hearers
        </a>
        <nav>
          <a href={href()} className={!page ? 'active' : ''}>
            Today
          </a>
          <a href={href('library')} className={page === 'library' || page === 'doc' || page === 'unit' || page === 'harmony' ? 'active' : ''}>
            Library
          </a>
          <a href={href('progress')} className={page === 'progress' ? 'active' : ''}>
            Progress
          </a>
          <a href={href('settings')} className={page === 'settings' ? 'active' : ''}>
            Settings
          </a>
        </nav>
      </header>
      <main>{route(page, args)}</main>
      {HOSTED && (
        <footer className="app-foot">
          <a href="../?home">About Hearers</a>
          <span aria-hidden="true">·</span>
          <a href="https://ko-fi.com/lukeboyle" target="_blank" rel="noopener noreferrer">
            Support on Ko-fi
          </a>
        </footer>
      )}
    </div>
  )
}

/**
 * On the public site the app lives at /app/, under the homepage. There the
 * footer links back to the homepage, and `?home` keeps the homepage from
 * sending the visitor straight back here. A self-hosted copy runs at its own
 * root and has no homepage.
 */
const HOSTED = typeof location !== 'undefined' && /\/app\/?$/.test(location.pathname.replace(/index\.html$/, ''))

function route(page: string | undefined, args: string[]) {
  switch (page) {
    case undefined:
      return <Home />
    case 'library':
      return <Library />
    case 'doc':
      return <DocView key={args[0]} docId={args[0]} />
    case 'unit':
      return <UnitView key={args.join('/')} docId={args[0]} unitId={args[1]} />
    case 'harmony':
      return <HarmonyView key={args[0]} id={args[0]} />
    case 'review':
      return <ReviewSession />
    case 'learn':
      return <LearnSession key={args.join('/')} docId={args[0]} unitId={args[1]} />
    case 'trouble':
      return <TroubleSession />
    case 'progress':
      return <StatsView />
    case 'settings':
      return <SettingsView />
    case 'add':
      return <AddPassage key={args[0]} id={args[0]} />
    default:
      return <p className="empty">Not found.</p>
  }
}
