import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { autoMotion, CRUISE_MPS, roadState } from './motion'
import { getView, onView, type ViewMap } from './viewport'
import { proj, roadCenterX, type RoadStyle } from '../scenes/world'

/**
 * Moving road markings in true perspective: centre dashes and painted kerb stones roll towards the
 * viewer as the auto drives, so speed reads instantly. Drawn between the 'back' and 'front' bands.
 */
const Z_NEAR = 1.6
const Z_FAR = 75

function quad(
  ctx: CanvasRenderingContext2D,
  v: ViewMap,
  road: RoadStyle,
  X0: number,
  X1: number,
  za: number,
  zb: number,
) {
  // sample along Z so bends stay smooth
  const steps = road.bend ? 3 : 1
  ctx.beginPath()
  for (let i = 0; i <= steps; i++) {
    const z = za + ((zb - za) * i) / steps
    const p = proj(roadCenterX(road, z) + X0, 0, z)
    const x = v.ox + p.x * v.s
    const y = v.oy + p.y * v.s
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  for (let i = steps; i >= 0; i--) {
    const z = za + ((zb - za) * i) / steps
    const p = proj(roadCenterX(road, z) + X1, 0, z)
    ctx.lineTo(v.ox + p.x * v.s, v.oy + p.y * v.s)
  }
  ctx.closePath()
  ctx.fill()
}

function fadeAt(z: number) {
  return Math.max(0, Math.min(1, 1 - (z - 28) / 45))
}

function drawStyle(ctx: CanvasRenderingContext2D, v: ViewMap, road: RoadStyle, alpha: number, travel: number) {
  if (alpha <= 0.01) return
  const hw = road.halfWidth
  // centre line
  if (road.center !== 'none') {
    ctx.fillStyle = road.centerColor
    const lw = 0.07
    if (road.center === 'dashed') {
      const period = 6
      const phase = ((travel % period) + period) % period
      for (let z0 = Z_NEAR - phase; z0 < Z_FAR; z0 += period) {
        const za = Math.max(Z_NEAR, z0)
        const zb = Math.min(Z_FAR, z0 + 3)
        if (zb <= za) continue
        ctx.globalAlpha = alpha * fadeAt(za) * 0.92
        quad(ctx, v, road, -lw, lw, za, zb)
      }
    } else {
      const offs = road.center === 'double' ? [-0.12, 0.12] : [0]
      for (const o of offs) {
        for (let z = Z_NEAR; z < Z_FAR; z += 6) {
          ctx.globalAlpha = alpha * fadeAt(z) * 0.9
          quad(ctx, v, road, o - lw * 0.8, o + lw * 0.8, z, Math.min(Z_FAR, z + 6.05))
        }
      }
    }
  }
  if (road.edgeLines) {
    ctx.fillStyle = '#f1ead9'
    for (let z = Z_NEAR; z < Z_FAR; z += 6) {
      ctx.globalAlpha = alpha * fadeAt(z) * 0.75
      quad(ctx, v, road, -hw + 0.18, -hw + 0.3, z, z + 6.05)
      quad(ctx, v, road, hw - 0.3, hw - 0.18, z, z + 6.05)
    }
  }
  if (road.kerb !== 'none') {
    const seg = 1.0
    const period = seg * 2
    const phase = ((travel % period) + period) % period
    const light = road.kerb === 'by' ? '#e6c234' : '#efe9dd'
    const dark = '#23201e'
    for (let z0 = Z_NEAR - phase; z0 < Z_FAR; z0 += seg) {
      const za = Math.max(Z_NEAR, z0)
      const zb = Math.min(Z_FAR, z0 + seg)
      if (zb <= za) continue
      const idx = Math.round((z0 + phase) / seg)
      ctx.fillStyle = idx % 2 === 0 ? light : dark
      ctx.globalAlpha = alpha * fadeAt(za) * 0.95
      quad(ctx, v, road, -hw - 0.2, -hw, za, zb)
      quad(ctx, v, road, hw, hw + 0.2, za, zb)
    }
  }
  ctx.globalAlpha = 1
}

export function RoadCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let dirty = true
    const resize = () => {
      const v = getView()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(v.W * dpr)
      canvas.height = Math.round(v.H * dpr)
      canvas.style.width = `${v.W}px`
      canvas.style.height = `${v.H}px`
      dirty = true
    }
    resize()
    const off = onView(resize)
    let last = { travel: NaN, mix: NaN, alpha: NaN, from: null as unknown, to: null as unknown }
    const tick = (_t: number, deltaMs: number) => {
      const dt = Math.min(0.05, deltaMs / 1000)
      roadState.travel += autoMotion.speed * autoMotion.dir * dt * CRUISE_MPS
      const changed =
        dirty ||
        last.travel !== roadState.travel ||
        last.mix !== roadState.mix ||
        last.alpha !== roadState.alpha ||
        last.from !== roadState.from ||
        last.to !== roadState.to
      if (!changed) return
      last = { travel: roadState.travel, mix: roadState.mix, alpha: roadState.alpha, from: roadState.from, to: roadState.to }
      dirty = false
      const v = getView()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, v.W, v.H)
      const { from, to, mix, alpha, travel } = roadState
      if (from && mix < 1) drawStyle(ctx, v, from, alpha * (1 - mix), travel)
      if (to && mix > 0) drawStyle(ctx, v, to, alpha * mix, travel)
    }
    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
      off()
    }
  }, [])

  return <canvas ref={ref} className="absolute inset-0 pointer-events-none" aria-hidden="true" />
}
