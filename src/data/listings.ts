import raw from './listings.json'
import calendarRaw from './pujo-calendar.json'
import pincodesRaw from './pincodes.json'
import type { AreaSlug, Listing, ListingKind, PujoCalendar, Status } from './types'

export const LISTINGS: Listing[] = raw as Listing[]
export const LISTING_BY_ID: Record<string, Listing> = Object.fromEntries(LISTINGS.map((l) => [l.id, l]))
export const PUJO_CALENDAR = calendarRaw as PujoCalendar
/** pincode -> list of locality names (from India Post data); one pincode can cover several localities */
export const PINCODES = pincodesRaw as Record<string, { localities: string[]; area?: AreaSlug }>

export function listingsFor(area: AreaSlug, kind?: ListingKind): Listing[] {
  return LISTINGS.filter((l) => l.area === area && (!kind || l.kind === kind))
}

export function countsFor(area: AreaSlug): Record<ListingKind, number> {
  const c: Record<ListingKind, number> = { pandal: 0, food: 0, event: 0 }
  for (const l of LISTINGS) if (l.area === area) c[l.kind]++
  return c
}

export const STATUS_LABEL: Record<Status, string> = {
  'published-2026': 'Published for 2026',
  'awaiting-confirmation': 'Awaiting confirmation',
  'previous-year': 'Previous-year info',
  listed: 'Listed venue',
}

export const KIND_LABEL: Record<ListingKind, { one: string; many: string }> = {
  pandal: { one: 'Pandal', many: 'Pandals' },
  food: { one: 'Food', many: 'Food' },
  event: { one: 'Event', many: 'Events' },
}

/** Festival window used when no calendar data is available: published 2026 celebration dates span 15–21 October. */
export const FESTIVAL_WINDOW = { start: '2026-10-15', end: '2026-10-21' }
