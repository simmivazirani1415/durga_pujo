import { useEffect } from 'react'
import gsap from 'gsap'
import { STOPS, stopIndexOf } from './data/areas'
import type { StopId } from './data/types'
import { jumpTo } from './engine/director'
import { initInput } from './engine/input'
import { Stage } from './engine/Stage'
import { refreshView, useView } from './engine/viewport'
import { useJourney } from './store/journey'
import { A11yNav } from './ui/A11yNav'
import { ArrivalCard } from './ui/ArrivalCard'
import { FinaleContent } from './ui/FinaleContent'
import { Header } from './ui/Header'
import { HeroContent } from './ui/HeroContent'
import { RouteRail } from './ui/RouteRail'
import { ExplorePanel } from './ui/explore/ExplorePanel'
import { ItineraryPlanner } from './ui/itinerary/ItineraryPlanner'
import { SearchOverlay } from './ui/search/SearchOverlay'
import { enterAtNow, initRide } from './game/controller'
import { GameHUD } from './game/GameHUD'
import { MapPanel, MiniMap } from './game/MiniMap'
import { AwardAnimation, useCollectibleAwards } from './game/Collection'
import { rideActive } from './game/store'
import { go } from './engine/director'

function indexFromHash(): number {
  const h = (location.hash || '').replace('#', '')
  if (!h) return 0
  const i = stopIndexOf(h as StopId)
  return i >= 0 ? i : 0
}

/** Keep the auto and landmark in view while the Explore panel is open. */
function useWorldShift() {
  const panelOpen = useJourney((s) => s.panel.open)
  const view = useView()
  useEffect(() => {
    const w = document.getElementById('world')
    if (!w) return
    // the guide opens in the centre now; the scene stays put and softens behind it
    gsap.to(w, { x: 0, y: 0, scale: panelOpen ? 1.03 : 1, duration: 0.65, ease: 'power3.out' })
  }, [panelOpen, view.compact, view.W, view.H])
}

export function App() {
  useEffect(() => {
    refreshView()
    const offRide = initRide()
    const start = indexFromHash()
    // a link to an area stop opens the ride parked at that stop
    if (start > 0 && start < STOPS.length - 1) enterAtNow(start)
    else jumpTo(start)
    const off = initInput(document.getElementById('stage')!)
    const onHash = () => {
      const i = indexFromHash()
      if (i === useJourney.getState().index) return
      if (rideActive() || (i > 0 && i < STOPS.length - 1)) void go(i)
      else jumpTo(i)
    }
    window.addEventListener('hashchange', onHash)
    return () => {
      off()
      offRide()
      window.removeEventListener('hashchange', onHash)
    }
  }, [])
  useWorldShift()
  useCollectibleAwards()
  return (
    <>
      <Stage />
      <HeroContent />
      <ArrivalCard />
      <FinaleContent />
      <Header />
      <RouteRail />
      <GameHUD />
      <MiniMap />
      <MapPanel />
      <AwardAnimation />
      <ExplorePanel />
      <SearchOverlay />
      <ItineraryPlanner />
      <A11yNav />
    </>
  )
}
