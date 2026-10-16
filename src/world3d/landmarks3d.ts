/**
 * The places from Simran's illustrations, built into the street as 3D landmarks (not pictures): the lake
 * promenade, St Mary's, the Cubbon Park library, Commercial Street, Toit, Magnolia Bakery, the hilltop temple
 * in Whitefield, Nexus mall, HSR High Street and the Infosys campus. Shapes and colours follow her art.
 *
 * Every landmark takes (d, X) as the middle of its front, like `building`: it faces the road.
 */
import * as THREE from 'three'
import { box, cone, cyl, dome, hipRoof, ribbon, sphere, type Batcher } from './batch'
import { M } from './mats'
import { Spot, deadZones, faceRoad, palm, shrub, stringLights } from './kit3d'

/** keep the rest of the street (trees, rows of houses, stalls) off a landmark's ground; call before building them */
export function reserve(d0: number, d1: number, xa: number, xb: number) {
  deadZones.push({ d0, d1, x0: Math.min(xa, xb), x1: Math.max(xa, xb) })
}

/** a landmark's own frame: origin at the footprint centre, +Z towards the road; never culled by dead zones */
function spot(b: Batcher, d: number, X: number, depth: number, ry = 0) {
  const side = X > 0 ? 1 : -1
  const s = new Spot(b, d, X + side * (depth / 2), faceRoad(X) + ry)
  s.dead = false
  return s
}

/* ---------------------------------------------------------------- painted signs */

const signCache = new Map<string, THREE.Material>()
interface SignStyle {
  bg: string
  fg: string
  font?: string
  /** draw a round badge instead of a board */
  round?: boolean
  border?: string
  glow?: boolean
}
function signMaterial(text: string, aspect: number, st: SignStyle) {
  const key = [text, aspect, st.bg, st.fg, st.font, st.round, st.border].join('|')
  let m = signCache.get(key)
  if (m) return m
  const W = 1024
  const H = Math.round(W / aspect)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const lines = text.split('\n')
  if (st.round) {
    g.fillStyle = st.border ?? st.fg
    g.beginPath()
    g.arc(W / 2, H / 2, Math.min(W, H) / 2 - 4, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = st.bg
    g.beginPath()
    g.arc(W / 2, H / 2, Math.min(W, H) / 2 - 40, 0, Math.PI * 2)
    g.fill()
  } else {
    g.fillStyle = st.bg
    g.fillRect(0, 0, W, H)
    if (st.border) {
      g.strokeStyle = st.border
      g.lineWidth = H * 0.06
      g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, W - g.lineWidth, H - g.lineWidth)
    }
  }
  g.fillStyle = st.fg
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const size = Math.min((H * 0.62) / lines.length, (W * 1.6) / Math.max(...lines.map((l) => l.length)) / (st.round ? 1.4 : 1))
  g.font = `${st.font ?? '800'} ${Math.round(size)}px Manrope, Arial, sans-serif`
  lines.forEach((l, i) => g.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 1.1))
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  m = new THREE.MeshBasicMaterial({ map: t, transparent: !!st.round, alphaTest: st.round ? 0.5 : 0, toneMapped: !st.glow })
  signCache.set(key, m)
  return m
}

/** a flat sign in a landmark's frame */
function sign(g: THREE.Group, s: Spot, text: string, w: number, h: number, at: { x?: number; y: number; z: number; ry?: number }, st: SignStyle) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), signMaterial(text, w / h, st))
  mesh.matrixAutoUpdate = false
  mesh.matrix
    .copy(s.m)
    .multiply(new THREE.Matrix4().makeTranslation(at.x ?? 0, at.y, at.z))
    .multiply(new THREE.Matrix4().makeRotationY(at.ry ?? 0))
  g.add(mesh)
}

/* ---------------------------------------------------------------- Malleswaram */

/** Sankey Tank's promenade: hexagon pavers, a green-and-white kerb, a red hedge, black railings, the lake beyond */
export function lakePromenade(b: Batcher, d0: number, d1: number, edge: number) {
  const x0 = -edge
  const x1 = -(edge + 5.5)
  b.add(ribbon(d0, d1, x0, x1, 0.07, 3, 3), M.paver(), undefined, '#c98f74')
  // painted kerb: green and white blocks
  for (let d = d0, k = 0; d < d1; d += 1.4, k++) new Spot(b, d, x1 - 0.2).put(box(0.4, 0.32, 1.38), M.paint(), {}, k % 2 ? '#f2efe6' : '#3f8a4a')
  for (let d = d0 + 1; d < d1; d += 2.1) shrub(b, d, x1 - 0.9, Math.floor(d * 7) + 3, 'bougainvillea', 1.3)
  // heavy black railing on short pillars
  for (let d = d0; d < d1; d += 2.6) {
    const s = new Spot(b, d, x1 - 1.8, 0)
    s.put(box(0.22, 1.1, 0.22), M.metal(), {}, '#1d2420')
    s.put(sphere(0.13, 8, 6), M.metal(), { y: 1.18 }, '#1d2420')
  }
  for (const y of [0.55, 1.0]) {
    for (let d = d0; d < d1 - 2; d += 26) {
      const e = Math.min(d1, d + 26)
      new Spot(b, (d + e) / 2, x1 - 1.8, 0).put(box(0.06, 0.06, e - d), M.metal(), { y }, '#1d2420')
    }
  }
  // the water, out to the far bank
  b.add(ribbon(d0 - 20, d1 + 40, x1 - 2.1, -240, 0.0, 8, 8, 8), M.water())
  b.add(ribbon(d0, d1, x1 - 2.2, x1 - 1.9, 0.05, 2, 2), M.granite(), undefined, '#8a8278')
  // benches along the walk, facing the water
  for (let d = d0 + 8; d < d1 - 4; d += 15) {
    const s = new Spot(b, d, x1 + 1.2, -Math.PI / 2)
    s.put(box(1.8, 0.08, 0.5), M.paint(), { y: 0.45 }, '#f2efe6')
    s.put(box(1.8, 0.45, 0.07), M.paint(), { y: 0.55, z: -0.24 }, '#f2efe6')
    s.put(box(0.1, 0.45, 0.45), M.paint(), { x: -0.8 }, '#d8d2c4')
    s.put(box(0.1, 0.45, 0.45), M.paint(), { x: 0.8 }, '#d8d2c4')
  }
  // a little gazebo with a red roof where the walk widens
  const gz = new Spot(b, (d0 + d1) / 2, x1 + 1.6, 0)
  for (const [x, z] of [
    [-1.6, -1.6],
    [1.6, -1.6],
    [-1.6, 1.6],
    [1.6, 1.6],
  ])
    gz.put(cyl(0.12, 0.12, 2.6, 8), M.paint(), { x, z }, '#f4f1ea')
  gz.put(hipRoof(4.2, 4.2, 1.6), M.paint(), { y: 2.6 }, '#b84030')
  gz.put(cyl(1.7, 1.7, 0.15, 16), M.granite(), {}, '#d8d0c2')
}

/* ---------------------------------------------------------------- Ulsoor and the Cantonment */

/** St Mary's Basilica: cream Gothic nave, a tall grey-capped spire over the front, pinnacles and a rose window */
export function stMarys(b: Batcher, d: number, X: number) {
  const s = spot(b, d, X, 34)
  const cream = '#efe6d4'
  const trim = '#cfc4b0'
  s.put(box(16, 15, 30), M.plaster(), { z: -2 }, cream)
  s.put(hipRoof(16.5, 30.5, 6), M.paint(), { y: 15, z: -2 }, '#9a8f86')
  // front tower and spire
  s.put(box(9, 30, 8), M.plaster(), { z: 13 }, cream)
  for (let y = 6; y < 30; y += 6) s.put(box(9.4, 0.4, 8.4), M.paint(), { y, z: 13 }, trim)
  s.put(cyl(3.6, 4.2, 4, 8), M.plaster(), { y: 30, z: 13 }, cream)
  s.put(cone(3.8, 22, 8), M.paint(), { y: 34, z: 13 }, '#bdb4a6')
  s.put(box(0.25, 3, 0.25), M.gold(), { y: 56, z: 13 })
  s.put(box(1.6, 0.25, 0.25), M.gold(), { y: 57.6, z: 13 })
  for (const x of [-4.4, 4.4])
    for (const z of [9.2, 16.8]) {
      s.put(box(1.1, 32, 1.1), M.plaster(), { x, z }, '#f6f0e4')
      s.put(cone(0.7, 4.5, 6), M.paint(), { x, y: 32, z }, '#bdb4a6')
    }
  // pointed doorway, lancet windows and the rose window
  s.put(box(3.4, 6, 0.3), M.paint(), { y: 0, z: 17.1 }, '#5a3b2a')
  s.put(cone(1.7, 2.4, 4), M.paint(), { y: 6, z: 17.1, ry: Math.PI / 4, s: [1, 1, 0.2] }, '#5a3b2a')
  s.put(cyl(2, 2, 0.3, 20), M.paint(), { y: 13, z: 17.1, rx: Math.PI / 2 }, '#3e5a7a')
  s.put(cyl(2.3, 2.3, 0.2, 20), M.paint(), { y: 13, z: 17.05, rx: Math.PI / 2 }, trim)
  for (let z = -14; z < 10; z += 4.5) for (const x of [-8.05, 8.05]) s.put(box(0.2, 6, 1.4), M.paint(), { x, y: 5, z }, '#4a5f78')
  // forecourt, a white statue on its plinth and the gate wall
  s.put(box(2.2, 1.8, 2.2), M.granite(), { x: -7, z: 20 }, '#e8e2d6')
  s.put(cyl(0.45, 0.6, 2.8, 10), M.plaster(), { x: -7, y: 1.8, z: 20 }, '#f7f4ee')
  s.put(sphere(0.38, 10, 8), M.plaster(), { x: -7, y: 4.9, z: 20 }, '#f7f4ee')
}

/** the red library in Cubbon Park: terracotta walls, white columns and cornices, a red cupola, on a round lawn */
export function cubbonLibrary(b: Batcher, d: number, X: number) {
  const s = spot(b, d, X, 40)
  const red = '#b5443a'
  // the lawn: concentric paths and clipped hedges, avenue to the road
  const ring = new THREE.RingGeometry(14, 16, 48)
  ring.rotateX(-Math.PI / 2)
  s.put(ring, M.paver(), { y: 0.06, z: 4 }, '#d8b67a')
  const cross = [
    [0, 4, 3, 32],
    [0, 4, 32, 3],
  ] as const
  for (const [x, z, w, dd] of cross) s.put(box(w, 0.08, dd), M.paver(), { x, z }, '#d8b67a')
  s.put(cyl(2.4, 2.4, 0.5, 20), M.granite(), { z: 4 }, '#e6dcc8')
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2
    s.put(sphere(0.9, 8, 6), M.leaf('neem'), { x: Math.cos(a) * 17.2, y: 0.6, z: 4 + Math.sin(a) * 17.2 }, '#ffffff')
  }
  // the building, set back on the lawn
  s.put(box(30, 9, 12), M.plaster(), { z: -16 }, red)
  s.put(box(31, 0.8, 13), M.paint(), { y: 9, z: -16 }, '#f2ece2')
  s.put(box(12, 13, 13), M.plaster(), { z: -15 }, red)
  s.put(box(12.6, 0.7, 13.6), M.paint(), { y: 13, z: -15 }, '#f2ece2')
  for (let x = -5; x <= 5; x += 2) s.put(cyl(0.4, 0.45, 9, 10), M.plaster(), { x, z: -8.3 }, '#f4efe6')
  for (let x = -13; x <= 13; x += 3.2) if (Math.abs(x) > 6.5) s.put(box(1, 3, 0.2), M.paint(), { x, y: 3.5, z: -9.9 }, '#f2ece2')
  s.put(cyl(3.4, 3.4, 3, 16), M.plaster(), { y: 13.7, z: -15 }, red)
  s.put(dome(3.4, 20), M.paint(), { y: 16.7, z: -15 }, '#9b3328')
  s.put(cone(0.2, 1.6, 6), M.gold(), { y: 20, z: -15 })
  for (const x of [-15, 15]) s.put(hipRoof(4, 4, 2.4), M.paint(), { x, y: 9.8, z: -16 }, '#9b3328')
}

/** a Commercial Street run of shopfronts: bright signboards, globe lamps, lanterns strung across the footpath */
export function commercialStreet(b: Batcher, g: THREE.Group, d0: number, d1: number, X: number) {
  const names = ['Silk House', 'Bangles', 'Footwear', 'Jewellers', 'Fabrics', 'Bags & More', 'Tailors', 'Sarees']
  const colors = ['#c0262d', '#1f4f8a', '#e0a82e', '#2d6b5a', '#8a2f6b', '#d2572b', '#2a2a2e', '#b8306a']
  const fronts = ['#e9dcc2', '#d9c4a0', '#f1e6cf', '#c8d3c6', '#e8c9a8', '#efe2c8']
  let k = 0
  for (let d = d0; d < d1 - 6; k++) {
    const w = 8 + ((k * 37) % 4)
    const h = 9 + ((k * 53) % 6)
    const s = spot(b, d + w / 2, X, 10)
    s.put(box(w - 0.3, h, 10), M.facade('apartment'), {}, fronts[k % fronts.length])
    s.put(box(w - 0.3, 3.4, 0.2), M.shop(), { z: 5.05 })
    sign(g, s, names[k % names.length], w - 1, 1.4, { y: 4.4, z: 5.22 }, { bg: colors[k % colors.length], fg: k % 8 === 2 ? '#2a1a10' : '#fff7e8', glow: true })
    s.put(box(w - 0.3, 0.15, 1.4), M.paint(), { y: 3.5, z: 5.7 }, '#3a3a3a')
    d += w
  }
  // white globe lamps on black posts and paper lanterns overhead
  for (let d = d0 + 3; d < d1; d += 9) {
    const s = new Spot(b, d, X > 0 ? X - 1.4 : X + 1.4, 0)
    s.put(cyl(0.08, 0.12, 4.4, 8), M.metal(), {}, '#1d1d1d')
    for (const x of [-0.5, 0.5]) s.put(sphere(0.32, 12, 8), M.bulbCool(), { x, y: 4.3 })
    s.put(box(1.2, 0.08, 0.08), M.metal(), { y: 4.2 }, '#1d1d1d')
  }
  for (let d = d0; d < d1 - 9; d += 9) {
    const a = new Spot(b, d, X > 0 ? X - 1.4 : X + 1.4).world(0, 5.2, 0)
    const e = new Spot(b, d + 9, X > 0 ? X - 1.4 : X + 1.4).world(0, 5.2, 0)
    stringLights(b, a, e, 0.6, 0.9)
  }
}

/* ---------------------------------------------------------------- Indiranagar */

/** Toit: a brick brewpub under a big timber-framed gable, glazed front, the round TOIT badge over the door */
export function toitBrewpub(b: Batcher, g: THREE.Group, d: number, X: number) {
  const s = spot(b, d, X, 16)
  s.put(box(18, 7.5, 16), M.paint(), {}, '#8f4a32')
  s.put(box(14, 5.2, 0.2), M.glass(), { y: 0.6, z: 8.05 })
  for (let x = -7; x <= 7; x += 2.8) s.put(box(0.25, 5.8, 0.3), M.paint(), { x, y: 0.4, z: 8.2 }, '#4a2c1a')
  // the gable: two timber slopes and a lattice in the triangle
  for (const side of [-1, 1]) s.put(box(11.5, 0.6, 18), M.paint(), { x: side * 4.6, y: 9.9, rz: side * -0.62 }, '#6b3f22')
  for (let x = -7; x <= 7; x += 1.4) {
    const hh = Math.max(0.2, 6.6 - Math.abs(x) * 0.9)
    s.put(box(0.18, hh, 0.18), M.paint(), { x, y: 7.5, z: 8.4 }, '#7a4a2a')
  }
  for (let y = 8.6; y < 13; y += 1.2) {
    const ww = Math.max(0.5, 15 - (y - 7.5) * 2.4)
    s.put(box(ww, 0.16, 0.18), M.paint(), { y, z: 8.4 }, '#7a4a2a')
  }
  sign(g, s, 'TOIT', 4.2, 4.2, { y: 9.2, z: 8.7 }, { bg: '#5a3a22', fg: '#f3e2bf', round: true, border: '#e8d4a8', font: '900' })
  for (const x of [-11, 11]) palm(b, d + x, X + (X > 0 ? 1.5 : -1.5), Math.floor(d + x) * 3, 7)
  for (let x = -8; x <= 8; x += 2.2) s.put(sphere(0.7, 8, 6), M.leaf('neem'), { x, y: 0.5, z: 9.3 }, '#ffffff')
}

/** Magnolia Bakery: white two-storey glass front, black frames, the big name across the top, steps and planters */
export function magnoliaBakery(b: Batcher, g: THREE.Group, d: number, X: number) {
  const s = spot(b, d, X, 12)
  s.put(box(16, 9, 12), M.plaster(), {}, '#f4f2ee')
  s.put(box(14, 6, 0.2), M.glass(), { y: 0.8, z: 6.05 })
  for (let x = -7; x <= 7; x += 3.5) s.put(box(0.2, 6.2, 0.3), M.metal(), { x, y: 0.7, z: 6.15 }, '#1b1b1b')
  s.put(box(16.4, 0.3, 0.4), M.metal(), { y: 6.9, z: 6.1 }, '#1b1b1b')
  sign(g, s, 'MAGNOLIA BAKERY', 13, 1.7, { y: 8, z: 6.15 }, { bg: '#f8f7f4', fg: '#141414', font: '900' })
  for (let k = 0; k < 3; k++) s.put(box(8, 0.25, 0.6), M.granite(), { y: k * 0.25, z: 6.9 + (2 - k) * 0.6 }, '#4a4a4a')
  for (const x of [-6.5, 6.5]) {
    s.put(box(1.4, 1, 1.4), M.paint(), { x, z: 7.6 }, '#2a2a2a')
    s.put(sphere(1, 8, 6), M.leaf('neem'), { x, y: 1.6, z: 7.6 }, '#ffffff')
  }
  // café tables in the window
  for (let x = -5; x <= 5; x += 3.4) s.put(cyl(0.45, 0.45, 0.8, 10), M.paint(), { x, z: 4.8 }, '#c9b08a')
}

/* ---------------------------------------------------------------- Whitefield */

/** the hilltop temple: white gopuram towers around a stepped blue-glass hall, gold kalasas, on a stone plinth */
export function hillTemple(b: Batcher, d: number, X: number) {
  const s = spot(b, d, X, 44)
  // plinth terraces and a stair to the road
  for (let k = 0; k < 3; k++) s.put(box(56 - k * 6, 2, 40 - k * 4), M.granite(), { y: k * 2 }, k % 2 ? '#e6e2da' : '#d6d0c4')
  for (let k = 0; k < 6; k++) s.put(box(10, 1, 1.2), M.granite(), { y: k, z: 20 + (5 - k) * 1.2 }, '#cfc8bb')
  // the stepped blue-glass hall
  for (let k = 0; k < 4; k++) {
    s.put(box(30 - k * 6, 3.4, 24 - k * 5), M.gloss(), { y: 6 + k * 3.4 }, k % 2 ? '#3f74b8' : '#5a8fd0')
    s.put(box(30.6 - k * 6, 0.5, 24.6 - k * 5), M.plaster(), { y: 9.2 + k * 3.4 }, '#f4f2ec')
  }
  s.put(cone(0.6, 3, 8), M.gold(), { y: 19.6 })
  // white gopuram towers at the corners and over the entrance
  const tower = (x: number, z: number, h: number, w: number) => {
    const tiers = 6
    for (let k = 0; k < tiers; k++) s.put(box(w - k * (w / 8), h / tiers, w * 0.7 - k * (w / 12)), M.plaster(), { x, y: 6 + (k * h) / tiers, z }, k % 2 ? '#f6f4ef' : '#e9e6de')
    const top = new THREE.CylinderGeometry(w * 0.16, w * 0.16, w * 0.3, 12, 1, false, 0, Math.PI)
    top.rotateZ(Math.PI / 2)
    s.put(top, M.plaster(), { x, y: 6 + h, z }, '#f6f4ef')
    for (const dx of [-w * 0.1, 0, w * 0.1]) s.put(cone(0.18, 0.9, 8), M.gold(), { x: x + dx, y: 6 + h + w * 0.16, z })
  }
  tower(0, 12, 22, 9)
  tower(-17, 4, 16, 7)
  tower(17, 4, 16, 7)
  tower(-14, -10, 14, 6)
  tower(14, -10, 14, 6)
}

/* ---------------------------------------------------------------- Koramangala */

/** Nexus mall: a big light block with glass bands, magenta light panels, the name lit up, a canopy over the doors */
export function nexusMall(b: Batcher, g: THREE.Group, d: number, X: number) {
  const s = spot(b, d, X, 30)
  s.put(box(46, 20, 30), M.plaster(), {}, '#e7e5e1')
  for (const y of [5, 10.5, 16]) s.put(box(46.2, 2.6, 30.2), M.glass(), { y })
  // magenta and purple light panels across the front
  for (const [x, y, w, h] of [
    [-15, 6, 9, 11],
    [-3, 12, 6, 7],
    [9, 5, 7, 9],
    [18, 11, 6, 8],
  ])
    s.put(box(w, h, 0.4), M.ledPink(), { x, y, z: 15.1 })
  s.put(box(14, 3, 0.4), M.paint(), { x: 4, y: 16.8, z: 15.15 }, '#4a2a6a')
  sign(g, s, 'nexus', 11, 2.6, { x: 4, y: 18.3, z: 15.4 }, { bg: '#4a2a6a', fg: '#ffffff', font: '800', glow: true })
  s.put(box(16, 0.4, 5), M.metal(), { y: 4.6, z: 17.5 }, '#d8d8d8')
  for (const x of [-7.5, 7.5]) s.put(cyl(0.18, 0.18, 4.6, 8), M.metal(), { x, z: 19.6 }, '#9a9a9a')
  s.put(box(14, 4.2, 0.2), M.glass(), { y: 0.2, z: 15.15 })
}

/* ---------------------------------------------------------------- HSR */

/** HSR High Street 2.0: a food street under a timber pergola, its name in lights, marigold strings, kiosks */
export function hsrHighStreet(b: Batcher, g: THREE.Group, d: number, X: number) {
  const s = spot(b, d, X, 14)
  // black steel frame and timber slats overhead
  for (const x of [-10, -3.4, 3.4, 10]) for (const z of [-6, 6]) s.put(box(0.35, 6.4, 0.35), M.metal(), { x, z }, '#1e1e1e')
  s.put(box(21, 0.4, 13), M.metal(), { y: 6.4 }, '#1e1e1e')
  for (let x = -10; x <= 10; x += 0.9) s.put(box(0.25, 0.35, 13), M.paint(), { x, y: 6.8 }, '#6b4325')
  // the name board over the front
  s.put(box(17, 2, 0.4), M.paint(), { y: 7.2, z: 6.4 }, '#1a1410')
  sign(g, s, 'HSR HIGH STREET 2.0', 16, 1.6, { y: 8.2, z: 6.62 }, { bg: '#1a1410', fg: '#f5d58a', font: '900', glow: true })
  // marigold strings and bulbs along the front beam
  const L = s.world(-10, 6.2, 6.3)
  const R = s.world(10, 6.2, 6.3)
  stringLights(b, L, R, 0.7, 0.35, M.bulb())
  for (let x = -9.5; x <= 9.5; x += 1.2) s.put(cyl(0.1, 0.1, 1.2, 6), M.paint(), { x, y: 5, z: 6.3 }, x % 2.4 < 1.2 ? '#f08a1c' : '#f6c23a')
  // kiosks with lit menu boards and counters
  for (const x of [-7, 0, 7]) {
    s.put(box(5, 2.8, 4), M.paint(), { x, z: -3 }, '#4a3020')
    s.put(box(5, 1.1, 0.6), M.paint(), { x, z: -0.8 }, '#d7b98a')
    s.put(box(3.4, 1.3, 0.12), M.ledCyan(), { x, y: 3.2, z: -0.9 })
  }
  for (let k = 0; k < 4; k++) s.put(cyl(0.5, 0.5, 0.75, 10), M.paint(), { x: -6 + k * 4, z: 3 }, '#8a6a4a')
}

/* ---------------------------------------------------------------- Electronic City */

/** the Infosys campus front: a white block with long glass bands, a green glass atrium, the name, a brick plaza */
export function infosysCampus(b: Batcher, g: THREE.Group, d: number, X: number) {
  const s = spot(b, d, X, 40)
  s.put(box(38, 15, 18), M.plaster(), { x: -6, z: -8 }, '#f3f3f1')
  for (const y of [2.2, 6.2, 10.2]) s.put(box(36, 2.4, 18.2), M.glass(), { x: -6, y, z: -8 })
  s.put(box(14, 13, 16), M.gloss(), { x: 16, z: -6 }, '#5f9a86')
  s.put(box(10, 15.4, 14), M.paint(), { x: 9, z: -9 }, '#6a5a52')
  sign(g, s, 'Infosys', 9, 2.2, { x: -14, y: 13.3, z: 1.2 }, { bg: '#f3f3f1', fg: '#1d6fb0', font: '800' })
  // brick-red plaza and a low wall with railings along the road
  s.put(box(46, 0.2, 18), M.paver(), { z: 10 }, '#b45a42')
  s.put(box(46, 1, 0.5), M.granite(), { z: 19 }, '#9a4a36')
  for (let x = -22; x <= 22; x += 1.2) s.put(box(0.08, 1.2, 0.08), M.metal(), { x, y: 1, z: 19 }, '#222')
  for (let x = -20; x <= 20; x += 2.5) s.put(sphere(0.8, 8, 6), M.leaf('neem'), { x, y: 0.5, z: 17.6 }, '#ffffff')
}

