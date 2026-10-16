import type { SceneDef } from '../types'
import { ROAD_DEFAULT, place, roadCenterX } from '../world'
import { RainTree, Lamp, RoadSign, rowAlong } from '../kit'

/**
 * The in-between road shown for a moment during a street drive: an avenue of rain trees and the
 * green direction sign naming the next area. Only objects, no sky or ground, so the departing and
 * arriving scenes show through.
 */
const road = { ...ROAD_DEFAULT }

const transit: SceneDef = {
  id: 'transit',
  title: 'On the road',
  road: null,
  layers: [
    {
      id: 'avenue',
      band: 'front',
      depth: 0.8,
      render: () => {
        const left = rowAlong(road, -road.halfWidth - 3.2, 7, 42, 7)
        const right = rowAlong(road, road.halfWidth + 3.4, 10, 45, 7)
        const lamps = rowAlong(road, road.halfWidth + 1.0, 9, 39, 15)
        return (
          <g>
            {left.map((p, i) => (
              <RainTree key={`l${i}`} x={p.x} y={p.y} s={p.s} seed={40 + i} h={12 + (i % 3)} spread={1.05} />
            ))}
            {right.map((p, i) => (
              <RainTree key={`r${i}`} x={p.x} y={p.y} s={p.s} seed={70 + i} h={11 + (i % 2) * 2} />
            ))}
            {lamps.map((p, i) => (
              <Lamp key={`m${i}`} x={p.x} y={p.y} s={p.s} arm="left" />
            ))}
          </g>
        )
      },
    },
    {
      id: 'sign',
      band: 'front',
      depth: 0.9,
      render: (ctx) => {
        const p = place(roadCenterX(road, 13) + road.halfWidth + 1.6, 13)
        return <RoadSign x={p.x} y={p.y} s={p.s} w={4.6} h={1.5} lines={[{ text: ctx.transitLabel || 'Bengaluru', arrow: '↑' }]} />
      },
    },
  ],
}

export default transit
