/**
 * The city, one neighbourhood per stop, laid along a single road. Each area dresses its own stretch with the
 * cues people know it by (lake, flower stalls, palace wall, metro, glass towers, blossom trees, café lights)
 * and parks the auto in front of its own pandal. Moving things (traffic, people, trains, boats) are actors.
 */
import * as THREE from 'three'
import { Batcher, box, card, cone, cyl, dome, flat, ribbon, sphere } from './batch'
import { M } from './mats'
import { BACK, AHEAD, L, PANDAL_D, PANDAL_RY, REST_DIST, camWorld, frame, stopD } from './route'
import {
  PAL,
  Spot,
  blossomTree,
  building,
  bungalow,
  deadZones,
  isDead,
  leftGaps,
  bench,
  compoundWall,
  crowd,
  domeOn,
  gantry,
  lamp,
  makeAuto,
  makeBus,
  makeCar,
  makePlane,
  makeScooter,
  makeTrain,
  makeWalker,
  neemTree,
  trumpetTree,
  palm,
  person,
  pick,
  poles,
  railing,
  rainTree,
  roadway,
  shrub,
  stall,
  streetBunting,
  streetRow,
  stringLights,
  verge,
  viaduct,
  type RoadSpec,
} from './kit3d'
import { PANDAL_SCALE, buildPandal, type PandalVariant } from './pandals3d'
import { rand, signTexture } from './tex'
import { cubbonLibrary, commercialStreet, hillTemple, hsrHighStreet, infosysCampus, lakePromenade, magnoliaBakery, nexusMall, reserve, stMarys, toitBrewpub } from './landmarks3d'
import { BRANCH_AREA, BRANCH_MOUTH, J, buildBranch, inBranchClear } from './branch'

export interface Actor {
  update(t: number, dt: number): void
}

export interface AreaBuilt {
  group: THREE.Group
  actors: Actor[]
  /** world range of d where this area should be drawn */
  from: number
  to: number
  /** pandal label anchor (world) and shrine light (world) */
  pandalTop?: THREE.Vector3
  pandalLight?: THREE.Vector3
}

/* ---------------------------------------------------------------- road layout */

const SPECS: RoadSpec[] = [
  { half: 5.2, lanes: 'two', foot: 2.4 },
  { half: 3.5, lanes: 'two', foot: 2.4 },
  { half: 5.4, lanes: 'two', foot: 2.6 },
  { half: 4.0, lanes: 'two', foot: 3.2 },
  { half: 3.8, lanes: 'two', foot: 2.8 },
  { half: 7.4, lanes: 'four', foot: 2.6, median: true },
  { half: 3.6, lanes: 'two', foot: 2.4 },
  { half: 4.2, lanes: 'two', foot: 2.6 },
  { half: 7.4, lanes: 'four', foot: 2.6, median: true },
  { half: 3.8, lanes: 'two', foot: 2.4 },
  { half: 6.6, lanes: 'four', foot: 3.2, median: true },
]

const areaOf = (d: number) => Math.max(0, Math.min(SPECS.length - 1, Math.floor((d + BACK) / L)))
function blend(d: number, f: (s: RoadSpec) => number) {
  const a = areaOf(d)
  const end = stopD(a) + AHEAD
  const begin = stopD(a) - BACK
  const W = 14
  if (d > end - W && a + 1 < SPECS.length) {
    const t = (d - (end - W)) / (2 * W)
    return f(SPECS[a]) + (f(SPECS[a + 1]) - f(SPECS[a])) * t * t * (3 - 2 * t)
  }
  if (d < begin + W && a > 0) {
    const t = (d - (begin - W)) / (2 * W)
    return f(SPECS[a - 1]) + (f(SPECS[a]) - f(SPECS[a - 1])) * t * t * (3 - 2 * t)
  }
  return f(SPECS[a])
}
export const roadHalf = (d: number) => blend(d, (s) => s.half)
export const footW = (d: number) => blend(d, (s) => s.foot)
/** the auto keeps to the left lane (India drives on the left); on dual carriageways, the slow lane */
export const laneX = (d: number) => blend(d, (s) => (s.median ? -s.half * 0.72 : -s.half * 0.48))

/** pandal position for stop i */
export function pandalSpot(i: number) {
  const s = SPECS[i]
  return { d: stopD(i) + PANDAL_D, X: s.half + 0.18 + s.foot * 0.4 + 12 }
}

/** where the auto parks at stop i: in the forecourt, REST_DIST in front of the pandal, facing it */
export function restPose(i: number) {
  const p = pandalSpot(i)
  const c = frame(p.d, p.X)
  const yaw = c.yaw + PANDAL_RY
  const x = c.x + Math.sin(yaw) * REST_DIST
  const z = c.z + Math.cos(yaw) * REST_DIST
  return { x, z, yaw: Math.atan2(-(c.x - x), -(c.z - z)), d: p.d - REST_DIST * Math.cos(PANDAL_RY), X: p.X + REST_DIST * Math.sin(PANDAL_RY) }
}

const near = (o: THREE.Object3D, r = 5) => (o.position.x - camWorld.x) ** 2 + (o.position.z - camWorld.z) ** 2 > r * r

/* ---------------------------------------------------------------- actors */

function placeOnRoad(o: THREE.Object3D, d: number, X: number, back: boolean, y = 0) {
  const f = frame(d, X)
  o.position.set(f.x, y, f.z)
  o.rotation.y = f.yaw + (back ? Math.PI : 0)
}

/** vehicles looping along a lane: v > 0 drives away down the road, v < 0 comes towards the camera */
function traffic(g: THREE.Group, actors: Actor[], d0: number, d1: number, X: number, v: number, n: number, seed: number, mix: { bus?: number; scooter?: number; auto?: number } = {}) {
  const r = rand(seed)
  const span = d1 - d0
  const items: { o: THREE.Object3D; p: number; v: number; x: number }[] = []
  for (let i = 0; i < n; i++) {
    const k = r()
    const o =
      k < (mix.bus ?? 0)
        ? makeBus(seed + i)
        : k < (mix.bus ?? 0) + (mix.scooter ?? 0.35)
          ? makeScooter(seed + i)
          : k < (mix.bus ?? 0) + (mix.scooter ?? 0.35) + (mix.auto ?? 0.2)
            ? makeAuto(seed + i)
            : makeCar(pick(r, PAL.car), seed + i)
    g.add(o)
    items.push({ o, p: (i + r() * 0.6) / n, v: v * (0.85 + r() * 0.3), x: X + (r() - 0.5) * 0.6 })
  }
  actors.push({
    update(t) {
      for (const it of items) {
        let p = (it.p + (t * it.v) / span) % 1
        if (p < 0) p += 1
        placeOnRoad(it.o, d0 + p * span, it.x, it.v < 0)
        it.o.visible = near(it.o, 6)
      }
    },
  })
}

function parked(g: THREE.Group, d: number, X: number, seed: number, kind: 'car' | 'scooter' | 'auto' = 'car') {
  if (isDead(d, X)) return
  const r = rand(seed)
  const o = kind === 'car' ? makeCar(pick(r, PAL.car), seed) : kind === 'scooter' ? makeScooter(seed) : makeAuto(seed)
  placeOnRoad(o, d, X, r() < 0.3)
  o.rotation.y += kind === 'scooter' ? 0.5 : 0
  g.add(o)
}

/** people strolling up and down a footpath */
function walkers(g: THREE.Group, actors: Actor[], d0: number, d1: number, X: number, n: number, seed: number) {
  const r = rand(seed)
  const items: { o: THREE.Object3D; p: number; v: number; x: number; ph: number }[] = []
  for (let i = 0; i < n; i++) {
    const o = makeWalker(seed * 5 + i)
    g.add(o)
    items.push({ o, p: r(), v: (r() < 0.5 ? -1 : 1) * (1.0 + r() * 0.5), x: X + (r() - 0.5) * 1.2, ph: r() * 6 })
  }
  const span = d1 - d0
  actors.push({
    update(t) {
      for (const it of items) {
        let p = (it.p + (t * it.v) / span) % 1
        if (p < 0) p += 1
        placeOnRoad(it.o, d0 + p * span, it.x, it.v < 0, Math.abs(Math.sin(t * 5.5 + it.ph)) * 0.04)
        it.o.rotation.z = Math.sin(t * 5.5 + it.ph) * 0.03
        it.o.visible = near(it.o, 3.5)
      }
    },
  })
}

function metro(g: THREE.Group, actors: Actor[], d0: number, d1: number, X: number, band: string, h = 10.5, v = 16) {
  const tr = makeTrain(band)
  g.add(tr)
  const span = d1 - d0 + 300
  actors.push({
    update(t) {
      const p = ((t * v) % span) - 150
      placeOnRoad(tr, d1 - p, X, true, h)
    },
  })
}

/* ---------------------------------------------------------------- shared dressing */

interface Ctx {
  b: Batcher
  g: THREE.Group
  actors: Actor[]
  i: number
  D: number
  d0: number
  d1: number
  spec: RoadSpec
  /** outer edge of the footpath */
  edge: number
}

function base(i: number, ground: THREE.Material | null, extra: Partial<Pick<Ctx, 'd0' | 'd1'>> = {}): Ctx {
  const D = stopD(i)
  const spec = SPECS[i]
  const c: Ctx = { b: new Batcher(), g: new THREE.Group(), actors: [], i, D, d0: extra.d0 ?? D - BACK, d1: extra.d1 ?? D + AHEAD, spec, edge: spec.half + 0.18 + spec.foot }
  deadZones.length = 0
  leftGaps.length = 0
  if (i === BRANCH_AREA) {
    leftGaps.push(BRANCH_MOUTH)
  }
  if (i >= 1 && i <= 10) {
    // keep the auto's pull-in path to the pandal clear
    const p = pandalSpot(i)
    const r = restPose(i)
    deadZones.push({ d0: D - 10, d1: r.d + 4, x0: 0.2, x1: r.X + 3 })
    deadZones.push({ d0: r.d - 4, d1: p.d - 8, x0: r.X - 4, x1: p.X + 5 })
  }
  roadway(c.b, c.d0, c.d1, (d) => ({ ...spec, half: roadHalf(d), foot: footW(d), median: spec.median && d > c.d0 + 12 && d < c.d1 - 12 }))
  if (ground) verge(c.b, c.d0, c.d1, 0, 150, ground)
  return c
}

function lamps(c: Ctx, gap = 24, both = true, from = c.d0 + 4, to = c.d1) {
  let k = 0
  for (let d = from; d < to; d += gap / (both ? 2 : 1)) {
    const side = both ? (k++ % 2 ? 1 : -1) : -1
    if (inBranchClear(d, side * (roadHalf(d) + 0.5))) continue
    lamp(c.b, d, side * (roadHalf(d) + 0.5))
  }
}

/** the pandal, its forecourt and the shrine light anchor */
function pandal(c: Ctx, v: PandalVariant, ground: THREE.Material = M.dirt()) {
  const p = pandalSpot(c.i)
  // forecourt: packed earth and pavers opening off the footpath
  c.b.add(ribbon(c.D - 6, p.d + 14, c.edge, p.X + 14, 0.05, 6, 6, 3), ground)
  const info = buildPandal(c.b, v, p.d, p.X, c.i * 101 + 7, PANDAL_RY)
  const s = new Spot(c.b, p.d, p.X, PANDAL_RY, 0, PANDAL_SCALE)
  const s1 = new Spot(c.b, p.d, p.X, PANDAL_RY)
  const top = s1.world(0, info.top, 0)
  const light = s1.world(info.light.x, info.light.y, info.light.z)
  void s
  return { top, light }
}

/** plain buildings on both sides, leaving the pandal's ground open */
function rows(c: Ctx, side: 1 | -1, X: number, o: Parameters<typeof streetRow>[4], seed: number, skipPandal = true) {
  const p = pandalSpot(c.i)
  if (side > 0 && skipPandal) {
    streetRow(c.b, c.d0, p.d - 18, X, o, seed)
    streetRow(c.b, p.d + 14, c.d1, X, o, seed + 1)
  } else streetRow(c.b, c.d0, c.d1, side * X, o, seed)
}

function treesAlong(c: Ctx, side: 1 | -1, X: number, gap: number, fn: (b: Batcher, d: number, X: number, seed: number) => void, seed: number, skip?: [number, number]) {
  const r = rand(seed)
  for (let d = c.d0 + r() * gap; d < c.d1; d += gap * (0.8 + r() * 0.4)) {
    if (skip && d > skip[0] && d < skip[1]) continue
    fn(c.b, d, side * (X + r() * 1.2), seed + Math.floor(d))
  }
}

function finish(c: Ctx, extra: { pandalTop?: THREE.Vector3; pandalLight?: THREE.Vector3; from?: number; to?: number } = {}): AreaBuilt {
  c.g.add(c.b.build('area-' + c.i))
  return { group: c.g, actors: c.actors, from: extra.from ?? c.d0, to: extra.to ?? c.d1, pandalTop: extra.pandalTop, pandalLight: extra.pandalLight }
}

const festive = ['#c0262d', '#e8a92a', '#f4ead6', '#d2572b', '#2d6b5a', '#b8306a']

/* ---------------------------------------------------------------- landmarks */

/** a South Indian temple gate: stacked tiers tapering to a barrel top with kalasas */
function gopuram(b: Batcher, d: number, X: number, h = 16, color = '#d8c7a6', alt = color) {
  const s = new Spot(b, d, X, X > 0 ? -Math.PI / 2 : Math.PI / 2)
  s.dead = false
  s.put(box(10, 5, 6), M.granite(), {}, alt === color ? '#b8aa92' : '#f3ece0')
  const tiers = 6
  for (let k = 0; k < tiers; k++) {
    const w = 9 - k * 1.1
    const dd = 5.4 - k * 0.6
    s.put(box(w, (h - 5) / tiers, dd), M.plaster(), { y: 5 + (k * (h - 5)) / tiers }, k % 2 ? alt : color)
    s.put(box(w + 0.3, 0.25, dd + 0.3), M.paint(), { y: 5 + ((k + 1) * (h - 5)) / tiers - 0.1 }, '#9b6a3a')
  }
  const top = new THREE.CylinderGeometry(1.2, 1.2, 9 - tiers * 1.1 + 1, 12, 1, false, 0, Math.PI)
  top.rotateZ(Math.PI / 2)
  s.put(top, M.plaster(), { y: h + 0.1 }, color)
  for (const x of [-1.6, 0, 1.6]) s.put(cone(0.25, 0.9, 8), M.gold(), { x, y: h + 1.1 })
  s.put(box(3, 3.8, 6.2), M.paint(), { y: 0 }, '#3a2a20')
}

/** Bangalore Palace: grey stone Tudor front with crenellated octagonal turrets */
function palace(b: Batcher, d: number, X: number) {
  const s = new Spot(b, d, X, Math.PI / 2 - 0.3)
  const stone = '#8d8a84'
  s.put(box(70, 16, 22, 6, 6), M.facade('heritage'), {}, stone)
  for (let x = -34; x <= 34; x += 2.2) s.put(box(1.1, 1.2, 22.4), M.granite(), { x, y: 16 }, stone)
  for (const x of [-35, -14, 14, 35]) {
    s.put(cyl(4, 4, 24, 8), M.granite(), { x, z: 11 }, '#7f7c76')
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      s.put(box(1.2, 1.4, 1.2), M.granite(), { x: x + Math.cos(a) * 3.6, y: 24, z: 11 + Math.sin(a) * 3.6 }, '#7f7c76')
    }
    s.put(cone(3.2, 6, 8), M.paint(), { x, y: 25, z: 11 }, '#4a5450')
  }
  s.put(box(14, 22, 6), M.facade('heritage'), { z: 12 }, stone)
  s.put(cone(5, 9, 4), M.paint(), { y: 22, z: 12, ry: Math.PI / 4 }, '#4a5450')
}

/** the gurudwara on Ulsoor's bank: white hall, gold dome and corner kiosks */
function gurudwara(b: Batcher, d: number, X: number) {
  const s = new Spot(b, d, X, Math.PI / 2)
  s.put(box(26, 11, 20), M.plaster(), {}, '#f7f3ea')
  s.put(box(27, 0.6, 21), M.paint(), { y: 11 }, '#e8dfcc')
  domeOn(s, 0, 11.5, 0, 6.5, M.gold(), '#ffffff')
  for (const x of [-12, 12]) for (const z of [-9, 9]) domeOn(s, x, 11.5, z, 1.4, M.plaster(), '#f7f3ea')
  for (let x = -11; x <= 11; x += 3.6) s.put(box(1.6, 4.2, 0.3), M.paint(), { x, y: 2, z: 10.1 }, '#6a5a4a')
}

/** Ragigudda: a granite boulder hill with a small temple and its lights on top */
function rockTemple(b: Batcher, d: number, X: number) {
  const s = new Spot(b, d, X, 0)
  const g = new THREE.IcosahedronGeometry(24, 3)
  const p = g.attributes.position as THREE.BufferAttribute
  const r = rand(17)
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i)
    const n = 1 + Math.sin(v.x * 0.3 + r()) * 0.08 + Math.cos(v.z * 0.25) * 0.1
    v.multiplyScalar(n)
    v.y = v.y < 0 ? v.y * 0.1 : v.y * 0.75
    p.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  s.put(g, M.granite(), { s: [1.4, 1, 1] }, '#9a948a')
  s.put(box(9, 5, 7), M.plaster(), { y: 17 }, '#f1e6cf')
  s.put(cone(3.5, 8, 4), M.plaster(), { y: 22, ry: Math.PI / 4 }, '#efdcb0')
  s.put(sphere(0.6, 8, 6), M.gold(), { y: 30.5 })
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2
    s.put(new THREE.OctahedronGeometry(0.18, 0), M.bulb(), { x: Math.cos(a) * 6, y: 18.5 + Math.sin(a * 3) * 0.3, z: Math.sin(a) * 5 })
  }
}

/** Vidhana Soudha: granite front, columned portico, central dome; outlined in festival lights */
function vidhanaSoudha(b: Batcher, d: number, X: number, scale = 1.3) {
  const s = new Spot(b, d, X, 0, 0, scale)
  s.dead = false
  const gran = '#c8b9a0'
  s.put(box(140, 22, 40, 12, 12.8), M.facade('heritage'), { y: 3 }, gran)
  s.put(box(146, 3, 46), M.granite(), {}, '#a89a84')
  for (let k = 0; k < 8; k++) s.put(box(40 - k * 2, 0.5, 4), M.granite(), { y: 3 - k * 0.38, z: 23 + k * 0.6 }, '#b8aa94')
  s.put(box(46, 18, 10), M.facade('heritage'), { y: 3, z: 22 }, gran)
  for (let x = -21; x <= 21; x += 3.5) s.put(cyl(0.9, 1, 16, 14), M.granite(), { x, y: 3, z: 28 }, '#d8ccb6')
  s.put(box(48, 3, 10), M.granite(), { y: 19, z: 25 }, gran)
  const tri = new THREE.Shape()
  tri.moveTo(-22, 0)
  tri.lineTo(0, 5)
  tri.lineTo(22, 0)
  tri.closePath()
  s.put(new THREE.ExtrudeGeometry(tri, { depth: 1, bevelEnabled: false }), M.granite(), { y: 22, z: 29 }, gran)
  s.put(cyl(12, 12, 9, 24), M.granite(), { y: 25 }, gran)
  domeOn(s, 0, 33, 0, 11, M.granite(), '#d6c9b2')
  for (const x of [-58, 58]) domeOn(s, x, 25, 10, 4, M.granite(), '#d6c9b2')
  // festival outline
  const g = new THREE.OctahedronGeometry(0.3, 0)
  for (let x = -70; x <= 70; x += 1.4) s.put(g, M.bulb(), { x, y: 25.1, z: 20.2 })
  for (let x = -23; x <= 23; x += 1.0) s.put(g, M.bulb(), { x, y: 22.1, z: 30.2 })
  for (let k = 0; k <= 40; k++) {
    const a = (k / 40) * Math.PI
    s.put(g, M.bulb(), { x: Math.cos(a) * 11.2, y: 38.5 + Math.sin(a) * 11.2, z: 1.5 })
  }
  for (let y = 3; y < 25; y += 1.1) for (const x of [-70, 70]) s.put(g, M.bulb(), { x, y, z: 20.2 })
}

/** glass tech-park towers */
function tower(b: Batcher, d: number, X: number, w: number, h: number, depth: number, color = '#c8d4dc') {
  building(b, d, X, { w, h, depth, kind: 'office', color, roof: 'flat', tank: false }, Math.floor(d * 3 + X))
}

/** a lake surface between lateral offsets, with a rough grassy bank */
function lake(c: Ctx, from: number, to: number, xa: number, xb: number) {
  c.b.add(ribbon(from, to, xa, xb, 0.0, 8, 8, 8), M.water())
  // stone-faced bank edge
  c.b.add(ribbon(from, to, Math.max(xa, xb) - 0.02, Math.max(xa, xb) + 0.6, 0.05, 2, 2), M.granite(), undefined, '#8a8278')
}

/** a boat drifting on the lake */
function boat(g: THREE.Group, actors: Actor[], d: number, X: number, seed: number) {
  const r = rand(seed)
  const b = new Batcher()
  b.add(box(1.6, 0.5, 3.4), M.gloss(), { y: 0 }, pick(r, ['#f4f1ea', '#e0b04a', '#d2572b']))
  b.add(box(1.4, 0.06, 1.8), M.paint(), { y: 1.4 }, '#2e5d8a')
  b.add(sphere(0.5, 10, 8), M.gloss(), { y: 0.7, z: -1.5, s: [0.6, 1.4, 0.6] }, '#f4f1ea')
  const o = b.build('boat')
  g.add(o)
  const ph = r() * 10
  actors.push({
    update(t) {
      placeOnRoad(o, d + Math.sin(t * 0.05 + ph) * 18, X + Math.cos(t * 0.04 + ph) * 10, false, -0.15 + Math.sin(t * 1.3 + ph) * 0.05)
      o.rotation.y += t * 0.0 + Math.sin(t * 0.05 + ph) * 0.6
    },
  })
}

/* ---------------------------------------------------------------- the stops */

/** HERO: a golden-hour bridge with stone balustrades, lanterns and flowers, the city skyline and a domed palace ahead */
function hero(): AreaBuilt {
  const c = base(0, null, { d0: -45, d1: 85 })
  const { b } = c
  const e = c.edge
  // deck edge and balustrades
  for (const side of [-1, 1] as const) {
    const X = side * (e + 0.25)
    for (let d = -45; d < 85; d += 0.42) {
      const s = new Spot(b, d, X, 0, 0.15)
      s.put(cyl(0.07, 0.11, 0.85, 6), M.granite(), { y: 0.15 }, '#d9c9ae')
      s.put(sphere(0.1, 6, 5), M.granite(), { y: 0.6 }, '#d9c9ae')
    }
    b.add(ribbon(-45, 85, X - 0.25, X + 0.25, 1.15, 4, 4), M.granite(), undefined, '#e2d4bb')
    b.add(ribbon(-45, 85, X - 0.22, X + 0.22, 0.17, 4, 4), M.granite(), undefined, '#c9b99e')
    for (let d = -40; d < 85; d += 9) {
      const s = new Spot(b, d, X, 0, 0.15)
      s.put(box(0.9, 1.35, 0.9), M.granite(), {}, '#e6d8bf')
      s.put(box(1.05, 0.12, 1.05), M.granite(), { y: 1.35 }, '#d4c4a8')
      if (Math.round(d / 9) % 2) {
        // stone urn with flowers
        s.put(cyl(0.38, 0.22, 0.6, 10), M.granite(), { y: 1.47 }, '#cdbd9f')
        shrub(b, d, X, Math.floor(d * 7) + (side > 0 ? 3 : 0), 'bougainvillea', 1.1)
      } else {
        // the old lantern lamp-post
        s.put(cyl(0.09, 0.14, 4.6, 8), M.metal(), { y: 1.47 }, '#2a2d2b')
        s.put(box(1.2, 0.08, 0.08), M.metal(), { y: 5.9 }, '#2a2d2b')
        for (const lx of [-0.6, 0, 0.6]) {
          s.put(sphere(0.26, 12, 8), M.lamp(), { x: lx, y: lx ? 6.25 : 6.6 })
          s.put(cyl(0.05, 0.05, 0.35, 6), M.metal(), { x: lx, y: lx ? 5.9 : 6.1 }, '#2a2d2b')
        }
        // a festival banner on brackets, facing the traffic
        const bx = -side * 0.62
        s.put(box(0.7, 0.05, 0.05), M.metal(), { x: -side * 0.35, y: 4.75 }, '#2a2d2b')
        s.put(box(0.7, 0.05, 0.05), M.metal(), { x: -side * 0.35, y: 2.3 }, '#2a2d2b')
        s.put(box(0.82, 0.05, 0.05), M.gold(), { x: bx, y: 4.72 })
        s.put(card(0.78, 2.5), M.banner(Math.round(d / 18) % 2 ? 'red' : 'ivory'), { x: bx, y: 2.22 }, '#ffffff')
      }
    }
  }
  // the land drops away below the bridge: tree crowns rise to the rail, the river glints beyond
  const low = -9
  b.add(ribbon(-45, 260, -260, -e - 0.6, low, 8, 8, 8), M.grass())
  b.add(ribbon(-45, 260, e + 0.6, 260, low, 8, 8, 8), M.grass())
  b.add(ribbon(-45, 160, -120, -40, low + 0.2, 8, 8, 8), M.water())
  // trees on the low ground, built at their real height below the deck
  const lowB = new Batcher()
  for (let k = 0; k < 30; k++) {
    const r = rand(400 + k)
    const side = k % 2 ? 1 : -1
    const d = -20 + r() * 170
    const X = side * (e + 7 + r() * 34)
    if (side < 0 && X < -40 && X > -120 && d < 160) continue
    if (r() < 0.6) rainTree(lowB, d, X, 400 + k, 1.25)
    else neemTree(lowB, d, X, 400 + k, 1.4)
  }
  const lowG = lowB.build('low')
  lowG.position.y = low
  c.g.add(lowG)
  // beyond the bridge: the road runs on into the city between trees and a garden wall
  // skyline on the left, across the river
  const sky = new Batcher()
  const r = rand(5)
  for (let k = 0; k < 26; k++) {
    const d = 170 + r() * 380
    const X = -(130 + r() * 260)
    const w = 18 + r() * 22
    const h = 40 + Math.pow(r(), 1.5) * 90
    building(sky, d, X, { w, h, depth: w, kind: r() < 0.6 ? 'office' : 'apartment', color: pick(r, ['#d8dde0', '#c9d2d8', '#e6e0d6', '#bfc8cc']), tank: false }, 900 + k)
  }
  // the palace on the right, beyond the gardens: domes, towers and long colonnades in warm stone
  const pal = new Spot(sky, 120, 108, -0.7, 0, 1.25)
  const st = '#e3d1ae'
  pal.put(box(120, 18, 30, 12, 12.8), M.facade('heritage'), {}, st)
  pal.put(box(124, 1.2, 33), M.granite(), { y: 18 }, '#d2bf9a')
  pal.put(box(34, 26, 24, 12, 12.8), M.facade('heritage'), { z: 6 }, st)
  pal.put(cyl(10, 10, 8, 24), M.granite(), { y: 26, z: 6 }, st)
  domeOn(pal, 0, 34, 6, 9.5, M.granite(), '#e8d6b2')
  for (const x of [-48, 48]) {
    pal.put(box(16, 24, 20, 12, 12.8), M.facade('heritage'), { x, z: 4 }, st)
    domeOn(pal, x, 24, 4, 5, M.granite(), '#e8d6b2')
  }
  for (const x of [-26, 26, -60, 60]) {
    pal.put(cyl(2.6, 2.6, 30, 8), M.granite(), { x, z: 14 }, st)
    domeOn(pal, x, 30, 14, 2.6, M.granite(), '#e8d6b2')
  }
  for (let x = -56; x <= 56; x += 3.2) pal.put(cyl(0.6, 0.7, 12, 10), M.granite(), { x, y: 1, z: 16 }, '#efe0c2')
  for (let k = 0; k < 12; k++) rainTree(sky, 70 + k * 8, 46 + (k % 3) * 9, 700 + k, 1.2)
  for (let k = 0; k < 12; k++) neemTree(sky, 160 + k * 12, -(30 + (k % 2) * 10), 760 + k, 1.4)
  const far = sky.build('hero-far')
  c.g.add(far)
  // the road ahead: bunting high across the bridge
  // a few cars, an auto and scooters on the bridge
  traffic(c.g, c.actors, -45, 200, c.spec.half * 0.5, -11, 6, 31, { scooter: 0.4, auto: 0.2 })
  walkers(c.g, c.actors, -30, 80, c.spec.half + 1.2, 3, 41)
  walkers(c.g, c.actors, -30, 80, -c.spec.half - 1.2, 3, 43)
  // beyond the bridge the road continues on solid ground
  verge(b, 85, 260, c.spec.half + 2.6, 60, M.grass())
  roadway(b, 85, 130, { ...c.spec })
  return finish(c, { to: 85 })
}

function malleswaram(): AreaBuilt {
  const c = base(1, M.dirt())
  const { b, D, edge } = c
  // the painted temple gate after the pandal, on the right; Sankey Tank's promenade on the left
  reserve(D + 58, D + 90, edge - 0.5, edge + 24)
  lakePromenade(b, D + 22, c.d1 + 6, edge)
  // the great canopy: rain trees meeting over the road
  treesAlong(c, -1, edge + 0.8, 11, (bb, d, X, s) => rainTree(bb, d, X, s, 1.1), 21)
  treesAlong(c, 1, edge + 0.8, 11, (bb, d, X, s) => rainTree(bb, d, X, s, 1.1), 22, [D + 6, D + 82])
  for (let d = c.d0 + 6; d < D + 14; d += 22) bungalow(b, d, -edge, Math.floor(d) + 23)
  for (let d = c.d0 + 6; d < D + 20; d += 22) bungalow(b, d, edge, Math.floor(d) + 24)
  for (let d = c.d0; d < D + 20; d += 7) shrub(b, d, -edge - 1.6, Math.floor(d) + 26)
  // flower and fruit stalls along the left footpath
  const kinds = ['flowers', 'flowers', 'fruit', 'flowers', 'fruit', 'tea'] as const
  for (let k = 0; k < 6; k++) stall(b, D - 12 + k * 6, -(c.spec.half + 1.3), kinds[k], 27 + k)
  crowd(b, D + 2, -(c.spec.half + 1.6), 9, 16, 28, Math.PI / 2)
  // the stone temple gate on the left, a little ahead
  gopuram(b, D + 74, edge + 10, 19, '#c8452e', '#f1e3c4')
  compoundWall(b, D + 60, D + 88, edge + 0.6, 1.6, '#e9dcc8', true)
  poles(b, c.d0, c.d1, edge - 0.3, 26)
  lamps(c, 28)
  const pd = pandal(c, 'chala')
  traffic(c.g, c.actors, c.d0, c.d1 + 100, c.spec.half * 0.5, -8, 4, 29, { scooter: 0.55, auto: 0.3 })
  walkers(c.g, c.actors, c.d0, c.d1, -(c.spec.half + 1.2), 6, 30)
  walkers(c.g, c.actors, c.d0, c.d1, c.spec.half + 1.2, 4, 31)
  return finish(c, { pandalTop: pd.top, pandalLight: pd.light })
}

function palaceGrounds(): AreaBuilt {
  const c = base(2, M.grass())
  const { b, D, edge } = c
  // Vidhana Soudha rises on the right before the pandal; the palace stands across the lawns on the left
  reserve(D - 60, D + 4, edge + 4, 200)
  vidhanaSoudha(b, D - 30, 100, 0.75)
  // the long stone wall of the palace grounds on the left, trees behind it, the palace beyond
  for (let d = c.d0; d < c.d1; d += 6) {
    // the wall opens for the side road to Indiranagar
    if (inBranchClear(d, -edge - 1) || inBranchClear(d + 6, -edge - 1)) continue
    const s = new Spot(b, d + 3, -edge - 1, 0)
    s.put(box(0.6, 2.6, 6, 3), M.granite(), {}, '#a59a88')
    s.put(box(0.8, 0.3, 6), M.granite(), { y: 2.6 }, '#8f8576')
    s.put(box(0.9, 3.2, 0.9), M.granite(), { z: -3 }, '#9a8f7e')
  }
  treesAlong(c, -1, edge + 4, 10, (bb, d, X, s) => rainTree(bb, d, X, s, 1.3), 41, [J - 9, J + 33])
  treesAlong(c, -1, edge + 18, 13, (bb, d, X, s) => rainTree(bb, d, X, s, 1.2), 42, [J - 9, J + 33])
  buildBranch(b)
  // rain trees line the side road across the palace lawns
  for (let X = -36; X > -140; X -= 11) {
    rainTree(b, J + 20 - 9.5, X + ((X * 7) % 3), 300 + X, 1.15)
    rainTree(b, J + 20 + 9.5, X - 5 + ((X * 5) % 3), 400 + X, 1.2)
  }
  palace(b, D + 120, -95)
  treesAlong(c, 1, edge + 1.5, 12, (bb, d, X, s) => rainTree(bb, d, X, s, 1.25), 43, [D + 6, D + 82])
  rows(c, 1, edge + 12, { minH: 7, maxH: 14, kinds: ['heritage', 'apartment'], colors: PAL.wall, shops: 0.3 }, 44)
  lamps(c, 26)
  const pd = pandal(c, 'palatial')
  streetBunting(b, D + 18, D + 60, c.spec.half + 1.5, 7, festive, 12, 45)
  crowd(b, D + 30, edge - 1.2, 8, 10, 46)
  traffic(c.g, c.actors, c.d0, c.d1 + 120, c.spec.half * 0.5, -11, 6, 47, { bus: 0.2 })
  walkers(c.g, c.actors, c.d0, c.d1, c.spec.half + 1.3, 5, 49)
  return finish(c, { pandalTop: pd.top, pandalLight: pd.light })
}

function ulsoor(): AreaBuilt {
  const c = base(3, M.grass())
  const { b, D, edge } = c
  // St Mary's on the right as you come in, Commercial Street's shops after the pandal
  reserve(D - 44, D - 12, edge - 0.5, edge + 40)
  reserve(D + 44, c.d1 + 14, edge - 0.5, edge + 14)
  stMarys(b, D - 28, edge + 3)
  commercialStreet(b, c.g, D + 46, c.d1 + 12, edge + 0.4)
  // Cubbon Park's red library on its lawn before the lake; the gurudwara on the bank after it
  cubbonLibrary(b, D - 24, -(edge + 3))
  for (const [o, X] of [
    [-42, -12],
    [-38, -50],
    [-8, -48],
    [-6, -14],
  ])
    rainTree(b, D + o, -(edge + 3) + X, 500 + o, 1.2)
  gurudwara(b, D + 96, -(edge + 18))
  // promenade, railing and the lake
  railing(b, D - 2, D + 64, -edge, '#e8e0cf')
  lake(c, D - 2, D + 64, -320, -edge - 0.2)
  for (const [d, X, n] of [[D + 34, -70, 6]]) {
    const s = new Spot(b, d, X, 0, -0.3)
    s.put(new THREE.SphereGeometry(9, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.grass(), { s: [1.4, 0.18, 1] }, '#ffffff')
    for (let k = 0; k < n; k++) palm(b, d + (k - n / 2) * 2.5, X + ((k * 37) % 7) - 3, 1400 + d + k, 7 + (k % 3))
  }
  treesAlong(c, -1, 175, 16, (bb, d, X, s) => rainTree(bb, d, X, s, 1.2), 51)
  for (let d = c.d0 + 6; d < c.d1; d += 18) bench(b, d, -(c.spec.half + 2.2))
  for (let k = 0; k < 2; k++) boat(c.g, c.actors, D + 18 + k * 22, -40 - k * 14, 52 + k)
  // old Cantonment buildings: red-oxide trims, tiled roofs, verandahs
  rows(c, 1, edge + 3, { minH: 6.8, maxH: 10.4, kinds: ['heritage', 'villa'], colors: ['#e9d2a8', '#efdcc0', '#e4c49a', '#f1e3c8'], tile: 0.5, shops: 0.3 }, 53)
  rows(c, 1, edge + 22, { minH: 12, maxH: 22, kinds: ['apartment'], colors: PAL.wall }, 54, false)
  treesAlong(c, 1, edge + 1.2, 13, (bb, d, X, s) => rainTree(bb, d, X, s, 1.1), 55, [D + 6, D + 82])
  lamps(c, 24)
  const pd = pandal(c, 'lakeside', M.paver())
  crowd(b, D + 12, -(c.spec.half + 1.6), 6, 10, 56, Math.PI / 2)
  traffic(c.g, c.actors, c.d0, c.d1 + 120, c.spec.half * 0.5, -9, 5, 57)
  walkers(c.g, c.actors, c.d0, c.d1, -(c.spec.half + 1.6), 7, 58)
  return finish(c, { pandalTop: pd.top, pandalLight: pd.light })
}

function indiranagar(): AreaBuilt {
  const c = base(4, M.dirt())
  const { b, D, edge } = c
  // Toit before the pandal, Magnolia Bakery after it, both on the right
  toitBrewpub(b, c.g, D - 24, edge + 1)
  magnoliaBakery(b, c.g, D + 71, edge + 1)
  // Purple Line viaduct over the left side
  viaduct(b, c.d0, c.d1, -(edge + 4))
  metro(c.g, c.actors, c.d0 - 40, c.d1 + 40, -(edge + 2.6), '#7a3c9a')
  // villas turned cafés and pubs, string lights strung in front
  const r = rand(61)
  for (const side of [-1, 1] as const) {
    let d = c.d0
    while (d < c.d1) {
      const w = 9 + r() * 5
      const skip = side > 0 && ((d + w > D + 24 && d < D + 58) || (d + w > D - 35 && d < D - 13) || (d + w > D + 61 && d < D + 81))
      if (!skip) {
        const s = building(b, d + w / 2, side * (edge + 3.5), { w: w - 1.2, h: 7.2, depth: 10, kind: 'villa', color: pick(r, ['#efe4d0', '#e8d8bc', '#f3ebe0', '#d9c6a6', '#e6d2c0']), shops: true, roof: r() < 0.4 ? 'tile' : 'flat', tank: false }, 62 + Math.floor(d))
        // outdoor seating under umbrellas
        for (let k = 0; k < 2; k++) {
          s.put(cyl(0.45, 0.45, 0.75, 10), M.paint(), { x: -w / 4 + k * (w / 2), z: 7 }, '#6b4a32')
          s.put(cone(1.6, 0.7, 10), M.cloth('jute'), { x: -w / 4 + k * (w / 2), y: 2.2, z: 7 }, pick(r, ['#c0392b', '#2f6a55', '#e0b04a', '#f4ead6']))
          s.put(cyl(0.04, 0.04, 2.2, 5), M.metal(), { x: -w / 4 + k * (w / 2), z: 7 }, '#333')
        }
        const a = s.world(-w / 2 + 0.5, 3.4, 4.6)
        const e = s.world(w / 2 - 0.5, 3.4, 4.6)
        stringLights(b, a, e, 0.5, 0.45)
        crowd(b, d + w / 2, side * (edge + 1.8), 3, 3, 63 + Math.floor(d))
      }
      d += w
    }
  }
  // pink trumpet trees start here
  treesAlong(c, 1, edge + 0.6, 12, (bb, d, X, s) => trumpetTree(bb, d, X, s, 1.05), 64, [D + 6, D + 82])
  rows(c, -1, edge + 26, { minH: 12, maxH: 24, kinds: ['apartment', 'office'], colors: PAL.wall }, 65, false)
  rows(c, 1, edge + 26, { minH: 12, maxH: 24, kinds: ['apartment', 'office'], colors: PAL.wall }, 66, false)
  lamps(c, 22)
  const pd = pandal(c, 'modern', M.paver())
  traffic(c.g, c.actors, c.d0, c.d1 + 100, c.spec.half * 0.5, -9, 6, 67, { scooter: 0.45, auto: 0.25 })
  for (let k = 0; k < 6; k++) parked(c.g, c.d0 + 8 + k * 16, -(c.spec.half - 0.6), 68 + k, k % 2 ? 'scooter' : 'car')
  walkers(c.g, c.actors, c.d0, c.d1, c.spec.half + 1.4, 6, 69)
  walkers(c.g, c.actors, c.d0, c.d1, -(c.spec.half + 1.4), 6, 70)
  return finish(c, { pandalTop: pd.top, pandalLight: pd.light })
}

function whitefield(): AreaBuilt {
  const c = base(5, M.grass('dry'))
  const { b, D, edge } = c
  // the temple on its plinth, set back on the right before the pandal
  reserve(D - 52, D + 2, edge + 4, edge + 90)
  hillTemple(b, D - 26, edge + 14)
  viaduct(b, c.d0, c.d1 + 40, -(edge + 4.5))
  metro(c.g, c.actors, c.d0 - 40, c.d1 + 40, -(edge + 3.1), '#7a3c9a', 10.5, 18)
  for (let d = c.d0 + 6; d < c.d1; d += 14) palm(b, d, 0, 81 + Math.floor(d), 6)
  // tech parks: glass towers set back behind lawns
  const r = rand(82)
  for (let k = 0; k < 7; k++) tower(b, c.d0 + 10 + k * 22, -(edge + 22 + r() * 18), 20 + r() * 10, 36 + r() * 46, 18 + r() * 6, pick(r, ['#c8d4dc', '#b9c9d6', '#d6dde2']))
  for (let k = 0; k < 4; k++) tower(b, c.d0 + 4 + k * 18, edge + 20 + r() * 6, 16 + r() * 8, 30 + r() * 40, 18, pick(r, ['#c8d4dc', '#d8d0c4']))
  for (let k = 0; k < 3; k++) tower(b, D + 66 + k * 22, edge + 18 + r() * 8, 18 + r() * 8, 40 + r() * 36, 18, pick(r, ['#c8d4dc', '#d8d0c4']))
  rows(c, 1, edge + 60, { minH: 30, maxH: 60, kinds: ['apartment'], colors: PAL.wall, depth: 16 }, 83, false)
  treesAlong(c, -1, edge + 6, 9, (bb, d, X, s) => (s % 3 === 0 ? trumpetTree(bb, d, X, s) : neemTree(bb, d, X, s, 1.1)), 84)
  treesAlong(c, 1, edge + 2, 12, (bb, d, X, s) => neemTree(bb, d, X, s, 1.1), 85, [D + 6, D + 82])
  gantry(b, D + 70, c.spec.half, [{ text: 'Whitefield', arrow: '↑' }, { text: 'Hoodi', arrow: '→' }], signTexture)
  lamps(c, 30)
  const pd = pandal(c, 'grand-gate')
  crowd(b, D + 26, edge - 1.2, 6, 8, 86)
  traffic(c.g, c.actors, c.d0, c.d1 + 140, c.spec.half * 0.62, -13, 7, 87, { bus: 0.2 })
  traffic(c.g, c.actors, c.d0 + 30, c.d1 + 160, -c.spec.half * 0.35, 12, 4, 88, { bus: 0.2, scooter: 0.2 })
  walkers(c.g, c.actors, c.d0, c.d1, -(c.spec.half + 1.3), 4, 89)
  return finish(c, { pandalTop: pd.top, pandalLight: pd.light })
}

function koramangala(): AreaBuilt {
  const c = base(6, M.dirt())
  const { b, D, edge } = c
  // Nexus mall on the left as you come in
  reserve(D - 52, D + 4, -(edge + 2), -(edge + 60))
  nexusMall(b, c.g, D - 24, -(edge + 6))
  // tabebuia and gulmohar in bloom down both sides
  treesAlong(c, -1, edge + 0.6, 7.5, (bb, d, X, s) => (s % 5 === 0 ? blossomTree(bb, d, X, s, false) : trumpetTree(bb, d, X, s)), 91)
  treesAlong(c, 1, edge + 0.6, 7.5, (bb, d, X, s) => (s % 4 === 0 ? blossomTree(bb, d, X, s, false) : trumpetTree(bb, d, X, s)), 92, [D + 6, D + 82])
  treesAlong(c, -1, edge + 14, 10, (bb, d, X, s) => trumpetTree(bb, d, X, s, 1.15), 902)
  treesAlong(c, 1, edge + 16, 10, (bb, d, X, s) => trumpetTree(bb, d, X, s, 1.15), 903, [D + 6, D + 82])
  rows(c, -1, edge + 3, { minH: 6.8, maxH: 13.6, kinds: ['villa', 'house', 'office'], colors: PAL.pastel, shops: 0.6, gap: 1.2 }, 93)
  rows(c, 1, edge + 3, { minH: 6.8, maxH: 13.6, kinds: ['villa', 'house', 'office'], colors: PAL.pastel, shops: 0.6, gap: 1.2 }, 94)
  rows(c, -1, edge + 24, { minH: 14, maxH: 26, kinds: ['office', 'apartment'], colors: PAL.wall }, 95, false)
  rows(c, 1, edge + 24, { minH: 14, maxH: 26, kinds: ['office', 'apartment'], colors: PAL.wall }, 96, false)
  // fallen blossom on the footpath
  for (let k = 0; k < 60; k++) {
    const r = rand(970 + k)
    const d = c.d0 + r() * (c.d1 - c.d0)
    const side = r() < 0.5 ? -1 : 1
    const f = frame(d, side * (c.spec.half + 0.4 + r() * c.spec.foot))
    b.add(flat(0.9, 0.9, 0, 0.17), M.leaf(r() < 0.85 ? 'trumpet' : 'blossom-orange'), { x: f.x, z: f.z, ry: r() * 6 })
  }
  for (let k = 0; k < 4; k++) crowd(b, c.d0 + 14 + k * 24, -(c.spec.half + 1.4), 3, 2.5, 98 + k)
  for (let k = 0; k < 8; k++) parked(c.g, c.d0 + 6 + k * 11, (k % 2 ? 1 : -1) * (c.spec.half - 0.5), 990 + k, 'scooter')
  poles(b, c.d0, c.d1, edge - 0.3, 26)
  lamps(c, 26)
  const pd = pandal(c, 'terracotta')
  traffic(c.g, c.actors, c.d0, c.d1 + 100, c.spec.half * 0.5, -8, 5, 99, { scooter: 0.5, auto: 0.25 })
  walkers(c.g, c.actors, c.d0, c.d1, -(c.spec.half + 1.2), 5, 100)
  walkers(c.g, c.actors, c.d0, c.d1, c.spec.half + 1.2, 4, 101)
  return finish(c, { pandalTop: pd.top, pandalLight: pd.light })
}

function hsr(): AreaBuilt {
  const c = base(7, M.grass())
  const { b, D, edge } = c
  // HSR High Street's food arcade on the right before the pandal
  reserve(D - 38, D - 8, edge + 0.5, edge + 24)
  hsrHighStreet(b, c.g, D - 23, edge + 1)
  // the high street on the right: shops below, homes above
  rows(c, 1, edge + 1, { minH: 9.6, maxH: 16, kinds: ['apartment', 'house'], colors: PAL.wall, shops: 1, gap: 0.2 }, 111)
  rows(c, 1, edge + 26, { minH: 14, maxH: 30, kinds: ['apartment'], colors: PAL.wall }, 112, false)
  // the park on the left: lawn, railing, walking track, trees and benches; a cross street at the junction
  railing(b, c.d0, D + 14, -edge - 0.4, '#2f5a46')
  railing(b, D + 26, c.d1, -edge - 0.4, '#2f5a46')
  c.b.add(ribbon(D + 14, D + 26, -90, -edge, 0.01, 12, 0, 2), M.road('two'))
  treesAlong(c, -1, edge + 6, 10, (bb, d, X, s) => rainTree(bb, d, X, s, 1.05), 113, [D + 10, D + 30])
  treesAlong(c, -1, edge + 22, 12, (bb, d, X, s) => neemTree(bb, d, X, s, 1.2), 114, [D + 10, D + 30])
  for (let d = c.d0 + 4; d < c.d1; d += 13) if (d < D + 10 || d > D + 30) bench(b, d, -(edge + 3))
  for (let k = 0; k < 3; k++) crowd(b, D - 30 + k * 30, -(edge + 10), 4, 6, 115 + k)
  rows(c, -1, edge + 46, { minH: 12, maxH: 28, kinds: ['apartment'], colors: PAL.wall }, 116, false)
  treesAlong(c, 1, edge - 0.6, 14, (bb, d, X, s) => (s % 2 ? trumpetTree(bb, d, X, s, 0.95) : neemTree(bb, d, X, s)), 117, [D + 6, D + 82])
  streetBunting(b, D + 6, D + 58, c.spec.half + 1.2, 6.5, festive, 9, 118)
  poles(b, c.d0, c.d1, -(edge - 0.3), 26)
  lamps(c, 24)
  const pd = pandal(c, 'neighbourhood')
  crowd(b, D + 26, edge - 1.2, 8, 10, 119)
  for (let k = 0; k < 6; k++) parked(c.g, c.d0 + 4 + k * 9, c.spec.half - 0.6, 1190 + k, k % 3 ? 'scooter' : 'car')
  traffic(c.g, c.actors, c.d0, c.d1 + 100, c.spec.half * 0.5, -9, 6, 120, { scooter: 0.5, auto: 0.25 })
  walkers(c.g, c.actors, c.d0, c.d1, c.spec.half + 1.3, 6, 121)
  walkers(c.g, c.actors, c.d0, c.d1, -(edge + 6), 4, 122)
  return finish(c, { pandalTop: pd.top, pandalLight: pd.light })
}

function southEast(): AreaBuilt {
  const c = base(8, M.dirt())
  const { b, D, edge } = c
  // the Infosys campus front on the right before the pandal
  reserve(D - 52, D + 2, edge + 2, edge + 70)
  infosysCampus(b, c.g, D - 25, edge + 3)
  // Hosur Road: the elevated line runs over the median
  viaduct(b, c.d0 - 10, c.d1 + 40, 0, 11.5)
  metro(c.g, c.actors, c.d0 - 40, c.d1 + 40, 1.4, '#e0b02a', 11.5, 15)
  const r = rand(131)
  for (let k = 0; k < 6; k++) building(b, c.d0 + 10 + k * 24, -(edge + 18 + r() * 10), { w: 18 + r() * 6, h: 38 + r() * 30, depth: 16, kind: 'apartment', color: pick(r, PAL.wall), tank: false }, 132 + k)
  for (let k = 0; k < 3; k++) tower(b, c.d0 + 8 + k * 20, edge + 18, 20, 30 + r() * 30, 18)
  for (let k = 0; k < 3; k++) tower(b, D + 64 + k * 22, edge + 20, 20, 34 + r() * 30, 18, '#b9c9d6')
  // eat street on the left: carts, lights and people
  const kinds = ['food', 'tea', 'food', 'fruit', 'food', 'food', 'tea'] as const
  for (let k = 0; k < 7; k++) stall(b, D - 20 + k * 7, -(c.spec.half + 1.4), kinds[k], 133 + k)
  for (let k = 0; k < 7; k++) {
    const a = frame(D - 23 + k * 7, -(c.spec.half + 2.6))
    const e = frame(D - 16 + k * 7, -(c.spec.half + 2.6))
    stringLights(b, new THREE.Vector3(a.x, 3.2, a.z), new THREE.Vector3(e.x, 3.2, e.z), 0.4, 0.5)
  }
  crowd(b, D - 4, -(c.spec.half + 2), 12, 24, 141, Math.PI / 2)
  rows(c, -1, edge + 3, { minH: 9.6, maxH: 13, kinds: ['apartment', 'house'], colors: PAL.wall, shops: 1 }, 142)
  treesAlong(c, 1, edge + 1, 12, (bb, d, X, s) => (s % 2 ? trumpetTree(bb, d, X, s, 0.95) : neemTree(bb, d, X, s)), 143, [D + 6, D + 82])
  lamps(c, 26)
  const pd = pandal(c, 'shikhara')
  traffic(c.g, c.actors, c.d0, c.d1 + 140, c.spec.half * 0.62, -12, 8, 144, { bus: 0.2 })
  traffic(c.g, c.actors, c.d0 + 30, c.d1 + 160, -c.spec.half * 0.35, 11, 4, 145, { bus: 0.2, scooter: 0.3 })
  walkers(c.g, c.actors, c.d0, c.d1, -(c.spec.half + 1.3), 6, 146)
  return finish(c, { pandalTop: pd.top, pandalLight: pd.light })
}

function south(): AreaBuilt {
  const c = base(9, M.grass())
  const { b, D, edge } = c
  // Puttenahalli lake on the left, Ragigudda's rock and temple rising beyond it
  railing(b, c.d0, c.d1, -edge - 0.8)
  lake(c, c.d0, c.d1 + 40, -220, -edge - 3)
  rockTemple(b, D + 120, -75)
  treesAlong(c, -1, 160, 10, (bb, d, X, s) => rainTree(bb, d, X, s, 1.2), 151)
  treesAlong(c, -1, edge + 1.5, 10, (bb, d, X, s) => (s % 3 === 0 ? neemTree(bb, d, X, s, 1.2) : trumpetTree(bb, d, X, s)), 152)
  // leafy JP Nagar homes on the right
  for (let d = c.d0 + 6; d < D + 20; d += 20) bungalow(b, d, edge, Math.floor(d) + 153)
  for (let d = D + 66; d < c.d1; d += 20) bungalow(b, d, edge, Math.floor(d) + 154)
  treesAlong(c, 1, edge + 0.6, 9, (bb, d, X, s) => (s % 4 === 0 ? rainTree(bb, d, X, s) : trumpetTree(bb, d, X, s, 1.05)), 155, [D + 6, D + 82])
  rows(c, 1, edge + 30, { minH: 12, maxH: 20, kinds: ['apartment'], colors: PAL.wall }, 156, false)
  // the Green Line, glowing above the rooftops
  viaduct(b, c.d0 - 20, c.d1 + 60, edge + 52, 13)
  metro(c.g, c.actors, c.d0 - 60, c.d1 + 60, edge + 53.4, '#3f8a4a', 13, 14)
  lamps(c, 22)
  const pd = pandal(c, 'sholapith')
  crowd(b, D + 26, edge - 1.2, 8, 10, 157)
  traffic(c.g, c.actors, c.d0, c.d1 + 100, c.spec.half * 0.5, -8, 4, 158, { scooter: 0.5, auto: 0.3 })
  walkers(c.g, c.actors, c.d0, c.d1, -(c.spec.half + 1.3), 5, 159)
  walkers(c.g, c.actors, c.d0, c.d1, c.spec.half + 1.3, 3, 160)
  return finish(c, { pandalTop: pd.top, pandalLight: pd.light })
}

function finale(): AreaBuilt {
  const c = base(10, M.grass(), { d1: stopD(10) + 200 })
  const { b, D, edge } = c
  // Ambedkar Veedhi: boulevard trees of Cubbon Park, Vidhana Soudha lit for the festival at the end
  const clear: [number, number] = [D + 30, D + 400]
  treesAlong(c, -1, edge + 1, 10, (bb, d, X, s) => rainTree(bb, d, X, s, 1.3), 171, clear)
  treesAlong(c, 1, edge + 1, 10, (bb, d, X, s) => rainTree(bb, d, X, s, 1.3), 172, clear)
  treesAlong(c, -1, edge + 16, 12, (bb, d, X, s) => rainTree(bb, d, X, s, 1.2), 173, clear)
  treesAlong(c, 1, edge + 16, 12, (bb, d, X, s) => rainTree(bb, d, X, s, 1.2), 174, clear)
  for (let d = c.d0 + 4; d < D + 50; d += 12) lamp(b, d, 0.7), lamp(b, d + 6, -0.7)
  vidhanaSoudha(b, D + 96, 0)
  b.add(ribbon(D + 50, D + 200, -90, 90, 0.03, 4, 4), M.paver(), undefined, '#e8e0d0')
  streetBunting(b, D - 20, D + 40, c.spec.half + 1.2, 7.5, festive, 14, 175)
  crowd(b, D + 62, -16, 16, 22, 176)
  crowd(b, D + 62, 16, 16, 22, 177)
  traffic(c.g, c.actors, c.d0, D + 50, c.spec.half * 0.62, -10, 4, 178, { bus: 0.2 })
  walkers(c.g, c.actors, c.d0, D + 70, -(c.spec.half + 1.6), 6, 179)
  walkers(c.g, c.actors, c.d0, D + 70, c.spec.half + 1.6, 6, 180)
  return finish(c, { to: D + 260 })
}

const BUILDERS: Array<() => AreaBuilt> = [hero, malleswaram, palaceGrounds, ulsoor, indiranagar, whitefield, koramangala, hsr, southEast, south, finale]
export const AREA_COUNT_3D = BUILDERS.length

export function buildArea(i: number): AreaBuilt {
  return BUILDERS[i]()
}

void dome
void person
