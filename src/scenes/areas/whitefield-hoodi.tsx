import type { ReactNode } from 'react'
import type { SceneDef } from '../types'
import { ROAD_DEFAULT, F, type RoadStyle } from '../world'
import { Ground, RoadSurface, Person, RoadSign, Lamp } from '../kit'
import {
  SkyStops,
  Wisps,
  CanopyBelt,
  GlassBlock,
  TowerBlock,
  ViaductAlong,
  RainTreeLite,
  RoundTreeLite,
  ShrubsAlong,
  Glow,
  GroundStreaks,
  planeAlong,
  stripAlong,
  rp,
} from './_south-helpers'

/**
 * Whitefield & Hoodi, late afternoon: a wide East Bengaluru road. Glass tech-park blocks catch the sun on the
 * right, the elevated Purple Line runs alongside with a train gliding in, gated apartment towers stand back on
 * the left, and a green sign splits the road for Whitefield (straight on) and Hoodi (right).
 */
const road: RoadStyle = {
  ...ROAD_DEFAULT,
  halfWidth: 5.4,
  asphalt: '#4d4846',
  asphaltFar: '#c2ad98',
  center: 'dashed',
  centerColor: '#efe8da',
  edgeLines: true,
  kerb: 'by',
  footpath: 2.4,
  footpathColor: '#bba791',
  verge: '#6f7449',
}

const SUN = { x: 1290, y: 360 }
type Item = { Z: number; el: ReactNode }
const byDepth = (items: Item[]) => items.sort((a, b) => b.Z - a.Z).map((i, k) => <g key={k}>{i.el}</g>)

const scene: SceneDef = {
  id: 'whitefield-hoodi',
  title: 'Whitefield & Hoodi',
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
              [0, '#93b3c9'],
              [0.35, '#c9cdc4'],
              [0.62, '#f1d2a6'],
              [0.85, '#f8dcae'],
              [1, '#fbe6c4'],
            ]}
            sun={{ x: SUN.x, y: SUN.y, r: 22, glow: 11, halo: '#fff2cc', haloOpacity: 0.85 }}
          />
          <Wisps
            seed={21}
            items={[
              [210, 150, 300],
              [520, 92, 220],
              [1040, 130, 280],
              [1470, 210, 240],
            ]}
            color="#fff6e6"
            under="#e8c3a0"
            opacity={0.5}
          />
        </g>
      ),
    },
    {
      id: 'far',
      band: 'back',
      depth: 0.1,
      render: () => {
        const far: ReactNode[] = []
        // distant towers of the IT corridor, hazy
        const towers: [number, number, number, number][] = [
          // X, Z, w, h
          [-70, 380, 26, 70],
          [-38, 420, 20, 82],
          [26, 400, 30, 92],
          [60, 360, 24, 64],
          [96, 330, 34, 58],
          [140, 380, 28, 76],
        ]
        towers.forEach(([X, Z, w, h], i) => {
          const p = rp({}, X, 0, Z)
          far.push(<TowerBlock key={i} x={p.x} y={p.y} s={F / Z} w={w} h={h} color={i % 2 ? '#d9c3ad' : '#cfbcae'} accent="#c4ae9a" seed={i + 3} />)
        })
        return (
          <g>
            {far}
            <CanopyBelt x0={-100} x1={1700} y={566} h={26} seed={12} color="#8f9466" light="#e8d39a" lightOpacity={0.45} />
            <Glow x={SUN.x} y={SUN.y + 120} rx={420} ry={120} color="#ffe2a8" opacity={0.4} />
          </g>
        )
      },
    },
    {
      id: 'ground',
      band: 'back',
      depth: 1,
      static: true,
      render: () => (
        <g>
          <Ground color="#677048" far="#b9b089" />
          <RoadSurface road={road} />
          {/* service lane and verge on the right under the viaduct */}
          <path d={stripAlong(road, 8.0, 14.5, 2.2, 160)} fill="#a39280" />
          <path d={stripAlong(road, 14.5, 60, 2.2, 160)} fill="#7f8a52" />
          <path d={stripAlong(road, -8.0, -12, 2.2, 160)} fill="#7c8152" />
          <GroundStreaks
            sunX={SUN.x}
            color="#ffd9a0"
            opacity={0.14}
            items={[
              { X0: -3.5, w: 0.5, z0: 3, z1: 20 },
              { X0: 2.2, w: 0.4, z0: 4, z1: 22 },
            ]}
          />
        </g>
      ),
    },
    {
      id: 'tech',
      band: 'front',
      depth: 0.35,
      render: () => (
        <g>
          {/* gated apartment towers set back on the left, kept low in the frame */}
          {(
            [
              [-44, 120, 22, 52, '#e4cfb6', 11],
              [-26, 150, 18, 60, '#dcc4ab', 12],
              [-60, 95, 20, 40, '#e8d6bf', 13],
            ] as [number, number, number, number, string, number][]
          ).map(([X, Z, w, h, c, sd], i) => {
            const p = rp(road, X, 0, Z)
            return <TowerBlock key={i} x={p.x} y={p.y} s={F / Z} w={w} h={h} color={c} side="right" depth={14} seed={sd} sideShade={0.06} />
          })}
          {/* tech-park glass blocks on the right, catching the late sun */}
          <GlassBlock road={road} X0={-4} X1={20} Z0={190} Z1={230} h={70} front={['#9bb0bf', '#e9c39b']} side={['#b4c2c8', '#f0cf9f']} seed={6} />
          <GlassBlock road={road} X0={16} X1={40} Z0={88} Z1={124} h={56} front={['#8ea6b8', '#e3bb8f']} side={['#a7b8c2', '#f0c995']} sheen="#fff1d0" seed={4} />
          <GlassBlock road={road} X0={19} X1={48} Z0={36} Z1={70} h={38} front={['#7d97ab', '#e2b88c']} side={['#9fb3bf', '#f2cb98']} sheen="#fff4da" crown="#ece6dc" seed={5} />
          {/* landscaped forecourt of the tech park */}
          <path d={stripAlong(road, 14.5, 19, 36, 70)} fill="#8d9a5c" />
        </g>
      ),
    },
    {
      id: 'metro',
      band: 'front',
      depth: 0.55,
      render: () => (
        <g>
          <ViaductAlong road={road} X={11.6} Z0={27} Z1={260} deckY={10.5} pierStep={24} pierZ0={28} color="#ddd3c6" train={{ Z0: 40, Z1: 86, livery: '#6a3d8f' }} />
        </g>
      ),
    },
    {
      id: 'street',
      band: 'front',
      depth: 0.85,
      render: () => {
        const items: Item[] = []
        // avenue trees on the left footpath and in the right verge between piers
        const trees: [number, number, number, number][] = [
          [-9.2, 17, 11.5, 52],
          [-9.0, 28, 11, 53],
          [-8.8, 42, 10.5, 54],
          [-8.6, 60, 10, 55],
        ]
        for (const [X, Z, h, seed] of trees) {
          const p = rp(road, X, 0, Z)
          items.push({ Z, el: <RainTreeLite x={p.x} y={p.y} s={F / Z} h={h} seed={seed} spread={0.9} lean={0.3} colors={{ leaf: '#5d7340', dark: '#34442a', light: '#d6c272', trunk: '#4d3a2c' }} hiOpacity={0.7} /> })
        }
        const rts: [number, number, number][] = [
          [10.2, 9.5, 61],
          [11.0, 16, 63],
          [13.6, 30, 62],
          [13.6, 52, 64],
        ]
        for (const [X, Z, seed] of rts) {
          const p = rp(road, X, 0, Z)
          items.push({ Z, el: <RoundTreeLite x={p.x} y={p.y} s={F / Z} h={7} seed={seed} colors={{ leaf: '#6a7c45', dark: '#3e4a2c', light: '#e2cd84' }} /> })
        }
        items.push({ Z: 75, el: <ShrubsAlong road={road} X={-8.4} Z0={6} Z1={60} h={0.7} step={1.4} seed={9} color="#556c3a" light="#a9b264" /> })
        // lamps along the right kerb
        for (const Z of [20, 34, 48]) {
          const p = rp(road, 6.0, 0, Z)
          items.push({ Z, el: <Lamp x={p.x} y={p.y} s={F / Z} h={8} arm="left" /> })
        }
        // office-goers heading home
        const walkers: [number, number, number, ('man' | 'woman')?][] = [
          [-7.0, 12, 71, 'woman'],
          [-6.6, 12.6, 72, 'man'],
          [6.8, 19, 73, 'man'],
          [-7.2, 26, 74],
        ]
        for (const [X, Z, seed, v] of walkers) {
          const p = rp(road, X, 0, Z)
          items.push({ Z, el: <Person x={p.x} y={p.y} s={F / Z} seed={seed} variant={v} flip={seed % 2 === 1} /> })
        }
        // the direction sign: Whitefield straight on, Hoodi to the right
        const sg = rp(road, 5.95, 0, 17)
        items.push({
          Z: 17,
          el: <RoadSign x={sg.x} y={sg.y} s={F / 17} w={5.4} h={2.3} poleH={4.6} lines={[{ text: 'Whitefield', arrow: '↑' }, { text: 'Hoodi', arrow: '→' }]} />,
        })
        // low compound wall of the apartment complex on the left
        items.push({ Z: 81, el: <path d={planeAlong(road, -11.2, 6, 70, 0, 1.6)} fill="#d8c3a6" /> })
        items.push({ Z: 80, el: <path d={planeAlong(road, -11.2, 6, 70, 1.5, 1.7)} fill="#a88f74" /> })
        return <g>{byDepth(items)}</g>
      },
    },
  ],
}

export default scene
