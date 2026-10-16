import type { SceneDef } from '../types'
import { ROAD_DEFAULT, proj, roadPoint, roadCenterX, shade, type RoadStyle } from '../world'
import { Clouds, Haze, Ground, RoadSurface, Lamp, Person, PandalGate, ParkedAuto, FgFoliage, Birds, PAL } from '../kit'
import { f1, rects, stripAlong, faceAlong, MultiSky, CanopyBand, AvenueTree, ellipsePath } from './_north-helpers'

/**
 * RT Nagar & Palace Grounds: warm golden hour on a wide rain-tree road that sweeps right along the long cream
 * compound wall of Palace Grounds. Where the road turns, the wall faces us with its big event-ground gate; a
 * restrained pandal gate glows set back inside the ground behind it, and beyond the grounds' trees Bangalore
 * Palace's grey Tudor turrets and battlements are glimpsed. RT Nagar's low blocks line the right side.
 */
const road: RoadStyle = {
  ...ROAD_DEFAULT,
  halfWidth: 5.0,
  asphalt: '#5c534c',
  asphaltFar: '#b59c85',
  center: 'dashed',
  kerb: 'bw',
  footpath: 2.0,
  footpathColor: '#c6b093',
  verge: '#7b8450',
  bend: 8,
  bendStart: 18,
}
const HW = road.halfWidth
const FP = HW + 0.2 + road.footpath
const WALL_X = -(FP + 0.4)
const GATE = { z0: 38, z1: 46 }
const ZFAR = 160

/* ------------------------------------------------------------ Bangalore Palace (glimpsed) */

/** grey granite, Tudor turrets with battlements; seen ~190 m away beyond the grounds, mostly hidden by trees */
function Palace() {
  const Z = 160
  const s = 440 / Z
  const base = proj(-47, 0, Z)
  const P = (dx: number, dy: number) => ({ x: base.x + dx * s, y: base.y - dy * s })
  const R = (x0: number, y0: number, x1: number, y1: number): [number, number, number, number] => {
    const a = P(x0, y1)
    const b = P(x1, y0)
    return [a.x, a.y, b.x - a.x, b.y - a.y]
  }
  const crenel = (x0: number, x1: number, y: number, t = 1.1) => {
    const out: [number, number, number, number][] = []
    for (let x = x0; x < x1 - t * 0.5; x += t * 2) out.push(R(x, y, x + t, y + t))
    return out
  }
  const towers = [
    { cx: -36, w: 6.5, h: 26 },
    { cx: -15, w: 5.5, h: 31 },
    { cx: 15, w: 5.5, h: 31 },
    { cx: 36, w: 6.5, h: 25 },
  ]
  const body = rects([
    R(-36, 0, 36, 16),
    R(-12, 0, 12, 22),
    ...towers.map((t) => R(t.cx - t.w / 2, 0, t.cx + t.w / 2, t.h)),
    ...towers.flatMap((t) => crenel(t.cx - t.w / 2 - 0.3, t.cx + t.w / 2 + 0.3, t.h, 0.85)),
    ...crenel(-36, 36, 16),
    ...crenel(-12, 12, 22),
  ])
  const sunlit = rects([...towers.map((t) => R(t.cx + t.w * 0.05, 0, t.cx + t.w / 2, t.h)), R(4, 0, 12, 22), R(22, 0, 36, 16)])
  let wins = ''
  const arch = (x: number, y: number, w: number, h: number) => {
    const a = P(x, y + h)
    const b = P(x + w, y)
    return `M${f1(a.x)} ${f1(b.y)}V${f1(a.y + w * 0.5 * s)}L${f1((a.x + b.x) / 2)} ${f1(a.y)}L${f1(b.x)} ${f1(a.y + w * 0.5 * s)}V${f1(b.y)}Z`
  }
  for (let x = -33; x < 34; x += 4.2) if (Math.abs(x) > 13) wins += arch(x, 9, 1.5, 3.2)
  for (const x of [-8, -2.6, 2.8]) wins += arch(x, 14, 1.9, 4.2)
  for (const t of towers) wins += arch(t.cx - 0.7, t.h - 7, 1.4, 3)
  return (
    <g>
      <path d={body} fill="#aba08f" />
      <path d={sunlit} fill="#e3cba6" opacity="0.8" />
      <path d={rects([R(-36, 15.3, 36, 15.8), R(-12, 21.3, 12, 21.8)])} fill="#7f776d" opacity="0.6" />
      <path d={wins} fill="#5d5650" opacity="0.75" />
    </g>
  )
}

/* ------------------------------------------------------------ Palace Grounds wall and gate */

function GroundsWall() {
  const segs = [
    [2, GATE.z0 - 0.6],
    [GATE.z1 + 0.6, 120],
  ]
  let wall = ''
  let coping = ''
  let plinth = ''
  let pil = ''
  for (const [a, b] of segs) {
    wall += faceAlong(road, WALL_X, a, b, 0, 2.5, 1.04)
    coping += faceAlong(road, WALL_X, a, b, 2.5, 2.72, 1.04)
    plinth += faceAlong(road, WALL_X, a, b, 0, 0.32, 1.04)
    for (let z = a + 1.2; z < b - 0.5; z += Math.max(3.4, z / 4)) pil += faceAlong(road, WALL_X + 0.03, z, z + 0.5, 0, 2.82, 1.5)
  }
  return (
    <g>
      <path d={wall} fill="#f0e0c0" />
      <path d={plinth} fill="#c9b08a" />
      <path d={pil} fill="#e4cfa8" />
      <path d={coping} fill="#b8643f" />
    </g>
  )
}

/** event-ground gate: two tall square piers with lamp finials, an arched board and open iron gates */
function GroundsGate() {
  const a = GATE.z0
  const b = GATE.z1
  const pw = 1.2
  const H = 5.2
  const pier = (z0: number) => faceAlong(road, WALL_X + 0.05, z0, z0 + pw, 0, H, 1.3)
  const pierBand = (z0: number) => faceAlong(road, WALL_X + 0.06, z0, z0 + pw, H - 0.9, H - 0.6, 1.3)
  const cap = (z0: number) => faceAlong(road, WALL_X + 0.08, z0 - 0.25, z0 + pw + 0.25, H, H + 0.4, 1.3)
  // arched board across the opening
  const N = 14
  const top: { x: number; y: number }[] = []
  const bot: { x: number; y: number }[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const z = a + pw + (b - a - 2 * pw) * t
    const lift = Math.sin(t * Math.PI) * 0.9
    top.push(proj(roadCenterX(road, z) + WALL_X, H - 0.4 + lift, z))
    bot.push(proj(roadCenterX(road, z) + WALL_X, H - 1.05 + lift, z))
  }
  const board = 'M' + [...top, ...bot.reverse()].map((p) => `${f1(p.x)} ${f1(p.y)}`).join('L') + 'Z'
  // swung-open iron gate leaves
  let bars = ''
  for (let z = a + pw + 0.25; z < a + pw + 2.1; z += 0.3) bars += faceAlong(road, WALL_X - 0.2 - (z - a - pw) * 0.9, z, z + 0.06, 0, 2.3, 2)
  for (let z = b - pw - 2.1; z < b - pw - 0.25; z += 0.3) bars += faceAlong(road, WALL_X - 0.2 - (b - pw - z) * 0.9, z, z + 0.06, 0, 2.3, 2)
  const f0 = proj(roadCenterX(road, a + pw / 2) + WALL_X, H + 0.75, a + pw / 2)
  const f1p = proj(roadCenterX(road, b - pw / 2) + WALL_X, H + 0.75, b - pw / 2)
  const s0 = 440 / a
  const s1 = 440 / b
  return (
    <g>
      <path d={bars} fill="#3a3632" opacity="0.7" />
      <path d={pier(a) + pier(b - pw)} fill="#ecdab6" />
      <path d={pierBand(a) + pierBand(b - pw)} fill="#c9a979" />
      <path d={cap(a) + cap(b - pw)} fill="#b8643f" />
      <path d={ellipsePath(f0.x, f0.y, 0.32 * s0, 0.4 * s0) + ellipsePath(f1p.x, f1p.y, 0.32 * s1, 0.4 * s1)} fill="#f7e6b8" />
      <path d={board} fill="#6c2a2a" />
    </g>
  )
}

/** inside the ground, behind the gate: the pandal, set back on the open ground, with a couple of event tents */
function GroundsInside() {
  // a point in the grounds roughly behind the gate opening, some 30 m in
  const gz = (GATE.z0 + GATE.z1) / 2
  const gx = roadCenterX(road, gz) + WALL_X
  const pZ = gz + 34
  const pX = gx * (pZ / gz) + 4
  const p = proj(pX, 0, pZ)
  const ps = 440 / pZ
  const tents = [
    { X: pX + 14, Z: pZ + 4, w: 8 },
  ]
  return (
    <g>
      {tents.map((t, i) => {
        const q = proj(t.X, 0, t.Z)
        const s = 440 / t.Z
        const w = (t.w / 2) * s
        return (
          <g key={i}>
            <path d={`M${f1(q.x - w)} ${f1(q.y)}V${f1(q.y - 2.4 * s)}L${f1(q.x)} ${f1(q.y - 4 * s)}L${f1(q.x + w)} ${f1(q.y - 2.4 * s)}V${f1(q.y)}Z`} fill="#f4e9d6" />
            <path d={`M${f1(q.x)} ${f1(q.y - 4 * s)}L${f1(q.x + w)} ${f1(q.y - 2.4 * s)}V${f1(q.y)}H${f1(q.x)}Z`} fill="#fff8ea" opacity="0.7" />
            <rect x={q.x - w} y={q.y - 2.4 * s} width={w * 2} height={0.35 * s} fill="#c0473a" opacity="0.85" />
          </g>
        )
      })}
      <PandalGate x={p.x} y={p.y} s={ps} w={10} h={7.5} />
    </g>
  )
}

/* ------------------------------------------------------------ right side: RT Nagar blocks */

function RightBlocks() {
  const blocks = [
    { Z: 74, w: 13, h: 12.5, c: '#efe1c7' },
    { Z: 56, w: 12, h: 9.5, c: '#e4c7a7' },
    { Z: 42, w: 12, h: 12.5, c: '#ecdcc0' },
    { Z: 30, w: 11, h: 9.4, c: '#e9cfae' },
  ]
  return (
    <g>
      {blocks.map((b, i) => {
        const X = FP + 4.5
        const p = roadPoint(road, X + b.w / 2, b.Z)
        const s = p.s
        const x0 = p.x - (b.w / 2) * s
        const top = p.y - b.h * s
        const wins: [number, number, number, number][] = []
        for (let f = 0; f < Math.floor(b.h / 3.1); f++) for (let c = 0; c < Math.floor(b.w / 2.8); c++) wins.push([x0 + (c + 0.35) * 2.8 * s, p.y - (f + 1) * 3.1 * s + 0.9 * s, 1.0 * s, 1.25 * s])
        const balc = Array.from({ length: Math.floor(b.h / 3.1) - 1 }).map((_, f) => [x0 + 0.4 * s, p.y - (f + 2) * 3.1 * s + 2.1 * s, (b.w - 0.8) * s, 0.7 * s] as [number, number, number, number])
        return (
          <g key={i}>
            <path d={faceAlong(road, X, b.Z - 9, b.Z, 0, b.h, 1.2)} fill={shade(b.c, -0.22)} />
            <rect x={x0} y={top} width={b.w * s} height={b.h * s} fill={b.c} />
            <path d={rects(wins)} fill={shade(b.c, -0.45)} opacity="0.75" />
            <path d={rects(balc)} fill={shade(b.c, 0.12)} />
            <rect x={x0 + b.w * s * 0.68} y={top} width={b.w * s * 0.32} height={b.h * s} fill="#fff1d2" opacity="0.22" />
            <rect x={x0 + b.w * s * 0.3} y={top - 1.6 * s} width={1.3 * s} height={1.4 * s} rx={0.15 * s} fill={PAL.tank} />
            <rect x={x0 - 0.15 * s} y={top - 0.3 * s} width={b.w * s + 0.3 * s} height={0.35 * s} fill={shade(b.c, -0.15)} />
          </g>
        )
      })}
    </g>
  )
}

const LEAF = { leaf: '#56713c', dark: '#34492a', light: '#c9ba68' }
const LEAF_SUN = { leaf: '#68823f', dark: '#3e5530', light: '#dcc672' }

const rtNagar: SceneDef = {
  id: 'rt-nagar-palace-grounds',
  title: 'RT Nagar & Palace Grounds',
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
              [0, '#9db2c4'],
              [0.2, '#d2c5b4'],
              [0.42, '#f1cf9c'],
              [0.75, '#f8d498'],
              [1, '#fae0ae'],
            ]}
            sun={{ x: 1250, y: 448, r: 22, color: '#fff1cc', glow: 11, halo: '#ffcd82' }}
          />
          <Clouds seed={21} y={90} count={3} x0={-160} x1={420} color="#fde5c8" opacity={0.55} scale={1.1} />
          <Clouds seed={23} y={250} count={3} x0={1120} x1={1760} color="#fcd9ae" opacity={0.5} scale={1.0} />
          <Birds x={1080} y={360} count={4} s={1} seed={11} color="#6a4a3a" />
        </g>
      ),
    },
    {
      id: 'palace',
      band: 'back',
      depth: 0.25,
      render: () => (
        <g>
          <CanopyBand x0={-200} x1={1800} y={566} h={30} w={44} seed={41} color="#8d8c58" light="#e0c584" lightOpacity={0.4} bottom={575} />
          <Palace />
          {/* the grounds' own trees hide the palace's lower floors */}
          <CanopyBand x0={-200} x1={1250} y={566} h={40} w={50} seed={45} color="#71804b" light="#d6c27c" lightOpacity={0.45} bottom={578} />
          <CanopyBand x0={600} x1={690} y={568} h={58} w={44} seed={49} color="#677a45" light="#d2c07a" lightOpacity={0.45} bottom={580} />
          <Haze y={570} h={46} color="#f7d6a2" opacity={0.5} />
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
          <Ground color="#c2aa82" far="#dcc49a" />
          <path d={stripAlong(road, FP, FP + 80, 2, 140)} fill="#8f8a58" />
          <RoadSurface road={road} zFar={ZFAR} />
        </g>
      ),
    },
    {
      id: 'grounds',
      band: 'back',
      depth: 0.4,
      render: () => (
        <g>
          {/* the grounds' big trees standing behind the long wall */}
          <CanopyBand x0={-200} x1={600} y={520} h={64} w={70} seed={47} color="#6a7d45" light="#d2c27a" lightOpacity={0.45} bottom={640} />
          <GroundsInside />
        </g>
      ),
    },
    {
      id: 'street',
      band: 'front',
      depth: 0.6,
      render: () => (
        <g>
          <RightBlocks />
          <GroundsWall />
          <GroundsGate />
          {[56, 78].map((Z, i) => (
            <AvenueTree key={`fl${i}`} road={road} X={WALL_X + 2.0} Z={Z} h={13} crown={1.0} lean={0.1} seed={30 + i} {...LEAF} />
          ))}
          {[28, 50].map((Z, i) => (
            <AvenueTree key={`fr${i}`} road={road} X={FP + 2.0} Z={Z} h={12.5} crown={1.0} lean={-0.2} seed={40 + i} {...LEAF_SUN} />
          ))}
          <Lamp {...roadPoint(road, FP + 0.4, 36)} h={8} arm="left" />
          <ParkedAuto {...roadPoint(road, HW - 1.1, 52)} />
          <Person {...roadPoint(road, WALL_X + 1.0, 34)} variant="lalpaar" seed={11} />
          <Person {...roadPoint(road, WALL_X + 1.6, 34.8)} variant="man" seed={12} colors={['#f2e6cf', '#e5d3b3']} />
          <Person {...roadPoint(road, WALL_X + 1.3, 30)} variant="kid" seed={13} flip />
          <Person {...roadPoint(road, FP - 0.9, 24)} variant="woman" seed={14} flip />
        </g>
      ),
    },
    {
      id: 'near',
      band: 'front',
      depth: 0.85,
      render: () => (
        <g>
          <Lamp {...roadPoint(road, WALL_X + 0.6, 12)} h={8} arm="right" />
          <AvenueTree road={road} X={FP + 2.0} Z={21} h={10.5} crown={0.9} lean={-0.3} seed={52} {...LEAF} flowers={PAL.tulipOrange} />
          <AvenueTree road={road} X={FP + 2.6} Z={7} h={15} crown={0.9} lean={0.25} seed={53} {...LEAF_SUN} />
        </g>
      ),
    },
    {
      id: 'fore',
      band: 'fore',
      depth: 1.2,
      render: () => (
        <g transform="translate(330 60)">
          <FgFoliage side="right" size={0.6} color="#34492a" seed={57} />
        </g>
      ),
    },
  ],
}

export default rtNagar
