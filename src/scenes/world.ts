/**
 * One shared world for every scene and for the 3D auto.
 *
 * Scenes are drawn in a 1600 x 1000 viewBox, rendered with preserveAspectRatio="xMidYMax slice".
 * The camera sits 2 m above the road, looking straight ahead. The horizon (vanishing point) is at (800, 560).
 *
 * World coordinates are metres:  X = right of road centre,  Y = up from the ground,  Z = distance ahead of the camera.
 *   screen x = 800 + F * X / Z
 *   screen y = 560 + F * (CAM_H - Y) / Z
 * The bottom edge of the viewBox (y = 1000) is ground at Z = 2 m.
 *
 * PORTRAIT SAFE BAND: on a phone in portrait only about x = 570..1030 is visible (the centre ~460 units).
 * Every scene must read as a complete picture inside that band: landmark, road and some framing.
 * Wider context goes outside the band for desktop.
 */
export const VB_W = 1600
export const VB_H = 1000
export const VPX = 800
export const HORIZON = 560
export const F = 440
export const CAM_H = 2.0

/**
 * When parked at a stop, the REAR FACE of the 3D auto is this many metres ahead of the camera.
 * (The auto model's origin is the centre of its rear face at ground level; the body extends towards -Z.)
 * Its rear face then spans roughly y = 607..937 in the viewBox, centred on x = 800.
 */
export const AUTO_Z = 2.05

export interface Pt {
  x: number
  y: number
}

/** project a world point (metres) to viewBox units */
export function proj(X: number, Y: number, Z: number): Pt {
  return { x: VPX + (F * X) / Z, y: HORIZON + (F * (CAM_H - Y)) / Z }
}

/** viewBox units per metre at distance Z */
export function ups(Z: number): number {
  return F / Z
}

/** a ground point plus the local scale (units per metre); handy for placing objects */
export function place(X: number, Z: number): Pt & { s: number } {
  const p = proj(X, 0, Z)
  return { x: p.x, y: p.y, s: F / Z }
}

/** distance Z of the ground at viewBox height y (y must be below the horizon) */
export function zAtY(y: number): number {
  return (F * CAM_H) / Math.max(0.0001, y - HORIZON)
}

export interface RoadStyle {
  /** half-width of the carriageway in metres (a two-lane city road is about 3.5) */
  halfWidth: number
  /** asphalt colour, near and far (far is hazier) */
  asphalt: string
  asphaltFar: string
  center: 'dashed' | 'solid' | 'double' | 'none'
  centerColor: string
  edgeLines: boolean
  /** painted kerb stones, very Bengaluru: black/white or black/yellow */
  kerb: 'bw' | 'by' | 'none'
  /** footpath beyond the kerb, metres wide (0 for none) */
  footpath: number
  footpathColor: string
  /** colour of the ground beyond the footpath */
  verge: string
  /** lateral bend of the road ahead, metres of offset 20 m past bendStart (negative = bends left) */
  bend?: number
  /** distance (m) where the bend starts, default 16 */
  bendStart?: number
}

/** lateral offset (metres) of the road centre at distance Z */
export function roadCenterX(road: Pick<RoadStyle, 'bend' | 'bendStart'>, Z: number): number {
  const b = road.bend ?? 0
  if (!b) return 0
  const start = road.bendStart ?? 16
  const t = Math.max(0, Math.min(Z, 140) - start) / 20
  return b * t * t
}

/** screen point on the road: lateral offset X (metres) from the road centre at distance Z */
export function roadPoint(road: Pick<RoadStyle, 'bend' | 'bendStart'>, X: number, Z: number): Pt & { s: number } {
  return place(roadCenterX(road, Z) + X, Z)
}

export const ROAD_DEFAULT: RoadStyle = {
  halfWidth: 3.5,
  asphalt: '#5a524c',
  asphaltFar: '#9b8d82',
  center: 'dashed',
  centerColor: '#efe6d4',
  edgeLines: false,
  kerb: 'bw',
  footpath: 1.8,
  footpathColor: '#b9a68f',
  verge: '#6f7b4f',
}

/** viewBox x of a lateral offset X (metres) on the ground at height y */
export function xAt(X: number, y: number): number {
  const Z = zAtY(y)
  return VPX + (F * X) / Z
}

/** mulberry32: small seeded random generator so drawings are stable between renders */
export function rng(seed: number) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hexToRgb(h: string): [number, number, number] {
  const s = h.replace('#', '')
  const n = s.length === 3 ? s.split('').map((c) => c + c).join('') : s
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]
}
function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}
/** mix two hex colours; t = 0 gives a, t = 1 gives b */
export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t)
}
/** amt > 0 lightens towards white, amt < 0 darkens towards a warm near-black */
export function shade(c: string, amt: number): string {
  return amt >= 0 ? mix(c, '#fff8ec', amt) : mix(c, '#1f1612', -amt)
}
