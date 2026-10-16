import type { SceneDef } from './types'
import { ROAD_DEFAULT, place } from './world'
import { Sky, Ground, RoadSurface, Building, RainTree, TreeLine, Haze } from './kit'

/** Temporary scene used until the illustrated one is drawn. */
export function placeholderScene(id: string, title: string, sky: [string, string, string]): SceneDef {
  const road = { ...ROAD_DEFAULT }
  return {
    id,
    title,
    road,
    layers: [
      { id: 'sky', band: 'back', depth: 0, static: true, render: () => <Sky top={sky[0]} mid={sky[1]} bottom={sky[2]} sun={{ x: 1180, y: 470, r: 22 }} /> },
      { id: 'far', band: 'back', depth: 0.1, render: () => <><TreeLine y={562} h={36} seed={id.length} /><Haze /></> },
      { id: 'ground', band: 'back', depth: 1, static: true, render: () => <><Ground color="#7d8452" /><RoadSurface road={road} /></> },
      {
        id: 'street',
        band: 'front',
        depth: 0.7,
        render: () => {
          const a = place(-9, 14), b = place(10, 12), t1 = place(-6, 9), t2 = place(6.5, 8)
          return (
            <>
              <Building {...a} w={12} h={13} color="#e4c9a0" side="right" />
              <Building {...b} w={14} h={10} color="#d9b38a" side="left" lit={0.1} />
              <RainTree {...t1} seed={3} />
              <RainTree {...t2} seed={8} />
              <text x={800} y={140} fontSize={44} textAnchor="middle" fill="#651B28" fontFamily="Cormorant Garamond, serif">{title} (placeholder)</text>
            </>
          )
        },
      },
    ],
  }
}
