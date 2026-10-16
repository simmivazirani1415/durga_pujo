import { AREA_BY_SLUG, distanceKm } from '../data/areas'
import { LISTINGS, LISTING_BY_ID, STATUS_LABEL } from '../data/listings'
import { DURATION_RULES, PLAN_TEMPLATES, type PlanTemplate } from '../data/plans'
import type { AreaSlug, Listing } from '../data/types'
import { TRANSPORT_LABEL, approxPosition, canRoute, directionsUrl, mapsPlace, roadKm, routeUrl, travelMinutes, type LatLng, type Transport } from './directions'
import { aboutMinutes, clock, clockRange, dateRange, dateWithDay, durationLabel, festivalDays, openOn, parseTimeRange, plainName, toISODate } from './format'
import { localityPosition } from './places'

/**
 * The planner follows the research document's sequence:
 *  1. find celebrations open on the chosen date (no published dates: kept, with a warning)
 *  2. choose one anchor by interests and closeness to the start (published 2026 first)
 *  3. reserve time for the chosen activity (Pushpanjali, bhog, evening programme) from published schedules
 *  4. add a food stop near the anchor, and a second celebration only if it is close and time allows
 *  5. order by nearest neighbour, add the trip home plus a 20% delay buffer
 *  6. explain each stop in one line, and offer a shorter version
 * Every travel time is an estimate from straight-line distance; nothing here calls a routing service.
 */

/* ------------------------------------------------------------------ inputs */

export type Interest = 'pandals' | 'anjali' | 'food' | 'cultural'
export const INTERESTS: Interest[] = ['pandals', 'anjali', 'food', 'cultural']
export const INTEREST_LABEL: Record<Interest, string> = {
  pandals: 'Pandals & rituals',
  anjali: 'Anjali & bhog',
  food: 'Food & mishti',
  cultural: 'Cultural evenings',
}

export type Pace = 'relaxed' | 'hopping'
export const PACE_LABEL: Record<Pace, string> = { relaxed: 'Relaxed', hopping: 'Hopping' }

export const TRANSPORTS: Transport[] = ['auto', 'metro', 'cab', 'own']

export type StartPoint =
  | { kind: 'area'; slug: AreaSlug; subArea?: string }
  | { kind: 'pincode'; code: string; name: string; slug: AreaSlug; subArea?: string }

export interface PlanInputs {
  date: string
  start: StartPoint | null
  hours: number
  interests: Interest[]
  transport: Transport
  pace: Pace
  shortTransfers: boolean
  vegetarian: boolean
}

export function defaultInputs(currentArea?: AreaSlug | null): PlanInputs {
  const days = festivalDays()
  const today = toISODate(new Date())
  const date = days.find((d) => d.date >= today)?.date ?? days[0]?.date ?? today
  return {
    date,
    start: currentArea ? { kind: 'area', slug: currentArea } : null,
    hours: DURATION_RULES[1]?.hours ?? 5,
    interests: ['pandals', 'food'],
    transport: 'auto',
    pace: 'relaxed',
    shortTransfers: false,
    vegetarian: false,
  }
}

const INPUTS_KEY = 'pujoblr.planner.v1'

export function loadInputs(): Partial<PlanInputs> | null {
  try {
    const raw = localStorage.getItem(INPUTS_KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    if (!v || typeof v !== 'object') return null
    const out: Partial<PlanInputs> = {}
    if (typeof v.date === 'string' && festivalDays().some((d) => d.date === v.date)) out.date = v.date
    if (v.start && typeof v.start === 'object' && AREA_BY_SLUG[v.start.slug as AreaSlug]) out.start = v.start
    if (DURATION_RULES.some((r) => r.hours === v.hours)) out.hours = v.hours
    if (Array.isArray(v.interests)) out.interests = v.interests.filter((x: unknown) => INTERESTS.includes(x as Interest))
    if (TRANSPORTS.includes(v.transport)) out.transport = v.transport
    if (v.pace === 'relaxed' || v.pace === 'hopping') out.pace = v.pace
    if (typeof v.shortTransfers === 'boolean') out.shortTransfers = v.shortTransfers
    if (typeof v.vegetarian === 'boolean') out.vegetarian = v.vegetarian
    return out
  } catch {
    return null
  }
}

export function saveInputs(i: PlanInputs) {
  try {
    localStorage.setItem(INPUTS_KEY, JSON.stringify(i))
  } catch {
    /* storage unavailable: inputs live for this visit only */
  }
}

/* ------------------------------------------------------------------ start point */

export interface StartInfo {
  label: string
  query: string
  pos: LatLng
}

export function startInfo(s: StartPoint): StartInfo | null {
  const area = AREA_BY_SLUG[s.slug]
  if (!area) return null
  if (s.kind === 'pincode') {
    const pos = localityPosition({ name: s.name, code: s.code, slug: s.slug, subArea: s.subArea })
    if (!pos) return null
    return { label: `${s.name} (${s.code})`, query: `${s.name}, Bengaluru ${s.code}`, pos }
  }
  const sub = s.subArea ? area.subAreas.find((x) => x.name === s.subArea) : null
  const label = sub?.name ?? area.heading
  return { label, query: `${label.replace(/ & /g, ' and ')}, Bengaluru`, pos: sub ? { lat: sub.lat, lng: sub.lng } : { lat: area.lat, lng: area.lng } }
}

/* ------------------------------------------------------------------ activities */

export type ActivityType = 'anjali' | 'bhog' | 'programme' | 'ritual' | 'event'

export interface Activity {
  label: string
  /** as published, e.g. "11 am", "1–3 pm" */
  time?: string
  start?: number
  end?: number
  type: ActivityType
  /** time is set aside for it in the plan */
  reserved: boolean
  /** bhog access, or "optional" for template extras */
  note?: string
  sourceId?: string
}

function classify(text: string): ActivityType {
  if (/anjali/i.test(text)) return 'anjali'
  if (/bhog/i.test(text)) return 'bhog'
  if (/arati|aarti|programme|program|performance|cultural|music|dance|concert|theatre|drama|recital/i.test(text)) return 'programme'
  if (/puja|bodhan|sandhi|kumari|sindoor|kalash|adhivaash|aamontron|visarjan|idol|lamp/i.test(text)) return 'ritual'
  return 'event'
}

const INTEREST_TYPES: Record<Interest, ActivityType[]> = {
  pandals: ['anjali', 'ritual'],
  anjali: ['anjali', 'bhog'],
  // bhog is the celebration's own meal, so food lovers get it too (it is never mixed with restaurant food)
  food: ['bhog'],
  cultural: ['programme', 'event'],
}

const TYPE_VALUE: Record<ActivityType, number> = { anjali: 3, bhog: 3, programme: 3, event: 2, ritual: 1 }

function normLabel(s: string) {
  return s.toLowerCase().replace(/[^a-z]+/g, ' ').trim()
}

function relatedEvents(id: string): Listing[] {
  return LISTINGS.filter((e) => e?.kind === 'event' && e.relatedTo === id)
}

/** everything published for this celebration on this date, earliest first */
export function activitiesOn(l: Listing, date: string): Activity[] {
  const out: Activity[] = []
  const push = (a: Omit<Activity, 'reserved' | 'start' | 'end'>) => {
    const r = parseTimeRange(a.time)
    const act: Activity = { ...a, reserved: false, start: r?.start, end: r?.end }
    const dup = out.find(
      (x) =>
        (x.type === act.type && x.start != null && x.start === act.start) ||
        normLabel(x.label) === normLabel(act.label) ||
        (x.type === 'bhog' && act.type === 'bhog'),
    )
    if (dup) {
      if (!dup.note && act.note) dup.note = act.note
      if (!dup.sourceId && act.sourceId) dup.sourceId = act.sourceId
      return
    }
    out.push(act)
  }
  for (const s of Array.isArray(l.schedule) ? l.schedule : []) {
    if (s?.date === date && s.activity) push({ label: s.activity, time: s.time, type: classify(s.activity) })
  }
  if (l.bhog && (l.bhog.date === date || (!l.bhog.date && openOn(l.dates, date)))) {
    push({ label: 'Bhog', time: l.bhog.time, type: 'bhog', note: l.bhog.access })
  }
  for (const e of relatedEvents(l.id)) {
    if (openOn(e.dates, date)) push({ label: e.name, time: e.timings, type: classify(`${e.name} ${e.category ?? ''}`), sourceId: e.id })
  }
  if (l.kind === 'event' && openOn(l.dates, date)) push({ label: l.name, time: l.timings, type: classify(`${l.name} ${l.category ?? ''}`), sourceId: l.id })
  return out.sort((a, b) => (a.start ?? 9999) - (b.start ?? 9999))
}

/** dates (other than `date`) with published activities that match the interests */
function otherActivityDates(l: Listing, date: string, interests: Interest[]): string[] {
  const types = new Set(interests.flatMap((i) => INTEREST_TYPES[i]))
  const dates = new Set<string>()
  for (const s of Array.isArray(l.schedule) ? l.schedule : []) {
    if (s?.date && s.date !== date && types.has(classify(s.activity ?? '')) && parseTimeRange(s.time)) dates.add(s.date)
  }
  for (const e of relatedEvents(l.id)) {
    if (e.dates?.start && e.dates.start !== date && types.has(classify(e.name)) && parseTimeRange(e.timings)) dates.add(e.dates.start)
  }
  return [...dates].sort()
}

function lead(t: ActivityType) {
  return t === 'anjali' ? 15 : 10
}

function reserveEnd(a: Activity, pace: Pace, hours: number): number {
  const s = a.start ?? 0
  const span = a.end != null && a.end > s ? a.end - s : undefined
  switch (a.type) {
    case 'anjali':
      return s + 45
    case 'bhog':
      return s + Math.min(span ?? 60, 60)
    case 'programme': {
      const cap = hours >= 10 ? 180 : pace === 'relaxed' ? 150 : 90
      return s + Math.min(span ?? cap, cap)
    }
    case 'event':
      return s + Math.min(span ?? 90, 120)
    default:
      return s + 45
  }
}

/* ------------------------------------------------------------------ plan types */

export interface Leg {
  minutes: number
  km: number
  mode: Transport
  /** at least one end is an area centre, not an exact venue position */
  approx: boolean
}

export interface PlanStop {
  key: string
  listing: Listing
  role: 'celebration' | 'food'
  /** saved by the visitor or part of the chosen ready plan */
  required: boolean
  activities: Activity[]
  /** arrival needed for the first reserved activity (minutes after midnight) */
  arriveBy?: number
  stay: number
  /** the stay can shrink to this when the plan runs over (e.g. watch only the first hour of a programme) */
  minStay: number
  pos: LatLng
  exactPos: boolean
  why: string
  warnings: string[]
  notes: string[]
  /** another festival date with published timings that match, offered as a one-tap switch */
  altDate?: string
  /* filled by schedule() */
  arrive: number
  depart: number
  /** spare minutes before the first reserved activity */
  spare: number
  late: boolean
  leg: Leg
}

export interface Plan {
  inputs: PlanInputs
  templateId: string | null
  shorter: boolean
  start: StartInfo
  startTime: number
  stops: PlanStop[]
  home: Leg
  homeArrive: number
  buffer: number
  end: number
  total: number
  budget: number
  /** plan-level warnings, in plain words */
  warnings: string[]
  notes: string[]
  routeUrl: string | null
  routeSkipped: number
}

export type PlanResult = { ok: true; plan: Plan } | { ok: false; reason: string }

/* ------------------------------------------------------------------ helpers */

function ruleFor(hours: number) {
  return DURATION_RULES.find((r) => r.hours === hours) ?? DURATION_RULES[DURATION_RULES.length - 1]
}

const STATUS_RANK: Record<string, number> = { 'published-2026': 0, 'awaiting-confirmation': 1, listed: 1, 'previous-year': 2 }

function isCelebration(l: Listing): boolean {
  if (l.kind === 'pandal') return true
  return l.kind === 'event' && !(l.relatedTo && LISTING_BY_ID[l.relatedTo])
}

function short(l: Listing): string {
  const n = plainName(l.organiser) || l.name
  return n.length > 38 ? l.name.replace(/\s+Durga Puja$/i, '') : n
}

function foodStay(l: Listing, pace: Pace): number {
  switch (l.foodType) {
    case 'mishti':
      return 25
    case 'bengali':
    case 'late-night':
      return pace === 'relaxed' ? 75 : 60
    default:
      return 45
  }
}

function foodWord(l: Listing): string {
  switch (l.foodType) {
    case 'mishti':
      return 'Bengali sweets'
    case 'bengali':
      return 'A Bengali meal'
    case 'late-night':
      return 'A late dinner'
    default:
      return 'A local favourite'
  }
}

function statusWarning(l: Listing): string | null {
  if (l.kind === 'food') return null
  if (l.status === 'published-2026') return null
  const note = l.statusNote ? ` ${l.statusNote}` : ''
  return `${STATUS_LABEL[l.status] ?? 'Not confirmed'}.${note}`
}

function legBetween(a: { pos: LatLng; exact: boolean }, b: { pos: LatLng; exact: boolean }, mode: Transport, sameVenue = false): Leg {
  const approx = !a.exact || !b.exact
  let minutes = travelMinutes(a.pos, b.pos, mode)
  // positions taken from a neighbourhood centre say nothing about the last stretch; never show less than 10 min
  if (approx && !sameVenue) minutes = Math.max(minutes, mode === 'metro' ? 15 : 10)
  return { minutes: sameVenue ? 0 : minutes, km: roadKm(a.pos, b.pos), mode, approx }
}

function sameVenue(a: Listing, b: Listing): boolean {
  if (a.id === b.id || a.relatedTo === b.id || b.relatedTo === a.id) return true
  const va = (a.address || a.venueName || '').trim().toLowerCase()
  return !!va && va === (b.address || b.venueName || '').trim().toLowerCase()
}

function round5(n: number) {
  return Math.round(n / 5) * 5
}

/* ------------------------------------------------------------------ scheduling */

/** Times every stop in the given order. Used when a plan is built, reordered or edited. */
export function schedule(base: Omit<Plan, 'startTime' | 'home' | 'homeArrive' | 'buffer' | 'end' | 'total' | 'routeUrl' | 'routeSkipped'>): Plan {
  const { inputs, start } = base
  const mode = inputs.transport
  const origin = { pos: start.pos, exact: false }
  const stops = base.stops.map((s) => ({ ...s }))
  let prev = origin
  let prevListing: Listing | null = null
  for (const s of stops) {
    s.leg = legBetween(prev, { pos: s.pos, exact: s.exactPos }, mode, !!prevListing && sameVenue(prevListing, s.listing))
    prev = { pos: s.pos, exact: s.exactPos }
    prevListing = s.listing
  }
  const home = legBetween(prev, origin, mode)

  // start time: early enough for every reserved activity, else a sensible default
  let t0: number | null = null
  let cum = 0
  for (const s of stops) {
    cum += s.leg.minutes
    if (s.arriveBy != null) {
      const cand = s.arriveBy - cum
      t0 = t0 == null ? cand : Math.min(t0, cand)
    }
    cum += s.stay
  }
  if (t0 == null) {
    const i = inputs.interests
    t0 = inputs.hours >= 10 || i.includes('anjali') ? 600 : i.includes('cultural') ? (inputs.hours >= 5 ? 840 : 990) : inputs.hours >= 5 ? 780 : 960
  }
  t0 = Math.floor(t0 / 5) * 5

  let t = t0
  for (const s of stops) {
    t += s.leg.minutes
    s.arrive = t
    s.late = false
    s.spare = 0
    if (s.arriveBy != null) {
      if (t > s.arriveBy) s.late = true
      else s.spare = s.arriveBy - t
      s.depart = Math.max(t, s.arriveBy) + s.stay
    } else s.depart = t + s.stay
    t = s.depart
  }
  const travel = stops.reduce((n, s) => n + s.leg.minutes, 0) + home.minutes
  const buffer = travel > 0 ? Math.max(10, Math.ceil((travel * 0.2) / 5) * 5) : 0
  const homeArrive = t + home.minutes
  const end = homeArrive + buffer
  const routable = stops.filter((s) => canRoute(s.listing))
  const url = routeUrl(start.query, routable.map((s) => mapsPlace(s.listing)!), start.query)
  return {
    ...base,
    stops,
    startTime: t0,
    home,
    homeArrive,
    buffer,
    end,
    total: end - t0,
    routeUrl: routable.length ? url : null,
    routeSkipped: stops.length - routable.length,
  }
}

/** after the visitor reorders or removes stops */
export function reschedule(plan: Plan, stops: PlanStop[]): Plan {
  return schedule({ ...plan, stops })
}

/* ------------------------------------------------------------------ building a plan */

export interface BuildOptions {
  picks?: string[]
  template?: PlanTemplate | null
  /** shortest useful outing: one celebration and one activity */
  minimal?: boolean
  /** marks the plan as the shorter alternative */
  shorter?: boolean
}

const TEMPLATE_INTERESTS: Record<string, Interest[]> = {
  'hsr-pujo-day': ['anjali', 'pandals', 'cultural'],
  'whitefield-pujo-evening': ['cultural', 'food'],
  'hoodi-community-pujo': ['pandals', 'cultural', 'food'],
  'koramangala-food-pujo': ['food', 'pandals'],
  'ulsoor-bengali-dinner': ['pandals', 'food'],
  'palace-grounds-evening': ['cultural', 'food'],
  'south-bengaluru-pujo': ['pandals', 'food'],
}

export function templateInterests(t: PlanTemplate): Interest[] {
  if (TEMPLATE_INTERESTS[t.id]) return TEMPLATE_INTERESTS[t.id]
  const s = `${t.title} ${t.description}`.toLowerCase()
  const out: Interest[] = ['pandals']
  if (/anjali|bhog/.test(s)) out.push('anjali')
  if (/food|dinner|meal|sweet/.test(s)) out.push('food')
  if (/evening|cultural|programme/.test(s)) out.push('cultural')
  return out
}

export function templates(): PlanTemplate[] {
  return PLAN_TEMPLATES.filter((t) => t && t.id && AREA_BY_SLUG[t.area])
}

export function buildPlan(inputsIn: PlanInputs, opts: BuildOptions = {}): PlanResult {
  const template = opts.template ?? null
  const inputs: PlanInputs = {
    ...inputsIn,
    interests: template ? templateInterests(template) : inputsIn.interests.length ? inputsIn.interests : ['pandals', 'food'],
  }
  const startPoint: StartPoint | null = inputs.start ?? (template ? { kind: 'area', slug: template.area } : null)
  if (!startPoint) return { ok: false, reason: 'Choose where you are starting from, by area or pincode.' }
  const start = startInfo(startPoint)
  if (!start) return { ok: false, reason: 'We could not place that starting point. Try choosing an area instead.' }
  const { date, transport: mode, pace, shortTransfers } = inputs
  const rule = ruleFor(inputs.hours)
  const budget = rule.hours * 60
  const minimal = !!opts.minimal
  const maxCelebs = minimal ? 1 : Math.max(1, pace === 'relaxed' ? rule.maxCelebrations - 1 : rule.maxCelebrations)
  const origin = { pos: start.pos, exact: false }
  const interestTypes = new Set(inputs.interests.flatMap((i) => INTEREST_TYPES[i]))
  const planWarnings: string[] = []
  const notes: string[] = []

  /* --- required stops: the visitor's saved picks and the chosen ready plan */
  const pickIds = (opts.picks ?? []).filter((id) => LISTING_BY_ID[id])
  const reqCelebs: Listing[] = []
  const reqFood: Listing[] = []
  const forcedActs = new Map<string, Set<string>>() // celebration id -> event ids to reserve
  const optionalActs = new Map<string, Set<string>>() // template extras: reserve only if they fit
  const addReq = (id: string, optional = false) => {
    const l = LISTING_BY_ID[id]
    if (!l) return
    if (l.kind === 'food') {
      if (!reqFood.includes(l)) reqFood.push(l)
      return
    }
    if (l.kind === 'event' && l.relatedTo && LISTING_BY_ID[l.relatedTo]) {
      const parent = LISTING_BY_ID[l.relatedTo]
      if (!reqCelebs.includes(parent)) reqCelebs.push(parent)
      const m = optional ? optionalActs : forcedActs
      m.set(parent.id, (m.get(parent.id) ?? new Set()).add(l.id))
      return
    }
    if (!reqCelebs.includes(l)) reqCelebs.push(l)
  }
  if (template) {
    if (template.anchor) addReq(template.anchor)
    for (const x of template.extras ?? []) addReq(x, true)
  }
  pickIds.forEach((id) => addReq(id))

  /* --- 1. celebrations open on the date */
  const open = LISTINGS.filter(
    (l) => l && isCelebration(l) && AREA_BY_SLUG[l.area] && (openOn(l.dates, date) !== false || activitiesOn(l, date).length > 0),
  )
  const posOf = (l: Listing) => {
    const p = approxPosition(l)
    return { pos: p.pos, exact: p.exact }
  }

  const travelFromStart = (l: Listing) => travelMinutes(start.pos, posOf(l).pos, mode)
  const score = (l: Listing) => {
    let s = travelFromStart(l) * (shortTransfers ? 1.6 : 1)
    s += l.status === 'published-2026' ? 0 : l.status === 'previous-year' ? 75 : 45
    if (!l.directionsEnabled) s += 150
    if (openOn(l.dates, date) === undefined) s += 25
    const acts = activitiesOn(l, date).filter((a) => interestTypes.has(a.type))
    s -= Math.min(75, acts.length * 25)
    const tags = (l.tags ?? []).join(' ').toLowerCase()
    if (inputs.interests.includes('pandals') && /ritual/.test(tags)) s -= 10
    if (inputs.interests.includes('cultural') && (l.programmes?.length || /cultur/.test(tags))) s -= 10
    return s
  }

  /* --- 2. the anchor */
  let anchor: Listing | undefined = reqCelebs[0]
  if (!anchor) {
    anchor = [...open].sort((a, b) => score(a) - score(b))[0]
  }
  if (!anchor && !reqFood.length) {
    return { ok: false, reason: `No celebrations are listed as open on ${dateWithDay(date)} yet. Try another day.` }
  }

  /* --- 3. reserve time at each celebration */
  const celebrationStop = (l: Listing, role: 'anchor' | 'second' | 'saved', budgetLeft: number): PlanStop => {
    const p = posOf(l)
    const all = activitiesOn(l, date)
    const forced = forcedActs.get(l.id) ?? new Set<string>()
    const optional = optionalActs.get(l.id) ?? new Set<string>()
    const candidates = all.filter(
      (a) => a.start != null && (interestTypes.has(a.type) || (a.sourceId && (forced.has(a.sourceId) || optional.has(a.sourceId)))),
    )
    const span = (set: Activity[]) => {
      if (!set.length) return 0
      const first = set[0]
      const from = first.start! - lead(first.type)
      const to = Math.max(...set.map((a) => reserveEnd(a, pace, rule.hours)))
      return to - from
    }
    const value = (set: Activity[]) => set.reduce((n, a) => n + TYPE_VALUE[a.type] + (a.sourceId && forced.has(a.sourceId) ? 10 : 0), 0)
    let best: Activity[] = []
    if (candidates.length) {
      const n = Math.min(candidates.length, 5)
      const limit = minimal ? 1 : n
      let bestV = -1
      let bestSpan = Infinity
      for (let mask = 1; mask < 1 << n; mask++) {
        const set = candidates.slice(0, n).filter((_, i) => mask & (1 << i))
        if (set.length > limit) continue
        const sp = span(set)
        const v = value(set)
        const fits = sp <= budgetLeft
        // prefer sets that fit; among them the most valuable, then the shortest
        const key = (fits ? 1000 : 0) + v
        const bestKey = (bestSpan <= budgetLeft ? 1000 : 0) + bestV
        if (key > bestKey || (key === bestKey && sp < bestSpan)) {
          best = set
          bestV = v
          bestSpan = sp
        }
      }
    }
    const reservedSet = new Set(best)
    // something the visitor saved for this date stays visible as a reason to go, even without a published time
    for (const a of all) if (a.start == null && a.sourceId && forced.has(a.sourceId)) reservedSet.add(a)
    const activities = all.map((a) => ({
      ...a,
      reserved: reservedSet.has(a),
      note: a.note ?? (a.sourceId && optional.has(a.sourceId) && !reservedSet.has(a) ? 'Optional' : undefined),
    }))
    const warnings: string[] = []
    const stopNotes: string[] = []
    const sw = statusWarning(l)
    if (sw) warnings.push(sw)
    const on = openOn(l.dates, date)
    let altDate: string | undefined
    if (on === undefined) warnings.push('Dates not confirmed. Check with the organiser before you go.')
    else if (on === false && !all.length) warnings.push(`Published dates are ${dateRange(l.dates)}, so it may not be on during ${dateWithDay(date)}.`)
    else if (on === false) stopNotes.push(`The main celebration runs ${dateRange(l.dates)}. On ${dateWithDay(date)} only what is listed here is published.`)
    if (!l.directionsEnabled) warnings.push('Venue not confirmed, so there are no directions for this stop.')
    for (const id of forced) {
      const e = LISTING_BY_ID[id]
      if (e && openOn(e.dates, date) === false) {
        warnings.push(`${e.name} is on ${dateWithDay(e.dates!.start)}, not your chosen date.`)
        altDate = altDate ?? e.dates!.start
      }
      else if (e && !parseTimeRange(e.timings)) stopNotes.push(`${e.name}: start time not published yet.`)
    }
    const savedToday = [...forced].some((id) => openOn(LISTING_BY_ID[id]?.dates, date) === true)
    if (!best.length && !savedToday) {
      const other = otherActivityDates(l, date, inputs.interests)
      if (other.length) {
        stopNotes.push(`Timings that match your interests are published for ${other.map(dateWithDay).join(', ')}.`)
        altDate = altDate ?? other[0]
      }
      else if (!all.some((a) => a.start != null)) stopNotes.push('Daily timings are not published here yet. Check with the organiser.')
    }
    let stay: number
    let minStay: number
    let arriveBy: number | undefined
    if (best.length) {
      arriveBy = best[0].start! - lead(best[0].type)
      stay = span(best)
      // a long programme can be cut to its first hour; rituals and bhog keep their slot
      const first = best[0].start! - lead(best[0].type)
      const minEnd = Math.max(
        ...best.map((a) => ((a.type === 'programme' || a.type === 'event') && a.end != null ? Math.min(reserveEnd(a, pace, rule.hours), (a.start ?? 0) + 60) : reserveEnd(a, pace, rule.hours))),
      )
      minStay = Math.min(stay, minEnd - first)
    } else {
      if (minimal) stay = pace === 'relaxed' ? 60 : 45
      else if (rule.hours >= 10) stay = pace === 'relaxed' ? 150 : 105
      else stay = pace === 'relaxed' ? 90 : 60
      if (role === 'anchor' && !minimal && rule.hours >= 5 && rule.hours < 10 && maxCelebs === 1) stay += 30
      minStay = 45
    }
    const tFrom = travelFromStart(l)
    const parts: string[] = []
    const savedChild = [...forced].map((id) => LISTING_BY_ID[id]).find(Boolean)
    if (role === 'saved')
      parts.push(
        template && (template.anchor === l.id || template.extras?.includes(l.id))
          ? `Part of the ${template.title} plan`
          : savedChild && !pickIds.includes(l.id)
            ? `You saved ${savedChild.name}`
            : 'You saved this',
      )
    else if (role === 'second') parts.push(l.status === 'published-2026' ? 'A second confirmed celebration close by' : 'A second celebration close by')
    else parts.push(l.status === 'published-2026' ? 'Published for 2026' : `The closest match, though ${(STATUS_LABEL[l.status] ?? '').toLowerCase()}`)
    if (role !== 'second') parts.push(tFrom ? `${aboutMinutes(tFrom)} from ${start.label}` : `right by ${start.label}`)
    let why = parts.join(', ')
    if (best.length) {
      why += `. ${best
        .map((a) => `${a.type === 'bhog' ? 'Bhog' : a.label} ${a.time ? (/^\d/.test(a.time) ? `at ${a.time}` : `(${a.time})`) : ''}`.trim())
        .join(' and ')} on your date`
    }
    return {
      key: `c:${l.id}`,
      listing: l,
      role: 'celebration',
      required: role === 'saved',
      activities,
      arriveBy,
      stay,
      minStay: Math.min(stay, minStay),
      pos: p.pos,
      exactPos: p.exact,
      why: `${why}.`,
      warnings,
      notes: stopNotes,
      altDate: altDate && festivalDays().some((d) => d.date === altDate) ? altDate : undefined,
      arrive: 0,
      depart: 0,
      spare: 0,
      late: false,
      leg: { minutes: 0, km: 0, mode, approx: true },
    }
  }

  const foodStop = (l: Listing, near: Listing | null, required: boolean): PlanStop => {
    const p = posOf(l)
    const ref = near ? posOf(near).pos : start.pos
    const min = travelMinutes(ref, p.pos, mode)
    const where = near ? short(near) : start.label
    const why = required
      ? `${template && template.extras?.includes(l.id) ? `Part of the ${template.title} plan` : 'You saved this'}${min ? `, ${aboutMinutes(min)} from ${where}` : ''}.`
      : `${foodWord(l)} ${min ? `${aboutMinutes(min)} from ${where}` : `right by ${where}`}.`
    const stopNotes: string[] = []
    if (l.statusNote) stopNotes.push(l.statusNote)
    const warnings: string[] = []
    if (!canRoute(l)) warnings.push('No confirmed address, so there are no directions for this stop.')
    return {
      key: `f:${l.id}`,
      listing: l,
      role: 'food',
      required,
      activities: (l.highlights ?? []).length
        ? [{ label: `Things to try (menus vary): ${(l.highlights ?? []).slice(0, 3).join(', ')}`, type: 'event', reserved: false }]
        : [],
      stay: foodStay(l, pace),
      minStay: l.foodType === 'mishti' ? 20 : 45,
      pos: p.pos,
      exactPos: p.exact,
      why,
      warnings,
      notes: stopNotes,
      arrive: 0,
      depart: 0,
      spare: 0,
      late: false,
      leg: { minutes: 0, km: 0, mode, approx: true },
    }
  }

  const homeTrip = (l: Listing) => travelMinutes(start.pos, posOf(l).pos, mode)
  const celebs: PlanStop[] = []
  const reqCelebStops: PlanStop[] = []
  if (anchor) {
    const travelBudget = homeTrip(anchor) * 2 * 1.2
    const foodReserve = rule.includeFood && !minimal ? 45 : 0
    const left = budget - travelBudget - foodReserve
    const isReq = reqCelebs.includes(anchor)
    celebs.push(celebrationStop(anchor, isReq ? 'saved' : 'anchor', left))
    for (const l of reqCelebs.slice(1)) {
      const s = celebrationStop(l, 'saved', left / 2)
      celebs.push(s)
      reqCelebStops.push(s)
    }
    const far = [...reqCelebs.slice(1), ...reqFood].filter((l) => distanceKm(posOf(anchor!).pos, posOf(l).pos) > 10)
    if (far.length)
      planWarnings.push(
        `${far.map((l) => l.name).join(' and ')} ${far.length === 1 ? 'is' : 'are'} more than 10 km from ${short(anchor)}. We kept ${far.length === 1 ? 'it' : 'them'}, but two separate outings would be calmer.`,
      )
    if (homeTrip(anchor) > 60) planWarnings.push(`The closest match is ${aboutMinutes(homeTrip(anchor))} from ${start.label}. A nearer starting point gives a calmer day.`)
  }

  /* --- 4a. food near the anchor */
  const foodCandidates = LISTINGS.filter((l) => l?.kind === 'food' && AREA_BY_SLUG[l.area] && canRoute(l) && !reqFood.includes(l))
  const anchorPos = anchor ? posOf(anchor).pos : start.pos
  const maxFoodKm = shortTransfers ? 5 : 8
  const hasBhog = celebs.some((c) => c.activities.some((a) => a.type === 'bhog' && a.reserved))
  const evening = celebs.some((c) => c.activities.some((a) => a.reserved && (a.start ?? 0) >= 16 * 60))
  const pickFood = (exclude: Listing[], prefer: (l: Listing) => number) =>
    foodCandidates
      .filter((l) => !exclude.includes(l) && distanceKm(anchorPos, posOf(l).pos) <= maxFoodKm)
      .sort((a, b) => travelMinutes(anchorPos, posOf(a).pos, mode) + prefer(a) - (travelMinutes(anchorPos, posOf(b).pos, mode) + prefer(b)))[0]
  const foods: PlanStop[] = reqFood.map((l) => foodStop(l, anchor ?? null, true))
  const optionalFoods: PlanStop[] = []
  if (!reqFood.length && (rule.includeFood || inputs.interests.includes('food')) && !(minimal && !inputs.interests.includes('food'))) {
    const prefer = (l: Listing) => {
      if (hasBhog) return l.foodType === 'mishti' ? -15 : 10
      if (l.foodType === 'late-night') return evening ? -5 : 25
      return l.foodType === 'bengali' ? -10 : l.foodType === 'mishti' ? 5 : 0
    }
    const f = pickFood([], prefer)
    if (f) optionalFoods.push(foodStop(f, anchor ?? null, false))
    else notes.push('No checked food stop near this celebration yet. Food at pandal stalls is not listed here because vendor rosters are not published.')
    if (f && inputs.interests.includes('food') && !minimal && rule.hours >= 5) {
      const second = pickFood([f], (l) => (f.foodType === 'mishti' ? (l.foodType === 'bengali' ? -15 : 20) : l.foodType === 'mishti' ? -15 : 20))
      if (second && second.foodType !== f.foodType) optionalFoods.push(foodStop(second, anchor ?? null, false))
    }
  }
  if (hasBhog) notes.push('Bhog is served by the celebration, not a restaurant. Serving times and token rules can change on the day.')

  /* --- 4b. an optional second (and third) celebration, only if close and time allows */
  const extraCelebs: PlanStop[] = []
  if (anchor && celebs.length < maxCelebs) {
    const radius = shortTransfers ? 4 : 6
    const chosen = new Set(celebs.map((c) => c.listing.id))
    const near = open
      .filter(
        (l) =>
          !chosen.has(l.id) &&
          l.status === 'published-2026' &&
          l.directionsEnabled &&
          openOn(l.dates, date) === true &&
          distanceKm(posOf(anchor!).pos, posOf(l).pos) <= radius,
      )
      .sort((a, b) => distanceKm(anchorPos, posOf(a).pos) - distanceKm(anchorPos, posOf(b).pos))
    for (const l of near.slice(0, maxCelebs - celebs.length)) extraCelebs.push(celebrationStop(l, 'second', 90))
  }

  /* --- 5. order: celebrations by nearest neighbour from the start, food after the anchor */
  const assemble = (cs: PlanStop[], fs: PlanStop[]): PlanStop[] => {
    const rest = [...cs]
    const ordered: PlanStop[] = []
    let here = start.pos
    while (rest.length) {
      rest.sort((a, b) => distanceKm(here, a.pos) - distanceKm(here, b.pos))
      const nx = rest.shift()!
      ordered.push(nx)
      here = nx.pos
    }
    const anchorIdx = Math.max(0, ordered.findIndex((s) => s.listing.id === anchor?.id))
    // meals first, then sweets after the meal
    const fsSorted = [...fs].sort((a, b) => (a.listing.foodType === 'mishti' ? 1 : 0) - (b.listing.foodType === 'mishti' ? 1 : 0))
    for (const f of fsSorted) {
      // cheapest insertion, never before the anchor (a meal after the main celebration)
      let bestI = ordered.length
      let bestCost = Infinity
      const lastMeal = f.listing.foodType === 'mishti' ? ordered.map((o) => o.role === 'food' && o.listing.foodType !== 'mishti').lastIndexOf(true) : -1
      for (let i = Math.max(anchorIdx + 1, lastMeal + 1); i <= ordered.length; i++) {
        const a = i === 0 ? start.pos : ordered[i - 1].pos
        const b = i < ordered.length ? ordered[i].pos : start.pos
        const cost = distanceKm(a, f.pos) + distanceKm(f.pos, b) - distanceKm(a, b)
        if (cost < bestCost - 0.01) {
          bestCost = cost
          bestI = i
        }
      }
      ordered.splice(bestI, 0, f)
    }
    return ordered
  }

  const baseOf = (stops: PlanStop[]) => ({
    inputs,
    templateId: template?.id ?? null,
    shorter: minimal || !!opts.shorter,
    start,
    stops,
    budget,
    warnings: planWarnings,
    notes,
  })

  // drop optional extras until the plan fits: a hopping pace keeps extra celebrations longest,
  // a relaxed pace keeps the second food stop longest
  let extras = [...extraCelebs]
  let opFoods = [...optionalFoods]
  let plan = schedule(baseOf(assemble([...celebs, ...extras], [...foods, ...opFoods])))
  while (plan.total > budget && (extras.length || opFoods.length > 1)) {
    const dropFoodFirst = pace === 'hopping' || inputs.interests.includes('pandals') && !inputs.interests.includes('food')
    if (opFoods.length > 1 && (dropFoodFirst || !extras.length)) opFoods = opFoods.slice(0, -1)
    else if (extras.length) extras = extras.slice(0, -1)
    else opFoods = opFoods.slice(0, -1)
    plan = schedule(baseOf(assemble([...celebs, ...extras], [...foods, ...opFoods])))
  }
  if (plan.total > budget && opFoods.length === 1 && hasBhog && !inputs.interests.includes('food')) {
    opFoods = []
    plan = schedule(baseOf(assemble([...celebs, ...extras], [...foods])))
  }
  // still over: shorten the most flexible stays (a long programme first), never below their minimum
  for (let pass = 0; pass < 3 && plan.total > budget; pass++) {
    let over = plan.total - budget
    const stops = plan.stops.map((st) => ({ ...st }))
    const order = [...stops].sort((a, b) => b.stay - b.minStay - (a.stay - a.minStay))
    for (const st of order) {
      if (over <= 0) break
      const cut = Math.min(st.stay - st.minStay, over)
      if (cut <= 0) continue
      st.stay -= Math.ceil(cut / 5) * 5
      if (st.stay < st.minStay) st.stay = st.minStay
      over -= cut
    }
    plan = schedule(baseOf(stops))
  }

  /* --- plan-level notes, in plain words (time-dependent warnings live in liveWarnings) */
  if (plan.stops.some((s) => !s.exactPos)) notes.push('Some venues are not mapped exactly yet, so travel times use the neighbourhood centre.')
  if (mode === 'metro') notes.push('Metro times assume a station near both ends. You may need an auto for the last stretch. Check the last train for your line.')
  if (inputs.vegetarian) notes.push('Vegetarian: our data does not mark veg dishes yet, so check veg options at each food stop.')
  if (shortTransfers) notes.push('Transfers kept short. Seating, toilets and covered space are not confirmed here; ask the organiser.')
  return { ok: true, plan }
}

/** the next shorter duration, or the minimal version when already at the shortest */
export function shorterPlan(inputs: PlanInputs, opts: BuildOptions): PlanResult {
  const lower = [...DURATION_RULES].reverse().find((r) => r.hours < inputs.hours)
  if (lower) return buildPlan({ ...inputs, hours: lower.hours }, { ...opts, minimal: false, shorter: true })
  return buildPlan(inputs, { ...opts, minimal: true, shorter: true })
}

/* ------------------------------------------------------------------ display helpers */

/** warnings that depend on the current order and timing, recomputed after every edit */
export function liveWarnings(p: Plan): string[] {
  const out: string[] = []
  const rule = ruleFor(p.inputs.hours)
  if (p.total > p.budget + 20) out.push(`This plan runs about ${durationLabel(p.total - p.budget)} over your ${rule.label.toLowerCase()}. Try the shorter version, or remove a stop.`)
  if (p.stops.length && p.startTime < 7 * 60) out.push(`This plan starts very early (${clock(p.startTime)}). Try fewer stops or the shorter version.`)
  if (p.stops.length && p.end > 23 * 60) out.push('You would get home after 11 pm. Plan your ride back in advance.')
  return out
}

/** the activity a late arrival would miss, if any */
export function missedStart(s: PlanStop): Activity | null {
  if (!s.late) return null
  return s.activities.find((a) => a.reserved) ?? null
}

export function legLabel(l: Leg, withEstimate = true): string {
  if (!l.minutes) return 'Same venue'
  return `${aboutMinutes(l.minutes)} by ${TRANSPORT_LABEL[l.mode].toLowerCase()}${withEstimate ? ' (estimate)' : ''}`
}

/**
 * The festival day that suits a ready plan best: one with published timings that match it,
 * inside the anchor's published dates, staying on the visitor's chosen day when it is as good.
 */
export function bestDateFor(t: PlanTemplate, current: string): string {
  const anchor = t.anchor ? LISTING_BY_ID[t.anchor] : null
  const days = festivalDays()
  if (!anchor || !days.length) return current
  const types = new Set(templateInterests(t).flatMap((i) => INTEREST_TYPES[i]))
  const today = toISODate(new Date())
  let best = current
  let bestScore = -Infinity
  for (const d of days) {
    const acts = activitiesOn(anchor, d.date).filter((a) => a.start != null && types.has(a.type))
    const on = openOn(anchor.dates, d.date)
    let score = acts.reduce((n, a) => n + TYPE_VALUE[a.type], 0) * 10
    score += on === true ? 5 : on === undefined ? 2 : acts.length ? 1 : -20
    if (d.date === current) score += 1.5
    if (d.date >= today) score += 0.5
    if (score > bestScore) {
      bestScore = score
      best = d.date
    }
  }
  return best
}

export function stopWindow(s: PlanStop): string {
  return clockRange(round5(s.arrive), round5(s.depart))
}

export function activityTime(a: Activity): string {
  return a.time ?? ''
}

/** the plan as plain text for the clipboard */
export function planText(p: Plan): string {
  const lines: string[] = []
  lines.push(`PujoBLR plan for ${dateWithDay(p.inputs.date)}`)
  lines.push(`Start from ${p.start.label} around ${clock(p.startTime)}, by ${TRANSPORT_LABEL[p.inputs.transport].toLowerCase()}.`)
  lines.push('Travel times are estimates. Check each venue before you go.')
  lines.push('')
  p.stops.forEach((s, i) => {
    lines.push(`Travel: ${legLabel(s.leg)}`)
    lines.push(`${i + 1}. ${stopWindow(s)}  ${s.listing.name}`)
    const where = s.listing.address || s.listing.venueName
    if (where) lines.push(`   ${where}`)
    for (const a of s.activities.filter((x) => x.reserved)) lines.push(`   ${a.time ? `${a.time}: ` : ''}${a.label}`)
    if (s.listing.status !== 'published-2026' && s.listing.kind !== 'food') lines.push(`   Status: ${STATUS_LABEL[s.listing.status]}`)
    const d = directionsUrl(s.listing)
    if (d) lines.push(`   Directions: ${d}`)
    lines.push('')
  })
  lines.push(`Trip home: ${legLabel(p.home)}, plus ${p.buffer} min buffer for traffic and queues.`)
  lines.push(`Back by about ${clock(round5(p.end))}.`)
  if (p.routeUrl) lines.push(`Whole route: ${p.routeUrl}`)
  return lines.join('\n')
}
