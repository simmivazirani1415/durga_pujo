import { useEffect, useRef, type RefObject } from 'react'

/**
 * Focus handling for the panel, the search overlay and the planner.
 * Dialogs can stack (the planner can open over the Explore panel); only the top one traps Tab and
 * handles Esc. When a dialog closes, focus goes back to whatever opened it.
 */

const stack: symbol[] = []

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest('[inert]') && !el.closest('[aria-hidden="true"]') && el.getClientRects().length > 0,
  )
}

interface DialogOpts {
  open: boolean
  container: RefObject<HTMLElement | null>
  initialFocus?: RefObject<HTMLElement | null>
  onEscape: () => void
}

export function useDialogFocus({ open, container, initialFocus, onEscape }: DialogOpts) {
  const escRef = useRef(onEscape)
  escRef.current = onEscape
  useEffect(() => {
    if (!open) return
    const id = Symbol('dialog')
    stack.push(id)
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    let tries = 0
    let raf = 0
    const focusFirst = () => {
      const root = container.current
      const target = initialFocus?.current ?? (root ? focusables(root)[0] : null)
      if (target) target.focus({ preventScroll: true })
      else if (tries++ < 20) raf = requestAnimationFrame(focusFirst)
    }
    raf = requestAnimationFrame(focusFirst)

    const isTop = () => stack[stack.length - 1] === id
    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        escRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const root = container.current
      if (!root) return
      const els = focusables(root)
      if (!els.length) {
        e.preventDefault()
        return
      }
      const first = els[0]
      const last = els[els.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !root.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }
    const onFocusIn = (e: FocusEvent) => {
      if (!isTop()) return
      const root = container.current
      const t = e.target as Node | null
      if (root && t && !root.contains(t)) {
        const els = focusables(root)
        ;(els[0] ?? root).focus({ preventScroll: true })
      }
    }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      cancelAnimationFrame(raf)
      const i = stack.indexOf(id)
      if (i >= 0) stack.splice(i, 1)
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('focusin', onFocusIn)
      if (opener && opener.isConnected) {
        const back = () => {
          const style = getComputedStyle(opener)
          if (style.visibility !== 'hidden' && style.display !== 'none') opener.focus({ preventScroll: true })
        }
        requestAnimationFrame(back)
      }
    }
  }, [open, container, initialFocus])
}

/** stop wheel events inside an element from reaching the journey's window listener */
export function useContainWheel(ref: RefObject<HTMLElement | null>, active = true) {
  useEffect(() => {
    const el = ref.current
    if (!el || !active) return
    const stop = (e: Event) => e.stopPropagation()
    el.addEventListener('wheel', stop, { passive: true })
    return () => el.removeEventListener('wheel', stop)
  }, [ref, active])
}
