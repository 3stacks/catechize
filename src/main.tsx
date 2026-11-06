import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import './styles.css'
import { startSync } from './store/sync.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

startSync()

// Tell the homepage that this browser uses the app, so it opens the app next time.
try {
  localStorage.setItem('catechize.uses-app', '1')
} catch {
  // storage is blocked: the homepage simply stays the homepage
}
