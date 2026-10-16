import { RideIntro } from '../game/GameHUD'
import { SearchBox } from './search/SearchBox'
import { useJourney } from '../store/journey'
import { LISTINGS } from '../data/listings'
import { LotusMark } from './Ornament'

export function HeroContent() {
  const openPanel = useJourney((s) => s.openPanel)
  const nP = LISTINGS.filter((l) => l.kind === 'pandal').length
  const nE = LISTINGS.filter((l) => l.kind === 'event').length
  return (
    <section
      data-ui="hero"
      aria-label="Explore Durga Puja in Bengaluru"
      className="pointer-events-none fixed inset-0 z-20 flex flex-col items-center"
      style={{ visibility: 'hidden', opacity: 0 }}
    >
      <div
        className="pointer-events-auto mt-[max(130px,17vh)] flex w-full max-w-[900px] flex-col items-center gap-4 text-center sm:gap-5"
        style={{ paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))', paddingRight: 'max(16px, env(safe-area-inset-right, 0px))' }}
      >
        <span aria-hidden="true" className="-mb-2 flex items-center gap-3 text-gold-deep sm:-mb-3">
          <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold sm:w-28" />
          <LotusMark className="h-6 w-8 sm:h-8 sm:w-10" />
          <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold sm:w-28" />
        </span>
        <h1 className="flex flex-col items-center font-headline font-normal leading-[1.02] tracking-[-0.01em]">
          <span className="hero-red text-[clamp(32px,8.6vw,40px)] sm:text-[clamp(44px,4.9vw,74px)]">Explore Durga Puja</span>
          <span className="flex items-center gap-4 text-[clamp(30px,8vw,36px)] text-[#24120f] sm:text-[clamp(38px,4.3vw,64px)] sm:gap-6">
            <span aria-hidden="true" className="h-px w-12 bg-gold sm:w-24" />
            in BLR
            <span aria-hidden="true" className="h-px w-12 bg-gold sm:w-24" />
          </span>
        </h1>
        <p className="max-w-[36ch] text-[clamp(16px,1.6vw,20px)] font-semibold leading-snug text-[#24120f] sm:max-w-none">
          Find pandals, food, events and experiences across the city.
        </p>
        <div className="mt-1 w-full max-w-[600px]">
          <SearchBox variant="hero" />
        </div>
        <button
          type="button"
          onClick={() => openPanel({ scope: 'all', tab: 'pandal' })}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-burgundy px-5 text-[14.5px] font-bold text-ivory shadow-[0_12px_26px_-14px_rgba(40,10,15,0.85)] hover:bg-burgundy-soft"
        >
          See all {nP} pandals &amp; {nE} events <span aria-hidden="true">→</span>
        </button>
      </div>
      <RideIntro />
    </section>
  )
}
