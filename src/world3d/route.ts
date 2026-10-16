/**
 * The ride is one continuous road through the city. Distance along it is `d` (metres); stop i sits at d = i * L.
 * World axes: +X right, +Y up, the road heads towards -Z. Around every stop the road runs dead straight, so a
 * parked camera looks straight down it; between stops it swings gently left or right.
 *
 * Area i owns the stretch [i*L - BACK, i*L + AHEAD): what lies behind the parked auto, the street it parks in,
 * its pandal, and the bend that leads on to the next area.
 */
export const L = 130
export const BACK = 45
export const AHEAD = L - BACK
/** the pandal stands this far ahead of the parked camera, on the right */
export const PANDAL_D = 36
export const PANDAL_X = 12.5

/** lateral swing of each leg of the route (metres), + bends right */
const SWING = [7, 8, -6, 10, -8, 7, -9, 8, -7, 6, 0]

function bump(t: number) {
  const s = Math.max(0, Math.min(1, (t - 0.4) / 0.5))
  const v = Math.sin(Math.PI * s)
  return v * v
}
function dBump(t: number) {
  const s = (t - 0.4) / 0.5
  if (s <= 0 || s >= 1) return 0
  return (2 * Math.sin(Math.PI * s) * Math.cos(Math.PI * s) * Math.PI) / 0.5
}

/** lateral offset of the road centre at distance d */
export function cx(d: number): number {
  const i = Math.floor(d / L)
  if (i < 0 || i >= SWING.length) return 0
  return SWING[i] * bump(d / L - i)
}

/** slope dX/dd of the road centre */
export function slope(d: number): number {
  const i = Math.floor(d / L)
  if (i < 0 || i >= SWING.length) return 0
  const t = d / L - i
  return (SWING[i] * dBump(t)) / L
}

export interface Frame {
  x: number
  z: number
  /** rotation about +Y that turns local -Z into the road's heading */
  yaw: number
}

/** world position of a point X metres right of the road centre at distance d */
export function frame(d: number, X = 0): Frame {
  const m = slope(d)
  const n = Math.sqrt(1 + m * m)
  return { x: cx(d) + X / n, z: -d + (X * m) / n, yaw: -Math.atan(m) }
}

export const stopD = (i: number) => i * L

/** where the camera is in the world this frame (written by the engine, read by actors to keep clear of it) */
export const camWorld = { x: 0, z: 0 }

/** the pandal faces back down the road and a little towards it */
export const PANDAL_RY = -0.35
/** at a stop the auto pulls in this far in front of the pandal, facing it */
export const REST_DIST = 30

/** the inverse of `frame`: distance along the route and metres right of the centre line for a world point */
export function locate(x: number, z: number): { d: number; X: number } {
  let d = -z
  for (let k = 0; k < 3; k++) {
    const f = frame(d, 0)
    const m = slope(d)
    const n = Math.sqrt(1 + m * m)
    // tangent (m, -1)/n in (x, z)
    d += ((x - f.x) * m - (z - f.z)) / n
  }
  const f = frame(d, 0)
  const m = slope(d)
  const n = Math.sqrt(1 + m * m)
  return { d, X: ((x - f.x) + (z - f.z) * m) / n }
}

/** heading (camera yaw convention: forward = (-sin yaw, -cos yaw)) of the road at d, driving towards larger d */
export function roadYaw(d: number) {
  return -Math.atan(slope(d))
}
