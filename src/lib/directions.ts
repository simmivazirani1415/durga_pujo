import { AREA_BY_SLUG, distanceKm } from '../data/areas'
import type { AreaSlug, Listing } from '../data/types'

/**
 * Directions are Google Maps deep links only. The page never calls a routing service, so every
 * travel time shown elsewhere is a labelled estimate, not live traffic.
 */

export interface LatLng {
  lat: number
  lng: number
}

export function hasCoords(x: { lat?: unknown; lng?: unknown } | null | undefined): x is LatLng {
  return (
    !!x &&
    typeof x.lat === 'number' &&
    typeof x.lng === 'number' &&
    Number.isFinite(x.lat) &&
    Number.isFinite(x.lng) &&
    Math.abs(x.lat) <= 90 &&
    Math.abs(x.lng) <= 180 &&
    !(x.lat === 0 && x.lng === 0)
  )
}

/** a place Google Maps can resolve: exact coordinates, else the published address with the city added */
export function mapsPlace(l: Pick<Listing, 'lat' | 'lng' | 'address' | 'venueName' | 'name'>): string | null {
  if (hasCoords(l)) return `${l.lat.toFixed(6)},${l.lng.toFixed(6)}`
  const base = (l.address || l.venueName || '').trim()
  if (!base) return null
  return /bengaluru|bangalore/i.test(base) ? base : `${base}, Bengaluru`
}

export function canRoute(l: Listing): boolean {
  return l.directionsEnabled === true && !!mapsPlace(l)
}

export function directionsUrl(l: Listing): string | null {
  if (!canRoute(l)) return null
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsPlace(l)!)}`
}

/**
 * The whole outing in one Google Maps link: origin, waypoints separated by %7C, destination.
 * Google allows up to nine waypoints on the web; extra stops are dropped from the middle.
 */
export function routeUrl(origin: string | null, places: string[], destination?: string | null): string | null {
  const ps = places.filter(Boolean)
  if (!ps.length) return null
  const dest = destination || ps[ps.length - 1]
  const mids = destination ? ps : ps.slice(0, -1)
  let url = 'https://www.google.com/maps/dir/?api=1'
  if (origin) url += `&origin=${encodeURIComponent(origin)}`
  url += `&destination=${encodeURIComponent(dest)}`
  const way = mids.slice(0, 9).map((p) => encodeURIComponent(p))
  if (way.length) url += `&waypoints=${way.join('%7C')}`
  return url
}

/* ------------------------------------------------------------------ approximate positions */

/** Where a listing sits for planning: its own coordinates, else its sub-area centre, else the area centre. */
export function approxPosition(l: Listing): { pos: LatLng; exact: boolean } {
  if (hasCoords(l)) return { pos: { lat: l.lat, lng: l.lng }, exact: true }
  const area = AREA_BY_SLUG[l.area as AreaSlug]
  const sub = area?.subAreas.find((s) => s.name.toLowerCase() === (l.subArea ?? '').toLowerCase())
  if (sub) return { pos: { lat: sub.lat, lng: sub.lng }, exact: false }
  if (area) return { pos: { lat: area.lat, lng: area.lng }, exact: false }
  return { pos: { lat: 12.9716, lng: 77.5946 }, exact: false }
}

/* ------------------------------------------------------------------ travel estimates */

export type Transport = 'auto' | 'metro' | 'cab' | 'own'

export const TRANSPORT_LABEL: Record<Transport, string> = {
  auto: 'Auto',
  metro: 'Metro',
  cab: 'Cab',
  own: 'Own vehicle',
}

const ROAD_FACTOR = 1.35
const SPEED_KMH: Record<Transport, number> = { auto: 18, metro: 28, cab: 20, own: 20 }
const METRO_EXTRA_MIN = 10

export function roadKm(a: LatLng, b: LatLng): number {
  return distanceKm(a, b) * ROAD_FACTOR
}

/** minutes, rounded up to 5; a short hop is never shown as less than 5 min */
export function travelMinutes(a: LatLng, b: LatLng, mode: Transport): number {
  const km = roadKm(a, b)
  if (km < 0.25) return 0
  let min = (km / SPEED_KMH[mode]) * 60
  if (mode === 'metro') min += METRO_EXTRA_MIN
  return Math.max(5, Math.ceil(min / 5) * 5)
}
