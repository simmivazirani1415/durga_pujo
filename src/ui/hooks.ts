import { useEffect, useState } from 'react'

/** true on touch-first devices, so copy can say "Swipe" instead of "Scroll" */
export function useCoarsePointer(): boolean {
  const q = '(pointer: coarse)'
  const [v, setV] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(q).matches)
  useEffect(() => {
    const m = window.matchMedia?.(q)
    if (!m) return
    const on = () => setV(m.matches)
    m.addEventListener?.('change', on)
    return () => m.removeEventListener?.('change', on)
  }, [])
  return !!v
}

export function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n)
}
