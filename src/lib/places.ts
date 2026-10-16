import { AREAS, AREA_BY_SLUG } from '../data/areas'
import { LISTINGS, PINCODES } from '../data/listings'
import type { AreaSlug } from '../data/types'

/** Landmarks and pincodes, mapped to the areas on the route. Shared by search and the planner. */

/* ------------------------------------------------------------------ landmarks */

export interface Landmark {
  name: string
  aliases?: string[]
  area: AreaSlug
  subArea?: string
}

/** Well-known places mapped to the scene they sit in. Only used to find an area, never shown as a venue. */
export const LANDMARKS: Landmark[] = [
  { name: 'Palace Grounds', aliases: ['Bangalore Palace', 'Bengaluru Palace'], area: 'rt-nagar-palace-grounds', subArea: 'Palace Grounds' },
  { name: 'Mekhri Circle', area: 'rt-nagar-palace-grounds' },
  { name: 'Ulsoor Lake', aliases: ['Halasuru Lake', 'Ulsoor Gurudwara'], area: 'ulsoor', subArea: 'Ulsoor' },
  { name: 'Assaye Road', area: 'ulsoor', subArea: 'Ulsoor' },
  { name: 'Kensington Road', area: 'ulsoor', subArea: 'Ulsoor' },
  { name: 'Church Street', area: 'ulsoor', subArea: 'Church Street & MG Road' },
  { name: 'MG Road', aliases: ['Mahatma Gandhi Road', 'Brigade Road'], area: 'ulsoor', subArea: 'Church Street & MG Road' },
  { name: 'St Marks Road', aliases: ["St. Mark's Road", 'Saint Marks Road'], area: 'ulsoor', subArea: 'Church Street & MG Road' },
  { name: 'Cubbon Park', area: 'ulsoor', subArea: 'Church Street & MG Road' },
  { name: '100 Feet Road, Indiranagar', aliases: ['100 Feet Road', '12th Main Indiranagar', 'CMH Road', 'Double Road'], area: 'indiranagar' },
  { name: 'Nallurhalli Metro', aliases: ['Nallurhalli', 'Nallurahalli Metro'], area: 'whitefield-hoodi', subArea: 'Whitefield' },
  { name: 'KTPO', aliases: ['KTPO Whitefield', 'EPIP'], area: 'whitefield-hoodi', subArea: 'Whitefield' },
  { name: 'ITPL', aliases: ['Whitefield Main Road', 'Siddapura'], area: 'whitefield-hoodi', subArea: 'Whitefield' },
  { name: 'Hoodi Junction', aliases: ['Hoodi Circle', 'Basi Reddy Garden', 'Anup Layout'], area: 'whitefield-hoodi', subArea: 'Hoodi' },
  { name: 'KR Puram', aliases: ['Krishnarajapuram', 'KR Puram Road'], area: 'whitefield-hoodi', subArea: 'KR Puram' },
  { name: 'Marathahalli Bridge', aliases: ['Marathahalli Main Road'], area: 'whitefield-hoodi', subArea: 'Marathahalli' },
  { name: 'Koramangala 80 Feet Road', aliases: ['80 Feet Road', 'Koramangala 5th Block', 'Koramangala Club Road', 'Koramangala 7th Block'], area: 'koramangala' },
  { name: 'Freedom International School', aliases: ['Freedom International School Ground'], area: 'hsr-layout', subArea: 'HSR Layout' },
  { name: 'Agara Lake', area: 'hsr-layout', subArea: 'HSR Layout' },
  { name: '27th Main, HSR Layout', aliases: ['27th Main'], area: 'hsr-layout', subArea: 'HSR Layout' },
  { name: 'Silk Board', aliases: ['Silk Board Junction'], area: 'south-east', subArea: 'BTM Layout' },
  { name: 'Madiwala Lake', area: 'south-east', subArea: 'BTM Layout' },
  { name: 'Sheela Arcade', area: 'south-east', subArea: 'BTM Layout' },
  { name: 'IIM Bangalore', aliases: ['IIM Bengaluru', 'Bannerghatta Road'], area: 'south-east', subArea: 'Bilekahalli' },
  { name: 'Begur Lake', aliases: ['Begur Temple'], area: 'south-east', subArea: 'Begur' },
  { name: 'Hosur Road', aliases: ['Rayasandra', 'Electronic City Expressway'], area: 'south-east', subArea: 'Hosa Road' },
  { name: 'Puttenahalli Lake', area: 'south', subArea: 'JP Nagar' },
  { name: 'Ragigudda Temple', aliases: ['Ragigudda'], area: 'south', subArea: 'JP Nagar' },
  { name: 'Kanakapura Road Metro', aliases: ['Green Line', 'Konanakunte'], area: 'south', subArea: 'Kanakapura Road' },
  { name: 'Sampige Road', aliases: ['Margosa Road', '8th Cross Malleswaram', 'Malleswaram 8th Cross'], area: 'malleswaram' },
  { name: 'Kadu Malleshwara Temple', aliases: ['Kadu Malleswara'], area: 'malleswaram' },
]

/* ------------------------------------------------------------------ pincodes */

export interface Locality {
  name: string
  code: string
  slug: AreaSlug | null
  subArea?: string
}

/**
 * Starter pincodes for the route, used only when pincodes.json has no entry for that code.
 * Head and sub post office pincodes from the India Post directory; pincodes.json always wins.
 */
const STARTER_PINCODES: Record<string, { name: string; slug: AreaSlug; subArea?: string }[]> = {
  '560003': [{ name: 'Malleswaram', slug: 'malleswaram' }],
  '560032': [{ name: 'RT Nagar', slug: 'rt-nagar-palace-grounds', subArea: 'RT Nagar' }],
  '560008': [{ name: 'Halasuru (Ulsoor)', slug: 'ulsoor', subArea: 'Ulsoor' }],
  '560001': [{ name: 'MG Road and Church Street', slug: 'ulsoor', subArea: 'Church Street & MG Road' }],
  '560038': [{ name: 'Indiranagar', slug: 'indiranagar' }],
  '560066': [{ name: 'Whitefield', slug: 'whitefield-hoodi', subArea: 'Whitefield' }],
  '560048': [
    { name: 'Mahadevapura', slug: 'whitefield-hoodi', subArea: 'Hoodi' },
    { name: 'Hoodi', slug: 'whitefield-hoodi', subArea: 'Hoodi' },
  ],
  '560036': [{ name: 'KR Puram', slug: 'whitefield-hoodi', subArea: 'KR Puram' }],
  '560037': [{ name: 'Marathahalli', slug: 'whitefield-hoodi', subArea: 'Marathahalli' }],
  '560034': [{ name: 'Koramangala', slug: 'koramangala' }],
  '560102': [{ name: 'HSR Layout', slug: 'hsr-layout' }],
  '560076': [
    { name: 'BTM Layout 2nd Stage', slug: 'south-east', subArea: 'BTM Layout' },
    { name: 'Bilekahalli', slug: 'south-east', subArea: 'Bilekahalli' },
  ],
  '560068': [
    { name: 'Bommanahalli', slug: 'south-east', subArea: 'Hosa Road' },
    { name: 'Begur', slug: 'south-east', subArea: 'Begur' },
  ],
  '560078': [{ name: 'JP Nagar', slug: 'south', subArea: 'JP Nagar' }],
}

export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** match a locality name to an area (and sub-area) on the route, or null */
export function resolveLocality(name: string): { slug: AreaSlug; subArea?: string } | null {
  const n = norm(name)
  if (!n) return null
  for (const a of AREAS) {
    for (const s of a.subAreas) {
      const sn = norm(s.name)
      if (n === sn || n.includes(sn) || sn.includes(n)) return { slug: a.slug, subArea: s.name }
    }
  }
  for (const a of AREAS) {
    if (n.includes(norm(a.shortName)) || n.includes(norm(a.heading))) return { slug: a.slug }
  }
  for (const l of LANDMARKS) {
    if ([l.name, ...(l.aliases ?? [])].some((x) => norm(x) === n)) return { slug: l.area, subArea: l.subArea }
  }
  return null
}

let pinCache: Map<string, Locality[]> | null = null

/** pincode -> every locality we know it covers (one pincode can cover several) */
export function pincodeIndex(): Map<string, Locality[]> {
  if (pinCache) return pinCache
  const m = new Map<string, Locality[]>()
  const add = (code: string, loc: Locality) => {
    const list = m.get(code) ?? []
    if (!list.some((x) => norm(x.name) === norm(loc.name))) list.push(loc)
    m.set(code, list)
  }
  const fromFile = PINCODES && typeof PINCODES === 'object' ? PINCODES : {}
  for (const [code, entry] of Object.entries(fromFile)) {
    if (!/^\d{6}$/.test(code)) continue
    const names = Array.isArray(entry?.localities) ? entry.localities.filter((x) => typeof x === 'string' && x.trim()) : []
    for (const name of names.length ? names : [code]) {
      const r = resolveLocality(name)
      const slug = (entry?.area && AREA_BY_SLUG[entry.area] ? entry.area : r?.slug) ?? null
      add(code, { name, code, slug, subArea: r && r.slug === slug ? r.subArea : undefined })
    }
  }
  for (const l of LISTINGS) {
    const code = (l.pincode ?? '').trim()
    if (!/^\d{6}$/.test(code) || !AREA_BY_SLUG[l.area]) continue
    if (m.has(code) && fromFile[code]) continue
    add(code, { name: l.subArea || AREA_BY_SLUG[l.area].heading, code, slug: l.area, subArea: l.subArea })
  }
  for (const [code, locs] of Object.entries(STARTER_PINCODES)) {
    if (fromFile[code]) continue
    for (const loc of locs) add(code, { ...loc, code })
  }
  pinCache = m
  return m
}

/** position for a locality: its sub-area centre, else its area centre */
export function localityPosition(loc: Locality): { lat: number; lng: number } | null {
  if (!loc.slug) return null
  const a = AREA_BY_SLUG[loc.slug]
  const s = a.subAreas.find((x) => x.name === loc.subArea)
  return s ? { lat: s.lat, lng: s.lng } : { lat: a.lat, lng: a.lng }
}
