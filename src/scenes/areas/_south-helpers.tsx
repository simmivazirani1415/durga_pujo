/**
 * Helpers for the east / south scenes (Whitefield & Hoodi, Koramangala, HSR Layout, South-East, South, finale).
 * Everything builds on ../world and draws in the shared 1600 x 1000 viewBox. Same-coloured shapes are merged
 * into single <path>s so the scenes stay light (each scene well under ~1500 SVG elements).
 */
import { useId, type ReactNode } from 'react'
import { F, HORIZON, VPX, proj, roadCenterX, rng, mix, shade, type Pt, type RoadStyle } from '../world'
import { PAL } from '../kit'

export { mix, shade, rng }

export const f1 = (n: number) => (Math.round(n * 10) / 10).toString()
export type RoadGeo = Pick<RoadStyle, 'bend' | 'bendStart'>
export const STRAIGHT: RoadGeo = {}

/** a stable id for gradients inside one component */
export function useUid(): string {
  return useId().replace(/:/g, '')
}

/** screen point of (X, Y, Z) where X is measured from the (possibly bending) road centre */
export function rp(road: RoadGeo, X: number, Y: number, Z: number): Pt {
  return proj(roadCenterX(road, Z) + X, Y, Z)
}

export function poly(p: Pt[]): string {
  return 'M' + p.map((q) => `${f1(q.x)} ${f1(q.y)}`).join('L') + 'Z'
}
export function rectD(x: number, y: number, w: number, h: number): string {
  return `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}Z`
}
export function circD(cx: number, cy: number, r: number): string {
  return `M${f1(cx - r)} ${f1(cy)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0Z`
}
export function ellD(cx: number, cy: number, rx: number, ry: number): string {
  return `M${f1(cx - rx)} ${f1(cy)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0Z`
}

export function zRange(Z0: number, Z1: number, k = 1.06): number[] {
  const zs: number[] = []
  for (let z = Z0; z < Z1; z *= k) zs.push(z)
  zs.push(Z1)
  return zs
}

/** vertical plane standing at lateral X (m from the road centre) between Z0..Z1 and heights Y0..Y1 */
export function planeAlong(road: RoadGeo, X: number, Z0: number, Z1: number, Y0: number, Y1: number, k = 1.06): string {
  const zs = road.bend ? zRange(Z0, Z1, k) : [Z0, Z1]
  const top = zs.map((z) => rp(road, X, Y1, z))
  const bot = zs.map((z) => rp(road, X, Y0, z)).reverse()
  return poly([...top, ...bot])
}

/** flat strip at height Y between lateral X0..X1 */
export function stripAlong(road: RoadGeo, X0: number, X1: number, Z0: number, Z1: number, Y = 0, k = 1.06): string {
  const zs = road.bend ? zRange(Z0, Z1, k) : [Z0, Z1]
  const a = zs.map((z) => rp(road, X0, Y, z))
  const b = zs.map((z) => rp(road, X1, Y, z)).reverse()
  return poly([...a, ...b])
}

/** general ribbon between two lines running along the road: (Xa, Ya) and (Xb, Yb), Z0..Z1 (roofs, awnings) */
export function ribbon(road: RoadGeo, a: [number, number], b: [number, number], Z0: number, Z1: number, k = 1.06): string {
  const zs = road.bend ? zRange(Z0, Z1, k) : [Z0, Z1]
  const A = zs.map((z) => rp(road, a[0], a[1], z))
  const B = zs.map((z) => rp(road, b[0], b[1], z)).reverse()
  return poly([...A, ...B])
}

/** a wall face perpendicular to the road (facing the camera) at distance Z, from X0..X1, heights Y0..Y1 */
export function faceAt(road: RoadGeo, X0: number, X1: number, Z: number, Y0: number, Y1: number): string {
  const a = rp(road, X0, Y1, Z)
  const b = rp(road, X1, Y0, Z)
  return rectD(Math.min(a.x, b.x), a.y, Math.abs(b.x - a.x), b.y - a.y)
}

/* ---------------------------------------------------------------- sky & light */

export function SkyStops({ stops, y0 = -220, y1 = 640, sun }: { stops: [number, string][]; y0?: number; y1?: number; sun?: { x: number; y: number; r: number; color?: string; glow?: number; halo?: string; haloOpacity?: number } }) {
  const id = useUid()
  return (
    <g>
      <defs>
        <linearGradient id={`ss${id}`} x1="0" y1={y0} x2="0" y2={y1} gradientUnits="userSpaceOnUse">
          {stops.map(([o, c], i) => (
            <stop key={i} offset={o} stopColor={c} />
          ))}
        </linearGradient>
        {sun && (
          <radialGradient id={`sg${id}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={sun.halo ?? '#fff1c8'} stopOpacity={sun.haloOpacity ?? 0.9} />
            <stop offset="0.25" stopColor={sun.halo ?? '#ffe2a0'} stopOpacity={(sun.haloOpacity ?? 0.9) * 0.45} />
            <stop offset="1" stopColor={sun.halo ?? '#ffd38a'} stopOpacity="0" />
          </radialGradient>
        )}
      </defs>
      <rect x="-300" y={y0} width="2200" height={y1 - y0} fill={`url(#ss${id})`} />
      {sun && <circle cx={sun.x} cy={sun.y} r={sun.r * (sun.glow ?? 8)} fill={`url(#sg${id})`} />}
      {sun && sun.r > 0 && <circle cx={sun.x} cy={sun.y} r={sun.r} fill={sun.color ?? '#fff7e2'} />}
    </g>
  )
}

/** soft radial glow (lamps, windows, sun spill), no filters */
export function Glow({ x, y, rx, ry, color = '#ffd27a', opacity = 0.6 }: { x: number; y: number; rx: number; ry?: number; color?: string; opacity?: number }) {
  const id = useUid()
  return (
    <g>
      <defs>
        <radialGradient id={`gw${id}`}>
          <stop offset="0" stopColor={color} stopOpacity={opacity} />
          <stop offset="0.45" stopColor={color} stopOpacity={opacity * 0.4} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={x} cy={y} rx={rx} ry={ry ?? rx} fill={`url(#gw${id})`} />
    </g>
  )
}

/** vertical gradient fill for any path: fades from c0 at y0 to c1 at y1 */
export function GradPath({ d, y0, y1, c0, c1, o0 = 1, o1 = 1, opacity }: { d: string; y0: number; y1: number; c0: string; c1: string; o0?: number; o1?: number; opacity?: number }) {
  const id = useUid()
  return (
    <g>
      <defs>
        <linearGradient id={`gp${id}`} x1="0" y1={y0} x2="0" y2={y1} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={c0} stopOpacity={o0} />
          <stop offset="1" stopColor={c1} stopOpacity={o1} />
        </linearGradient>
      </defs>
      <path d={d} fill={`url(#gp${id})`} opacity={opacity} />
    </g>
  )
}

/** soft thin cloud wisps (one path per colour) */
export function Wisps({ seed, items, color = '#fff6ea', opacity = 0.55, under }: { seed: number; items: [number, number, number][]; color?: string; opacity?: number; under?: string }) {
  const r = rng(seed)
  let d = ''
  let du = ''
  for (const [cx, cy, w] of items) {
    const h = w * (0.05 + r() * 0.03)
    d += ellD(cx, cy, w / 2, h / 2)
    const n = 2 + Math.floor(r() * 3)
    for (let j = 0; j < n; j++) {
      const px = cx - w * 0.3 + (j / Math.max(1, n - 1)) * w * 0.6 + (r() - 0.5) * w * 0.1
      d += ellD(px, cy - h * (0.3 + r() * 0.3), w * (0.1 + r() * 0.1), h * (0.6 + r() * 0.4))
    }
    if (under) du += ellD(cx + w * 0.04, cy + h * 0.35, w * 0.46, h * 0.32)
  }
  return (
    <g opacity={opacity}>
      {under && <path d={du} fill={under} />}
      <path d={d} fill={color} />
    </g>
  )
}

/* ---------------------------------------------------------------- vegetation (merged paths) */

export interface TreeCols {
  leaf?: string
  dark?: string
  light?: string
  trunk?: string
}

/**
 * Rain tree with the kit's silhouette, merged into a handful of paths (about 7 elements instead of ~60).
 * `sunSide` = 1 lights the right rim (sun from the right), -1 the left.
 */
export function RainTreeLite({
  x,
  y,
  s,
  seed = 1,
  h = 12,
  spread = 1,
  colors = {},
  flowers,
  lean = 0,
  sunSide = 1,
  hiOpacity = 0.6,
}: {
  x: number
  y: number
  s: number
  seed?: number
  h?: number
  spread?: number
  colors?: TreeCols
  flowers?: string
  lean?: number
  sunSide?: number
  hiOpacity?: number
}) {
  const r = rng(seed)
  const leaf = colors.leaf ?? PAL.leaf
  const dark = colors.dark ?? PAL.leafDark
  const light = colors.light ?? PAL.leafLight
  const trunk = colors.trunk ?? PAL.trunk
  const H = h * s
  const cx = x + lean * H * 0.25
  const cy = y - H * 0.74
  const rx = H * 0.6 * spread
  const ry = H * 0.24
  const forkY = y - H * 0.36
  const tw = Math.max(1.1, 0.5 * s)
  let dUnder = ''
  for (let i = 0; i <= 11; i++) {
    const t = i / 11
    dUnder += circD(cx - rx * 0.86 + t * rx * 1.72, cy + ry * (0.55 + Math.sin(t * Math.PI) * 0.25) + (r() - 0.5) * ry * 0.2, H * (0.06 + r() * 0.04))
  }
  let dMid = ''
  for (let i = 0; i < 9; i++) dMid += circD(cx + (r() - 0.5) * rx * 1.3, cy + (r() - 0.6) * ry * 0.9, H * (0.09 + r() * 0.05))
  let dRimShade = ''
  let dRim = ''
  let dHi = ''
  let dFl = ''
  const n = 20
  for (let i = 0; i < n; i++) {
    const t = Math.PI * (1 - i / (n - 1))
    const c = Math.cos(t) * sunSide
    const px = cx + Math.cos(t) * rx * (0.9 + r() * 0.08)
    const py = cy - Math.sin(t) * ry * (0.95 + r() * 0.25) + ry * 0.25
    const pr = H * (0.075 + r() * 0.05)
    if (c < -0.3) dRimShade += circD(px, py, pr)
    else dRim += circD(px, py, pr)
    if (c > -0.35) dHi += circD(px + pr * 0.28 * sunSide, py - pr * 0.32, pr * 0.55)
    if (flowers && i > 1 && i < 18 && r() > 0.45) dFl += circD(px + (r() - 0.5) * pr, py - pr * 0.4, Math.max(1, H * 0.014))
  }
  const trunkPath = `M${f1(x - tw)} ${f1(y)} C${f1(x - tw * 0.85)} ${f1(y - H * 0.18)} ${f1(cx - tw * 0.55)} ${f1(forkY + H * 0.06)} ${f1(cx - tw * 0.45)} ${f1(forkY)} L${f1(cx + tw * 0.45)} ${f1(forkY)} C${f1(cx + tw * 0.55)} ${f1(forkY + H * 0.06)} ${f1(x + tw * 0.85)} ${f1(y - H * 0.18)} ${f1(x + tw)} ${f1(y)} Z`
  const limbs = [
    [-0.72, 0.15],
    [-0.3, -0.1],
    [0.25, -0.05],
    [0.68, 0.2],
  ]
    .map(([dx, dy]) => `M${f1(cx)} ${f1(forkY)} Q${f1(cx + dx * rx * 0.35)} ${f1(forkY - H * 0.12 + dy * H * 0.1)} ${f1(cx + dx * rx * 0.8)} ${f1(cy + ry * 0.5)}`)
    .join('')
  return (
    <g>
      <path d={trunkPath} fill={trunk} />
      <path d={limbs} stroke={trunk} strokeWidth={tw * 0.7} fill="none" strokeLinecap="round" />
      <ellipse cx={cx} cy={cy + ry * 0.15} rx={rx * 0.9} ry={ry * 0.75} fill={mix(leaf, dark, 0.35)} />
      <path d={dUnder} fill={dark} />
      <path d={dMid} fill={mix(leaf, dark, 0.18)} />
      <path d={dRimShade} fill={mix(leaf, dark, 0.3)} />
      <path d={dRim} fill={leaf} />
      <path d={dHi} fill={light} opacity={hiOpacity} />
      {flowers && <path d={dFl} fill={flowers} />}
    </g>
  )
}

/** compact rounded tree (honge / neem), 4 elements */
export function RoundTreeLite({ x, y, s, seed = 2, h = 7, colors = {}, sunSide = 1, hiOpacity = 0.65 }: { x: number; y: number; s: number; seed?: number; h?: number; colors?: TreeCols; sunSide?: number; hiOpacity?: number }) {
  const r = rng(seed)
  const leaf = colors.leaf ?? '#55703f'
  const dark = colors.dark ?? PAL.leafDark
  const light = colors.light ?? PAL.leafLight
  const H = h * s
  const cy = y - H * 0.62
  const R = H * 0.36
  const tw = Math.max(0.8, 0.3 * s)
  let d = ''
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    d += circD(x + Math.cos(a) * R * 0.55, cy + Math.sin(a) * R * 0.45 - R * 0.1, R * (0.45 + r() * 0.15))
  }
  return (
    <g>
      <path d={`M${f1(x - tw)} ${f1(y)} L${f1(x - tw * 0.6)} ${f1(cy)} L${f1(x + tw * 0.6)} ${f1(cy)} L${f1(x + tw)} ${f1(y)} Z`} fill={colors.trunk ?? PAL.trunk} />
      <path d={circD(x, cy + R * 0.15, R) + circD(x - R * 0.35 * sunSide, cy + R * 0.3, R * 0.75)} fill={dark} />
      <path d={d} fill={leaf} />
      <path d={circD(x + R * 0.32 * sunSide, cy - R * 0.32, R * 0.42) + circD(x + R * 0.55 * sunSide, cy + R * 0.05, R * 0.28)} fill={light} opacity={hiOpacity} />
    </g>
  )
}

/** coconut palm, merged into 3 paths */
export function PalmLite({ x, y, s, seed = 4, h = 11, lean = 0.12, frond = '#4f6d35', frondDark = '#3c5629', trunk = '#8a7357' }: { x: number; y: number; s: number; seed?: number; h?: number; lean?: number; frond?: string; frondDark?: string; trunk?: string }) {
  const r = rng(seed)
  const H = h * s
  const tx = x + lean * H
  const ty = y - H
  let a1 = ''
  let a2 = ''
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (1.05 + (i / 8) * 0.9) + (r() - 0.5) * 0.2
    const len = H * (0.3 + r() * 0.1)
    const ex = tx + Math.cos(a) * len
    const ey = ty + Math.sin(a) * len * 0.55 + len * 0.28
    const mx = tx + Math.cos(a) * len * 0.5
    const my = ty + Math.sin(a) * len * 0.5 - len * 0.12
    const seg = `M${f1(tx)} ${f1(ty)} Q${f1(mx)} ${f1(my)} ${f1(ex)} ${f1(ey)}`
    if (i % 2) a1 += seg
    else a2 += seg
  }
  const sw = Math.max(1.4, 0.42 * s)
  return (
    <g>
      <path d={`M${f1(x)} ${f1(y)} Q${f1(x + lean * H * 0.2)} ${f1(y - H * 0.6)} ${f1(tx)} ${f1(ty)}`} stroke={trunk} strokeWidth={Math.max(1.2, 0.3 * s)} fill="none" strokeLinecap="round" />
      <path d={a2} stroke={frondDark} strokeWidth={sw} fill="none" strokeLinecap="round" />
      <path d={a1} stroke={frond} strokeWidth={sw} fill="none" strokeLinecap="round" />
    </g>
  )
}

/** a mass of canopy blobs along a ground line (far tree belts); 2–3 paths */
export function CanopyBelt({
  x0,
  x1,
  y,
  h,
  seed = 1,
  color,
  dark,
  light,
  lightOpacity = 0.5,
  bump = 1,
}: {
  x0: number
  x1: number
  y: number
  h: number
  seed?: number
  color: string
  dark?: string
  light?: string
  lightOpacity?: number
  bump?: number
}) {
  const r = rng(seed)
  let d = `M${f1(x0)} ${f1(y + 2)}`
  let dl = ''
  let x = x0
  while (x < x1) {
    const w = (h * 0.8 + r() * h * 1.4) * bump
    const top = y - h * (0.55 + r() * 0.45)
    d += circD(x + w / 2, top + w * 0.42, w * 0.5)
    if (light && r() > 0.25) dl += circD(x + w * 0.62, top + w * 0.3, w * 0.26)
    x += w * 0.72
  }
  const base = `M${f1(x0)} ${f1(y - h * 0.45)}L${f1(x1)} ${f1(y - h * 0.45)}L${f1(x1)} ${f1(y + 2)}L${f1(x0)} ${f1(y + 2)}Z`
  return (
    <g>
      <path d={base + d} fill={color} />
      {dark && <path d={`M${f1(x0)} ${f1(y - h * 0.2)}L${f1(x1)} ${f1(y - h * 0.2)}L${f1(x1)} ${f1(y + 2)}L${f1(x0)} ${f1(y + 2)}Z`} fill={dark} opacity="0.55" />}
      {light && <path d={dl} fill={light} opacity={lightOpacity} />}
    </g>
  )
}

/** low hedge / shrubs along the road at lateral X, Z0..Z1 */
export function ShrubsAlong({ road = STRAIGHT, X, Z0, Z1, h = 0.9, step = 1.6, seed = 3, color = '#4f6b3a', light = '#7f9a52', flowers }: { road?: RoadGeo; X: number; Z0: number; Z1: number; h?: number; step?: number; seed?: number; color?: string; light?: string; flowers?: string }) {
  const r = rng(seed)
  let d = ''
  let dl = ''
  let df = ''
  for (let z = Z1; z >= Z0; z -= step * (0.8 + r() * 0.4)) {
    const p = rp(road, X + (r() - 0.5) * 0.4, 0, z)
    const s = F / z
    const rr = h * s * (0.55 + r() * 0.3)
    d += circD(p.x, p.y - rr * 0.7, rr)
    dl += circD(p.x + rr * 0.3, p.y - rr * 1.05, rr * 0.45)
    if (flowers && r() > 0.5) df += circD(p.x - rr * 0.2, p.y - rr * 1.1, Math.max(0.8, rr * 0.18))
  }
  return (
    <g>
      <path d={d} fill={color} />
      <path d={dl} fill={light} opacity="0.55" />
      {flowers && <path d={df} fill={flowers} />}
    </g>
  )
}

/* ---------------------------------------------------------------- built things */

/** side face of a frontal block, receding from its near vertical edge at x0 by depthM metres */
export function sideFace(x0: number, yTop: number, yBot: number, s: number, depthM: number): string {
  const Z = F / s
  const k = Z / (Z + depthM)
  const xf = VPX + (x0 - VPX) * k
  return `M${f1(x0)} ${f1(yTop)} L${f1(xf)} ${f1(HORIZON + (yTop - HORIZON) * k)} L${f1(xf)} ${f1(HORIZON + (yBot - HORIZON) * k)} L${f1(x0)} ${f1(yBot)} Z`
}

/** floor bands on a receding side face (one path) */
export function sideBands(x0: number, yTop: number, yBot: number, s: number, depthM: number, every: number, band: number): string {
  const Z = F / s
  const k = Z / (Z + depthM)
  const xf = VPX + (x0 - VPX) * k
  let d = ''
  const H = yBot - yTop
  const n = Math.floor(H / (every * s))
  for (let i = 1; i < n; i++) {
    const y = yBot - i * every * s
    const y2 = y - band * s
    d += `M${f1(x0)} ${f1(y)}L${f1(xf)} ${f1(HORIZON + (y - HORIZON) * k)}L${f1(xf)} ${f1(HORIZON + (y2 - HORIZON) * k)}L${f1(x0)} ${f1(y2)}Z`
  }
  return d
}

/**
 * Tall residential tower (gated-community style): stacked balconies, a lift-core crown, optional lit windows.
 * About 8 elements.
 */
export function TowerBlock({
  x,
  y,
  s,
  w,
  h,
  color,
  accent,
  side = 'none',
  depth = 16,
  lit = 0,
  seed = 1,
  windowColor,
  floorH = 3.0,
  litColor = PAL.windowLit,
  sideShade = -0.2,
}: {
  x: number
  y: number
  s: number
  w: number
  h: number
  color: string
  accent?: string
  side?: 'left' | 'right' | 'none'
  depth?: number
  lit?: number
  seed?: number
  windowColor?: string
  floorH?: number
  litColor?: string
  sideShade?: number
}) {
  const r = rng(seed)
  const W = w * s
  const H = h * s
  const x0 = x - W / 2
  const top = y - H
  const floors = Math.floor(h / floorH)
  const cols = Math.max(2, Math.round(w / 3.4))
  const glass = windowColor ?? mix(color, PAL.glass, 0.55)
  let dw = ''
  let dl = ''
  let db = ''
  for (let f = 1; f < floors; f++) {
    const fy = y - (f + 1) * floorH * s
    db += rectD(x0, fy + floorH * s * 0.78, W, floorH * s * 0.12)
    for (let c = 0; c < cols; c++) {
      const cx = x0 + (W / cols) * (c + 0.5)
      const ww = (W / cols) * 0.52
      const rr = rectD(cx - ww / 2, fy + floorH * s * 0.25, ww, floorH * s * 0.48)
      if (r() < lit) dl += rr
      else dw += rr
    }
  }
  const acc = accent ?? shade(color, -0.12)
  const coreW = W * 0.22
  return (
    <g>
      {side !== 'none' && <path d={sideFace(side === 'left' ? x0 : x0 + W, top, y, s, depth)} fill={shade(color, sideShade)} />}
      {side !== 'none' && <path d={sideBands(side === 'left' ? x0 : x0 + W, top, y, s, depth, floorH, floorH * 0.12)} fill={shade(color, sideShade - 0.08)} />}
      <rect x={x0} y={top} width={W} height={H} fill={color} />
      <path d={dw} fill={glass} />
      {lit > 0 && <path d={dl} fill={litColor} />}
      <path d={db} fill={shade(color, 0.12)} />
      <rect x={x0 + W * 0.46} y={top} width={W * 0.08} height={H} fill={acc} opacity="0.7" />
      <rect x={x + W * 0.1 - coreW / 2} y={top - 2.6 * s} width={coreW} height={2.6 * s} fill={shade(color, -0.08)} />
      <rect x={x0 - 0.2 * s} y={top - 0.5 * s} width={W + 0.4 * s} height={0.5 * s} fill={acc} />
    </g>
  )
}

/** railing posts + two rails along the road (park railings, lake walks); 2 paths */
export function RailingAlong({ road = STRAIGHT, X, Z0, Z1, step = 1.6, h = 1.1, color = '#3e5a46', base, baseH = 0.45 }: { road?: RoadGeo; X: number; Z0: number; Z1: number; step?: number; h?: number; color?: string; base?: string; baseH?: number }) {
  let d = ''
  for (let z = Z0; z <= Z1; z += step * Math.max(1, z / 14)) {
    const a = rp(road, X, h, z)
    const b = rp(road, X, base ? baseH : 0, z)
    const s = F / z
    const w = Math.max(0.6, 0.06 * s)
    d += rectD(a.x - w / 2, a.y, w, b.y - a.y)
  }
  const rails = stripRail(road, X, Z0, Z1, h - 0.05, h) + stripRail(road, X, Z0, Z1, h * 0.55, h * 0.6)
  return (
    <g>
      {base && <path d={planeAlong(road, X, Z0, Z1, 0, baseH)} fill={base} />}
      <path d={d + rails} fill={color} />
    </g>
  )
}
function stripRail(road: RoadGeo, X: number, Z0: number, Z1: number, y0: number, y1: number) {
  return planeAlong(road, X, Z0, Z1, y0, y1)
}

/** windows (or any rectangles) on a receding facade at lateral X: rows of quads, one path */
export function facadeWindows(road: RoadGeo, X: number, Z0: number, Z1: number, opts: { y0: number; y1: number; floors: number; floorH: number; every: number; width: number; skip?: (i: number, f: number) => boolean }): string {
  let d = ''
  let i = 0
  for (let z = Z0 + opts.every * 0.5; z + opts.width <= Z1; z += opts.every, i++) {
    for (let f = 0; f < opts.floors; f++) {
      if (opts.skip && opts.skip(i, f)) continue
      const ya = opts.y0 + f * opts.floorH
      const yb = ya + (opts.y1 - opts.y0)
      const a = rp(road, X, yb, z)
      const b = rp(road, X, yb, z + opts.width)
      const c = rp(road, X, ya, z + opts.width)
      const e = rp(road, X, ya, z)
      d += poly([a, b, c, e])
    }
  }
  return d
}

/** elevated metro viaduct running ALONG the road at lateral X (over a median), receding to the horizon */
export function ViaductAlong({
  road = STRAIGHT,
  X,
  Z0,
  Z1,
  deckY = 12,
  deckH = 1.9,
  pierStep = 28,
  pierZ0 = 12,
  color = '#d7cdc0',
  shadeC,
  train,
}: {
  road?: RoadGeo
  X: number
  Z0: number
  Z1: number
  deckY?: number
  deckH?: number
  pierStep?: number
  pierZ0?: number
  color?: string
  shadeC?: string
  train?: { Z0: number; Z1: number; livery: string; lit?: boolean; body?: string }
}) {
  const sh = shadeC ?? shade(color, -0.25)
  const deckW = 4.6
  // piers (far to near)
  const piers: ReactNode[] = []
  const zs: number[] = []
  for (let z = pierZ0; z <= Z1; z += pierStep) zs.push(z)
  zs.reverse().forEach((z, i) => {
    const s = F / z
    const g = rp(road, X, 0, z)
    const t = rp(road, X, deckY, z)
    const pw = 1.6 * s
    piers.push(
      <g key={`p${i}`}>
        <rect x={g.x - pw / 2} y={t.y} width={pw} height={g.y - t.y} fill={shade(color, -0.1)} />
        <rect x={g.x - pw / 2} y={t.y} width={pw * 0.32} height={g.y - t.y} fill={sh} opacity="0.55" />
        <path d={poly([rp(road, X - 2.4, deckY, z), rp(road, X + 2.4, deckY, z), rp(road, X + 0.8, deckY - 1.6, z), rp(road, X - 0.8, deckY - 1.6, z)])} fill={shade(color, -0.14)} />
      </g>,
    )
  })
  const sideX = X < 0 ? X + deckW / 2 : X - deckW / 2 // the deck face that looks at the road
  const underside = stripAlong(road, X - deckW / 2, X + deckW / 2, Z0, Z1, deckY)
  const face = planeAlong(road, sideX, Z0, Z1, deckY, deckY + deckH)
  const parapet = planeAlong(road, sideX, Z0, Z1, deckY + deckH, deckY + deckH + 0.9)
  let trainEls: ReactNode = null
  if (train) {
    const ty0 = deckY + deckH + 0.25
    const tx = sideX + (X < 0 ? -0.6 : 0.6)
    const body = planeAlong(road, tx, train.Z0, train.Z1, ty0, ty0 + 3.4)
    const stripe = planeAlong(road, tx, train.Z0, train.Z1, ty0 + 0.7, ty0 + 1.25)
    const roofStripe = planeAlong(road, tx, train.Z0, train.Z1, ty0 + 3.05, ty0 + 3.4)
    const win = facadeWindows(road, tx, train.Z0, train.Z1, { y0: ty0 + 1.6, y1: ty0 + 2.65, floors: 1, floorH: 3, every: 2.5, width: 1.5 })
    const front = rp(road, tx, ty0, train.Z0)
    const front2 = rp(road, tx + (X < 0 ? -2.8 : 2.8), ty0 + 3.4, train.Z0)
    trainEls = (
      <g>
        <path d={body} fill={train.body ?? '#eceeea'} />
        <path d={stripe} fill={train.livery} />
        <path d={roofStripe} fill={train.livery} opacity="0.85" />
        <path d={win} fill={train.lit ? '#ffe2a6' : '#4a5462'} opacity={train.lit ? 0.9 : 1} />
        <rect x={Math.min(front.x, front2.x)} y={front2.y} width={Math.abs(front2.x - front.x)} height={front.y - front2.y} rx={0.4 * (F / train.Z0)} fill={shade(train.body ?? '#eceeea', -0.08)} />
      </g>
    )
  }
  return (
    <g>
      {piers}
      <path d={underside} fill={sh} />
      {trainEls}
      <path d={parapet} fill={shade(color, 0.06)} />
      <path d={face} fill={color} />
      <path d={planeAlong(road, sideX, Z0, Z1, deckY + deckH * 0.05, deckY + deckH * 0.22)} fill={sh} opacity="0.6" />
    </g>
  )
}

/**
 * Elevated metro viaduct following a world polyline (absolute X, Z in metres; road assumed straight),
 * e.g. sweeping across a junction or curving in alongside the road. The face shown is the one turned
 * towards the camera. Optional train between path fractions t0..t1.
 */
export function ViaductPath({
  pts,
  deckY = 12.5,
  deckH = 1.9,
  width = 4.6,
  color = '#d6ccbf',
  under,
  pierEvery = 28,
  pierColor,
  train,
  zMin = 6,
}: {
  pts: [number, number][]
  deckY?: number
  deckH?: number
  width?: number
  color?: string
  under?: string
  pierEvery?: number
  pierColor?: string
  train?: { t0: number; t1: number; livery: string; body?: string; lit?: boolean; windows?: string }
  zMin?: number
}) {
  // resample the polyline every ~1.5 m (finer near the camera)
  const S: { X: number; Z: number; nX: number; nZ: number; d: number }[] = []
  let dist = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i]
    const [x1, z1] = pts[i + 1]
    const L = Math.hypot(x1 - x0, z1 - z0)
    const n = Math.max(2, Math.ceil(L / Math.max(1.2, Math.min(z0, z1) / 12)))
    for (let j = 0; j < n; j++) {
      const t = j / n
      const X = x0 + (x1 - x0) * t
      const Z = z0 + (z1 - z0) * t
      // normal in the XZ plane, pointing to the camera side
      let nX = -(z1 - z0) / L
      let nZ = (x1 - x0) / L
      if (nX * -X + nZ * -Z < 0) {
        nX = -nX
        nZ = -nZ
      }
      S.push({ X, Z, nX, nZ, d: dist + L * t })
    }
    dist += L
  }
  const last = pts[pts.length - 1]
  S.push({ ...S[S.length - 1], X: last[0], Z: last[1], d: dist })
  const vis = S.filter((p) => p.Z > zMin)
  const P = (X: number, Y: number, Z: number) => proj(X, Y, Z)
  const near = (p: (typeof S)[0], off: number, Y: number) => P(p.X + p.nX * off, Y, p.Z + p.nZ * off)
  const ribbonD = (list: typeof S, offA: number, Ya: number, offB: number, Yb: number) =>
    poly([...list.map((p) => near(p, offA, Ya)), ...list.slice().reverse().map((p) => near(p, offB, Yb))])
  const hw = width / 2
  const underD = ribbonD(vis, hw, deckY, -hw, deckY)
  const faceD = ribbonD(vis, hw, deckY, hw, deckY + deckH)
  const lipD = ribbonD(vis, hw, deckY + deckH, hw, deckY + deckH + 0.6)
  const shadowD = ribbonD(vis, hw, deckY + deckH * 0.05, hw, deckY + deckH * 0.28)
  // piers, far to near
  const piers: ReactNode[] = []
  const pc = pierColor ?? shade(color, -0.1)
  const pierPts = vis.filter((p, i) => i > 0 && Math.floor(p.d / pierEvery) !== Math.floor(vis[i - 1].d / pierEvery)).sort((a, b) => b.Z - a.Z)
  let pierD = ''
  let capD = ''
  for (const p of pierPts) {
    const g = P(p.X, 0, p.Z)
    const t = P(p.X, deckY, p.Z)
    const s = F / p.Z
    pierD += rectD(g.x - 0.8 * s, t.y, 1.6 * s, g.y - t.y)
    capD += poly([P(p.X - 2.3, deckY, p.Z), P(p.X + 2.3, deckY, p.Z), P(p.X + 0.8, deckY - 1.5, p.Z), P(p.X - 0.8, deckY - 1.5, p.Z)])
  }
  piers.push(<path key="p" d={pierD} fill={pc} />, <path key="c" d={capD} fill={shade(pc, -0.08)} />)
  let trainEls: ReactNode = null
  if (train) {
    const L = dist
    const tl = vis.filter((p) => p.d >= train.t0 * L && p.d <= train.t1 * L)
    if (tl.length > 1) {
      const y0 = deckY + deckH + 0.15
      const off = hw - 0.9
      const body = ribbonD(tl, off, y0, off, y0 + 3.5)
      const stripe = ribbonD(tl, off - 0.01, y0 + 0.55, off - 0.01, y0 + 1.15)
      const roof = ribbonD(tl, off - 0.01, y0 + 3.2, off - 0.01, y0 + 3.5)
      let win = ''
      for (let i = 0; i < tl.length - 1; i++) {
        if (Math.floor(tl[i].d / 2.6) === Math.floor(tl[i + 1].d / 2.6)) continue
        const a = tl[i]
        const b = tl[Math.min(tl.length - 1, i + 1)]
        win += poly([near(a, off - 0.02, y0 + 1.55), near(b, off - 0.02, y0 + 1.55), near(b, off - 0.02, y0 + 2.6), near(a, off - 0.02, y0 + 2.6)])
      }
      trainEls = (
        <g>
          <path d={body} fill={train.body ?? '#ecedea'} />
          <path d={win} fill={train.windows ?? (train.lit ? '#ffe3a8' : '#4b5563')} />
          <path d={stripe} fill={train.livery} />
          <path d={roof} fill={train.livery} opacity="0.8" />
        </g>
      )
    }
  }
  return (
    <g>
      {piers}
      <path d={underD} fill={under ?? shade(color, -0.3)} />
      {trainEls}
      <path d={lipD} fill={shade(color, 0.08)} />
      <path d={faceD} fill={color} />
      <path d={shadowD} fill={shade(color, -0.22)} opacity="0.7" />
    </g>
  )
}

/** a person sitting at a café table, seen roughly side-on; 1.2 m tall when seated */
export function Sitter({ x, y, s, shirt, skin = '#8d5a3b', flip = false, hair = '#1f1714' }: { x: number; y: number; s: number; shirt: string; skin?: string; flip?: boolean; hair?: string }) {
  const d = flip ? -1 : 1
  const seatY = y - 0.45 * s
  return (
    <g>
      {/* chair */}
      <path d={`M${f1(x - d * 0.25 * s)} ${f1(seatY)} L${f1(x - d * 0.28 * s)} ${f1(y)} M${f1(x + d * 0.22 * s)} ${f1(seatY)} L${f1(x + d * 0.24 * s)} ${f1(y)} M${f1(x - d * 0.3 * s)} ${f1(seatY)} L${f1(x - d * 0.34 * s)} ${f1(seatY - 0.55 * s)}`} stroke="#3a2c24" strokeWidth={Math.max(0.6, 0.06 * s)} />
      {/* legs */}
      <path d={`M${f1(x - d * 0.18 * s)} ${f1(seatY - 0.12 * s)} L${f1(x + d * 0.32 * s)} ${f1(seatY - 0.12 * s)} L${f1(x + d * 0.36 * s)} ${f1(y)} L${f1(x + d * 0.24 * s)} ${f1(y)} L${f1(x + d * 0.22 * s)} ${f1(seatY + 0.04 * s)} L${f1(x - d * 0.18 * s)} ${f1(seatY + 0.04 * s)} Z`} fill="#3b3a44" />
      {/* torso */}
      <path d={`M${f1(x - d * 0.24 * s)} ${f1(seatY)} L${f1(x - d * 0.2 * s)} ${f1(seatY - 0.58 * s)} L${f1(x + d * 0.08 * s)} ${f1(seatY - 0.6 * s)} L${f1(x + d * 0.12 * s)} ${f1(seatY)} Z`} fill={shirt} />
      <circle cx={x - d * 0.05 * s} cy={seatY - 0.72 * s} r={0.12 * s} fill={skin} />
      <path d={`M${f1(x - d * 0.18 * s)} ${f1(seatY - 0.74 * s)} Q${f1(x - d * 0.06 * s)} ${f1(seatY - 0.92 * s)} ${f1(x + d * 0.07 * s)} ${f1(seatY - 0.76 * s)} Z`} fill={hair} />
    </g>
  )
}

/** small round café table with a cup */
export function CafeTable({ x, y, s, top = '#e9dcc4', leg = '#3a2c24' }: { x: number; y: number; s: number; top?: string; leg?: string }) {
  return (
    <g>
      <rect x={x - 0.03 * s} y={y - 0.74 * s} width={Math.max(0.6, 0.06 * s)} height={0.74 * s} fill={leg} />
      <rect x={x - 0.22 * s} y={y - 0.04 * s} width={0.44 * s} height={0.04 * s} fill={leg} />
      <ellipse cx={x} cy={y - 0.75 * s} rx={0.36 * s} ry={0.06 * s} fill={top} />
      <rect x={x + 0.06 * s} y={y - 0.86 * s} width={0.08 * s} height={0.1 * s} fill="#fff6e8" />
    </g>
  )
}

/** light string of tiny warm bulbs (one path); use once, small */
export function BulbString({ x1, y1, x2, y2, sag, r = 1.4, color = '#ffe2a0', n }: { x1: number; y1: number; x2: number; y2: number; sag: number; r?: number; color?: string; n?: number }) {
  const N = n ?? Math.max(5, Math.floor(Math.hypot(x2 - x1, y2 - y1) / (r * 7)))
  let d = ''
  for (let i = 0; i <= N; i++) {
    const t = i / N
    d += circD(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + sag * 4 * t * (1 - t), r)
  }
  return (
    <g>
      <path d={`M${f1(x1)} ${f1(y1)} Q${f1((x1 + x2) / 2)} ${f1((y1 + y2) / 2 + sag * 2)} ${f1(x2)} ${f1(y2)}`} stroke="#4a3a30" strokeWidth="0.6" fill="none" opacity="0.6" />
      <path d={d} fill={color} />
    </g>
  )
}

/** text squeezed onto a receding plane at lateral X (affine approximation for a short sign) */
export function TextAlong({ road = STRAIGHT, X, Za, Zb, Y0, Y1, text, color = '#fff6e8', weight = 800, family = 'Manrope, sans-serif', size = 0.62 }: { road?: RoadGeo; X: number; Za: number; Zb: number; Y0: number; Y1: number; text: string; color?: string; weight?: number; family?: string; size?: number }) {
  let a0 = rp(road, X, Y0, Za)
  let a1 = rp(road, X, Y1, Za)
  let b0 = rp(road, X, Y0, Zb)
  let b1 = rp(road, X, Y1, Zb)
  if (b0.x < a0.x) [a0, a1, b0, b1] = [b0, b1, a0, a1] // always read left to right on screen
  // local text box: width 100, height 10, mapped onto the sign with an affine approximation
  const ux = (b0.x - a0.x) / 100
  const uy = ((b0.y + b1.y) / 2 - (a0.y + a1.y) / 2) / 100
  const vy = ((a0.y - a1.y + (b0.y - b1.y)) / 2) / 10
  const ox = a0.x
  const oy = (a0.y + a1.y) / 2 - vy * 5
  // shop names are left out on purpose (no invented signage); a soft lit strip keeps the fascia alive
  void family
  void weight
  const len = Math.min(70, text.length * 5.2 * size)
  return (
    <rect transform={`matrix(${ux.toFixed(4)} ${uy.toFixed(4)} 0 ${vy.toFixed(4)} ${f1(ox)} ${f1(oy)})`} x={50 - len / 2} y={4.2} width={len} height={1.6} rx={0.8} fill={color} opacity="0.45" />
  )
}

/* ---------------------------------------------------------------- buildings along the road */

export interface StreetBlockProps {
  road?: RoadGeo
  /** -1 left of the road, +1 right */
  side: -1 | 1
  /** facade line: metres from the road centre (positive) */
  X: number
  Z0: number
  Z1: number
  h: number
  /** how far the block goes back from the facade (for the near end face) */
  depth?: number
  /** facade colour as lit (or shaded) in this scene */
  wall: string
  /** near end face colour (faces the camera) */
  end?: string
  floorH?: number
  /** window rows start at this floor (1 = above the ground floor) */
  firstFloor?: number
  winEvery?: number
  winW?: number
  winH?: number
  winColor?: string
  /** share of windows lit warm */
  lit?: number
  litColor?: string
  seed?: number
  /** ground floor treatment */
  ground?: 'glass' | 'shutter' | 'wall' | 'shops'
  /** warm interior colour for glass shopfronts */
  glow?: string
  awning?: string
  /** darker top band (parapet) */
  parapet?: string
  /** concrete sunshade ledges above windows */
  chajja?: boolean
  /** windows on the end face */
  endWindows?: boolean
  /** z ranges of individual shop fronts when ground = 'shops' */
  shops?: { z0: number; z1: number; glow?: string; shutter?: boolean; awning?: string }[]
  /** z positions of black rooftop water tanks (set back 2 m from the facade) */
  tanks?: number[]
  /** stair headroom block on the roof: [z0, z1] */
  mumty?: [number, number]
}

/** a building whose long facade runs along the road (follows bends), plus its end face towards the camera */
export function StreetBlock(p: StreetBlockProps) {
  const road = p.road ?? STRAIGHT
  const sx = p.side * p.X
  const depth = p.depth ?? 12
  const fh = p.floorH ?? 3.2
  const r = rng(p.seed ?? 5)
  const floors = Math.max(0, Math.floor((p.h - 0.6) / fh))
  const first = p.firstFloor ?? 1
  const winColor = p.winColor ?? mix(p.wall, '#2f3440', 0.62)
  const els: ReactNode[] = []
  // facade
  els.push(<path key="f" d={planeAlong(road, sx, p.Z0, p.Z1, 0, p.h)} fill={p.wall} />)
  // windows
  let dw = ''
  let dl = ''
  let dc = ''
  const every = p.winEvery ?? 3.2
  const ww = p.winW ?? 1.4
  const wh = p.winH ?? 1.35
  for (let f = first; f < floors; f++) {
    for (let z = p.Z0 + every * 0.5; z + ww <= p.Z1 - 0.3; z += every) {
      const y0 = f * fh + 0.85
      const q = poly([rp(road, sx, y0 + wh, z), rp(road, sx, y0 + wh, z + ww), rp(road, sx, y0, z + ww), rp(road, sx, y0, z)])
      if (r() < (p.lit ?? 0)) dl += q
      else dw += q
      if (p.chajja) dc += poly([rp(road, sx, y0 + wh + 0.3, z - 0.2), rp(road, sx, y0 + wh + 0.3, z + ww + 0.2), rp(road, sx - p.side * 0.5, y0 + wh + 0.18, z + ww + 0.2), rp(road, sx - p.side * 0.5, y0 + wh + 0.18, z - 0.2)])
    }
  }
  els.push(<path key="w" d={dw} fill={winColor} />)
  if (dl) els.push(<path key="wl" d={dl} fill={p.litColor ?? PAL.windowLit} />)
  if (dc) els.push(<path key="c" d={dc} fill={shade(p.wall, -0.18)} />)
  // ground floor
  const g = p.ground ?? 'wall'
  if (g === 'glass') {
    els.push(<path key="g" d={planeAlong(road, sx, p.Z0 + 0.5, p.Z1 - 0.5, 0.15, 2.9)} fill={p.glow ?? '#ffcf86'} />)
    let dm = ''
    for (let z = p.Z0 + 0.5; z <= p.Z1 - 0.5; z += 1.6) dm += planeAlong(road, sx - p.side * 0.01, z, z + 0.09, 0.15, 2.9)
    els.push(<path key="gm" d={dm} fill={shade(p.wall, -0.45)} opacity="0.6" />)
    els.push(<path key="gb" d={planeAlong(road, sx - p.side * 0.01, p.Z0 + 0.5, p.Z1 - 0.5, 2.9, 3.15)} fill={shade(p.wall, -0.3)} />)
  } else if (g === 'shutter') {
    els.push(<path key="g" d={planeAlong(road, sx, p.Z0 + 0.4, p.Z1 - 0.4, 0, 2.7)} fill={mix(p.wall, '#7d7770', 0.6)} />)
  } else if (g === 'shops' && p.shops) {
    let dg = ''
    let ds = ''
    for (const s of p.shops) {
      if (s.shutter) ds += planeAlong(road, sx, s.z0, s.z1, 0, 2.7)
      else {
        els.push(<path key={`sh${s.z0}`} d={planeAlong(road, sx, s.z0, s.z1, 0, 2.7)} fill={s.glow ?? p.glow ?? '#ffcf86'} />)
        dg += planeAlong(road, sx - p.side * 0.01, s.z0, s.z1, 0, 0.9)
      }
      if (s.awning) els.push(<path key={`aw${s.z0}`} d={ribbon(road, [sx, 3.0], [sx - p.side * 1.3, 2.6], s.z0 - 0.1, s.z1 + 0.1)} fill={s.awning} />)
    }
    if (ds) els.push(<path key="ds" d={ds} fill={mix(p.wall, '#7d7770', 0.6)} />)
    if (dg) els.push(<path key="dg" d={dg} fill="#3a2a22" opacity="0.55" />)
  }
  if (p.awning) els.push(<path key="a" d={ribbon(road, [sx, 3.2], [sx - p.side * 1.5, 2.75], p.Z0 + 0.3, p.Z1 - 0.3)} fill={p.awning} />)
  if (p.parapet) els.push(<path key="pp" d={planeAlong(road, sx, p.Z0, p.Z1, p.h - 0.5, p.h)} fill={p.parapet} />)
  if (p.mumty) {
    const mx = sx + p.side * 3
    els.push(<path key="mu" d={faceAt(road, Math.min(mx, mx + p.side * 3), Math.max(mx, mx + p.side * 3), p.mumty[0], p.h, p.h + 2.6)} fill={shade(p.end ?? shade(p.wall, -0.2), -0.06)} />)
    els.push(<path key="mf" d={planeAlong(road, mx, p.mumty[0], p.mumty[1], p.h, p.h + 2.6)} fill={shade(p.wall, -0.05)} />)
  }
  if (p.tanks) els.push(<TanksAlong key="tk" road={road} X={sx + p.side * 2} Zs={p.tanks} Y={p.h} />)
  // near end face (towards the camera)
  const ex0 = Math.min(sx, sx + p.side * depth)
  const ex1 = Math.max(sx, sx + p.side * depth)
  const endC = p.end ?? shade(p.wall, -0.2)
  els.push(<path key="e" d={faceAt(road, ex0, ex1, p.Z0, 0, p.h)} fill={endC} />)
  if (p.parapet) els.push(<path key="ep" d={faceAt(road, ex0, ex1, p.Z0, p.h - 0.5, p.h)} fill={shade(endC, -0.12)} />)
  if (p.endWindows) {
    let de = ''
    for (let f = first; f < floors; f++) {
      for (let x = 2.2; x < depth - 1; x += 3.4) {
        const X0 = sx + p.side * x
        de += faceAt(road, Math.min(X0, X0 + p.side * 1.2), Math.max(X0, X0 + p.side * 1.2), p.Z0, f * fh + 0.85, f * fh + 0.85 + wh)
      }
    }
    els.push(<path key="ew" d={de} fill={mix(endC, '#2f3440', 0.55)} />)
  }
  return <g>{els}</g>
}

/** parked scooter seen roughly side-on (nose towards `dir`) */
export function Scooter({ x, y, s, color = '#c9452e', dir = 1 }: { x: number; y: number; s: number; color?: string; dir?: 1 | -1 }) {
  const d = dir
  const X = (m: number) => f1(x + d * m * s)
  const Y = (m: number) => f1(y - m * s)
  const body = `M${X(-0.75)} ${Y(0.3)} Q${X(-0.82)} ${Y(0.74)} ${X(-0.3)} ${Y(0.72)} L${X(0.22)} ${Y(0.5)} L${X(0.42)} ${Y(1.0)} L${X(0.6)} ${Y(1.0)} L${X(0.7)} ${Y(0.3)} Z`
  return (
    <g>
      <path d={circD(x - d * 0.55 * s, y - 0.2 * s, 0.2 * s) + circD(x + d * 0.58 * s, y - 0.2 * s, 0.2 * s)} fill="#1e1c1b" />
      <path d={body} fill={color} />
      <path d={`M${X(-0.72)} ${Y(0.8)} L${X(-0.16)} ${Y(0.8)} L${X(-0.2)} ${Y(0.71)} L${X(-0.7)} ${Y(0.71)} Z M${X(0.44)} ${Y(1.0)} L${X(0.5)} ${Y(1.13)} L${X(0.6)} ${Y(1.13)} L${X(0.56)} ${Y(1.0)} Z`} fill="#2a2522" />
    </g>
  )
}

/** a blade sign projecting from a facade, facing the camera (generic text only) */
export function BladeSign({ x, y, s, w, h, text, bg, fg = '#fff6e8', bracket = '#3a2c24', font = 'Manrope, sans-serif', weight = 800, size = 0.42 }: { x: number; y: number; s: number; w: number; h: number; text: string; bg: string; fg?: string; bracket?: string; font?: string; weight?: number; size?: number }) {
  return (
    <g>
      <rect x={x - (w * s) / 2} y={y - h * s} width={w * s} height={h * s} rx={0.08 * s} fill={bg} />
      <rect x={x - (w * s) / 2} y={y - h * s - 0.08 * s} width={w * s} height={Math.max(0.5, 0.06 * s)} fill={bracket} />
      {/* no lettering: invented shop names read as clutter */}
      <rect x={x - Math.min(w * 0.3, text.length * 0.08) * s} y={y - h * s * 0.56} width={Math.min(w * 0.6, text.length * 0.16) * s} height={h * s * 0.12} rx={h * s * 0.06} fill={fg} opacity={0.5 + 0 * size + 0 * weight + (font ? 0 : 0)} />
    </g>
  )
}

/** ground-plane light (or shadow) streaks running towards a sun vanishing point at screen x `sunX` */
export function GroundStreaks({ sunX, items, color, opacity = 0.3, zNear = 2.2, zFar = 70 }: { sunX: number; items: { X0: number; w: number; z0?: number; z1?: number }[]; color: string; opacity?: number; zNear?: number; zFar?: number }) {
  // ground direction towards the sun: X grows by kx per metre of Z
  const kx = (sunX - VPX) / F
  let d = ''
  for (const it of items) {
    const za = it.z0 ?? zNear
    const zb = it.z1 ?? zFar
    const a0 = proj(it.X0 + kx * za, 0, za)
    const a1 = proj(it.X0 + it.w + kx * za, 0, za)
    const b1 = proj(it.X0 + it.w + kx * zb, 0, zb)
    const b0 = proj(it.X0 + kx * zb, 0, zb)
    d += poly([a0, a1, b1, b0])
  }
  return <path d={d} fill={color} opacity={opacity} />
}

/** dappled light / shade pools lying on the ground: circles of radius R metres projected flat (one path) */
export function GroundPools({ road = STRAIGHT, items, color, opacity = 0.25 }: { road?: RoadGeo; items: [number, number, number, number?][]; color: string; opacity?: number }) {
  let d = ''
  for (const [X, Z, R, stretch = 1] of items) {
    const p = rp(road, X, 0, Z)
    const rx = (R * stretch * F) / Z
    const ry = (R * F * 2) / (Z * Z)
    d += ellD(p.x, p.y, rx, Math.max(0.6, ry))
  }
  return <path d={d} fill={color} opacity={opacity} />
}

/** black rooftop water tanks on a building whose facade runs along the road (one path) */
export function TanksAlong({ road = STRAIGHT, X, Zs, Y, color = '#24201e' }: { road?: RoadGeo; X: number; Zs: number[]; Y: number; color?: string }) {
  let d = ''
  for (const z of Zs) {
    const s = F / z
    const b = rp(road, X, Y, z)
    const w = 1.3 * s
    const h = 1.4 * s
    d += `M${f1(b.x - w / 2)} ${f1(b.y)}V${f1(b.y - h + w * 0.12)}Q${f1(b.x)} ${f1(b.y - h - w * 0.1)} ${f1(b.x + w / 2)} ${f1(b.y - h + w * 0.12)}V${f1(b.y)}Z`
  }
  return <path d={d} fill={color} />
}

/** soft sun shafts fanning down from a point (very low opacity gradient wedges) */
export function SunShafts({ x, y, rays, color = '#fff0c8', opacity = 0.16, len = 900 }: { x: number; y: number; rays: [number, number][]; color?: string; opacity?: number; len?: number }) {
  const id = useUid()
  let d = ''
  for (const [ang, w] of rays) {
    const a0 = ((ang - w / 2) * Math.PI) / 180
    const a1 = ((ang + w / 2) * Math.PI) / 180
    d += `M${f1(x)} ${f1(y)}L${f1(x + Math.cos(a0) * len)} ${f1(y + Math.sin(a0) * len)}L${f1(x + Math.cos(a1) * len)} ${f1(y + Math.sin(a1) * len)}Z`
  }
  return (
    <g>
      <defs>
        <radialGradient id={`sh${id}`} cx={x} cy={y} r={len} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={color} stopOpacity={opacity} />
          <stop offset="0.6" stopColor={color} stopOpacity={opacity * 0.4} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={d} fill={`url(#sh${id})`} />
    </g>
  )
}

/** static painted kerb stones (for scenes whose road has kerb: 'none' because a junction breaks the kerb) */
export function KerbStatic({ road = STRAIGHT, hw, runs, light = '#efe9dd', dark = '#23201e', side = 0 }: { road?: RoadGeo; hw: number; runs: [number, number][]; light?: string; dark?: string; side?: -1 | 0 | 1 }) {
  let dl = ''
  let dd = ''
  for (const [Z0, Z1] of runs) {
    let i = 0
    for (let z = Z0; z < Z1; z += 1, i++) {
      const zb = Math.min(Z1, z + 1)
      const q = (side <= 0 ? stripAlong(road, -hw - 0.2, -hw, z, zb) : '') + (side >= 0 ? stripAlong(road, hw, hw + 0.2, z, zb) : '')
      if (i % 2) dd += q
      else dl += q
      // kerb face (the vertical riser)
    }
  }
  return (
    <g>
      <path d={dd} fill={dark} />
      <path d={dl} fill={light} />
    </g>
  )
}

/** temporary pandal fence: white cloth with a red border, on posts, facing the camera between X0..X1 at Z */
export function ClothFenceAt({ road = STRAIGHT, X0, X1, Z, h = 2.0, cloth = '#f7efe2', border = '#b9262c' }: { road?: RoadGeo; X0: number; X1: number; Z: number; h?: number; cloth?: string; border?: string }) {
  return (
    <g>
      <path d={faceAt(road, X0, X1, Z, 0.1, h)} fill={cloth} />
      <path d={faceAt(road, X0, X1, Z, h - 0.22, h - 0.08) + faceAt(road, X0, X1, Z, 0.25, 0.38)} fill={border} />
    </g>
  )
}

/** the same fence running along the road at lateral X */
export function ClothFenceAlong({ road = STRAIGHT, X, Z0, Z1, h = 2.0, cloth = '#f7efe2', border = '#b9262c' }: { road?: RoadGeo; X: number; Z0: number; Z1: number; h?: number; cloth?: string; border?: string }) {
  return (
    <g>
      <path d={planeAlong(road, X, Z0, Z1, 0.1, h)} fill={cloth} />
      <path d={planeAlong(road, X, Z0, Z1, h - 0.22, h - 0.08) + planeAlong(road, X, Z0, Z1, 0.25, 0.38)} fill={border} />
    </g>
  )
}

/* ---------------------------------------------------------------- added for Whitefield / HSR / South-East / South / finale */

/**
 * Glass office block beside the road: lateral X0..X1, depth Z0..Z1, height h (m). Draws the face towards the
 * camera and the side face turned to the road, each with its own vertical gradient, floor bands, mullions and an
 * optional sun sheen on the side face. About 10 elements.
 */
export function GlassBlock({
  road = STRAIGHT,
  X0,
  X1,
  Z0,
  Z1,
  h,
  front,
  side,
  frame = '#e9e4da',
  floorH = 3.8,
  mullion = 2.4,
  sheen,
  crown,
  lit = 0,
  litColor = '#ffd78a',
  seed = 3,
}: {
  road?: RoadGeo
  X0: number
  X1: number
  Z0: number
  Z1: number
  h: number
  front: [string, string]
  side: [string, string]
  frame?: string
  floorH?: number
  mullion?: number
  sheen?: string
  crown?: string
  lit?: number
  litColor?: string
  seed?: number
}) {
  const id = useUid()
  const r = rng(seed)
  const sideX = X1 <= 0 ? X1 : X0 >= 0 ? X0 : null
  const ft = rp(road, X0, h, Z0)
  const fb = rp(road, X0, 0, Z0)
  let floors = ''
  let mull = ''
  let litD = ''
  const n = Math.floor(h / floorH)
  for (let f = 1; f <= n; f++) {
    const y = f * floorH
    if (y > h - 0.4) break
    floors += faceAt(road, X0, X1, Z0, y - 0.22, y)
    if (sideX !== null) floors += planeAlong(road, sideX, Z0, Z1, y - 0.22, y)
  }
  for (let x = X0 + mullion; x < X1 - 0.2; x += mullion) mull += faceAt(road, x, x + 0.14, Z0, 0, h)
  if (sideX !== null) for (let z = Z0 + mullion; z < Z1 - 0.2; z += mullion) mull += planeAlong(road, sideX, z, z + 0.14, 0, h)
  if (lit > 0) {
    for (let f = 0; f < n; f++) {
      for (let x = X0; x < X1 - 0.2; x += mullion) {
        if (r() < lit) litD += faceAt(road, x + 0.2, Math.min(X1, x + mullion) - 0.1, Z0, f * floorH + 0.5, f * floorH + floorH - 0.5)
      }
    }
  }
  return (
    <g>
      <defs>
        <linearGradient id={`gbf${id}`} x1="0" y1={ft.y} x2="0" y2={fb.y} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={front[0]} />
          <stop offset="1" stopColor={front[1]} />
        </linearGradient>
        <linearGradient id={`gbs${id}`} x1="0" y1={ft.y} x2="0" y2={fb.y} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={side[0]} />
          <stop offset="1" stopColor={side[1]} />
        </linearGradient>
      </defs>
      {sideX !== null && <path d={planeAlong(road, sideX, Z0, Z1, 0, h)} fill={`url(#gbs${id})`} />}
      {sideX !== null && sheen && <path d={planeAlong(road, sideX, Z0 + (Z1 - Z0) * 0.25, Z0 + (Z1 - Z0) * 0.45, 0, h) + planeAlong(road, sideX, Z0 + (Z1 - Z0) * 0.55, Z0 + (Z1 - Z0) * 0.62, 0, h)} fill={sheen} opacity="0.35" />}
      <path d={faceAt(road, X0, X1, Z0, 0, h)} fill={`url(#gbf${id})`} />
      {litD && <path d={litD} fill={litColor} opacity="0.85" />}
      <path d={floors} fill={frame} opacity="0.55" />
      <path d={mull} fill={frame} opacity="0.3" />
      <path d={faceAt(road, X0 - 0.2, X1 + 0.2, Z0, h, h + 0.7) + (sideX !== null ? planeAlong(road, sideX, Z0, Z1, h, h + 0.7) : '')} fill={crown ?? frame} />
    </g>
  )
}

/** a flat lake (or any ground patch) given as a world-space polygon [X, Z][] at height Y; one path */
export function groundPoly(pts: [number, number][], Y = 0): string {
  return poly(pts.map(([X, Z]) => proj(X, Y, Z)))
}

/** a scatter of tiny warm window lights / street lights inside a screen rectangle (one path) */
export function LightDots({ seed, n, x0, x1, y0, y1, r = 1.2, color = '#ffd88f', opacity = 0.9 }: { seed: number; n: number; x0: number; x1: number; y0: number; y1: number; r?: number; color?: string; opacity?: number }) {
  const rr = rng(seed)
  let d = ''
  for (let i = 0; i < n; i++) {
    const y = y0 + (y1 - y0) * rr()
    const k = 0.5 + (0.5 * (y - y0)) / Math.max(1, y1 - y0)
    d += rectD(x0 + (x1 - x0) * rr(), y, r * 1.6 * k, r * k)
  }
  return <path d={d} fill={color} opacity={opacity} />
}
