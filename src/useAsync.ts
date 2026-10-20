import { useEffect, useState, type DependencyList } from 'react'

/** Run an async loader and re-run it when deps change. Returns undefined while loading. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList): [T | undefined, Error | undefined, () => void] {
  const [value, setValue] = useState<T>()
  const [error, setError] = useState<Error>()
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let live = true
    fn().then(
      (v) => live && setValue(v),
      (e) => live && setError(e),
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])
  return [value, error, () => setTick((t) => t + 1)]
}
