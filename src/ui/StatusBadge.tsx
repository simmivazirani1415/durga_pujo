import { STATUS_LABEL } from '../data/listings'
import type { Status } from '../data/types'

const STYLE: Record<Status, { wrap: string; dot: string }> = {
  'published-2026': { wrap: 'bg-forest/10 text-forest ring-forest/25', dot: 'bg-forest' },
  'awaiting-confirmation': { wrap: 'bg-[#F7E6BF] text-[#6E4A0B] ring-[#C9962F]/45', dot: 'bg-[#C9962F]' },
  'previous-year': { wrap: 'bg-burgundy/[0.07] text-burgundy/85 ring-burgundy/20', dot: 'bg-burgundy/45' },
  listed: { wrap: 'bg-parchment text-ink-soft ring-ink-soft/20', dot: 'bg-ink-mute' },
}

const FALLBACK = { wrap: 'bg-parchment text-ink-soft ring-ink-soft/20', dot: 'bg-ink-mute' }

/** Status of a listing in plain words, coloured by how certain it is. */
export function StatusBadge({ status, className = '' }: { status: Status; className?: string }) {
  const s = STYLE[status] ?? FALLBACK
  const label = STATUS_LABEL[status] ?? 'Not confirmed'
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[14px] sm:text-[12.5px] font-bold leading-none ring-1 ring-inset ${s.wrap} ${className}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
      {label}
    </span>
  )
}

export function statusTone(status: Status): string {
  switch (status) {
    case 'published-2026':
      return 'border-forest/25 bg-forest/[0.06]'
    case 'awaiting-confirmation':
      return 'border-[#C9962F]/40 bg-[#F7E6BF]/60'
    case 'previous-year':
      return 'border-burgundy/20 bg-burgundy/[0.05]'
    default:
      return 'border-ink-soft/15 bg-parchment/60'
  }
}
