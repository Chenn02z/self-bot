import { useEffect } from 'react'

// Freezes the page behind a modal. position:fixed is the only lock iOS Safari fully respects;
// restoring scrollY afterwards keeps the list where it was.
export function useScrollLock() {
  useEffect(() => {
    const y = window.scrollY
    const body = document.body.style
    const prev = body.cssText
    Object.assign(body, { position: 'fixed', top: `-${y}px`, left: '0', right: '0' })
    return () => { body.cssText = prev; window.scrollTo(0, y) }
  }, [])
}
