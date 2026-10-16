/** DEV ONLY: ?pandals shows every stop's pandal side by side */
import { PANDAL_FOR, PANDAL_MOOD, PandalArt } from '../scenes/pandals'

export function Pandals() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, padding: 16, background: 'linear-gradient(#e9b98a, #6a3a4a)', minHeight: '100vh' }}>
      {Object.entries(PANDAL_FOR).map(([area, v]) => (
        <div key={area} style={{ textAlign: 'center', color: '#fff', font: '12px Manrope' }}>
          <PandalArt variant={v} className="w-full" />
          {area} · {PANDAL_MOOD[v]}
        </div>
      ))}
    </div>
  )
}
