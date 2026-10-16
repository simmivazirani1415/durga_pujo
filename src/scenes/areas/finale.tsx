import type { ReactNode } from 'react'
import type { SceneDef } from '../types'
import { ROAD_DEFAULT, F, rng, type RoadStyle } from '../world'
import { Ground, RoadSurface, Lamp, rowAlong } from '../kit'
import { SkyStops, CanopyBelt, TowerBlock, RoundTreeLite, ShrubsAlong, Glow, LightDots, groundPoly, rp, f1 } from './_south-helpers'

/**
 * Finale, dusk: a long straight road runs towards the Bengaluru skyline as the first lights come on.
 * Street lamps pace the road, a lake on the right holds the sky, and a few warm glows across the city
 * stand for Pujo celebrations in neighbourhoods everywhere. The auto drives off along the road.
 */
const road: RoadStyle = {
  ...ROAD_DEFAULT,
  halfWidth: 3.4,
  asphalt: '#3a3744',
  asphaltFar: '#8e7f8f',
  center: 'dashed',
  centerColor: '#ebe3d6',
  kerb: 'bw',
  footpath: 1.6,
  footpathColor: '#8f838f',
  verge: '#424a3c',
}

type Item = { Z: number; el: ReactNode }
const byDepth = (items: Item[]) => items.sort((a, b) => b.Z - a.Z).map((i, k) => <g key={k}>{i.el}</g>)

const scene: SceneDef = {
  id: 'finale',
  title: 'Your Pujo. Your Bengaluru.',
  road,
  layers: [
    {
      id: 'sky',
      band: 'back',
      depth: 0,
      static: true,
      render: () => {
        const r = rng(77)
        let stars = ''
        for (let i = 0; i < 40; i++) {
          const x = -100 + r() * 1800
          const y = -160 + r() * 360
          const rr = 0.6 + r() * 1.0
          stars += `M${f1(x - rr)} ${f1(y)}a${f1(rr)} ${f1(rr)} 0 1 0 ${f1(rr * 2)} 0a${f1(rr)} ${f1(rr)} 0 1 0 ${f1(-rr * 2)} 0`
        }
        return (
          <g>
            <SkyStops
              stops={[
                [0, '#1f2a52'],
                [0.4, '#414a7b'],
                [0.68, '#9c7695'],
                [0.86, '#dda18a'],
                [1, '#f1c495'],
              ]}
            />
            <path d={stars} fill="#fff6e0" opacity="0.7" />
          </g>
        )
      },
    },
    {
      id: 'city',
      band: 'back',
      depth: 0.08,
      render: () => {
        const r = rng(5)
        const towers: ReactNode[] = []
        for (let i = 0; i < 22; i++) {
          const X = -420 + i * 40 + (r() - 0.5) * 24
          if (Math.abs(X) < 30 && r() > 0.3) continue
          const Z = 480 + r() * 260
          const h = 26 + r() * 70
          const w = 16 + r() * 18
          const p = rp(road, X, 0, Z)
          towers.push(<TowerBlock key={i} x={p.x} y={p.y} s={F / Z} w={w} h={h} color={i % 3 ? '#6c5f78' : '#77677f'} accent="#5d5169" lit={0.32} litColor="#ffd690" seed={i + 40} />)
        }
        return (
          <g>
            {towers}
            <CanopyBelt x0={-100} x1={1700} y={566} h={16} seed={88} color="#38403d" light="#5f5d6a" lightOpacity={0.4} />
            <LightDots seed={31} n={70} x0={-100} x1={1700} y0={548} y1={562} r={1.2} color="#ffd690" opacity={0.85} />
            {/* Pujo glows across the city */}
            {[
              [220, 552, 46],
              [520, 556, 34],
              [1060, 553, 40],
              [1330, 556, 30],
            ].map(([x, y, rr], i) => (
              <Glow key={i} x={x} y={y} rx={rr} ry={rr * 0.45} color="#ffc56a" opacity={0.55} />
            ))}
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
          <Ground color="#28322a" far="#4a5048" />
          {/* the lake on the right, holding the dusk */}
          <path d={groundPoly([[7.6, 2.2], [9.4, 60], [11, 400], [600, 420], [600, 2.2]])} fill="#8f6f88" />
          <path d={groundPoly([[5.4, 2.2], [7.6, 2.2], [9.4, 60], [11, 400], [6, 400]])} fill="#3b4536" />
          <path d={groundPoly([[12, 40], [13, 380], [560, 400], [560, 40]])} fill="#d29c8e" opacity="0.35" />
          <path d={groundPoly([[8, 2.2], [600, 2.2], [600, 14], [9, 14]])} fill="#4b3f5e" opacity="0.45" />
          <path d={groundPoly([[30, 30], [600, 30], [600, 130], [40, 130]])} fill="#5b4d6b" opacity="0.35" />
          {/* warm reflections of the city lights */}
          {(
            [
              [26, 6],
              [70, 9],
              [150, 12],
              [260, 10],
            ] as [number, number][]
          ).map(([X, w], i) => (
            <path key={i} d={groundPoly([[X, 120], [X + w, 120], [X + w * 1.4, 420], [X + w * 0.4, 420]])} fill="#ffd690" opacity="0.14" />
          ))}
          <path d={groundPoly([[-8.6, 3], [-60, 3], [-60, 400], [-9, 400]])} fill="#33402f" opacity="0.6" />
          <RoadSurface road={road} />
        </g>
      ),
    },
    {
      id: 'street',
      band: 'front',
      depth: 0.7,
      render: () => {
        const items: Item[] = []
        for (const p of rowAlong(road, -4.6, 14, 140, 14)) items.push({ Z: p.Z, el: <Lamp x={p.x} y={p.y} s={p.s} h={7.5} arm="right" lit /> })
        for (const p of rowAlong(road, 4.6, 21, 140, 14)) items.push({ Z: p.Z, el: <Lamp x={p.x} y={p.y} s={p.s} h={7.5} arm="left" lit /> })
        const trees: [number, number, number][] = [
          [-11, 12, 81],
          [-14, 26, 82],
          [-12, 44, 83],
          [-15, 70, 84],
        ]
        for (const [X, Z, seed] of trees) {
          const p = rp(road, X, 0, Z)
          items.push({ Z, el: <RoundTreeLite x={p.x} y={p.y} s={F / Z} h={7} seed={seed} colors={{ leaf: '#38433a', dark: '#232a26', light: '#6c6774' }} /> })
        }
        items.push({ Z: 200, el: <ShrubsAlong road={road} X={-7.2} Z0={6} Z1={80} h={0.6} step={1.6} seed={29} color="#2d3630" light="#55555f" /> })
        return <g>{byDepth(items)}</g>
      },
    },
  ],
}

export default scene
