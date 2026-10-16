/**
 * The pandal waiting at each stop. Every area gets its own celebration: a lakeside pavilion, a palatial
 * community pujo, a terracotta temple, a modern theme pandal and so on, so each arrival is a fresh discovery.
 *
 * All drawn in a local 300 x 260 box, ground line at y = 236, centred on x = 150, lit warm from the right
 * with a glowing interior. The goddess is never drawn: a golden chalchitra halo and light are enough.
 */
import { useId, type ReactNode } from 'react'
import { rng } from './world'

export type PandalVariant =
  | 'shamiana'
  | 'chala'
  | 'palatial'
  | 'lakeside'
  | 'modern'
  | 'grand-gate'
  | 'terracotta'
  | 'neighbourhood'
  | 'shikhara'
  | 'sholapith'

export const PANDAL_FOR: Record<string, PandalVariant> = {
  yelahanka: 'shamiana',
  malleswaram: 'chala',
  'rt-nagar-palace-grounds': 'palatial',
  ulsoor: 'lakeside',
  indiranagar: 'modern',
  'whitefield-hoodi': 'grand-gate',
  koramangala: 'terracotta',
  'hsr-layout': 'neighbourhood',
  'south-east': 'shikhara',
  south: 'sholapith',
}

/** one-line mood shown under the pandal (no invented names, just the kind of celebration) */
export const PANDAL_MOOD: Record<PandalVariant, string> = {
  shamiana: 'Open-air cultural evening',
  chala: 'Traditional Bengali pujo',
  palatial: 'Grand community pujo',
  lakeside: 'Lakeside neighbourhood pujo',
  modern: 'Theme pandal',
  'grand-gate': 'Large community pujo',
  terracotta: 'Terracotta temple theme',
  neighbourhood: 'Neighbourhood pujo',
  shikhara: 'Temple-spire theme',
  sholapith: 'Sholapith and jute theme',
}

const GY = 236
const CX = 150

interface Ids {
  glow: string
  pool: string
  bulb: string
  inner: string
  litR: string
  soft: string
}

function Defs({ ids, warm = '#ffd27a' }: { ids: Ids; warm?: string }) {
  return (
    <defs>
      <radialGradient id={ids.glow} cx="0.5" cy="0.62" r="0.65">
        <stop offset="0" stopColor="#fff2c4" />
        <stop offset="0.3" stopColor={warm} />
        <stop offset="0.75" stopColor="#c0502a" />
        <stop offset="1" stopColor="#5a1a14" />
      </radialGradient>
      <radialGradient id={ids.pool} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor={warm} stopOpacity="0.75" />
        <stop offset="0.5" stopColor={warm} stopOpacity="0.25" />
        <stop offset="1" stopColor={warm} stopOpacity="0" />
      </radialGradient>
      <radialGradient id={ids.bulb}>
        <stop offset="0" stopColor="#fffbe6" />
        <stop offset="0.35" stopColor="#ffe08a" stopOpacity="0.9" />
        <stop offset="1" stopColor="#ffb54a" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={ids.litR} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#000" stopOpacity="0.28" />
        <stop offset="0.55" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#fff3d6" stopOpacity="0.22" />
      </linearGradient>
      <linearGradient id={ids.inner} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
        <stop offset="1" stopColor="#000" stopOpacity="0.22" />
      </linearGradient>
      <filter id={ids.soft} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
    </defs>
  )
}

/** the glowing interior with the golden chalchitra halo, never the goddess in detail */
function Sanctum({ ids, x, y, w, h, arch = true }: { ids: Ids; x: number; y: number; w: number; h: number; arch?: boolean }) {
  const cx = x + w / 2
  const r = Math.min(w * 0.36, h * 0.42)
  const top = y + h - r * 2.1
  return (
    <g>
      {arch ? (
        <path d={`M${x} ${y + h} L${x} ${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} L${x + w} ${y + h} Z`} fill={`url(#${ids.glow})`} />
      ) : (
        <rect x={x} y={y} width={w} height={h} fill={`url(#${ids.glow})`} />
      )}
      <path d={`M${cx - r} ${y + h - 2} L${cx - r} ${top + r} A${r} ${r} 0 0 1 ${cx + r} ${top + r} L${cx + r} ${y + h - 2}`} fill="none" stroke="#ffd768" strokeWidth={Math.max(1.4, r * 0.09)} opacity="0.9" />
      <path d={`M${cx - r * 0.78} ${y + h - 2} L${cx - r * 0.78} ${top + r} A${r * 0.78} ${r * 0.78} 0 0 1 ${cx + r * 0.78} ${top + r} L${cx + r * 0.78} ${y + h - 2}`} fill="none" stroke="#fff0b8" strokeWidth={Math.max(0.8, r * 0.035)} opacity="0.7" />
      <circle cx={cx} cy={top + r * 0.95} r={r * 0.32} fill="#fff8de" opacity="0.85" filter={`url(#${ids.soft})`} />
      <ellipse cx={cx} cy={y + h - r * 0.55} rx={r * 0.55} ry={r * 0.75} fill="#ffeab0" opacity="0.55" filter={`url(#${ids.soft})`} />
    </g>
  )
}

function Bulbs({ ids, x1, y1, x2, y2, sag = 8, n = 12, r = 2.2 }: { ids: Ids; x1: number; y1: number; x2: number; y2: number; sag?: number; n?: number; r?: number }) {
  const pts = Array.from({ length: n }).map((_, i) => {
    const t = i / (n - 1)
    return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t + sag * 4 * t * (1 - t) }
  })
  return (
    <g>
      <path d={`M${x1} ${y1} Q${(x1 + x2) / 2} ${(y1 + y2) / 2 + sag * 2} ${x2} ${y2}`} stroke="#4a3328" strokeWidth="0.6" fill="none" opacity="0.6" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={r * 2.4} fill={`url(#${ids.bulb})`} />
      ))}
    </g>
  )
}

function Marigold({ x1, y1, x2, y2, sag = 6, r = 2.4 }: { x1: number; y1: number; x2: number; y2: number; sag?: number; r?: number }) {
  const n = Math.max(4, Math.floor(Math.hypot(x2 - x1, y2 - y1) / (r * 1.6)))
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const t = i / (n - 1)
        const x = x1 + (x2 - x1) * t
        const y = y1 + (y2 - y1) * t + sag * 4 * t * (1 - t)
        return <circle key={i} cx={x} cy={y} r={r} fill={i % 5 === 2 ? '#fff4dc' : i % 2 ? '#f3a51e' : '#e8661c'} />
      })}
    </g>
  )
}

/** a few visitors in front of the pandal, back-lit by its glow */
function Visitors({ seed, n, spread = 120, scale = 1 }: { seed: number; n: number; spread?: number; scale?: number }) {
  const r = rng(seed)
  const people = Array.from({ length: n }).map(() => {
    const x = CX + (r() - 0.5) * spread * 2
    const h = (20 + r() * 8) * scale
    const lal = r() < 0.35
    const kid = r() < 0.15
    return { x, h: kid ? h * 0.65 : h, lal, c: ['#3b2a2e', '#4a2f2a', '#2f3340', '#5a2a30', '#36302a'][Math.floor(r() * 5)], y: GY + 4 + r() * 10 }
  })
  people.sort((a, b) => a.y - b.y)
  return (
    <g>
      {people.map((p, i) => {
        const w = p.h * 0.3
        return (
          <g key={i}>
            <ellipse cx={p.x} cy={p.y} rx={w * 1.1} ry={1.6} fill="#1a0f0a" opacity="0.35" />
            {p.lal ? (
              <>
                <path d={`M${p.x - w * 0.5} ${p.y - p.h * 0.8} L${p.x + w * 0.5} ${p.y - p.h * 0.8} L${p.x + w * 0.7} ${p.y} L${p.x - w * 0.7} ${p.y} Z`} fill="#efe2cc" />
                <path d={`M${p.x - w * 0.7} ${p.y - p.h * 0.07} L${p.x + w * 0.7} ${p.y - p.h * 0.07} L${p.x + w * 0.72} ${p.y} L${p.x - w * 0.72} ${p.y} Z`} fill="#b3222a" />
              </>
            ) : (
              <path d={`M${p.x - w * 0.5} ${p.y - p.h * 0.8} L${p.x + w * 0.5} ${p.y - p.h * 0.8} L${p.x + w * 0.42} ${p.y} L${p.x - w * 0.42} ${p.y} Z`} fill={p.c} />
            )}
            <circle cx={p.x} cy={p.y - p.h * 0.88} r={p.h * 0.085} fill="#2a1a14" />
            {/* rim light from the pandal */}
            <path d={`M${p.x - w * 0.5} ${p.y - p.h * 0.8} L${p.x - w * 0.62} ${p.y - p.h * 0.3}`} stroke="#ffcf7a" strokeWidth="0.8" opacity="0.55" />
          </g>
        )
      })}
    </g>
  )
}

function Ground({ ids, w = 130 }: { ids: Ids; w?: number }) {
  return (
    <g>
      <ellipse cx={CX} cy={GY + 6} rx={w * 1.15} ry={16} fill={`url(#${ids.pool})`} />
      <ellipse cx={CX - 8} cy={GY + 1} rx={w * 0.95} ry={5} fill="#1a0f0a" opacity="0.32" />
    </g>
  )
}

/* ------------------------------------------------------------------ the ten pandals */

function Shamiana(ids: Ids) {
  // open-air cultural evening: striped canopy on bamboo poles, a lit stage and chairs
  const stripes = Array.from({ length: 12 })
  const x0 = 46
  const x1 = 254
  return (
    <g>
      <Ground ids={ids} w={110} />
      <rect x={70} y={150} width={160} height={86} fill="#3a1b16" />
      <rect x={70} y={150} width={160} height={86} fill={`url(#${ids.glow})`} opacity="0.9" />
      <Sanctum ids={ids} x={118} y={156} w={64} h={74} />
      <rect x={70} y={224} width={160} height={12} fill="#7a2d22" />
      <rect x={70} y={224} width={160} height={2} fill="#e6b14a" />
      {/* canopy with stripes */}
      <clipPath id={`${ids.glow}c`}>
        <path d={`M${x0} 132 Q150 92 ${x1} 132 L${x1 - 6} 150 L${x0 + 6} 150 Z`} />
      </clipPath>
      <g clipPath={`url(#${ids.glow}c)`}>
        {stripes.map((_, i) => (
          <rect key={i} x={x0 + i * 18} y={88} width={9} height={70} fill={i % 2 ? '#f6ead2' : '#c2302c'} />
        ))}
        <rect x={x0} y={88} width={x1 - x0} height={70} fill={`url(#${ids.litR})`} />
      </g>
      {Array.from({ length: 13 }).map((_, i) => (
        <path key={i} d={`M${x0 + 6 + i * 16} 150 q8 9 16 0`} fill={i % 2 ? '#e7b14a' : '#c2302c'} />
      ))}
      {[x0 + 8, 108, 192, x1 - 8].map((px, i) => (
        <rect key={i} x={px - 2} y={146} width={4} height={90} fill="#8a6a45" />
      ))}
      <Bulbs ids={ids} x1={x0 + 8} y1={162} x2={x1 - 8} y2={162} sag={6} n={14} r={1.6} />
      {/* rows of chairs */}
      {[0, 1].map((row) =>
        Array.from({ length: 9 }).map((_, i) => (
          <rect key={`${row}${i}`} x={82 + i * 16 + row * 4} y={240 + row * 8} width={9} height={6} rx={1.5} fill="#5a1f22" opacity="0.85" />
        )),
      )}
      <Visitors seed={11} n={5} spread={110} scale={0.9} />
    </g>
  )
}

function Chala(ids: Ids) {
  // traditional Bengali do-chala: curved thatch roof, bamboo frame, alpana on the plinth
  return (
    <g>
      <Ground ids={ids} w={105} />
      <rect x={58} y={226} width={184} height={12} fill="#c9a77d" />
      <path d="M58 226 h184" stroke="#fff6e3" strokeWidth="1.2" strokeDasharray="3 4" />
      <rect x={72} y={128} width={156} height={100} fill="#d8c3a0" />
      <rect x={72} y={128} width={156} height={100} fill={`url(#${ids.litR})`} />
      {/* bamboo lattice */}
      {Array.from({ length: 11 }).map((_, i) => (
        <rect key={i} x={74 + i * 14.6} y={130} width={2.2} height={96} fill="#9a7a4e" opacity="0.6" />
      ))}
      <Sanctum ids={ids} x={112} y={140} w={76} h={86} />
      {/* curved thatch roof, two tiers */}
      <path d="M44 136 Q150 54 256 136 Q246 142 238 140 Q150 78 62 140 Q54 142 44 136 Z" fill="#b48a4a" />
      <path d="M44 136 Q150 54 256 136" stroke="#e4c27e" strokeWidth="3" fill="none" />
      <path d="M62 140 Q150 78 238 140" stroke="#7a5428" strokeWidth="2" fill="none" />
      {Array.from({ length: 22 }).map((_, i) => {
        const t = i / 21
        const x = 48 + t * 204
        const y = 136 - Math.sin(t * Math.PI) * 74
        return <path key={i} d={`M${x} ${y + 2} l${(t - 0.5) * 6} 10`} stroke="#8a6534" strokeWidth="1" opacity="0.6" />
      })}
      <path d="M92 88 Q150 30 208 88 Q150 60 92 88 Z" fill="#c79c56" />
      <path d="M92 88 Q150 30 208 88" stroke="#ecd08e" strokeWidth="2" fill="none" />
      <path d="M150 42 l-4 -4 l4 -16 l4 16 Z" fill="#e7b958" />
      <Marigold x1={72} y1={146} x2={228} y2={146} sag={7} r={2.6} />
      {[100, 150, 200].map((x) => (
        <Marigold key={x} x1={x} y1={146} x2={x} y2={174} sag={0} r={2.2} />
      ))}
      <Visitors seed={23} n={6} spread={100} />
    </g>
  )
}

function Palatial(ids: Ids) {
  // a grand community pujo: wide palace-front facade, central arch, domed side towers, lights everywhere
  const arches = [-1, 1]
  return (
    <g>
      <Ground ids={ids} w={140} />
      {/* side wings */}
      {arches.map((d) => (
        <g key={d}>
          <rect x={d < 0 ? 22 : 196} y={120} width={82} height={116} fill="#efe1c5" />
          <rect x={d < 0 ? 22 : 196} y={120} width={82} height={116} fill={`url(#${ids.litR})`} />
          {[0, 1].map((k) => (
            <path
              key={k}
              d={`M${(d < 0 ? 32 : 206) + k * 36} 236 v-42 a13 13 0 0 1 26 0 v42 Z`}
              fill={`url(#${ids.glow})`}
              opacity="0.85"
            />
          ))}
          <rect x={d < 0 ? 18 : 192} y={112} width={90} height={9} fill="#c9a46a" />
          {/* domed tower */}
          <rect x={d < 0 ? 8 : 266} y={84} width={26} height={152} fill="#e8d5b2" />
          <rect x={d < 0 ? 8 : 266} y={84} width={26} height={152} fill={`url(#${ids.litR})`} />
          <path d={`M${d < 0 ? 4 : 262} 86 Q${d < 0 ? 21 : 279} 52 ${d < 0 ? 38 : 296} 86 Z`} fill="#c8963e" />
          <path d={`M${d < 0 ? 21 : 279} 58 v-12`} stroke="#e7b958" strokeWidth="2" />
          <circle cx={d < 0 ? 21 : 279} cy={44} r={2.4} fill="#ffe08a" />
        </g>
      ))}
      {/* central portal */}
      <rect x={96} y={70} width={108} height={166} fill="#f4e8d0" />
      <rect x={96} y={70} width={108} height={166} fill={`url(#${ids.litR})`} />
      <Sanctum ids={ids} x={114} y={118} w={72} h={118} />
      <path d="M114 236 v-82 a36 36 0 0 1 72 0 v82" fill="none" stroke="#b5832e" strokeWidth="3" />
      <rect x={92} y={62} width={116} height={10} fill="#b5832e" />
      <path d="M100 62 Q150 4 200 62 Z" fill="#d7a54a" />
      <path d="M100 62 Q150 4 200 62" fill="none" stroke="#f3d27f" strokeWidth="2" />
      <path d="M150 20 v-14" stroke="#e7b958" strokeWidth="2.4" />
      <circle cx={150} cy={4} r={3} fill="#ffe08a" />
      <Bulbs ids={ids} x1={92} y1={74} x2={208} y2={74} sag={5} n={14} r={1.7} />
      <Bulbs ids={ids} x1={18} y1={124} x2={108} y2={124} sag={5} n={9} r={1.5} />
      <Bulbs ids={ids} x1={192} y1={124} x2={282} y2={124} sag={5} n={9} r={1.5} />
      <Marigold x1={114} y1={156} x2={186} y2={156} sag={8} r={2.4} />
      <Visitors seed={37} n={11} spread={135} />
    </g>
  )
}

function Lakeside(ids: Ids) {
  // an intimate pavilion: white cloth with red borders, hanging lanterns, a small dome
  return (
    <g>
      <Ground ids={ids} w={95} />
      <rect x={84} y={124} width={132} height={112} fill="#2a1814" />
      <Sanctum ids={ids} x={100} y={136} w={100} h={100} arch={false} />
      {/* draped cloth panels */}
      {[0, 1].map((k) => (
        <g key={k}>
          <path d={k ? 'M216 120 Q206 170 196 236 L224 236 Z' : 'M84 120 Q94 170 104 236 L76 236 Z'} fill="#fbf3e4" />
          <path d={k ? 'M216 120 Q206 170 196 236 L200 236 Q209 172 218 122 Z' : 'M84 120 Q94 170 104 236 L100 236 Q91 172 82 122 Z'} fill="#b9262c" />
        </g>
      ))}
      <path d="M78 120 Q150 150 222 120" fill="#fbf3e4" />
      <path d="M78 120 Q150 150 222 120 L222 126 Q150 156 78 126 Z" fill="#b9262c" />
      <rect x={72} y={110} width={156} height={12} fill="#fbf3e4" />
      <rect x={72} y={110} width={156} height={12} fill={`url(#${ids.litR})`} />
      <path d="M90 110 Q150 46 210 110 Z" fill="#f6eedf" />
      <path d="M90 110 Q150 46 210 110 Z" fill={`url(#${ids.litR})`} />
      <path d="M90 110 Q150 46 210 110" fill="none" stroke="#b9262c" strokeWidth="2.4" />
      <path d="M150 62 v-12" stroke="#e7b958" strokeWidth="2" />
      <circle cx={150} cy={48} r={3} fill="#e7b958" />
      {/* lanterns */}
      {[70, 112, 188, 230].map((x, i) => (
        <g key={i}>
          <path d={`M${x} ${i % 3 ? 122 : 116} v14`} stroke="#5a3a2a" strokeWidth="0.8" />
          <ellipse cx={x} cy={(i % 3 ? 122 : 116) + 20} rx={6.5} ry={8} fill="#ffcf72" />
          <ellipse cx={x} cy={(i % 3 ? 122 : 116) + 20} rx={14} ry={14} fill={`url(#${ids.bulb})`} opacity="0.7" />
        </g>
      ))}
      <Visitors seed={41} n={4} spread={80} />
    </g>
  )
}

function Modern(ids: Ids) {
  // a theme pandal: faceted triangular arch of lit panels, an art installation feel
  const r = rng(77)
  const facets: ReactNode[] = []
  const rows = 6
  for (let row = 0; row < rows; row++) {
    const y0 = 40 + row * 30
    const half = 30 + row * 20
    for (let i = 0; i < 2 + row; i++) {
      const t = (i + 0.5) / (2 + row)
      const x = CX - half + t * half * 2
      const up = (i + row) % 2 === 0
      const c = ['#e9a23b', '#d4572e', '#f2c45a', '#b8342e', '#f6dc8e'][Math.floor(r() * 5)]
      facets.push(
        <path
          key={`${row}-${i}`}
          d={up ? `M${x - 14} ${y0 + 30} L${x} ${y0} L${x + 14} ${y0 + 30} Z` : `M${x - 14} ${y0} L${x + 14} ${y0} L${x} ${y0 + 30} Z`}
          fill={c}
          opacity={0.88}
          stroke="#3a1712"
          strokeWidth="1"
        />,
      )
    }
  }
  return (
    <g>
      <Ground ids={ids} w={120} />
      <path d="M30 236 L150 28 L270 236 Z" fill="#2c1412" />
      <g>{facets}</g>
      <path d="M30 236 L150 28 L270 236 Z" fill={`url(#${ids.litR})`} />
      <path d="M100 236 L150 140 L200 236 Z" fill="#200c0a" />
      <Sanctum ids={ids} x={116} y={150} w={68} h={86} />
      <path d="M30 236 L150 28 L270 236" fill="none" stroke="#ffd98a" strokeWidth="2" opacity="0.8" />
      <path d="M150 28 v-12" stroke="#ffd98a" strokeWidth="1.6" />
      <circle cx={150} cy={14} r={8} fill={`url(#${ids.bulb})`} />
      <Visitors seed={53} n={8} spread={125} />
    </g>
  )
}

function GrandGate(ids: Ids) {
  // a large community pujo on an event ground: wide lit gate frame with a scalloped arch of lights
  const bulbs: ReactNode[] = []
  for (let i = 0; i <= 26; i++) {
    const t = i / 26
    const a = Math.PI * (1 - t)
    bulbs.push(<circle key={i} cx={150 + Math.cos(a) * 112} cy={150 - Math.sin(a) * 100} r={5} fill={`url(#${ids.bulb})`} />)
  }
  return (
    <g>
      <Ground ids={ids} w={140} />
      {/* the main hall glimpsed through the gate */}
      <rect x={60} y={120} width={180} height={116} fill="#e4d3b6" />
      <rect x={60} y={120} width={180} height={116} fill={`url(#${ids.litR})`} />
      <Sanctum ids={ids} x={112} y={136} w={76} h={100} />
      {[78, 204].map((x) => (
        <rect key={x} x={x} y={150} width={18} height={60} fill={`url(#${ids.glow})`} opacity="0.7" />
      ))}
      {/* gate frame */}
      <path d="M28 236 V150 A122 110 0 0 1 272 150 V236 H254 V150 A104 92 0 0 0 46 150 V236 Z" fill="#8f1f2c" />
      <path d="M28 236 V150 A122 110 0 0 1 272 150 V236 H254 V150 A104 92 0 0 0 46 150 V236 Z" fill={`url(#${ids.litR})`} />
      <path d="M28 150 A122 110 0 0 1 272 150" fill="none" stroke="#e7b958" strokeWidth="2.6" />
      <path d="M46 150 A104 92 0 0 1 254 150" fill="none" stroke="#e7b958" strokeWidth="1.4" />
      {bulbs}
      {[37, 263].map((x) => (
        <g key={x}>
          <rect x={x - 12} y={226} width={24} height={10} fill="#6a1520" />
          <path d={`M${x - 9} 150 v76 M${x + 9} 150 v76`} stroke="#e7b958" strokeWidth="1" opacity="0.7" />
        </g>
      ))}
      <Marigold x1={46} y1={156} x2={254} y2={156} sag={14} r={2.6} />
      <Visitors seed={67} n={12} spread={135} />
    </g>
  )
}

function Terracotta(ids: Ids) {
  // Bishnupur terracotta temple theme: curved eaves, a ratna pinnacle, relief tiles
  const tiles: ReactNode[] = []
  for (let row = 0; row < 5; row++) {
    for (let c = 0; c < 9; c++) {
      if (c >= 3 && c <= 5 && row >= 1) continue
      const x = 66 + c * 19
      const y = 140 + row * 19
      tiles.push(<rect key={`${row}-${c}`} x={x} y={y} width={16} height={16} rx={2} fill="#b8643a" />)
      tiles.push(<circle key={`c${row}-${c}`} cx={x + 8} cy={y + 8} r={4.5} fill="none" stroke="#e9a46a" strokeWidth="1.1" opacity="0.8" />)
    }
  }
  return (
    <g>
      <Ground ids={ids} w={110} />
      <rect x={58} y={232} width={184} height={6} fill="#8a4426" />
      <rect x={62} y={132} width={176} height={102} fill="#a1532f" />
      {tiles}
      <rect x={62} y={132} width={176} height={102} fill={`url(#${ids.litR})`} />
      <Sanctum ids={ids} x={122} y={158} w={56} h={76} />
      {/* curved eave */}
      <path d="M46 136 Q150 96 254 136 L250 128 Q150 86 50 128 Z" fill="#8f4024" />
      <path d="M50 128 Q150 86 250 128 Q150 112 50 128 Z" fill="#c06a3a" />
      {/* upper tier */}
      <rect x={104} y={84} width={92} height={36} fill="#a75a33" />
      <rect x={104} y={84} width={92} height={36} fill={`url(#${ids.litR})`} />
      <path d="M94 88 Q150 62 206 88 L202 82 Q150 54 98 82 Z" fill="#8f4024" />
      {/* ratna pinnacle */}
      <path d="M126 70 Q150 18 174 70 Z" fill="#b8643a" />
      <path d="M126 70 Q150 18 174 70" fill="none" stroke="#e9a46a" strokeWidth="1.4" />
      <path d="M150 30 v-12" stroke="#e7b958" strokeWidth="2" />
      <circle cx={150} cy={16} r={3} fill="#e7b958" />
      <Marigold x1={62} y1={140} x2={238} y2={140} sag={6} r={2.3} />
      <Bulbs ids={ids} x1={50} y1={130} x2={250} y2={130} sag={-10} n={16} r={1.4} />
      <Visitors seed={71} n={6} spread={110} />
    </g>
  )
}

function Neighbourhood(ids: Ids) {
  // the classic neighbourhood entrance: cloth pillars with laal paar, curved chala roof, marigolds
  return (
    <g>
      <Ground ids={ids} w={100} />
      <rect x={80} y={120} width={140} height={116} fill="#2a1814" />
      <Sanctum ids={ids} x={96} y={136} w={108} h={100} arch={false} />
      {[70, 212].map((x) => (
        <g key={x}>
          <rect x={x} y={112} width={18} height={124} fill="#fbf3e6" />
          <rect x={x} y={112} width={3.5} height={124} fill="#b9262c" />
          <rect x={x + 14.5} y={112} width={3.5} height={124} fill="#b9262c" />
          <rect x={x} y={112} width={18} height={124} fill={`url(#${ids.litR})`} />
        </g>
      ))}
      <rect x={62} y={104} width={176} height={20} fill="#651b28" />
      <rect x={62} y={121} width={176} height={3} fill="#e7b958" />
      {/* alpana dots on the lintel instead of lettering */}
      {Array.from({ length: 13 }).map((_, i) => (
        <circle key={i} cx={74 + i * 12.6} cy={114} r={2.2} fill="#fff6e8" opacity="0.85" />
      ))}
      <path d="M56 104 Q150 30 244 104 Z" fill="#8a2230" />
      <path d="M56 104 Q150 30 244 104 Z" fill={`url(#${ids.litR})`} />
      <path d="M56 104 Q150 30 244 104" fill="none" stroke="#e7b958" strokeWidth="2.4" />
      <path d="M74 104 Q150 52 226 104" fill="none" stroke="#fbf3e6" strokeWidth="1.2" opacity="0.7" />
      <path d="M150 66 l-5 -4 l5 -16 l5 16 Z" fill="#e7b958" />
      <Marigold x1={88} y1={126} x2={212} y2={126} sag={8} r={2.6} />
      {[112, 150, 188].map((x) => (
        <Marigold key={x} x1={x} y1={126} x2={x} y2={156} sag={0} r={2.2} />
      ))}
      <Visitors seed={83} n={7} spread={110} />
    </g>
  )
}

function Shikhara(ids: Ids) {
  // temple-spire theme: a tall curvilinear rekha deul with an amalaka crown
  return (
    <g>
      <Ground ids={ids} w={110} />
      <rect x={56} y={170} width={188} height={66} fill="#e6cfa6" />
      <rect x={56} y={170} width={188} height={66} fill={`url(#${ids.litR})`} />
      {[70, 96, 190, 216].map((x) => (
        <path key={x} d={`M${x} 236 v-34 a8 8 0 0 1 16 0 v34 Z`} fill={`url(#${ids.glow})`} opacity="0.8" />
      ))}
      <rect x={52} y={164} width={196} height={8} fill="#b98d4c" />
      {/* the spire */}
      <path d="M100 166 C100 110 118 62 150 36 C182 62 200 110 200 166 Z" fill="#dcbf8c" />
      {Array.from({ length: 9 }).map((_, i) => {
        const y = 160 - i * 13
        const half = 50 - i * i * 0.55 - i * 1.5
        return <path key={i} d={`M${150 - half} ${y} h${half * 2}`} stroke="#a77d42" strokeWidth="1.6" />
      })}
      <path d="M150 36 C130 62 122 110 124 166" stroke="#a77d42" strokeWidth="1.2" fill="none" opacity="0.7" />
      <path d="M150 36 C170 62 178 110 176 166" stroke="#a77d42" strokeWidth="1.2" fill="none" opacity="0.7" />
      <path d="M100 166 C100 110 118 62 150 36 C182 62 200 110 200 166 Z" fill={`url(#${ids.litR})`} />
      <ellipse cx={150} cy={34} rx={18} ry={6} fill="#c9a062" />
      <ellipse cx={150} cy={31} rx={14} ry={4} fill="#e2c084" />
      <path d="M150 28 q-6 -6 0 -14 q6 8 0 14 Z" fill="#e7b958" />
      <Sanctum ids={ids} x={124} y={172} w={52} h={64} />
      <Bulbs ids={ids} x1={100} y1={166} x2={150} y2={40} sag={0} n={10} r={1.4} />
      <Bulbs ids={ids} x1={200} y1={166} x2={150} y2={40} sag={0} n={10} r={1.4} />
      <Marigold x1={56} y1={176} x2={244} y2={176} sag={6} r={2.3} />
      <Visitors seed={97} n={8} spread={120} />
    </g>
  )
}

function Sholapith(ids: Ids) {
  // sholapith and jute theme: a white lattice dome with lotus petals, glowing softly at blue hour
  const petals: ReactNode[] = []
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * (i / 10)
    const x = 150 - Math.cos(a) * 96
    const y = 130 - Math.sin(a) * 26
    petals.push(<path key={i} d={`M${x} ${y} q-9 -16 0 -30 q9 14 0 30 Z`} fill="#fbf7ee" stroke="#d9c9a8" strokeWidth="0.8" />)
  }
  const lattice: ReactNode[] = []
  for (let i = -6; i <= 6; i++) {
    lattice.push(<path key={`a${i}`} d={`M${150 + i * 14} 132 Q${150 + i * 10} 80 150 50`} stroke="#d6c39d" strokeWidth="1" fill="none" />)
  }
  return (
    <g>
      <Ground ids={ids} w={105}/>
      <rect x={66} y={130} width={168} height={106} fill="#efe6d4" />
      <rect x={66} y={130} width={168} height={106} fill={`url(#${ids.litR})`} />
      {/* jute weave panels */}
      {[74, 196].map((x) => (
        <g key={x}>
          <rect x={x} y={142} width={30} height={86} fill="#b89462" />
          {Array.from({ length: 8 }).map((_, k) => (
            <path key={k} d={`M${x} ${146 + k * 10.6} h30`} stroke="#8f6e40" strokeWidth="1.2" opacity="0.7" />
          ))}
        </g>
      ))}
      <Sanctum ids={ids} x={112} y={142} w={76} h={94} />
      {/* dome */}
      <path d="M54 132 Q54 50 150 44 Q246 50 246 132 Z" fill="#fbf6ec" />
      <g>{lattice}</g>
      <path d="M54 132 Q54 50 150 44 Q246 50 246 132 Z" fill={`url(#${ids.litR})`} />
      <path d="M54 132 Q54 50 150 44 Q246 50 246 132" fill="none" stroke="#c9b48a" strokeWidth="1.6" />
      {petals}
      <path d="M150 44 v-14" stroke="#e7b958" strokeWidth="2" />
      <circle cx={150} cy={28} r={4} fill="#fbf7ee" stroke="#e7b958" strokeWidth="1" />
      <Bulbs ids={ids} x1={54} y1={134} x2={246} y2={134} sag={4} n={16} r={1.5} />
      <Visitors seed={103} n={6} spread={105} />
    </g>
  )
}

const DRAW: Record<PandalVariant, (ids: Ids) => ReactNode> = {
  shamiana: Shamiana,
  chala: Chala,
  palatial: Palatial,
  lakeside: Lakeside,
  modern: Modern,
  'grand-gate': GrandGate,
  terracotta: Terracotta,
  neighbourhood: Neighbourhood,
  shikhara: Shikhara,
  sholapith: Sholapith,
}

/** a pandal in its own 300 x 260 viewBox (ground at y 236). Size the <svg> from outside. */
export function PandalArt({ variant, className }: { variant: PandalVariant; className?: string }) {
  const u = useId().replace(/:/g, '')
  const ids: Ids = { glow: `pg${u}`, pool: `pp${u}`, bulb: `pb${u}`, inner: `pi${u}`, litR: `pl${u}`, soft: `ps${u}` }
  return (
    <svg viewBox="0 0 300 260" className={className} aria-hidden="true" overflow="visible">
      <Defs ids={ids} />
      {DRAW[variant](ids)}
    </svg>
  )
}
