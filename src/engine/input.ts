import { Observer } from 'gsap/Observer'
import gsap from 'gsap'
import { STOPS } from '../data/areas'
import { overlayOpen } from '../store/journey'
import { canStep, getCurrent, go, inCooldown, isBusy, next, prev } from './director'
import { rideHooks } from '../game/hooks'

gsap.registerPlugin(Observer)

/**
 * One gesture = one stop.
 * - Wheel / trackpad: a step needs ~30px of intent; after a step, the rest of that gesture (including
 *   inertia) is ignored until the wheel goes quiet for 220 ms.
 * - Touch: a swipe past 26px is one step.
 * - Keys: arrows, Page Up/Down, Space / Shift+Space, Home / End.
 */
export function initInput(stage: HTMLElement): () => void {
  let lastWheel = 0
  let needFresh = false
  let accum = 0

  const onWheel = (e: WheelEvent) => {
    if (overlayOpen()) return
    if (rideHooks.active()) {
      // the wheel never scrolls the page away mid-ride; scrollable panels keep their own scrolling
      const t = e.target as HTMLElement | null
      if (t?.closest?.('[data-allow-scroll]')) return
      e.preventDefault()
      // scrolling down at a pandal halt rides on
      const now = performance.now()
      if (now - lastWheel > 300) accum = 0
      lastWheel = now
      accum += e.deltaY * (e.deltaMode === 1 ? 16 : 1)
      if (accum >= 40) {
        accum = -400
        rideHooks.next()
      }
      return
    }
    e.preventDefault()
    const now = performance.now()
    const gap = now - lastWheel
    lastWheel = now
    if (isBusy() || inCooldown()) {
      needFresh = true
      accum = 0
      return
    }
    if (needFresh) {
      if (gap < 220) return
      needFresh = false
    }
    if (gap > 300) accum = 0
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1
    accum += e.deltaY * unit
    if (Math.abs(accum) >= 30) {
      const d = Math.sign(accum)
      accum = 0
      needFresh = true
      if (d > 0) next()
      else prev()
    }
  }
  window.addEventListener('wheel', onWheel, { passive: false })

  const obs = Observer.create({
    target: stage,
    type: 'touch',
    tolerance: 26,
    preventDefault: true,
    onUp: () => {
      if (overlayOpen()) return
      if (rideHooks.active()) rideHooks.next()
      else next()
    },
    onDown: () => {
      if (!overlayOpen() && !rideHooks.active()) prev()
    },
  })

  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null
    if (t && (t.closest('input, textarea, select, [contenteditable="true"]') || t.isContentEditable)) return
    if (overlayOpen() || rideHooks.active()) return
    if (e.altKey || e.ctrlKey || e.metaKey) return
    let handled = true
    switch (e.key) {
      case 'ArrowDown':
      case 'PageDown':
        next()
        break
      case 'ArrowUp':
      case 'PageUp':
        prev()
        break
      case ' ':
        if (t && t.closest('button, a, [role="button"]')) {
          handled = false
          break
        }
        if (e.shiftKey) prev()
        else next()
        break
      case 'Home':
        if (canStep()) void go(0)
        break
      case 'End':
        if (canStep()) void go(STOPS.length - 1)
        break
      default:
        handled = false
    }
    if (handled) e.preventDefault()
  }
  window.addEventListener('keydown', onKey)

  return () => {
    window.removeEventListener('wheel', onWheel)
    window.removeEventListener('keydown', onKey)
    obs.kill()
    void getCurrent
  }
}
