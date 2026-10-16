import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import autoUrl from './auto.webp'
import { autoMotion } from '../engine/motion'
import { getView } from '../engine/viewport'
import { proj, F, VPX, HORIZON } from '../scenes/world'
import { useJourney } from '../store/journey'
import { STOPS } from '../data/areas'

/**
 * The decorated auto: the client's own artwork (a straight rear view), cut out and placed dead centre on the
 * 3D road at true scale. The image's ground point between the rear wheels (ANCHOR) sits on the road at (X, lift, Z); PPM image pixels = 1 metre.
 */
const IMG_W = 1030
const IMG_H = 1290
const ANCHOR_X = 514.5
const ANCHOR_Y = 1269
const PPM = 750

/** gentle grading so the studio-lit photo sits in each scene's light */
const LIGHT: Record<string, string> = {
  hero: 'brightness(0.98) saturate(1)',
  yelahanka: 'brightness(1.02) saturate(1)',
  malleswaram: 'brightness(0.97) sepia(0.06)',
  'rt-nagar-palace-grounds': 'brightness(0.97) sepia(0.08)',
  ulsoor: 'brightness(0.93) sepia(0.12) saturate(0.98)',
  indiranagar: 'brightness(0.8) saturate(0.92) hue-rotate(-4deg)',
  'whitefield-hoodi': 'brightness(0.96) sepia(0.08)',
  koramangala: 'brightness(0.97) sepia(0.1)',
  'hsr-layout': 'brightness(0.97) sepia(0.06)',
  'south-east': 'brightness(0.88) sepia(0.08)',
  south: 'brightness(0.8) saturate(0.92) hue-rotate(-4deg)',
  finale: 'brightness(0.85) sepia(0.1)',
}

export function AutoSprite() {
  const wrap = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const img = useRef<HTMLImageElement>(null)
  const shadow = useRef<HTMLDivElement>(null)
  const index = useJourney((s) => s.index)

  useEffect(() => {
    if (img.current) img.current.style.filter = LIGHT[STOPS[index]] ?? 'none'
  }, [index])

  useEffect(() => {
    let t = 0
    let pitch = 0
    let lastSpeed = 0
    const tick = (_time: number, deltaMs: number) => {
      const w = wrap.current
      const b = body.current
      const sh = shadow.current
      if (!w || !b || !sh) return
      const dt = Math.min(0.05, deltaMs / 1000)
      t += dt
      const v = getView()
      const m = autoMotion
      const Z = Math.max(0.6, m.Z)
      const X = m.X + m.steer * 0.12
      const g = proj(X, m.lift, Z)
      const fov = m.fov
      const unitsPerM = (F / Z) * fov
      const k = (unitsPerM * v.s) / PPM // CSS px per image px
      const sx = v.vpX + (g.x - VPX) * v.s * fov
      const sy = v.vpY + (g.y - HORIZON) * v.s * fov
      // body life: fine vibration with speed, squat when accelerating, nose dip when braking
      const accel = (m.speed - lastSpeed) / Math.max(dt, 1e-3)
      lastSpeed = m.speed
      pitch += (Math.max(-1, Math.min(1, accel * 0.6)) - pitch) * Math.min(1, dt * 6)
      const vib = m.speed * (Math.sin(t * 41) * 0.6 + Math.sin(t * 67 + 1.3) * 0.4) * 0.004 * unitsPerM * v.s
      const squash = 1 - pitch * 0.006
      w.style.transform = `translate3d(${sx}px, ${sy}px, 0)`
      b.style.transform = `translate(${-ANCHOR_X}px, ${-ANCHOR_Y + vib}px) scale(${k}, ${k * squash})`
      // turning: the auto swings about its rear axle; nose right shows its rear face turned to the left
      if (img.current) img.current.style.transform = Math.abs(m.yaw) > 0.002 ? `perspective(2600px) rotateY(${(-m.yaw * 180) / Math.PI}deg)` : ''
      // contact shadow stays on the ground
      const shW = 1.55 * unitsPerM * v.s
      sh.style.transform = `translate(${-shW * 0.5}px, ${-0.2 * unitsPerM * v.s}px)`
      sh.style.width = `${shW}px`
      sh.style.height = `${0.42 * unitsPerM * v.s}px`
      w.style.opacity = String(m.opacity)
      w.style.visibility = m.opacity <= 0.001 ? 'hidden' : 'visible'
    }
    gsap.ticker.add(tick)
    tick(0, 16)
    return () => gsap.ticker.remove(tick)
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" id="auto-layer">
      <div ref={wrap} className="absolute left-0 top-0" style={{ willChange: 'transform, opacity' }}>
        <div
          ref={shadow}
          className="absolute left-0 top-0"
          style={{ borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(28,16,10,0.55), rgba(28,16,10,0.28) 60%, rgba(28,16,10,0))' }}
        />
        <div ref={body} className="absolute left-0 top-0" style={{ transformOrigin: `${ANCHOR_X}px ${ANCHOR_Y}px`, width: IMG_W, height: IMG_H }}>
          <img
            ref={img}
            src={autoUrl}
            width={IMG_W}
            height={IMG_H}
            alt=""
            draggable={false}
            style={{ display: 'block', width: IMG_W, height: IMG_H, maxWidth: 'none', transition: 'filter 1.2s ease', transformOrigin: '50% 100%' }}
          />
        </div>
      </div>
    </div>
  )
}
