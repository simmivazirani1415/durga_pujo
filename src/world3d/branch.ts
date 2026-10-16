/**
 * The one fork in the ride: just past the Palace Grounds pandal a side road curves off to the left, runs along the
 * palace lawns and leads on towards Indiranagar, while the main road carries straight on to Ulsoor.
 * Geography is compressed for the ride; the map is schematic and never claims real distances.
 */
import * as THREE from 'three'
import { Batcher, cyl, box } from './batch'
import { M } from './mats'
import { frame, stopD } from './route'
import { Spot } from './kit3d'
import { signTexture } from './tex'

/** the area (stop index) that owns the junction, and the stop the side road leads to */
export const BRANCH_AREA = 2
export const BRANCH_TO = 4
/** where the side road leaves the main road, and its geometry */
export const J = stopD(BRANCH_AREA) + 40
const R = 20
export const BRANCH_HALF = 3.6
/** main road half-width at the junction (Palace Grounds spec) */
const MAIN_HALF = 5.4
/** after this far along the side road the ride carries you on to Indiranagar */
export const BRANCH_EXIT = 64
const LEN = (Math.PI / 2) * R + 120

export interface BPt {
  x: number
  z: number
  s: number
  /** heading, camera yaw convention */
  yaw: number
}

/** the side road's centre line in road coordinates (d along the route, X right of the centre) */
function local(s: number): { d: number; X: number } {
  const arc = (Math.PI / 2) * R
  if (s <= arc) {
    const th = s / R
    return { d: J + R * Math.sin(th), X: -MAIN_HALF - R * (1 - Math.cos(th)) }
  }
  return { d: J + R, X: -MAIN_HALF - R - (s - arc) }
}

export const BRANCH: BPt[] = (() => {
  const pts: BPt[] = []
  const n = Math.ceil(LEN / 1.5)
  for (let i = 0; i <= n; i++) {
    const s = (LEN * i) / n
    const l = local(s)
    const f = frame(l.d, l.X)
    pts.push({ x: f.x, z: f.z, s, yaw: 0 })
  }
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    pts[i].yaw = Math.atan2(-(b.x - a.x), -(b.z - a.z))
  }
  return pts
})()

/** nearest point on the side road: arc length, signed offset (+ = right of the road's direction) and distance */
export function branchNearest(x: number, z: number): { s: number; lat: number; dist: number } {
  let best = { s: 0, lat: 0, dist: 1e9 }
  for (let i = 0; i < BRANCH.length - 1; i++) {
    const a = BRANCH[i]
    const b = BRANCH[i + 1]
    const ex = b.x - a.x
    const ez = b.z - a.z
    const L2 = ex * ex + ez * ez
    const t = Math.max(0, Math.min(1, ((x - a.x) * ex + (z - a.z) * ez) / L2))
    const px = a.x + ex * t
    const pz = a.z + ez * t
    const dist = Math.hypot(x - px, z - pz)
    if (dist < best.dist) {
      const len = Math.sqrt(L2)
      // right of the direction of travel (ex, ez) is (-ez, ex)/len in this world (forward -Z, right +X)
      const lat = ((x - px) * -ez + (z - pz) * ex) / len
      best = { s: a.s + (b.s - a.s) * t, lat, dist }
    }
  }
  return best
}

/** a point on the side road, `lat` metres right of its centre line */
export function branchPoint(s: number, lat = 0): BPt {
  s = Math.max(0, Math.min(LEN, s))
  const i = Math.min(BRANCH.length - 2, Math.floor((s / LEN) * (BRANCH.length - 1)))
  const a = BRANCH[i]
  const b = BRANCH[i + 1]
  const t = (s - a.s) / Math.max(1e-6, b.s - a.s)
  const x = a.x + (b.x - a.x) * t
  const z = a.z + (b.z - a.z) * t
  const yaw = a.yaw
  // right of heading yaw is (cos yaw, -sin yaw)
  return { x: x + Math.cos(yaw) * lat, z: z - Math.sin(yaw) * lat, s, yaw }
}

/** true where the palace-grounds dressing must leave room for the side road */
export function inBranchClear(d: number, X: number) {
  return d > J - 6 && d < J + R + 12 && X < -1.5
}

/** the main road's left footpath and kerb stop here for the side road's mouth */
export const BRANCH_MOUTH: [number, number] = [J - 1, J + 14]

function strip(b: Batcher, latA: number, latB: number, y: number, mat: THREE.Material, tileV: number, tileU = 0, color?: string) {
  const pos: number[] = []
  const uv: number[] = []
  for (let i = 0; i < BRANCH.length - 1; i++) {
    const p = BRANCH[i]
    const q = BRANCH[i + 1]
    const pa = branchPoint(p.s, latA)
    const pb = branchPoint(p.s, latB)
    const qa = branchPoint(q.s, latA)
    const qb = branchPoint(q.s, latB)
    const ua = tileU ? latA / tileU : 0
    const ub = tileU ? latB / tileU : 1
    pos.push(pa.x, y, pa.z, qa.x, y, qa.z, qb.x, y, qb.z, pa.x, y, pa.z, qb.x, y, qb.z, pb.x, y, pb.z)
    uv.push(ua, p.s / tileV, ua, q.s / tileV, ub, q.s / tileV, ua, p.s / tileV, ub, q.s / tileV, ub, p.s / tileV)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.computeVertexNormals()
  const n = g.attributes.normal as THREE.BufferAttribute
  if (n.getY(0) < 0) flip(g)
  b.add(g, mat, undefined, color)
}

function flip(g: THREE.BufferGeometry) {
  for (const name of ['position', 'uv'] as const) {
    const a = g.attributes[name] as THREE.BufferAttribute
    const s = a.itemSize
    const arr = a.array as Float32Array
    for (let i = 0; i < a.count; i += 3)
      for (let c = 0; c < s; c++) {
        const t = arr[(i + 1) * s + c]
        arr[(i + 1) * s + c] = arr[(i + 2) * s + c]
        arr[(i + 2) * s + c] = t
      }
  }
  g.computeVertexNormals()
}

/** the side road surface, its paved edges and the green direction sign before the fork */
export function buildBranch(b: Batcher) {
  strip(b, -BRANCH_HALF, BRANCH_HALF, 0.012, M.road('two'), 12)
  strip(b, -BRANCH_HALF - 2.2, -BRANCH_HALF, 0.03, M.paver(), 2, 2, '#ffffff')
  strip(b, BRANCH_HALF, BRANCH_HALF + 2.2, 0.03, M.paver(), 2, 2, '#ffffff')
  // roadside sign on the left verge, facing the oncoming ride
  const s = new Spot(b, J - 22, -(MAIN_HALF + 1.6), 0)
  const H = 3.2
  for (const x of [-1.5, 1.5]) s.put(cyl(0.07, 0.08, H + 1.1, 8), M.metal(), { x }, '#6a6e72')
  const lines = [
    { text: 'Indiranagar', arrow: '←' },
    { text: 'Ulsoor', arrow: '↑' },
  ]
  const w = 3.8
  const h = (w / 1024) * (160 * lines.length + 40)
  const tex = signTexture(lines)
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: 0.25 })
  s.put(new THREE.PlaneGeometry(w, h).toNonIndexed(), mat, { y: H + 0.6 - h / 2 + 0.4, z: 0.06 })
  s.put(box(w + 0.16, h + 0.16, 0.08), M.metal(), { y: H + 0.6 - h - 0.08 + 0.4 + 0.0, z: 0 }, '#2a2d30')
}
