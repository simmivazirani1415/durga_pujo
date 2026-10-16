import type { ReactNode } from 'react'
import type { SceneDef } from '../types'
import { ROAD_DEFAULT, F, type RoadStyle } from '../world'
import { Ground, RoadSurface, Person, Lamp, ParkedAuto } from '../kit'
import {
  SkyStops,
  Wisps,
  CanopyBelt,
  RainTreeLite,
  RoundTreeLite,
  TowerBlock,
  StreetBlock,
  ViaductPath,
  TextAlong,
  ShrubsAlong,
  Glow,
  LightDots,
  groundPoly,
  planeAlong,
  stripAlong,
  rp,
} from './_south-helpers'

/**
 * South-East Bengaluru, early evening: a busy BTM eat street. Lit shopfronts with generic food signs on the
 * left, homes above; apartment blocks and the green edge of Madiwala lake on the right; and ahead, the
 * Yellow Line viaduct of Hosur Road sweeping across the road with a lit train.
 */
const road: RoadStyle = {
  ...ROAD_DEFAULT,
  halfWidth: 4.4,
  asphalt: '#423c3d',
  asphaltFar: '#a88a83',
  center: 'dashed',
  centerColor: '#ece2d2',
  kerb: 'by',
  footpath: 2.2,
  footpathColor: '#a99185',
  verge: '#5d6243',
}

const SUN = { x: 1210, y: 548 }
type Item = { Z: number; el: ReactNode }
const byDepth = (items: Item[]) => items.sort((a, b) => b.Z - a.Z).map((i, k) => <g key={k}>{i.el}</g>)

const SIGN_BG = ['#a3402e', '#2f5d4a', '#b07a1f', '#7a2f4a']

const scene: SceneDef = {
  id: 'south-east',
  title: 'South-East Bengaluru',
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
              [0, '#5e638f'],
              [0.32, '#a98aa2'],
              [0.6, '#e7a78a'],
              [0.84, '#f6c793'],
              [1, '#fbd9aa'],
            ]}
            sun={{ x: SUN.x, y: SUN.y, r: 26, glow: 9, halo: '#ffe0b0', haloOpacity: 0.9, color: '#ffe9c4' }}
          />
          <Wisps
            seed={44}
            items={[
              [300, 170, 340],
              [760, 110, 260],
              [1180, 200, 300],
            ]}
            color="#f6d2c0"
            under="#b98a9c"
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
        const towers: [number, number, number, number, string][] = [
          [-90, 300, 26, 48, '#b58f8e'],
          [-40, 340, 22, 60, '#a98689'],
          [70, 300, 30, 52, '#b4908c'],
          [130, 340, 24, 66, '#a8878a'],
        ]
        return (
          <g>
            {towers.map(([X, Z, w, h, c], i) => {
              const p = rp(road, X, 0, Z)
              return <TowerBlock key={i} x={p.x} y={p.y} s={F / Z} w={w} h={h} color={c} lit={0.25} litColor="#ffd690" seed={i + 20} />
            })}
            <CanopyBelt x0={-100} x1={1700} y={566} h={24} seed={23} color="#6e6957" light="#d6a37e" lightOpacity={0.35} />
            <Glow x={SUN.x} y={SUN.y} rx={360} ry={90} color="#ffd6a0" opacity={0.45} />
          </g>
        )
      },
    },
    {
      id: 'lights',
      band: 'back',
      depth: 0.12,
      render: () => <LightDots seed={9} n={34} x0={960} x1={1600} y0={492} y1={556} r={1.5} />,
    },
    {
      id: 'ground',
      band: 'back',
      depth: 1,
      static: true,
      render: () => (
        <g>
          <Ground color="#55583e" far="#9f8f7c" />
          <RoadSurface road={road} />
          {/* Madiwala lake edge on the right, catching the last light */}
          <path d={groundPoly([[16, 34], [70, 30], [140, 46], [140, 90], [26, 80], [14, 52]])} fill="#c99f95" />
          <path d={groundPoly([[22, 40], [90, 38], [140, 60], [140, 70], [30, 62]])} fill="#e7b9a0" opacity="0.6" />
          <path d={stripAlong(road, 8.8, 16, 2.2, 60)} fill="#5f6a40" />
          {/* light spilling from the shopfronts onto the left footpath */}
          <path d={stripAlong(road, -8.6, -4.8, 5, 30)} fill="#ffcf86" opacity="0.18" />
        </g>
      ),
    },
    {
      id: 'metro',
      band: 'front',
      depth: 0.3,
      render: () => (
        <g>
          <RoundTreeLite {...(() => { const p = rp(road, 24, 0, 60); return { x: p.x, y: p.y, s: F / 60 } })()} h={9} seed={31} colors={{ leaf: '#56603f', dark: '#363d2b', light: '#c99a7a' }} />
          <RoundTreeLite {...(() => { const p = rp(road, 34, 0, 72); return { x: p.x, y: p.y, s: F / 72 } })()} h={10} seed={32} colors={{ leaf: '#56603f', dark: '#363d2b', light: '#c99a7a' }} />
          <ViaductPath
            pts={[
              [-120, 66],
              [-40, 50],
              [20, 42],
              [80, 36],
              [150, 34],
            ]}
            deckY={12.5}
            color="#d8c7bb"
            under="#7c6a6a"
            pierEvery={30}
            train={{ t0: 0.18, t1: 0.5, livery: '#e2b21f', body: '#d8d2c8', windows: '#ffd98f' }}
          />
        </g>
      ),
    },
    {
      id: 'right',
      band: 'front',
      depth: 0.5,
      render: () => {
        const items: Item[] = []
        items.push({ Z: 22, el: <StreetBlock road={road} side={1} X={17} Z0={22} Z1={36} h={22} depth={14} wall="#c79d8d" end="#a8807a" floorH={3.1} lit={0.35} litColor="#ffd690" chajja parapet="#a98377" tanks={[25, 31]} endWindows seed={41} /> })
        const trees: [number, number, number, number][] = [
          [11, 12, 11, 51],
          [12, 26, 11.5, 52],
          [13, 44, 10, 53],
        ]
        for (const [X, Z, h, seed] of trees) {
          const p = rp(road, X, 0, Z)
          items.push({ Z: Z - 0.5, el: <RainTreeLite x={p.x} y={p.y} s={F / Z} h={h} seed={seed} spread={0.95} lean={-0.25} sunSide={1} colors={{ leaf: '#4f5a3a', dark: '#2e3527', light: '#d3956f', trunk: '#3f302a' }} hiOpacity={0.55} /> })
        }
        items.push({ Z: 6, el: <ShrubsAlong road={road} X={9.4} Z0={8} Z1={40} h={0.75} step={1.5} seed={19} color="#4a5636" light="#a88a6a" /> })
        // an auto waiting at the kerb and evening walkers
        const pa = rp(road, 6.0, 0, 15)
        items.push({ Z: 15, el: <ParkedAuto x={pa.x} y={pa.y} s={F / 15} flip /> })
        const walkers: [number, number, number, ('man' | 'woman' | 'kid')?][] = [
          [7.6, 10, 61, 'man'],
          [7.9, 19, 62, 'woman'],
          [7.4, 24, 63],
        ]
        for (const [X, Z, seed, v] of walkers) {
          const p = rp(road, X, 0, Z)
          items.push({ Z, el: <Person x={p.x} y={p.y} s={F / Z} seed={seed} variant={v} flip /> })
        }
        for (const Z of [22, 35]) {
          const p = rp(road, 5.0, 0, Z)
          items.push({ Z: Z - 0.3, el: <Lamp x={p.x} y={p.y} s={F / Z} h={8} arm="left" lit /> })
        }
        return <g>{byDepth(items)}</g>
      },
    },
    {
      id: 'eatstreet',
      band: 'front',
      depth: 0.75,
      render: () => {
        const items: Item[] = []
        const blocks: { Z0: number; Z1: number; h: number; wall: string; signs: string[]; seed: number }[] = [
          { Z0: 36, Z1: 52, h: 15.5, wall: '#d8b9a6', signs: ['SWEETS', 'TEA'], seed: 71 },
          { Z0: 24, Z1: 35.5, h: 12.5, wall: '#e2c4ae', signs: ['CHATS', 'BIRYANI'], seed: 72 },
          { Z0: 13.5, Z1: 23.5, h: 9.4, wall: '#ecd2bb', signs: ['MEALS', 'DOSA'], seed: 73 },
        ]
        for (const b of blocks) {
          const n = b.signs.length
          const span = (b.Z1 - b.Z0 - 1) / n
          const shops = b.signs.map((_, i) => ({ z0: b.Z0 + 0.5 + i * span, z1: b.Z0 + 0.5 + (i + 1) * span - 0.5, glow: i % 2 ? '#ffd08a' : '#ffc070' }))
          items.push({
            Z: b.Z0,
            el: (
              <g>
                <StreetBlock road={road} side={-1} X={8.8} Z0={b.Z0} Z1={b.Z1} h={b.h} depth={b.Z0 < 20 ? 5 : 12} wall={b.wall} end="#b9968a" floorH={3.1} lit={0.4} litColor="#ffd690" ground="shops" shops={shops} chajja parapet="#bf9c8b" tanks={[b.Z0 + 3]} endWindows={b.Z0 < 20} seed={b.seed} />
                {b.signs.map((t, i) => {
                  const za = b.Z0 + 0.7 + i * span
                  const zb = za + span - 0.9
                  return (
                    <g key={t}>
                      <path d={planeAlong(road, -8.79, za, zb, 2.85, 3.55)} fill={SIGN_BG[(i + b.seed) % SIGN_BG.length]} />
                      <TextAlong road={road} X={-8.78} Za={za + 0.3} Zb={zb - 0.3} Y0={2.95} Y1={3.45} text={t} color="#fff3dc" size={0.72} />
                    </g>
                  )
                })}
              </g>
            ),
          })
        }
        // a chai stall with a striped tarp at the corner
        items.push({
          Z: 8,
          el: (() => {
            const Z = 8.4
            const sc = F / Z
            const a = rp(road, -10.2, 0, Z)
            const b = rp(road, -6.9, 0, Z)
            const t = rp(road, -10.4, 2.4, Z)
            const u = rp(road, -6.6, 2.4, Z)
            return (
              <g>
                <path d={planeAlong(road, -10.2, Z, Z + 2.2, 0, 1.05)} fill="#7a4b2e" />
                <rect x={a.x} y={a.y - 1.05 * sc} width={b.x - a.x} height={1.05 * sc} fill="#8f5a36" />
                <rect x={a.x} y={a.y - 1.05 * sc} width={b.x - a.x} height={0.12 * sc} fill="#d9a35e" />
                <rect x={a.x + 0.4 * sc} y={a.y - 1.45 * sc} width={0.5 * sc} height={0.4 * sc} rx={0.08 * sc} fill="#c0c3c4" />
                <rect x={a.x + 1.2 * sc} y={a.y - 1.3 * sc} width={0.9 * sc} height={0.25 * sc} fill="#f1e2c4" />
                <rect x={a.x + 0.05 * sc} y={t.y} width={0.08 * sc} height={a.y - t.y} fill="#3d2a20" />
                <rect x={b.x - 0.13 * sc} y={u.y} width={0.08 * sc} height={b.y - u.y} fill="#3d2a20" />
                <path d={`M${t.x - 0.2 * sc} ${t.y + 0.25 * sc} L${u.x + 0.2 * sc} ${u.y + 0.25 * sc} L${u.x} ${u.y - 0.35 * sc} L${t.x} ${t.y - 0.35 * sc} Z`} fill="#2f6b8f" />
                {[0.2, 0.45, 0.7].map((k) => (
                  <path key={k} d={`M${t.x + (u.x - t.x) * k} ${t.y - 0.35 * sc} l${0.35 * sc} 0 l0 ${0.6 * sc} l${-0.35 * sc} 0 Z`} fill="#e9e1cf" opacity="0.8" />
                ))}
                <circle cx={(t.x + u.x) / 2} cy={t.y + 0.55 * sc} r={0.1 * sc} fill="#fff1c2" />
                <circle cx={(t.x + u.x) / 2} cy={t.y + 0.55 * sc} r={0.6 * sc} fill="#ffd690" opacity="0.25" />
              </g>
            )
          })(),
        })
        const c1 = rp(road, -6.2, 0, 7.6)
        const c2 = rp(road, -5.8, 0, 9.4)
        items.push({ Z: 7.6, el: <Person x={c1.x} y={c1.y} s={F / 7.6} seed={86} variant="man" colors={['#f2e6cf', '#3b3a44']} /> })
        items.push({ Z: 9.4, el: <Person x={c2.x} y={c2.y} s={F / 9.4} seed={87} variant="woman" colors={['#7a2f4a', '#e7b958']} flip /> })
        // diners and strollers on the lit footpath
        const people: [number, number, number, ('man' | 'woman' | 'kid')?][] = [
          [-6.4, 15, 81, 'man'],
          [-6.9, 15.6, 82, 'woman'],
          [-6.2, 21, 83],
          [-7.4, 26, 84, 'man'],
          [-6.6, 34, 85],
        ]
        for (const [X, Z, seed, v] of people) {
          const p = rp(road, X, 0, Z)
          items.push({ Z: Z - 0.6, el: <Person x={p.x} y={p.y} s={F / Z} seed={seed} variant={v} /> })
        }
        return <g>{byDepth(items)}</g>
      },
    },
  ],
}

export default scene
