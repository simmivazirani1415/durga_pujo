import logoUrl from './logo.png'
import { Sparkle } from './Ornament'

/**
 * The PujoBLR logo (original artwork, cut out and cleaned up) on a crisp cream card with a gold frame and
 * fine gold rules above and below, as in Simran's hero reference. No glow or blur behind it.
 */
export function Logo({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const rule = (
    <span aria-hidden="true" className="flex w-full items-center gap-1.5 text-gold-deep">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold" />
      <Sparkle className={compact ? 'h-1.5 w-1.5' : 'h-2 w-2'} />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold" />
    </span>
  )
  return (
    <span
      className={`relative inline-flex flex-col items-center justify-center rounded-[16px] bg-[#fbf3e2] ring-1 ring-gold ${
        compact ? 'gap-0.5 px-2.5 py-1' : 'gap-1 px-5 py-2.5'
      } ${className}`}
    >
      <span aria-hidden="true" className={`pointer-events-none absolute rounded-[12px] border border-gold/45 ${compact ? 'inset-[3px]' : 'inset-[4px]'}`} />
      {rule}
      <img src={logoUrl} alt="PujoBLR" className={`relative w-auto select-none ${compact ? 'h-[30px]' : 'h-[60px]'}`} draggable={false} />
      {rule}
    </span>
  )
}
