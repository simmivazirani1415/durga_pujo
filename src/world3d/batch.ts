/**
 * Geometry helpers and the Batcher. Areas add hundreds of small parts (walls, trunks, leaf cards, poles,
 * people) in world space; the Batcher merges them into one mesh per material, so a whole neighbourhood
 * draws in a few dozen calls.
 */
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { frame } from './route'

type Geo = THREE.BufferGeometry

const NO_CAST = new Set<string>()
const NO_RECEIVE = new Set<string>()
export function noCast(m: THREE.Material) {
  NO_CAST.add(m.uuid)
  return m
}
export function noReceive(m: THREE.Material) {
  NO_RECEIVE.add(m.uuid)
  return m
}

const tmpM = new THREE.Matrix4()
const tmpQ = new THREE.Quaternion()
const tmpE = new THREE.Euler()
const tmpS = new THREE.Vector3()
const tmpP = new THREE.Vector3()

export interface Place {
  x?: number
  y?: number
  z?: number
  rx?: number
  ry?: number
  rz?: number
  s?: number | [number, number, number]
}

export function matrixOf(p: Place): THREE.Matrix4 {
  tmpP.set(p.x ?? 0, p.y ?? 0, p.z ?? 0)
  tmpE.set(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0, 'YXZ')
  tmpQ.setFromEuler(tmpE)
  const s = p.s ?? 1
  if (Array.isArray(s)) tmpS.set(s[0], s[1], s[2])
  else tmpS.set(s, s, s)
  return tmpM.clone().compose(tmpP, tmpQ, tmpS)
}

function normalise(g: Geo, color?: THREE.ColorRepresentation): Geo {
  let out = g.index ? g.toNonIndexed() : g.clone()
  for (const k of Object.keys(out.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv' && k !== 'color') out.deleteAttribute(k)
  const n = out.attributes.position.count
  if (!out.attributes.normal) out.computeVertexNormals()
  if (!out.attributes.uv) out.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2))
  if (!out.attributes.color || color !== undefined) {
    const c = new THREE.Color(color ?? '#ffffff')
    const a = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      a[i * 3] = c.r
      a[i * 3 + 1] = c.g
      a[i * 3 + 2] = c.b
    }
    out.setAttribute('color', new THREE.Float32BufferAttribute(a, 3))
  }
  out.morphAttributes = {}
  out.clearGroups()
  return out
}

export class Batcher {
  parts = new Map<THREE.Material, Geo[]>()

  add(g: Geo, mat: THREE.Material, at?: Place | THREE.Matrix4, color?: THREE.ColorRepresentation) {
    const out = normalise(g, color)
    if (at) out.applyMatrix4(at instanceof THREE.Matrix4 ? at : matrixOf(at))
    let list = this.parts.get(mat)
    if (!list) this.parts.set(mat, (list = []))
    list.push(out)
    return this
  }

  /** add a part positioned in road space: X metres right of the centre line at distance d, facing along the road */
  road(g: Geo, mat: THREE.Material, d: number, X: number, local: Place = {}, color?: THREE.ColorRepresentation) {
    const f = frame(d, X)
    const m = new THREE.Matrix4().makeTranslation(f.x, 0, f.z).multiply(new THREE.Matrix4().makeRotationY(f.yaw)).multiply(matrixOf(local))
    return this.add(g, mat, m, color)
  }

  build(name = 'batch'): THREE.Group {
    const grp = new THREE.Group()
    grp.name = name
    for (const [mat, list] of this.parts) {
      if (!list.length) continue
      // keep each merged mesh to a sane size
      for (let i = 0; i < list.length; i += 2500) {
        const merged = mergeGeometries(list.slice(i, i + 2500), false)
        if (!merged) continue
        merged.computeBoundingSphere()
        const mesh = new THREE.Mesh(merged, mat)
        mesh.castShadow = !NO_CAST.has(mat.uuid)
        mesh.receiveShadow = !NO_RECEIVE.has(mat.uuid)
        mesh.matrixAutoUpdate = false
        grp.add(mesh)
      }
    }
    for (const list of this.parts.values()) list.forEach((g) => g.dispose())
    this.parts.clear()
    return grp
  }
}

/* ---------------------------------------------------------------- primitives (base on the ground, y = 0) */

/** box standing on y = 0; UVs measured in metres / tile so textures keep their real scale */
export function box(w: number, h: number, d: number, tileU = 0, tileV = tileU): Geo {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed()
  g.translate(0, h / 2, 0)
  if (tileU) {
    const uv = g.attributes.uv as THREE.BufferAttribute
    const dims: Array<[number, number]> = [
      [d, h],
      [d, h],
      [w, d],
      [w, d],
      [w, h],
      [w, h],
    ]
    for (let f = 0; f < 6; f++)
      for (let k = 0; k < 6; k++) {
        const i = f * 6 + k
        uv.setXY(i, (uv.getX(i) * dims[f][0]) / tileU, (uv.getY(i) * dims[f][1]) / tileV)
      }
  }
  return g
}

/** four walls (no roof or floor); v = 0 at the ground so window rows line up with floors */
export function walls(w: number, h: number, d: number, tileU = 12, tileV = 12.8): Geo {
  const g = box(w, h, d, tileU, tileV)
  const keep = [0, 1, 4, 5]
  const idx: number[] = []
  for (const f of keep) for (let k = 0; k < 6; k++) idx.push(f * 6 + k)
  const out = new THREE.BufferGeometry()
  for (const name of ['position', 'normal', 'uv'] as const) {
    const a = g.attributes[name] as THREE.BufferAttribute
    const arr = new Float32Array(idx.length * a.itemSize)
    idx.forEach((i, j) => {
      for (let c = 0; c < a.itemSize; c++) arr[j * a.itemSize + c] = a.array[i * a.itemSize + c] as number
    })
    out.setAttribute(name, new THREE.Float32BufferAttribute(arr, a.itemSize))
  }
  g.dispose()
  return out
}

/** horizontal rectangle at height y, centred; UVs in metres / tile */
export function flat(w: number, l: number, tile = 0, y = 0): Geo {
  const g = new THREE.PlaneGeometry(w, l).toNonIndexed()
  g.rotateX(-Math.PI / 2)
  g.translate(0, y, 0)
  if (tile) {
    const uv = g.attributes.uv as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * l) / tile)
  }
  return g
}

/** vertical card facing +Z, base on the ground */
export function card(w: number, h: number): Geo {
  const g = new THREE.PlaneGeometry(w, h).toNonIndexed()
  g.translate(0, h / 2, 0)
  return g
}

export function cyl(rTop: number, rBot: number, h: number, seg = 10, open = false): Geo {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open)
  g.translate(0, h / 2, 0)
  return g
}

export function sphere(r: number, ws = 12, hs = 8, phiLen = Math.PI * 2, thetaLen = Math.PI): Geo {
  return new THREE.SphereGeometry(r, ws, hs, 0, phiLen, 0, thetaLen)
}

export function dome(r: number, seg = 16): Geo {
  return new THREE.SphereGeometry(r, seg, Math.max(4, seg / 2), 0, Math.PI * 2, 0, Math.PI / 2)
}

export function cone(r: number, h: number, seg = 8): Geo {
  const g = new THREE.ConeGeometry(r, h, seg)
  g.translate(0, h / 2, 0)
  return g
}

/** a hipped roof: square pyramid scaled to w x d */
export function hipRoof(w: number, d: number, h: number): Geo {
  const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1)
  g.rotateY(Math.PI / 4)
  g.translate(0, 0.5, 0)
  g.scale(w * 1.04, h, d * 1.04)
  const out = g.toNonIndexed()
  out.computeVertexNormals()
  // UVs from world position so roof tiles keep their size (2 m tile)
  const p = out.attributes.position as THREE.BufferAttribute
  const uv = out.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + p.getZ(i)) / 2, p.getY(i) * 1.4 + Math.abs(p.getZ(i)) * 0.2)
  return out
}

/** a thin tube along a list of points (wires, rails, garlands) */
export function tube(pts: THREE.Vector3[], r: number, radial = 4): Geo {
  const curve = new THREE.CatmullRomCurve3(pts)
  return new THREE.TubeGeometry(curve, Math.max(2, pts.length * 2), r, radial, false)
}

/** sag between two points, like a wire or a garland */
export function catenary(a: THREE.Vector3, b: THREE.Vector3, sag: number, n = 10): THREE.Vector3[] {
  const out: THREE.Vector3[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const p = a.clone().lerp(b, t)
    p.y -= sag * 4 * t * (1 - t)
    out.push(p)
  }
  return out
}

/** small low-poly bulb */
export const bulbGeo = () => new THREE.OctahedronGeometry(0.07, 0)

/**
 * A ribbon along the route between lateral offsets xa..xb (metres from the centre line), at height y.
 * u runs across (0..1 over the whole width, or metres/tileU), v runs along (metres / tileV).
 */
export function ribbon(d0: number, d1: number, xa: number | ((d: number) => number), xb: number | ((d: number) => number), y: number, tileV: number, tileU = 0, step = 2): Geo {
  const A = typeof xa === 'number' ? () => xa : xa
  const B = typeof xb === 'number' ? () => xb : xb
  const pos: number[] = []
  const uv: number[] = []
  const n = Math.max(1, Math.ceil((d1 - d0) / step))
  for (let i = 0; i < n; i++) {
    const da = d0 + ((d1 - d0) * i) / n
    const db = d0 + ((d1 - d0) * (i + 1)) / n
    const pa0 = frame(da, A(da))
    const pa1 = frame(da, B(da))
    const pb0 = frame(db, A(db))
    const pb1 = frame(db, B(db))
    const ua0 = tileU ? A(da) / tileU : 0
    const ua1 = tileU ? B(da) / tileU : 1
    const ub0 = tileU ? A(db) / tileU : 0
    const ub1 = tileU ? B(db) / tileU : 1
    // two triangles, counter-clockwise seen from above
    pos.push(pa0.x, y, pa0.z, pa1.x, y, pa1.z, pb1.x, y, pb1.z, pa0.x, y, pa0.z, pb1.x, y, pb1.z, pb0.x, y, pb0.z)
    uv.push(ua0, da / tileV, ua1, da / tileV, ub1, db / tileV, ua0, da / tileV, ub1, db / tileV, ub0, db / tileV)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.computeVertexNormals()
  // make sure the ribbon faces up
  const nrm = g.attributes.normal as THREE.BufferAttribute
  if (nrm.getY(0) < 0) {
    for (let i = 0; i < pos.length; i += 9) {
      for (let k = 0; k < 3; k++) {
        const t = pos[i + 3 + k]
        pos[i + 3 + k] = pos[i + 6 + k]
        pos[i + 6 + k] = t
      }
    }
    for (let i = 0; i < uv.length; i += 6) {
      for (let k = 0; k < 2; k++) {
        const t = uv[i + 2 + k]
        uv[i + 2 + k] = uv[i + 4 + k]
        uv[i + 4 + k] = t
      }
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.computeVertexNormals()
  }
  return g
}

/** a vertical strip along the route at lateral offset X, from y0 to y1 (kerb faces, walls); faces towards the road */
export function curtain(d0: number, d1: number, X: number, y0: number, y1: number, tileV: number, step = 2): Geo {
  const pos: number[] = []
  const uv: number[] = []
  const n = Math.max(1, Math.ceil((d1 - d0) / step))
  const toRoad = X > 0
  for (let i = 0; i < n; i++) {
    const da = d0 + ((d1 - d0) * i) / n
    const db = d0 + ((d1 - d0) * (i + 1)) / n
    const a = frame(da, X)
    const b = frame(db, X)
    const quad = [
      [a.x, y0, a.z, da / tileV, 0],
      [b.x, y0, b.z, db / tileV, 0],
      [b.x, y1, b.z, db / tileV, 1],
      [a.x, y1, a.z, da / tileV, 1],
    ]
    const order = toRoad ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]
    for (const k of order) {
      pos.push(quad[k][0], quad[k][1], quad[k][2])
      uv.push(quad[k][3], quad[k][4])
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.computeVertexNormals()
  return g
}
