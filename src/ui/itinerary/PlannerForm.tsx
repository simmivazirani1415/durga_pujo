import { useMemo, useState, type ReactNode } from 'react'
import { AREAS, AREA_BY_SLUG } from '../../data/areas'
import { DURATION_RULES } from '../../data/plans'
import { TRANSPORT_LABEL } from '../../lib/directions'
import { festivalDays } from '../../lib/format'
import { INTERESTS, INTEREST_LABEL, PACE_LABEL, TRANSPORTS, type PlanInputs, type StartPoint } from '../../lib/itinerary'
import { pincodeIndex, type Locality } from '../../lib/places'
import { Chip } from '../explore/controls'

function Field({ legend, hint, children, id }: { legend: string; hint?: string; children: ReactNode; id: string }) {
  return (
    <fieldset className="min-w-0" aria-describedby={hint ? `${id}-hint` : undefined}>
      <legend className="text-[15px] font-bold text-charcoal">{legend}</legend>
      {hint && (
        <p id={`${id}-hint`} className="mt-0.5 text-[14px] sm:text-[13.5px] text-ink-soft">
          {hint}
        </p>
      )}
      <div className="mt-2.5">{children}</div>
    </fieldset>
  )
}

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl border border-burgundy/15 bg-[#FFFBF4] px-4 py-3 hover:border-burgundy/35">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#651B28]" />
      <span>
        <span className="block text-[15px] font-semibold text-charcoal">{label}</span>
        <span className="block text-[14px] sm:text-[13.5px] text-ink-soft">{hint}</span>
      </span>
    </label>
  )
}

interface Props {
  inputs: PlanInputs
  setInputs: (i: PlanInputs) => void
  picksCount: number
}

export function PlannerForm({ inputs, setInputs, picksCount }: Props) {
  const days = useMemo(() => festivalDays(), [])
  const set = (p: Partial<PlanInputs>) => setInputs({ ...inputs, ...p })
  const [startMode, setStartMode] = useState<'area' | 'pincode'>(inputs.start?.kind === 'pincode' ? 'pincode' : 'area')
  const [pin, setPin] = useState(inputs.start?.kind === 'pincode' ? inputs.start.code : '')

  const pinMatches: Locality[] = useMemo(() => {
    const code = pin.replace(/\D/g, '')
    if (code.length !== 6) return []
    return pincodeIndex().get(code) ?? []
  }, [pin])
  const pinDigits = pin.replace(/\D/g, '')

  const startValue = inputs.start?.kind === 'area' ? `${inputs.start.slug}|${inputs.start.subArea ?? ''}` : ''

  return (
    <div className="flex flex-col gap-7">
      <Field legend="Date" id="pl-date">
        <div role="radiogroup" aria-label="Date" className="flex flex-wrap gap-2">
          {days.map((d) => (
            <Chip key={d.date} mode="radio" size="sm" on={inputs.date === d.date} onClick={() => set({ date: d.date })} sub={d.name}>
              {d.label} Oct
            </Chip>
          ))}
        </div>
      </Field>

      <Field legend="Starting from" id="pl-start" hint="We plan a loop that brings you back here.">
        <div role="radiogroup" aria-label="Choose by" className="mb-3 inline-flex rounded-full border border-burgundy/20 bg-[#FFFBF4] p-0.5">
          {(['area', 'pincode'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={startMode === m}
              onClick={() => setStartMode(m)}
              className={`min-h-[42px] rounded-full px-4 text-[14px] font-bold ${startMode === m ? 'bg-burgundy text-ivory' : 'text-burgundy hover:bg-parchment/70'}`}
            >
              {m === 'area' ? 'Area' : 'Pincode'}
            </button>
          ))}
        </div>
        {startMode === 'area' ? (
          <label className="block">
            <span className="sr-only">Starting area</span>
            <select
              value={startValue}
              onChange={(e) => {
                const [slug, sub] = e.target.value.split('|')
                if (!slug) return set({ start: null })
                set({ start: { kind: 'area', slug: slug as StartPoint['slug'], subArea: sub || undefined } })
              }}
              className="h-12 w-full rounded-2xl border border-burgundy/25 bg-[#FFFBF4] px-4 text-[15.5px] font-semibold text-charcoal focus:border-burgundy/60 focus:outline-none focus-visible:outline-2 focus-visible:outline-gold"
            >
              <option value="">Choose an area</option>
              {AREAS.map((a) => (
                <optgroup key={a.slug} label={a.heading}>
                  <option value={`${a.slug}|`}>{a.heading}</option>
                  {a.subAreas
                    .filter((s) => s.name !== a.heading && s.name !== a.shortName)
                    .map((s) => (
                      <option key={s.name} value={`${a.slug}|${s.name}`}>
                        {s.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
        ) : (
          <div>
            <label className="block">
              <span className="sr-only">Pincode</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                value={pin}
                placeholder="e.g. 560102"
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setPin(v)
                  const locs = v.length === 6 ? pincodeIndex().get(v)?.filter((l) => l.slug) ?? [] : []
                  if (locs.length === 1) set({ start: { kind: 'pincode', code: v, name: locs[0].name, slug: locs[0].slug!, subArea: locs[0].subArea } })
                  else if (inputs.start?.kind === 'pincode') set({ start: null })
                }}
                className="h-12 w-full max-w-[220px] rounded-2xl border border-burgundy/25 bg-[#FFFBF4] px-4 text-[16px] font-semibold tracking-[0.08em] text-charcoal placeholder:font-medium placeholder:tracking-normal placeholder:text-ink-mute focus:border-burgundy/60 focus:outline-none focus-visible:outline-2 focus-visible:outline-gold"
              />
            </label>
            {pinDigits.length === 6 && pinMatches.length === 0 && (
              <p className="mt-2 text-[14px] text-ink-soft">We do not have {pinDigits} on our route yet. Choose the nearest area instead.</p>
            )}
            {pinMatches.length > 1 && (
              <div className="mt-3">
                <p className="text-[14px] text-ink-soft">{pinDigits} covers several localities. Which one?</p>
                <div role="radiogroup" aria-label="Locality" className="mt-2 flex flex-wrap gap-2">
                  {pinMatches.map((l) => (
                    <Chip
                      key={l.name}
                      mode="radio"
                      size="sm"
                      disabled={!l.slug}
                      on={inputs.start?.kind === 'pincode' && inputs.start.name === l.name}
                      onClick={() => l.slug && set({ start: { kind: 'pincode', code: pinDigits, name: l.name, slug: l.slug, subArea: l.subArea } })}
                      sub={l.slug ? AREA_BY_SLUG[l.slug].heading : 'Not on our route'}
                    >
                      {l.name}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
            {pinMatches.length === 1 && pinMatches[0].slug && (
              <p className="mt-2 text-[14px] text-forest">
                {pinMatches[0].name}, {AREA_BY_SLUG[pinMatches[0].slug].heading}
              </p>
            )}
          </div>
        )}
      </Field>

      <Field legend="Time available" id="pl-hours">
        <div role="radiogroup" aria-label="Time available" className="flex flex-wrap gap-2">
          {DURATION_RULES.map((r) => (
            <Chip key={r.hours} mode="radio" size="sm" on={inputs.hours === r.hours} onClick={() => set({ hours: r.hours })}>
              {r.hours === 10 ? 'Full day' : `${r.hours} h`}
            </Chip>
          ))}
        </div>
        <p className="mt-2 text-[14px] sm:text-[13.5px] text-ink-soft">{DURATION_RULES.find((r) => r.hours === inputs.hours)?.note}</p>
      </Field>

      <Field legend="Interests" id="pl-int" hint="Pick one or more.">
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => {
            const on = inputs.interests.includes(i)
            return (
              <Chip
                key={i}
                size="sm"
                on={on}
                onClick={() => set({ interests: on ? inputs.interests.filter((x) => x !== i) : [...inputs.interests, i] })}
              >
                {INTEREST_LABEL[i]}
              </Chip>
            )
          })}
        </div>
      </Field>

      <div className="grid gap-7 sm:grid-cols-2">
        <Field legend="Getting around" id="pl-tr">
          <div role="radiogroup" aria-label="Getting around" className="flex flex-wrap gap-2">
            {TRANSPORTS.map((t) => (
              <Chip key={t} mode="radio" size="sm" on={inputs.transport === t} onClick={() => set({ transport: t })}>
                {TRANSPORT_LABEL[t]}
              </Chip>
            ))}
          </div>
        </Field>
        <Field legend="Pace" id="pl-pace">
          <div role="radiogroup" aria-label="Pace" className="flex flex-wrap gap-2">
            {(['relaxed', 'hopping'] as const).map((p) => (
              <Chip key={p} mode="radio" size="sm" on={inputs.pace === p} onClick={() => set({ pace: p })}>
                {PACE_LABEL[p]}
              </Chip>
            ))}
          </div>
        </Field>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <Toggle
          on={inputs.shortTransfers}
          onChange={(v) => set({ shortTransfers: v })}
          label="Prefer shorter transfers"
          hint="With kids or older adults"
        />
        <Toggle on={inputs.vegetarian} onChange={(v) => set({ vegetarian: v })} label="Vegetarian" hint="We will remind you to check veg options" />
      </div>

      {picksCount > 0 && (
        <p className="rounded-2xl bg-forest/[0.07] px-4 py-3 text-[14.5px] text-forest">
          Your {picksCount === 1 ? 'saved stop is' : `${picksCount} saved stops are`} included as must-visits.
        </p>
      )}
    </div>
  )
}
