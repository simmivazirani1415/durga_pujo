import { useEffect, useState } from 'react'
import { useView } from '../engine/viewport'
import { useCoarsePointer } from '../ui/hooks'
import { useJourney } from '../store/journey'
import { LotusMark } from '../ui/Ornament'
import { areaName, exitRide, finishRide, returnToRoute, startRide, toggleAuto, toggleCam, turnAround } from './controller'
import { useGame } from './store'
import { keys } from './vehicle'
import { CollectionCounter } from './Collection'

const card = 'bg-[#fbf3e2] ring-1 ring-gold text-burgundy-deep'

function Key({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-grid h-7 min-w-7 place-items-center rounded-md bg-white px-1.5 font-sans text-[13px] font-bold text-burgundy-deep ring-1 ring-gold-deep/60">{children}</kbd>
}

/** the start of the ride, shown at the foot of the hero */
export function RideIntro() {
  const coarse = useCoarsePointer()
  const view = useView()
  return (
    <div
      className="pointer-events-auto absolute inset-x-0 flex justify-center"
      style={{ bottom: 'max(14px, env(safe-area-inset-bottom, 0px))', paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))', paddingRight: 'max(16px, env(safe-area-inset-right, 0px))' }}
    >
      <div className={`${card} flex w-full max-w-[860px] items-center gap-3 rounded-[24px] ${view.compact ? 'flex-col px-4 py-3' : 'flex-row px-5 py-3'}`}>
        <div className={`flex flex-col ${view.compact ? 'items-center text-center' : ''}`}>
          <p className="flex items-center gap-2 font-headline text-[21px] leading-none sm:text-[23px]">
            <LotusMark className="h-3.5 w-4 text-burgundy-soft" />
            Your Pujo ride starts here
          </p>
          {coarse ? (
            <p className="mt-1.5 text-[12.5px] font-medium text-[#5b4a45]">Steer with the left buttons, speed and brake on the right.</p>
          ) : (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-semibold text-[#5b4a45]">
              <span className="flex items-center gap-1.5">
                <Key>↑</Key> Accelerate
              </span>
              <span className="flex items-center gap-1.5">
                <Key>←</Key>
                <Key>→</Key> Steer
              </span>
              <span className="flex items-center gap-1.5">
                <Key>↓</Key> Brake
              </span>
            </p>
          )}
        </div>
        <div className={`flex gap-2 ${view.compact ? 'w-full' : 'ml-auto'}`}>
          <button
            type="button"
            onClick={() => startRide(false)}
            className={`flex min-h-[48px] items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[linear-gradient(180deg,#7d1a2b,#5c1020)] px-5 text-[16px] font-bold text-ivory ring-1 ring-gold hover:bg-[linear-gradient(180deg,#8a2033,#651b28)] ${view.compact ? 'flex-1' : ''}`}
          >
            Start exploring <span aria-hidden="true">→</span>
          </button>
          <button
            type="button"
            onClick={() => startRide(true)}
            className={`flex min-h-[48px] items-center justify-center rounded-full bg-white px-5 text-[14.5px] font-bold text-burgundy ring-1 ring-gold hover:bg-[#fffaf0] ${view.compact ? 'flex-1' : ''}`}
          >
            {view.compact ? 'Scenic ride' : 'Take the scenic ride'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PillButton({ on, onClick, children, label, kb }: { on?: boolean; onClick: () => void; children: React.ReactNode; label: string; kb?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      title={kb ? `${label} (${kb})` : label}
      className={`flex min-h-[40px] items-center gap-2 rounded-full px-3.5 text-[13.5px] font-bold ring-1 ${on ? 'bg-burgundy text-ivory ring-gold' : 'bg-[#fbf3e2] text-burgundy-deep ring-gold hover:bg-white'}`}
    >
      {children}
    </button>
  )
}

/** press-and-hold buttons on touch screens: steering on the left, speed and brake on the right */
function TouchControls() {
  const btn = 'grid h-[62px] w-[62px] place-items-center rounded-full bg-[#fbf3e2]/95 text-[22px] font-bold text-burgundy-deep ring-1 ring-gold active:bg-gold-soft select-none touch-none'
  const hold = (k: keyof typeof keys) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
      keys[k] = true
      if (useGame.getState().tutorial) useGame.getState().set({ tutorial: false })
    },
    onPointerUp: () => (keys[k] = false),
    onPointerCancel: () => (keys[k] = false),
    onLostPointerCapture: () => (keys[k] = false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  })
  const pad = { bottom: 'max(14px, env(safe-area-inset-bottom, 0px))' }
  return (
    <>
      <div className="pointer-events-auto fixed z-[26] flex gap-3" style={{ ...pad, left: 'max(14px, env(safe-area-inset-left, 0px))' }}>
        <button type="button" aria-label="Steer left" className={btn} {...hold('left')}>
          ◀
        </button>
        <button type="button" aria-label="Steer right" className={btn} {...hold('right')}>
          ▶
        </button>
      </div>
      <div className="pointer-events-auto fixed z-[26] flex gap-3" style={{ ...pad, right: 'max(14px, env(safe-area-inset-right, 0px))' }}>
        <button type="button" aria-label="Brake" className={btn} {...hold('down')}>
          ▼
        </button>
        <button type="button" aria-label="Accelerate" className={`${btn} bg-gold-soft`} {...hold('up')}>
          ▲
        </button>
      </div>
    </>
  )
}

export function GameHUD() {
  const mode = useGame((s) => s.mode)
  const phase = useGame((s) => s.phase)
  const paused = useGame((s) => s.paused)
  const autoDrive = useGame((s) => s.autoDrive)
  const camMode = useGame((s) => s.cam)
  const dest = useGame((s) => s.dest)
  const tutorial = useGame((s) => s.tutorial)
  const speed = useGame((s) => s.speedKmh)
  const hint = useGame((s) => s.hint)
  const sound = useGame((s) => s.sound)
  const set = useGame((s) => s.set)
  const panelOpen = useJourney((s) => s.panel.open)
  const view = useView()
  const coarse = useCoarsePointer()
  const touch = coarse || view.compact
  const [showKeys, setShowKeys] = useState(true)
  useEffect(() => {
    if (!tutorial) {
      const t = setTimeout(() => setShowKeys(false), 400)
      return () => clearTimeout(t)
    }
    setShowKeys(true)
  }, [tutorial])

  const drive = mode === 'drive'
  const parked = phase === 'parked'
  const gutterL = 'max(16px, env(safe-area-inset-left, 0px))'
  const gutterR = 'max(16px, env(safe-area-inset-right, 0px))'
  const bottom = touch ? 'calc(max(14px, env(safe-area-inset-bottom, 0px)) + 76px)' : 'max(16px, env(safe-area-inset-bottom, 0px))'

  return (
    <>
      <CollectionCounter visible={drive} />
      {drive && (
        <div className="pointer-events-none fixed inset-0 z-[25] transition-opacity duration-300" style={{ opacity: panelOpen ? 0 : 1 }} aria-label="Ride controls">
          {/* route hint under the header */}
          {hint && !parked && (
            <div className={`absolute inset-x-0 flex ${view.compact ? 'justify-start' : 'justify-center'}`} style={{ top: view.compact ? 'calc(max(14px, env(safe-area-inset-top, 0px)) + 96px)' : 'max(92px, 11vh)', paddingLeft: gutterL, paddingRight: view.compact ? 136 : gutterR }}>
              <div className={`${card} pointer-events-auto flex max-w-[560px] items-center gap-3 rounded-[20px] px-4 py-2.5`} role="status">
                <div className="flex flex-col">
                  <span className="text-[16px] font-bold leading-tight sm:text-[17px]">{hint.text}</span>
                  {hint.sub && <span className="text-[12.5px] font-medium leading-snug text-[#5b4a45]">{hint.sub}</span>}
                </div>
                {hint.action && (
                  <button
                    type="button"
                    onClick={() => (hint.action === 'return' ? returnToRoute() : hint.action === 'turn' ? turnAround() : void finishRide())}
                    className="ml-1 shrink-0 rounded-full bg-burgundy px-3.5 py-2 text-[13px] font-bold text-ivory ring-1 ring-gold"
                  >
                    {hint.actionLabel}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* phones: one compact row above the pedals */}
          {touch && (
            <div className="absolute inset-x-0 flex flex-col items-center gap-2" style={{ bottom, paddingLeft: gutterL, paddingRight: gutterR }}>
              {dest !== null && (
                <div className={`${card} pointer-events-auto flex min-h-[34px] items-center gap-2 rounded-full py-0.5 pl-3 pr-0.5 text-[12.5px]`}>
                  <span className="font-semibold text-[#5b4a45]">To</span>
                  <span className="font-bold">{areaName(dest)}</span>
                  <button type="button" onClick={() => set({ dest: null })} className="grid h-7 w-7 place-items-center rounded-full bg-white text-[12px] ring-1 ring-gold" aria-label="Clear destination">
                    ✕
                  </button>
                </div>
              )}
              <div className="pointer-events-auto flex items-center gap-1.5">
                <div className={`${card} flex min-h-[38px] items-baseline gap-0.5 rounded-full px-2.5 py-1.5`} aria-label={`${speed} kilometres an hour`}>
                  <span className="tabular text-[15px] font-bold leading-none">{speed}</span>
                  <span className="text-[9.5px] font-bold uppercase text-[#7a5a4a]">km/h</span>
                </div>
                <PillButton on={autoDrive} onClick={toggleAuto} label="Auto-drive">
                  Auto
                </PillButton>
                <PillButton onClick={toggleCam} label={camMode === 'chase' ? 'Wider camera' : 'Close camera'}>
                  {camMode === 'chase' ? 'Wide' : 'Close'}
                </PillButton>
                <PillButton onClick={() => set({ paused: true })} label="Pause">
                  <span aria-hidden="true">❚❚</span>
                </PillButton>
              </div>
            </div>
          )}

          {/* desktop: bottom left: speed, auto-drive and the controls reminder; bottom right: destination, camera, sound, pause, exit */}
          {!touch && (
            <>

          <div className="absolute flex flex-col items-start gap-2" style={{ left: gutterL, bottom }}>
            {showKeys && !touch && (
              <div className={`${card} pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl px-3.5 py-2.5 text-[12.5px] font-semibold text-[#5b4a45]`}>
                <span className="flex items-center gap-1.5">
                  <Key>↑</Key> Accelerate
                </span>
                <span className="flex items-center gap-1.5">
                  <Key>←</Key>
                  <Key>→</Key> Steer
                </span>
                <span className="flex items-center gap-1.5">
                  <Key>↓</Key> Brake
                </span>
                <span className="flex items-center gap-1.5">
                  <Key>F</Key> Auto-drive
                </span>
              </div>
            )}
            <div className="pointer-events-auto flex items-center gap-2">
              <div className={`${card} flex min-h-[40px] items-baseline gap-1 rounded-full px-3.5 py-1.5`} aria-label={`${speed} kilometres an hour`}>
                <span className="tabular text-[18px] font-bold leading-none">{speed}</span>
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#7a5a4a]">km/h</span>
              </div>
              <PillButton on={autoDrive} onClick={toggleAuto} label="Auto-drive" kb="F">
                <span aria-hidden="true">{autoDrive ? '●' : '○'}</span> Auto-drive{!touch && <span className="text-[11px] opacity-70">F</span>}
              </PillButton>
            </div>
          </div>

          {/* bottom right: destination, camera, sound, pause and exit */}
          <div className="absolute flex flex-col items-end gap-2" style={{ right: gutterR, bottom }}>
            {dest !== null && (
              <div className={`${card} pointer-events-auto flex min-h-[40px] items-center gap-2 rounded-full py-1 pl-3.5 pr-1`}>
                <span className="text-[13px] font-semibold text-[#5b4a45]">Heading to</span>
                <span className="text-[14px] font-bold">{areaName(dest)}</span>
                <button type="button" onClick={() => set({ dest: null })} className="grid h-8 w-8 place-items-center rounded-full bg-white text-[13px] ring-1 ring-gold" aria-label="Clear destination">
                  ✕
                </button>
              </div>
            )}
            <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
              <PillButton onClick={toggleCam} label={camMode === 'chase' ? 'Wider camera' : 'Close camera'} kb="C">
                <span aria-hidden="true">◎</span> {camMode === 'chase' ? 'Wide view' : 'Close view'}
                {!touch && <span className="text-[11px] opacity-70">C</span>}
              </PillButton>
              <PillButton on={sound} onClick={() => set({ sound: !sound })} label={sound ? 'Sound on' : 'Sound off'}>
                <span aria-hidden="true">♪</span> {sound ? 'Sound on' : 'Sound off'}
              </PillButton>
              <PillButton onClick={() => set({ paused: true })} label="Pause" kb="Esc">
                <span aria-hidden="true">❚❚</span>
              </PillButton>
              <PillButton onClick={() => void exitRide()} label="Exit ride">
                Exit ride
              </PillButton>
            </div>
          </div>
            </>
          )}

          {touch && !panelOpen && <TouchControls />}
        </div>
      )}

      {drive && paused && (
        <div className="fixed inset-0 z-[45] flex items-center justify-center bg-[rgba(36,16,14,0.45)] px-4" role="dialog" aria-modal="true" aria-label="Ride paused">
          <div className={`${card} flex w-full max-w-[380px] flex-col items-center gap-3 rounded-[26px] px-6 py-6 text-center`}>
            <p className="font-headline text-[34px] leading-none">Paused</p>
            <p className="text-[14px] font-medium text-[#5b4a45]">Your auto is waiting{phase === 'parked' ? ` at ${areaName(stopIndex())}` : ''}.</p>
            <button type="button" autoFocus onClick={() => set({ paused: false })} className="mt-1 min-h-[48px] w-full rounded-full bg-[linear-gradient(180deg,#7d1a2b,#5c1020)] text-[16px] font-bold text-ivory ring-1 ring-gold">
              Resume ride
            </button>
            <button type="button" onClick={() => void exitRide()} className="min-h-[44px] w-full rounded-full bg-white text-[14.5px] font-bold text-burgundy ring-1 ring-gold">
              Exit ride, back to Explore
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function stopIndex() {
  return useJourney.getState().index
}
