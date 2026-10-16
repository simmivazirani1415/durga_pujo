import { forwardRef, type ReactNode } from 'react'
import { AREA_BY_SLUG } from '../../data/areas'
import { KIND_LABEL } from '../../data/listings'
import type { Listing } from '../../data/types'
import { dateLong, dateRange, dateWithDay } from '../../lib/format'
import { StatusBadge, statusTone } from '../StatusBadge'
import { DirectionsLink, PickButton } from './controls'
import { IconBack, IconExternal } from './icons'
import { FOOD_TYPE_LABEL, hostOf, organiserLine, photoOf, relatedListings, safeUrl } from './listingInfo'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h3 className="mb-2.5 text-[14px] sm:text-[12.5px] font-bold uppercase tracking-[0.14em] text-burgundy/75">{title}</h3>
      {children}
    </section>
  )
}

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-[44px] items-center gap-1.5 font-semibold text-burgundy underline decoration-burgundy/30 underline-offset-[3px] hover:decoration-burgundy"
    >
      {children}
      <IconExternal size={15} />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

interface Props {
  listing: Listing
  onBack: () => void
  onOpen: (id: string) => void
}

export const ListingDetail = forwardRef<HTMLButtonElement, Props>(function ListingDetail({ listing: l, onBack, onOpen }, backRef) {
  const area = AREA_BY_SLUG[l.area]
  const org = organiserLine(l)
  const photo = photoOf(l)
  const schedule = (Array.isArray(l.schedule) ? l.schedule : [])
    .filter((s) => s && s.activity)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  const scheduleNoBhog = schedule.filter((s) => !/bhog/i.test(s.activity))
  const bhogFromSchedule = schedule.find((s) => /bhog/i.test(s.activity))
  const bhog = l.bhog || bhogFromSchedule ? { date: l.bhog?.date ?? bhogFromSchedule?.date, time: l.bhog?.time ?? bhogFromSchedule?.time, access: l.bhog?.access } : null
  const programmes = (l.programmes ?? []).filter(Boolean)
  const highlights = (l.highlights ?? []).filter(Boolean)
  const access = l.access ?? {}
  const accessRows = [
    ['Entrance', access.entrance],
    ['Metro', access.metro],
    ['Parking', access.parking],
    ['Facilities', access.facilities],
  ].filter((r): r is [string, string] => !!r[1])
  const official = safeUrl(l.officialUrl)
  const booking = safeUrl(l.bookingUrl)
  const { parent, children } = relatedListings(l)
  const sources = (Array.isArray(l.sources) ? l.sources : []).filter((s) => s && (s.label || s.url))
  const when = dateRange(l.dates)
  // the address often repeats the venue name; show the rest under it
  const addressRest = (() => {
    const a = (l.address ?? '').trim()
    const v = (l.venueName ?? '').trim()
    if (!a || a === v) return ''
    return v && a.toLowerCase().startsWith(v.toLowerCase()) ? a.slice(v.length).replace(/^[,\s]+/, '') : a
  })()
  const entryLabel = l.entry === 'free' ? 'Free entry' : l.entry === 'ticketed' ? 'Ticketed' : l.entry === 'members' ? 'Members only' : null

  return (
    <div className="pb-6">
      <button ref={backRef} type="button" onClick={onBack} className="-ml-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-2 text-[14.5px] font-bold text-burgundy hover:bg-parchment/70">
        <IconBack size={18} />
        Back to {area ? area.shortName : 'the list'}
      </button>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={l.status} />
        <span className="text-[14px] sm:text-[13px] font-semibold text-ink-soft">
          {KIND_LABEL[l.kind]?.one ?? 'Listing'}
          {l.kind === 'food' && l.foodType ? ` · ${FOOD_TYPE_LABEL[l.foodType]}` : l.category ? ` · ${l.category}` : ''}
        </span>
      </div>
      <h2 id="explore-detail-title" className="mt-3 font-display text-[32px] font-semibold leading-[1.02] text-burgundy sm:text-[38px]">
        {l.name}
      </h2>
      {org && <p className="mt-1.5 text-[15px] font-medium text-ink-soft">By {org}</p>}

      {l.statusNote && (
        <p className={`mt-4 rounded-2xl border px-4 py-3 text-[14.5px] leading-relaxed text-charcoal/90 ${statusTone(l.status)}`}>{l.statusNote}</p>
      )}

      {photo && (
        <figure className="mt-5 overflow-hidden rounded-2xl border border-parchment-deep">
          <img src={photo.url} alt={`${l.name}`} loading="lazy" className="aspect-[16/10] w-full object-cover" />
          <figcaption className="bg-parchment/60 px-3 py-1.5 text-[14px] sm:text-[12.5px] text-ink-soft">Photo: {photo.credit}</figcaption>
        </figure>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <DirectionsLink listing={l} className="flex-1 sm:flex-none" />
        <PickButton listing={l} long className="flex-1 sm:flex-none" />
      </div>
      {!l.directionsEnabled && (
        <p className="mt-2 text-[14px] sm:text-[13.5px] text-ink-soft">Directions are off until the venue is confirmed, so we never send you to a guess.</p>
      )}

      <Section title="Where">
        <div className="select-text text-[15px] leading-relaxed text-charcoal">
          {l.venueName && <p className="font-semibold">{l.venueName}</p>}
          {addressRest && <p>{addressRest}</p>}
          {!l.venueName && !l.address && <p className="text-ink-soft">Venue not confirmed yet.</p>}
          <p className="mt-1 text-[14px] text-ink-soft">
            {l.subArea && area && l.subArea !== area.heading ? `${l.subArea}, in ${area.heading}` : area?.heading ?? l.subArea}
            {l.pincode ? ` · ${l.pincode}` : ''}
          </p>
        </div>
      </Section>

      {l.kind !== 'food' && (
        <Section title="When">
          <p className="tabular text-[15px] text-charcoal">
            {when || <span className="text-ink-soft">Dates not confirmed yet.</span>}
            {l.timings ? ` · ${l.timings}` : ''}
            {entryLabel ? ` · ${entryLabel}` : ''}
          </p>
        </Section>
      )}

      {bhog && (
        <Section title="Bhog">
          <div className="rounded-2xl border border-gold/60 bg-gold/15 px-4 py-3.5">
            <p className="text-[15px] font-bold text-burgundy-deep">
              {[bhog.date ? dateWithDay(bhog.date) : null, bhog.time].filter(Boolean).join(', ') || 'Timing not published yet'}
            </p>
            <p className="mt-1 text-[14px] text-charcoal/85">
              {bhog.access ? `Access: ${bhog.access}` : 'Access and token rules are not published here. Ask at the venue.'}
            </p>
          </div>
        </Section>
      )}

      {scheduleNoBhog.length > 0 && (
        <Section title="Schedule">
          <table className="w-full border-collapse text-left text-[14.5px]">
            <caption className="sr-only">Published schedule for {l.name}</caption>
            <thead>
              <tr className="text-[14px] sm:text-[12.5px] uppercase tracking-[0.08em] text-ink-soft">
                <th scope="col" className="w-[30%] pb-2 font-bold">
                  Date
                </th>
                <th scope="col" className="w-[24%] pb-2 font-bold">
                  Time
                </th>
                <th scope="col" className="pb-2 font-bold">
                  Activity
                </th>
              </tr>
            </thead>
            <tbody>
              {scheduleNoBhog.map((s, i) => (
                <tr key={`${s.date}-${i}`} className="border-t border-parchment-deep/80 align-top">
                  <td className="tabular py-2.5 pr-2 font-semibold text-charcoal">{s.date ? dateWithDay(s.date) : '–'}</td>
                  <td className="py-2.5 pr-2 text-charcoal/85">{s.time ?? 'Not published'}</td>
                  <td className="py-2.5 text-charcoal">{s.activity}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[14px] sm:text-[13px] text-ink-soft">Timings apply to this organiser only and can change.</p>
        </Section>
      )}

      {programmes.length > 0 && (
        <Section title="Programmes">
          <ul className="flex flex-col gap-1.5 text-[15px] text-charcoal">
            {programmes.map((p) => (
              <li key={p} className="flex gap-2">
                <span aria-hidden="true" className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-vermilion" />
                {p}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {highlights.length > 0 && (
        <Section title="Things to try (menus vary)">
          <ul className="flex flex-wrap gap-1.5">
            {highlights.map((h) => (
              <li key={h} className="rounded-full bg-parchment px-3 py-1.5 text-[14px] font-semibold text-charcoal/85">
                {h}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[14px] sm:text-[13px] text-ink-soft">Editorial suggestions, not a guaranteed menu. Check festival hours before you go.</p>
        </Section>
      )}

      {accessRows.length > 0 && (
        <Section title="Getting in">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
            {accessRows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-semibold text-ink-soft">{k}</dt>
                <dd className="text-charcoal">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {(official || booking) && (
        <Section title="Official links">
          <div className="flex flex-col items-start">
            {official && <ExtLink href={official}>Official page · {hostOf(official)}</ExtLink>}
            {booking && <ExtLink href={booking}>Booking (published by the organiser) · {hostOf(booking)}</ExtLink>}
          </div>
        </Section>
      )}

      {(parent || children.length > 0) && (
        <Section title={parent ? 'Part of' : 'Events at this celebration'}>
          <ul className="flex flex-col gap-1">
            {(parent ? [parent] : children).map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onOpen(r.id)}
                  className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border border-parchment-deep/80 bg-[#FFFBF4] px-3.5 py-2 text-left hover:border-burgundy/30"
                >
                  <span>
                    <span className="block text-[15px] font-semibold text-burgundy">{r.name}</span>
                    <span className="tabular block text-[14px] sm:text-[13px] text-ink-soft">{[dateRange(r.dates), r.timings].filter(Boolean).join(' · ') || 'Dates not confirmed'}</span>
                  </span>
                  <span aria-hidden="true" className="text-burgundy/60">
                    →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Sources">
        {sources.length ? (
          <ul className="flex flex-col gap-1 text-[14.5px] text-charcoal/90">
            {sources.map((s, i) => {
              const href = safeUrl(s.url)
              return <li key={i}>{href ? <ExtLink href={href}>{s.label || hostOf(href)}</ExtLink> : <span>{s.label}</span>}</li>
            })}
          </ul>
        ) : (
          <p className="text-[14.5px] text-ink-soft">No source recorded.</p>
        )}
        {l.verifiedOn && <p className="mt-2 text-[14px] sm:text-[13.5px] font-semibold text-forest">Checked {dateLong(l.verifiedOn)}</p>}
      </Section>
    </div>
  )
})
