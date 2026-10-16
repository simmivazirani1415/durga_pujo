/**
 * The WebGL street world: renderer, the camera riding the route, sun and sky, fog, shadows and bloom.
 * The camera uses exactly the same pinhole as the auto artwork (scenes/world.ts), so the client's auto
 * sits on the 3D road at true scale. The director moves `cam`; everything else follows from it.
 */
import * as THREE from 'three'
import gsap from 'gsap'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { F } from '../scenes/world'
import { getView, onView } from '../engine/viewport'
import { autoMotion } from '../engine/motion'
import { AREA_COUNT_3D, buildArea, laneX, restPose, type AreaBuilt } from './areas3d'
import { L, camWorld, frame, locate, stopD } from './route'
import { Clouds, Sky, Skyline, lookAt, type Look } from './sky'
import { M, U, setNight } from './mats'
import { noCast, noReceive } from './batch'

/** camera state the director animates */
export const cam = {
  /** distance along the route */
  d: 0,
  /** extra height above the usual 2 m (elevated transitions) */
  lift: 0,
  /** radians, negative looks down */
  pitch: 0,
}

/**
 * The ride camera. While `on`, the game places the camera (a chase camera behind the auto) instead of the
 * route rig; `cam.lift` and `cam.pitch` still add on top for the cinematic jumps across the city.
 */
export const drive = {
  on: false,
  x: 0,
  z: 0,
  yaw: 0,
  /** camera height above the road */
  h: 2,
  /** focal-length multiplier (below 1 widens the view at speed); the auto sprite uses the same */
  fov: 1,
  /** 1 when parked at a stop (pandal label anchor active) */
  settle: 0,
  /** the stop the auto is parked at */
  stop: 0,
  paused: false,
}

/** where the current stop's pandal label belongs on screen (CSS px), updated every frame */
export const pandalAnchor = { x: 0, y: 0, on: false }

const CAM_H = 2

let engine: Engine | null = null
export function getEngine() {
  return engine
}

class Engine {
  renderer: THREE.WebGLRenderer
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera()
  composer: EffectComposer
  bloom: UnrealBloomPass
  sun = new THREE.DirectionalLight('#ffffff', 3)
  hemi = new THREE.HemisphereLight('#ffffff', '#444444', 1)
  shrineLight = new THREE.PointLight('#ffb35a', 0, 40, 2)
  sky = new Sky()
  clouds = new Clouds()
  skyline = new Skyline()
  envScene = new THREE.Scene()
  pmrem: THREE.PMREMGenerator
  envRT: THREE.WebGLRenderTarget | null = null
  lastEnv = -1e9
  lastEnvT = 0
  areas: (AreaBuilt | null)[] = Array(AREA_COUNT_3D).fill(null)
  queue: number[] = []
  t = 0
  frame = 0
  lastD = 0
  lastYaw = 0
  speed = 0
  fog: THREE.Fog
  sunDir = new THREE.Vector3()
  disposeView: () => void
  tick: (time: number, deltaMs: number) => void
  lowPower: boolean
  lastFov = 1

  constructor(public canvas: HTMLCanvasElement) {
    const v = getView()
    this.lowPower = v.compact || (navigator.hardwareConcurrency ?? 8) <= 4
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false })
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.pmrem = new THREE.PMREMGenerator(this.renderer)

    this.fog = new THREE.Fog('#e8d8c0', 50, 400)
    this.scene.fog = this.fog
    this.scene.add(this.sky.mesh, this.clouds.group, this.skyline.group)
    this.envScene.add(new THREE.Mesh(this.sky.mesh.geometry, this.sky.mat))

    const sm = this.lowPower ? 1024 : 2048
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(sm, sm)
    const sc = this.sun.shadow.camera
    sc.left = -60
    sc.right = 60
    sc.top = 60
    sc.bottom = -60
    sc.near = 1
    sc.far = 400
    this.sun.shadow.bias = -0.0004
    this.sun.shadow.normalBias = 0.04
    this.sun.shadow.radius = 3
    this.scene.add(this.sun, this.sun.target, this.hemi, this.shrineLight)

    // ground, glow and decal materials neither cast nor receive in ways that cost or look wrong
    for (const m of [M.road('two'), M.road('four'), M.road('narrow'), M.paver(), M.kerb(), M.grass(), M.grass('dry'), M.dirt(), M.water()]) noCast(m)
    for (const m of [M.bulb(), M.bulbCool(), M.lamp(), M.ledPink(), M.ledCyan(), M.shrine(), M.headlight(), M.taillight(), M.pool()]) {
      noCast(m)
      noReceive(m)
    }

    // post: MSAA render target, bloom on the lamps and bulbs, then tone mapping and sRGB
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: this.lowPower ? 2 : 4 })
    this.composer = new EffectComposer(this.renderer, rt)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.3, 0.92)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())

    this.resize()
    this.disposeView = onView(() => this.resize())
    this.tick = (_time, deltaMs) => this.update(Math.min(0.05, deltaMs / 1000))
    gsap.ticker.add(this.tick)

    // build everything near the start now, the rest a piece at a time while the visitor reads the page
    const start = Math.round(cam.d / L)
    this.ensure(start)
    const order = [start + 1, start - 1, start + 2, ...Array.from({ length: AREA_COUNT_3D }, (_, i) => i)]
    this.queue = order.filter((i, k) => i >= 0 && i < AREA_COUNT_3D && order.indexOf(i) === k && i !== start)
    this.drain()
  }

  drain() {
    const next = this.queue.shift()
    if (next === undefined) return
    setTimeout(() => {
      this.ensure(next)
      this.drain()
    }, 40)
  }

  ensure(i: number) {
    if (i < 0 || i >= AREA_COUNT_3D || this.areas[i]) return
    const a = buildArea(i)
    a.group.visible = false
    this.scene.add(a.group)
    this.areas[i] = a
  }

  resize() {
    const v = getView()
    const dpr = Math.min(window.devicePixelRatio || 1, v.compact ? 1.5 : 1.6)
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(v.W, v.H, false)
    this.composer.setPixelRatio(dpr)
    this.composer.setSize(v.W, v.H)
    this.bloom.resolution.set(v.W / 2, v.H / 2)
    // the shared pinhole: focal length F viewBox units, vanishing point at (vpX, vpY) CSS px
    const f = F * v.s * drive.fov
    this.lastFov = drive.fov
    const n = 0.3
    const far = 4000
    this.camera.near = n
    this.camera.far = far
    this.camera.projectionMatrix.makePerspective((-v.vpX / f) * n, ((v.W - v.vpX) / f) * n, (v.vpY / f) * n, (-(v.H - v.vpY) / f) * n, n, far)
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert()
  }

  applyLook(l: Look) {
    const el = THREE.MathUtils.degToRad(l.sunEl)
    const az = THREE.MathUtils.degToRad(l.sunAz)
    this.sunDir.set(Math.sin(az) * Math.cos(Math.max(el, 0.02)), Math.sin(Math.max(el, 0.02)), -Math.cos(az) * Math.cos(Math.max(el, 0.02))).normalize()
    // the sky shows the true sun position, even just below the horizon at dusk
    const skyDir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize()
    this.sky.apply(l, skyDir)
    this.sun.color.set(l.sun)
    this.sun.intensity = l.sunI * (l.sunEl < 4 ? Math.max(0.35, l.sunEl / 4) : 1)
    this.hemi.color.set(l.hemiSky)
    this.hemi.groundColor.set(l.hemiGround)
    this.hemi.intensity = l.hemiI
    this.fog.color.set(l.horizon)
    this.fog.near = l.fogNear
    this.fog.far = l.fogFar
    this.renderer.toneMappingExposure = l.exposure
    // kept low and tight: lights should read as crisp bulbs, not a haze (Simran: no blurry effects)
    this.bloom.strength = l.bloom * 0.5
    this.bloom.threshold = l.night > 0.5 ? 0.82 : 0.95
    setNight(l.night)
  }

  updateEnv(force = false) {
    const now = this.t
    if (!force && Math.abs(cam.d - this.lastEnv) < 25 && now - this.lastEnvT < 4) return
    if (!force && now - this.lastEnvT < 0.6) return
    this.lastEnv = cam.d
    this.lastEnvT = now
    const rt = this.pmrem.fromScene(this.envScene, 0, 0.1, 3000)
    this.scene.environment = rt.texture
    this.envRT?.dispose()
    this.envRT = rt
  }

  update(dt: number) {
    if (document.hidden) return
    this.t += dt
    this.frame++
    U.time.value = this.t
    if (drive.on) cam.d = locate(drive.x, drive.z).d
    if (Math.abs(drive.fov - this.lastFov) > 0.0005) this.resize()
    const d = cam.d
    const vel = (d - this.lastD) / Math.max(dt, 1e-3)
    this.lastD = d
    this.speed += (vel - this.speed) * Math.min(1, dt * 8)
    const moving = Math.abs(this.speed) > 0.3 || cam.lift > 0.05 || (drive.on && !drive.paused)

    const look = lookAt(d)
    this.applyLook(look)
    this.updateEnv(this.frame < 3)

    // camera: in the left lane at eye height, looking along the road; near a stop it pulls into the
    // pandal's forecourt and turns to face it, so the auto parks right in front of the pandal
    const v = getView()
    const near = Math.round(d / L)
    const sd = d - stopD(near)
    const k = (t: number) => {
      const c = Math.max(0, Math.min(1, t))
      return c * c * (3 - 2 * c)
    }
    const w = drive.on ? 0 : near >= 1 && near <= 9 ? (sd <= 0 ? k((sd + 34) / 34) : 1 - k(sd / 30)) : 0
    const rest = w > 0 ? restPose(near) : null
    const dd = rest ? d + w * (rest.d - stopD(near)) : d
    const lane = laneX(dd)
    const f = frame(dd, lane)
    const ahead = frame(dd + 8, laneX(dd + 8))
    let yaw = Math.atan2(-(ahead.x - f.x), -(ahead.z - f.z))
    let px = f.x
    let pz = f.z
    if (rest) {
      px = f.x + (rest.x - f.x) * w
      pz = f.z + (rest.z - f.z) * w
      let dy = rest.yaw - yaw
      while (dy > Math.PI) dy -= Math.PI * 2
      while (dy < -Math.PI) dy += Math.PI * 2
      yaw += dy * w
    }
    const drift = Math.sin(this.t * 0.31) * 0.0035 + Math.sin(this.t * 0.17 + 1) * 0.002
    if (drive.on) {
      px = drive.x
      pz = drive.z
      yaw = drive.yaw
      this.camera.position.set(px, drive.h + cam.lift, pz)
      this.camera.rotation.set(cam.pitch, yaw, 0, 'YXZ')
    } else {
      this.camera.position.set(px, CAM_H + cam.lift, pz)
      this.camera.rotation.set(cam.pitch + Math.sin(this.t * 0.23) * 0.0012, yaw + drift * (moving ? 0.3 : 1), 0, 'YXZ')
    }
    this.camera.updateMatrixWorld()
    camWorld.x = px
    camWorld.z = pz
    // the auto stays straight and level; steer only nudges it sideways a touch in bends
    const turnRate = (yaw - this.lastYaw) / Math.max(dt, 1e-3)
    this.lastYaw = yaw
    if (!drive.on) autoMotion.steer += (Math.max(-1, Math.min(1, -turnRate * 1.2)) - autoMotion.steer) * Math.min(1, dt * 4)
    const settle = drive.on ? drive.settle : w

    // sun and its shadow box follow the camera
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion)
    const tgt = this.camera.position.clone().addScaledVector(fwd, 40)
    tgt.y = 0
    this.sun.target.position.copy(tgt)
    this.sun.position.copy(tgt).addScaledVector(this.sunDir, 160)
    this.sun.target.updateMatrixWorld()

    this.clouds.update(this.t, this.camera.position.x, this.camera.position.z, look)
    this.skyline.update(this.camera.position.x, this.camera.position.z, look)

    // which areas to draw and animate
    // draw what lies the way the camera faces: ahead along the route, or behind it when riding back
    const facing = -fwd.z
    const reach = look.fogFar + 40
    const aheadM = 40 + Math.max(0, facing) * reach + (drive.on ? 30 : 40)
    const behind = 40 + Math.max(0, -facing) * reach + cam.lift * 2
    const viewFar = d + aheadM
    let best: AreaBuilt | null = null
    let bestDist = 1e9
    for (let i = 0; i < this.areas.length; i++) {
      const a = this.areas[i]
      const inView = a ? a.to > d - behind && a.from < viewFar : stopD(i) - 45 < viewFar && stopD(i) + 85 > d - behind
      if (!a) {
        if (inView) this.ensure(i)
        continue
      }
      a.group.visible = inView
      if (inView) for (const act of a.actors) act.update(this.t, dt)
      if (a.pandalLight) {
        const dist = Math.abs(stopD(i) - d)
        if (dist < bestDist) {
          bestDist = dist
          best = a
        }
      }
    }
    // one warm light inside the nearest pandal
    if (best?.pandalLight && bestDist < 120) {
      this.shrineLight.position.copy(best.pandalLight)
      this.shrineLight.intensity = (50 + look.night * 260) * Math.max(0, 1 - bestDist / 120)
    } else this.shrineLight.intensity = 0

    // the label anchor for the parked stop's pandal
    const cur = this.areas[drive.on ? drive.stop : near]
    if (cur?.pandalTop && settle > 0.97 && cam.lift < 0.1) {
      const p = cur.pandalTop.clone().project(this.camera)
      pandalAnchor.x = (p.x * 0.5 + 0.5) * v.W
      pandalAnchor.y = (-p.y * 0.5 + 0.5) * v.H
      pandalAnchor.on = p.z < 1
    } else pandalAnchor.on = false

    // when nothing moves, render at half rate to spare batteries
    if (!moving && this.frame % 2 === 1 && !this.lowPower) return
    if (!moving && this.lowPower && this.frame % 3 !== 0) return
    this.composer.render(dt)
  }

  dispose() {
    gsap.ticker.remove(this.tick)
    this.disposeView()
    this.renderer.dispose()
  }
}

export function startEngine(canvas: HTMLCanvasElement) {
  if (engine) engine.dispose()
  engine = new Engine(canvas)
  return engine
}

export function stopEngine() {
  engine?.dispose()
  engine = null
}
