import type { ReactNode } from 'react'
import type { SceneDef } from '../types'
import { ROAD_DEFAULT, F, proj, rng, type RoadStyle } from '../world'
import { Ground, RoadSurface, Person, Lamp, Bougainvillea } from '../kit'
import {
  SkyStops,
  CanopyBelt,
  RainTreeLite,
  RoundTreeLite,
  StreetBlock,
  ViaductPath,
  RailingAlong,
  ShrubsAlong,
  Glow,
  LightDots,
  groundPoly,
  planeAlong,
  stripAlong,
  rp,
  f1,
} from './_south-helpers'

/**
 * South Bengaluru, blue hour: a leafy JP Nagar street with lit homes on the right, Puttenahalli lake opening
 * on the left with a lakeside railing, and ahead the Ragigudda hill: a granite boulder hillock with its small
 * white temple lit up on top. The Green Line viaduct crosses in the middle distance with a lit train.
 */
const road: RoadStyle = {
  ...ROAD_DEFAULT,
  halfWidth: 3.4,
  asphalt: '#3c3a44',
  asphaltFar: '#8c7f8c',
  center: 'dashed',
  centerColor: '#e6e0d6',
  kerb: 'bw',
  footpath: 1.8,
  footpathColor: '#9c8f93',
  verge: '#4b5240',
}

type Item = { Z: number; el: ReactNode }
const byDepth = (items: Item[]) => items.sort((a, b) => b.Z - a.Z).map((i, k) => <g key={k}>{i.el}</g>)

const LEAF = { leaf: '#3f4b3c', dark: '#262e28', light: '#8c8a8a', trunk: '#2f2a2b' }

/** Ragigudda: a cluster of granite boulders with a small white temple on top, lit for the evening */
function HillTemple() {
  const Z = 112
  const s = F / Z
  const base = proj(-44, 0, Z)
  const boulders: [number, number, number, number][] = [
    // dx (m), dy (m above ground of centre), rx, ry
    [-40, 6, 26, 9],
    [-14, 10, 24, 13],
    [12, 9, 26, 12],
    [36, 5, 22, 8],
    [-2, 18, 16, 9],
    [16, 16, 12, 7],
  ]
  let rock = ''
  let rockHi = ''
  for (const [dx, dy, rx, ry] of boulders) {
    const cx = base.x + dx * s
    const cy = base.y - dy * s
    rock += `M${f1(cx - rx * s)} ${f1(cy)}a${f1(rx * s)} ${f1(ry * s)} 0 1 0 ${f1(rx * 2 * s)} 0a${f1(rx * s)} ${f1(ry * s)} 0 1 0 ${f1(-rx * 2 * s)} 0`
    rockHi += `M${f1(cx - rx * s * 0.2)} ${f1(cy - ry * s * 0.55)}a${f1(rx * s * 0.55)} ${f1(ry * s * 0.35)} 0 1 0 ${f1(rx * 1.1 * s)} 0a${f1(rx * s * 0.55)} ${f1(ry * s * 0.35)} 0 1 0 ${f1(-rx * 1.1 * s)} 0`
  }
  // temple on the summit
  const tx = base.x + 4 * s
  const ty = base.y - 26 * s
  const k = 1.45
  const w = 10 * s * k
  const h = 5 * s * k
  const tower = `M${f1(tx - 2.6 * s * k)} ${f1(ty - h)} L${f1(tx - 1.6 * s * k)} ${f1(ty - h - 5.5 * s * k)} L${f1(tx + 1.6 * s * k)} ${f1(ty - h - 5.5 * s * k)} L${f1(tx + 2.6 * s * k)} ${f1(ty - h)} Z`
  const r = rng(5)
  let lights = ''
  for (let i = 0; i < 18; i++) {
    const t = i / 17
    lights += `M${f1(tx - w / 2 + t * w)} ${f1(ty - h - 0.3 * s)}m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0`
  }
  for (let i = 0; i < 8; i++) {
    const t = i / 7
    lights += `M${f1(tx - (2.6 - t) * s * k)} ${f1(ty - h - t * 5.5 * s * k)}m-0.9 0a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0`
    lights += `M${f1(tx + (2.6 - t) * s * k)} ${f1(ty - h - t * 5.5 * s * k)}m-0.9 0a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0`
  }
  void r
  return (
    <g>
      <Glow x={tx} y={ty - h} rx={70} ry={40} color="#ffd38a" opacity={0.35} />
      <path d={rock} fill="#5e5560" />
      <path d={rockHi} fill="#857683" opacity="0.6" />
      {/* steps up the rock */}
      <path d={`M${f1(base.x - 6 * s)} ${f1(base.y)} L${f1(tx - 1 * s)} ${f1(ty)} L${f1(tx + 1 * s)} ${f1(ty)} L${f1(base.x - 3 * s)} ${f1(base.y)} Z`} fill="#9a8c94" opacity="0.6" />
      <rect x={tx - w / 2} y={ty - h} width={w} height={h} fill="#f3ede6" />
      <rect x={tx - w / 2} y={ty - h} width={w} height={h * 0.18} fill="#c9a24a" />
      <rect x={tx - 1.4 * s} y={ty - h * 0.65} width={2.8 * s} height={h * 0.65} fill="#ffcf7a" />
      <path d={tower} fill="#f3ede6" />
      <path d={`M${f1(tx - 0.7 * s)} ${f1(ty - h - 5.5 * s * k)} L${f1(tx)} ${f1(ty - h - 7.6 * s * k)} L${f1(tx + 0.7 * s)} ${f1(ty - h - 5.5 * s * k)} Z`} fill="#c9a24a" />
      <path d={lights} fill="#ffe2a0" />
      {/* trees around the foot of the hill */}
      <CanopyBelt x0={base.x - 70 * s} x1={base.x + 60 * s} y={base.y + 1} h={7 * s} seed={61} color="#2f3a33" light="#4e5650" lightOpacity={0.5} />
    </g>
  )
}

const scene: SceneDef = {
  id: 'south',
  title: 'South Bengaluru',
  road,
  layers: [
    {
      id: 'sky',
      band: 'back',
      depth: 0,
      static: true,
      render: () => {
        const r = rng(11)
        let stars = ''
        for (let i = 0; i < 46; i++) {
          const x = -100 + r() * 1800
          const y = -150 + r() * 380
          const rr = 0.6 + r() * 1.1
          stars += `M${f1(x - rr)} ${f1(y)}a${f1(rr)} ${f1(rr)} 0 1 0 ${f1(rr * 2)} 0a${f1(rr)} ${f1(rr)} 0 1 0 ${f1(-rr * 2)} 0`
        }
        return (
          <g>
            <SkyStops
              stops={[
                [0, '#28335c'],
                [0.36, '#4d5384'],
                [0.66, '#a1809a'],
                [0.86, '#dba68f'],
                [1, '#efc29a'],
              ]}
            />
            <path d={stars} fill="#fff6e0" opacity="0.75" />
          </g>
        )
      },
    },
    {
      id: 'far',
      band: 'back',
      depth: 0.1,
      render: () => (
        <g>
          <CanopyBelt x0={-100} x1={1700} y={566} h={22} seed={41} color="#3d4540" light="#6b6670" lightOpacity={0.4} />
          <LightDots seed={21} n={30} x0={-100} x1={1700} y0={540} y1={560} r={1.3} color="#ffd690" opacity={0.8} />
        </g>
      ),
    },
    {
      id: 'metro',
      band: 'back',
      depth: 0.16,
      render: () => (
        <g>
          <ViaductPath
            pts={[
              [-260, 190],
              [-80, 172],
              [40, 164],
              [260, 158],
            ]}
            deckY={11}
            color="#9a8f9c"
            under="#4f4955"
            pierEvery={32}
            train={{ t0: 0.3, t1: 0.56, livery: '#2f8a4c', body: '#bdb6bf', windows: '#ffe0a0' }}
          />
        </g>
      ),
    },
    {
      id: 'hill',
      band: 'back',
      depth: 0.22,
      render: () => <HillTemple />,
    },
    {
      id: 'ground',
      band: 'back',
      depth: 1,
      static: true,
      render: () => (
        <g>
          <Ground color="#3f453a" far="#7c7380" />
          {/* Puttenahalli lake on the left, holding the last of the sky */}
          <path d={groundPoly([[-11, 14], [-11, 120], [-140, 140], [-140, 14]])} fill="#a98ea0" />
          <path d={groundPoly([[-14, 30], [-14, 110], [-120, 120], [-120, 30]])} fill="#d1a798" opacity="0.45" />
          <path d={groundPoly([[-11, 3], [-11, 14], [-60, 14], [-60, 3]])} fill="#4a5340" />
          <path d={groundPoly([[-40, 40], [-46, 40], [-45, 108], [-41, 108]])} fill="#ffd690" opacity="0.2" />
          <RoadSurface road={road} />
        </g>
      ),
    },
    {
      id: 'street',
      band: 'front',
      depth: 0.6,
      render: () => {
        const items: Item[] = []
        // homes on the right, lights coming on
        items.push({ Z: 120, el: <StreetBlock road={road} side={1} X={8.2} Z0={8} Z1={19} h={7.4} depth={4} wall="#a99398" end="#8d7a82" floorH={3.3} firstFloor={0} winEvery={3.0} winW={1.3} lit={0.65} litColor="#ffd690" winColor="#4d4652" chajja parapet="#7f6c75" tanks={[11, 16]} endWindows seed={91} /> })
        items.push({ Z: 121, el: <StreetBlock road={road} side={1} X={8.4} Z0={20} Z1={34} h={10.2} depth={11} wall="#9f8b93" end="#86727c" floorH={3.3} firstFloor={0} winEvery={3.0} winW={1.3} lit={0.55} litColor="#ffd690" winColor="#4a4450" chajja parapet="#7a6872" tanks={[24, 30]} seed={92} /> })
        items.push({ Z: 122, el: <StreetBlock road={road} side={1} X={8.6} Z0={35} Z1={52} h={9} depth={11} wall="#978590" end="#7e6c78" floorH={3.3} firstFloor={0} lit={0.5} litColor="#ffd690" winColor="#47414d" parapet="#766570" seed={93} /> })
        items.push({ Z: 110, el: <path d={planeAlong(road, 5.6, 4, 52, 0, 1.4)} fill="#857680" /> })
        items.push({ Z: 109, el: <path d={planeAlong(road, 5.6, 4, 52, 1.32, 1.48)} fill="#5f5560" /> })
        const bg = rp(road, 5.7, 1.4, 13)
        items.push({ Z: 108, el: <Bougainvillea x={bg.x} y={bg.y + 3} s={F / 13} w={2.6} h={1.4} seed={4} color="#b84a78" /> })
        // avenue trees on both footpaths
        const trees: [number, number, number, number, number][] = [
          [5.0, 19, 12, 21, -0.35],
          [5.0, 33, 12.5, 22, -0.4],
          [5.0, 48, 12, 23, -0.35],
          [5.0, 64, 11, 24, -0.3],
        ]
        for (const [X, Z, h, seed, lean] of trees) {
          const p = rp(road, X, 0, Z)
          items.push({ Z, el: <RainTreeLite x={p.x} y={p.y} s={F / Z} h={h} seed={seed} spread={0.95} lean={lean} colors={LEAF} sunSide={-1} hiOpacity={0.35} /> })
        }
        // lakeside walk: railing and a low hedge on the left
        items.push({ Z: 3, el: <RailingAlong road={road} X={-8.4} Z0={6} Z1={60} step={2} h={1.1} color="#2a2c33" /> })
        items.push({ Z: 3.2, el: <ShrubsAlong road={road} X={-9.6} Z0={9} Z1={60} h={0.6} step={1.6} seed={27} color="#2f3a2e" light="#5b6158" /> })
        // lamps, lit
        for (const Z of [21, 38]) {
          const p = rp(road, -4.5, 0, Z)
          items.push({ Z: 2.9 - Z * 0.01, el: <Lamp x={p.x} y={p.y} s={F / Z} h={7.5} arm="right" lit /> })
        }
        // evening walkers by the lake
        const walkers: [number, number, number, ('man' | 'woman' | 'kid')?][] = [
          [-6.6, 14, 51, 'woman'],
          [-6.2, 14.5, 52, 'man'],
          [-6.8, 27, 53],
          [6.6, 17, 54, 'man'],
        ]
        for (const [X, Z, seed, v] of walkers) {
          const p = rp(road, X, 0, Z)
          items.push({ Z: Z - 0.4, el: <Person x={p.x} y={p.y} s={F / Z} seed={seed} variant={v} flip={X > 0} /> })
        }
        const rt = rp(road, -14, 0, 18)
        items.push({ Z: 18, el: <RoundTreeLite x={rt.x} y={rt.y} s={F / 18} h={7} seed={66} colors={LEAF} /> })
        return <g>{byDepth(items)}</g>
      },
    },
    {
      id: 'glow',
      band: 'front',
      depth: 0.85,
      render: () => (
        <g>
          <path d={stripAlong(road, -5.2, -3.6, 4, 40)} fill="#ffd690" opacity="0.08" />
        </g>
      ),
    },
  ],
}

export default scene
