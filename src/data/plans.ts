import type { AreaSlug } from './types'

/**
 * Itinerary templates from the PujoBLR research document. These are proposed outings,
 * not verified turn-by-turn routes. Anchor ids point at listings in listings.json.
 */
export interface PlanTemplate {
  id: string
  title: string
  description: string
  audience: string
  area: AreaSlug
  anchor?: string // listing id
  extras?: string[] // listing ids suggested after the anchor
  needsConfirmation?: string
}

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'hsr-pujo-day',
    title: 'HSR Pujo Day',
    description: 'Assam Society for puja and bhog, then EISHA nearby for the Chhau dance on 19 October.',
    audience: 'Rituals, families',
    area: 'hsr-layout',
    anchor: 'assam-society',
    extras: ['eisha-chhau'],
  },
  {
    id: 'whitefield-pujo-evening',
    title: 'Whitefield Pujo Evening',
    description: 'Udaan as the anchor, an optional second confirmed venue, then a local dinner.',
    audience: 'East Bengaluru residents',
    area: 'whitefield-hoodi',
    anchor: 'udaan-whitefield',
    extras: ['oh-calcutta-whitefield'],
  },
  {
    id: 'hoodi-community-pujo',
    title: 'Hoodi Community Pujo',
    description: 'BSS rituals, food and the announced cultural programme.',
    audience: 'Hoodi and KR Puram belt',
    area: 'whitefield-hoodi',
    anchor: 'bss-hoodi',
  },
  {
    id: 'koramangala-food-pujo',
    title: 'Koramangala Food & Pujo',
    description: 'Sarathi once its venue is confirmed, then Bhojohori Manna and sweets.',
    audience: 'Food-led outing',
    area: 'koramangala',
    anchor: 'sarathi-koramangala',
    extras: ['bhojohori-manna-koramangala', 'banchharams-btm'],
    needsConfirmation: 'Sarathi has two different published venues. Confirm with the trust before you go.',
  },
  {
    id: 'ulsoor-bengali-dinner',
    title: 'Ulsoor & Bengali Dinner',
    description: 'The Bengalee Association once 2026 is confirmed, then an Indiranagar or Church Street meal.',
    audience: 'First-time visitors',
    area: 'ulsoor',
    anchor: 'bengalee-association',
    extras: ['oh-calcutta-church-street', 'kc-das-st-marks'],
    needsConfirmation: 'Only 2025 information is published for the Bengalee Association so far.',
  },
  {
    id: 'palace-grounds-evening',
    title: 'Palace Grounds Evening',
    description: 'The RT Nagar celebration at Palace Grounds, then an optional central-city dinner.',
    audience: 'North and central Bengaluru',
    area: 'rt-nagar-palace-grounds',
    anchor: 'rt-nagar-trust',
    extras: ['empire-church-street'],
  },
  {
    id: 'south-bengaluru-pujo',
    title: 'South Bengaluru Pujo',
    description: 'KSUC at Bilekahalli as the anchor, with sweets nearby in BTM.',
    audience: 'South Bengaluru residents',
    area: 'south-east',
    anchor: 'ksuc-bilekahalli',
    extras: ['banchharams-btm'],
  },
]

/** Product assumptions from the research document; to be validated by local walkthroughs. */
export const DURATION_RULES = [
  { hours: 3, label: '3 hours', maxCelebrations: 1, includeFood: true, note: 'One celebration plus food.' },
  { hours: 5, label: '5 hours', maxCelebrations: 2, includeFood: true, note: 'One extended celebration, or two nearby stops.' },
  { hours: 10, label: 'Full day', maxCelebrations: 3, includeFood: true, note: 'Two or three venues within a sensible circuit.' },
]
