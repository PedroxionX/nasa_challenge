import { useCallback, useEffect, useRef, useState } from 'react'

/** Un recorrido completo tarda 9 s, independientemente de cuántos años tenga la variable. */
export const PLAYBACK_DURATION_MS = 9_000

export function useTimelinePlayback(firstYear: number, lastYear: number) {
  const [year, setYear] = useState(firstYear)
  const [playing, setPlaying] = useState(false)
  const [active, setActive] = useState(false)
  const progress = useRef(0)
  const span = lastYear - firstYear

  useEffect(() => {
    if (!playing || span <= 0) return
    const startedAt = performance.now()
    const initial = progress.current
    let frame: number
    const finish = () => {
      progress.current = 1
      setYear(lastYear)
      setPlaying(false)
    }
    const tick = (now: number) => {
      // El primer RAF puede pertenecer al cuadro en que se montó el efecto y traer un tiempo anterior.
      progress.current = Math.min(1, initial + Math.max(0, now - startedAt) / PLAYBACK_DURATION_MS)
      setYear(firstYear + Math.floor(progress.current * span))
      if (progress.current >= 1) finish()
      else frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    // Un plazo único evita acumular retrasos al avanzar de año en año.
    const deadline = window.setTimeout(finish, (1 - initial) * PLAYBACK_DURATION_MS)
    const pauseWhenHidden = () => { if (document.hidden) setPlaying(false) }
    document.addEventListener('visibilitychange', pauseWhenHidden)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(deadline)
      document.removeEventListener('visibilitychange', pauseWhenHidden)
    }
  }, [playing, firstYear, lastYear, span])

  const toggle = () => {
    if (span <= 0) return
    setActive(true)
    if (!playing && year === lastYear) {
      progress.current = 0
      setYear(firstYear)
    }
    setPlaying(p => !p)
  }

  const seek = (next: number) => {
    const clamped = Math.max(firstYear, Math.min(lastYear, Math.round(next)))
    progress.current = span > 0 ? (clamped - firstYear) / span : 0
    setYear(clamped)
    setActive(true)
    setPlaying(false)
  }

  const stop = useCallback(() => {
    progress.current = 0
    setYear(firstYear)
    setPlaying(false)
    setActive(false)
  }, [firstYear])

  return { year, playing, active, toggle, seek, reset: () => seek(firstYear), stop }
}
