import { create } from 'zustand'
import type { ListingKind } from '../data/types'

export interface PanelState {
  open: boolean
  /** 'area' = the current stop; 'all' = every listing across Bengaluru */
  scope: 'area' | 'all'
  tab: ListingKind
  subArea: string | null
  detailId: string | null
}

interface JourneyState {
  /** index into STOPS: 0 = hero, 1..10 = areas, 11 = finale */
  index: number
  /** true while a drive / transition is playing */
  transitioning: boolean
  /** name shown on the green road sign during a street drive */
  transitLabel: string
  panel: PanelState
  plannerOpen: boolean
  /** search overlay used outside the hero (finale, "Explore another area") */
  searchOpen: boolean
  /** listing ids the visitor added with "+ Itinerary" */
  picks: string[]
  /** set briefly after arriving via search so the arrival card can highlight it */
  highlight: string | null
  setIndex: (i: number) => void
  setTransitioning: (v: boolean) => void
  setTransitLabel: (s: string) => void
  openPanel: (opts?: Partial<Omit<PanelState, 'open'>>) => void
  closePanel: () => void
  setPanel: (p: Partial<PanelState>) => void
  setPlannerOpen: (v: boolean) => void
  setSearchOpen: (v: boolean) => void
  togglePick: (id: string) => void
  setPicks: (ids: string[]) => void
  setHighlight: (s: string | null) => void
}

const PICKS_KEY = 'pujoblr.picks.v1'
function loadPicks(): string[] {
  try {
    const raw = localStorage.getItem(PICKS_KEY)
    const v = raw ? JSON.parse(raw) : []
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}
function savePicks(ids: string[]) {
  try {
    localStorage.setItem(PICKS_KEY, JSON.stringify(ids))
  } catch {
    /* storage unavailable: picks live for this visit only */
  }
}

export const useJourney = create<JourneyState>((set, get) => ({
  index: 0,
  transitioning: false,
  transitLabel: '',
  panel: { open: false, scope: 'area', tab: 'pandal', subArea: null, detailId: null },
  plannerOpen: false,
  searchOpen: false,
  picks: loadPicks(),
  highlight: null,
  setIndex: (index) => set({ index }),
  setTransitioning: (transitioning) => set({ transitioning }),
  setTransitLabel: (transitLabel) => set({ transitLabel }),
  openPanel: (opts) =>
    set((s) => ({
      panel: {
        open: true,
        scope: opts?.scope ?? 'area',
        tab: opts?.tab ?? s.panel.tab,
        subArea: opts?.subArea !== undefined ? opts.subArea : null,
        detailId: opts?.detailId !== undefined ? opts.detailId : null,
      },
    })),
  closePanel: () => set((s) => ({ panel: { ...s.panel, open: false, detailId: null } })),
  setPanel: (p) => set((s) => ({ panel: { ...s.panel, ...p } })),
  setPlannerOpen: (plannerOpen) => set({ plannerOpen }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  togglePick: (id) => {
    const cur = get().picks
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    savePicks(next)
    set({ picks: next })
  },
  setPicks: (ids) => {
    savePicks(ids)
    set({ picks: ids })
  },
  setHighlight: (highlight) => set({ highlight }),
}))

/** true when an overlay owns scrolling, so gestures must not move the auto */
export function overlayOpen(): boolean {
  const s = useJourney.getState()
  return s.panel.open || s.plannerOpen || s.searchOpen
}
