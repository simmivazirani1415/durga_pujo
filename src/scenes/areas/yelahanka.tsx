import type { SceneDef } from '../types'
import { ROAD_DEFAULT, F, proj, roadPoint, roadCenterX, rng, shade, type RoadStyle } from '../world'
import { Clouds, Haze, Ground, RoadSurface, RainTree, RoundTree, Building, Bungalow, Lamp, Person, FgFoliage, Palm, PAL } from '../kit'
import { f1, poly, rects, stripAlong, faceAlong, MultiSky, zRange, CanopyBand } from './_north-helpers'

/**
 * Yelahanka: clear late morning, a big blue-gold sky over a wide open road. The road runs along the edge of
 * Yelahanka lake and curves gently right, so the water opens out straight ahead with its low far shore.
 * Low-rise New Town houses sit back behind green verges on the right, a couple of egrets wade in the shallows,
 * and a small transport aircraft drifts in towards the Air Force station. Spacious, no towers.
 */
const road: RoadStyle = {
  ...ROAD_DEFAULT,
  halfWidth: 4.6,
  asphalt: '#5d5650',
  asphaltFar: '#b8ad9e',
  center: 'dashed',
  kerb: 'by',
  footpath: 1.8,
  footpathColor: '#c9b797',
  verge: '#7f9150',
  bend: 1.5,
  bendStart: 30,
}
const HW = road.halfWidth
const FP_OUT = HW + 0.2 + road.footpath
/* left side: footpath, a narrow grassy bank with reeds, then the water (a little below road level) */
const BANK_X = -(FP_OUT + 1.6)
const WATER_Y = -0.7
/* right side: footpath, a wide green verge, then the compound walls of New Town houses */
const WALL_X = FP_OUT + 5
const ZFAR = 320

function Aircraft({ x, y, k = 1 }: { x: number; y: number; k?: number }) {
  // small high-wing transport seen side-on, nose left, gently descending
  const c = '#58626e'
  const L = 60 * k
  return (
    <g transform={`rotate(-3 ${x} ${y})`} opacity="0.85">
      <path d={`M${x - L * 0.5} ${y} Q${x - L * 0.56} ${y - L * 0.05} ${x - L * 0.42} ${y - L * 0.07} L${x + L * 0.34} ${y - L * 0.06} L${x + L * 0.47} ${y - L * 0.2} L${x + L * 0.54} ${y - L * 0.2} L${x + L * 0.5} ${y - L * 0.02} Q${x + L * 0.2} ${y + L * 0.03} ${x - L * 0.5} ${y} Z`} fill={c} />
      <path d={`M${x - L * 0.14} ${y - L * 0.075} L${x + L * 0.12} ${y - L * 0.075} L${x + L * 0.04} ${y - L * 0.035} L${x - L * 0.18} ${y - L * 0.035} Z`} fill={shade(c, -0.3)} />
      <rect x={x + L * 0.36} y={y - L * 0.07} width={L * 0.16} height={L * 0.022} fill={shade(c, -0.2)} />
      <rect x={x - L * 0.36} y={y - L * 0.045} width={L * 0.6} height={L * 0.012} fill={shade(c, 0.35)} opacity="0.6" />
    </g>
  )
}

/** water from the far shore up to the bank, with soft sky reflections and sun glints */
function LakeWater() {
  const zs = zRange(2, ZFAR, 1.06)
  const edge = zs.map((z) => proj(roadCenterX(road, z) + BANK_X - 0.4, WATER_Y, z))
  const pts = [...edge, { x: 2000, y: 563 }, { x: -400, y: 563 }, { x: -400, y: 1100 }]
  const r = rng(12)
  let glints = ''
  for (let i = 0; i < 34; i++) {
    const z = 18 + Math.pow(r(), 1.3) * 380
    const X = roadCenterX(road, z) + BANK_X - 3 - r() * Math.min(z * 1.2, 160)
    const p = proj(X, WATER_Y, z)
    const w = (F / z) * (1.5 + r() * 5)
    if (p.x > -200 && p.x < 1500) glints += `M${f1(p.x)} ${f1(p.y)}h${f1(w)}v${f1(Math.max(0.7, (F / z) * 0.05))}h${f1(-w)}Z`
  }
  return (
    <g>
      <defs>
        <linearGradient id="yelLake" x1="0" y1="562" x2="0" y2="800" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#d9e4df" />
          <stop offset="0.12" stopColor="#a7c5cc" />
          <stop offset="0.5" stopColor="#77a2ae" />
          <stop offset="1" stopColor="#557f8c" />
        </linearGradient>
      </defs>
      <path d={poly(pts)} fill="url(#yelLake)" />
      <path d={glints} fill="#fffbea" opacity="0.75" />
    </g>
  )
}

/** the far shore: a long low line of trees and a few low buildings; reflections in the water below it */
function FarShore() {
  return (
    <g>
      <path d="M-200 563 L-200 548 C 120 546 260 538 420 544 C 600 550 760 546 940 552 C 1100 557 1300 554 1500 556 L1800 556 L1800 563 Z" fill="#a9bccb" opacity="0.5" />
      <CanopyBand x0={-200} x1={1800} y={563} h={14} w={34} seed={8} color="#8a9c7d" light="#c3c79a" lightOpacity={0.35} bottom={564} />
      <path d={rect5()} fill="#ebe3d1" />
      <CanopyBand x0={-200} x1={1800} y={564} h={8} w={26} seed={21} color="#768b6c" light="#b8bf8e" lightOpacity={0.3} bottom={565} />
    </g>
  )
}
function rect5() {
  const b: [number, number, number, number][] = [
    [90, 551, 15, 9],
    [111, 554, 9, 6],
    [340, 552, 12, 8],
    [640, 554, 9, 6],
    [1180, 553, 12, 7],
    [1196, 555, 8, 5],
  ]
  return b.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h${-w}Z`).join('')
}

/** grassy bank between the footpath and the water, with clumps of reeds along the waterline */
function LeftBank() {
  const r = rng(31)
  let reeds = ''
  for (let z = 6; z < 140; z *= 1.09) {
    const s = F / z
    const n = 1 + Math.floor(r() * 3)
    for (let k = 0; k < n; k++) {
      const p = proj(roadCenterX(road, z) + BANK_X - 0.2 - r() * 0.5, 0, z * (1 + r() * 0.05))
      const h = (0.4 + r() * 0.45) * s
      const w = Math.max(0.6, 0.05 * s)
      const lean = (r() - 0.5) * 0.5 * h
      reeds += `M${f1(p.x - w)} ${f1(p.y)}L${f1(p.x + lean)} ${f1(p.y - h)}L${f1(p.x + w)} ${f1(p.y)}Z`
    }
  }
  return (
    <g>
      <path d={stripAlong(road, BANK_X - 0.4, -FP_OUT, 2, ZFAR, 0)} fill="url(#yelGrass)" />
      <path d={stripAlong(road, BANK_X - 0.4, BANK_X + 0.1, 2, ZFAR, 0)} fill="#6d7c46" />
      <path d={reeds} fill="#7d8b4a" />
    </g>
  )
}

/** soft tree shadows (sun high on the right, so they sit just left of each trunk) */
function Shadows({ pts }: { pts: { X: number; Z: number; R: number }[] }) {
  let d = ''
  for (const t of pts) {
    const c = roadPoint(road, t.X - t.R * 0.35, t.Z)
    const rx = t.R * c.s * 0.9
    const ry = Math.max(1, rx * 0.12 * Math.min(1, 14 / t.Z) + 0.6)
    d += `M${f1(c.x - rx)} ${f1(c.y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(rx * 2)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-rx * 2)} 0Z`
  }
  return <path d={d} fill="#3c4a28" opacity="0.2" />
}

function Egret({ x, y, s, flip = false }: { x: number; y: number; s: number; flip?: boolean }) {
  const d = flip ? -1 : 1
  return (
    <g>
      <path d={`M${x - d * 0.25 * s} ${y - 0.45 * s} Q${x} ${y - 0.62 * s} ${x + d * 0.22 * s} ${y - 0.5 * s} Q${x + d * 0.28 * s} ${y - 0.75 * s} ${x + d * 0.34 * s} ${y - 0.88 * s} L${x + d * 0.46 * s} ${y - 0.86 * s} L${x + d * 0.34 * s} ${y - 0.82 * s} Q${x + d * 0.2 * s} ${y - 0.5 * s} ${x} ${y - 0.36 * s} Z`} fill="#fbf8ef" />
      <path d={`M${x} ${y - 0.36 * s} L${x - d * 0.04 * s} ${y} M${x + d * 0.06 * s} ${y - 0.38 * s} L${x + d * 0.08 * s} ${y}`} stroke="#3a3a32" strokeWidth={Math.max(0.5, 0.025 * s)} />
    </g>
  )
}

const LEFT_TREES = [
  { X: BANK_X + 0.6, Z: 34, h: 6.5, seed: 31 },
  { X: BANK_X + 0.8, Z: 62, h: 7, seed: 35 },
]
const RIGHT_TREES = [
  { X: FP_OUT + 3.0, Z: 13.5, h: 9, seed: 45, kind: 'rain' as const },
  { X: FP_OUT + 2.6, Z: 34, h: 7, seed: 43, kind: 'round' as const },
  { X: FP_OUT + 2.4, Z: 56, h: 9, seed: 41, kind: 'tulip' as const },
  { X: FP_OUT + 2.6, Z: 84, h: 7, seed: 47, kind: 'round' as const },
  { X: FP_OUT + 2.4, Z: 118, h: 9, seed: 49, kind: 'rain' as const },
]

/* New Town plots: independent 2-3 storey houses and a few tiled bungalows behind one long compound wall */
const HOUSES = [
  { Z: 182, X: 3.5, w: 11, h: 7, c: '#efe3c8', t: 1, kind: 'block' as const },
  { Z: 146, X: 4.5, w: 11, h: 3.4, c: '#efe0c2', t: 0, kind: 'bungalow' as const },
  { Z: 116, X: 3.0, w: 12, h: 9.5, c: '#e7cfa9', t: 2, kind: 'block' as const },
  { Z: 88, X: 4.0, w: 11, h: 6.4, c: '#f2ead8', t: 1, kind: 'block' as const },
  { Z: 63, X: 5.0, w: 11, h: 3.4, c: '#e9d3b8', t: 0, kind: 'bungalow' as const },
  { Z: 42, X: 3.2, w: 12, h: 9.4, c: '#ecd7b4', t: 2, kind: 'block' as const },
  { Z: 22, X: 4.2, w: 12, h: 6.4, c: '#f3ecdd', t: 1, kind: 'block' as const },
]

/** long low compound wall along the right verge, with gate pillars, painted cream */
function CompoundWall() {
  const posts: [number, number, number, number][] = []
  for (let z = 4.2; z < 230; z += Math.max(3.2, z / 5)) {
    const p = roadPoint(road, WALL_X, z)
    posts.push([p.x - 0.22 * p.s, p.y - 1.65 * p.s, 0.44 * p.s, 1.65 * p.s])
  }
  return (
    <g>
      <path d={faceAlong(road, WALL_X, 3, 240, 0, 1.3)} fill="#e6d8bb" />
      <path d={faceAlong(road, WALL_X, 3, 240, 1.3, 1.45)} fill="#c9b796" />
      <path d={faceAlong(road, WALL_X, 3, 240, 0, 0.22)} fill="#b9a585" />
      <path d={rects(posts)} fill="#d8c7a6" />
    </g>
  )
}

const yelahanka: SceneDef = {
  id: 'yelahanka',
  title: 'Yelahanka',
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
              [0, '#4a82c0'],
              [0.3, '#78a6d2'],
              [0.58, '#b6cfdf'],
              [0.84, '#ebe2c6'],
              [1, '#f6e6c2'],
            ]}
            sun={{ x: 1360, y: 130, r: 20, color: '#fffbe8', glow: 9, halo: '#fff0c4' }}
          />
          <Clouds seed={71} y={470} count={3} x0={-180} x1={520} color="#fffaf0" opacity={0.9} scale={1.05} />
          <Clouds seed={74} y={480} count={3} x0={1100} x1={1780} color="#fff8ea" opacity={0.9} scale={1.1} />
          <Clouds seed={77} y={300} count={2} x0={1180} x1={1720} color="#ffffff" opacity={0.55} scale={0.8} />
          <Clouds seed={79} y={70} count={3} x0={560} x1={1140} color="#ffffff" opacity={0.3} scale={0.9} />
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
          <defs>
            <linearGradient id="yelGrass" x1="0" y1="560" x2="0" y2="1000" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#aab47e" />
              <stop offset="0.3" stopColor="#8e9e59" />
              <stop offset="1" stopColor="#6e8640" />
            </linearGradient>
          </defs>
          <Ground color="#78904a" far="#b7bc8c" />
          <LakeWater />
          <path d={stripAlong(road, FP_OUT, WALL_X + 40, 2, ZFAR)} fill="url(#yelGrass)" />
          <LeftBank />
          <RoadSurface road={road} zFar={ZFAR} />
          <Shadows
            pts={[
              ...LEFT_TREES.map((t) => ({ X: t.X, Z: t.Z, R: t.h * 0.36 })),
              ...RIGHT_TREES.map((t) => ({ X: t.X, Z: t.Z, R: t.h * (t.kind === 'round' ? 0.36 : 0.55) })),
            ]}
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
          <FarShore />
          <Haze y={566} h={30} color="#eef1e6" opacity={0.55} />
          <Aircraft x={700} y={410} k={0.9} />
        </g>
      ),
    },
    {
      id: 'lake-life',
      band: 'back',
      depth: 0.3,
      render: () => {
        const e1 = roadPoint(road, BANK_X - 2.2, 22)
        const e2 = roadPoint(road, BANK_X - 3.0, 25)
        return (
          <g>
            <Egret x={e1.x} y={e1.y + 0.7 * e1.s} s={e1.s} />
            <Egret x={e2.x} y={e2.y + 0.7 * e2.s} s={e2.s} flip />
          </g>
        )
      },
    },
    {
      id: 'new-town',
      band: 'front',
      depth: 0.55,
      render: () => (
        <g>
          {/* New Town's own canopy behind the houses */}
          <CanopyBand x0={880} x1={1800} y={548} h={30} w={46} seed={17} color="#6f8a55" light="#b9bf80" lightOpacity={0.4} bottom={570} />
          <CanopyBand x0={1250} x1={1800} y={540} h={46} w={64} seed={19} color="#5f7b48" light="#b4ba78" lightOpacity={0.4} bottom={570} />
          {HOUSES.map((hs, i) => {
            const p = roadPoint(road, WALL_X + hs.X + hs.w / 2, hs.Z)
            return hs.kind === 'bungalow' ? (
              <Bungalow key={i} x={p.x} y={p.y} s={p.s} w={hs.w} h={hs.h} wall={hs.c} seed={310 + i} compound={false} shutter="#4f7a6a" />
            ) : (
              <Building key={i} x={p.x} y={p.y} s={p.s} w={hs.w} h={hs.h} color={hs.c} side="left" depth={7} tanks={hs.t} seed={300 + i} trim={shade(hs.c, -0.18)} />
            )
          })}
          {[
            { Z: 30, X: 1.6, h: 10 },
            { Z: 75, X: 2.2, h: 11 },
          ].map((pm, i) => {
            const p = roadPoint(road, WALL_X + pm.X, pm.Z)
            return <Palm key={`pm${i}`} x={p.x} y={p.y} s={p.s} h={pm.h} seed={80 + i} lean={0.08} />
          })}
          <CompoundWall />
        </g>
      ),
    },
    {
      id: 'verge',
      band: 'front',
      depth: 0.8,
      render: () => {
        const walkers = [
          { X: -FP_OUT + 0.7, Z: 17, v: 'woman' as const, flip: false, c: ['#c96b3a', '#c96b3a'] as [string, string] },
          { X: -FP_OUT + 1.2, Z: 17.6, v: 'man' as const, flip: false, c: ['#f2e6cf', '#3a5a7a'] as [string, string] },
          { X: -FP_OUT + 0.9, Z: 44, v: 'man' as const, flip: true, c: ['#3a5a7a', '#e5d3b3'] as [string, string] },
        ]
        const lamps = [24, 48, 86].map((Z) => roadPoint(road, -FP_OUT + 0.35, Z))
        return (
          <g>
            {LEFT_TREES.map((t, i) => {
              const p = roadPoint(road, t.X, t.Z)
              return <RoundTree key={`l${i}`} x={p.x} y={p.y} s={p.s} h={t.h} seed={t.seed} colors={{ leaf: '#5d7a40', dark: '#3a5230', light: '#bcc072' }} />
            })}
            {walkers.map((w, i) => {
              const p = roadPoint(road, w.X, w.Z)
              return <Person key={`p${i}`} x={p.x} y={p.y} s={p.s} variant={w.v} flip={w.flip} seed={60 + i} colors={w.c} />
            })}
            {lamps.map((p, i) => (
              <Lamp key={`m${i}`} x={p.x} y={p.y} s={p.s} h={8} arm="right" />
            ))}
            {RIGHT_TREES.map((t, i) => {
              const p = roadPoint(road, t.X, t.Z)
              const c = { leaf: '#557a3c', dark: '#34502c', light: '#bcc070' }
              if (t.kind === 'round') return <RoundTree key={`r${i}`} x={p.x} y={p.y} s={p.s} h={t.h} seed={t.seed} colors={{ leaf: '#5d7a40', dark: '#3a5230', light: '#bcc072' }} />
              return <RainTree key={`r${i}`} x={p.x} y={p.y} s={p.s} h={t.h} spread={t.kind === 'tulip' ? 0.62 : 0.85} seed={t.seed} colors={c} flowers={t.kind === 'tulip' ? PAL.tulipOrange : undefined} />
            })}
          </g>
        )
      },
    },
    {
      id: 'fore',
      band: 'fore',
      depth: 1.2,
      render: () => (
        <g transform="translate(300 40)">
          <FgFoliage side="right" size={0.65} color="#355129" seed={63} />
        </g>
      ),
    },
  ],
}

export default yelahanka
