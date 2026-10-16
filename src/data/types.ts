export type AreaSlug =
  | 'yelahanka'
  | 'malleswaram'
  | 'rt-nagar-palace-grounds'
  | 'ulsoor'
  | 'indiranagar'
  | 'whitefield-hoodi'
  | 'koramangala'
  | 'hsr-layout'
  | 'south-east'
  | 'south'

export type StopId = 'hero' | AreaSlug | 'finale'

export type ListingKind = 'pandal' | 'food' | 'event'

/**
 * published-2026        an organiser (or the venue) has published 2026 details
 * awaiting-confirmation  known annual celebration; 2026 venue / dates / programme not confirmed
 * previous-year          only last year's information could be found
 * listed                 a permanent place (restaurant, sweet shop) with a published address; hours not checked for festival days
 */
export type Status = 'published-2026' | 'awaiting-confirmation' | 'previous-year' | 'listed'

export interface SubArea {
  name: string
  lat: number
  lng: number
}

export interface Area {
  slug: AreaSlug
  heading: string
  shortName: string
  subtitle: string
  region: 'North' | 'Central' | 'East' | 'South-East' | 'South'
  /** approximate centre, used for the schematic city map and for picking street vs elevated transitions */
  lat: number
  lng: number
  subAreas: SubArea[]
  /** one line describing what the scene shows, read out to screen readers */
  signature: string
}

export interface Source {
  label: string
  url?: string
}

export interface ScheduleItem {
  date: string // ISO yyyy-mm-dd
  time?: string // as published, e.g. "11 am", "1–3 pm"
  activity: string
}

export interface Listing {
  id: string
  kind: ListingKind
  name: string
  organiser?: string
  /** website role / food style / event category, in plain words */
  category?: string
  venueName?: string
  address?: string
  area: AreaSlug
  subArea?: string
  pincode?: string
  lat?: number
  lng?: number
  coordsSource?: string
  editionYear?: number
  dates?: { start: string; end: string }
  timings?: string
  schedule?: ScheduleItem[]
  bhog?: { date?: string; time?: string; access?: string }
  programmes?: string[]
  /** food: things to try (editorial suggestions, menus not guaranteed) */
  highlights?: string[]
  foodType?: 'bengali' | 'mishti' | 'local-favourite' | 'late-night'
  entry?: 'free' | 'ticketed' | 'members' | 'unknown'
  access?: { entrance?: string; parking?: string; metro?: string; facilities?: string }
  officialUrl?: string
  bookingUrl?: string
  tags?: string[]
  status: Status
  /** what still needs checking, shown to visitors */
  statusNote?: string
  /** false when the venue itself is unconfirmed, so we never route people to a guess */
  directionsEnabled: boolean
  /** event -> the celebration it belongs to */
  relatedTo?: string
  sources: Source[]
  verifiedOn: string // ISO date the record was last checked
}

export interface PujoDay {
  date: string
  name: string // e.g. "Maha Saptami"
}

export interface PujoCalendar {
  year: number
  days: PujoDay[]
  source: Source | null
}
