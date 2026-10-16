import type { ReactNode } from 'react'
import type { SceneDef } from '../types'
import { ROAD_DEFAULT, F, type RoadStyle } from '../world'
import { Ground, RoadSurface, Person, PandalGate, Bougainvillea, Lamp, Marigolds } from '../kit'
import {
  SkyStops,
  Wisps,
  CanopyBelt,
  RainTreeLite,
  RoundTreeLite,
  StreetBlock,
  RailingAlong,
  ShrubsAlong,
  ClothFenceAt,
  Glow,
  GroundStreaks,
  planeAlong,
  stripAlong,
  faceAt,
  rp,
  shade,
} from './_south-helpers'

/**
 * HSR Layout, late afternoon: a calm sector street of two- and three-storey homes with black water tanks,
 * a park behind green railings on the right, and the street ending at the neighbourhood Pujo ground:
 * a cloth-wrapped gate with a curved chala roof, marigold strings, a dhaki at the entrance and families
 * walking in. Shamiana roofs rise behind the white-and-red cloth fence.
 */
const road: RoadStyle = {
  ...ROAD_DEFAULT,
  halfWidth: 3.6,
  asphalt: '#524a45',
  asphaltFar: '#a99584',
  center: 'dashed',
  kerb: 'bw',
  footpath: 1.9,
  footpathColor: '#c4ae94',
  verge: '#72794a',
}

export const GATE_Z = 27
const FENCE_Z = 27.6
const SUN = { x: 1360, y: 300 }
type Item = { Z: number; el: ReactNode }
const byDepth = (items: Item[]) => items.sort((a, b) => b.Z - a.Z).map((i, k) => <g key={k}>{i.el}</g>)

/** striped shamiana roof seen end-on: a low gable with alternating cloth panels */
function Shamiana({ X0, X1, Z, h, ridge }: { X0: number; X1: number; Z: number; h: number; ridge: number }) {
  const a = rp(road, X0, h, Z)
  const b = rp(road, X1, h, Z)
  const c = rp(road, (X0 + X1) / 2, h + ridge, Z)
  const base = rp(road, X0, 0, Z)
  const n = 8
  let stripes = ''
  for (let i = 0; i < n; i += 2) {
    const t0 = i / n
    const t1 = (i + 1) / n
    const p0 = { x: a.x + (b.x - a.x) * t0, y: a.y }
    const p1 = { x: a.x + (b.x - a.x) * t1, y: a.y }
    stripes += `M${p0.x} ${p0.y} L${c.x} ${c.y} L${p1.x} ${p1.y} Z`
  }
  return (
    <g>
      <path d={faceAt(road, X0, X1, Z, 0, h)} fill="#efe2cc" />
      <path d={faceAt(road, X0, X1, Z, h - 0.5, h)} fill="#b9262c" />
      <path d={`M${a.x} ${a.y} L${c.x} ${c.y} L${b.x} ${b.y} Z`} fill="#fbf3e6" />
      <path d={stripes} fill="#c23a35" opacity="0.85" />
      <rect x={a.x} y={a.y} width={b.x - a.x} height={Math.max(1, base.y - a.y) * 0.02} fill="#8a2230" />
    </g>
  )
}

const scene: SceneDef = {
  id: 'hsr-layout',
  title: 'HSR Layout',
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
              [0, '#a7c1cd'],
              [0.38, '#dcd5c2'],
              [0.68, '#f4d8ad'],
              [0.88, '#f9e0b6'],
              [1, '#fcebcc'],
            ]}
            sun={{ x: SUN.x, y: SUN.y, r: 20, glow: 10, halo: '#fff4d2', haloOpacity: 0.8 }}
          />
          <Wisps
            seed={33}
            items={[
              [260, 120, 280],
              [640, 80, 200],
              [1120, 150, 300],
            ]}
            color="#fff8ea"
            under="#e7cba8"
            opacity={0.5}
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
          <CanopyBelt x0={-100} x1={1700} y={566} h={30} seed={17} color="#87905e" light="#e6d499" lightOpacity={0.45} />
          <Glow x={800} y={520} rx={260} ry={70} color="#ffd890" opacity={0.35} />
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
          <Ground color="#6e7449" far="#b9aa86" />
          <RoadSurface road={road} zFar={GATE_Z - 2.6} />
          {/* paved forecourt in front of the Pujo ground */}
          <path d={stripAlong(road, -16, 16, GATE_Z - 2.7, FENCE_Z)} fill="#c3ab8c" />
          <path d={stripAlong(road, -6.5, 6.5, GATE_Z - 1.2, FENCE_Z)} fill="#d9c3a3" />
          {/* the park lawn on the right */}
          <path d={stripAlong(road, 6.0, 30, 2.2, GATE_Z - 2.7)} fill="#77894c" />
          <GroundStreaks
            sunX={SUN.x}
            color="#ffdca6"
            opacity={0.14}
            items={[
              { X0: -2.4, w: 0.45, z0: 3, z1: 18 },
              { X0: 1.4, w: 0.3, z0: 4, z1: 20 },
            ]}
          />
        </g>
      ),
    },
    {
      id: 'pujo',
      band: 'front',
      depth: 0.3,
      render: () => {
        const g = rp(road, 0, 0, GATE_Z)
        const s = F / GATE_Z
        const items: ReactNode[] = []
        // trees and shamiana roofs inside the ground, behind the fence
        const tl = rp(road, -13, 0, 46)
        const tr = rp(road, 15, 0, 52)
        items.push(<RainTreeLite key="t1" x={tl.x} y={tl.y} s={F / 46} h={13} seed={81} spread={1.1} colors={{ leaf: '#6d7a47', dark: '#46512f', light: '#e3cf8a', trunk: '#5a4636' }} />)
        items.push(<RainTreeLite key="t2" x={tr.x} y={tr.y} s={F / 52} h={12} seed={82} spread={1.0} colors={{ leaf: '#6d7a47', dark: '#46512f', light: '#e3cf8a', trunk: '#5a4636' }} />)
        items.push(<Shamiana key="s1" X0={-17} X1={-6} Z={36} h={4.6} ridge={1.8} />)
        items.push(<Shamiana key="s2" X0={6} X1={18} Z={34} h={4.6} ridge={1.8} />)
        items.push(<Shamiana key="s3" X0={-7} X1={7} Z={44} h={7.2} ridge={2.6} />)
        // the cloth fence across the ground's edge, with the gate opening
        items.push(<ClothFenceAt key="f1" road={road} X0={-34} X1={-6.6} Z={FENCE_Z} h={2.4} />)
        items.push(<ClothFenceAt key="f2" road={road} X0={6.6} X1={34} Z={FENCE_Z} h={2.4} />)
        // the gate
        items.push(<PandalGate key="g" x={g.x} y={g.y} s={s} w={12.5} h={8.6} />)
        // marigold strings from the gate to the fence posts
        const m0 = rp(road, -6.4, 7.2, GATE_Z)
        const m1 = rp(road, -13, 2.4, FENCE_Z)
        const m2 = rp(road, 6.4, 7.2, GATE_Z)
        const m3 = rp(road, 13, 2.4, FENCE_Z)
        items.push(<Marigolds key="m1" x1={m0.x} y1={m0.y} x2={m1.x} y2={m1.y} sag={6} r={1.6} />)
        items.push(<Marigolds key="m2" x1={m2.x} y1={m2.y} x2={m3.x} y2={m3.y} sag={6} r={1.6} />)
        return <g>{items}</g>
      },
    },
    {
      id: 'street',
      band: 'front',
      depth: 0.6,
      render: () => {
        const items: Item[] = []
        // homes on the left: two and three storeys, balconies, black tanks, compound walls
        items.push({ Z: 101, el: <StreetBlock road={road} side={-1} X={8.6} Z0={15} Z1={24.4} h={10.4} depth={11} wall="#e9cfb0" end="#c9a988" floorH={3.3} firstFloor={0} winEvery={3.0} winW={1.3} lit={0.05} chajja parapet="#d4b28e" tanks={[18, 22]} endWindows seed={61} /> })
        items.push({ Z: 100, el: <StreetBlock road={road} side={-1} X={8.4} Z0={4.5} Z1={13.8} h={7.2} depth={11} wall="#f0dcc0" end="#d9b994" floorH={3.3} firstFloor={0} winEvery={3.0} winW={1.3} winColor="#6f5a4c" chajja parapet="#c99d7a" tanks={[8.5]} endWindows seed={62} />
        })
        // first-floor balcony with a railing and a tiled sunshade on the near house
        items.push({
          Z: 99,
          el: (
            <g>
              <path d={planeAlong(road, -7.2, 6.5, 11.5, 3.3, 3.45)} fill="#a8866a" />
              <path d={planeAlong(road, -7.2, 6.5, 11.5, 3.45, 4.35)} fill="#7d5d48" opacity="0.55" />
              <path d={planeAlong(road, -8.35, 5.0, 13.4, 6.7, 7.2)} fill="#b45c3c" />
            </g>
          ), })
        // compound wall and gates in front of the homes
        items.push({ Z: 60, el: <path d={planeAlong(road, -6.2, 3, GATE_Z - 2.8, 0, 1.45)} fill="#e2c9a6" /> })
        items.push({ Z: 59, el: <path d={planeAlong(road, -6.2, 3, GATE_Z - 2.8, 1.38, 1.55)} fill="#a8896b" /> })
        const bg1 = rp(road, -6.3, 1.4, 9.5)
        const bg2 = rp(road, -6.3, 1.4, 19.5)
        items.push({ Z: 9.4, el: <Bougainvillea x={bg1.x} y={bg1.y + 4} s={F / 9.5} w={2.6} h={1.5} seed={7} /> })
        items.push({ Z: 19.4, el: <Bougainvillea x={bg2.x} y={bg2.y + 2} s={F / 19.5} w={2.4} h={1.4} seed={8} color="#d0507e" /> })
        // the park on the right: green railings and shade trees
        items.push({ Z: 3, el: <RailingAlong road={road} X={6.0} Z0={3} Z1={GATE_Z - 3} step={1.8} h={1.25} color="#2f5a43" base="#bfae95" baseH={0.4} /> })
        const park: [number, number, number, number][] = [
          [11.5, 9, 11.5, 71],
          [13.5, 18, 12, 72],
        ]
        for (const [X, Z, h, seed] of park) {
          const p = rp(road, X, 0, Z)
          items.push({ Z, el: <RainTreeLite x={p.x} y={p.y} s={F / Z} h={h} seed={seed} spread={1.0} lean={-0.2} sunSide={-1} colors={{ leaf: '#5f7643', dark: '#36462b', light: '#d9c677', trunk: '#4f3c2e' }} hiOpacity={0.65} /> })
        }
        const rt = rp(road, 9.0, 0, 13)
        items.push({ Z: 13, el: <RoundTreeLite x={rt.x} y={rt.y} s={F / 13} h={6} seed={73} colors={{ leaf: '#6d8247', dark: '#3e4d2c', light: '#e1cf86' }} /> })
        // lamps
        for (const Z of [8, 19]) {
          const p = rp(road, 4.6, 0, Z)
          items.push({ Z: 2.9 - Z * 0.01, el: <Lamp x={p.x} y={p.y} s={F / Z} h={7.5} arm="left" /> })
        }
        // people walking to the Pujo, and the dhaki at the gate
        const walkers: [number, number, number, ('man' | 'woman' | 'kid' | 'lalpaar')?][] = [
          [-4.8, 16, 91, 'lalpaar'],
          [-4.4, 16.4, 92, 'man'],
          [-4.1, 16.1, 93, 'kid'],
          [4.6, 21.5, 94, 'lalpaar'],
          [4.9, 22, 95, 'woman'],
          [-2.2, 24.6, 96, 'man'],
          [2.6, 24.2, 97, 'lalpaar'],
        ]
        for (const [X, Z, seed, v] of walkers) {
          const p = rp(road, X, 0, Z)
          items.push({ Z, el: <Person x={p.x} y={p.y} s={F / Z} seed={seed} variant={v} flip={X > 0} /> })
        }
        const dk = rp(road, -5.2, 0, GATE_Z - 1.4)
        void dk // the dhaki now drums in the stop's moving 'life' layer
        items.push({ Z: 3.1, el: <ShrubsAlong road={road} X={7.0} Z0={9} Z1={GATE_Z - 4} h={0.7} step={1.3} seed={14} color="#567040" light="#b4ba6c" /> })
        return <g>{byDepth(items)}</g>
      },
    },
    {
      id: 'near',
      band: 'front',
      depth: 0.9,
      render: () => {
        const p = rp(road, -14, 0, 5.5)
        return (
          <g>
            <RainTreeLite x={p.x} y={p.y} s={F / 5.5} h={11.5} seed={88} spread={0.85} lean={0.35} colors={{ leaf: '#566b3d', dark: '#2f3d26', light: '#cfc06f', trunk: shade('#4d3a2c', -0.1) }} hiOpacity={0.55} />
          </g>
        )
      },
    },
  ],
}

export default scene
