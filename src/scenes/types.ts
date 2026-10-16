import type { ReactNode } from 'react'
import type { RoadStyle } from './world'

/**
 * Bands stack the picture:  back  →  [moving road markings canvas]  →  front  →  [3D auto]  →  fore
 *  - back:  sky, skyline, landmark, ground and road surface
 *  - front: anything standing beside the road that should cover road markings (buildings, trees, people at the kerb)
 *  - fore:  out-of-focus framing in the screen corners, drawn over the auto. Keep it to the corners.
 */
export type Band = 'back' | 'front' | 'fore'

export interface SceneCtx {
  /** text on the green direction sign in the in-between road (transit scene only) */
  transitLabel: string
}

export interface LayerDef {
  id: string
  band: Band
  /**
   * How near the layer feels, used by transitions:
   *   0      sky (never scales)
   *   0.1    distant skyline / tree line
   *   0.3    the landmark
   *   0.55   mid street
   *   0.85   near street edges
   *   1.2    foreground framing
   */
  depth: number
  /** static layers (sky, ground, road surface) only cross-fade; they never zoom */
  static?: boolean
  render: (ctx: SceneCtx) => ReactNode
}

export interface SceneDef {
  id: string
  /** label read by screen readers / used in dev preview */
  title: string
  /** road surface style drawn under the moving markings; null = no shared road (hero) */
  road: RoadStyle | null
  layers: LayerDef[]
}
