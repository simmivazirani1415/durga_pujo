import { AREA_BY_SLUG, AREAS, distanceKm } from '../../data/areas'
import { LISTINGS, listingsFor } from '../../data/listings'
import type { Area, AreaSlug, Listing, ListingKind } from '../../data/types'
import { openOn, plainName } from '../../lib/format'

/** listings may gain fields while the dataset is being enriched; these read them defensively */

export function kindOf(l: Listing): ListingKind {
  return l.kind === 'food' || l.kind === 'event' ? l.kind : 'pandal'
}

export function hasBhog(l: Listing): boolean {
  if (l.bhog && (l.bhog.time || l.bhog.date || l.bhog.access)) return true
  if (Array.isArray(l.schedule) && l.schedule.some((s) => /bhog/i.test(s?.activity ?? ''))) return true
  return (l.tags ?? []).some((t) => /bhog/i.test(t))
}

export function hasCulturalProgramme(l: Listing): boolean {
  if (Array.isArray(l.programmes) && l.programmes.length) return true
  if (Array.isArray(l.schedule) && l.schedule.some((s) => /programme|program|performance|music|dance|cultural/i.test(s?.activity ?? ''))) return true
  const words = [...(l.tags ?? []), l.category ?? ''].join(' ')
  if (/cultur|music|dance|perform|theatre|programme/i.test(words)) return true
  return LISTINGS.some((e) => e?.relatedTo === l.id && /cultur|music|programme|perform/i.test(`${e.name} ${e.category ?? ''}`))
}

export function isFreeEntry(l: Listing): boolean {
  return l.entry === 'free'
}

/** organiser line, only when it adds something the name does not already say */
export function organiserLine(l: Listing): string | null {
  const o = plainName(l.organiser)
  if (!o) return null
  return l.name.toLowerCase().includes(o.toLowerCase()) ? null : l.organiser!
}

/** "Freedom International School Ground · HSR Layout" */
export function placeLine(l: Listing): string {
  const venue = (l.venueName || '').trim()
  const sub = (l.subArea || '').trim()
  if (venue && sub && !venue.toLowerCase().includes(sub.toLowerCase())) return `${venue} · ${sub}`
  if (venue) return venue
  if (l.address && l.kind === 'food') return l.address.replace(/,\s*(Bengaluru|Bangalore)\s*$/i, '')
  return sub || AREA_BY_SLUG[l.area]?.heading || ''
}

const STATUS_ORDER: Record<string, number> = { 'published-2026': 0, 'awaiting-confirmation': 1, 'previous-year': 2, listed: 3 }
const FOOD_ORDER: Record<string, number> = { bengali: 0, mishti: 1, 'late-night': 2, 'local-favourite': 3 }

export function sortListings(ls: Listing[]): Listing[] {
  return [...ls].sort((a, b) => {
    if (a.kind === 'food' && b.kind === 'food') {
      const f = (FOOD_ORDER[a.foodType ?? ''] ?? 4) - (FOOD_ORDER[b.foodType ?? ''] ?? 4)
      if (f) return f
    }
    const s = (STATUS_ORDER[a.status] ?? 5) - (STATUS_ORDER[b.status] ?? 5)
    if (s) return s
    const d = (a.dates?.start ?? '9999').localeCompare(b.dates?.start ?? '9999')
    if (d) return d
    return a.name.localeCompare(b.name)
  })
}

export const FOOD_TYPE_LABEL: Record<string, string> = {
  bengali: 'Bengali meals',
  mishti: 'Mishti',
  'late-night': 'Late night',
  'local-favourite': 'Local favourites',
}

/** sub-areas of this area that actually have listings, in the area's own order */
export function subAreasWithListings(area: Area): string[] {
  const names = new Set(listingsFor(area.slug).map((l) => l.subArea).filter((x): x is string => !!x))
  const ordered = area.subAreas.map((s) => s.name).filter((n) => names.has(n))
  for (const n of names) if (!ordered.includes(n)) ordered.push(n)
  return ordered
}

/* ------------------------------------------------------------------ filters */

export interface Filters {
  day: string | null
  bhog: boolean
  free: boolean
  cultural: boolean
  published: boolean
  foodType: string | null
  q: string
}

export const EMPTY_FILTERS: Filters = { day: null, bhog: false, free: false, cultural: false, published: false, foodType: null, q: '' }

export function activeFilterCount(f: Filters, kind: ListingKind): number {
  if (kind === 'food') return (f.foodType ? 1 : 0) + (f.q.trim() ? 1 : 0)
  return (f.day ? 1 : 0) + (f.bhog ? 1 : 0) + (f.free ? 1 : 0) + (f.cultural ? 1 : 0) + (f.published ? 1 : 0) + (f.q.trim() ? 1 : 0)
}

function matchesQuery(l: Listing, q: string): boolean {
  const tokens = q
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0)
  if (!tokens.length) return true
  const hay = [l.name, l.organiser, l.venueName, l.address, l.subArea, l.category, l.pincode, ...(l.tags ?? []), ...(l.highlights ?? []), ...(l.programmes ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return tokens.every((t) => hay.includes(t))
}

export interface FilterResult {
  /** listings that match every filter */
  matches: Listing[]
  /** with a day chosen: listings whose dates are not published, kept apart instead of hidden */
  undated: Listing[]
}

export function applyFilters(ls: Listing[], f: Filters, kind: ListingKind): FilterResult {
  const matches: Listing[] = []
  const undated: Listing[] = []
  for (const l of ls) {
    if (!matchesQuery(l, f.q)) continue
    if (kind === 'food') {
      if (f.foodType && l.foodType !== f.foodType) continue
      matches.push(l)
      continue
    }
    if (f.bhog && !hasBhog(l)) continue
    if (f.free && !isFreeEntry(l)) continue
    if (f.cultural && !hasCulturalProgramme(l)) continue
    if (f.published && l.status !== 'published-2026') continue
    if (f.day) {
      const on = openOn(l.dates, f.day)
      if (on === false) continue
      if (on === undefined) {
        undated.push(l)
        continue
      }
    }
    matches.push(l)
  }
  return { matches: sortListings(matches), undated: sortListings(undated) }
}

/* ------------------------------------------------------------------ nearby areas */

/** nearest other areas that have at least one listing published for 2026 */
export function nearestPublishedAreas(slug: AreaSlug, kind?: ListingKind, n = 3): { area: Area; km: number }[] {
  const here = AREA_BY_SLUG[slug]
  if (!here) return []
  return AREAS.filter(
    (a) => a.slug !== slug && LISTINGS.some((l) => l?.area === a.slug && l.status === 'published-2026' && (!kind || kindOf(l) === kind || kind === 'food')),
  )
    .map((a) => ({ area: a, km: distanceKm(here, a) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, n)
}

export function relatedListings(l: Listing): { parent: Listing | null; children: Listing[] } {
  const parent = l.relatedTo ? LISTINGS.find((x) => x?.id === l.relatedTo) ?? null : null
  const children = sortListings(LISTINGS.filter((x) => x?.relatedTo === l.id))
  return { parent, children }
}

/** an optional photo, accepted only with a credit */
export function photoOf(l: Listing): { url: string; credit: string } | null {
  const img = (l as unknown as { image?: { url?: unknown; credit?: unknown } }).image
  if (img && typeof img.url === 'string' && /^https?:\/\//.test(img.url) && typeof img.credit === 'string' && img.credit.trim()) {
    return { url: img.url, credit: img.credit }
  }
  return null
}

export function safeUrl(u?: string): string | null {
  if (!u || typeof u !== 'string') return null
  try {
    const url = new URL(u)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

export function hostOf(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return u
  }
}

/** coverage and blog sites: a source we cite, never a place to send someone to book */
const NEWS_HOSTS = ['boldsky.com', 'newsable.asianetnews.com', 'mytravellingstilettos.com', 'pujo.newzchain.com', 'deccanherald.com', 'pninews.com']

/**
 * The one place a listing's Book button goes: a published booking link, else the event's ticket / RSVP page
 * (allevents.in), else the organiser's own site, else its pujo directory page; an event with none falls back to
 * its parent celebration. Null when the only sources are news coverage.
 */
export function bookingLink(l: Listing, depth = 0): { url: string; host: string } | null {
  const urls = [l.bookingUrl, l.officialUrl, ...(l.sources ?? []).map((s) => s?.url)].map((u) => safeUrl(u ?? undefined)).filter(Boolean) as string[]
  const rank = (u: string) => {
    const h = hostOf(u)
    if (u === safeUrl(l.bookingUrl)) return 0
    if (h === 'allevents.in') return 1
    if (NEWS_HOSTS.some((n) => h === n || h.endsWith('.' + n))) return 9
    if (h === 'pujorpoth.in') return 3
    return 2
  }
  const best = urls.sort((a, b) => rank(a) - rank(b))[0]
  if (best && rank(best) < 9) return { url: best, host: hostOf(best) }
  if (l.relatedTo && depth < 2) {
    const parent = LISTINGS.find((x) => x?.id === l.relatedTo)
    if (parent) return bookingLink(parent, depth + 1)
  }
  return null
}
