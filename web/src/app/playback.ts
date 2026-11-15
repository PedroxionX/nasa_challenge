/** Fotograma compartido por la gráfica y el globo. Es transitorio: nunca modifica la URL. */
import { useEffect, useState, useSyncExternalStore } from 'react'

export interface PlaybackFrame {
  regionId: string
  regionName: string
  variableId: string
  from: number
  to: number
  year: number
  playing: boolean
  value: number | null
  unit: string
  /** Escala fija para toda la reproducción, usando solo los años completos del periodo. */
  min: number
  max: number
}

let current: { owner: symbol; frame: PlaybackFrame; exit: () => void; toggle?: () => void } | null = null
const listeners = new Set<() => void>()
const emit = () => { for (const listener of listeners) listener() }
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }

function clear(owner: symbol) {
  if (current?.owner !== owner) return
  current = null
  emit()
}

/** Publica sin dejar que la limpieza de una consulta anterior borre la siguiente. */
export function usePublishPlayback(frame: PlaybackFrame | null, exit: () => void, toggle?: () => void) {
  const [owner] = useState(() => Symbol('timeline'))
  useEffect(() => {
    if (frame) { current = { owner, frame, exit, toggle }; emit() }
    else clear(owner)
  }, [owner, frame, exit, toggle])
  useEffect(() => () => clear(owner), [owner])
}

/** Nunca aplica un fotograma de otro estado, variable, periodo o vista de comparación. */
interface PlaybackQuery {
  regionId: string | null; variableId: string; from: number; to: number; compareId: string | null
}

function matchingFrame(query: PlaybackQuery): PlaybackFrame | null {
  const frame = current?.frame
  return frame && !query.compareId && frame.regionId === query.regionId && frame.variableId === query.variableId &&
    frame.from === query.from && frame.to === query.to ? frame : null
}

export function useMapPlayback(query: PlaybackQuery): PlaybackFrame | null {
  return useSyncExternalStore(subscribe, () => matchingFrame(query))
}

/** La hoja solo necesita saber cuándo empieza/pausa: no se vuelve a renderizar en cada año. */
export function useMapPlaybackPlaying(query: PlaybackQuery): boolean {
  return useSyncExternalStore(subscribe, () => matchingFrame(query)?.playing ?? false)
}

export function toggleMapPlayback() {
  current?.toggle?.()
}

export function exitMapPlayback() {
  const exit = current?.exit
  current = null
  emit()
  exit?.()
}
