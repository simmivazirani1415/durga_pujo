import { useEffect, useRef } from 'react'
import { AREAS, STOPS } from '../data/areas'
import { go } from '../engine/director'
import { useView } from '../engine/viewport'
import { useJourney } from '../store/journey'
import { pad2 } from './hooks'
import { useGame } from '../game/store'

const LABELS = ['Start', ...AREAS.map((a) => a.shortName), 'The end']

/** slim route rail on the right edge (desktop) */
export function RouteRail() {
  const index = useJourney((s) => s.index)
  const panelOpen = useJourney((s) => s.panel.open)
  const view = useView()
  const riding = useGame((s) => s.mode === 'drive')
  if (view.compact || riding) return null
  return (
    <nav
      aria-label="Journey stops"
      className="fixed top-1/2 z-30 -translate-y-1/2 transition-opacity duration-300"
      style={{ right: 'max(18px, env(safe-area-inset-right, 0px))', opacity: panelOpen ? 0 : 1, pointerEvents: panelOpen ? 'none' : 'auto' }}
    >
      <ol className="relative flex flex-col items-end gap-[11px]">
        <span aria-hidden="true" className="absolute right-[5px] top-1 bottom-1 w-px bg-ivory/60" />
        {STOPS.map((id, i) => {
          const on = i === index
          const end = i === 0 || i === STOPS.length - 1
          return (
            <li key={id} className="group relative flex items-center">
              <span
                className={`pointer-events-none absolute right-6 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold transition-opacity ${
                  on ? 'bg-ivory/90 text-burgundy opacity-100' : 'bg-ivory/90 text-burgundy opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                }`}
              >
                {i > 0 && i < STOPS.length - 1 ? <span className="tabular mr-1.5 text-burgundy/50">{pad2(i)}</span> : null}
                {LABELS[i]}
              </span>
              <button
                type="button"
                onClick={() => void go(i)}
                aria-label={`Go to ${LABELS[i]}`}
                aria-current={on ? 'step' : undefined}
                className="relative grid h-[11px] w-[11px] place-items-center"
              >
                <span
                  className={`block rounded-full transition-all ${
                    on ? 'h-[11px] w-[11px] bg-gold ring-2 ring-ivory' : end ? 'h-[7px] w-[7px] rotate-45 rounded-[1px] bg-ivory' : 'h-[7px] w-[7px] bg-ivory/90'
                  }`}
                />
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** compact list of every stop (opened from the arrival eyebrow on phones) */
export function RouteMenu({ onClose }: { onClose: () => void }) {
  const index = useJourney((s) => s.index)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('[aria-current="step"]')?.focus()
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center bg-charcoal/30 sm:items-center" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="All stops"
        onClick={(e) => e.stopPropagation()}
        className="thin-scroll max-h-[80vh] w-full max-w-[420px] overflow-auto rounded-t-3xl bg-ivory p-5 shadow-panel sm:rounded-3xl"
        style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-2xl font-semibold text-burgundy">All stops</h3>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-parchment text-burgundy" aria-label="Close">
            ✕
          </button>
        </div>
        <ol className="flex flex-col">
          {STOPS.map((id, i) => (
            <li key={id}>
              <button
                type="button"
                aria-current={i === index ? 'step' : undefined}
                onClick={() => {
                  onClose()
                  void go(i)
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-semibold ${
                  i === index ? 'bg-gold/30 text-burgundy' : 'text-charcoal hover:bg-parchment'
                }`}
              >
                <span className="tabular w-7 text-[12px] text-burgundy/50">{i > 0 && i < STOPS.length - 1 ? pad2(i) : ''}</span>
                {LABELS[i]}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
