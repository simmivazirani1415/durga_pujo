import type { Area, AreaSlug, StopId } from './types'

/**
 * Route order runs north → central → east → south-east → south.
 * Centres are approximate and only drive the schematic city map and the choice between a
 * street drive and an elevated transition. Real directions always use each listing's own address.
 */
export const AREAS: Area[] = [
  {
    slug: 'malleswaram',
    heading: 'Malleswaram',
    shortName: 'Malleswaram',
    subtitle: 'Old Bengaluru charm, local flavours and festive gatherings.',
    region: 'North',
    lat: 13.0035,
    lng: 77.57,
    subAreas: [
      { name: 'Malleswaram', lat: 13.0035, lng: 77.57 },
      { name: 'Mahalakshmipuram', lat: 13.015, lng: 77.549 },
    ],
    signature: 'A shaded old street with flower and fruit stalls, tiled-roof bungalows and a modest stone temple.',
  },
  {
    slug: 'rt-nagar-palace-grounds',
    heading: 'RT Nagar & Palace Grounds',
    shortName: 'Palace Grounds',
    subtitle: 'Big celebrations, cultural evenings and community gatherings.',
    region: 'North',
    lat: 13.009,
    lng: 77.593,
    subAreas: [
      { name: 'Palace Grounds', lat: 12.9987, lng: 77.592 },
      { name: 'RT Nagar', lat: 13.0219, lng: 77.5955 },
      { name: 'Hebbal–Jakkur', lat: 13.071, lng: 77.601 },
      { name: 'Jayamahal', lat: 13.0, lng: 77.6 },
    ],
    signature: 'A wide rain-tree road along the long Palace Grounds wall, with the palace turrets beyond the trees.',
  },
  {
    slug: 'ulsoor',
    heading: 'Ulsoor',
    shortName: 'Ulsoor',
    subtitle: 'Lakeside streets, community celebrations and festive food.',
    region: 'Central',
    lat: 12.9817,
    lng: 77.6205,
    subAreas: [
      { name: 'Ulsoor', lat: 12.9817, lng: 77.6205 },
      { name: 'Church Street & MG Road', lat: 12.9752, lng: 77.6045 },
    ],
    signature: 'The road along Ulsoor Lake with its small islands, the gurudwara dome on the bank and old Cantonment buildings.',
  },
  {
    slug: 'indiranagar',
    heading: 'Indiranagar',
    shortName: 'Indiranagar',
    subtitle: "Cafés, culture and Bengaluru's neighbourhood energy.",
    region: 'Central',
    lat: 12.9719,
    lng: 77.6412,
    subAreas: [
      { name: 'Indiranagar', lat: 12.9719, lng: 77.6412 },
      { name: 'HAL 3rd Stage', lat: 12.972, lng: 77.655 },
      { name: 'Kasturinagar', lat: 13.002, lng: 77.66 },
      { name: 'Domlur', lat: 12.961, lng: 77.638 },
    ],
    signature: 'A tree-lined café street with old villas turned into cafés and the elevated Purple Line metro.',
  },
  {
    slug: 'whitefield-hoodi',
    heading: 'Whitefield & Hoodi',
    shortName: 'Whitefield',
    subtitle: 'Community Pujo, cultural performances and East Bengaluru favourites.',
    region: 'East',
    lat: 12.982,
    lng: 77.73,
    subAreas: [
      { name: 'Whitefield', lat: 12.9698, lng: 77.75 },
      { name: 'Hoodi', lat: 12.9915, lng: 77.714 },
      { name: 'KR Puram', lat: 13.0076, lng: 77.695 },
      { name: 'Marathahalli', lat: 12.9569, lng: 77.7011 },
      { name: 'Varthur', lat: 12.938, lng: 77.74 },
    ],
    signature: 'Glass tech-park towers, apartment blocks and the elevated metro, with a road sign splitting for Whitefield and Hoodi.',
  },
  {
    slug: 'koramangala',
    heading: 'Koramangala',
    shortName: 'Koramangala',
    subtitle: 'Coffee, food, community and a little festive adda.',
    region: 'South-East',
    lat: 12.9352,
    lng: 77.6245,
    subAreas: [{ name: 'Koramangala', lat: 12.9352, lng: 77.6245 }],
    signature: 'A leafy café lane under rain trees, with low-rise offices in converted houses and people chatting outside.',
  },
  {
    slug: 'hsr-layout',
    heading: 'HSR Layout',
    shortName: 'HSR Layout',
    subtitle: 'Pandals, rituals, bhog and neighbourhood celebrations.',
    region: 'South-East',
    lat: 12.9116,
    lng: 77.6474,
    subAreas: [
      { name: 'HSR Layout', lat: 12.9116, lng: 77.6474 },
      { name: 'Bellandur', lat: 12.926, lng: 77.676 },
    ],
    signature: 'A calm residential junction with a park, local shops and a Pujo entrance on the corner.',
  },
  {
    slug: 'south-east',
    heading: 'E-City & Begur',
    shortName: 'E-City',
    subtitle: 'Electronic City, Begur and Bilekahalli: big community pujas, dandiya nights and live music.',
    region: 'South-East',
    lat: 12.895,
    lng: 77.627,
    subAreas: [
      { name: 'BTM Layout', lat: 12.9166, lng: 77.6101 },
      { name: 'Bilekahalli', lat: 12.8996, lng: 77.6067 },
      { name: 'Begur', lat: 12.8775, lng: 77.633 },
      { name: 'Hosa Road', lat: 12.879, lng: 77.667 },
      { name: 'Electronic City', lat: 12.845, lng: 77.66 },
      { name: 'Bannerghatta Road', lat: 12.937, lng: 77.6 },
    ],
    signature: 'Apartment blocks and eat streets around a busy junction, with the metro viaduct along Hosur Road.',
  },
  {
    slug: 'south',
    heading: 'JP Nagar',
    shortName: 'JP Nagar',
    subtitle: 'Leafy JP Nagar streets with neighbourhood pujas, Mahishasura Mardini and live music.',
    region: 'South',
    lat: 12.895,
    lng: 77.573,
    subAreas: [
      { name: 'JP Nagar', lat: 12.9063, lng: 77.5857 },
      { name: 'Kanakapura Road', lat: 12.881, lng: 77.56 },
    ],
    signature: 'Leafy JP Nagar streets, Puttenahalli lake and the Ragigudda hill temple on its rock, with the Green Line metro beyond.',
  },
]

export const AREA_BY_SLUG: Record<AreaSlug, Area> = Object.fromEntries(AREAS.map((a) => [a.slug, a])) as Record<
  AreaSlug,
  Area
>

export const STOPS: StopId[] = ['hero', ...AREAS.map((a) => a.slug), 'finale']

export const AREA_COUNT = AREAS.length

export function stopIndexOf(id: StopId): number {
  return STOPS.indexOf(id)
}

export function isArea(id: StopId): id is AreaSlug {
  return id !== 'hero' && id !== 'finale'
}

export function areaAt(index: number): Area | null {
  const id = STOPS[index]
  return id && isArea(id) ? AREA_BY_SLUG[id] : null
}

const R = 6371
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Hops longer than this use the elevated transition, so we never pretend two far areas share a street. */
export const ELEVATED_THRESHOLD_KM = 7
