import { AnimatePresence, animate, motion, useMotionValue, useIsPresent, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { AREAS, AREA_BY_SLUG, areaAt } from '../../data/areas'
import { KIND_LABEL, LISTINGS } from '../../data/listings'
import type { Area, Listing, ListingKind } from '../../data/types'
import { useView } from '../../engine/viewport'
import { useContainWheel, useDialogFocus } from '../../lib/a11y'
import { useJourney } from '../../store/journey'
import { Chip, ChipRow } from './controls'
import { ExploreList } from './ExploreList'
import { IconClose } from './icons'
import { ListingDetail } from './ListingDetail'
import { EMPTY_FILTERS, kindOf, subAreasWithListings, type Filters } from './listingInfo'

const KINDS: ListingKind[] = ['pandal', 'event', 'food']

/** bottom-sheet snap points as a fraction of the viewport height */
const SNAP = { peek: 0.28, half: 0.52, full: 0.92 } as const
type Snap = keyof typeof SNAP
const SHEET_H = SNAP.full

/** thin red-and-white laal paar border, the panel's one motif */
function LaalPaar() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10">
      <div className="h-[3px] bg-vermilion" />
      <div className="h-[2px] bg-ivory" />
      <div className="h-px bg-vermilion/70" />
    </div>
  )
}

/** a stand-in "area" used when the guide shows every listing in Bengaluru */
const CITY: Area = {
  ...AREAS[0],
  slug: AREAS[0].slug,
  heading: 'All of Bengaluru',
  shortName: 'Bengaluru',
  subtitle: 'Every Durga Puja celebration, event and food stop listed so far.',
  region: 'Central',
  lat: 12.9716,
  lng: 77.5946,
  subAreas: [],
}

export function ExplorePanel() {
  const open = useJourney((s) => s.panel.open)
  const scope = useJourney((s) => s.panel.scope)
  const index = useJourney((s) => s.index)
  const here = areaAt(index)
  const view = useView()
  const show = open && (scope === 'all' || !!here)
  return (
    <AnimatePresence>
      {show ? <PanelShell key="explore" here={here} scope={here ? scope : 'all'} compact={view.compact} vh={view.H} /> : null}
    </AnimatePresence>
  )
}

function PanelShell({ here, scope, compact, vh }: { here: Area | null; scope: 'area' | 'all'; compact: boolean; vh: number }) {
  const all = scope === 'all'
  const [cityArea, setCityArea] = useState<string | null>(null)
  const area: Area = all ? (cityArea ? AREA_BY_SLUG[cityArea as keyof typeof AREA_BY_SLUG] ?? CITY : CITY) : here!
  const reduce = useReducedMotion()
  // released as soon as closing starts, so focus returns without waiting for the exit animation
  const present = useIsPresent()
  const panel = useJourney((s) => s.panel)
  const setPanel = useJourney((s) => s.setPanel)
  const closePanel = useJourney((s) => s.closePanel)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLButtonElement>(null)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [mode, setMode] = useState<'list' | 'map'>('list')
  const [snap, setSnap] = useState<Snap>('half')
  const listScroll = useRef(0)
  const lastDetail = useRef<string | null>(null)
  const opened = useRef(false)

  useDialogFocus({ open: present, container: dialogRef, initialFocus: closeRef, onEscape: closePanel })
  useContainWheel(scrollRef)

  /* ------------------------------------------------ data for this area */
  const subAreas = useMemo(() => (all ? [] : subAreasWithListings(area)), [area, all])
  const subArea = panel.subArea && subAreas.includes(panel.subArea) ? panel.subArea : null
  const areasWithListings = useMemo(() => AREAS.filter((a) => LISTINGS.some((l) => l && l.area === a.slug)), [])
  const inArea = useMemo(
    () =>
      LISTINGS.filter((l) => {
        if (!l) return false
        if (all) return !cityArea || l.area === cityArea
        return l.area === area.slug && (!subArea || l.subArea === subArea)
      }),
    [area.slug, subArea, all, cityArea],
  )
  const counts = useMemo(() => {
    const c: Record<ListingKind, number> = { pandal: 0, food: 0, event: 0 }
    for (const l of inArea) c[kindOf(l)]++
    return c
  }, [inArea])
  const tab: ListingKind = KINDS.includes(panel.tab) ? panel.tab : 'pandal'
  const tabListings = useMemo(() => inArea.filter((l) => kindOf(l) === tab), [inArea, tab])
  // listings no longer have a details view: asking for one (map pin, search) shows that listing's card in the list
  const detail = null as Listing | null
  useEffect(() => {
    const id = panel.detailId
    if (!id) return
    const t = window.setTimeout(() => {
      const card = dialogRef.current?.querySelector<HTMLElement>(`[data-card="${CSS.escape(id)}"]`)
      if (card) {
        card.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
        card.animate?.([{ boxShadow: '0 0 0 3px #7d1a2b' }, { boxShadow: '0 0 0 3px #7d1a2b' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 1600 })
      }
      setPanel({ detailId: null })
    }, 120)
    return () => window.clearTimeout(t)
  }, [panel.detailId])

  useEffect(() => {
    setFilters(EMPTY_FILTERS)
    setMode('list')
  }, [area.slug])
  useEffect(() => setFilters((f) => ({ ...f, q: '' })), [tab, subArea])

  /* ------------------------------------------------ detail navigation */
  const openDetail = useCallback(
    (id: string) => {
      if (!panel.detailId && scrollRef.current) listScroll.current = scrollRef.current.scrollTop
      const l = LISTINGS.find((x) => x?.id === id)
      setPanel({ detailId: id, ...(l && (all || l.area === area.slug) ? { tab: kindOf(l) } : {}) })
    },
    [panel.detailId, setPanel, area.slug, all],
  )
  const back = useCallback(() => setPanel({ detailId: null }), [setPanel])

  useLayoutEffect(() => {
    opened.current = true
  }, [])

  /* ------------------------------------------------ tabs keyboard */
  const tabRefs = useRef<Record<ListingKind, HTMLButtonElement | null>>({ pandal: null, food: null, event: null })
  const onTabKey = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    const i = KINDS.indexOf(tab)
    let n = -1
    if (e.key === 'ArrowRight') n = (i + 1) % KINDS.length
    else if (e.key === 'ArrowLeft') n = (i - 1 + KINDS.length) % KINDS.length
    else if (e.key === 'Home') n = 0
    else if (e.key === 'End') n = KINDS.length - 1
    if (n < 0) return
    e.preventDefault()
    setPanel({ tab: KINDS[n], detailId: null })
    tabRefs.current[KINDS[n]]?.focus()
  }

  /* ------------------------------------------------ pieces */
  const titleId = 'explore-title'
  const setScope = (sc: 'area' | 'all') => {
    setCityArea(null)
    setPanel({ scope: sc, subArea: null, detailId: null })
  }
  const header = (
    <div className="shrink-0 px-5 pt-5 sm:px-8 sm:pt-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-burgundy/70">
            {all ? 'Durga Puja 2026 · Bengaluru' : `${area.region} Bengaluru`}
          </p>
          <h2 id={titleId} className={`font-display font-semibold leading-[0.98] text-burgundy ${compact ? 'mt-1 text-[32px]' : 'mt-1.5 text-[46px]'}`}>
            {all ? (cityArea ? `${area.heading}` : 'All of Bengaluru') : area.heading}
          </h2>
          {!(compact && detail) && (
            <p className="mt-1.5 max-w-[56ch] text-[14.5px] font-medium leading-snug text-ink-soft sm:text-[15.5px]">
              {all ? CITY.subtitle : area.subtitle}
            </p>
          )}
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={closePanel}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-burgundy/20 bg-[#FFFBF4] text-burgundy hover:border-burgundy/50"
          aria-label="Close the guide and return to the ride"
        >
          <IconClose size={18} />
        </button>
      </div>
      {!detail && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {here && (
            <div role="radiogroup" aria-label="Show listings for" className="inline-flex rounded-full border border-burgundy/20 bg-[#FFFBF4] p-0.5">
              {(
                [
                  ['area', here.shortName],
                  ['all', 'All of Bengaluru'],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={scope === k}
                  onClick={() => setScope(k)}
                  className={`min-h-[42px] rounded-full px-4 text-[14px] font-bold transition-colors ${scope === k ? 'bg-burgundy text-ivory' : 'text-burgundy hover:bg-parchment/70'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {!detail && all && (
        <ChipRow label="Area" role="radiogroup" className="mt-3">
          <Chip mode="radio" size="sm" on={!cityArea} onClick={() => setCityArea(null)}>
            Every area
          </Chip>
          {areasWithListings.map((a) => (
            <Chip key={a.slug} mode="radio" size="sm" on={cityArea === a.slug} onClick={() => setCityArea(cityArea === a.slug ? null : a.slug)}>
              {a.shortName}
            </Chip>
          ))}
        </ChipRow>
      )}
      {!detail && !all && subAreas.length > 1 && (
        <ChipRow label="Part of the area" role="radiogroup" className="mt-3">
          <Chip mode="radio" size="sm" on={!subArea} onClick={() => setPanel({ subArea: null })}>
            All
          </Chip>
          {subAreas.map((sa) => (
            <Chip key={sa} mode="radio" size="sm" on={subArea === sa} onClick={() => setPanel({ subArea: subArea === sa ? null : sa })}>
              {sa}
            </Chip>
          ))}
        </ChipRow>
      )}
      {detail && <div aria-hidden="true" className="mt-4 h-px bg-parchment-deep" />}
      {!detail && (
        <div role="tablist" aria-label="Listings" className="mt-4 flex border-b border-parchment-deep">
          {KINDS.map((k) => {
            const on = k === tab
            return (
              <button
                key={k}
                ref={(el) => (tabRefs.current[k] = el)}
                type="button"
                role="tab"
                id={`tab-${k}`}
                aria-selected={on}
                aria-controls="explore-tabpanel"
                tabIndex={on ? 0 : -1}
                onKeyDown={onTabKey}
                onClick={() => setPanel({ tab: k, detailId: null })}
                className={`relative -mb-px flex min-h-[48px] flex-1 items-center justify-center gap-1.5 px-2 text-[15px] font-bold transition-colors sm:flex-none sm:px-5 ${
                  on ? 'text-burgundy' : 'text-ink-soft hover:text-burgundy'
                }`}
              >
                {KIND_LABEL[k].many}
                <span className={`tabular rounded-full px-1.5 text-[13px] ${on ? 'bg-burgundy text-ivory' : 'bg-parchment text-ink-soft'}`}>{counts[k]}</span>
                {on && <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-[2.5px] rounded-full bg-vermilion" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )

  // the swap is immediate (so focus and scroll can be restored in the same frame); only the entry slides
  const firstRender = useRef(true)
  useEffect(() => {
    firstRender.current = false
  }, [])
  const slide = reduce || firstRender.current ? { initial: false as const } : null
  const body = (
    <>
      {detail ? (
        <motion.div
          key={`d-${detail.id}`}
          {...(slide ?? { initial: { opacity: 0, x: 28 }, animate: { opacity: 1, x: 0 } })}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <ListingDetail ref={backRef} listing={detail} onBack={back} onOpen={openDetail} />
        </motion.div>
      ) : (
        <motion.div
          key={`l-${tab}`}
          id="explore-tabpanel"
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          {...(slide ?? { initial: { opacity: 0, x: -16 }, animate: { opacity: 1, x: 0 } })}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <ExploreList
            area={area}
            kind={tab}
            listings={tabListings}
            subArea={subArea}
            filters={filters}
            setFilters={setFilters}
            view={mode}
            setView={setMode}
            compact={compact}
            onDetails={openDetail}
          />
        </motion.div>
      )}
    </>
  )

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="fixed inset-0 z-[35] bg-[rgba(36,16,14,0.5)] backdrop-blur-[3px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0.1 : 0.3 }}
        onClick={closePanel}
        style={{ pointerEvents: present ? undefined : 'none' }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-[36] flex items-center justify-center"
        style={{
          paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
          paddingTop: compact ? 'max(64px, calc(env(safe-area-inset-top, 0px) + 58px))' : 'max(84px, 9vh)',
          paddingBottom: compact ? 'max(12px, env(safe-area-inset-bottom, 0px))' : 'max(32px, 5vh)',
        }}
      >
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={detail ? 'explore-detail-title' : titleId}
          className="relative flex h-full w-full max-w-[960px] flex-col overflow-hidden rounded-[26px] bg-ivory shadow-panel"
          style={{ maxHeight: compact ? undefined : 900, pointerEvents: present ? 'auto' : 'none' }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.985 }}
          transition={{ duration: reduce ? 0.15 : 0.36, ease: [0.22, 1, 0.36, 1] }}
        >
          <LaalPaar />
          {header}
          <div
            ref={scrollRef}
            className="thin-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-10 pt-4 sm:px-8"
            style={{ overscrollBehavior: 'contain' }}
          >
            {body}
          </div>
        </motion.div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ phone bottom sheet */

interface SheetProps {
  dialogRef: React.RefObject<HTMLDivElement>
  scrollRef: React.RefObject<HTMLDivElement>
  titleId: string
  detailOpen: boolean
  vh: number
  snap: Snap
  setSnap: (s: Snap) => void
  onClose: () => void
  reduce: boolean
  present: boolean
  header: React.ReactNode
  body: React.ReactNode
}

function Sheet({ dialogRef, scrollRef, titleId, detailOpen, vh, snap, setSnap, onClose, reduce, present, header, body }: SheetProps) {
  const sheetPx = SHEET_H * vh
  const yFor = (s: Snap) => (SHEET_H - SNAP[s]) * vh
  const closedY = sheetPx + 24
  const y = useMotionValue(closedY)
  const drag = useRef<{ startY: number; startVal: number; lastY: number; lastT: number; v: number; moved: boolean } | null>(null)
  const closing = useRef(false)

  const settle = useCallback(
    (to: number, after?: () => void) => {
      const ctl = animate(y, to, reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 42, mass: 0.9 })
      if (after) ctl.then(after)
      return ctl
    },
    [y, reduce],
  )

  // open, and follow snap changes
  useEffect(() => {
    if (closing.current) return
    const ctl = settle(yFor(snap))
    return () => ctl.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, vh])

  const close = useCallback(() => {
    if (closing.current) return
    closing.current = true
    onClose()
  }, [onClose])

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const t = e.target as HTMLElement
    if (t.closest('button:not([data-handle]), a, input, [role="tab"], [role="radio"]')) return
    drag.current = { startY: e.clientY, startVal: y.get(), lastY: e.clientY, lastT: performance.now(), v: 0, moved: false }
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const dy = e.clientY - d.startY
    if (!d.moved && Math.abs(dy) > 6) {
      d.moved = true
      // capture only once it is a real drag, so a tap on the handle still clicks it
      try {
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      } catch {
        /* pointer already gone */
      }
    }
    if (!d.moved) return
    const now = performance.now()
    const dt = Math.max(1, now - d.lastT)
    d.v = 0.8 * ((e.clientY - d.lastY) / dt) + 0.2 * d.v
    d.lastY = e.clientY
    d.lastT = now
    // resist above full
    const raw = d.startVal + dy
    y.set(raw < 0 ? raw * 0.25 : raw)
  }
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    if (!d.moved) return
    // a flick carries the sheet at most ~one snap further; closing needs it actually dragged below peek
    const now = y.get()
    const projected = now + Math.max(-220, Math.min(220, d.v * 160))
    if (now > yFor('peek') + 40 || (snap === 'peek' && projected > yFor('peek') + 60)) {
      close()
      return
    }
    const order: Snap[] = ['full', 'half', 'peek']
    const best = order.reduce((a, b) => (Math.abs(yFor(b) - projected) < Math.abs(yFor(a) - projected) ? b : a))
    if (best === snap) settle(yFor(best))
    else setSnap(best)
  }

  const cycle = () => setSnap(snap === 'full' ? 'half' : snap === 'half' ? 'full' : 'half')
  const onHandleKey = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSnap(snap === 'peek' ? 'half' : 'full')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (snap === 'peek') close()
      else setSnap(snap === 'full' ? 'half' : 'peek')
    }
  }

  const hidden = Math.max(0, yFor(snap))

  return (
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={detailOpen ? 'explore-detail-title' : titleId}
      className="fixed inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-[26px] bg-ivory shadow-panel"
      style={{ height: sheetPx, y, touchAction: 'pan-y', pointerEvents: present ? undefined : 'none' }}
      exit={{ y: closedY, transition: reduce ? { duration: 0 } : { duration: 0.3, ease: [0.4, 0, 1, 1] } }}
    >
      <LaalPaar />
      <div
        className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="flex justify-center pt-2">
          <button
            type="button"
            data-handle=""
            onClick={cycle}
            onKeyDown={onHandleKey}
            className="-my-1.5 grid h-11 w-24 place-items-center rounded-full"
            aria-label={snap === 'full' ? 'Make the guide smaller' : 'Make the guide taller'}
          >
            <span aria-hidden="true" className="h-[5px] w-11 rounded-full bg-burgundy/30" />
          </button>
        </div>
        {header}
      </div>
      <div
        ref={scrollRef}
        className="thin-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pt-4"
        style={{ overscrollBehavior: 'contain', paddingBottom: `calc(${hidden + 28}px + env(safe-area-inset-bottom, 0px))` }}
      >
        {body}
      </div>
    </motion.div>
  )
}
