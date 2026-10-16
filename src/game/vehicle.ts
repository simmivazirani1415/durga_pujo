/**
 * The auto as a small arcade vehicle: smooth throttle and friction, a bicycle steering model with an auto's tight
 * turn radius, gentle lane-keeping when you let go, and soft road edges that ease you back instead of stopping you.
 * Nothing here touches React; the controller reads and writes these objects every frame.
 */
import { frame, locate, roadYaw, stopD } from '../world3d/route'
import { laneX, pandalSpot, restPose, roadHalf } from '../world3d/areas3d'
import { BRANCH_HALF, BRANCH_TO, J, branchNearest, branchPoint } from '../world3d/branch'
import { AUTO_Z } from '../scenes/world'

export const WB = 2.0
/** default rolling speed, about 16 km/h */
export const CRUISE = 4.4
/** top speed, about 58 km/h */
export const VMAX = 16
/** auto-drive speed, about 40 km/h */
export const AUTO_CRUISE = 11
export const REVERSE = -2.6
export const FIRST_STOP = 1
export const LAST_STOP = 9
export const FINALE = 10
export const D_MIN = -38
export const D_MAX = stopD(FINALE) + 150

export const keys = { up: false, down: false, left: false, right: false, hand: false }

export const car = {
  x: 0,
  z: 0,
  yaw: 0,
  /** signed speed, m/s */
  v: 0,
  /** wheel angle, radians, + = right */
  steer: 0,
  /** -1..1 steering input after smoothing */
  steerIn: 0,
  /** route position, refreshed every step */
  d: 0,
  X: 0,
  onBranch: false,
  /** arc length along the side road when near it */
  bs: 0,
  /** seconds spent being eased back onto the road */
  offroad: 0,
  /** handbrake latched until the visitor accelerates */
  hold: false,
  downFor: 0,
}

export const wrap = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const fwdOf = (yaw: number) => ({ x: -Math.sin(yaw), z: -Math.cos(yaw) })
const rightOf = (yaw: number) => ({ x: Math.cos(yaw), z: -Math.sin(yaw) })

export function maxSteer(v: number) {
  return 0.6 - 0.42 * clamp(Math.abs(v) / VMAX, 0, 1)
}

/** +1 when the auto faces along the route (towards larger d), -1 when it faces back */
export function travelDir(): 1 | -1 {
  if (car.onBranch) return 1
  return Math.cos(car.yaw - roadYaw(car.d)) >= 0 ? 1 : -1
}

/** where the auto stands when parked at stop i: AUTO_Z ahead of the camera's resting pose, facing the pandal */
export function parkPose(i: number) {
  const r = restPose(i)
  const f = fwdOf(r.yaw)
  return { x: r.x + f.x * AUTO_Z, z: r.z + f.z * AUTO_Z, yaw: r.yaw, cam: r }
}

/** the open forecourt in front of stop i's pandal, in road coordinates */
export function forecourt(i: number) {
  const p = pandalSpot(i)
  const D = stopD(i)
  return { d0: D - 6, d1: p.d - 12, x0: roadHalf(D) - 0.5, x1: p.X - 4 }
}

export function nearestStop(d: number) {
  return clamp(Math.round(d / 130), FIRST_STOP, LAST_STOP)
}

export function refreshRoute() {
  const l = locate(car.x, car.z)
  car.d = l.d
  car.X = l.X
  if (car.d > J - 12 && car.d < J + 160) {
    const b = branchNearest(car.x, car.z)
    car.bs = b.s
    car.onBranch = b.dist < BRANCH_HALF + 0.6 && b.s > 4 && car.X < -roadHalf(car.d) + 0.4
  } else car.onBranch = false
}

/* ------------------------------------------------------------------ the drivable network */

interface Pt {
  x: number
  z: number
}

/** keep the auto on the road, the side road or a pandal forecourt; returns how far it had to be eased back */
function constrain(dt: number): number {
  const d = car.d
  const half = roadHalf(clamp(d, D_MIN, D_MAX)) - 0.55
  if (d >= D_MIN && d <= D_MAX && Math.abs(car.X) <= half) return 0
  // forecourt of the nearest stop
  const i = nearestStop(d)
  const fc = forecourt(i)
  if (d >= fc.d0 && d <= fc.d1 && car.X >= fc.x0 && car.X <= fc.x1) return 0
  // side road
  let bn: { s: number; lat: number; dist: number } | null = null
  if (d > J - 12 && d < J + 160) {
    bn = branchNearest(car.x, car.z)
    if (bn.dist <= BRANCH_HALF - 0.4) return 0
  }
  // nearest allowed point
  const cands: Pt[] = []
  const dc = clamp(d, D_MIN, D_MAX)
  const fm = frame(dc, clamp(car.X, -half, half))
  cands.push({ x: fm.x, z: fm.z })
  if (Math.abs(d - (fc.d0 + fc.d1) / 2) < 40) {
    const f2 = frame(clamp(d, fc.d0, fc.d1), clamp(car.X, fc.x0, fc.x1))
    cands.push({ x: f2.x, z: f2.z })
  }
  if (bn) {
    const p = branchPoint(bn.s, clamp(bn.lat, -(BRANCH_HALF - 0.4), BRANCH_HALF - 0.4))
    cands.push({ x: p.x, z: p.z })
  }
  let best = cands[0]
  let bd = 1e9
  for (const c of cands) {
    const dd = (c.x - car.x) ** 2 + (c.z - car.z) ** 2
    if (dd < bd) {
      bd = dd
      best = c
    }
  }
  const k = Math.min(1, dt * 9)
  car.x += (best.x - car.x) * k
  car.z += (best.z - car.z) * k
  return Math.sqrt(bd)
}

/* ------------------------------------------------------------------ steering assist */

/**
 * The point to steer for, `Ld` metres ahead along the way the auto should go: its left lane on the main road
 * (India drives on the left), the side road when it is on it or the route takes it, otherwise the lane back.
 */
export function pursuitPoint(Ld: number, dir: 1 | -1, takeBranch: boolean): Pt {
  if (car.onBranch) {
    const b = branchNearest(car.x, car.z)
    const fwdB = Math.cos(car.yaw - branchPoint(b.s).yaw) >= 0 ? 1 : -1
    const s = b.s + fwdB * Ld
    if (fwdB < 0 && s < 2) {
      // heading back to the main road: aim for the lane in the direction we will turn into
      const f = frame(J + 6 * dir, dir > 0 ? laneX(J) : -laneX(J))
      return { x: f.x, z: f.z }
    }
    return branchPoint(s, fwdB > 0 ? -1.6 : 1.6)
  }
  const d1 = car.d + dir * Ld
  if (takeBranch && dir > 0 && d1 > J - 2) {
    const s = car.d > J - 4 ? branchNearest(car.x, car.z).s + Ld : d1 - J
    const p = branchPoint(Math.max(0, s), -1.6)
    return { x: p.x, z: p.z }
  }
  const lane = dir > 0 ? laneX(d1) : -laneX(d1)
  const f = frame(clamp(d1, D_MIN, D_MAX), lane)
  return { x: f.x, z: f.z }
}

/** pure pursuit: the wheel angle that arcs the auto through point p */
export function steerFor(p: Pt): number {
  const f = fwdOf(car.yaw)
  const r = rightOf(car.yaw)
  const dx = p.x - car.x
  const dz = p.z - car.z
  const lx = dx * r.x + dz * r.z
  const lz = dx * f.x + dz * f.z
  const Ld = Math.max(1, Math.hypot(lx, lz))
  const alpha = Math.atan2(lx, lz)
  return Math.atan((2 * WB * Math.sin(alpha)) / Ld)
}

/* ------------------------------------------------------------------ one physics step */

export interface StepInput {
  /** steering the assist wants (radians), or null for none */
  assist: number | null
  /** auto-drive owns throttle */
  auto: boolean
  autoSpeed: number
}

export function step(dt: number, inp: StepInput) {
  // throttle and brakes
  let target = inp.auto ? inp.autoSpeed : CRUISE
  let rate = 2.2
  if (keys.up) {
    car.hold = false
    target = VMAX
    rate = 4.6
  }
  if (keys.hand) car.hold = true
  if (keys.down) {
    car.downFor += dt
    if (car.v > 0.25) {
      target = 0
      rate = 7
    } else if (car.downFor > 0.35) {
      target = REVERSE
      rate = 2.4
    } else target = 0
  } else car.downFor = 0
  if (car.hold && !keys.up) {
    target = 0
    rate = 9
  }
  if (car.v < target) car.v = Math.min(target, car.v + rate * dt)
  else car.v = Math.max(target, car.v - Math.max(rate, 1.6) * dt)

  // steering: the visitor's input wins; with hands off, the assist eases back into lane
  const cmd = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
  const ms = maxSteer(car.v)
  let want = 0
  let r = 5
  if (cmd !== 0) {
    want = cmd
    r = 3.4
  } else if (inp.assist !== null && car.v > 0.4) {
    want = clamp(inp.assist / ms, -1, 1)
    r = 4
  }
  car.steerIn += clamp(want - car.steerIn, -r * dt, r * dt)
  car.steer = car.steerIn * ms

  // bicycle model; positive yaw turns left
  car.yaw = wrap(car.yaw - ((car.v * Math.tan(car.steer)) / WB) * dt)
  car.x += -Math.sin(car.yaw) * car.v * dt
  car.z += -Math.cos(car.yaw) * car.v * dt
  refreshRoute()
  const pushed = constrain(dt)
  if (pushed > 0.05) {
    car.offroad += dt
    car.v *= 1 - Math.min(1, dt * 1.6)
    refreshRoute()
  } else car.offroad = Math.max(0, car.offroad - dt * 2)
}

/* ------------------------------------------------------------------ scripted paths (pulling in, pulling out) */

export interface Path {
  pts: { x: number; z: number; yaw: number; s: number }[]
  len: number
}

/** a smooth cubic from one pose to another, sampled by arc length */
export function makePath(a: { x: number; z: number; yaw: number }, b: { x: number; z: number; yaw: number }, ka?: number, kb?: number): Path {
  const dist = Math.hypot(b.x - a.x, b.z - a.z)
  const k0 = ka ?? clamp(dist * 0.42, 3, 18)
  const k1 = kb ?? clamp(dist * 0.42, 3, 18)
  const fa = fwdOf(a.yaw)
  const fb = fwdOf(b.yaw)
  const P = [a, { x: a.x + fa.x * k0, z: a.z + fa.z * k0 }, { x: b.x - fb.x * k1, z: b.z - fb.z * k1 }, b]
  const N = 80
  const pts: Path['pts'] = []
  let s = 0
  let px = a.x
  let pz = a.z
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const u = 1 - t
    const x = u * u * u * P[0].x + 3 * u * u * t * P[1].x + 3 * u * t * t * P[2].x + t * t * t * P[3].x
    const z = u * u * u * P[0].z + 3 * u * u * t * P[1].z + 3 * u * t * t * P[2].z + t * t * t * P[3].z
    const dx = 3 * u * u * (P[1].x - P[0].x) + 6 * u * t * (P[2].x - P[1].x) + 3 * t * t * (P[3].x - P[2].x)
    const dz = 3 * u * u * (P[1].z - P[0].z) + 6 * u * t * (P[2].z - P[1].z) + 3 * t * t * (P[3].z - P[2].z)
    s += Math.hypot(x - px, z - pz)
    px = x
    pz = z
    pts.push({ x, z, yaw: i === N ? b.yaw : Math.atan2(-dx, -dz), s })
  }
  return { pts, len: s }
}

export function samplePath(p: Path, s: number) {
  s = clamp(s, 0, p.len)
  let lo = 0
  let hi = p.pts.length - 1
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1
    if (p.pts[m].s < s) lo = m
    else hi = m
  }
  const A = p.pts[lo]
  const B = p.pts[hi]
  const t = (s - A.s) / Math.max(1e-6, B.s - A.s)
  return { x: A.x + (B.x - A.x) * t, z: A.z + (B.z - A.z) * t, yaw: A.yaw + wrap(B.yaw - A.yaw) * t }
}

/** the main-road lane pose at d, facing the given way */
export function lanePose(d: number, dir: 1 | -1) {
  const f = frame(d, dir > 0 ? laneX(d) : -laneX(d))
  return { x: f.x, z: f.z, yaw: wrap(roadYaw(d) + (dir > 0 ? 0 : Math.PI)) }
}

export function placeCar(p: { x: number; z: number; yaw: number }, v = 0) {
  car.x = p.x
  car.z = p.z
  car.yaw = p.yaw
  car.v = v
  car.steer = 0
  car.steerIn = 0
  car.offroad = 0
  car.hold = false
  refreshRoute()
}

export { BRANCH_TO }
