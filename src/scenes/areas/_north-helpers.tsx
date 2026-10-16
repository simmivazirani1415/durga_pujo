/**
 * Small geometry helpers shared by the north/central scenes (hero, Yelahanka, Malleswaram, Palace Grounds,
 * Ulsoor, Indiranagar). Everything here builds on ../world and draws in the shared 1600 x 1000 viewBox.
 * Many same-coloured shapes are merged into one <path> to keep SVG element counts low.
 */
import { useId, type ReactNode } from 'react'
import { proj, roadCenterX, rng, mix, shade, F, type Pt, type RoadStyle } from '../world'

export const f1 = (n: number) => (Math.round(n * 10) / 10).toString()

/** geometric samples from Z0 to Z1 (inclusive) */
export function zRange(Z0: number, Z1: number, k = 1.08): number[] {
  const zs: number[] = []
  for (let z = Z0; z < Z1; z *= k) zs.push(z)
  zs.push(Z1)
  return zs
}

/** closed polygon path from points */
export function poly(p: Pt[]): string {
  return 'M' + p.map((q) => `${f1(q.x)} ${f1(q.y)}`).join('L') + 'Z'
}

/** path data for many axis-aligned rectangles: merge into one <path> */
export function rects(list: [number, number, number, number][]): string {
  return list.map(([x, y, w, h]) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}Z`).join('')
}

/** a vertical face standing along the road at lateral X (m from the road centre), between heights Y0..Y1 */
export function faceAlong(road: Pick<RoadStyle, 'bend' | 'bendStart'>, X: number, Z0: number, Z1: number, Y0: number, Y1: number, k = 1.07): string {
  const zs = zRange(Z0, Z1, k)
  const top = zs.map((z) => proj(roadCenterX(road, z) + X, Y1, z))
  const bot = zs.map((z) => proj(roadCenterX(road, z) + X, Y0, z)).reverse()
  return poly([...top, ...bot])
}

/** a flat strip on the ground (or at height Y) between lateral X0..X1 */
export function stripAlong(road: Pick<RoadStyle, 'bend' | 'bendStart'>, X0: number, X1: number, Z0: number, Z1: number, Y = 0, k = 1.07): string {
  const zs = zRange(Z0, Z1, k)
  const a = zs.map((z) => proj(roadCenterX(road, z) + X0, Y, z))
  const b = zs.map((z) => proj(roadCenterX(road, z) + X1, Y, z)).reverse()
  return poly([...a, ...b])
}

/** railing along the road edge: posts every `step` m plus two rails; one path per colour */
export function Railing({
  road,
  X,
  Z0,
  Z1,
  step = 2,
  h = 1.0,
  post = '#3d4038',
  rail = '#4a4d44',
}: {
  road: Pick<RoadStyle, 'bend' | 'bendStart'>
  X: number
  Z0: number
  Z1: number
  step?: number
  h?: number
  post?: string
  rail?: string
}) {
  const posts: [number, number, number, number][] = []
  for (let z = Z0; z <= Z1; z += step * Math.max(1, z / 18)) {
    const b = proj(roadCenterX(road, z) + X, 0, z)
    const s = F / z
    posts.push([b.x - Math.max(0.6, 0.06 * s), b.y - h * s, Math.max(1.2, 0.12 * s), h * s])
  }
  return (
    <g>
      <path d={faceAlong(road, X, Z0, Z1, h - 0.08, h)} fill={rail} />
      <path d={faceAlong(road, X, Z0, Z1, h * 0.5 - 0.04, h * 0.5 + 0.03)} fill={rail} opacity="0.85" />
      <path d={rects(posts)} fill={post} />
    </g>
  )
}

/** soft radial glow (warm lights at dusk) */
export function Glow({ x, y, r, color = '#ffd27a', opacity = 0.6 }: { x: number; y: number; r: number; color?: string; opacity?: number }) {
  const id = useId().replace(/:/g, '')
  return (
    <g>
      <defs>
        <radialGradient id={`gw${id}`}>
          <stop offset="0" stopColor={color} stopOpacity={opacity} />
          <stop offset="0.45" stopColor={color} stopOpacity={opacity * 0.35} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={x} cy={y} r={r} fill={`url(#gw${id})`} />
    </g>
  )
}

/**
 * Sky with any number of gradient stops (the kit Sky mixes top and mid linearly, which greys blue into peach).
 * stops: [offset 0..1 over y = -200..yEnd, colour]. Optional sun disc with soft glow.
 */
export function MultiSky({ stops, yEnd = 600, sun }: { stops: [number, string][]; yEnd?: number; sun?: { x: number; y: number; r: number; color?: string; glow?: number; halo?: string } }) {
  const id = useId().replace(/:/g, '')
  return (
    <g>
      <defs>
        <linearGradient id={`ms${id}`} x1="0" y1={-200} x2="0" y2={yEnd} gradientUnits="userSpaceOnUse">
          {stops.map(([o, c], i) => (
            <stop key={i} offset={o} stopColor={c} />
          ))}
        </linearGradient>
        {sun && (
          <radialGradient id={`msun${id}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={sun.color ?? '#fff3cf'} stopOpacity="0.95" />
            <stop offset="0.16" stopColor={sun.halo ?? '#ffe2a2'} stopOpacity="0.7" />
            <stop offset="0.45" stopColor={sun.halo ?? '#ffd38a'} stopOpacity="0.22" />
            <stop offset="1" stopColor={sun.halo ?? '#ffd38a'} stopOpacity="0" />
          </radialGradient>
        )}
      </defs>
      <rect x="-200" y="-200" width="2000" height={yEnd + 400} fill={`url(#ms${id})`} />
      {sun && <circle cx={sun.x} cy={sun.y} r={sun.r * (sun.glow ?? 7)} fill={`url(#msun${id})`} />}
      {sun && sun.r > 0 && <circle cx={sun.x} cy={sun.y} r={sun.r} fill={sun.color ?? '#fff6dc'} opacity="0.95" />}
    </g>
  )
}

/** vertical linear gradient helper; returns [defs node, url] */
export function useVGrad(stops: [number, string, number?][], y1?: number, y2?: number): [ReactNode, string] {
  const id = 'vg' + useId().replace(/:/g, '')
  const user = y1 !== undefined && y2 !== undefined
  return [
    <defs key="d">
      <linearGradient id={id} x1="0" y1={user ? y1 : 0} x2="0" y2={user ? y2 : 1} gradientUnits={user ? 'userSpaceOnUse' : 'objectBoundingBox'}>
        {stops.map(([o, c, op], i) => (
          <stop key={i} offset={o} stopColor={c} stopOpacity={op ?? 1} />
        ))}
      </linearGradient>
    </defs>,
    `url(#${id})`,
  ]
}

/**
 * Canopy mass seen from street level: a band of rounded crowns between screen x0..x1, base at y, crowns up to h units tall.
 * Two paths (body + sunlit caps on the right). Cheap way to draw a far bank of trees.
 */
export function CanopyBand({
  x0,
  x1,
  y,
  h,
  w = 40,
  seed = 1,
  color = '#5b7444',
  light = '#a3ad62',
  lightOpacity = 0.5,
  bottom,
}: {
  x0: number
  x1: number
  y: number
  h: number
  w?: number
  seed?: number
  color?: string
  light?: string
  lightOpacity?: number
  bottom?: number
}) {
  const r = rng(seed)
  const yb = bottom ?? y + 30
  let d = `M${f1(x0)} ${f1(yb)}L${f1(x0)} ${f1(y)}`
  let hl = ''
  let x = x0
  while (x < x1) {
    const ww = w * (0.6 + r() * 0.8)
    const hh = h * (0.55 + r() * 0.45)
    const yv = y - hh * (0.15 + r() * 0.25)
    const ry = yv - (y - hh)
    d += `L${f1(x)} ${f1(yv)}A${f1(ww / 2)} ${f1(ry)} 0 0 1 ${f1(x + ww)} ${f1(yv)}`
    const yh = y - hh + ry * 0.6
    hl += `M${f1(x + ww * 0.34)} ${f1(yh)}A${f1(ww * 0.28)} ${f1(ry * 0.48)} 0 0 1 ${f1(x + ww * 0.9)} ${f1(yh)}Z`
    x += ww * 0.82
  }
  d += `L${f1(x)} ${f1(yb)}Z`
  return (
    <g>
      <path d={d} fill={color} />
      <path d={hl} fill={light} opacity={lightOpacity} />
    </g>
  )
}

function ell(cx: number, cy: number, rx: number, ry: number) {
  return `M${f1(cx - rx)} ${f1(cy)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(rx * 2)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-rx * 2)} 0Z`
}
export { ell as ellipsePath }

/**
 * Rain tree for avenues, drawn in ~7 SVG elements (merged paths) so a street can carry many of them.
 * Standing at lateral X (m from the road centre, following any bend) and distance Z. h = height (m),
 * crown = crown width factor, lean = how far the crown leans over (+ right, - left), in crown half-widths.
 */
export function AvenueTree({
  road = {},
  X,
  Z,
  h = 12,
  crown = 1,
  lean = 0,
  seed = 1,
  leaf = '#4f6b3a',
  dark = '#2f4429',
  light = '#a9ab60',
  trunk = '#5a4334',
  flowers,
  lightOpacity = 0.55,
}: {
  road?: Pick<RoadStyle, 'bend' | 'bendStart'>
  X: number
  Z: number
  h?: number
  crown?: number
  lean?: number
  seed?: number
  leaf?: string
  dark?: string
  light?: string
  trunk?: string
  flowers?: string
  lightOpacity?: number
}) {
  const r = rng(seed)
  const base = proj(roadCenterX(road, Z) + X, 0, Z)
  const s = F / Z
  const H = h * s
  const R = h * 0.55 * crown * s
  const cx = base.x + lean * R * 0.9
  const cy = base.y - H * 0.76
  const ry = H * 0.2
  const fy = base.y - H * 0.36
  const tw = Math.max(1.2, (0.35 + h * 0.025) * s)
  const tx = base.x + (cx - base.x) * 0.25
  const trunkD = `M${f1(base.x - tw * 1.3)} ${f1(base.y)}C${f1(base.x - tw * 0.8)} ${f1(base.y - H * 0.08)} ${f1(tx - tw * 0.7)} ${f1(fy + H * 0.1)} ${f1(tx - tw * 0.6)} ${f1(fy)}L${f1(tx + tw * 0.6)} ${f1(fy)}C${f1(tx + tw * 0.7)} ${f1(fy + H * 0.1)} ${f1(base.x + tw * 0.8)} ${f1(base.y - H * 0.08)} ${f1(base.x + tw * 1.3)} ${f1(base.y)}Z`
  const trunkLit = `M${f1(base.x + tw * 0.15)} ${f1(base.y)}C${f1(base.x + tw * 0.25)} ${f1(base.y - H * 0.08)} ${f1(tx + tw * 0.1)} ${f1(fy + H * 0.1)} ${f1(tx + tw * 0.15)} ${f1(fy)}L${f1(tx + tw * 0.6)} ${f1(fy)}C${f1(tx + tw * 0.7)} ${f1(fy + H * 0.1)} ${f1(base.x + tw * 0.8)} ${f1(base.y - H * 0.08)} ${f1(base.x + tw * 1.3)} ${f1(base.y)}Z`
  let limbs = ''
  for (const [dx, k] of [
    [-0.75, 0.7],
    [-0.3, 0.85],
    [0.25, 0.85],
    [0.7, 0.7],
  ] as const) {
    const ex = cx + dx * R
    const ey = cy + ry * 0.55
    const w = tw * 0.55 * k
    limbs += `M${f1(tx - w)} ${f1(fy + w)}Q${f1(tx + (ex - tx) * 0.35 - w)} ${f1(fy - H * 0.12)} ${f1(ex)} ${f1(ey)}Q${f1(tx + (ex - tx) * 0.35 + w)} ${f1(fy - H * 0.1)} ${f1(tx + w)} ${f1(fy - w)}Z`
  }
  let dk = ell(cx, cy + ry * 0.2, R * 0.92, ry * 0.85)
  let md = ''
  let lt = ''
  let fl = ''
  const n = 15
  for (let i = 0; i < n; i++) {
    const t = Math.PI * (1 - i / (n - 1))
    const c = Math.cos(t)
    const lr = H * (0.07 + r() * 0.045)
    const lx = cx + c * R * (0.86 + r() * 0.08)
    const ly = cy - Math.sin(t) * ry * (0.9 + r() * 0.3) + ry * 0.25
    if (c < -0.2) dk += ell(lx, ly, lr * 1.15, lr * 0.85)
    else md += ell(lx, ly, lr * 1.15, lr * 0.85)
    if (c > -0.45) lt += ell(lx + lr * 0.3, ly - lr * 0.35, lr * 0.62, lr * 0.42)
    if (flowers && i > 1 && i < n - 2 && r() < 0.7) fl += ell(lx + (r() - 0.5) * lr, ly - lr * 0.5, Math.max(0.9, H * 0.012), Math.max(0.9, H * 0.011))
  }
  for (let i = 0; i < 9; i++) {
    const lx = cx + (r() - 0.5) * R * 1.5
    const ly = cy + (r() - 0.65) * ry
    const lr = H * (0.08 + r() * 0.05)
    md += ell(lx, ly, lr * 1.2, lr * 0.8)
  }
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    const lr = H * (0.055 + r() * 0.035)
    dk += ell(cx - R * 0.82 + t * R * 1.64, cy + ry * (0.55 + Math.sin(t * Math.PI) * 0.25), lr * 1.2, lr * 0.8)
  }
  return (
    <g>
      <path d={trunkD} fill={trunk} />
      <path d={trunkLit} fill={shade(trunk, 0.18)} opacity="0.6" />
      <path d={limbs} fill={trunk} />
      <path d={dk} fill={dark} />
      <path d={md} fill={leaf} />
      <path d={lt} fill={light} opacity={lightOpacity} />
      {fl && <path d={fl} fill={flowers} />}
    </g>
  )
}

export { mix, shade, rng }
