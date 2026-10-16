import { useEffect, useRef, useState } from 'react'
import { startEngine, stopEngine } from './engine3d'

/** the full-screen WebGL street; falls back to a warm sky gradient if WebGL is unavailable */
export function World3D() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    try {
      startEngine(ref.current)
    } catch (e) {
      console.error(e)
      setFailed(true)
    }
    return () => stopEngine()
  }, [])
  if (failed) return <div className="absolute inset-0" style={{ background: 'linear-gradient(#8fb0cc, #f2cf9f 55%, #8a7a66 56%, #5a5048)' }} />
  return <canvas ref={ref} className="absolute inset-0 block h-full w-full" />
}
