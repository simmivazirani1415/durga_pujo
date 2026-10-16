import { useEffect, useMemo, useRef, useState } from 'react'
import type { Area, Listing } from '../../data/types'
import { hasCoords } from '../../lib/directions'

/**
 * A schematic of the area, not a street map: sub-area centres and listing pins projected around the
 * area centre on a flat grid. Positions are approximate and there are no roads, so it can never be
 * mistaken for directions.
 */

const W = 520
const H = 340
const PAD = 46

interface Props {
  area: Area
  /** listings with coordinates, in the order of their pin numbers */
  pinned: Listing[]
  onOpen: (id: string) => void
  subArea: string | null
}

function project(area: Area, pts: { lat: number; lng: number }[]) {
  const k = Math.cos((area.lat * Math.PI) / 180)
  const xs = pts.map((p) => (p.lng - area.lng) * k)
  const ys = pts.map((p) => p.lat - area.lat)
  // at least ~2.5 km across, centred on the area
  const minHalf = 0.0115
  const halfX = Math.max(minHalf, ...xs.map(Math.abs))
  const halfY = Math.max(minHalf * (H / W), ...ys.map(Math.abs))
  const scale = Math.min((W / 2 - PAD) / halfX, (H / 2 - PAD) / halfY)
  return (p: { lat: number; lng: number }) => ({
    x: W / 2 + (p.lng - area.lng) * k * scale,
    y: H / 2 - (p.lat - area.lat) * scale,
  })
}

function kmPerPx(area: Area, pts: { lat: number; lng: number }[]) {
  const to = project(area, pts)
  const a = to({ lat: area.lat, lng: area.lng })
  const b = to({ lat: area.lat + 0.009, lng: area.lng }) // ~1 km north
  return 1 / Math.max(1e-6, Math.abs(b.y - a.y))
}

export function AreaMap({ area, pinned, onOpen, subArea }: Props) {
  // keep labels and pins readable when the map is drawn narrower than its viewBox (phones)
  const figRef = useRef<HTMLElement>(null)
  const [k, setK] = useState(1)
  useEffect(() => {
    const el = figRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setK(Math.min(1.7, Math.max(1, W / w)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const geo = useMemo(() => {
    const pins = pinned.filter(hasCoords) as (Listing & { lat: number; lng: number })[]
    const subs = area.subAreas
    const pts = [...subs, ...pins, { lat: area.lat, lng: area.lng }]
    const to = project(area, pts)
    const perPx = kmPerPx(area, pts)
    const barKm = perPx * 120 > 4 ? 5 : perPx * 120 > 1.6 ? 2 : 1
    return {
      pins: pins.map((l, i) => ({ l, n: i + 1, ...to(l) })),
      subs: subs.map((s) => ({ ...s, ...to(s) })),
      barPx: barKm / perPx,
      barKm,
    }
  }, [area, pinned])

  return (
    <figure ref={figRef} className="overflow-hidden rounded-[18px] border border-parchment-deep bg-[#FBF1DF]">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="group" aria-label={`Schematic map of ${area.heading} with approximate positions`}>
        <defs>
          <pattern id="am-grid" width="26" height="26" patternUnits="userSpaceOnUse">
            <path d="M26 0H0V26" fill="none" stroke="#E8D4B3" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#am-grid)" />
        <circle cx={W / 2} cy={H / 2} r={Math.min(W, H) * 0.42} fill="#F3E5CE" opacity="0.55" />
        {/* compass */}
        <g transform={`translate(${W - 28} 30)`} aria-hidden="true">
          <path d="M0 -12 L5 4 L0 1 L-5 4 Z" fill="#651B28" opacity="0.7" />
          <text y="18" textAnchor="middle" fontSize="11" fontWeight="700" fill="#651B28" opacity="0.7" fontFamily="Manrope, sans-serif">
            N
          </text>
        </g>
        {/* scale */}
        <g transform={`translate(18 ${H - 18})`} aria-hidden="true">
          <path d={`M0 0 H${geo.barPx}`} stroke="#5B4A45" strokeWidth="2" />
          <path d={`M0 -4 V4 M${geo.barPx} -4 V4`} stroke="#5B4A45" strokeWidth="2" />
          <text x={geo.barPx + 6} y="4" fontSize={12 * k} fill="#5B4A45" fontFamily="Manrope, sans-serif">
            about {geo.barKm} km
          </text>
        </g>
        {geo.subs.map((s) => {
          const on = subArea === s.name
          return (
            <g key={s.name} aria-hidden="true">
              <circle cx={s.x} cy={s.y} r={on ? 6 : 4.5} fill={on ? '#344A3B' : 'none'} stroke="#344A3B" strokeWidth="1.6" opacity="0.8" />
              <text
                x={s.x}
                y={s.y + 8 + 13 * k}
                textAnchor="middle"
                fontSize={13 * k}
                fontWeight={on ? 800 : 700}
                fill="#344A3B"
                fontFamily="Manrope, sans-serif"
                paintOrder="stroke"
                stroke="#FBF1DF"
                strokeWidth="4"
              >
                {s.name}
              </text>
            </g>
          )
        })}
        {geo.pins.map(({ l, n, x, y }) => (
          <g
            key={l.id}
            role="button"
            tabIndex={0}
            aria-label={`Pin ${n}: ${l.name}. Open details`}
            onClick={() => onOpen(l.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOpen(l.id)
              }
            }}
            className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-gold"
            transform={`translate(${x} ${y}) scale(${k})`}
          >
            <circle r="22" fill="transparent" stroke="transparent" strokeWidth="3" />
            <path d="M0 0 C-9 -10 -11 -14 -11 -19 A11 11 0 1 1 11 -19 C11 -14 9 -10 0 0Z" fill={l.status === 'published-2026' ? '#B93432' : '#8A7770'} stroke="#FFF6E8" strokeWidth="2" />
            <text y="-15" textAnchor="middle" fontSize="12" fontWeight="800" fill="#FFF6E8" fontFamily="Manrope, sans-serif">
              {n}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-parchment-deep/80 px-3.5 py-2 text-[14px] sm:text-[13px] text-ink-soft">
        <span className="font-semibold">Approximate positions. Not for navigation.</span>
        {geo.pins.length > 0 && (
          <span className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-vermilion" /> Published for 2026
            </span>
            <span className="inline-flex items-center gap-1">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-ink-mute" /> Other
            </span>
          </span>
        )}
      </figcaption>
    </figure>
  )
}
