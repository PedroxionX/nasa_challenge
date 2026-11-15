import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { exitMapPlayback, useMapPlayback, usePublishPlayback, type PlaybackFrame } from './playback'

const frame: PlaybackFrame = {
  regionId: 'MX-BCN', regionName: 'Baja California', variableId: 'air_temperature',
  from: 1980, to: 2025, year: 2000, playing: false, value: 20, unit: '°C', min: 18, max: 22,
}
const query = { regionId: 'MX-BCN', variableId: 'air_temperature', from: 1980, to: 2025, compareId: null }
afterEach(cleanup)

describe('Fotograma compartido', () => {
  it('no muestra un fotograma de otra consulta ni lo escribe en la URL', () => {
    const search = window.location.search
    renderHook(() => usePublishPlayback(frame, vi.fn()))
    const { result, rerender } = renderHook(q => useMapPlayback(q), { initialProps: query as { regionId: string; variableId: string; from: number; to: number; compareId: string | null } })
    expect(result.current).toBe(frame)
    for (const patch of [{ regionId: 'MX-SON' }, { variableId: 'precipitation' }, { from: 2000 }, { to: 2020 }, { compareId: 'MX-SON' }]) {
      rerender({ ...query, ...patch })
      expect(result.current).toBeNull()
    }
    expect(window.location.search).toBe(search)
  })

  it('la limpieza de una reproducción anterior no borra la siguiente', () => {
    const first = renderHook(() => usePublishPlayback(frame, vi.fn()))
    const next = { ...frame, year: 2001 }
    const second = renderHook(() => usePublishPlayback(next, vi.fn()))
    const { result } = renderHook(() => useMapPlayback(query))
    first.unmount()
    expect(result.current).toBe(next)
    second.unmount()
    expect(result.current).toBeNull()
  })

  it('salir restaura el mapa y detiene el reproductor que publicó el fotograma', () => {
    const stop = vi.fn()
    renderHook(() => usePublishPlayback(frame, stop))
    const { result } = renderHook(() => useMapPlayback(query))
    act(exitMapPlayback)
    expect(stop).toHaveBeenCalledOnce()
    expect(result.current).toBeNull()
  })
})
