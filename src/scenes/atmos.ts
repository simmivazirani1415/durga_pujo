/**
 * Per-scene light and air: the cinematic grade laid over each stop (engine/Grade.tsx) and the aerial haze
 * that pushes far layers back (engine/Stage.tsx). Sun positions are in the shared 1600 x 1000 viewBox.
 */
export interface Atmos {
  /** colour far layers fade into */
  haze: string
  /** 0..1, how strongly the farthest layers take the haze */
  hazeK: number
  /** the key light: bloom centre in viewBox units */
  sun: { x: number; y: number }
  /** bloom colour and strength (screen blend) */
  bloom: string
  bloomK: number
  /** warm/cool split-tone (soft-light): top and bottom colours */
  toneTop: string
  toneBottom: string
  toneK: number
  /** edge darkening 0..1 */
  vignette: number
  /** light shafts from the sun */
  rays?: number
  /** warm out-of-focus festival lights drifting in the upper corners (evening stops) */
  bokeh?: number
}

const golden: Omit<Atmos, 'sun'> = {
  haze: '#f3d2a2',
  hazeK: 0.42,
  bloom: '#ffcf86',
  bloomK: 0.5,
  toneTop: '#ffd9a0',
  toneBottom: '#5a2a3a',
  toneK: 0.32,
  vignette: 0.32,
  rays: 0.18,
}

export const ATMOS: Record<string, Atmos> = {
  hero: { ...golden, sun: { x: 1400, y: 470 }, bloomK: 0.55, rays: 0.22, bokeh: 0.5 },
  yelahanka: { ...golden, haze: '#dfe6e6', hazeK: 0.38, sun: { x: 1360, y: 130 }, bloom: '#fff2cc', bloomK: 0.35, toneTop: '#fff1d0', toneBottom: '#30405a', toneK: 0.22, vignette: 0.24, rays: 0.12 },
  malleswaram: { ...golden, sun: { x: 1000, y: 470 }, bloomK: 0.55, rays: 0.26 },
  'rt-nagar-palace-grounds': { ...golden, sun: { x: 1250, y: 448 }, bloomK: 0.55, rays: 0.2, bokeh: 0.3 },
  ulsoor: { ...golden, haze: '#f2c7b0', sun: { x: 1270, y: 515 }, bloom: '#ffb98a', bloomK: 0.5, toneTop: '#ffc6a0', toneBottom: '#4a2a4a', rays: 0.14 },
  indiranagar: { ...golden, haze: '#b9a6c0', hazeK: 0.4, sun: { x: 560, y: 600 }, bloom: '#ffb070', bloomK: 0.45, toneTop: '#ffc590', toneBottom: '#1e2448', toneK: 0.4, vignette: 0.42, rays: 0, bokeh: 1 },
  'whitefield-hoodi': { ...golden, haze: '#ecd6b4', sun: { x: 1290, y: 360 }, bloomK: 0.45, rays: 0.16 },
  koramangala: { ...golden, sun: { x: 935, y: 486 }, bloomK: 0.6, rays: 0.28, bokeh: 0.35 },
  'hsr-layout': { ...golden, sun: { x: 1360, y: 300 }, bloomK: 0.5, rays: 0.2, bokeh: 0.3 },
  'south-east': { ...golden, haze: '#e6c3a6', sun: { x: 1210, y: 548 }, bloom: '#ffc890', bloomK: 0.45, toneBottom: '#33284a', toneK: 0.36, vignette: 0.36, rays: 0.1, bokeh: 0.6 },
  south: { ...golden, haze: '#a9a2c2', hazeK: 0.45, sun: { x: 820, y: 560 }, bloom: '#ffb878', bloomK: 0.35, toneTop: '#f7bf8f', toneBottom: '#1c2246', toneK: 0.42, vignette: 0.44, rays: 0, bokeh: 1 },
  finale: { ...golden, haze: '#c9a9b0', sun: { x: 800, y: 560 }, bloom: '#ffbd80', bloomK: 0.5, toneBottom: '#2a2244', toneK: 0.38, vignette: 0.38, rays: 0.1, bokeh: 0.8 },
  transit: { ...golden, sun: { x: 800, y: 520 }, bloomK: 0.35, rays: 0 },
}
