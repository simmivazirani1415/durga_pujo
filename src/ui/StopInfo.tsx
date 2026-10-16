import { useEffect } from 'react'
import type { Area, Listing, ListingKind } from '../data/types'
import { listingsFor } from '../data/listings'
import { PANDAL_FOR, PandalArt } from '../scenes/pandals'
import { placeLine, sortListings } from './explore/listingInfo'
import { PinIcon } from './PandalHotspot'
import { BookButton } from './explore/controls'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function when(l: Listing): string {
  if (l.status === 'published-2026' && l.dates?.start) {
    const a = new Date(l.dates.start + 'T00:00:00')
    const b = new Date((l.dates.end || l.dates.start) + 'T00:00:00')
    const m = MONTHS[a.getMonth()]
    return a.getTime() === b.getTime() ? `${a.getDate()} ${m} 2026` : `${a.getDate()}–${b.getDate()} ${m} 2026`
  }
  return '2026 details to verify'
}

const KIND_TITLE: Record<ListingKind, string> = { pandal: 'Community puja', event: 'Event', food: 'Food' }

/**
 * What opens when you tap Explore at a stop: the area's pandals at a glance, centred over the scene,
 * with a way into the full Explore panel and quick jumps to Pandals, Events and Food.
 */
export function StopInfo({
  area,
  place,
  counts,
  onClose,
  open,
}: {
  area: Area
  place: string
  counts: Record<ListingKind, number>
  onClose: () => void
  open: (opts: { tab: ListingKind; detailId?: string | null }) => void
}) {
  const variant = PANDAL_FOR[area.slug] ?? 'neighbourhood'
  const kind: ListingKind = counts.pandal ? 'pandal' : counts.event ? 'event' : counts.food ? 'food' : 'pandal'
  const items = sortListings(listingsFor(area.slug, kind)).slice(0, 2)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const chips: Array<{ k: ListingKind; label: string; sub: string; icon: JSX.Element }> = [
    { k: 'pandal', label: 'Pandals', sub: counts.pandal ? `${counts.pandal} here` : 'View all', icon: <TempleIcon /> },
    { k: 'event', label: 'Events', sub: counts.event ? `${counts.event} here` : 'Music, dance & more', icon: <CalIcon /> },
    { k: 'food', label: 'Food', sub: counts.food ? `${counts.food} here` : 'Bengali & local bites', icon: <FoodIcon /> },
  ]

  return (
    <div role="dialog" aria-label={`Pujo in ${place}`} className="pointer-events-auto flex w-full max-w-[560px] flex-col gap-3" data-pop="">
      <div className="relative rounded-[26px] bg-[#fbf3e2] p-4 ring-1 ring-gold sm:p-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-burgundy/70 hover:bg-parchment hover:text-burgundy"
        >
          ✕
        </button>
        {items.length ? (
          <ul className="flex flex-col divide-y divide-burgundy/10">
            {items.map((l) => (
              <li key={l.id}>
                <div className="flex w-full items-center gap-3 py-3 text-left first:pt-1 sm:gap-4">
                  <span className="relative block h-[84px] w-[104px] shrink-0 overflow-hidden rounded-xl bg-[radial-gradient(circle_at_50%_60%,#6a1f1f,#2a0d10)] sm:h-[104px] sm:w-[132px]">
                    <PandalArt variant={variant} className="absolute inset-x-0 bottom-0 w-full" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-vermilion">{l.category || KIND_TITLE[kind]}</span>
                    <span className="font-display text-[20px] font-semibold leading-tight text-burgundy sm:text-[23px]">{l.name}</span>
                    <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
                      <PinIcon className="h-3.5 w-3.5 shrink-0 text-burgundy" /> <span className="truncate">{placeLine(l)}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
                      <CalIcon className="h-3.5 w-3.5 shrink-0 text-burgundy" /> {when(l)}
                    </span>
                    {!!l.tags?.length && (
                      <span className="mt-0.5 hidden flex-wrap gap-1.5 sm:flex">
                        {l.tags.slice(0, 3).map((t) => (
                          <span key={t} className="rounded-full bg-parchment px-2 py-0.5 text-[11px] font-semibold text-burgundy/80">
                            {t}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                  <BookButton listing={l} size="sm" className="shrink-0" />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 pr-8 text-[15px] font-medium text-ink-soft">No 2026 listings are confirmed in {place} yet. The full list for the city is one tap away.</p>
        )}
        <button
          type="button"
          onClick={() => open({ tab: kind })}
          className="mt-3 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-burgundy px-6 text-[16px] font-bold text-ivory ring-1 ring-gold hover:bg-burgundy-soft"
        >
          Explore {place} <span aria-hidden="true">→</span>
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {chips.map((c) => (
          <button
            key={c.k}
            type="button"
            onClick={() => open({ tab: c.k })}
            className="flex items-center gap-2 rounded-2xl bg-[#fbf3e2] px-2.5 py-2.5 text-left ring-1 ring-gold hover:bg-white sm:gap-3 sm:px-4"
          >
            <span className="text-burgundy">{c.icon}</span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[14px] font-bold text-burgundy">{c.label}</span>
              <span className="hidden truncate text-[11.5px] font-medium text-ink-soft sm:block">{c.sub}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function TempleIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.5v2M7 9l5-4.5L17 9M5 9h14M6 9v10M18 9v10M3.5 20.5h17M10 20v-5a2 2 0 0 1 4 0v5" />
    </svg>
  )
}
function CalIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  )
}
function FoodIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <path d="M6 3v7a2 2 0 0 0 2 2v9M10 3v7a2 2 0 0 1-2 2M8 3v6M16 21V3c2.2 1.3 3 4 3 7h-3" />
    </svg>
  )
}
