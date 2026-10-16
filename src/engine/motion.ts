import type { AreaSlug } from '../data/types'
import { AUTO_Z, type RoadStyle } from '../scenes/world'

/**
 * Shared, mutable motion state. GSAP tweens these plain objects; the road canvas and the 3D auto read
 * them every frame. Nothing here triggers React renders.
 */
export const autoMotion = {
  /** 0..1, how fast the auto is rolling (1 = cruising) */
  speed: 0,
  /** +1 forward, -1 rolling back (reverse scroll) */
  dir: 1 as 1 | -1,
  /** -1..1 steering, also drifts the auto sideways a little */
  steer: 0,
  /** lateral position, metres from road centre */
  X: 0,
  /** distance ahead of the camera, metres */
  Z: AUTO_Z,
  /** vertical offset, metres (negative sinks it out of view during elevated transitions) */
  lift: 0,
  /** 0..1 visibility (applied as canvas opacity) */
  opacity: 1,
  /** focal-length multiplier shared with the 3D camera (the ride widens the view at speed) */
  fov: 1,
  /** how far the auto is turned away from the camera's heading (radians, + = nose to the left) */
  yaw: 0,
}

/** metres per second at speed 1 */
export const CRUISE_MPS = 15

export const roadState = {
  from: null as RoadStyle | null,
  to: null as RoadStyle | null,
  /** 0 = from style, 1 = to style */
  mix: 1,
  /** overall opacity of the moving markings */
  alpha: 1,
  /** metres travelled; drives the dash phase */
  travel: 0,
}

type MapListener = () => void
export const mapState = {
  from: null as AreaSlug | 'hero' | 'finale' | null,
  to: null as AreaSlug | 'hero' | 'finale' | null,
  /** 0..1 progress of the marker along the route */
  t: 0,
  listeners: new Set<MapListener>(),
  setRoute(from: AreaSlug | 'hero' | 'finale' | null, to: AreaSlug | 'hero' | 'finale' | null) {
    this.from = from
    this.to = to
    this.t = 0
    this.listeners.forEach((l) => l())
  },
}
