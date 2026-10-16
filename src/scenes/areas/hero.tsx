import type { ReactNode } from 'react'
import type { SceneDef } from '../types'
import { ROAD_DEFAULT, F, VPX, proj, rng, mix, place, type RoadStyle } from '../world'
import { DriftClouds, Haze, RoadSurface, RainTree, RoundTree, FgFoliage, Birds, Bougainvillea, PAL } from '../kit'
import { f1, poly, zRange, stripAlong, MultiSky } from './_north-helpers'

/**
 * Hero: an elevated golden-hour look over green Bengaluru. The auto waits on a ridge road that crests just ahead;
 * beyond it the city spreads out below: a sea of rain-tree canopy with low/mid-rise rooftops and black water tanks
 * poking through, a lake catching the sun, a few far apartment towers, and the road winding down into it all.
 *
 * The city below has its own projection (camera CH m above the city floor, horizon at y = HZ) so the
 * calm sky for the heading and search (x 300-1300, y 80-470) stays clear.
 */

const HZ = 482
const CH = 52
const cp = (X: number, Y: number, D: number) => ({ x: VPX + (F * X) / D, y: HZ + (F * (CH - Y)) / D })

/* the ridge road in the foreground (static; the moving markings are off in the hero) */
const road: RoadStyle = {
  ...ROAD_DEFAULT,
  halfWidth: 3.5,
  asphalt: '#5f5650',
  asphaltFar: '#8f7f72',
  footpath: 1.4,
  footpathColor: '#cdb595',
}
const CREST = 7.2
const EDGE = road.halfWidth + 0.2 + road.footpath + 1.3

const WALLS = ['#efe0c2', '#e9cfa6', '#e2b4a2', '#f4ece0', '#d9a96a', '#cfc6b6', '#e8d6b0']
const HAZE = '#f0d8b4'

/* the road winding down into the city: lateral offset (m) at city distance D (an even S-curve on screen) */
const RIB_D0 = 108
const ribX = (D: number) => {
  const l = Math.log(Math.max(1, D / RIB_D0))
  return D * (0.24 * Math.sin(2.2 * l) - 0.05 * l)
}
const RIB_HALF = 6.5

/* lake in the middle distance (city metres) */
const LAKE = { dNear: 250, dFar: 470, x0: 50, x1: 430 }
function lakeSpan(D: number): [number, number] | null {
  if (D < LAKE.dNear || D > LAKE.dFar) return null
  const t = (D - LAKE.dNear) / (LAKE.dFar - LAKE.dNear)
  const b = Math.sin(t * Math.PI)
  return [LAKE.x0 - b * 60 + Math.sin(t * 9) * 10, LAKE.x1 + b * 50 + Math.cos(t * 7) * 16]
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number) {
  return `M${f1(cx - rx)} ${f1(cy)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(rx * 2)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-rx * 2)} 0Z`
}

/** one row of the city: houses and blocks among clumps of canopy, merged into a handful of paths */
function CityRow({ D, seed, build = 0.36, tall = 0.06 }: { D: number; seed: number; build?: number; tall?: number }) {
  const r = rng(seed)
  const s = F / D
  const g = Math.max(1, D / 420)
  const hz = Math.min(0.86, Math.pow(Math.max(0, D - 110) / 2600, 0.6))
  const fog = (c: string, k = 1) => mix(c, HAZE, Math.min(1, hz * k))
  const Xmin = ((-140 - VPX) * D) / F
  const Xmax = ((1740 - VPX) * D) / F
  const fronts: string[] = WALLS.map(() => '')
  let roofs = ''
  let tiles = ''
  let shadeL = ''
  let wins = ''
  let tanks = ''
  let cDark = ''
  let cMid = ''
  let cLight = ''
  const blocked = (X: number, w: number) => {
    const rx = ribX(D)
    if (X + w > rx - RIB_HALF - 2 && X < rx + RIB_HALF + 2 && D < 1500) return true
    const ls = lakeSpan(D + 6) ?? lakeSpan(D - 6)
    return !!ls && X + w > ls[0] - 12 && X < ls[1] + 12
  }
  let X = Xmin + r() * 20
  while (X < Xmax) {
    if (r() < build) {
      const w = (9 + r() * 14) * g
      if (blocked(X, w)) {
        X += w * 0.6
        continue
      }
      const isTall = r() < tall
      const h = isTall ? 20 + r() * 14 : 6.5 + r() * 9
      const dep = (9 + r() * 7) * g
      const ci = Math.floor(r() * WALLS.length)
      const xl = X
      const xr = X + w
      const a = cp(xl, h, D)
      const b = cp(xr, 0, D)
      fronts[ci] += `M${f1(a.x)} ${f1(a.y)}H${f1(b.x)}V${f1(b.y)}H${f1(a.x)}Z`
      const sx = xl > 0 ? xl : xr < 0 ? xr : null
      if (sx !== null) {
        const p = poly([cp(sx, h, D), cp(sx, h, D + dep), cp(sx, 0, D + dep), cp(sx, 0, D)])
        fronts[ci] += p
        if (sx === xl) shadeL += p
      }
      const roof = poly([cp(xl, h, D), cp(xr, h, D), cp(xr, h, D + dep), cp(xl, h, D + dep)])
      if (!isTall && r() < 0.28) tiles += roof
      else roofs += roof
      if (s > 0.9) {
        for (let fy = 1.1; fy + 1.3 < h; fy += 3.1) {
          for (let wx = xl + 1; wx + 1.2 < xr - 0.6; wx += 2.6) {
            const p = cp(wx, fy + 1.3, D)
            const q = cp(wx + 1.2, fy, D)
            wins += `M${f1(p.x)} ${f1(p.y)}H${f1(q.x)}V${f1(q.y)}H${f1(p.x)}Z`
          }
        }
      }
      if (s > 0.3 && !tiles.endsWith(roof)) {
        const n = 1 + Math.floor(r() * 2.4)
        for (let k = 0; k < n; k++) {
          const tx = xl + w * (0.15 + r() * 0.7)
          const p = cp(tx, h, D + dep * (0.25 + r() * 0.5))
          const tw = Math.max(1.0, 1.3 * s)
          const th = Math.max(1.0, 1.4 * s)
          tanks += `M${f1(p.x - tw / 2)} ${f1(p.y - th)}h${f1(tw)}v${f1(th)}h${f1(-tw)}Z`
        }
      }
      X += w + (2 + r() * 6) * g
    } else {
      const n = 2 + Math.floor(r() * 5)
      for (let k = 0; k < n; k++) {
        const R = (4.2 + r() * 3.6) * Math.pow(g, 0.75)
        if (blocked(X, R * 1.6)) {
          X += R
          continue
        }
        const Dk = D - 2 - r() * 7
        const c = cp(X + R, 8 + r() * 4, Dk)
        const sk = F / Dk
        const rx = R * sk
        const ry = R * sk * 0.8
        cDark += ellipsePath(c.x, c.y + ry * 0.2, rx, ry)
        cMid += ellipsePath(c.x - rx * 0.06, c.y - ry * 0.06, rx * 0.86, ry * 0.8)
        cLight += ellipsePath(c.x + rx * 0.3, c.y - ry * 0.32, rx * 0.46, ry * 0.38)
        X += R * (1.15 + r() * 0.6)
      }
      X += r() * 2 * g
    }
  }
  return (
    <g>
      {fronts.map((d, i) => (d ? <path key={i} d={d} fill={fog(WALLS[i])} /> : null))}
      {shadeL && <path d={shadeL} fill={fog('#6a4a3a', 0.9)} opacity={0.32} />}
      {roofs && <path d={roofs} fill={fog('#e9d9bf')} />}
      {tiles && <path d={tiles} fill={fog(PAL.roofTileLight, 0.95)} />}
      {wins && <path d={wins} fill={fog('#5d564f')} opacity={0.5} />}
      {tanks && <path d={tanks} fill={fog(PAL.tank, 0.75)} />}
      {cDark && <path d={cDark} fill={fog('#3c5532')} />}
      {cMid && <path d={cMid} fill={fog('#57733f')} />}
      {cLight && <path d={cLight} fill={fog('#bdb56a', 0.9)} opacity={0.5 * (1 - hz * 0.7)} />}
    </g>
  )
}

/** the stretch of the winding road between two city distances */
function Ribbon({ D0, D1 }: { D0: number; D1: number }) {
  const zs = zRange(D0, D1, 1.03)
  const pts = (dx: number) => zs.map((D) => cp(ribX(D) + dx, 0, D))
  const fade = Math.min(0.85, Math.pow(Math.max(0, D0 - 110) / 2600, 0.6))
  return (
    <g>
      <path d={poly([...pts(-RIB_HALF - 1.4), ...pts(RIB_HALF + 1.4).reverse()])} fill={mix('#cdb595', HAZE, fade)} />
      <path d={poly([...pts(-RIB_HALF), ...pts(RIB_HALF).reverse()])} fill={mix('#8a7b6e', HAZE, fade * 0.9)} />
    </g>
  )
}

function Lake() {
  const zs = zRange(LAKE.dNear, LAKE.dFar, 1.03)
  const left = zs.map((D) => cp(lakeSpan(D)![0], 0, D))
  const right = zs.map((D) => cp(lakeSpan(D)![1], 0, D)).reverse()
  const glint = (D: number, X0: number, X1: number) => {
    const a = cp(X0, 0, D)
    const b = cp(X1, 0, D)
    return `M${f1(a.x)} ${f1(a.y)}H${f1(b.x)}v1.3H${f1(a.x)}Z`
  }
  return (
    <g>
      <defs>
        <linearGradient id="heroLake" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b9bba6" />
          <stop offset="0.6" stopColor="#e9d6ad" />
          <stop offset="1" stopColor="#fbe6bd" />
        </linearGradient>
      </defs>
      <path d={poly([...left, ...right])} fill="url(#heroLake)" />
      <path d={glint(372, 240, 430) + glint(405, 300, 500) + glint(440, 170, 330) + glint(470, 360, 520) + glint(352, 120, 210)} fill="#fff7e2" opacity="0.8" />
    </g>
  )
}

/** a few distant apartment towers at the edge of the city */
function FarTowers() {
  const list: [number, number, number, number][] = [
    [-1250, 1150, 96, 26],
    [-1150, 1260, 84, 24],
    [-1040, 1100, 72, 26],
    [-420, 1900, 70, 24],
    [980, 1250, 88, 26],
    [1080, 1150, 108, 26],
    [1200, 1300, 80, 24],
  ]
  let body = ''
  let lit = ''
  let bands = ''
  for (const [X, D, h, w] of list) {
    const a = cp(X - w / 2, h, D)
    const b = cp(X + w / 2, 0, D)
    body += `M${f1(a.x)} ${f1(a.y)}H${f1(b.x)}V${f1(b.y)}H${f1(a.x)}Z`
    const lw = (b.x - a.x) * 0.38
    lit += `M${f1(b.x - lw)} ${f1(a.y)}H${f1(b.x)}V${f1(b.y)}H${f1(b.x - lw)}Z`
    for (let y = 6; y < h - 2; y += 6.2) {
      const p = cp(X - w / 2, y, D)
      bands += `M${f1(p.x)} ${f1(p.y)}H${f1(b.x)}v0.7H${f1(p.x)}Z`
    }
  }
  return (
    <g>
      <path d={body} fill="#dbc5a8" />
      <path d={lit} fill="#f5e0bf" />
      <path d={bands} fill="#c6ae92" opacity="0.55" />
    </g>
  )
}

/** painted black/white kerb stones and a dashed centre line up to the crest (static) */
function Kerbs() {
  const hw = road.halfWidth
  let black = ''
  let white = ''
  let dash = ''
  let i = 0
  for (let z = 2; z < CREST - 0.01; z += 0.9, i++) {
    const z2 = Math.min(CREST, z + 0.9)
    for (const [X0, X1] of [
      [-hw - 0.2, -hw],
      [hw, hw + 0.2],
    ]) {
      const top = poly([proj(X0, 0.16, z), proj(X1, 0.16, z), proj(X1, 0.16, z2), proj(X0, 0.16, z2)])
      if (i % 2) black += top
      else white += top
    }
  }
  for (const z of [2.6, 6.2]) dash += stripAlong({}, -0.07, 0.07, z, Math.min(CREST, z + 2.4), 0, 1.25)
  return (
    <g>
      <path d={white} fill="#eee7da" />
      <path d={black} fill="#2a2522" />
      <path d={dash} fill="#efe6d4" opacity="0.9" />
    </g>
  )
}

/** the ridge: grass shoulders to the drop and a soft sunlit lip where the road crests */
function Ridge() {
  const lipL = stripAlong({}, -EDGE - 0.35, -EDGE, 2, CREST)
  const lipR = stripAlong({}, EDGE, EDGE + 0.35, 2, CREST)
  const c0 = proj(-EDGE - 0.35, 0, CREST)
  const c1 = proj(EDGE + 0.35, 0, CREST)
  return (
    <g>
      <path d={stripAlong({}, -EDGE, -road.halfWidth - 0.2 - road.footpath, 2, CREST)} fill="#8c9555" />
      <path d={stripAlong({}, road.halfWidth + 0.2 + road.footpath, EDGE, 2, CREST)} fill="#95995a" />
      <path d={lipL + lipR} fill="#5d6e3a" />
      <rect x={c0.x} y={c0.y - 1.5} width={c1.x - c0.x} height={3} fill="#e8d2ad" opacity="0.7" />
    </g>
  )
}

const CITY_DS = zRange(96, 4200, 1.15).reverse()
const NEAR_SPLIT = 700

function CityRows({ near }: { near: boolean }) {
  const ds = CITY_DS.filter((D) => (near ? D < NEAR_SPLIT : D >= NEAR_SPLIT))
  const out: ReactNode[] = []
  ds.forEach((D, i) => {
    const prev = i > 0 ? ds[i - 1] : near ? CITY_DS.find((d) => d >= NEAR_SPLIT && d < NEAR_SPLIT * 1.2) ?? NEAR_SPLIT : 1500
    if (D < 1500 && prev > RIB_D0) out.push(<Ribbon key={`rb${D}`} D0={Math.max(RIB_D0, D)} D1={Math.min(1500, prev)} />)
    if (lakeSpan(D) === null && lakeSpan(prev) !== null) out.push(<Lake key="lake" />)
    else if (D < LAKE.dNear && prev > LAKE.dFar) out.push(<Lake key="lake" />)
    out.push(<CityRow key={D} D={D} seed={Math.round(D * 7)} build={D > 900 ? 0.42 : 0.34} tall={D > 300 ? 0.07 : 0.03} />)
  })
  return <g>{out}</g>
}

const hero: SceneDef = {
  id: 'hero',
  title: 'Explore Durga Puja in Bengaluru',
  road: null,
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
              [0, '#7d8fbd'],
              [0.18, '#a9a6c4'],
              [0.34, '#dcbcb2'],
              [0.5, '#f2c9a0'],
              [0.78, '#f8d49e'],
              [1, '#fde4b8'],
            ]}
            sun={{ x: 1400, y: 470, r: 18, color: '#fff4d4', glow: 12, halo: '#ffd99a' }}
          />
          <Birds x={1420} y={330} count={3} s={1.1} seed={8} color="#7a5545" />
        </g>
      ),
    },
    {
      // layered clouds drifting slowly; on the way into the city the camera flies through them
      id: 'clouds',
      band: 'back',
      depth: 0.02,
      render: () => (
        <g>
          <DriftClouds seed={41} y={400} count={4} scale={0.55} speed={260} top="#ffeedd" bottom="#f1c3a6" opacity={0.6} blur={1.2} />
          <DriftClouds seed={5} y={60} count={3} scale={0.8} speed={220} top="#fffaf2" bottom="#e9c4b8" opacity={0.55} blur={1.4} />
          <DriftClouds seed={12} y={170} count={4} scale={1.15} speed={170} top="#fffaf0" bottom="#f2c3a4" opacity={0.82} blur={1.8} />
        </g>
      ),
    },
    {
      id: 'far-city',
      band: 'back',
      depth: 0.1,
      render: () => (
        <g>
          <defs>
            <linearGradient id="heroFloor" x1="0" y1={HZ} x2="0" y2="820" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#e6d3ac" />
              <stop offset="0.2" stopColor="#a4a873" />
              <stop offset="1" stopColor="#4c673a" />
            </linearGradient>
          </defs>
          <rect x={-200} y={HZ - 1} width={2000} height={600} fill="url(#heroFloor)" />
          <FarTowers />
          <CityRows near={false} />
          <Haze y={HZ + 8} h={40} color="#f6dcb6" opacity={0.75} />
        </g>
      ),
    },
    {
      id: 'city',
      band: 'back',
      depth: 0.3,
      render: () => <CityRows near />,
    },
    {
      id: 'slope-trees',
      band: 'back',
      depth: 0.55,
      render: () => {
        // trees growing on the slope below the ridge: only their crowns rise to road level
        const lt = place(-15.5, 9.4)
        const lt2 = place(-13.5, 14.5)
        const rt = place(16.5, 10.5)
        const drop = (p: { y: number; s: number }, m: number) => p.y + m * p.s
        return (
          <g>
            <RoundTree x={lt2.x} y={drop(lt2, 3.2)} s={lt2.s} h={8.2} seed={14} colors={{ leaf: '#55723f', dark: '#33492a', light: '#adaf63' }} />
            <RainTree x={lt.x} y={drop(lt, 3.2)} s={lt.s} h={12.5} spread={0.56} seed={61} colors={{ leaf: '#4e6b3a', dark: '#2f4429', light: '#a9ab60' }} />
            <RoundTree x={rt.x} y={drop(rt, 2.4)} s={rt.s} h={8} seed={23} colors={{ leaf: '#55723f', dark: '#33492a', light: '#b4b366' }} />
          </g>
        )
      },
    },
    {
      id: 'ridge-road',
      band: 'back',
      depth: 1,
      static: true,
      render: () => (
        <g>
          <Ridge />
          <RoadSurface road={road} zFar={CREST} />
          <Kerbs />
        </g>
      ),
    },
    {
      id: 'roadside',
      band: 'front',
      depth: 0.85,
      render: () => {
        const bg = place(EDGE - 0.2, 6.4)
        return (
          <g>
            <Bougainvillea x={bg.x + 14} y={bg.y + 6} s={bg.s} w={1.7} h={0.8} seed={7} />
          </g>
        )
      },
    },
    {
      id: 'fore',
      band: 'fore',
      depth: 1.2,
      render: () => (
        <g>
          {/* pushed out to the far corners so nothing blurs over the road */}
          <g transform="translate(-330 30)">
            <FgFoliage side="left" size={0.85} color="#2c4227" seed={52} />
          </g>
          <g transform="translate(340 40)">
            <FgFoliage side="right" size={0.7} color="#304a2a" seed={58} />
          </g>
        </g>
      ),
    },
  ],
}

export default hero
