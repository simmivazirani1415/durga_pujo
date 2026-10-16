import type { AreaSlug } from '../data/types'

/**
 * The nine Pujo collectibles, one per area: original line-and-fill drawings in the style Simran shared (round red or
 * ivory medallions with a dotted border on festive yellow). Drawn from scratch; nothing is traced from the reference.
 */
export interface Collectible {
  slug: AreaSlug
  id: string
  name: string
  body: 'red' | 'ivory'
  Icon: () => JSX.Element
}

const RED = '#c8222c'
const RED_D = '#8e1520'
const IVORY = '#fbf3e2'
const YEL = '#f2c230'
const YEL_D = '#c9962f'
const INK = '#3a1410'
const LEAF = '#3f7a3a'
const CLAY = '#a4442a'

function Radio() {
  return (
    <g>
      <path d="M38 36 Q50 24 62 36" fill="none" stroke={IVORY} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M61 33 L70 22" stroke={IVORY} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="70.5" cy="21.5" r="1.8" fill={YEL} />
      <rect x="27" y="36" width="46" height="31" rx="6" fill={IVORY} stroke={INK} strokeWidth="1.6" />
      <rect x="27" y="61" width="46" height="6" rx="3" fill={YEL} stroke={INK} strokeWidth="1.2" />
      <circle cx="41" cy="50" r="9" fill={YEL} stroke={INK} strokeWidth="1.4" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${34 + i * 0.2} ${45 + i * 3.4} H${48 - i * 0.2}`} stroke={INK} strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
      ))}
      <rect x="54" y="42" width="14" height="7" rx="1.5" fill="#fff8ea" stroke={INK} strokeWidth="1.1" />
      <path d="M57 42 V45 M60 42 V44 M63 42 V45 M66 42 V44" stroke={INK} strokeWidth="0.8" />
      <path d="M61 42.5 V48.5" stroke={RED} strokeWidth="1.2" />
      <circle cx="57.5" cy="55" r="3.2" fill={RED} stroke={INK} strokeWidth="1.1" />
      <circle cx="65" cy="55" r="3.2" fill={RED} stroke={INK} strokeWidth="1.1" />
      <path d="M31 70 V73 M69 70 V73" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}

function Durga() {
  return (
    <g>
      {/* halo and crown */}
      <circle cx="50" cy="50" r="27" fill={YEL} opacity="0.55" />
      <path d="M31 40 Q33 24 50 18 Q67 24 69 40 Z" fill={RED} stroke={INK} strokeWidth="1.3" />
      <path d="M36 38 Q50 28 64 38" fill="none" stroke={YEL} strokeWidth="2" />
      {[38, 44, 50, 56, 62].map((x, i) => (
        <circle key={x} cx={x} cy={i % 2 ? 31 : 33} r="1.4" fill={YEL} />
      ))}
      <path d="M50 18 V13" stroke={YEL_D} strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="12" r="2" fill={YEL} stroke={INK} strokeWidth="0.8" />
      {/* hair */}
      <path d="M30 42 Q27 62 34 76 L66 76 Q73 62 70 42 Z" fill={INK} />
      {/* face */}
      <path d="M35 41 Q35 70 50 76 Q65 70 65 41 Z" fill="#f2b56c" stroke={INK} strokeWidth="1.2" />
      {/* brows, eyes, third eye */}
      <path d="M37.5 47 Q43 43.5 48 46.5 M52 46.5 Q57 43.5 62.5 47" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M37 52 Q43 47.5 48.5 52 Q43 54.5 37 52 Z" fill="#fff" stroke={INK} strokeWidth="1.3" />
      <path d="M51.5 52 Q57 47.5 63 52 Q57 54.5 51.5 52 Z" fill="#fff" stroke={INK} strokeWidth="1.3" />
      <circle cx="43.6" cy="51.6" r="1.9" fill={INK} />
      <circle cx="56.4" cy="51.6" r="1.9" fill={INK} />
      <path d="M50 37.5 Q52.2 41 50 44.5 Q47.8 41 50 37.5 Z" fill="#fff" stroke={RED} strokeWidth="1.1" />
      <circle cx="50" cy="41" r="0.9" fill={INK} />
      {/* nose, nose ring, lips */}
      <path d="M50 53 Q49 59 47.5 61 Q50 62.4 52.5 61" fill="none" stroke={INK} strokeWidth="1" strokeLinecap="round" />
      <circle cx="53.6" cy="61.5" r="2.1" fill="none" stroke={YEL_D} strokeWidth="1" />
      <path d="M45 66 Q50 64 55 66 Q50 69.5 45 66 Z" fill={RED} />
      {/* earrings */}
      <circle cx="34.6" cy="58" r="2.2" fill={YEL} stroke={INK} strokeWidth="0.8" />
      <circle cx="65.4" cy="58" r="2.2" fill={YEL} stroke={INK} strokeWidth="0.8" />
    </g>
  )
}

function Ghot() {
  return (
    <g>
      {/* mango leaves and coconut */}
      {[-2, -1, 0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M50 36 Q${50 + i * 7} ${30 - Math.abs(i) * 1.5} ${50 + i * 11} ${33 + Math.abs(i) * 3} Q${50 + i * 6} ${34 + Math.abs(i)} 50 36 Z`}
          fill={LEAF}
          stroke={INK}
          strokeWidth="0.8"
        />
      ))}
      <ellipse cx="50" cy="27" rx="7.5" ry="8.5" fill="#8a5a2b" stroke={INK} strokeWidth="1.2" />
      <path d="M46 22 Q50 19 54 22" fill="none" stroke="#c49a66" strokeWidth="1.2" />
      {/* the pot */}
      <path d="M41 37 H59 L57 42 Q72 47 72 60 Q72 75 50 76 Q28 75 28 60 Q28 47 43 42 Z" fill={YEL} stroke={INK} strokeWidth="1.5" />
      <path d="M40 37 H60" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M31 55 Q50 61 69 55" fill="none" stroke={RED} strokeWidth="2.4" />
      <path d="M30 61 Q50 67 70 61" fill="none" stroke={RED} strokeWidth="1.2" />
      {[37, 44, 50, 56, 63].map((x) => (
        <circle key={x} cx={x} cy={58.6 + Math.abs(x - 50) * -0.06} r="1.2" fill={IVORY} />
      ))}
      <path d="M38 47 Q36 52 37 56" fill="none" stroke="#fff6d0" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      {/* water drops */}
      <path d="M24 66 Q26 70 24 72 Q22 70 24 66 Z M76 66 Q78 70 76 72 Q74 70 76 66 Z" fill={IVORY} />
    </g>
  )
}

function Dhunuchi() {
  return (
    <g>
      {/* smoke */}
      <path d="M46 32 Q40 26 46 20 Q52 14 47 8" fill="none" stroke="#7d6a62" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
      <path d="M55 33 Q61 27 56 21 Q51 15 57 10" fill="none" stroke="#9a8780" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      {/* flames */}
      <path d="M50 22 Q57 31 55 38 Q50 41 45 38 Q43 31 50 22 Z" fill={YEL} stroke={RED} strokeWidth="1.2" />
      <path d="M42 30 Q46 35 45 39 L40 39 Q38 35 42 30 Z M58 30 Q62 35 60 39 L55 39 Q54 35 58 30 Z" fill="#f08a2c" />
      <path d="M50 29 Q53 34 52 38 Q50 39 48 38 Q47 34 50 29 Z" fill="#fff3c4" />
      {/* clay bowl, stem and foot */}
      <path d="M29 39 H71 Q69 53 50 56 Q31 53 29 39 Z" fill={CLAY} stroke={INK} strokeWidth="1.5" />
      <path d="M31 43 Q50 47 69 43" fill="none" stroke={YEL} strokeWidth="1.6" />
      {[36, 43, 50, 57, 64].map((x) => (
        <circle key={x} cx={x} cy="49" r="1.1" fill={IVORY} />
      ))}
      <path d="M45 55 H55 L53 67 H47 Z" fill={CLAY} stroke={INK} strokeWidth="1.3" />
      <path d="M38 67 H62 Q63 72 58 73 H42 Q37 72 38 67 Z" fill={CLAY} stroke={INK} strokeWidth="1.4" />
      {/* handle */}
      <path d="M71 41 Q80 44 82 52" fill="none" stroke={CLAY} strokeWidth="3.4" strokeLinecap="round" />
    </g>
  )
}

function Dhak() {
  return (
    <g>
      {/* kash plume on top */}
      {[-3, -2, -1, 0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M50 33 Q${50 + i * 4} ${22 - (3 - Math.abs(i)) * 1.6} ${50 + i * 6.5} ${16 + Math.abs(i) * 2.4}`}
          fill="none"
          stroke={IVORY}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      ))}
      {/* drum */}
      <ellipse cx="50" cy="38" rx="21" ry="5.5" fill={IVORY} stroke={INK} strokeWidth="1.4" />
      <path d="M29 38 Q26 55 30 68 Q50 75 70 68 Q74 55 71 38 Q50 44 29 38 Z" fill={YEL} stroke={INK} strokeWidth="1.5" />
      <path d="M30 68 Q50 75 70 68 Q50 81 30 68 Z" fill={IVORY} stroke={INK} strokeWidth="1.2" />
      <path d="M29 38 L37 70 L45 41 L53 73 L60 41 L66 71 L71 38" fill="none" stroke={RED_D} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M28 52 Q50 59 72 52" fill="none" stroke={RED} strokeWidth="3.2" />
      {/* sticks */}
      <path d="M20 26 L35 41 M80 26 L66 41" stroke="#7a4a24" strokeWidth="2.6" strokeLinecap="round" />
    </g>
  )
}

function Shankh() {
  return (
    <g transform="rotate(-28 50 52)">
      {/* the conch upright: a stacked spire on top, the body swelling, the lip flaring right, the canal tapering down */}
      <path
        d="M50 15 L45 23 Q37 29 36 38 Q31 55 42 69 Q47 76 50 85 Q54 76 58 72 Q71 62 69 45 Q67 32 56 24 Z"
        fill="#fffaf0"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* whorls of the spire */}
      <path d="M46.5 21 Q50 23 53.5 21 M44 25.5 Q50 29 57 25.5 M39.5 31.5 Q50 36.5 61.5 31" fill="none" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
      {/* the opening, warm pink inside */}
      <path d="M57 35 Q71 43 67 59 Q63 68 54 71 Q61 55 57 35 Z" fill="#f2b8a6" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M60 44 Q64 52 60 62" fill="none" stroke="#d07a66" strokeWidth="1.1" strokeLinecap="round" />
      {/* ridges down the body */}
      <path d="M42 40 Q43 55 48 70 M48 38 Q49 54 51 72" fill="none" stroke={YEL_D} strokeWidth="1.3" strokeLinecap="round" />
      {/* a gold band with red dots, as on a puja shankh */}
      <path d="M37.5 37 Q47 42 57.5 36.5" fill="none" stroke={YEL} strokeWidth="3.4" strokeLinecap="round" />
      {[42, 47.5, 53].map((x) => (
        <circle key={x} cx={x} cy={39.3 + (x === 47.5 ? 0.6 : 0)} r="1.15" fill={RED} />
      ))}
    </g>
  )
}

function Lotus() {
  return (
    <g>
      <path d="M22 66 Q50 58 78 66 Q50 76 22 66 Z" fill={LEAF} stroke={INK} strokeWidth="1.1" />
      <path d="M50 66 Q30 64 24 46 Q40 48 50 66 Z" fill="#f6b8c0" stroke={RED_D} strokeWidth="1.2" />
      <path d="M50 66 Q70 64 76 46 Q60 48 50 66 Z" fill="#f6b8c0" stroke={RED_D} strokeWidth="1.2" />
      <path d="M50 66 Q34 56 36 34 Q48 44 50 66 Z" fill="#fde0e3" stroke={RED_D} strokeWidth="1.2" />
      <path d="M50 66 Q66 56 64 34 Q52 44 50 66 Z" fill="#fde0e3" stroke={RED_D} strokeWidth="1.2" />
      <path d="M50 66 Q41 48 50 24 Q59 48 50 66 Z" fill={IVORY} stroke={RED_D} strokeWidth="1.3" />
      <path d="M50 30 V60 M39 40 Q45 52 49 63 M61 40 Q55 52 51 63" fill="none" stroke={RED} strokeWidth="0.8" opacity="0.6" />
      <circle cx="50" cy="62" r="3" fill={YEL} stroke={INK} strokeWidth="0.8" />
    </g>
  )
}

function Shiuli() {
  const flowers: [number, number][] = [
    [36, 40],
    [46, 36],
    [56, 38],
    [65, 42],
    [41, 46],
    [52, 45],
    [61, 48],
    [32, 48],
    [70, 49],
  ]
  return (
    <g>
      {/* basket */}
      <path d="M26 48 H74 L68 72 Q50 77 32 72 Z" fill="#b6743a" stroke={INK} strokeWidth="1.5" />
      {[54, 60, 66].map((y) => (
        <path key={y} d={`M${27 + (y - 48) * 0.25} ${y} Q50 ${y + 4} ${73 - (y - 48) * 0.25} ${y}`} fill="none" stroke="#7a4a24" strokeWidth="1.2" />
      ))}
      {[34, 42, 50, 58, 66].map((x) => (
        <path key={x} d={`M${x} 49 L${x + (x - 50) * -0.12} 73`} stroke="#7a4a24" strokeWidth="1" />
      ))}
      <path d="M26 48 H74" stroke="#7a4a24" strokeWidth="3" strokeLinecap="round" />
      {/* shiuli: white petals around an orange centre */}
      {flowers.map(([x, y], k) => (
        <g key={k} transform={`translate(${x} ${y}) rotate(${k * 37})`}>
          {[0, 1, 2, 3, 4].map((p) => (
            <ellipse key={p} cx="0" cy="-3.6" rx="1.9" ry="3.4" fill="#fffdf6" stroke="#d9cbb4" strokeWidth="0.4" transform={`rotate(${p * 72})`} />
          ))}
          <circle r="1.9" fill="#f07c1a" />
        </g>
      ))}
      <path d="M72 70 Q78 72 80 77" fill="none" stroke="#f07c1a" strokeWidth="1.6" strokeLinecap="round" />
      <g transform="translate(80 78)">
        {[0, 1, 2, 3, 4].map((p) => (
          <ellipse key={p} cx="0" cy="-2.8" rx="1.5" ry="2.6" fill="#fffdf6" transform={`rotate(${p * 72})`} />
        ))}
        <circle r="1.4" fill="#f07c1a" />
      </g>
    </g>
  )
}

function Kash() {
  const stems: [number, number, number][] = [
    [36, 22, -14],
    [44, 16, -6],
    [52, 14, 3],
    [60, 18, 10],
    [67, 26, 18],
  ]
  return (
    <g>
      {stems.map(([x, top, lean], k) => (
        <g key={k}>
          <path d={`M${44 + k * 3} 76 Q${x - lean * 0.2} 52 ${x} ${top + 18}`} fill="none" stroke="#c9b48a" strokeWidth="1.2" />
          {/* the feathery plume */}
          {Array.from({ length: 7 }, (_, i) => {
            const y = top + i * 3
            const w = 6 - Math.abs(i - 3) * 0.9
            return <path key={i} d={`M${x + lean * 0.1 * (6 - i)} ${y} q${-w} ${3} ${-w * 0.6} ${6} M${x + lean * 0.1 * (6 - i)} ${y} q${w} ${3} ${w * 0.6} ${6}`} fill="none" stroke={IVORY} strokeWidth="1.6" strokeLinecap="round" />
          })}
        </g>
      ))}
      {/* grass blades */}
      <path d="M28 77 Q34 64 30 54 M36 77 Q40 66 44 60 M72 77 Q66 64 70 54 M64 77 Q60 68 56 62" fill="none" stroke="#7fae5a" strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}

export const COLLECTIBLES: Collectible[] = [
  { slug: 'malleswaram', id: 'radio', name: 'Mahalaya radio', body: 'red', Icon: Radio },
  { slug: 'rt-nagar-palace-grounds', id: 'durga', name: 'Maa Durga', body: 'ivory', Icon: Durga },
  { slug: 'ulsoor', id: 'ghot', name: 'Ghot with water', body: 'red', Icon: Ghot },
  { slug: 'indiranagar', id: 'dhunuchi', name: 'Dhunuchi', body: 'ivory', Icon: Dhunuchi },
  { slug: 'whitefield-hoodi', id: 'dhak', name: 'Dhak', body: 'red', Icon: Dhak },
  { slug: 'koramangala', id: 'shankh', name: 'Shankh', body: 'red', Icon: Shankh },
  { slug: 'hsr-layout', id: 'lotus', name: 'Lotus', body: 'red', Icon: Lotus },
  { slug: 'south-east', id: 'shiuli', name: 'Basket of shiuli flowers', body: 'ivory', Icon: Shiuli },
  { slug: 'south', id: 'kash', name: 'Kash flowers', body: 'red', Icon: Kash },
]

export const COLLECTIBLE_BY_SLUG = Object.fromEntries(COLLECTIBLES.map((c) => [c.slug, c])) as Partial<Record<AreaSlug, Collectible>>

/** a round medallion: yellow rim, red or ivory face with a dotted border, the icon in the middle */
export function Medallion({ c, size = 64, missing = false, className = '' }: { c: Collectible; size?: number; missing?: boolean; className?: string }) {
  const face = c.body === 'red' ? RED : IVORY
  const dot = c.body === 'red' ? IVORY : RED
  const { Icon } = c
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label={missing ? `${c.name}, not collected yet` : c.name}>
      <circle cx="50" cy="50" r="49.5" fill={missing ? '#e9dcc4' : YEL} />
      <circle cx="50" cy="50" r="45" fill={missing ? '#f6efe2' : face} stroke={missing ? '#c8b79c' : RED_D} strokeWidth="1.2" strokeDasharray={missing ? '4 3' : undefined} />
      {!missing &&
        Array.from({ length: 36 }, (_, i) => {
          const a = (i / 36) * Math.PI * 2
          return <circle key={i} cx={50 + Math.cos(a) * 40.5} cy={50 + Math.sin(a) * 40.5} r="1.35" fill={dot} />
        })}
      <g opacity={missing ? 0.22 : 1} style={missing ? { filter: 'grayscale(1)' } : undefined}>
        <Icon />
      </g>
    </svg>
  )
}
