import { AREA_COUNT, areaAt } from '../data/areas'
import { countsFor } from '../data/listings'
import { next } from '../engine/director'
import { useView } from '../engine/viewport'
import { useJourney } from '../store/journey'
import { pad2, useCoarsePointer } from './hooks'
import { useEffect, useState } from 'react'
import { RouteMenu } from './RouteRail'
import { PandalHotspot, PinIcon } from './PandalHotspot'
import { CornerRosette, LotusMark, LotusOutline, Sparkle } from './Ornament'
import { StopInfo } from './StopInfo'
import { useGame } from '../game/store'

function countLabel(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

export function ArrivalCard() {
  const index = useJourney((s) => s.index)
  const panelOpen = useJourney((s) => s.panel.open)
  const openPanel = useJourney((s) => s.openPanel)
  const view = useView()
  const coarse = useCoarsePointer()
  const [menu, setMenu] = useState(false)
  const [info, setInfo] = useState(false)
  const [closed, setClosed] = useState(false)
  const phase = useGame((s) => s.phase)
  useEffect(() => setInfo(false), [index])
  // every new halt shows the card again
  useEffect(() => {
    if (phase === 'parked') setClosed(false)
  }, [phase, index])
  const area = areaAt(index)
  const nextArea = areaAt(index + 1)
  const counts = area ? countsFor(area.slug) : { pandal: 0, food: 0, event: 0 }
  const chips = [
    counts.pandal ? countLabel(counts.pandal, 'pandal', 'pandals') : null,
    counts.food ? countLabel(counts.food, 'food stop', 'food stops') : null,
    counts.event ? countLabel(counts.event, 'event', 'events') : null,
  ].filter(Boolean) as string[]
  const place = area ? (area.heading.length <= 20 ? area.heading : area.shortName) : ''
  const cta = counts.pandal ? `Explore pandals in ${place}` : `Explore Pujo in ${place}`
  const riding = useGame((s) => s.mode === 'drive')
  const cue = nextArea
    ? riding
      ? `${coarse ? 'Tap ▲ or swipe up' : 'Press ↑ or scroll'} to ride on to ${nextArea.shortName}`
      : `${coarse ? 'Swipe up' : 'Scroll'} to ride to ${nextArea.shortName}`
    : riding
      ? `${coarse ? 'Tap ▲' : 'Press ↑'} to ride on to Vidhana Soudha`
      : `${coarse ? 'Swipe up' : 'Scroll'} to finish the ride`
  const gutter = { paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))', paddingRight: 'max(16px, env(safe-area-inset-right, 0px))' }

  return (
    <section
      data-ui="arrival"
      aria-live="off"
      className="pointer-events-none fixed inset-0 z-20"
      style={{ visibility: 'hidden', opacity: 0 }}
    >
      {area && (
        <div
          className="transition-opacity duration-300"
          style={{ opacity: panelOpen ? 0 : 1, pointerEvents: panelOpen ? 'none' : undefined }}
        >
          {/* the pandal itself is clickable too (under the card, so the card always wins) */}
          <PandalHotspot onOpen={() => setInfo(true)} hidden={info} />

          {/* the stop card, centred at the top: where you are, the area, its line and the call to action */}
          <div
            className="absolute inset-x-0 flex justify-center transition-opacity duration-300"
            style={{ ...gutter, top: view.compact ? 94 : 'max(78px, 9vh)', opacity: info || closed ? 0 : 1, visibility: closed ? 'hidden' : undefined, pointerEvents: info || closed ? 'none' : undefined }}
          >
            <div
              className={`pointer-events-auto relative w-full overflow-hidden rounded-[26px] bg-[#fbf3e2] text-center ring-1 ring-gold ${
                view.compact ? 'max-w-[440px] px-5 pb-5 pt-4' : 'max-w-[740px] px-10 pb-6 pt-5'
              }`}
            >
              <span aria-hidden="true" className="pointer-events-none absolute inset-[6px] rounded-[21px] border border-gold/45" />
              <button
                type="button"
                onClick={() => setClosed(true)}
                aria-label="Close the stop card"
                className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-white text-[15px] font-bold text-burgundy ring-1 ring-gold hover:bg-[#fffaf0]"
              >
                ✕
              </button>
              <CornerRosette className="pointer-events-none absolute -left-3 -top-3 h-[110px] w-[110px] text-gold-deep/45" />
              <CornerRosette mirror className="pointer-events-none absolute -right-3 -top-3 h-[110px] w-[110px] text-gold-deep/45" />
              {!view.compact && (
                <>
                  <LotusOutline className="pointer-events-none absolute -bottom-3 -left-6 h-[150px] w-[170px] text-gold-deep/35" />
                  <LotusOutline mirror className="pointer-events-none absolute -bottom-3 -right-6 h-[150px] w-[170px] text-gold-deep/35" />
                </>
              )}
              <div className={`relative flex flex-col items-center ${view.compact ? 'gap-1.5' : 'gap-2'}`}>
                <button
                  type="button"
                  onClick={() => setMenu(true)}
                  className="flex items-center gap-2 rounded-full bg-[#fdf8ee] px-4 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.18em] text-burgundy ring-1 ring-gold hover:bg-white"
                  aria-label={`Stop ${index} of ${AREA_COUNT}, ${area.region} Bengaluru. Show all stops`}
                >
                  <PinIcon />
                  <span className="tabular">Stop {pad2(index)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{area.shortName}</span>
                  <span aria-hidden="true">▾</span>
                </button>
                <h2 className={`font-headline font-normal leading-[1] tracking-[-0.01em] text-burgundy-deep ${view.compact ? 'mt-1 text-[clamp(34px,10vw,44px)]' : area.heading.length > 16 ? 'mt-1 whitespace-nowrap text-[clamp(40px,3.6vw,52px)]' : 'mt-1 text-[clamp(44px,5.4vw,72px)]'}`}>
                  {area.heading}
                </h2>
                <span aria-hidden="true" className="flex items-center gap-2.5 text-gold-deep">
                  <span className="h-px w-16 bg-gold sm:w-24" />
                  <LotusMark className="h-3.5 w-4 text-burgundy-soft" />
                  <span className="h-px w-16 bg-gold sm:w-24" />
                </span>
                <p className={`max-w-[44ch] font-medium leading-snug text-ink ${view.compact ? 'text-[14px]' : 'text-[17px]'}`}>{area.subtitle}</p>
                <p className="flex items-center gap-2.5 text-[14px] font-bold text-burgundy sm:text-[15.5px]">
                  <Sparkle className="h-2.5 w-2.5 text-gold-deep" />
                  <span aria-hidden="true" className="h-px w-8 bg-gold sm:w-12" />
                  {chips.length ? chips.join(' · ') : 'No 2026 listings yet'}
                  <span aria-hidden="true" className="h-px w-8 bg-gold sm:w-12" />
                  <Sparkle className="h-2.5 w-2.5 text-gold-deep" />
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setInfo(true)
                    // the stop's Pujo collectible is awarded on exploring it
                    useGame.getState().collect(area.slug)
                  }}
                  className={`relative mt-2 flex w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-[linear-gradient(180deg,#7d1a2b,#5c1020)] font-display font-semibold text-ivory ring-1 ring-gold hover:bg-[linear-gradient(180deg,#8a2033,#651b28)] ${
                    view.compact ? 'min-h-[50px] px-10 text-[19px]' : 'min-h-[60px] max-w-[540px] px-16 text-[23px]'
                  }`}
                >
                  <LotusOutline className="pointer-events-none absolute -left-2 top-1/2 h-[52px] w-[60px] -translate-y-1/2 text-[#c0384c]" />
                  <LotusOutline mirror className="pointer-events-none absolute -right-2 top-1/2 h-[52px] w-[60px] -translate-y-1/2 text-[#c0384c]" />
                  <span className="relative">{view.compact ? `Explore ${place}` : cta}</span>
                  <span aria-hidden="true" className="relative font-sans text-[0.9em]">→</span>
                </button>
              </div>
            </div>
          </div>

          {closed && !info && (
            <div className="absolute inset-x-0 flex justify-center" style={{ ...gutter, top: view.compact ? 94 : 'max(78px, 9vh)' }}>
              <button
                type="button"
                onClick={() => setClosed(false)}
                className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#fbf3e2] px-4 py-2 text-[14px] font-bold text-burgundy-deep ring-1 ring-gold hover:bg-white"
              >
                <PinIcon /> {area.shortName} · Explore pandals
              </button>
            </div>
          )}

          {/* the stop's info, opened from Explore */}
          {info && (
            <div className="absolute inset-x-0 flex justify-center" style={{ ...gutter, top: view.compact ? 94 : 'max(78px, 9vh)' }}>
              <StopInfo
                area={area}
                place={place}
                counts={counts}
                onClose={() => setInfo(false)}
                open={(o) => {
                  setInfo(false)
                  openPanel(o)
                }}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => next()}
            className={`pointer-events-auto absolute left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold tracking-wide ${
              riding ? 'bg-[#fbf3e2] text-burgundy-deep ring-1 ring-gold' : 'text-ivory [text-shadow:0_1px_8px_rgba(30,15,10,0.8)]'
            }`}
            style={{ bottom: riding ? (coarse || view.compact ? 'calc(max(14px, env(safe-area-inset-bottom, 0px)) + 132px)' : 'max(18px, env(safe-area-inset-bottom, 0px))') : 'max(10px, env(safe-area-inset-bottom, 0px))' }}
          >
            {cue} <span aria-hidden="true">{riding ? '' : '↓'}</span>
          </button>
        </div>
      )}
      {menu && <RouteMenu onClose={() => setMenu(false)} />}
    </section>
  )
}
