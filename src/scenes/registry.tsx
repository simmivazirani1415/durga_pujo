import type { SceneDef } from './types'
import type { RoadStyle } from './world'
import { roadPoint } from './world'
import { DhakiPlaying, DriftBoat, ElephantCrossing, Traffic, Walker, withLife } from './life'
import hero from './areas/hero'
import yelahanka from './areas/yelahanka'
import malleswaram from './areas/malleswaram'
import rtNagar from './areas/rt-nagar-palace-grounds'
import ulsoor from './areas/ulsoor'
import indiranagar from './areas/indiranagar'
import whitefield from './areas/whitefield-hoodi'
import koramangala from './areas/koramangala'
import hsr, { GATE_Z } from './areas/hsr-layout'
import southEast from './areas/south-east'
import south from './areas/south'
import finale from './areas/finale'
import transit from './areas/transit'

/** centre line of the footpath on one side (+1 right, -1 left) */
const fp = (road: RoadStyle | null, side: 1 | -1) => (road ? side * (road.halfWidth + 0.2 + road.footpath * 0.5) : 0)

/* ---------------------------------------------------------------- selective festive life, a little per stop */

const lifeYelahanka = withLife(yelahanka, () => {
  const r = yelahanka.road!
  return (
    <g>
      <Traffic road={r} count={3} seed={3} scooters={0.4} />
      <Walker road={r} X={fp(r, -1)} Z0={34} Z1={12} dur={30} delay={4} seed={2} variant="woman" />
      <Walker road={r} X={fp(r, -1) - 0.5} Z0={14} Z1={36} dur={34} delay={18} seed={7} variant="man" />
    </g>
  )
})

const lifeMalleswaram = withLife(malleswaram, () => {
  const r = malleswaram.road!
  return (
    <g>
      <Walker road={r} X={fp(r, -1)} Z0={30} Z1={10} dur={26} delay={2} seed={11} variant="lalpaar" />
      <Walker road={r} X={fp(r, 1)} Z0={12} Z1={30} dur={28} delay={12} seed={12} variant="man" colors={['#fbf3e6', '#e9dcc4']} />
      <Walker road={r} X={fp(r, -1) + 0.4} Z0={11} Z1={26} dur={24} delay={16} seed={14} variant="kid" />
      <Traffic road={r} count={2} seed={9} scooters={0.8} zNear={18} />
    </g>
  )
})

const lifeRtNagar = withLife(rtNagar, () => {
  const r = rtNagar.road!
  return (
    <g>
      {/* a caparisoned elephant and attendants crossing slowly far ahead, towards the grounds */}
      <ElephantCrossing road={r} Z={44} X0={15} X1={-15} dur={64} delay={26} />
      <Walker road={r} X={fp(r, 1)} Z0={30} Z1={12} dur={28} delay={6} seed={21} variant="lalpaar" />
      <Walker road={r} X={fp(r, -1)} Z0={12} Z1={28} dur={30} delay={20} seed={22} />
    </g>
  )
})

const lifeUlsoor = withLife(ulsoor, () => {
  const r = ulsoor.road!
  return (
    <g>
      <DriftBoat road={r} Z={70} X0={18} X1={46} dur={80} delay={30} />
      <Walker road={r} X={fp(r, 1)} Z0={32} Z1={11} dur={34} delay={8} seed={31} variant="woman" />
      <Walker road={r} X={fp(r, 1) + 0.6} Z0={12} Z1={30} dur={36} delay={24} seed={33} variant="man" />
    </g>
  )
})

const lifeIndiranagar = withLife(indiranagar, () => {
  const r = indiranagar.road!
  return (
    <g>
      <Traffic road={r} count={4} seed={5} lights scooters={0.4} />
      <Walker road={r} X={fp(r, -1)} Z0={28} Z1={9} dur={26} delay={3} seed={41} variant="woman" />
      <Walker road={r} X={fp(r, 1) - 0.4} Z0={10} Z1={28} dur={28} delay={15} seed={42} variant="man" />
    </g>
  )
})

const lifeWhitefield = withLife(whitefield, () => {
  const r = whitefield.road!
  return (
    <g>
      <Traffic road={r} count={5} seed={7} scooters={0.3} />
      <Walker road={r} X={fp(r, -1)} Z0={26} Z1={10} dur={28} delay={9} seed={51} variant="man" />
    </g>
  )
})

const lifeKoramangala = withLife(koramangala, () => {
  const r = koramangala.road!
  return (
    <g>
      <Walker road={r} X={fp(r, -1) + 0.3} Z0={26} Z1={9} dur={24} delay={4} seed={61} variant="woman" />
      <Walker road={r} X={fp(r, 1) - 0.3} Z0={10} Z1={24} dur={26} delay={13} seed={62} variant="man" />
      <Traffic road={r} count={2} seed={13} scooters={0.7} zNear={20} />
    </g>
  )
})

const lifeHsr = withLife(
  hsr,
  () => {
    const r = hsr.road!
    const dk = roadPoint(r, -5.2, GATE_Z - 1.4)
    return (
      <g>
        <DhakiPlaying x={dk.x} y={dk.y} s={dk.s} />
      </g>
    )
  },
  { after: 'pujo', depth: 0.3 },
)

const lifeSouthEast = withLife(southEast, () => {
  const r = southEast.road!
  return (
    <g>
      <Traffic road={r} count={6} seed={17} lights scooters={0.5} />
      <Walker road={r} X={fp(r, 1)} Z0={24} Z1={9} dur={24} delay={7} seed={71} variant="woman" />
    </g>
  )
})

const lifeSouth = withLife(south, () => {
  const r = south.road!
  return (
    <g>
      <Traffic road={r} count={3} seed={19} lights scooters={0.5} />
      <Walker road={r} X={fp(r, -1)} Z0={26} Z1={10} dur={28} delay={5} seed={81} variant="lalpaar" />
      <Walker road={r} X={fp(r, 1)} Z0={10} Z1={24} dur={26} delay={17} seed={82} variant="man" />
    </g>
  )
})

export const SCENES: Record<string, SceneDef> = {
  hero,
  yelahanka: lifeYelahanka,
  malleswaram: lifeMalleswaram,
  'rt-nagar-palace-grounds': lifeRtNagar,
  ulsoor: lifeUlsoor,
  indiranagar: lifeIndiranagar,
  'whitefield-hoodi': lifeWhitefield,
  koramangala: lifeKoramangala,
  'hsr-layout': lifeHsr,
  'south-east': lifeSouthEast,
  south: lifeSouth,
  finale,
  transit,
}

export const ALL_SCENES: SceneDef[] = Object.values(SCENES)
