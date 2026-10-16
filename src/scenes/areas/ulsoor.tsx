import type { SceneDef } from '../types'
import { ROAD_DEFAULT, proj, roadPoint, roadCenterX, rng, shade, type RoadStyle } from '../world'
import { Ground, RoadSurface, Person, Bougainvillea, FgFoliage, Birds, PAL } from '../kit'
import { f1, poly, rects, stripAlong, faceAlong, MultiSky, CanopyBand, AvenueTree, ellipsePath, zRange, Glow } from './_north-helpers'

/**
 * Ulsoor: a calm pink-orange sunset on the road along Ulsoor Lake (Kensington Road feel).
 * Right: a lakeside walk with an iron railing and old lamp posts, then the water, still and glowing, with small
 * treed islands and, on the far bank, the gurudwara's white dome. Left: old Cantonment-era buildings with arched
 * verandahs and tiled roofs under rain trees. Very few people, lots of space.
 */
const road: RoadStyle = {
  ...ROAD_DEFAULT,
  halfWidth: 3.6,
  asphalt: '#574c4f',
  asphaltFar: '#b88f86',
  center: 'dashed',
  kerb: 'bw',
  footpath: 2.6,
  footpathColor: '#c9a99a',
  verge: '#6f7550',
}
const HW = road.halfWidth
const FP = HW + 0.2 + road.footpath
const RAIL_X = FP - 0.1
const WATER_X = FP + 0.6
const WATER_Y = -1.0
const ZFAR = 300

/* ------------------------------------------------------------ the gurudwara on the far bank */

function Gurudwara() {
  const Z = GZ
  const s = 440 / Z
  const base = proj(GX, WATER_Y + 1.2, Z)
  const P = (dx: number, dy: number) => ({ x: base.x + dx * s, y: base.y - dy * s })
  const R = (x0: number, y0: number, x1: number, y1: number): [number, number, number, number] => {
    const a = P(x0, y1)
    const b = P(x1, y0)
    return [a.x, a.y, b.x - a.x, b.y - a.y]
  }
  const white = '#f6ece6'
  const lit = '#ffe2c4'
  const shadeC = '#d8c3c4'
  // onion dome: bulb with a pointed tip
  const dome = (cx: number, y0: number, r: number) => {
    const a = P(cx - r, y0)
    const b = P(cx + r, y0)
    const top = P(cx, y0 + r * 2.2)
    const mid = P(cx, y0 + r * 1.1)
    return `M${f1(a.x)} ${f1(a.y)}C${f1(a.x - r * 0.25 * s)} ${f1(mid.y)} ${f1(mid.x - r * 0.6 * s)} ${f1(top.y + r * 0.5 * s)} ${f1(top.x)} ${f1(top.y)}C${f1(mid.x + r * 0.6 * s)} ${f1(top.y + r * 0.5 * s)} ${f1(b.x + r * 0.25 * s)} ${f1(mid.y)} ${f1(b.x)} ${f1(b.y)}Z`
  }
  const arches: [number, number, number, number][] = []
  for (let x = -14; x < 14; x += 3.2) arches.push(R(x, 1.0, x + 1.5, 4.2))
  for (let x = -7.5; x < 7.5; x += 3) arches.push(R(x, 7.2, x + 1.3, 9.6))
  return (
    <g>
      {/* the bank it stands on, and its soft reflection in the still water */}
      <path d={rects([R(-26, -1.2, 30, 0.1)])} fill="#8c6f66" />
      <path d={rects([R(-16, -7.4, 16, -1.2), R(-3.4, -12, 3.4, -7.4)])} fill="#f8dccb" opacity="0.2" />
      {/* main hall, upper storey and the central dome on a drum */}
      <path d={rects([R(-16, 0, 16, 6.2), R(-9, 6.2, 9, 11), R(-3.4, 11, 3.4, 13.2)])} fill={white} />
      <path d={rects([R(6, 0, 16, 6.2), R(4, 6.2, 9, 11), R(1.4, 11, 3.4, 13.2)])} fill={lit} opacity="0.55" />
      <path d={rects([R(-16.4, 6.0, 16.4, 6.6), R(-9.4, 10.8, 9.4, 11.3)])} fill={shadeC} />
      <path d={rects(arches)} fill="#b9a0a8" opacity="0.7" />
      <path d={dome(0, 13.2, 3.6)} fill={white} />
      <path d={dome(0, 13.2, 3.6)} fill={lit} opacity="0.35" transform={`translate(${f1(0.9 * s)} 0) scale(1 1)`} />
      {/* small chhatri domes at the corners */}
      {[-14.5, 14.5, -8, 8].map((cx, i) => {
        const y0 = Math.abs(cx) > 10 ? 6.6 : 11.3
        return (
          <g key={i}>
            <path d={rects([R(cx - 1.0, y0, cx + 1.0, y0 + 1.2)])} fill={white} />
            <path d={dome(cx, y0 + 1.2, 1.1)} fill={white} />
          </g>
        )
      })}
      {/* golden kalash finial */}
      <path d={rects([R(-0.12, 21, 0.12, 22.6)])} fill={PAL.gold} />
      {/* Nishan Sahib: slim pole with a small saffron pennant */}
      <path d={rects([R(19, 0, 19.25, 24)])} fill="#d9c7b7" />
      <path d={poly([P(19.25, 24), P(22.6, 23.0), P(19.25, 22.0)])} fill="#e58a2a" />
    </g>
  )
}

/* ------------------------------------------------------------ the lake */

function Water() {
  // water from the embankment out to the far bank
  const zs = zRange(2, ZFAR, 1.06)
  const edge = zs.map((z) => proj(roadCenterX(road, z) + WATER_X, WATER_Y, z))
  const pts = [...edge, { x: 1900, y: 563 }, { x: 1900, y: 1100 }, { x: edge[0].x, y: 1100 }]
  // sun reflection streak and soft ripples
  const r = rng(5)
  let glints = ''
  let ripples = ''
  for (let i = 0; i < 26; i++) {
    const y = 566 + Math.pow(r(), 1.5) * 120
    const w = (8 + r() * 26) * (1 + (y - 566) / 40)
    const x = SUN.x + (r() - 0.5) * (30 + (y - 566) * 1.4)
    glints += `M${f1(x - w / 2)} ${f1(y)}h${f1(w)}v${f1(1 + (y - 566) / 60)}h${f1(-w)}Z`
  }
  for (let i = 0; i < 18; i++) {
    const y = 575 + Math.pow(r(), 1.3) * 200
    const w = (30 + r() * 80) * (1 + (y - 566) / 60)
    const x = 1000 + r() * 700
    ripples += `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(1 + (y - 566) / 80)}h${f1(-w)}Z`
  }
  return (
    <g>
      <defs>
        <linearGradient id="ulsWater" x1="0" y1="560" x2="0" y2="860" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f9c99a" />
          <stop offset="0.12" stopColor="#efab95" />
          <stop offset="0.45" stopColor="#b98a9c" />
          <stop offset="1" stopColor="#6e6386" />
        </linearGradient>
      </defs>
      <path d={poly(pts)} fill="url(#ulsWater)" />
      <path d={ripples} fill="#ffe2c8" opacity="0.18" />
      <path d={glints} fill="#fff1d2" opacity="0.8" />
    </g>
  )
}

/** low treed island seen across the water, with its reflection */
function Island({ X, Z, w, h, seed }: { X: number; Z: number; w: number; h: number; seed: number }) {
  const p = proj(X, WATER_Y, Z)
  const s = 440 / Z
  const W = w * s
  const r = rng(seed)
  let d = ''
  let lt = ''
  const n = Math.max(4, Math.round(w / 4))
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n
    const cx = p.x - W / 2 + t * W + (r() - 0.5) * W * 0.06
    const hh = h * s * (0.55 + Math.sin(t * Math.PI) * 0.45) * (0.85 + r() * 0.3)
    const rx = (W / n) * 0.85
    d += ellipsePath(cx, p.y - hh * 0.55, rx, hh * 0.55)
    lt += ellipsePath(cx + rx * 0.25, p.y - hh * 0.75, rx * 0.5, hh * 0.25)
  }
  return (
    <g>
      <path d={d} fill="#6f5a62" opacity="0.28" transform={`translate(0 ${f1(2 * p.y)}) scale(1 -1)`} />
      <rect x={p.x - W * 0.55} y={p.y - 0.4 * s} width={W * 1.1} height={0.6 * s} fill="#8a7462" />
      <path d={d} fill="#4f5a3e" />
      <path d={lt} fill="#e0a87a" opacity="0.45" />
    </g>
  )
}

const SUN = { x: 1270, y: 515 }
const GX = 40
const GZ = 95

/* ------------------------------------------------------------ the lakeside walk */

function Embankment() {
  return (
    <g>
      {/* stone edge dropping to the water */}
      <path d={stripAlong(road, FP + 0.2, WATER_X, 2, ZFAR)} fill="#b8968a" />
      <path d={faceAlong(road, WATER_X, 2, ZFAR, WATER_Y, 0, 1.06)} fill="#8f7470" />
    </g>
  )
}

function Railing() {
  const posts: [number, number, number, number][] = []
  for (let z = 2.4; z < 160; z += Math.max(1.6, z / 7)) {
    const b = roadPoint(road, RAIL_X, z)
    posts.push([b.x - Math.max(0.6, 0.05 * b.s), b.y - 1.05 * b.s, Math.max(1.2, 0.1 * b.s), 1.05 * b.s])
  }
  return (
    <g>
      <path d={faceAlong(road, RAIL_X, 2.2, 160, 0.98, 1.06, 1.06)} fill="#2f2c33" />
      <path d={faceAlong(road, RAIL_X, 2.2, 160, 0.5, 0.55, 1.06)} fill="#2f2c33" opacity="0.85" />
      <path d={faceAlong(road, RAIL_X, 2.2, 160, 0.1, 0.14, 1.06)} fill="#2f2c33" opacity="0.7" />
      <path d={rects(posts)} fill="#2a2730" />
    </g>
  )
}

/** old Cantonment lamp post: a fluted column with a lantern head */
function OldLamp({ Z, lit = true }: { Z: number; lit?: boolean }) {
  const b = roadPoint(road, RAIL_X + 0.2, Z)
  const s = b.s
  const top = b.y - 4.2 * s
  return (
    <g>
      {lit && <Glow x={b.x} y={top - 0.35 * s} r={2.2 * s} color="#ffd38a" opacity={0.7} />}
      <path d={rects([
        [b.x - 0.14 * s, top, 0.28 * s, 4.2 * s],
        [b.x - 0.24 * s, b.y - 0.5 * s, 0.48 * s, 0.5 * s],
        [b.x - 0.26 * s, top - 0.06 * s, 0.52 * s, 0.1 * s],
      ])} fill="#2f2c33" />
      <path d={`M${f1(b.x - 0.22 * s)} ${f1(top - 0.06 * s)}L${f1(b.x - 0.3 * s)} ${f1(top - 0.7 * s)}L${f1(b.x + 0.3 * s)} ${f1(top - 0.7 * s)}L${f1(b.x + 0.22 * s)} ${f1(top - 0.06 * s)}Z`} fill={lit ? '#ffe2a6' : '#ddd'} />
      <path d={`M${f1(b.x - 0.36 * s)} ${f1(top - 0.7 * s)}L${f1(b.x)} ${f1(top - 1.0 * s)}L${f1(b.x + 0.36 * s)} ${f1(top - 0.7 * s)}Z`} fill="#2f2c33" />
    </g>
  )
}

/* ------------------------------------------------------------ left: Cantonment buildings */

/** a frontal Cantonment-era building: arched verandah, pitched tiled roof, green shutters; set back behind a low wall */
function CantonmentHouse({ X, Z, w, storeys = 1, wall = '#ead1a4' }: { X: number; Z: number; w: number; storeys?: 1 | 2; wall?: string; seed?: number }) {
  const b = proj(X, 0, Z)
  const s = 440 / Z
  const W = w * s
  const x0 = b.x - W / 2
  const fh = 3.8
  const H = fh * storeys * s
  const top = b.y - H
  const nA = Math.max(3, Math.round(w / 2.6))
  const aw = W / nA
  let arches = ''
  let shutters = ''
  for (let i = 0; i < nA; i++) {
    const ax = x0 + i * aw + aw * 0.18
    const awi = aw * 0.64
    const ay = b.y - 0.2 * s
    const ah = 2.6 * s
    arches += `M${f1(ax)} ${f1(ay)}V${f1(ay - ah + awi / 2)}A${f1(awi / 2)} ${f1(awi / 2)} 0 0 1 ${f1(ax + awi)} ${f1(ay - ah + awi / 2)}V${f1(ay)}Z`
    if (storeys === 2) {
      const wy = top + 0.9 * s
      shutters += `M${f1(ax + awi * 0.15)} ${f1(wy)}h${f1(awi * 0.7)}v${f1(1.7 * s)}h${f1(-awi * 0.7)}Z`
    }
  }
  const roofH = 2.2 * s
  const eave = 0.7 * s
  return (
    <g>
      {/* side face receding (building left of the road shows its right side) */}
      <path d={`M${f1(x0 + W)} ${f1(top)}L${f1(x0 + W + 0.12 * W)} ${f1(top + (b.y - top) * 0.06)}L${f1(x0 + W + 0.12 * W)} ${f1(b.y - (b.y - top) * 0.02)}L${f1(x0 + W)} ${f1(b.y)}Z`} fill={shade(wall, 0.08)} />
      <rect x={x0} y={top} width={W} height={H} fill={wall} />
      <rect x={x0 + W * 0.68} y={top} width={W * 0.32} height={H} fill="#ffe0c0" opacity="0.25" />
      <path d={arches} fill="#5d3f3a" />
      <path d={arches} fill="#ffcf8a" opacity="0.18" />
      {storeys === 2 && <path d={shutters} fill="#3f6a58" />}
      {storeys === 2 && <rect x={x0} y={top + fh * s - 0.25 * s} width={W} height={0.3 * s} fill={shade(wall, -0.15)} />}
      <rect x={x0 - 0.2 * s} y={b.y - 3.0 * s} width={W + 0.4 * s} height={0.22 * s} fill={shade(wall, -0.12)} />
      {/* pitched Mangalore-tile roof */}
      <path d={`M${f1(x0 - eave)} ${f1(top + 0.1 * s)}L${f1(x0 + W * 0.18)} ${f1(top - roofH)}L${f1(x0 + W * 0.82)} ${f1(top - roofH)}L${f1(x0 + W + eave)} ${f1(top + 0.1 * s)}Z`} fill={PAL.roofTile} />
      <path d={`M${f1(x0 + W * 0.5)} ${f1(top + 0.1 * s)}L${f1(x0 + W * 0.82)} ${f1(top - roofH)}L${f1(x0 + W + eave)} ${f1(top + 0.1 * s)}Z`} fill="#e48a5c" opacity="0.4" />
      <rect x={x0 - eave} y={top} width={W + eave * 2} height={0.18 * s} fill="#6e3424" />
    </g>
  )
}

function LowWall() {
  return (
    <g>
      <path d={faceAlong(road, -(FP + 0.4), 2.2, 90, 0, 1.1, 1.06)} fill="#e2c7a6" />
      <path d={faceAlong(road, -(FP + 0.4), 2.2, 90, 1.1, 1.24, 1.06)} fill="#bf9f84" />
    </g>
  )
}

const LEAF = { leaf: '#56603f', dark: '#363b2c', light: '#e3a36f', lightOpacity: 0.5 }

const ulsoor: SceneDef = {
  id: 'ulsoor',
  title: 'Ulsoor',
  road,
  layers: [
    {
      id: 'sky',
      band: 'back',
      depth: 0,
      static: true,
      render: () => (
        <g>
          <MultiSky
            stops={[
              [0, '#6f7aa8'],
              [0.25, '#a99bbd'],
              [0.48, '#e7a9a8'],
              [0.66, '#f5b48c'],
              [0.84, '#f9c78e'],
              [1, '#fbd9a6'],
            ]}
            sun={{ x: SUN.x, y: SUN.y, r: 24, color: '#fff0c8', glow: 9, halo: '#ffb37a' }}
          />
          {/* long thin sunset cloud streaks, away from the text */}
          <path
            d={[
              [1220, 330, 190, 5],
              [1360, 352, 240, 4],
              [1110, 386, 130, 3],
              [1450, 298, 170, 4],
              [1520, 420, 200, 3],
              [-40, 300, 200, 4],
            ]
              .map(([x, y, w, h]) => ellipsePath(x, y, w, h))
              .join('')}
            fill="#fdd0ae"
            opacity="0.6"
          />
          <Birds x={1080} y={250} count={4} s={1.1} seed={13} color="#5a3a46" />
        </g>
      ),
    },
    {
      id: 'far-bank',
      band: 'back',
      depth: 0.15,
      render: () => (
        <g>
          <CanopyBand x0={-200} x1={1800} y={565} h={16} w={30} seed={61} color="#6d5a5e" light="#e6a982" lightOpacity={0.35} bottom={567} />
          <CanopyBand x0={860} x1={1090} y={568} h={20} w={30} seed={63} color="#635a52" light="#e6a982" lightOpacity={0.35} bottom={571} />
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
          <Ground color="#6e6448" far="#c8a389" />
          <Water />
          <Embankment />
          <path d={stripAlong(road, -(FP + 60), -(FP + 0.4), 2, 120)} fill="#7d7a52" />
          <RoadSurface road={road} zFar={ZFAR} />
        </g>
      ),
    },
    {
      id: 'lake',
      band: 'back',
      depth: 0.3,
      render: () => (
        <g>
          <Gurudwara />
          <Island X={84} Z={120} w={20} h={7.5} seed={3} />
          <Island X={150} Z={150} w={40} h={10} seed={5} />
        </g>
      ),
    },
    {
      id: 'cantonment',
      band: 'front',
      depth: 0.55,
      render: () => (
        <g>
          <CanopyBand x0={-200} x1={760} y={552} h={30} w={56} seed={65} color="#4e5039" light="#e2a070" lightOpacity={0.35} bottom={572} />
          {[70, 44].map((Z, i) => (
            <AvenueTree key={i} X={-(FP + 7)} Z={Z} h={12} crown={1.0} lean={0.1} seed={20 + i} {...LEAF} />
          ))}
          <CantonmentHouse X={-40} Z={78} w={18} storeys={2} wall="#e7c9a0" seed={2} />
          <CantonmentHouse X={-24} Z={40} w={15} storeys={1} wall="#efd8b6" seed={3} />
          <CantonmentHouse X={-19} Z={22} w={12} storeys={1} wall="#e9cfae" seed={4} />
          <LowWall />
          <Bougainvillea {...roadPoint(road, -(FP + 0.4), 16)} y={roadPoint(road, -(FP + 0.4), 16).y - 1.1 * roadPoint(road, -(FP + 0.4), 16).s} w={2.4} h={1.1} seed={11} />
        </g>
      ),
    },
    {
      id: 'walk',
      band: 'front',
      depth: 0.8,
      render: () => (
        <g>
          <Railing />
          {[40, 8.6].map((Z) => (
            <OldLamp key={Z} Z={Z} />
          ))}
          <Person {...roadPoint(road, FP - 1.0, 30)} variant="woman" seed={31} colors={['#e9b25a', '#e9b25a']} />
          <Person {...roadPoint(road, FP - 1.5, 30.6)} variant="man" seed={32} colors={['#f2e6cf', '#3a5a7a']} />
          <Person {...roadPoint(road, -(FP - 0.8), 26)} variant="man" seed={33} flip colors={['#7a2f4a', '#3b3a44']} />
          <AvenueTree X={-(FP + 1.4)} Z={30} h={11} crown={0.8} lean={0.25} seed={24} {...LEAF} />
        </g>
      ),
    },
    {
      id: 'fore',
      band: 'fore',
      depth: 1.2,
      render: () => (
        <g transform="translate(-300 50)">
          <FgFoliage side="left" size={0.7} color="#2f3027" seed={67} />
        </g>
      ),
    },
  ],
}

export default ulsoor
