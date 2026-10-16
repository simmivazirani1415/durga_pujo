import gsap from 'gsap'
import { AREA_BY_SLUG, STOPS, isArea } from '../data/areas'
import type { StopId } from '../data/types'
import { AUTO_Z } from '../scenes/world'
import { overlayOpen, useJourney } from '../store/journey'
import { autoMotion, mapState } from './motion'
import { cam } from '../world3d/engine3d'
import { stopD } from '../world3d/route'
import { getView } from './viewport'
import { rideHooks } from '../game/hooks'

/**
 * The journey director. One gesture = one stop. Each move is a real drive along the 3D road to the next
 * stop, with input locked until the auto has parked, plus a short cool-down so trackpad inertia never skips an area.
 * Jumps across the city lift the camera into the sky over the route map and set it down at the new stop.
 */

export type TransitionKind = 'street' | 'elevated' | 'descend' | 'rise' | 'ascend' | 'return' | 'fade'

const HERO_Z = 3.1
const FINALE_Z = 42
const COOLDOWN_MS = 520

let current = 0
let busy = false
let cooldownUntil = 0
const queue: Array<() => void> = []
const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function getCurrent() {
  return current
}
/** the ride keeps the director's idea of the current stop in step */
export function setCurrent(i: number) {
  current = i
}
export function isBusy() {
  return busy
}
export function inCooldown() {
  return performance.now() < cooldownUntil
}
export function canStep() {
  return !busy && !inCooldown() && !overlayOpen()
}

/* ------------------------------------------------------------------ helpers */

function ui(name: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-ui="${name}"]`)
}

function autoRestFor(id: StopId) {
  if (id === 'hero') return { Z: HERO_Z, X: 0, lift: 0, opacity: 1 }
  if (id === 'finale') return { Z: FINALE_Z, X: 0, lift: 0, opacity: 0 }
  return { Z: AUTO_Z, X: 0, lift: 0, opacity: 1 }
}

function uiFor(id: StopId): 'hero' | 'arrival' | 'finale' {
  return id === 'hero' ? 'hero' : id === 'finale' ? 'finale' : 'arrival'
}

function kindFor(from: number, to: number): TransitionKind {
  if (reduceMotion) return 'fade'
  const a = STOPS[from]
  const b = STOPS[to]
  if ((a === 'hero' && b === 'finale') || (a === 'finale' && b === 'hero')) return 'fade'
  if (Math.abs(to - from) > 1) return 'elevated'
  return 'street'
}

/* ------------------------------------------------------------------ public API */

/** set the whole stage to a stop with no animation (initial load, deep links) */
export function jumpTo(index: number) {
  index = Math.max(0, Math.min(STOPS.length - 1, index))
  const id = STOPS[index]
  const rest = autoRestFor(id)
  Object.assign(autoMotion, { speed: 0, dir: 1, steer: 0, ...rest })
  Object.assign(cam, { d: stopD(index), lift: 0, pitch: 0 })
  for (const n of ['hero', 'arrival', 'finale']) {
    const el = ui(n)
    if (el) gsap.set(el, { autoAlpha: n === uiFor(id) ? 1 : 0, y: 0 })
  }
  const map = document.getElementById('city-map')
  if (map) gsap.set(map, { autoAlpha: 0 })
  const canopy = document.getElementById('hero-canopy')
  if (canopy) gsap.set(canopy, { autoAlpha: id === 'hero' ? 1 : 0, y: 0 })
  current = index
  useJourney.getState().setIndex(index)
  syncHash(id)
}

export function next() {
  if (rideHooks.active()) return rideHooks.next()
  // from the hero, "next" starts the ride
  if (current === 0 && canStep()) return rideHooks.start()
  if (canStep()) void go(current + 1)
}
export function prev() {
  if (rideHooks.active()) return rideHooks.prev()
  if (canStep()) void go(current - 1)
}

/** drive to a stop; resolves when the auto has parked there */
export function go(target: number): Promise<void> {
  target = Math.max(0, Math.min(STOPS.length - 1, target))
  if (rideHooks.active()) return rideHooks.go(target)
  // every area stop is reached by riding: enter the ride parked there
  if (target > 0 && target < STOPS.length - 1 && !busy) return rideHooks.enterAt(target)
  if (busy) return new Promise((res) => queue.push(() => void go(target).then(res)))
  if (target === current) return Promise.resolve()
  const from = current
  const kind = kindFor(from, target)
  busy = true
  const st = useJourney.getState()
  st.closePanel()
  st.setTransitioning(true)
  const toId = STOPS[target]
  const nextArea = isArea(toId) ? AREA_BY_SLUG[toId].shortName : ''
  st.setTransitLabel(nextArea)

  return new Promise((resolve) => {
    const tl = build(kind, from, target)
    tl.eventCallback('onComplete', () => {
      current = target
      busy = false
      cooldownUntil = performance.now() + COOLDOWN_MS
      useJourney.getState().setTransitioning(false)
      syncHash(STOPS[target])
      announce(STOPS[target])
      resolve()
      const nextInQueue = queue.shift()
      if (nextInQueue) nextInQueue()
    })
  })
}

export function syncHash(id: StopId) {
  try {
    const h = id === 'hero' ? '' : `#${id}`
    if (location.hash !== h) history.replaceState(null, '', h || location.pathname + location.search)
  } catch {
    /* sandboxed frames may refuse history access */
  }
}

export function announce(id: StopId) {
  const live = document.getElementById('journey-live')
  if (!live) return
  if (isArea(id)) live.textContent = `Arrived at ${AREA_BY_SLUG[id].heading}. ${AREA_BY_SLUG[id].subtitle}`
  else if (id === 'finale') live.textContent = 'End of the journey. Your Pujo. Your Bengaluru.'
  else live.textContent = 'Back at the start.'
}

/* ------------------------------------------------------------------ timelines */

function build(kind: TransitionKind, from: number, to: number): gsap.core.Timeline {
  const fromId = STOPS[from]
  const toId = STOPS[to]
  const H = getView().H
  const tl = gsap.timeline()
  const setIndexAt = (t: number) => tl.call(() => useJourney.getState().setIndex(to), [], t)
  const uiOut = ui(uiFor(fromId))
  const uiIn = ui(uiFor(toId))
  const dTo = stopD(to)

  const uiInAt = (t: number) => {
    if (!uiIn) return
    tl.fromTo(uiIn, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, t)
    // the pandal label rises into place, then its call to action appears
    const pops = uiIn.querySelectorAll<HTMLElement>('[data-pop]')
    if (pops.length && !reduceMotion)
      tl.fromTo(pops, { autoAlpha: 0, y: 22, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.6)', stagger: 0.16, clearProps: 'transform' }, t + 0.05)
  }
  if (uiOut) tl.to(uiOut, { autoAlpha: 0, y: -12, duration: 0.32, ease: 'power2.in' }, 0)

  // the festive canopy over the hero lifts up and out of focus as the ride begins, and comes back down on return
  const canopy = document.getElementById('hero-canopy')
  if (canopy && fromId === 'hero' && toId !== 'hero') {
    tl.to(canopy, { y: -H * 0.32, duration: 1.1, ease: 'power2.in' }, 0.05)
    tl.to(canopy, { autoAlpha: 0, duration: 0.5, ease: 'none' }, 0.65)
  } else if (canopy && toId === 'hero' && fromId !== 'hero') {
    tl.fromTo(canopy, { autoAlpha: 0, y: -H * 0.32 }, { autoAlpha: 1, y: 0, duration: 1.3, ease: 'power3.out' }, kind === 'fade' ? 0.3 : 1.6)
  }

  if (kind === 'fade') {
    const veil = document.getElementById('world-fade')
    if (veil) tl.fromTo(veil, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: 'none' }, 0.05)
    tl.call(() => {
      Object.assign(cam, { d: dTo, lift: 0, pitch: 0 })
      Object.assign(autoMotion, { speed: 0, steer: 0, ...autoRestFor(toId) })
    }, [], 0.42)
    if (veil) tl.to(veil, { autoAlpha: 0, duration: 0.55, ease: 'none' }, 0.5)
    setIndexAt(0.42)
    uiInAt(0.7)
    return tl
  }

  if (kind === 'street') {
    // a real drive: pull away, ride the road through the city, brake and park by the next pandal
    const dir = to > from ? 1 : -1
    const D = 3.7
    autoMotion.dir = dir as 1 | -1
    tl.to(cam, { d: dTo, duration: D, ease: 'sine.inOut' }, 0.05)
    tl.to(autoMotion, { speed: 1, duration: 0.9, ease: 'power2.in' }, 0.05)
    tl.to(autoMotion, { speed: 0, duration: 1.2, ease: 'power2.out' }, D - 1.15)
    if (fromId === 'hero') tl.to(autoMotion, { Z: AUTO_Z, duration: 2.0, ease: 'power2.inOut' }, 0.2)
    if (toId === 'hero') tl.to(autoMotion, { Z: HERO_Z, duration: 2.0, ease: 'power2.inOut' }, 1.2)
    if (toId === 'finale') {
      // the auto drives on towards Vidhana Soudha while the camera slows
      tl.to(autoMotion, { Z: FINALE_Z, duration: 3.0, ease: 'power1.in' }, 0.9)
      tl.to(autoMotion, { opacity: 0, duration: 0.7, ease: 'none' }, 3.1)
      tl.set(autoMotion, { speed: 0 }, D + 0.1)
    }
    if (fromId === 'finale') {
      autoMotion.Z = 14
      tl.to(autoMotion, { opacity: 1, duration: 0.4, ease: 'none' }, 0.3)
      tl.to(autoMotion, { Z: AUTO_Z, duration: 2.6, ease: 'power2.out' }, 0.3)
    }
    setIndexAt(D * 0.55)
    uiInAt(D - 0.15)
    return tl
  }

  // 'elevated': the camera rises over the city, the route map carries you across, and you descend at the new stop
  const D = 3.8
  const map = document.getElementById('city-map')
  mapState.setRoute(fromId, toId)
  autoMotion.dir = 1
  tl.to(autoMotion, { speed: 1, duration: 0.5, ease: 'power2.in' }, 0.05)
  tl.to(cam, { lift: 46, pitch: -0.62, duration: 1.15, ease: 'power2.in' }, 0.05)
  tl.to(autoMotion, { lift: -1.4, Z: AUTO_Z + 2.5, duration: 0.85, ease: 'power2.in' }, 0.12)
  tl.to(autoMotion, { opacity: 0, duration: 0.3, ease: 'none' }, 0.55)
  if (map) {
    tl.fromTo(map, { autoAlpha: 0, scale: 1.06 }, { autoAlpha: 1, scale: 1, duration: 0.55, ease: 'power2.out' }, 0.75)
    tl.to(mapState, { t: 1, duration: 1.35, ease: 'sine.inOut' }, 1.1)
    tl.to(map, { autoAlpha: 0, scale: 0.97, duration: 0.5, ease: 'power2.in' }, 2.45)
  }
  tl.call(() => {
    cam.d = dTo
  }, [], map ? 1.4 : 1.2)
  setIndexAt(1.6)
  tl.to(cam, { lift: 0, pitch: 0, duration: 1.3, ease: 'power3.out' }, 2.4)
  const rest = autoRestFor(toId)
  tl.fromTo(autoMotion, { lift: -1.4, Z: rest.Z + 2.5 }, { lift: 0, Z: rest.Z, duration: 1.0, ease: 'power3.out', immediateRender: false }, 2.6)
  tl.to(autoMotion, { opacity: rest.opacity, duration: 0.35, ease: 'none' }, 2.6)
  tl.to(autoMotion, { speed: 0, duration: 0.8, ease: 'power2.out' }, D - 0.85)
  uiInAt(D - 0.1)
  return tl
}
