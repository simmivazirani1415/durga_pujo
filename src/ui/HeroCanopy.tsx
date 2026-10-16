import { memo, useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { useView } from '../engine/viewport'
import { rng } from '../scenes/world'

/**
 * The festive canopy over the hero, after Simran's reference: a red and gold drape across the top, printed
 * cloth torans (Maa's eyes, Om, her footprints, trishul, lotus, sun) with gold fringe and tassels, and
 * marigold strings ending in brass bells. Everything hangs from its top edge and moves in the wind: a gust
 * rolls across the canopy from left to right every few seconds, pushing the cloth over and letting it spring
 * back, while each piece keeps fluttering on its own. Marigold petals ride the same air across the sky.
 * The centre stays open for the heading; the canopy lifts out of frame when the ride begins (director.ts).
 */

type Cloth = 'ivory' | 'red' | 'gold'
type Motif = 'eyes' | 'om' | 'feet' | 'trishul' | 'lotus' | 'sun'

interface Toran {
  x: number
  w: number
  len: number
  cloth: Cloth
  motifs: Motif[]
}
interface Strand {
  x: number
  len: number
  end: 'bell' | 'tassel'
}

const RED = '#a8141f'
const RED_DEEP = '#7d0e17'
const GOLD = '#d9a441'
const GOLD_LIGHT = '#f3cf72'
const IVORY = '#f8eedb'

const PAL: Record<Cloth, { base: string; border: string; line: string; ink: string }> = {
  ivory: { base: IVORY, border: RED, line: GOLD, ink: RED },
  red: { base: RED, border: RED_DEEP, line: GOLD_LIGHT, ink: '#fbe7c0' },
  gold: { base: '#f1bf4f', border: RED, line: '#fff1cc', ink: RED },
}

/* ------------------------------------------------------------------ motifs (drawn in a 100-wide box) */

function Eyes({ c }: { c: string }) {
  return (
    <g fill="none" stroke={c} strokeWidth="3.4" strokeLinecap="round">
      {[-1, 1].map((d) => (
        <g key={d}>
          <path d={`M${50 + d * 6} 52 Q${50 + d * 20} 38 ${50 + d * 42} 50 Q${50 + d * 24} 62 ${50 + d * 6} 52 Z`} fill={c} fillOpacity="0.1" />
          <circle cx={50 + d * 23} cy={50.5} r="5.6" fill={c} stroke="none" />
          <path d={`M${50 + d * 4} 36 Q${50 + d * 24} 22 ${50 + d * 46} 38`} />
          <path d={`M${50 + d * 42} 50 l${d * 6} 3`} />
        </g>
      ))}
      <path d="M50 14 Q43 24 50 33 Q57 24 50 14 Z" fill={c} stroke="none" />
      <path d="M44 40 Q50 46 56 40" strokeWidth="2.2" />
    </g>
  )
}

function Om({ c }: { c: string }) {
  return (
    <text x="50" y="66" textAnchor="middle" fontSize="58" fill={c} style={{ fontFamily: '"Noto Serif Devanagari","Kohinoor Devanagari","Nirmala UI","Mangal",serif' }}>
      ॐ
    </text>
  )
}

function Feet({ c }: { c: string }) {
  const foot = (dx: number, flip: number) => (
    <g transform={`translate(${50 + dx} 48) scale(${flip} 1)`}>
      <path d="M0 -14 C9 -14 11 -2 9 8 C7 18 4 24 -1 24 C-7 24 -8 16 -7 8 C-6 0 -9 -14 0 -14 Z" />
      {[
        [-6, -21, 3.4],
        [-0.5, -23, 3],
        [4.5, -22, 2.6],
        [8.5, -19.5, 2.2],
        [11, -15.5, 1.9],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} />
      ))}
    </g>
  )
  return (
    <g>
      <circle cx="50" cy="50" r="40" fill="none" stroke={c} strokeWidth="3" />
      <circle cx="50" cy="50" r="34" fill={c} fillOpacity="0.12" stroke={c} strokeWidth="1.2" strokeDasharray="2 3" />
      <g fill={c}>
        {foot(-12, -1)}
        {foot(12, 1)}
      </g>
    </g>
  )
}

function Trishul({ c }: { c: string }) {
  return (
    <g fill="none" stroke={c} strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M50 22 V92" />
      <path d="M50 6 L44 26 H56 Z" fill={c} />
      <path d="M50 54 Q24 54 26 22" />
      <path d="M50 54 Q76 54 74 22" />
      <path d="M26 12 L20 28 H32 Z" fill={c} />
      <path d="M74 12 L68 28 H80 Z" fill={c} />
      <ellipse cx="50" cy="62" rx="9" ry="4.5" fill={c} />
      <path d="M38 70 Q50 64 62 70" strokeWidth="2.6" />
    </g>
  )
}

function Lotus({ c }: { c: string }) {
  return (
    <g fill={c}>
      <path d="M50 18 Q38 44 50 72 Q62 44 50 18 Z" />
      <path d="M50 72 Q26 64 20 36 Q40 46 50 72 Z" opacity="0.85" />
      <path d="M50 72 Q74 64 80 36 Q60 46 50 72 Z" opacity="0.85" />
      <path d="M50 72 Q16 72 6 54 Q34 54 50 72 Z" opacity="0.7" />
      <path d="M50 72 Q84 72 94 54 Q66 54 50 72 Z" opacity="0.7" />
      <rect x="18" y="76" width="64" height="3.4" rx="1.7" />
      <circle cx="50" cy="10" r="3.4" />
    </g>
  )
}

function Sun({ c }: { c: string }) {
  return (
    <g fill={c}>
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2
        const r0 = 24
        const r1 = i % 2 ? 36 : 44
        const s = 0.16
        return (
          <path
            key={i}
            d={`M${50 + Math.cos(a - s) * r0} ${50 + Math.sin(a - s) * r0} L${50 + Math.cos(a) * r1} ${50 + Math.sin(a) * r1} L${50 + Math.cos(a + s) * r0} ${50 + Math.sin(a + s) * r0} Z`}
          />
        )
      })}
      <circle cx="50" cy="50" r="20" fill="none" stroke={c} strokeWidth="3" />
      <circle cx="50" cy="50" r="10" />
    </g>
  )
}

const MOTIF: Record<Motif, (p: { c: string }) => ReactNode> = { eyes: Eyes, om: Om, feet: Feet, trishul: Trishul, lotus: Lotus, sun: Sun }

/* ------------------------------------------------------------------ pieces */

function Tassel({ x, y, s, color = RED }: { x: number; y: number; s: number; color?: string }) {
  return (
    <g>
      <path d={`M${x} ${y} v${s * 0.5}`} stroke={GOLD} strokeWidth={s * 0.12} />
      <circle cx={x} cy={y + s * 0.62} r={s * 0.2} fill={GOLD_LIGHT} stroke={GOLD} strokeWidth={s * 0.05} />
      <path d={`M${x - s * 0.22} ${y + s * 0.8} Q${x} ${y + s * 0.7} ${x + s * 0.22} ${y + s * 0.8} L${x + s * 0.34} ${y + s * 2} Q${x} ${y + s * 2.18} ${x - s * 0.34} ${y + s * 2} Z`} fill={color} />
      <path d={`M${x - s * 0.14} ${y + s * 0.9} L${x - s * 0.2} ${y + s * 1.95} M${x + s * 0.1} ${y + s * 0.9} L${x + s * 0.14} ${y + s * 1.98}`} stroke="#000" strokeOpacity="0.18" strokeWidth={s * 0.06} />
    </g>
  )
}

function Bell({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g>
      <path d={`M${x} ${y} v${s * 0.3}`} stroke="#8a6420" strokeWidth={s * 0.08} />
      <circle cx={x} cy={y + s * 0.38} r={s * 0.12} fill="none" stroke="#8a6420" strokeWidth={s * 0.06} />
      <path
        d={`M${x - s * 0.18} ${y + s * 0.6} Q${x - s * 0.2} ${y + s * 0.46} ${x} ${y + s * 0.46} Q${x + s * 0.2} ${y + s * 0.46} ${x + s * 0.18} ${y + s * 0.6} Q${x + s * 0.24} ${y + s * 1.2} ${x + s * 0.48} ${y + s * 1.42} L${x - s * 0.48} ${y + s * 1.42} Q${x - s * 0.24} ${y + s * 1.2} ${x - s * 0.18} ${y + s * 0.6} Z`}
        fill="url(#tw-brass)"
      />
      <rect x={x - s * 0.52} y={y + s * 1.38} width={s * 1.04} height={s * 0.12} rx={s * 0.06} fill="#a87a24" />
      <circle cx={x} cy={y + s * 1.6} r={s * 0.12} fill="#7a5618" />
    </g>
  )
}

function ToranSvg({ t }: { t: Toran }) {
  const { w, len, cloth } = t
  const p = PAL[cloth]
  const rod = Math.max(4, w * 0.07)
  const side = w * 0.1
  const band = w * 0.16
  const fringe = Math.max(8, w * 0.13)
  const tas = Math.max(7, w * 0.11)
  const H = len + fringe + tas * 2.4
  const n = t.motifs.length
  const slot = (len - rod - band * 2) / n
  const ms = Math.min(w - side * 2 - w * 0.12, slot * 0.78)
  const fid = `tw-fold-${cloth}`
  return (
    <svg width={w + 8} height={H} viewBox={`-4 0 ${w + 8} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      {/* cloth */}
      <rect x="0" y={rod * 0.6} width={w} height={len - rod * 0.6} fill={p.base} />
      <rect x="0" y={rod * 0.6} width={side} height={len - rod * 0.6} fill={p.border} />
      <rect x={w - side} y={rod * 0.6} width={side} height={len - rod * 0.6} fill={p.border} />
      <rect x={side + w * 0.02} y={rod} width={w * 0.018 + 0.6} height={len - rod} fill={p.line} />
      <rect x={w - side - w * 0.038 - 0.6} y={rod} width={w * 0.018 + 0.6} height={len - rod} fill={p.line} />
      {/* top and bottom bands with a scalloped edge */}
      {[rod, len - band].map((y, k) => (
        <g key={k}>
          <rect x="0" y={y} width={w} height={band} fill={p.border} />
          <path
            d={Array.from({ length: Math.max(3, Math.round(w / 14)) }, (_, i) => {
              const s = w / Math.max(3, Math.round(w / 14))
              const yy = k ? y : y + band
              const dir = k ? -1 : 1
              return `M${i * s} ${yy} Q${(i + 0.5) * s} ${yy + dir * s * 0.55} ${(i + 1) * s} ${yy}`
            }).join(' ')}
            fill={p.border}
          />
          <path d={`M0 ${y + band / 2} H${w}`} stroke={p.line} strokeWidth={Math.max(1, w * 0.014)} strokeDasharray={`${w * 0.03} ${w * 0.04}`} />
        </g>
      ))}
      {/* the prints down the cloth */}
      {t.motifs.map((m, i) => {
        const M = MOTIF[m]
        const cy = rod + band * 1.4 + slot * (i + 0.5)
        return (
          <g key={i} transform={`translate(${w / 2 - ms / 2} ${cy - ms / 2}) scale(${ms / 100})`}>
            <M c={p.ink} />
          </g>
        )
      })}
      {n > 1 &&
        t.motifs.slice(1).map((_, i) => {
          const y = rod + band * 1.4 + slot * (i + 1)
          return <path key={i} d={`M${side * 1.8} ${y} H${w - side * 1.8}`} stroke={p.line} strokeWidth={Math.max(1, w * 0.012)} />
        })}
      {/* the fold of the cloth */}
      <rect x="0" y={rod * 0.6} width={w} height={len - rod * 0.6} fill={`url(#${fid})`} />
      {/* fringe */}
      <path
        d={Array.from({ length: Math.round(w / 2.6) }, (_, i) => `M${(i + 0.5) * 2.6} ${len} v${fringe * (0.86 + ((i * 7) % 5) * 0.035)}`).join(' ')}
        stroke={GOLD}
        strokeWidth="1.3"
      />
      <rect x="0" y={len - 1.5} width={w} height="3" fill={GOLD} />
      {/* rod with knobs */}
      <rect x={-3} y="0" width={w + 6} height={rod} rx={rod / 2} fill="url(#tw-brass)" />
      <circle cx={-3} cy={rod / 2} r={rod * 0.75} fill="#b8862b" />
      <circle cx={w + 3} cy={rod / 2} r={rod * 0.75} fill="#b8862b" />
      {/* tassels */}
      <Tassel x={tas * 0.4} y={len + fringe * 0.4} s={tas} />
      <Tassel x={w - tas * 0.4} y={len + fringe * 0.4} s={tas} />
      {w > 90 && <Tassel x={w / 2} y={len + fringe * 0.6} s={tas} />}
    </svg>
  )
}

function StrandSvg({ s, unit }: { s: Strand; unit: number }) {
  const r = unit * 0.15
  const step = r * 1.55
  const n = Math.max(4, Math.floor((s.len - unit * 0.3) / step))
  const W = r * 4
  const cx = W / 2
  const items: ReactNode[] = []
  for (let i = 0; i < n; i++) {
    const y = r + i * step
    const k = i % 7
    if (k === 6) {
      items.push(<path key={'l' + i} d={`M${cx} ${y - r * 0.6} q${-r * 1.8} ${r * 0.2} ${-r * 2} ${r * 1.1} q${r * 1.2} ${r * 0.2} ${r * 2} ${-r * 1.1} M${cx} ${y - r * 0.6} q${r * 1.8} ${r * 0.2} ${r * 2} ${r * 1.1} q${-r * 1.2} ${r * 0.2} ${-r * 2} ${-r * 1.1}`} fill="#4f7a3a" />)
    }
    items.push(<circle key={i} cx={cx + Math.sin(i * 1.7) * r * 0.12} cy={y} r={r} fill={k % 3 === 1 ? 'url(#tw-mari-y)' : 'url(#tw-mari-o)'} />)
  }
  const endY = r + n * step
  return (
    <svg width={W} height={endY + unit * 0.9} viewBox={`0 0 ${W} ${endY + unit * 0.9}`} style={{ display: 'block', overflow: 'visible' }}>
      {items}
      {s.end === 'bell' ? <Bell x={cx} y={endY - r * 0.4} s={unit * 0.5} /> : <Tassel x={cx} y={endY - r * 0.4} s={unit * 0.24} />}
    </svg>
  )
}

function Defs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <linearGradient id="tw-brass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a6420" />
          <stop offset="0.35" stopColor="#f6d27a" />
          <stop offset="0.55" stopColor="#d9a441" />
          <stop offset="1" stopColor="#7a5618" />
        </linearGradient>
        <radialGradient id="tw-mari-o" cx="0.38" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffb347" />
          <stop offset="0.6" stopColor="#ef7a12" />
          <stop offset="1" stopColor="#b9480a" />
        </radialGradient>
        <radialGradient id="tw-mari-y" cx="0.38" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffe27a" />
          <stop offset="0.6" stopColor="#f5b417" />
          <stop offset="1" stopColor="#c27e06" />
        </radialGradient>
        {(['ivory', 'red', 'gold'] as Cloth[]).map((c) => (
          <linearGradient key={c} id={`tw-fold-${c}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3a1408" stopOpacity="0.26" />
            <stop offset="0.2" stopColor="#fff" stopOpacity="0.12" />
            <stop offset="0.45" stopColor="#3a1408" stopOpacity="0.1" />
            <stop offset="0.72" stopColor="#fff" stopOpacity="0.16" />
            <stop offset="1" stopColor="#3a1408" stopOpacity="0.3" />
          </linearGradient>
        ))}
      </defs>
    </svg>
  )
}

/* ------------------------------------------------------------------ the drape across the top */

function Drape({ W, H, compact }: { W: number; H: number; compact: boolean }) {
  const n = compact ? 3 : 5
  const sw = W / n
  const dep = H * (compact ? 0.05 : 0.075)
  const swags: ReactNode[] = []
  for (let i = 0; i < n; i++) {
    const x0 = i * sw - sw * 0.04
    const x1 = (i + 1) * sw + sw * 0.04
    const xm = (x0 + x1) / 2
    // the gold under-swag peeks out below the red
    swags.push(
      <g key={i}>
        <path d={`M${x0} 0 H${x1} V${dep * 0.2} Q${xm} ${dep * 2.25} ${x0} ${dep * 0.2} Z`} fill="#e3a93c" />
        <path d={`M${x0} 0 H${x1} V${dep * 0.12} Q${xm} ${dep * 1.85} ${x0} ${dep * 0.12} Z`} fill={RED} />
        <path d={`M${x0} ${dep * 0.12} Q${xm} ${dep * 1.85} ${x1} ${dep * 0.12}`} fill="none" stroke={GOLD_LIGHT} strokeWidth={compact ? 1.6 : 2.4} />
        {[0.3, 0.55, 0.8].map((k) => (
          <path key={k} d={`M${x0 + sw * 0.08} ${dep * 0.15 * k} Q${xm} ${dep * 1.8 * k} ${x1 - sw * 0.08} ${dep * 0.15 * k}`} fill="none" stroke="#5c0a12" strokeOpacity="0.28" strokeWidth={compact ? 1.4 : 2} />
        ))}
        <path
          d={`M${x0} ${dep * 0.2} Q${xm} ${dep * 2.25} ${x1} ${dep * 0.2}`}
          fill="none"
          stroke={GOLD}
          strokeWidth={compact ? 5 : 8}
          strokeDasharray="1.2 2.4"
        />
      </g>,
    )
  }
  return (
    <svg width={W} height={dep * 2.6} viewBox={`0 0 ${W} ${dep * 2.6}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <rect x="0" y="0" width={W} height={dep * 0.24} fill={RED_DEEP} />
      {swags}
      {Array.from({ length: n + 1 }, (_, i) => (
        <g key={i}>
          <circle cx={i * sw} cy={dep * 0.22} r={compact ? 6 : 9} fill="url(#tw-brass)" />
          <Tassel x={i * sw} y={dep * 0.3} s={compact ? 9 : 14} />
        </g>
      ))}
    </svg>
  )
}


/* ------------------------------------------------------------------ the cloud bank behind the heading */

/**
 * A bright golden-hour cumulus bank painted once on a canvas: overlapping puffs, lit warm white from above
 * and shaded peach underneath, so the heading sits on a light, calm backdrop instead of the busy city.
 */
function CloudBank({ W, H, compact }: { W: number; H: number; compact: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const cw = W
  const ch = Math.round(H * (compact ? 0.62 : 0.72))
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = Math.round(cw * dpr)
    c.height = Math.round(ch * dpr)
    const g = c.getContext('2d')
    if (!g) return
    g.scale(dpr, dpr)
    const r = rng(77)
    const cx = cw / 2
    const span = compact ? cw * 0.62 : Math.min(cw * 0.36, 620)
    const base = ch * (compact ? 0.68 : 0.7)
    const top = ch * (compact ? 0.24 : 0.18)
    const puffs: { x: number; y: number; r: number }[] = []
    // the body: a broad low base, then billows that rise towards the middle
    for (let i = 0; i < 70; i++) {
      const t = r() * 2 - 1
      const x = cx + t * span * 1.15
      const rise = Math.pow(1 - Math.abs(t), 0.8)
      const rad = (compact ? 34 : 52) + r() * (compact ? 40 : 70) * (0.5 + rise)
      const y = base - rad * 0.5 - rise * (base - top) * (0.45 + r() * 0.6)
      puffs.push({ x, y, r: rad })
    }
    // wisps trailing out to both sides
    for (let i = 0; i < 26; i++) {
      const s = i % 2 ? 1 : -1
      const x = cx + s * (span * (0.9 + r() * 0.9))
      puffs.push({ x, y: base - 20 - r() * (compact ? 50 : 90), r: (compact ? 20 : 30) + r() * 34 })
    }
    puffs.sort((a, b) => a.y - b.y)
    // shadowed underside first, then the lit tops on top of it
    for (const p of puffs) {
      const grd = g.createRadialGradient(p.x, p.y + p.r * 0.35, p.r * 0.1, p.x, p.y + p.r * 0.2, p.r * 1.05)
      grd.addColorStop(0, 'rgba(240,196,160,0.9)')
      grd.addColorStop(0.7, 'rgba(244,206,172,0.55)')
      grd.addColorStop(1, 'rgba(246,212,180,0)')
      g.fillStyle = grd
      g.beginPath()
      g.arc(p.x, p.y + p.r * 0.2, p.r * 1.05, 0, Math.PI * 2)
      g.fill()
    }
    for (const p of puffs) {
      const grd = g.createRadialGradient(p.x - p.r * 0.2, p.y - p.r * 0.35, p.r * 0.05, p.x, p.y, p.r)
      grd.addColorStop(0, 'rgba(255,253,247,1)')
      grd.addColorStop(0.55, 'rgba(255,244,228,0.92)')
      grd.addColorStop(0.85, 'rgba(252,228,200,0.5)')
      grd.addColorStop(1, 'rgba(250,222,192,0)')
      g.fillStyle = grd
      g.beginPath()
      g.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      g.fill()
    }
    // a soft warm haze holds the bank together behind the words
    // (an ellipse that fades out well inside the canvas, so no edge ever shows)
    const hr = Math.min(span * 1.25, cw * 0.48)
    const sy = (ch * 0.4) / hr
    g.save()
    g.translate(cx, ch * 0.5)
    g.scale(1, sy)
    const haze = g.createRadialGradient(0, 0, 0, 0, 0, hr)
    haze.addColorStop(0, 'rgba(255,246,232,0.75)')
    haze.addColorStop(0.6, 'rgba(255,240,222,0.35)')
    haze.addColorStop(1, 'rgba(255,236,214,0)')
    g.fillStyle = haze
    g.beginPath()
    g.arc(0, 0, hr, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }, [cw, ch, compact])
  return (
    <canvas
      ref={ref}
      className="tw-cloudbank"
      aria-hidden="true"
      style={{ position: 'absolute', left: 0, top: H * (compact ? 0.02 : 0), width: cw, height: ch }}
    />
  )
}

/* ------------------------------------------------------------------ layout */

function layout(W: number, H: number, compact: boolean) {
  const r = rng(311)
  if (compact) {
    const unit = Math.min(W * 0.11, 46)
    const torans: Toran[] = [
      { x: 0.07, w: 0.13, L: 0.2, cloth: 'red', motifs: ['lotus', 'eyes'] },
      { x: 0.25, w: 0.15, L: 0.15, cloth: 'ivory', motifs: ['om'] },
      { x: 0.5, w: 0.22, L: 0.12, cloth: 'ivory', motifs: ['eyes'] },
      { x: 0.75, w: 0.15, L: 0.15, cloth: 'ivory', motifs: ['trishul'] },
      { x: 0.93, w: 0.13, L: 0.2, cloth: 'red', motifs: ['lotus', 'feet'] },
    ].map((t) => ({ ...t, x: t.x * W, w: t.w * W, len: t.L * H }) as Toran)
    const strands: Strand[] = [
      { x: 0.0, L: 0.22, end: 'bell' },
      { x: 0.155, L: 0.17, end: 'bell' },
      { x: 0.375, L: 0.12, end: 'tassel' },
      { x: 0.625, L: 0.12, end: 'tassel' },
      { x: 0.845, L: 0.17, end: 'bell' },
      { x: 1.0, L: 0.22, end: 'bell' },
    ].map((s) => ({ x: s.x * W, len: s.L * H, end: s.end as Strand['end'] }))
    return { torans, strands, unit, r }
  }
  const unit = Math.max(30, Math.min(54, W * 0.034))
  const tw = (f: number) => Math.max(56, Math.min(W * f, H * f * 1.7))
  const torans: Toran[] = [
    { x: 0.03, w: 0.052, L: 0.68, cloth: 'red', motifs: ['lotus', 'eyes', 'lotus'] },
    { x: 0.092, w: 0.06, L: 0.56, cloth: 'ivory', motifs: ['eyes', 'eyes', 'eyes'] },
    { x: 0.168, w: 0.062, L: 0.42, cloth: 'gold', motifs: ['lotus', 'sun'] },
    { x: 0.24, w: 0.066, L: 0.31, cloth: 'ivory', motifs: ['eyes', 'om'] },
    { x: 0.312, w: 0.05, L: 0.15, cloth: 'red', motifs: ['sun'] },
    { x: 0.395, w: 0.046, L: 0.115, cloth: 'gold', motifs: ['sun'] },
    { x: 0.5, w: 0.11, L: 0.12, cloth: 'ivory', motifs: ['eyes'] },
    { x: 0.605, w: 0.046, L: 0.115, cloth: 'red', motifs: ['lotus'] },
    { x: 0.688, w: 0.05, L: 0.15, cloth: 'gold', motifs: ['sun'] },
    { x: 0.76, w: 0.066, L: 0.31, cloth: 'ivory', motifs: ['feet'] },
    { x: 0.834, w: 0.062, L: 0.42, cloth: 'ivory', motifs: ['trishul', 'lotus'] },
    { x: 0.91, w: 0.06, L: 0.54, cloth: 'red', motifs: ['lotus', 'eyes'] },
    { x: 0.97, w: 0.052, L: 0.68, cloth: 'ivory', motifs: ['eyes', 'trishul', 'eyes'] },
  ].map((t) => ({ ...t, x: t.x * W, w: tw(t.w), len: t.L * H }) as Toran)
  const strands: Strand[] = [
    { x: 0.004, L: 0.58, end: 'bell' },
    { x: 0.061, L: 0.5, end: 'tassel' },
    { x: 0.13, L: 0.46, end: 'bell' },
    { x: 0.204, L: 0.36, end: 'bell' },
    { x: 0.276, L: 0.27, end: 'tassel' },
    { x: 0.352, L: 0.16, end: 'bell' },
    { x: 0.443, L: 0.105, end: 'bell' },
    { x: 0.557, L: 0.105, end: 'bell' },
    { x: 0.648, L: 0.16, end: 'bell' },
    { x: 0.724, L: 0.27, end: 'tassel' },
    { x: 0.796, L: 0.36, end: 'bell' },
    { x: 0.872, L: 0.46, end: 'bell' },
    { x: 0.94, L: 0.5, end: 'tassel' },
    { x: 0.996, L: 0.58, end: 'bell' },
  ].map((s) => ({ x: s.x * W, len: s.L * H, end: s.end as Strand['end'] }))
  return { torans, strands, unit, r }
}

/** a hanging piece: the gust layer (shared wave across the canopy) around the flutter layer (its own rhythm) */
function Hanging({ x, w, top, amp, W, r, children }: { x: number; w: number; top: number; amp: number; W: number; r: () => number; children: ReactNode }) {
  const gust: CSSProperties & Record<string, string | number> = {
    position: 'absolute',
    left: x - w / 2,
    top,
    width: w,
    '--amp': amp.toFixed(2),
    // the gust reaches pieces further right a moment later, so it visibly rolls across the canopy
    animationDelay: `${((x / W) * 1.5 - 9 + r() * 0.15).toFixed(2)}s`,
  }
  const flutter: CSSProperties & Record<string, string | number> = {
    '--amp': amp.toFixed(2),
    animationDuration: `${(1.5 + r() * 1.1).toFixed(2)}s`,
    animationDelay: `${(-r() * 3).toFixed(2)}s`,
  }
  return (
    <div className="tw-gust" style={gust}>
      <div className="tw-flutter" style={flutter}>
        {children}
      </div>
    </div>
  )
}

const Canopy = memo(function Canopy({ W, H, compact }: { W: number; H: number; compact: boolean }) {
  const { torans, strands, unit, r } = layout(W, H, compact)
  const top = H * (compact ? 0.012 : 0.018)
  const petals = Array.from({ length: compact ? 9 : 16 }, (_, i) => {
    const pr = rng(900 + i)
    return {
      top: (0.06 + pr() * 0.55) * H,
      dy: (pr() - 0.3) * H * 0.25,
      dur: 7 + pr() * 7,
      delay: -pr() * 14,
      size: 6 + pr() * 7,
      color: pr() < 0.6 ? '#f08a1c' : pr() < 0.5 ? '#f6c12e' : '#c8202c',
    }
  })
  return (
    <>
      <Defs />
      <CloudBank W={W} H={H} compact={compact} />
      {strands.map((s, i) => {
        const sw = unit * 0.6
        return (
          <Hanging key={'s' + i} x={s.x} w={sw} top={top - 4} amp={Math.min(1.6, Math.max(0.6, (190 / s.len) * 1.3))} W={W} r={r}>
            <StrandSvg s={s} unit={unit} />
          </Hanging>
        )
      })}
      {torans.map((t, i) => (
        <Hanging key={'t' + i} x={t.x} w={t.w} top={top} amp={Math.min(1.1, Math.max(0.32, 170 / t.len))} W={W} r={r}>
          <div style={{ marginLeft: -4 }}>
            <ToranSvg t={t} />
          </div>
        </Hanging>
      ))}
      <Drape W={W} H={H} compact={compact} />
      {petals.map((p, i) => (
        <span
          key={'p' + i}
          className="tw-petal"
          style={
            {
              top: p.top,
              width: p.size,
              height: p.size * 0.62,
              background: p.color,
              '--dy': `${p.dy.toFixed(0)}px`,
              animationDuration: `${p.dur.toFixed(2)}s`,
              animationDelay: `${p.delay.toFixed(2)}s`,
            } as CSSProperties
          }
        />
      ))}
    </>
  )
})

export function HeroCanopy() {
  const view = useView()
  const { W, H, compact } = view
  return (
    <div id="hero-canopy" className="pointer-events-none absolute inset-0 overflow-hidden" style={{ visibility: 'hidden', opacity: 0 }}>
      <Canopy W={W} H={H} compact={compact} />
    </div>
  )
}
