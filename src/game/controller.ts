/**
 * The ride controller: starts and ends the ride, runs the auto every frame (before the 3D engine renders), places
 * the chase camera, handles pulling in at a pandal and pulling out again, the jumps across the city, the junction
 * and route hints, and the keyboard. It reuses the existing director, stop card, Explore panel and city map.
 */
import gsap from 'gsap'
import { AREA_BY_SLUG, STOPS, isArea } from '../data/areas'
import type { AreaSlug, StopId } from '../data/types'
import { announce, getCurrent, jumpTo, setCurrent, syncHash } from '../engine/director'
import { autoMotion, mapState } from '../engine/motion'
import { getView } from '../engine/viewport'
import { overlayOpen, useJourney } from '../store/journey'
import { cam, drive } from '../world3d/engine3d'
import { BRANCH_AREA, BRANCH_EXIT, BRANCH_TO, J } from '../world3d/branch'
import { frame, roadYaw, stopD } from '../world3d/route'
import { laneX } from '../world3d/areas3d'
import { AUTO_Z } from '../scenes/world'
import { rideHooks } from './hooks'
import { useGame, type Hint } from './store'
import {
  AUTO_CRUISE,
  CRUISE,
  D_MAX,
  D_MIN,
  FINALE,
  FIRST_STOP,
  LAST_STOP,
  VMAX,
  car,
  forecourt,
  keys,
  lanePose,
  makePath,
  nearestStop,
  parkPose,
  placeCar,
  pursuitPoint,
  refreshRoute,
  samplePath,
  steerFor,
  step,
  travelDir,
  wrap,
  type Path,
} from './vehicle'

const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const HERO_Z = 3.1

/* ------------------------------------------------------------------ state */

const rig = {
  camYaw: 0,
  camX: 0,
  camZ: 0,
  camDist: AUTO_Z,
  camH: 2,
  /** a stop the visitor drove past on purpose; not pulled into again until they are well away */
  skip: -1,
  path: null as Path | null,
  pathS: 0,
  pathStop: 0,
  pathKind: 'in' as 'in' | 'out',
  pathV0: CRUISE,
  /** temporary help turning round */
  turning: false,
  /** scenic ride: when to carry on from a stop */
  scenicAt: 0,
  /** after a halt, accelerate must be let go and pressed again to ride on */
  needRelease: false,
  parkedAt: 0,
  hudAt: 0,
  t: 0,
  consumed: new Set<string>(),
  pending: null as null | { stop: number; resolve: () => void },
}

const g = () => useGame.getState()
const ui = (name: string) => document.querySelector<HTMLElement>(`[data-ui="${name}"]`)

function paused() {
  const s = g()
  return s.paused || s.mapOpen || overlayOpen()
}

/* ------------------------------------------------------------------ the stop card */

function showArrival(i: number) {
  const st = useJourney.getState()
  st.setIndex(i)
  setCurrent(i)
  syncHash(STOPS[i])
  announce(STOPS[i])
  const el = ui('arrival')
  if (!el) return
  gsap.killTweensOf(el)
  gsap.fromTo(el, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' })
  const pops = el.querySelectorAll<HTMLElement>('[data-pop]')
  if (pops.length && !reduceMotion) gsap.fromTo(pops, { autoAlpha: 0, y: 22, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.6)', stagger: 0.16, clearProps: 'transform' })
}

function hideArrival() {
  const el = ui('arrival')
  if (el && Number(gsap.getProperty(el, 'autoAlpha')) > 0) gsap.to(el, { autoAlpha: 0, y: -12, duration: 0.3, ease: 'power2.in' })
  useJourney.getState().closePanel()
}

/* ------------------------------------------------------------------ camera */

function snapCamera() {
  rig.camYaw = car.yaw
  rig.camX = car.x + Math.sin(car.yaw) * rig.camDist
  rig.camZ = car.z + Math.cos(car.yaw) * rig.camDist
}

function placeCamera(dt: number) {
  const s = g()
  const wide = s.cam === 'wide'
  const parked = s.phase === 'parked' || s.phase === 'arriving'
  const wantDist = wide ? 5.6 : AUTO_Z
  const wantH = wide ? 3.4 : 2
  if (!gsap.isTweening(rig)) {
    rig.camDist += (wantDist - rig.camDist) * Math.min(1, dt * 2.5)
  }
  rig.camH += (wantH - rig.camH) * Math.min(1, dt * 2.5)
  rig.camYaw += wrap(car.yaw - rig.camYaw) * Math.min(1, dt * (parked ? 3 : 3.2))
  const tx = car.x + Math.sin(rig.camYaw) * rig.camDist
  const tz = car.z + Math.cos(rig.camYaw) * rig.camDist
  const far = Math.hypot(tx - rig.camX, tz - rig.camZ) > 12
  const k = far ? 1 : Math.min(1, dt * 14)
  rig.camX += (tx - rig.camX) * k
  rig.camZ += (tz - rig.camZ) * k
  drive.x = rig.camX
  drive.z = rig.camZ
  drive.yaw = rig.camYaw
  drive.h = rig.camH
  // wider at speed, settling back to the usual framing when slow or parked
  const sp = Math.min(1, Math.abs(car.v) / VMAX)
  const fovT = parked ? 1 : 1 - 0.075 * sp
  drive.fov += (fovT - drive.fov) * Math.min(1, dt * 2)
  autoMotion.fov = drive.fov

  // the auto artwork follows the vehicle's true position relative to the camera
  const rx = car.x - rig.camX
  const rz = car.z - rig.camZ
  const fx = -Math.sin(rig.camYaw)
  const fz = -Math.cos(rig.camYaw)
  autoMotion.Z = Math.max(1.4, Math.min(9, rx * fx + rz * fz))
  autoMotion.X = Math.max(-2, Math.min(2, rx * -fz + rz * fx))
  autoMotion.lift = 2 - rig.camH
  autoMotion.speed = Math.min(1, Math.abs(car.v) / 9)
  autoMotion.dir = car.v < -0.1 ? -1 : 1
  autoMotion.steer = car.steerIn * 0.5
  // the auto visibly swings its nose into a turn (a yaw, never a lean)
  const yawT = wrap(car.yaw - rig.camYaw) - car.steerIn * 0.22 * Math.min(1, Math.abs(car.v) / 3)
  autoMotion.yaw += (Math.max(-0.5, Math.min(0.5, yawT)) - autoMotion.yaw) * Math.min(1, dt * 8)
}

/* ------------------------------------------------------------------ route logic */

function destOrNext(): number | null {
  const s = g()
  if (s.dest !== null) return s.dest
  // pandal hopping: with no destination, the next pandal along the way is always the next halt
  const dir = travelDir()
  if (dir > 0) {
    for (let i = FIRST_STOP; i <= LAST_STOP; i++) if (stopD(i) + 6 > car.d + 4 && i !== rig.skip) return i
    return FINALE
  }
  for (let i = LAST_STOP; i >= FIRST_STOP; i--) if (stopD(i) + 6 < car.d - 4 && i !== rig.skip) return i
  return null
}

function routeDir(target: number | null): 1 | -1 {
  if (target === null) return travelDir()
  if (car.onBranch) return 1
  const td = target === FINALE ? stopD(FINALE) + 60 : stopD(target)
  return td >= car.d ? 1 : -1
}

function takesBranch(target: number | null) {
  return target === BRANCH_TO && !car.onBranch && (car.d < J - 2 || (car.d < J + 24 && car.X < -1))
}

/* ------------------------------------------------------------------ pulling in and out */

function startArrival(i: number) {
  const p = parkPose(i)
  rig.path = makePath({ x: car.x, z: car.z, yaw: car.yaw }, p)
  rig.pathS = 0
  rig.pathStop = i
  rig.pathKind = 'in'
  rig.pathV0 = Math.max(CRUISE, Math.min(Math.abs(car.v), VMAX))
  rig.turning = false
  g().set({ phase: 'arriving', hint: null })
}

function arrive(i: number) {
  const p = parkPose(i)
  placeCar(p, 0)
  rig.path = null
  drive.settle = 1
  drive.stop = i
  const s = g()
  s.set({ phase: 'parked', dest: s.dest === i ? null : s.dest, hint: null })
  showArrival(i)
  rig.needRelease = true
  rig.parkedAt = rig.t
  rig.scenicAt = 0
  if (rig.pending && rig.pending.stop === i) {
    rig.pending.resolve()
    rig.pending = null
  }
}

/** pull out of the forecourt back onto the road, towards the next stop (or the destination) */
function leave(dir?: 1 | -1) {
  const s = g()
  if (s.phase !== 'parked') return
  const i = drive.stop
  const target = s.dest
  const out: 1 | -1 = dir ?? (target !== null ? (target === i ? 1 : stopD(target) >= stopD(i) ? 1 : -1) : 1)
  // at the junction's stop, rejoin the road before the fork so the side road is still a choice
  const exit = out > 0 ? lanePose(stopD(i) + (i === BRANCH_AREA ? 30 : 44), 1) : lanePose(stopD(i) - 16, -1)
  rig.path = makePath({ x: car.x, z: car.z, yaw: car.yaw }, exit, out > 0 ? 6 : 5, out > 0 ? 14 : 12)
  rig.pathS = 0
  rig.pathKind = 'out'
  rig.pathStop = i
  rig.skip = i
  drive.settle = 0
  rig.scenicAt = 0
  s.set({ phase: 'leaving', tutorial: false })
  hideArrival()
}

function followPath(dt: number) {
  const p = rig.path!
  const rest = p.len - rig.pathS
  let v: number
  // keep riding at speed and brake only in the last second before the pandal
  if (rig.pathKind === 'in') v = Math.max(0.5, Math.min(rig.pathV0, Math.sqrt(2 * Math.max(4, rig.pathV0) * Math.max(0, rest))))
  else v = Math.min(g().autoDrive ? AUTO_CRUISE : CRUISE, 1.2 + rig.pathS * (g().autoDrive ? 0.9 : 0.45))
  rig.pathS += v * dt
  const q = samplePath(p, rig.pathS)
  car.x = q.x
  car.z = q.z
  const prevYaw = car.yaw
  car.yaw = q.yaw
  car.v = v
  car.steerIn += (Math.max(-1, Math.min(1, -wrap(q.yaw - prevYaw) / Math.max(dt, 1e-3) / 1.4)) - car.steerIn) * Math.min(1, dt * 5)
  refreshRoute()
  if (rig.pathS >= p.len - 0.02) {
    if (rig.pathKind === 'in') arrive(rig.pathStop)
    else {
      rig.path = null
      g().set({ phase: 'free' })
    }
  }
}

/* ------------------------------------------------------------------ jumps across the city */

function slugAt(i: number): AreaSlug | 'hero' | 'finale' {
  const id = STOPS[Math.max(0, Math.min(STOPS.length - 1, i))]
  return id as AreaSlug | 'hero' | 'finale'
}

/** a cinematic hop: up over the city map and down onto the approach road of stop j, then pull in there */
function jump(j: number, from?: number, park = true): Promise<void> {
  const s = g()
  if (s.phase === 'jumping') return Promise.resolve()
  hideArrival()
  drive.settle = 0
  rig.path = null
  rig.turning = false
  s.set({ phase: 'jumping', hint: null, dest: j })
  const fromSlug = slugAt(from ?? (car.onBranch ? BRANCH_AREA : nearestStop(car.d)))
  const land = () => {
    if (park) placeCar(parkPose(j), 0)
    else placeCar(lanePose(stopD(j) - 46, 1), CRUISE)
    snapCamera()
    useJourney.getState().setIndex(j)
    setCurrent(j)
  }
  return new Promise((resolve) => {
    const done = () => {
      rig.skip = -1
      if (park) arrive(j)
      else g().set({ phase: 'free' })
      resolve()
    }
    const tl = gsap.timeline({ onComplete: done })
    if (reduceMotion) {
      const veil = document.getElementById('world-fade')
      if (veil) tl.fromTo(veil, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0)
      tl.call(land, [], 0.32)
      if (veil) tl.to(veil, { autoAlpha: 0, duration: 0.45 }, 0.4)
      return
    }
    const map = document.getElementById('city-map')
    mapState.setRoute(fromSlug, slugAt(j))
    tl.to(cam, { lift: 46, pitch: -0.62, duration: 1.15, ease: 'power2.in' }, 0)
    tl.to(autoMotion, { opacity: 0, duration: 0.3, ease: 'none' }, 0.45)
    if (map) {
      tl.fromTo(map, { autoAlpha: 0, scale: 1.06 }, { autoAlpha: 1, scale: 1, duration: 0.55, ease: 'power2.out' }, 0.7)
      tl.to(mapState, { t: 1, duration: 1.35, ease: 'sine.inOut' }, 1.05)
      tl.to(map, { autoAlpha: 0, scale: 0.97, duration: 0.5, ease: 'power2.in' }, 2.4)
    }
    tl.call(land, [], 1.35)
    tl.to(cam, { lift: 0, pitch: 0, duration: 1.3, ease: 'power3.out' }, 2.35)
    tl.to(autoMotion, { opacity: 1, duration: 0.35, ease: 'none' }, 2.6)
  })
}

function fadeDo(fn: () => void): Promise<void> {
  return new Promise((resolve) => {
    const veil = document.getElementById('world-fade')
    const tl = gsap.timeline({ onComplete: () => resolve() })
    if (veil) tl.fromTo(veil, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.32, ease: 'none' }, 0)
    tl.call(fn, [], 0.34)
    if (veil) tl.to(veil, { autoAlpha: 0, duration: 0.5, ease: 'none' }, 0.42)
  })
}

/* ------------------------------------------------------------------ modes */

function canopyOut() {
  const canopy = document.getElementById('hero-canopy')
  const H = getView().H
  if (canopy) {
    gsap.to(canopy, { y: -H * 0.32, duration: 1.1, ease: 'power2.in' })
    gsap.to(canopy, { autoAlpha: 0, duration: 0.5, ease: 'none', delay: 0.6 })
  }
  const hero = ui('hero')
  if (hero) gsap.to(hero, { autoAlpha: 0, y: -12, duration: 0.35, ease: 'power2.in' })
}

/** from the hero: the camera eases in behind the auto and it starts rolling */
export function startRide(scenic = false) {
  const s = g()
  if (s.mode === 'drive' || getCurrent() !== 0) return
  // the hero's camera pose, exactly as the engine frames it
  const f = frame(0, laneX(0))
  const a = frame(8, laneX(8))
  const yaw = Math.atan2(-(a.x - f.x), -(a.z - f.z))
  placeCar({ x: f.x - Math.sin(yaw) * HERO_Z, z: f.z - Math.cos(yaw) * HERO_Z, yaw }, 0)
  rig.camDist = HERO_Z
  rig.camH = 2
  snapCamera()
  gsap.to(rig, { camDist: AUTO_Z, duration: 2.2, ease: 'power2.inOut' })
  drive.on = true
  drive.settle = 0
  drive.fov = 1
  rig.skip = -1
  autoMotion.opacity = 1
  s.set({ mode: 'drive', phase: 'free', autoDrive: scenic, dest: null, paused: false, tutorial: true, hint: null })
  canopyOut()
  useJourney.getState().closePanel()
}

/** enter the ride parked at stop i (search, the stop list, deep links, the finale's way back) */
export function enterAt(i: number): Promise<void> {
  const enter = () => {
    jumpTo(i)
    const p = parkPose(i)
    placeCar(p, 0)
    rig.camDist = AUTO_Z
    rig.camH = 2
    snapCamera()
    drive.on = true
    drive.settle = 1
    drive.stop = i
    drive.fov = 1
    rig.skip = -1
    autoMotion.opacity = 1
    g().set({ mode: 'drive', phase: 'parked', dest: null, paused: false, hint: null })
    setCurrent(i)
  }
  if (getCurrent() === 0 && g().mode === 'hero' && document.getElementById('hero-canopy')) {
    return fadeDo(enter)
  }
  return fadeDo(enter)
}

/** enter at a stop straight away, with no fade (initial load from a deep link) */
export function enterAtNow(i: number) {
  jumpTo(i)
  placeCar(parkPose(i), 0)
  rig.camDist = AUTO_Z
  snapCamera()
  drive.on = true
  drive.settle = 1
  drive.stop = i
  g().set({ mode: 'drive', phase: 'parked', dest: null, tutorial: false })
}

function endRide(to: 0 | typeof FINALE): Promise<void> {
  return fadeDo(() => {
    autoMotion.yaw = 0
    drive.on = false
    drive.settle = 0
    drive.fov = 1
    autoMotion.fov = 1
    rig.path = null
    for (const k of Object.keys(keys) as (keyof typeof keys)[]) keys[k] = false
    g().set({ mode: 'hero', phase: 'free', autoDrive: false, dest: null, paused: false, mapOpen: false, hint: null })
    useJourney.getState().closePanel()
    jumpTo(to)
  })
}
export const exitRide = () => endRide(0)
export const finishRide = () => endRide(FINALE)

/* ------------------------------------------------------------------ public actions for the HUD and map */

export function setDestination(j: number | null) {
  const s = g()
  s.set({ dest: j })
  if (j !== null && s.phase === 'parked' && j !== drive.stop) leave()
}

export function jumpToArea(j: number) {
  const s = g()
  s.set({ mapOpen: false })
  if (s.phase === 'parked' && drive.stop === j) return Promise.resolve()
  return jump(j)
}

export function toggleAuto() {
  const s = g()
  const on = !s.autoDrive
  s.set({ autoDrive: on, tutorial: false })
  if (on && s.phase === 'parked') leave()
}

export function toggleCam() {
  const s = g()
  s.set({ cam: s.cam === 'chase' ? 'wide' : 'chase' })
}

export function returnToRoute() {
  const target = destOrNext()
  void fadeDo(() => {
    const dir = routeDir(target)
    const d = Math.max(D_MIN + 4, Math.min(D_MAX - 4, car.onBranch ? J - 8 : car.d))
    placeCar(lanePose(d, dir), CRUISE * 0.6)
    snapCamera()
    rig.path = null
    g().set({ phase: 'free', hint: null })
  })
}

export function turnAround() {
  rig.turning = true
}

export function carryOn() {
  const s = g()
  if (s.phase === 'parked') leave(1)
}

/* ------------------------------------------------------------------ hints */

function computeHint(): Hint | null {
  const s = g()
  if (s.phase !== 'free') return null
  const target = destOrNext()
  const dir = travelDir()
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  if (car.d > stopD(FINALE) - 40 && !car.onBranch)
    return { text: 'Vidhana Soudha', sub: 'The end of the ride. Thank you for riding along.', action: 'finish', actionLabel: 'Finish the ride' }
  if (car.offroad > 2.2) return { text: 'Lost the road?', action: 'return', actionLabel: 'Return to route' }
  if (car.d < 8 && dir < 0 && !car.onBranch) return { text: 'This is where the ride starts', sub: 'Turn around to explore the city', action: 'turn', actionLabel: 'Turn around' }
  if (target !== null && Math.abs(car.v) > 0.5 && routeDir(target) !== dir && !car.onBranch) {
    const name = target === FINALE ? 'Vidhana Soudha' : AREA_BY_SLUG[STOPS[target] as AreaSlug].shortName
    return { text: `Turn around for ${name}`, sub: 'No rush. Every road leads back.', action: 'turn', actionLabel: 'Turn around' }
  }
  if (car.onBranch) return { text: 'This road leads to Indiranagar', sub: 'Ulsoor is straight on along the main road' }
  if (dir > 0 && car.d > J - 75 && car.d < J + 2) {
    const sub =
      target === BRANCH_TO ? 'Keep left for Indiranagar' : target === 3 ? 'Stay straight for Ulsoor' : `Keep ${coarse ? '◀' : 'left'} for Indiranagar, or ride straight on to Ulsoor`
    return { text: '← Indiranagar  ·  Ulsoor ↑', sub }
  }
  // the next pandal halt coming up (every pandal on the way is a halt)
  let nxt: number | null = null
  for (let k = FIRST_STOP; k <= LAST_STOP; k++) {
    const i = dir > 0 ? k : LAST_STOP + FIRST_STOP - k
    if (i !== rig.skip && (stopD(i) - car.d) * dir > 0) {
      nxt = i
      break
    }
  }
  if (nxt !== null && !car.onBranch) {
    const target = nxt
    const dd = (stopD(target) - car.d) * dir
    if (dd > 0 && dd < 95) {
      const a = AREA_BY_SLUG[STOPS[target] as AreaSlug]
      return { text: `Next pandal stop: ${a.shortName}`, sub: 'Your auto will halt at the pandal' }
    }
  }
  return null
}

function sameHint(a: Hint | null, b: Hint | null) {
  return a?.text === b?.text && a?.sub === b?.sub && a?.action === b?.action
}

/* ------------------------------------------------------------------ the frame */

function tick(_t: number, deltaMs: number) {
  if (!drive.on) return
  const dt = Math.min(0.05, deltaMs / 1000)
  rig.t += dt
  const s = g()
  drive.paused = paused()
  if (!drive.paused && s.phase !== 'jumping') {
    if (rig.path) followPath(dt)
    else if (s.phase === 'parked') {
      if (!keys.up) rig.needRelease = false
      if (keys.up && !rig.needRelease && rig.t - rig.parkedAt > 0.8) leave()
      else if (rig.scenicAt && rig.t > rig.scenicAt) leave()
      else if (s.autoDrive && s.dest !== null && s.dest !== drive.stop) leave()
      else if (keys.down) {
        // backing out of the forecourt is just pulling out the other way
        leave(-1)
      }
    } else {
      const target = destOrNext()
      const dir = routeDir(target)
      const branch = takesBranch(target)
      // help turning round, or the full auto-drive
      if (rig.turning && travelDir() === dir) rig.turning = false
      const auto = s.autoDrive || rig.turning
      const Ld = 4 + Math.abs(car.v) * 0.7
      const pp = pursuitPoint(Ld, auto ? dir : travelDir(), auto && branch)
      const assist = steerFor(pp)
      const curve = Math.min(1, Math.abs(car.steer) / 0.5)
      step(dt, { assist, auto, autoSpeed: rig.turning ? 3 : AUTO_CRUISE * (1 - 0.45 * curve) })
      // reaching any pandal, whatever the destination and wherever on the road, halts the auto there
      const halt = nearestStop(car.d)
      if (!car.onBranch && rig.skip !== halt && Math.abs(car.v) > 0.3) {
        const dd = stopD(halt) - car.d
        const td = travelDir()
        const lead = 34 + Math.abs(car.v) * 1.2
        if ((td > 0 && dd < lead && dd > -4) || (td < 0 && dd > -26 && dd < lead - 18)) startArrival(halt)
      }
      // steering into a pandal forecourt pulls in there
      if (g().phase === 'free') {
        const i = nearestStop(car.d)
        const fc = forecourt(i)
        if (rig.skip !== i && car.d > fc.d0 && car.d < fc.d1 && car.X > fc.x0 + 1.2) startArrival(i)
      }
      if (rig.skip >= 0 && Math.abs(car.d - stopD(rig.skip)) > 60) rig.skip = -1
      // the side road carries on to Indiranagar
      if (car.onBranch && car.bs > BRANCH_EXIT && Math.cos(car.yaw - roadYaw(car.d) - Math.PI / 2) > 0.2) void jump(BRANCH_TO, BRANCH_AREA, false)
    }
  }
  placeCamera(dt)

  // HUD a few times a second
  if (rig.t > rig.hudAt) {
    rig.hudAt = rig.t + 0.2
    const kmh = Math.round(Math.abs(car.v) * 3.6)
    const near = car.onBranch ? BRANCH_AREA : car.d < 65 ? 0 : car.d > stopD(LAST_STOP) + 65 ? FINALE : nearestStop(car.d)
    const hint = computeHint()
    const patch: Partial<ReturnType<typeof g>> = {}
    if (kmh !== s.speedKmh) patch.speedKmh = kmh
    if (near !== s.near) patch.near = near
    if (!sameHint(hint, s.hint)) patch.hint = hint
    if (Object.keys(patch).length) s.set(patch)
    // the scene's grade follows the area you are riding through
    const st = useJourney.getState()
    if (s.phase !== 'parked' && s.phase !== 'jumping' && st.index !== near) st.setIndex(near)
  }
}

/* ------------------------------------------------------------------ keyboard */

const KEYMAP: Record<string, keyof typeof keys> = {
  ArrowUp: 'up',
  w: 'up',
  W: 'up',
  ArrowDown: 'down',
  s: 'down',
  S: 'down',
  ArrowLeft: 'left',
  a: 'left',
  A: 'left',
  ArrowRight: 'right',
  d: 'right',
  D: 'right',
  ' ': 'hand',
}

function typing(t: EventTarget | null) {
  const el = t as HTMLElement | null
  return !!el && (!!el.closest?.('input, textarea, select, [contenteditable="true"]') || el.isContentEditable)
}

function onKeyDown(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey) return
  const s = g()
  if (typing(e.target)) return
  if (s.mode === 'hero') {
    // from the hero, any drive key starts the ride
    if (getCurrent() !== 0 || overlayOpen()) return
    const k = KEYMAP[e.key]
    if (!k || k === 'left' || k === 'right') return
    if (k === 'hand' && (e.target as HTMLElement | null)?.closest?.('button, a, [role="button"]')) return
    e.preventDefault()
    e.stopImmediatePropagation()
    rig.consumed.add(e.key.toLowerCase())
    startRide(false)
    return
  }
  if (e.key === 'Escape') {
    if (overlayOpen()) return
    if (s.mapOpen) s.set({ mapOpen: false })
    else s.set({ paused: !s.paused })
    e.preventDefault()
    return
  }
  if (overlayOpen() || s.mapOpen) return
  if (s.paused) {
    if (e.key === 'Enter' || e.key === ' ') {
      s.set({ paused: false })
      e.preventDefault()
    }
    return
  }
  const k = KEYMAP[e.key]
  if (k) {
    if (k === 'hand' && (e.target as HTMLElement | null)?.closest?.('button, a, [role="button"]')) return
    e.preventDefault()
    if (rig.consumed.has(e.key.toLowerCase())) return
    keys[k] = true
    if (s.tutorial) s.set({ tutorial: false })
    return
  }
  if (e.repeat) return
  if (e.key === 'f' || e.key === 'F') toggleAuto()
  else if (e.key === 'c' || e.key === 'C') toggleCam()
  else if (e.key === 'm' || e.key === 'M') s.set({ mapOpen: !s.mapOpen })
  else return
  e.preventDefault()
}

function onKeyUp(e: KeyboardEvent) {
  rig.consumed.delete(e.key.toLowerCase())
  const k = KEYMAP[e.key]
  if (k) keys[k] = false
}

function clearKeys() {
  for (const k of Object.keys(keys) as (keyof typeof keys)[]) keys[k] = false
  rig.consumed.clear()
}

/* ------------------------------------------------------------------ setup */

export function initRide(): () => void {
  rideHooks.active = () => g().mode === 'drive'
  rideHooks.start = (scenic?: boolean) => startRide(!!scenic)
  rideHooks.enterAt = (i: number) => enterAt(i)
  rideHooks.next = () => carryOn()
  rideHooks.prev = () => {
    if (g().phase === 'parked') leave(-1)
  }
  rideHooks.go = (i: number) => {
    if (i <= 0) return exitRide()
    if (i >= FINALE) return finishRide()
    if (g().phase === 'parked' && drive.stop === i) return Promise.resolve()
    return new Promise<void>((resolve) => {
      rig.pending = { stop: i, resolve }
      void jump(i)
      // never leave a caller waiting if the visitor takes over
      setTimeout(() => {
        if (rig.pending?.resolve === resolve) {
          rig.pending = null
          resolve()
        }
      }, 16000)
    })
  }
  if (import.meta.env.DEV) Object.assign(window, { __ride: { gsap, journey: useJourney, car, keys, drive, rig, game: useGame, jump, sim: (sec: number) => { for (let i = 0; i < sec * 30; i++) tick(0, 1000 / 30) }, startArrival, placeCar, lanePose, parkPose, snapCamera } })
  // runs before the 3D engine and the auto artwork each frame
  gsap.ticker.add(tick, false, true)
  window.addEventListener('keydown', onKeyDown, true)
  window.addEventListener('keyup', onKeyUp, true)
  window.addEventListener('blur', clearKeys)
  const unsub = useJourney.subscribe((st, prev) => {
    // opening any overlay lets go of the controls
    if ((st.panel.open && !prev.panel.open) || (st.plannerOpen && !prev.plannerOpen) || (st.searchOpen && !prev.searchOpen)) clearKeys()
  })
  return () => {
    gsap.ticker.remove(tick)
    window.removeEventListener('keydown', onKeyDown, true)
    window.removeEventListener('keyup', onKeyUp, true)
    window.removeEventListener('blur', clearKeys)
    unsub()
  }
}

export function areaName(i: number) {
  const id: StopId = STOPS[i]
  if (isArea(id)) return AREA_BY_SLUG[id].shortName
  return i === 0 ? 'Start' : 'Vidhana Soudha'
}

export { CRUISE }
