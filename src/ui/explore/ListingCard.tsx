import { forwardRef } from 'react'
import { KIND_LABEL } from '../../data/listings'
import type { Listing } from '../../data/types'
import { dateRange } from '../../lib/format'
import { StatusBadge } from '../StatusBadge'
import { BookButton, DirectionsLink, PickButton } from './controls'
import { IconCalendar, IconPin } from './icons'
import { FOOD_TYPE_LABEL, organiserLine, placeLine } from './listingInfo'

interface Props {
  listing: Listing
  onDetails: (id: string) => void
  /** number shown when the list sits under the map */
  pinNumber?: number
}

export const ListingCard = forwardRef<HTMLButtonElement, Props>(function ListingCard({ listing: l, pinNumber }, _ref) {
  const org = organiserLine(l)
  const place = placeLine(l)
  const when = [dateRange(l.dates), l.kind === 'event' ? l.timings : ''].filter(Boolean).join(' · ')
  const tags = (l.tags ?? []).filter((t) => typeof t === 'string' && t.trim()).slice(0, 3)
  const typeLine = l.kind === 'food' ? (l.foodType ? FOOD_TYPE_LABEL[l.foodType] : l.category) : null
  const headingId = `card-${l.id}`
  return (
    <article aria-labelledby={headingId} data-card={l.id} className="rounded-[18px] border border-parchment-deep/80 bg-[#FFFBF4] p-4 shadow-[0_1px_0_rgba(101,27,40,0.04)] sm:p-5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        {pinNumber != null && (
          <span className="tabular grid h-6 min-w-6 place-items-center rounded-full bg-vermilion px-1.5 text-[14px] sm:text-[12.5px] font-bold text-ivory" aria-label={`Pin ${pinNumber}`}>
            {pinNumber}
          </span>
        )}
        <StatusBadge status={l.status} />
        {typeLine && <span className="text-[14px] sm:text-[13px] font-semibold text-ink-soft">{typeLine}</span>}
      </div>
      <h3 id={headingId} className="mt-2.5 font-display text-[23px] font-semibold leading-[1.1] text-burgundy sm:text-[25px]">
        {l.name}
      </h3>
      {org && <p className="mt-1 text-[14px] font-medium text-ink-soft">{org}</p>}
      <dl className="mt-2.5 flex flex-col gap-1.5 text-[14.5px] text-charcoal/90">
        {place && (
          <div className="flex items-start gap-2">
            <dt className="sr-only">Where</dt>
            <IconPin size={17} className="mt-[2px] shrink-0 text-burgundy/60" />
            <dd>{place}</dd>
          </div>
        )}
        {when ? (
          <div className="flex items-start gap-2">
            <dt className="sr-only">When</dt>
            <IconCalendar size={17} className="mt-[2px] shrink-0 text-burgundy/60" />
            <dd className="tabular">{when}</dd>
          </div>
        ) : l.kind !== 'food' ? (
          <div className="flex items-start gap-2">
            <dt className="sr-only">When</dt>
            <IconCalendar size={17} className="mt-[2px] shrink-0 text-burgundy/40" />
            <dd className="text-ink-soft">Dates not confirmed</dd>
          </div>
        ) : null}
      </dl>
      {l.kind === 'food' && Array.isArray(l.highlights) && l.highlights.length > 0 && (
        <p className="mt-2 text-[14px] text-ink-soft">
          <span className="font-semibold text-charcoal/80">Try: </span>
          {l.highlights.slice(0, 3).join(', ')}
        </p>
      )}
      {tags.length > 0 && l.kind !== 'food' && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Tags">
          {tags.map((t) => (
            <li key={t} className="rounded-full bg-parchment px-2.5 py-1 text-[14px] sm:text-[12.5px] font-semibold text-ink-soft">
              {t}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <DirectionsLink listing={l} className="px-3.5" />
        <BookButton listing={l} size="sm" />
        <PickButton listing={l} icon className="w-[44px] !px-0" />
      </div>
    </article>
  )
})
