import { useSyncExternalStore } from 'react'
import { HORIZON, VB_H, VB_W, VPX } from '../scenes/world'

export interface ViewMap {
  W: number
  H: number
  /** CSS px per viewBox unit (preserveAspectRatio xMidYMax slice) */
  s: number
  ox: number
  oy: number
  /** vanishing point in CSS px */
  vpX: number
  vpY: number
  portrait: boolean
  /** narrow layouts (phones) */
  compact: boolean
}

export function computeView(W: number, H: number): ViewMap {
  const s = Math.max(W / VB_W, H / VB_H)
  const ox = (W - VB_W * s) / 2
  const oy = H - VB_H * s
  return {
    W,
    H,
    s,
    ox,
    oy,
    vpX: ox + VPX * s,
    vpY: oy + HORIZON * s,
    portrait: W / H < 0.9,
    compact: W < 760,
  }
}

function measure(): ViewMap {
  if (typeof window === 'undefined') return computeView(1440, 900)
  return computeView(window.innerWidth, window.innerHeight)
}

let view = measure()
const subs = new Set<() => void>()

function apply() {
  view = measure()
  const root = document.getElementById('stage')
  if (root) {
    root.style.setProperty('--vp-x', `${view.vpX}px`)
    root.style.setProperty('--vp-y', `${view.vpY}px`)
  }
  subs.forEach((f) => f())
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', apply)
  window.addEventListener('orientationchange', () => setTimeout(apply, 120))
}

export function getView(): ViewMap {
  return view
}

export function refreshView() {
  apply()
}

export function onView(fn: () => void): () => void {
  subs.add(fn)
  return () => subs.delete(fn)
}

export function useView(): ViewMap {
  return useSyncExternalStore(
    (cb) => onView(cb),
    () => view,
    () => view,
  )
}

/** viewBox point to CSS px */
export function toScreen(x: number, y: number, v: ViewMap = view): { x: number; y: number } {
  return { x: v.ox + x * v.s, y: v.oy + y * v.s }
}
