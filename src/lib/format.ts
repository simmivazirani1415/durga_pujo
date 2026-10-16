import { FESTIVAL_WINDOW, PUJO_CALENDAR } from '../data/listings'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** ISO yyyy-mm-dd to a UTC date, so formatting never drifts with the visitor's time zone */
export function parseISODate(iso?: string | null): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  if (!m) return null
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** "Thu 15" */
export function dayChipLabel(iso: string): string {
  const d = parseISODate(iso)
  return d ? `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}` : iso
}

/** "17 Oct" */
export function dateShort(iso: string): string {
  const d = parseISODate(iso)
  return d ? `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}` : iso
}

/** "Sat 17 Oct" */
export function dateWithDay(iso: string): string {
  const d = parseISODate(iso)
  return d ? `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}` : iso
}

/** "14 Oct 2026" */
export function dateLong(iso: string): string {
  const d = parseISODate(iso)
  return d ? `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : iso
}

/** "16–21 Oct", "17 Oct", "30 Sep – 2 Oct" */
export function dateRange(r?: { start?: string; end?: string } | null): string {
  if (!r?.start) return ''
  const a = parseISODate(r.start)
  const b = parseISODate(r.end ?? r.start)
  if (!a) return ''
  if (!b || a.getTime() === b.getTime()) return dateShort(r.start)
  if (a.getUTCFullYear() !== b.getUTCFullYear()) return `${dateLong(r.start)} – ${dateLong(r.end!)}`
  if (a.getUTCMonth() === b.getUTCMonth()) return `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`
  return `${dateShort(r.start)} – ${dateShort(r.end!)}`
}

export function isoDatesBetween(start: string, end: string): string[] {
  const a = parseISODate(start)
  const b = parseISODate(end)
  if (!a || !b) return []
  const out: string[] = []
  for (let t = a.getTime(); t <= b.getTime() && out.length < 40; t += 86400000) out.push(toISODate(new Date(t)))
  return out
}

/** true when a listing with these dates is on during `iso`; undefined when the dates are not known */
export function openOn(dates: { start?: string; end?: string } | undefined | null, iso: string): boolean | undefined {
  if (!dates?.start) return undefined
  const end = dates.end ?? dates.start
  return dates.start <= iso && iso <= end
}

/* ------------------------------------------------------------------ festival days */

export interface FestivalDay {
  date: string
  /** "Thu 15" */
  label: string
  /** "Saptami", when the calendar has it */
  name?: string
}

/** Pujo days from the calendar data, or every date in the festival window as a fallback. */
export function festivalDays(): FestivalDay[] {
  const days = Array.isArray(PUJO_CALENDAR?.days) ? PUJO_CALENDAR.days.filter((d) => parseISODate(d?.date)) : []
  if (days.length) {
    return [...days]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ date: d.date, label: dayChipLabel(d.date), name: (d.name || '').replace(/^maha\s+/i, '') || undefined }))
  }
  return isoDatesBetween(FESTIVAL_WINDOW.start, FESTIVAL_WINDOW.end).map((date) => ({ date, label: dayChipLabel(date) }))
}

/* ------------------------------------------------------------------ clock times */

/** minutes after midnight to "10:30 am", "5 pm", "12 pm" */
export function clock(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  const h24 = Math.floor(m / 60)
  const mm = m % 60
  const suffix = h24 < 12 ? 'am' : 'pm'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return mm ? `${h12}:${String(mm).padStart(2, '0')} ${suffix}` : `${h12} ${suffix}`
}

/** "10:30 am – 2 pm", or "1–3 pm" when both sides share am/pm and are on the hour */
export function clockRange(a: number, b: number): string {
  const ca = clock(a)
  const cb = clock(b)
  const sa = ca.slice(-2)
  const sb = cb.slice(-2)
  if (sa === sb && !ca.includes(':') && !cb.includes(':')) return `${ca.slice(0, -3)}–${cb}`
  return `${ca} – ${cb}`
}

/** "about 25 min", "about 1 h 10 min" */
export function aboutMinutes(min: number): string {
  return `about ${durationLabel(min)}`
}

export function durationLabel(min: number): string {
  const m = Math.max(0, Math.round(min))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} h ${r} min` : `${h} h`
}

function to24(h: number, mer: string | undefined): number {
  if (mer === 'pm' && h < 12) return h + 12
  if (mer === 'am' && h === 12) return 0
  return h
}

/**
 * Reads published times like "11 am", "1–3 pm", "5–10 pm", "10:30 am – 1 pm".
 * Returns minutes after midnight, or null when no clock time is given (e.g. "Evening").
 */
export function parseTimeRange(s?: string | null): { start: number; end?: number } | null {
  if (!s) return null
  const t = s.toLowerCase().replace(/[–—]/g, '-').replace(/\bto\b/g, '-').replace(/\./g, ':')
  const re = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/
  const m = re.exec(t)
  if (!m) return null
  const [, h1s, m1s, mer1, h2s, m2s, mer2] = m
  if (!mer1 && !mer2) return null
  const h1 = +h1s
  const min1 = m1s ? +m1s : 0
  if (h1 > 12 || min1 > 59) return null
  if (!h2s) return { start: to24(h1, mer1) * 60 + min1 }
  const h2 = +h2s
  const min2 = m2s ? +m2s : 0
  if (h2 > 12 || min2 > 59) return null
  const end = to24(h2, mer2 ?? mer1) * 60 + min2
  let start = to24(h1, mer1 ?? mer2) * 60 + min1
  if (!mer1 && start > end) start = to24(h1, 'am') * 60 + min1
  return { start, end }
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/** strips a trailing parenthetical so "Bengaluru Sreehatta Sammelani (BSS)" compares cleanly */
export function plainName(s?: string): string {
  return (s ?? '').replace(/\s*\([^)]*\)\s*/g, ' ').trim()
}
