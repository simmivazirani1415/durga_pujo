/**
 * PujoBLR scene kit: SVG building blocks for Bengaluru streets.
 *
 * Every component draws in the shared 1600x1000 viewBox. Ground-standing things take:
 *   x, y  = where they touch the ground (viewBox units)
 *   s     = viewBox units per metre at that depth (use place(X, Z) from ./world to get all three)
 * and their own sizes in METRES, so everything shares one believable scale.
 *
 * Light: low golden-hour sun from the RIGHT. Right-facing faces and upper-right of canopies are lit,
 * left faces sit in warm shade.
 */
import { useId, type ReactNode } from 'react'
import { F, HORIZON, VPX, VB_W, VB_H, mix, shade, rng, proj, roadCenterX, type RoadStyle } from './world'

/* ---------------------------------------------------------------- palette */
export const PAL = {
  leaf: '#4c6a3b',
  leafDark: '#2f4429',
  leafLight: '#86a05a',
  leafSun: '#b4b766',
  trunk: '#5a4334',
  trunkDark: '#3a2a20',
  wallWarm: '#efe0c2',
  wallOchre: '#d9a96a',
  wallPink: '#e2b4a2',
  wallWhite: '#f4ece0',
  wallGrey: '#bdb3a4',
  roofTile: '#a9553a',
  roofTileLight: '#c66c48',
  glass: '#3b4352',
  windowLit: '#ffd78a',
  tank: '#22201f',
  asphalt: '#5a524c',
  burgundy: '#651B28',
  vermilion: '#B93432',
  gold: '#E7B958',
  ivory: '#FFF6E8',
  forest: '#344A3B',
  autoYellow: '#f2c230',
  autoGreen: '#1f6b3e',
  bougainvillea: '#c43a7c',
  tulipOrange: '#e8642c',
}

/* ---------------------------------------------------------------- volume & light */

/**
 * Stylised 3D shading: lights the silhouette of its children like a soft clay volume, with a warm key light
 * from the upper right. `size` is the bevel softness in viewBox units (about 4% of the object's height).
 */
export function Volume({ children, size, strength = 1, light = '#fff1d6', azimuth = -38, elevation = 36 }: { children: ReactNode; size: number; strength?: number; light?: string; azimuth?: number; elevation?: number }) {
  const id = useId().replace(/:/g, '')
  const sd = Math.max(0.5, size)
  return (
    <g>
      <defs>
        <filter id={`vol${id}`} x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation={sd} result="b" />
          <feDiffuseLighting in="b" surfaceScale={sd * 2.2 * strength} diffuseConstant="1" lightingColor={light} result="l">
            <feDistantLight azimuth={azimuth} elevation={elevation} />
          </feDiffuseLighting>
          <feComposite in="SourceGraphic" in2="l" operator="arithmetic" k1="1.0" k2="0.42" k3="0" k4="0" result="lit" />
          <feComposite in="lit" in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#vol${id})`}>{children}</g>
    </g>
  )
}

/** soft contact shadow on the ground, cast a little to the left (sun from the right). rx in viewBox units */
export function GroundShadow({ x, y, s, rx, opacity = 0.26, shift = -0.25 }: { x: number; y: number; s: number; rx: number; opacity?: number; shift?: number }) {
  const id = useId().replace(/:/g, '')
  const Z = F / Math.max(0.01, s)
  const ry = Math.max(0.6, (rx * 2.0) / Z)
  return (
    <g>
      <defs>
        <radialGradient id={`gs${id}`}>
          <stop offset="0" stopColor="#1c120b" stopOpacity={opacity} />
          <stop offset="0.6" stopColor="#1c120b" stopOpacity={opacity * 0.6} />
          <stop offset="1" stopColor="#1c120b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={x + rx * shift} cy={y} rx={rx} ry={ry} fill={`url(#gs${id})`} />
    </g>
  )
}

/* ---------------------------------------------------------------- sky & atmosphere */

export function Sky({
  top,
  mid,
  bottom,
  sun,
}: {
  top: string
  mid: string
  bottom: string
  sun?: { x: number; y: number; r: number; color?: string; glow?: number }
}) {
  const id = useId().replace(/:/g, '')
  return (
    <g>
      <defs>
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="0.55" stopColor={mid} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
        {sun && (
          <radialGradient id={`sun${id}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={sun.color ?? '#fff3cf'} stopOpacity="1" />
            <stop offset="0.18" stopColor={sun.color ?? '#ffe7a8'} stopOpacity="0.85" />
            <stop offset="0.45" stopColor="#ffd38a" stopOpacity="0.28" />
            <stop offset="1" stopColor="#ffd38a" stopOpacity="0" />
          </radialGradient>
        )}
      </defs>
      <rect x="-200" y="-200" width={VB_W + 400} height={HORIZON + 260} fill={`url(#sky${id})`} />
      {sun && (
        <circle cx={sun.x} cy={sun.y} r={sun.r * (sun.glow ?? 7)} fill={`url(#sun${id})`} />
      )}
      {sun && <circle cx={sun.x} cy={sun.y} r={sun.r} fill={sun.color ?? '#fff6dc'} opacity="0.95" />}
    </g>
  )
}

export function Clouds({
  seed,
  y,
  count = 5,
  color = '#fff4e2',
  opacity = 0.7,
  x0 = -100,
  x1 = 1700,
  scale = 1,
}: {
  seed: number
  y: number
  count?: number
  color?: string
  opacity?: number
  x0?: number
  x1?: number
  scale?: number
}) {
  const r = rng(seed)
  const items: ReactNode[] = []
  for (let i = 0; i < count; i++) {
    const cx = x0 + (x1 - x0) * ((i + 0.2 + r() * 0.6) / count)
    const cy = y + (r() - 0.5) * 70 * scale
    const w = (120 + r() * 220) * scale
    const h = (14 + r() * 16) * scale
    const puffs = 3 + Math.floor(r() * 3)
    items.push(
      <g key={i} opacity={opacity * (0.6 + r() * 0.4)}>
        <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} fill={color} />
        {Array.from({ length: puffs }).map((_, j) => (
          <ellipse
            key={j}
            cx={cx - w * 0.3 + (j / Math.max(1, puffs - 1)) * w * 0.6}
            cy={cy - h * (0.35 + r() * 0.4)}
            rx={w * (0.12 + r() * 0.1)}
            ry={h * (0.6 + r() * 0.5)}
            fill={color}
          />
        ))}
      </g>,
    )
  }
  return <g>{items}</g>
}

/**
 * Soft, lit clouds drifting slowly across the sky (CSS animation, paused for reduced motion).
 * Each cloud loops from off-screen left to off-screen right; `speed` is seconds per crossing.
 */
export function DriftClouds({ seed, y, count = 4, scale = 1, speed = 160, top = '#fffaf0', bottom = '#f3c9a6', opacity = 0.9 }: { seed: number; y: number; count?: number; scale?: number; speed?: number; top?: string; bottom?: string; opacity?: number; blur?: number }) {
  // soft edges come from radial gradients, not filters, so the drift stays cheap to paint
  const id = useId().replace(/:/g, '')
  const r = rng(seed)
  const clouds = Array.from({ length: count }).map((_, i) => {
    const w = (180 + r() * 220) * scale
    const h = (36 + r() * 26) * scale
    const puffs = Array.from({ length: 6 + Math.floor(r() * 4) }).map((__, j, arr) => {
      const t = (j + 0.5) / arr.length
      const pr = h * (0.5 + Math.sin(t * Math.PI) * 0.6 + r() * 0.2)
      return { x: -w / 2 + t * w, y: -pr * 0.45, r: pr }
    })
    return { w, h, puffs, cy: y + (r() - 0.5) * 60 * scale, delay: -speed * ((i + r() * 0.6) / count), dur: speed * (0.85 + r() * 0.3) }
  })
  return (
    <g opacity={opacity}>
      <defs>
        <radialGradient id={`dt${id}`} cx="0.62" cy="0.36" r="0.6">
          <stop offset="0" stopColor={top} stopOpacity="1" />
          <stop offset="0.55" stopColor={mix(top, bottom, 0.45)} stopOpacity="0.9" />
          <stop offset="1" stopColor={bottom} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`db${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={bottom} stopOpacity="0.95" />
          <stop offset="0.7" stopColor={bottom} stopOpacity="0.6" />
          <stop offset="1" stopColor={bottom} stopOpacity="0" />
        </radialGradient>
      </defs>
      {clouds.map((c, i) => (
        <g key={i} className="cloud-drift" style={{ animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}>
          <g transform={`translate(0 ${c.cy})`}>
            <ellipse cx={0} cy={-c.h * 0.05} rx={c.w * 0.62} ry={c.h * 0.5} fill={`url(#db${id})`} />
            {c.puffs.map((p, j) => (
              <circle key={j} cx={p.x} cy={p.y} r={p.r * 1.25} fill={`url(#dt${id})`} />
            ))}
          </g>
        </g>
      ))}
    </g>
  )
}

/** soft band of haze sitting on the horizon */
export function Haze({ y = HORIZON, h = 80, color = '#f6dcb4', opacity = 0.55 }: { y?: number; h?: number; color?: string; opacity?: number }) {
  const id = useId().replace(/:/g, '')
  return (
    <g>
      <defs>
        <linearGradient id={`hz${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0" />
          <stop offset="0.6" stopColor={color} stopOpacity={opacity} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="-200" y={y - h * 0.7} width={VB_W + 400} height={h} fill={`url(#hz${id})`} />
    </g>
  )
}

export function Birds({ x, y, count = 4, seed = 3, s = 1, color = '#5a3a32' }: { x: number; y: number; count?: number; seed?: number; s?: number; color?: string }) {
  const r = rng(seed)
  return (
    <g stroke={color} strokeWidth={1.4 * s} fill="none" strokeLinecap="round" opacity="0.6">
      {Array.from({ length: count }).map((_, i) => {
        const bx = x + (r() - 0.3) * 120 * s
        const by = y + (r() - 0.5) * 40 * s
        const w = (6 + r() * 5) * s
        return <path key={i} d={`M${bx - w} ${by - w * 0.35} Q${bx - w * 0.4} ${by - w * 0.6} ${bx} ${by} Q${bx + w * 0.4} ${by - w * 0.6} ${bx + w} ${by - w * 0.35}`} />
      })}
    </g>
  )
}

/* ---------------------------------------------------------------- ground & road */

export function Ground({ color, far, y = HORIZON }: { color: string; far?: string; y?: number }) {
  const id = useId().replace(/:/g, '')
  return (
    <g>
      <defs>
        <linearGradient id={`gr${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={far ?? shade(color, 0.35)} />
          <stop offset="1" stopColor={color} />
        </linearGradient>
      </defs>
      <rect x="-200" y={y - 1} width={VB_W + 400} height={VB_H - y + 220} fill={`url(#gr${id})`} />
    </g>
  )
}

function edgePath(road: RoadStyle, X0: number, X1: number, zNear = 2, zFar = 160): string {
  // polygon between lateral offsets X0 and X1 (metres from the road centre), sampled along Z
  const zs: number[] = []
  for (let z = zNear; z < zFar; z *= 1.12) zs.push(z)
  zs.push(zFar)
  const left = zs.map((z) => proj(roadCenterX(road, z) + X0, 0, z))
  const right = zs.map((z) => proj(roadCenterX(road, z) + X1, 0, z)).reverse()
  // extend the near edge below the frame so nothing shows under it
  const pts = [...left, ...right]
  return 'M' + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L') + ' Z'
}

/**
 * Road surface, kerb base, footpaths and verge, matching the moving markings canvas exactly.
 * Draw it in a static 'back' layer after Ground.
 */
export function RoadSurface({ road, zFar = 160, footpathRight = true, footpathLeft = true }: { road: RoadStyle; zFar?: number; footpathRight?: boolean; footpathLeft?: boolean }) {
  const id = useId().replace(/:/g, '')
  const hw = road.halfWidth
  return (
    <g>
      <defs>
        <linearGradient id={`as${id}`} x1="0" y1={HORIZON} x2="0" y2={VB_H} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={road.asphaltFar} />
          <stop offset="0.25" stopColor={mix(road.asphaltFar, road.asphalt, 0.7)} />
          <stop offset="1" stopColor={road.asphalt} />
        </linearGradient>
        <linearGradient id={`fp${id}`} x1="0" y1={HORIZON} x2="0" y2={VB_H} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={shade(road.footpathColor, 0.35)} />
          <stop offset="1" stopColor={road.footpathColor} />
        </linearGradient>
      </defs>
      {road.footpath > 0 && footpathLeft && <path d={edgePath(road, -hw - 0.2 - road.footpath, -hw - 0.15, 2, zFar)} fill={`url(#fp${id})`} />}
      {road.footpath > 0 && footpathRight && <path d={edgePath(road, hw + 0.15, hw + 0.2 + road.footpath, 2, zFar)} fill={`url(#fp${id})`} />}
      {/* kerb base, painted stripes are added by the moving canvas */}
      <path d={edgePath(road, -hw - 0.2, -hw, 2, zFar)} fill={shade(road.asphalt, 0.25)} />
      <path d={edgePath(road, hw, hw + 0.2, 2, zFar)} fill={shade(road.asphalt, 0.25)} />
      <path d={edgePath(road, -hw, hw, 2, zFar)} fill={`url(#as${id})`} />
    </g>
  )
}

/* ---------------------------------------------------------------- vegetation */

/** distant tree canopy silhouette running along the horizon */
export function TreeLine({
  y,
  h = 40,
  color = '#6f8458',
  seed = 1,
  x0 = -100,
  x1 = 1700,
  bump = 1,
}: {
  y: number
  h?: number
  color?: string
  seed?: number
  x0?: number
  x1?: number
  bump?: number
}) {
  const r = rng(seed)
  let d = `M${x0} ${y + 40} L${x0} ${y}`
  let x = x0
  while (x < x1) {
    const w = (18 + r() * 42) * bump
    const top = y - h * (0.45 + r() * 0.55)
    d += ` Q${x + w * 0.1} ${top} ${x + w / 2} ${top} Q${x + w * 0.9} ${top} ${x + w} ${y - h * 0.25 * r()}`
    x += w
  }
  d += ` L${x1} ${y + 40} Z`
  return (
    <Volume size={Math.max(0.8, h * 0.07)} strength={0.8}>
      <path d={d} fill={color} />
    </Volume>
  )
}

interface TreeColors {
  leaf?: string
  dark?: string
  light?: string
  trunk?: string
}

/** Rain tree (Samanea saman): the broad umbrella canopy over so many Bengaluru roads. h in metres. */
export function RainTree({
  x,
  y,
  s,
  seed = 1,
  h = 12,
  spread = 1,
  colors = {},
  flowers,
  lean = 0,
}: {
  x: number
  y: number
  s: number
  seed?: number
  h?: number
  spread?: number
  colors?: TreeColors
  /** sprinkle of blossoms, e.g. African tulip orange; bougainvillea belongs on walls, not here */
  flowers?: string
  lean?: number
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
  const under: { x: number; y: number; r: number }[] = []
  for (let i = 0; i <= 11; i++) {
    const t = i / 11
    under.push({ x: cx - rx * 0.86 + t * rx * 1.72, y: cy + ry * (0.55 + Math.sin(t * Math.PI) * 0.25) + (r() - 0.5) * ry * 0.2, r: H * (0.06 + r() * 0.04) })
  }
  const rim: { x: number; y: number; r: number; c: number }[] = []
  const n = 20
  for (let i = 0; i < n; i++) {
    const t = Math.PI * (1 - i / (n - 1))
    rim.push({
      x: cx + Math.cos(t) * rx * (0.9 + r() * 0.08),
      y: cy - Math.sin(t) * ry * (0.95 + r() * 0.25) + ry * 0.25,
      r: H * (0.075 + r() * 0.05),
      c: Math.cos(t),
    })
  }
  const mid = Array.from({ length: 9 }).map(() => ({ x: cx + (r() - 0.5) * rx * 1.3, y: cy + (r() - 0.6) * ry * 0.9, r: H * (0.09 + r() * 0.05) }))
  const limbs: [number, number, number][] = [
    [-0.72, 0.15, 1],
    [-0.3, -0.1, 0.85],
    [0.25, -0.05, 0.8],
    [0.68, 0.2, 0.9],
  ]
  const trunkPath = `M${x - tw} ${y} C${x - tw * 0.85} ${y - H * 0.18} ${cx - tw * 0.55} ${forkY + H * 0.06} ${cx - tw * 0.45} ${forkY} L${cx + tw * 0.45} ${forkY} C${cx + tw * 0.55} ${forkY + H * 0.06} ${x + tw * 0.85} ${y - H * 0.18} ${x + tw} ${y} Z`
  return (
    <g>
      <GroundShadow x={x} y={y} s={s} rx={rx * 0.85} opacity={0.3} />
      <path d={trunkPath} fill={trunk} />
      <path d={`M${x + tw * 0.2} ${y} C${x + tw * 0.3} ${y - H * 0.18} ${cx + tw * 0.25} ${forkY + H * 0.06} ${cx + tw * 0.3} ${forkY} L${cx + tw * 0.45} ${forkY} C${cx + tw * 0.55} ${forkY + H * 0.06} ${x + tw * 0.85} ${y - H * 0.18} ${x + tw} ${y} Z`} fill={shade(trunk, 0.15)} opacity="0.7" />
      {limbs.map(([dx, dy, k], i) => (
        <path
          key={i}
          d={`M${cx} ${forkY} Q${cx + dx * rx * 0.35} ${forkY - H * 0.12 + dy * H * 0.1} ${cx + dx * rx * 0.8} ${cy + ry * 0.5}`}
          stroke={trunk}
          strokeWidth={tw * 0.75 * k}
          fill="none"
          strokeLinecap="round"
        />
      ))}
      <Volume size={H * 0.03}>
      <ellipse cx={cx} cy={cy + ry * 0.15} rx={rx * 0.9} ry={ry * 0.75} fill={mix(leaf, dark, 0.35)} />
      {under.map((l, i) => (
        <circle key={`u${i}`} cx={l.x} cy={l.y} r={l.r} fill={dark} />
      ))}
      {mid.map((l, i) => (
        <circle key={`m${i}`} cx={l.x} cy={l.y} r={l.r} fill={mix(leaf, dark, 0.18)} />
      ))}
      {rim.map((l, i) => (
        <circle key={`r${i}`} cx={l.x} cy={l.y} r={l.r} fill={mix(leaf, dark, Math.max(0, -l.c) * 0.35)} />
      ))}
      {rim
        .filter((l) => l.c > -0.35)
        .map((l, i) => (
          <circle key={`h${i}`} cx={l.x + l.r * 0.28} cy={l.y - l.r * 0.32} r={l.r * 0.55} fill={light} opacity={0.3 + Math.max(0, l.c) * 0.3} />
        ))}
      </Volume>
      {flowers &&
        rim.slice(2, 18).map((l, i) => (
          <g key={`f${i}`} fill={flowers}>
            <circle cx={l.x + (r() - 0.5) * l.r} cy={l.y - l.r * 0.45} r={Math.max(1, H * 0.013)} />
            <circle cx={l.x + (r() - 0.5) * l.r * 1.2} cy={l.y - l.r * 0.1} r={Math.max(1, H * 0.01)} />
          </g>
        ))}
    </g>
  )
}

/** compact rounded tree (honge / neem style) */
export function RoundTree({ x, y, s, seed = 2, h = 7, colors = {} }: { x: number; y: number; s: number; seed?: number; h?: number; colors?: TreeColors }) {
  const r = rng(seed)
  const leaf = colors.leaf ?? '#55703f'
  const dark = colors.dark ?? PAL.leafDark
  const light = colors.light ?? PAL.leafLight
  const H = h * s
  const cy = y - H * 0.62
  const R = H * 0.36
  const tw = Math.max(1, 0.35 * s)
  return (
    <g>
      <path d={`M${x - tw} ${y} L${x - tw * 0.6} ${cy} L${x + tw * 0.6} ${cy} L${x + tw} ${y} Z`} fill={colors.trunk ?? PAL.trunk} />
      <GroundShadow x={x} y={y} s={s} rx={R * 1.1} opacity={0.26} />
      <Volume size={R * 0.1}>
      <circle cx={x} cy={cy + R * 0.15} r={R} fill={dark} />
      {Array.from({ length: 7 }).map((_, i) => {
        const a = (i / 7) * Math.PI * 2
        return <circle key={i} cx={x + Math.cos(a) * R * 0.55} cy={cy + Math.sin(a) * R * 0.45 - R * 0.1} r={R * (0.45 + r() * 0.15)} fill={leaf} />
      })}
      <circle cx={x + R * 0.3} cy={cy - R * 0.35} r={R * 0.42} fill={light} opacity="0.55" />
      </Volume>
    </g>
  )
}

export function Palm({ x, y, s, seed = 4, h = 11, lean = 0.15 }: { x: number; y: number; s: number; seed?: number; h?: number; lean?: number }) {
  const r = rng(seed)
  const H = h * s
  const tx = x + lean * H
  const ty = y - H
  const fronds = 9
  return (
    <g>
      <path d={`M${x} ${y} Q${x + lean * H * 0.2} ${y - H * 0.6} ${tx} ${ty}`} stroke="#8a7357" strokeWidth={Math.max(1.4, 0.32 * s)} fill="none" strokeLinecap="round" />
      {Array.from({ length: fronds }).map((_, i) => {
        const a = Math.PI * (1.05 + (i / (fronds - 1)) * 0.9) + (r() - 0.5) * 0.2
        const len = H * (0.32 + r() * 0.1)
        const ex = tx + Math.cos(a) * len
        const ey = ty + Math.sin(a) * len * 0.55 + len * 0.25
        const mx2 = tx + Math.cos(a) * len * 0.5
        const my2 = ty + Math.sin(a) * len * 0.5 - len * 0.12
        return (
          <path
            key={i}
            d={`M${tx} ${ty} Q${mx2} ${my2} ${ex} ${ey}`}
            stroke={i % 2 ? '#5b7a3c' : '#47652f'}
            strokeWidth={Math.max(1.6, 0.42 * s)}
            fill="none"
            strokeLinecap="round"
          />
        )
      })}
      <circle cx={tx} cy={ty + 0.3 * s} r={Math.max(1.2, 0.35 * s)} fill="#7a5a2a" />
    </g>
  )
}

/** bougainvillea spilling over a wall or gate: a Bengaluru constant, in flower all year */
export function Bougainvillea({ x, y, s, w = 3, h = 2, color = PAL.bougainvillea, seed = 5 }: { x: number; y: number; s: number; w?: number; h?: number; color?: string; seed?: number }) {
  const r = rng(seed)
  const W = w * s
  const H = h * s
  const blobs = Array.from({ length: 14 }).map(() => ({ x: x + (r() - 0.5) * W, y: y - r() * H, r: (0.18 + r() * 0.22) * Math.min(W, H) }))
  return (
    <Volume size={Math.min(W, H) * 0.05}>
      {blobs.map((b, i) => (
        <circle key={`l${i}`} cx={b.x} cy={b.y + b.r * 0.3} r={b.r * 0.9} fill={i % 2 ? '#3f5a31' : '#4f6d39'} />
      ))}
      {blobs.map((b, i) => (
        <circle key={`f${i}`} cx={b.x + b.r * 0.2} cy={b.y} r={b.r * 0.7} fill={i % 3 === 0 ? shade(color, 0.2) : color} opacity="0.92" />
      ))}
    </Volume>
  )
}

/* ---------------------------------------------------------------- buildings */

function sideFace(x0: number, yTop: number, yBot: number, s: number, depthM: number) {
  // one-point perspective side face receding from the near vertical edge at x0 by depthM metres
  const Z = F / s
  const k = Z / (Z + depthM)
  const xf = VPX + (x0 - VPX) * k
  const ytf = HORIZON + (yTop - HORIZON) * k
  const ybf = HORIZON + (yBot - HORIZON) * k
  return `M${x0} ${yTop} L${xf} ${ytf} L${xf} ${ybf} L${x0} ${yBot} Z`
}

export interface BuildingProps {
  x: number
  y: number
  s: number
  /** width and height in metres */
  w: number
  h: number
  color: string
  seed?: number
  /** which side face to show (faces the road). For a building right of the road, 'left'. */
  side?: 'left' | 'right' | 'none'
  depth?: number
  balconies?: boolean
  tanks?: number
  /** share of windows lit warm, 0..1 (evening scenes) */
  lit?: number
  windowColor?: string
  trim?: string
  /** ground floor of shops with signs */
  shops?: { sign?: string; signColor?: string; awning?: string }[]
}

/** Mid-rise apartment block with balconies and the black rooftop water tanks every Indian city knows. */
export function Building({
  x,
  y,
  s,
  w,
  h,
  color,
  seed = 7,
  side = 'none',
  depth = 8,
  balconies = true,
  tanks = 1,
  lit = 0,
  windowColor,
  trim,
  shops,
}: BuildingProps) {
  const r = rng(seed)
  const W = w * s
  const H = h * s
  const x0 = x - W / 2
  const top = y - H
  const floorH = 3.1 * s
  const floors = Math.max(1, Math.floor(h / 3.1))
  const cols = Math.max(1, Math.floor(w / 2.6))
  const winW = 1.0 * s
  const winH = 1.25 * s
  const glass = windowColor ?? mix(color, PAL.glass, 0.62)
  const trimC = trim ?? shade(color, -0.12)
  const items: ReactNode[] = []
  const shopFloor = shops && shops.length > 0
  for (let f = shopFloor ? 1 : 0; f < floors; f++) {
    const fy = y - (f + 1) * floorH
    for (let c = 0; c < cols; c++) {
      const cx = x0 + (W / cols) * (c + 0.5)
      const isLit = r() < lit
      items.push(<rect key={`w${f}-${c}`} x={cx - winW / 2} y={fy + floorH * 0.28} width={winW} height={winH} fill={isLit ? PAL.windowLit : glass} />)
      if (!isLit && r() > 0.6) items.push(<rect key={`g${f}-${c}`} x={cx - winW / 2} y={fy + floorH * 0.28} width={winW * 0.45} height={winH} fill={shade(glass, 0.12)} />)
    }
    if (balconies && f > 0) {
      items.push(<rect key={`b${f}`} x={x0 + W * 0.04} y={fy + floorH * 0.68} width={W * 0.92} height={floorH * 0.24} fill={shade(color, 0.1)} />)
      items.push(<rect key={`bs${f}`} x={x0 + W * 0.04} y={fy + floorH * 0.66} width={W * 0.92} height={Math.max(0.8, 0.12 * s)} fill={trimC} />)
    }
  }
  const shopEls: ReactNode[] = []
  if (shopFloor) {
    const sw = W / shops!.length
    shops!.forEach((sh, i) => {
      const sx = x0 + i * sw
      const sTop = y - floorH
      shopEls.push(
        <g key={`s${i}`}>
          <rect x={sx + sw * 0.06} y={sTop + floorH * 0.38} width={sw * 0.88} height={floorH * 0.62} fill="#2d2622" />
          <rect x={sx + sw * 0.1} y={sTop + floorH * 0.55} width={sw * 0.8} height={floorH * 0.18} fill={mix('#d8b98a', sh.signColor ?? '#b85a3a', 0.3)} opacity="0.55" />
          {sh.awning && <path d={`M${sx + sw * 0.03} ${sTop + floorH * 0.38} L${sx + sw * 0.97} ${sTop + floorH * 0.38} L${sx + sw * 1.0} ${sTop + floorH * 0.52} L${sx} ${sTop + floorH * 0.52} Z`} fill={sh.awning} />}
          <rect x={sx + sw * 0.04} y={sTop + floorH * 0.08} width={sw * 0.92} height={floorH * 0.26} fill={sh.signColor ?? '#b85a3a'} />
          {sh.sign && s > 9 && <rect x={sx + sw * 0.3} y={sTop + floorH * 0.18} width={sw * 0.4} height={floorH * 0.05} rx={floorH * 0.02} fill="#fff6e8" opacity="0.55" />}
        </g>,
      )
    })
  }
  const tankEls: ReactNode[] = []
  for (let t = 0; t < tanks; t++) {
    const tx = x0 + W * (0.2 + r() * 0.6)
    const tw = 1.25 * s
    const th = 1.35 * s
    tankEls.push(
      <g key={`t${t}`}>
        <rect x={tx - 0.15 * s} y={top - 0.9 * s} width={0.3 * s} height={0.9 * s} fill={shade(color, -0.3)} />
        <rect x={tx - tw / 2} y={top - 0.9 * s - th} width={tw} height={th} rx={tw * 0.12} fill={PAL.tank} />
        <ellipse cx={tx} cy={top - 0.9 * s - th} rx={tw / 2} ry={tw * 0.14} fill="#3a3634" />
      </g>,
    )
  }
  const gid = useId().replace(/:/g, '')
  return (
    <g>
      <defs>
        <linearGradient id={`bl${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff2d6" stopOpacity="0.16" />
          <stop offset="0.55" stopColor="#fff2d6" stopOpacity="0" />
          <stop offset="0.88" stopColor="#2a1a10" stopOpacity="0.08" />
          <stop offset="1" stopColor="#2a1a10" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id={`bh${gid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a1a10" stopOpacity="0.12" />
          <stop offset="0.5" stopColor="#2a1a10" stopOpacity="0" />
          <stop offset="1" stopColor="#fff0cf" stopOpacity="0.14" />
        </linearGradient>
      </defs>
      <GroundShadow x={x} y={y} s={s} rx={W * 0.62} opacity={0.22} shift={-0.18} />
      {side !== 'none' && (
        <path d={sideFace(side === 'left' ? x0 : x0 + W, top, y, s, depth)} fill={side === 'left' ? shade(color, -0.22) : shade(color, 0.08)} />
      )}
      <rect x={x0} y={top} width={W} height={H} fill={color} />
      <rect x={x0 + W * 0.72} y={top} width={W * 0.28} height={H} fill={shade(color, 0.06)} opacity="0.6" />
      {items}
      {shopEls}
      <rect x={x0} y={top} width={W} height={H} fill={`url(#bl${gid})`} />
      <rect x={x0} y={top} width={W} height={H} fill={`url(#bh${gid})`} />
      <rect x={x0 - 0.15 * s} y={top - 0.35 * s} width={W + 0.3 * s} height={0.4 * s} fill={trimC} />
      {tankEls}
    </g>
  )
}

/** glass-and-steel office tower: East Bengaluru tech parks */
export function GlassTower({
  x,
  y,
  s,
  w,
  h,
  glassTop = '#9fb4c4',
  glassBottom = '#e8b98a',
  frame = '#d9dde0',
  side = 'none',
  depth = 18,
  seed = 11,
  lit = 0,
}: {
  x: number
  y: number
  s: number
  w: number
  h: number
  glassTop?: string
  glassBottom?: string
  frame?: string
  side?: 'left' | 'right' | 'none'
  depth?: number
  seed?: number
  lit?: number
}) {
  const id = useId().replace(/:/g, '')
  const r = rng(seed)
  const W = w * s
  const H = h * s
  const x0 = x - W / 2
  const top = y - H
  const floors = Math.floor(h / 3.6)
  const mull = Math.max(2, Math.floor(w / 1.8))
  return (
    <g>
      <defs>
        <linearGradient id={`gl${id}`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={glassTop} />
          <stop offset="0.7" stopColor={mix(glassTop, glassBottom, 0.6)} />
          <stop offset="1" stopColor={glassBottom} />
        </linearGradient>
      </defs>
      {side !== 'none' && <path d={sideFace(side === 'left' ? x0 : x0 + W, top, y, s, depth)} fill={side === 'left' ? shade(glassTop, -0.3) : shade(glassBottom, 0.05)} />}
      <rect x={x0} y={top} width={W} height={H} fill={`url(#gl${id})`} />
      {Array.from({ length: floors }).map((_, f) => (
        <rect key={f} x={x0} y={top + f * 3.6 * s} width={W} height={Math.max(0.6, 0.35 * s)} fill={frame} opacity="0.55" />
      ))}
      {Array.from({ length: mull }).map((_, m) => (
        <rect key={`m${m}`} x={x0 + (W / mull) * m} y={top} width={Math.max(0.5, 0.12 * s)} height={H} fill={frame} opacity="0.35" />
      ))}
      {lit > 0 &&
        Array.from({ length: Math.floor(floors * mull * lit) }).map((_, i) => {
          const f = Math.floor(r() * floors)
          const m = Math.floor(r() * mull)
          return <rect key={`l${i}`} x={x0 + (W / mull) * m + 1} y={top + f * 3.6 * s + 0.6 * s} width={W / mull - 2} height={2.2 * s} fill={PAL.windowLit} opacity="0.75" />
        })}
      <rect x={x0 + W * 0.62} y={top} width={W * 0.12} height={H} fill="#fff8ec" opacity="0.18" />
      <rect x={x0 - 0.2 * s} y={top - 0.6 * s} width={W + 0.4 * s} height={0.6 * s} fill={frame} />
    </g>
  )
}

/**
 * Old Bengaluru bungalow: Mangalore-tile hipped roof, deep verandah on pillars, painted wooden shutters,
 * a low compound wall with gate pillars in front.
 */
export function Bungalow({
  x,
  y,
  s,
  w = 11,
  h = 3.6,
  wall = PAL.wallWarm,
  roof = PAL.roofTile,
  shutter = '#3f6d6a',
  seed = 13,
  compound = true,
  compoundColor,
  storeys = 1,
}: {
  x: number
  y: number
  s: number
  w?: number
  h?: number
  wall?: string
  roof?: string
  shutter?: string
  seed?: number
  compound?: boolean
  compoundColor?: string
  storeys?: 1 | 2
}) {
  const r = rng(seed)
  const W = w * s
  const bodyH = h * s * storeys
  const x0 = x - W / 2
  const by = y - 1.0 * s // house sits slightly behind the compound wall
  const top = by - bodyH
  const eave = 0.8 * s
  const ridgeH = 2.4 * s
  const ridgeW = W * 0.45
  const tiles: ReactNode[] = []
  const rows = 7
  for (let i = 1; i < rows; i++) {
    const t = i / rows
    const yy = top - ridgeH * t
    const half = (W / 2 + eave) * (1 - t) + (ridgeW / 2) * t
    tiles.push(<line key={i} x1={x - half} y1={yy} x2={x + half} y2={yy} stroke={shade(roof, -0.25)} strokeWidth={Math.max(0.5, 0.06 * s)} opacity="0.7" />)
  }
  const pillars = Math.max(3, Math.round(w / 2.6))
  const verandahW = W * 0.62
  const vx0 = x - verandahW / 2 - W * 0.08
  return (
    <g>
      <rect x={x0} y={top} width={W} height={bodyH} fill={wall} />
      <rect x={x0 + W * 0.7} y={top} width={W * 0.3} height={bodyH} fill={shade(wall, 0.08)} opacity="0.7" />
      {/* verandah */}
      <rect x={vx0} y={by - h * s * 0.92} width={verandahW} height={h * s * 0.92} fill={shade(wall, -0.32)} />
      {Array.from({ length: pillars }).map((_, i) => {
        const px = vx0 + (verandahW / (pillars - 1)) * i
        return <rect key={i} x={px - 0.14 * s} y={by - h * s * 0.92} width={0.28 * s} height={h * s * 0.92} fill={shade(wall, 0.15)} />
      })}
      {/* windows with painted shutters */}
      {[0.84, 0.16].map((fx, i) => (
        <g key={`w${i}`}>
          <rect x={x0 + W * fx - 0.7 * s} y={by - h * s * 0.75} width={1.4 * s} height={1.5 * s} fill="#2a2421" />
          <rect x={x0 + W * fx - 1.15 * s} y={by - h * s * 0.75} width={0.42 * s} height={1.5 * s} fill={shutter} />
          <rect x={x0 + W * fx + 0.73 * s} y={by - h * s * 0.75} width={0.42 * s} height={1.5 * s} fill={shutter} />
        </g>
      ))}
      {storeys === 2 &&
        [0.2, 0.5, 0.8].map((fx, i) => <rect key={`u${i}`} x={x0 + W * fx - 0.6 * s} y={top + h * s * 0.3} width={1.2 * s} height={1.4 * s} fill="#2a2421" />)}
      {/* tiled hipped roof */}
      <path d={`M${x0 - eave} ${top + 0.15 * s} L${x - ridgeW / 2} ${top - ridgeH} L${x + ridgeW / 2} ${top - ridgeH} L${x0 + W + eave} ${top + 0.15 * s} Z`} fill={roof} />
      <path d={`M${x} ${top + 0.15 * s} L${x + ridgeW / 2} ${top - ridgeH} L${x0 + W + eave} ${top + 0.15 * s} Z`} fill={shade(roof, 0.12)} opacity="0.6" />
      {tiles}
      <rect x={x0 - eave} y={top + 0.05 * s} width={W + eave * 2} height={0.22 * s} fill={shade(roof, -0.35)} />
      {compound && (
        <g>
          <rect x={x0 - 1.2 * s} y={y - 1.35 * s} width={W + 2.4 * s} height={1.35 * s} fill={compoundColor ?? shade(wall, -0.06)} />
          <rect x={x0 - 1.2 * s} y={y - 1.45 * s} width={W + 2.4 * s} height={0.14 * s} fill={shade(compoundColor ?? wall, -0.2)} />
          {[x - 1.4 * s, x + 1.4 * s].map((gx, i) => (
            <rect key={i} x={gx - 0.3 * s} y={y - 1.9 * s} width={0.6 * s} height={1.9 * s} fill={shade(compoundColor ?? wall, -0.12)} />
          ))}
          <rect x={x - 1.1 * s} y={y - 1.25 * s} width={2.2 * s} height={1.25 * s} fill="#2f2a27" opacity="0.85" />
          {r() > 0.3 && <Bougainvillea x={x0 + W * 0.05} y={y - 1.3 * s} s={s} w={3} h={1.6} seed={seed + 1} />}
        </g>
      )}
    </g>
  )
}

export interface Shop {
  /** width in metres */
  w: number
  sign?: string
  signColor?: string
  awning?: string
  open?: boolean
  /** goods colours shown inside an open shop */
  goods?: string[]
}

/** row of ground-floor shops with signboards, rolling shutters and awnings, homes above */
export function ShopRow({
  x,
  y,
  s,
  shops,
  upper = 1,
  wall = PAL.wallWarm,
  seed = 17,
  lit = 0,
  side = 'none',
}: {
  x: number
  y: number
  s: number
  shops: Shop[]
  upper?: number
  wall?: string
  seed?: number
  lit?: number
  side?: 'left' | 'right' | 'none'
}) {
  const r = rng(seed)
  const total = shops.reduce((a, sh) => a + sh.w, 0)
  const W = total * s
  const x0 = x - W / 2
  const gH = 3.3 * s
  const uH = upper * 3.1 * s
  const top = y - gH - uH
  let cx = x0
  const els: ReactNode[] = []
  shops.forEach((sh, i) => {
    const sw = sh.w * s
    const open = sh.open ?? true
    els.push(
      <g key={i}>
        <rect x={cx + 0.15 * s} y={y - gH * 0.68} width={sw - 0.3 * s} height={gH * 0.68} fill={open ? '#2b2420' : '#8f8a83'} />
        {!open &&
          Array.from({ length: 8 }).map((_, k) => (
            <line key={k} x1={cx + 0.15 * s} x2={cx + sw - 0.15 * s} y1={y - gH * 0.68 + (gH * 0.68 * k) / 8} y2={y - gH * 0.68 + (gH * 0.68 * k) / 8} stroke="#6f6a63" strokeWidth={Math.max(0.4, 0.04 * s)} />
          ))}
        {open &&
          (sh.goods ?? ['#d8a24a', '#b5523a', '#e9d7b0']).map((g, k, arr) => (
            <rect key={`g${k}`} x={cx + 0.35 * s + k * ((sw - 0.7 * s) / arr.length)} y={y - gH * 0.42 - r() * gH * 0.1} width={(sw - 0.7 * s) / arr.length - 0.1 * s} height={gH * 0.42} fill={g} opacity="0.85" />
          ))}
        {open && <rect x={cx + 0.15 * s} y={y - gH * 0.68} width={sw - 0.3 * s} height={gH * 0.18} fill={PAL.windowLit} opacity={0.18 + lit * 0.4} />}
        {sh.awning && (
          <g>
            <path d={`M${cx} ${y - gH * 0.7} L${cx + sw} ${y - gH * 0.7} L${cx + sw + 0.2 * s} ${y - gH * 0.52} L${cx - 0.2 * s} ${y - gH * 0.52} Z`} fill={sh.awning} />
            {Array.from({ length: Math.max(2, Math.floor(sh.w / 0.8)) }).map((_, k, arr) => (
              <rect key={k} x={cx + (sw / arr.length) * k} y={y - gH * 0.7} width={sw / arr.length / 2} height={gH * 0.18} fill="#fff6e8" opacity="0.28" />
            ))}
          </g>
        )}
        <rect x={cx + 0.1 * s} y={y - gH * 0.98} width={sw - 0.2 * s} height={gH * 0.24} fill={sh.signColor ?? '#a3402e'} />
        {sh.sign && s > 7 && (
          <text x={cx + sw / 2} y={y - gH * 0.82} fontFamily="Manrope, sans-serif" fontWeight={800} fontSize={Math.min(gH * 0.13, (sw / Math.max(4, sh.sign.length)) * 1.5)} fill="#fff6e8" textAnchor="middle" letterSpacing="0.4">
            {sh.sign}
          </text>
        )}
      </g>,
    )
    cx += sw
  })
  const ucols = Math.max(2, Math.floor(total / 2.8))
  return (
    <g>
      {side !== 'none' && <path d={sideFace(side === 'left' ? x0 : x0 + W, top, y, s, 6)} fill={side === 'left' ? shade(wall, -0.25) : shade(wall, 0.05)} />}
      <rect x={x0} y={top} width={W} height={gH + uH} fill={wall} />
      <rect x={x0 + W * 0.75} y={top} width={W * 0.25} height={gH + uH} fill={shade(wall, 0.06)} opacity="0.6" />
      {upper > 0 &&
        Array.from({ length: upper }).map((_, f) =>
          Array.from({ length: ucols }).map((__, c) => {
            const wx = x0 + (W / ucols) * (c + 0.5)
            const wy = top + f * 3.1 * s + 0.8 * s
            const isLit = r() < lit
            return <rect key={`${f}-${c}`} x={wx - 0.55 * s} y={wy} width={1.1 * s} height={1.3 * s} fill={isLit ? PAL.windowLit : mix(wall, PAL.glass, 0.6)} />
          }),
        )}
      <rect x={x0} y={y - gH - 0.25 * s} width={W} height={0.25 * s} fill={shade(wall, -0.18)} />
      {els}
      <rect x={x0 - 0.1 * s} y={top - 0.3 * s} width={W + 0.2 * s} height={0.35 * s} fill={shade(wall, -0.15)} />
    </g>
  )
}

/* ---------------------------------------------------------------- street furniture */

export function Lamp({ x, y, s, h = 7.5, lit = false, arm = 'left' }: { x: number; y: number; s: number; h?: number; lit?: boolean; arm?: 'left' | 'right' }) {
  const id = useId().replace(/:/g, '')
  const H = h * s
  const dir = arm === 'left' ? -1 : 1
  const hx = x + dir * 1.4 * s
  const hy = y - H + 0.2 * s
  return (
    <g>
      {lit && (
        <defs>
          <radialGradient id={`lg${id}`}>
            <stop offset="0" stopColor="#ffd98f" stopOpacity="0.85" />
            <stop offset="1" stopColor="#ffd98f" stopOpacity="0" />
          </radialGradient>
        </defs>
      )}
      <rect x={x - 0.08 * s} y={y - H} width={0.16 * s} height={H} fill="#55504b" />
      <path d={`M${x} ${y - H + 0.4 * s} Q${x + dir * 0.6 * s} ${y - H - 0.2 * s} ${hx} ${hy}`} stroke="#55504b" strokeWidth={Math.max(0.6, 0.1 * s)} fill="none" />
      <rect x={hx - 0.35 * s} y={hy - 0.05 * s} width={0.7 * s} height={0.18 * s} rx={0.08 * s} fill="#3e3a36" />
      {lit && <circle cx={hx} cy={hy + 0.3 * s} r={2.2 * s} fill={`url(#lg${id})`} />}
    </g>
  )
}

const SKIN = ['#8d5a3b', '#a56b45', '#7a4b31', '#b07a52']
const CLOTH = ['#b93432', '#e7b958', '#ffffff', '#3a5a7a', '#7a2f4a', '#e5d3b3', '#2f5d4a', '#c96b3a', '#f2e6cf', '#5b3a6a']

/** small figure, 1.65 m tall. Variants: man, woman (saree, laal paar likes white with a red border), kid */
export function Person({
  x,
  y,
  s,
  seed = 1,
  variant,
  flip = false,
  colors,
}: {
  x: number
  y: number
  s: number
  seed?: number
  variant?: 'man' | 'woman' | 'kid' | 'lalpaar'
  flip?: boolean
  colors?: [string, string]
}) {
  const r = rng(seed)
  const v = variant ?? (['man', 'woman', 'man', 'woman', 'kid'] as const)[Math.floor(r() * 5)]
  const h = (v === 'kid' ? 1.15 : v === 'woman' || v === 'lalpaar' ? 1.58 : 1.68) * s
  const skin = SKIN[Math.floor(r() * SKIN.length)]
  const c1 = colors?.[0] ?? CLOTH[Math.floor(r() * CLOTH.length)]
  const c2 = colors?.[1] ?? CLOTH[Math.floor(r() * CLOTH.length)]
  const f = flip ? -1 : 1
  const head = h * 0.075
  const sw = h * 0.13
  const g = (d: string, fill: string, k: string | number) => <path key={k} d={d} fill={fill} transform={flip ? `translate(${2 * x} 0) scale(-1 1)` : undefined} />
  const parts: ReactNode[] = []
  if (v === 'woman' || v === 'lalpaar') {
    const saree = v === 'lalpaar' ? '#fbf3e6' : c1
    const border = v === 'lalpaar' ? '#b9262c' : shade(c1, -0.3)
    parts.push(g(`M${x - sw * 0.5} ${y - h * 0.82} L${x + sw * 0.55} ${y - h * 0.82} L${x + sw * 0.75} ${y} L${x - sw * 0.75} ${y} Z`, saree, 'b'))
    parts.push(g(`M${x - sw * 0.75} ${y - h * 0.05} L${x + sw * 0.75} ${y - h * 0.05} L${x + sw * 0.78} ${y} L${x - sw * 0.78} ${y} Z`, border, 'bd'))
    parts.push(g(`M${x + sw * 0.45} ${y - h * 0.82} L${x + sw * 0.6} ${y - h * 0.8} L${x - sw * 0.2} ${y - h * 0.45} L${x - sw * 0.38} ${y - h * 0.5} Z`, border, 'pallu'))
  } else if (v === 'kid') {
    parts.push(g(`M${x - sw * 0.5} ${y - h * 0.78} L${x + sw * 0.5} ${y - h * 0.78} L${x + sw * 0.55} ${y - h * 0.38} L${x - sw * 0.55} ${y - h * 0.38} Z`, c1, 'b'))
    parts.push(g(`M${x - sw * 0.4} ${y - h * 0.38} L${x - sw * 0.05} ${y - h * 0.38} L${x - sw * 0.1} ${y} L${x - sw * 0.38} ${y} Z M${x + sw * 0.05} ${y - h * 0.38} L${x + sw * 0.4} ${y - h * 0.38} L${x + sw * 0.38} ${y} L${x + sw * 0.1} ${y} Z`, '#3b3a44', 'l'))
  } else {
    parts.push(g(`M${x - sw * 0.55} ${y - h * 0.82} L${x + sw * 0.55} ${y - h * 0.82} L${x + sw * 0.5} ${y - h * 0.42} L${x - sw * 0.5} ${y - h * 0.42} Z`, c1, 'b'))
    parts.push(g(`M${x - sw * 0.45} ${y - h * 0.42} L${x - sw * 0.04} ${y - h * 0.42} L${x - sw * 0.12} ${y} L${x - sw * 0.42} ${y} Z M${x + sw * 0.04} ${y - h * 0.42} L${x + sw * 0.45} ${y - h * 0.42} L${x + sw * 0.4} ${y} L${x + sw * 0.12} ${y} Z`, c2 === c1 ? '#3b3a44' : mix(c2, '#2b2a33', 0.5), 'l'))
  }
  return (
    <g>
      <ellipse cx={x - sw * 0.35} cy={y} rx={sw * 1.1} ry={Math.max(0.4, sw * 0.18)} fill="#1c120b" opacity="0.22" />
      {parts}
      <circle cx={x + f * sw * 0.02} cy={y - h * 0.82 - head} r={head} fill={skin} />
      <path d={`M${x - head} ${y - h * 0.82 - head * 1.2} Q${x} ${y - h * 0.82 - head * 2.35} ${x + head} ${y - h * 0.82 - head * 1.2} Z`} fill="#1f1714" />
    </g>
  )
}

/** a scatter of people at ground depth Z between lateral X0 and X1 (metres) */
export function Crowd({ X0, X1, Z0, Z1, count, seed = 21, lalpaar = 0 }: { X0: number; X1: number; Z0: number; Z1: number; count: number; seed?: number; lalpaar?: number }) {
  const r = rng(seed)
  const people = Array.from({ length: count }).map((_, i) => {
    const Z = Z0 + (Z1 - Z0) * r()
    const X = X0 + (X1 - X0) * r()
    const p = proj(X, 0, Z)
    return { ...p, s: F / Z, Z, seed: seed * 31 + i, flip: r() > 0.5, lal: r() < lalpaar }
  })
  people.sort((a, b) => b.Z - a.Z)
  return (
    <g>
      {people.map((p, i) => (
        <Person key={i} x={p.x} y={p.y} s={p.s} seed={p.seed} flip={p.flip} variant={p.lal ? 'lalpaar' : undefined} />
      ))}
    </g>
  )
}

export function Wall({ x1: xa, x2: xb, y, s, h = 2.4, color = '#e3cfa8', coping, pillarEvery = 3.5 }: { x1: number; x2: number; y: number; s: number; h?: number; color?: string; coping?: string; pillarEvery?: number }) {
  const x1 = Math.min(xa, xb)
  const x2 = Math.max(xa, xb)
  const H = h * s
  const n = Math.max(1, Math.floor((x2 - x1) / (pillarEvery * s)))
  return (
    <g>
      <rect x={x1} y={y - H} width={x2 - x1} height={H} fill={color} />
      <rect x={x1} y={y - H - 0.18 * s} width={x2 - x1} height={0.22 * s} fill={coping ?? shade(color, -0.2)} />
      {Array.from({ length: n + 1 }).map((_, i) => (
        <rect key={i} x={x1 + ((x2 - x1) / n) * i - 0.22 * s} y={y - H - 0.3 * s} width={0.44 * s} height={H + 0.3 * s} fill={shade(color, -0.1)} />
      ))}
      <rect x={x1} y={y - 0.25 * s} width={x2 - x1} height={0.25 * s} fill={shade(color, -0.25)} />
    </g>
  )
}

/** a string of small festival flags: use sparingly, one or two per scene at most */
export function Bunting({ x1, y1, x2, y2, sag = 18, colors = ['#b93432', '#fff6e8', '#e7b958'], flags = 14, size = 9 }: { x1: number; y1: number; x2: number; y2: number; sag?: number; colors?: string[]; flags?: number; size?: number }) {
  const pts = Array.from({ length: flags }).map((_, i) => {
    const t = (i + 0.5) / flags
    const x = x1 + (x2 - x1) * t
    const y = y1 + (y2 - y1) * t + sag * 4 * t * (1 - t)
    return { x, y }
  })
  return (
    <g>
      <path d={`M${x1} ${y1} Q${(x1 + x2) / 2} ${(y1 + y2) / 2 + sag * 2} ${x2} ${y2}`} stroke="#5a463c" strokeWidth="0.8" fill="none" opacity="0.7" />
      {pts.map((p, i) => (
        <path key={i} d={`M${p.x - size / 2} ${p.y} L${p.x + size / 2} ${p.y} L${p.x} ${p.y + size * 1.3} Z`} fill={colors[i % colors.length]} />
      ))}
    </g>
  )
}

/** a string of marigolds (genda phool) between two points */
export function Marigolds({ x1, y1, x2, y2, sag = 10, r = 2.2 }: { x1: number; y1: number; x2: number; y2: number; sag?: number; r?: number }) {
  const n = Math.max(4, Math.floor(Math.hypot(x2 - x1, y2 - y1) / (r * 1.7)))
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const t = i / (n - 1)
        const x = x1 + (x2 - x1) * t
        const y = y1 + (y2 - y1) * t + sag * 4 * t * (1 - t)
        return <circle key={i} cx={x} cy={y} r={r} fill={i % 5 === 2 ? '#fff4dc' : i % 2 ? '#f0a020' : '#e66a1f'} />
      })}
    </g>
  )
}

/**
 * Pujo entrance: cloth-wrapped pillars with a laal paar (red border), a curved Bengal chala roof,
 * marigold strings and a warm glow inside. Restrained on purpose: a neighbourhood celebration, not a palace.
 */
export function PandalGate({ x, y, s, w = 8, h = 6.5, text = false, glow = 1 }: { x: number; y: number; s: number; w?: number; h?: number; text?: boolean; glow?: number }) {
  const id = useId().replace(/:/g, '')
  const W = w * s
  const H = h * s
  const pw = 0.9 * s
  const x0 = x - W / 2
  const lintelY = y - H
  const lintelH = 1.0 * s
  const roofH = 1.9 * s
  return (
    <g>
      <defs>
        <radialGradient id={`pg${id}`} cx="0.5" cy="0.62" r="0.62">
          <stop offset="0" stopColor="#ffe3a0" stopOpacity={0.95 * glow} />
          <stop offset="0.45" stopColor="#f2a54a" stopOpacity={0.75 * glow} />
          <stop offset="1" stopColor="#7a2a1c" stopOpacity="0.9" />
        </radialGradient>
      </defs>
      {/* inner glow (the protima is suggested by a golden chalchitra arch, never drawn in detail) */}
      <rect x={x0 + pw} y={lintelY + lintelH} width={W - pw * 2} height={H - lintelH} fill={`url(#pg${id})`} />
      <path d={`M${x - W * 0.2} ${y - 0.4 * s} L${x - W * 0.2} ${y - H * 0.55} A${W * 0.2} ${W * 0.2} 0 0 1 ${x + W * 0.2} ${y - H * 0.55} L${x + W * 0.2} ${y - 0.4 * s}`} fill="none" stroke="#f6c860" strokeWidth={Math.max(1, 0.18 * s)} opacity={0.8 * glow} />
      <circle cx={x} cy={y - H * 0.5} r={W * 0.07} fill="#fff1c4" opacity={0.7 * glow} />
      {/* pillars in white cloth with red border */}
      {[x0, x0 + W - pw].map((px, i) => (
        <g key={i}>
          <rect x={px} y={lintelY} width={pw} height={H} fill="#fbf3e6" />
          <rect x={px} y={lintelY} width={pw * 0.18} height={H} fill="#b9262c" />
          <rect x={px + pw * 0.82} y={lintelY} width={pw * 0.18} height={H} fill="#b9262c" />
          <rect x={px} y={y - 0.5 * s} width={pw} height={0.5 * s} fill="#b9262c" />
        </g>
      ))}
      {/* lintel band */}
      <rect x={x0 - 0.3 * s} y={lintelY} width={W + 0.6 * s} height={lintelH} fill={PAL.burgundy} />
      <rect x={x0 - 0.3 * s} y={lintelY + lintelH - 0.16 * s} width={W + 0.6 * s} height={0.16 * s} fill={PAL.gold} />
      {text && (
        <text x={x} y={lintelY + lintelH * 0.68} fontFamily="'Tiro Bangla', 'Noto Serif Bengali', serif" fontSize={lintelH * 0.6} fill="#fff6e8" textAnchor="middle">
          শারদোৎসব
        </text>
      )}
      {/* curved chala roof */}
      <path
        d={`M${x0 - 0.6 * s} ${lintelY} Q${x} ${lintelY - roofH * 2.1} ${x0 + W + 0.6 * s} ${lintelY} Z`}
        fill="#8a2230"
      />
      <path d={`M${x0 - 0.6 * s} ${lintelY} Q${x} ${lintelY - roofH * 2.1} ${x0 + W + 0.6 * s} ${lintelY}`} fill="none" stroke={PAL.gold} strokeWidth={Math.max(0.8, 0.14 * s)} />
      <path d={`M${x0 + 0.4 * s} ${lintelY} Q${x} ${lintelY - roofH * 1.55} ${x0 + W - 0.4 * s} ${lintelY}`} fill="none" stroke="#fbf3e6" strokeWidth={Math.max(0.6, 0.08 * s)} opacity="0.7" />
      <path d={`M${x} ${lintelY - roofH * 1.05} l${-0.25 * s} ${-0.2 * s} l${0.25 * s} ${-0.9 * s} l${0.25 * s} ${0.9 * s} Z`} fill={PAL.gold} />
      {/* marigold strings */}
      <Marigolds x1={x0 + pw} y1={lintelY + lintelH} x2={x0 + W - pw} y2={lintelY + lintelH} sag={0.8 * s} r={Math.max(1, 0.16 * s)} />
      {[0.25, 0.5, 0.75].map((t) => (
        <Marigolds key={t} x1={x0 + W * t} y1={lintelY + lintelH} x2={x0 + W * t} y2={lintelY + lintelH + 1.6 * s} sag={0} r={Math.max(0.9, 0.14 * s)} />
      ))}
    </g>
  )
}

/** dhaki: drummer with the dhaak slung at the waist and its tall white plume */
export function Dhaki({ x, y, s, flip = false }: { x: number; y: number; s: number; flip?: boolean }) {
  const d = flip ? -1 : 1
  return (
    <g>
      <Person x={x} y={y} s={s} variant="man" colors={['#fbf3e6', '#e9dcc4']} seed={91} flip={flip} />
      <ellipse cx={x + d * 0.35 * s} cy={y - 0.85 * s} rx={0.42 * s} ry={0.32 * s} fill="#8a5a2b" />
      <ellipse cx={x + d * 0.35 * s} cy={y - 0.85 * s} rx={0.42 * s} ry={0.32 * s} fill="none" stroke="#3a2418" strokeWidth={Math.max(0.5, 0.05 * s)} />
      <path d={`M${x + d * 0.6 * s} ${y - 1.0 * s} Q${x + d * 1.0 * s} ${y - 2.0 * s} ${x + d * 0.75 * s} ${y - 2.6 * s} Q${x + d * 1.3 * s} ${y - 2.2 * s} ${x + d * 0.9 * s} ${y - 1.0 * s} Z`} fill="#fbf7ee" />
      <path d={`M${x + d * 0.7 * s} ${y - 1.0 * s} L${x + d * 0.85 * s} ${y - 2.3 * s}`} stroke="#d9cdb5" strokeWidth={Math.max(0.4, 0.04 * s)} />
    </g>
  )
}

/** Namma Metro viaduct crossing the view, with an optional train */
export function MetroViaduct({
  y,
  s,
  x1 = -100,
  x2 = 1700,
  h = 10,
  pillars,
  train,
  color = '#d6cdbf',
}: {
  y: number
  s: number
  x1?: number
  x2?: number
  h?: number
  pillars: number[]
  train?: { x: number; len: number; livery: 'purple' | 'green' | 'yellow'; lit?: boolean }
  color?: string
}) {
  const deckY = y - h * s
  const deckH = 1.8 * s
  const livery = { purple: '#6a3d8f', green: '#2f8a4c', yellow: '#e2b21f' }
  return (
    <g>
      {pillars.map((px, i) => (
        <g key={i}>
          <rect x={px - 0.9 * s} y={deckY} width={1.8 * s} height={h * s} fill={shade(color, -0.08)} />
          <rect x={px + 0.3 * s} y={deckY} width={0.6 * s} height={h * s} fill={shade(color, 0.08)} />
          <path d={`M${px - 3.2 * s} ${deckY + deckH} L${px + 3.2 * s} ${deckY + deckH} L${px + 0.9 * s} ${deckY + deckH + 1.6 * s} L${px - 0.9 * s} ${deckY + deckH + 1.6 * s} Z`} fill={shade(color, -0.12)} />
        </g>
      ))}
      <rect x={x1} y={deckY} width={x2 - x1} height={deckH} fill={color} />
      <rect x={x1} y={deckY + deckH - 0.35 * s} width={x2 - x1} height={0.35 * s} fill={shade(color, -0.2)} />
      <rect x={x1} y={deckY - 0.6 * s} width={x2 - x1} height={0.6 * s} fill={shade(color, 0.08)} />
      {train && (
        <g>
          <rect x={train.x} y={deckY - 3.6 * s} width={train.len * s} height={3.1 * s} rx={0.5 * s} fill="#eef0ee" />
          <rect x={train.x} y={deckY - 1.6 * s} width={train.len * s} height={0.6 * s} fill={livery[train.livery]} />
          <rect x={train.x} y={deckY - 3.6 * s} width={train.len * s} height={0.3 * s} fill={livery[train.livery]} />
          {Array.from({ length: Math.floor(train.len / 2.4) }).map((_, i) => (
            <rect key={i} x={train.x + (i * 2.4 + 0.6) * s} y={deckY - 3.0 * s} width={1.4 * s} height={1.0 * s} fill={train.lit ? '#ffe2a6' : '#4a5462'} />
          ))}
          {Array.from({ length: Math.floor(train.len / 21) }).map((_, i) => (
            <rect key={`j${i}`} x={train.x + (i + 1) * 21 * s} y={deckY - 3.6 * s} width={0.2 * s} height={3.1 * s} fill="#b9bdbb" />
          ))}
        </g>
      )}
    </g>
  )
}

export function Lake({ y1, y2, x1 = -200, x2 = 1800, near = '#6f8f9a', far = '#c9c7b8', shimmer = true, seed = 31 }: { y1: number; y2: number; x1?: number; x2?: number; near?: string; far?: string; shimmer?: boolean; seed?: number }) {
  const id = useId().replace(/:/g, '')
  const r = rng(seed)
  return (
    <g>
      <defs>
        <linearGradient id={`lk${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={far} />
          <stop offset="1" stopColor={near} />
        </linearGradient>
      </defs>
      <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} fill={`url(#lk${id})`} />
      {shimmer &&
        Array.from({ length: 26 }).map((_, i) => {
          const yy = y1 + (y2 - y1) * Math.pow(r(), 1.6)
          const t = (yy - y1) / (y2 - y1)
          const w = 10 + t * 60 * r()
          const xx = x1 + (x2 - x1) * r()
          return <rect key={i} x={xx} y={yy} width={w} height={Math.max(0.8, t * 2.2)} fill="#fff4d8" opacity={0.25 + 0.35 * (1 - t)} rx="1" />
        })}
    </g>
  )
}

/** an ordinary yellow-and-green Bengaluru auto, parked, seen from the side (background detail) */
export function ParkedAuto({ x, y, s, flip = false }: { x: number; y: number; s: number; flip?: boolean }) {
  const tf = flip ? `translate(${2 * x} 0) scale(-1 1)` : undefined
  return (
    <g transform={tf}>
      <path d={`M${x - 1.3 * s} ${y - 0.45 * s} L${x + 1.2 * s} ${y - 0.45 * s} L${x + 1.3 * s} ${y - 1.0 * s} L${x - 1.2 * s} ${y - 1.0 * s} Z`} fill={PAL.autoGreen} />
      <path d={`M${x - 1.25 * s} ${y - 1.0 * s} L${x - 1.25 * s} ${y - 1.55 * s} Q${x - 1.2 * s} ${y - 1.85 * s} ${x - 0.6 * s} ${y - 1.85 * s} L${x + 0.9 * s} ${y - 1.85 * s} Q${x + 1.3 * s} ${y - 1.8 * s} ${x + 1.3 * s} ${y - 1.0 * s} Z`} fill={PAL.autoYellow} />
      <rect x={x - 0.95 * s} y={y - 1.55 * s} width={0.9 * s} height={0.5 * s} fill="#2a2522" />
      <path d={`M${x + 0.95 * s} ${y - 1.0 * s} L${x + 1.55 * s} ${y - 0.95 * s} L${x + 1.5 * s} ${y - 0.45 * s} L${x + 1.2 * s} ${y - 0.45 * s} Z`} fill={PAL.autoGreen} />
      <circle cx={x - 0.75 * s} cy={y - 0.25 * s} r={0.25 * s} fill="#1e1c1b" />
      <circle cx={x + 1.3 * s} cy={y - 0.25 * s} r={0.25 * s} fill="#1e1c1b" />
    </g>
  )
}

/** green direction sign on two poles */
export function RoadSign({ x, y, s, lines, w = 4.2, h = 1.6, poleH = 4.2 }: { x: number; y: number; s: number; lines: { text: string; arrow?: '↑' | '→' | '←' | '↗' | '↖' }[]; w?: number; h?: number; poleH?: number }) {
  // grow the board to fit its longest line (Manrope bold is ~0.58em per character)
  const lineH = h / lines.length
  const longest = Math.max(...lines.map((l) => l.text.length))
  w = Math.max(w, longest * lineH * 0.5 * 0.6 + 1.3)
  const W = w * s
  const H = h * s
  const top = y - poleH * s - H
  return (
    <g>
      <rect x={x - W * 0.38} y={top + H} width={0.12 * s} height={poleH * s} fill="#6c6a66" />
      <rect x={x + W * 0.36} y={top + H} width={0.12 * s} height={poleH * s} fill="#6c6a66" />
      <rect x={x - W / 2} y={top} width={W} height={H} rx={0.14 * s} fill="#1e6a45" />
      <rect x={x - W / 2 + 0.08 * s} y={top + 0.08 * s} width={W - 0.16 * s} height={H - 0.16 * s} rx={0.1 * s} fill="none" stroke="#f4f1e8" strokeWidth={Math.max(0.5, 0.05 * s)} />
      {lines.map((l, i) => (
        <g key={i}>
          <text x={x - W / 2 + 0.3 * s} y={top + (H / lines.length) * (i + 0.66)} fontFamily="Manrope, sans-serif" fontWeight={700} fontSize={(H / lines.length) * 0.5} fill="#f4f1e8">
            {l.text}
          </text>
          {l.arrow && (
            <text x={x + W / 2 - 0.3 * s} y={top + (H / lines.length) * (i + 0.7)} fontFamily="Manrope, sans-serif" fontWeight={800} fontSize={(H / lines.length) * 0.6} fill="#f4f1e8" textAnchor="end">
              {l.arrow}
            </text>
          )}
        </g>
      ))}
    </g>
  )
}

/** potted plants and a flower stall's buckets; colours are marigold, jasmine white and rose */
export function FlowerBaskets({ x, y, s, count = 5, seed = 41 }: { x: number; y: number; s: number; count?: number; seed?: number }) {
  const r = rng(seed)
  const cols = ['#f0a020', '#e66a1f', '#fff4dc', '#c8324a', '#f6d34a']
  return (
    <g>
      {Array.from({ length: count }).map((_, i) => {
        const bx = x + (i - (count - 1) / 2) * 0.75 * s
        const c = cols[Math.floor(r() * cols.length)]
        return (
          <g key={i}>
            <path d={`M${bx - 0.32 * s} ${y - 0.45 * s} L${bx + 0.32 * s} ${y - 0.45 * s} L${bx + 0.24 * s} ${y} L${bx - 0.24 * s} ${y} Z`} fill="#8a6a45" />
            <ellipse cx={bx} cy={y - 0.5 * s} rx={0.36 * s} ry={0.2 * s} fill={c} />
            <circle cx={bx - 0.12 * s} cy={y - 0.6 * s} r={0.1 * s} fill={shade(c, 0.25)} />
          </g>
        )
      })}
    </g>
  )
}

/**
 * Out-of-focus framing in a screen corner (fore band). Soft-edged leaves with optional blossoms.
 * Keep it small: a corner accent, never a curtain.
 */
export function FgFoliage({ side, y = 1000, size = 1, color = '#2f4a2b', blossom, seed = 51 }: { side: 'left' | 'right'; y?: number; size?: number; color?: string; blossom?: string; seed?: number }) {
  const id = useId().replace(/:/g, '')
  const r = rng(seed)
  // anchor inside the portrait-safe band edge so phones still get a little framing
  const ax = side === 'left' ? 520 : 1080
  const dir = side === 'left' ? -1 : 1
  const leaves = Array.from({ length: 9 }).map(() => ({
    x: ax + dir * r() * 260 * size,
    y: y - r() * 170 * size,
    rx: (60 + r() * 50) * size,
    ry: (24 + r() * 16) * size,
    a: (side === 'left' ? -30 : 30) + (r() - 0.5) * 80,
  }))
  return (
    <g>
      <defs>
        <radialGradient id={`fg${id}`}>
          <stop offset="0" stopColor={color} stopOpacity="0.95" />
          <stop offset="0.7" stopColor={color} stopOpacity="0.7" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
        {blossom && (
          <radialGradient id={`fb${id}`}>
            <stop offset="0" stopColor={blossom} stopOpacity="0.9" />
            <stop offset="1" stopColor={blossom} stopOpacity="0" />
          </radialGradient>
        )}
      </defs>
      {leaves.map((l, i) => (
        <ellipse key={i} cx={l.x} cy={l.y} rx={l.rx} ry={l.ry} transform={`rotate(${l.a} ${l.x} ${l.y})`} fill={`url(#fg${id})`} />
      ))}
      {blossom &&
        leaves.slice(0, 5).map((l, i) => <circle key={`b${i}`} cx={l.x + dir * 20} cy={l.y - 30 * size} r={(26 + r() * 20) * size} fill={`url(#fb${id})`} />)}
    </g>
  )
}

/** simple text signboard (generic, never a real brand) */
export function Signboard({ x, y, s, w, h, text, bg = '#a3402e', fg = '#fff6e8' }: { x: number; y: number; s: number; w: number; h: number; text: string; bg?: string; fg?: string }) {
  return (
    <g>
      <rect x={x - (w * s) / 2} y={y - h * s} width={w * s} height={h * s} rx={0.08 * s} fill={bg} />
      {/* lettering is deliberately left out: shopfronts read by colour and light, not by invented names */}
      <rect x={x - Math.min(w * 0.3, text.length * 0.09) * s} y={y - h * s * 0.56} width={Math.min(w * 0.6, text.length * 0.18) * s} height={h * s * 0.12} rx={h * s * 0.06} fill={fg} opacity="0.5" />
    </g>
  )
}

/** points along the road edge for rows of trees, lamps etc.: lateral X (m), from Z0 to Z1 every `step` metres */
export function rowAlong(road: RoadStyle, X: number, Z0: number, Z1: number, step: number) {
  const pts: { x: number; y: number; s: number; Z: number }[] = []
  for (let Z = Z1; Z >= Z0; Z -= step) {
    const p = proj(roadCenterX(road, Z) + X, 0, Z)
    pts.push({ ...p, s: F / Z, Z })
  }
  return pts // far to near, ready to draw in painter's order
}
