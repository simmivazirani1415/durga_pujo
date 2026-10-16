import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import type { Listing } from '../../data/types'
import { directionsUrl, mapsPlace } from '../../lib/directions'
import { bookingLink } from './listingInfo'
import { useJourney } from '../../store/journey'
import { IconCheck, IconPlus, IconRoute } from './icons'

/** a pill that is either a toggle (aria-pressed) or one choice in a radio group (role="radio") */
export const Chip = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { on: boolean; mode?: 'toggle' | 'radio'; sub?: ReactNode; size?: 'md' | 'sm' }
>(function Chip({ on, mode = 'toggle', sub, size = 'md', className = '', children, ...rest }, ref) {
  const a11y = mode === 'radio' ? { role: 'radio', 'aria-checked': on } : { 'aria-pressed': on }
  return (
    <button
      ref={ref}
      type="button"
      {...a11y}
      {...rest}
      className={`inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-full border font-semibold transition-colors ${
        size === 'sm' ? 'min-h-[40px] px-3.5 text-[14px]' : 'min-h-[44px] px-4 text-[14.5px]'
      } ${
        on
          ? 'border-burgundy bg-burgundy text-ivory'
          : 'border-burgundy/20 bg-ivory text-burgundy hover:border-burgundy/45 hover:bg-parchment/60'
      } ${sub ? 'flex-col gap-0 py-1.5 leading-tight' : ''} ${className}`}
    >
      {children}
      {sub ? <span className={`text-[14px] sm:text-[12px] font-medium ${on ? 'text-ivory/80' : 'text-ink-soft'}`}>{sub}</span> : null}
    </button>
  )
})

/**
 * One horizontally scrolling row of chips. It never makes the page scroll sideways, fades the edge
 * that has more, and shows small arrow buttons for mouse users when it overflows.
 */
export function ChipRow({ label, children, className = '', role }: { label: string; children: ReactNode; className?: string; role?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ l: false, r: false })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const upd = () => {
      const l = el.scrollLeft > 4
      const r = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
      setEdges((p) => (p.l === l && p.r === r ? p : { l, r }))
    }
    upd()
    el.addEventListener('scroll', upd, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(upd) : null
    ro?.observe(el)
    if (el.firstElementChild) ro?.observe(el.firstElementChild)
    return () => {
      el.removeEventListener('scroll', upd)
      ro?.disconnect()
    }
  }, [])
  const mask =
    edges.l || edges.r
      ? `linear-gradient(to right, ${edges.l ? 'transparent 0, black 48px' : 'black 0'}, ${edges.r ? 'black calc(100% - 56px), transparent 100%' : 'black 100%'})`
      : undefined
  const nudge = (dir: 1 | -1) => {
    const el = ref.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' })
  }
  const arrow = 'pointer-events-auto hidden h-9 w-9 place-items-center rounded-full border border-burgundy/20 bg-ivory text-burgundy shadow-card hover:border-burgundy/50 [@media(pointer:fine)]:grid'
  return (
    <div className={`relative -mx-5 sm:-mx-7 ${className}`}>
      <div
        ref={ref}
        role={role ?? 'group'}
        aria-label={label}
        className="thin-scroll flex gap-2 overflow-x-auto px-5 py-0.5 sm:px-7"
        style={{ overscrollBehaviorX: 'contain', scrollbarWidth: 'none', WebkitMaskImage: mask, maskImage: mask }}
      >
        {children}
      </div>
      {edges.l && (
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => nudge(-1)} className={`${arrow} absolute left-2 top-1/2 -translate-y-1/2`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
      )}
      {edges.r && (
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => nudge(1)} className={`${arrow} absolute right-2 top-1/2 -translate-y-1/2`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}

const BTN_BASE =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 text-[14.5px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export const btn = {
  primary: `${BTN_BASE} bg-burgundy text-ivory hover:bg-burgundy-soft`,
  secondary: `${BTN_BASE} border border-burgundy/30 bg-ivory text-burgundy hover:border-burgundy/60 hover:bg-parchment/60`,
  gold: `${BTN_BASE} bg-gold text-burgundy-deep hover:bg-gold-soft`,
  quiet: `${BTN_BASE} px-3 text-burgundy hover:bg-parchment/70`,
}

export function DirectionsLink({ listing, className = '', label = 'Directions' }: { listing: Listing; className?: string; label?: string }) {
  const href = directionsUrl(listing)
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${btn.secondary} ${className}`}>
      <IconRoute size={17} />
      {label}
      <span className="sr-only"> to {listing.name} (opens Google Maps in a new tab)</span>
    </a>
  )
}

export function PickButton({ listing, className = '', long = false, icon = false }: { listing: Listing; className?: string; long?: boolean; icon?: boolean }) {
  const picked = useJourney((s) => s.picks.includes(listing.id))
  const togglePick = useJourney((s) => s.togglePick)
  return (
    <button
      type="button"
      aria-pressed={picked}
      title={icon ? (picked ? 'In your itinerary' : 'Add to itinerary') : undefined}
      onClick={() => togglePick(listing.id)}
      className={`${picked ? `${BTN_BASE} border border-forest/40 bg-forest/10 text-forest hover:bg-forest/15` : btn.secondary} ${className}`}
    >
      {picked ? <IconCheck size={17} /> : <IconPlus size={17} />}
      {icon ? (
        <span className="sr-only">{picked ? `Remove ${listing.name} from your itinerary` : `Add ${listing.name} to your itinerary`}</span>
      ) : (
        <>
          {picked ? (long ? 'In your itinerary' : 'Added') : long ? 'Add to itinerary' : 'Itinerary'}
          <span className="sr-only"> {listing.name}</span>
        </>
      )}
    </button>
  )
}

/**
 * A listing's single call to action. Book goes to its booking / organiser page (see bookingLink); a place with no
 * such page (restaurants, pujas only covered in the news) opens in Google Maps instead, so nothing is presented as
 * bookable without a page that says so.
 */
export function BookButton({ listing, className = '', size = 'md' }: { listing: Listing; className?: string; size?: 'md' | 'sm' }) {
  const b = bookingLink(listing)
  const place = mapsPlace(listing)
  // a booking or organiser page when there is one; otherwise the place on Google Maps
  const href = b?.url ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${listing.name}, ${place ?? 'Bengaluru'}`)}`
  const sz = size === 'sm' ? 'min-h-[44px] px-5 text-[14.5px]' : 'min-h-[48px] px-7 text-[15.5px]'
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-burgundy font-bold text-ivory ring-1 ring-gold hover:bg-burgundy-soft ${sz} ${className}`}
    >
      Book <span aria-hidden="true">→</span>
      <span className="sr-only"> {listing.name} (opens {b ? b.host : 'Google Maps'} in a new tab)</span>
    </a>
  )
}
