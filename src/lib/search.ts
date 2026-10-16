import Fuse from 'fuse.js'
import { AREAS, AREA_BY_SLUG, stopIndexOf } from '../data/areas'
import { LISTINGS, countsFor } from '../data/listings'
import type { AreaSlug, Listing, ListingKind, Status } from '../data/types'
import { go } from '../engine/director'
import { useJourney } from '../store/journey'
import { dateRange, plural } from './format'
import { LANDMARKS, norm, pincodeIndex } from './places'

/* ------------------------------------------------------------------ types */

export type ResultGroup = 'area' | 'pandal' | 'event' | 'food' | 'pincode' | 'landmark'

export const GROUP_ORDER: ResultGroup[] = ['area', 'pandal', 'event', 'food', 'pincode', 'landmark']

export const GROUP_LABEL: Record<ResultGroup, string> = {
  area: 'Areas',
  pandal: 'Pandals',
  event: 'Events',
  food: 'Food',
  pincode: 'Pincodes',
  landmark: 'Landmarks',
}

const GROUP_LIMIT: Record<ResultGroup, number> = { area: 5, pandal: 5, event: 4, food: 4, pincode: 8, landmark: 4 }

export type SearchTarget =
  | { type: 'area'; slug: AreaSlug; subArea?: string }
  | { type: 'listing'; id: string; slug: AreaSlug; kind: ListingKind; subArea?: string }

export interface SearchResult {
  key: string
  group: ResultGroup
  label: string
  detail: string
  /** null when the result cannot be visited on the route (shown, but not selectable) */
  target: SearchTarget | null
  status?: Status
}

export interface SearchGroup {
  group: ResultGroup
  label: string
  /** a short line shown above the options, e.g. when one pincode covers several localities */
  notes: string[]
  results: SearchResult[]
}

export { LANDMARKS, pincodeIndex, resolveLocality, localityPosition, type Locality } from './places'

/* ------------------------------------------------------------------ the index */

interface Doc {
  key: string
  group: ResultGroup
  label: string
  detail: string
  target: SearchTarget | null
  status?: Status
  name: string
  alt: string[]
  more: string[]
}

function countsLine(slug: AreaSlug): string {
  const c = countsFor(slug)
  const parts = [
    c.pandal ? plural(c.pandal, 'pandal', 'pandals') : '',
    c.food ? plural(c.food, 'food stop', 'food stops') : '',
    c.event ? plural(c.event, 'event', 'events') : '',
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : 'No listings yet'
}

function listingDetail(l: Listing): string {
  const a = AREA_BY_SLUG[l.area]
  const venue = (l.venueName || '').trim()
  const sub = (l.subArea || '').trim()
  const near = sub || a?.heading || ''
  const place = venue ? (near && !venue.toLowerCase().includes(near.toLowerCase()) ? `${venue}, ${near}` : venue) : near
  const when = l.kind !== 'food' ? dateRange(l.dates) : ''
  return [place, when].filter(Boolean).join(' · ')
}

function kindWords(l: Listing): string[] {
  if (l.kind === 'food') {
    const t = l.foodType === 'mishti' ? ['mishti', 'sweets', 'sweet shop'] : l.foodType === 'bengali' ? ['Bengali food', 'restaurant'] : ['restaurant']
    return ['food', ...t]
  }
  if (l.kind === 'event') return ['event']
  return ['pandal', 'Durga Puja', 'pujo']
}

function buildDocs(): Doc[] {
  const docs: Doc[] = []
  for (const a of AREAS) {
    docs.push({
      key: `area:${a.slug}`,
      group: 'area',
      label: a.heading,
      detail: `${a.region} Bengaluru · ${countsLine(a.slug)}`,
      target: { type: 'area', slug: a.slug },
      name: a.heading,
      alt: [a.shortName, ...a.subAreas.map((s) => s.name)],
      more: [a.signature, a.subtitle],
    })
    for (const s of a.subAreas) {
      if (norm(s.name) === norm(a.heading) || norm(s.name) === norm(a.shortName)) continue
      docs.push({
        key: `sub:${a.slug}:${s.name}`,
        group: 'area',
        label: s.name,
        detail: `In ${a.heading}`,
        target: { type: 'area', slug: a.slug, subArea: s.name },
        name: s.name,
        alt: [],
        more: [],
      })
    }
  }
  for (const l of LISTINGS) {
    if (!l?.id || !l.name || !AREA_BY_SLUG[l.area]) continue
    const kind: ListingKind = l.kind === 'food' || l.kind === 'event' ? l.kind : 'pandal'
    docs.push({
      key: `listing:${l.id}`,
      group: kind,
      label: l.name,
      detail: listingDetail(l),
      target: { type: 'listing', id: l.id, slug: l.area, kind, subArea: l.subArea },
      status: l.status,
      name: l.name,
      alt: [l.organiser, l.venueName, l.subArea].filter((x): x is string => !!x),
      more: [l.address, l.category, ...(l.tags ?? []), ...(l.highlights ?? []), ...kindWords(l)].filter((x): x is string => !!x),
    })
  }
  for (const lm of LANDMARKS) {
    const a = AREA_BY_SLUG[lm.area]
    docs.push({
      key: `landmark:${lm.name}`,
      group: 'landmark',
      label: lm.name,
      detail: `Near ${lm.subArea && lm.subArea !== a.heading ? `${lm.subArea}, ` : ''}${a.heading}`,
      target: { type: 'area', slug: lm.area, subArea: lm.subArea },
      name: lm.name,
      alt: lm.aliases ?? [],
      more: [],
    })
  }
  return docs
}

const wordCache = new WeakMap<Doc, string[]>()
function wordsOf(d: Doc): string[] {
  let w = wordCache.get(d)
  if (!w) {
    w = joinInitials(norm([d.name, ...d.alt, ...d.more].join(' ')).split(' ').filter(Boolean))
    wordCache.set(d, w)
  }
  return w
}

/** "k c das" also reads as "kc das", so initials match however they are typed */
function joinInitials(words: string[]): string[] {
  const out = [...words]
  let run = ''
  for (const w of [...words, '']) {
    if (w.length === 1) run += w
    else {
      if (run.length > 1) out.push(run)
      run = ''
    }
  }
  return out
}

/** optimal string alignment distance (a transposition counts as one edit) */
function osa(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 1; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  return d[m][n]
}

function tokenMatches(t: string, w: string): boolean {
  if (w.startsWith(t)) return true
  if (t.length >= 4 && w.includes(t)) return true
  if (t.length < 6) return false
  const allowed = t.length >= 9 ? 2 : 1
  return osa(t, w) <= allowed || (w.length > t.length && osa(t, w.slice(0, t.length)) <= allowed)
}

let fuse: Fuse<Doc> | null = null
let docs: Doc[] | null = null
function allDocs(): Doc[] {
  if (!docs) docs = buildDocs()
  return docs
}
function getFuse(): Fuse<Doc> {
  if (!fuse) {
    fuse = new Fuse(allDocs(), {
      includeScore: true,
      ignoreLocation: true,
      threshold: 0.32,
      minMatchCharLength: 2,
      keys: [
        { name: 'name', weight: 3 },
        { name: 'alt', weight: 2 },
        { name: 'more', weight: 0.8 },
      ],
    })
  }
  return fuse
}

function pincodeGroup(q: string): SearchGroup | null {
  const digits = q.replace(/\s+/g, '')
  if (!/^\d{3,6}$/.test(digits)) return null
  const idx = pincodeIndex()
  const codes = [...idx.keys()].filter((c) => c.startsWith(digits)).sort()
  if (!codes.length) return null
  const results: SearchResult[] = []
  const notes: string[] = []
  for (const code of codes) {
    const locs = idx.get(code) ?? []
    if (locs.length > 1) notes.push(`${code} covers ${locs.length} localities. Pick the one you mean.`)
    for (const loc of locs) {
      const a = loc.slug ? AREA_BY_SLUG[loc.slug] : null
      results.push({
        key: `pin:${code}:${loc.name}`,
        group: 'pincode',
        label: loc.name,
        detail: a ? `${code} · ${loc.subArea && loc.subArea !== a.heading && norm(loc.subArea) !== norm(loc.name) ? `${loc.subArea}, ` : ''}${a.heading}` : `${code} · not on our route yet`,
        target: loc.slug ? { type: 'area', slug: loc.slug, subArea: loc.subArea } : null,
      })
    }
  }
  return { group: 'pincode', label: GROUP_LABEL.pincode, notes: notes.slice(0, 2), results: results.slice(0, GROUP_LIMIT.pincode) }
}

/** grouped results in a fixed order: Areas, Pandals, Events, Food, Pincodes, Landmarks */
export function search(query: string): SearchGroup[] {
  const q = query.trim()
  if (q.length < 2) return []
  const groups: SearchGroup[] = []
  const pin = pincodeGroup(q)
  if (pin) {
    // a full pincode also brings up listings published with that pincode
    const code = q.replace(/\s+/g, '')
    if (code.length === 6) {
      const by = new Map<ResultGroup, SearchResult[]>()
      for (const l of LISTINGS) {
        if (l?.pincode?.trim() !== code || !AREA_BY_SLUG[l.area]) continue
        const kind: ListingKind = l.kind === 'food' || l.kind === 'event' ? l.kind : 'pandal'
        const list = by.get(kind) ?? []
        list.push({
          key: `listing:${l.id}`,
          group: kind,
          label: l.name,
          detail: listingDetail(l),
          target: { type: 'listing', id: l.id, slug: l.area, kind, subArea: l.subArea },
          status: l.status,
        })
        by.set(kind, list)
      }
      for (const g of GROUP_ORDER) {
        const results = by.get(g)
        if (results?.length) groups.push({ group: g, label: GROUP_LABEL[g], notes: [], results: results.slice(0, GROUP_LIMIT[g]) })
      }
    }
    return [pin, ...groups]
  }
  if (/^\d+$/.test(q)) return []
  let hits = getFuse().search(q, { limit: 60 })
  // when some results contain every word typed (allowing a small typo), keep only those,
  // so "sarathi" does not bring up Marathahalli and "jp nagar" does not bring up RT Nagar
  const tokens = (() => {
    const raw = norm(q).split(' ').filter(Boolean)
    const joined = joinInitials(raw).filter((x) => !raw.includes(x))
    // typed as "k c das": match on the joined initials instead of single letters
    return joined.length ? [...joined, ...raw.filter((x) => x.length > 1)] : raw
  })()
  const allMatch = (d: Doc) => tokens.every((t) => wordsOf(d).some((w) => tokenMatches(t, w)))
  if (!hits.length) hits = allDocs().filter(allMatch).map((item, refIndex) => ({ item, refIndex, score: 0.1 }))
  if (!hits.length) return []
  const strong = hits.filter((h) => allMatch(h.item))
  const pool = strong.length ? strong : hits.filter((h) => (h.score ?? 1) <= 0.3)
  const nq = norm(q)
  const by = new Map<ResultGroup, SearchResult[]>()
  const bestOf = new Map<ResultGroup, number>()
  const seenArea = new Set<string>()
  for (const h of pool) {
    const d = h.item
    const sc = h.score ?? 1
    const exactish = [d.name, ...d.alt].some((x) => norm(x).includes(nq))
    // a sub-area or landmark that resolves to an area already listed adds nothing new
    if (d.group === 'area' && d.target) {
      const k = `${d.target.slug}:${d.target.type === 'area' ? d.target.subArea ?? '' : ''}`
      if (seenArea.has(k)) continue
      seenArea.add(k)
    }
    const list = by.get(d.group) ?? []
    if (list.length >= GROUP_LIMIT[d.group]) continue
    list.push({ key: d.key, group: d.group, label: d.label, detail: d.detail, target: d.target, status: d.status })
    by.set(d.group, list)
    bestOf.set(d.group, Math.min(bestOf.get(d.group) ?? 1, exactish ? Math.min(sc, 0.05) : sc))
  }
  // groups keep their fixed order, except that the group holding the strongest match leads
  const lead = [...bestOf.entries()].sort((a, b) => a[1] - b[1])[0]?.[0]
  const order = lead ? [lead, ...GROUP_ORDER.filter((g) => g !== lead)] : GROUP_ORDER
  for (const g of order) {
    const results = by.get(g)
    if (results?.length) groups.push({ group: g, label: GROUP_LABEL[g], notes: [], results })
  }
  return groups
}

/** every area on the route, for an empty search */
export function allAreaResults(): SearchGroup {
  return {
    group: 'area',
    label: 'Areas on the route',
    notes: [],
    results: AREAS.map((a) => ({
      key: `area:${a.slug}`,
      group: 'area' as const,
      label: a.heading,
      detail: `${a.region} Bengaluru · ${countsLine(a.slug)}`,
      target: { type: 'area' as const, slug: a.slug },
    })),
  }
}

export function noResultsMessage(q: string): string {
  return `No matches for "${q.trim()}". Try an area like HSR Layout or a pincode like 560102.`
}

/* ------------------------------------------------------------------ acting on a result */

let highlightTimer: ReturnType<typeof setTimeout> | undefined

/** close the search, drive to the area, and open the listing's detail when the result is a listing */
export async function goToTarget(t: SearchTarget): Promise<void> {
  const st = useJourney.getState()
  if (st.searchOpen) st.setSearchOpen(false)
  const idx = stopIndexOf(t.slug)
  if (idx < 0) return
  st.setHighlight(t.slug)
  clearTimeout(highlightTimer)
  highlightTimer = setTimeout(() => {
    if (useJourney.getState().highlight === t.slug) useJourney.getState().setHighlight(null)
  }, 5000)
  await go(idx)
  if (t.type === 'listing') {
    useJourney.getState().openPanel({ tab: t.kind, detailId: t.id, subArea: t.subArea ?? null })
  }
}
