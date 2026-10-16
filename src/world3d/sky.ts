/**
 * Light and air for every stop: a gradient sky with a real sun (or moon and stars after dark), drifting
 * clouds, a hazy far skyline, fog that melts the street into the horizon, and the sun/sky lights. Each stop
 * has a Look; between stops the Looks blend with the distance travelled, so the light changes as you ride.
 */
import * as THREE from 'three'
import { cloudTexture, rand } from './tex'
import { L } from './route'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export interface Look {
  /** sun elevation and azimuth in degrees; azimuth 0 = straight down the road, + to the right */
  sunEl: number
  sunAz: number
  sun: string
  sunI: number
  zenith: string
  horizon: string
  hemiSky: string
  hemiGround: string
  hemiI: number
  fogNear: number
  fogFar: number
  exposure: number
  /** 0 day .. 1 night: lit windows, lamps, bulbs */
  night: number
  bloom: number
  cloud: string
  cloudK: number
  stars: number
}

const day: Look = {
  sunEl: 30,
  sunAz: -45,
  sun: '#fff0d6',
  sunI: 3.0,
  zenith: '#5f95cc',
  horizon: '#dfe3df',
  hemiSky: '#d9e6f2',
  hemiGround: '#6b5a48',
  hemiI: 1.0,
  fogNear: 50,
  fogFar: 420,
  exposure: 0.95,
  night: 0,
  bloom: 0.22,
  cloud: '#ffffff',
  cloudK: 0.9,
  stars: 0,
}
const golden: Look = {
  ...day,
  sunEl: 12,
  sunAz: 55,
  sun: '#ffc888',
  sunI: 2.8,
  zenith: '#7ea4c8',
  horizon: '#f2cf9f',
  hemiSky: '#ffe2bc',
  hemiGround: '#6e5040',
  hemiI: 0.95,
  fogNear: 45,
  fogFar: 360,
  exposure: 1.0,
  bloom: 0.35,
  cloud: '#ffe4c4',
}
const night: Look = {
  ...day,
  sunEl: 34,
  sunAz: -30,
  sun: '#9db2ff',
  sunI: 0.35,
  zenith: '#0b1230',
  horizon: '#3b3452',
  hemiSky: '#56609a',
  hemiGround: '#2a2026',
  hemiI: 0.42,
  fogNear: 30,
  fogFar: 250,
  exposure: 1.15,
  night: 1,
  bloom: 0.55,
  cloud: '#3c4262',
  cloudK: 0.6,
  stars: 1,
}

/** one Look per stop: hero, nine areas, finale */
export const LOOKS: Look[] = [
  { ...golden, sunEl: 6, sunAz: 34, sun: '#ffb867', sunI: 2.8, zenith: '#5f93cc', horizon: '#f7c486', hemiSky: '#ffd9a8', fogNear: 160, fogFar: 1000, bloom: 0.5, night: 0.08 },
  { ...golden, sunEl: 18, sunAz: 62 },
  { ...golden, sunEl: 15, sunAz: -55, fogFar: 380, night: 0.1 },
  { ...golden, sunEl: 3, sunAz: 30, sun: '#ff9f5e', sunI: 2.2, zenith: '#58709e', horizon: '#f6b48a', hemiSky: '#f7c6a8', fogFar: 520, night: 0.35, bloom: 0.5, cloud: '#ffb48e' },
  { ...night },
  { ...day, sunEl: 26, sunAz: -55, sun: '#ffe2b4', horizon: '#e8dcc6', fogFar: 560 },
  { ...golden, sunEl: 10, sunAz: 48, sunI: 2.6, night: 0.12, bloom: 0.42 },
  { ...day, sunEl: 22, sunAz: -42, sun: '#ffdcaa', horizon: '#ead9bf' },
  { ...golden, sunEl: 1, sunAz: 36, sun: '#ff8c4c', sunI: 1.5, zenith: '#3b4a80', horizon: '#ee9f78', hemiSky: '#c9a0a8', hemiI: 0.7, night: 0.72, bloom: 0.5, cloud: '#e89a82' },
  { ...night, zenith: '#0a1028', horizon: '#33304c' },
  { ...golden, sunEl: -2, sunAz: 10, sun: '#ff9466', sunI: 1.0, zenith: '#252f5e', horizon: '#e39678', hemiSky: '#8a7fa8', hemiI: 0.6, fogFar: 520, night: 0.88, bloom: 0.55, cloud: '#d88a80', stars: 0.3 },
]

const cA = new THREE.Color()
const cB = new THREE.Color()
function mixHex(a: string, b: string, t: number) {
  return '#' + cA.set(a).lerp(cB.set(b), t).getHexString()
}

/** the Look at distance d: holds near each stop, blends in the middle of each leg */
export function lookAt(d: number): Look {
  const i = Math.max(0, Math.min(LOOKS.length - 1, Math.floor(d / L)))
  const t = d / L - i
  const s = Math.max(0, Math.min(1, (t - 0.35) / 0.45))
  const k = s * s * (3 - 2 * s)
  const A = LOOKS[i]
  const B = LOOKS[Math.min(LOOKS.length - 1, i + 1)]
  if (k <= 0 || A === B) return A
  const out = { ...A }
  for (const key of Object.keys(A) as (keyof Look)[]) {
    const a = A[key]
    const b = B[key]
    if (typeof a === 'number') (out[key] as number) = a + ((b as number) - a) * k
    else (out[key] as string) = mixHex(a as string, b as string, k)
  }
  return out
}

/* ---------------------------------------------------------------- sky dome */

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`

const SKY_FRAG = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSun;
uniform vec3 uSunDir;
uniform float uStars;
uniform float uSunVis;
varying vec3 vDir;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main() {
  vec3 d = normalize(vDir);
  float h = max(d.y, 0.0);
  vec3 col = mix(uHorizon, uZenith, pow(h, 0.42));
  float sd = max(dot(d, uSunDir), 0.0);
  // warm haze around the sun, hugging the horizon
  col += uSun * pow(sd, 5.0) * 0.45 * uSunVis * (1.0 - h * 0.6);
  col += uSun * pow(sd, 48.0) * 0.9 * uSunVis;
  col += uSun * smoothstep(0.9993, 0.9997, sd) * 6.0 * uSunVis;
  // below the horizon: keep the horizon colour (the ground hides it)
  col = mix(col, uHorizon, smoothstep(0.0, -0.05, d.y));
  if (uStars > 0.0) {
    vec3 q = floor(d * 900.0);
    float s = step(0.9982, hash(q)) * smoothstep(0.05, 0.4, d.y);
    col += vec3(s) * uStars * 0.9;
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export class Sky {
  mesh: THREE.Mesh
  mat: THREE.ShaderMaterial
  constructor() {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      uniforms: {
        uZenith: { value: new THREE.Color() },
        uHorizon: { value: new THREE.Color() },
        uSun: { value: new THREE.Color() },
        uSunDir: { value: new THREE.Vector3(0, 0.2, -1) },
        uStars: { value: 0 },
        uSunVis: { value: 1 },
      },
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    })
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), this.mat)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -10
  }
  apply(l: Look, sunDir: THREE.Vector3) {
    const u = this.mat.uniforms
    u.uZenith.value.set(l.zenith)
    u.uHorizon.value.set(l.horizon)
    u.uSun.value.set(l.sun)
    u.uSunDir.value.copy(sunDir)
    u.uStars.value = l.stars
    u.uSunVis.value = l.night > 0.9 ? 0 : 1
  }
}

/* ---------------------------------------------------------------- clouds */

export class Clouds {
  group = new THREE.Group()
  mats: THREE.SpriteMaterial[] = []
  items: { s: THREE.Sprite; x: number; z: number; v: number }[] = []
  constructor() {
    const tex = cloudTexture()
    const r = rand(99)
    for (let k = 0; k < 3; k++) this.mats.push(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.9 }))
    for (let i = 0; i < 46; i++) {
      const s = new THREE.Sprite(this.mats[i % 3])
      const w = 140 + r() * 260
      s.scale.set(w, w * (0.32 + r() * 0.18), 1)
      const x = (r() - 0.5) * 1800
      const z = -200 - r() * 1300
      s.position.set(x, 110 + r() * 230, z)
      s.renderOrder = -9
      this.items.push({ s, x, z, v: 1.5 + r() * 3 })
      this.group.add(s)
    }
  }
  update(t: number, camX: number, camZ: number, l: Look) {
    for (const m of this.mats) {
      m.color.set(l.cloud)
      m.opacity = l.cloudK
    }
    for (const it of this.items) {
      // the sky field follows the camera loosely, so clouds drift past slowly as you travel
      let x = it.x + t * it.v
      x = ((((x + 900) % 1800) + 1800) % 1800) - 900
      let z = it.z + camZ * 0.12
      z = (((z % 1500) + 1500) % 1500) - 1500 - 120
      it.s.position.set(camX + x, it.s.position.y, camZ * 0.88 + z)
    }
  }
}

/* ---------------------------------------------------------------- distant skyline */

/** two rings of far blocks around the camera, coloured into the haze; lit windows after dark */
export class Skyline {
  group = new THREE.Group()
  near: THREE.MeshBasicMaterial
  far: THREE.MeshBasicMaterial
  constructor() {
    const r = rand(5)
    this.near = new THREE.MeshBasicMaterial({ color: '#888', fog: false })
    this.far = new THREE.MeshBasicMaterial({ color: '#999', fog: false })
    const mk = (n: number, r0: number, r1: number, hMin: number, hMax: number, mat: THREE.Material) => {
      const geos: THREE.BufferGeometry[] = []
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (r() - 0.5) * Math.PI * 1.25
        const rad = r0 + r() * (r1 - r0)
        const w = 18 + r() * 40
        const h = hMin + Math.pow(r(), 2) * (hMax - hMin)
        const g = new THREE.BoxGeometry(w, h, w)
        g.translate(Math.cos(a) * rad, h / 2 - 4, Math.sin(a) * rad)
        geos.push(g)
      }
      const m = new THREE.Mesh(mergeGeometries(geos.map((g) => g.toNonIndexed()), false)!, mat)
      m.frustumCulled = false
      m.renderOrder = -8
      this.group.add(m)
    }
    mk(40, 520, 700, 14, 70, this.near)
    mk(46, 760, 1050, 20, 110, this.far)
  }
  update(camX: number, camZ: number, l: Look) {
    this.group.position.set(camX, 0, camZ)
    // aerial perspective: far blocks are almost the horizon colour, nearer ones a touch deeper
    const h = new THREE.Color(l.horizon)
    const deep = new THREE.Color(l.night > 0.5 ? '#1c1a2e' : '#7d8794').lerp(new THREE.Color(l.zenith), 0.25)
    this.near.color.copy(h).lerp(deep, 0.28 + l.night * 0.25)
    this.far.color.copy(h).lerp(deep, 0.14 + l.night * 0.15)
  }
}
