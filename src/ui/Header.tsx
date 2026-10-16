import { go } from '../engine/director'
import { useJourney } from '../store/journey'
import { Logo } from './Logo'
import { useView } from '../engine/viewport'

export function Header() {
  const picks = useJourney((s) => s.picks.length)
  const setPlannerOpen = useJourney((s) => s.setPlannerOpen)
  const view = useView()
  return (
    <header
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between"
      style={{
        paddingTop: 'max(14px, env(safe-area-inset-top, 0px))',
        paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
      }}
    >
      <button
        type="button"
        onClick={() => void go(0)}
        className="pointer-events-auto md:ml-4 md:mt-2"
        aria-label="PujoBLR, back to the start"
      >
        <Logo compact={view.compact} />
      </button>
      <button
        type="button"
        onClick={() => setPlannerOpen(true)}
        className="hdr-cta pointer-events-auto relative inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-bold text-burgundy-deep ring-1 ring-[#b8862b] sm:px-6 sm:py-3.5 sm:text-[16px] md:mr-4 md:mt-3"
      >
        <span className="hidden min-[380px]:inline">Create my itinerary</span>
        <span className="min-[380px]:hidden">My itinerary</span>
        <span aria-hidden="true">→</span>
        {picks > 0 && (
          <span className="tabular absolute -right-1.5 -top-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-burgundy px-1.5 text-[12px] font-bold text-ivory ring-2 ring-ivory">
            {picks}
            <span className="sr-only"> saved stops</span>
          </span>
        )}
      </button>
    </header>
  )
}
