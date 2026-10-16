/**
 * DEV ONLY preview harness (never part of the production page).
 *   ?scene=<id>          one scene at rest, full screen, with road markings and the 3D auto
 *   ?scene=<id>&noauto   same without the auto
 *   ?auto=1              the 3D auto alone on a neutral road (add &speed=1 to spin wheels, &steer=0.5)
 *   ?ui=explore&area=hsr-layout   the Explore panel open over a scene
 */
import { useEffect } from 'react'
import { SCENES } from '../scenes/registry'
import { VB_H, VB_W, ROAD_DEFAULT } from '../scenes/world'
import { RoadCanvas } from '../engine/RoadCanvas'
import { AutoSprite } from '../auto/AutoSprite'
import { autoMotion, roadState } from '../engine/motion'
import { refreshView } from '../engine/viewport'
import { stopIndexOf } from '../data/areas'
import type { StopId } from '../data/types'
import { useJourney } from '../store/journey'
import { ExplorePanel } from '../ui/explore/ExplorePanel'
import { ItineraryPlanner } from '../ui/itinerary/ItineraryPlanner'
import { SearchOverlay } from '../ui/search/SearchOverlay'
import { SearchBox } from '../ui/search/SearchBox'
import { Header } from '../ui/Header'

export function Preview() {
  const p = new URLSearchParams(location.search)
  const id = p.get('scene') ?? p.get('area') ?? (p.has('auto') ? null : 'hsr-layout')
  const scene = id ? SCENES[id] : null
  const showAuto = !p.has('noauto') && (p.has('auto') || (id !== 'transit' && id !== 'finale'))
  useEffect(() => {
    refreshView()
    roadState.from = null
    roadState.to = scene ? scene.road : { ...ROAD_DEFAULT }
    roadState.mix = 1
    roadState.alpha = 1
    autoMotion.speed = parseFloat(p.get('speed') ?? '0')
    autoMotion.steer = parseFloat(p.get('steer') ?? '0')
    if (id === 'hero') autoMotion.Z = 4.6
    if (p.get('z')) autoMotion.Z = parseFloat(p.get('z')!)
    if (p.get('ui') === 'explore' && id) {
      useJourney.getState().setIndex(stopIndexOf(id as StopId))
      useJourney.getState().openPanel({ tab: (p.get('tab') as 'pandal' | 'food' | 'event') ?? 'pandal' })
    }
    if (p.get('ui') === 'planner') useJourney.getState().setPlannerOpen(true)
    if (p.get('ui') === 'search') useJourney.getState().setSearchOpen(true)
  }, [])
  const bands = ['back', 'front', 'fore'] as const
  return (
    <div id="stage" className="fixed inset-0 overflow-hidden" style={{ background: p.has('auto') && !scene ? '#cdbfa8' : undefined }}>
      <div id="world" className="absolute inset-0">
        {bands.map((band, bi) => (
          <div key={band} className="absolute inset-0" style={{ zIndex: bi * 2 }}>
            {scene?.layers
              .filter((l) => l.band === band)
              .map((l) => (
                <div key={l.id} className="layer absolute inset-0" data-layer-id={l.id}>
                  <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMax slice" width="100%" height="100%">
                    {l.render({ transitLabel: p.get('label') ?? 'Ulsoor' })}
                  </svg>
                </div>
              ))}
          </div>
        ))}
        <div className="absolute inset-0" style={{ zIndex: 1 }}>
          <RoadCanvas />
        </div>
        {showAuto && (
          <div className="absolute inset-0" style={{ zIndex: 3 }}>
            <AutoSprite />
          </div>
        )}
      </div>
      {p.get('ui') && (
        <>
          <Header />
          <ExplorePanel />
          <ItineraryPlanner />
          <SearchOverlay />
        </>
      )}
      {p.get('ui') === 'searchbox' && (
        <div className="fixed left-1/2 top-[30vh] w-[min(600px,92vw)] -translate-x-1/2">
          <SearchBox variant="hero" />
        </div>
      )}
    </div>
  )
}
