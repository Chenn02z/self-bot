import { useEffect, useState } from 'react'

// The part of the screen not covered by the iOS keyboard. iOS shrinks the visual viewport,
// not the layout viewport, so fixed elements need this to stay above the keyboard.
const read = () => ({ height: window.visualViewport?.height ?? window.innerHeight, top: window.visualViewport?.offsetTop ?? 0 })

export function useVisualViewport() {
  const [vv, setVv] = useState(read)
  useEffect(() => {
    const v = window.visualViewport
    if (!v) return
    const update = () => setVv(read())
    v.addEventListener('resize', update)
    v.addEventListener('scroll', update)
    return () => { v.removeEventListener('resize', update); v.removeEventListener('scroll', update) }
  }, [])
  return vv
}
