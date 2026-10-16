/**
 * Procedural, texture-driven surfaces for the 3D streets: asphalt, pavers, painted kerbs, plaster facades
 * with windows, glass curtain walls, Mangalore roof tiles, grass, bark, leaf clusters and water normals.
 * Everything is drawn once on canvases at start-up, so the site stays a single self-contained file.
 */
import * as THREE from 'three'

export function rand(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const cache = new Map<string, THREE.Texture>()

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return { c, g: c.getContext('2d')! }
}

function tex(key: string, c: HTMLCanvasElement, opts: { srgb?: boolean; repeat?: boolean; aniso?: number } = {}) {
  const t = new THREE.CanvasTexture(c)
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace
  if (opts.repeat !== false) t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = opts.aniso ?? 8
  t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter
  cache.set(key, t)
  return t
}

function cached(key: string, make: () => THREE.Texture) {
  return cache.get(key) ?? make()
}

/** speckle noise: n dots of random size and alpha */
function speckle(g: CanvasRenderingContext2D, w: number, h: number, n: number, r: () => number, colors: string[], size = 2, alpha = 0.25) {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = alpha * (0.3 + r() * 0.7)
    g.fillStyle = colors[Math.floor(r() * colors.length)]
    const s = size * (0.4 + r() * 1.2)
    g.fillRect(r() * w, r() * h, s, s)
  }
  g.globalAlpha = 1
}

/** soft blotches, for weathering and stains */
function blotches(g: CanvasRenderingContext2D, w: number, h: number, n: number, r: () => number, color: string, rad: number, alpha: number) {
  for (let i = 0; i < n; i++) {
    const x = r() * w
    const y = r() * h
    const rr = rad * (0.4 + r())
    const grd = g.createRadialGradient(x, y, 0, x, y, rr)
    grd.addColorStop(0, color)
    grd.addColorStop(1, 'rgba(0,0,0,0)')
    g.globalAlpha = alpha * (0.4 + r() * 0.6)
    g.fillStyle = grd
    g.fillRect(x - rr, y - rr, rr * 2, rr * 2)
  }
  g.globalAlpha = 1
}

/* ---------------------------------------------------------------- road */

/** asphalt with lane markings, laid across the road: u spans the carriageway, v runs along it (1 tile = 12 m) */
export function roadTexture(lanes: 'two' | 'four' | 'narrow') {
  return cached('road-' + lanes, () => {
    const { c, g } = canvas(512, 1024)
    const r = rand(7)
    g.fillStyle = '#4a4744'
    g.fillRect(0, 0, 512, 1024)
    speckle(g, 512, 1024, 26000, r, ['#2c2a28', '#6a6662', '#7d7873', '#3a3735'], 2.2, 0.5)
    blotches(g, 512, 1024, 26, r, 'rgba(30,28,26,0.9)', 90, 0.25)
    blotches(g, 512, 1024, 14, r, 'rgba(120,112,104,0.9)', 70, 0.12)
    // tyre tracks: darker, smoother bands
    for (const x of [0.18, 0.32, 0.68, 0.82]) {
      const grd = g.createLinearGradient(x * 512 - 30, 0, x * 512 + 30, 0)
      grd.addColorStop(0, 'rgba(20,18,16,0)')
      grd.addColorStop(0.5, 'rgba(20,18,16,0.22)')
      grd.addColorStop(1, 'rgba(20,18,16,0)')
      g.fillStyle = grd
      g.fillRect(x * 512 - 30, 0, 60, 1024)
    }
    // patch repairs
    for (let i = 0; i < 4; i++) {
      g.fillStyle = `rgba(${40 + r() * 20},${38 + r() * 20},${36 + r() * 18},0.55)`
      g.fillRect(r() * 420, r() * 960, 40 + r() * 70, 30 + r() * 60)
    }
    const paint = (x: number, w: number, dash: number | null, col = '#ece6d6') => {
      g.fillStyle = col
      if (dash === null) {
        g.globalAlpha = 0.85
        g.fillRect(x - w / 2, 0, w, 1024)
      } else {
        g.globalAlpha = 0.88
        for (let y = 0; y < 1024; y += dash * 2) g.fillRect(x - w / 2, y + dash * 0.25, w, dash)
      }
      g.globalAlpha = 1
    }
    // edge lines
    paint(14, 8, null)
    paint(498, 8, null)
    if (lanes === 'four') {
      paint(256 - 7, 6, null, '#e7c35a')
      paint(256 + 7, 6, null, '#e7c35a')
      paint(132, 6, 160)
      paint(380, 6, 160)
    } else if (lanes === 'two') {
      paint(256, 8, 170)
    } else {
      paint(256, 6, 120)
    }
    // wear on the paint
    speckle(g, 512, 1024, 6000, r, ['#4a4744'], 3, 0.6)
    return tex('road-' + lanes, c)
  })
}

/** interlocking concrete pavers (1 tile = 2 m) */
export function paverTexture() {
  return cached('pavers', () => {
    const { c, g } = canvas(512, 512)
    const r = rand(11)
    g.fillStyle = '#9b938a'
    g.fillRect(0, 0, 512, 512)
    const s = 32
    for (let y = 0; y < 512; y += s) {
      for (let x = 0; x < 512; x += s * 2) {
        const off = (y / s) % 2 ? s : 0
        const tone = 150 + r() * 40
        const red = r() < 0.18
        g.fillStyle = red ? `rgb(${tone * 0.95},${tone * 0.62},${tone * 0.52})` : `rgb(${tone},${tone * 0.96},${tone * 0.9})`
        g.fillRect(((x + off) % 512) + 1.5, y + 1.5, s * 2 - 3, s - 3)
      }
    }
    speckle(g, 512, 512, 9000, r, ['#5e5852', '#c8c0b4'], 2, 0.35)
    blotches(g, 512, 512, 12, r, 'rgba(60,52,44,0.9)', 60, 0.2)
    return tex('pavers', c)
  })
}

/** kerb stones painted in alternating black and yellow, the Bengaluru way (1 tile = 2 m) */
export function kerbTexture() {
  return cached('kerb', () => {
    const { c, g } = canvas(256, 64)
    const r = rand(5)
    g.fillStyle = '#e8c348'
    g.fillRect(0, 0, 256, 64)
    g.fillStyle = '#1e1c1a'
    g.fillRect(128, 0, 128, 64)
    speckle(g, 256, 64, 2500, r, ['#6a645c', '#c9c2b4', '#3a3632'], 2, 0.4)
    return tex('kerb', c)
  })
}

export function grassTexture(tone: 'green' | 'dry' = 'green') {
  return cached('grass-' + tone, () => {
    const { c, g } = canvas(512, 512)
    const r = rand(tone === 'green' ? 3 : 4)
    g.fillStyle = tone === 'green' ? '#4f6a33' : '#7f7a48'
    g.fillRect(0, 0, 512, 512)
    blotches(g, 512, 512, 40, r, tone === 'green' ? 'rgba(90,120,50,1)' : 'rgba(140,120,70,1)', 60, 0.35)
    blotches(g, 512, 512, 30, r, 'rgba(60,48,30,1)', 40, 0.2)
    for (let i = 0; i < 14000; i++) {
      const x = r() * 512
      const y = r() * 512
      g.strokeStyle = tone === 'green' ? ['#6f8f45', '#3e5528', '#86a456', '#56702f'][Math.floor(r() * 4)] : ['#a39860', '#6f6a3c', '#8d8550'][Math.floor(r() * 3)]
      g.globalAlpha = 0.5
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 5)
      g.stroke()
    }
    g.globalAlpha = 1
    return tex('grass-' + tone, c)
  })
}

export function dirtTexture() {
  return cached('dirt', () => {
    const { c, g } = canvas(512, 512)
    const r = rand(9)
    g.fillStyle = '#8a6b4c'
    g.fillRect(0, 0, 512, 512)
    blotches(g, 512, 512, 40, r, 'rgba(110,84,58,1)', 70, 0.4)
    speckle(g, 512, 512, 20000, r, ['#5a4532', '#a88a66', '#6e553c'], 2.4, 0.45)
    return tex('dirt', c)
  })
}

/* ---------------------------------------------------------------- walls and facades */

/** plaster with weathering and monsoon streaks; greyscale-ish so material colour tints it (1 tile = 4 m) */
export function plasterTexture() {
  return cached('plaster', () => {
    const { c, g } = canvas(512, 512)
    const r = rand(13)
    g.fillStyle = '#e9e4dc'
    g.fillRect(0, 0, 512, 512)
    speckle(g, 512, 512, 16000, r, ['#c9c2b6', '#f6f2ea', '#b4ab9e'], 2, 0.35)
    blotches(g, 512, 512, 18, r, 'rgba(150,140,124,1)', 80, 0.18)
    // rain streaks
    for (let i = 0; i < 40; i++) {
      const x = r() * 512
      const grd = g.createLinearGradient(0, 0, 0, 512)
      grd.addColorStop(0, 'rgba(90,80,70,0.25)')
      grd.addColorStop(1, 'rgba(90,80,70,0)')
      g.fillStyle = grd
      g.fillRect(x, 0, 2 + r() * 5, 120 + r() * 300)
    }
    return tex('plaster', c)
  })
}

export type FacadeKind = 'apartment' | 'office' | 'heritage' | 'villa' | 'house'

/**
 * One facade tile = one bay (3 m wide) x one floor (3.2 m). The colour map is near-white plaster so material
 * colour tints walls; windows keep their own colour. Returns colour + emissive (lit windows at night) maps.
 */
export function facadeTextures(kind: FacadeKind) {
  const key = 'facade-' + kind
  const hit = cache.get(key)
  if (hit) return { map: hit, emissive: cache.get(key + '-e')!, rough: cache.get(key + '-r')! }
  const W = 1024
  const H = 1024
  const bays = 4
  const floors = 4
  const { c, g } = canvas(W, H)
  const e = canvas(W, H)
  const ro = canvas(W, H)
  const r = rand(kind.length * 17)
  g.fillStyle = '#efebe4'
  g.fillRect(0, 0, W, H)
  speckle(g, W, H, 22000, r, ['#d4cdc1', '#faf7f1', '#beb5a8'], 2, 0.3)
  blotches(g, W, H, 20, r, 'rgba(140,128,110,1)', 90, 0.16)
  e.g.fillStyle = '#000'
  e.g.fillRect(0, 0, W, H)
  ro.g.fillStyle = '#e0e0e0'
  ro.g.fillRect(0, 0, W, H)
  const bw = W / bays
  const fh = H / floors
  for (let f = 0; f < floors; f++) {
    for (let b = 0; b < bays; b++) {
      const x0 = b * bw
      const y0 = f * fh
      const lit = r() < 0.38
      const warm = ['#ffd68a', '#ffe2a8', '#ffcf7a', '#fff0cf'][Math.floor(r() * 4)]
      if (kind === 'office') {
        // curtain-wall bay with spandrel
        g.fillStyle = '#6f8597'
        g.fillRect(x0 + 6, y0 + 10, bw - 12, fh * 0.72)
        const grd = g.createLinearGradient(x0, y0, x0 + bw, y0 + fh)
        grd.addColorStop(0, 'rgba(220,235,245,0.55)')
        grd.addColorStop(0.5, 'rgba(120,145,165,0.1)')
        grd.addColorStop(1, 'rgba(230,240,250,0.35)')
        g.fillStyle = grd
        g.fillRect(x0 + 6, y0 + 10, bw - 12, fh * 0.72)
        g.fillStyle = '#3b444c'
        g.fillRect(x0, y0, 6, fh)
        g.fillRect(x0 + bw / 2 - 2, y0 + 10, 4, fh * 0.72)
        g.fillStyle = '#c9cfd3'
        g.fillRect(x0, y0 + fh * 0.76, bw, fh * 0.24)
        ro.g.fillStyle = '#202020'
        ro.g.fillRect(x0 + 6, y0 + 10, bw - 12, fh * 0.72)
        if (lit) {
          e.g.fillStyle = r() < 0.5 ? '#f4f0dc' : '#ffe2a8'
          e.g.globalAlpha = 0.7
          e.g.fillRect(x0 + 6, y0 + 10, bw - 12, fh * 0.72)
          e.g.globalAlpha = 1
        }
        continue
      }
      const ww = kind === 'heritage' ? bw * 0.38 : kind === 'villa' ? bw * 0.56 : bw * 0.5
      const wh = kind === 'heritage' ? fh * 0.55 : fh * 0.48
      const wx = x0 + (bw - ww) / 2
      const wy = y0 + fh * 0.2
      // window reveal shadow
      g.fillStyle = 'rgba(80,66,52,0.45)'
      g.fillRect(wx - 6, wy - 6, ww + 12, wh + 14)
      // frame
      g.fillStyle = kind === 'heritage' ? '#f7f3ea' : '#d8d2c8'
      g.fillRect(wx - 4, wy - 4, ww + 8, wh + 8)
      // glass
      const glass = g.createLinearGradient(wx, wy, wx, wy + wh)
      glass.addColorStop(0, '#5a6670')
      glass.addColorStop(1, '#2c333a')
      g.fillStyle = glass
      if (kind === 'heritage') {
        g.beginPath()
        g.moveTo(wx, wy + wh)
        g.lineTo(wx, wy + ww / 2)
        g.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0)
        g.lineTo(wx + ww, wy + wh)
        g.closePath()
        g.fill()
      } else g.fillRect(wx, wy, ww, wh)
      ro.g.fillStyle = '#303030'
      ro.g.fillRect(wx, wy, ww, wh)
      // curtains / grilles
      if (kind === 'apartment' || kind === 'house') {
        g.strokeStyle = 'rgba(40,40,40,0.8)'
        g.lineWidth = 3
        for (let i = 1; i < 5; i++) {
          g.beginPath()
          g.moveTo(wx + (ww / 5) * i, wy)
          g.lineTo(wx + (ww / 5) * i, wy + wh)
          g.stroke()
        }
        g.beginPath()
        g.moveTo(wx, wy + wh / 2)
        g.lineTo(wx + ww, wy + wh / 2)
        g.stroke()
      } else {
        g.fillStyle = 'rgba(240,235,225,0.9)'
        g.fillRect(wx + ww / 2 - 3, wy, 6, wh)
      }
      if (r() < 0.35) {
        g.fillStyle = ['rgba(190,90,70,0.55)', 'rgba(230,200,140,0.55)', 'rgba(120,150,170,0.5)'][Math.floor(r() * 3)]
        g.fillRect(wx + 2, wy + 2, ww * (0.25 + r() * 0.3), wh - 4)
      }
      // sunshade (chajja) over the window
      g.fillStyle = 'rgba(70,60,50,0.5)'
      g.fillRect(wx - 16, wy - 16, ww + 32, 10)
      g.fillStyle = '#ddd6ca'
      g.fillRect(wx - 16, wy - 22, ww + 32, 8)
      // balcony on apartments
      if (kind === 'apartment' && b % 2 === 1) {
        g.fillStyle = 'rgba(60,50,40,0.35)'
        g.fillRect(x0 + 8, y0 + fh * 0.74, bw - 16, fh * 0.06)
        g.fillStyle = '#d9d2c4'
        g.fillRect(x0 + 8, y0 + fh * 0.8, bw - 16, fh * 0.17)
        g.strokeStyle = 'rgba(50,50,50,0.7)'
        g.lineWidth = 2
        for (let i = 0; i < 10; i++) {
          g.beginPath()
          g.moveTo(x0 + 12 + i * ((bw - 24) / 9), y0 + fh * 0.8)
          g.lineTo(x0 + 12 + i * ((bw - 24) / 9), y0 + fh * 0.97)
          g.stroke()
        }
      }
      if (lit) {
        e.g.fillStyle = warm
        e.g.globalAlpha = 0.85
        e.g.fillRect(wx, wy, ww, wh)
        e.g.globalAlpha = 1
      }
    }
    // floor slab line
    g.fillStyle = 'rgba(90,80,68,0.35)'
    g.fillRect(0, f * fh + fh - 6, W, 6)
  }
  const map = tex(key, c)
  const emissive = tex(key + '-e', e.c)
  const rough = tex(key + '-r', ro.c, { srgb: false })
  return { map, emissive, rough }
}

/** shopfront strip for ground floors: shutters, lit glass, awnings (1 tile = 4 shops of 3 m) */
export function shopTextures() {
  const hit = cache.get('shop')
  if (hit) return { map: hit, emissive: cache.get('shop-e')! }
  const W = 1024
  const H = 256
  const { c, g } = canvas(W, H)
  const e = canvas(W, H)
  const r = rand(21)
  e.g.fillStyle = '#000'
  e.g.fillRect(0, 0, W, H)
  const awn = ['#b5352f', '#2f6a55', '#d99a2b', '#355d8a', '#7a2f4a', '#c8562d']
  for (let i = 0; i < 4; i++) {
    const x0 = i * 256
    g.fillStyle = '#d9d0c2'
    g.fillRect(x0, 0, 256, H)
    // fascia band (no lettering: shops read by colour and light)
    g.fillStyle = awn[Math.floor(r() * awn.length)]
    g.fillRect(x0 + 6, 18, 244, 46)
    g.fillStyle = 'rgba(255,255,255,0.18)'
    g.fillRect(x0 + 6, 18, 244, 8)
    const shutter = r() < 0.25
    if (shutter) {
      g.fillStyle = '#8d8a84'
      g.fillRect(x0 + 14, 74, 228, 182)
      g.strokeStyle = 'rgba(40,40,40,0.5)'
      for (let y = 78; y < 256; y += 7) {
        g.beginPath()
        g.moveTo(x0 + 14, y)
        g.lineTo(x0 + 242, y)
        g.stroke()
      }
    } else {
      const grd = g.createLinearGradient(0, 74, 0, 256)
      grd.addColorStop(0, '#f4d9a2')
      grd.addColorStop(1, '#b48a5a')
      g.fillStyle = grd
      g.fillRect(x0 + 14, 74, 228, 182)
      // shelves and goods
      for (let s = 0; s < 4; s++) {
        g.fillStyle = 'rgba(90,60,40,0.6)'
        g.fillRect(x0 + 20, 100 + s * 40, 216, 4)
        for (let k = 0; k < 10; k++) {
          g.fillStyle = ['#c0392b', '#e1b12c', '#27ae60', '#2980b9', '#ecf0f1', '#8e44ad'][Math.floor(r() * 6)]
          g.fillRect(x0 + 24 + k * 21, 84 + s * 40, 14, 16)
        }
      }
      g.fillStyle = 'rgba(255,255,255,0.25)'
      g.fillRect(x0 + 14, 74, 228, 6)
      e.g.fillStyle = '#ffd99a'
      e.g.globalAlpha = 0.75
      e.g.fillRect(x0 + 14, 74, 228, 182)
      e.g.globalAlpha = 1
    }
    e.g.fillStyle = '#fff2d0'
    e.g.globalAlpha = 0.35
    e.g.fillRect(x0 + 6, 18, 244, 46)
    e.g.globalAlpha = 1
    g.fillStyle = '#6a5c4e'
    g.fillRect(x0, 0, 6, H)
  }
  speckle(g, W, H, 6000, r, ['#5a5048', '#e8e0d2'], 2, 0.25)
  const map = tex('shop', c)
  const emissive = tex('shop-e', e.c)
  return { map, emissive }
}

/** Mangalore clay roof tiles (1 tile = 2 m) */
export function roofTileTexture() {
  return cached('rooftile', () => {
    const { c, g } = canvas(512, 512)
    const r = rand(31)
    g.fillStyle = '#9c4a2e'
    g.fillRect(0, 0, 512, 512)
    for (let y = 0; y < 512; y += 32) {
      for (let x = 0; x < 512; x += 24) {
        const t = 0.85 + r() * 0.3
        g.fillStyle = `rgb(${172 * t},${86 * t},${56 * t})`
        g.beginPath()
        g.ellipse(x + 12, y + 16, 11, 16, 0, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = 'rgba(40,16,8,0.35)'
        g.fillRect(x, y + 28, 24, 4)
      }
    }
    blotches(g, 512, 512, 20, r, 'rgba(50,40,30,1)', 50, 0.25)
    return tex('rooftile', c)
  })
}

export function barkTexture() {
  return cached('bark', () => {
    const { c, g } = canvas(256, 512)
    const r = rand(41)
    g.fillStyle = '#5b4a3c'
    g.fillRect(0, 0, 256, 512)
    for (let i = 0; i < 260; i++) {
      g.strokeStyle = ['#3e3128', '#7a6655', '#4c3d31', '#8a7a68'][Math.floor(r() * 4)]
      g.lineWidth = 1 + r() * 3
      g.globalAlpha = 0.6
      const x = r() * 256
      g.beginPath()
      g.moveTo(x, 0)
      g.bezierCurveTo(x + (r() - 0.5) * 30, 170, x + (r() - 0.5) * 30, 340, x + (r() - 0.5) * 20, 512)
      g.stroke()
    }
    g.globalAlpha = 1
    blotches(g, 256, 512, 10, r, 'rgba(120,130,90,1)', 40, 0.2)
    return tex('bark', c)
  })
}

export type LeafKind = 'rain' | 'neem' | 'blossom-pink' | 'blossom-orange' | 'palm' | 'bougainvillea' | 'trumpet'

/** a cluster of leaves on a transparent card, the building block for believable canopies */
export function leafTexture(kind: LeafKind) {
  return cached('leaf-' + kind, () => {
    const S = 512
    const { c, g } = canvas(S, S)
    const r = rand(kind.length * 7 + 3)
    g.clearRect(0, 0, S, S)
    if (kind === 'palm') {
      // one frond: midrib with leaflets
      g.strokeStyle = '#5b6b33'
      g.lineWidth = 6
      g.beginPath()
      g.moveTo(S * 0.05, S * 0.5)
      g.quadraticCurveTo(S * 0.5, S * 0.42, S * 0.98, S * 0.55)
      g.stroke()
      for (let i = 0; i < 60; i++) {
        const t = i / 60
        const x = S * 0.05 + t * S * 0.9
        const y = S * 0.5 - Math.sin(t * Math.PI) * 30 + t * 20
        const len = (1 - Math.abs(t - 0.4)) * 180
        for (const d of [-1, 1]) {
          g.strokeStyle = ['#4f6a2c', '#6f8a3a', '#3d5424'][Math.floor(r() * 3)]
          g.lineWidth = 5
          g.beginPath()
          g.moveTo(x, y)
          g.quadraticCurveTo(x + 30, y + d * len * 0.5, x + 50, y + d * len)
          g.stroke()
        }
      }
      return tex('leaf-' + kind, c, { repeat: false })
    }
    const greens =
      kind === 'neem'
        ? ['#3f5a2a', '#55733a', '#6c8a45', '#2f4520', '#7f9c50']
        : ['#3d5a2b', '#4f6e35', '#64843f', '#2c4220', '#7a9a4c', '#8aa858']
    const blossom = kind === 'blossom-pink' ? ['#e58fb4', '#f2b6cf', '#d06a98'] : kind === 'blossom-orange' ? ['#ef7b2f', '#f6a04a', '#e0561f'] : kind === 'bougainvillea' ? ['#c8337c', '#e0559a', '#a8205e'] : kind === 'trumpet' ? ['#e0609e', '#f08cbb', '#c94586', '#f6b0cf', '#d9529a'] : null
    const n = kind === 'bougainvillea' ? 900 : kind === 'trumpet' ? 1600 : 1300
    for (let i = 0; i < n; i++) {
      // denser in the middle, ragged at the edges
      const a = r() * Math.PI * 2
      const d = Math.sqrt(r()) * S * 0.46
      const x = S / 2 + Math.cos(a) * d
      const y = S / 2 + Math.sin(a) * d * 0.9
      const L = 9 + r() * 12
      const isB = blossom && r() < (kind === 'trumpet' ? 0.9 : kind === 'bougainvillea' ? 0.55 : 0.32)
      g.fillStyle = isB ? blossom![Math.floor(r() * blossom!.length)] : greens[Math.floor(r() * greens.length)]
      // light from above: brighter leaves towards the top of the card
      g.globalAlpha = 1
      g.save()
      g.translate(x, y)
      g.rotate(r() * Math.PI * 2)
      g.beginPath()
      g.ellipse(0, 0, isB ? L * 0.5 : L, isB ? L * 0.5 : L * 0.42, 0, 0, Math.PI * 2)
      g.fill()
      g.restore()
    }
    // a little sun on the top edge, shade under
    const grd = g.createLinearGradient(0, 0, 0, S)
    grd.addColorStop(0, 'rgba(255,240,180,0.18)')
    grd.addColorStop(0.6, 'rgba(0,0,0,0)')
    grd.addColorStop(1, 'rgba(10,20,5,0.25)')
    g.globalCompositeOperation = 'source-atop'
    g.fillStyle = grd
    g.fillRect(0, 0, S, S)
    g.globalCompositeOperation = 'source-over'
    return tex('leaf-' + kind, c, { repeat: false })
  })
}

/** tileable ripple normal map for lakes */
export function waterNormal() {
  return cached('waternormal', () => {
    const S = 256
    const { c, g } = canvas(S, S)
    const img = g.createImageData(S, S)
    const waves = Array.from({ length: 6 }).map((_, i) => ({ kx: Math.round(Math.cos(i * 1.7) * (2 + i)), ky: Math.round(Math.sin(i * 1.7) * (2 + i)), a: 0.6 / (1 + i * 0.4), p: i * 1.3 }))
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        let dx = 0
        let dy = 0
        for (const w of waves) {
          const ph = ((w.kx * x + w.ky * y) / S) * Math.PI * 2 + w.p
          dx += Math.cos(ph) * w.kx * w.a * 0.12
          dy += Math.cos(ph) * w.ky * w.a * 0.12
        }
        const i = (y * S + x) * 4
        img.data[i] = 128 + dx * 127
        img.data[i + 1] = 128 + dy * 127
        img.data[i + 2] = 255
        img.data[i + 3] = 255
      }
    g.putImageData(img, 0, 0)
    return tex('waternormal', c, { srgb: false })
  })
}

/** soft cloud puff for sky sprites */
export function cloudTexture() {
  return cached('cloud', () => {
    const S = 256
    const { c, g } = canvas(S, S)
    const r = rand(77)
    for (let i = 0; i < 26; i++) {
      const x = S * (0.2 + r() * 0.6)
      const y = S * (0.35 + r() * 0.3)
      const rr = S * (0.1 + r() * 0.16)
      const grd = g.createRadialGradient(x, y - rr * 0.3, 0, x, y, rr)
      grd.addColorStop(0, 'rgba(255,255,255,0.9)')
      grd.addColorStop(0.6, 'rgba(245,240,235,0.5)')
      grd.addColorStop(1, 'rgba(230,225,225,0)')
      g.fillStyle = grd
      g.fillRect(0, 0, S, S)
    }
    return tex('cloud', c, { repeat: false })
  })
}

/** a canvas texture for a green Bengaluru road sign: text lines with arrows */
export function signTexture(lines: { text: string; arrow?: string }[]) {
  const key = 'sign-' + lines.map((l) => l.text + (l.arrow ?? '')).join('|')
  return cached(key, () => {
    const W = 1024
    const H = 160 * lines.length + 40
    const { c, g } = canvas(W, H)
    g.fillStyle = '#16603f'
    g.fillRect(0, 0, W, H)
    g.strokeStyle = '#f4f1e8'
    g.lineWidth = 10
    g.strokeRect(14, 14, W - 28, H - 28)
    g.fillStyle = '#f4f1e8'
    g.font = '700 92px Manrope, Arial, sans-serif'
    g.textBaseline = 'middle'
    lines.forEach((l, i) => {
      const y = 20 + 160 * i + 90
      g.textAlign = 'left'
      g.fillText(l.text, 60, y)
      if (l.arrow) {
        g.textAlign = 'right'
        g.font = '800 110px Manrope, Arial, sans-serif'
        g.fillText(l.arrow, W - 60, y)
        g.font = '700 92px Manrope, Arial, sans-serif'
      }
    })
    return tex(key, c, { repeat: false })
  })
}

/** printed cloth for 3D pandals and street banners: laal paar, sindoor with lotus, saffron with alpana */
export function clothTexture(kind: 'laalpaar' | 'sindoor' | 'saffron' | 'jute' | 'terracotta' | 'sholapith') {
  return cached('cloth-' + kind, () => {
    const { c, g } = canvas(256, 256)
    const r = rand(kind.length * 13)
    if (kind === 'laalpaar') {
      g.fillStyle = '#f7efe0'
      g.fillRect(0, 0, 256, 256)
      g.fillStyle = '#b3202a'
      g.fillRect(0, 0, 40, 256)
      g.fillRect(216, 0, 40, 256)
      g.fillStyle = '#d9a441'
      g.fillRect(40, 0, 8, 256)
      g.fillRect(208, 0, 8, 256)
    } else if (kind === 'sindoor') {
      g.fillStyle = '#9b1c26'
      g.fillRect(0, 0, 256, 256)
      g.fillStyle = '#e2b04e'
      for (let i = 0; i < 4; i++) {
        g.beginPath()
        g.arc(64 + (i % 2) * 128, 64 + Math.floor(i / 2) * 128, 22, 0, Math.PI * 2)
        g.fill()
      }
    } else if (kind === 'saffron') {
      g.fillStyle = '#e8891e'
      g.fillRect(0, 0, 256, 256)
      g.strokeStyle = '#fff3dc'
      g.lineWidth = 5
      g.beginPath()
      g.arc(128, 128, 60, 0, Math.PI * 2)
      g.stroke()
      g.beginPath()
      g.arc(128, 128, 28, 0, Math.PI * 2)
      g.stroke()
    } else if (kind === 'jute') {
      g.fillStyle = '#b48e5a'
      g.fillRect(0, 0, 256, 256)
      for (let i = 0; i < 256; i += 4) {
        g.fillStyle = i % 8 ? 'rgba(120,90,50,0.4)' : 'rgba(220,190,140,0.4)'
        g.fillRect(0, i, 256, 2)
        g.fillRect(i, 0, 2, 256)
      }
    } else if (kind === 'terracotta') {
      g.fillStyle = '#a95a33'
      g.fillRect(0, 0, 256, 256)
      for (let y = 0; y < 256; y += 64)
        for (let x = 0; x < 256; x += 64) {
          g.fillStyle = 'rgba(70,30,15,0.5)'
          g.fillRect(x, y, 64, 3)
          g.fillRect(x, y, 3, 64)
          g.strokeStyle = 'rgba(240,170,110,0.75)'
          g.lineWidth = 3
          g.beginPath()
          g.arc(x + 32, y + 32, 16, 0, Math.PI * 2)
          g.stroke()
        }
    } else {
      g.fillStyle = '#f8f4ea'
      g.fillRect(0, 0, 256, 256)
      g.strokeStyle = 'rgba(200,180,140,0.7)'
      g.lineWidth = 2
      for (let i = -256; i < 256; i += 22) {
        g.beginPath()
        g.moveTo(i, 0)
        g.lineTo(i + 256, 256)
        g.stroke()
        g.beginPath()
        g.moveTo(i + 256, 0)
        g.lineTo(i, 256)
        g.stroke()
      }
    }
    speckle(g, 256, 256, 1500, r, ['#000', '#fff'], 1.5, 0.06)
    return tex('cloth-' + kind, c)
  })
}

/** the tall festival banners on the bridge's lamp posts: a trishul over Maa's eyes, in red or ivory cloth */
export function poleBannerTexture(kind: 'red' | 'ivory') {
  return cached('pole-banner-' + kind, () => {
    const W = 128
    const H = 400
    const { c, g } = canvas(W, H)
    const red = '#a3161f'
    const gold = '#e2b04e'
    const ink = kind === 'red' ? '#fbefd8' : red
    g.fillStyle = kind === 'red' ? red : '#f6ead2'
    g.fillRect(0, 0, W, H)
    // borders
    g.fillStyle = kind === 'red' ? gold : red
    g.fillRect(0, 0, 10, H)
    g.fillRect(W - 10, 0, 10, H)
    g.fillStyle = kind === 'red' ? '#fbefd8' : gold
    g.fillRect(12, 0, 3, H)
    g.fillRect(W - 15, 0, 3, H)
    // top band with a zigzag
    g.fillStyle = kind === 'red' ? '#f6ead2' : red
    g.fillRect(0, 0, W, 34)
    g.fillStyle = kind === 'red' ? red : gold
    for (let x = 0; x < W; x += 16) {
      g.beginPath()
      g.moveTo(x, 34)
      g.lineTo(x + 8, 20)
      g.lineTo(x + 16, 34)
      g.fill()
    }
    // trishul
    g.strokeStyle = ink
    g.fillStyle = ink
    g.lineWidth = 6
    g.lineCap = 'round'
    const cx = W / 2
    g.beginPath()
    g.moveTo(cx, 80)
    g.lineTo(cx, 250)
    g.stroke()
    g.beginPath()
    g.moveTo(cx, 62)
    g.lineTo(cx - 8, 92)
    g.lineTo(cx + 8, 92)
    g.fill()
    for (const s of [-1, 1]) {
      g.beginPath()
      g.moveTo(cx, 150)
      g.quadraticCurveTo(cx + s * 34, 150, cx + s * 30, 92)
      g.stroke()
      g.beginPath()
      g.moveTo(cx + s * 30, 78)
      g.lineTo(cx + s * 22, 98)
      g.lineTo(cx + s * 38, 98)
      g.fill()
    }
    g.beginPath()
    g.ellipse(cx, 168, 12, 6, 0, 0, Math.PI * 2)
    g.fill()
    // Maa's eyes
    g.lineWidth = 3
    for (const s of [-1, 1]) {
      g.beginPath()
      g.moveTo(cx + s * 6, 300)
      g.quadraticCurveTo(cx + s * 22, 286, cx + s * 40, 298)
      g.quadraticCurveTo(cx + s * 22, 310, cx + s * 6, 300)
      g.stroke()
      g.beginPath()
      g.arc(cx + s * 23, 298, 5, 0, Math.PI * 2)
      g.fill()
      g.beginPath()
      g.moveTo(cx + s * 4, 282)
      g.quadraticCurveTo(cx + s * 24, 270, cx + s * 42, 284)
      g.stroke()
    }
    g.beginPath()
    g.moveTo(cx, 262)
    g.quadraticCurveTo(cx - 6, 274, cx, 284)
    g.quadraticCurveTo(cx + 6, 274, cx, 262)
    g.fill()
    // bottom band and fringe
    g.fillStyle = kind === 'red' ? gold : red
    g.fillRect(0, H - 44, W, 6)
    g.fillStyle = gold
    for (let x = 2; x < W; x += 5) g.fillRect(x, H - 30, 2.4, 30)
    const r = rand(kind.length * 7)
    speckle(g, W, H, 900, r, ['#000', '#fff'], 1.5, 0.05)
    return tex('pole-banner-' + kind, c, { repeat: false })
  })
}
