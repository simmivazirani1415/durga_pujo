import { memo, type CSSProperties } from 'react'
import { STOPS } from '../data/areas'
import { ATMOS, type Atmos } from '../scenes/atmos'
import { useJourney } from '../store/journey'
import { useView, type ViewMap } from './viewport'

/**
 * The cinematic pass laid over the whole picture (3D street and auto): a light split-tone, a gentle vignette and, on evening stops, a few drifting festival-light bokeh.
 * One set per stop; the current stop's set cross-fades in as the ride arrives.
 */
const GradeSet = memo(function GradeSet({ a, view, on }: { a: Atmos; view: ViewMap; on: boolean }) {
  const base: CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none' }
  return (
    <div style={{ ...base, opacity: on ? 1 : 0, transition: 'opacity 1.1s ease' }}>
      <div
        style={{
          ...base,
          mixBlendMode: 'soft-light',
          opacity: a.toneK * 0.6,
          background: `linear-gradient(to bottom, ${a.toneTop} 0%, transparent 48%, ${a.toneBottom} 100%)`,
        }}
      />
      <div
        style={{
          ...base,
          background: `radial-gradient(ellipse 75% 70% at 50% 46%, transparent 55%, rgba(34,14,10,${a.vignette * 0.8}) 100%)`,
        }}
      />
      {/* no drifting bokeh: Simran wants the stops crisp, with no blurry effects */}
    </div>
  )
})

const BOKEH = [
  // kept clear of the logo and the stop's heading (top left)
  { x: 0.62, y: 0.05, r: 22, c: '#ffe3a6', d: 6 },
  { x: 0.9, y: 0.1, r: 52, c: '#ffcf7a', d: 2 },
  { x: 0.97, y: 0.26, r: 30, c: '#ffb36a', d: 5 },
  { x: 0.78, y: 0.04, r: 20, c: '#ffe8b8', d: 8 },
  { x: 0.03, y: 0.8, r: 40, c: '#ffcf7a', d: 0 },
  { x: 0.1, y: 0.9, r: 24, c: '#ff9f5a', d: 3 },
  { x: 0.95, y: 0.86, r: 34, c: '#ffb36a', d: 4 },
]

function Bokeh({ k, view }: { k: number; view: ViewMap }) {
  const sc = Math.min(1.2, Math.max(0.6, view.W / 1440))
  return (
    <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: 0.55 * k }}>
      {BOKEH.map((b, i) => (
        <span
          key={i}
          className="grade-bokeh"
          style={{
            position: 'absolute',
            left: b.x * view.W - b.r * sc,
            top: b.y * view.H - b.r * sc,
            width: b.r * 2 * sc,
            height: b.r * 2 * sc,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${b.c} 0%, ${b.c}cc 45%, ${b.c}00 72%)`,
            animationDelay: `${-b.d}s`,
          }}
        />
      ))}
    </div>
  )
}

export function Grade() {
  const index = useJourney((s) => s.index)
  const view = useView()
  const cur = STOPS[index]
  return (
    <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
      {Object.entries(ATMOS).map(([id, a]) => (id === 'transit' ? null : <GradeSet key={id} a={a} view={view} on={id === cur} />))}
    </div>
  )
}
