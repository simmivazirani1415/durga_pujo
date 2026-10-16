import type { SceneDef } from '../types'
import { MetroTrain } from '../life'
import { ROAD_DEFAULT, proj, place, roadPoint, rng, shade, mix, type RoadStyle } from '../world'
import { Ground, RoadSurface, Lamp, Person, MetroViaduct, Signboard, Bougainvillea, PAL } from '../kit'
import { f1, rects, stripAlong, faceAlong, MultiSky, CanopyBand, AvenueTree, ellipsePath, Glow } from './_north-helpers'

/**
 * Indiranagar: dusk turning to blue hour on 100 Feet Road. Old villas turned into cafés and boutiques line both
 * sides with warm lit windows and a little outdoor seating, rain trees darken overhead, and ahead the elevated
 * Purple Line crosses the road on its viaduct (along CMH Road) with a lit purple-livery train. Evening pedestrians.
 * No pandal here.
 */
const road: RoadStyle = {
  ...ROAD_DEFAULT,
  halfWidth: 4.6,
  asphalt: '#4a4550',
  asphaltFar: '#8f7f88',
  center: 'dashed',
  centerColor: '#e6dccb',
  kerb: 'bw',
  footpath: 2.6,
  footpathColor: '#a99790',
  verge: '#4f5446',
}
const HW = road.halfWidth
const FP = HW + 0.2 + road.footpath
const L_X = -(FP + 2.4)
const R_X = FP + 2.4
const METRO_Z = 40
const ZFAR = 200

type Kind = 'villa' | 'block' | 'boutique'
interface Seg {
  z0: number
  z1: number
  kind: Kind
  h: number
  wall: string
}
/* both sides break at Z 34-46 where CMH Road crosses under the metro viaduct */
const LEFT: Seg[] = [
  { z0: 13, z1: 20, kind: 'villa', h: 7, wall: '#d9c2a6' },
  { z0: 20, z1: 27, kind: 'block', h: 11, wall: '#c8b6a6' },
  { z0: 27, z1: 34, kind: 'villa', h: 7, wall: '#dcc6aa' },
  { z0: 47, z1: 60, kind: 'block', h: 12, wall: '#b7a69a' },
  { z0: 60, z1: 80, kind: 'block', h: 15, wall: '#b3a398' },
]
const RIGHT: Seg[] = [
  { z0: 6, z1: 11.5, kind: 'villa', h: 7.2, wall: '#e2c8a6' },
  { z0: 11.5, z1: 17, kind: 'boutique', h: 7, wall: '#d6bba3' },
  { z0: 17, z1: 24, kind: 'block', h: 11, wall: '#cbb8a6' },
  { z0: 24, z1: 33, kind: 'villa', h: 7, wall: '#dcc3a6' },
  { z0: 47, z1: 62, kind: 'block', h: 11, wall: '#b8a79b' },
  { z0: 62, z1: 84, kind: 'block', h: 16, wall: '#b1a197' },
]

/** a run of receding street facades: villas with tiled eaves, small blocks with glass fronts, all lit for the evening */
function Facades({ X, segs, seed }: { X: number; segs: Seg[]; seed: number }) {
  const r = rng(seed)
  const side = X < 0 ? 1 : -1 // direction towards the road
  const walls: Record<string, string> = {}
  let shadeD = ''
  let glass = ''
  let glow = ''
  let dark = ''
  let roofs = ''
  let eaveLip = ''
  let trims = ''
  let mull = ''
  const add = (k: string, d: string) => (walls[k] = (walls[k] ?? '') + d)
  for (const sg of segs) {
    add(sg.wall, faceAlong(road, X, sg.z0, sg.z1, 0, sg.h, 1.15))
    // ground floor: big warm glass fronts (cafés, shops), split by piers
    const n = Math.max(2, Math.round((sg.z1 - sg.z0) / 3))
    for (let i = 0; i < n; i++) {
      const a = sg.z0 + ((sg.z1 - sg.z0) * i) / n + 0.35
      const b = sg.z0 + ((sg.z1 - sg.z0) * (i + 1)) / n - 0.35
      if (r() < 0.82) {
        glass += faceAlong(road, X + side * 0.02, a, b, 0.25, 2.8, 1.3)
        for (let z = a + 0.9; z < b - 0.3; z += 0.9) mull += faceAlong(road, X + side * 0.03, z, z + 0.08, 0.25, 2.8, 2)
        mull += faceAlong(road, X + side * 0.03, a, b, 2.1, 2.18, 1.3)
      } else dark += faceAlong(road, X + side * 0.02, a, b, 0.25, 2.8, 1.3)
    }
    // upper floors: windows, some lit
    const floors = Math.floor(sg.h / 3.2)
    for (let f = 1; f < floors; f++) {
      for (let z = sg.z0 + 0.8; z + 1.2 < sg.z1; z += 2.2) {
        const d = faceAlong(road, X + side * 0.02, z, z + 1.1, f * 3.2 + 0.7, f * 3.2 + 2.3, 1.5)
        if (r() < 0.55) glow += d
        else dark += d
      }
    }
    if (sg.kind === 'villa') {
      // sloping Mangalore-tile eave over the old villa, seen from below
      const pts = (z: number, dx: number, y: number) => proj(X + side * dx, y, z)
      const p = [pts(sg.z0, 0, sg.h + 0.2), pts(sg.z1, 0, sg.h + 0.2), pts(sg.z1, 1.2, sg.h - 0.6), pts(sg.z0, 1.2, sg.h - 0.6)]
      roofs += 'M' + p.map((q) => `${f1(q.x)} ${f1(q.y)}`).join('L') + 'Z'
      eaveLip += faceAlong(road, X + side * 1.2, sg.z0, sg.z1, sg.h - 0.75, sg.h - 0.55, 1.2)
      trims += faceAlong(road, X + side * 0.03, sg.z0, sg.z1, 3.05, 3.3, 1.2)
    } else {
      trims += faceAlong(road, X, sg.z0, sg.z1, sg.h - 0.35, sg.h, 1.2)
      trims += faceAlong(road, X + side * 0.03, sg.z0, sg.z1, 3.0, 3.25, 1.2)
      if (sg.kind === 'boutique') eaveLip += faceAlong(road, X + side * 0.9, sg.z0 + 0.3, sg.z1 - 0.3, 2.9, 3.15, 1.2)
    }
    // the far end of each building: a sliver of its end wall in shade
    shadeD += faceAlong(road, X + side * 0.01, sg.z1 - 0.25, sg.z1, 0, sg.h, 2)
  }
  return (
    <g>
      {Object.entries(walls).map(([c, d]) => (
        <path key={c} d={d} fill={mix(c, '#7f7aa0', 0.18)} />
      ))}
      <path d={shadeD} fill="#4a4250" opacity="0.5" />
      <path d={dark} fill="#3d3a4a" />
      <path d={glass} fill="#f6c27a" />
      <path d={glow} fill={PAL.windowLit} opacity="0.88" />
      <path d={mull} fill="#6a5040" opacity="0.7" />
      <path d={trims} fill="#8e7f80" opacity="0.7" />
      <path d={roofs} fill="#7d3e2f" />
      <path d={eaveLip} fill="#4f2a22" />
    </g>
  )
}

/** hanging signboards that face the street (generic names only) */
function Signs() {
  const list = [
    { X: R_X - 1.4, Z: 7.2, y: 3.6, text: 'CAFE', bg: '#2f4a3e', w: 1.5 },
    { X: R_X - 1.3, Z: 14.8, y: 3.6, text: 'BOUTIQUE', bg: '#6a2f3c', w: 2.1 },
    { X: L_X + 1.3, Z: 16.5, y: 3.6, text: 'BOOKS', bg: '#3c3a5c', w: 1.6 },
    { X: L_X + 1.3, Z: 30, y: 3.6, text: 'BAKERY', bg: '#7a4a2a', w: 1.8 },
  ]
  return (
    <g>
      {list.map((g, i) => {
        const p = proj(g.X, g.y, g.Z)
        const s = 440 / g.Z
        return <Signboard key={i} x={p.x} y={p.y + 0.7 * s} s={s} w={g.w} h={0.62} text={g.text} bg={g.bg} fg="#ffe9c2" />
      })}
    </g>
  )
}

/** café forecourt: a few small tables with people, under one short strand of warm bulbs */
function CafeSeating() {
  const tables = [
    { X: FP + 1.0, Z: 6.2 },
    { X: FP + 1.7, Z: 8.4 },
  ]
  let tops = ''
  let legs = ''
  for (const t of tables) {
    const p = place(t.X, t.Z)
    const s = p.s
    tops += ellipsePath(p.x, p.y - 0.75 * s, 0.45 * s, 0.1 * s)
    legs += `M${f1(p.x - 0.04 * s)} ${f1(p.y - 0.75 * s)}h${f1(0.08 * s)}v${f1(0.75 * s)}h${f1(-0.08 * s)}Z`
  }
  const a = place(FP + 0.2, 4.4)
  const b = place(FP + 0.2, 10)
  const bulbs: [number, number][] = []
  for (let i = 1; i < 9; i++) {
    const t = i / 9
    const z = 4.4 + (10 - 4.4) * t
    const q = proj(FP + 0.2, 2.75 - Math.sin(t * Math.PI) * 0.35, z)
    bulbs.push([q.x, q.y])
  }
  const sA = a.s
  return (
    <g>
      <path d={`M${f1(a.x)} ${f1(a.y - 2.8 * sA)}Q${f1((a.x + b.x) / 2)} ${f1((a.y - 2.8 * sA + b.y - 2.8 * b.s) / 2 + 0.5 * sA)} ${f1(b.x)} ${f1(b.y - 2.8 * b.s)}`} stroke="#3a3440" strokeWidth="1" fill="none" />
      <path d={bulbs.map(([x, y]) => ellipsePath(x, y, 2.2, 2.4)).join('')} fill="#ffe2a0" />
      <Person {...place(FP + 0.55, 6.4)} variant="woman" seed={81} colors={['#3a5a7a', '#3a5a7a']} flip />
      <Person {...place(FP + 1.5, 6.0)} variant="man" seed={82} colors={['#e5d3b3', '#3b3a44']} />
      <Person {...place(FP + 2.2, 8.6)} variant="woman" seed={83} colors={['#c96b3a', '#c96b3a']} flip />
      <path d={legs} fill="#2e2a30" />
      <path d={tops} fill="#e9dcc8" />
    </g>
  )
}

function LowWall({ X, z0, z1 }: { X: number; z0: number; z1: number }) {
  return (
    <g>
      <path d={faceAlong(road, X, z0, z1, 0, 1.1, 1.08)} fill="#c8aa96" />
      <path d={faceAlong(road, X, z0, z1, 1.1, 1.24, 1.08)} fill="#94786c" />
    </g>
  )
}


const LEAF = { leaf: '#3c4a40', dark: '#29322e', light: '#d29a66', lightOpacity: 0.32 }

const indiranagar: SceneDef = {
  id: 'indiranagar',
  title: 'Indiranagar',
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
              [0, '#3c5287'],
              [0.3, '#5f6fa2'],
              [0.52, '#9a88aa'],
              [0.72, '#d69a8e'],
              [0.88, '#efb184'],
              [1, '#f4c592'],
            ]}
            sun={{ x: 560, y: 600, r: 0, glow: 26, halo: '#ffb070' }}
          />
          <path d={[
            [1180, 120, 1.4],
            [1320, 80, 1.1],
            [1460, 160, 1.2],
            [1100, 60, 1.0],
          ].map(([x, y, rr]) => ellipsePath(x, y, rr, rr)).join('')} fill="#f4ecdf" opacity="0.8" />
        </g>
      ),
    },
    {
      id: 'far',
      band: 'back',
      depth: 0.1,
      render: () => (
        <g>
          <CanopyBand x0={-200} x1={1800} y={566} h={26} w={40} seed={71} color="#4a4a58" light="#c48c78" lightOpacity={0.25} bottom={575} />
          <path d={rects([
            [610, 548, 28, 18],
            [650, 540, 22, 26],
            [930, 544, 30, 22],
            [972, 552, 18, 14],
          ])} fill="#5a5466" />
          <path d={rects([
            [616, 554, 4, 3],
            [626, 560, 4, 3],
            [655, 548, 4, 3],
            [664, 556, 4, 3],
            [938, 552, 4, 3],
            [950, 558, 4, 3],
          ])} fill={PAL.windowLit} opacity="0.8" />
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
          <Ground color="#4d4a4c" far="#a08a8a" />
          <path d={stripAlong(road, L_X, -FP, 2, 120)} fill="#7f7076" />
          <path d={stripAlong(road, L_X - 60, L_X, 2, 13)} fill="#3e463d" />
          <path d={stripAlong(road, FP, R_X, 2, 120)} fill="#85767a" />
          <RoadSurface road={road} zFar={ZFAR} />
          {/* warm pools of light from shopfronts and lamps on the footpaths */}
          <path d={[
            [R_X - 1.6, 7, 2.2],
            [R_X - 1.6, 13.5, 2],
            [L_X + 1.6, 17, 2],
            [L_X + 1.6, 30, 1.8],
            [FP - 1.2, 15, 2.6],
            [-FP + 1.2, 23, 2.4],
          ].map(([X, Z, R]) => {
            const p = roadPoint(road, X, Z)
            return ellipsePath(p.x, p.y, R * p.s, R * p.s * 0.22)
          }).join('')} fill="#ffcf8a" opacity="0.22" />
        </g>
      ),
    },
    {
      id: 'metro',
      band: 'back',
      depth: 0.3,
      render: () => {
        const m = place(0, METRO_Z)
        const s = m.s
        const deckY = m.y - 10 * s
        const pillars = [-(HW + 3.5), HW + 3.5, -(HW + 32), HW + 32, -(HW + 62), HW + 62].map((X) => 800 + X * s)
        return (
          <g>
            <Facades X={L_X} segs={LEFT.filter((g) => g.z0 > METRO_Z)} seed={11} />
            <Facades X={R_X} segs={RIGHT.filter((g) => g.z0 > METRO_Z)} seed={12} />
            <MetroViaduct y={m.y} s={s} h={10} pillars={pillars} color="#b9adb4" />
            <Glow x={800} y={deckY + 2.4 * s} r={60} color="#ffcf8a" opacity={0.25} />
          </g>
        )
      },
    },
    {
      // the Purple Line train glides across now and then (its own small layer so only it repaints)
      id: 'metro-train',
      band: 'back',
      depth: 0.3,
      render: () => {
        const m = place(0, METRO_Z)
        const s = m.s
        const deckY = m.y - 10 * s
        return (
          <g>
            <MetroTrain x={470} deckY={deckY} s={s} len={63} livery="purple" lit dur={20} delay={6} />
          </g>
        )
      },
    },
    {
      id: 'street',
      band: 'front',
      depth: 0.55,
      render: () => (
        <g>
          {/* a villa garden behind the low wall on the left: dark trees, two warm windows between them */}
          <path d={rects([
            [250, 520, 16, 14],
            [274, 520, 16, 14],
            [120, 528, 14, 12],
          ])} fill="#ffcf86" opacity="0.85" />
          <CanopyBand x0={-200} x1={250} y={560} h={58} w={62} seed={73} color="#2f3a37" light="#b98a6a" lightOpacity={0.28} bottom={600} />
          <CanopyBand x0={290} x1={440} y={560} h={44} w={50} seed={75} color="#36423c" light="#c09070" lightOpacity={0.28} bottom={600} />
          {[30, 19].map((Z, i) => (
            <AvenueTree key={`tl${i}`} X={L_X + 0.6} Z={Z} h={11} crown={0.85} lean={0.05} seed={60 + i} {...LEAF} />
          ))}
          {[28].map((Z, i) => (
            <AvenueTree key={`tr${i}`} X={R_X - 0.4} Z={Z} h={11.5} crown={0.85} lean={-0.05} seed={64 + i} {...LEAF} />
          ))}
          <Facades X={L_X} segs={LEFT.filter((g) => g.z0 < METRO_Z)} seed={13} />
          <Facades X={R_X} segs={RIGHT.filter((g) => g.z0 < METRO_Z && g.z0 > 9)} seed={14} />
          <Lamp {...roadPoint(road, FP + 0.3, 30)} h={8} arm="left" lit />
          <Lamp {...roadPoint(road, -(FP + 0.3), 22)} h={8} arm="right" lit />
          <Lamp {...roadPoint(road, -(FP + 0.3), 33)} h={8} arm="right" lit />
          <Person {...roadPoint(road, -(FP - 0.8), 19)} variant="woman" seed={84} colors={['#e7b958', '#e7b958']} />
          <Person {...roadPoint(road, -(FP - 1.3), 19.6)} variant="man" seed={85} colors={['#3a5a7a', '#3b3a44']} />
          <Person {...roadPoint(road, FP - 1.0, 26)} variant="man" seed={86} flip colors={['#f2e6cf', '#3b3a44']} />
          <Person {...roadPoint(road, FP - 1.6, 31)} variant="woman" seed={87} colors={['#7a2f4a', '#7a2f4a']} />
          <Person {...roadPoint(road, -(FP - 1.0), 30)} variant="kid" seed={88} flip />
          <Signs />
        </g>
      ),
    },
    {
      id: 'near',
      band: 'front',
      depth: 0.85,
      render: () => (
        <g>
          <Facades X={R_X} segs={RIGHT.filter((g) => g.z0 < 9)} seed={15} />
          <LowWall X={L_X + 0.2} z0={2.2} z1={13} />
          <Bougainvillea {...roadPoint(road, L_X + 0.4, 9)} y={roadPoint(road, L_X + 0.4, 9).y - 1.15 * roadPoint(road, L_X + 0.4, 9).s} w={2.4} h={1.1} color={shade(PAL.bougainvillea, -0.15)} seed={21} />
          <CafeSeating />
          <Lamp {...roadPoint(road, FP + 0.3, 11.2)} h={8} arm="left" lit />
          <AvenueTree X={R_X + 0.6} Z={9} h={13} crown={0.75} lean={0.6} seed={68} {...LEAF} />
        </g>
      ),
    },
  ],
}

export default indiranagar
