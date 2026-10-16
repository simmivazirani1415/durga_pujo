/**
 * The street kit: buildings, trees, lamps, poles and wires, walls, people, stalls, vehicles, the metro,
 * bunting and string lights. Builders write into a Batcher in road space, so every area reuses the same parts.
 */
import * as THREE from 'three'
import { Batcher, box, bulbGeo, card, catenary, cone, curtain, cyl, dome, flat, hipRoof, matrixOf, ribbon, sphere, tube, walls, type Place } from './batch'
import { M } from './mats'
import { frame } from './route'
import { rand, type FacadeKind, type LeafKind } from './tex'

type Geo = THREE.BufferGeometry
type C = THREE.ColorRepresentation

/**
 * Keep-clear zones in road space: the path the auto takes when it pulls in to a pandal. Anything whose
 * origin falls inside is not built (lamps, poles, people, stalls, trees).
 */
export const deadZones: Array<{ d0: number; d1: number; x0: number; x1: number }> = []
export const isDead = (d: number, X: number) => deadZones.some((z) => d > z.d0 && d < z.d1 && X > z.x0 && X < z.x1)

/** a local frame on the street: d along the road, X across it, rotated by ry */
export class Spot {
  m: THREE.Matrix4
  dead: boolean
  constructor(
    public b: Batcher,
    public d: number,
    public X: number,
    ry = 0,
    y = 0,
    scale = 1,
  ) {
    this.dead = isDead(d, X)
    const f = frame(d, X)
    this.m = new THREE.Matrix4().makeTranslation(f.x, y, f.z).multiply(new THREE.Matrix4().makeRotationY(f.yaw + ry)).multiply(new THREE.Matrix4().makeScale(scale, scale, scale))
  }
  put(g: Geo, mat: THREE.Material, local: Place = {}, color?: C) {
    if (this.dead) return this
    this.b.add(g, mat, this.m.clone().multiply(matrixOf(local)), color)
    return this
  }
  /** world position of a local point */
  world(x: number, y: number, z: number) {
    return new THREE.Vector3(x, y, z).applyMatrix4(this.m)
  }
}

/** facing: buildings on the right face the road (-X), on the left face +X */
export const faceRoad = (X: number) => (X > 0 ? -Math.PI / 2 : Math.PI / 2)

export const PAL = {
  wall: ['#e9dcc2', '#f1e6cf', '#d9c4a0', '#e6cfb0', '#c9b79a', '#efe2c8', '#d8c9b4', '#e2d3bd', '#f2d9b5', '#c8d3c6', '#e8c9a8', '#d7b892'],
  pastel: ['#f3d7b0', '#e8c4a8', '#cfe0d6', '#f0e2b6', '#e7cdd5', '#d6dbe8', '#f1d1a0', '#dcd0bd'],
  bold: ['#c9583c', '#d98f2b', '#3f7a69', '#8d3f55', '#3e6a91', '#e0b04a'],
  stone: ['#9a948c', '#8a837a', '#a8a197', '#7f786f'],
  skin: ['#8a5a3c', '#a06a46', '#6f4630', '#b07a52', '#7d4f36'],
  hair: ['#1b1310', '#251a14', '#2e221a'],
  saree: ['#c0262d', '#e0a82e', '#2d6b5a', '#b8306a', '#f2e6cf', '#d2572b', '#5b3a8a', '#e46a2e'],
  shirt: ['#f2ede2', '#2d4f7c', '#9b3b2f', '#e3c27a', '#4a5a3a', '#ffffff', '#d98e5a', '#384858'],
  pants: ['#2b2f3a', '#3e3a34', '#5b5246', '#1f2630', '#7a6a55'],
  car: ['#e9e9e6', '#bfc3c7', '#2a2c30', '#8a1f24', '#2e4c7a', '#d8d2c2', '#5c6168', '#a8a29a'],
}

export function pick<T>(r: () => number, a: T[]): T {
  return a[Math.floor(r() * a.length) % a.length]
}

/* ---------------------------------------------------------------- buildings */

export interface BuildingOpts {
  w: number
  h: number
  depth: number
  kind?: FacadeKind
  color?: C
  shops?: boolean
  roof?: 'flat' | 'tile' | 'none'
  tank?: boolean
  /** extra local yaw */
  ry?: number
}

/** a building whose front faces the road; (d, X) is the middle of its front face */
export function building(b: Batcher, d: number, X: number, o: BuildingOpts, seed = 1) {
  const r = rand(seed)
  const ry = faceRoad(X) + (o.ry ?? 0)
  const back = (X > 0 ? 1 : -1) * (o.depth / 2)
  // local frame: origin at the footprint centre, +Z towards the road
  const s = new Spot(b, d, X + back, ry)
  const kind = o.kind ?? 'apartment'
  const col = o.color ?? pick(r, PAL.wall)
  s.put(walls(o.w, o.h, o.depth, 12, 12.8), M.facade(kind), { y: 0 }, col)
  if (o.shops) {
    const g = card(o.w - 0.1, 3.6)
    const uv = g.attributes.uv as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) * o.w) / 12 + r())
    s.put(g, M.shop(), { z: o.depth / 2 + 0.03 })
    // awning / chajja over the shops
    s.put(box(o.w, 0.12, 1.3), M.paint(), { y: 3.7, z: o.depth / 2 + 0.6 }, '#cfc6b8')
  }
  const roof = o.roof ?? 'flat'
  if (roof === 'flat') {
    s.put(flat(o.w, o.depth, 0, 0), M.paint(), { y: o.h }, '#a29a90')
    // parapet
    s.put(box(o.w, 0.9, 0.18), M.plaster(), { y: o.h, z: o.depth / 2 - 0.09 }, col)
    s.put(box(o.w, 0.9, 0.18), M.plaster(), { y: o.h, z: -o.depth / 2 + 0.09 }, col)
    s.put(box(0.18, 0.9, o.depth), M.plaster(), { y: o.h, x: o.w / 2 - 0.09 }, col)
    s.put(box(0.18, 0.9, o.depth), M.plaster(), { y: o.h, x: -o.w / 2 + 0.09 }, col)
    if (o.tank !== false && r() < 0.75) {
      // the black rooftop water tank, a Bengaluru constant
      const tx = (r() - 0.5) * (o.w - 2.5)
      s.put(cyl(0.65, 0.7, 1.3, 12), M.paint(), { y: o.h, x: tx, z: -o.depth / 4 }, '#1c1c1e')
      s.put(box(1.8, 0.5, 1.8), M.paint(), { y: o.h, x: tx, z: -o.depth / 4 }, '#8f877d')
    }
    if (o.h > 9 && r() < 0.5) s.put(box(2.6, 2.4, 2.6), M.plaster(), { y: o.h, x: (r() - 0.5) * (o.w - 3), z: o.depth / 4 }, col)
  } else if (roof === 'tile') {
    s.put(hipRoof(o.w + 1, o.depth + 1, Math.min(3, o.w * 0.28)), M.roofTile(), { y: o.h }, '#ffffff')
  }
  return s
}

/** a small row of mixed buildings filling a stretch of street */
export function streetRow(b: Batcher, d0: number, d1: number, X: number, o: { minH: number; maxH: number; kinds: FacadeKind[]; shops?: number; colors?: string[]; gap?: number; depth?: number; tile?: number }, seed: number) {
  const r = rand(seed)
  let d = d0
  while (d < d1) {
    const w = 7 + r() * 8
    const h = Math.round((o.minH + r() * (o.maxH - o.minH)) / 3.2) * 3.2 + 0.4
    building(b, d + w / 2, X, {
      w: w - (o.gap ?? 0.4),
      h,
      depth: o.depth ?? 9 + r() * 5,
      kind: pick(r, o.kinds),
      color: pick(r, o.colors ?? PAL.wall),
      shops: r() < (o.shops ?? 0),
      roof: r() < (o.tile ?? 0) ? 'tile' : 'flat',
    }, seed * 31 + Math.floor(d))
    d += w
  }
}

/** a tiled-roof bungalow behind a compound wall, as in old Malleswaram or Basavanagudi */
export function bungalow(b: Batcher, d: number, X: number, seed: number, color?: C) {
  const r = rand(seed)
  const w = 10 + r() * 4
  const depth = 9 + r() * 3
  const set = 6 + r() * 2
  const side = X > 0 ? 1 : -1
  const s = building(b, d, X + side * set, { w, h: 3.6 + (r() < 0.5 ? 3.4 : 0), depth, kind: 'house', color: color ?? pick(r, PAL.pastel), roof: 'tile', tank: false }, seed)
  // verandah posts
  for (let i = -2; i <= 2; i++) s.put(cyl(0.12, 0.12, 3.2, 8), M.paint(), { x: i * (w / 5), z: depth / 2 + 1.3 }, '#f2ece0')
  s.put(box(w, 0.2, 1.8), M.roofTile(), { y: 3.2, z: depth / 2 + 0.9, rx: -0.25 }, '#ffffff')
  compoundWall(b, d - 8, d + 8, X, 1.5, pick(r, ['#e8dcc4', '#d9c9a8', '#f0e6d2']), true)
}

/* ---------------------------------------------------------------- walls, kerbs, railings */

export function compoundWall(b: Batcher, d0: number, d1: number, X: number, h: number, color: C, gate = false) {
  const thick = 0.25
  const mid = (d0 + d1) / 2
  const len = d1 - d0
  const gapW = gate ? 3.2 : 0
  const segs = gate
    ? [
        [d0, mid - gapW / 2],
        [mid + gapW / 2, d1],
      ]
    : [[d0, d1]]
  for (const [a, c] of segs) {
    const L = c - a
    if (L <= 0.2) continue
    const s = new Spot(b, (a + c) / 2, X, 0)
    s.put(box(thick, h, L, 4), M.plaster(), {}, color)
    s.put(box(thick + 0.12, 0.12, L), M.paint(), { y: h }, '#cfc3ad')
  }
  // pillars
  for (let dd = d0; dd <= d1 + 0.01; dd += Math.max(3, len / Math.ceil(len / 4))) {
    new Spot(b, dd, X, 0).put(box(0.45, h + 0.35, 0.45), M.plaster(), {}, color)
  }
  if (gate) {
    const s = new Spot(b, mid, X, 0)
    s.put(box(0.12, 1.3, gapW - 0.3), M.metal(), { y: 0.1 }, '#3a3a3a')
  }
}

/** iron railing along a lake or a park */
export function railing(b: Batcher, d0: number, d1: number, X: number, color: C = '#2d3a35') {
  for (let d = d0; d < d1; d += 2.5) new Spot(b, d, X).put(box(0.08, 1.0, 0.08), M.metal(), {}, color)
  for (const y of [0.45, 0.95]) {
    const pts: THREE.Vector3[] = []
    for (let d = d0; d <= d1; d += 4) {
      const f = frame(d, X)
      pts.push(new THREE.Vector3(f.x, y, f.z))
    }
    if (pts.length > 1) b.add(tube(pts, 0.03, 4), M.metal(), undefined, color)
  }
}

/* ---------------------------------------------------------------- the road itself */

export interface RoadSpec {
  half: number
  lanes: 'two' | 'four' | 'narrow'
  foot: number
  median?: boolean
}

/** carriageway, kerbs and footpaths for a stretch of road */
/** stretches [d0, d1] where the left footpath is left open for a side road (set per area before roadway runs) */
export const leftGaps: Array<[number, number]> = []

export function roadway(b: Batcher, d0: number, d1: number, spec: RoadSpec | ((d: number) => RoadSpec)) {
  const S = typeof spec === 'function' ? spec : () => spec
  const s0 = S(d0)
  const half = (d: number) => S(d).half
  b.add(ribbon(d0, d1, (d) => -half(d), half, 0, 12), M.road(s0.lanes))
  // footpaths raised 15 cm, with painted kerbs
  const k = (d: number) => half(d) + 0.18
  const out = (d: number) => half(d) + 0.18 + S(d).foot
  b.add(ribbon(d0, d1, k, out, 0.15, 2, 2), M.paver(), undefined, '#ffffff')
  // the left footpath and kerb open up where a side road leaves (leftGaps)
  const gaps = leftGaps.filter(([a, z]) => z > d0 && a < d1).sort((p, q) => p[0] - q[0])
  let from = d0
  for (const [a, z] of [...gaps, [d1, d1] as [number, number]]) {
    if (a > from) b.add(ribbon(from, Math.min(a, d1), (d) => -out(d), (d) => -k(d), 0.15, 2, 2), M.paver(), undefined, '#ffffff')
    from = Math.max(from, z)
  }
  const open = (d: number, e: number) => gaps.some(([a, z]) => e > a && d < z)
  for (let d = d0; d < d1; d += 6) {
    const e = Math.min(d1, d + 6)
    const h = half(d)
    b.add(curtain(d, e, h, 0, 0.17, 2), M.kerb())
    b.add(ribbon(d, e, h, h + 0.18, 0.17, 2, 0.25), M.kerb())
    if (open(d, e)) {
      // split the kerb segment around the gap
      for (const [a, z] of gaps) {
        if (a > d) {
          b.add(curtain(d, Math.min(a, e), -h, 0, 0.17, 2), M.kerb())
          b.add(ribbon(d, Math.min(a, e), -h - 0.18, -h, 0.17, 2, 0.25), M.kerb())
        }
        if (z < e) {
          b.add(curtain(Math.max(z, d), e, -h, 0, 0.17, 2), M.kerb())
          b.add(ribbon(Math.max(z, d), e, -h - 0.18, -h, 0.17, 2, 0.25), M.kerb())
        }
      }
      continue
    }
    b.add(curtain(d, e, -h, 0, 0.17, 2), M.kerb())
    b.add(ribbon(d, e, -h - 0.18, -h, 0.17, 2, 0.25), M.kerb())
  }
  if (s0.median) {
    b.add(ribbon(d0, d1, -0.6, 0.6, 0.3, 2, 2), M.grass())
    b.add(curtain(d0, d1, 0.6, 0, 0.3, 2), M.kerb())
    b.add(curtain(d0, d1, -0.6, 0, 0.3, 2), M.kerb())
  }
}

/** ground beyond the footpaths, out to `far` metres on each side */
export function verge(b: Batcher, d0: number, d1: number, from: number, far: number, mat: THREE.Material, side: 1 | -1 | 0 = 0) {
  if (side >= 0) b.add(ribbon(d0, d1, from, far, -0.08, 6, 6, 6), mat)
  if (side <= 0) b.add(ribbon(d0, d1, -far, -from, -0.08, 6, 6, 6), mat)
}

/* ---------------------------------------------------------------- trees */

/** a cluster of crossed leaf cards (two-sided by duplication) with normals pointing out of the canopy */
function leafCard(cx: number, cy: number, cz: number, size: number, r: () => number, center: THREE.Vector3, tint: THREE.Color): Geo {
  const g = new THREE.PlaneGeometry(size, size).toNonIndexed()
  g.applyMatrix4(matrixOf({ x: cx, y: cy, z: cz, rx: (r() - 0.5) * 1.6, ry: r() * Math.PI * 2, rz: r() * Math.PI }))
  const back = g.clone()
  // reverse winding for the back face
  const p = back.attributes.position as THREE.BufferAttribute
  const uv = back.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < p.count; i += 3) {
    for (const a of [p, uv]) {
      const s = a.itemSize
      for (let c = 0; c < s; c++) {
        const t = a.array[(i + 1) * s + c]
        ;(a.array as Float32Array)[(i + 1) * s + c] = a.array[(i + 2) * s + c] as number
        ;(a.array as Float32Array)[(i + 2) * s + c] = t as number
      }
    }
  }
  const both = new THREE.BufferGeometry()
  const pos = new Float32Array(p.count * 6)
  pos.set(g.attributes.position.array as Float32Array, 0)
  pos.set(p.array as Float32Array, p.count * 3)
  const uvs = new Float32Array(p.count * 4)
  uvs.set(g.attributes.uv.array as Float32Array, 0)
  uvs.set(uv.array as Float32Array, p.count * 2)
  both.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  both.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  // canopy normals: out from the centre, biased upwards, so the crown shades like a volume
  const n = new Float32Array(pos.length)
  const col = new Float32Array(pos.length)
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.length; i += 3) {
    v.set(pos[i] - center.x, (pos[i + 1] - center.y) * 1.6 + 0.6, pos[i + 2] - center.z).normalize()
    n[i] = v.x
    n[i + 1] = v.y
    n[i + 2] = v.z
    // inner leaves darker (cheap ambient occlusion)
    const ao = 0.55 + 0.45 * Math.min(1, Math.max(0, (pos[i + 1] - center.y) / 3 + 0.6))
    col[i] = tint.r * ao
    col[i + 1] = tint.g * ao
    col[i + 2] = tint.b * ao
  }
  both.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3))
  both.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.dispose()
  back.dispose()
  return both
}

export interface TreeOpts {
  kind?: LeafKind
  /** overall height in metres */
  h?: number
  /** crown radius */
  spread?: number
  cards?: number
  /** crown flatness (rain trees are wide umbrellas) */
  flat?: number
  lean?: number
}

export function tree(b: Batcher, d: number, X: number, o: TreeOpts, seed: number) {
  const r = rand(seed)
  const kind = o.kind ?? 'rain'
  const h = (o.h ?? 11) * (0.85 + r() * 0.3)
  const spread = (o.spread ?? 5.5) * (0.8 + r() * 0.4)
  const flatK = o.flat ?? 0.45
  const s = new Spot(b, d, X, r() * Math.PI * 2)
  if (s.dead) return s
  const trunkH = h * 0.5
  const lean = (o.lean ?? 0) + (r() - 0.5) * 0.12
  // trunk and limbs
  s.put(cyl(0.22 * (h / 11) + 0.08, 0.38 * (h / 11) + 0.12, trunkH, 9), M.bark(), { rz: lean }, '#d8cfc4')
  const top = new THREE.Vector3(-Math.sin(lean) * trunkH, trunkH, 0)
  const limbs = 3 + Math.floor(r() * 3)
  for (let i = 0; i < limbs; i++) {
    const a = (i / limbs) * Math.PI * 2 + r()
    const len = spread * (0.6 + r() * 0.4)
    const tilt = 0.75 + r() * 0.35
    s.put(cyl(0.07, 0.2 * (h / 11), len, 7), M.bark(), { x: top.x, y: top.y - 0.4, z: top.z, ry: a, rz: tilt }, '#d8cfc4')
  }
  // crown
  const center = new THREE.Vector3(top.x, trunkH + spread * flatK * 0.9, top.z)
  const tint = new THREE.Color().setHSL(0.24 + (r() - 0.5) * 0.04, 0.35, 0.55 + r() * 0.12)
  const n = o.cards ?? Math.round(30 + spread * 6)
  const mat = M.leaf(kind)
  const local = new THREE.Matrix4()
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2
    const rr = Math.sqrt(r()) * spread
    const yy = (r() - 0.35) * spread * flatK * 1.3 * (1 - (rr / spread) * 0.5)
    const g = leafCard(center.x + Math.cos(a) * rr, center.y + yy, center.z + Math.sin(a) * rr, 2.4 + r() * 1.6, r, center, kind.startsWith('blossom') || kind === 'bougainvillea' || kind === 'trumpet' ? new THREE.Color(0.95, 0.92, 0.9) : tint)
    b.add(g, mat, local.copy(s.m))
  }
  return s
}

export const rainTree = (b: Batcher, d: number, X: number, seed: number, scale = 1) => tree(b, d, X, { kind: 'rain', h: 13 * scale, spread: 7 * scale, flat: 0.32 }, seed)
export const neemTree = (b: Batcher, d: number, X: number, seed: number, scale = 1) => tree(b, d, X, { kind: 'neem', h: 9 * scale, spread: 3.8 * scale, flat: 0.7 }, seed)
export const blossomTree = (b: Batcher, d: number, X: number, seed: number, pink = true, scale = 1) =>
  tree(b, d, X, { kind: pink ? 'blossom-pink' : 'blossom-orange', h: 10 * scale, spread: 4.8 * scale, flat: 0.55, cards: 70 }, seed)

/** pink trumpet tree (tabebuia rosea) in full bloom: dark limbs under a wide, almost all-pink crown */
export const trumpetTree = (b: Batcher, d: number, X: number, seed: number, scale = 1) =>
  tree(b, d, X, { kind: 'trumpet', h: 11 * scale, spread: 5.6 * scale, flat: 0.5, cards: 80 }, seed)

export function palm(b: Batcher, d: number, X: number, seed: number, h = 9) {
  const r = rand(seed)
  const s = new Spot(b, d, X, r() * 6)
  if (s.dead) return
  const lean = (r() - 0.5) * 0.25
  const H = h * (0.85 + r() * 0.3)
  s.put(cyl(0.16, 0.24, H, 8), M.bark(), { rz: lean }, '#bfb3a2')
  const top = new THREE.Vector3(-Math.sin(lean) * H, H * Math.cos(lean), 0)
  const mat = M.leaf('palm')
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + r() * 0.3
    const g = new THREE.PlaneGeometry(4.2, 2.2).toNonIndexed()
    g.translate(2.0, 0, 0)
    // fronds arc down
    const p = g.attributes.position as THREE.BufferAttribute
    for (let k = 0; k < p.count; k++) p.setY(k, p.getY(k) - Math.pow(Math.max(0, p.getX(k)) / 4.2, 2) * 1.6)
    g.rotateX(-Math.PI / 2 + 0.2)
    g.rotateY(a)
    g.translate(top.x, top.y, top.z)
    g.computeVertexNormals()
    const n = g.attributes.normal as THREE.BufferAttribute
    for (let k = 0; k < n.count; k++) n.setXYZ(k, 0, 1, 0)
    s.put(g, mat, {}, '#e8f0d0')
    const back = g.clone()
    back.index = null
    const bp = back.attributes.position as THREE.BufferAttribute
    for (let k = 0; k < bp.count; k += 3) {
      const t = [bp.getX(k + 1), bp.getY(k + 1), bp.getZ(k + 1)]
      bp.setXYZ(k + 1, bp.getX(k + 2), bp.getY(k + 2), bp.getZ(k + 2))
      bp.setXYZ(k + 2, t[0], t[1], t[2])
      const bu = back.attributes.uv as THREE.BufferAttribute
      const tu = [bu.getX(k + 1), bu.getY(k + 1)]
      bu.setXY(k + 1, bu.getX(k + 2), bu.getY(k + 2))
      bu.setXY(k + 2, tu[0], tu[1])
    }
    s.put(back, mat, {}, '#e8f0d0')
  }
}

/** a low flowering shrub (bougainvillea over a wall, hibiscus by a gate) */
export function shrub(b: Batcher, d: number, X: number, seed: number, kind: LeafKind = 'bougainvillea', size = 1.6) {
  if (isDead(d, X)) return
  const r = rand(seed)
  const center = frame(d, X)
  const c = new THREE.Vector3(center.x, size * 0.6, center.z)
  const mat = M.leaf(kind)
  for (let i = 0; i < 10; i++) {
    const a = r() * Math.PI * 2
    const rr = r() * size * 0.7
    b.add(leafCard(c.x + Math.cos(a) * rr, c.y + (r() - 0.3) * size * 0.6, c.z + Math.sin(a) * rr, size * 1.1, r, c, new THREE.Color(0.95, 0.95, 0.95)), mat)
  }
}

/* ---------------------------------------------------------------- street furniture */

/** a street lamp on the footpath; its arm reaches over the road */
export function lamp(b: Batcher, d: number, X: number, h = 8.5) {
  const side = X > 0 ? -1 : 1
  const s = new Spot(b, d, X, 0)
  if (s.dead) return
  s.put(cyl(0.07, 0.12, h, 8), M.metal(), {}, '#5b5f63')
  s.put(box(1.9, 0.08, 0.08), M.metal(), { x: side * 0.95, y: h - 0.05 }, '#5b5f63')
  s.put(box(0.55, 0.12, 0.26), M.metal(), { x: side * 1.85, y: h - 0.2 }, '#3d4044')
  s.put(box(0.48, 0.04, 0.2), M.lamp(), { x: side * 1.85, y: h - 0.22 })
  // the pool of light it throws after dark
  const g = flat(7, 7, 0, 0.04)
  const f = frame(d, X + side * 2.6)
  b.add(g, M.pool(), { x: f.x, z: f.z })
}

/** concrete electricity poles with sagging wires, one side of the street */
export function poles(b: Batcher, d0: number, d1: number, X: number, gap = 26) {
  const tops: THREE.Vector3[][] = []
  for (let d = d0; d <= d1; d += gap) {
    const s = new Spot(b, d, X, 0)
    if (s.dead) {
      tops.push([])
      continue
    }
    s.put(box(0.22, 9, 0.16), M.paint(), {}, '#b9b2a6')
    s.put(box(1.6, 0.1, 0.1), M.paint(), { y: 8.4 }, '#8a847a')
    s.put(cyl(0.22, 0.22, 0.6, 8), M.paint(), { y: 7.2, x: 0.25 }, '#5d6064')
    tops.push([s.world(-0.7, 8.5, 0), s.world(0, 8.5, 0), s.world(0.7, 8.5, 0), s.world(0, 7.6, 0)])
  }
  for (let i = 0; i + 1 < tops.length; i++)
    if (tops[i].length && tops[i + 1].length)
      for (let k = 0; k < 4; k++) b.add(tube(catenary(tops[i][k], tops[i + 1][k], 0.55 + k * 0.08, 8), 0.014, 3), M.paint(), undefined, '#202020')
}

export function bench(b: Batcher, d: number, X: number) {
  const s = new Spot(b, d, X, faceRoad(X))
  s.put(box(1.8, 0.08, 0.5), M.paint(), { y: 0.45 }, '#6b4a32')
  s.put(box(1.8, 0.4, 0.06), M.paint(), { y: 0.55, z: -0.24 }, '#6b4a32')
  s.put(box(0.08, 0.45, 0.45), M.metal(), { x: -0.8 }, '#2b2b2b')
  s.put(box(0.08, 0.45, 0.45), M.metal(), { x: 0.8 }, '#2b2b2b')
}

/** green gantry sign across the carriageway */
export function gantry(b: Batcher, d: number, half: number, lines: { text: string; arrow?: string }[], texFn: (l: { text: string; arrow?: string }[]) => THREE.Texture) {
  const s = new Spot(b, d, 0, 0)
  const H = 6.4
  for (const x of [-half - 0.6, half + 0.6]) s.put(cyl(0.18, 0.2, H + 1.4, 10), M.metal(), { x }, '#6a6e72')
  s.put(box(half * 2 + 1.6, 0.35, 0.35), M.metal(), { y: H + 1.2 }, '#6a6e72')
  const w = Math.min(half * 1.6, 9)
  const h = (w / 1024) * (160 * lines.length + 40)
  const tex = texFn(lines)
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: 0.25 })
  const g = new THREE.PlaneGeometry(w, h).toNonIndexed()
  s.put(g, mat, { y: H + 1.0 - h / 2 + 0.6, z: 0.2, x: half * 0.25 })
  s.put(box(w + 0.2, h + 0.2, 0.12), M.metal(), { y: H + 1.0 - h + 0.5, z: 0.1, x: half * 0.25 }, '#2a2d30')
}

/* ---------------------------------------------------------------- people */

export interface PersonOpts {
  saree?: boolean
  h?: number
  top?: C
  bottom?: C
  skin?: C
  sit?: boolean
}

/** a person built from simple volumes; reads as a figure at street distance */
export function personParts(put: (g: Geo, m: THREE.Material, p: Place, c: C) => void, o: PersonOpts, r: () => number) {
  const H = o.h ?? 1.55 + r() * 0.2
  const k = H / 1.65
  const skin = o.skin ?? pick(r, PAL.skin)
  const top = o.top ?? (o.saree ? pick(r, PAL.saree) : pick(r, PAL.shirt))
  const bottom = o.bottom ?? (o.saree ? top : pick(r, PAL.pants))
  const P = M.paint()
  if (o.saree) {
    put(cyl(0.17 * k, 0.27 * k, 0.95 * k, 10), P, {}, bottom)
  } else {
    put(cyl(0.075 * k, 0.065 * k, 0.86 * k, 6), P, { x: -0.09 * k }, bottom)
    put(cyl(0.075 * k, 0.065 * k, 0.86 * k, 6), P, { x: 0.09 * k }, bottom)
  }
  put(cyl(0.17 * k, 0.15 * k, 0.6 * k, 10), P, { y: 0.86 * k }, top)
  if (o.saree) put(box(0.08 * k, 0.62 * k, 0.3 * k), P, { y: 0.84 * k, x: 0.13 * k, rz: 0.3 }, '#e8c050')
  put(cyl(0.05 * k, 0.045 * k, 0.55 * k, 6), P, { y: 0.9 * k, x: -0.21 * k, rz: 0.12 }, top)
  put(cyl(0.05 * k, 0.045 * k, 0.55 * k, 6), P, { y: 0.9 * k, x: 0.21 * k, rz: -0.12 }, top)
  put(cyl(0.05 * k, 0.05 * k, 0.1 * k, 6), P, { y: 1.45 * k }, skin)
  put(sphere(0.115 * k, 10, 8), P, { y: 1.6 * k }, skin)
  put(sphere(0.122 * k, 10, 6, Math.PI * 2, Math.PI * 0.55), P, { y: 1.62 * k, rx: -0.3 }, pick(r, PAL.hair))
}

export function person(b: Batcher, d: number, X: number, ry: number, o: PersonOpts, seed: number) {
  const r = rand(seed)
  const s = new Spot(b, d, X, ry)
  personParts((g, m, p, c) => s.put(g, m, p, c), o, r)
}

/** a loose group of people standing and chatting */
export function crowd(b: Batcher, d: number, X: number, n: number, spread: number, seed: number, faceTo?: number) {
  const r = rand(seed)
  for (let i = 0; i < n; i++) {
    const dd = d + (r() - 0.5) * spread
    const xx = X + (r() - 0.5) * spread * 0.6
    const ry = faceTo !== undefined ? faceTo + (r() - 0.5) * 1.2 : r() * Math.PI * 2
    person(b, dd, xx, ry, { saree: r() < 0.45 }, seed * 13 + i)
  }
}

/* ---------------------------------------------------------------- stalls and festive dressing */

/** a street stall: flowers, fruit, or a lit food cart */
export function stall(b: Batcher, d: number, X: number, kind: 'flowers' | 'fruit' | 'food' | 'tea', seed: number) {
  const r = rand(seed)
  const s = new Spot(b, d, X, faceRoad(X))
  s.put(box(2.2, 0.85, 1.1), M.paint(), {}, '#7a5636')
  const heaps = kind === 'flowers' ? ['#f08a1c', '#f7f2e6', '#e8c22a', '#d6343b', '#f5f0e0'] : kind === 'fruit' ? ['#e7b02c', '#7aa83a', '#d4462e', '#f0d060', '#3f7a2c'] : ['#c8873c', '#e6c27a', '#9a5a2a']
  for (let i = 0; i < 5; i++) s.put(sphere(0.32, 8, 6, Math.PI * 2, Math.PI / 2), M.paint(), { x: -0.85 + i * 0.42, y: 0.85, z: (r() - 0.5) * 0.3, s: [1, 0.55, 1] }, heaps[i])
  if (kind === 'flowers') {
    // hanging strings of marigold and jasmine
    for (let i = 0; i < 7; i++) s.put(cyl(0.05, 0.05, 1.1, 5), M.paint(), { x: -0.9 + i * 0.3, y: 1.15, z: 0.5 }, i % 2 ? '#f08a1c' : '#f7f2e6')
  }
  // umbrella or canopy
  for (const x of [-1.0, 1.0]) s.put(cyl(0.03, 0.03, 2.3, 5), M.metal(), { x, z: -0.45 }, '#3a3a3a')
  const col = pick(r, kind === 'food' ? ['#c0392b', '#2e6b4f', '#d98f2b'] : ['#2e5d8a', '#c8562d', '#3f7a69', '#e0b04a'])
  s.put(box(2.6, 0.06, 1.7), M.cloth('jute'), { y: 2.3, rx: 0.12 }, col)
  if (kind === 'food' || kind === 'tea') {
    s.put(bulbGeo(), M.bulb(), { y: 2.1, x: -0.6 })
    s.put(bulbGeo(), M.bulb(), { y: 2.1, x: 0.6 })
    s.put(cyl(0.18, 0.2, 0.35, 10), M.metal(), { y: 0.85, x: 0.6 }, '#b8b8b8')
  }
}

/** triangular pennants on a rope between two world points */
export function bunting(b: Batcher, a: THREE.Vector3, c: THREE.Vector3, sag: number, colors: string[], seed: number, size = 0.55) {
  const r = rand(seed)
  const pts = catenary(a, c, sag, 24)
  b.add(tube(pts, 0.012, 3), M.paint(), undefined, '#3b2a20')
  const len = a.distanceTo(c)
  const n = Math.floor(len / (size * 1.25))
  const dir = c.clone().sub(a).normalize()
  const yaw = Math.atan2(-dir.z, dir.x)
  for (let i = 1; i < n; i++) {
    const t = i / n
    const p = a.clone().lerp(c, t)
    p.y -= sag * 4 * t * (1 - t)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute([-size / 2, 0, 0, size / 2, 0, 0, 0, -size * 1.15, 0], 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0.5, 0], 2))
    g.computeVertexNormals()
    b.add(g, M.flag(), { x: p.x, y: p.y, z: p.z, ry: yaw + (r() - 0.5) * 0.2 }, colors[i % colors.length])
  }
}

/** a sagging string of warm bulbs */
export function stringLights(b: Batcher, a: THREE.Vector3, c: THREE.Vector3, sag: number, spacing = 0.6, mat: THREE.Material = M.bulb()) {
  const pts = catenary(a, c, sag, 20)
  b.add(tube(pts, 0.01, 3), M.paint(), undefined, '#1d1d1d')
  const n = Math.max(2, Math.floor(a.distanceTo(c) / spacing))
  const g = bulbGeo()
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const p = a.clone().lerp(c, t)
    p.y -= sag * 4 * t * (1 - t) + 0.06
    b.add(g, mat, { x: p.x, y: p.y, z: p.z })
  }
}

/** festive bunting criss-crossing the street every `gap` metres */
export function streetBunting(b: Batcher, d0: number, d1: number, half: number, h: number, colors: string[], gap = 9, seed = 1) {
  for (let d = d0; d < d1; d += gap) {
    const A = frame(d, -half)
    const B = frame(d + gap * 0.5, half)
    bunting(b, new THREE.Vector3(A.x, h, A.z), new THREE.Vector3(B.x, h, B.z), 0.9, colors, seed + d)
  }
}

/* ---------------------------------------------------------------- metro */

/** an elevated metro viaduct running alongside the road at offset X */
export function viaduct(b: Batcher, d0: number, d1: number, X: number, h = 10.5) {
  const W = 4.4
  for (let d = Math.ceil(d0 / 28) * 28; d <= d1; d += 28) {
    const s = new Spot(b, d, X, 0)
    s.put(cyl(0.95, 1.05, h - 1.2, 14), M.granite(), {}, '#c9c3b8')
    s.put(box(W + 1.2, 1.2, 2.2), M.granite(), { y: h - 1.4 }, '#c2bcb0')
  }
  b.add(ribbon(d0, d1, X - W, X + W, h, 8, 8), M.granite(), undefined, '#b9b2a6')
  // underside: the same ribbon, flipped to face down
  const under = ribbon(d0, d1, X - W, X + W, h - 1.6, 8, 8)
  const p = under.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i += 3) {
    const t = [p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)]
    p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2))
    p.setXYZ(i + 2, t[0], t[1], t[2])
  }
  under.computeVertexNormals()
  b.add(under, M.granite(), undefined, '#8a8378')
  b.add(curtain(d0, d1, X - W, h - 1.6, h + 1.1, 8), M.granite(), undefined, '#cfc9be')
  b.add(curtain(d0, d1, X + W, h - 1.6, h + 1.1, 8), M.granite(), undefined, '#cfc9be')
}

/* ---------------------------------------------------------------- vehicles (moving actors) */

function actor(build: (b: Batcher) => void): THREE.Group {
  const b = new Batcher()
  build(b)
  const g = b.build('actor')
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true
      o.receiveShadow = false
    }
  })
  return g
}

/** a hatchback or sedan, facing -Z */
export function makeCar(color: C, seed: number): THREE.Group {
  const r = rand(seed)
  const sedan = r() < 0.4
  const L = sedan ? 4.4 : 3.8
  return actor((b) => {
    const G = M.gloss()
    b.add(box(1.7, 0.7, L), G, { y: 0.32 }, color)
    b.add(box(1.5, 0.62, L * (sedan ? 0.5 : 0.6)), G, { y: 1.0, z: sedan ? 0.1 : 0.25 }, color)
    b.add(box(1.52, 0.48, L * (sedan ? 0.5 : 0.6) - 0.2), M.glass(), { y: 1.06, z: sedan ? 0.1 : 0.25 })
    for (const x of [-0.78, 0.78]) for (const z of [-L * 0.32, L * 0.32]) b.add(cyl(0.31, 0.31, 0.22, 12), M.paint(), { x, y: 0.31, z, rz: Math.PI / 2 }, '#18181a')
    for (const x of [-0.6, 0.6]) {
      b.add(box(0.32, 0.12, 0.04), M.headlight(), { x, y: 0.72, z: -L / 2 - 0.01 })
      b.add(box(0.3, 0.12, 0.04), M.taillight(), { x, y: 0.75, z: L / 2 + 0.01 })
    }
  })
}

export function makeScooter(seed: number): THREE.Group {
  const r = rand(seed)
  return actor((b) => {
    const col = pick(r, ['#c8c8c4', '#2b2b2e', '#8a1f24', '#2e4c7a', '#e1e1dc'])
    b.add(box(0.5, 0.5, 1.6), M.gloss(), { y: 0.35 }, col)
    b.add(box(0.36, 0.7, 0.3), M.gloss(), { y: 0.55, z: -0.6 }, col)
    for (const z of [-0.6, 0.62]) b.add(cyl(0.24, 0.24, 0.12, 10), M.paint(), { y: 0.24, z, rz: Math.PI / 2 }, '#18181a')
    b.add(box(0.2, 0.1, 0.05), M.headlight(), { y: 1.0, z: -0.78 })
    b.add(box(0.2, 0.08, 0.05), M.taillight(), { y: 0.7, z: 0.8 })
    const pr = rand(seed + 3)
    personParts((g, m, p, c) => b.add(g, m, { ...p, y: (p.y ?? 0) + 0.38, z: 0.15 }, c), { h: 1.45, saree: pr() < 0.3 }, pr)
    // helmet
    b.add(sphere(0.15, 10, 8, Math.PI * 2, Math.PI * 0.6), M.gloss(), { y: 0.38 + 1.36, z: 0.15 }, pick(r, ['#1d1d1d', '#e8e8e8', '#b52b2b', '#2a4a7a']))
  })
}

/** BMTC bus: blue-and-white Vajra or green-and-cream city bus */
export function makeBus(seed: number): THREE.Group {
  const r = rand(seed)
  const vajra = r() < 0.5
  return actor((b) => {
    const G = M.gloss()
    b.add(box(2.5, 2.7, 11.5), G, { y: 0.35 }, vajra ? '#2a5ea8' : '#3f8a4a')
    b.add(box(2.52, 0.5, 11.52), G, { y: 0.35 }, vajra ? '#e8eef4' : '#efe2b8')
    b.add(box(2.54, 1.0, 10.6), M.glass(), { y: 1.7, z: 0.3 })
    b.add(box(2.4, 1.2, 0.05), M.glass(), { y: 1.6, z: -5.77 })
    for (const x of [-1.15, 1.15]) for (const z of [-3.6, 3.8]) b.add(cyl(0.5, 0.5, 0.3, 12), M.paint(), { x, y: 0.5, z, rz: Math.PI / 2 }, '#18181a')
    for (const x of [-0.9, 0.9]) {
      b.add(box(0.36, 0.16, 0.05), M.headlight(), { x, y: 0.7, z: -5.78 })
      b.add(box(0.3, 0.2, 0.05), M.taillight(), { x, y: 0.8, z: 5.78 })
    }
  })
}

/** another auto-rickshaw in traffic: yellow canopy over a green body */
export function makeAuto(seed: number): THREE.Group {
  return actor((b) => {
    void seed
    b.add(box(1.3, 0.75, 2.6), M.gloss(), { y: 0.25 }, '#2f7a3a')
    b.add(box(1.32, 0.95, 1.8), M.gloss(), { y: 1.0, z: 0.25 }, '#1f1f1f')
    b.add(box(1.38, 0.18, 2.0), M.gloss(), { y: 1.95, z: 0.2 }, '#e5b923')
    b.add(box(1.2, 0.6, 0.05), M.glass(), { y: 1.25, z: -0.72 })
    b.add(cyl(0.26, 0.26, 0.14, 10), M.paint(), { y: 0.26, z: -1.1, rz: Math.PI / 2 }, '#18181a')
    for (const x of [-0.58, 0.58]) b.add(cyl(0.26, 0.26, 0.14, 10), M.paint(), { x, y: 0.26, z: 0.95, rz: Math.PI / 2 }, '#18181a')
    b.add(box(0.2, 0.12, 0.05), M.headlight(), { y: 0.85, z: -1.32 })
    for (const x of [-0.5, 0.5]) b.add(box(0.16, 0.1, 0.05), M.taillight(), { x, y: 0.6, z: 1.32 })
  })
}

/** a walking figure as its own small mesh, for animated pedestrians */
export function makeWalker(seed: number, saree?: boolean): THREE.Group {
  const r = rand(seed)
  return actor((b) => personParts((g, m, p, c) => b.add(g, m, p, c), { saree: saree ?? r() < 0.45 }, r))
}

/** a metro train: four cars with the line's colour band */
export function makeTrain(band: C): THREE.Group {
  return actor((b) => {
    for (let i = 0; i < 4; i++) {
      const z = i * 21
      b.add(box(2.9, 3.4, 20.4), M.gloss(), { z }, '#d9dde0')
      b.add(box(2.94, 0.5, 20.42), M.gloss(), { y: 0.7, z }, band)
      b.add(box(2.96, 1.1, 18.5), M.glass(), { y: 1.7, z })
      b.add(box(2.96, 0.95, 18.5), M.bulbCool(), { y: 1.75, z, s: [0.995, 0.9, 1] })
    }
    b.add(box(2.4, 0.3, 0.05), M.headlight(), { y: 1.0, z: -10.25 })
  })
}

/** a small IAF aircraft for the Yelahanka sky */
export function makePlane(): THREE.Group {
  return actor((b) => {
    b.add(cyl(0.6, 0.5, 11, 10), M.gloss(), { rx: Math.PI / 2, z: 5.5 }, '#c9ced2')
    b.add(box(13, 0.2, 2.4), M.gloss(), { y: 0, z: 0 }, '#b9bec2')
    b.add(box(4.5, 0.15, 1.4), M.gloss(), { y: 0.1, z: 5 }, '#b9bec2')
    b.add(box(0.15, 2.2, 1.6), M.gloss(), { y: 1, z: 5 }, '#b9bec2')
  })
}

/** convenience: a dome on a drum, for gurudwara, Vidhana Soudha and palace turrets */
export function domeOn(s: Spot, x: number, y: number, z: number, r: number, mat: THREE.Material, color: C, finial = true) {
  s.put(cyl(r, r, r * 0.5, 16), mat, { x, y, z }, color)
  s.put(dome(r, 20), mat, { x, y: y + r * 0.5, z }, color)
  if (finial) {
    s.put(sphere(r * 0.12, 8, 6), M.gold(), { x, y: y + r * 1.5, z })
    s.put(cone(r * 0.06, r * 0.5, 6), M.gold(), { x, y: y + r * 1.55, z })
  }
}
