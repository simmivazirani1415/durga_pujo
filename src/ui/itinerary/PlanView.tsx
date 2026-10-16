import { useRef, useState } from 'react'
import { STATUS_LABEL } from '../../data/listings'
import { DURATION_RULES } from '../../data/plans'
import { TRANSPORT_LABEL } from '../../lib/directions'
import { clock, dateWithDay, durationLabel } from '../../lib/format'
import { legLabel, liveWarnings, missedStart, planText, stopWindow, type Plan, type PlanStop } from '../../lib/itinerary'
import { StatusBadge } from '../StatusBadge'
import { DirectionsLink, btn } from '../explore/controls'
import { IconAlert, IconCopy, IconDown, IconExternal, IconRemove, IconUp } from '../explore/icons'

interface Props {
  plan: Plan
  onMove: (i: number, dir: -1 | 1) => void
  onRemove: (i: number) => void
  onShorter: () => void
  /** shown while looking at the shorter version */
  onFull?: () => void
  onSwitchDate: (d: string) => void
  onEdit: () => void
  /** focus target after a plan is generated */
  headingRef: React.RefObject<HTMLHeadingElement>
}

function Leg({ text, approx }: { text: string; approx: boolean }) {
  return (
    <li className="relative flex items-center gap-3 py-2 pl-[22px] text-[14px] sm:text-[13.5px] text-ink-soft" aria-label={text === 'Same venue' ? 'Same venue, no travel' : `Travel, estimated: ${text}`}>
      <span aria-hidden="true" className="absolute bottom-0 left-[9px] top-0 border-l-2 border-dashed border-burgundy/25" />
      {text !== 'Same venue' && <span className="rounded-full bg-parchment px-2 py-0.5 text-[14px] sm:text-[11.5px] font-bold uppercase tracking-[0.1em] text-burgundy/70">Estimated</span>}
      <span>
        {text}
        {approx ? ', venue position approximate' : ''}
      </span>
    </li>
  )
}

export function PlanView({ plan, onMove, onRemove, onShorter, onFull, onSwitchDate, onEdit, headingRef }: Props) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'manual'>('idle')
  const textRef = useRef<HTMLTextAreaElement>(null)
  const warnings = [...plan.warnings, ...liveWarnings(plan)]
  const text = planText(plan)

  const copy = () => {
    const fallback = () => {
      setCopied('manual')
      requestAnimationFrame(() => {
        const ta = textRef.current
        if (!ta) return
        ta.focus()
        ta.select()
        try {
          if (document.execCommand('copy')) setCopied('ok')
        } catch {
          /* the text stays selected for a manual copy */
        }
      })
    }
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(
          () => setCopied('ok'),
          () => fallback(),
        )
      } else fallback()
    } catch {
      fallback()
    }
  }

  return (
    <section aria-labelledby="plan-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[14px] sm:text-[12px] font-bold uppercase tracking-[0.16em] text-burgundy/70">
            {plan.shorter ? 'Shorter version' : 'Your plan'} · {TRANSPORT_LABEL[plan.inputs.transport]}
          </p>
          <h3 ref={headingRef} tabIndex={-1} id="plan-heading" className="mt-1 font-display text-[30px] font-semibold leading-none text-burgundy focus:outline-none sm:text-[34px]">
            {dateWithDay(plan.inputs.date)}
          </h3>
          <p className="mt-1.5 text-[14.5px] text-ink-soft">
            From {plan.start.label}, about {clock(plan.startTime)} to {clock(Math.round(plan.end / 5) * 5)} ({durationLabel(plan.total)} with buffer)
          </p>
        </div>
        <button type="button" onClick={onEdit} className={btn.quiet}>
          Change inputs
        </button>
      </div>

      <p className="mt-4 rounded-2xl bg-parchment/70 px-4 py-3 text-[14px] leading-relaxed text-charcoal/85">
        Travel times are estimates from distance, not live traffic. This page cannot check routes, so allow extra time on festival evenings.
      </p>

      {warnings.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2" aria-label="Things to check">
          {warnings.map((w) => (
            <li key={w} className="flex items-start gap-2.5 rounded-2xl border border-[#C9962F]/45 bg-[#F7E6BF]/55 px-4 py-3 text-[14px] text-charcoal">
              <IconAlert size={18} className="mt-[1px] shrink-0 text-[#8A5A08]" />
              {w}
            </li>
          ))}
        </ul>
      )}

      {plan.stops.length === 0 ? (
        <div className="mt-5 rounded-[18px] border border-dashed border-burgundy/25 px-5 py-6 text-center">
          <p className="text-[15.5px] font-semibold text-burgundy">You removed every stop.</p>
          <button type="button" onClick={onEdit} className={`${btn.secondary} mt-3`}>
            Make a new plan
          </button>
        </div>
      ) : (
        <ol className="mt-5" aria-label="Stops in order">
          <li className="flex items-center gap-3 text-[14.5px] font-semibold text-charcoal">
            <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full border-2 border-burgundy/60 bg-ivory" />
            <span className="tabular text-ink-soft">{clock(plan.startTime)}</span> Leave {plan.start.label}
          </li>
          {plan.stops.map((s, i) => (
            <StopItem
              key={s.key}
              s={s}
              i={i}
              n={plan.stops.length}
              onMove={onMove}
              onRemove={onRemove}
              onSwitchDate={onSwitchDate}
              currentDate={plan.inputs.date}
            />
          ))}
          <Leg text={legLabel(plan.home, false)} approx={plan.home.approx} />
          <li className="flex items-center gap-3 text-[14.5px] font-semibold text-charcoal">
            <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full border-2 border-burgundy/60 bg-ivory" />
            <span>
              <span className="tabular text-ink-soft">{clock(Math.round(plan.homeArrive / 5) * 5)}</span> Back at {plan.start.label}
              <span className="block text-[14px] sm:text-[13.5px] font-medium text-ink-soft">
                Plus {plan.buffer} min buffer for traffic and queues: home by about {clock(Math.round(plan.end / 5) * 5)}.
              </span>
            </span>
          </li>
        </ol>
      )}

      {plan.notes.length > 0 && (
        <ul className="mt-5 flex flex-col gap-1.5 text-[14px] text-ink-soft">
          {plan.notes.map((n) => (
            <li key={n} className="flex gap-2">
              <span aria-hidden="true" className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-burgundy/40" />
              {n}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {plan.routeUrl && (
          <a href={plan.routeUrl} target="_blank" rel="noopener noreferrer" className={btn.primary}>
            Open the whole route in Google Maps
            <IconExternal size={16} />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
        <button type="button" onClick={copy} className={btn.secondary}>
          <IconCopy size={17} />
          {copied === 'ok' ? 'Copied' : 'Copy plan'}
        </button>
        {onFull ? (
          <button type="button" onClick={onFull} className={btn.secondary}>
            Back to the full plan
          </button>
        ) : null}
        {!plan.shorter || plan.inputs.hours > (DURATION_RULES[0]?.hours ?? 3) ? (
          <button type="button" onClick={onShorter} className={btn.secondary}>
            {plan.shorter ? 'Even shorter' : 'Shorter version'}
          </button>
        ) : null}
      </div>
      {plan.routeUrl && plan.routeSkipped > 0 && (
        <p className="mt-2 text-[14px] sm:text-[13.5px] text-ink-soft">
          {plan.routeSkipped === 1 ? 'One stop is' : `${plan.routeSkipped} stops are`} left out of the Google Maps route because the venue is not confirmed.
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {copied === 'ok' ? 'Plan copied.' : copied === 'manual' ? 'Select the text below and copy it.' : ''}
      </p>
      {copied === 'manual' && (
        <label className="mt-3 block">
          <span className="text-[14px] sm:text-[13.5px] font-semibold text-ink-soft">Your browser blocked copying. The plan is selected below; copy it from here.</span>
          <textarea ref={textRef} readOnly value={text} rows={8} className="mt-1.5 w-full rounded-2xl border border-burgundy/20 bg-[#FFFBF4] p-3 font-mono text-[14px] sm:text-[13px] text-charcoal" />
        </label>
      )}
    </section>
  )
}

function StopItem({
  s,
  i,
  n,
  onMove,
  onRemove,
  onSwitchDate,
  currentDate,
}: {
  s: PlanStop
  i: number
  n: number
  onMove: (i: number, dir: -1 | 1) => void
  onRemove: (i: number) => void
  onSwitchDate: (d: string) => void
  currentDate: string
}) {
  const l = s.listing
  const reserved = s.activities.filter((a) => a.reserved)
  const others = s.activities.filter((a) => !a.reserved && a.type !== 'event')
  const missed = missedStart(s)
  const where = l.venueName || l.address || l.subArea
  return (
    <>
      <Leg text={legLabel(s.leg, false)} approx={s.leg.approx && s.leg.minutes > 0} />
      <li className="relative pl-[22px]">
        <span aria-hidden="true" className="absolute bottom-0 left-[9px] top-0 border-l-2 border-burgundy/15" />
        <span aria-hidden="true" className="absolute left-0 top-[18px] grid h-5 w-5 place-items-center rounded-full bg-vermilion text-[14px] sm:text-[11px] font-bold text-ivory ring-4 ring-ivory">
          {i + 1}
        </span>
        <article className="ml-3 rounded-[18px] border border-parchment-deep/80 bg-[#FFFBF4] p-4 sm:p-5" aria-label={`Stop ${i + 1}: ${l.name}`}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="tabular text-[15px] font-bold text-burgundy">{stopWindow(s)}</span>
            {l.kind === 'food' ? (
              <span className="text-[14px] sm:text-[13px] font-semibold text-ink-soft">{l.foodType === 'mishti' ? 'Sweets' : 'Meal'}</span>
            ) : (
              <StatusBadge status={l.status} />
            )}
          </div>
          <h4 className="mt-2 font-display text-[22px] font-semibold leading-tight text-burgundy sm:text-[24px]">{l.name}</h4>
          {where && <p className="mt-0.5 text-[14px] text-ink-soft">{where}</p>}
          <p className="mt-2 text-[14.5px] leading-snug text-charcoal">
            <span className="font-semibold">Why this stop: </span>
            {s.why}
          </p>
          {reserved.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {reserved.map((a) => (
                <li
                  key={a.label}
                  className={`flex items-start gap-2.5 rounded-xl px-3 py-2 text-[14.5px] ${a.type === 'bhog' ? 'border border-gold/60 bg-gold/15' : 'bg-parchment/60'}`}
                >
                  <span className={`tabular w-[72px] shrink-0 font-bold ${a.time ? 'text-burgundy' : 'text-ink-soft'}`}>{a.time ?? 'Time TBC'}</span>
                  <span className="text-charcoal">
                    {a.type === 'bhog' ? 'Bhog' : a.label}
                    {a.note ? <span className="block text-[14px] sm:text-[13px] text-ink-soft">{a.type === 'bhog' ? `Access: ${a.note}` : a.note}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {others.length > 0 && (
            <p className="mt-2 text-[14px] sm:text-[13.5px] text-ink-soft">
              Also on this day: {others.map((a) => `${a.label}${a.time ? ` (${a.time})` : ''}`).join('; ')}
            </p>
          )}
          {l.kind === 'food' && s.activities[0] && <p className="mt-2 text-[14px] text-ink-soft">{s.activities[0].label}</p>}
          {missed && (
            <p className="mt-3 flex items-start gap-2 text-[14px] font-semibold text-vermilion">
              <IconAlert size={17} className="mt-[1px] shrink-0" />
              In this order you arrive after {missed.label} starts. Move this stop up, or remove one before it.
            </p>
          )}
          {s.spare >= 30 && !missed && (
            <p className="mt-2 text-[14px] sm:text-[13.5px] text-ink-soft">You arrive with about {durationLabel(s.spare)} to spare before it starts.</p>
          )}
          {(s.warnings.length > 0 || s.notes.length > 0) && (
            <ul className="mt-3 flex flex-col gap-1.5 text-[14px] sm:text-[13.5px]">
              {s.warnings.map((w) => (
                <li key={w} className="flex items-start gap-2 text-[#6E4A0B]">
                  <IconAlert size={16} className="mt-[1px] shrink-0" />
                  {w}
                </li>
              ))}
              {s.notes.map((w) => (
                <li key={w} className="pl-6 text-ink-soft">
                  {w}
                </li>
              ))}
            </ul>
          )}
          {s.altDate && s.altDate !== currentDate && (
            <button type="button" onClick={() => onSwitchDate(s.altDate!)} className={`${btn.quiet} mt-2 -ml-3`}>
              Plan for {dateWithDay(s.altDate)} instead <span aria-hidden="true">→</span>
            </button>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-parchment-deep/70 pt-3">
            <DirectionsLink listing={l} className="px-3.5" />
            {!l.directionsEnabled && l.kind !== 'food' && <span className="text-[14px] sm:text-[13px] text-ink-soft">No directions until the venue is confirmed</span>}
            <span className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => onMove(i, -1)}
                disabled={i === 0}
                className="grid h-11 w-11 place-items-center rounded-full text-burgundy hover:bg-parchment disabled:opacity-30"
                aria-label={`Move ${l.name} earlier`}
              >
                <IconUp size={19} />
              </button>
              <button
                type="button"
                onClick={() => onMove(i, 1)}
                disabled={i === n - 1}
                className="grid h-11 w-11 place-items-center rounded-full text-burgundy hover:bg-parchment disabled:opacity-30"
                aria-label={`Move ${l.name} later`}
              >
                <IconDown size={19} />
              </button>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="grid h-11 w-11 place-items-center rounded-full text-burgundy hover:bg-parchment"
                aria-label={`Remove ${l.name} from the plan`}
              >
                <IconRemove size={18} />
              </button>
            </span>
          </div>
          {l.kind !== 'food' && l.status !== 'published-2026' && (
            <p className="sr-only">Status: {STATUS_LABEL[l.status]}</p>
          )}
        </article>
      </li>
    </>
  )
}
