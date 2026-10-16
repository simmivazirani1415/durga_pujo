import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { AREA_BY_SLUG } from '../data/areas'
import { LISTING_BY_ID } from '../data/listings'
import { useView } from '../engine/viewport'
import { useJourney } from '../store/journey'
import { COLLECTIBLES, COLLECTIBLE_BY_SLUG, Medallion } from './PujoIcons'
import { useGame } from './store'

const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** a soft two-note bell, only when the visitor has turned sound on */
function chime() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    const now = ctx.currentTime
    ;[
      [1318.5, 0],
      [1975.5, 0.14],
    ].forEach(([f, t]) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, now + t)
      g.gain.exponentialRampToValueAtTime(0.09, now + t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + 1.1)
      o.connect(g).connect(ctx.destination)
      o.start(now + t)
      o.stop(now + t + 1.2)
    })
    setTimeout(() => void ctx.close(), 1600)
  } catch {
    /* no audio available */
  }
}

/** opening a pandal's details for the first time in an area awards that area's collectible */
export function useCollectibleAwards() {
  useEffect(
    () =>
      useJourney.subscribe((st, prev) => {
        const id = st.panel.detailId
        if (!id || id === prev.panel.detailId) return
        const l = LISTING_BY_ID[id]
        if (!l || l.kind !== 'pandal' || !COLLECTIBLE_BY_SLUG[l.area]) return
        useGame.getState().collect(l.area)
      }),
    [],
  )
}

/** "Collection n / 9" in the upper HUD; opens to show what is collected and what is still out there */
export function CollectionCounter({ visible }: { visible: boolean }) {
  const collected = useGame((s) => s.collected)
  const award = useGame((s) => s.award)
  const [open, setOpen] = useState(false)
  const view = useView()
  const ref = useRef<HTMLButtonElement>(null)
  const justGot = useGame((s) => s.justGot)
  const show = visible || !!award || !!justGot
  // a new collectible lands: the collection opens for a moment to show it in its place
  useEffect(() => {
    if (!justGot) return
    setOpen(true)
    const t = setTimeout(() => {
      setOpen(false)
      useGame.getState().set({ justGot: null })
    }, 4200)
    return () => clearTimeout(t)
  }, [justGot])
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open])
  return (
    <div
      className="pointer-events-none fixed z-[41] flex flex-col items-end transition-opacity duration-300"
      style={{
        top: view.compact ? 'calc(max(14px, env(safe-area-inset-top, 0px)) + 52px)' : 'calc(max(14px, env(safe-area-inset-top, 0px)) + 78px)',
        right: view.compact ? 'max(16px, env(safe-area-inset-right, 0px))' : 'calc(max(16px, env(safe-area-inset-right, 0px)) + 16px)',
        opacity: show ? 1 : 0,
        visibility: show ? 'visible' : 'hidden',
      }}
    >
      <button
        ref={ref}
        type="button"
        data-collect-counter
        onClick={() => {
          setOpen((v) => !v)
          useGame.getState().set({ justGot: null })
        }}
        aria-expanded={open}
        className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#fbf3e2] py-1 pl-1 pr-3.5 text-[13px] font-bold text-burgundy-deep ring-1 ring-gold hover:bg-white sm:text-[14px]"
      >
        <span className="flex -space-x-2">
          {COLLECTIBLES.slice(0, 3).map((c) => (
            <Medallion key={c.id} c={c} size={view.compact ? 22 : 26} missing={!collected.includes(c.slug)} />
          ))}
        </span>
        <span>
          Collection <span className="tabular">{collected.length} / {COLLECTIBLES.length}</span>
        </span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Your Pujo collection"
          className="pointer-events-auto mt-2 w-[min(340px,calc(100vw-32px))] rounded-[22px] bg-[#f6d77a] p-4 ring-1 ring-gold-deep"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="font-headline text-[22px] leading-none text-burgundy-deep">Pujo collection</p>
            <button type="button" onClick={() => { setOpen(false); useGame.getState().set({ justGot: null }) }} className="grid h-8 w-8 place-items-center rounded-full bg-[#fbf3e2] text-burgundy ring-1 ring-gold" aria-label="Close collection">
              ✕
            </button>
          </div>
          <p className="mb-3 text-[12.5px] font-medium leading-snug text-[#3b2316]">One for every pandal stop. Tap Explore when your auto halts there to collect it.</p>
          <ul className="grid grid-cols-3 gap-x-2 gap-y-3">
            {COLLECTIBLES.map((c) => {
              const have = collected.includes(c.slug)
              return (
                <li key={c.id} className="flex flex-col items-center text-center">
                  <span className={`rounded-full ${justGot === c.slug ? 'ring-[3px] ring-burgundy ring-offset-2 ring-offset-[#f6d77a] animate-[collect-pop_0.6s_ease-out]' : ''}`}>
                    <Medallion c={c} size={64} missing={!have} />
                  </span>
                  {justGot === c.slug && <span className="mt-1 rounded-full bg-burgundy px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ivory">New</span>}
                  <span className={`mt-1 text-[11.5px] font-bold leading-tight ${have ? 'text-burgundy-deep' : 'text-[#6b5236]'}`}>{have ? c.name : '?'}</span>
                  <span className="text-[10.5px] font-medium leading-tight text-[#6b5236]">{AREA_BY_SLUG[c.slug].shortName}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

/** the medallion rises, then flies up into the counter */
export function AwardAnimation() {
  const award = useGame((s) => s.award)
  const sound = useGame((s) => s.sound)
  const wrap = useRef<HTMLDivElement>(null)
  const med = useRef<HTMLDivElement>(null)
  const cap = useRef<HTMLDivElement>(null)
  const c = award ? COLLECTIBLE_BY_SLUG[award] : undefined

  useEffect(() => {
    if (!award || !med.current || !cap.current || !wrap.current) return
    if (sound) chime()
    const live = document.getElementById('journey-live')
    if (live && c) live.textContent = `Collected: ${c.name}, ${AREA_BY_SLUG[award].shortName}.`
    const m = med.current
    const k = cap.current
    const done = () => useGame.getState().set({ award: null, justGot: award })
    const tl = gsap.timeline({ onComplete: done })
    if (reduceMotion()) {
      tl.fromTo([m, k], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 })
      tl.to([m, k], { autoAlpha: 0, duration: 0.3 }, 1.8)
      return () => {
        tl.kill()
      }
    }
    const target = document.querySelector<HTMLElement>('[data-collect-counter]')?.getBoundingClientRect()
    const r = m.getBoundingClientRect()
    const dx = target ? target.left + 26 - (r.left + r.width / 2) : 0
    const dy = target ? target.top + target.height / 2 - (r.top + r.height / 2) : -300
    tl.fromTo(m, { autoAlpha: 0, y: 40, scale: 0.6 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.7)' })
    tl.fromTo(k, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.25)
    tl.to(m, { y: -16, duration: 1.0, ease: 'sine.inOut' }, 0.6)
    tl.to(k, { autoAlpha: 0, duration: 0.25 }, 1.7)
    tl.to(m, { x: dx, y: dy, scale: 0.24, duration: 0.75, ease: 'power2.in' }, 1.7)
    tl.to(m, { autoAlpha: 0, duration: 0.15 }, 2.4)
    tl.call(() => {
      const el = document.querySelector<HTMLElement>('[data-collect-counter]')
      if (el) gsap.fromTo(el, { scale: 1.12 }, { scale: 1, duration: 0.45, ease: 'back.out(2)' })
    }, [], 2.42)
    return () => {
      tl.kill()
    }
  }, [award])

  if (!c) return null
  return createPortal(
    <div ref={wrap} className="pointer-events-none fixed inset-0 z-[80] flex flex-col items-center justify-center" aria-hidden="true">
      <div ref={med} style={{ opacity: 0 }}>
        <Medallion c={c} size={128} />
      </div>
      <div ref={cap} className="mt-3 rounded-2xl bg-[#fbf3e2] px-5 py-2 text-center ring-1 ring-gold" style={{ opacity: 0 }}>
        <p className="text-[15px] font-bold text-burgundy-deep">You collected the {c.name}</p>
        <p className="text-[12.5px] font-medium text-[#5b4a45]">{award ? AREA_BY_SLUG[award].shortName : ''}</p>
      </div>
    </div>,
    document.body,
  )
}
