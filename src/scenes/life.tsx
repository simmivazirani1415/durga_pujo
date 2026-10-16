/**
 * Ambient festive life: people strolling along the footpath, distant traffic, a dhaki drumming, a
 * caparisoned elephant crossing far ahead. Used selectively, a few per stop.
 *
 * Everything here animates (SMIL / CSS), so each stop keeps its moving things in one small layer of
 * their own ('life', added by withLife) and the big painted layers never need repainting.
 */
import type { ReactNode } from 'react'
import type { LayerDef, SceneDef } from './types'
import { roadPoint, rng, shade, type RoadStyle } from './world'
import { Person, PAL } from './kit'

const fmt = (n: number) => n.toFixed(2)

interface Track {
  pts: { x: number; y: number; s: number }[]
}

function track(road: RoadStyle, X0: number, X1: number, Z0: number, Z1: number, n = 10): Track {
  return {
    pts: Array.from({ length: n }).map((_, i) => {
      const t = i / (n - 1)
      // equal steps in Z read as constant speed in the world
      const Z = Z0 + (Z1 - Z0) * t
      const X = X0 + (X1 - X0) * t
      return roadPoint(road, X, Z)
    }),
  }
}

/** moves its children (drawn at the origin, 1 unit = 1 metre) along a ground track, scaling with depth */
function Mover({ tr, dur, delay, children, fade = 0.1 }: { tr: Track; dur: number; delay: number; children: ReactNode; fade?: number }) {
  const kt = tr.pts.map((_, i) => fmt(i / (tr.pts.length - 1))).join(';')
  const begin = `${-delay}s`
  return (
    <g opacity="0">
      <animate attributeName="opacity" values="0;1;1;0" keyTimes={`0;${fade};${1 - fade};1`} dur={`${dur}s`} begin={begin} repeatCount="indefinite" />
      <g>
        <animateTransform attributeName="transform" type="translate" values={tr.pts.map((p) => `${fmt(p.x)} ${fmt(p.y)}`).join(';')} keyTimes={kt} dur={`${dur}s`} begin={begin} repeatCount="indefinite" />
        <g>
          <animateTransform attributeName="transform" type="scale" values={tr.pts.map((p) => fmt(p.s)).join(';')} keyTimes={kt} dur={`${dur}s`} begin={begin} repeatCount="indefinite" />
          {children}
        </g>
      </g>
    </g>
  )
}

/** a person walking along the footpath between Z0 and Z1 (metres ahead). Z0 > Z1 walks towards the camera */
export function Walker({ road, X, Z0, Z1, dur, delay = 0, seed = 1, variant, colors }: { road: RoadStyle; X: number; Z0: number; Z1: number; dur: number; delay?: number; seed?: number; variant?: 'man' | 'woman' | 'kid' | 'lalpaar'; colors?: [string, string] }) {
  return (
    <Mover tr={track(road, X, X, Z0, Z1)} dur={dur} delay={delay}>
      <g className="walk-bob" style={{ animationDelay: `${-(seed % 7) * 0.13}s` }}>
        <Person x={0} y={0} s={1} seed={seed} variant={variant} colors={colors} flip={seed % 2 === 0} />
      </g>
    </Mover>
  )
}

const CAR_COLOURS = ['#e9e6df', '#b8bcc0', '#7a1e24', '#2c3440', '#d7c9a8', '#3c5a74', '#f2f0ea']

/** a car, rear (moving away, red tail lights) or front (oncoming, warm headlights), at 1 unit = 1 m */
function CarShape({ seed, front, lights }: { seed: number; front: boolean; lights: boolean }) {
  const r = rng(seed)
  const c = CAR_COLOURS[Math.floor(r() * CAR_COLOURS.length)]
  const taxi = r() < 0.12
  const body = taxi ? '#f2c230' : c
  const lamp = front ? '#fff1c8' : '#ff3b2f'
  return (
    <g>
      <ellipse cx={0} cy={0} rx={1.05} ry={0.12} fill="#1a120c" opacity="0.4" />
      <path d="M-0.9 -0.18 L-0.92 -0.78 Q-0.9 -0.92 -0.7 -0.95 L0.7 -0.95 Q0.9 -0.92 0.92 -0.78 L0.9 -0.18 Z" fill={body} />
      <path d="M-0.68 -0.95 L-0.55 -1.38 Q-0.5 -1.45 -0.4 -1.45 L0.4 -1.45 Q0.5 -1.45 0.55 -1.38 L0.68 -0.95 Z" fill={shade(body, -0.12)} />
      <path d="M-0.58 -1.0 L-0.48 -1.33 L0.48 -1.33 L0.58 -1.0 Z" fill={front ? '#3b4656' : '#2e3642'} />
      <rect x={-0.9} y={-0.3} width={1.8} height={0.12} fill="#2a2522" />
      <rect x={-0.84} y={-0.68} width={0.28} height={0.12} rx={0.04} fill={lamp} />
      <rect x={0.56} y={-0.68} width={0.28} height={0.12} rx={0.04} fill={lamp} />
      {lights && (
        <g opacity="0.75">
          <circle cx={-0.7} cy={-0.62} r={0.45} fill={lamp} opacity="0.3" />
          <circle cx={0.7} cy={-0.62} r={0.45} fill={lamp} opacity="0.3" />
        </g>
      )}
      <rect x={-0.22} y={-0.52} width={0.44} height={0.12} fill="#f4f1e8" opacity="0.8" />
    </g>
  )
}

function ScooterShape({ seed, front }: { seed: number; front: boolean }) {
  const r = rng(seed)
  const shirt = ['#3a5a7a', '#b93432', '#e7b958', '#f2e6cf', '#2f5d4a'][Math.floor(r() * 5)]
  return (
    <g>
      <ellipse cx={0} cy={0} rx={0.35} ry={0.06} fill="#1a120c" opacity="0.4" />
      <rect x={-0.07} y={-0.55} width={0.14} height={0.55} rx={0.06} fill="#222" />
      <rect x={-0.24} y={-0.95} width={0.48} height={0.45} rx={0.12} fill={['#c9cdd2', '#7a1e24', '#2c3440'][Math.floor(r() * 3)]} />
      <rect x={-0.2} y={-1.55} width={0.4} height={0.62} rx={0.12} fill={shirt} />
      <circle cx={0} cy={-1.72} r={0.16} fill={['#2a2a2a', '#b93432', '#f4f1e8'][Math.floor(r() * 3)]} />
      <circle cx={0} cy={-0.72} r={0.07} fill={front ? '#fff1c8' : '#ff3b2f'} />
    </g>
  )
}

/** distant traffic on the carriageway. Oncoming on the right lane, going away on the left (India drives on the left) */
export function Traffic({ road, count = 4, seed = 1, lights = false, scooters = 0.3, zNear = 16, zFar = 95 }: { road: RoadStyle; count?: number; seed?: number; lights?: boolean; scooters?: number; zNear?: number; zFar?: number }) {
  const r = rng(seed)
  const lane = road.halfWidth * 0.5
  return (
    <g>
      {Array.from({ length: count }).map((_, i) => {
        const oncoming = i % 2 === 0
        const X = (oncoming ? lane : -lane) + (r() - 0.5) * 0.6
        const dur = 9 + r() * 6
        const delay = (dur * i) / count + r() * 2
        const scoot = r() < scooters
        const tr = oncoming ? track(road, X, X, zFar, zNear) : track(road, X, X, zNear, zFar)
        return (
          <Mover key={i} tr={tr} dur={dur} delay={delay} fade={0.12}>
            {scoot ? <ScooterShape seed={seed * 13 + i} front={oncoming} /> : <CarShape seed={seed * 13 + i} front={oncoming} lights={lights} />}
          </Mover>
        )
      })}
    </g>
  )
}

/** a dhaki drumming: the body sways, the white kash plume tosses */
export function DhakiPlaying({ x, y, s, flip = false }: { x: number; y: number; s: number; flip?: boolean }) {
  const d = flip ? -1 : 1
  return (
    <g transform={`translate(${fmt(x)} ${fmt(y)}) scale(${fmt(s)})`}>
      <g className="dhaki-sway">
        <Person x={0} y={0} s={1} variant="man" colors={['#fbf3e6', '#e9dcc4']} seed={91} flip={flip} />
        <ellipse cx={d * 0.35} cy={-0.85} rx={0.42} ry={0.32} fill="#8a5a2b" />
        <ellipse cx={d * 0.35} cy={-0.85} rx={0.42} ry={0.32} fill="none" stroke="#3a2418" strokeWidth={0.05} />
        <ellipse cx={d * 0.05} cy={-0.85} rx={0.08} ry={0.3} fill="#e8d6b0" />
        <g className="dhaki-plume" style={{ transformOrigin: `${d * 0.7}px -1px` }}>
          <path d={`M${d * 0.6} -1.0 Q${d * 1.0} -2.0 ${d * 0.75} -2.6 Q${d * 1.3} -2.2 ${d * 0.9} -1.0 Z`} fill="#fbf7ee" />
          <path d={`M${d * 0.7} -1.0 L${d * 0.85} -2.3`} stroke="#d9cdb5" strokeWidth={0.04} />
        </g>
        <g className="dhaki-stick">
          <path d={`M${d * -0.15} -1.15 L${d * 0.15} -0.8`} stroke="#5a3a24" strokeWidth={0.05} strokeLinecap="round" />
        </g>
      </g>
    </g>
  )
}

/** a caparisoned temple elephant with its mahout, seen from the side, at 1 unit = 1 m */
function ElephantShape() {
  return (
    <g>
      <ellipse cx={0} cy={0} rx={2.2} ry={0.18} fill="#1a120c" opacity="0.35" />
      {/* legs */}
      {[-1.2, -0.55, 0.6, 1.2].map((lx, i) => (
        <rect key={i} className={i % 2 ? 'leg-a' : 'leg-b'} x={lx - 0.28} y={-1.55} width={0.56} height={1.55} rx={0.22} fill={i % 3 ? '#6b625c' : '#5c544e'} />
      ))}
      {/* body and head */}
      <ellipse cx={-0.1} cy={-2.0} rx={1.75} ry={1.0} fill="#746a63" />
      <circle cx={1.55} cy={-2.35} r={0.78} fill="#7a7069" />
      <path d="M2.15 -2.2 Q2.55 -1.4 2.25 -0.5 Q2.2 -0.3 2.05 -0.35 Q2.25 -1.2 1.85 -1.9 Z" fill="#7a7069" />
      <path d="M1.25 -2.75 Q0.8 -2.2 1.1 -1.6 Q1.55 -1.7 1.6 -2.3 Z" fill="#665d57" />
      <path d="M2.0 -1.75 q0.35 0.05 0.5 0.3" stroke="#f4ead6" strokeWidth={0.08} strokeLinecap="round" fill="none" />
      <circle cx={1.85} cy={-2.5} r={0.06} fill="#2a2522" />
      {/* forehead ornament (nettipattam) and the caparison */}
      <path d="M1.75 -3.05 L2.25 -2.65 L2.05 -1.85 L1.6 -2.2 Z" fill="#e2b04e" />
      <path d="M-1.55 -2.85 Q-0.1 -3.2 1.1 -2.85 L1.05 -1.35 Q-0.1 -1.15 -1.5 -1.4 Z" fill="#9b1c26" />
      <path d="M-1.5 -1.4 Q-0.1 -1.15 1.05 -1.35" stroke="#e2b04e" strokeWidth={0.12} fill="none" />
      <path d="M-1.55 -2.85 Q-0.1 -3.2 1.1 -2.85" stroke="#e2b04e" strokeWidth={0.1} fill="none" />
      {[-1.1, -0.6, -0.1, 0.4, 0.85].map((tx) => (
        <circle key={tx} cx={tx} cy={-1.32} r={0.07} fill="#e2b04e" />
      ))}
      <path d="M-1.85 -2.2 q-0.4 0.4 -0.3 1.1" stroke="#5c544e" strokeWidth={0.1} fill="none" />
      {/* mahout */}
      <rect x={0.75} y={-3.75} width={0.36} height={0.75} rx={0.12} fill="#f2e6cf" />
      <circle cx={0.93} cy={-3.92} r={0.17} fill="#7a4b31" />
      <path d="M0.76 -4.02 Q0.93 -4.25 1.1 -4.02 Z" fill="#b93432" />
      {/* the parasol (muthukuda) above */}
      <path d="M0.93 -3.8 V-5.0" stroke="#5a3a24" strokeWidth={0.05} />
      <path d="M0.2 -4.95 Q0.93 -5.5 1.66 -4.95 Z" fill={PAL.vermilion} />
      <path d="M0.2 -4.95 H1.66" stroke="#e2b04e" strokeWidth={0.08} />
    </g>
  )
}

/** an elephant procession crossing the view at depth Z, from X0 to X1 (metres), slowly */
export function ElephantCrossing({ road, Z, X0, X1, dur = 60, delay = 0 }: { road: RoadStyle; Z: number; X0: number; X1: number; dur?: number; delay?: number }) {
  const tr = track(road, X0, X1, Z, Z, 6)
  const dir = X1 > X0 ? 1 : -1
  return (
    <Mover tr={tr} dur={dur} delay={delay} fade={0.08}>
      <g transform={`scale(${dir} 1)`}>
        <ElephantShape />
        {/* two attendants walking alongside, one with a small drum */}
        <g transform="translate(-3.0 0)">
          <g className="walk-bob">
            <Person x={0} y={0} s={1} variant="man" colors={['#fbf3e6', '#e9dcc4']} seed={5} />
          </g>
        </g>
        <g transform="translate(3.4 0.4)">
          <g className="walk-bob" style={{ animationDelay: '-0.2s' }}>
            <Person x={0} y={0} s={1} variant="lalpaar" seed={6} />
          </g>
        </g>
      </g>
    </Mover>
  )
}

/** a small rowing boat drifting across a lake band at depth Z */
export function DriftBoat({ road, Z, X0, X1, dur = 70, delay = 0 }: { road: RoadStyle; Z: number; X0: number; X1: number; dur?: number; delay?: number }) {
  return (
    <Mover tr={track(road, X0, X1, Z, Z, 4)} dur={dur} delay={delay} fade={0.1}>
      <g>
        <path d="M-1.8 -0.3 Q0 0.25 1.8 -0.3 L1.5 0 Q0 0.3 -1.5 0 Z" fill="#8a4a2a" />
        <path d="M-1.6 -0.3 H1.6" stroke="#e7b958" strokeWidth={0.08} />
        <rect x={-0.15} y={-1.2} width={0.32} height={0.9} rx={0.1} fill="#b93432" />
        <circle cx={0} cy={-1.35} r={0.15} fill="#7a4b31" />
        <path d="M-0.9 -0.7 L1.2 0.1" stroke="#5a3a24" strokeWidth={0.05} />
        <ellipse cx={0} cy={0.08} rx={2.4} ry={0.08} fill="#fff4d8" opacity="0.35" />
      </g>
    </Mover>
  )
}

/** a Namma Metro train gliding across a viaduct deck (deckY = top of the deck), passing every `dur` seconds */
export function MetroTrain({ x, deckY, s, len, livery, lit = false, dur = 22, delay = 0, travel = 2600 }: { x: number; deckY: number; s: number; len: number; livery: 'purple' | 'green' | 'yellow'; lit?: boolean; dur?: number; delay?: number; travel?: number }) {
  const col = { purple: '#6a3d8f', green: '#2f8a4c', yellow: '#e2b21f' }[livery]
  const w = len * s
  return (
    <g>
      <animateTransform attributeName="transform" type="translate" values={`${-travel / 2 - w} 0;${travel / 2} 0;${travel / 2} 0`} keyTimes="0;0.55;1" dur={`${dur}s`} begin={`${-delay}s`} repeatCount="indefinite" />
      <rect x={x} y={deckY - 3.6 * s} width={w} height={3.1 * s} rx={0.5 * s} fill="#eef0ee" />
      <rect x={x} y={deckY - 1.6 * s} width={w} height={0.6 * s} fill={col} />
      <rect x={x} y={deckY - 3.6 * s} width={w} height={0.3 * s} fill={col} />
      {Array.from({ length: Math.floor(len / 2.4) }).map((_, i) => (
        <rect key={i} x={x + (i * 2.4 + 0.6) * s} y={deckY - 3.0 * s} width={1.4 * s} height={1.0 * s} fill={lit ? '#ffe2a6' : '#4a5462'} />
      ))}
      {Array.from({ length: Math.floor(len / 21) }).map((_, i) => (
        <rect key={`j${i}`} x={x + (i + 1) * 21 * s} y={deckY - 3.6 * s} width={0.2 * s} height={3.1 * s} fill="#b9bdbb" />
      ))}
      {lit && <rect x={x} y={deckY - 3.1 * s} width={w} height={2 * s} fill="#ffd98f" opacity="0.18" />}
    </g>
  )
}

/**
 * Add a stop's ambient life as its own small 'front' layer, placed before the scene's other front layers so
 * nearer trees and buildings still cover it. The layer shares depth 0.55 with the mid street for transitions.
 */
export function withLife(scene: SceneDef, render: () => ReactNode, opts: { depth?: number; after?: string } = {}): SceneDef {
  const life: LayerDef = { id: 'life', band: 'front', depth: opts.depth ?? 0.55, render }
  const i = opts.after ? scene.layers.findIndex((l) => l.id === opts.after) + 1 : scene.layers.findIndex((l) => l.band === 'front')
  const layers = [...scene.layers]
  layers.splice(i < 0 ? layers.length : i, 0, life)
  return { ...scene, layers }
}

