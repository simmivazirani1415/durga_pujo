import { AREAS, STOPS } from '../data/areas'
import { go } from '../engine/director'

/** Screen-reader route: every stop as a plain button, plus a live region announcing arrivals. */
export function A11yNav() {
  return (
    <>
      <nav aria-label="All stops (list)" className="sr-only">
        <ol>
          {STOPS.map((id, i) => {
            const a = AREAS.find((x) => x.slug === id)
            return (
              <li key={id}>
                <button type="button" onClick={() => void go(i)}>
                  {i === 0 ? 'Start' : i === STOPS.length - 1 ? 'End of the journey' : `${a?.heading}: ${a?.signature}`}
                </button>
              </li>
            )
          })}
        </ol>
      </nav>
      <p id="journey-live" className="sr-only" aria-live="polite" />
    </>
  )
}
