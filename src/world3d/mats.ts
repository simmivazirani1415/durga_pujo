/**
 * Shared materials for the whole city. Untextured props use vertex colours on a handful of materials, so
 * thousands of objects merge into a few draw calls. Lit windows, lamps and festival bulbs follow the
 * time of day through `setNight`.
 */
import * as THREE from 'three'
import * as T from './tex'

export const U = {
  time: { value: 0 },
}

const nightMats: Array<{ m: THREE.MeshStandardMaterial; day: number; night: number }> = []
const glowMats: Array<{ m: THREE.MeshBasicMaterial; base: THREE.Color; day: number; night: number }> = []
const poolMats: THREE.MeshBasicMaterial[] = []

function lit(m: THREE.MeshStandardMaterial, day: number, night: number) {
  nightMats.push({ m, day, night })
  return m
}

/** HDR colour (values above 1 bloom) that brightens after dark */
function glow(hex: string, day: number, night: number, extra: THREE.MeshBasicMaterialParameters = {}) {
  const base = new THREE.Color(hex)
  const m = new THREE.MeshBasicMaterial({ color: base.clone(), toneMapped: false, ...extra })
  glowMats.push({ m, base, day, night })
  return m
}

export function setNight(n: number) {
  for (const { m, day, night } of nightMats) m.emissiveIntensity = day + (night - day) * n
  for (const { m, base, day, night } of glowMats) m.color.copy(base).multiplyScalar(day + (night - day) * n)
  for (const m of poolMats) m.opacity = 0.75 * Math.max(0, n - 0.15)
}

/** leaves and pennants move in the breeze: a few cheap sines in the vertex shader */
function windy(m: THREE.Material, amp: number, mode: 'leaf' | 'flag') {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.time
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        mode === 'leaf'
          ? `#include <begin_vertex>
             vec4 wp = modelMatrix * vec4(position, 1.0);
             float ph = wp.x * 0.35 + wp.z * 0.27;
             transformed += vec3(sin(uTime * 1.6 + ph), sin(uTime * 2.3 + ph * 1.7) * 0.4, cos(uTime * 1.25 + ph)) * ${amp.toFixed(3)};`
          : `#include <begin_vertex>
             vec4 wp = modelMatrix * vec4(position, 1.0);
             float fl = clamp(1.0 - uv.y, 0.0, 1.0);
             float ph = wp.x * 0.9 + wp.z * 0.7;
             transformed += vec3(sin(uTime * 4.0 + ph) * 0.4, 0.0, cos(uTime * 3.3 + ph)) * fl * ${amp.toFixed(3)};`,
      )
  }
  m.customProgramCacheKey = () => 'wind-' + mode + amp
  return m
}

function std(p: THREE.MeshStandardMaterialParameters) {
  return new THREE.MeshStandardMaterial(p)
}

const cacheM = new Map<string, THREE.Material>()
function once<M extends THREE.Material>(key: string, make: () => M): M {
  let m = cacheM.get(key) as M | undefined
  if (!m) {
    m = make()
    cacheM.set(key, m)
  }
  return m
}

export const M = {
  road: (lanes: 'two' | 'four' | 'narrow') => once('road-' + lanes, () => std({ map: T.roadTexture(lanes), roughness: 0.93, metalness: 0 })),
  paver: () => once('paver', () => std({ map: T.paverTexture(), roughness: 0.95, vertexColors: true })),
  kerb: () => once('kerb', () => std({ map: T.kerbTexture(), roughness: 0.85 })),
  grass: (tone: 'green' | 'dry' = 'green') => once('grass-' + tone, () => std({ map: T.grassTexture(tone), roughness: 1 })),
  dirt: () => once('dirt', () => std({ map: T.dirtTexture(), roughness: 1 })),
  plaster: () => once('plaster', () => std({ map: T.plasterTexture(), roughness: 0.92, vertexColors: true })),
  facade: (kind: T.FacadeKind) =>
    once('facade-' + kind, () => {
      const t = T.facadeTextures(kind)
      const office = kind === 'office'
      return lit(
        std({
          map: t.map,
          emissiveMap: t.emissive,
          emissive: new THREE.Color('#ffffff'),
          roughnessMap: t.rough,
          roughness: office ? 0.55 : 1,
          metalness: office ? 0.55 : 0,
          vertexColors: true,
          envMapIntensity: office ? 1.4 : 0.6,
        }),
        0,
        office ? 1.25 : 1.6,
      )
    }),
  shop: () =>
    once('shop', () => {
      const t = T.shopTextures()
      return lit(std({ map: t.map, emissiveMap: t.emissive, emissive: new THREE.Color('#ffffff'), roughness: 0.8 }), 0.15, 1.8)
    }),
  roofTile: () => once('rooftile', () => std({ map: T.roofTileTexture(), roughness: 0.85, vertexColors: true })),
  /** the workhorse: vertex-coloured matte paint for walls, poles, bodies, people */
  paint: () => once('paint', () => std({ color: '#ffffff', vertexColors: true, roughness: 0.82, metalness: 0 })),
  /** glossy vehicle paint and polished stone */
  gloss: () => once('gloss', () => std({ color: '#ffffff', vertexColors: true, roughness: 0.32, metalness: 0.25, envMapIntensity: 1.2 })),
  metal: () => once('metal', () => std({ color: '#ffffff', vertexColors: true, roughness: 0.45, metalness: 0.7 })),
  glass: () => once('glass', () => std({ color: '#3a4a58', roughness: 0.06, metalness: 0.9, envMapIntensity: 1.6 })),
  gold: () => once('gold', () => lit(std({ color: '#d9a441', roughness: 0.3, metalness: 1, emissive: new THREE.Color('#ffb347') }), 0, 0.25)),
  bark: () => once('bark', () => std({ map: T.barkTexture(), roughness: 1, vertexColors: true })),
  leaf: (kind: T.LeafKind) =>
    once('leaf-' + kind, () => windy(std({ map: T.leafTexture(kind), alphaTest: 0.45, roughness: 0.88, vertexColors: true, side: THREE.FrontSide }), 0.06, 'leaf')),
  cloth: (kind: Parameters<typeof T.clothTexture>[0]) => once('cloth-' + kind, () => std({ map: T.clothTexture(kind), roughness: 0.9, side: THREE.DoubleSide, vertexColors: true })),
  flag: () => once('flag', () => windy(std({ color: '#ffffff', vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }), 0.12, 'flag')),
  water: () =>
    once('water', () => {
      const n = T.waterNormal()
      n.repeat.set(1, 1)
      return std({ color: '#244650', roughness: 0.16, metalness: 0.1, normalMap: n, normalScale: new THREE.Vector2(0.12, 0.12), envMapIntensity: 1.1 })
    }),
  /** the bridge's lamp-post banners: printed cloth that flutters, lower edge most */
  banner: (kind: 'red' | 'ivory') =>
    once('banner-' + kind, () => windy(std({ map: T.poleBannerTexture(kind), roughness: 0.85, side: THREE.DoubleSide, alphaTest: 0.5 }), 0.16, 'flag')),
  granite: () => once('granite', () => std({ map: T.plasterTexture(), color: '#ffffff', roughness: 0.9, vertexColors: true })),
  /** emissive festival bulbs and lamp heads (bloom) */
  bulb: () => once('bulb', () => glow('#ffc76a', 1.1, 3.0)),
  bulbCool: () => once('bulbCool', () => glow('#fff2d8', 0.9, 2.4)),
  lamp: () => once('lamp', () => glow('#ffd9a0', 0.8, 3.6)),
  ledPink: () => once('ledPink', () => glow('#ff5fa8', 0.9, 3.4)),
  ledCyan: () => once('ledCyan', () => glow('#62d8ff', 0.8, 3.0)),
  /** the glowing interior of a pandal: the idol's golden halo and lamplight */
  shrine: () => once('shrine', () => glow('#ffb24a', 1.2, 1.55)),
  headlight: () => once('headlight', () => glow('#fff4dc', 0.6, 4)),
  taillight: () => once('taillight', () => glow('#ff3b2a', 0.6, 3)),
  /** soft pools of lamplight on the road at night */
  pool: () =>
    once('pool', () => {
      const c = document.createElement('canvas')
      c.width = c.height = 128
      const g = c.getContext('2d')!
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
      grd.addColorStop(0, 'rgba(255,214,150,0.9)')
      grd.addColorStop(0.45, 'rgba(255,190,120,0.35)')
      grd.addColorStop(1, 'rgba(255,170,100,0)')
      g.fillStyle = grd
      g.fillRect(0, 0, 128, 128)
      const t = new THREE.CanvasTexture(c)
      t.colorSpace = THREE.SRGBColorSpace
      const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 })
      poolMats.push(m)
      return m
    }),
}

export type MatName = keyof typeof M
