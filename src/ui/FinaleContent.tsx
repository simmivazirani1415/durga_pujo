import { go } from '../engine/director'
import { useJourney } from '../store/journey'

export function FinaleContent() {
  const setPlannerOpen = useJourney((s) => s.setPlannerOpen)
  const setSearchOpen = useJourney((s) => s.setSearchOpen)
  const openPanel = useJourney((s) => s.openPanel)
  const gutter = { paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))', paddingRight: 'max(16px, env(safe-area-inset-right, 0px))' }
  return (
    <section data-ui="finale" aria-label="End of the journey" className="pointer-events-none fixed inset-0 z-20" style={{ visibility: 'hidden', opacity: 0 }}>
      <div className="scene-scrim pointer-events-auto mx-auto mt-[max(110px,16vh)] flex max-w-[680px] flex-col items-center gap-4 text-center" style={gutter}>
        <h2 className="font-display text-[clamp(44px,6.4vw,86px)] font-semibold leading-[0.95] tracking-[-0.015em] text-burgundy">Your Pujo. Your Bengaluru.</h2>
        <p className="max-w-[40ch] text-[clamp(15px,1.5vw,18px)] font-medium text-ink-soft">
          Find your pandals, follow your plans, and make the most of Pujo season.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPlannerOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3.5 text-[15px] font-bold text-burgundy-deep shadow-[0_12px_28px_-14px_rgba(74,18,29,0.8)] hover:bg-gold-soft"
          >
            Create my itinerary <span aria-hidden="true">→</span>
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-burgundy/40 bg-ivory/70 px-6 py-3.5 text-[15px] font-bold text-burgundy hover:bg-ivory"
          >
            Explore another area
          </button>
          <button
            type="button"
            onClick={() => openPanel({ scope: 'all', tab: 'pandal' })}
            className="inline-flex items-center gap-2 rounded-full border border-burgundy/40 bg-ivory/70 px-6 py-3.5 text-[15px] font-bold text-burgundy hover:bg-ivory"
          >
            All pandals &amp; events
          </button>
        </div>
      </div>
      <footer
        className="pointer-events-auto absolute inset-x-0 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[12px] font-medium text-ivory/90 [text-shadow:0_1px_6px_rgba(20,10,8,0.7)]"
        style={{ ...gutter, bottom: 'max(14px, env(safe-area-inset-bottom, 0px))' }}
      >
        <span className="font-display text-[15px] font-semibold">PujoBLR</span>
        <span>Listings checked 14 Oct 2026 · each listing shows its source and status</span>
        <button type="button" onClick={() => void go(0)} className="underline decoration-ivory/50 underline-offset-2">
          Back to the start
        </button>
        <span>© 2026 PujoBLR</span>
      </footer>
    </section>
  )
}
