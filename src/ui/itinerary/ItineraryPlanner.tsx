import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AREA_BY_SLUG, areaAt } from '../../data/areas'
import { LISTING_BY_ID } from '../../data/listings'
import type { PlanTemplate } from '../../data/plans'
import { useView } from '../../engine/viewport'
import { useContainWheel, useDialogFocus } from '../../lib/a11y'
import {
  bestDateFor,
  buildPlan,
  defaultInputs,
  loadInputs,
  reschedule,
  saveInputs,
  shorterPlan,
  templates,
  type Plan,
  type PlanInputs,
} from '../../lib/itinerary'
import { useJourney } from '../../store/journey'
import { StatusBadge } from '../StatusBadge'
import { btn } from '../explore/controls'
import { IconClose, IconRemove } from '../explore/icons'
import { PlannerForm } from './PlannerForm'
import { PlanView } from './PlanView'

export function ItineraryPlanner() {
  const open = useJourney((s) => s.plannerOpen)
  const view = useView()
  return <AnimatePresence>{open ? <PlannerDialog key="planner" compact={view.compact} /> : null}</AnimatePresence>
}

function PlannerDialog({ compact }: { compact: boolean }) {
  const reduce = useReducedMotion()
  const present = useIsPresent()
  const setPlannerOpen = useJourney((s) => s.setPlannerOpen)
  const picks = useJourney((s) => s.picks)
  const togglePick = useJourney((s) => s.togglePick)
  const index = useJourney((s) => s.index)
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const planHeadingRef = useRef<HTMLHeadingElement>(null)
  const formTopRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setPlannerOpen(false), [setPlannerOpen])
  useDialogFocus({ open: present, container: ref, initialFocus: closeRef, onEscape: close })
  useContainWheel(scrollRef)

  const [inputs, setInputsRaw] = useState<PlanInputs>(() => {
    const here = areaAt(index)?.slug ?? null
    const saved = loadInputs()
    const base = defaultInputs(here)
    return { ...base, ...(saved ?? {}), start: saved?.start ?? base.start }
  })
  const setInputs = (i: PlanInputs) => {
    setInputsRaw(i)
    saveInputs(i)
  }
  const [plan, setPlan] = useState<Plan | null>(null)
  /** the full plan, kept while the visitor looks at the shorter version */
  const [fullPlan, setFullPlan] = useState<Plan | null>(null)
  const [template, setTemplate] = useState<PlanTemplate | null>(null)
  const [error, setError] = useState<string | null>(null)
  const validPicks = useMemo(() => picks.filter((id) => LISTING_BY_ID[id]), [picks])

  const showPlan = (p: Plan) => {
    setPlan(p)
    setError(null)
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0 })
      planHeadingRef.current?.focus({ preventScroll: true })
    })
  }

  const generate = (t: PlanTemplate | null = null, overrides: Partial<PlanInputs> = {}) => {
    let i = { ...inputs, ...overrides }
    // a ready plan moves to the day that has its published timings, unless a day was just chosen for it
    if (t && !overrides.date) {
      const d = bestDateFor(t, i.date)
      if (d !== i.date) i = { ...i, date: d }
    }
    if (i.date !== inputs.date || Object.keys(overrides).length) setInputs(i)
    setTemplate(t)
    setFullPlan(null)
    const r = buildPlan(t ? { ...i, start: i.start && AREA_BY_SLUG[i.start.slug] === AREA_BY_SLUG[t.area] ? i.start : { kind: 'area', slug: t.area } } : i, {
      picks: t ? [] : validPicks,
      template: t,
    })
    if (r.ok) showPlan(r.plan)
    else {
      setPlan(null)
      setError(r.reason)
    }
  }

  const shorter = () => {
    if (!plan) return
    if (!plan.shorter) setFullPlan(plan)
    const r = shorterPlan(plan.inputs, { picks: template ? [] : validPicks, template })
    if (r.ok) showPlan(r.plan)
  }

  const edit = () => {
    setPlan(null)
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0 })
      formTopRef.current?.focus({ preventScroll: true })
    })
  }

  const move = (i: number, dir: -1 | 1) => {
    if (!plan) return
    const j = i + dir
    if (j < 0 || j >= plan.stops.length) return
    const stops = [...plan.stops]
    ;[stops[i], stops[j]] = [stops[j], stops[i]]
    setPlan(reschedule(plan, stops))
  }
  const remove = (i: number) => {
    if (!plan) return
    setPlan(reschedule(plan, plan.stops.filter((_, k) => k !== i)))
  }

  const title = 'Create my itinerary'
  const motionProps = compact
    ? {
        initial: reduce ? { opacity: 0 } : { y: '100%' },
        animate: reduce ? { opacity: 1 } : { y: 0 },
        exit: reduce ? { opacity: 0 } : { y: '100%' },
        transition: { duration: reduce ? 0.12 : 0.38, ease: [0.22, 1, 0.36, 1] },
      }
    : {
        initial: reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.985 },
        animate: reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 },
        exit: reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.99 },
        transition: { duration: reduce ? 0.12 : 0.3, ease: [0.22, 1, 0.36, 1] },
      }

  return (
    <motion.div
      className={`fixed inset-0 z-50 flex justify-center ${compact ? '' : 'items-center bg-charcoal/45 p-6'}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0.1 : 0.2 }}
      onClick={compact ? undefined : close}
      style={{ pointerEvents: present ? undefined : 'none' }}
    >
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="planner-title"
        onClick={(e) => e.stopPropagation()}
        {...motionProps}
        className={`relative flex w-full flex-col overflow-hidden bg-ivory shadow-panel ${compact ? 'h-full' : 'max-h-[min(900px,calc(100vh-48px))] max-w-[720px] rounded-[28px]'}`}
      >
        <div aria-hidden="true" className="absolute inset-x-0 top-0 z-10">
          <div className="h-[3px] bg-vermilion" />
          <div className="h-[2px] bg-ivory" />
          <div className="h-px bg-vermilion/70" />
        </div>
        <header
          className="flex shrink-0 items-start justify-between gap-3 border-b border-parchment-deep/80 px-5 pb-4 sm:px-8"
          style={{ paddingTop: compact ? 'max(18px, env(safe-area-inset-top, 0px))' : 26 }}
        >
          <div className="min-w-0">
            <h2 id="planner-title" className="font-display text-[32px] font-semibold leading-none text-burgundy sm:text-[38px]">
              {title}
            </h2>
            <p className="mt-1.5 text-[14.5px] text-ink-soft">One area, or two that sit close together. Never the whole city in one evening.</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-burgundy/20 bg-[#FFFBF4] text-burgundy hover:border-burgundy/50"
            aria-label="Close the planner"
          >
            <IconClose size={18} />
          </button>
        </header>

        <div
          ref={scrollRef}
          className="thin-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pt-6 sm:px-8"
          style={{ overscrollBehavior: 'contain', paddingBottom: 'max(32px, env(safe-area-inset-bottom, 0px))' }}
        >
          {plan ? (
            <PlanView
              plan={plan}
              onMove={move}
              onRemove={remove}
              onShorter={shorter}
              onFull={
                fullPlan
                  ? () => {
                      showPlan(fullPlan)
                      setFullPlan(null)
                    }
                  : undefined
              }
              onEdit={edit}
              onSwitchDate={(d) => generate(template, { date: d })}
              headingRef={planHeadingRef}
            />
          ) : (
            <>
              <section aria-labelledby="ready-plans">
                <h3 id="ready-plans" className="text-[14px] sm:text-[12.5px] font-bold uppercase tracking-[0.14em] text-burgundy/75">
                  Start from a ready plan
                </h3>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {templates().map((t) => {
                    const anchor = t.anchor ? LISTING_BY_ID[t.anchor] : null
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => generate(t)}
                          className="flex h-full w-full flex-col items-start rounded-[18px] border border-parchment-deep/90 bg-[#FFFBF4] p-4 text-left transition-colors hover:border-burgundy/35"
                        >
                          <span className="text-[14px] sm:text-[12.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">{AREA_BY_SLUG[t.area].heading}</span>
                          <span className="mt-1 font-display text-[22px] font-semibold leading-tight text-burgundy">{t.title}</span>
                          <span className="mt-1 text-[14px] leading-snug text-charcoal/85">{t.description}</span>
                          <span className="mt-2 text-[14px] sm:text-[13px] text-ink-soft">For {t.audience.charAt(0).toLowerCase() + t.audience.slice(1)}</span>
                          {anchor && (
                            <span className="mt-2.5">
                              <StatusBadge status={anchor.status} />
                            </span>
                          )}
                          {t.needsConfirmation && <span className="mt-2 text-[14px] sm:text-[13px] font-semibold text-[#6E4A0B]">{t.needsConfirmation}</span>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>

              <div className="my-8 flex items-center gap-4" role="presentation">
                <span className="h-px flex-1 bg-parchment-deep" />
                <span className="font-display text-[20px] italic text-burgundy/80">or build your own</span>
                <span className="h-px flex-1 bg-parchment-deep" />
              </div>

              <div ref={formTopRef} tabIndex={-1} className="focus:outline-none" aria-label="Build your own plan">
                {validPicks.length > 0 && (
                  <section aria-labelledby="saved-head" className="mb-7">
                    <h3 id="saved-head" className="text-[15px] font-bold text-charcoal">
                      Your saved stops
                    </h3>
                    <ul className="mt-2.5 flex flex-col gap-2">
                      {validPicks.map((id) => {
                        const l = LISTING_BY_ID[id]
                        return (
                          <li key={id} className="flex items-center justify-between gap-3 rounded-2xl border border-parchment-deep/90 bg-[#FFFBF4] py-1.5 pl-4 pr-1.5">
                            <span className="min-w-0">
                              <span className="block truncate text-[15px] font-semibold text-burgundy">{l.name}</span>
                              <span className="block truncate text-[14px] sm:text-[13px] text-ink-soft">{l.subArea ?? AREA_BY_SLUG[l.area]?.heading}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePick(id)}
                              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-burgundy hover:bg-parchment"
                              aria-label={`Remove ${l.name} from saved stops`}
                            >
                              <IconRemove size={18} />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )}
                <PlannerForm inputs={inputs} setInputs={setInputs} picksCount={validPicks.length} />
                {error && (
                  <p role="alert" className="mt-5 rounded-2xl border border-vermilion/30 bg-vermilion/[0.06] px-4 py-3 text-[14.5px] font-semibold text-vermilion">
                    {error}
                  </p>
                )}
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => generate(null)} className={`${btn.primary} px-6 text-[15.5px]`} disabled={!inputs.start}>
                    Make my plan <span aria-hidden="true">→</span>
                  </button>
                  {!inputs.start && <span className="text-[14px] text-ink-soft">Choose where you are starting from first.</span>}
                </div>
                <p className="mt-4 text-[14px] sm:text-[13.5px] text-ink-soft">
                  Plans use only what organisers have published. Anything unconfirmed is marked, and travel times are estimates.
                </p>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
