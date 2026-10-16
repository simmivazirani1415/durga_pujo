import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { AREAS, AREA_BY_SLUG, STOPS, stopIndexOf } from '../data/areas'
import { LISTINGS, countsFor } from '../data/listings'
import type { AreaSlug, Listing } from '../data/types'
import { search } from '../lib/search'
import { useView } from '../engine/viewport'
import { useJourney } from '../store/journey'
import { LAKES, MH, MW, ORR, RADIALS, mapXY, pathOf } from '../ui/CityMap'
import { BRANCH_AREA, BRANCH_EXIT, BRANCH_TO, J, branchPoint } from '../world3d/branch'
import { roadYaw, stopD } from '../world3d/route'
import { jumpToArea } from './controller'
import { COLLECTIBLE_BY_SLUG, Medallion } from './PujoIcons'
import { useGame } from './store'
import { car, travelDir, wrap } from './vehicle'

/**
 * The ride's map: a schematic Bengaluru (the same illustrative base as the city-hop map) with the ride's stops at
 * their approximate real positions. The ride compresses distances, so the map shows where you are in the sequence,
 * never a real distance; real directions always come from each listing's address.
 */

type P = { x: number; y: number }
const START = mapXY(13.03, 77.556)
const END = mapXY(12.9796, 77.5907)
const STOP_PTS: P[] = [START, ...AREAS.map((a) => mapXY(a.lat, a.lng)), END]
const JUNCTION: P = lerp(STOP_PTS[BRANCH_AREA], STOP_PTS[BRANCH_AREA + 1], (J - stopD(BRANCH_AREA)) / 130)

function lerp(a: P, b: P, t: number): P {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}
const ang = (a: P, b: P) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI

/** where the auto is on the schematic map, and which way it points (degrees, 0 = east) */
function carOnMap(): { p: P; deg: number } {
  if (car.onBranch) {
    const t = Math.min(1, car.bs / BRANCH_EXIT)
    const a = JUNCTION
    const b = STOP_PTS[BRANCH_TO]
    const rel = wrap(car.yaw - branchPoint(car.bs).yaw)
    return { p: lerp(a, b, t), deg: ang(a, b) - (rel * 180) / Math.PI }
  }
  const d = Math.max(0, Math.min(stopD(STOPS.length - 1), car.d))
  const k = Math.min(STOPS.length - 2, Math.floor(d / 130))
  const t = (d - k * 130) / 130
  const a = STOP_PTS[k]
  const b = STOP_PTS[k + 1]
  const rel = wrap(car.yaw - roadYaw(car.d))
  return { p: lerp(a, b, t), deg: ang(a, b) - (rel * 180) / Math.PI }
}

const ROUTE_D = STOP_PTS.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
const BRANCH_D = `M${JUNCTION.x} ${JUNCTION.y} L${STOP_PTS[BRANCH_TO].x} ${STOP_PTS[BRANCH_TO].y}`

/** pandals placed at their neighbourhood's approximate position (venues are not geocoded) */
const PANDALS: { l: Listing; p: P }[] = (() => {
  const seen = new Map<string, number>()
  return LISTINGS.filter((l) => l.kind === 'pandal').map((l) => {
    const a = AREA_BY_SLUG[l.area]
    const sub = a?.subAreas.find((s) => s.name === l.subArea)
    const base = l.lat && l.lng ? mapXY(l.lat, l.lng) : sub ? mapXY(sub.lat, sub.lng) : mapXY(a.lat, a.lng)
    const key = `${Math.round(base.x)}:${Math.round(base.y)}`
    const n = seen.get(key) ?? 0
    seen.set(key, n + 1)
    const r = n ? 9 + n * 2.2 : 0
    const t = n * 2.4
    return { l, p: { x: base.x + Math.cos(t) * r, y: base.y + Math.sin(t) * r } }
  })
})()

/** a few green landmarks that make Bengaluru read at a glance (illustrative positions) */
const PARKS: [number, number, number, number, string][] = [
  // lat, lng, rx, ry, name
  [12.9763, 77.5929, 15, 11, 'Cubbon Park'],
  [12.9507, 77.5848, 13, 10, 'Lalbagh'],
  [12.9985, 77.592, 14, 9, 'Palace Grounds'],
  [13.0216, 77.5655, 9, 7, 'IISc'],
  [12.807, 77.577, 22, 14, 'Bannerghatta'],
]

function Base({ k = 1, labels = false }: { k?: number; labels?: boolean }) {
  const q = 1 / Math.sqrt(k)
  return (
    <>
      <defs>
        <radialGradient id="mm-paper" cx="50%" cy="45%" r="75%">
          <stop offset="0" stopColor="#fbf3e2" />
          <stop offset="0.7" stopColor="#f4e6cb" />
          <stop offset="1" stopColor="#ead6b2" />
        </radialGradient>
        <pattern id="mm-grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M50 0 H0 V50" fill="none" stroke="#c9962f" strokeOpacity="0.12" strokeWidth="1" />
        </pattern>
        <linearGradient id="mm-lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9d1d8" />
          <stop offset="1" stopColor="#7fb3bf" />
        </linearGradient>
      </defs>
      <rect x={-300} y={-300} width={MW + 600} height={MH + 600} fill="url(#mm-paper)" />
      <rect x={-300} y={-300} width={MW + 600} height={MH + 600} fill="url(#mm-grid)" />
      {/* green spaces */}
      {PARKS.map(([la, ln, rx, ry, name]) => {
        const p = mapXY(la, ln)
        return (
          <g key={name}>
            <ellipse cx={p.x} cy={p.y} rx={rx} ry={ry} fill="#b9d39a" stroke="#8fb36f" strokeWidth={1.2 * q} />
            {[-0.45, 0, 0.45].map((t) => (
              <circle key={t} cx={p.x + rx * t} cy={p.y + (t === 0 ? -ry * 0.25 : ry * 0.15)} r={Math.min(rx, ry) * 0.28} fill="#86ad62" opacity="0.8" />
            ))}
            {labels && k > 1.8 && (
              <text x={p.x} y={p.y + ry + 11 * q} textAnchor="middle" fontSize={9.5 * q} fontWeight={700} fill="#4f6b37" fontFamily="Manrope, sans-serif" fontStyle="italic">
                {name}
              </text>
            )}
          </g>
        )
      })}
      {/* lakes */}
      {LAKES.map(([la, ln, r], i) => {
        const p = mapXY(la, ln)
        return (
          <g key={i}>
            <ellipse cx={p.x} cy={p.y} rx={r} ry={r * 0.72} fill="url(#mm-lake)" stroke="#6aa0ad" strokeWidth={1.2 * q} />
            <path d={`M${p.x - r * 0.45} ${p.y - r * 0.1} q${r * 0.2} ${-r * 0.12} ${r * 0.4} 0`} fill="none" stroke="#e8f4f5" strokeWidth={1.2 * q} strokeLinecap="round" opacity="0.8" />
          </g>
        )
      })}
      {/* roads: a pale casing with a white core, like a printed city map */}
      <path d={pathOf(ORR)} fill="none" stroke="#d9c3a0" strokeWidth={9 * q} strokeLinejoin="round" />
      <path d={pathOf(ORR)} fill="none" stroke="#fffaf0" strokeWidth={5 * q} strokeLinejoin="round" />
      {RADIALS.map((r, i) => (
        <g key={i}>
          <path d={pathOf(r)} fill="none" stroke="#dcc8a6" strokeWidth={7 * q} strokeLinecap="round" strokeLinejoin="round" />
          <path d={pathOf(r)} fill="none" stroke="#fffaf0" strokeWidth={3.6 * q} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
      {/* the ride: a festive gold route with a white edge */}
      <path d={ROUTE_D} fill="none" stroke="#fffaf0" strokeWidth={12 * q} strokeLinejoin="round" strokeLinecap="round" />
      <path d={ROUTE_D} fill="none" stroke="#d9a536" strokeWidth={7 * q} strokeLinejoin="round" strokeLinecap="round" />
      <path d={ROUTE_D} fill="none" stroke="#8e1520" strokeWidth={1.4 * q} strokeDasharray={`${6 * q} ${8 * q}`} strokeLinecap="round" opacity="0.55" />
      <path d={BRANCH_D} fill="none" stroke="#fffaf0" strokeWidth={9 * q} strokeLinecap="round" />
      <path d={BRANCH_D} fill="none" stroke="#d9a536" strokeWidth={5 * q} strokeDasharray={`${10 * q} ${6 * q}`} strokeLinecap="round" />
      {/* start and finish */}
      <circle cx={START.x} cy={START.y} r={6 * q} fill="#fffaf0" stroke="#651B28" strokeWidth={2 * q} />
      <g transform={`translate(${END.x} ${END.y})`}>
        <path d={`M0 ${-11 * q} L${4 * q} ${-3 * q} H${-4 * q} Z`} fill="#8e1520" />
        <rect x={-8 * q} y={-3 * q} width={16 * q} height={9 * q} rx={1.5 * q} fill="#fffaf0" stroke="#651B28" strokeWidth={1.6 * q} />
      </g>
      {labels && (
        <>
          <text x={START.x - 10 * q} y={START.y - 10 * q} textAnchor="end" fontSize={12 * q} fontWeight={800} fill="#651B28" fontFamily="Manrope, sans-serif">
            Start
          </text>
          <text x={END.x + 12 * q} y={END.y + 4 * q} fontSize={12 * q} fontWeight={800} fill="#651B28" fontFamily="Manrope, sans-serif">
            Vidhana Soudha
          </text>
        </>
      )}
    </>
  )
}

/** a small compass in the corner of the big map */
function Compass() {
  return (
    <svg viewBox="0 0 60 60" className="h-12 w-12" aria-hidden="true">
      <circle cx="30" cy="30" r="27" fill="#fbf3e2" stroke="#c9962f" strokeWidth="1.5" />
      <circle cx="30" cy="30" r="22" fill="none" stroke="#c9962f" strokeWidth="0.8" strokeDasharray="1.5 3" />
      <path d="M30 8 L35 30 L30 27 L25 30 Z" fill="#8e1520" />
      <path d="M30 52 L35 30 L30 33 L25 30 Z" fill="#c9962f" />
      <text x="30" y="7.5" textAnchor="middle" fontSize="7" fontWeight="800" fill="#651B28" fontFamily="Manrope, sans-serif" dy="-1">
        N
      </text>
    </svg>
  )
}

function CarMark({ size = 1 }: { size?: number }) {
  return (
    <g transform={`scale(${size})`}>
      <path d="M0 -15 L10 10 L0 5 L-10 10 Z" fill="#B93432" stroke="#fbf3e2" strokeWidth="2.5" strokeLinejoin="round" />
    </g>
  )
}

function routeToDest(dest: number | null): string | null {
  if (dest === null) return null
  const { p } = carOnMap()
  const pts: P[] = [p]
  if (car.onBranch) {
    pts.push(STOP_PTS[BRANCH_TO])
    const step = dest >= BRANCH_TO ? 1 : -1
    for (let i = BRANCH_TO + step; step > 0 ? i <= dest : i >= dest; i += step) pts.push(STOP_PTS[i])
  } else {
    const here = car.d / 130
    if (dest === BRANCH_TO && car.d < J) {
      for (let i = Math.ceil(here); i <= BRANCH_AREA; i++) pts.push(STOP_PTS[i])
      pts.push(JUNCTION, STOP_PTS[BRANCH_TO])
    } else if (dest > here) for (let i = Math.ceil(here); i <= dest; i++) pts.push(STOP_PTS[i])
    else for (let i = Math.floor(here); i >= dest; i--) pts.push(STOP_PTS[i])
  }
  return pts.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' ')
}

/* ------------------------------------------------------------------ the small map */

export function MiniMap() {
  const mode = useGame((s) => s.mode)
  const near = useGame((s) => s.near)
  const dest = useGame((s) => s.dest)
  const phase = useGame((s) => s.phase)
  const mapOpen = useGame((s) => s.mapOpen)
  const set = useGame((s) => s.set)
  const panelOpen = useJourney((s) => s.panel.open)
  const view = useView()
  const world = useRef<SVGGElement>(null)
  const mark = useRef<SVGGElement>(null)
  const route = useRef<SVGPathElement>(null)
  const size = view.compact ? 104 : 176
  const R = view.compact ? 110 : 140

  useEffect(() => {
    if (mode !== 'drive') return
    const tick = () => {
      const { p, deg } = carOnMap()
      world.current?.setAttribute('transform', `translate(${R - p.x} ${R - p.y})`)
      mark.current?.setAttribute('transform', `translate(${R} ${R}) rotate(${deg + 90})`)
      const r = routeToDest(useGame.getState().dest)
      if (route.current) route.current.setAttribute('d', r ?? '')
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [mode, R])

  if (mode !== 'drive') return null
  const hide = panelOpen || mapOpen || (view.compact && phase === 'parked')
  const destPt = dest !== null ? STOP_PTS[dest] : null
  const place = near >= 1 && near <= 9 ? AREA_BY_SLUG[STOPS[near] as AreaSlug].shortName : ''
  return (
    <div
      className="pointer-events-none fixed z-[27] flex flex-col items-end gap-1.5 transition-opacity duration-300"
      style={{
        right: view.compact ? 'max(16px, env(safe-area-inset-right, 0px))' : 'calc(max(16px, env(safe-area-inset-right, 0px)) + 16px)',
        top: view.compact ? 'calc(max(14px, env(safe-area-inset-top, 0px)) + 92px)' : 'calc(max(14px, env(safe-area-inset-top, 0px)) + 124px)',
        opacity: hide ? 0 : 1,
        visibility: hide ? 'hidden' : 'visible',
      }}
    >
      <button
        type="button"
        onClick={() => set({ mapOpen: true })}
        className="pointer-events-auto overflow-hidden rounded-full bg-[#f3e7d2] ring-2 ring-gold"
        style={{ width: size, height: size }}
        aria-label={`Open the map. You are near ${place || 'the start'}.`}
        title="Open the map (M)"
      >
        <svg viewBox={`0 0 ${R * 2} ${R * 2}`} width={size} height={size} aria-hidden="true">
          <g ref={world}>
            <Base k={1.6} />
            <path ref={route} d="" fill="none" stroke="#B93432" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 8" />
            {STOP_PTS.slice(1, -1).map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={i + 1 === dest ? 9 : 6} fill={i + 1 === dest ? '#B93432' : '#651B28'} stroke="#fbf3e2" strokeWidth="2" />
            ))}
            {destPt && <circle cx={destPt.x} cy={destPt.y} r={16} fill="none" stroke="#B93432" strokeWidth="3" />}
          </g>
          <g ref={mark}>
            <CarMark size={view.compact ? 0.9 : 1} />
          </g>
        </svg>
      </button>
      {place && (
        <span className="pointer-events-auto rounded-full bg-[#fbf3e2] px-3 py-1 text-[12px] font-bold text-burgundy-deep ring-1 ring-gold">
          {phase === 'parked' ? 'At' : 'Near'} {place}
        </span>
      )}
      {!view.compact && <span className="text-[10.5px] font-semibold text-[#3b2316] [text-shadow:0_0_4px_#fbf3e2]">Press M for the map</span>}
    </div>
  )
}

/* ------------------------------------------------------------------ the full map */

type Sel = { kind: 'area'; slug: AreaSlug } | { kind: 'pandal'; l: Listing }

export function MapPanel() {
  const open = useGame((s) => s.mapOpen)
  const mode = useGame((s) => s.mode)
  if (mode !== 'drive' || !open) return null
  return <MapPanelInner />
}

function MapPanelInner() {
  const set = useGame((s) => s.set)
  const dest = useGame((s) => s.dest)
  const phase = useGame((s) => s.phase)
  const near = useGame((s) => s.near)
  const collected = useGame((s) => s.collected)
  const view = useView()
  const here = carOnMap()
  const [z, setZ] = useState({ k: 2.1, cx: here.p.x, cy: here.p.y })
  const [sel, setSel] = useState<Sel | null>(null)
  const [q, setQ] = useState('')
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null)
  const close = () => set({ mapOpen: false })

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  const W = MW + 80
  const H = MH + 80
  const vw = W / z.k
  const vh = H / z.k
  const vb = `${z.cx - vw / 2} ${z.cy - vh / 2} ${vw} ${vh}`

  const toMap = (clientX: number, clientY: number) => {
    const r = svg.current!.getBoundingClientRect()
    const s = Math.max(vw / r.width, vh / r.height)
    return { x: z.cx + (clientX - r.left - r.width / 2) * s, y: z.cy + (clientY - r.top - r.height / 2) * s, s }
  }
  const zoom = (f: number, at?: { x: number; y: number }) =>
    setZ((o) => {
      const k = Math.max(1, Math.min(6, o.k * f))
      const a = at ?? { x: o.cx, y: o.cy }
      const t = 1 - o.k / k
      return { k, cx: o.cx + (a.x - o.cx) * t, cy: o.cy + (a.y - o.cy) * t }
    })

  useEffect(() => {
    const el = svg.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoom(e.deltaY < 0 ? 1.18 : 1 / 1.18, toMap(e.clientX, e.clientY))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  })

  const results = useMemo(() => {
    if (q.trim().length < 2) return []
    return search(q)
      .filter((g) => g.group === 'area' || g.group === 'pincode' || g.group === 'pandal' || g.group === 'landmark')
      .flatMap((g) => g.results)
      .filter((r) => r.target)
      .slice(0, 7)
  }, [q])

  const pick = (s: Sel) => {
    setSel(s)
    const p = s.kind === 'area' ? STOP_PTS[stopIndexOf(s.slug)] : PANDALS.find((x) => x.l.id === s.l.id)?.p
    if (p) setZ((o) => ({ ...o, cx: p.x, cy: p.y + 40 / o.k, k: Math.max(o.k, 2.2) }))
  }

  const selSlug = sel ? (sel.kind === 'area' ? sel.slug : sel.l.area) : null
  const selIdx = selSlug ? stopIndexOf(selSlug) : -1
  const selArea = selSlug ? AREA_BY_SLUG[selSlug] : null
  const counts = selSlug ? countsFor(selSlug) : null
  const atSel = phase === 'parked' && near === selIdx
  const label = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  const r = (v: number) => ((view.compact ? 1.9 : 1.45) * v) / Math.sqrt(z.k)
  const routeD = routeToDest(dest)

  return (
    <div className="fixed inset-0 z-[44] flex justify-end bg-[rgba(36,16,14,0.35)]" onClick={close} data-allow-scroll>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="City map"
        onClick={(e) => e.stopPropagation()}
        className={`relative flex h-full flex-col bg-[#fbf3e2] ring-1 ring-gold ${view.compact ? 'w-full' : 'w-[min(560px,92vw)]'}`}
        style={{ paddingTop: 'max(14px, env(safe-area-inset-top, 0px))', paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-center gap-3 px-4 pb-2">
          <p className="whitespace-nowrap font-headline text-[26px] leading-none text-burgundy-deep">City map</p>
          <span className="text-[11.5px] font-medium text-[#6b5a52]">Schematic. The ride shortens real distances.</span>
          <button type="button" onClick={close} className="ml-auto grid h-10 w-10 place-items-center rounded-full bg-white text-burgundy ring-1 ring-gold" aria-label="Close map" autoFocus>
            ✕
          </button>
        </div>
        <div className="relative px-4 pb-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search an area, pandal or pincode"
            aria-label="Search the map"
            className="h-11 w-full rounded-full bg-white px-4 text-[15px] font-medium text-ink outline-none ring-1 ring-gold focus:ring-2"
          />
          {results.length > 0 && (
            <ul className="thin-scroll absolute inset-x-4 top-12 z-10 max-h-[46vh] overflow-auto rounded-2xl bg-white p-1 ring-1 ring-gold">
              {results.map((res) => (
                <li key={res.key}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-start rounded-xl px-3 py-2 text-left hover:bg-[#fbf3e2]"
                    onClick={() => {
                      const t = res.target!
                      if (t.type === 'listing' && t.kind === 'pandal') {
                        const l = LISTINGS.find((x) => x.id === t.id)
                        if (l) pick({ kind: 'pandal', l })
                      } else pick({ kind: 'area', slug: t.slug })
                      setQ('')
                    }}
                  >
                    <span className="text-[14.5px] font-bold text-burgundy-deep">{res.label}</span>
                    <span className="text-[12px] text-[#6b5a52]">{res.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="relative min-h-0 flex-1">
          <svg
            ref={svg}
            viewBox={vb}
            className="h-full w-full touch-none select-none"
            role="img"
            aria-label="Schematic map of the ride's stops in Bengaluru"
            onPointerDown={(e) => {
              ;(e.target as Element).setPointerCapture?.(e.pointerId)
              drag.current = { x: e.clientX, y: e.clientY, cx: z.cx, cy: z.cy, moved: false }
            }}
            onPointerMove={(e) => {
              const d = drag.current
              if (!d) return
              const m = toMap(e.clientX, e.clientY)
              const dx = (e.clientX - d.x) * m.s
              const dy = (e.clientY - d.y) * m.s
              if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 4) d.moved = true
              if (d.moved) setZ((o) => ({ ...o, cx: d.cx - dx, cy: d.cy - dy }))
            }}
            onPointerUp={() => {
              setTimeout(() => (drag.current = null), 0)
            }}
          >
            <Base k={z.k} labels />
            {routeD && <path d={routeD} fill="none" stroke="#B93432" strokeWidth={r(5)} strokeDasharray={`${r(3)} ${r(9)}`} strokeLinecap="round" strokeLinejoin="round" />}
            {PANDALS.map(({ l, p }) => {
              const on = sel?.kind === 'pandal' && sel.l.id === l.id
              return (
                <g
                  key={l.id}
                  className="cursor-pointer"
                  onClick={(e) => {
                    if (drag.current?.moved) return
                    e.stopPropagation()
                    pick({ kind: 'pandal', l })
                  }}
                >
                  <circle cx={p.x} cy={p.y} r={r(on ? 7 : 4.5)} fill={on ? '#B93432' : '#e2a530'} stroke="#651B28" strokeWidth={r(1.2)} />
                  {z.k > 2.6 && (
                    <text x={p.x + r(7)} y={p.y + r(3)} fontSize={r(10)} fontWeight={700} fill="#3b2a26" paintOrder="stroke" stroke="#f3e7d2" strokeWidth={r(3)} fontFamily="Manrope, sans-serif">
                      {l.name.length > 26 ? l.name.slice(0, 25) + '…' : l.name}
                    </text>
                  )}
                </g>
              )
            })}
            {AREAS.map((a, i) => {
              const p = STOP_PTS[i + 1]
              const on = selSlug === a.slug
              const got = collected.includes(a.slug)
              return (
                <g
                  key={a.slug}
                  className="cursor-pointer"
                  onClick={(e) => {
                    if (drag.current?.moved) return
                    e.stopPropagation()
                    pick({ kind: 'area', slug: a.slug })
                  }}
                >
                  {/* a map pin with the stop number */}
                  <g transform={`translate(${p.x} ${p.y}) scale(${r(on ? 1.25 : 1)})`}>
                    <path d="M0 0 C-4 -7 -11 -11 -11 -19 A11 11 0 1 1 11 -19 C11 -11 4 -7 0 0 Z" fill={i + 1 === dest ? '#B93432' : '#651B28'} stroke="#fbf3e2" strokeWidth="2" />
                    <text y="-15" textAnchor="middle" fontSize="11" fontWeight={800} fill="#fbf3e2" fontFamily="Manrope, sans-serif">
                      {i + 1}
                    </text>
                  </g>
                  {got && COLLECTIBLE_BY_SLUG[a.slug] && (
                    <g transform={`translate(${p.x - r(13)} ${p.y - r(56)})`}>
                      <Medallion c={COLLECTIBLE_BY_SLUG[a.slug]!} size={r(26)} />
                    </g>
                  )}
                  <g transform={`translate(${p.x + r(13)} ${p.y - r(30)})`}>
                    <rect width={r(a.shortName.length * (on ? 10.4 : 9) + 14)} height={r(on ? 24 : 21)} rx={r(10)} fill="#fbf3e2" stroke="#c9962f" strokeWidth={r(1.2)} />
                    <text x={r(7)} y={r(on ? 16.5 : 14.6)} fontSize={r(on ? 16 : 14)} fontWeight={800} fill="#4A121D" fontFamily="Manrope, sans-serif">
                      {a.shortName}
                    </text>
                  </g>
                </g>
              )
            })}
            <g transform={`translate(${here.p.x} ${here.p.y}) rotate(${here.deg + 90})`}>
              <CarMark size={1 / Math.sqrt(z.k)} />
            </g>
          </svg>
          <div className="pointer-events-none absolute bottom-3 left-3">
            <Compass />
          </div>
          <div className="absolute right-3 top-3 flex flex-col gap-2">
            {[
              ['+', 'Zoom in', () => zoom(1.35)],
              ['−', 'Zoom out', () => zoom(1 / 1.35)],
              ['◉', 'Centre on my auto', () => setZ((o) => ({ ...o, cx: here.p.x, cy: here.p.y }))],
            ].map(([t, l, f]) => (
              <button key={l as string} type="button" onClick={f as () => void} aria-label={l as string} title={l as string} className="grid h-10 w-10 place-items-center rounded-full bg-white text-[18px] font-bold text-burgundy ring-1 ring-gold">
                {t as string}
              </button>
            ))}
          </div>
        </div>

        {sel && selArea && counts && (
          <div className="mx-4 mt-2 rounded-[20px] bg-white p-4 ring-1 ring-gold">
            <div className="flex items-start gap-3">
              {COLLECTIBLE_BY_SLUG[selArea.slug] && <Medallion c={COLLECTIBLE_BY_SLUG[selArea.slug]!} size={44} missing={!collected.includes(selArea.slug)} />}
              <div className="min-w-0 flex-1">
                {sel.kind === 'pandal' ? (
                  <>
                    <p className="text-[16px] font-bold leading-tight text-burgundy-deep">{sel.l.name}</p>
                    <p className="text-[12.5px] text-[#6b5a52]">
                      {sel.l.subArea ? `${sel.l.subArea}, ` : ''}
                      {selArea.heading} · pin shows the neighbourhood, not the exact venue
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-headline text-[22px] leading-none text-burgundy-deep">{selArea.heading}</p>
                    <p className="mt-1 text-[12.5px] text-[#6b5a52]">
                      {[counts.pandal ? label(counts.pandal, 'pandal', 'pandals') : null, counts.event ? label(counts.event, 'event', 'events') : null, counts.food ? label(counts.food, 'food stop', 'food stops') : null]
                        .filter(Boolean)
                        .join(' · ') || 'No 2026 listings yet'}
                    </p>
                  </>
                )}
              </div>
            </div>
            {atSel ? (
              <p className="mt-3 text-[13.5px] font-semibold text-burgundy">You're parked here.</p>
            ) : (
              <button
                type="button"
                onClick={() => void jumpToArea(selIdx)}
                className="mt-3 min-h-[46px] w-full rounded-full bg-[linear-gradient(180deg,#7d1a2b,#5c1020)] text-[15px] font-bold text-ivory ring-1 ring-gold"
              >
                Jump to {selArea.shortName} pandal →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export { travelDir }
