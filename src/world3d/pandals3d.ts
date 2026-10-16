/**
 * Ten pandals, one per area, built in 3D and standing in the street where the auto parks. Each has its own
 * silhouette (tent, Bengali chala, palace, lakeside pavilion, modern folded fins, grand gate, terracotta
 * temple, neighbourhood shamiana, shikhara, sholapith crown) around a glowing shrine with Maa Durga's halo.
 */
import * as THREE from 'three'
import { Batcher, box, bulbGeo, cone, cyl, dome, flat, sphere, type Place } from './batch'
import { M } from './mats'
import { Spot, bunting, crowd, domeOn, personParts } from './kit3d'
import { rand } from './tex'

/** pandals are built big, like the real ones: a little larger than life on screen */
export const PANDAL_SCALE = 1.15

export type PandalVariant = 'shamiana' | 'chala' | 'palatial' | 'lakeside' | 'modern' | 'grand-gate' | 'terracotta' | 'neighbourhood' | 'shikhara' | 'sholapith'

type Geo = THREE.BufferGeometry

/** wall with an arched doorway, extruded; UVs in 4 m tiles */
function archWall(W: number, H: number, aw: number, ah: number, t = 0.5, pointed = false): Geo {
  const s = new THREE.Shape()
  s.moveTo(-W / 2, 0)
  s.lineTo(W / 2, 0)
  s.lineTo(W / 2, H)
  s.lineTo(-W / 2, H)
  s.closePath()
  const h = new THREE.Path()
  const spring = ah - aw / 2
  h.moveTo(-aw / 2, 0.01)
  h.lineTo(-aw / 2, spring)
  if (pointed) {
    h.quadraticCurveTo(-aw / 2, ah * 0.98, 0, ah)
    h.quadraticCurveTo(aw / 2, ah * 0.98, aw / 2, spring)
  } else h.absarc(0, spring, aw / 2, Math.PI, 0, true)
  h.lineTo(aw / 2, 0.01)
  h.closePath()
  s.holes.push(h)
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 18 })
  const uv = g.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4)
  return g
}

/** points along an arch outline, for bulb strings */
function archPts(aw: number, ah: number, n: number): THREE.Vector2[] {
  const out: THREE.Vector2[] = []
  const spring = ah - aw / 2
  for (let i = 0; i <= n; i++) {
    const t = i / n
    if (t < 0.25) out.push(new THREE.Vector2(-aw / 2, (t / 0.25) * spring))
    else if (t > 0.75) out.push(new THREE.Vector2(aw / 2, ((1 - t) / 0.25) * spring))
    else {
      const a = Math.PI - ((t - 0.25) / 0.5) * Math.PI
      out.push(new THREE.Vector2(Math.cos(a) * (aw / 2), spring + Math.sin(a) * (aw / 2)))
    }
  }
  return out
}

/** the shrine seen through the doorway: halo (chalchitra), Maa Durga and her family, lamplight */
function shrine(s: Spot, z: number, w: number, h: number, seed: number) {
  const r = rand(seed)
  // inner chamber
  s.put(box(w + 1, h + 0.5, 0.3), M.paint(), { z: z - 0.3 }, '#5a1e1a')
  s.put(box(0.3, h + 0.5, 3), M.paint(), { x: -w / 2 - 0.5, z: z + 1.2 }, '#6a2420')
  s.put(box(0.3, h + 0.5, 3), M.paint(), { x: w / 2 + 0.5, z: z + 1.2 }, '#6a2420')
  // the golden chalchitra arch behind the idols
  const ring = new THREE.RingGeometry(w * 0.32, w * 0.5, 40, 1, 0, Math.PI)
  s.put(ring, M.shrine(), { y: h * 0.28, z: z - 0.1 })
  const disc = new THREE.CircleGeometry(w * 0.32, 40, 0, Math.PI)
  s.put(disc, M.paint(), { y: h * 0.28, z: z - 0.12 }, '#7a2a18')
  s.put(box(w * 1.0, h * 0.28, 0.1), M.paint(), { y: 0, z: z - 0.12 }, '#7a2a18')
  // Maa Durga in the middle, larger; Lakshmi, Saraswati, Kartik, Ganesh on either side
  const fig = (x: number, k: number, saree: string) => {
    personParts(
      (g, m, p: Place, c) => s.put(g, m === M.paint() ? M.gold() : m, { ...p, x: (p.x ?? 0) * k + x, y: (p.y ?? 0) * k + 0.6, z: z + 0.4 + (p.z ?? 0) * k, s: k }, c),
      { saree: true, top: saree, bottom: saree, skin: '#f0b98a' },
      r,
    )
  }
  fig(0, 1.5, '#ffffff')
  fig(-w * 0.22, 1.05, '#ffffff')
  fig(w * 0.22, 1.05, '#ffffff')
  fig(-w * 0.38, 0.95, '#ffffff')
  fig(w * 0.38, 0.95, '#ffffff')
  // arms of the goddess: a fan of thin gold rods
  for (let i = 0; i < 10; i++) {
    const a = -1.2 + (i / 9) * 2.4
    s.put(cyl(0.035, 0.035, 0.9, 4), M.gold(), { y: 0.6 + 1.25 * 1.5, z: z + 0.5, rz: a })
  }
  s.put(box(w + 0.6, 0.6, 1.4), M.paint(), { z: z + 0.6 }, '#8a2a20')
  // diyas on the step
  for (let i = 0; i < 9; i++) s.put(bulbGeo(), M.bulb(), { x: -w / 2 + (i / 8) * w, y: 0.65, z: z + 1.35 })
}

function bulbsAlong(s: Spot, pts: THREE.Vector2[], z: number, mat = M.bulb()) {
  const g = bulbGeo()
  for (const p of pts) s.put(g, mat, { x: p.x, y: p.y, z })
}

function bulbLine(s: Spot, a: THREE.Vector3, c: THREE.Vector3, gap = 0.55, mat = M.bulb()) {
  const n = Math.max(1, Math.round(a.distanceTo(c) / gap))
  const g = bulbGeo()
  for (let i = 0; i <= n; i++) {
    const p = a.clone().lerp(c, i / n)
    s.put(g, mat, { x: p.x, y: p.y, z: p.z })
  }
}

const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

function plinth(s: Spot, W: number, D: number, color = '#b8aa96') {
  s.put(box(W + 2, 0.6, D + 2), M.granite(), {}, color)
  for (let i = 0; i < 3; i++) s.put(box(W * 0.45, 0.2, 0.5), M.granite(), { y: 0.4 - i * 0.2, z: D / 2 + 1 + i * 0.5 }, '#c9bda9')
}

/** small flags along the top edge */
function topFlags(s: Spot, W: number, y: number, z: number, colors: string[]) {
  for (let i = 0; i < 7; i++) {
    const x = -W / 2 + (i / 6) * W
    s.put(cyl(0.03, 0.03, 1.6, 4), M.metal(), { x, y, z }, '#444')
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.9, -0.25, 0, 0, -0.55, 0], 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 0.5, 0, 0], 2))
    g.computeVertexNormals()
    s.put(g, M.flag(), { x, y: y + 1.6, z }, colors[i % colors.length])
  }
}

export interface PandalInfo {
  /** height of the top above the ground, for the label */
  top: number
  /** where the shrine light sits, local */
  light: THREE.Vector3
}

/** build the pandal with its front centre at road position (d, X), turned `ry` from facing the camera */
export function buildPandal(b: Batcher, variant: PandalVariant, d: number, X: number, seed: number, ry = -0.22, scale = PANDAL_SCALE): PandalInfo {
  const s = new Spot(b, d, X, ry, 0, scale)
  const people = new Spot(b, d, X, ry)
  const r = rand(seed)
  const festive = ['#c0262d', '#e8a92a', '#f4ead6', '#d2572b', '#2d6b5a']
  let top = 14
  let W = 15
  let D = 9
  switch (variant) {
    case 'shamiana': {
      // a big festival tent on four poles: striped pyramid roof, scalloped valance, open sides
      W = 16
      D = 12
      plinth(s, W, D, '#a99a84')
      for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) s.put(cyl(0.18, 0.2, 7, 10), M.paint(), { x, y: 0.6, z }, '#e6d2a8')
      s.put(cone(Math.max(W, D) * 0.75, 6, 4), M.cloth('saffron'), { y: 7.6, ry: Math.PI / 4, s: [1, 1, D / W] }, '#ffffff')
      s.put(box(W + 0.6, 1.4, 0.06), M.cloth('laalpaar'), { y: 6.4, z: D / 2 + 0.3 }, '#ffffff')
      for (const x of [-W / 2 - 0.3, W / 2 + 0.3]) s.put(box(0.06, 1.4, D + 0.6), M.cloth('laalpaar'), { y: 6.4, x }, '#ffffff')
      s.put(box(W, 6.4, 0.2), M.cloth('sindoor'), { y: 0.6, z: -D / 2 + 0.2 }, '#ffffff')
      shrine(s, -D / 2 + 1, 8, 5.5, seed)
      bulbLine(s, v3(-W / 2 - 0.3, 6.4, D / 2 + 0.35), v3(W / 2 + 0.3, 6.4, D / 2 + 0.35), 0.45)
      bulbLine(s, v3(-W / 2, 7.8, D / 2), v3(0, 13.4, 0), 0.6)
      bulbLine(s, v3(W / 2, 7.8, D / 2), v3(0, 13.4, 0), 0.6)
      top = 13.8
      break
    }
    case 'chala': {
      // Bengali do-chala: mud-red walls, a deep curved thatch roof drooping at the eaves
      W = 14
      D = 9
      plinth(s, W, D)
      s.put(archWall(W, 6.5, 4.4, 5.4), M.cloth('terracotta'), { y: 0.6, z: D / 2 - 0.5 }, '#ffffff')
      s.put(box(W, 6.5, D - 1), M.cloth('terracotta'), { y: 0.6, z: -0.5 }, '#c98a62')
      const prof = new THREE.Shape()
      prof.moveTo(-D / 2 - 1.6, 0)
      prof.quadraticCurveTo(-D / 4, 1.2, 0, 5.2)
      prof.quadraticCurveTo(D / 4, 1.2, D / 2 + 1.6, 0)
      prof.lineTo(D / 2 + 1.2, -0.5)
      prof.quadraticCurveTo(D / 4, 0.7, 0, 4.4)
      prof.quadraticCurveTo(-D / 4, 0.7, -D / 2 - 1.2, -0.5)
      prof.closePath()
      const roof = new THREE.ExtrudeGeometry(prof, { depth: W + 2.4, bevelEnabled: false, curveSegments: 14 })
      roof.translate(0, 0, -(W + 2.4) / 2)
      roof.rotateY(Math.PI / 2)
      // eaves droop at the ends: bend the ridge down towards both ends
      const p = roof.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) - Math.pow(p.getX(i) / ((W + 2.4) / 2), 2) * 1.2)
      roof.computeVertexNormals()
      const uv = roof.attributes.uv as THREE.BufferAttribute
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3)
      s.put(roof, M.cloth('jute'), { y: 7.1 }, '#d8b98a')
      shrine(s, D / 2 - 2.6, 4.2, 4.6, seed)
      bulbsAlong(s, archPts(4.6, 5.6, 34).map((q) => q.add(new THREE.Vector2(0, 0.6))), D / 2 + 0.05)
      for (let i = 0; i < 22; i++) {
        const x = -W / 2 - 1.2 + (i / 21) * (W + 2.4)
        s.put(bulbGeo(), M.bulb(), { x, y: 7.1 - 0.5 - Math.pow(x / ((W + 2.4) / 2), 2) * 1.2, z: D / 2 + 1.3 })
      }
      top = 12.4
      break
    }
    case 'palatial': {
      // a white palace front with three arches, a central dome and corner chhatris, gold trims
      W = 18
      D = 9
      plinth(s, W, D, '#c9bda9')
      s.put(archWall(W, 9, 4.6, 7.2), M.cloth('sholapith'), { y: 0.6, z: D / 2 - 0.5 }, '#fff8ec')
      s.put(box(W, 9, D - 1), M.plaster(), { y: 0.6, z: -0.5 }, '#f3ead8')
      for (const x of [-5.6, 5.6]) {
        s.put(box(3, 4.6, 0.3), M.paint(), { x, y: 2, z: D / 2 + 0.05 }, '#7a2a20')
        s.put(box(3.4, 0.3, 0.6), M.gold(), { x, y: 6.8, z: D / 2 })
      }
      s.put(box(W + 0.4, 0.5, D + 0.4), M.gold(), { y: 9.6 })
      for (let i = 0; i < 9; i++) s.put(cyl(0.28, 0.32, 9, 10), M.plaster(), { x: -W / 2 + (i / 8) * W, y: 0.6, z: D / 2 + 0.4 }, '#fbf3e4')
      domeOn(s, 0, 10.1, 0, 3.2, M.plaster(), '#fbf3e4')
      for (const x of [-W / 2 + 1, W / 2 - 1]) domeOn(s, x, 10.1, D / 2 - 1, 1.2, M.plaster(), '#fbf3e4')
      shrine(s, D / 2 - 2.6, 4.4, 6.2, seed)
      bulbsAlong(s, archPts(4.8, 7.4, 40).map((q) => q.add(new THREE.Vector2(0, 0.6))), D / 2 + 0.05)
      bulbLine(s, v3(-W / 2, 9.9, D / 2 + 0.25), v3(W / 2, 9.9, D / 2 + 0.25), 0.4)
      top = 16
      break
    }
    case 'lakeside': {
      // an open pavilion on a lotus base: tiered roof, pink and white
      W = 13
      D = 10
      plinth(s, W, D, '#d6cbb8')
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2
        s.put(cone(0.9, 2.2, 6), M.paint(), { x: Math.cos(a) * (W / 2 + 0.4), y: 0, z: Math.sin(a) * (D / 2 + 0.4), rx: Math.sin(a) * 0.5, rz: -Math.cos(a) * 0.5 }, i % 2 ? '#f1a9c4' : '#f7e8ef')
      }
      for (const x of [-W / 2 + 0.6, -W / 6, W / 6, W / 2 - 0.6]) s.put(cyl(0.3, 0.34, 6.2, 12), M.plaster(), { x, y: 0.6, z: D / 2 - 0.6 }, '#fbf3ea')
      s.put(box(W, 6.2, 0.3), M.cloth('sholapith'), { y: 0.6, z: -D / 2 + 0.6 }, '#f6d5e0')
      for (let k = 0; k < 3; k++) s.put(cone((W / 2 + 1.4) * (1 - k * 0.28), 2.2, 4), M.paint(), { y: 6.8 + k * 1.6, ry: Math.PI / 4, s: [1, 1, D / W] }, k % 2 ? '#f7e8ef' : '#d9578a')
      s.put(sphere(0.35, 10, 8), M.gold(), { y: 12.2 })
      shrine(s, -D / 2 + 1.4, 6, 5, seed)
      bulbLine(s, v3(-W / 2, 6.8, D / 2), v3(W / 2, 6.8, D / 2), 0.4)
      top = 12.8
      break
    }
    case 'modern': {
      // folded fins in dark steel and jute, lit with pink and cyan LED edges
      W = 16
      D = 9
      plinth(s, W, D, '#5a5a5e')
      s.put(box(W, 8, D - 1), M.paint(), { y: 0.6, z: -0.5 }, '#2a2a30')
      for (let i = 0; i < 13; i++) {
        const x = -W / 2 + (i / 12) * W
        if (Math.abs(x) < 2.4) continue
        const h = 7 + Math.cos((x / W) * Math.PI) * 4
        s.put(box(0.25, h, 2.4), M.cloth('jute'), { x, y: 0.6, z: D / 2 + 0.2, ry: 0.5 * (i % 2 ? 1 : -1) }, '#e8d4b0')
        s.put(box(0.06, h, 0.06), i % 2 ? M.ledPink() : M.ledCyan(), { x: x + 0.15, y: 0.6, z: D / 2 + 1.35 })
      }
      // the portal: a tall triangular frame
      const tri = new THREE.Shape()
      tri.moveTo(-3, 0)
      tri.lineTo(0, 12)
      tri.lineTo(3, 0)
      tri.lineTo(2.2, 0)
      tri.lineTo(0, 10.2)
      tri.lineTo(-2.2, 0)
      tri.closePath()
      s.put(new THREE.ExtrudeGeometry(tri, { depth: 0.5, bevelEnabled: false }), M.paint(), { y: 0.6, z: D / 2 + 0.6 }, '#1d1d22')
      bulbLine(s, v3(-3, 0.8, D / 2 + 1.15), v3(0, 12.6, D / 2 + 1.15), 0.35, M.ledPink())
      bulbLine(s, v3(3, 0.8, D / 2 + 1.15), v3(0, 12.6, D / 2 + 1.15), 0.35, M.ledPink())
      shrine(s, D / 2 - 2.4, 4.2, 6, seed)
      top = 13.6
      break
    }
    case 'grand-gate': {
      // a towering gateway: two stepped towers flank a great arch, the shrine beyond
      W = 18
      D = 8
      plinth(s, W, D, '#b9ab95')
      s.put(archWall(9, 11, 5.4, 9), M.cloth('saffron'), { y: 0.6, z: D / 2 - 0.5 }, '#ffffff')
      for (const x of [-6.5, 6.5]) {
        for (let k = 0; k < 4; k++) s.put(box(4.4 - k * 0.8, 3.6, 4.4 - k * 0.8), M.cloth('sindoor'), { x, y: 0.6 + k * 3.6, z: D / 2 - 2 }, '#ffffff')
        domeOn(s, x, 15, D / 2 - 2, 1.2, M.gold(), '#ffffff')
        bulbLine(s, v3(x - 2.25, 0.8, D / 2 + 0.25), v3(x - 0.9, 15, D / 2 - 1), 0.5)
        bulbLine(s, v3(x + 2.25, 0.8, D / 2 + 0.25), v3(x + 0.9, 15, D / 2 - 1), 0.5)
      }
      s.put(box(9.4, 1.2, 1), M.gold(), { y: 11.2, z: D / 2 - 0.2 })
      s.put(box(W - 2, 9, D - 2), M.paint(), { y: 0.6, z: -1.5 }, '#7a2a1c')
      shrine(s, D / 2 - 2.6, 5, 7, seed)
      bulbsAlong(s, archPts(5.6, 9.2, 46).map((q) => q.add(new THREE.Vector2(0, 0.6))), D / 2 + 0.05)
      top = 17.4
      break
    }
    case 'terracotta': {
      // a terracotta temple: carved walls and a ridged curvilinear roof
      W = 14
      D = 10
      plinth(s, W, D, '#a58f78')
      s.put(archWall(W, 7, 4, 5.6, 0.6, true), M.cloth('terracotta'), { y: 0.6, z: D / 2 - 0.6 }, '#ffffff')
      s.put(box(W, 7, D - 1.2), M.cloth('terracotta'), { y: 0.6, z: -0.6 }, '#d6a07a')
      const lathe = new THREE.LatheGeometry(
        [0, 0.15, 0.4, 0.62, 0.8, 0.92, 1].map((t, i) => new THREE.Vector2((1 - t * t) * 6.4 + 0.3 * (i % 2), t * 7)),
        4,
      )
      lathe.rotateY(Math.PI / 4)
      s.put(lathe, M.cloth('terracotta'), { y: 7.6, s: [1, 1, D / W] }, '#c88a5e')
      s.put(sphere(0.7, 10, 8), M.gold(), { y: 14.8 })
      shrine(s, D / 2 - 2.8, 3.8, 5, seed)
      bulbsAlong(s, archPts(4.2, 5.8, 32).map((q) => q.add(new THREE.Vector2(0, 0.6))), D / 2 + 0.05)
      bulbLine(s, v3(-W / 2, 7.65, D / 2), v3(W / 2, 7.65, D / 2), 0.45)
      top = 15.6
      break
    }
    case 'neighbourhood': {
      // the para pandal: a cloth hall with a gabled front, bunting and a crowd at the gate
      W = 13
      D = 10
      plinth(s, W, D, '#a99c88')
      s.put(archWall(W, 6.2, 4.2, 5), M.cloth('laalpaar'), { y: 0.6, z: D / 2 - 0.4 }, '#ffffff')
      s.put(box(W, 6.2, D - 1), M.cloth('laalpaar'), { y: 0.6, z: -0.4 }, '#f2e6d0')
      const gab = new THREE.Shape()
      gab.moveTo(-W / 2 - 0.4, 0)
      gab.lineTo(0, 4)
      gab.lineTo(W / 2 + 0.4, 0)
      gab.closePath()
      s.put(new THREE.ExtrudeGeometry(gab, { depth: D, bevelEnabled: false }), M.cloth('sindoor'), { y: 6.8, z: -D / 2 }, '#ffffff')
      shrine(s, D / 2 - 2.4, 4, 4.4, seed)
      bulbsAlong(s, archPts(4.4, 5.2, 30).map((q) => q.add(new THREE.Vector2(0, 0.6))), D / 2 + 0.1)
      bulbLine(s, v3(-W / 2 - 0.4, 6.8, D / 2 + 0.1), v3(0, 10.8, D / 2 + 0.1), 0.45)
      bulbLine(s, v3(W / 2 + 0.4, 6.8, D / 2 + 0.1), v3(0, 10.8, D / 2 + 0.1), 0.45)
      topFlags(s, W, 6.8, D / 2 - 0.4, festive)
      top = 11.4
      break
    }
    case 'shikhara': {
      // a tall curvilinear shikhara in saffron cloth over a pillared hall
      W = 14
      D = 10
      plinth(s, W, D)
      s.put(archWall(W, 7, 4.2, 5.8, 0.5, true), M.cloth('saffron'), { y: 0.6, z: D / 2 - 0.5 }, '#ffffff')
      s.put(box(W, 7, D - 1), M.cloth('saffron'), { y: 0.6, z: -0.5 }, '#ffffff')
      const prof = Array.from({ length: 12 }).map((_, i) => {
        const t = i / 11
        return new THREE.Vector2(Math.max(0.15, 4.6 * Math.cos(t * Math.PI * 0.5) * (1 - t * 0.15)), t * 10)
      })
      const sh = new THREE.LatheGeometry(prof, 8)
      s.put(sh, M.cloth('saffron'), { y: 7.6, z: -0.8 }, '#f0c070')
      s.put(cyl(1.1, 1.1, 0.6, 16), M.gold(), { y: 17.6, z: -0.8, s: [1, 1, 1] })
      s.put(sphere(0.5, 10, 8), M.gold(), { y: 18.6, z: -0.8 })
      for (let k = 0; k < 8; k++) {
        const y = 8 + k * 1.2
        const rr = 4.6 * Math.cos(((y - 7.6) / 10) * Math.PI * 0.5) * (1 - ((y - 7.6) / 10) * 0.15)
        bulbLine(s, v3(-rr * 0.92, y, rr * 0.38 - 0.8), v3(rr * 0.92, y, rr * 0.38 - 0.8), 0.6)
      }
      shrine(s, D / 2 - 2.6, 4, 5.2, seed)
      bulbsAlong(s, archPts(4.4, 6, 34).map((q) => q.add(new THREE.Vector2(0, 0.6))), D / 2 + 0.05)
      top = 19.2
      break
    }
    case 'sholapith': {
      // ivory sholapith lace: a crown of medallions over a white hall, gold accents
      W = 15
      D = 9
      plinth(s, W, D, '#cfc6b6')
      s.put(archWall(W, 8, 4.6, 6.6), M.cloth('sholapith'), { y: 0.6, z: D / 2 - 0.5 }, '#ffffff')
      s.put(box(W, 8, D - 1), M.cloth('sholapith'), { y: 0.6, z: -0.5 }, '#f2ede2')
      for (let i = 0; i < 7; i++) {
        const x = -W / 2 + 1 + (i / 6) * (W - 2)
        const rr = 1.0 + (i === 3 ? 1.2 : i % 2 ? 0.2 : 0.5)
        const yy = 8.6 + rr + (i === 3 ? 0.6 : 0)
        s.put(new THREE.CircleGeometry(rr, 28), M.cloth('sholapith'), { x, y: yy, z: D / 2 - 0.4 }, '#fffaf0')
        s.put(new THREE.RingGeometry(rr * 0.92, rr, 28), M.gold(), { x, y: yy, z: D / 2 - 0.35 })
        s.put(new THREE.RingGeometry(rr * 0.4, rr * 0.48, 20), M.gold(), { x, y: yy, z: D / 2 - 0.35 })
      }
      s.put(box(W + 0.4, 0.4, 0.5), M.gold(), { y: 8.6, z: D / 2 - 0.4 })
      shrine(s, D / 2 - 2.6, 4.4, 6, seed)
      bulbsAlong(s, archPts(4.8, 6.8, 40).map((q) => q.add(new THREE.Vector2(0, 0.6))), D / 2 + 0.05, M.bulbCool())
      bulbLine(s, v3(-W / 2, 8.4, D / 2), v3(W / 2, 8.4, D / 2), 0.4, M.bulbCool())
      top = 12.4
      break
    }
  }
  // the forecourt: bunting overhead, visitors gathering, a few dhakis
  const k = scale
  const fl = people.world((-W / 2 - 1.5) * k, 6.5, (D / 2) * k + 5)
  const fr = people.world((W / 2 + 1.5) * k, 6.5, (D / 2) * k + 5)
  bunting(b, fl, fr, 0.8, festive, seed + 3)
  for (let i = 0; i < 16; i++) {
    // visitors gather to either side, leaving the way to the entrance open
    const x = (r() < 0.5 ? -1 : 1) * (3.2 + r() * (W * k * 0.5 - 2))
    const z = (D / 2) * k + 2 + r() * 5
    const pr = rand(seed * 7 + i)
    personParts((g, m, p, c) => people.put(g, m, { ...p, x: (p.x ?? 0) + x, z: (p.z ?? 0) + z, ry: Math.PI + (pr() - 0.5) * 1.4 }, c), { saree: pr() < 0.55 }, pr)
  }
  void crowd
  void flat
  void dome
  return { top: (top + 0.6) * k, light: new THREE.Vector3(0, 4 * k, (D / 2) * k + 3) }
}
