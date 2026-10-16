import { useEffect, useMemo, useRef, useState } from 'react'
import { stopIndexOf } from '../../data/areas'
import { KIND_LABEL } from '../../data/listings'
import type { Area, Listing, ListingKind } from '../../data/types'
import { go } from '../../engine/director'
import { hasCoords } from '../../lib/directions'
import { festivalDays, plural } from '../../lib/format'
import { useJourney } from '../../store/journey'
import { StatusBadge } from '../StatusBadge'
import { AreaMap } from './AreaMap'
import { Chip, ChipRow, btn } from './controls'
import { IconFilter, IconList, IconMap, IconSearch, IconClose } from './icons'
import { ListingCard } from './ListingCard'
import { BookButton } from './controls'
import { FOOD_TYPE_LABEL, activeFilterCount, applyFilters, nearestPublishedAreas, type Filters } from './listingInfo'

interface Props {
  area: Area
  kind: ListingKind
  /** listings of this kind in the chosen sub-area */
  listings: Listing[]
  subArea: string | null
  filters: Filters
  setFilters: (f: Filters) => void
  view: 'list' | 'map'
  setView: (v: 'list' | 'map') => void
  compact: boolean
  onDetails: (id: string) => void
}

const EMPTY_COPY: Record<ListingKind, (a: string) => string> = {
  pandal: (a) => `No 2026 celebrations confirmed in ${a} yet.`,
  food: (a) => `No food stops checked in ${a} yet.`,
  event: (a) => `No events published for ${a} yet.`,
}

function NearbyAreas({ area, kind, compact = false }: { area: Area; kind: ListingKind; compact?: boolean }) {
  const near = nearestPublishedAreas(area.slug, kind, compact ? 2 : 3)
  const closePanel = useJourney((s) => s.closePanel)
  if (!near.length) return null
  const goTo = (slug: Area['slug']) => {
    closePanel()
    void go(stopIndexOf(slug))
  }
  if (compact) {
    return (
      <p className="mt-1.5 flex flex-wrap items-center gap-x-1 text-[14px] text-ink-soft">
        <span className="font-semibold">Confirmed nearby:</span>
        {near.map(({ area: a, km }, i) => (
          <span key={a.slug} className="inline-flex items-center">
            <button
              type="button"
              onClick={() => goTo(a.slug)}
              className="inline-flex min-h-[44px] items-center px-1 font-bold text-burgundy underline decoration-burgundy/30 underline-offset-4 hover:decoration-burgundy"
            >
              {a.heading} (about {Math.max(1, Math.round(km))} km)
            </button>
            {i < near.length - 1 ? <span aria-hidden="true">·</span> : null}
          </span>
        ))}
      </p>
    )
  }
  return (
    <div className="mt-4">
      <p className="text-[14px] font-semibold text-ink-soft">Closest areas with celebrations published for 2026:</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {near.map(({ area: a, km }) => (
          <button key={a.slug} type="button" className={btn.secondary} onClick={() => goTo(a.slug)}>
            {a.heading}
            <span className="text-[14px] font-semibold text-ink-soft sm:text-[13px]">about {Math.max(1, Math.round(km))} km</span>
            <span aria-hidden="true">→</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function ExploreList({ area, kind, listings, subArea, filters, setFilters, view, setView, compact, onDetails }: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const days = useMemo(() => festivalDays(), [])
  const { matches, undated } = useMemo(() => applyFilters(listings, filters, kind), [listings, filters, kind])
  const nFilters = activeFilterCount({ ...filters, q: '' }, kind)
  const showFilters = !compact || filtersOpen
  const searchRef = useRef<HTMLInputElement>(null)
  const set = (p: Partial<Filters>) => setFilters({ ...filters, ...p })
  const placeName = subArea ?? area.heading
  const total = matches.length + undated.length
  const anyPublished = listings.some((l) => l.status === 'published-2026')
  const foodTypes = useMemo(() => {
    const present = new Set(listings.map((l) => l.foodType).filter(Boolean) as string[])
    return Object.keys(FOOD_TYPE_LABEL).filter((k) => present.has(k))
  }, [listings])

  useEffect(() => setFiltersOpen(false), [area.slug])

  const pinned = useMemo(() => [...matches, ...undated].filter(hasCoords), [matches, undated])
  const unpinned = useMemo(() => [...matches, ...undated].filter((l) => !hasCoords(l)), [matches, undated])

  /* ---------------- nothing at all in this tab */
  if (!listings.length) {
    return (
      <div className="pt-2">
        {kind === 'food' && <FoodNote />}
        <div className="rounded-[18px] border border-dashed border-burgundy/25 bg-[#FFFBF4] px-5 py-6">
          <p className="font-display text-[24px] font-semibold leading-tight text-burgundy">{EMPTY_COPY[kind](placeName)}</p>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">
            We only list what organisers and venues have published, so this stays empty until something is confirmed. Nothing here is a placeholder.
          </p>
          <NearbyAreas area={area} kind={kind} />
        </div>
      </div>
    )
  }

  return (
    <div className="pt-2">
      {kind === 'food' && <FoodNote />}
      {kind === 'pandal' && !anyPublished && (
        <div className="mb-4 rounded-[18px] border border-[#C9962F]/40 bg-[#F7E6BF]/50 px-4 py-3">
          <p className="text-[15px] font-bold text-burgundy-deep">{EMPTY_COPY.pandal(placeName)}</p>
          <p className="mt-0.5 text-[14px] leading-snug text-charcoal/85">Known celebrations are below. Each one says what still needs checking.</p>
          <NearbyAreas area={area} kind={kind} compact />
        </div>
      )}

      {/* search + filters + view */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-[220px]">
          <span className="sr-only">
            Search {KIND_LABEL[kind].many.toLowerCase()} in {placeName}
          </span>
          <IconSearch size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-burgundy/55" />
          <input
            ref={searchRef}
            type="search"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder={`Search in ${area.shortName}`}
            className="h-11 w-full rounded-full border border-burgundy/20 bg-[#FFFBF4] pl-10 pr-10 text-[15px] text-charcoal placeholder:text-ink-mute focus:border-burgundy/50 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold [&::-webkit-search-cancel-button]:hidden"
          />
          {filters.q && (
            <button
              type="button"
              onClick={() => {
                set({ q: '' })
                searchRef.current?.focus()
              }}
              className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-burgundy/70 hover:bg-parchment"
              aria-label="Clear search"
            >
              <IconClose size={16} />
            </button>
          )}
        </label>
        {compact && (
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="explore-filters"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`${filtersOpen || nFilters ? btn.primary : btn.secondary} px-3.5`}
          >
            <IconFilter size={17} />
            Filters{nFilters ? ` (${nFilters})` : ''}
          </button>
        )}
        <div role="radiogroup" aria-label="Show as" className="inline-flex rounded-full border border-burgundy/20 bg-[#FFFBF4] p-0.5">
          {(['list', 'map'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => setView(v)}
              className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-full px-3.5 text-[14px] font-bold transition-colors ${
                view === v ? 'bg-burgundy text-ivory' : 'text-burgundy hover:bg-parchment/70'
              }`}
            >
              {v === 'list' ? <IconList size={16} /> : <IconMap size={16} />}
              {v === 'list' ? 'List' : 'Map'}
            </button>
          ))}
        </div>
      </div>

      {showFilters && (
        <div id="explore-filters" className="mt-3 flex flex-col gap-2.5">
          {kind === 'food' ? (
            foodTypes.length > 1 && (
              <ChipRow label="Food type" role="radiogroup">
                <Chip mode="radio" size="sm" on={!filters.foodType} onClick={() => set({ foodType: null })}>
                  All food
                </Chip>
                {foodTypes.map((t) => (
                  <Chip key={t} mode="radio" size="sm" on={filters.foodType === t} onClick={() => set({ foodType: filters.foodType === t ? null : t })}>
                    {FOOD_TYPE_LABEL[t]}
                  </Chip>
                ))}
              </ChipRow>
            )
          ) : (
            <>
              <ChipRow label="Pujo day" role="radiogroup">
                <Chip mode="radio" size="sm" on={!filters.day} onClick={() => set({ day: null })}>
                  Any day
                </Chip>
                {days.map((d) => (
                  <Chip
                    key={d.date}
                    mode="radio"
                    size="sm"
                    on={filters.day === d.date}
                    onClick={() => set({ day: filters.day === d.date ? null : d.date })}
                    sub={d.name}
                    aria-label={d.name ? `${d.name}, ${d.label} October` : `${d.label} October`}
                  >
                    {d.label}
                  </Chip>
                ))}
              </ChipRow>
              <ChipRow label="More filters">
                <Chip size="sm" on={filters.bhog} onClick={() => set({ bhog: !filters.bhog })}>
                  Bhog
                </Chip>
                <Chip size="sm" on={filters.free} onClick={() => set({ free: !filters.free })}>
                  Free entry
                </Chip>
                <Chip size="sm" on={filters.cultural} onClick={() => set({ cultural: !filters.cultural })}>
                  Cultural programme
                </Chip>
                <Chip size="sm" on={filters.published} onClick={() => set({ published: !filters.published })}>
                  Published 2026 only
                </Chip>
              </ChipRow>
            </>
          )}
        </div>
      )}

      <p className="mt-3 text-[14px] sm:text-[13.5px] font-semibold text-ink-soft" aria-live="polite">
        {total === listings.length
          ? `${plural(total, KIND_LABEL[kind].one.toLowerCase(), kindMany(kind))} in ${placeName}`
          : `Showing ${total} of ${listings.length}`}
      </p>

      {/* ---------------- results */}
      {total === 0 ? (
        <div className="mt-3 rounded-[18px] border border-dashed border-burgundy/25 bg-[#FFFBF4] px-5 py-5">
          <p className="text-[15.5px] font-bold text-burgundy">Nothing matches these filters.</p>
          {filters.free && <p className="mt-1 text-[14px] text-ink-soft">Entry details are not published for most celebrations yet, so few will show as free.</p>}
          {filters.bhog && !filters.free && <p className="mt-1 text-[14px] text-ink-soft">Bhog timings are only listed where an organiser has published them.</p>}
          <button type="button" className={`${btn.secondary} mt-3`} onClick={() => setFilters({ ...filters, day: null, bhog: false, free: false, cultural: false, published: false, foodType: null, q: '' })}>
            Clear filters
          </button>
        </div>
      ) : view === 'map' ? (
        <div className="mt-3 flex flex-col gap-4">
          <AreaMap area={area} pinned={pinned} onOpen={onDetails} subArea={subArea} />
          {pinned.length > 0 && (
            <ul className="flex flex-col gap-3">
              {pinned.map((l, i) => (
                <li key={l.id}>
                  <ListingCard listing={l} onDetails={onDetails} pinNumber={i + 1} />
                </li>
              ))}
            </ul>
          )}
          {unpinned.length > 0 && (
            <section aria-labelledby="not-on-map">
              <h3 id="not-on-map" className="text-[14px] sm:text-[12.5px] font-bold uppercase tracking-[0.14em] text-burgundy/75">
                Not on the map yet
              </h3>
              <p className="mt-1 text-[14px] sm:text-[13.5px] text-ink-soft">Exact positions for these have not been checked, so we do not pin them.</p>
              <ul className="mt-2 flex flex-col divide-y divide-parchment-deep/80 rounded-[18px] border border-parchment-deep/80 bg-[#FFFBF4]">
                {unpinned.map((l) => (
                  <li key={l.id}>
                    <div data-card={l.id} className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left">
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-semibold text-burgundy">{l.name}</span>
                        <span className="block truncate text-[14px] sm:text-[13px] text-ink-soft">{l.subArea ?? area.heading}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="hidden min-[420px]:inline-flex">
                          <StatusBadge status={l.status} />
                        </span>
                        <BookButton listing={l} size="sm" />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <ul className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
            {matches.map((l) => (
              <li key={l.id}>
                <ListingCard listing={l} onDetails={onDetails} />
              </li>
            ))}
          </ul>
          {undated.length > 0 && (
            <section aria-labelledby="undated-head" className="mt-3">
              <h3 id="undated-head" className="text-[14px] sm:text-[12.5px] font-bold uppercase tracking-[0.14em] text-burgundy/75">
                Dates not confirmed
              </h3>
              <p className="mt-1 text-[14px] sm:text-[13.5px] text-ink-soft">These may be on that day, but their 2026 dates are not published yet.</p>
              <ul className="mt-2 grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
                {undated.map((l) => (
                  <li key={l.id}>
                    <ListingCard listing={l} onDetails={onDetails} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function kindMany(kind: ListingKind) {
  return kind === 'food' ? 'food stops' : KIND_LABEL[kind].many.toLowerCase()
}

function FoodNote() {
  return (
    <p className="mb-3 flex items-start gap-2 rounded-2xl bg-parchment/70 px-4 py-3 text-[14px] leading-snug text-charcoal/85">
      <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-vermilion" />
      <span>
        Bengali food first. Bhog is listed with each celebration.
        <span className="text-ink-soft"> Restaurant hours are not checked for festival days.</span>
      </span>
    </p>
  )
}
