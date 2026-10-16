import type { SceneDef } from '../types'
import { ROAD_DEFAULT, proj, roadPoint, roadCenterX, rng, shade, type RoadStyle } from '../world'
import { Ground, RoadSurface, Bungalow, Person, FlowerBaskets, Bougainvillea, Signboard, Haze, PAL } from '../kit'
import { f1, poly, rects, stripAlong, faceAlong, MultiSky, CanopyBand, AvenueTree, ellipsePath } from './_north-helpers'

/**
 * Malleswaram: early golden light through old rain trees on a narrow Margosa Road-style lane.
 * Left: the 8th Cross market, low tiled-awning shops with flower and fruit stalls and a "TIFFIN ROOM" darshini.
 * Right: a long compound wall with old tiled-roof bungalows behind it. Ahead, where the lane turns left,
 * a modest old stone temple on its plinth (low tiered vimana, striped compound wall), framed by the trees' arch.
 */
const road: RoadStyle = {
  ...ROAD_DEFAULT,
  halfWidth: 2.8,
  asphalt: '#5b514b',
  asphaltFar: '#a8957f',
  center: 'none',
  kerb: 'bw',
  footpath: 1.5,
  footpathColor: '#bfa98d',
  verge: '#6f6a4c',
  bend: -7,
  bendStart: 26,
}
const HW = road.halfWidth
const FP = HW + 0.2 + road.footpath
const ZFAR = 60
const SHOP_X = -(FP + 0.4)
const WALL_X = FP + 0.4

/* ------------------------------------------------------------ the temple at the end of the lane */
const T_X = 4.2
const T_Z = 36
const T_RISE = 1.6

function StoneTemple() {
  // the lane turns left in front of it; it stands just right of the bend, facing us
  const base = proj(T_X, 0, T_Z)
  const s = 440 / T_Z
  const P = (dx: number, dy: number) => ({ x: base.x + dx * s, y: base.y - (dy + T_RISE) * s })
  const R = (x0: number, y0: number, x1: number, y1: number): [number, number, number, number] => {
    const a = P(x0, y1)
    const b = P(x1, y0)
    return [a.x, a.y, b.x - a.x, b.y - a.y]
  }
  const stone = '#cdbb9a'
  const stoneLit = '#ead7b0'
  const stoneShade = '#a08d72'
  const stripes: [number, number, number, number][] = []
  for (let x = -6.6; x < 8.4; x += 0.8) {
    if (x > -3.1 && x < 3.1) continue
    stripes.push(R(x, 1.5, x + 0.4, 2.9))
  }
  const tiers = [
    [-3.0, 3.0, 5.9, 7.0],
    [-2.45, 2.45, 7.0, 8.0],
    [-1.9, 1.9, 8.0, 8.85],
    [-1.35, 1.35, 8.85, 9.6],
  ]
  const pillars: [number, number, number, number][] = []
  for (const px of [-2.5, -1.0, 0.6, 2.1]) pillars.push(R(px, 1.5, px + 0.4, 4.4))
  const steps: [number, number, number, number][] = []
  for (let i = 0; i < 7; i++) steps.push(R(-2.2 - (6 - i) * 0.12, -T_RISE + i * 0.3, 2.2 + (6 - i) * 0.12, -T_RISE + i * 0.3 + 0.3))
  const stepLips = steps.map(([x, y, w]) => [x, y, w, Math.max(0.6, 0.05 * s)] as [number, number, number, number])
  let tierD = ''
  let tierLit = ''
  for (const [x0, x1, y0, y1] of tiers) {
    tierD += poly([P(x0, y0), P(x1, y0), P(x1 - 0.25, y1), P(x0 + 0.25, y1)])
    tierLit += poly([P(x1 * 0.3, y0), P(x1, y0), P(x1 - 0.25, y1), P(x1 * 0.3, y1)])
  }
  const tierLines = rects(tiers.map(([x0, x1, y0]) => R(x0 - 0.15, y0 - 0.12, x1 + 0.15, y0 + 0.08)))
  return (
    <g>
      {/* low tiered vimana behind the mandapa */}
      <path d={tierD} fill={stone} />
      <path d={tierLit} fill={stoneLit} opacity="0.65" />
      <path d={tierLines} fill={stoneShade} />
      <path d={`M${f1(P(-0.85, 9.6).x)} ${f1(P(0, 9.6).y)}Q${f1(P(0, 11.1).x)} ${f1(P(0, 11.4).y)} ${f1(P(0.85, 9.6).x)} ${f1(P(0, 9.6).y)}Z`} fill={stoneShade} />
      <path d={rects([R(-0.07, 11.0, 0.07, 11.8)])} fill={PAL.gold} />
      {/* shrine body */}
      <path d={rects([R(-4.0, 1.5, 4.0, 5.9)])} fill={stone} />
      <path d={rects([R(1.2, 1.5, 4.0, 5.9)])} fill={stoneLit} opacity="0.55" />
      <path d={rects([R(-4.2, 5.7, 4.2, 6.05)])} fill={stoneShade} />
      {/* striped compound wall and plinth */}
      <path d={rects([R(-6.6, 1.5, 8.4, 2.9)])} fill="#f3e9d6" />
      <path d={rects(stripes)} fill="#b84a3b" opacity="0.88" />
      <path d={rects([R(-6.7, 2.9, 8.5, 3.12)])} fill="#e3d4ba" />
      <path d={rects([R(-7.4, 0, 9.2, 1.5)])} fill={stoneShade} />
      <path d={rects([R(-7.4, 1.25, 9.2, 1.5)])} fill={stone} />
      {/* pillared entrance mandapa, warm lamp glow inside */}
      <path d={rects([R(-3.1, 1.5, 3.1, 4.4)])} fill="#5c4838" />
      <path d={rects([R(-0.9, 1.5, 0.9, 3.7)])} fill="#f4c46a" opacity="0.6" />
      <path d={rects(pillars)} fill={stoneLit} />
      <path d={rects([R(-3.5, 4.4, 3.5, 5.05)])} fill={stone} />
      <path d={rects([R(-3.5, 5.05, 3.5, 5.3)])} fill={stoneShade} />
      <path d={poly([P(-1.2, 5.3), P(1.2, 5.3), P(0.8, 6.0), P(-0.8, 6.0)])} fill={stoneLit} />
      {/* the rise it stands on: a rough stone retaining wall with greenery, and the long flight of steps */}
      <path d={poly([P(-10, -T_RISE), P(12, -T_RISE), P(11, 0), P(-9, 0)])} fill="#8e7d62" />
      <path d={poly([P(-10, -T_RISE), P(-6, -T_RISE), P(-6.5, 0), P(-9, 0)])} fill="#6f7a45" opacity="0.8" />
      <path d={poly([P(7.5, -T_RISE), P(12, -T_RISE), P(11, 0), P(8, 0)])} fill="#6f7a45" opacity="0.8" />
      <path d={rects(steps)} fill={stone} />
      <path d={rects(stepLips)} fill={stoneLit} />
      {/* brass deepastambha */}
      <path d={rects([R(4.6, 1.5, 4.8, 5.4), R(4.35, 5.4, 5.05, 5.6)])} fill="#c99c46" />
    </g>
  )
}

/* ------------------------------------------------------------ left: 8th Cross market shopfronts (receding) */

interface Seg {
  z0: number
  z1: number
  h: number
  wall: string
  open: 'goods' | 'dark' | 'shutter' | 'house'
  goods?: string[]
  band?: string
  awning?: string
}
const SEGS: Seg[] = [
  { z0: 2.0, z1: 6.4, h: 3.1, wall: '#efe2c8', open: 'house', awning: PAL.roofTileLight },
  { z0: 6.4, z1: 9.6, h: 3.4, wall: '#e9d6b4', open: 'goods', goods: ['#f0a020', '#fbf3e2', '#e66a1f'], band: '#b5452e', awning: PAL.roofTileLight },
  { z0: 9.6, z1: 12.6, h: 3.4, wall: '#e2cfae', open: 'goods', goods: ['#e2a53a', '#9fbf4a', '#d95b3a'], band: '#3f6d4a', awning: PAL.roofTile },
  { z0: 12.6, z1: 15.8, h: 6.3, wall: '#ecdcc0', open: 'goods', goods: ['#f2e6cf', '#d8a24a', '#f2e6cf'], band: '#2f5d4a', awning: PAL.roofTile },
  { z0: 15.8, z1: 19, h: 3.6, wall: '#e5c9a6', open: 'shutter', band: '#8a3a2e', awning: PAL.roofTile },
  { z0: 19, z1: 23.5, h: 6.6, wall: '#efe2c8', open: 'goods', goods: ['#c8a46a', '#e9d7b0', '#b5523a'], band: '#6a4a7a', awning: PAL.roofTileLight },
  { z0: 23.5, z1: 28, h: 3.6, wall: '#e3d0ae', open: 'goods', goods: ['#f0a020', '#e66a1f', '#fff4dc'], band: '#b5452e', awning: PAL.roofTile },
  { z0: 28, z1: 34, h: 6.4, wall: '#eadbbf', open: 'dark', band: '#2f5d4a', awning: PAL.roofTile },
]

function Shopfronts() {
  const X = SHOP_X
  const walls: Record<string, string> = {}
  let openings = ''
  let shutters = ''
  let shutterLines = ''
  let bands = ''
  const goods: Record<string, string> = {}
  const awn: Record<string, string> = {}
  let awnLip = ''
  let upperWins = ''
  let pilasters = ''
  let roofTop = ''
  let counters = ''
  let houseShutters = ''
  const add = (m: Record<string, string>, k: string, d: string) => (m[k] = (m[k] ?? '') + d)
  for (const sg of SEGS) {
    add(walls, sg.wall, faceAlong(road, X, sg.z0, sg.z1, 0, sg.h, 1.2))
    const a = sg.z0 + 0.35
    const b = sg.z1 - 0.3
    if (sg.open === 'house') {
      // old house front: two windows with painted shutters and a wooden door
      for (const [za, zb] of [
        [2.5, 3.3],
        [4.6, 5.4],
      ]) {
        openings += faceAlong(road, X + 0.02, za, zb, 0.9, 2.1, 1.3)
        houseShutters += faceAlong(road, X + 0.03, za - 0.28, za, 0.9, 2.1, 1.5) + faceAlong(road, X + 0.03, zb, zb + 0.28, 0.9, 2.1, 1.5)
      }
      houseShutters += faceAlong(road, X + 0.02, 3.75, 4.25, 0, 2.2, 1.5)
    } else if (sg.open === 'shutter') {
      shutters += faceAlong(road, X + 0.02, a, b, 0, 2.5, 1.2)
      for (let y = 0.3; y < 2.5; y += 0.3) shutterLines += faceAlong(road, X + 0.03, a, b, y, y + 0.05, 1.2)
    } else {
      openings += faceAlong(road, X + 0.02, a, b, 0, 2.5, 1.2)
      if (sg.goods) {
        // heaps of produce on a low counter just inside the shopfront
        counters += faceAlong(road, X + 0.3, a, b, 0, 0.75, 1.2)
        const n = sg.goods.length * 2
        for (let i = 0; i < n; i++) {
          const zc = a + ((b - a) * (i + 0.5)) / n
          const c = proj(roadCenterX(road, zc) + X + 0.45, 0.78, zc)
          const sc = 440 / zc
          add(goods, sg.goods[i % sg.goods.length], ellipsePath(c.x, c.y, 0.32 * sc, 0.2 * sc))
        }
      }
    }
    if (sg.band) bands += faceAlong(road, X + 0.03, sg.z0 + 0.1, sg.z1 - 0.1, 2.7, 3.15, 1.2)
    if (sg.awning) {
      // sloping tiled awning over the shopfront, seen from below
      const zz = [sg.z0, sg.z1]
      const pts = [proj(roadCenterX(road, zz[0]) + X, 3.35, zz[0]), proj(roadCenterX(road, zz[1]) + X, 3.35, zz[1]), proj(roadCenterX(road, zz[1]) + X + 1.0, 2.75, zz[1]), proj(roadCenterX(road, zz[0]) + X + 1.0, 2.75, zz[0])]
      add(awn, sg.awning, poly(pts))
      awnLip += faceAlong(road, X + 1.0, sg.z0, sg.z1, 2.62, 2.78, 1.2)
    }
    if (sg.h > 5) {
      for (let z = sg.z0 + 0.6; z + 1.0 < sg.z1; z += 1.7) upperWins += faceAlong(road, X + 0.03, z, z + 0.9, 4.0, 5.4, 1.5)
      roofTop += faceAlong(road, X, sg.z0, sg.z1, sg.h - 0.25, sg.h, 1.2)
    } else {
      roofTop += faceAlong(road, X, sg.z0, sg.z1, sg.h - 0.2, sg.h, 1.2)
    }
    pilasters += faceAlong(road, X + 0.04, sg.z0, sg.z0 + 0.25, 0, sg.h, 1.5)
  }
  return (
    <g>
      {Object.entries(walls).map(([c, d]) => (
        <path key={c} d={d} fill={c} />
      ))}
      <path d={openings} fill="#4a3528" />
      <path d={shutters} fill="#9a938a" />
      <path d={counters} fill="#6b4e36" />
      <path d={houseShutters} fill="#3f6d6a" />
      <path d={shutterLines} fill="#7d766d" />
      {Object.entries(goods).map(([c, d]) => (
        <path key={c} d={d} fill={c} opacity="0.92" />
      ))}
      <path d={bands} fill="#8a4a32" opacity="0.85" />
      <path d={upperWins} fill="#4f5a5c" />
      <path d={pilasters} fill="#c9b08c" opacity="0.7" />
      <path d={roofTop} fill="#b8a07e" />
      {Object.entries(awn).map(([c, d]) => (
        <path key={c} d={d} fill={shade(c, -0.18)} />
      ))}
      <path d={awnLip} fill="#7d3a26" />
    </g>
  )
}

/** frontal signboards hung on brackets from the shopfronts so they face the street */
function HangingSigns() {
  const list = [
    { z: 13.6, text: 'TIFFIN ROOM', bg: '#2f5d4a', w: 2.6 },
    { z: 7.4, text: 'FLOWERS', bg: '#b5452e', w: 1.9 },
  ]
  return (
    <g>
      {list.map((g, i) => {
        const p = proj(roadCenterX(road, g.z) + SHOP_X + 1.1 + g.w / 2, 3.55, g.z)
        const s = 440 / g.z
        const bx0 = proj(roadCenterX(road, g.z) + SHOP_X, 3.62, g.z)
        return (
          <g key={i}>
            <rect x={bx0.x} y={bx0.y - 0.05 * s} width={p.x - bx0.x + (g.w / 2) * s} height={Math.max(0.8, 0.07 * s)} fill="#4a3a30" />
            <Signboard x={p.x} y={p.y + 0.7 * s} s={s} w={g.w} h={0.62} text={g.text} bg={g.bg} />
          </g>
        )
      })}
    </g>
  )
}

function FlowerStall({ X, Z }: { X: number; Z: number }) {
  const p = roadPoint(road, X, Z)
  const s = p.s
  const top = p.y - 0.75 * s
  const strings = [-0.8, -0.45, -0.1, 0.25, 0.6]
  return (
    <g>
      <rect x={p.x - 1.0 * s} y={top} width={2.0 * s} height={0.75 * s} fill="#6b4e36" />
      <rect x={p.x - 1.0 * s} y={top} width={2.0 * s} height={0.1 * s} fill="#8a6a45" />
      <path d={ellipsePath(p.x - 0.5 * s, top - 0.06 * s, 0.48 * s, 0.2 * s) + ellipsePath(p.x + 0.62 * s, top - 0.05 * s, 0.34 * s, 0.15 * s)} fill="#ea8a1f" />
      <path d={ellipsePath(p.x + 0.12 * s, top - 0.07 * s, 0.38 * s, 0.17 * s)} fill="#fbf4e2" />
      <path d={rects([
        [p.x - 1.05 * s, top - 1.6 * s, 0.07 * s, 1.6 * s],
        [p.x + 0.98 * s, top - 1.6 * s, 0.07 * s, 1.6 * s],
        [p.x - 1.05 * s, top - 1.62 * s, 2.1 * s, 0.07 * s],
      ])} fill="#8a7050" />
      <path d={rects(strings.map((dx, i) => [p.x + dx * s, top - 1.55 * s, 0.09 * s, (0.7 + (i % 2) * 0.25) * s]))} fill="#f0a020" />
      <path d={rects(strings.map((dx, i) => [p.x + (dx + 0.17) * s, top - 1.55 * s, 0.08 * s, (0.55 + (i % 3) * 0.2) * s]))} fill="#fbf3e2" />
    </g>
  )
}

function FruitCart({ X, Z }: { X: number; Z: number }) {
  const p = roadPoint(road, X, Z)
  const s = p.s
  const top = p.y - 0.9 * s
  return (
    <g>
      <path d={rects([
        [p.x - 1.1 * s, top, 2.2 * s, 0.16 * s],
        [p.x - 0.95 * s, top + 0.16 * s, 0.1 * s, 0.74 * s],
        [p.x + 0.85 * s, top + 0.16 * s, 0.1 * s, 0.74 * s],
      ])} fill="#6a4a34" />
      <path d={ellipsePath(p.x - 0.62 * s, top - 0.1 * s, 0.42 * s, 0.2 * s)} fill="#e9c13a" />
      <path d={ellipsePath(p.x + 0.05 * s, top - 0.12 * s, 0.38 * s, 0.22 * s)} fill="#e9862a" />
      <path d={ellipsePath(p.x + 0.66 * s, top - 0.1 * s, 0.38 * s, 0.19 * s)} fill="#7fae4a" />
      <path d={`M${f1(p.x - 1.4 * s)} ${f1(top - 1.2 * s)}Q${f1(p.x)} ${f1(top - 2.0 * s)} ${f1(p.x + 1.4 * s)} ${f1(top - 1.2 * s)}Z`} fill="#c95a3a" />
      <rect x={p.x - 0.04 * s} y={top - 1.7 * s} width={0.08 * s} height={1.7 * s} fill="#4a3a30" />
    </g>
  )
}

/* ------------------------------------------------------------ right: compound wall + bungalows */

function CompoundWall() {
  const posts: [number, number, number, number][] = []
  const gates = [
    [6.2, 8.2],
    [16.5, 18.2],
    [27, 28.6],
  ]
  for (let z = 2.6; z < 36; z += Math.max(2.4, z / 4)) {
    if (gates.some(([a, b]) => z > a - 0.2 && z < b + 0.2)) continue
    const p = roadPoint(road, WALL_X, z)
    posts.push([p.x - 0.18 * p.s, p.y - 1.75 * p.s, 0.36 * p.s, 1.75 * p.s])
  }
  let gateD = ''
  let gatePosts = ''
  for (const [a, b] of gates) {
    gateD += faceAlong(road, WALL_X + 0.02, a, b, 0, 1.35, 1.2)
    gatePosts += faceAlong(road, WALL_X + 0.04, a - 0.35, a, 0, 2.0, 1.5) + faceAlong(road, WALL_X + 0.04, b, b + 0.35, 0, 2.0, 1.5)
  }
  return (
    <g>
      <path d={faceAlong(road, WALL_X, 2, 36, 0, 1.5, 1.08)} fill="#e7d6b6" />
      <path d={faceAlong(road, WALL_X, 2, 36, 1.5, 1.64, 1.08)} fill="#c7b392" />
      <path d={faceAlong(road, WALL_X, 2, 36, 0, 0.24, 1.08)} fill="#a58f72" />
      <path d={gateD} fill="#3c3430" />
      <path d={rects(posts) + gatePosts} fill="#d6c3a0" />
    </g>
  )
}

/* ------------------------------------------------------------ light */

/** dappled sunlight on the lane: many small flattened spots */
function Dapples() {
  const r = rng(17)
  let d = ''
  for (let i = 0; i < 70; i++) {
    const Z = 2.6 + Math.pow(r(), 1.5) * 34
    const X = (r() - 0.5) * 2 * (FP + 0.3)
    const p = roadPoint(road, X, Z)
    const rx = p.s * (0.12 + r() * 0.3)
    const ry = rx * 0.16
    d += ellipsePath(p.x, p.y, rx, Math.max(0.6, ry))
  }
  return <path d={d} fill="#ffe3a2" opacity="0.36" />
}

function LightShafts() {
  const beams = [
    [1150, 60, 1250, 60, 840, 560, 760, 560],
    [990, 40, 1030, 40, 760, 500, 725, 500],
    [1450, 120, 1560, 120, 1150, 600, 1060, 600],
  ]
  return (
    <g>
      <defs>
        <linearGradient id="mlwBeam" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff0bf" stopOpacity="0.26" />
          <stop offset="1" stopColor="#fff0bf" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={beams.map((b) => `M${b[0]} ${b[1]}L${b[2]} ${b[3]}L${b[4]} ${b[5]}L${b[6]} ${b[7]}Z`).join('')} fill="url(#mlwBeam)" />
    </g>
  )
}

const LEAF = {
  sun: { leaf: '#6c8645', dark: '#465f33', light: '#c9c272' },
  mid: { leaf: '#56713b', dark: '#344b2a', light: '#b6b467' },
}

/**
 * The canopy ceiling: the crowns of the near rain trees seen from below. A soft, sunlit fringe high across the top
 * (calm behind the headings), thickening and dropping lower only in the top-right corner.
 */
function CanopyCeiling() {
  const r = rng(91)
  const yEdge = (x: number) => {
    if (x < 1040) return 40 + Math.sin(x / 80) * 10
    return 40 + Math.pow((x - 1040) / 560, 1.6) * 360 + Math.sin(x / 60) * 14
  }
  let body = `M-220 -220L-220 ${f1(yEdge(-220))}`
  let under = ''
  let lit = ''
  let holes = ''
  let x = -220
  while (x < 1820) {
    const w = 40 + r() * 60
    const y0 = yEdge(x)
    const y1 = yEdge(x + w)
    const dip = 10 + r() * 22
    body += `L${f1(x)} ${f1(y0)}Q${f1(x + w / 2)} ${f1(Math.max(y0, y1) + dip)} ${f1(x + w)} ${f1(y1)}`
    const cy = Math.max(y0, y1) - 4
    under += ellipsePath(x + w / 2, cy, w * 0.45, dip * 0.7 + 7)
    if (r() < 0.8) lit += ellipsePath(x + w * (0.4 + r() * 0.25), cy - 12 - r() * 16, w * 0.24, 8 + r() * 6)
    if (x > 1000 && r() < 0.55) {
      const hx = x + w * r()
      const hy = yEdge(hx) - 30 - r() * 120
      if (hy > 0) holes += ellipsePath(hx, hy, 4 + r() * 8, 3 + r() * 5)
    }
    x += w
  }
  body += `L1820 ${f1(yEdge(1820))}L1820 -220Z`
  return (
    <g>
      <defs>
        <linearGradient id="mlwCanopy" x1="0" y1="0" x2="1" y2="0.25">
          <stop offset="0" stopColor="#7e9450" />
          <stop offset="0.55" stopColor="#5f7a40" />
          <stop offset="1" stopColor="#3a5230" />
        </linearGradient>
      </defs>
      <path d={body} fill="url(#mlwCanopy)" />
      <path d={under} fill="#4f6a37" opacity="0.55" />
      <path d={lit} fill="#d2c978" opacity="0.5" />
      <path d={holes} fill="#fbe6b4" opacity="0.85" />
    </g>
  )
}

const malleswaram: SceneDef = {
  id: 'malleswaram',
  title: 'Malleswaram',
  road,
  layers: [
    {
      id: 'sky',
      band: 'back',
      depth: 0,
      static: true,
      render: () => (
        <MultiSky
          stops={[
            [0, '#f0d39c'],
            [0.5, '#f8e2b2'],
            [0.8, '#fcebc8'],
            [1, '#fdeed0'],
          ]}
          sun={{ x: 1000, y: 470, r: 0, glow: 18, halo: '#ffe4a6' }}
        />
      ),
    },
    {
      id: 'far-lane',
      band: 'back',
      depth: 0.1,
      render: () => (
        <g>
          <CanopyBand x0={-200} x1={1800} y={556} h={56} w={58} seed={33} color="#879258" light="#dccd8c" lightOpacity={0.45} bottom={570} />
          <CanopyBand x0={760} x1={1120} y={566} h={96} w={70} seed={35} color="#76854d" light="#d2c684" lightOpacity={0.45} bottom={580} />
          <Haze y={562} h={80} color="#fae4b2" opacity={0.65} />
        </g>
      ),
    },
    {
      id: 'ground',
      band: 'back',
      depth: 1,
      static: true,
      render: () => (
        <g>
          <Ground color="#8f7d61" far="#dcc79f" />
          <RoadSurface road={road} zFar={ZFAR} />
          <path d={stripAlong(road, SHOP_X, -FP, 2, 34)} fill="#b39b7f" />
          <path d={stripAlong(road, WALL_X, WALL_X + 30, 2, 40)} fill="#8d8a55" />
          <Dapples />
        </g>
      ),
    },
    {
      id: 'temple',
      band: 'back',
      depth: 0.3,
      render: () => (
        <g>
          <StoneTemple />
          <LightShafts />
        </g>
      ),
    },
    {
      id: 'lane',
      band: 'front',
      depth: 0.55,
      render: () => {
        const bung = [
          { Z: 31, w: 10, wall: '#efe0c2', sh: '#3f6d6a' },
          { Z: 21.5, w: 11, wall: '#e9d0b0', sh: '#2f5f7a' },
          { Z: 12, w: 11, wall: '#f0e3c9', sh: '#4f7a5a' },
        ]
        return (
          <g>
            {/* old bungalows set back behind the compound wall */}
            {bung.map((b, i) => {
              const p = roadPoint(road, WALL_X + 2.2 + b.w / 2, b.Z)
              return <Bungalow key={i} x={p.x} y={p.y} s={p.s} w={b.w} h={3.6} wall={b.wall} shutter={b.sh} seed={120 + i * 7} compound={false} />
            })}
            <CompoundWall />
            <Bougainvillea {...roadPoint(road, WALL_X + 0.2, 14.5)} y={roadPoint(road, WALL_X, 14.5).y - 1.5 * roadPoint(road, WALL_X, 14.5).s} w={2.2} h={1.3} seed={9} />
            {/* two far rain trees arch over the lane and frame the temple */}
            <AvenueTree road={road} X={FP + 0.4} Z={25} h={17.5} crown={0.9} lean={-0.35} seed={5} {...LEAF.mid} />
            <AvenueTree road={road} X={-(FP + 0.1)} Z={21} h={17} crown={0.85} lean={0.3} seed={6} {...LEAF.sun} />
            <Shopfronts />
          </g>
        )
      },
    },
    {
      id: 'market',
      band: 'front',
      depth: 0.8,
      render: () => {
        const fb = roadPoint(road, -(FP - 0.4), 10.5)
        const fb2 = roadPoint(road, -(FP - 0.3), 15)
        return (
          <g>
            <HangingSigns />
            <FruitCart X={-(FP - 0.6)} Z={18} />
            <FlowerStall X={-(FP - 0.8)} Z={5.6} />
            <FlowerBaskets x={fb.x} y={fb.y} s={fb.s} count={3} seed={44} />
            <FlowerBaskets x={fb2.x} y={fb2.y} s={fb2.s} count={3} seed={46} />
            <Person {...roadPoint(road, -(FP - 0.9), 12.6)} variant="woman" seed={71} colors={['#2f5d4a', '#2f5d4a']} />
            <Person {...roadPoint(road, -(FP - 0.3), 20.5)} variant="man" seed={72} flip colors={['#f2e6cf', '#e5d3b3']} />
            <Person {...roadPoint(road, -(FP - 0.4), 9.0)} variant="woman" seed={73} flip colors={['#c96b3a', '#c96b3a']} />
            <Person {...roadPoint(road, FP - 0.6, 19)} variant="man" seed={75} colors={['#fbf3e6', '#fbf3e6']} />
            <Person {...roadPoint(road, FP - 0.4, 23)} variant="woman" seed={76} flip colors={['#7a2f4a', '#7a2f4a']} />
            {/* near rain trees on the right: trunks rising into the canopy ceiling */}
            <AvenueTree road={road} X={FP + 0.7} Z={9} h={18} crown={0.62} lean={0.75} seed={9} {...LEAF.sun} />
            <AvenueTree road={road} X={FP + 0.9} Z={4.2} h={17} crown={1.0} lean={-0.3} seed={10} {...LEAF.mid} />
          </g>
        )
      },
    },
    {
      id: 'canopy',
      band: 'front',
      depth: 0.95,
      render: () => <CanopyCeiling />,
    },
  ],
}

export default malleswaram
