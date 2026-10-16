/**
 * Fine gold line ornaments for the cream festival cards: corner rosettes, lotus outlines, the small lotus
 * mark used in dividers. Pure line art, no shadows or blur, so the cards stay crisp over any scene.
 */

/** a quarter rosette that sits in a card's corner; flip it with `mirror` */
export function CornerRosette({ className = '', mirror = false }: { className?: string; mirror?: boolean }) {
  const petals = Array.from({ length: 9 }, (_, i) => (i / 8) * 90)
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true" style={mirror ? { transform: 'scaleX(-1)' } : undefined}>
      <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
        {[26, 44, 70, 96].map((r) => (
          <path key={r} d={`M${r} 0 A${r} ${r} 0 0 1 0 ${r}`} opacity={r > 60 ? 0.55 : 0.9} />
        ))}
        {petals.map((a) => {
          const t = (a * Math.PI) / 180
          const x = (r: number) => Math.cos(t) * r
          const y = (r: number) => Math.sin(t) * r
          const n = { x: -Math.sin(t), y: Math.cos(t) }
          const p = (r: number, w: number) => `${x(r) + n.x * w} ${y(r) + n.y * w}`
          return (
            <g key={a}>
              <path d={`M${p(26, 0)} Q${p(35, 7)} ${p(44, 0)} Q${p(35, -7)} ${p(26, 0)} Z`} />
              <path d={`M${p(44, 0)} Q${p(58, 10)} ${p(70, 0)} Q${p(58, -10)} ${p(44, 0)} Z`} opacity="0.8" />
              <circle cx={x(82)} cy={y(82)} r="2.2" fill="currentColor" stroke="none" opacity="0.7" />
            </g>
          )
        })}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const t = ((i + 0.5) / 7) * (Math.PI / 2)
          return <path key={i} d={`M${Math.cos(t) * 96} ${Math.sin(t) * 96} q${Math.cos(t) * 8} ${Math.sin(t) * 8} ${Math.cos(t) * 14} ${Math.sin(t) * 2}`} opacity="0.5" />
        })}
      </g>
    </svg>
  )
}

/** a large open lotus in outline, rising from the card's lower corners */
export function LotusOutline({ className = '', mirror = false }: { className?: string; mirror?: boolean }) {
  return (
    <svg viewBox="0 0 160 140" className={className} aria-hidden="true" style={mirror ? { transform: 'scaleX(-1)' } : undefined}>
      <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
        <path d="M80 20 Q58 62 80 120 Q102 62 80 20 Z" />
        <path d="M80 120 Q40 98 34 46 Q66 66 80 120 Z" />
        <path d="M80 120 Q120 98 126 46 Q94 66 80 120 Z" />
        <path d="M80 120 Q22 118 4 78 Q50 82 80 120 Z" opacity="0.8" />
        <path d="M80 120 Q138 118 156 78 Q110 82 80 120 Z" opacity="0.8" />
        <path d="M80 34 V108 M48 62 Q64 90 78 116 M112 62 Q96 90 82 116" opacity="0.45" />
        <path d="M20 128 Q80 140 140 128" opacity="0.6" />
      </g>
    </svg>
  )
}

/** the small filled lotus that sits between two rules */
export function LotusMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 20" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 1 Q8.5 8 12 17 Q15.5 8 12 1 Z" />
      <path d="M12 17 Q5 15 3.5 7 Q9 9.5 12 17 Z" opacity="0.85" />
      <path d="M12 17 Q19 15 20.5 7 Q15 9.5 12 17 Z" opacity="0.85" />
      <path d="M12 17 Q3 17.5 0.5 12.5 Q7 13 12 17 Z" opacity="0.7" />
      <path d="M12 17 Q21 17.5 23.5 12.5 Q17 13 12 17 Z" opacity="0.7" />
    </svg>
  )
}

/** a four-point star sparkle for the ends of a rule */
export function Sparkle({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={className} aria-hidden="true" fill="currentColor">
      <path d="M6 0 L7.2 4.8 L12 6 L7.2 7.2 L6 12 L4.8 7.2 L0 6 L4.8 4.8 Z" />
    </svg>
  )
}
