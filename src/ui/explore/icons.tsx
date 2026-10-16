import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 18, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconClose = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
)
export const IconBack = (p: P) => (
  <Svg {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
)
export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </Svg>
)
export const IconPin = (p: P) => (
  <Svg {...p}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </Svg>
)
export const IconCalendar = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
    <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
  </Svg>
)
export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
)
export const IconRoute = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l9 9-9 9-9-9z" />
    <path d="M9.5 13.5v-2a1.5 1.5 0 011.5-1.5h3.5M13 8l2 2-2 2" />
  </Svg>
)
export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)
export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
)
export const IconUp = (p: P) => (
  <Svg {...p}>
    <path d="M6 15l6-6 6 6" />
  </Svg>
)
export const IconDown = (p: P) => (
  <Svg {...p}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
)
export const IconRemove = (p: P) => (
  <Svg {...p}>
    <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" />
  </Svg>
)
export const IconMap = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z" />
    <path d="M9 4.5v13M15 6.5v13" />
  </Svg>
)
export const IconList = (p: P) => (
  <Svg {...p}>
    <path d="M9 6.5h11M9 12h11M9 17.5h11" />
    <circle cx="4.5" cy="6.5" r="0.6" fill="currentColor" />
    <circle cx="4.5" cy="12" r="0.6" fill="currentColor" />
    <circle cx="4.5" cy="17.5" r="0.6" fill="currentColor" />
  </Svg>
)
export const IconFilter = (p: P) => (
  <Svg {...p}>
    <path d="M4 6.5h16M7 12h10M10 17.5h4" />
  </Svg>
)
export const IconCopy = (p: P) => (
  <Svg {...p}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
    <path d="M15.5 8.5V6a1.5 1.5 0 00-1.5-1.5H6A1.5 1.5 0 004.5 6v8A1.5 1.5 0 006 15.5h2.5" />
  </Svg>
)
export const IconExternal = (p: P) => (
  <Svg {...p}>
    <path d="M14 4.5h5.5V10M19.5 4.5L11 13" />
    <path d="M17 13.5V18a1.5 1.5 0 01-1.5 1.5H6A1.5 1.5 0 014.5 18V8.5A1.5 1.5 0 016 7h4.5" />
  </Svg>
)
export const IconInfo = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5M12 7.6v.2" />
  </Svg>
)
export const IconAlert = (p: P) => (
  <Svg {...p}>
    <path d="M12 4l9 16H3z" />
    <path d="M12 10v4.5M12 17.2v.2" />
  </Svg>
)
