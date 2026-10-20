import { useEffect, useState } from 'react'

// Hash routing keeps the app a static bundle that works from any path and offline.

const parse = () =>
  location.hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent)

export function useRoute(): string[] {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const onChange = () => {
      setRoute(parse())
      window.scrollTo(0, 0)
    }
    addEventListener('hashchange', onChange)
    return () => removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export const href = (...parts: string[]) => '#/' + parts.map(encodeURIComponent).join('/')
export const go = (...parts: string[]) => {
  location.hash = href(...parts).slice(1)
}
