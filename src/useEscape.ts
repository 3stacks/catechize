import { useEffect } from 'react'

/** Call `onEscape` when the Escape key goes down, while the component is mounted. */
export function useEscape(onEscape: () => void) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onEscape()
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [onEscape])
}
