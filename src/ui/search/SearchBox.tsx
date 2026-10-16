import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useContainWheel } from '../../lib/a11y'
import { GROUP_LABEL, allAreaResults, goToTarget, noResultsMessage, search, type SearchGroup, type SearchResult } from '../../lib/search'
import { StatusBadge } from '../StatusBadge'
import { IconClose, IconSearch } from '../explore/icons'

interface Props {
  variant: 'hero' | 'overlay'
  /** overlay: focus the field on mount */
  autoFocus?: boolean
}

const PLACEHOLDER = 'Search by area, pincode or pandal name...'

/**
 * Combobox over areas, listings, pincodes and landmarks (ARIA 1.2 pattern: the input keeps focus,
 * arrow keys move the active option, Enter chooses, Esc clears or closes).
 */
export function SearchBox({ variant, autoFocus }: Props) {
  const uid = useId().replace(/:/g, '')
  const listId = `search-${variant}-${uid}-list`
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(variant === 'overlay')
  const [active, setActive] = useState(-1)
  const [busy, setBusy] = useState(false)
  const hero = variant === 'hero'
  useContainWheel(listRef, open)

  const groups: SearchGroup[] = useMemo(() => {
    if (q.trim().length >= 2) return search(q)
    if (variant === 'overlay') return [allAreaResults()]
    return []
  }, [q, variant])
  const flat: SearchResult[] = useMemo(() => groups.flatMap((g) => g.results), [groups])
  const noMatch = q.trim().length >= 2 && flat.length === 0
  const shortQuery = q.trim().length === 1
  const showList = open && (flat.length > 0 || noMatch || shortQuery)

  useEffect(() => setActive(flat.length && q.trim().length >= 2 ? firstSelectable(flat) : -1), [flat, q])

  useEffect(() => {
    if (autoFocus) requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
  }, [autoFocus])

  // close the hero list when focus or a click leaves the box
  useEffect(() => {
    if (!hero || !open) return
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [hero, open])

  useEffect(() => {
    if (active < 0) return
    const el = document.getElementById(optId(active))
    el?.scrollIntoView({ block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const optId = (i: number) => `${listId}-opt-${i}`

  const choose = async (r: SearchResult | undefined) => {
    if (!r?.target || busy) return
    setBusy(true)
    setOpen(false)
    inputRef.current?.blur()
    try {
      await goToTarget(r.target)
    } finally {
      setBusy(false)
      if (hero) setQ('')
    }
  }

  const move = (dir: 1 | -1) => {
    if (!flat.length) return
    let i = active
    for (let n = 0; n < flat.length; n++) {
      i = (i + dir + flat.length) % flat.length
      if (flat[i].target) break
    }
    setActive(i)
  }

  const onKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!open) setOpen(true)
        move(1)
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!open) setOpen(true)
        move(-1)
        break
      case 'Home':
      case 'End':
        if (open && flat.length && e.ctrlKey) {
          e.preventDefault()
          setActive(e.key === 'Home' ? firstSelectable(flat) : lastSelectable(flat))
        }
        break
      case 'Enter':
        if (open && active >= 0) {
          e.preventDefault()
          void choose(flat[active])
        } else if (flat.length) {
          e.preventDefault()
          void choose(flat[firstSelectable(flat)])
        }
        break
      case 'Escape':
        if (hero) {
          e.preventDefault()
          if (open && q) setOpen(false)
          else setQ('')
        }
        // in the overlay, Esc is handled by the dialog and closes it
        break
      case 'Tab':
        if (hero) setOpen(false)
        break
    }
  }

  let idx = -1
  const activeId = showList && active >= 0 ? optId(active) : undefined

  return (
    <div ref={wrapRef} className={hero ? 'relative w-full text-left' : 'relative flex min-h-0 w-full flex-1 flex-col'}>
      <div
        className={
          hero
            ? 'relative flex items-center rounded-full border border-burgundy/15 bg-ivory shadow-[0_18px_44px_-22px_rgba(74,18,29,0.55),0_2px_6px_rgba(74,18,29,0.08)]'
            : 'relative flex items-center rounded-2xl border border-burgundy/25 bg-[#FFFBF4]'
        }
      >
        <IconSearch size={hero ? 21 : 20} className={`pointer-events-none absolute text-burgundy/70 ${hero ? 'left-5' : 'left-4'}`} />
        <input
          ref={inputRef}
          id={`search-${variant}`}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-label="Search by area, pincode or pandal name"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          value={q}
          placeholder={typeof window !== 'undefined' && window.innerWidth < 440 ? 'Area, pincode or pandal name...' : PLACEHOLDER}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          className={`w-full min-w-0 bg-transparent font-medium text-burgundy placeholder:font-medium placeholder:text-burgundy/50 focus:outline-none ${
            hero ? 'h-[60px] rounded-full pl-[54px] pr-14 text-[16px] sm:h-[64px] sm:text-[17px]' : 'h-14 rounded-2xl pl-12 pr-12 text-[16.5px]'
          }`}
          style={{ outlineOffset: 3 }}
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ('')
              inputRef.current?.focus()
            }}
            className={`absolute grid h-11 w-11 place-items-center rounded-full text-burgundy/70 hover:bg-parchment ${hero ? 'right-2.5' : 'right-1.5'}`}
            aria-label="Clear search"
          >
            <IconClose size={18} />
          </button>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {q.trim().length >= 2 ? (noMatch ? noResultsMessage(q) : `${flat.length} results`) : ''}
      </p>

      <div
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label="Search results"
        hidden={!showList}
        className={
          hero
            ? 'thin-scroll absolute inset-x-0 top-[calc(100%+10px)] z-50 max-h-[min(440px,56vh)] overflow-y-auto rounded-[22px] border border-burgundy/10 bg-ivory p-2 shadow-panel'
            : 'thin-scroll mt-3 min-h-0 flex-1 overflow-y-auto'
        }
        style={{ overscrollBehavior: 'contain' }}
        onMouseDown={(e) => e.preventDefault()}
      >
        {shortQuery && <p className="px-3 py-3 text-[14.5px] text-ink-soft">Keep typing: an area, a pincode or a pandal name.</p>}
        {noMatch && (
          <div className="px-3 py-3" role="presentation">
            <p className="text-[15px] font-semibold text-burgundy">{noResultsMessage(q)}</p>
          </div>
        )}
        {!shortQuery &&
          groups.map((g) => (
            <div key={g.group + g.label} role="group" aria-labelledby={`${listId}-${g.group}`} className="py-1">
              <div id={`${listId}-${g.group}`} role="presentation" className="px-3 pb-1 pt-2 text-[14px] sm:text-[12px] font-bold uppercase tracking-[0.14em] text-burgundy/70">
                {g.label || GROUP_LABEL[g.group]}
              </div>
              {g.notes.map((n) => (
                <div key={n} role="presentation" className="px-3 pb-1.5 text-[14px] sm:text-[13.5px] text-ink-soft">
                  {n}
                </div>
              ))}
              {g.results.map((r) => {
                idx++
                const i = idx
                const on = i === active
                const disabled = !r.target
                return (
                  <div
                    key={r.key}
                    id={optId(i)}
                    role="option"
                    aria-selected={on}
                    aria-disabled={disabled || undefined}
                    onMouseEnter={() => !disabled && setActive(i)}
                    onClick={() => void choose(r)}
                    className={`flex min-h-[48px] items-center justify-between gap-3 rounded-xl px-3 py-2 ${
                      disabled ? 'cursor-default opacity-60' : 'cursor-pointer'
                    } ${on ? 'bg-parchment' : ''}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[15.5px] font-semibold text-burgundy">{r.label}</span>
                      {r.detail && <span className="block truncate text-[14px] sm:text-[13.5px] text-ink-soft">{r.detail}</span>}
                    </span>
                    {r.status && r.status !== 'listed' ? (
                      <span className="hidden shrink-0 sm:inline-flex">
                        <StatusBadge status={r.status} />
                      </span>
                    ) : on && !disabled ? (
                      <span aria-hidden="true" className="shrink-0 text-burgundy/60">
                        →
                      </span>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ))}
      </div>
    </div>
  )
}

function firstSelectable(flat: SearchResult[]) {
  const i = flat.findIndex((r) => r.target)
  return i
}
function lastSelectable(flat: SearchResult[]) {
  for (let i = flat.length - 1; i >= 0; i--) if (flat[i].target) return i
  return -1
}
