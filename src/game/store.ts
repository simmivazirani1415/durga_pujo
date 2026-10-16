import { create } from 'zustand'
import type { AreaSlug } from '../data/types'

/**
 * UI-facing state of the ride. The per-frame vehicle state lives in plain objects (vehicle.ts) so driving never
 * re-renders React; this store only carries what the HUD shows, updated a few times a second.
 */
export type RideMode = 'hero' | 'drive'
export type CamMode = 'chase' | 'wide'
export type Phase = 'free' | 'arriving' | 'parked' | 'leaving' | 'jumping'

export interface Hint {
  /** short line shown under the header, e.g. a junction choice */
  text: string
  /** optional second line */
  sub?: string
  /** optional action */
  action?: 'return' | 'turn' | 'finish'
  actionLabel?: string
}

interface GameState {
  mode: RideMode
  phase: Phase
  paused: boolean
  autoDrive: boolean
  cam: CamMode
  /** stop index the visitor chose on the map, or null to ride freely */
  dest: number | null
  mapOpen: boolean
  sound: boolean
  /** controls tutorial until the first drive input */
  tutorial: boolean
  speedKmh: number
  /** nearest area stop index while riding */
  near: number
  hint: Hint | null
  collected: AreaSlug[]
  /** a collectible being awarded right now (drives the animation) */
  award: AreaSlug | null
  /** the collectible that just landed in the collection (the collection opens to show it) */
  justGot: AreaSlug | null
  set: (p: Partial<GameState>) => void
  collect: (slug: AreaSlug) => boolean
}

const COLLECT_KEY = 'pujoblr.collect.v1'
const SOUND_KEY = 'pujoblr.sound.v1'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function save(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* storage unavailable: progress lives for this visit only */
  }
}

export const useGame = create<GameState>((set, get) => ({
  mode: 'hero',
  phase: 'free',
  paused: false,
  autoDrive: false,
  cam: 'chase',
  dest: null,
  mapOpen: false,
  sound: load<boolean>(SOUND_KEY, false) === true,
  tutorial: true,
  speedKmh: 0,
  near: 0,
  hint: null,
  collected: (() => {
    const v = load<unknown>(COLLECT_KEY, [])
    return Array.isArray(v) ? (v.filter((x) => typeof x === 'string') as AreaSlug[]) : []
  })(),
  award: null,
  justGot: null,
  set: (p) => {
    if ('sound' in p) save(SOUND_KEY, !!p.sound)
    set(p)
  },
  collect: (slug) => {
    const cur = get().collected
    if (cur.includes(slug)) return false
    const next = [...cur, slug]
    save(COLLECT_KEY, next)
    set({ collected: next, award: slug })
    return true
  },
}))

export const rideActive = () => useGame.getState().mode === 'drive'
