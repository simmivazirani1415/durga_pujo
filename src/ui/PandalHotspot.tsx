import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useView } from '../engine/viewport'
import { pandalAnchor } from '../world3d/engine3d'

/**
 * An invisible hit area over the 3D pandal the auto has parked in front of, so tapping the pandal opens the
 * stop's info just like the card's Explore button. It follows the pandal's projected top every frame.
 */
export function PandalHotspot({ onOpen, hidden }: { onOpen: () => void; hidden?: boolean }) {
  const view = useView()
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tick = () => {
      const el = wrap.current
      if (!el) return
      if (!pandalAnchor.on) {
        el.style.visibility = 'hidden'
        return
      }
      el.style.visibility = ''
      el.style.transform = `translate3d(${pandalAnchor.x}px, ${pandalAnchor.y}px, 0)`
    }
    gsap.ticker.add(tick)
    tick()
    return () => gsap.ticker.remove(tick)
  }, [])

  const hitW = Math.round(Math.max(160, Math.min(380, view.W * 0.3)))
  return (
    <div ref={wrap} className="pointer-events-none absolute left-0 top-0" style={{ visibility: 'hidden' }}>
      <button
        type="button"
        onClick={onOpen}
        tabIndex={-1}
        aria-hidden="true"
        className={`absolute -translate-x-1/2 cursor-pointer rounded-[18px] bg-transparent ${hidden ? '' : 'pointer-events-auto'}`}
        style={{ width: hitW, height: Math.round(hitW * 0.8), top: 4 }}
      />
    </div>
  )
}

export function PinIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
    </svg>
  )
}
