import { AutoSprite } from '../auto/AutoSprite'
import { CityMap } from '../ui/CityMap'
import { Grade } from './Grade'
import { HeroCanopy } from '../ui/HeroCanopy'
import { World3D } from '../world3d/World3D'

/**
 * The full-screen picture: the 3D street world, the client's auto on its road, the hero canopy and the grade.
 * #world shifts as a whole when the Explore panel opens so the auto stays in view.
 */
export function Stage() {
  return (
    <div id="stage" className="fixed inset-0 overflow-hidden select-none" aria-hidden="true">
      <div id="world" className="absolute inset-0">
        <div className="absolute inset-0" style={{ zIndex: 1 }}>
          <World3D />
        </div>
        <div className="absolute inset-0" style={{ zIndex: 4 }}>
          <AutoSprite />
        </div>
        <div className="absolute inset-0" style={{ zIndex: 6, pointerEvents: 'none' }}>
          <HeroCanopy />
        </div>
        <div className="absolute inset-0" style={{ zIndex: 7, pointerEvents: 'none' }}>
          <Grade />
        </div>
      </div>
      <div className="absolute inset-0" style={{ zIndex: 8, pointerEvents: 'none' }}>
        <CityMap />
      </div>
      <div id="world-fade" className="absolute inset-0" style={{ zIndex: 9, pointerEvents: 'none', background: '#f6ead6', opacity: 0, visibility: 'hidden' }} />
    </div>
  )
}
