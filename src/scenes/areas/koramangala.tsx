import type { ReactNode } from 'react'
import type { SceneDef } from '../types'
import { ROAD_DEFAULT, F, type RoadStyle } from '../world'
import { Ground, RoadSurface, Person, Bougainvillea } from '../kit'
import {
  SkyStops,
  Glow,
  Wisps,
  CanopyBelt,
  RainTreeLite,
  RoundTreeLite,
  StreetBlock,
  GroundStreaks,
  GroundPools,
  Sitter,
  CafeTable,
  BulbString,
  TextAlong,
  Scooter,
  ShrubsAlong,
  planeAlong,
  stripAlong,
  ribbon,
  faceAt,
  rp,
  mix,
  shade,
  f1,
} from './_south-helpers'

/**
 * Koramangala, golden hour: a leafy 5th Block café lane. Rain trees arch over the lane and it bends gently
 * right towards a low sun glowing at its end. On the sunlit left a single-storey café with a timber pergola
 * and outdoor tables; on the right, an office in a converted house behind its compound wall, scooters at the
 * kerb, a big rain tree framing the corner. Long warm light streaks run down the road towards the sun.
 */
const road: RoadStyle = {
  ...ROAD_DEFAULT,
  halfWidth: 3.1,
  bend: 2.0,
  bendStart: 22,
  asphalt: '#4a403a',
  asphaltFar: '#d2a678',
  center: 'none',
  kerb: 'bw',
  footpath: 2.1,
  footpathColor: '#c09f80',
  verge: '#7a7244',
}

const SUN = { x: 935, y: 486 }
const LEAF = { leaf: '#5a683b', dark: '#323d27', light: '#d9b867', trunk: '#4a372a' }
const LEAF_FAR = { leaf: '#9a9156', dark: '#7b7650', light: '#f7d898', trunk: '#7a6248' }

type Item = { Z: number; el: ReactNode }
const byDepth = (items: Item[]) => items.sort((a, b) => b.Z - a.Z).map((i, k) => <g key={k}>{i.el}</g>)

/** tree colours fading into the backlit haze with distance */
function leafAt(Z: number) {
  const t = Math.max(0, Math.min(1, (Z - 14) / 50))
  return {
    leaf: mix(LEAF.leaf, LEAF_FAR.leaf, t),
    dark: mix(LEAF.dark, LEAF_FAR.dark, t),
    light: mix(LEAF.light, LEAF_FAR.light, t),
    trunk: mix(LEAF.trunk, LEAF_FAR.trunk, t),
  }
}

/* ------------------------------------------------------------------ the café (left, sunlit) */

const CX = -10.4 // café facade line
const CZ0 = 4.2
const CZ1 = 17

function Cafe() {
  const wall = '#b9654a'
  const els: ReactNode[] = []
  els.push(<path key="fc" d={stripAlong(road, -5.4, CX, CZ0, CZ1 + 0.6)} fill="#caa47e" />)
  els.push(<path key="fcs" d={stripAlong(road, -5.4, -6.4, CZ0, CZ1 + 0.6)} fill="#a98564" opacity="0.5" />)
  // facade and its glowing glass front
  els.push(<path key="f" d={planeAlong(road, CX, CZ0, CZ1, 0, 4.75)} fill={wall} />)
  // brick coursing hint
  let brick = ''
  for (let y = 0.4; y < 4.5; y += 0.32) brick += planeAlong(road, CX + 0.005, CZ0, CZ1, y, y + 0.04)
  els.push(<path key="br" d={brick} fill="#9c4f39" opacity="0.45" />)
  els.push(<path key="g" d={planeAlong(road, CX, CZ0 + 0.9, CZ1 - 0.9, 0.25, 2.75)} fill="#ffcf86" />)
  els.push(<path key="gi" d={planeAlong(road, CX, CZ0 + 0.9, CZ1 - 0.9, 0.25, 1.05)} fill="#b8763d" opacity="0.5" />)
  els.push(<path key="gl" d={planeAlong(road, CX, CZ0 + 0.9, CZ1 - 0.9, 2.1, 2.4)} fill="#fff0c8" opacity="0.55" />)
  let mull = ''
  for (let z = CZ0 + 0.9; z <= CZ1 - 0.8; z += 2.05) mull += planeAlong(road, CX + 0.01, z, z + 0.12, 0.25, 2.75)
  els.push(<path key="m" d={mull} fill="#5e3f2b" />)
  // sloping Mangalore-tile sunshade over the glass, then the parapet
  els.push(<path key="ts" d={ribbon(road, [CX, 3.35], [CX + 1.1, 2.95], CZ0 + 0.2, CZ1 - 0.2)} fill="#5e4a3c" />)
  els.push(<path key="pp" d={planeAlong(road, CX, CZ0, CZ1, 4.55, 4.75)} fill="#e9d4b4" />)
  els.push(<path key="sb" d={planeAlong(road, CX + 0.01, 9.0, 14.2, 3.86, 4.42)} fill="#344a3b" />)
  els.push(<TextAlong key="t" road={road} X={CX + 0.02} Za={9.0} Zb={14.2} Y0={3.9} Y1={4.38} text="CAFÉ & BAKES" color="#f6e3bf" size={0.7} />)
  // pendant lamps glowing inside
  let pend = ''
  for (const z of [6.4, 8.5, 10.6, 12.7, 14.8]) {
    const a = rp(road, CX + 0.4, 2.35, z)
    pend += `M${f1(a.x - (0.18 * F) / z)} ${f1(a.y)}h${f1((0.36 * F) / z)}l${f1((-0.08 * F) / z)} ${f1((-0.16 * F) / z)}h${f1((-0.2 * F) / z)}Z`
  }
  els.push(<path key="pd" d={pend} fill="#fff1c6" />)
  // end face (towards camera, in shade)
  els.push(<path key="e" d={faceAt(road, CX - 9, CX, CZ0, 0, 4.75)} fill={shade(wall, -0.28)} />)
  // pergola over the forecourt: fascia beam, cross beams and posts
  let beams = ''
  for (let z = CZ0 + 0.5; z <= CZ1; z += 1.35) beams += ribbon(road, [CX + 1.1, 3.0], [-6.1, 2.95], z, z + 0.14)
  els.push(<path key="bm" d={beams} fill="#6b4329" />)
  els.push(<path key="bf" d={planeAlong(road, -6.1, CZ0 + 0.3, CZ1, 2.78, 3.0)} fill="#74492c" />)
  let posts = ''
  for (const z of [CZ0 + 0.5, 8.6, 12.8, CZ1 - 0.1]) {
    const a = rp(road, -6.1, 2.95, z)
    const b = rp(road, -6.1, 0, z)
    const s = F / z
    posts += `M${f1(a.x - 0.07 * s)} ${f1(a.y)}h${f1(0.14 * s)}V${f1(b.y)}h${f1(-0.14 * s)}Z`
  }
  els.push(<path key="po" d={posts} fill="#5a3820" />)
  // a creeper softening the pergola's front edge
  els.push(<ShrubsAlong key="cr" road={road} X={-6.15} Z0={CZ0 + 1} Z1={CZ1} h={0.35} step={0.9} seed={44} color="#4f6a35" light="#b7bf6a" />)
  return <g>{els}</g>
}

function CafeLife() {
  const items: Item[] = []
  const tables: [number, number][] = [
    [-8.0, 6.6],
    [-8.3, 10.2],
    [-8.0, 13.9],
  ]
  const shirts = ['#b93432', '#f2e6cf', '#3a5a7a', '#e7b958', '#2f5d4a', '#c96b3a']
  const skins = ['#8d5a3b', '#a56b45', '#7a4b31', '#b07a52']
  tables.forEach(([X, Z], i) => {
    const t = rp(road, X, 0, Z)
    items.push({ Z, el: <CafeTable x={t.x} y={t.y} s={F / Z} /> })
    const a = rp(road, X - 0.7, 0, Z + 0.2)
    items.push({ Z: Z + 0.2, el: <Sitter x={a.x} y={a.y} s={F / (Z + 0.2)} shirt={shirts[i * 2]} skin={skins[i]} /> })
    if (i !== 1) {
      const b = rp(road, X + 0.7, 0, Z - 0.2)
      items.push({ Z: Z - 0.2, el: <Sitter x={b.x} y={b.y} s={F / (Z - 0.2)} shirt={shirts[i * 2 + 1]} flip skin={skins[(i + 2) % 4]} /> })
    }
  })
  const w = rp(road, -9.2, 0, 11.8)
  items.push({ Z: 11.8, el: <Person x={w.x} y={w.y} s={F / 11.8} variant="man" colors={['#f4ece0', '#2b2a33']} seed={8} /> })
  // planters along the footpath edge of the forecourt
  items.push({ Z: CZ0, el: <path d={planeAlong(road, -5.5, CZ0 + 0.3, CZ1 + 0.4, 0, 0.5)} fill="#8a5f42" /> })
  items.push({ Z: CZ0 - 0.1, el: <ShrubsAlong road={road} X={-5.5} Z0={CZ0 + 0.4} Z1={CZ1 + 0.4} h={0.36} step={0.8} seed={12} color="#4b6534" light="#b7bf6a" flowers="#e9a23b" /> })
  // two friends chatting at the forecourt entrance
  const p1 = rp(road, -4.7, 0, 5.4)
  const p2 = rp(road, -4.3, 0, 5.0)
  items.push({ Z: 5.4, el: <Person x={p1.x} y={p1.y} s={F / 5.4} variant="woman" colors={['#e7b958', '#7a2f4a']} seed={14} flip /> })
  items.push({ Z: 5.0, el: <Person x={p2.x} y={p2.y} s={F / 5.0} variant="man" colors={['#2f5d4a', '#3b3a44']} seed={15} /> })
  const l0 = rp(road, CX + 1.0, 2.95, CZ0 + 0.6)
  const l1 = rp(road, -6.2, 2.9, CZ1 - 0.3)
  return (
    <g>
      {byDepth(items)}
      <BulbString x1={l0.x} y1={l0.y} x2={l1.x} y2={l1.y} sag={16} r={2.1} n={22} />
    </g>
  )
}

/* ------------------------------------------------------------------ scene */

const koramangala: SceneDef = {
  id: 'koramangala',
  title: 'Koramangala',
  road,
  layers: [
    {
      id: 'sky',
      band: 'back',
      depth: 0,
      static: true,
      render: () => (
        <g>
          <SkyStops
            stops={[
              [0, '#e9a483'],
              [0.3, '#f2bc90'],
              [0.6, '#f9d4a0'],
              [0.84, '#fde4b4'],
              [1, '#fff0cc'],
            ]}
            sun={{ x: SUN.x, y: SUN.y, r: 24, glow: 13, halo: '#fff0c4', haloOpacity: 0.95 }}
          />
          <Wisps
            seed={7}
            items={[
              [250, 128, 360],
              [600, 74, 240],
              [1310, 120, 320],
              [1520, 228, 200],
            ]}
            color="#fff3df"
            under="#efb08a"
            opacity={0.55}
          />
        </g>
      ),
    },
    {
      id: 'far',
      band: 'back',
      depth: 0.1,
      render: () => (
        <g>
          <CanopyBelt x0={-100} x1={1700} y={566} h={30} seed={4} color="#b49e6c" light="#f6d896" lightOpacity={0.5} />
          {/* the end of the lane: low rooftops and trees dissolving into the backlight */}
          <path d={`M640 566 L640 548 L700 548 L700 540 L760 540 L760 552 L812 552 L812 536 L868 536 L868 546 L1010 546 L1010 534 L1080 534 L1080 552 L1160 552 L1160 566 Z`} fill="#d3ac80" />
          <CanopyBelt x0={560} x1={1240} y={560} h={48} seed={9} color="#b8a06c" light="#fbe0a2" lightOpacity={0.55} />
          <Glow x={SUN.x} y={SUN.y + 40} rx={460} ry={130} color="#ffe6ae" opacity={0.6} />
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
          <Ground color="#5f5a38" far="#cfac7c" />
          <RoadSurface road={road} />
          {/* canopy shade on the road, broken by long streaks of sun running towards the light */}
          <GroundStreaks
            sunX={SUN.x}
            color="#ffd38a"
            opacity={0.2}
            items={[
              { X0: -4.6, w: 0.6, z0: 3.0, z1: 14 },
              { X0: -2.4, w: 0.35, z0: 4.2, z1: 19 },
              { X0: 1.6, w: 0.45, z0: 3.4, z1: 15 },
              { X0: -8.6, w: 1.0, z0: 3.4, z1: 12 },
            ]}
          />
          <GroundPools
            road={road}
            color="#ffd895"
            opacity={0.3}
            items={[
              [-1.8, 9, 0.9, 1.6],
              [1.9, 12.5, 0.7, 1.8],
              [-0.6, 17, 1.1, 1.5],
              [2.2, 22, 0.9, 2],
              [-2.4, 27, 1.2, 1.6],
              [-7.2, 19, 0.8, 1.5],
            ]}
          />
          <Glow x={rp(road, -7.8, 0, 6.5).x} y={rp(road, -7.8, 0, 6.5).y} rx={260} ry={60} color="#ffc56e" opacity={0.35} />
        </g>
      ),
    },
    {
      id: 'lane',
      band: 'front',
      depth: 0.5,
      render: () => {
        const items: Item[] = []
        // left, beyond the café: offices in converted houses catching the side light
        items.push({ Z: 19, el: <StreetBlock road={road} side={-1} X={9.6} Z0={19} Z1={31} h={10} depth={11} wall="#f2ddc0" end="#d4b18c" floorH={3.3} winEvery={3.0} winW={1.6} winH={1.5} lit={0.25} litColor="#ffd88f" ground="glass" glow="#ffc77a" parapet="#e0c29d" chajja tanks={[22, 27]} seed={3} /> })
        items.push({ Z: 33, el: <StreetBlock road={road} side={-1} X={9.4} Z0={33} Z1={48} h={12.8} depth={12} wall="#efd2ac" end="#cfa983" floorH={3.2} lit={0.2} ground="shops" parapet="#d7b690" chajja tanks={[37]} seed={8} shops={[{ z0: 34, z1: 40, glow: '#ffcf86' }, { z0: 41, z1: 47, shutter: true }]} /> })
        items.push({ Z: 50, el: <StreetBlock road={road} side={-1} X={9} Z0={50} Z1={80} h={9.4} depth={10} wall="#efd6b2" end="#d8b48c" lit={0.1} parapet="#dcbd96" seed={13} /> })
        // right, beyond the near house: more converted houses in warm shade
        items.push({ Z: 23, el: <StreetBlock road={road} side={1} X={9.2} Z0={23} Z1={37} h={10.4} depth={11} wall="#b48b6c" end="#c99c76" floorH={3.3} lit={0.35} litColor="#ffcf86" ground="glass" glow="#f6b366" parapet="#a27c5f" chajja tanks={[27, 32]} seed={21} /> })
        items.push({ Z: 39, el: <StreetBlock road={road} side={1} X={8.8} Z0={39} Z1={56} h={12} depth={10} wall="#bd987a" end="#d3a983" lit={0.3} litColor="#ffcf86" ground="glass" glow="#f8bd75" parapet="#ab8667" chajja seed={22} /> })
        items.push({ Z: 58, el: <StreetBlock road={road} side={1} X={8.6} Z0={58} Z1={85} h={9.6} depth={10} wall="#c7a586" end="#dcb38c" lit={0.2} parapet="#b8967a" seed={23} /> })
        items.push({ Z: 22.5, el: <path d={planeAlong(road, 5.6, 22.5, 37, 0, 1.4)} fill="#c4a283" /> })
        items.push({ Z: 22.4, el: <path d={planeAlong(road, 5.6, 22.5, 37, 1.3, 1.45)} fill="#9a7a60" /> })
        // the rain-tree arch over the lane
        const trees: [number, number, number, number, number][] = [
          // X, Z, h, seed, lean
          [-5.6, 22, 12.5, 31, 0.55],
          [5.5, 25, 13.5, 33, -0.6],
          [-5.6, 31, 12.5, 32, 0.6],
          [5.5, 37, 13, 35, -0.6],
          [-5.5, 45, 12, 34, 0.6],
          [5.4, 52, 12.5, 37, -0.6],
          [-5.4, 62, 11.5, 36, 0.5],
          [5.3, 74, 11, 38, -0.5],
        ]
        for (const [X, Z, h, seed, lean] of trees) {
          const p = rp(road, X, 0, Z)
          items.push({ Z: Z - 0.5, el: <RainTreeLite x={p.x} y={p.y} s={F / Z} h={h} seed={seed} spread={1.1} lean={lean} colors={leafAt(Z)} sunSide={p.x < SUN.x ? 1 : -1} hiOpacity={0.8} /> })
        }
        // a few people further down the lane
        const walkers: [number, number, number, ('man' | 'woman' | 'kid')?][] = [
          [-4.5, 23, 5, 'woman'],
          [-4.15, 23.5, 6, 'man'],
          [4.4, 29, 7],
          [-4.6, 40, 9],
          [4.3, 46, 11, 'woman'],
        ]
        for (const [X, Z, seed, v] of walkers) {
          const p = rp(road, X, 0, Z)
          items.push({ Z, el: <Person x={p.x} y={p.y} s={F / Z} seed={seed} variant={v} flip={seed % 2 === 0} /> })
        }
        const sc = rp(road, 3.95, 0, 27)
        items.push({ Z: 27, el: <Scooter x={sc.x} y={sc.y} s={F / 27} color="#3a6f8f" dir={-1} /> })
        const rt = rp(road, -14, 0, 21)
        items.push({ Z: 21, el: <RoundTreeLite x={rt.x} y={rt.y} s={F / 21} h={9} seed={41} colors={{ leaf: '#7a8048', dark: '#4a512f', light: '#f2cf7a' }} /> })
        return (
          <g>
            {byDepth(items)}
          </g>
        )
      },
    },
    {
      id: 'house',
      band: 'front',
      depth: 0.75,
      render: () => {
        // office in a converted two-storey house, behind its compound wall (right, in warm shade)
        const X = 10.2
        const Z0 = 6.5
        const Z1 = 20.5
        const wall = '#d2a283'
        const ws = 5.6
        const gate0 = 12.2
        const gate1 = 14.6
        const gp = (z: number, y: number) => rp(road, ws, y, z)
        const sg = rp(road, 6.0, 0, 9.4)
        const scooters: [number, number, string][] = [
          [4.0, 17.5, '#e2b21f'],
          [4.0, 15.6, '#a3402e'],
          [4.05, 7.4, '#c9452e'],
        ]
        const bougie = gp(gate1 + 1.5, 1.5)
        return (
          <g>
            <StreetBlock road={road} side={1} X={X} Z0={Z0} Z1={Z1} h={7.4} depth={12} wall={wall} end="#d2a57c" floorH={3.4} firstFloor={0} winEvery={3.3} winW={1.6} winH={1.5} lit={0.6} litColor="#ffd38f" winColor="#8a6656" parapet="#a07a5b" chajja endWindows seed={41} />
            {/* tiled sunshade over the ground floor and a first-floor balcony with a railing */}
            <path d={ribbon(road, [X, 3.3], [X - 1.0, 2.8], Z0 + 0.3, Z1 - 0.3)} fill="#a9553a" />
            <path d={ribbon(road, [X, 3.55], [X - 1.3, 3.55], 9.5, 16.5)} fill="#9c765c" />
            <path d={planeAlong(road, X - 1.3, 9.5, 16.5, 3.55, 4.55)} fill="#e8d5b8" opacity="0.85" />
            <path d={planeAlong(road, X - 1.3, 9.5, 16.5, 3.65, 4.45)} fill="#a07a5b" opacity="0.5" />
            {/* the compound wall with a gate opening */}
            <path d={planeAlong(road, ws, Z0, gate0, 0, 1.5) + planeAlong(road, ws, gate1, Z1 + 1.5, 0, 1.5)} fill="#d2ad8a" />
            <path d={planeAlong(road, ws, Z0, gate0, 1.4, 1.58) + planeAlong(road, ws, gate1, Z1 + 1.5, 1.4, 1.58)} fill="#93715a" />
            <path d={planeAlong(road, ws, gate0 - 0.35, gate0, 0, 1.95) + planeAlong(road, ws, gate1, gate1 + 0.35, 0, 1.95)} fill="#a8846a" />
            <path d={stripAlong(road, ws, X, gate0, gate1)} fill="#b9977a" />
            <Bougainvillea x={bougie.x} y={bougie.y + 2} s={F / (gate1 + 1.5)} w={3.2} h={1.6} seed={6} />
            {/* a small generic signboard on two posts by the gate */}
            <g>
              <rect x={sg.x - 0.04 * (F / 9.4)} y={sg.y - 1.7 * (F / 9.4)} width={0.08 * (F / 9.4)} height={1.7 * (F / 9.4)} fill="#4a3a30" />
              <rect x={sg.x - 0.9 * (F / 9.4)} y={sg.y - 2.35 * (F / 9.4)} width={1.8 * (F / 9.4)} height={0.7 * (F / 9.4)} rx={2} fill="#344a3b" />
              <rect x={sg.x - 0.45 * (F / 9.4)} y={sg.y - 2.04 * (F / 9.4)} width={0.9 * (F / 9.4)} height={0.08 * (F / 9.4)} rx={1} fill="#fff6e8" opacity="0.6" />
            </g>
            {scooters.map(([sx, sz, c], i) => {
              const p = rp(road, sx, 0, sz)
              return <Scooter key={i} x={p.x} y={p.y} s={F / sz} color={c} dir={-1} />
            })}
          </g>
        )
      },
    },
    {
      id: 'cafe',
      band: 'front',
      depth: 0.8,
      render: () => (
        <g>
          <Cafe />
          <CafeLife />
        </g>
      ),
    },
    {
      id: 'near',
      band: 'front',
      depth: 0.9,
      render: () => {
        const t = rp(road, 10.8, 0, 8.4)
        const t2 = rp(road, -6.6, 0, 16.5)
        return (
          <g>
            <RainTreeLite x={t2.x} y={t2.y} s={F / 16.5} h={12} seed={29} spread={0.95} lean={0.45} colors={leafAt(16)} hiOpacity={0.6} />
            <RainTreeLite x={t.x} y={t.y} s={F / 8.4} h={12.5} seed={27} spread={0.85} lean={0.1} colors={LEAF} sunSide={-1} hiOpacity={0.5} />
          </g>
        )
      },
    },
  ],
}

export default koramangala
