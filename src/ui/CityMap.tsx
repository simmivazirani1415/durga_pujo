import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { AREAS, AREA_BY_SLUG, distanceKm, isArea } from '../data/areas'
import { mapState } from '../engine/motion'

/**
 * Elevated view used for long hops between areas that are far apart in reality.
 * A stylised, illustrative map of Bengaluru with approximate positions; not for navigation.
 */
const LNG0 = 77.47
const LNG1 = 77.8
const LAT0 = 12.83
const LAT1 = 13.135
export const MW = 1000
export const MH = 940

export function mapXY(lat: number, lng: number) {
  return { x: ((lng - LNG0) / (LNG1 - LNG0)) * MW, y: ((LAT1 - lat) / (LAT1 - LAT0)) * MH }
}

export const LAKES: [number, number, number][] = [
  // lat, lng, size (rough, illustrative)
  [12.9817, 77.6205, 16],
  [13.045, 77.595, 20],
  [12.935, 77.67, 34],
  [12.9235, 77.644, 11],
  [12.909, 77.617, 15],
  [13.093, 77.591, 16],
  [13.009, 77.573, 9],
  [12.948, 77.585, 8],
  [12.944, 77.745, 22],
  [12.889, 77.584, 8],
  [12.877, 77.632, 13],
]

export const ORR: [number, number][] = [
  [13.035, 77.597],
  [13.043, 77.623],
  [13.022, 77.66],
  [13.008, 77.695],
  [12.957, 77.701],
  [12.927, 77.678],
  [12.917, 77.623],
  [12.907, 77.59],
  [12.915, 77.546],
  [12.946, 77.525],
  [12.99, 77.53],
  [13.028, 77.54],
  [13.035, 77.597],
]

export const RADIALS: [number, number][][] = [
  [
    [12.98, 77.592],
    [13.035, 77.597],
    [13.1, 77.597],
    [13.135, 77.6],
  ],
  [
    [12.958, 77.61],
    [12.917, 77.623],
    [12.88, 77.645],
    [12.845, 77.665],
  ],
  [
    [12.975, 77.62],
    [12.99, 77.66],
    [13.008, 77.695],
    [12.985, 77.73],
    [12.97, 77.75],
  ],
  [
    [12.94, 77.598],
    [12.9, 77.6],
    [12.86, 77.597],
  ],
  [
    [12.93, 77.575],
    [12.89, 77.56],
    [12.85, 77.545],
  ],
  [
    [12.995, 77.565],
    [13.03, 77.52],
    [13.05, 77.49],
  ],
  [
    [12.955, 77.565],
    [12.92, 77.51],
    [12.9, 77.48],
  ],
  [
    [12.957, 77.701],
    [12.97, 77.75],
  ],
]

export function pathOf(pts: [number, number][]) {
  return pts.map(([la, ln], i) => {
    const p = mapXY(la, ln)
    return `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`
  }).join(' ')
}

function curveFor(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const k = Math.min(110, len * 0.28)
  return { c: { x: mx - (dy / len) * k, y: my + (dx / len) * k }, len }
}

function bez(a: { x: number; y: number }, c: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  const u = 1 - t
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    ang: (Math.atan2(2 * u * (c.y - a.y) + 2 * t * (b.y - c.y), 2 * u * (c.x - a.x) + 2 * t * (b.x - c.x)) * 180) / Math.PI,
  }
}

export function CityMap() {
  const [route, setRoute] = useState<{ from: string | null; to: string | null }>({ from: null, to: null })
  const marker = useRef<SVGGElement>(null)
  const trail = useRef<SVGPathElement>(null)

  useEffect(() => {
    const l = () => setRoute({ from: mapState.from, to: mapState.to })
    mapState.listeners.add(l)
    return () => {
      mapState.listeners.delete(l)
    }
  }, [])

  const a = route.from && isArea(route.from as never) ? AREA_BY_SLUG[route.from as keyof typeof AREA_BY_SLUG] : null
  const b = route.to && isArea(route.to as never) ? AREA_BY_SLUG[route.to as keyof typeof AREA_BY_SLUG] : null
  const pa = a ? mapXY(a.lat, a.lng) : null
  const pb = b ? mapXY(b.lat, b.lng) : null
  const curve = pa && pb ? curveFor(pa, pb) : null
  const km = a && b ? distanceKm(a, b) : 0

  useEffect(() => {
    if (!pa || !pb || !curve) return
    const tick = () => {
      const t = mapState.t
      const p = bez(pa, curve.c, pb, t)
      if (marker.current) marker.current.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${p.ang + 90})`)
      if (trail.current) {
        const L = trail.current.getTotalLength()
        trail.current.style.strokeDasharray = `${L}`
        trail.current.style.strokeDashoffset = `${L * (1 - t)}`
      }
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [pa?.x, pa?.y, pb?.x, pb?.y])

  return (
    <div
      id="city-map"
      className="absolute inset-0 flex items-center justify-center bg-parchment"
      style={{ visibility: 'hidden', opacity: 0, paddingInline: 'max(16px, env(safe-area-inset-left, 0px))' }}
    >
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 45%, #fbf1df 0%, #f3e5ce 55%, #e8d4b3 100%)' }} />
      <div className="relative flex h-full w-full max-w-[min(92vw,820px)] flex-col items-center justify-center gap-3 py-16">
        <p className="text-center font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-burgundy/70">
          Riding across the city
        </p>
        <p className="text-center font-display text-[clamp(22px,3.2vw,34px)] font-semibold leading-tight text-burgundy">
          {a ? a.shortName : ''} <span className="text-gold-deep">→</span> {b ? b.heading : ''}
        </p>
        <svg viewBox={`-40 -40 ${MW + 80} ${MH + 80}`} className="w-full max-h-[62vh]" role="img" aria-label="Illustrative map of Bengaluru">
          <g opacity="0.9">
            {LAKES.map(([la, ln, r], i) => {
              const p = mapXY(la, ln)
              return <ellipse key={i} cx={p.x} cy={p.y} rx={r} ry={r * 0.72} fill="#bccfcf" opacity="0.8" />
            })}
            <path d={pathOf(ORR)} fill="none" stroke="#651B28" strokeOpacity="0.18" strokeWidth="5" strokeLinejoin="round" />
            {RADIALS.map((r, i) => (
              <path key={i} d={pathOf(r)} fill="none" stroke="#651B28" strokeOpacity="0.14" strokeWidth="3.5" strokeLinecap="round" />
            ))}
          </g>
          {curve && pa && pb && (
            <>
              <path d={`M${pa.x} ${pa.y} Q${curve.c.x} ${curve.c.y} ${pb.x} ${pb.y}`} fill="none" stroke="#c9962f" strokeOpacity="0.35" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
              <path ref={trail} d={`M${pa.x} ${pa.y} Q${curve.c.x} ${curve.c.y} ${pb.x} ${pb.y}`} fill="none" stroke="#c9962f" strokeWidth="4" strokeLinecap="round" />
            </>
          )}
          {AREAS.map((ar) => {
            const p = mapXY(ar.lat, ar.lng)
            const on = ar.slug === route.from || ar.slug === route.to
            return (
              <g key={ar.slug}>
                <circle cx={p.x} cy={p.y} r={on ? 9 : 5.5} fill={on ? '#B93432' : '#651B28'} opacity={on ? 1 : 0.55} />
                {on && <circle cx={p.x} cy={p.y} r={16} fill="none" stroke="#B93432" strokeOpacity="0.35" strokeWidth="2" />}
                <text
                  x={p.x + 12}
                  y={p.y + 5}
                  fontFamily="Manrope, sans-serif"
                  fontSize={on ? 22 : 17}
                  fontWeight={on ? 800 : 600}
                  fill="#3b2a26"
                  opacity={on ? 1 : 0.62}
                  paintOrder="stroke"
                  stroke="#f6ead6"
                  strokeWidth="5"
                >
                  {ar.shortName}
                </text>
              </g>
            )
          })}
          {pa && (
            <g ref={marker} transform={`translate(${pa.x} ${pa.y})`}>
              <rect x="-11" y="-16" width="22" height="30" rx="9" fill="#F2C230" stroke="#3b2a26" strokeWidth="1.5" />
              <rect x="-6" y="-21" width="12" height="9" rx="4" fill="#1f6b3e" stroke="#3b2a26" strokeWidth="1.5" />
              <path d="M-5 -2 Q0 -6 5 -2" stroke="#B93432" strokeWidth="1.6" fill="none" />
            </g>
          )}
        </svg>
        <p className="text-center font-sans text-xs text-ink-soft">
          About {Math.max(1, Math.round(km))} km apart as the crow flies · illustrative map, not for navigation
        </p>
      </div>
    </div>
  )
}
