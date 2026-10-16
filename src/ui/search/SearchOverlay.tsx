import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'framer-motion'
import { useMemo, useRef } from 'react'
import { useDialogFocus } from '../../lib/a11y'
import { useJourney } from '../../store/journey'
import { IconClose } from '../explore/icons'
import { SearchBox } from './SearchBox'

/** Full search used outside the hero, e.g. the finale's "Explore another area". */
export function SearchOverlay() {
  const open = useJourney((s) => s.searchOpen)
  return <AnimatePresence>{open ? <Overlay key="search" /> : null}</AnimatePresence>
}

function Overlay() {
  const reduce = useReducedMotion()
  const present = useIsPresent()
  const setSearchOpen = useJourney((s) => s.setSearchOpen)
  const ref = useRef<HTMLDivElement>(null)
  const close = () => setSearchOpen(false)
  // the search field is rendered by SearchBox; read it lazily when focus is placed
  const field = useMemo(() => ({ get current() { return document.getElementById('search-overlay') } }), [])
  useDialogFocus({ open: present, container: ref, initialFocus: field, onEscape: close })
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-charcoal/40 sm:items-start sm:pt-[9vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0.1 : 0.2 }}
      onClick={close}
      style={{ pointerEvents: present ? undefined : 'none' }}
    >
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-overlay-title"
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-full w-full flex-col overflow-hidden bg-ivory shadow-panel sm:max-h-[78vh] sm:max-w-[640px] sm:rounded-[26px]"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: reduce ? 0.1 : 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{
          paddingTop: 'max(18px, env(safe-area-inset-top, 0px))',
          paddingBottom: 'max(18px, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div aria-hidden="true" className="absolute inset-x-0 top-0">
          <div className="h-[3px] bg-vermilion" />
          <div className="h-[2px] bg-ivory" />
          <div className="h-px bg-vermilion/70" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 pb-3 pt-1">
            <h2 id="search-overlay-title" className="font-display text-[30px] font-semibold leading-none text-burgundy sm:text-[34px]">
              Explore another area
            </h2>
            <button
              type="button"
              onClick={close}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-burgundy/20 bg-[#FFFBF4] text-burgundy hover:border-burgundy/50"
              aria-label="Close search"
            >
              <IconClose size={18} />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <SearchBox variant="overlay" autoFocus />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
